import { useEffect, useMemo, useRef, useState } from 'react'
import { AreaChart, BarChart } from '@fams/ui-kit'
import type { AreaChartMarkArea } from '@fams/ui-kit'
import { ChevronDown, CloudOff, Pause, Play, Plus, Minus, BarChart3, TrendingUp, RotateCcw } from '@fams/ui-kit/icons'
import { cn } from '../lib/cn'
import { RecordMapSlot } from '../views/hybrid/RecordMapSlot'
import type { MapMarkerDatum, MapPathDatum } from '../map/MapPanel.types'
import type { LocationMapPin } from '../map/LocationMap'
import { readRows, resolveNamedIcon } from './overview-widget-parts'
import { ReplayIconButton, ReplayLegend, ReplayStatChip, ReplayStatusBar } from './interactive-replay-parts'
import type {
  InteractiveReplayBand,
  InteractiveReplayPoint,
  InteractiveReplayProps,
  InteractiveReplayStat,
} from './InteractiveReplay.types'

/**
 * Event-band tone → authored `var(--token)` string. `AreaChart`/`BarChart`
 * resolve these through `resolveCssColor` and paint them at a fixed low alpha
 * themselves (never a live `var()` on canvas) — same danger/warning/info/
 * neutral vocabulary `ReplayLegend`'s swatches already use.
 */
const BAND_TONE: Record<NonNullable<InteractiveReplayBand['tone']> | 'default', string> = {
  danger: 'var(--color-danger)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
  neutral: 'var(--color-muted-foreground)',
  default: 'var(--color-warning)',
}

/**
 * InteractiveReplay — a played-back trip/shift timeline: filter row, stat
 * chips, a route map, and a multi-series timeline chart with play/pause,
 * speed, a checkbox legend and a zoomable window. [tier-2 pattern]
 *
 * Generic: every data slot is a FIELD-KEY INDIRECTION into `record`
 * (`timelineField`/`statsField`/`routeField`/`pinsField`/`bandsField`) and
 * `series[].key` names which row key each plotted line reads — no "tanker",
 * no "trip" anywhere in this file (root `CLAUDE.md` rule 10). Composes
 * `@fams/ui-kit`'s `AreaChart`/`BarChart` (dataviz skill — never a new chart
 * lib) and `RecordMapSlot` (the same lazy door onto `MapPanel` the hybrid
 * lens uses) rather than reinventing either.
 *
 * State-agnostic (Rule 8): play/pause/speed/legend/zoom/hover are local UI
 * state (the same category `RecordTable`'s search box and `AreaChart`'s own
 * legend already own) — nothing here fetches or persists.
 *
 * Documented simplifications (see `plan/tanker-detail/visual-diff.md`-style
 * deviations, not omissions; v2 reference: `Build Delegate/media/
 * 2026-08-31-interactive-replay-v2.html`):
 *  - Event bands render as translucent `markArea`s ON the chart (see
 *    `markAreas` below) AND fold into the legend as round swatches — v2
 *    parity, band coordinates line up 1:1 with `timeline` indices.
 *  - A series' `dashed` flag is accepted but not yet painted (`AreaChart`/
 *    `BarChart` have no per-series dash yet) — colour still carries identity.
 *  - The brush/zoom window is the shared `AreaChart`/`BarChart`'s own
 *    ECharts `dataZoom` (mini-chart strip + hour labels + drag handles,
 *    matching v2) — kept on the shared chart, not a bespoke draggable div.
 *  - One Play/Pause toggle button (not separate Play/Stop icons) — same
 *    play/scrub/legend/speed contract, one fewer control to operate. A
 *    separate Restart icon (v2's second control) rewinds to point 0.
 *  - Sensors/Events legend is a real checkbox ROW (`ReplayLegend`), not v2's
 *    two closed dropdown pickers — same show/hide contract, keyboard-
 *    operable with zero bespoke popover wiring; a v2-style dropdown is a
 *    later polish pass, not a functional gap.
 *  - The status bar below the map (`ReplayStatusBar`) stays mounted at
 *    every playhead position, matching v2's persistent info strip — it is
 *    NOT the same element as a hover-only tooltip.
 */
export function InteractiveReplay({
  record,
  statsField,
  timelineField,
  series,
  bandsField,
  routeField,
  pinsField,
  filters,
  emptyTitle = 'No Data in View',
  emptyText = "We couldn't find any data for the current selection. Try adjusting your date range or filters.",
  mapAriaLabel = 'Replay route map',
  chartAriaLabel = 'Replay timeline chart',
  height = 220,
  chartRenderer,
  className,
}: InteractiveReplayProps) {
  const stats = (statsField ? readRows(record, statsField) : []) as unknown as InteractiveReplayStat[]
  const timeline = readRows(record, timelineField) as unknown as InteractiveReplayPoint[]
  const bands = useMemo(
    () => (bandsField ? readRows(record, bandsField) : []) as unknown as InteractiveReplayBand[],
    [record, bandsField],
  )
  const route = ((routeField ? record?.[routeField] : undefined) as [number, number][] | undefined) ?? []
  const pins = ((pinsField ? record?.[pinsField] : undefined) as LocationMapPin[] | undefined) ?? []
  const isEmpty = timeline.length === 0

  const [hiddenKeys, setHiddenKeys] = useState<string[]>([])
  const [hiddenBandTypes, setHiddenBandTypes] = useState<string[]>([])
  const [chartType, setChartType] = useState<'area' | 'bar'>('area')
  const [speed, setSpeed] = useState<0.5 | 1 | 2 | 5>(1)
  const [playing, setPlaying] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [windowSize, setWindowSize] = useState(1)
  const [windowStart, setWindowStart] = useState(0)
  const rafRef = useRef<number | null>(null)

  const cursorIndex = Math.min(timeline.length - 1, Math.round(cursor))
  const activeIndex = hoveredIndex ?? (playing ? cursorIndex : null)
  // The status bar (v2 parity) stays mounted at every playhead position —
  // hover wins when present, otherwise the resting/playing cursor.
  const displayIndex = hoveredIndex ?? cursorIndex

  // Play/pause: rAF-advances `cursor`; `prefers-reduced-motion` jumps straight
  // to the end instead of animating (UX gate E1).
  useEffect(() => {
    if (!playing || isEmpty) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setCursor(timeline.length - 1)
      setPlaying(false)
      return
    }
    let last: number | null = null
    const tick = (now: number) => {
      if (last == null) last = now
      const dt = (now - last) / 1000
      last = now
      setCursor((c) => {
        const next = c + dt * 2 * speed
        if (next >= timeline.length - 1) {
          setPlaying(false)
          return timeline.length - 1
        }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, speed, isEmpty, timeline.length])

  // The brush's own drag/pan reports percent 0-100; kept in the same
  // windowStart/windowSize (0-1) shape the Zoom in/out buttons use, so both
  // controls stay in sync with the one ECharts `dataZoom` instance.
  const handleZoomChange = (startPercent: number, endPercent: number) => {
    setWindowStart(Math.max(0, startPercent) / 100)
    setWindowSize(Math.max(0.01, (endPercent - startPercent) / 100))
  }

  const togglePlay = () => {
    if (playing) {
      setPlaying(false)
      return
    }
    if (cursorIndex >= timeline.length - 1) setCursor(0)
    setPlaying(true)
  }

  // Restart: rewind the playhead to the first point (v2's second control-row
  // icon) without touching zoom/speed/legend state.
  const resetPlayback = () => {
    setPlaying(false)
    setCursor(0)
  }

  const visibleSeries = useMemo(() => series.filter((s) => !hiddenKeys.includes(s.key)), [series, hiddenKeys])
  const visibleBands = useMemo(() => bands.filter((b) => !hiddenBandTypes.includes(b.type)), [bands, hiddenBandTypes])
  const bandTypes = useMemo(() => [...new Map(bands.map((b) => [b.type, b])).values()], [bands])

  // The chart now plots the FULL timeline; the visible window is the
  // ECharts `dataZoom` brush itself (see `data-slot="replay-brush"` below),
  // not a manual slice — so band coordinates line up 1:1 with `timeline`
  // indices regardless of the current zoom.
  const chartSeries = useMemo(
    () =>
      visibleSeries.map((s) => ({
        id: s.key,
        label: s.label,
        color: s.color,
        colorIndex: s.colorIndex,
        data: timeline.map((p) => Number(p[s.key] ?? 0)),
      })),
    [visibleSeries, timeline],
  )
  const categories = timeline.map((p) => p.time)

  // Event bands as translucent, full-height overlays on the chart itself
  // (UX requirement: overlaid on the plot, not a separate strip below).
  // Colour follows each band's `tone`, same danger/warning/info/neutral
  // vocabulary `ReplayLegend`'s swatches already use.
  const markAreas: AreaChartMarkArea[] = useMemo(
    () =>
      visibleBands.map((band) => ({
        id: band.id ?? `${band.type}-${band.startIndex}`,
        start: categories[Math.max(0, Math.min(band.startIndex, categories.length - 1))],
        end: categories[Math.max(0, Math.min(band.endIndex, categories.length - 1))],
        color: BAND_TONE[band.tone ?? 'default'],
        label: band.label,
      })),
    [visibleBands, categories],
  )

  const markers: MapMarkerDatum[] = pins.map((p) => ({ id: p.id, position: p.position, color: p.color, label: p.label }))
  if (activeIndex != null) {
    const point = timeline[activeIndex]
    if (point?.lat != null && point?.lng != null) {
      markers.push({ id: '__replay-active__', position: [point.lng, point.lat], color: 'var(--color-warning)', radius: 8 })
    }
  }
  // Same fit-on-change need as TripsOverview/EventsOverview's map (no
  // natural single center — a route spans two distant points): the map only
  // re-fits on a bumped `fitToMarkersNonce`, never automatically, so this
  // bumps one whenever the DATASET behind the marker set actually changes
  // (route/pins swap to a different record). Deliberately NOT keyed on
  // `activeIndex`/`cursor` — those tick every animation frame during
  // playback and would fight the user's own pan/zoom on every tick.
  const [fitNonce, setFitNonce] = useState(1)
  const routeIdentity = route.length ? `${route.length}:${route[0].join(',')}:${route[route.length - 1].join(',')}` : ''
  const pinsIdentity = pins.map((p) => p.id).join(',')
  useEffect(() => {
    setFitNonce((n) => n + 1)
  }, [routeIdentity, pinsIdentity])

  const paths: MapPathDatum[] = []
  if (route.length > 1) {
    if (playing || cursorIndex > 0) {
      const splitAt = Math.max(1, Math.min(route.length, Math.round((cursorIndex / (timeline.length - 1 || 1)) * route.length)))
      paths.push({ id: 'route-travelled', points: route.slice(0, splitAt), color: 'var(--color-success)', widthPx: 5 })
      paths.push({ id: 'route-remaining', points: route.slice(Math.max(0, splitAt - 1)), color: 'var(--color-primary)', widthPx: 4 })
    } else {
      paths.push({ id: 'route', points: route, color: 'var(--color-primary)', widthPx: 4 })
    }
  }

  return (
    <div data-slot="interactive-replay" className={cn('flex flex-col gap-section rounded-md border border-border bg-card p-section', className)}>
      {filters?.length ? (
        <div data-slot="replay-filters" className="flex flex-wrap items-center gap-3">
          {filters.map((field) => {
            const Icon = resolveNamedIcon(field.icon ?? (field.kind === 'dateRange' ? 'calendar' : 'list'))
            return (
              <button
                key={field.label}
                type="button"
                className="flex h-11 min-w-0 items-center gap-2 rounded-sm border border-border px-3 text-start"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-body-xs text-muted-foreground">{field.label}</span>
                  <span className="truncate text-body-sm font-semibold text-foreground">{field.value ?? field.label}</span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            )
          })}
        </div>
      ) : null}

      {stats.length ? (
        <div data-slot="replay-stats" className="grid grid-cols-1 gap-inline sm:grid-cols-3">
          {stats.map((stat, index) => (
            <ReplayStatChip key={index} stat={stat} />
          ))}
        </div>
      ) : null}

      {/* `h-64` (an explicit, non-percentage height) — NOT `min-h-64`, and
          deliberately NO `flex-1`. This panel lives in a plain `flex-col`
          whose own height is intrinsic (it sits inside a SCROLLING
          `TabsContent`, unlike Trips'/Events' CSS GRID map panes, where an
          'auto' row still counts as a "definite" size for percentage-height
          descendants per the Grid spec). Two compounding gotchas here:
          (1) in a plain flex/block context a `min-height`-only box is NOT
          "definite" for CSS percentage-height resolution, so `RecordMapSlot`'s
          `h-full` (100%) was resolving to `auto` → 0; (2) `flex-1` is
          `flex: 1 1 0%` — flex-BASIS 0%, which wins over any `height` on the
          same element for the item's hypothetical main size, and only grows
          from there if the (here auto-height, so zero) flex container has
          leftover space to hand out. Keeping `flex-1` alongside `h-64`
          re-collapsed the pane to ~0 for that reason even after switching
          `min-h-64` to `h-64`. Dropping `flex-1` (its growth was never
          functional here anyway — this container never had spare space to
          distribute) leaves `h-64` as the box's actual, definite, used
          height, which is what `RecordMapSlot`'s `h-full` needs. */}
      <div data-slot="replay-map" className="h-64 overflow-hidden rounded-md border border-border">
        {isEmpty ? (
          <div role="status" className="flex h-64 flex-col items-center justify-center gap-2 p-section text-center">
            <CloudOff aria-hidden="true" className="size-8 text-muted-foreground" />
            <p className="text-body-md font-semibold text-foreground">{emptyTitle}</p>
            <p className="max-w-sm text-body-sm text-muted-foreground">{emptyText}</p>
          </div>
        ) : (
          <RecordMapSlot markers={markers} zones={[]} paths={paths} fitToMarkersNonce={fitNonce} aria-label={mapAriaLabel} />
        )}
      </div>

      {!isEmpty && timeline[displayIndex] ? <ReplayStatusBar point={timeline[displayIndex]} series={visibleSeries} /> : null}

      <div data-slot="replay-controls" className="flex flex-wrap items-center gap-2">
        <ReplayIconButton label={playing ? 'Pause' : 'Play'} active={playing} onClick={togglePlay}>
          {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
        </ReplayIconButton>
        <ReplayIconButton label="Restart replay" onClick={resetPlayback}>
          <RotateCcw className="size-4" aria-hidden="true" />
        </ReplayIconButton>
        <ReplayIconButton
          label="Zoom out"
          onClick={() =>
            setWindowSize((w) => {
              const next = Math.min(1, w + 0.25)
              setWindowStart((s) => Math.min(s, 1 - next))
              return next
            })
          }
        >
          <Minus className="size-4" aria-hidden="true" />
        </ReplayIconButton>
        <ReplayIconButton label="Zoom in" onClick={() => setWindowSize((w) => Math.max(0.25, w - 0.25))}>
          <Plus className="size-4" aria-hidden="true" />
        </ReplayIconButton>
        <ReplayIconButton label="0.5x" active={speed === 0.5} onClick={() => setSpeed(0.5)}>
          0.5x
        </ReplayIconButton>
        <ReplayIconButton label="1x" active={speed === 1} onClick={() => setSpeed(1)}>
          1x
        </ReplayIconButton>
        <ReplayIconButton label="2x" active={speed === 2} onClick={() => setSpeed(2)}>
          2x
        </ReplayIconButton>
        <ReplayIconButton label="5x" active={speed === 5} onClick={() => setSpeed(5)}>
          5x
        </ReplayIconButton>
        <ReplayIconButton label={chartType === 'area' ? 'Switch to bar chart' : 'Switch to area chart'} onClick={() => setChartType((t) => (t === 'area' ? 'bar' : 'area'))}>
          {chartType === 'area' ? <BarChart3 className="size-4" aria-hidden="true" /> : <TrendingUp className="size-4" aria-hidden="true" />}
        </ReplayIconButton>
        <div className="ms-auto">
          <ReplayLegend
            series={series}
            hiddenKeys={hiddenKeys}
            onToggle={(key) => setHiddenKeys((h) => (h.includes(key) ? h.filter((k) => k !== key) : [...h, key]))}
            bandTypes={bandTypes}
            hiddenBandTypes={hiddenBandTypes}
            onToggleBandType={(type) => setHiddenBandTypes((h) => (h.includes(type) ? h.filter((t) => t !== type) : [...h, type]))}
          />
        </div>
      </div>

      {isEmpty ? null : (
        <>
          {chartType === 'area' ? (
            <AreaChart
              categories={categories}
              series={chartSeries}
              legend={false}
              valueAxisMin={0}
              valueAxisMax={100}
              height={height}
              renderer={chartRenderer}
              aria-label={chartAriaLabel}
              markAreas={markAreas}
              dataZoom
              zoomStart={Math.round(windowStart * 100)}
              zoomEnd={Math.round((windowStart + windowSize) * 100)}
              onZoomChange={handleZoomChange}
            />
          ) : (
            <BarChart
              categories={categories}
              series={chartSeries}
              legend={false}
              valueAxisMin={0}
              valueAxisMax={100}
              height={height}
              renderer={chartRenderer}
              aria-label={chartAriaLabel}
              markAreas={markAreas}
              dataZoom
              zoomStart={Math.round(windowStart * 100)}
              zoomEnd={Math.round((windowStart + windowSize) * 100)}
              onZoomChange={handleZoomChange}
            />
          )}
          <div data-slot="replay-brush" className="flex items-center gap-3">
            {/* Scrub buttons: keyboard/hover access to each timeline point,
                independent of the ECharts canvas (UX gate D3 — a hover
                affordance must also be keyboard-reachable). The draggable
                brush window itself is the AreaChart's own `dataZoom` slider
                above (mini area-chart strip + hour labels + drag handles). */}
            <div data-slot="replay-scrub" className="sr-only focus-within:not-sr-only flex gap-1">
              {timeline.map((point, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Show details for ${point.time}`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(index)}
                  onBlur={() => setHoveredIndex(null)}
                  className="size-2 shrink-0 rounded-full bg-muted-foreground/40"
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

InteractiveReplay.displayName = 'InteractiveReplay'
