import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react'
import { AreaChart, ChartCard, InfoBanner, type InfoBannerMetaItem } from '@fams/ui-kit'
import { ChevronDown, getIcon, TrendingUp } from '@fams/ui-kit/icons'
import type { EntityRecord } from '@fams/v5-composer'
import { cn } from '../lib/cn'
import { DailyTimelineWidget } from './DailyTimelineWidget'
import type { LocationMapPin, LocationMapPolygon } from '../map/LocationMap'
import {
  BarChartWidget,
  EventListWidget,
  KpiTilesWidget,
  LevelSummaryWidget,
  LineChartWidget,
  LocationMapAddressCard,
  LocationMapControls,
  LocationMapStatusPill,
  StatusCardRowWidget,
  StatusCardWidget,
  readRows,
  readText,
  resolveNamedIcon,
  resolveOptionalIcon,
  resolveTone,
} from './overview-widget-parts'
import type {
  OverviewAlertBannerWidget,
  OverviewEventListWidget,
  OverviewFilterBarWidget,
  OverviewLocationCardStrings,
  OverviewLocationMapWidget,
  OverviewMetaField,
  OverviewTrendChartWidget,
  OverviewWidget,
} from './OverviewWidgets.types'

/**
 * OverviewWidgets — a metadata-driven MINI DASHBOARD for the profile "Overview"
 * tab. [tier-2 pattern]
 *
 * Generic and module-agnostic: the widget UNION and its field-key indirection
 * contract live in `OverviewWidgets.types.ts`, the per-variant markup in
 * `overview-widget-parts.tsx`; this file owns the two-column LAYOUT and the
 * dispatch switch. No fetching and no formatting — every value is read off
 * `record` as-is and handed to the underlying `@fams/ui-kit` composite
 * unchanged (Rule 8).
 *
 * `locationMap` renders through a LAZY `@fams/v5-templates/map` import (mirrors
 * `views/LocationMapSectionSlot.tsx`'s documented technique) so a consumer whose
 * blueprint never uses a `locationMap` widget never pays for
 * `maplibre-gl`/`deck.gl` — this file's own static imports stay confined to the
 * light `.` entry.
 */
export type {
  OverviewAlertBannerWidget,
  OverviewBarChartWidget,
  OverviewDailyTimelineSegment,
  OverviewDailyTimelineStrings,
  OverviewDailyTimelineWidget,
  OverviewEventColumn,
  OverviewEventListWidget,
  OverviewKpiTileConfig,
  OverviewKpiTilesWidget,
  OverviewLevelStat,
  OverviewLevelSummaryWidget,
  OverviewLineChartWidget,
  OverviewLineSeries,
  OverviewLocationCardStrings,
  OverviewLocationMapWidget,
  OverviewMetaField,
  OverviewPlanBannerWidget,
  OverviewStatusCardConfig,
  OverviewStatusCardRowWidget,
  OverviewStatusCardWidget,
  OverviewTone,
  OverviewTrendChartWidget,
  OverviewWidget,
  OverviewWidgetColumn,
} from './OverviewWidgets.types'

export interface OverviewWidgetsProps {
  widgets: OverviewWidget[]
  /** The record every widget's field-key-indirected config reads from. */
  record?: EntityRecord
  /**
   * Fired when an `eventList` row is activated, with that row's id and the
   * widget that owns it — the seam an app uses to jump to (say) the Events tab
   * filtered to that event. OMIT IT and the rows render as non-interactive
   * text, never as buttons that do nothing.
   */
  onEventSelect?: (eventId: string, widget: OverviewEventListWidget) => void
  /** Fired by a `locationMap`'s open-in-new action. Omit to hide that control. */
  onOpenLocation?: (widget: OverviewLocationMapWidget) => void
  /** Fired by a `locationMap`'s zoom-in control. Omit to hide it. */
  onZoomIn?: (widget: OverviewLocationMapWidget) => void
  /** Fired by a `locationMap`'s zoom-out control. Omit to hide it. */
  onZoomOut?: (widget: OverviewLocationMapWidget) => void
  /** Fired by a `locationMap`'s fullscreen control. Omit to hide it. */
  onFullscreen?: (widget: OverviewLocationMapWidget) => void
  className?: string
}

const LazyLocationMap = lazy(() =>
  import('@fams/v5-templates/map').then((mod) => ({ default: mod.LocationMap })),
)

function LocationMapFallback({ height }: { height: number }) {
  return (
    <div
      role="status"
      aria-label="Loading map"
      style={{ height: `${height}px` }}
      className="w-full animate-pulse rounded-sm bg-muted"
    />
  )
}

/** Centroid of every point across every polygon — the camera centre when none is configured. */
function polygonsCentroid(polygons: LocationMapPolygon[]): [number, number] {
  const points = polygons.flatMap((polygon) => polygon.points)
  if (!points.length) return [0, 0]
  const [sumLng, sumLat] = points.reduce(
    ([lng, lat], [pointLng, pointLat]) => [lng + pointLng, lat + pointLat],
    [0, 0],
  )
  return [sumLng / points.length, sumLat / points.length]
}

/**
 * Fit-to-bounds camera zoom for `polygons`, capped at `MAX_SAFE_ZOOM`.
 *
 * `LocationMap`'s own default (`zoom={14}`) is too CLOSE for a small polygon: a
 * seeded ~1km-wide collection-point polygon rendered as a distorted full-height
 * vertical sliver at zoom 14 (reproducible with tiles present or absent, so not
 * a basemap-loading symptom) and rendered correctly once framed lower. Rather
 * than hardcode one "safe" zoom (wrong for a much bigger or smaller polygon)
 * this computes the standard bounds-fit zoom for the polygons' own lng/lat span
 * against an assumed viewport, with a generous padding fraction, and clamps to
 * `MAX_SAFE_ZOOM` as a defensive ceiling against that artifact.
 */
const ASSUMED_VIEWPORT_PX = { width: 640, height: 280 }
const PADDING = 0.5
const MAX_SAFE_ZOOM = 13
const DEFAULT_MAP_HEIGHT = 292

function latRad(lat: number): number {
  const sin = Math.sin((lat * Math.PI) / 180)
  return Math.log((1 + sin) / (1 - sin)) / 2
}

function zoomForFraction(viewportPx: number, fraction: number): number {
  // `256` = a world-map tile's pixel size at zoom 0 (the constant this
  // bounds-fit formula is defined in terms of).
  if (fraction <= 0) return MAX_SAFE_ZOOM
  return Math.log2(viewportPx / 256 / fraction)
}

function polygonsZoom(polygons: LocationMapPolygon[]): number {
  const points = polygons.flatMap((polygon) => polygon.points)
  if (points.length < 2) return MAX_SAFE_ZOOM
  const lngs = points.map(([lng]) => lng)
  const lats = points.map(([, lat]) => lat)
  const lngFraction = (Math.max(...lngs) - Math.min(...lngs)) / 360 / PADDING
  const latFraction = (latRad(Math.max(...lats)) - latRad(Math.min(...lats))) / Math.PI / PADDING
  const zoom = Math.min(
    zoomForFraction(ASSUMED_VIEWPORT_PX.width, lngFraction),
    zoomForFraction(ASSUMED_VIEWPORT_PX.height, latFraction),
  )
  if (!Number.isFinite(zoom)) return MAX_SAFE_ZOOM
  return Math.min(Math.max(zoom, 1), MAX_SAFE_ZOOM)
}

function readMetaItems(
  record: EntityRecord | undefined,
  fields: OverviewMetaField[] | undefined,
): InfoBannerMetaItem[] {
  if (!fields?.length || !record) return []
  return fields
    .map((entry) => (typeof entry === 'string' ? { field: entry, icon: undefined as string | undefined } : entry))
    .map(({ field, icon }, index) => ({ index, value: record[field] as unknown, icon }))
    .filter(
      (item): item is { index: number; value: string | number; icon: string | undefined } =>
        item.value != null && item.value !== '',
    )
    .map(({ index, value, icon }) => ({
      id: String(index),
      label: String(value),
      icon: icon ? getIcon(icon) : undefined,
    }))
}

const DEFAULT_MAP_STRINGS: OverviewLocationCardStrings = {
  title: 'Current Location',
  openLabel: 'Open location in the main map',
  zoomInLabel: 'Zoom in',
  zoomOutLabel: 'Zoom out',
  fullscreenLabel: 'Full screen',
}

function FilterBarWidget({ widget }: { widget: OverviewFilterBarWidget }) {
  return (
    <div data-slot="overview-filter-bar" className="flex flex-wrap items-center gap-3">
      {widget.filters.map((field) => {
        const Icon = resolveNamedIcon(field.icon ?? (field.kind === 'dateRange' ? 'calendar' : 'list'))
        return (
          <button
            key={field.label}
            type="button"
            className="flex h-11 min-w-0 items-center gap-2 rounded-sm border border-border px-3 text-start"
          >
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate text-body-sm font-semibold text-foreground">{field.value ?? field.label}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}

function AlertBannerWidget({
  widget,
  record,
}: {
  widget: OverviewAlertBannerWidget
  record: EntityRecord | undefined
}) {
  return (
    <InfoBanner
      icon={resolveNamedIcon(widget.icon)}
      // The frame's banner is INFO-tinted end to end (a pale primary wash), not
      // the neutral bordered strip `variant="default"` paints — `'insight'` is
      // `InfoBanner`'s own tinted-row shape, with `tone` selecting the wash.
      // `rounded-sm` overrides its pill radius: the frame's banner is a
      // card-radius strip, matching the cards below it.
      variant="insight"
      tone={widget.tone ?? 'info'}
      title={widget.title}
      meta={readMetaItems(record, widget.metaFields)}
      className="rounded-sm"
    />
  )
}

function TrendChartWidget({
  widget,
  record,
}: {
  widget: OverviewTrendChartWidget
  record: EntityRecord | undefined
}) {
  const data = readRows(record, widget.seriesField)
  return (
    <ChartCard title={widget.title} icon={TrendingUp}>
      <AreaChart
        categories={data.map((point) => String(point.month ?? ''))}
        series={[
          {
            id: 'trend',
            label: widget.yLabel ?? (typeof widget.title === 'string' ? widget.title : 'Trend'),
            data: data.map((point) => Number(point.value ?? 0)),
            color: widget.color,
          },
        ]}
        legend={false}
        height={280}
        aria-label={typeof widget.title === 'string' ? widget.title : 'Trend chart'}
      />
    </ChartCard>
  )
}

type MapHandlers = Pick<OverviewWidgetsProps, 'onOpenLocation' | 'onZoomIn' | 'onZoomOut' | 'onFullscreen'>

function LocationMapWidget({
  widget,
  record,
  handlers,
}: {
  widget: OverviewLocationMapWidget
  record: EntityRecord | undefined
  handlers: MapHandlers
}) {
  const polygons = (
    (widget.polygonsField
      ? (record?.[widget.polygonsField] as LocationMapPolygon[] | undefined)
      : undefined) ?? []
  ).filter((polygon) => polygon?.points?.length)
  const rawPins = widget.pinsField ? (record?.[widget.pinsField] as LocationMapPin[] | undefined) : undefined
  const pinFilters = widget.pinFilters
  // Every filter chip starts checked — an unfiltered map is the default, opt-out
  // rather than opt-in state (Rule 8: no hidden data behind an unticked box).
  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    () => new Set((pinFilters ?? []).map((filter) => filter.key)),
  )
  const pins = useMemo(() => {
    const allPins = rawPins ?? []
    if (!pinFilters?.length) return allPins
    return allPins.filter((pin) => !pin.category || activeFilters.has(pin.category))
  }, [rawPins, pinFilters, activeFilters])
  const explicitCenter = widget.centerField
    ? (record?.[widget.centerField] as [number, number] | undefined)
    : undefined
  const center = explicitCenter ?? pins[0]?.position ?? polygonsCentroid(polygons)
  const zoom = widget.zoom ?? (polygons.length ? polygonsZoom(polygons) : undefined)
  const height = widget.height ?? DEFAULT_MAP_HEIGHT
  const strings = { ...DEFAULT_MAP_STRINGS, ...widget.strings }
  const statusLabel = readText(record, widget.statusField)
  const address = readText(record, widget.addressField)
  const label = typeof widget.title === 'string' ? widget.title : 'Location map'

  const body = (
    <div className="relative w-full overflow-hidden" style={{ height: `${height}px` }}>
      <Suspense fallback={<LocationMapFallback height={height} />}>
        {/* `controls={false}`: `MapPanel`'s own cluster is fixed bottom-end and
            carries a compass this frame does not show — the overlay below
            supplies the frame's own zoom ±/fullscreen stack instead. */}
        <LazyLocationMap
          center={center}
          zoom={zoom}
          pins={pins}
          polygons={polygons}
          controls={false}
          aria-label={label}
        />
      </Suspense>
      {widget.pinFilters?.length ? (
        <div className="absolute start-3 top-3 z-10 flex flex-wrap gap-2">
          {widget.pinFilters.map((filter) => {
            const checked = activeFilters.has(filter.key)
            return (
              <label
                key={filter.key}
                className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-border bg-card px-2 py-1 text-caption font-medium text-foreground shadow-md"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setActiveFilters((prev) => {
                      const next = new Set(prev)
                      if (next.has(filter.key)) next.delete(filter.key)
                      else next.add(filter.key)
                      return next
                    })
                  }
                  className="size-3.5 accent-current"
                  style={filter.color ? { color: filter.color } : undefined}
                />
                {filter.color ? (
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ backgroundColor: filter.color }}
                  />
                ) : null}
                {filter.label}
              </label>
            )
          })}
        </div>
      ) : null}
      {statusLabel ? (
        <div className="absolute start-3 top-3 z-10">
          <LocationMapStatusPill
            label={statusLabel}
            tone={resolveTone(record, widget.statusField, widget.statusToneMap, 'neutral')}
          />
        </div>
      ) : null}
      {address ? (
        <div className="absolute bottom-3 start-3 z-10">
          <LocationMapAddressCard
            address={address}
            strings={strings}
            onOpen={handlers.onOpenLocation ? () => handlers.onOpenLocation?.(widget) : undefined}
          />
        </div>
      ) : null}
      <div className="absolute bottom-3 end-3 z-10">
        <LocationMapControls
          strings={strings}
          onZoomIn={handlers.onZoomIn ? () => handlers.onZoomIn?.(widget) : undefined}
          onZoomOut={handlers.onZoomOut ? () => handlers.onZoomOut?.(widget) : undefined}
          onFullscreen={handlers.onFullscreen ? () => handlers.onFullscreen?.(widget) : undefined}
        />
      </div>
    </div>
  )

  // The frame's Overview map has NO header — it is a bare map card under the
  // telematics status card — while the iwmp "Location" widget keeps its titled
  // chrome, so which one renders is config (`hideHeader`), not a fork.
  return widget.hideHeader ? (
    <div data-slot="overview-location-map" className="overflow-hidden rounded-md border border-border bg-card">
      {body}
    </div>
  ) : (
    <ChartCard
      data-slot="overview-location-map"
      title={widget.title}
      icon={resolveOptionalIcon(widget.icon ?? 'map-01')}
      bodyPadding="none"
    >
      {body}
    </ChartCard>
  )
}

function renderWidget(
  widget: OverviewWidget,
  record: EntityRecord | undefined,
  props: OverviewWidgetsProps,
): ReactNode {
  switch (widget.type) {
    case 'filterBar':
      return <FilterBarWidget widget={widget} />
    case 'alertBanner':
    case 'planBanner':
      return <AlertBannerWidget widget={widget} record={record} />
    case 'statusCard':
      return <StatusCardWidget widget={widget} record={record} />
    case 'statusCardRow':
      return <StatusCardRowWidget widget={widget} record={record} />
    case 'kpiTiles':
      return <KpiTilesWidget widget={widget} record={record} />
    case 'barChart':
      return <BarChartWidget widget={widget} record={record} />
    case 'levelSummary':
      return <LevelSummaryWidget widget={widget} record={record} />
    case 'dailyTimeline':
      return <DailyTimelineWidget widget={widget} record={record} />
    case 'lineChart':
      return <LineChartWidget widget={widget} record={record} />
    case 'eventList':
      return (
        <EventListWidget
          widget={widget}
          record={record}
          onSelect={props.onEventSelect ? (id) => props.onEventSelect?.(id, widget) : undefined}
        />
      )
    case 'trendChart':
      return <TrendChartWidget widget={widget} record={record} />
    case 'locationMap':
      return <LocationMapWidget widget={widget} record={record} handlers={props} />
    default:
      return null
  }
}

export function OverviewWidgets(props: OverviewWidgetsProps) {
  const { widgets, record, className } = props
  const keyed = widgets.map((widget, index) => ({
    widget,
    key: `${widget.type}-${index}`,
    node: renderWidget(widget, record, props),
  }))

  const firstColumned = keyed.findIndex(
    ({ widget }) => widget.column === 'start' || widget.column === 'end',
  )

  const stack = (items: typeof keyed) =>
    items.map(({ key, node }) => (
      <div key={key} className="min-w-0">
        {node}
      </div>
    ))

  // No widget asked for a column ⇒ the original single stack, exactly the
  // layout every pre-existing consumer authored.
  if (firstColumned === -1) {
    return (
      <div data-slot="overview-widgets" className={cn('flex flex-col gap-4', className)}>
        {stack(keyed)}
      </div>
    )
  }

  // Two-column arrangement: full-width widgets AHEAD of the first columned one
  // sit above the grid (the frame's alert banner), the rest below it, and each
  // column is its own vertical stack so a two-item start column never
  // interleaves rows with a two-item end column (which a plain `grid-cols-2`
  // flow would do).
  const above = keyed.slice(0, firstColumned)
  const rest = keyed.slice(firstColumned)
  const start = rest.filter(({ widget }) => widget.column === 'start')
  const end = rest.filter(({ widget }) => widget.column === 'end')
  const below = rest.filter(({ widget }) => widget.column !== 'start' && widget.column !== 'end')

  return (
    <div data-slot="overview-widgets" className={cn('flex flex-col gap-4', className)}>
      {stack(above)}
      <div data-slot="overview-widgets-columns" className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">{stack(start)}</div>
        <div className="flex min-w-0 flex-col gap-4">{stack(end)}</div>
      </div>
      {stack(below)}
    </div>
  )
}

OverviewWidgets.displayName = 'OverviewWidgets'
