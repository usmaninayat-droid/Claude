import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Sheet, SheetContent, SheetClose, SheetTitle, SheetDescription, Badge, Avatar, Button, Checkbox,
  TooltipProvider, Tooltip, TooltipTrigger, TooltipContent,
} from '@fams/design-system'
import { LeafletMap, type LeafletMapHandle, AssetMarker } from '@ds/components/map'
import { BinPin } from '../../components/BinPin'
import { binSpread } from './binCluster'
import {
  X, ArrowDown, SquareArrowOutUpRight, Sparkles, MapPin, Package, Route as RouteIcon,
  ChevronDown, Minus, Plus, Recycle, Trash2, Layers, Maximize2, Check, Pencil,
} from 'lucide-react'
import { Block, initials } from './issueBlocks'
import {
  nearbyRoutes, NEARBY_MAP, type NearbyRoute, type LatLng,
  makePxToLatLng, countInside, pointInPolygon, shrinkToContain,
  REMAINING_BIN_PTS, REMAINING_ZONE_BASE, REMAINING_ZONE_INITIAL,
} from './nearbyRoutes'
import type { ShiftIssue } from './currentShiftIssues'
import { CustomScrollbar } from '../../components/CustomScrollbar'

const FILTERS = [
  { key: '2.5', label: '2.5 CMB', count: 17 },
  { key: '3.2', label: '3.2 CMB', count: 40 },
  { key: '4.5', label: '4.5 CMB', count: 43 },
]

type Pt = { x: number; y: number } | null

/** Two-line black hover tooltip for an HTML-overlay map marker (Figma node
 *  2227:113098 — "on hover show the tooltips, for nearby and breakdown routes").
 *  Parent marker must be `group` + a positioning context; shown via `group-hover`.
 *  Matches the dark `.leaflet-tooltip` surface (index.css). */
function MarkerTip({ id, sub }: { id: string; sub: string }) {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#090d16] px-2.5 py-1.5 text-center shadow-lg group-hover:block">
      <div className="text-[11px] font-semibold leading-tight text-white">{id}</div>
      <div className="mt-0.5 text-[10px] leading-tight text-slate-300">{sub}</div>
      <span className="absolute left-1/2 top-full size-0 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-[#090d16]" />
    </div>
  )
}

/** Right map: DS LeafletMap (route zones + grey building + vehicle/depot) plus
 *  an HTML overlay for the remaining-bins cluster — a red "100" badge that
 *  declusters into ~100 shared `BinPin`s on zoom-in (matches Current Shift
 *  Issues; the DS map has no clustering, so zoom is inferred from `project()`). */
function NearbyMap({
  checkedIndices,
  activeFilters,
  setActiveFilters,
  isRemainingSelected,
  setIsRemainingSelected,
  isOptimized,
  needsOptimize,
  onOptimize,
  qtys,
  selectedBuildingIndex,
  setSelectedBuildingIndex,
  remainingZone,
  setRemainingZone,
  editingRemaining,
  setEditingRemaining,
  commitRemainingZone,
}: {
  checkedIndices: number[]
  activeFilters: string[]
  setActiveFilters: React.Dispatch<React.SetStateAction<string[]>>
  isRemainingSelected: boolean
  setIsRemainingSelected: (v: boolean) => void
  isOptimized: boolean
  needsOptimize: boolean
  onOptimize: () => void
  qtys: number[]
  selectedBuildingIndex: number | null
  setSelectedBuildingIndex: React.Dispatch<React.SetStateAction<number | null>>
  remainingZone: LatLng[]
  setRemainingZone: React.Dispatch<React.SetStateAction<LatLng[]>>
  editingRemaining: boolean
  setEditingRemaining: React.Dispatch<React.SetStateAction<boolean>>
  commitRemainingZone: (poly: LatLng[]) => void
}) {
  const mapWrapRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMapHandle>(null)
  const [sitePt, setSitePt] = useState<Pt>(null)
  const [depotPt, setDepotPt] = useState<Pt>(null)
  const [binPts, setBinPts] = useState<Pt[]>([])
  const [declustered, setDeclustered] = useState(false)
  const bins = useMemo(() => binSpread(NEARBY_MAP.site), [])

  // Projected vehicle positions, zone centers, split building footprint boundaries & centers
  const [projectedVehicles, setProjectedVehicles] = useState<Record<number, Pt>>({})
  const [projectedZoneCenters, setProjectedZoneCenters] = useState<Record<number, Pt>>({})
  const [projectedBuildingCenters, setProjectedBuildingCenters] = useState<Record<number, Pt>>({})
  const [projectedBuildingZones, setProjectedBuildingZones] = useState<Record<number, Pt[]>>({})
  // Projected vertices of the editable remaining-bins zone (single-route mode).
  const [remainingZonePts, setRemainingZonePts] = useState<Pt[]>([])

  // Pixel→lat/lng, for dragging zone vertices (the DS handle has no unproject).
  const pxToLatLng = useCallback((x: number, y: number): LatLng | null => {
    const h = mapRef.current
    if (!h) return null
    return makePxToLatLng((ll) => h.project(ll), NEARBY_MAP.center)(x, y)
  }, [])

  const reproject = useCallback(() => {
    const h = mapRef.current
    if (!h) return
    const site = h.project(NEARBY_MAP.site)
    const depot = h.project(NEARBY_MAP.depot)
    const east = h.project([NEARBY_MAP.site[0], NEARBY_MAP.site[1] + 0.01])
    const dcl = !!(site && east && Math.abs(east.x - site.x) > 220) // ≈ past zoom 15
    setSitePt(site)
    setDepotPt(depot)
    setDeclustered(dcl)
    setBinPts(dcl ? bins.map((b) => h.project(b)) : [])
    setRemainingZonePts(remainingZone.map((p) => h.project(p)))

    // Project each checked route's vehicle, zone center, building center, and building zone boundary points dynamically
    const newVehs: Record<number, Pt> = {}
    const newZoneCenters: Record<number, Pt> = {}
    const newBuildCenters: Record<number, Pt> = {}
    const newBuildZones: Record<number, Pt[]> = {}

    nearbyRoutes.forEach((r, idx) => {
      newVehs[idx] = h.project(r.map.vehiclePt)
      newZoneCenters[idx] = h.project(r.map.zoneCenter)
      newBuildCenters[idx] = h.project(r.map.buildingCenter)
      newBuildZones[idx] = r.map.buildingZone.map((p) => h.project(p))
    })

    setProjectedVehicles(newVehs)
    setProjectedZoneCenters(newZoneCenters)
    setProjectedBuildingCenters(newBuildCenters)
    setProjectedBuildingZones(newBuildZones)
  }, [bins, remainingZone])

  // Drag a remaining-zone vertex (MBR edit pattern): live-update the polygon,
  // then commit the new bins-inside count on release.
  const onZoneHandleDown = (idx: number) => (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    const move = (ev: MouseEvent) => {
      const rect = mapWrapRef.current?.getBoundingClientRect()
      if (!rect) return
      const ll = pxToLatLng(ev.clientX - rect.left, ev.clientY - rect.top)
      if (ll) setRemainingZone((poly) => poly.map((pt, i) => (i === idx ? ll : pt)))
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      setRemainingZone((poly) => { commitRemainingZone(poly); return poly })
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  useEffect(() => {
    let raf = 0, tries = 0
    const attempt = () => {
      if (mapRef.current?.project(NEARBY_MAP.site)) reproject()
      else if (tries++ < 180) raf = requestAnimationFrame(attempt)
    }
    attempt()
    return () => cancelAnimationFrame(raf)
  }, [reproject])

  const routes = useMemo(() => {
    const all: any[] = []

    checkedIndices.forEach((idx) => {
      const r = nearbyRoutes[idx]
      if (!r) return

      if (!isOptimized) {
        // Dotted connector from vehicle to building footprint before optimization
        all.push({
          id: `route-${idx}-dotted`,
          points: [r.map.vehiclePt, r.map.connectorTo] as [number, number][],
          color: r.map.color,
          weight: 3,
          dashed: true
        })
      } else {
        // Full road-snapped optimized polyline (vehicle -> zigzag through footprint -> depot)
        all.push({
          id: `route-${idx}-optimized`,
          points: r.map.optimizedPath as [number, number][],
          color: r.map.color,
          weight: 3.5
        })
      }
    })

    return all
  }, [checkedIndices, isOptimized])

  const zones = useMemo(() => {
    const list: any[] = []

    // Add service zones of checked routes
    checkedIndices.forEach((idx) => {
      const r = nearbyRoutes[idx]
      if (!r) return
      list.push({
        id: `zone-${idx}`,
        points: r.map.serviceZone,
        color: r.map.zoneColor,
        fillOpacity: 0.22,
        weight: 3.5,
        label: `<div style="text-align: center; font-size: 10px; line-height: 1.2; font-weight: 600; color: #fff;">${r.id}<div style="font-size: 9px; font-weight: 400; color: #cbd5e1; margin-top: 2px;">${r.map.awayLabel}</div></div>`
      })
    })

    // Remaining Bins building zone(s) - divided accordingly based on checked indices
    if (checkedIndices.length <= 1) {
      // Single editable remaining-bins zone in grey (shrinks with the stepper /
      // reshapes on vertex drag). Count follows the bins currently inside it.
      const inside = countInside(REMAINING_BIN_PTS, remainingZone)
      list.push({
        id: 'building-single',
        points: remainingZone,
        color: editingRemaining ? 'var(--status-info)' : 'var(--gray-400)',
        fillOpacity: isRemainingSelected ? 0.5 : 0.4,
        weight: isRemainingSelected ? 3.5 : 1.5,
        label: `<div style="text-align: center; font-size: 10px; line-height: 1.2; font-weight: 600; color: #fff;">R#9876544<div style="font-size: 9px; font-weight: 400; color: #cbd5e1; margin-top: 2px;">${inside} stations left</div></div>`
      })
    } else {
      // Divided building footprint zones - remain gray but are individually highlighted on select
      checkedIndices.forEach((idx) => {
        const r = nearbyRoutes[idx]
        if (!r) return
        const isSel = selectedBuildingIndex === idx
        list.push({
          id: `building-split-${idx}`,
          points: r.map.buildingZone,
          color: 'var(--gray-400)', // Remains gray
          fillOpacity: isSel ? 0.5 : 0.35,
          weight: isSel ? 3.5 : 1.5,
        })
      })
    }

    return list
  }, [checkedIndices, isRemainingSelected, selectedBuildingIndex, remainingZone, editingRemaining])

  const hasZonePts = remainingZonePts.length >= 3 && remainingZonePts.every(Boolean)
  // Bins currently inside the editable remaining-zone (single-route mode) — the
  // rest render faded (excluded / skipped).
  const remainingCount = useMemo(() => countInside(REMAINING_BIN_PTS, remainingZone), [remainingZone])

  return (
    <div ref={mapWrapRef} className="relative min-w-0 flex-1 isolate">
      <LeafletMap
        ref={mapRef}
        center={NEARBY_MAP.center}
        zoom={NEARBY_MAP.zoom}
        markers={[]}
        zones={zones}
        routes={routes}
        onViewportChange={reproject}
        className="h-full w-full"
      />

      {/* Clickable SVG Overlay over the editable remaining-bins zone: click to
          select + enter edit mode (drag its anchor points, like MBR). */}
      {checkedIndices.length <= 1 ? (
        hasZonePts ? (
          <svg
            className="pointer-events-none absolute inset-0"
            style={{ zIndex: 799, width: '100%', height: '100%' }}
          >
            <polygon
              className="pointer-events-auto cursor-pointer"
              points={remainingZonePts.map((p) => p!.x + ',' + p!.y).join(' ')}
              fill="transparent"
              stroke="transparent"
              onClick={() => {
                setIsRemainingSelected(true)
                setEditingRemaining(true)
              }}
            />
          </svg>
        ) : null
      ) : (
        <svg
          className="pointer-events-none absolute inset-0"
          style={{ zIndex: 799, width: '100%', height: '100%' }}
        >
          {checkedIndices.map((idx) => {
            const pts = projectedBuildingZones[idx]
            if (!pts || !pts.every(Boolean)) return null
            return (
              <polygon
                key={idx}
                className="pointer-events-auto cursor-pointer"
                points={pts.map((p) => p!.x + ',' + p!.y).join(' ')}
                fill="transparent"
                stroke="transparent"
                onClick={() => {
                  setSelectedBuildingIndex(selectedBuildingIndex === idx ? null : idx)
                  setIsRemainingSelected(true)
                }}
              />
            )
          })}
        </svg>
      )}

      <div className="pointer-events-none absolute inset-0 z-[800] overflow-hidden">
        {/* Vehicles using design system AssetMarker dynamically */}
        {checkedIndices.map((idx) => {
          const pt = projectedVehicles[idx]
          const r = nearbyRoutes[idx]
          if (!pt || !r) return null
          return (
            <div
              key={idx}
              className="group absolute pointer-events-auto cursor-pointer"
              style={{ left: pt.x, top: pt.y, transform: 'translate(-50%, -100%)', zIndex: 810 }}
            >
              <MarkerTip id={r.id} sub={r.map.awayLabel} />
              <AssetMarker state={r.map.vehicleState} active size={38}>
                <img src="/assets/truck-tanker.svg" alt="" className="size-5 object-contain" />
              </AssetMarker>
            </div>
          )
        })}

        {/* Depot POI marker (always visible, from design system) */}
        {depotPt ? (
          <div className="absolute pointer-events-none" style={{ left: depotPt.x, top: depotPt.y, transform: 'translate(-50%, -100%)', zIndex: 805 }}>
            <img src="/assets/poi-depot.svg" alt="Depot" className="h-[46px] w-8" />
          </div>
        ) : null}

        {/* Zone capacity badges (assigned count) dynamically */}
        {checkedIndices.map((idx) => {
          const pt = projectedZoneCenters[idx]
          const r = nearbyRoutes[idx]
          if (!pt || !r) return null
          return (
            <div
              key={idx}
              className="absolute flex size-8 items-center justify-center rounded-full border-2 bg-slate-950 text-[11px] font-bold text-white shadow-md"
              style={{
                left: pt.x,
                top: pt.y,
                transform: 'translate(-50%, -50%)',
                zIndex: 805,
                borderColor: r.map.color
              }}
            >
              {r.map.assignedCount}
            </div>
          )
        })}

        {/* Remaining bins cluster */}
        {isOptimized && checkedIndices.length >= 2 ? (
          <>
            {checkedIndices.map((idx) => {
              const pt = projectedBuildingCenters[idx]
              const r = nearbyRoutes[idx]
              if (!pt || !r) return null
              return (
                <div
                  key={idx}
                  className="absolute pointer-events-none"
                  style={{ left: pt.x, top: pt.y, transform: 'translate(-50%, -50%)', zIndex: 805 }}
                >
                  <span className="flex size-9 items-center justify-center rounded-full border-2 border-white bg-[color:var(--status-error)] text-xs font-bold text-white shadow-md animate-in zoom-in-50 duration-300">
                    {qtys[idx]}
                  </span>
                </div>
              )
            })}
          </>
        ) : (
          /* Normal single remaining bins cluster */
          (!declustered && sitePt ? (
            <div
              className="group pointer-events-auto absolute cursor-pointer"
              style={{ left: sitePt.x, top: sitePt.y, transform: 'translate(-50%, -50%)' }}
              onClick={() => { setIsRemainingSelected(true); setEditingRemaining(true) }}
            >
              <MarkerTip id="R#9876544" sub={`${remainingCount} stations left`} />
              <span className="flex size-9 items-center justify-center rounded-full border-2 border-white bg-[color:var(--status-error)] text-xs font-bold text-white shadow-md transition-transform hover:scale-105">
                {remainingCount}
              </span>
            </div>
          ) : null)
        )}

        {/* Declustered bins: inside the zone are collected; the rest fade out
            (excluded/skipped after a shrink or manual edit). */}
        {declustered
          ? binPts.map((p, i) => p ? (
              <span
                key={i}
                className="absolute transition-opacity"
                style={{ left: p.x, top: p.y, transform: 'translate(-50%, -100%)', opacity: pointInPolygon(bins[i], remainingZone) ? 1 : 0.2 }}
              >
                <BinPin />
              </span>
            ) : null)
          : null}
      </div>

      {/* Remaining-zone edit handles + Done (single-route mode): drag the anchor
          points to reshape the zone; bins inside/outside update live. */}
      {checkedIndices.length <= 1 && editingRemaining && hasZonePts ? (
        <>
          {/* Hint chip near the top */}
          <div className="pointer-events-none absolute left-1/2 top-4 z-[830] -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-[#090d16] px-3 py-1.5 text-xs font-medium text-white shadow-lg">
            <Pencil className="size-3.5" />
            Drag the points to reshape the zone
          </div>
          {/* Draggable vertex handles */}
          <div className="pointer-events-none absolute inset-0 z-[825]">
            {remainingZonePts.map((p, i) => p ? (
              <span
                key={i}
                onMouseDown={onZoneHandleDown(i)}
                className="pointer-events-auto absolute size-3.5 cursor-grab rounded-full border-2 border-[color:var(--status-info)] bg-white shadow-md active:cursor-grabbing"
                style={{ left: p.x, top: p.y, transform: 'translate(-50%,-50%)' }}
              />
            ) : null)}
          </div>
          {/* Prominent floating "Done Editing" pill (bottom-centre, like Optimize) */}
          <div className="absolute bottom-6 left-1/2 z-[900] -translate-x-1/2">
            <Button
              onClick={() => setEditingRemaining(false)}
              className="pointer-events-auto flex cursor-pointer items-center gap-2 rounded-lg bg-[#12B76A] px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#0f9f5b]"
            >
              <Check className="size-4" />
              Done Editing
            </Button>
          </div>
        </>
      ) : null}

      {/* Top Map Filters (CMB Bin Capacity filters) matching dashboard's filter card design */}
      {isRemainingSelected ? (
        <div
          className="absolute left-4 top-4 z-[900] rounded bg-white shadow-md border border-border flex items-center p-1.5 gap-1 select-none pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {FILTERS.map((f, index) => {
            const isFirst = index === 0
            const isLast = index === FILTERS.length - 1
            const borderClass = isLast ? '' : 'border-r border-[#eaecf0]'
            const paddingClass = isFirst
              ? 'pr-4 pl-2'
              : isLast
              ? 'pl-4 pr-2'
              : 'px-4'
            return (
              <label
                key={f.key}
                className={'flex items-center gap-2 cursor-pointer h-7 text-[12px] font-semibold text-[#1d2939] ' + paddingClass + ' ' + borderClass}
              >
                <Checkbox
                  checked={activeFilters.includes(f.key)}
                  onCheckedChange={() => {
                    setActiveFilters((prev) =>
                      prev.includes(f.key)
                        ? prev.filter((k) => k !== f.key)
                        : [...prev, f.key]
                    )
                  }}
                />
                <span>{f.label}</span>
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">
                  {f.count}
                </span>
              </label>
            )
          })}
        </div>
      ) : null}

      {/* Floating Optimize Route Button (Figma node 2401:106099). Shown whenever
          the plan is dirty (multi-route, or a single route whose bins changed —
          dev #12), but hidden during zone editing so it doesn't collide with the
          "Done Editing" pill (same slot). */}
      {needsOptimize && !editingRemaining ? (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[900]" onClick={(e) => e.stopPropagation()}>
          <Button
            onClick={onOptimize}
            className="bg-[#12B76A] hover:bg-[#0f9f5b] text-white flex items-center gap-2 px-5 py-2.5 rounded-lg shadow-lg text-[13px] font-semibold transition-all hover:scale-105 pointer-events-auto cursor-pointer"
          >
            <Sparkles className="size-4" />
            Optimize Route
          </Button>
        </div>
      ) : null}

      {/* Bottom Right Zoom Controls & Maximize */}
      <div className="absolute right-4 bottom-4 z-[900] flex flex-col gap-3 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col rounded bg-white shadow-md border border-border overflow-hidden">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="flex size-10 items-center justify-center text-foreground hover:bg-muted cursor-pointer"
            aria-label="Zoom in"
          >
            <Plus className="size-5" />
          </button>
          <div className="h-px bg-border w-full" />
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="flex size-10 items-center justify-center text-foreground hover:bg-muted cursor-pointer"
            aria-label="Zoom out"
          >
            <Minus className="size-5" />
          </button>
        </div>

        <button className="flex size-10 items-center justify-center rounded bg-white shadow-md text-foreground hover:bg-muted border border-border cursor-pointer" aria-label="Maximize">
          <Maximize2 className="size-5" />
        </button>
      </div>

      {/* Top Right Layers Button */}
      <div className="absolute right-4 top-4 z-[900] pointer-events-auto" onClick={(e) => e.stopPropagation()}>
        <button className="flex size-10 items-center justify-center rounded bg-white shadow-md text-foreground hover:bg-muted border border-border cursor-pointer" aria-label="Layers">
          <Layers className="size-5" />
        </button>
      </div>
    </div>
  )
}

function Stepper({ qty, setQty, max }: { qty: number; setQty: (n: number) => void; max: number }) {
  return (
    <div className="flex h-8 items-center rounded-md border border-border">
      <button type="button" onClick={() => setQty(Math.max(0, qty - 1))} className="flex size-8 items-center justify-center text-muted-foreground outline-none hover:bg-muted" aria-label="Decrease">
        <Minus className="size-3.5" />
      </button>
      <span className="w-10 text-center text-sm font-medium tabular-nums text-foreground">{qty}</span>
      <button type="button" onClick={() => setQty(Math.min(max, qty + 1))} className="flex size-8 items-center justify-center text-muted-foreground outline-none hover:bg-muted" aria-label="Increase">
        <Plus className="size-3.5" />
      </button>
    </div>
  )
}

const Sep = () => <span className="text-[color:var(--gray-300)]">•</span>
const Metric = ({ icon, value }: { icon: React.ReactNode; value: string }) => (
  <span className="inline-flex items-center gap-1 whitespace-nowrap text-muted-foreground">
    {icon}
    {value}
  </span>
)

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <div className="text-base font-bold tabular-nums text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function BarStat({ title, label, note, pct }: { title: string; label: string; note: string; pct: number }) {
  return (
    <div className="min-w-[150px] flex-1 rounded-md border border-border px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{title}</span>
        <span className="font-semibold text-[color:var(--status-success)]">{label}</span>
      </div>
      <div className="my-1.5 h-1.5 overflow-hidden rounded-full bg-[color:var(--gray-200)]">
        <div className="h-full rounded-full bg-[color:var(--status-success)]" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[11px] text-muted-foreground">{note}</div>
    </div>
  )
}

function Pair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-foreground">{value}</span>
    </div>
  )
}

function RouteDetailsPanel({ r, qty, showStats }: { r: NearbyRoute; qty: number; showStats: boolean }) {
  const d = r.details
  return (
    <div className="flex flex-col gap-4 border-t border-border p-3">
      <div className="flex flex-wrap gap-2.5">
        <Stat value={String(qty)} label="Extra Stations" />
        <Stat value={showStats ? r.extra.distance : '-- km'} label="Extra Distance" />
        <BarStat
          title="Response Load"
          label={showStats ? r.extra.waste.label : '--'}
          note={showStats ? r.extra.waste.note : '--/10 CBM'}
          pct={showStats ? r.extra.waste.pct : 0}
        />
        <BarStat
          title="Extra Time"
          label={showStats ? r.extra.time.label : '--'}
          note={showStats ? r.extra.time.note : '--/3h'}
          pct={showStats ? r.extra.time.pct : 0}
        />
      </div>
      <div className="grid grid-cols-2 gap-x-10">
        <div>
          <Pair label="Plan Name" value={<span className="block max-w-[170px] truncate" title={d.plan}>{d.plan}</span>} />
          <Pair label="Driver" value={<span className="inline-flex items-center gap-1.5"><Avatar size="sm" fallback={initials(d.driver)} />{d.driver}</span>} />
          <Pair label="Service Type" value={<Badge variant="warning"><Trash2 />{d.serviceType}</Badge>} />
          <Pair label="Lot" value={d.lot} />
          <Pair label="Discharge Station" value={d.dischargeStation} />
        </div>
        <div>
          <Pair label="Vehicle" value={<span className="inline-flex items-center gap-1.5"><img src="/assets/truck-tanker.svg" alt="" className="h-5 w-7 object-contain" />{d.vehicle}</span>} />
          <Pair label="Water Cleared" value={d.wasteCollected} />
          <Pair label="Incident Type" value={<span className="inline-flex items-center gap-1.5"><Recycle className="size-4 text-[color:var(--status-success)]" />{d.wasteType}</span>} />
          <Pair label="Actual Start Time" value={d.actualStart} />
          <Pair label="Planned End Time" value={d.plannedEnd} />
        </div>
      </div>
    </div>
  )
}

function NearbyRouteRow({
  r,
  expanded,
  onToggleExpand,
  checked,
  onToggleChecked,
  qty,
  setQty,
  maxLimit,
  showStats,
}: {
  r: NearbyRoute
  expanded: boolean
  onToggleExpand: () => void
  checked: boolean
  onToggleChecked: () => void
  qty: number
  setQty: (val: number) => void
  maxLimit: number
  showStats: boolean
}) {
  return (
    <div
      className={`overflow-hidden rounded-md border transition-all ${
        checked
          ? 'border-[color:var(--primary)] bg-[color:var(--primary)]/6 shadow-[0_4px_12px_rgba(0,0,0,0.06)]'
          : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 text-sm">
        <Checkbox checked={checked} onCheckedChange={onToggleChecked} />
        <span className="size-2 shrink-0 rounded-full" style={{ background: r.map.color }} />
        <span className="font-semibold text-foreground">{r.id}</span>
        <Sep />
        <Metric icon={<MapPin className="size-3.5" />} value={r.bins} />
        <Sep />
        <Metric icon={<Package className="size-3.5" />} value={r.capacity} />
        <Sep />
        <Metric icon={<RouteIcon className="size-3.5" />} value={r.distance} />
        <Badge variant="info">{r.status}</Badge>
        <div className="ml-auto flex items-center gap-2">
          {checked ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Stepper qty={qty} setQty={setQty} max={maxLimit} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Max Capacity: {maxLimit} bins
              </TooltipContent>
            </Tooltip>
          ) : null}
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted"
            aria-label="Toggle details"
          >
            <ChevronDown className={'size-4 transition-transform ' + (expanded ? 'rotate-180' : '')} />
          </button>
        </div>
      </div>
      {expanded ? <RouteDetailsPanel r={r} qty={qty} showStats={showStats} /> : null}
    </div>
  )
}

export type NearbyRoutesSheetProps = {
  /** The route being re-assigned; the sheet is open when non-null. */
  issue: ShiftIssue | null
  onOpenChange: (open: boolean) => void
  /** "Assign Manually" → open the Manual Bin Reassignment screen. */
  onAssignManually?: () => void
  /** "Assign Route" → the parent closes the sheet and shows the success toast. */
  onAssigned?: () => void
  /** "Suggest Replacement" → open the Replace Vehicle & Driver sheet. */
  onSuggestReplacement?: () => void
}

/**
 * NearbyRoutesSheet — NEW local component. Full-page right sheet that replaces the
 * Current Shift Issues sheet when a card's "Suggest Nearby Routes" is clicked
 * (Figma node 2227:113098). Left: the failed route's current assignment → a list of
 * selectable nearby routes (checkbox + bin stepper + expandable capacity/time detail).
 * Right: the DS `LeafletMap` with route service-area zones, the standby vehicle
 * (hover tooltip), the remaining-bins site, and the discharge depot.
 */
export function NearbyRoutesSheet({ issue, onOpenChange, onAssignManually, onAssigned, onSuggestReplacement }: NearbyRoutesSheetProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    nearbyRoutes.findIndex((r) => r.defaultExpanded)
  )
  const [checkedIndices, setCheckedIndices] = useState<number[]>([0])
  const [activeFilters, setActiveFilters] = useState<string[]>(['2.5', '3.2', '4.5'])
  const [isRemainingSelected, setIsRemainingSelected] = useState<boolean>(false)
  const [qtys, setQtys] = useState<number[]>([100, 0, 0])
  const [isOptimized, setIsOptimized] = useState<boolean>(false)
  const [selectedBuildingIndex, setSelectedBuildingIndex] = useState<number | null>(null)
  // Editable remaining-bins zone (single-route mode): the polygon over the bins.
  // Reduced via the stepper (auto-shrink) or by dragging its vertices in edit mode.
  const [remainingZone, setRemainingZone] = useState<LatLng[]>(REMAINING_ZONE_INITIAL)
  const [editingRemaining, setEditingRemaining] = useState(false)
  // Any change to the bin count / zone requires re-optimizing before Assign (dev
  // #12). `optimizing` drives the full-page sparkle animation during Optimize.
  const [needsOptimize, setNeedsOptimize] = useState(false)
  const [optimizing, setOptimizing] = useState(false)

  const filteredBinsCount = useMemo(() => {
    return (activeFilters.includes('2.5') ? 17 : 0) +
           (activeFilters.includes('3.2') ? 40 : 0) +
           (activeFilters.includes('4.5') ? 43 : 0)
  }, [activeFilters])

  // Recalculate automatic distribution whenever checkedIndices or filteredBinsCount changes
  useEffect(() => {
    const CAPACITIES = [100, 45, 35]
    const totalCheckedCapacity = checkedIndices.reduce((sum, idx) => sum + CAPACITIES[idx], 0)
    
    const newQtys = [0, 0, 0]
    if (checkedIndices.length > 0) {
      if (totalCheckedCapacity <= filteredBinsCount) {
        checkedIndices.forEach((idx) => {
          newQtys[idx] = CAPACITIES[idx]
        })
      } else {
        let assignedSum = 0
        checkedIndices.forEach((idx, i) => {
          if (i === checkedIndices.length - 1) {
            newQtys[idx] = Math.max(0, filteredBinsCount - assignedSum)
          } else {
            const share = Math.round(filteredBinsCount * (CAPACITIES[idx] / totalCheckedCapacity))
            newQtys[idx] = share
            assignedSum += share
          }
        })
      }
    }
    setQtys(newQtys)
  }, [checkedIndices, filteredBinsCount])

  // Reset optimization state, selected building, and the remaining-bins zone
  // when selection or count changes (the zone tracks the single selected route).
  useEffect(() => {
    setIsOptimized(false)
    setSelectedBuildingIndex(null)
    setEditingRemaining(false)
    setRemainingZone(REMAINING_ZONE_INITIAL)
    setOptimizing(false)
    // Multi-route needs optimizing before Assign; a fresh single route is ready.
    setNeedsOptimize(checkedIndices.length >= 2)
  }, [checkedIndices, filteredBinsCount])

  // Run the Optimize step: play the sparkle animation, then draw optimized routes
  // and enable Assign (dev #12 / Figma node 2227:75537 "Animation").
  const runOptimize = useCallback(() => {
    setOptimizing(true)
    window.setTimeout(() => {
      setOptimizing(false)
      setIsOptimized(true)
      setNeedsOptimize(false)
    }, 2000)
  }, [])

  const handleSetQty = (idx: number, val: number) => {
    const CAPACITIES = [100, 45, 35]
    // Changing the bin count dirties the plan → must re-optimize before Assign.
    setNeedsOptimize(true)
    setIsOptimized(false)
    // Single route → the stepper drives the remaining-bins zone: shrink it to the
    // smallest polygon still holding `val` bins (farthest bins fall out) (dev #3).
    if (checkedIndices.length === 1 && checkedIndices[0] === idx) {
      setRemainingZone(shrinkToContain(REMAINING_ZONE_BASE, REMAINING_BIN_PTS, val))
    }
    setQtys((prev) => {
      const next = [...prev]
      const diff = val - prev[idx]
      const otherCheckedIndices = checkedIndices.filter((i) => i !== idx)
      
      if (otherCheckedIndices.length === 0) {
        next[idx] = val
        return next
      }
      
      next[idx] = val
      let remainingDiff = -diff
      
      // Greedily adjust other checked routes to keep the sum equal to filteredBinsCount
      for (const otherIdx of otherCheckedIndices) {
        const currentVal = next[otherIdx]
        const maxAvailableAdjustment = remainingDiff > 0
          ? CAPACITIES[otherIdx] - currentVal
          : -currentVal
        
        const adjustment = remainingDiff > 0
          ? Math.min(remainingDiff, maxAvailableAdjustment)
          : Math.max(remainingDiff, maxAvailableAdjustment)
          
        next[otherIdx] += adjustment
        remainingDiff -= adjustment
        if (remainingDiff === 0) break
      }
      return next
    })
  }

  // Manual zone edit committed (vertex drag released): the count follows the
  // bins now inside the reshaped polygon (single-route mode).
  const commitRemainingZone = useCallback((poly: LatLng[]) => {
    if (checkedIndices.length !== 1) return
    const idx = checkedIndices[0]
    const n = countInside(REMAINING_BIN_PTS, poly)
    setQtys((prev) => prev.map((q, i) => (i === idx ? n : q)))
    // Reshaping the zone changes the bins → re-optimize required (dev #12).
    setNeedsOptimize(true)
    setIsOptimized(false)
  }, [checkedIndices])

  // The Leaflet map mounts while the sheet slides in, so it can cache a stale
  // container size — nudge a resize once the open transition settles.
  useEffect(() => {
    if (!issue) return
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 320)
    return () => clearTimeout(t)
  }, [issue])

  const showStats = checkedIndices.length <= 1 || isOptimized

  return (
    <Sheet open={issue != null} onOpenChange={onOpenChange}>
      <SheetContent side="right" hideClose width="100vw" className="p-0">
        <TooltipProvider>
          {issue ? (
            <div className="flex h-full">
              {/* Left panel */}
              <div className="relative flex w-[680px] shrink-0 flex-col bg-card">
                <SheetClose className="absolute left-3 top-3 z-10 flex size-6 items-center justify-center rounded-full bg-[color:var(--status-error)] text-white outline-none transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring">
                  <X className="size-3.5" />
                  <span className="sr-only">Close</span>
                </SheetClose>

                {/* Header */}
                <div className="px-6 pb-4 pt-9">
                  <div className="flex flex-wrap items-center gap-3">
                    <SheetTitle className="text-2xl font-semibold text-foreground">
                      Nearby Routes for Remaining Stations
                    </SheetTitle>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--primary)]/50 px-2.5 py-1 text-xs font-semibold text-primary">
                      <Sparkles className="size-3.5" />
                      Smart Suggestions
                    </span>
                  </div>
                  <SheetDescription className="mt-1.5 text-sm text-muted-foreground">
                    We've matched the remaining bins to the best nearby routes — ranked by distance, and capacity
                  </SheetDescription>
                </div>

                {/* Cards list — grouped / single route */}
                <CustomScrollbar className="min-h-0 flex-1 border-t border-border">
                  <div className="px-6 pt-4 pb-28 flex flex-col gap-4">
                    <div className="flex flex-col gap-4 rounded-md border border-border p-4">
                      {/* Issue header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm">
                          <span className="font-semibold text-foreground">{issue.route}</span>
                          <span className="text-muted-foreground"> • {issue.plan}</span>
                        </div>
                        <span className="shrink-0 rounded-[4px] border border-[color:var(--status-error)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--status-error)]">
                          {issue.reason}
                        </span>
                      </div>

                      {/* Current assignment → nearby routes (divider with the arrow on it) */}
                      <Block a={issue.current} />
                      <div className="relative flex justify-center">
                        <div className="absolute inset-x-0 top-1/2 border-t border-border" />
                        <span className="relative flex size-6 items-center justify-center rounded-full border border-border bg-card">
                          <ArrowDown className="size-3.5 text-muted-foreground" />
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">Assign the above remaining bins to nearby routes</span>
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-muted-foreground">
                          <span className="size-2 rounded-full bg-[color:var(--status-info)]" />
                          Nearby Routes
                        </span>
                      </div>

                      {/* Nearby route options */}
                      <div className="flex flex-col gap-2.5">
                        {nearbyRoutes.map((r, i) => (
                          <NearbyRouteRow
                            key={i}
                            r={r}
                            expanded={expandedIndex === i}
                            onToggleExpand={() => {
                              setExpandedIndex(expandedIndex === i ? null : i)
                            }}
                            checked={checkedIndices.includes(i)}
                            onToggleChecked={() => {
                              setCheckedIndices((prev) =>
                                prev.includes(i) ? prev.filter((idx) => idx !== i) : [...prev, i]
                              )
                            }}
                            qty={qtys[i]}
                            setQty={(val) => handleSetQty(i, val)}
                            maxLimit={[100, 45, 35][i]}
                            showStats={showStats}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </CustomScrollbar>

                {/* Footer — DS Button variants (tertiary / green-outline / ghost / primary) */}
                <div className="absolute bottom-0 inset-x-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-t from-card via-card/95 to-transparent pt-10 pb-4 px-6">
                  <div className="flex items-center gap-3">
                    <Button variant="tertiary">
                      View Plan
                      <SquareArrowOutUpRight className="size-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="tertiary" onClick={onSuggestReplacement} className="border-[color:var(--primary)]/50 text-primary hover:bg-[color:var(--primary)]/6">
                      <Sparkles className="size-4" />
                      Suggest Replacement
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={onAssignManually}>Assign Manually</Button>
                    <Button variant="primary" disabled={needsOptimize} onClick={onAssigned}>
                      Assign Route
                    </Button>
                  </div>
                </div>
              </div>

              {/* Map */}
              <NearbyMap
                checkedIndices={checkedIndices}
                activeFilters={activeFilters}
                setActiveFilters={setActiveFilters}
                isRemainingSelected={isRemainingSelected}
                setIsRemainingSelected={setIsRemainingSelected}
                isOptimized={isOptimized}
                needsOptimize={needsOptimize}
                onOptimize={runOptimize}
                qtys={qtys}
                selectedBuildingIndex={selectedBuildingIndex}
                setSelectedBuildingIndex={setSelectedBuildingIndex}
                remainingZone={remainingZone}
                setRemainingZone={setRemainingZone}
                editingRemaining={editingRemaining}
                setEditingRemaining={setEditingRemaining}
                commitRemainingZone={commitRemainingZone}
              />

              {/* AI optimizing — full-page sparkle overlay (Figma node 2227:75537
                  "Animation"), mirrors the Manual Bin Reassignment optimize step. */}
              {optimizing ? (
                <div className="fixed inset-0 z-[940] flex items-center justify-center bg-[color:var(--muted-foreground)]/90">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative h-16 w-20">
                      <Sparkles className="absolute left-0 top-1 size-5 text-[color:var(--status-warning)] mbr-twinkle" fill="currentColor" style={{ animationDelay: '0s' }} />
                      <Sparkles className="absolute left-7 top-0 size-10 text-[color:var(--status-warning)] mbr-twinkle" fill="currentColor" style={{ animationDelay: '0.25s' }} />
                      <Sparkles className="absolute left-3 top-10 size-6 text-[color:var(--status-warning)] mbr-twinkle" fill="currentColor" style={{ animationDelay: '0.5s' }} />
                    </div>
                    <div className="text-lg font-semibold text-white">AI is optimizing route and station sequence...</div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </TooltipProvider>
      </SheetContent>
    </Sheet>
  )
}
