import { vi } from 'vitest'

/**
 * map-mocks.ts — the ONE file mocking every third-party map integration for
 * jsdom (perf rule 3's brief: "no WebGL in jsdom — standard mocking
 * approach, keep mocks minimal + in one file"). `import './test/map-mocks'`
 * as the FIRST line of any test that renders `MapPanel` — ESM evaluates
 * static imports in source order, so these `vi.mock` registrations run
 * before `MapPanel`'s own imports of the same module specifiers resolve.
 *
 * `deck.gl` and `supercluster` are deliberately NOT mocked here — both
 * construct real objects with no WebGL/DOM dependency (a deck.gl `Layer`
 * only stores its props at construction time; the GPU device is allocated
 * later, only once an overlay actually attaches to a real map), so
 * `layers.ts`/`cluster.ts` tests exercise the real libraries and assert on
 * real `.props`/cluster output — only the MapLibre↔deck.gl attachment layer
 * (`MapboxOverlay`) and the MapLibre map itself need faking.
 *
 * Shared mutable state the tests need to reach INTO the mocks (the last
 * constructed `TerraDraw` fake, so a test can simulate a `finish`/`change`
 * event) goes through `vi.hoisted()` — the documented pattern for state a
 * `vi.mock` factory and the importing test file both need to reference,
 * since `vi.mock` factories may only close over hoisted-safe bindings.
 */

const terraDrawTestState = vi.hoisted(() => ({
  instances: [] as FakeTerraDrawInstance[],
}))
export { terraDrawTestState }

export interface FakeTerraDrawInstance {
  options: unknown
  mode: string | null
  features: Record<string, unknown>
  start: () => void
  stop: () => void
  setMode: (mode: string) => void
  clear: () => void
  getSnapshotFeature: (id: string | number) => unknown
  on: (event: string, cb: (...args: unknown[]) => void) => void
  off: (event: string, cb: (...args: unknown[]) => void) => void
  /** Test helper — not part of the real TerraDraw API. */
  __setFeature: (id: string, feature: unknown) => void
  /** Test helper — simulates TerraDraw firing a `finish`/`change` event. */
  __emit: (event: string, ...args: unknown[]) => void
}

vi.mock('terra-draw', () => {
  class FakeTerraDraw implements FakeTerraDrawInstance {
    options: unknown
    mode: string | null = null
    features: Record<string, unknown> = {}
    private listeners: Record<string, Array<(...args: unknown[]) => void>> = {}
    constructor(options: unknown) {
      this.options = options
      terraDrawTestState.instances.push(this)
    }
    start = () => {}
    stop = () => {}
    setMode = (mode: string) => {
      this.mode = mode
    }
    clear = () => {
      this.features = {}
    }
    getSnapshotFeature = (id: string | number) => this.features[String(id)]
    on = (event: string, cb: (...args: unknown[]) => void) => {
      ;(this.listeners[event] ??= []).push(cb)
    }
    off = (event: string, cb: (...args: unknown[]) => void) => {
      this.listeners[event] = (this.listeners[event] ?? []).filter((f) => f !== cb)
    }
    __setFeature = (id: string, feature: unknown) => {
      this.features[id] = feature
    }
    __emit = (event: string, ...args: unknown[]) => {
      ;(this.listeners[event] ?? []).forEach((cb) => cb(...args))
    }
  }
  class FakeMode {
    constructor(public options: unknown) {}
  }
  return {
    TerraDraw: FakeTerraDraw,
    TerraDrawSelectMode: FakeMode,
    TerraDrawPolygonMode: FakeMode,
    TerraDrawCircleMode: FakeMode,
  }
})

vi.mock('terra-draw-maplibre-gl-adapter', () => ({
  TerraDrawMapLibreGLAdapter: class {
    constructor(public options: unknown) {}
  },
}))

vi.mock('@deck.gl/mapbox', () => ({
  MapboxOverlay: class {
    props: Record<string, unknown>
    constructor(props: Record<string, unknown>) {
      this.props = props
    }
    setProps(props: Record<string, unknown>) {
      this.props = { ...this.props, ...props }
    }
  },
}))

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

const reactMapGlTestState = vi.hoisted(() => ({
  lastFakeMap: null as FakeMaplibreMap | null,
  /** Incremented once per actual mount of the fake `<Map>` (its mount
   *  effect, not its render) — the guard-fix regression check asserts this
   *  stays at 1 when a second `MapPanel` is blocked, proving the second
   *  instance's map component never mounts at all (not even for one
   *  commit). */
  mountCount: 0,
  /**
   * Basemap-failure seam (UX-NOTES C16). The fake `<Map>` calls `onLoad` on
   * mount, i.e. it always models a HEALTHY map — set this before rendering to
   * model a style that never loads, which is the only state in which
   * `MapPanel` raises its error surface.
   */
  suppressLoad: false,
  /** The last `onClick` the fake `<Map>` received — call it to simulate a
   *  basemap click (`MapPanel.onBasemapClick` / popup-dismiss contract). */
  lastOnClick: null as
    | ((evt: { originalEvent?: MouseEvent; lngLat?: { lng: number; lat: number } }) => void)
    | null,
  /** The live `onError` prop, so a test can emit MapLibre's `error` event. */
  lastOnError: null as ((evt: { error?: Error }) => void) | null,
  /** The live `onMove` prop, so a test can simulate camera-frame events
   *  (`onViewportChange`'s debounce coverage). */
  lastOnMove: null as ((evt: { target: FakeMaplibreMap; viewState: Record<string, number> }) => void) | null,
}))
export { reactMapGlTestState }

export interface FakeMaplibreMap {
  zoomIn: () => void
  zoomOut: () => void
  easeTo: (opts: unknown) => void
  panBy: (offset: [number, number], options?: unknown) => void
  getZoom: () => number
  getBounds: () => { getWest: () => number; getSouth: () => number; getEast: () => number; getNorth: () => number }
  /** Absent by default (MapPanel type-guards them, jsdom-stub contract) — a
   *  test attaches these to exercise the settle-then-clamp popup path. */
  isMoving?: () => boolean
  once?: (event: string, cb: () => void) => void
  off?: (event: string, cb: () => void) => void
  /** Screen projection — feeds the popup anchor + chip-collision passes. */
  project: (position: [number, number]) => { x: number; y: number }
  getContainer: () => { clientWidth: number; clientHeight: number }
  /** Rotation handlers (UX finding 9) — the test asserts they get disabled. */
  dragRotate: { disable: () => void; enabled: boolean }
  touchZoomRotate: { disableRotation: () => void; rotationEnabled: boolean }
  keyboard: { disableRotation: () => void; rotationEnabled: boolean }
  getBearing: () => number
  setBearing: (bearing: number) => void
  /** Retry's re-attempt channel (`MapPanel` error surface). */
  setStyle: ReturnType<typeof vi.fn>
}

vi.mock('react-map-gl/maplibre', async () => {
  const React = await import('react')

  function createFakeMap(): FakeMaplibreMap {
    let bearing = 0
    const dragRotate = { enabled: true, disable: () => { dragRotate.enabled = false } }
    const touchZoomRotate = {
      rotationEnabled: true,
      disableRotation: () => { touchZoomRotate.rotationEnabled = false },
    }
    const keyboard = {
      rotationEnabled: true,
      disableRotation: () => { keyboard.rotationEnabled = false },
    }
    return {
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      easeTo: vi.fn(),
      panBy: vi.fn(),
      getZoom: () => 3,
      getBounds: () => ({ getWest: () => -20, getSouth: () => -20, getEast: () => 20, getNorth: () => 20 }),
      // A plausible, monotonic screen projection so the anchor + collision
      // passes get real numbers instead of NaN.
      project: ([lng, lat]: [number, number]) => ({ x: 600 + lng * 10, y: 400 - lat * 10 }),
      getContainer: () => ({ clientWidth: 1200, clientHeight: 800 }),
      dragRotate,
      touchZoomRotate,
      keyboard,
      getBearing: () => bearing,
      setBearing: (next: number) => { bearing = next },
      setStyle: vi.fn(),
    }
  }

  const Map = React.forwardRef(function FakeMap(props: Record<string, unknown>, ref: React.Ref<unknown>) {
    const mapRef = React.useRef<FakeMaplibreMap>(undefined as unknown as FakeMaplibreMap)
    if (!mapRef.current) mapRef.current = createFakeMap()
    reactMapGlTestState.lastOnError = (props.onError as ((evt: { error?: Error }) => void) | undefined) ?? null
    reactMapGlTestState.lastOnClick =
      (props.onClick as ((evt: { originalEvent?: MouseEvent; lngLat?: { lng: number; lat: number } }) => void) | undefined) ??
      null
    reactMapGlTestState.lastOnMove =
      (props.onMove as ((evt: { target: FakeMaplibreMap; viewState: Record<string, number> }) => void) | undefined) ??
      null
    React.useImperativeHandle(ref, () => ({
      getMap: () => mapRef.current,
      getContainer: () => ({ requestFullscreen: () => {} }),
      // The real `MapRef` PROXIES the map's own camera methods onto itself,
      // so a component may call `ref.current.easeTo(...)` without going
      // through `getMap()` (`LocationPickerMap` does exactly that to follow
      // camera-narrowing prop changes). Forward them to the same fake map the
      // `getMap()` callers assert on, so both styles are observable.
      easeTo: (opts: unknown) => mapRef.current.easeTo(opts),
    }))
    React.useEffect(() => {
      reactMapGlTestState.lastFakeMap = mapRef.current
      reactMapGlTestState.mountCount += 1
      if (!reactMapGlTestState.suppressLoad) {
        ;(props.onLoad as ((e: { target: FakeMaplibreMap }) => void) | undefined)?.({ target: mapRef.current })
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- fake, mount-once by design
    }, [])
    return React.createElement(
      'div',
      {
        'data-testid': 'fake-maplibre-map',
        'data-style': String(props.mapStyle ?? ''),
        // Surfaced so tests can assert the DECLARATIVE half of the rotation
        // gate (`MapPanelProps.rotatable`); the imperative half is observable
        // on `lastFakeMap`.
        'data-drag-rotate': String(props.dragRotate),
        'data-pitch-with-rotate': String(props.pitchWithRotate),
        'data-touch-pitch': String(props.touchPitch),
      },
      props.children as React.ReactNode,
    )
  })

  function useControl<T>(onCreate: (ctx: { map: null; mapLib: null }) => T): T {
    const ref = React.useRef<T | null>(null)
    if (ref.current === null) ref.current = onCreate({ map: null, mapLib: null })
    return ref.current
  }

  /** DOM-marker fake — renders children in a plain div stamped with its
   *  coordinate so tests can assert what got anchored where. */
  function Marker(props: { longitude: number; latitude: number; children?: React.ReactNode }) {
    return React.createElement(
      'div',
      {
        'data-testid': 'fake-map-marker',
        'data-longitude': props.longitude,
        'data-latitude': props.latitude,
      },
      props.children,
    )
  }

  /** Popup fake — renders children (MapPanel's `renderMarkerPopup` body).
   *  Carries the real `maplibregl-popup` container class so MapPanel's
   *  viewport-clamp query (`panel.querySelector('.maplibregl-popup')`) finds
   *  it, exactly as it finds MapLibre's own popup container in a browser. */
  function Popup(props: {
    longitude: number
    latitude: number
    className?: string
    offset?: number
    anchor?: string
    focusAfterOpen?: boolean
    children?: React.ReactNode
  }) {
    return React.createElement(
      'div',
      {
        'data-testid': 'fake-map-popup',
        // Real MapLibre stamps the COMPUTED anchor as a second class. Since
        // `MapPanel` now computes the anchor itself (`popup-anchor.ts`), the
        // fake echoes whatever it was given — defaulting to `bottom`, the
        // Figma above-the-marker placement — so the anchor-scoped tip rules
        // are exercised the same way and tests can assert the placement.
        className: `maplibregl-popup maplibregl-popup-anchor-${props.anchor ?? 'bottom'} ${props.className ?? ''}`.trim(),
        'data-anchor': props.anchor ?? 'bottom',
        'data-offset': props.offset,
        'data-longitude': props.longitude,
        'data-latitude': props.latitude,
        // A21: echoes whatever MapPanel passes so a test can assert it opts
        // OUT of maplibre-gl's real `focusAfterOpen` default (`true`), which
        // otherwise auto-focuses the popup's first tabbable element (the
        // header's "Center on vehicle" button) on every open — mouse-opened
        // included — and is what put a stray focus-visible ring on it.
        'data-focus-after-open': String(props.focusAfterOpen ?? true),
      },
      // MapLibre's own tip element — the anchor-following pointer.
      React.createElement('div', { className: 'maplibregl-popup-tip', key: 'tip' }),
      React.createElement('div', { className: 'maplibregl-popup-content', key: 'content' }, props.children),
    )
  }

  /** `useMap` fake — hands `DomMarkers` the last fake map so cluster clicks
   *  can be asserted against `easeTo`. */
  function useMap() {
    return {
      current: {
        getMap: () => reactMapGlTestState.lastFakeMap,
      },
    }
  }

  /** Attribution fake — the ODbL credit strip MapPanel now positions
   *  bottom-start (UX finding 6); rendered so tests can assert it exists. */
  function AttributionControl(props: { position?: string; compact?: boolean }) {
    return React.createElement('div', {
      'data-testid': 'fake-map-attribution',
      'data-position': props.position,
      'data-compact': String(props.compact),
      className: 'maplibregl-ctrl-attrib',
    })
  }

  return { Map, useControl, Marker, Popup, useMap, AttributionControl }
})
