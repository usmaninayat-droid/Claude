import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  AttributionControl,
  Map as MapLibreMap,
  Popup,
  useControl,
  type MapRef,
  type ViewStateChangeEvent,
} from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import type maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// Zeroes maplibre's own popup padding — see that file for why this is an
// injected style element and not a Tailwind class or a sibling .css file, and
// why the call below has to be explicit.
import {
  installMaplibrePopupReset,
  MAPLIBRE_POPUP_CHROMED_CLASS,
  MAPLIBRE_POPUP_CHROMELESS_CLASS,
} from './maplibre-popup-reset'

installMaplibrePopupReset()
import { cn } from '../lib/cn'
import { handOffFocus } from '../lib/focus-handoff'
import { DEFAULT_MAP_STYLE, DEFAULT_VIEW_STATE, MAP_ATTRIBUTION_STRIP, MAP_MIN_ZOOM } from './constants'
import { DEFAULT_POPUP_SIZE, computeFocusOffset, computePopupAnchor, type MapPopupAnchor } from './popup-anchor'
import { useSingleMapGuard } from './mount-guard'
import { useClusterIndex } from './cluster'
import {
  buildClusteredMarkerLayer,
  buildFlatMarkerLayer,
  buildHeatLayer,
  buildPathsLayer,
  buildZonesLayer,
  type AnyDeckLayer,
  type ZoneHoverInfo,
} from './layers'
import { useGeofenceDraw } from './draw'
import { DomMarkers } from './DomMarkers'
import {
  POPUP_CONTROL_COLUMN,
  POPUP_EDGE_MARGIN,
  popupMaxHeight,
  popupUsableBand,
} from './popup-anchor'
import { useTrafficLayer } from './traffic-layer'
import { useMapLabelOverrides } from './label-overrides'
import { useWeatherOverlayLayers, type WeatherFieldOverlayId } from './weather-overlay-layer'

/** Stable empty default — a fresh `[]` per render would re-key the overlay
 *  effect on every frame. */
const EMPTY_WEATHER_OVERLAYS: WeatherFieldOverlayId[] = []
import { MapControls } from './chrome/MapControls'
import { MapLegend } from './chrome/MapLegend'
import { MapFallbackCard } from './chrome/MapFallbackCard'
import { cameraMotion } from './camera-motion'
import { MapErrorBackdrop, MapErrorNotice } from './chrome/MapErrorState'
import { DrawToolbar } from './chrome/DrawToolbar'
import type { MapPanelProps, MapViewState } from './MapPanel.types'

/**
 * Backstop for the Retry busy state (U2): if a re-attempted style resolves to
 * neither `style.load` nor `error`, the control still has to come back.
 */
const RETRY_SETTLE_TIMEOUT_MS = 10_000

/**
 * `onViewportChange`'s THROTTLE interval — see the doc comment on
 * `syncViewport` below. ~100ms is short enough that the consumer's list
 * visibly re-scopes DURING a pan/pinch (reference-video rule 4) and long
 * enough that a 1,000-row list is not re-filtered on every animation frame.
 */
const VIEWPORT_CHANGE_THROTTLE_MS = 100

/*
 * Default basemap-failure copy. GENERIC English only — the design system
 * already ships strings of this kind ("No results found!"). Anything
 * environment- or tenant-specific must come from props/metadata, never from
 * here (see `MapPanel.types.ts` `errorTitle`/`errorDescription`).
 */
const DEFAULT_MAP_ERROR_TITLE = "Map couldn't load"
const DEFAULT_MAP_ERROR_DESCRIPTION = 'The map background is unavailable. Your data is still shown.'
const DEFAULT_MAP_ERROR_RETRY = 'Retry'

/**
 * MapPanel — the FAMS DS map template, ported from the Leaflet-era reference
 * (`FAMS-Design-System-By-Shaheer/src/components/map/{leaflet-map,map-view,
 * map-marker}.tsx`) onto **MapLibre GL** (via `react-map-gl/maplibre`) with
 * **deck.gl** for every data layer (markers/clusters/heatmap/zones — GPU
 * only, never DOM markers, perf rule 3) interleaved into MapLibre's own
 * WebGL context via `MapboxOverlay({ interleaved: true })`, and **TerraDraw**
 * for geofence draw/edit (`draw.ts`). State-agnostic: everything is data +
 * callbacks, no fetching/store/routing.
 *
 * LAZY-WEIGHT DISCIPLINE (perf rule 7) — this file statically imports
 * `maplibre-gl`, `react-map-gl`, `deck.gl`, and `terra-draw`, which is
 * intentional and safe: `MapPanel` is published from a SEPARATE package
 * entry point, `@fams/v5-templates/map` (see `map/index.ts`), NOT from the
 * package's main `.` barrel — `src/index.ts` never imports anything under
 * `map/`. A consumer that only imports `@fams/v5-templates` (the light
 * barrel) never resolves this file, so none of these libraries reach their
 * bundle. `tsup.config.ts` builds `src/index.ts` and `src/map/index.ts` as
 * two independent entries (`splitting: false`) precisely so this holds at
 * the OUTPUT level too — see that file's header for why a `React.lazy` /
 * dynamic-`import()` split inside a single entry was considered and
 * rejected (esbuild inlines a dynamic import's code into the same output
 * file when there's no sibling entry to split into, so the bytes would ship
 * either way — only a real second entry keeps them out).
 */
export function MapPanel(props: MapPanelProps) {
  const { blocked } = useSingleMapGuard(props.guardSlot)
  if (blocked) return <MapFallbackCard className={props.className} />
  return <MapPanelInner {...props} />
}

function MapPanelInner({
  styleUrl = DEFAULT_MAP_STYLE,
  viewState,
  defaultViewState,
  onViewStateChange,
  onViewportChange,
  markers = [],
  zones = [],
  heat = [],
  paths = [],
  cluster = false,
  clusterOptions,
  onMarkerClick,
  selectedMarkerId,
  renderMarkerPopup,
  onPopupClose,
  onBasemapClick,
  popupMaxWidth = '20rem',
  popupChrome = true,
  popupOffset = 0,
  focusPosition,
  fitBounds,
  fitToMarkersNonce,
  onClusterClick,
  onZoneClick,
  renderMarker,
  renderCluster,
  clusterAriaLabel,
  clusterTooltip,
  pins = [],
  renderPin,
  editable = false,
  onZoneDrawn,
  onZoneChanged,
  legend,
  legendTitle,
  hiddenLegendIds,
  onLegendToggle,
  controls = true,
  controlsVariant = 'stacked',
  hideFullscreenControl = false,
  errorTitle = DEFAULT_MAP_ERROR_TITLE,
  errorDescription = DEFAULT_MAP_ERROR_DESCRIPTION,
  errorRetryLabel = DEFAULT_MAP_ERROR_RETRY,
  onMapError,
  rotatable = true,
  minZoom = MAP_MIN_ZOOM,
  // UCCP product decision 2026-08-31 (central attribution-hide fix): the
  // OpenFreeMap/OSM credit line is hidden by default on every MapPanel
  // consumer app-wide; a caller opts back INTO `visible`/`compact` rather
  // than opting out of it. See the `attribution` prop doc for the licence
  // note.
  attribution = 'hidden',
  canvasFilter,
  traffic = false,
  labelOverrides,
  weatherOverlays,
  chrome,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: MapPanelProps) {
  const mapRef = useRef<MapRef>(null)
  /** The region wrapper — the element that goes fullscreen (see `fullscreen`). */
  const panelRef = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)
  const [viewport, setViewport] = useState<{ bbox: [number, number, number, number]; zoom: number }>({
    bbox: [-180, -85, 180, 85],
    zoom: (viewState ?? defaultViewState ?? DEFAULT_VIEW_STATE).zoom,
  })
  /* Measured card size — the input to BOTH the anchor computation and the
     selection-focus framing below. Declared here (rather than beside the
     measurement effect further down) because the focus effect reads it. */
  const [popupSize, setPopupSize] = useState(DEFAULT_POPUP_SIZE)
  /* Hovered zone → the zone-id chip (SPEC §3.20 / 555:62155, round-4 F3).
     Painted as our own tokenized DOM node rather than deck.gl's `getTooltip`
     HTML, so it themes, respects RTL, and carries `role="tooltip"` — the same
     contract `PoiPin`'s hover tooltip already honours. */
  const [hoveredZone, setHoveredZone] = useState<ZoneHoverInfo | null>(null)

  /* Pseudo-traffic overlay (SPEC 3.19). A NATIVE MapLibre line layer, so it
     interleaves below deck.gl's markers/clusters and above the basemap for
     free — see `traffic-layer.ts`. Inert while `traffic` is false. */
  useTrafficLayer(mapInstance, traffic)
  /* Basemap label renames — re-applied on every `style.load`, because a
     basemap switch replaces the whole style (`label-overrides.ts`). */
  useMapLabelOverrides(mapInstance, labelOverrides)

  /* Weather field overlays (19:25255). Same native-layer strategy as traffic
     above, same stacking result — see `weather-overlay-layer.ts`. Inert while
     no overlay is checked. */
  useWeatherOverlayLayers(mapInstance, weatherOverlays ?? EMPTY_WEATHER_OVERLAYS)

  /*
   * `onViewportChange` (the seam behind "Sync With Map", SPEC §3.22) is
   * THROTTLED at ~100ms and flushed on an animation frame, NOT debounced on
   * `moveend`/`zoomend`.
   *
   * It used to debounce 300ms after the gesture settled, which made the
   * synced list feel frozen mid-pinch and then jump — the reference
   * recording's count instead ticks down continuously while the user is
   * still zooming. A leading-edge emit gives the first frame of a gesture an
   * immediate re-scope, the ~100ms window keeps a 1,000-row re-filter off
   * every animation frame, and the trailing emit guarantees the settled
   * camera is the last reading the consumer receives. `viewport` itself
   * (popup anchoring, the zoom readout) stays on the immediate value.
   */
  const viewportChangeTimerRef = useRef<number | undefined>(undefined)
  const viewportRafRef = useRef<number | undefined>(undefined)
  const viewportPendingRef = useRef<{ bbox: [number, number, number, number]; zoom: number } | null>(null)
  const viewportLastEmitRef = useRef(0)
  const onViewportChangeRef = useRef(onViewportChange)
  useEffect(() => {
    onViewportChangeRef.current = onViewportChange
  })
  useEffect(
    () => () => {
      if (viewportChangeTimerRef.current !== undefined) window.clearTimeout(viewportChangeTimerRef.current)
      if (viewportRafRef.current !== undefined && typeof cancelAnimationFrame === 'function')
        cancelAnimationFrame(viewportRafRef.current)
    },
    [],
  )
  /* Emits the newest pending reading on the next animation frame, so the
     consumer's re-filter lands with the frame the user is already looking
     at rather than one tick behind it. */
  const flushViewport = useCallback(() => {
    viewportRafRef.current = undefined
    const pending = viewportPendingRef.current
    if (!pending) return
    viewportPendingRef.current = null
    viewportLastEmitRef.current = Date.now()
    onViewportChangeRef.current?.(pending.bbox, pending.zoom)
  }, [])
  const scheduleViewportFlush = useCallback(() => {
    if (viewportRafRef.current !== undefined) return
    if (typeof requestAnimationFrame !== 'function') {
      flushViewport()
      return
    }
    viewportRafRef.current = requestAnimationFrame(flushViewport)
  }, [flushViewport])
  const syncViewport = useCallback(
    (map: maplibregl.Map) => {
      const b = map.getBounds()
      const bbox: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
      const zoom = map.getZoom()
      setViewport({ bbox, zoom })
      if (!onViewportChange) return
      viewportPendingRef.current = { bbox, zoom }
      const elapsed = Date.now() - viewportLastEmitRef.current
      if (elapsed >= VIEWPORT_CHANGE_THROTTLE_MS) {
        // Leading edge: the first frame of a gesture re-scopes the list at
        // once, so the count never sits stale while the camera is moving.
        if (viewportChangeTimerRef.current !== undefined) {
          window.clearTimeout(viewportChangeTimerRef.current)
          viewportChangeTimerRef.current = undefined
        }
        scheduleViewportFlush()
        return
      }
      // Inside the window: keep the newest reading and emit it when the
      // window closes (the trailing edge guarantees the settled camera is
      // always the last thing the consumer sees).
      if (viewportChangeTimerRef.current !== undefined) return
      viewportChangeTimerRef.current = window.setTimeout(() => {
        viewportChangeTimerRef.current = undefined
        scheduleViewportFlush()
      }, VIEWPORT_CHANGE_THROTTLE_MS - elapsed)
    },
    [onViewportChange, scheduleViewportFlush],
  )

  /*
   * Basemap failure (UX-NOTES C16 / UX-6 [MUST], round-5 UX gate S1).
   *
   * Until this landed there was no `error` channel at all: with the tile host
   * unreachable MapLibre's `AJAXError` went to the console unhandled and the
   * pane fell to blank white — C16's named anti-pattern.
   *
   * The trigger is deliberately NARROW so this stays inert on a healthy map
   * (it is shared surface — every `MapPanel` consumer gets it). A map that has
   * finished loading its style paints its land/water/road layers, so a stray
   * 404 on one tile of a live basemap is NOT the blank-pane failure and must
   * not raise a full error state. Only a map that has NEVER reached `load`
   * does: that is exactly the case where the canvas draws nothing.
   */
  const [loadFailed, setLoadFailed] = useState(false)
  const styleReadyRef = useRef(false)

  const [retrying, setRetrying] = useState(false)
  const retryTimerRef = useRef<number | undefined>(undefined)
  /**
   * The `once('style.load')` handler armed by the CURRENT retry attempt, kept
   * so a settled attempt can take it back off the map (Phase 7 code review,
   * finding F3). `once` only self-removes when it FIRES: after a retry that
   * fails, the handler stays armed on the map instance, and the next
   * successful `setStyle` from any other cause — LiveMapView's basemap
   * switcher is exactly that — would fire it, clear `loadFailed`, and hand
   * focus to the map canvas from wherever the user had actually put it.
   */
  const retryListenerRef = useRef<{ map: ReturnType<NonNullable<MapRef['getMap']>>; handler: () => void } | undefined>(undefined)
  const detachRetryListener = useCallback(() => {
    const armed = retryListenerRef.current
    retryListenerRef.current = undefined
    if (armed && typeof armed.map.off === 'function') armed.map.off('style.load', armed.handler)
  }, [])
  const endRetry = useCallback(() => {
    if (retryTimerRef.current !== undefined) {
      window.clearTimeout(retryTimerRef.current)
      retryTimerRef.current = undefined
    }
    detachRetryListener()
    setRetrying(false)
  }, [detachRetryListener])
  // Unmount: clears the backstop timer AND disarms the listener.
  useEffect(() => endRetry, [endRetry])

  const handleLoad = useCallback(
    (evt: { target: maplibregl.Map }) => {
      // Only the opted-out caller loses rotation — see `rotatable`. Every
      // other MapPanel consumer keeps MapLibre's defaults, as on main.
      if (!rotatable) disableMapRotation(evt.target)
      styleReadyRef.current = true
      setLoadFailed(false)
      setMapInstance(evt.target)
      syncViewport(evt.target)
    },
    [rotatable, syncViewport],
  )
  const handleError = useCallback(
    (evt: { error?: Error }) => {
      const error = evt.error ?? new Error('Map error')
      onMapError?.(error)
      if (!styleReadyRef.current) setLoadFailed(true)
      // A retry that reaches the error channel has settled (U2). Inert on a
      // healthy map: nothing is ever busy there.
      endRetry()
    },
    [onMapError, endRetry],
  )
  /**
   * Retry re-attempts the STYLE, which is what pulls the tiles: `setStyle`
   * with `diff: false` re-runs the whole fetch chain on the same map instance,
   * so the deck.gl overlay, the markers and any open card survive it (a
   * remount of `<Map>` would tear all three down).
   *
   * It is NOT cleared optimistically any more (round-6 UX gate U1/U2). Doing
   * so unmounted the notice the instant the button was pressed and remounted
   * it when the re-attempt failed — measured at under 300ms, i.e. a flicker
   * indistinguishable from a dead button, and on a slow link the inverse: the
   * card vanishes for seconds, reads as success, then the error returns. It
   * also destroyed the focused node, dropping keyboard focus to `<body>`.
   *
   * The notice now STAYS MOUNTED and the button goes busy (`loading` — the DS
   * convention: spinner + disabled) until the attempt settles. Because the
   * notice is `role="status" aria-live="polite"`, AT users get the state
   * change announced too, which they previously did not.
   */
  const retryMapStyle = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map || typeof map.setStyle !== 'function') return
    setRetrying(true)
    // Success channel. `load` fires once per map instance and has already
    // gone by, so the signal that a RE-attempt worked is `style.load`.
    // A previous attempt's listener, if any, is disarmed before a new one is
    // armed — never two of these on one map.
    detachRetryListener()
    if (typeof map.once === 'function') {
      const onStyleLoad = () => {
        styleReadyRef.current = true
        setLoadFailed(false)
        // The handler has fired, so `once` has already removed it; clearing
        // the ref first stops `endRetry` calling `off` for nothing.
        retryListenerRef.current = undefined
        endRetry()
        // U1: the notice — and with it the focused button — unmounts on
        // success. Hand focus to the map region itself (MapLibre puts
        // `tabindex="0"` on its canvas, and the wrapper draws the
        // `focus-within` ring), which is the surface that just came back.
        if (typeof map.getCanvas === 'function') handOffFocus(map.getCanvas())
      }
      map.once('style.load', onStyleLoad)
      retryListenerRef.current = { map, handler: onStyleLoad }
    }
    // Failure is already wired: `handleError` runs on the same `error`
    // channel and ends the busy state there. This is only the backstop for a
    // style that resolves to neither — the control must never stay busy.
    // Backstop for a style that resolves to neither channel: the control must
    // never stay busy, and the listener must not outlive the attempt.
    retryTimerRef.current = window.setTimeout(() => {
      detachRetryListener()
      setRetrying(false)
    }, RETRY_SETTLE_TIMEOUT_MS)
    try {
      map.setStyle(styleUrl, { diff: false })
    } catch {
      endRetry()
      setLoadFailed(true)
    }
  }, [styleUrl, endRetry, detachRetryListener])
  const handleMove = useCallback(
    (evt: ViewStateChangeEvent) => {
      syncViewport(evt.target)
      if (onViewStateChange) {
        const { longitude, latitude, zoom, pitch, bearing } = evt.viewState
        onViewStateChange({ longitude, latitude, zoom, pitch, bearing })
      }
    },
    [onViewStateChange, syncViewport],
  )

  const clusterIndex = useClusterIndex(markers, clusterOptions)
  // The DOM-marker channel replaces the GPU marker layer entirely (zones and
  // heat stay on the GPU either way) — see `DomMarkers.tsx`'s header.
  const domMarkers = Boolean(renderMarker)
  const layers = useMemo<AnyDeckLayer[]>(() => {
    const list: (AnyDeckLayer | null)[] = [
      buildZonesLayer(
        zones,
        onZoneClick ? (zoneId) => onZoneClick(zones.find((z) => z.id === zoneId)!) : undefined,
        setHoveredZone,
      ),
      buildHeatLayer(heat),
      buildPathsLayer(paths),
      domMarkers
        ? null
        : cluster
          ? buildClusteredMarkerLayer(clusterIndex, markers.length > 0, {
              bbox: viewport.bbox,
              zoom: viewport.zoom,
              onMarkerClick: onMarkerClick ? (markerId) => onMarkerClick(markers.find((m) => m.id === markerId)!) : undefined,
              onClusterClick,
            })
          : buildFlatMarkerLayer(markers, onMarkerClick ? (markerId) => onMarkerClick(markers.find((m) => m.id === markerId)!) : undefined),
    ]
    return list.filter((l): l is AnyDeckLayer => l !== null)
  }, [zones, heat, paths, cluster, domMarkers, markers, clusterIndex, viewport, onMarkerClick, onClusterClick, onZoneClick])

  const draw = useGeofenceDraw({
    editable,
    map: mapInstance,
    onZoneDrawn,
    onZoneChanged,
  })

  const selectedMarker = useMemo(
    () => (selectedMarkerId ? markers.find((marker) => marker.id === selectedMarkerId) : undefined),
    [markers, selectedMarkerId],
  )

  // Escape dismisses the popup wherever focus is inside the panel — the same
  // contract every overlay in the system honours.
  useEffect(() => {
    if (!selectedMarker || !onPopupClose) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onPopupClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [selectedMarker, onPopupClose])

  // MapLibre labels its own canvas with the literal string "Map". That is the
  // whole accessible name of the surface unless it is overwritten with the
  // panel's own sentence (verdict V10).
  useEffect(() => {
    // Optional-chained: `getCanvas` exists on a real MapLibre map only — under
    // jsdom the map is a stub, and a missing canvas must not take the panel down.
    if (typeof mapInstance?.getCanvas !== 'function') return
    mapInstance.getCanvas()?.setAttribute('aria-label', ariaLabel)
  }, [mapInstance, ariaLabel])

  // The CSS-swatch-only basemap variants' filter (see `canvasFilter`'s doc
  // comment) — applied to the canvas element directly via its inline style,
  // never a Tailwind class: the filter value is a runtime-computed CSS
  // function string keyed on the selected basemap id, not a static utility a
  // build step could pick up. Kept OFF the region wrapper so it never
  // touches the chrome/popups/markers stacked above the canvas.
  useEffect(() => {
    if (typeof mapInstance?.getCanvas !== 'function') return
    const canvas = mapInstance.getCanvas()
    if (canvas) canvas.style.filter = canvasFilter ?? ''
  }, [mapInstance, canvasFilter])

  // Declarative camera nudge — see `MapPanelProps.focusPosition`. Keyed on
  // the coordinates (not array identity) so a re-mapped-but-equal prop
  // doesn't re-pan; zoom floors at street level so the focused marker is
  // guaranteed unclustered enough to see.
  const focusLng = focusPosition?.[0]
  const focusLat = focusPosition?.[1]
  // Keyed on the coordinates so an equal-but-new array never re-fits.
  const fitKey = fitBounds ? fitBounds.flat().join(',') : null
  const fitBoundsRef = useRef(fitBounds)
  fitBoundsRef.current = fitBounds

  /* The focus framing needs the card's size and stand-off, and whether a card
     is actually opening at the focused point — but it must NOT re-ease when
     any of those change (a measurement tick re-centring the camera would be
     its own loop). They are therefore read through refs, so the effect below
     keeps firing on the FOCUS TARGET only. */
  const focusIsSelectedMarker =
    Boolean(renderMarkerPopup) &&
    selectedMarker !== undefined &&
    selectedMarker.position[0] === focusLng &&
    selectedMarker.position[1] === focusLat
  const focusFramingRef = useRef({ popup: popupSize, offset: popupOffset, withCard: focusIsSelectedMarker })
  focusFramingRef.current = { popup: popupSize, offset: popupOffset, withCard: focusIsSelectedMarker }

  useEffect(() => {
    const bounds = fitBoundsRef.current
    if (fitKey === null || !bounds || !mapInstance) return
    if (typeof mapInstance.fitBounds !== 'function') return
    // `maxZoom` well below the focusPosition floor of 15 on purpose: the point
    // is to KEEP the surrounding fleet in frame (UX G.35 finding 5), not to
    // dive onto the selection.
    mapInstance.fitBounds(bounds, { padding: 64, maxZoom: 13, duration: 600 })
  }, [fitKey, mapInstance])
  useEffect(() => {
    // A route fit outranks the single-pin nudge — see `fitBounds`' doc.
    if (fitKey !== null) return
    if (focusLng === undefined || focusLat === undefined || !mapInstance) return
    /* Frame the marker AND its card, not the marker alone (P0-2 — see
       `computeFocusOffset`). Centring the marker put its projected point at
       exactly half the pane height, which left the card two pixels short of
       fitting above it at 1920x1080, so every selection flipped the card
       BELOW the marker. Biasing the eased-to centre down by half the card
       block makes the Figma `bottom` anchor satisfiable in the normal case
       and leaves the flip for the real edge cases. A focus that is NOT a
       card-opening selection (place search, a caller's own nudge) keeps the
       plain centred framing. */
    const { popup, offset, withCard } = focusFramingRef.current
    const rect = panelRef.current?.getBoundingClientRect()
    const pane = { width: rect?.width ?? 0, height: rect?.height ?? 0 }
    const focusOffset: [number, number] =
      withCard && pane.height > 0 ? computeFocusOffset({ pane, popup, offset }) : [0, 0]
    mapInstance.easeTo({
      center: [focusLng, focusLat],
      zoom: Math.max(mapInstance.getZoom(), 15),
      offset: focusOffset,
      // U4: same destination, no animation, when the user asks for reduced
      // motion — this ease translates and scales the entire pane.
      ...cameraMotion(),
    })
  }, [focusLng, focusLat, fitKey, mapInstance])

  // Declarative fit-to-fleet — see `MapPanelProps.fitToMarkersNonce`. Marker
  // positions are read through a ref so only the NONCE re-fits (a live
  // position tick must never yank the camera).
  const markersRef = useRef(markers)
  markersRef.current = markers
  useEffect(() => {
    if (!fitToMarkersNonce || !mapInstance || typeof mapInstance.fitBounds !== 'function') return
    // A single marker carrying a non-finite coordinate (business data with a
    // missing lat/lng) used to turn every bound into NaN, which `fitBounds`
    // rejects — leaving the camera at its default view with the real markers
    // off-screen, i.e. ONE bad row silently blanked the whole map. Skip those
    // rows instead, and bail only when nothing plottable is left.
    const current = markersRef.current.filter(
      (m) => Number.isFinite(m.position?.[0]) && Number.isFinite(m.position?.[1]),
    )
    if (current.length === 0) return
    let minLng = Infinity
    let minLat = Infinity
    let maxLng = -Infinity
    let maxLat = -Infinity
    for (const marker of current) {
      minLng = Math.min(minLng, marker.position[0])
      minLat = Math.min(minLat, marker.position[1])
      maxLng = Math.max(maxLng, marker.position[0])
      maxLat = Math.max(maxLat, marker.position[1])
    }
    mapInstance.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 64, maxZoom: 15, ...cameraMotion(600) },
    )
  }, [fitToMarkersNonce, mapInstance])

  // Popup viewport clamp (round-2 QA `popup-close-x`). Dynamic anchoring
  // (see the `<Popup>` below) flips the card when the marker sits near a map
  // edge, but a flip alone cannot save a card TALLER than the space on both
  // sides of a viewport-centered marker — the residual still crops. So once
  // a selection lands (and any selection-driven camera ease settles), the
  // map pans by exactly the popup's overflow, keeping the whole card —
  // header ✕ first — inside the map viewport. Keyed on the SELECTION, never
  // on camera moves, so a user's own pan is never fought.
  const clampKey = selectedMarker && renderMarkerPopup ? selectedMarker.id : null


  /**
   * Frame ticker for the VIEWPORT avoid-rect (round-3 H.38). The pane's
   * position relative to the fold changes on page scroll and window resize —
   * neither of which is a map move — so the anchor and the height cap have to
   * re-resolve on those too. Scroll is captured at the document root because
   * the real scroller is the app's own shell body, not `window`.
   */
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    if (clampKey === null) return
    const bump = () => setFrame((n) => n + 1)
    window.addEventListener('resize', bump)
    document.addEventListener('scroll', bump, true)
    return () => {
      window.removeEventListener('resize', bump)
      document.removeEventListener('scroll', bump, true)
    }
  }, [clampKey])

  /** Pane rect + the viewport expressed in the SAME pane-local pixels. */
  const paneGeometry = useCallback(() => {
    const panel = panelRef.current
    if (!panel) return null
    const rect = panel.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    const viewportHeight = typeof window === 'undefined' ? rect.height : window.innerHeight
    return {
      pane: { width: rect.width, height: rect.height },
      screen: { top: -rect.top, bottom: viewportHeight - rect.top },
    }
  }, [])


  /**
   * Popup height cap (UX MUST H.38(b)) — published to the card as a CSS
   * custom property so the card can pin its header and footer CTA row and
   * scroll only the detail rows. Without it a 435px card in a 480px pane
   * leaves the resolver ~45px of slack and the footer falls off the fold
   * again at the next viewport.
   */
  const popupMaxBlockSize = useMemo<number | null>(() => {
    // `viewport`/`frame` are read, not used: they are the RE-MEASURE TRIGGERS
    // (map move, page scroll, window resize) for a value that comes from the
    // live DOM rect rather than from props.
    void viewport
    void frame
    const geometry = paneGeometry()
    if (!selectedMarker || !geometry) return null
    return Math.round(popupMaxHeight(geometry))
  }, [selectedMarker, viewport, frame, paneGeometry])


  /* ── Anchored-card placement (SPEC P0-2 / UX-11) ─────────────────────────
   * The card is measured once per selection (its size is stable per tab —
   * UX-12) and the anchor is recomputed from the marker's PANE-relative
   * projection on every camera frame, so panning and zooming slide/flip the
   * card and its pointer instead of closing it. */
  /* Measured with a ResizeObserver, NOT re-measured on every camera frame.
   *
   * The camera-frame version (deps `[clampKey, viewport]`) was the round-2
   * "Maximum update depth exceeded": `viewport` is a fresh object on every
   * MapLibre `move`, so a selection's camera ease re-ran this effect once per
   * animation frame, and each run called `setPopupSize` from inside a passive
   * effect. The card's size never actually changed, but the updater's
   * equality bail-out cannot save it — `setViewport` from the move handler
   * has already dirtied the fiber, so React's eager bail-out is skipped and
   * every one of those calls is counted as a nested update. A camera ease
   * longer than React's 50-frame NESTED_UPDATE_LIMIT tripped the warning; a
   * shorter one did not, which is why it was intermittent.
   *
   * The card's size is stable per selection and per tab (UX-12), so it only
   * ever needs measuring when it genuinely changes — exactly what a
   * ResizeObserver reports. The rAF retry covers the frame in which MapLibre
   * has not attached its content element yet (what `viewport` was really
   * being used for); it is bounded so a card that never mounts cannot spin. */
  useEffect(() => {
    if (clampKey === null) return undefined
    const panel = panelRef.current
    if (!panel) return undefined
    let frame = 0
    let attempts = 0
    let cancelled = false
    let observer: ResizeObserver | null = null
    const measure = (el: Element) => {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return // jsdom / display:none
      setPopupSize((prev) =>
        prev.width === rect.width && prev.height === rect.height ? prev : { width: rect.width, height: rect.height },
      )
    }
    const attach = () => {
      if (cancelled) return
      /*
       * The WRAPPER, not `.maplibregl-popup-content` (round-4 visual N6).
       *
       * `popupSize` feeds `computePopupAnchor`'s `fitsAbove` test and
       * `computeFocusOffset`'s framing, and both reason about the box that
       * actually occupies the pane above the marker. That box is the wrapper:
       * card PLUS the visible part of the tip. Measuring the content element
       * understated it by the tip, so `fitsAbove` passed with the card's top
       * up to a tip-height ABOVE the pane — round 4 reproduced the card at
       * y40 against a pane top of y48 (model said 12, actual -8, delta = the
       * 20px tip) and the flip to `anchor-top` only fired a step later.
       *
       * Measuring the wrapper also means the N4 tuck is accounted for for
       * free: the wrapper is 462, not 468, precisely because the tuck is what
       * shortens it. One measurement, no second copy of the tip geometry.
       */
      const el = panel.querySelector('.maplibregl-popup') ?? panel.querySelector('.maplibregl-popup-content')
      if (!el) {
        if (attempts++ > 60) return
        if (typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(attach)
        return
      }
      measure(el)
      if (typeof ResizeObserver === 'function') {
        observer = new ResizeObserver(() => measure(el))
        observer.observe(el)
      }
    }
    attach()
    return () => {
      cancelled = true
      if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [clampKey])

  const popupAnchor = useMemo<MapPopupAnchor>(() => {
    const panel = panelRef.current
    if (!selectedMarker || !mapInstance || typeof mapInstance.project !== 'function' || !panel) return 'bottom'
    const rect = panel.getBoundingClientRect()
    const pane = { width: rect.width || popupSize.width, height: rect.height || popupSize.height }
    let projected: { x: number; y: number }
    try {
      projected = mapInstance.project(selectedMarker.position)
    } catch {
      return 'bottom'
    }
    if (!Number.isFinite(projected?.x) || !Number.isFinite(projected?.y)) return 'bottom'
    return computePopupAnchor({ point: projected, pane, popup: popupSize, offset: popupOffset })
    // `viewport` is the camera-frame trigger: `mapInstance.project` reads
    // live camera state the linter cannot see, and `viewport` changes on
    // every move — exactly when the anchor may need to flip or slide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarker, mapInstance, popupSize, popupOffset, viewport])

  /* The residual camera clamp (cockpit contract, UX MUST H.38) lives AFTER
     the anchor memo because it reacts to the resolved anchor: the anchor
     picks a side, this pans by whatever still overflows the pane ∩ viewport
     band once that side is taken. */
  useEffect(() => {
    if (clampKey === null || !mapInstance) return
    // Type-guarded like `getCanvas` above: under jsdom the map is a stub and
    // a missing method must not take the panel down.
    if (typeof mapInstance.panBy !== 'function') return
    const clamp = () => {
      const panel = panelRef.current
      const popupEl = panel?.querySelector('.maplibregl-popup')
      if (!panel || !popupEl) return
      const bounds = panel.getBoundingClientRect()
      const popup = popupEl.getBoundingClientRect()
      if (popup.width === 0 && popup.height === 0) return // unmeasurable (jsdom / display:none)
      // Same avoid-rects the anchor resolver uses, so the two never fight:
      // the zoom-control column at the end edge and MapLibre's attribution
      // strip along the bottom are no-go bands, not just the raw pane edges.
      const margin = POPUP_EDGE_MARGIN
      let dx = 0
      const usableRight = bounds.right - POPUP_CONTROL_COLUMN - margin
      if (popup.right > usableRight) dx = popup.right - usableRight
      if (popup.left - dx < bounds.left + margin) dx = popup.left - (bounds.left + margin)
      // Vertical band = pane ∩ VIEWPORT (round-3 H.38): the pane itself can
      // hang below the fold, and the card must never follow it there.
      const band = popupUsableBand({
        pane: { width: bounds.width, height: bounds.height },
        screen: { top: -bounds.top, bottom: window.innerHeight - bounds.top },
      })
      const usableTop = bounds.top + band.top
      const usableBottom = bounds.top + band.bottom
      let dy = 0
      if (popup.bottom > usableBottom) dy = popup.bottom - usableBottom
      // Top edge wins over bottom: if the card is taller than the viewport,
      // the header row (✕ / track / open-in-new) is the part that must stay
      // reachable — the round-2 P1 was exactly that row sliding off-screen.
      if (popup.top - dy < usableTop) dy = popup.top - usableTop
      if (dx !== 0 || dy !== 0) mapInstance.panBy([dx, dy], cameraMotion(240))
    }
    // A row-click selection eases the camera first (`focusPosition` effect
    // above) — wait for that to settle so the clamp measures the resting
    // frame; an already-idle camera clamps immediately.
    if (typeof mapInstance.isMoving === 'function' && mapInstance.isMoving() && typeof mapInstance.once === 'function') {
      mapInstance.once('moveend', clamp)
      return () => {
        mapInstance.off?.('moveend', clamp)
      }
    }
    clamp()
    return undefined
  }, [clampKey, mapInstance, popupAnchor, frame])

  // A click that lands on the BASEMAP (not a marker/cluster/pin/popup/control)
  // dismisses the popup — the "closes on selecting elsewhere" half of the
  // popup contract (round-1 QA `popup-close-mapclick`).
  const handleMapClick = useCallback(
    (event: { originalEvent?: MouseEvent; lngLat?: { lng: number; lat: number } }) => {
      if (!onPopupClose && !onBasemapClick) return
      const target = event.originalEvent?.target as HTMLElement | null
      if (
        target?.closest(
          '.maplibregl-marker, .maplibregl-popup, [data-slot="map-controls"], [data-slot="map-panel-popup"], button',
        )
      )
        return
      onPopupClose?.()
      if (event.lngLat) onBasemapClick?.([event.lngLat.lng, event.lngLat.lat])
    },
    [onPopupClose, onBasemapClick],
  )

  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const zoomIn = () => mapRef.current?.getMap().zoomIn()
  const zoomOut = () => mapRef.current?.getMap().zoomOut()
  const resetBearing = () => mapRef.current?.getMap().easeTo({ bearing: 0, pitch: 0, ...cameraMotion() })
  /**
   * Fullscreen is requested on the PANEL (this component's region wrapper), not
   * on MapLibre's own container.
   *
   * The container is a SIBLING of the control stack and the legend, and the
   * fullscreen element is promoted to the top layer — so with the container
   * fullscreen, every piece of chrome stayed in the normal layer, underneath
   * the `::backdrop`. It was still painted and still hit-testable in the
   * abstract, but `elementFromPoint` at the 44×44 "Exit fullscreen" button
   * returned the CANVAS, and no z-index on `[data-slot="map-controls"]` can win
   * against a top-layer sibling (round-3 P1 #6: the exit control, both zoom
   * buttons and reset-bearing were all unclickable in fullscreen).
   *
   * Promoting the wrapper instead puts the chrome INSIDE the fullscreen
   * subtree, where the ordinary stacking context applies again. The wrapper is
   * already `relative h-full w-full`, and the UA's `:fullscreen` rule sizes it
   * to the viewport, so the map (100%/100% of it) fills the screen exactly as
   * before.
   */
  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else panelRef.current?.requestFullscreen?.()
  }

  const camera: Partial<MapViewState> = viewState ?? defaultViewState ?? DEFAULT_VIEW_STATE
  const isControlled = Boolean(viewState)

  return (
    <div
      ref={panelRef}
      role="region"
      data-slot="map-panel"
      data-fullscreen={isFullscreen || undefined}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={cn(
        'relative h-full w-full overflow-hidden rounded-md',
        // In the top layer the panel IS the viewport. The UA's `:fullscreen`
        // rule would size and pin it, but this element carries `relative`,
        // which outranks a UA stylesheet — so the fixed/inset/size half is
        // restated here, and the card's rounding and transparency are dropped
        // so the black `::backdrop` never shows through at the corners.
        '[&:fullscreen]:fixed [&:fullscreen]:inset-0 [&:fullscreen]:h-screen [&:fullscreen]:w-screen',
        '[&:fullscreen]:rounded-none [&:fullscreen]:bg-card',
        // MapLibre puts `tabindex="0"` on its own canvas, so the map IS a tab
        // stop — but the canvas paints its own `outline-style: none`, which
        // left the strongest keyboard target on the page with no focus
        // indicator at all (WCAG 2.4.7). The ring is drawn by the region
        // wrapper on `focus-within` and inset, because the wrapper clips its
        // children and an outward outline would be trimmed by the card.
        // `outline-primary`, not `outline-ring`: `--color-ring` is a pale tint
        // that reads fine on a card surface and disappears over map imagery,
        // which can be any colour. (The pale `--color-ring` is a DS-wide
        // question, logged separately — this is not the place to change it.)
        'focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-primary',
        // BASEMAP ATTRIBUTION (licence compliance, not cosmetics). MapLibre
        // anchors its attribution control bottom-END — directly under our
        // 44px `MapControls` stack — where the pane's `overflow-hidden`
        // clipped the licence text at both widths ("Data from OpenStreet…").
        // Relocate it to the free bottom-START corner (the legend lives
        // top-START) and let it wrap instead of truncating. Logical
        // properties, so it flips with the document direction.
        '[&_.maplibregl-ctrl-bottom-right]:start-0 [&_.maplibregl-ctrl-bottom-right]:end-auto',
        '[&_.maplibregl-ctrl-attrib]:max-w-[min(100%,28rem)] [&_.maplibregl-ctrl-attrib]:whitespace-normal',
        className,
      )}
      /*
       * QA A18 — the attribution strip's height, published to the floating
       * chrome as a custom property. The bottom-START tool stack has to clear
       * the strip, but the bottom-END zoom/fullscreen stack sits at a flat
       * 16px because the strip is not under it. With the strip hardcoded at
       * 28px in the chrome, the two stacks' bottoms could never line up, and
       * with `attribution: 'hidden'` the start stack reserved space for a
       * control that no longer renders. Publishing the real value lets the
       * chrome resolve `16px + strip` and land on 16px exactly whenever the
       * strip is gone.
       */
      style={{ '--fams-map-attribution-strip': attribution === 'hidden' ? '0px' : `${MAP_ATTRIBUTION_STRIP}px` } as CSSProperties}
    >
      {/* FIRST child on purpose: it paints UNDER MapLibre's canvas, which is
          transparent when no style ever loaded — so the grid replaces the
          blank pane while markers/clusters/the open card (overlay layers
          above the canvas) keep rendering from data, which is C16's second
          clause. */}
      {loadFailed ? <MapErrorBackdrop /> : null}
      <MapLibreMap
        ref={mapRef}
        mapStyle={styleUrl}
        {...(isControlled
          ? { longitude: camera.longitude, latitude: camera.latitude, zoom: camera.zoom, pitch: camera.pitch, bearing: camera.bearing }
          : { initialViewState: camera })}
        onLoad={handleLoad}
        onError={handleError}
        onMove={handleMove}
        onClick={handleMapClick}
        // Gated on `rotatable` (default TRUE = MapLibre's own defaults, i.e.
        // main's behaviour for every consumer). Live Monitoring passes
        // `rotatable={false}`: UX finding 9 (RATIFIED) — Figma's control stack
        // carries no compass, so rather than restoring one, rotation is
        // disabled outright, since a rotated camera would be an un-undoable
        // state. Pitch goes with it (the Figma map is always plan view).
        // `disableMapRotation` (on load) closes the touch + keyboard paths
        // these props don't.
        dragRotate={rotatable}
        pitchWithRotate={rotatable}
        touchPitch={rotatable}
        // QA A2: the camera floor. Handed to MapLibre itself rather than
        // policed in `onMove`, so the WHEEL, pinch and keyboard paths are all
        // clamped by the same rule and no gesture can overshoot into the
        // tile-less void the audit reproduced. See `MAP_MIN_ZOOM`.
        minZoom={minZoom}
        // ODbL credit obligation (UX finding 6, BLOCKING): MapLibre's default
        // bottom-RIGHT attribution sat under the zoom/fullscreen stack and was
        // truncated mid-word ("…Data from OpenStreetM"). It moves to the
        // bottom-START, opposite that stack, sized to its content; the
        // floating chrome reserves its strip (see `MAP_ATTRIBUTION_STRIP`).
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        {/* QA A17: `attribution` selects between the full credit line, the
            collapsed "i" affordance, and no control at all. `hidden` is the
            default as of the 2026-08-31 UCCP attribution-hide fix — a
            caller now opts back INTO `visible`/`compact` explicitly. */}
        {attribution === 'hidden' ? null : (
          <AttributionControl
            position="bottom-left"
            compact={attribution === 'compact'}
            // Sized to content and never ellipsized — the OSM/ODbL credit is a
            // licensing obligation, not decoration (UX finding 6).
            style={attribution === 'compact' ? undefined : { maxWidth: 'none', whiteSpace: 'nowrap' }}
          />
        )}
        <DeckOverlay layers={layers} interleaved />
        {hoveredZone ? (
          /*
           * `dir="ltr"` on the POSITIONING layer only: deck.gl reports the
           * pick in canvas pixels measured from the physical left edge in
           * both directions, so the offset must be resolved against that same
           * edge. The chip inside restores content-driven direction, so
           * Arabic zone names still lay out correctly (`dir="auto"`).
           */
          <span dir="ltr" className="pointer-events-none absolute inset-0 overflow-hidden">
            <span
              dir="auto"
              role="tooltip"
              data-slot="map-zone-chip"
              style={{ insetInlineStart: hoveredZone.x + 12, top: hoveredZone.y + 12 }}
              className="absolute w-max max-w-56 truncate rounded-sm bg-foreground/90 px-2 py-1 text-start text-caption text-background"
            >
              {hoveredZone.label && hoveredZone.label !== hoveredZone.zoneId
                ? `${hoveredZone.zoneId} · ${hoveredZone.label}`
                : hoveredZone.zoneId}
            </span>
          </span>
        ) : null}
        {renderPin && pins.length ? (
          // POI-style overlay pins — the non-clustered DOM channel (spec §1.4).
          <DomMarkers
            markers={pins}
            bbox={viewport.bbox}
            zoom={viewport.zoom}
            renderMarker={renderPin}
            collideChips={false}
          />
        ) : null}
        {renderMarker ? (
          <DomMarkers
            markers={markers}
            index={cluster ? clusterIndex : undefined}
            bbox={viewport.bbox}
            zoom={viewport.zoom}
            renderMarker={renderMarker}
            renderCluster={renderCluster}
            onClusterClick={onClusterClick}
            clusterAriaLabel={clusterAriaLabel}
            clusterTooltip={clusterTooltip}
            priorityMarkerId={selectedMarkerId}
          />
        ) : null}
        {selectedMarker && renderMarkerPopup ? (
          // `anchor` is computed (see `popup-anchor.ts`): PREFER above the
          // marker, flip below / to a corner only when the card would cross
          // a pane edge. A hard `anchor="bottom"` cannot do the second half
          // (round-2 QA `popup-close-x`: the header ✕ slid under the sticky
          // top nav at 1280×800), and MapLibre's own dynamic anchoring
          // cannot do the first (round-1 P0 #1: card 109px BELOW).
          <Popup
            longitude={selectedMarker.position[0]}
            latitude={selectedMarker.position[1]}
            // Computed, not MapLibre's own: its dynamic anchoring prefers
            // `top` (card BELOW the marker) whenever there is room below,
            // which is how round-1 shipped a card floating 109px under its
            // marker (visual P0 #1). `computePopupAnchor` PREFERS `bottom`
            // (card above, per Figma 495:2998) and flips/corners only at a
            // pane edge — recomputed every camera frame, so pan/zoom slide
            // the card instead of closing it (UX-11).
            anchor={popupAnchor}
            // A21 root cause: react-map-gl's `<Popup>` wraps maplibre-gl's
            // native Popup, whose `focusAfterOpen` DEFAULTS TO TRUE — it
            // auto-focuses the first tabbable element inside the popup DOM
            // on every open, mouse-triggered included. That first element is
            // the header's "Center on vehicle" button, so it always came up
            // with a visible `:focus-visible` ring next to its two plain
            // siblings — read as a stuck/pressed state, not a real toggle.
            // This raced `VehiclePopupCard`'s OWN `focusOnMount` (which moves
            // focus to the dialog CONTAINER, per WAI-ARIA dialog pattern) and
            // won because MapLibre's popup-open focus call runs after mount.
            // Disabling it here lets the card's own container-focus stand;
            // a real keyboard user tabbing to that button still gets its
            // `focus-visible` ring — this only stops the open-by-mouse case.
            focusAfterOpen={false}
            closeOnClick={false}
            // The rendered card brings its own labeled 40x40 close X — the
            // MapLibre wrapper's default tiny × duplicated it (round-3 visual
            // P2, revealed by the fix2 viewport clamp).
            closeButton={false}
            onClose={onPopupClose}
            maxWidth={popupMaxWidth}
            offset={popupOffset}
            className={
              popupChrome
                ? // Chromed: the DS card surface (rounded-lg / border-border /
                  // bg-card / shadow-md / p-0) lives in the INJECTED sheet too,
                  // for exactly the reason spelled out below — the six Tailwind
                  // arbitrary variants that used to sit here were the same dead
                  // code one branch over (Phase 7 code review, finding F1), so
                  // every chromed popup rendered MapLibre's 3px white chrome.
                  // This class is only the SCOPE the injected sheet keys on.
                  MAPLIBRE_POPUP_CHROMED_CLASS
                : // Chrome-less: the body brings its own surface, so the
                  // wrapper goes fully transparent — but MapLibre's OWN tip
                  // stays, tinted to the card, because it is the only anchor
                  // pointer that FOLLOWS the computed anchor. (A pointer
                  // hardcoded to the card's bottom edge aims at empty map the
                  // moment MapLibre flips the card below or to a corner —
                  // round-4 P1 `popup-pointer-aims-at-nothing`. The card is
                  // therefore rendered with `pointer={false}` on the map.)
                  //
                  // ALL of that — the transparent surface AND the Figma 20x20
                  // tip geometry and its per-anchor tint — lives in the
                  // INJECTED sheet (`maplibre-popup-reset.ts`), not in classes
                  // here. Package-authored Tailwind utilities land in
                  // `@layer utilities` and unlayered vendor CSS (which
                  // `maplibre-gl.css` is) beats any layered rule, so the ~20
                  // arbitrary variants that used to sit here were dead code
                  // that read as working (Phase 7 code review, finding 1).
                  // This class is only the SCOPE the injected sheet keys on.
                  MAPLIBRE_POPUP_CHROMELESS_CLASS
            }
          >
            {/* The height cap travels as an INHERITED custom property on our
                own wrapper (react-map-gl does not forward `style` to the
                popup container), so the CARD owns what scrolls (detail rows)
                and what stays pinned (header + footer CTA row) — H.38(b). */}
            <div
              data-slot="map-panel-popup"
              style={
                popupMaxBlockSize
                  ? ({ '--fams-popup-max-block-size': `${popupMaxBlockSize}px` } as CSSProperties)
                  : undefined
              }
            >
              {renderMarkerPopup(selectedMarker)}
            </div>
          </Popup>
        ) : null}
      </MapLibreMap>

      {controls && (
        <MapControls
          variant={controlsVariant}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetBearing={resetBearing}
          onFullscreen={fullscreen}
          fullscreen={isFullscreen}
          hideFullscreen={hideFullscreenControl}
        />
      )}
      {/* Extra floating chrome (the live map's tool stack). Rendered INSIDE
          the region wrapper, which is also the element promoted to
          fullscreen — chrome mounted as a sibling of `MapPanel` would stay
          in the normal layer, under the `::backdrop`, and become
          unclickable (the round-3 P1 the `fullscreen` handler documents). */}
      {chrome}
      {loadFailed ? (
        <MapErrorNotice
          title={errorTitle}
          description={errorDescription}
          retryLabel={errorRetryLabel}
          onRetry={retryMapStyle}
          retrying={retrying}
        />
      ) : null}
      {legend && legend.length > 0 && (
        <MapLegend entries={legend} title={legendTitle} hiddenIds={hiddenLegendIds} onToggle={onLegendToggle} />
      )}
      {editable && <DrawToolbar mode={draw.mode} onModeChange={draw.setDrawMode} />}
    </div>
  )
}

/**
 * Disables every rotation path MapLibre exposes (UX finding 9, RATIFIED
 * DECISION — the compass control is NOT restored; rotation simply cannot
 * happen, so there is no un-undoable rotated state to escape from).
 * `dragRotate` / `pitchWithRotate` / `touchPitch` are handled declaratively
 * on `<Map>`; these two handlers have no React prop that keeps their zoom
 * half working, so their rotation halves are switched off here. Every call
 * is optional-chained: under jsdom the map is a stub.
 */
export function disableMapRotation(map: maplibregl.Map): void {
  map.dragRotate?.disable?.()
  // Keeps pinch-zoom, drops twist-to-rotate.
  map.touchZoomRotate?.disableRotation?.()
  // Keeps arrow-pan and +/- zoom, drops shift+arrow rotate/pitch.
  map.keyboard?.disableRotation?.()
  if (typeof map.setBearing === 'function' && map.getBearing?.() !== 0) map.setBearing(0)
}

/** Rendered as a child of `<Map>` so `useControl` resolves the MapLibre
 *  context — mounts one `MapboxOverlay` for the map's lifetime and pushes
 *  new layers into it reactively via `setProps` (never remounts the
 *  overlay itself on a layers change). */
function DeckOverlay({ layers, interleaved }: { layers: AnyDeckLayer[]; interleaved: boolean }) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay({ interleaved, layers: [] }))
  useEffect(() => {
    overlay.setProps({ layers })
  }, [overlay, layers])
  return null
}
