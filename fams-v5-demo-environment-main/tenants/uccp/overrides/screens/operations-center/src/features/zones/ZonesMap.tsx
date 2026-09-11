import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LeafletMap, type LeafletMapHandle, type MapZone } from '@ds/components/map'
import { cn } from '@fams/design-system'
import { X, Plus, Minus, Maximize2, LocateFixed, Tag, Shapes, MapPin } from 'lucide-react'
import {
  ZONES_MAP_CENTER, ZONES_MAP_ZOOM, polygonCentroid, pointInPolygon,
  type LatLng, type Zone,
} from './zonesData'

/** Fill opacity by state — selection reads as a deeper wash of the zone's own colour. */
const FILL_DEFAULT = 0.16
const FILL_HOVER = 0.3
const FILL_SELECTED = 0.45
// While a zone is selected the rest recede to 40% of their normal fill (−60%),
// so focus lands on the active zone.
const DIM_FACTOR = 0.8

/**
 * Fade a zone's stroke toward the CARTO Voyager land tint. The DS `MapZone`
 * exposes `fillOpacity` but no stroke opacity, and Leaflet paints the border
 * from the `color` attribute — so the only way to fade the border is to lighten
 * the colour itself. Blends 68% toward #E9E7DF.
 */
function fadeStroke(hex: string): string {
  const h = hex.replace('#', '')
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  const tgt = [0xe9, 0xe7, 0xdf]
  const mix = (v: number, t: number) => Math.round(v + (t - v) * 0.68)
  return '#' + c.map((v, i) => mix(v, tgt[i]).toString(16).padStart(2, '0')).join('')
}

/** Popup field: the zone's parent (a chip that focuses it). Null when a root. */
function ParentZoneField({ zone, onSelect }: { zone: Zone; onSelect: (id: string) => void }) {
  if (!zone.parentId) return null
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
        <Shapes className="size-3.5 text-amber-500" /> Parent Zone
      </div>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => onSelect(zone.parentId!)}
          title={`Focus ${zone.parentId}`}
          className="rounded-[2px] px-2 py-0.5 text-xs font-semibold border bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/20 transition-colors hover:bg-amber-500/25"
        >
          {zone.parentId}
        </button>
      </div>
    </div>
  )
}

/** Popup field: the zone's children (chips that focus them). Hidden when none. */
function ChildZonesField({ zone, onSelect }: { zone: Zone; onSelect: (id: string) => void }) {
  const kids = zone.children ?? []
  if (kids.length === 0) return null
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
        <Shapes className="size-3.5" /> Child Zones
      </div>
      <div className="flex flex-wrap gap-1">
        {kids.slice(0, 2).map((child, i) => (
          <button
            key={child.id}
            type="button"
            onClick={() => onSelect(child.id)}
            title={`Focus ${child.id}`}
            className={cn(
              'rounded-[2px] px-2 py-0.5 text-xs font-medium border transition-colors',
              i === 0
                ? 'bg-pink-500/12 text-pink-700 dark:text-pink-400 border-pink-500/20 hover:bg-pink-500/25'
                : 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/25'
            )}
          >
            {child.id}
          </button>
        ))}
        {kids.length > 2 ? (
          <span className="rounded-[2px] bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            +{kids.length - 2}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export interface ZonesMapProps {
  /** All flat zones (root + child zones) visible on the map. */
  zones: Zone[]
  selectedId: string | null
  hoverId: string | null
  onSelect: (id: string | null) => void
  onHover: (id: string | null) => void
  className?: string
}

/**
 * The hybrid view's map half — DS `LeafletMap` painting polygons for each zone,
 * colored name chip tooltip on hover, and detailed popup modal on click.
 */
export function ZonesMap({
  zones, selectedId, hoverId, onSelect, onHover, className,
}: ZonesMapProps) {
  const mapRef = useRef<LeafletMapHandle>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  // Bumped on every pan/zoom. It is a real dependency of the projected overlay
  // positions below — without it they'd re-render at their stale coordinates.
  const [nonce, setNonce] = useState(0)
  const reproject = useCallback(() => setNonce((n) => n + 1), [])

  // Cursor position (container px) while hovering a zone ON THE MAP. Null when
  // the pointer isn't over a zone on the map — which is also the case for a
  // hover driven from the list, so the tooltip falls back to the zone centre.
  const [mapCursor, setMapCursor] = useState<{ x: number; y: number } | null>(null)

  /* Leaflet mounts asynchronously — poll until `project()` answers, then draw
     the overlay. */
  useEffect(() => {
    let raf = 0
    let tries = 0
    const attempt = () => {
      if (mapRef.current?.project(ZONES_MAP_CENTER)) reproject()
      else if (tries++ < 180) raf = requestAnimationFrame(attempt)
    }
    attempt()
    return () => cancelAnimationFrame(raf)
  }, [reproject])

  useEffect(() => { reproject() }, [zones, reproject])

  /**
   * Frame a zone: centre it and zoom so it fills the viewport, WITHOUT jumping
   * to a fixed level (the old `flyTo(centroid, 13)` zoomed out on tight zones).
   * The DS handle exposes no `fitBounds`, so infer the current zoom from
   * `project()` pixel spacing, measure the zone's pixel bbox, and derive the
   * zoom delta that makes it fill ~55% of the pane. The centre is biased north
   * so the zone sits lower and its popup (anchored above) lands centred.
   */
  const fitZone = useCallback((zone: Zone) => {
    const h = mapRef.current
    const wrap = wrapRef.current
    if (!h || !wrap) return
    const c = polygonCentroid(zone.points)
    const p0 = h.project(c)
    const pLng = h.project([c[0], c[1] + 0.1])
    if (!p0 || !pLng) { h.flyTo(c); return }
    const pxPerDegLng = Math.abs(pLng.x - p0.x) / 0.1
    const zc = Math.log2((pxPerDegLng * 360) / 256) // current zoom
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity
    for (const pt of zone.points) {
      const p = h.project(pt)
      if (!p) continue
      minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x)
      miny = Math.min(miny, p.y); maxy = Math.max(maxy, p.y)
    }
    const pxW = Math.max(maxx - minx, 1), pxH = Math.max(maxy - miny, 1)
    const rect = wrap.getBoundingClientRect()
    const fill = 0.55
    const z = Math.max(11, Math.min(16, Math.floor(Math.min(
      zc + Math.log2((rect.width * fill) / pxW),
      zc + Math.log2((rect.height * fill) / pxH),
    ))))
    // Push the map centre north by ~14% of the pane so the zone drops below
    // centre, leaving the popup room up top. metres/px → deg lat at zoom z.
    const degLatPerPx = (156543.03 * Math.cos((c[0] * Math.PI) / 180) / 2 ** z) / 111320
    h.flyTo([c[0] + rect.height * 0.14 * degLatPerPx, c[1]], z)
  }, [])

  /* Frame a zone whenever it becomes selected (not on unrelated zone changes). */
  const zonesRef = useRef(zones)
  zonesRef.current = zones
  useEffect(() => {
    if (!selectedId) return
    const zone = zonesRef.current.find((z) => z.id === selectedId)
    if (zone) fitZone(zone)
  }, [selectedId, fitZone])

  const mapZones: MapZone[] = useMemo(
    () =>
      zones.map((z) => {
        // Dimmed = a selection is active and this isn't the focused/hovered zone.
        const dim = selectedId != null && z.id !== selectedId && z.id !== hoverId
        return {
          id: z.id,
          points: z.points,
          // Fade both fill and border for dimmed zones.
          color: dim ? fadeStroke(z.color) : z.color,
          fillOpacity:
            z.id === selectedId
              ? FILL_SELECTED
              : z.id === hoverId
                ? FILL_HOVER
                : dim
                  ? FILL_DEFAULT * DIM_FACTOR
                  : FILL_DEFAULT,
        }
      }),
    [zones, selectedId, hoverId]
  )

  /* px ↔ latlng inverse projection for hit testing */
  const pxToLatLng = useCallback((x: number, y: number): LatLng | null => {
    const h = mapRef.current
    if (!h) return null
    const c = ZONES_MAP_CENTER
    const p0 = h.project(c)
    const pLat = h.project([c[0] + 0.01, c[1]])
    const pLng = h.project([c[0], c[1] + 0.01])
    if (!p0 || !pLat || !pLng) return null
    const aLat = { x: (pLat.x - p0.x) / 0.01, y: (pLat.y - p0.y) / 0.01 }
    const aLng = { x: (pLng.x - p0.x) / 0.01, y: (pLng.y - p0.y) / 0.01 }
    const det = aLat.x * aLng.y - aLng.x * aLat.y
    if (!det) return null
    const dx = x - p0.x, dy = y - p0.y
    return [c[0] + (dx * aLng.y - aLng.x * dy) / det, c[1] + (aLat.x * dy - dx * aLat.y) / det]
  }, [])

  const localPoint = (e: { clientX: number; clientY: number }) => {
    const r = wrapRef.current?.getBoundingClientRect()
    return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : null
  }

  /** Topmost zone under a container-space point, or null. */
  const zoneAt = useCallback(
    (x: number, y: number): Zone | null => {
      const ll = pxToLatLng(x, y)
      if (!ll) return null
      for (let i = zones.length - 1; i >= 0; i--) {
        if (pointInPolygon(ll, zones[i].points)) return zones[i]
      }
      return null
    },
    [pxToLatLng, zones]
  )

  /* Capture-phase hit testing on wrapper */
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    // Clicks on the popup / search / controls aren't map clicks — the chip
    // buttons drive selection themselves; ignore them here so they don't also
    // deselect or re-pick the zone underneath.
    const onChrome = (e: MouseEvent) => !!(e.target as HTMLElement)?.closest?.('[data-zones-ui]')
    const onClick = (e: MouseEvent) => {
      if (onChrome(e)) return
      const p = localPoint(e)
      if (!p) return
      // A click on empty map (no zone under the cursor) clears the selection.
      onSelect(zoneAt(p.x, p.y)?.id ?? null)
    }
    const onMove = (e: MouseEvent) => {
      if (onChrome(e)) { onHover(null); setMapCursor(null); return }
      const p = localPoint(e)
      if (!p) return
      const hit = zoneAt(p.x, p.y)
      onHover(hit?.id ?? null)
      // Track the cursor only while it's over a zone, so the tooltip follows it.
      setMapCursor(hit ? p : null)
    }
    const onLeave = () => { onHover(null); setMapCursor(null) }
    el.addEventListener('click', onClick, true)
    el.addEventListener('mousemove', onMove, true)
    el.addEventListener('mouseleave', onLeave, true)
    return () => {
      el.removeEventListener('click', onClick, true)
      el.removeEventListener('mousemove', onMove, true)
      el.removeEventListener('mouseleave', onLeave, true)
    }
  }, [zoneAt, onSelect, onHover])

  const selectedZone = useMemo(() => zones.find((z) => z.id === selectedId), [zones, selectedId])
  // `nonce` is what re-runs these on pan/zoom — the zone itself never changes
  // while the map moves under it, so it can't be the only dependency.
  const selectedPt = useMemo(() => {
    if (!selectedZone) return null
    return mapRef.current?.project(polygonCentroid(selectedZone.points))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZone, nonce])

  const hoverZone = useMemo(() => {
    if (!hoverId || hoverId === selectedId) return null
    return zones.find((z) => z.id === hoverId)
  }, [hoverId, selectedId, zones])

  // Where the hover tooltip anchors: at the cursor when hovering on the MAP
  // (`centered: false` → sits just above the pointer), or at the zone centre
  // when the hover was driven from the LIST (`centered: true`).
  const hoverAnchor = useMemo(() => {
    if (!hoverZone) return null
    if (mapCursor) return { x: mapCursor.x, y: mapCursor.y, centered: false }
    const c = mapRef.current?.project(polygonCentroid(hoverZone.points))
    return c ? { x: c.x, y: c.y, centered: true } : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverZone, mapCursor, nonce])

  return (
    <div
      ref={wrapRef}
      className={cn('relative isolate overflow-hidden rounded-[6px] border border-border bg-card', className)}
    >
      <LeafletMap
        ref={mapRef}
        center={ZONES_MAP_CENTER}
        zoom={ZONES_MAP_ZOOM}
        zones={mapZones}
        onViewportChange={reproject}
        className="h-full w-full"
      />

      {/* Colored name chip tooltip on hover */}
      {hoverZone && hoverAnchor ? (
        <div className="pointer-events-none absolute inset-0 z-[800] overflow-hidden">
          <span
            className="absolute whitespace-nowrap rounded-[4px] px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg animate-in fade-in duration-100"
            style={{
              left: hoverAnchor.x,
              // Cursor hover: float just above the pointer. List hover: centre on the zone.
              top: hoverAnchor.centered ? hoverAnchor.y : hoverAnchor.y - 12,
              transform: hoverAnchor.centered ? 'translate(-50%,-50%)' : 'translate(-50%,-100%)',
              background: hoverZone.color,
            }}
          >
            {hoverZone.name} ({hoverZone.id})
          </span>
        </div>
      ) : null}

      {/* Map Popup Modal above selected zone on click */}
      {selectedZone && selectedPt ? (
        <div
          data-zones-ui
          className="pointer-events-auto absolute z-[850] w-[350px] max-w-[calc(100vw-2rem)] rounded-[6px] border border-border bg-card p-4 shadow-xl animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: selectedPt.x,
            top: selectedPt.y - 12,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {/* Downward triangle pointer stem */}
          <div className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border-b border-r border-border bg-card" />

          {/* Header */}
          <div className="relative flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-[4px] text-white shadow-sm"
                style={{ background: selectedZone.color }}
              >
                <Shapes className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-foreground truncate">{selectedZone.name}</div>
                <div className="text-xs font-semibold text-muted-foreground">{selectedZone.id}</div>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close details popup"
              onClick={(e) => { e.stopPropagation(); onSelect(null) }}
              className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="h-px w-full bg-border mb-3" />

          {/* Body Grid. Right column = Parent Zone when there is one; a root has
              no parent, so its Child Zones take that first-row slot beside Tags
              instead of sitting under them. */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Column 1: Tags — plus Child Zones underneath only for a nested
                zone (whose right column is taken by its Parent). */}
            <div className="flex flex-col gap-2.5">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                  <Tag className="size-3.5" /> Tags
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedZone.tags.length > 0 ? (
                    selectedZone.tags.slice(0, 2).map((t, i) => (
                      <span
                        key={t}
                        className={cn(
                          'rounded-[2px] px-2 py-0.5 text-xs font-medium border',
                          i === 0
                            ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-lime-500/12 text-lime-700 dark:text-lime-400 border-lime-500/20'
                        )}
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                  {selectedZone.tags.length > 2 ? (
                    <span className="rounded-[2px] bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                      +{selectedZone.tags.length - 2}
                    </span>
                  ) : null}
                </div>
              </div>

              {selectedZone.parentId && (selectedZone.children?.length ?? 0) > 0 ? (
                <ChildZonesField zone={selectedZone} onSelect={onSelect} />
              ) : null}
            </div>

            {/* Column 2: Parent Zone, or (for a root) Child Zones in the first row. */}
            <div>
              {selectedZone.parentId ? (
                <ParentZoneField zone={selectedZone} onSelect={onSelect} />
              ) : (
                <ChildZonesField zone={selectedZone} onSelect={onSelect} />
              )}
            </div>
          </div>

          {/* Address / Location Row */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <MapPin className="size-3.5" /> Address
            </div>
            <p className="text-xs font-medium text-foreground leading-relaxed">
              {selectedZone.location}
            </p>
          </div>
        </div>
      ) : null}

      {/* Bottom-right control stack — zoom, recentre, fullscreen. */}
      <div data-zones-ui className="absolute bottom-4 right-4 z-[810] flex flex-col overflow-hidden rounded-[6px] border border-border bg-card shadow-md">
        <MapControl label="Zoom in" onClick={() => mapRef.current?.zoomIn()}><Plus className="size-4" /></MapControl>
        <MapControl label="Zoom out" onClick={() => mapRef.current?.zoomOut()}><Minus className="size-4" /></MapControl>
        <MapControl label="Fit all zones" onClick={() => mapRef.current?.fitAll()}><LocateFixed className="size-4" /></MapControl>
        <MapControl
          label="Fullscreen"
          last
          onClick={() => {
            const el = wrapRef.current
            if (!el) return
            if (document.fullscreenElement) void document.exitFullscreen()
            else void el.requestFullscreen?.()
          }}
        >
          <Maximize2 className="size-4" />
        </MapControl>
      </div>
    </div>
  )
}

function MapControl({
  label, onClick, children, last,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        !last && 'border-b border-border'
      )}
    >
      {children}
    </button>
  )
}
