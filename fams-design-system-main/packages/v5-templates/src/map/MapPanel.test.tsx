// MUST be the first import — see `test/map-mocks.ts`'s header for why import
// order (not `vi.mock` hoisting) is what makes this registration take effect
// before `MapPanel`'s own `react-map-gl`/`terra-draw`/etc. imports resolve.
import { reactMapGlTestState, terraDrawTestState } from './test/map-mocks'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MapPanel } from './MapPanel'
import { MAPLIBRE_POPUP_CHROMELESS_CLASS } from './maplibre-popup-reset'
import { __resetSingleMapGuardForTests } from './mount-guard'
import { sampleMarkers, sampleZones } from './fixtures'

/**
 * MapPanel.test.tsx — behavior tests over the mocked map (`test/map-mocks.ts`;
 * no real WebGL). Covers: chrome renders, the one-map-per-page guard end to
 * end through the real component (not just the hook in isolation), and
 * TerraDraw callback wiring (mocked draw events → `onZoneDrawn`/
 * `onZoneChanged`). Marker/zone → deck.gl layer-config mapping has its own
 * focused coverage in `layers.test.ts`.
 */

afterEach(() => {
  __resetSingleMapGuardForTests()
  terraDrawTestState.instances.length = 0
  reactMapGlTestState.mountCount = 0
  reactMapGlTestState.suppressLoad = false
  reactMapGlTestState.lastOnError = null
  vi.restoreAllMocks()
})

describe('MapPanel — chrome', () => {
  it('renders the map region with an accessible label and the default control stack', () => {
    render(<MapPanel aria-label="Fleet map" markers={sampleMarkers} zones={sampleZones} />)
    expect(screen.getByRole('region', { name: 'Fleet map' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset bearing' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fullscreen' })).toBeInTheDocument()
  })

  it('hides the control stack when controls={false}', () => {
    render(<MapPanel aria-label="Fleet map" controls={false} />)
    expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument()
  })

  it('renders legend entries as a token-styled chip list', () => {
    render(<MapPanel aria-label="Fleet map" legend={[{ label: 'Reporting', color: '#12b76a' }, { label: 'Stopped', color: '#f04438' }]} />)
    expect(screen.getByText('Reporting')).toBeInTheDocument()
    expect(screen.getByText('Stopped')).toBeInTheDocument()
  })

  it('renders a titled, toggleable legend as a real checkbox group when onLegendToggle is given', () => {
    const onLegendToggle = vi.fn()
    render(
      <MapPanel
        aria-label="Fleet map"
        legendTitle="Events"
        legend={[
          { id: 'braking', label: 'Harsh Braking', color: '#f79009' },
          { id: 'overspeeding', label: 'Overspeeding', color: '#06b6d4' },
        ]}
        hiddenLegendIds={['overspeeding']}
        onLegendToggle={onLegendToggle}
      />,
    )
    expect(screen.getByRole('group', { name: 'Events' })).toBeInTheDocument()
    const braking = screen.getByRole('checkbox', { name: 'Harsh Braking' })
    const overspeeding = screen.getByRole('checkbox', { name: 'Overspeeding' })
    expect(braking).toBeChecked()
    expect(overspeeding).not.toBeChecked()

    fireEvent.click(braking)
    expect(onLegendToggle).toHaveBeenCalledWith('braking')
  })

  it('falls back to the entry label as its id, and stays read-only without onLegendToggle', () => {
    render(<MapPanel aria-label="Fleet map" legend={[{ label: 'Reporting', color: '#12b76a' }]} />)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByText('Reporting')).toBeInTheDocument()
  })

  it('renders the fullscreen control as a toggle whose name reflects the current state', () => {
    render(<MapPanel aria-label="Fleet map" />)
    const control = screen.getByRole('button', { name: 'Fullscreen' })
    expect(control).toHaveAttribute('aria-pressed', 'false')
    // >=44x44 hit area (verdict V11) — `size-11`, not Button's `size-9` icon default.
    expect(control.className).toContain('size-11')
  })

  it('requests fullscreen on the PANEL, so the controls go with it', () => {
    // Round-3 P1 #6: fullscreen was requested on MapLibre's own container, a
    // SIBLING of the control stack. The fullscreen element is promoted to the
    // top layer, so the chrome stayed under the `::backdrop` and
    // `elementFromPoint` at the 44x44 "Exit fullscreen" button returned the
    // canvas — zoom and reset-bearing were blocked the same way, and no
    // z-index can win against a top-layer sibling.
    render(<MapPanel aria-label="Fleet map" />)
    const panel = screen.getByRole('region', { name: 'Fleet map' })
    const request = vi.fn()
    ;(panel as HTMLElement).requestFullscreen = request

    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' }))

    expect(request).toHaveBeenCalledTimes(1)
    // The controls are inside the element that goes fullscreen.
    expect(panel.querySelector('[data-slot="map-controls"]')).toBeInTheDocument()
    // `relative` outranks the UA's `:fullscreen` rule, so the panel restates
    // the fixed/inset/size half itself.
    expect(panel.className).toContain('[&:fullscreen]:fixed')
    expect(panel.className).toContain('[&:fullscreen]:inset-0')
  })

  it('exits fullscreen through the document when one is open', () => {
    render(<MapPanel aria-label="Fleet map" />)
    const panel = screen.getByRole('region', { name: 'Fleet map' })
    const exit = vi.fn()
    Object.defineProperty(document, 'fullscreenElement', { value: panel, configurable: true })
    document.exitFullscreen = exit

    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' }))
    expect(exit).toHaveBeenCalledTimes(1)

    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true })
  })

  it('renders the draw toolbar only when editable', () => {
    const { rerender } = render(<MapPanel aria-label="Fleet map" />)
    expect(screen.queryByRole('button', { name: 'Draw polygon' })).not.toBeInTheDocument()

    rerender(<MapPanel aria-label="Fleet map" editable />)
    expect(screen.getByRole('button', { name: 'Draw polygon' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Draw circle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select / edit' })).toBeInTheDocument()
  })
})

describe('MapPanel — one-map-per-page guard', () => {
  it('renders the fallback card instead of a second live map, and logs a console.error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <>
        <MapPanel aria-label="First map" />
        <MapPanel aria-label="Second map" />
      </>,
    )
    expect(screen.getByRole('region', { name: 'First map' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Second map' })).not.toBeInTheDocument()
    expect(screen.getByText('One map per page')).toBeInTheDocument()
    // Deferred one macrotask — see `mount-guard.ts`: a block that resolves in
    // the same commit is a remount handover and is not reported.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(errorSpy).toHaveBeenCalledTimes(1)
  })

  it('never mounts a second live map instance — the guard blocks at render time, before react-map-gl ever constructs a second GL context', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <>
        <MapPanel aria-label="First map" />
        <MapPanel aria-label="Second map" />
      </>,
    )
    // The fake `<Map>`'s mount effect (see test/map-mocks.ts) only ever ran
    // once — the second MapPanel's MapPanelInner (and its child MapLibreMap)
    // never rendered at all, not even for one commit.
    expect(reactMapGlTestState.mountCount).toBe(1)
  })

  it('does not block a single instance rendered under StrictMode (double-render / double-mount-effect)', () => {
    // Note: StrictMode dev-double-invokes EVERY mount effect (ours and the
    // fake `<Map>`'s own), so `mountCount` legitimately lands at 2 here —
    // that's StrictMode's blanket behavior, unrelated to this guard. What
    // this test actually verifies is that the single instance is never
    // blocked by its own StrictMode double-render/double-effect cycle.
    render(
      <StrictMode>
        <MapPanel aria-label="Fleet map" />
      </StrictMode>,
    )
    expect(screen.getByRole('region', { name: 'Fleet map' })).toBeInTheDocument()
    expect(screen.queryByText('One map per page')).not.toBeInTheDocument()
  })

  it('releases the slot on unmount so a subsequent instance can claim it and render a real map', () => {
    const { unmount } = render(<MapPanel aria-label="First map" />)
    unmount()

    render(<MapPanel aria-label="Second map" />)
    expect(screen.getByRole('region', { name: 'Second map' })).toBeInTheDocument()
    expect(screen.queryByText('One map per page')).not.toBeInTheDocument()
    expect(reactMapGlTestState.mountCount).toBe(2)
  })
})

describe('MapPanel — TerraDraw wiring', () => {
  it('reports a completed polygon as GeoJSON via onZoneDrawn', () => {
    const onZoneDrawn = vi.fn()
    render(<MapPanel aria-label="Fleet map" editable onZoneDrawn={onZoneDrawn} />)

    const draw = terraDrawTestState.instances.at(-1)!
    const geojson = {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'Polygon' as const, coordinates: [[[55.2, 25.1], [55.3, 25.1], [55.3, 25.2], [55.2, 25.1]]] },
    }
    draw.__setFeature('shape-1', geojson)
    act(() => draw.__emit('finish', 'shape-1'))

    expect(onZoneDrawn).toHaveBeenCalledWith(geojson)
  })

  it('reports an in-progress edit as GeoJSON via onZoneChanged, ignoring non-update change types', () => {
    const onZoneChanged = vi.fn()
    render(<MapPanel aria-label="Fleet map" editable onZoneChanged={onZoneChanged} />)

    const draw = terraDrawTestState.instances.at(-1)!
    const geojson = {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
    }
    draw.__setFeature('shape-2', geojson)

    act(() => draw.__emit('change', ['shape-2'], 'create')) // not an update — must be ignored
    expect(onZoneChanged).not.toHaveBeenCalled()

    act(() => draw.__emit('change', ['shape-2'], 'update'))
    expect(onZoneChanged).toHaveBeenCalledWith(geojson)
  })

  it('does not construct a TerraDraw instance when editable is false', () => {
    render(<MapPanel aria-label="Fleet map" />)
    expect(terraDrawTestState.instances).toHaveLength(0)
  })

  it('paints a visible focus ring when the map canvas (a tab stop) takes focus (WCAG 2.4.7)', () => {
    render(<MapPanel aria-label="Focusable map" />)
    const region = screen.getByRole('region', { name: 'Focusable map' })
    // MapLibre gives its own canvas `tabindex="0"` and paints
    // `outline-style: none` on it, so the indicator has to come from the
    // region wrapper's `focus-within`.
    expect(region.className).toContain('focus-within:outline-2')
    expect(region.className).toContain('focus-within:outline-primary')
  })
})

describe('MapPanel — popup viewport clamp (round-2 QA popup-close-x)', () => {
  const renderMarkerPopup = () => <div>Vehicle card</div>

  /** jsdom rects are all zeros — stub the panel's and the popup container's
   *  geometry so the clamp has something real to measure. */
  function stubRect(el: Element, rect: { left: number; top: number; right: number; bottom: number }) {
    ;(el as HTMLElement).getBoundingClientRect = () =>
      ({
        ...rect,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top,
        x: rect.left,
        y: rect.top,
        toJSON: () => rect,
      }) as DOMRect
  }

  it('pans the map by exactly the popup overflow — header edge first — when a selection leaves the card cropped', () => {
    const { rerender } = render(
      <MapPanel aria-label="Fleet map" markers={sampleMarkers} selectedMarkerId="m1" renderMarkerPopup={renderMarkerPopup} />,
    )
    const panel = screen.getByRole('region', { name: 'Fleet map' })
    stubRect(panel, { left: 0, top: 0, right: 800, bottom: 600 })
    // The 1280×800 round-2 repro: the card's header row sits 45px ABOVE the
    // map viewport — ✕ / track / open-in-new all pointer-unreachable.
    stubRect(panel.querySelector('.maplibregl-popup')!, { left: 100, top: -45, right: 658, bottom: 454 })

    rerender(
      <MapPanel aria-label="Fleet map" markers={sampleMarkers} selectedMarkerId="m2" renderMarkerPopup={renderMarkerPopup} />,
    )
    // top -45 must land at the 12px edge margin → pan the camera up by 57.
    // (The margin is `POPUP_EDGE_MARGIN`, shared with the anchor resolver.)
    expect(reactMapGlTestState.lastFakeMap!.panBy).toHaveBeenCalledWith([0, -57], { duration: 240 })
  })

  /**
   * A21 root cause: maplibre-gl's native Popup (which react-map-gl's
   * `<Popup>` wraps) defaults `focusAfterOpen` to `true` — it auto-focuses
   * the first tabbable element inside the popup DOM on every open, mouse
   * clicks included. That first element is the header's "Center on vehicle"
   * button, so it always came up with a stray focus-visible ring next to its
   * two plain siblings. `MapPanel` must opt out and let the card's own
   * `focusOnMount` (container-level, WAI-ARIA dialog pattern) govern.
   */
  it('opts the map popup out of maplibre-gl’s focusAfterOpen so it never steals focus onto the first header action (A21)', () => {
    render(
      <MapPanel aria-label="Fleet map" markers={sampleMarkers} selectedMarkerId="m1" renderMarkerPopup={renderMarkerPopup} />,
    )
    const popup = screen.getByTestId('fake-map-popup')
    expect(popup).toHaveAttribute('data-focus-after-open', 'false')
  })

  /**
   * Round-6 UX gate U4 / F44 [SHOULD]. Same destination, no animation — the
   * camera still goes exactly where it was going. Proven on the clamp pan
   * because it is the one camera call with an asserted destination; the shared
   * helper `cameraMotion` covers every other call site and has its own unit
   * test.
   */
  it('jumps instead of easing under prefers-reduced-motion, to the same destination (U4)', () => {
    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia
    try {
      const { rerender } = render(
        <MapPanel aria-label="Fleet map" markers={sampleMarkers} selectedMarkerId="m1" renderMarkerPopup={renderMarkerPopup} />,
      )
      const panel = screen.getByRole('region', { name: 'Fleet map' })
      stubRect(panel, { left: 0, top: 0, right: 800, bottom: 600 })
      stubRect(panel.querySelector('.maplibregl-popup')!, { left: 100, top: -45, right: 658, bottom: 454 })
      rerender(
        <MapPanel aria-label="Fleet map" markers={sampleMarkers} selectedMarkerId="m2" renderMarkerPopup={renderMarkerPopup} />,
      )
      // -57, not -53: the merged clamp keeps the cockpit's viewport-aware
      // band (`popupUsableBand`, POPUP_EDGE_MARGIN = 12) rather than this
      // suite's original bare 8px pane margin — 4px more standoff, same
      // direction, same reduced-motion `duration: 0` this case is about.
      expect(reactMapGlTestState.lastFakeMap!.panBy).toHaveBeenCalledWith([0, -57], { duration: 0 })
    } finally {
      window.matchMedia = originalMatchMedia
    }
  })

  it('leaves the camera alone when the popup already fits inside the map viewport', () => {
    const { rerender } = render(
      <MapPanel aria-label="Fleet map" markers={sampleMarkers} selectedMarkerId="m1" renderMarkerPopup={renderMarkerPopup} />,
    )
    const panel = screen.getByRole('region', { name: 'Fleet map' })
    stubRect(panel, { left: 0, top: 0, right: 800, bottom: 600 })
    // Clear of every avoid-rect: the 12px edge margin, the 60px zoom-control
    // column at the end edge (usable right = 800 - 60 - 12 = 728), and the
    // 24px attribution band at the bottom (usable bottom = 600 - 24 - 12 = 564).
    stubRect(panel.querySelector('.maplibregl-popup')!, { left: 100, top: 20, right: 658, bottom: 520 })

    rerender(
      <MapPanel aria-label="Fleet map" markers={sampleMarkers} selectedMarkerId="m2" renderMarkerPopup={renderMarkerPopup} />,
    )
    expect(reactMapGlTestState.lastFakeMap!.panBy).not.toHaveBeenCalled()
  })

  it('defers the clamp until a selection-driven camera ease settles (the row-click path)', () => {
    const { rerender } = render(<MapPanel aria-label="Fleet map" markers={sampleMarkers} renderMarkerPopup={renderMarkerPopup} />)
    const map = reactMapGlTestState.lastFakeMap!
    const once = vi.fn()
    map.isMoving = () => true
    map.once = once

    rerender(
      <MapPanel aria-label="Fleet map" markers={sampleMarkers} selectedMarkerId="m1" renderMarkerPopup={renderMarkerPopup} />,
    )
    expect(once).toHaveBeenCalledWith('moveend', expect.any(Function))
    expect(map.panBy).not.toHaveBeenCalled()

    const panel = screen.getByRole('region', { name: 'Fleet map' })
    stubRect(panel, { left: 0, top: 0, right: 800, bottom: 600 })
    stubRect(panel.querySelector('.maplibregl-popup')!, { left: 300, top: 100, right: 700, bottom: 620 })
    ;(once.mock.calls[0][1] as () => void)() // the ease's moveend fires
    // bottom 620 over the 564 limit (600 - 24 attribution - 12 margin) → 56.
    expect(map.panBy).toHaveBeenCalledWith([0, 56], { duration: 240 })
  })

  /* ── Popup collision handling — UX MUST H.38 (round-2 P1) ─────────────── */

  it('flips the popup off the pane end edge instead of letting it clip', async () => {
    const { rerender } = render(
      <MapPanel aria-label="Fleet map" markers={sampleMarkers} renderMarkerPopup={renderMarkerPopup} />,
    )
    const map = reactMapGlTestState.lastFakeMap!
    // The 1280 cockpit pane, with the pin near its end edge.
    map.project = () => ({ x: 560, y: 400 })

    rerender(
      <MapPanel aria-label="Fleet map" markers={sampleMarkers} selectedMarkerId="m1" renderMarkerPopup={renderMarkerPopup} />,
    )
    const panel = screen.getByRole('region', { name: 'Fleet map' })
    stubRect(panel, { left: 0, top: 0, right: 630, bottom: 480 })
    stubRect(panel.querySelector('.maplibregl-popup-content')!, { left: 0, top: 0, right: 360, bottom: 300 })

    // Selecting a different marker re-runs the measure effect with the stubs in place.
    rerender(
      <MapPanel aria-label="Fleet map" markers={sampleMarkers} selectedMarkerId="m2" renderMarkerPopup={renderMarkerPopup} />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('fake-map-popup')).toHaveAttribute('data-anchor', 'bottom-right'),
    )
  })

  it('keeps the centered above-the-marker placement when the card fits', async () => {
    const { rerender } = render(
      <MapPanel aria-label="Fleet map" markers={sampleMarkers} renderMarkerPopup={renderMarkerPopup} />,
    )
    const map = reactMapGlTestState.lastFakeMap!
    map.project = () => ({ x: 315, y: 400 })

    rerender(
      <MapPanel aria-label="Fleet map" markers={sampleMarkers} selectedMarkerId="m1" renderMarkerPopup={renderMarkerPopup} />,
    )
    const panel = screen.getByRole('region', { name: 'Fleet map' })
    stubRect(panel, { left: 0, top: 0, right: 630, bottom: 480 })
    stubRect(panel.querySelector('.maplibregl-popup-content')!, { left: 0, top: 0, right: 360, bottom: 300 })

    rerender(
      <MapPanel aria-label="Fleet map" markers={sampleMarkers} selectedMarkerId="m2" renderMarkerPopup={renderMarkerPopup} />,
    )
    await waitFor(() => expect(screen.getByTestId('fake-map-popup')).toHaveAttribute('data-anchor', 'bottom'))
  })
})

describe('MapPanel — map credit + rotation (round-1 UX findings 6 and 9)', () => {
  it('renders the attribution at the pane bottom-START, sized to content, when opted into `visible`', () => {
    // `attribution` defaults to `hidden` (2026-08-31 UCCP attribution-hide
    // fix) — this test opts explicitly into `visible` to assert the
    // licence-compliant control's OWN geometry, independent of the default.
    render(<MapPanel aria-label="Fleet map" markers={sampleMarkers} attribution="visible" />)
    const attribution = screen.getByTestId('fake-map-attribution')
    // ODbL credit obligation: opposite the zoom/fullscreen stack (which sits
    // bottom-end) and never `compact`, so it is never truncated mid-word.
    expect(attribution).toHaveAttribute('data-position', 'bottom-left')
    expect(attribution).toHaveAttribute('data-compact', 'false')
  })

  it('hides the attribution control by default', () => {
    render(<MapPanel aria-label="Fleet map" markers={sampleMarkers} />)
    expect(screen.queryByTestId('fake-map-attribution')).toBeNull()
  })

  /**
   * Rotation is gated on `rotatable`, which DEFAULTS TO TRUE. Disabling it was
   * a live-monitoring-only decision (Figma's control stack has no compass) and
   * it had been applied to every `MapPanel` consumer — dashboard map widgets,
   * `LocationMapSection`, asset/ticketing location maps and FAMS Desk, all of
   * which keep a compass and would silently lose a capability (Phase 7 code
   * review, finding 2).
   */
  it('leaves rotation ENABLED by default, as on main, for every other consumer', () => {
    render(<MapPanel aria-label="Fleet map" markers={sampleMarkers} />)
    const fake = screen.getByTestId('fake-maplibre-map')
    expect(fake).toHaveAttribute('data-drag-rotate', 'true')
    expect(fake).toHaveAttribute('data-pitch-with-rotate', 'true')
    expect(fake).toHaveAttribute('data-touch-pitch', 'true')
    const map = reactMapGlTestState.lastFakeMap!
    expect(map.dragRotate.enabled).toBe(true)
    expect(map.touchZoomRotate.rotationEnabled).toBe(true)
    expect(map.keyboard.rotationEnabled).toBe(true)
    // The compass control is still there to undo a rotation.
    expect(screen.getByRole('button', { name: 'Reset bearing' })).toBeInTheDocument()
  })

  it('disables every rotation path with rotatable={false} (RATIFIED: LM restores no compass)', () => {
    render(<MapPanel aria-label="Fleet map" markers={sampleMarkers} rotatable={false} />)
    const fake = screen.getByTestId('fake-maplibre-map')
    // Declarative half: drag-rotate, ctrl/right-drag and touch pitch.
    expect(fake).toHaveAttribute('data-drag-rotate', 'false')
    expect(fake).toHaveAttribute('data-pitch-with-rotate', 'false')
    expect(fake).toHaveAttribute('data-touch-pitch', 'false')
    // Imperative half: twist-to-rotate and shift+arrow, plus a forced bearing.
    const map = reactMapGlTestState.lastFakeMap!
    expect(map.dragRotate.enabled).toBe(false)
    expect(map.touchZoomRotate.rotationEnabled).toBe(false)
    expect(map.keyboard.rotationEnabled).toBe(false)
    expect(map.getBearing()).toBe(0)
  })
})

describe('MapPanel — anchored popup placement (SPEC P0-2 / UX-11)', () => {
  it('hands the popup an EXPLICIT anchor instead of leaving MapLibre to prefer below-the-marker', () => {
    render(
      <MapPanel
        aria-label="Fleet map"
        markers={sampleMarkers}
        renderMarker={(marker) => <span>{marker.id}</span>}
        selectedMarkerId={sampleMarkers[0]!.id}
        renderMarkerPopup={() => <div>card</div>}
        popupChrome={false}
        popupOffset={62}
      />,
    )
    const popup = screen.getByTestId('fake-map-popup')
    const anchor = popup.getAttribute('data-anchor')
    expect(anchor).toBeTruthy()
    expect(anchor).toMatch(/^(top|bottom)(-(left|right))?$/)
  })

  it('paints the Figma 20x20 pointer on the edge facing the marker for every anchor', () => {
    render(
      <MapPanel
        aria-label="Fleet map"
        markers={sampleMarkers}
        renderMarker={(marker) => <span>{marker.id}</span>}
        selectedMarkerId={sampleMarkers[0]!.id}
        renderMarkerPopup={() => <div>card</div>}
        popupChrome={false}
      />,
    )
    const popup = screen.getByTestId('fake-map-popup')
    expect(popup.querySelector('.maplibregl-popup-tip')).not.toBeNull()
    // The popup carries only the SCOPE class; the tip's size and per-anchor
    // tint live in the injected stylesheet, because a package-authored
    // Tailwind utility lands in `@layer utilities` and loses to MapLibre's
    // unlayered sheet no matter how specific it is. The geometry itself is
    // asserted against the emitted RULE TEXT in `maplibre-popup-reset.test.ts`
    // — asserting a class name here is exactly what let ~20 lines of dead CSS
    // reach Phase 7 (code review finding 1).
    expect(popup.className).toContain(MAPLIBRE_POPUP_CHROMELESS_CLASS)
    expect(popup.className).not.toContain('maplibregl-popup-tip]:border')
  })
})

describe('MapPanel — selection camera framing (P0-2: the card must land ABOVE the marker)', () => {
  /** jsdom rects are all zeros — stub the pane so the framing has a height. */
  function stubPane(el: Element, width: number, height: number) {
    ;(el as HTMLElement).getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
  }

  it('biases a card-opening focus down by half the card block, so the marker is not centred alone', () => {
    const marker = sampleMarkers[0]!
    const { rerender } = render(
      <MapPanel aria-label="Fleet map" markers={sampleMarkers} renderMarkerPopup={() => <div>card</div>} popupOffset={62} />,
    )
    stubPane(screen.getByRole('region', { name: 'Fleet map' }), 1330, 1032)
    rerender(
      <MapPanel
        aria-label="Fleet map"
        markers={sampleMarkers}
        selectedMarkerId={marker.id}
        renderMarkerPopup={() => <div>card</div>}
        popupOffset={62}
        focusPosition={marker.position}
      />,
    )
    // (62 + 448) / 2 = 255 — the marker lands 255px below the pane's centre,
    // which is exactly what makes `computePopupAnchor` prefer `bottom`.
    expect(reactMapGlTestState.lastFakeMap!.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({ offset: [0, 255] }),
    )
  })

  it('keeps the plain centred framing for a focus that opens no card (place search / caller nudge)', () => {
    const marker = sampleMarkers[0]!
    const { rerender } = render(<MapPanel aria-label="Fleet map" markers={sampleMarkers} />)
    stubPane(screen.getByRole('region', { name: 'Fleet map' }), 1330, 1032)
    rerender(<MapPanel aria-label="Fleet map" markers={sampleMarkers} focusPosition={marker.position} />)
    expect(reactMapGlTestState.lastFakeMap!.easeTo).toHaveBeenCalledWith(expect.objectContaining({ offset: [0, 0] }))
  })
})

describe('MapPanel — popup measurement does not fire once per camera frame (round-2 render loop)', () => {
  it('measures the card through a ResizeObserver, not on every viewport change', () => {
    const observed: Element[] = []
    class FakeResizeObserver {
      observe(el: Element) {
        observed.push(el)
      }
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    render(
      <MapPanel
        aria-label="Fleet map"
        markers={sampleMarkers}
        selectedMarkerId={sampleMarkers[0]!.id}
        renderMarkerPopup={() => <div>card</div>}
      />,
    )
    // The popup WRAPPER is observed once — a camera move re-measures only
    // if the card's SIZE actually changed, so a long ease can no longer
    // enqueue one nested update per animation frame (React's
    // NESTED_UPDATE_LIMIT is 50; a selection ease runs ~57 frames).
    // The wrapper (card + visible tip), not the content box, is what has to
    // fit above the marker — round-4 visual N6.
    // Read CLASSLIST TOKENS, not a `className` substring: the popup root
    // carries `[&_.maplibregl-popup-content]:…` variants, so a substring test
    // for the content class matches the WRAPPER too.
    expect(observed).toHaveLength(1)
    expect(observed[0]!.classList.contains('maplibregl-popup')).toBe(true)
    expect(observed[0]!.classList.contains('maplibregl-popup-content')).toBe(false)
    vi.unstubAllGlobals()
  })
})

/**
 * `onViewportChange` (the seam behind "Sync With Map", SPEC §3.22) is
 * THROTTLED at ~100ms and flushed on an animation frame — it must report
 * DURING a pan/pinch (reference-video rule 4), not 300ms after the camera
 * settles, while still keeping a 1,000-row consumer re-filter off every
 * single frame.
 */
describe('MapPanel — onViewportChange throttle', () => {
  it('reports during the gesture (leading edge) and coalesces the frames inside each ~100ms window', () => {
    vi.useFakeTimers()
    const onViewportChange = vi.fn()
    render(<MapPanel aria-label="Fleet map" markers={sampleMarkers} onViewportChange={onViewportChange} />)
    // `handleLoad` already scheduled one call via `syncViewport` on mount —
    // this test is about frames AFTER that.
    act(() => vi.advanceTimersByTime(200))
    onViewportChange.mockClear()

    const move = reactMapGlTestState.lastOnMove!
    const map = reactMapGlTestState.lastFakeMap!

    // First frame of the gesture: the consumer hears about it on the very
    // next animation frame, NOT after the gesture ends.
    act(() => move({ target: map as never, viewState: {} }))
    act(() => vi.advanceTimersByTime(16))
    expect(onViewportChange).toHaveBeenCalledTimes(1)

    // Frames inside the same window coalesce — no per-frame thrash.
    act(() => move({ target: map as never, viewState: {} }))
    act(() => move({ target: map as never, viewState: {} }))
    act(() => vi.advanceTimersByTime(16))
    expect(onViewportChange).toHaveBeenCalledTimes(1)

    // ...but the window's trailing edge still delivers the newest reading,
    // well inside the 300ms the old debounce made the user wait.
    act(() => vi.advanceTimersByTime(120))
    expect(onViewportChange).toHaveBeenCalledTimes(2)

    // A long gesture keeps ticking rather than going silent until it stops.
    for (let i = 0; i < 5; i += 1) {
      act(() => move({ target: map as never, viewState: {} }))
      act(() => vi.advanceTimersByTime(110))
    }
    expect(onViewportChange.mock.calls.length).toBeGreaterThanOrEqual(6)
    vi.useRealTimers()
  })
})

/**
 * Basemap failure — UX-NOTES C16 / UX-6 [MUST], round-5 UX gate S1.
 *
 * Until this landed there was no `error` channel at all: with tiles
 * unreachable the pane fell to blank white, MapLibre's `AJAXError` reached the
 * console unhandled, and there was no message and no Retry — C16's named
 * anti-pattern. This is SHARED surface (every `MapPanel` consumer), so the
 * inert-when-healthy half is tested as hard as the failure half.
 */
describe('MapPanel — basemap failure surface (C16)', () => {
  const renderPanel = (props: Partial<Parameters<typeof MapPanel>[0]> = {}) =>
    render(<MapPanel aria-label="Fleet map" markers={sampleMarkers} {...props} />)

  const emitError = (error = new Error('AJAXError: Failed to fetch')) =>
    act(() => {
      reactMapGlTestState.lastOnError?.({ error })
    })

  it('renders nothing at all while the map is healthy', () => {
    renderPanel()
    expect(document.querySelector('[data-slot="map-error-backdrop"]')).toBeNull()
    expect(document.querySelector('[data-slot="map-error-notice"]')).toBeNull()
  })

  it('leaves a healthy map alone when a single tile errors', () => {
    // A map that loaded its style paints land/water/roads, so a stray tile
    // 404 is NOT the blank-pane failure and must not raise an error state.
    renderPanel()
    emitError()
    expect(document.querySelector('[data-slot="map-error-notice"]')).toBeNull()
  })

  it('shows the muted grid, the message and Retry when the style never loads', () => {
    reactMapGlTestState.suppressLoad = true
    const onMapError = vi.fn()
    renderPanel({ onMapError })
    emitError()
    expect(document.querySelector('[data-slot="map-error-backdrop"]')).not.toBeNull()
    expect(screen.getByText("Map couldn't load")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(onMapError).toHaveBeenCalledTimes(1)
  })

  it('takes environment-specific copy from props and never invents any', () => {
    reactMapGlTestState.suppressLoad = true
    renderPanel({
      errorTitle: 'Offline',
      errorDescription: 'Tiles are proxied on this network.',
      errorRetryLabel: 'Try again',
    })
    emitError()
    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(screen.getByText('Tiles are proxied on this network.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('re-attempts the style on Retry rather than remounting the map', () => {
    reactMapGlTestState.suppressLoad = true
    renderPanel({ styleUrl: 'https://tiles.example/style.json' })
    emitError()
    const mountsBefore = reactMapGlTestState.mountCount
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(reactMapGlTestState.lastFakeMap!.setStyle).toHaveBeenCalledWith('https://tiles.example/style.json', {
      diff: false,
    })
    // Markers/clusters/the open card survive because the map is not remounted.
    expect(reactMapGlTestState.mountCount).toBe(mountsBefore)
  })

  /**
   * Round-6 UX gate U2. The retry used to clear the surface OPTIMISTICALLY:
   * the notice unmounted on press and remounted when the re-attempt failed,
   * measured under 300ms — a flicker indistinguishable from a dead button,
   * and (U1) a destroyed focus target. The notice must now stay put and the
   * button must go busy until the attempt settles.
   */
  it('keeps the notice mounted and busies Retry while the re-attempt is in flight', () => {
    reactMapGlTestState.suppressLoad = true
    renderPanel()
    emitError()
    const retry = screen.getByRole('button', { name: 'Retry' })
    fireEvent.click(retry)
    expect(document.querySelector('[data-slot="map-error-notice"]')).not.toBeNull()
    expect(retry).toBeDisabled()
    expect(retry).toHaveAttribute('aria-busy', 'true')
  })

  it('ends the busy state and leaves the notice up when the re-attempt fails', () => {
    reactMapGlTestState.suppressLoad = true
    renderPanel()
    emitError()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    emitError()
    const retry = screen.getByRole('button', { name: 'Retry' })
    expect(retry).not.toBeDisabled()
    expect(retry).not.toHaveAttribute('aria-busy')
    expect(document.querySelector('[data-slot="map-error-notice"]')).not.toBeNull()
  })

  it('returns focus to Retry after a failed keyboard re-attempt (U1)', () => {
    reactMapGlTestState.suppressLoad = true
    renderPanel()
    emitError()
    const retry = screen.getByRole('button', { name: 'Retry' })
    act(() => retry.focus())
    fireEvent.click(retry)
    // `loading` sets the native `disabled` attribute, so the browser drops
    // focus to <body> here — the control has to take it back on settle.
    emitError()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Retry' }))
  })

  /**
   * Phase 7 code review, finding F3. `once` only removes its handler when it
   * FIRES. A retry that fails therefore used to leave the `style.load` handler
   * armed on the map instance for the rest of the session — and the next
   * successful `setStyle` from ANY other cause (LiveMapView's basemap switcher
   * is exactly that) would run it: `loadFailed` cleared under a still-broken
   * map, and focus yanked to the map canvas from wherever the user had put it,
   * potentially minutes later. The round-7 gate could not see this: it only
   * ever reached a *successful* retry.
   */
  const armRetryListeners = () => {
    const map = reactMapGlTestState.lastFakeMap!
    const armed: Array<{ event: string; cb: () => void }> = []
    map.once = vi.fn((event: string, cb: () => void) => {
      armed.push({ event, cb })
    })
    map.off = vi.fn((event: string, cb: () => void) => {
      const i = armed.findIndex((a) => a.event === event && a.cb === cb)
      if (i >= 0) armed.splice(i, 1)
    })
    return { map, armed }
  }

  it('disarms the style.load listener when the re-attempt FAILS (F3)', () => {
    reactMapGlTestState.suppressLoad = true
    renderPanel()
    emitError()
    const { map, armed } = armRetryListeners()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(map.once).toHaveBeenCalledWith('style.load', expect.any(Function))
    const handler = armed[0]!.cb
    emitError() // the re-attempt fails

    expect(map.off).toHaveBeenCalledWith('style.load', handler)
    expect(armed).toHaveLength(0)

    // Now play the scenario out: a LATER successful style load, from any other
    // cause (the basemap switcher), fires whatever is still armed. Nothing is,
    // so the notice stays up under a still-broken map and focus does not move.
    const before = document.activeElement
    act(() => {
      for (const a of armed.filter((x) => x.event === 'style.load')) a.cb()
    })
    expect(document.querySelector('[data-slot="map-error-notice"]')).not.toBeNull()
    expect(document.activeElement).toBe(before)
  })

  it('arms only ONE style.load listener however often Retry is pressed (F3)', () => {
    reactMapGlTestState.suppressLoad = true
    renderPanel()
    emitError()
    const { armed } = armRetryListeners()
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
      emitError()
    }
    expect(armed).toHaveLength(0)
  })

  it('disarms the style.load listener on unmount (F3)', () => {
    reactMapGlTestState.suppressLoad = true
    const { unmount } = renderPanel()
    emitError()
    const { map, armed } = armRetryListeners()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(armed).toHaveLength(1)
    const handler = armed[0]!.cb
    unmount()
    expect(map.off).toHaveBeenCalledWith('style.load', handler)
    expect(armed).toHaveLength(0)
  })

  it('keeps the marker channel rendering from data while tiles are dead (C16 clause 2)', () => {
    reactMapGlTestState.suppressLoad = true
    renderPanel({ renderMarker: (marker) => <span data-slot="vehicle-marker">{marker.id}</span> })
    emitError()
    expect(document.querySelectorAll('[data-slot="vehicle-marker"]').length).toBeGreaterThan(0)
  })
})
