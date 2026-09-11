import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronsLeft, ChevronsRight, GripVertical } from '@fams/ui-kit/icons'
import { cn } from '../../lib/cn'

/**
 * CockpitSplit — the cockpit's resizable queue|map two-pane split (SPEC §2
 * rows 24–26; UX-NOTES E.19–24). Percentage clamp 26–70% (list share) with
 * ABSOLUTE pixel floors — 320px list / 360px map — that win over the
 * percentage at narrow widths; default 40%; double-click resets; the handle
 * is a keyboard-operable `role="separator"` (arrows ±5%, Home/End to the
 * clamp ends). Close-map / expand-map states each keep a visible reopen
 * affordance — neither strands the user (E.23). During drag: pointer
 * capture, `select-none`, and a transparent overlay so the map never
 * swallows pointer events (E.21). Generic chrome — no business vocabulary.
 */
export type CockpitSplitState = 'split' | 'list-only' | 'map-only'

export interface CockpitSplitProps {
  list: ReactNode
  map: ReactNode
  /** Controlled pane state; omit for uncontrolled. */
  state?: CockpitSplitState
  onStateChange?: (state: CockpitSplitState) => void
  /** Initial list share (percent). Default 40. */
  defaultListPct?: number
  className?: string
}

const MIN_PCT = 26
const MAX_PCT = 70
const DEFAULT_PCT = 40
const LIST_FLOOR_PX = 320
const MAP_FLOOR_PX = 360
/** The splitter column between the panes (`w-4`) — 16px of the container that
 *  belongs to NEITHER pane. `listPct` is a share of the WHOLE container, so
 *  the map's residual is `container - separator - list`, not `container -
 *  list`; leaving the separator out of the ceiling is exactly why the map
 *  floor under-shot by 18px at 1280 (UX E.19, round 2). */
const SEPARATOR_PX = 16

/**
 * Pixel floors win over the percentage clamp (UX E.19) — SYMMETRICALLY:
 *   minListPx = max(320, 26% of container)
 *   maxListPx = container - separator - max(360, 30% of container)
 * Returns a list share of the whole container, in percent.
 */
export function clampListPct(pct: number, containerPx: number, separatorPx: number = SEPARATOR_PX): number {
  let next = Math.min(MAX_PCT, Math.max(MIN_PCT, pct))
  if (containerPx > 0) {
    const mapFloor = Math.max(MAP_FLOOR_PX, ((100 - MAX_PCT) / 100) * containerPx)
    const floorPct = (LIST_FLOOR_PX / containerPx) * 100
    const ceilPct = ((containerPx - separatorPx - mapFloor) / containerPx) * 100
    if (floorPct <= ceilPct) {
      next = Math.max(floorPct, Math.min(ceilPct, next))
    }
  }
  return next
}

const EDGE_BUTTON =
  'flex size-8 items-center justify-center rounded-sm border border-border bg-card text-muted-foreground shadow-sm outline-none transition-colors duration-fast hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'

export function CockpitSplit({ list, map, state, onStateChange, defaultListPct = DEFAULT_PCT, className }: CockpitSplitProps) {
  const [internalState, setInternalState] = useState<CockpitSplitState>('split')
  const paneState = state ?? internalState
  const setPaneState = (next: CockpitSplitState) => {
    if (state === undefined) setInternalState(next)
    onStateChange?.(next)
  }

  const containerRef = useRef<HTMLDivElement>(null)
  const [listPct, setListPct] = useState(defaultListPct)
  const [dragging, setDragging] = useState(false)

  const applyPct = useCallback((pct: number) => {
    setListPct(clampListPct(pct, containerRef.current?.getBoundingClientRect().width ?? 0))
  }, [])

  // Re-clamp against the pixel floors whenever the container resizes.
  useEffect(() => {
    const node = containerRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setListPct((pct) => clampListPct(pct, node.getBoundingClientRect().width)))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    setDragging(true)
    const rtl = getComputedStyle(handle).direction === 'rtl'
    const move = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return
      const fromStart = rtl ? rect.right - e.clientX : e.clientX - rect.left
      applyPct((fromStart / rect.width) * 100)
    }
    const up = () => {
      setDragging(false)
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
      handle.removeEventListener('pointercancel', up)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', up)
    handle.addEventListener('pointercancel', up)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    const grow = rtl ? 'ArrowLeft' : 'ArrowRight'
    const shrink = rtl ? 'ArrowRight' : 'ArrowLeft'
    if (event.key === grow) applyPct(listPct + 5)
    else if (event.key === shrink) applyPct(listPct - 5)
    else if (event.key === 'Home') applyPct(MIN_PCT)
    else if (event.key === 'End') applyPct(MAX_PCT)
    else return
    event.preventDefault()
  }

  if (paneState === 'list-only') {
    return (
      <div ref={containerRef} data-slot="cockpit-split" data-state="list-only" className={cn('relative isolate flex h-full min-h-0', className)}>
        <div className="h-full min-h-0 min-w-0 flex-1">{list}</div>
        <button
          type="button"
          aria-label="Show map"
          className={cn(EDGE_BUTTON, 'absolute end-2 top-2 z-dropdown')}
          onClick={() => setPaneState('split')}
        >
          <ChevronsLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        </button>
      </div>
    )
  }

  if (paneState === 'map-only') {
    return (
      <div ref={containerRef} data-slot="cockpit-split" data-state="map-only" className={cn('relative isolate flex h-full min-h-0', className)}>
        <div className="h-full min-h-0 min-w-0 flex-1">{map}</div>
        <button
          type="button"
          aria-label="Show list"
          className={cn(EDGE_BUTTON, 'absolute start-2 top-2 z-dropdown')}
          onClick={() => setPaneState('split')}
        >
          <ChevronsRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </button>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      data-slot="cockpit-split"
      data-state="split"
      className={cn('relative isolate flex h-full min-h-0', dragging && 'select-none', className)}
    >
      <div className="h-full min-h-0 min-w-0 flex-none" style={{ width: `${listPct}%` }}>
        {list}
      </div>

      {/* Splitter: ≥8px visible strip, 16px hit slop via padding (E.21). */}
      <div data-slot="cockpit-splitter" className="relative z-dropdown flex flex-none flex-col items-center">
        {/* A FOCUSABLE separator is the ARIA "window splitter" pattern
            (WAI-ARIA APG): role="separator" + tabIndex + aria-valuenow is
            exactly how a resizable divider is exposed. jsx-a11y's static
            lists don't know separators become interactive when focusable,
            hence the two targeted disables. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <div
          role="separator"
          aria-label="Resize queue and map panes"
          aria-orientation="vertical"
          aria-valuenow={Math.round(listPct)}
          aria-valuemin={MIN_PCT}
          aria-valuemax={MAX_PCT}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          className="group flex h-full w-4 cursor-col-resize touch-none items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onPointerDown={onPointerDown}
          onDoubleClick={() => applyPct(DEFAULT_PCT)}
          onKeyDown={onKeyDown}
        >
          <div className={cn('h-full w-2 rounded-full bg-border transition-colors duration-fast group-hover:bg-muted-foreground/40', dragging && 'bg-muted-foreground/40')} aria-hidden="true" />
        </div>
        <div className="absolute top-1/2 flex -translate-y-1/2 flex-col gap-2">
          <button type="button" aria-label="Close map" className={EDGE_BUTTON} onClick={() => setPaneState('list-only')}>
            <ChevronsRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Reset split"
            className={cn(EDGE_BUTTON, 'cursor-col-resize')}
            onClick={() => applyPct(DEFAULT_PCT)}
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Expand map" className={EDGE_BUTTON} onClick={() => setPaneState('map-only')}>
            <ChevronsLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="relative isolate h-full min-h-0 min-w-0 flex-1">
        {map}
        {/* Drag shield: the map never swallows pointer events mid-drag (E.21). */}
        {dragging ? <div className="absolute inset-0 z-dropdown" aria-hidden="true" /> : null}
      </div>
    </div>
  )
}

CockpitSplit.displayName = 'CockpitSplit'
