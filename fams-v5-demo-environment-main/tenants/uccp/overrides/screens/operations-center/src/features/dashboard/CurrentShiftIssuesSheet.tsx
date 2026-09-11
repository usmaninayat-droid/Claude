import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Sheet, SheetContent, SheetClose, SheetTitle, SheetDescription, Button,
} from '@fams/design-system'
import { LeafletMap, type LeafletMapHandle } from '@ds/components/map'
import { X, ArrowDown, SquareArrowOutUpRight, Sparkles } from 'lucide-react'
import { BinPin } from '../../components/BinPin'
import {
  shiftIssues, ISSUES_MAP_CENTER, ISSUES_MAP_ZOOM, type ShiftIssue,
} from './currentShiftIssues'
import { Block } from './issueBlocks'
import { binSpread } from './binCluster'
import { CustomScrollbar } from '../../components/CustomScrollbar'

type Pt = { x: number; y: number } | null
type IssueMapData = ShiftIssue['map']

/** Right map: DS LeafletMap (dashed route + grey building) + an HTML overlay for
 *  the DS POI depot pin (dispatch-from) and the bin cluster that declusters into
 *  ~100 bin markers on zoom-in (the DS map has no clustering; zoom is inferred
 *  from `project()`). */
export function IssueMapPanel({ mapData }: { mapData: IssueMapData }) {
  const mapRef = useRef<LeafletMapHandle>(null)
  const [fromPt, setFromPt] = useState<Pt>(null)
  const [destPt, setDestPt] = useState<Pt>(null)
  const [binPts, setBinPts] = useState<Pt[]>([])
  const [declustered, setDeclustered] = useState(false)

  const bins = useMemo(() => binSpread(mapData.dest), [mapData.dest])

  const reproject = useCallback(() => {
    const h = mapRef.current
    if (!h) return
    const dest = h.project(mapData.dest)
    const east = h.project([mapData.dest[0], mapData.dest[1] + 0.01])
    // pixels spanned by 0.01° lng → a proxy for zoom (>~220px ≈ zoom 15).
    // 0.01° lng spans ~58px at zoom 13, ~233px at zoom 15 — decluster past ~zoom 15.
    const dcl = !!(dest && east && Math.abs(east.x - dest.x) > 220)
    setFromPt(h.project(mapData.from))
    setDestPt(dest)
    setDeclustered(dcl)
    setBinPts(dcl ? bins.map((b) => h.project(b)) : [])
  }, [mapData, bins])

  // Leaflet loads async; project() is null until ready — retry on frames.
  useEffect(() => {
    let raf = 0
    let tries = 0
    const attempt = () => {
      if (mapRef.current?.project(mapData.from)) reproject()
      else if (tries++ < 180) raf = requestAnimationFrame(attempt)
    }
    attempt()
    return () => cancelAnimationFrame(raf)
  }, [reproject, mapData])

  const routes = [{ id: 'dispatch', points: mapData.route, color: 'var(--status-warning)', weight: 3, dashed: true }]
  const zones = [{ id: 'building', points: mapData.building, color: 'var(--gray-400)', fillOpacity: 0.4 }]

  return (
    <div className="relative min-w-0 flex-1 isolate">
      <LeafletMap
        ref={mapRef}
        center={ISSUES_MAP_CENTER}
        zoom={ISSUES_MAP_ZOOM}
        routes={routes}
        zones={zones}
        onViewportChange={reproject}
        className="h-full w-full"
      />
      <div className="pointer-events-none absolute inset-0 z-[800] overflow-hidden">
        {/* Dispatch-from — DS POI > Depot pin + hover tooltip */}
        {fromPt ? (
          <div
            className="group pointer-events-auto absolute"
            style={{ left: fromPt.x, top: fromPt.y, transform: 'translate(-50%, -100%)' }}
          >
            <img src="/assets/poi-depot.svg" alt="" className="h-[46px] w-8" />
            <div className="pointer-events-none absolute bottom-[calc(100%+2px)] left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2.5 py-1.5 text-xs font-semibold text-popover-foreground shadow-lg group-hover:block">
              {mapData.fromLabel}
              <span className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-popover" />
            </div>
          </div>
        ) : null}

        {/* Destination — "100" bin cluster, or the ~100 individual bins when zoomed in */}
        {!declustered && destPt ? (
          <div
            className="absolute flex size-9 items-center justify-center rounded-full border-2 border-white bg-[color:var(--status-error)] text-xs font-bold text-white shadow-md"
            style={{ left: destPt.x, top: destPt.y, transform: 'translate(-50%, -50%)' }}
          >
            {mapData.destCount}
          </div>
        ) : null}
        {declustered
          ? binPts.map((p, i) =>
              p ? (
                <span key={i} className="absolute" style={{ left: p.x, top: p.y, transform: 'translate(-50%, -100%)' }}>
                  <BinPin />
                </span>
              ) : null,
            )
          : null}
      </div>
    </div>
  )
}

function IssueCard({
  issue, selected, onSelect, onSuggestNearby,
}: { issue: ShiftIssue; selected: boolean; onSelect: () => void; onSuggestNearby: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
      className={`flex cursor-pointer flex-col gap-4 rounded-md border bg-card p-4 outline-none transition-all ${
        selected
          ? 'border-[color:var(--gray-400)] shadow-[0_4px_12px_rgba(0,0,0,0.10)]'
          : 'border-border hover:border-[color:var(--primary)]/40'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-semibold text-foreground">{issue.route}</span>
          <span className="text-muted-foreground"> • {issue.plan}</span>
        </div>
        <span className="shrink-0 rounded-[4px] border border-[color:var(--status-error)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--status-error)]">
          {issue.reason}
        </span>
      </div>

      {/* Current → suggested — divider line with the arrow centered on it */}
      <div className="flex flex-col gap-2.5">
        <Block a={issue.current} />
        <div className="relative flex justify-center">
          <div className="absolute inset-x-0 top-1/2 border-t border-border" />
          <span className="relative flex size-6 items-center justify-center rounded-full border border-border bg-card">
            <ArrowDown className="size-3.5 text-muted-foreground" />
          </span>
        </div>
        <Block a={issue.suggested} />
      </div>

      {/* Footer — DS Button variants (buttons don't change card selection) */}
      <div
        className="flex items-center justify-between gap-3 border-t border-border pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="tertiary">
          View Plan
          <SquareArrowOutUpRight className="size-3.5 text-muted-foreground" />
        </Button>
        <div className="flex items-center gap-3">
          {issue.secondary === 'replace-manually' ? (
            <Button variant="ghost">Replace Manually</Button>
          ) : (
            <Button variant="tertiary" onClick={onSuggestNearby} className="border-[color:var(--primary)]/50 text-primary hover:bg-[color:var(--primary)]/6">
              <Sparkles className="size-4" />
              Suggest Nearby Routes
            </Button>
          )}
          <Button variant="primary">Dispatch Replacement</Button>
        </div>
      </div>
    </div>
  )
}

export type CurrentShiftIssuesSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fired by a card's "Suggest Nearby Routes" — swaps in the nearby-routes sheet. */
  onSuggestNearby: (issue: ShiftIssue) => void
}

/**
 * CurrentShiftIssuesSheet — NEW local component. Full-page right sheet opened by
 * clicking the "Action Required" KPI card (Figma node 2227:97177). Left = routes
 * requiring action (failed vehicle/driver → suggested replacement + dispatch
 * actions), right = the DS `LeafletMap` showing the dispatch route.
 */
export function CurrentShiftIssuesSheet({ open, onOpenChange, onSuggestNearby }: CurrentShiftIssuesSheetProps) {
  const count = String(shiftIssues.length).padStart(2, '0')
  const [selectedId, setSelectedId] = useState(shiftIssues[0]?.id)
  const selected = shiftIssues.find((i) => i.id === selectedId) ?? shiftIssues[0]

  // Nudge Leaflet to recompute size once the sheet's open transition settles.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 320)
    return () => clearTimeout(t)
  }, [open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" hideClose width="100vw" className="p-0">
        <div className="flex h-full">
          {/* Left panel */}
          <div className="flex w-[680px] shrink-0 flex-col bg-card">
            {/* Close — red circular X in the top-left corner */}
            <SheetClose className="absolute left-3 top-3 z-10 flex size-6 items-center justify-center rounded-full bg-[color:var(--status-error)] text-white outline-none transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring">
              <X className="size-3.5" />
              <span className="sr-only">Close</span>
            </SheetClose>

            {/* Header */}
            <div className="px-6 pb-4 pt-9">
              <SheetTitle className="text-2xl font-semibold text-foreground">
                Current Shift Issues <span className="text-muted-foreground">({count})</span>
              </SheetTitle>
              <SheetDescription className="sr-only">
                Routes requiring action this shift, with suggested vehicle and driver replacements.
              </SheetDescription>
            </div>

            {/* Sub-header */}
            <div className="flex items-center justify-between border-t border-border px-6 py-3">
              <span className="text-sm text-muted-foreground">Routes Requiring Action</span>
              <button className="text-sm font-semibold text-primary outline-none hover:underline">
                Dispatch All Suggestions
              </button>
            </div>

            {/* Cards */}
            <CustomScrollbar className="min-h-0 flex-1" viewportClassName="flex flex-col gap-4 px-6 pb-6 pt-1">
              {shiftIssues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  selected={issue.id === selected.id}
                  onSelect={() => setSelectedId(issue.id)}
                  onSuggestNearby={() => onSuggestNearby(issue)}
                />
              ))}
            </CustomScrollbar>
          </div>

          {/* Map */}
          <IssueMapPanel mapData={selected.map} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
