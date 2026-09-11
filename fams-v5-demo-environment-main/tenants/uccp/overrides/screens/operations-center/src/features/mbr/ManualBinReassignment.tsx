import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LeafletMap, type LeafletMapHandle, type MapZone, type MapRoute, AssetMarker } from '@ds/components/map'
import { Checkbox } from '@fams/design-system'
import { BinPin } from '../../components/BinPin'
import {
  X, ChevronUp, ChevronDown, Recycle, Trash2, Trash, Sparkles, Plus, Minus, Maximize2, Layers,
  Pentagon, Square, Circle, MapPin, Route as RouteIcon, Clock, Filter, Pencil, CalendarDays, Navigation,
} from 'lucide-react'
import {
  planDetails, remainingBins, nearbyRoutes, AB_CLUSTERS, AB_CLUSTER_ROWS,
  TOTAL_REMAINING, MAP_CENTER, DISCHARGE_POINT, ring, binPinPositions, optimizedRoute,
  curve, pointInPolygon, centroid,
  type NearbyRoute, type LatLng, type BinCapacity, type BinFrequency,
} from './mbrData'
import { CustomScrollbar } from '../../components/CustomScrollbar'

// Literal colours — Leaflet paints polygons/lines via SVG attributes that can't
// resolve CSS vars, so these mirror the status tokens as hex.
const ZONE_BLUE = '#1570EF'   // drawn collection zone ≈ --status-info
const ZONE_GREY = '#475467'   // optimized zone / route service area
const CONN_GREEN = '#6E112D'  // pending dashed connector ≈ --primary (Qatar MME maroon)
const ROUTE_BLUE = '#1570EF'  // optimized route line

// Guidance tips show only on the first open (dev note): reopening the sheet in
// the same page load skips them. Deliberately in-memory — a reload starts a
// fresh "first time", which keeps testing and demos sane. Swap for persistent
// storage when real user accounts exist.
let tipsShownThisLoad = false

type Tool = 'polygon' | 'rect' | 'circle'
type Px = { x: number; y: number }

type Zone = {
  n: number; cluster: number; poly: LatLng[]
  bins: number; distance: string
  wastePendVal: string; wastePendPct: number
  waste: string; wastePct: number; wasteOver: boolean
  time: string; timePct: number
  route: string | null; routeTotal?: number; optimized: boolean
  /** The assigned route's own service-area centre (copied on selection). */
  routePt?: LatLng
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase()

/** Persistent guidance bubble with a pointer — mirrors the DS dark tooltip
 *  style. Under the pointer sits a two-circle indicator: an 8×8 dot (spring-in
 *  once) inside a 16×16 ring that pings 3 times. The bubble itself rises+fades
 *  in once after 300ms; `anim` overrides that (nudge shake). */
function GuideTip({ arrow, className, anim, children }: {
  arrow: 'left' | 'right' | 'bottom'; className?: string; anim?: string; children: React.ReactNode
}) {
  const arrowPos =
    arrow === 'left' ? 'left-[-3px] top-1/2 -translate-y-1/2'
      : arrow === 'right' ? 'right-[-3px] top-1/2 -translate-y-1/2'
        : 'bottom-[-3px] left-1/2 -translate-x-1/2'
  // Indicator centred just outside the pointer tip (16px box → 6px past the edge).
  const indicatorPos =
    arrow === 'left' ? 'left-[-14px] top-1/2 -translate-y-1/2'
      : arrow === 'right' ? 'right-[-14px] top-1/2 -translate-y-1/2'
        : 'bottom-[-14px] left-1/2 -translate-x-1/2'
  return (
    <div className={`pointer-events-none absolute z-[830] rounded-lg bg-foreground px-3 py-2 text-xs font-semibold leading-[18px] text-background shadow-lg ${anim ?? 'mbr-tip-enter'} ${className ?? ''}`}>
      {children}
      {/* two-circle indicator (ring pings ×3, dot springs in once) */}
      <span className={`absolute size-4 ${indicatorPos}`}>
        <span className="mbr-ping3 absolute inset-0 rounded-full border-2 border-primary" />
        <span className="mbr-dot-in absolute inset-1 rounded-full bg-primary" />
      </span>
      <span className={`absolute size-2 rotate-45 bg-foreground ${arrowPos}`} />
    </div>
  )
}

/* ---------- Plan Details field ---------- */
function PlanField({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="w-[150px] shrink-0 text-muted-foreground">{k}</span>
      <span className="flex items-center gap-2 font-semibold text-foreground">{children}</span>
    </div>
  )
}

/* ---------- Capacity / time bar in a zone card (label row · bar · value below) ---------- */
function CapBar({ label, icon, pending, ok, statusText, pct, val }: {
  label: string; icon: React.ReactNode; pending?: boolean; ok?: boolean; statusText?: string; pct: number; val: string
}) {
  const fill = pending ? 'var(--border)' : ok ? 'var(--status-success)' : 'var(--status-error)'
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <div className="flex items-center justify-between text-[13px]">
        <span className="flex items-center gap-1.5 font-semibold text-foreground [&_svg]:text-muted-foreground">{icon}{label}</span>
        {!pending && statusText ? (
          <span className="text-xs font-bold" style={{ color: ok ? 'var(--status-success)' : 'var(--status-error)' }}>{statusText}</span>
        ) : null}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-[4px] bg-muted">
        <div className="h-full rounded-[4px] transition-[width] duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: fill }} />
      </div>
      <span className="self-end text-[11px] leading-none text-muted-foreground">{val}</span>
    </div>
  )
}

/* ---------- Collection Zone summary card ---------- */
function ZoneCard({ zone, selected, onSelect, onDelete }: { zone: Zone; selected: boolean; onSelect: () => void; onDelete: () => void }) {
  return (
    <div
      onClick={onSelect}
      className={`flex animate-in fade-in cursor-pointer items-stretch overflow-hidden rounded-md border bg-card transition-colors ${selected ? 'border-[color:var(--gray-400)] shadow-[0_4px_12px_rgba(0,0,0,0.10)]' : 'border-border shadow-[0_4px_6px_-2px_rgba(16,24,40,0.03),0_12px_16px_-4px_rgba(16,24,40,0.06)] hover:border-primary/40'}`}
    >
      <div className="flex w-[240px] shrink-0 items-center gap-3.5 px-5 py-3.5">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          aria-label="Delete zone"
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[color:var(--status-error)]/10 text-[color:var(--status-error)] transition-colors hover:bg-[color:var(--status-error)]/15"
        >
          <Trash2 className="size-4" />
        </button>
        <div className="min-w-0">
          <div className="text-sm font-bold text-foreground">Response Zone {zone.n}</div>
          {zone.route ? (
            <>
              <div className="mb-1 mt-0.5 text-xs text-muted-foreground">Assigned to</div>
              <span className="inline-block rounded-[5px] bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">{zone.route}</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-5 border-l border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5"><MapPin className="size-4 text-muted-foreground" />
          <div className="flex flex-col"><span className="text-base font-bold leading-tight text-foreground">{zone.bins}</span><span className="text-xs text-muted-foreground">Total Stations</span></div>
        </div>
        <div className="flex items-center gap-2.5"><RouteIcon className="size-4 text-muted-foreground" />
          <div className="flex flex-col"><span className="whitespace-nowrap text-base font-bold leading-tight text-foreground">{zone.optimized ? zone.distance : '-- km'}</span><span className="whitespace-nowrap text-xs text-muted-foreground">Total Distance</span></div>
        </div>
      </div>

      <div className="flex flex-1 items-center border-l border-border px-5 py-3">
        <CapBar label="Expected Extra Water" icon={<Trash className="size-[15px]" />}
          pending={!zone.optimized} ok={!zone.wasteOver} statusText={zone.wasteOver ? 'Exceed Limit' : 'Within Limit'}
          pct={zone.optimized ? zone.wastePct : zone.wastePendPct} val={zone.optimized ? zone.waste : zone.wastePendVal} />
      </div>
      <div className="flex flex-1 items-center border-l border-border px-5 py-3">
        <CapBar label="Expected Extra Time" icon={<Clock className="size-[15px]" />}
          pending={!zone.optimized} ok statusText="Within Shift"
          pct={zone.optimized ? zone.timePct : 0} val={zone.optimized ? zone.time : '-- h'} />
      </div>
    </div>
  )
}

/* ---------- Nearby route row (accordion) ---------- */
function RouteRow({ route, open, selected, assigned, showRibbon, onToggle, onSelect }: {
  route: NearbyRoute; open: boolean; selected: boolean; assigned: boolean; showRibbon: boolean
  onToggle: () => void; onSelect: () => void
}) {
  const statusColor = assigned ? 'var(--status-success)' : route.status === 'Scheduled' ? 'var(--status-warning)' : 'var(--status-info)'
  return (
    <div
      className={`relative rounded-md border transition-colors ${selected ? 'border-[color:var(--gray-400)] bg-card shadow-[0_4px_12px_rgba(0,0,0,0.10)]' : 'border-border'} ${assigned ? 'bg-muted/50' : ''} ${showRibbon && route.suggest && !assigned ? 'pt-[22px]' : ''}`}
    >
      {showRibbon && route.suggest && !assigned ? (
        <span className="absolute left-0 top-0 z-[1] inline-flex items-center gap-1 rounded-br-md rounded-tl-md bg-[color:var(--status-warning)] px-2 py-[3px] text-[11px] font-bold text-white">
          <Sparkles className="size-3" />Smart Suggestion
        </span>
      ) : null}
      <div className={`flex items-center gap-1 px-3 py-2.5 ${assigned ? 'cursor-default' : 'cursor-pointer'}`} onClick={assigned ? undefined : onSelect}>
        <span className={`relative size-[18px] shrink-0 rounded-full border-[1.5px] ${assigned ? 'border-border bg-muted' : selected ? 'border-primary bg-white' : 'border-border bg-white'}`}>
          {selected && !assigned ? <span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" /> : null}
        </span>
        <span className={`min-w-[66px] whitespace-nowrap text-[13px] font-semibold ${assigned ? 'text-muted-foreground' : 'text-foreground'}`}>{route.id}</span>
        <span className="text-muted-foreground">•</span>
        <span className={`flex min-w-[54px] items-center gap-1 whitespace-nowrap text-xs font-semibold ${assigned ? 'text-muted-foreground' : 'text-foreground'}`}><MapPin className="size-3 text-muted-foreground" />{route.bins}/{route.total}</span>
        <span className="text-muted-foreground">•</span>
        <span className="whitespace-nowrap rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: statusColor }}>
          {assigned ? 'Assigned' : route.status}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onToggle() }} aria-label="Toggle details" className="ml-auto flex shrink-0 text-muted-foreground">
          <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open ? (
        <div className="px-3 pb-3.5 pt-1">
          {([
            ['Plan Name', route.plan],
            ['Incident Type', <span key="w" className="flex items-center gap-1.5"><Recycle className="size-4 text-[color:var(--status-success)]" />{route.waste}</span>],
            ['Service Type', <span key="s" className="inline-flex items-center gap-1 rounded-[4px] bg-[color:var(--status-warning)]/15 px-2 py-0.5 text-xs font-semibold text-[color:var(--status-warning)]"><Trash className="size-3" />{route.service}</span>],
            ['Driver', <span key="d" className="flex items-center gap-1.5"><span className="flex size-5 items-center justify-center rounded-full bg-[#00478a] text-[10px] font-semibold text-white">{initial(route.driver)}</span>{route.driver}</span>],
            ['Vehicle', <span key="v" className="flex items-center gap-1.5"><img src="/assets/truck-tanker.svg" alt="" className="h-4 w-5 object-contain" />{route.vehicle}</span>],
            ['Helpers', route.helpers],
            ['Discharge Station', route.discharge],
            ['Lot', route.lot],
            ['Water Cleared', route.wasteCollected],
            ['Actual Start Time', route.startTime],
            ['Planned End Time', route.endTime],
            ['Available Capacity', route.availableCapacity],
            ['Distance to Zone', route.distanceToZone],
          ] as [string, React.ReactNode][]).map(([k, v]) => (
            <div key={k} className="flex items-center gap-3 py-[3px] text-[13px] leading-[22px]">
              <span className="w-[124px] shrink-0 text-muted-foreground">{k}</span>
              <span className="flex items-center gap-1.5 font-semibold text-foreground">{v}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/* ---------- Modal shell (inline — the DS Dialog portals under our overlay) ---------- */
function MbrModal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-[950] flex items-center justify-center bg-[color:var(--foreground)]/45" onClick={onClose}>
      <div className="relative w-[620px] max-w-[92vw] rounded-md bg-card p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute right-5 top-5 text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        {children}
      </div>
    </div>
  )
}

export function ManualBinReassignment({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm?: () => void }) {
  const mapRef = useRef<LeafletMapHandle>(null)
  const mapWrapRef = useRef<HTMLDivElement>(null)
  const zoneSeq = useRef(0)

  const [zones, setZones] = useState<Zone[]>([])
  // Only the selected zone's details render on the map; drawing a new zone
  // deselects the current one until the user picks a card again.
  const [selectedZone, setSelectedZone] = useState<number | null>(null)
  const [tool, setTool] = useState<Tool | null>(null)
  const [draft, setDraft] = useState<{ pts: Px[]; cursor: Px | null } | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; zoneN: number } | null>(null)
  const [deleteZoneN, setDeleteZoneN] = useState<number | null>(null)
  const [remainOpen, setRemainOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [planCollapsed, setPlanCollapsed] = useState(true)
  const [showTips, setShowTips] = useState(false)
  const [nudging, setNudging] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [capFilter, setCapFilter] = useState<Set<BinCapacity>>(new Set())
  const [freqFilter, setFreqFilter] = useState<Set<BinFrequency>>(new Set())
  const [, setNonce] = useState(0) // bumped to re-project overlays

  // Live drag state in a ref — mousemove `setDraft` renders at continuous-event
  // priority, so the mouseup handler must not depend on the draft state.
  const dragRef = useRef<{ start: Px; last: Px; moved: boolean } | null>(null)
  // Polygon vertices, mirrored in a ref: the click handler reads this instead
  // of `draft` state, which lags within a batched burst of clicks.
  const polyPtsRef = useRef<Px[]>([])
  const nudgeTimer = useRef<number | undefined>(undefined)

  const reproject = useCallback(() => setNonce((n) => n + 1), [])

  // Reset all state each time the sheet opens; guidance tips only ever show on
  // the very first open (dev note), tracked in localStorage.
  useEffect(() => {
    if (!open) return
    setZones([]); setSelectedZone(null); setTool(null); setDraft(null); polyPtsRef.current = []; setEditing(null); setCtxMenu(null)
    setDeleteZoneN(null); setRemainOpen(false); setDiscardOpen(false)
    setOptimizing(false); setToast(null); setOpenIdx(null); setPlanCollapsed(true)
    setFilterOpen(false); setCapFilter(new Set()); setFreqFilter(new Set())
    zoneSeq.current = 0
    setShowTips(!tipsShownThisLoad)
    tipsShownThisLoad = true
  }, [open])

  // Leaflet loads async; retry projecting until the map is ready.
  useEffect(() => {
    if (!open) return
    let raf = 0, tries = 0
    const attempt = () => {
      if (mapRef.current?.project(MAP_CENTER)) reproject()
      else if (tries++ < 180) raf = requestAnimationFrame(attempt)
    }
    attempt()
    return () => cancelAnimationFrame(raf)
  }, [open, reproject])

  useEffect(() => { reproject() }, [zones, reproject])

  /* ---------- px ↔ latlng (local affine inverse of the map projection) ---------- */
  const pxToLatLng = useCallback((x: number, y: number): LatLng | null => {
    const h = mapRef.current
    if (!h) return null
    const c = MAP_CENTER
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

  /* ---------- derived state ---------- */
  const usedClusters = useMemo(() => new Set(zones.map((z) => z.cluster)), [zones])
  const nextCluster = AB_CLUSTERS.findIndex((_, i) => !usedClusters.has(i))
  // The selected zone is the map's focus + the target of route-select/optimize.
  const activeZone = zones.find((z) => z.n === selectedZone) ?? null
  const optimizedBins = zones.filter((z) => z.optimized).reduce((s, z) => s + z.bins, 0)
  const remaining = Math.max(TOTAL_REMAINING - optimizedBins, 0)
  const allDone = remaining <= 0 && zones.length > 0
  const confirmEnabled = zones.some((z) => z.optimized)
  const hasZone = zones.length > 0
  const selectedRouteId = activeZone?.route ?? null
  const assignedRouteIds = useMemo(() => new Set(zones.filter((z) => z.optimized && z.route).map((z) => z.route as string)), [zones])
  const drawingActive = tool != null
  // An un-optimized zone blocks creating another: finish the current one
  // (assign a route → optimize) before drawing the next. Tools re-enable once
  // the zone is optimized.
  const unroutedZone = zones.find((z) => !z.route) ?? null
  const pendingZone = zones.find((z) => !z.optimized) ?? null
  const canDraw = nextCluster >= 0 && !pendingZone && !allDone
  const drawBlockHint = unroutedZone
    ? 'Assign a route to the current zone first'
    : pendingZone ? 'Optimize the current zone first' : undefined

  const binRowState = useMemo(() => {
    const sel = new Set<number>(), hidden = new Set<number>()
    // Optimized zones' bins leave the list; only the SELECTED zone highlights.
    zones.forEach((z) => {
      if (z.optimized) (AB_CLUSTER_ROWS[z.cluster] || []).forEach((i) => hidden.add(i))
      else if (z.n === selectedZone) (AB_CLUSTER_ROWS[z.cluster] || []).forEach((i) => sel.add(i))
    })
    return { sel, hidden }
  }, [zones, selectedZone])

  // Filtered bins (All Filters popover). Empty selection = no filter.
  const binVisible = useCallback((i: number) => {
    if (binRowState.hidden.has(i)) return false
    const b = remainingBins[i]
    if (capFilter.size && !capFilter.has(b.capacity)) return false
    if (freqFilter.size && !freqFilter.has(b.frequency)) return false
    return true
  }, [binRowState, capFilter, freqFilter])

  const capCounts = useMemo(() => {
    const m = new Map<BinCapacity, number>()
    remainingBins.forEach((b) => m.set(b.capacity, (m.get(b.capacity) ?? 0) + 1))
    return m
  }, [])
  const freqCounts = useMemo(() => {
    const m = new Map<BinFrequency, number>()
    remainingBins.forEach((b) => m.set(b.frequency, (m.get(b.frequency) ?? 0) + 1))
    return m
  }, [])

  /* ---------- map layers (only the SELECTED zone renders) ---------- */
  const mapZones: MapZone[] = []
  if (activeZone) {
    const z = activeZone
    mapZones.push({ id: `zone-${z.n}`, points: z.poly, color: z.optimized ? ZONE_GREY : ZONE_BLUE, fillOpacity: z.optimized ? 0.25 : 0.15 })
    if (z.route && z.routePt) mapZones.push({ id: `svc-${z.n}`, points: ring(z.routePt, 0.006), color: ZONE_GREY, fillOpacity: 0.12 })
  }
  const mapRoutes: MapRoute[] = activeZone && activeZone.route && activeZone.routePt
    ? [activeZone.optimized
        ? { id: `route-${activeZone.n}`, points: optimizedRoute(activeZone.cluster, activeZone.routePt), color: ROUTE_BLUE, weight: 3 }
        : { id: `conn-${activeZone.n}`, points: curve(activeZone.routePt, centroid(activeZone.poly)), color: CONN_GREEN, weight: 2.5, dashed: true }]
    : []

  /* ---------- projected overlay points (only the SELECTED zone) ---------- */
  const h = mapRef.current
  const zoneByCluster = useMemo(() => {
    const m = new Map<number, Zone>()
    zones.forEach((z) => m.set(z.cluster, z))
    return m
  }, [zones])
  // A cluster's bins render only if it's unassigned (red) or belongs to the
  // SELECTED zone (green). Bins captured by a non-selected zone hide with it.
  const pinPts = AB_CLUSTERS.flatMap((_, ci) => {
    const z = zoneByCluster.get(ci)
    if (z && z.n !== selectedZone) return []
    return binPinPositions(ci).map((pos) => ({ pt: h?.project(pos) ?? null, zoned: !!z }))
  })
  const truckPts = activeZone && activeZone.route && activeZone.routePt
    ? [{ pt: h?.project(activeZone.routePt) ?? null, count: activeZone.routeTotal ?? activeZone.bins, optimized: activeZone.optimized }]
    : []
  const zoneBadges = activeZone && activeZone.optimized
    ? [{ pt: h?.project(centroid(activeZone.poly)) ?? null, count: activeZone.bins }]
    : []
  const dischargePt = activeZone && activeZone.optimized ? h?.project(DISCHARGE_POINT) ?? null : null
  // Direction arrow on the first leg of the selected optimized route.
  const startArrows = activeZone && activeZone.optimized && activeZone.routePt
    ? [(() => {
        const pts = optimizedRoute(activeZone.cluster, activeZone.routePt)
        const a = h?.project(pts[0]); const b = h?.project(pts[1])
        if (!a || !b) return null
        const t = 0.45
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, deg: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI }
      })()]
    : []
  const editingZone = editing != null ? zones.find((z) => z.n === editing) : null
  const editHandles = editingZone ? editingZone.poly.map((p) => h?.project(p) ?? null) : []

  /* ---------- drawing ---------- */
  const relPoint = (e: { clientX: number; clientY: number }): Px => {
    const r = mapWrapRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const finalizeZone = useCallback((polyLL: LatLng[]) => {
    // Defensive: can't create a zone while an earlier one isn't optimized yet.
    if (zones.some((z) => !z.optimized)) { setDraft(null); setTool(null); return }
    // Which cluster do the captured bins belong to? (dominant, ≥1 pin)
    const counts = AB_CLUSTERS.map((_, ci) => (usedClusters.has(ci) ? -1 : binPinPositions(ci).filter((p) => pointInPolygon(p, polyLL)).length))
    const best = counts.indexOf(Math.max(...counts))
    if (best < 0 || counts[best] <= 0) { setDraft(null); return } // nothing captured — keep the tool armed
    const cl = AB_CLUSTERS[best]
    zoneSeq.current += 1
    const n = zoneSeq.current
    setZones((zs) => {
      // Re-check against live state: two rapid commits (e.g. a double-click on
      // Select All) both see a stale `usedClusters` and would duplicate a zone.
      if (zs.some((z) => z.cluster === best)) return zs
      return [{
        n, cluster: best, poly: polyLL, bins: cl.bins, distance: cl.distance,
        wastePendVal: cl.wastePendVal, wastePendPct: cl.wastePendPct,
        waste: cl.waste, wastePct: cl.wastePct, wasteOver: cl.wasteOver, time: cl.time, timePct: cl.timePct,
        route: null, optimized: false,
      }, ...zs]
    })
    // Auto-select is handled by the "new zone" effect below (setZones' updater
    // runs async, so a flag set inside it can't be read here reliably).
    setDraft(null); setTool(null); setToast(null); setPlanCollapsed(true)
    mapRef.current?.flyTo(centroid(polyLL), 14)
  }, [usedClusters, zones])

  // A freshly-created zone opens selected. Watching `zones` (post-commit) is
  // reliable; reading the setZones updater's result inline is not.
  const knownZoneNs = useRef<Set<number>>(new Set())
  useEffect(() => {
    const added = zones.find((z) => !knownZoneNs.current.has(z.n))
    if (added) setSelectedZone(added.n)
    knownZoneNs.current = new Set(zones.map((z) => z.n))
  }, [zones])

  const commitDraft = useCallback((pts: Px[]) => {
    polyPtsRef.current = []
    const ll = pts.map((p) => pxToLatLng(p.x, p.y)).filter(Boolean) as LatLng[]
    if (ll.length >= 3) finalizeZone(ll)
    else setDraft(null)
  }, [pxToLatLng, finalizeZone])

  const rectCorners = (a: Px, b: Px): Px[] => [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }]
  const circlePts = (c: Px, edge: Px): Px[] => {
    const r = Math.hypot(edge.x - c.x, edge.y - c.y)
    return Array.from({ length: 28 }, (_, i) => {
      const t = (i / 28) * Math.PI * 2
      return { x: c.x + Math.cos(t) * r, y: c.y + Math.sin(t) * r }
    })
  }

  const onCatcherMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    if (tool === 'rect' || tool === 'circle') {
      const p = relPoint(e)
      dragRef.current = { start: p, last: p, moved: false }
      setDraft({ pts: [p], cursor: p })
    }
  }
  const onCatcherMouseMove = (e: React.MouseEvent) => {
    const p = relPoint(e)
    if ((tool === 'rect' || tool === 'circle') && dragRef.current) {
      dragRef.current.last = p
      if (Math.hypot(p.x - dragRef.current.start.x, p.y - dragRef.current.start.y) > 4) dragRef.current.moved = true
      setDraft((d) => (d ? { ...d, cursor: p } : d))
    } else if (tool === 'polygon' && draft) {
      setDraft((d) => (d ? { ...d, cursor: p } : d))
    }
  }
  const onCatcherMouseUp = () => {
    if ((tool === 'rect' || tool === 'circle') && dragRef.current) {
      const { start, last, moved } = dragRef.current
      dragRef.current = null
      if (moved) commitDraft(tool === 'rect' ? rectCorners(start, last) : circlePts(start, last))
      else setDraft(null)
    }
  }
  const onCatcherClick = (e: React.MouseEvent) => {
    if (tool === 'polygon') {
      const p = relPoint(e)
      const pts = polyPtsRef.current
      // Clicking the first vertex again (≤12px) closes the path.
      if (pts.length >= 3 && Math.hypot(p.x - pts[0].x, p.y - pts[0].y) <= 12) {
        commitDraft(pts)
        return
      }
      polyPtsRef.current = [...pts, p]
      setDraft({ pts: polyPtsRef.current, cursor: p })
    }
  }
  const onCatcherDblClick = () => {
    if (tool === 'polygon' && polyPtsRef.current.length >= 3) commitDraft(polyPtsRef.current)
  }

  /* ---------- zone edit (right-click → Edit: drag vertices) ----------
     Native capture-phase listener: Leaflet stops propagation on its container
     events, so a React (root-delegated) handler would never fire. */
  const zonesRef = useRef(zones)
  zonesRef.current = zones
  useEffect(() => {
    if (!open) return
    const el = mapWrapRef.current
    if (!el) return
    const onCtx = (e: MouseEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const p = { x: e.clientX - r.left, y: e.clientY - r.top }
      const ll = pxToLatLng(p.x, p.y)
      if (!ll) return
      const hit = zonesRef.current.find((z) => pointInPolygon(ll, z.poly))
      setCtxMenu(hit ? { x: p.x, y: p.y, zoneN: hit.n } : null)
    }
    el.addEventListener('contextmenu', onCtx, true)
    return () => el.removeEventListener('contextmenu', onCtx, true)
  }, [open, pxToLatLng])

  const onHandleMouseDown = (idx: number) => (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    const zoneN = editing
    if (zoneN == null) return
    const move = (ev: MouseEvent) => {
      const p = relPoint(ev)
      const ll = pxToLatLng(p.x, p.y)
      if (ll) setZones((zs) => zs.map((z) => (z.n === zoneN ? { ...z, poly: z.poly.map((pt, i) => (i === idx ? ll : pt)) } : z)))
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  /* ---------- flow actions ---------- */
  // Arm/toggle a draw tool. Starting a new zone deselects the current one, so
  // its map details disappear until the user clicks its card again.
  const armTool = (t: Tool) => {
    if (!canDraw) return // must route the current zone before starting another
    setTool((cur) => (cur === t ? null : t))
    setDraft(null); polyPtsRef.current = []
    setSelectedZone(null)
  }

  // Select a zone card → show its details on the map and frame it.
  const selectZone = (z: Zone) => {
    setTool(null); setDraft(null); polyPtsRef.current = []
    setSelectedZone(z.n)
    const c = centroid(z.poly)
    if (z.routePt) {
      const span = Math.max(Math.abs(z.routePt[0] - c[0]), Math.abs(z.routePt[1] - c[1]))
      mapRef.current?.flyTo([(z.routePt[0] + c[0]) / 2, (z.routePt[1] + c[1]) / 2], span > 0.04 ? 12 : 13)
    } else {
      mapRef.current?.flyTo(c, 14)
    }
  }

  const selectRoute = (route: NearbyRoute) => {
    if (assignedRouteIds.has(route.id)) return
    // Route selection targets the SELECTED zone; nudge if none is selected.
    if (!activeZone || activeZone.optimized) {
      setNudging(true)
      window.clearTimeout(nudgeTimer.current)
      nudgeTimer.current = window.setTimeout(() => setNudging(false), 900)
      return
    }
    setZones((zs) => zs.map((z) => (z.n === activeZone.n ? { ...z, route: route.id, routeTotal: route.total, routePt: route.routePoint } : z)))
    // Frame the route's own service area together with the zone; zoom out a
    // step for far-away routes so both ends stay in view.
    const rp = route.routePoint
    const c = centroid(activeZone.poly)
    const span = Math.max(Math.abs(rp[0] - c[0]), Math.abs(rp[1] - c[1]))
    mapRef.current?.flyTo([(rp[0] + c[0]) / 2, (rp[1] + c[1]) / 2], span > 0.04 ? 12 : 13)
  }

  const runOptimize = () => {
    const z = activeZone && !activeZone.optimized && activeZone.route ? activeZone : null
    if (!z) return
    setOptimizing(true)
    window.setTimeout(() => {
      setOptimizing(false)
      setZones((zs) => zs.map((x) => (x.n === z.n ? { ...x, optimized: true } : x)))
      setShowTips(false) // guidance ends once the 1st collection zone is saved
      setToast(`Zone ${z.n} saved!`)
      const c = centroid(z.poly)
      mapRef.current?.flyTo([(c[0] + DISCHARGE_POINT[0]) / 2, (c[1] + DISCHARGE_POINT[1]) / 2], 12)
      window.setTimeout(() => setToast(null), 4500)
    }, 2000)
  }

  const confirmDeleteZone = () => {
    if (deleteZoneN == null) return
    setZones((zs) => zs.filter((z) => z.n !== deleteZoneN))
    if (editing === deleteZoneN) setEditing(null)
    if (selectedZone === deleteZoneN) setSelectedZone(null)
    setDeleteZoneN(null); setToast(null)
  }

  // Confirm → close the sheet and signal success (parent shows the toast).
  const confirmAssignments = () => { onConfirm?.(); onClose() }
  const onConfirmAssignments = () => {
    if (!confirmEnabled) return
    if (remaining > 0) setRemainOpen(true) // bins left → warn first
    else confirmAssignments()
  }

  const tryClose = () => { if (zones.length) setDiscardOpen(true); else onClose() }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (tool) { setTool(null); setDraft(null); polyPtsRef.current = []; return }
      if (editing != null) { setEditing(null); return }
      if (ctxMenu) { setCtxMenu(null); return }
      if (filterOpen) { setFilterOpen(false); return }
      tryClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, zones, tool, editing, ctxMenu, filterOpen])

  if (!open) return null

  const toolBtn = 'flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'
  const toolActive = 'bg-[color:var(--primary)]/12 text-primary'

  const CAPACITIES: BinCapacity[] = ['2.5 CMB', '3.2 CMB', '4.5 CMB', '7 CMB']
  const FREQUENCIES: BinFrequency[] = ['Daily', 'Weekly', 'Monthly']

  return (
    <div className="fixed inset-0 z-[120] flex flex-col overflow-y-auto bg-background">
      {/* Close — tucked into the very corner (Figma) */}
      <button onClick={tryClose} aria-label="Close" className="absolute left-0.5 top-0.5 z-10 flex size-7 items-center justify-center rounded-full bg-[color:var(--status-error)] text-white shadow-md hover:brightness-95">
        <X className="size-3.5" />
      </button>

      {/* Topbar */}
      <div className="flex items-center border-b border-border py-4 pl-12 pr-6">
        <h2 className="text-2xl font-semibold text-foreground">Manual Bin Reassignment</h2>
      </div>

      {/* Plan Details */}
      <div className="shrink-0 px-6 py-3.5">
        <button onClick={() => setPlanCollapsed((c) => !c)} className={`flex items-center gap-2 text-sm font-semibold text-foreground ${planCollapsed ? '' : 'mb-3.5'}`}>
          <ChevronUp className={`size-4 transition-transform ${planCollapsed ? 'rotate-180' : ''}`} />
          <span>Plan Details</span>
        </button>
        {!planCollapsed ? (
          <div className="grid grid-cols-3 gap-x-14 gap-y-3.5">
            <PlanField k="Plan Name">{planDetails.name}</PlanField>
            <PlanField k="Lot">{planDetails.lot}</PlanField>
            <PlanField k="Stations Checked">{planDetails.binsCollected} <span className="font-semibold text-[color:var(--status-error)]">({planDetails.binsLeft})</span></PlanField>
            <PlanField k="Driver"><span className="flex size-6 items-center justify-center rounded-full bg-[#00478a] text-[11px] font-semibold text-white">{initial(planDetails.driver)}</span>{planDetails.driver}</PlanField>
            <PlanField k="Incident Type"><Recycle className="size-4 text-[color:var(--status-success)]" />{planDetails.waste}</PlanField>
            <PlanField k="Water Cleared">{planDetails.wasteCollected}</PlanField>
            <PlanField k="Vehicle"><img src="/assets/truck-tanker.svg" alt="" className="h-4 w-[22px] object-contain" />{planDetails.vehicle}</PlanField>
            <PlanField k="Service Type"><span className="inline-flex items-center gap-1 rounded-[4px] bg-[color:var(--status-warning)]/15 px-2 py-0.5 text-xs font-semibold text-[color:var(--status-warning)]"><Trash className="size-3" />{planDetails.service}</span></PlanField>
            <PlanField k="Expected Water Left">{planDetails.expectedWasteLeft}</PlanField>
          </div>
        ) : null}
      </div>

      {/* Body: bins | map | routes */}
      <div className="relative flex min-h-[520px] flex-1 border-t border-border">
        {/* Zone saved toast — compact dark bubble at the body's bottom-left,
            hanging slightly over the bottom edge (Figma: 231px wide, x=35). */}
        {toast ? (
          <div className="absolute bottom-[-14px] left-[35px] z-[850] w-[231px] rounded-lg bg-foreground px-4 py-3 shadow-xl animate-in fade-in slide-in-from-bottom-2">
            <b className="mb-0.5 block text-sm text-background">{toast}</b>
            <span className="block text-xs leading-[17px] text-background/75">Draw another zone to cover the remaining bins (if required).</span>
          </div>
        ) : null}
        {/* Remaining bins */}
        <div className="relative flex w-[320px] shrink-0 flex-col border-r border-border">
          <div className="relative flex items-center justify-between px-4 pb-3 pt-4">
            <h3 className="text-base font-semibold text-foreground">Remaining Stations <span className="font-semibold text-muted-foreground">({remaining.toString().padStart(2, '0')})</span></h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { if (canDraw) finalizeZone(ring(AB_CLUSTERS[nextCluster].center, 0.0085)) }}
                disabled={!canDraw}
                title={drawBlockHint}
                className="text-[13px] font-semibold text-primary disabled:cursor-not-allowed disabled:text-muted-foreground/60"
              >
                Select All
              </button>
              <button onClick={() => setFilterOpen((o) => !o)} className={`${toolBtn.replace('size-9', 'size-7')} ${filterOpen ? toolActive : ''}`} aria-label="Filter bins">
                <Filter className="size-4" />
              </button>
            </div>

            {/* All Filters popover (inline — DS popover portals under this overlay) */}
            {filterOpen ? (
              <>
                <div className="fixed inset-0 z-[855]" onClick={() => setFilterOpen(false)} />
                <div className="absolute left-3 right-[-140px] top-full z-[860] rounded-md border border-border bg-card p-5 shadow-2xl">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-base font-bold text-foreground">All Filters</h4>
                    <button
                      onClick={() => { setCapFilter(new Set()); setFreqFilter(new Set()) }}
                      className="text-[13px] font-semibold text-[color:var(--status-error)] hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  <button className="mb-5 flex h-11 w-full items-center gap-2 rounded-md border border-border px-3 text-sm text-muted-foreground">
                    <CalendarDays className="size-4" />
                    <span className="flex-1 text-left">Last collection date or range</span>
                    <ChevronDown className="size-4" />
                  </button>
                  <div className="mb-1.5 text-[13px] font-semibold text-foreground">Capacity</div>
                  <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3">
                    {CAPACITIES.map((c) => (
                      <label key={c} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                        <Checkbox
                          checked={capFilter.has(c)}
                          onCheckedChange={(v) => setCapFilter((s) => { const n = new Set(s); if (v) n.add(c); else n.delete(c); return n })}
                        />
                        {c}
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{capCounts.get(c) ?? 0}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mb-1.5 text-[13px] font-semibold text-foreground">Reporting Frequency</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {FREQUENCIES.map((f) => (
                      <label key={f} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                        <Checkbox
                          checked={freqFilter.has(f)}
                          onCheckedChange={(v) => setFreqFilter((s) => { const n = new Set(s); if (v) n.add(f); else n.delete(f); return n })}
                        />
                        {f}
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{freqCounts.get(f) ?? 0}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {allDone ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-6 text-center">
              {/* Layered-sheets illustration (matches the Figma empty state) */}
              <svg width="96" height="76" viewBox="0 0 96 76" fill="none" className="mb-2">
                <rect x="18" y="30" width="60" height="38" rx="5" fill="var(--muted)" />
                <rect x="24" y="18" width="48" height="14" rx="3" fill="var(--border)" opacity="0.7" />
                <rect x="30" y="8" width="36" height="10" rx="3" fill="var(--border)" opacity="0.45" />
                <rect x="27" y="40" width="30" height="4" rx="2" fill="var(--border)" />
                <rect x="27" y="50" width="42" height="4" rx="2" fill="var(--border)" opacity="0.7" />
              </svg>
              <div className="text-base font-bold text-foreground">You're all caught up!</div>
              <div className="max-w-[230px] text-[13px] leading-[19px] text-muted-foreground">You have linked all remaining bins to their nearby routes.</div>
            </div>
          ) : (
            <>
              <div className="flex border-y border-border bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="flex-1">BIN</span><span className="flex-1">LAST COLLECTION</span>
              </div>
              <CustomScrollbar className="flex-1">
                {remainingBins.map((b, i) => (
                  !binVisible(i) ? null : (
                    <div key={i} className={`group relative flex items-center px-4 py-2.5 text-[13px] ${binRowState.sel.has(i) ? 'bg-[color:var(--primary)]/8' : ''}`}>
                      <span className="flex flex-1 items-center gap-2 font-semibold text-foreground"><img src="/assets/bin-green-lid.svg" alt="" className="size-5" onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} />{b.id}</span>
                      <span className="flex-1 text-muted-foreground">{b.last}</span>
                      {/* Exact-time hover tooltip (dev note) */}
                      <span className="pointer-events-none absolute right-3 top-full z-[840] mt-[-6px] hidden whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-[11px] font-semibold text-background shadow-lg group-hover:block">
                        {b.exact}
                      </span>
                    </div>
                  )
                ))}
              </CustomScrollbar>
            </>
          )}

        </div>

        {/* Map */}
        <div ref={mapWrapRef} className="relative isolate min-w-0 flex-1">
          <LeafletMap ref={mapRef} center={MAP_CENTER} zoom={14} zones={mapZones} routes={mapRoutes} onViewportChange={reproject} className="h-full w-full" />

          {/* Drawing catcher — Leaflet swallows DOM clicks, so while a tool is
              armed this transparent layer owns the mouse. */}
          {drawingActive ? (
            <div
              className="absolute inset-0 z-[790] cursor-crosshair"
              onMouseDown={onCatcherMouseDown}
              onMouseMove={onCatcherMouseMove}
              onMouseUp={onCatcherMouseUp}
              onClick={onCatcherClick}
              onDoubleClick={onCatcherDblClick}
            />
          ) : null}

          {/* Draft shape preview (px space) */}
          {draft && draft.cursor ? (
            <svg className="pointer-events-none absolute inset-0 z-[795] h-full w-full">
              {tool === 'rect' && draft.pts[0] ? (
                <polygon points={rectCorners(draft.pts[0], draft.cursor).map((p) => `${p.x},${p.y}`).join(' ')} fill="rgba(21,112,239,0.12)" stroke={ZONE_BLUE} strokeWidth="2" strokeDasharray="6 5" />
              ) : null}
              {tool === 'circle' && draft.pts[0] ? (
                <circle cx={draft.pts[0].x} cy={draft.pts[0].y} r={Math.hypot(draft.cursor.x - draft.pts[0].x, draft.cursor.y - draft.pts[0].y)} fill="rgba(21,112,239,0.12)" stroke={ZONE_BLUE} strokeWidth="2" strokeDasharray="6 5" />
              ) : null}
              {tool === 'polygon' && draft.pts.length ? (
                <>
                  <polyline points={[...draft.pts, draft.cursor].map((p) => `${p.x},${p.y}`).join(' ')} fill="rgba(21,112,239,0.10)" stroke={ZONE_BLUE} strokeWidth="2" strokeDasharray="6 5" />
                  {/* First vertex grows once the path is closable (click it to close). */}
                  {draft.pts.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={i === 0 && draft.pts.length >= 3 ? 7 : 4} fill={i === 0 && draft.pts.length >= 3 ? 'var(--primary)' : '#fff'} stroke={i === 0 && draft.pts.length >= 3 ? '#fff' : ZONE_BLUE} strokeWidth="2" />
                  ))}
                </>
              ) : null}
            </svg>
          ) : null}

          {/* Bin pins / trucks / badges / discharge overlay */}
          <div className="pointer-events-none absolute inset-0 z-[800] overflow-hidden">
            {/* Bin markers — filled circle on a stem (Figma node 2227:71033):
                red when unassigned, green when in the selected zone. */}
            {pinPts.map((p, i) => p.pt ? (
              <span key={i} className="absolute" style={{ left: p.pt.x, top: p.pt.y, transform: 'translate(-50%,-100%)' }}>
                <BinPin color={p.zoned ? 'var(--primary)' : 'var(--status-error)'} />
              </span>
            ) : null)}
            {truckPts.map((t, i) => t.pt ? (
              <div
                key={`t${i}`}
                className="absolute flex flex-col items-center"
                style={{
                  left: t.pt.x,
                  top: t.pt.y,
                  transform: 'translate(-50%,-100%)',
                  zIndex: 810,
                }}
              >
                <AssetMarker
                  state={t.optimized ? 'moving' : 'non-moving'}
                  active={t.optimized}
                  size={38}
                  badge={t.optimized ? <Navigation className="size-2.5" fill="currentColor" /> : null}
                >
                  <img src="/assets/truck-tanker.svg" alt="" className="size-5 object-contain" />
                </AssetMarker>
                <span className="mt-1 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-bold text-background select-none">
                  {t.count}
                </span>
              </div>
            ) : null)}
            {zoneBadges.map((b, i) => b.pt ? (
              <span key={`zb${i}`} className="absolute flex size-7 items-center justify-center rounded-full border-2 border-white bg-foreground text-[11px] font-bold text-background shadow-md" style={{ left: b.pt.x, top: b.pt.y, transform: 'translate(-50%,-50%)' }}>{b.count}</span>
            ) : null)}
            {startArrows.map((a, i) => a ? (
              <span key={`sa${i}`} className="absolute text-[color:var(--status-info)]" style={{ left: a.x, top: a.y, transform: `translate(-50%,-50%) rotate(${a.deg}deg)` }}>
                <svg width="18" height="14" viewBox="0 0 18 14"><path d="M2 1 L16 7 L2 13 Z" fill="currentColor" /></svg>
              </span>
            ) : null)}
            {dischargePt ? (
              <img src="/assets/poi-depot.svg" alt="Discharge station" className="absolute h-10" style={{ left: dischargePt.x, top: dischargePt.y, transform: 'translate(-50%,-100%)' }} />
            ) : null}
          </div>

          {/* Vertex edit handles */}
          {editingZone ? (
            <>
              <div className="pointer-events-none absolute left-1/2 top-3 z-[830] -translate-x-1/2 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background shadow-lg">
                Drag the points to reshape Response Zone {editingZone.n}
              </div>
              <button onClick={() => setEditing(null)} className="absolute left-1/2 top-12 z-[830] -translate-x-1/2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-md hover:brightness-95">
                Done
              </button>
              <div className="absolute inset-0 z-[825]">
                {editHandles.map((p, i) => p ? (
                  <span
                    key={i}
                    onMouseDown={onHandleMouseDown(i)}
                    className="absolute size-3.5 cursor-grab rounded-full border-2 bg-white shadow-md active:cursor-grabbing"
                    style={{ left: p.x, top: p.y, transform: 'translate(-50%,-50%)', borderColor: ZONE_BLUE }}
                  />
                ) : null)}
              </div>
            </>
          ) : null}

          {/* Right-click context menu (Edit / Delete zone) */}
          {ctxMenu ? <div className="fixed inset-0 z-[865]" onClick={() => setCtxMenu(null)} /> : null}
          {ctxMenu ? (
            <div className="absolute z-[870] w-40 overflow-hidden rounded-md border border-border bg-card py-1 shadow-xl" style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { setSelectedZone(ctxMenu.zoneN); setEditing(ctxMenu.zoneN); setCtxMenu(null) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                <Pencil className="size-4 text-muted-foreground" />Edit Zone
              </button>
              <button
                onClick={() => { setDeleteZoneN(ctxMenu.zoneN); setCtxMenu(null) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[color:var(--status-error)] hover:bg-[color:var(--status-error)]/8"
              >
                <Trash2 className="size-4" />Delete Zone
              </button>
            </div>
          ) : null}

          {/* Guidance tips (dark bubble + pointer; first-time only, per dev note) */}
          {(showTips || nudging) && !hasZone && !drawingActive ? (
            <GuideTip arrow="left" className="left-16 top-3 max-w-[240px]" anim={nudging ? 'mbr-tip-nudge' : undefined}>
              Draw a zone to capture the bins you want to reassign
            </GuideTip>
          ) : null}
          {/* Points right at the first (Smart Suggestion) route card. */}
          {showTips && activeZone && !activeZone.route && !activeZone.optimized ? (
            <GuideTip arrow="right" className="right-2 top-[70px] max-w-[240px]">Select any suitable route for selected bins</GuideTip>
          ) : null}

          {/* Draw tools — arming a tool deselects the current zone (its map
              details hide until the user re-selects its card). Disabled while a
              zone is still unrouted: finish it (assign a route) before the next. */}
          <div className="absolute left-3 top-3 z-[820] flex flex-col rounded-md border border-border bg-card shadow-sm" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => armTool('polygon')}
              disabled={!canDraw}
              title={drawBlockHint}
              aria-label="Draw polygon zone"
              className={`${toolBtn} ${tool === 'polygon' ? toolActive : ''} ${nudging ? 'mbr-tool-pulse' : ''}`}
            >
              <Pentagon className="size-[18px]" fill={tool === 'polygon' ? 'currentColor' : 'none'} />
            </button>
            <span className="mx-1.5 h-px bg-border" />
            <button
              onClick={() => armTool('rect')}
              disabled={!canDraw}
              title={drawBlockHint}
              aria-label="Draw rectangle zone"
              className={`${toolBtn} ${tool === 'rect' ? toolActive : ''}`}
            >
              <Square className="size-[18px]" fill={tool === 'rect' ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => armTool('circle')}
              disabled={!canDraw}
              title={drawBlockHint}
              aria-label="Draw circle zone"
              className={`${toolBtn} ${tool === 'circle' ? toolActive : ''}`}
            >
              <Circle className="size-[18px]" fill={tool === 'circle' ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Layers */}
          <button onClick={(e) => e.stopPropagation()} aria-label="Layers" className="absolute right-3 top-3 z-[820] flex size-9 items-center justify-center rounded-md bg-[#475467] text-white shadow-sm"><Layers className="size-5" /></button>

          {/* Zoom + fullscreen */}
          <div className="absolute bottom-16 right-3 z-[820] flex flex-col rounded-md border border-border bg-card shadow-sm" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in" className={toolBtn}><Plus className="size-[18px]" /></button>
            <span className="mx-2 h-px bg-border" />
            <button onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out" className={toolBtn}><Minus className="size-[18px]" /></button>
          </div>
          <button onClick={(e) => e.stopPropagation()} aria-label="Fullscreen" className="absolute bottom-3 right-3 z-[820] flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm"><Maximize2 className="size-4" /></button>

          {/* Optimize button + tip (for the selected, route-assigned zone) */}
          {activeZone && activeZone.route && !activeZone.optimized && !optimizing ? (
            <>
              {showTips ? (
                <GuideTip arrow="bottom" className="bottom-[68px] left-1/2 w-max max-w-[calc(100%_-_24px)] -translate-x-1/2 text-center">
                  Tap Optimize to preview how these bins affect the route before you commit
                </GuideTip>
              ) : null}
              <button onClick={(e) => { e.stopPropagation(); runOptimize() }} className="absolute bottom-4 left-1/2 z-[820] flex -translate-x-1/2 items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg hover:brightness-95">
                <Sparkles className="size-4" />Optimize Route
              </button>
            </>
          ) : null}

        </div>

        {/* Nearby routes */}
        <div className="flex w-[312px] shrink-0 flex-col border-l border-border">
          <div className="flex items-center justify-between px-4 pb-3 pt-4">
            <h3 className="text-base font-semibold text-foreground">Nearby Routes <span className="font-semibold text-muted-foreground">({nearbyRoutes.length})</span></h3>
            <button className={toolBtn.replace('size-9', 'size-7')} aria-label="Filter routes"><Filter className="size-4" /></button>
          </div>
          <CustomScrollbar className="flex-1" viewportClassName="flex flex-col gap-2.5 p-3">
            {nearbyRoutes.map((r, i) => (
              <RouteRow
                key={r.id}
                route={r}
                open={openIdx === i}
                selected={selectedRouteId === r.id}
                assigned={assignedRouteIds.has(r.id)}
                showRibbon={hasZone}
                onToggle={() => setOpenIdx((o) => (o === i ? null : i))}
                onSelect={() => selectRoute(r)}
              />
            ))}
          </CustomScrollbar>
        </div>
      </div>

      {/* Response Zone summary bar (newest on top) */}
      {zones.length ? (
        <CustomScrollbar className="max-h-[230px] shrink-0" viewportClassName="flex flex-col gap-2.5 px-6 py-3">
          {zones.map((z) => <ZoneCard key={z.n} zone={z} selected={selectedZone === z.n} onSelect={() => selectZone(z)} onDelete={() => setDeleteZoneN(z.n)} />)}
        </CustomScrollbar>
      ) : null}

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-between border-t border-border px-6 py-3">
        <button onClick={tryClose} className="h-11 rounded-md border border-border bg-card px-6 text-[15px] font-semibold text-foreground hover:bg-muted">Cancel</button>
        <button disabled={!confirmEnabled} onClick={onConfirmAssignments} className="h-11 min-w-[200px] rounded-md bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:brightness-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground">Confirm Assignments</button>
      </div>

      {/* AI optimizing — FULL-PAGE overlay (Figma node 2227:75537 "Animation");
          amber sparkles twinkling over the whole sheet. */}
      {optimizing ? (
        <div className="fixed inset-0 z-[940] flex items-center justify-center bg-[color:var(--muted-foreground)]/90">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-16 w-20">
              <Sparkles className="absolute left-0 top-1 size-5 text-[color:var(--status-warning)] mbr-twinkle" fill="currentColor" style={{ animationDelay: '0s' }} />
              <Sparkles className="absolute left-7 top-0 size-10 text-[color:var(--status-warning)] mbr-twinkle" fill="currentColor" style={{ animationDelay: '0.25s' }} />
              <Sparkles className="absolute left-3 top-10 size-6 text-[color:var(--status-warning)] mbr-twinkle" fill="currentColor" style={{ animationDelay: '0.5s' }} />
            </div>
            <div className="text-lg font-semibold text-white">AI is optimizing route and bin sequence...</div>
          </div>
        </div>
      ) : null}

      {/* Discard confirmation (Figma: orange ⓘ · Cancel Assignments | Keep Editing) */}
      {discardOpen ? (
        <MbrModal onClose={() => setDiscardOpen(false)}>
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[color:var(--status-warning)]/12 text-[color:var(--status-warning)] ring-8 ring-[color:var(--status-warning)]/8">
            <span className="flex size-6 items-center justify-center rounded-full border-2 border-current text-sm font-bold">i</span>
          </div>
          <h3 className="mb-2 text-xl font-bold text-foreground">Discard your bin assignments?</h3>
          <p className="mb-6 text-sm leading-5 text-muted-foreground">
            You've created {zones.length} zone{zones.length > 1 ? 's' : ''} and assigned {zones.reduce((s, z) => s + z.bins, 0)} bins. Closing now will discard this work and the bins will stay unassigned.
          </p>
          <div className="flex items-center justify-between">
            <button onClick={() => { setDiscardOpen(false); onClose() }} className="h-11 rounded-md border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted">Cancel Assignments</button>
            <button onClick={() => setDiscardOpen(false)} className="h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-95">Keep Editing</button>
          </div>
        </MbrModal>
      ) : null}

      {/* Delete zone confirmation (Figma: Are you sure?) */}
      {deleteZoneN != null ? (
        <MbrModal onClose={() => setDeleteZoneN(null)}>
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[color:var(--status-error)]/10 text-[color:var(--status-error)] ring-8 ring-[color:var(--status-error)]/6">
            <Trash2 className="size-5" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-foreground">Are you sure?</h3>
          <p className="mb-6 text-sm leading-5 text-muted-foreground">
            You are about to remove <b className="text-foreground">Response Zone {deleteZoneN}</b>. It's non reversible step.
          </p>
          <div className="flex items-center justify-between">
            <button onClick={() => setDeleteZoneN(null)} className="h-11 rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:brightness-110">No, Keep it</button>
            <button onClick={confirmDeleteZone} className="h-11 rounded-md bg-[color:var(--status-error)] px-5 text-sm font-semibold text-white hover:brightness-95">Yes, Remove</button>
          </div>
        </MbrModal>
      ) : null}

      {/* Confirm with bins still remaining (Figma: Stations still remaining) */}
      {remainOpen ? (
        <MbrModal onClose={() => setRemainOpen(false)}>
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[color:var(--status-warning)]/12 text-[color:var(--status-warning)] ring-8 ring-[color:var(--status-warning)]/8">
            <span className="flex size-6 items-center justify-center rounded-full border-2 border-current text-sm font-bold">i</span>
          </div>
          <h3 className="mb-2 text-xl font-bold text-foreground">Stations still remaining</h3>
          <p className="mb-6 text-sm leading-5 text-muted-foreground">
            Some bins are left unassigned. Connecting them to nearby routes is recommended, but you can continue without doing so.
          </p>
          <div className="flex items-center justify-between">
            <button onClick={() => { setRemainOpen(false); confirmAssignments() }} className="h-11 rounded-md border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted">Confirm Assignment</button>
            <button onClick={() => setRemainOpen(false)} className="h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-95">Go Back</button>
          </div>
        </MbrModal>
      ) : null}
    </div>
  )
}
