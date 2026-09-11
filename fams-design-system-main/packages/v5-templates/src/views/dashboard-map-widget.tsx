import { lazy, Suspense, useId, useMemo, useState } from 'react'
import { Filter, Search } from '@fams/ui-kit/icons'
import { Button, CriticalEventsList, Input, StatusView, type CriticalEventsListItem } from '@fams/ui-kit'
import type { DashboardLegendEntry, DashboardListItem, DashboardWidgetDataSource } from '@fams/v5-composer'
import type { MapViewState } from '../map/MapPanel.types'
import { DEFAULT_GLOBAL_BASEMAP_ID, resolveGlobalBasemapStyleUrl, useGlobalBasemapId } from '../map/global-basemap-store'
import { useMutedBasemapStyle } from '../map/muted-basemap'
import { WidgetCard, sourceOf, widgetAriaLabel, widgetHeight, type DashboardWidgetRenderProps } from './dashboard-widget-shell'

/**
 * dashboard-map-widget — the `geospatial-heatmap` widget: a `MapPanel` with an
 * OPTIONAL list rail beside it.
 *
 * `MapPanel` is reached through a LAZY `@fams/v5-templates/map` import —
 * exactly the technique `entity-profile/OverviewWidgets.tsx` documents — so a
 * dashboard with no map widget never pays for `maplibre-gl`/`deck.gl`, and
 * this file's own static imports stay confined to the light `.` entry.
 *
 * THE RAIL IS A GENERIC CAPABILITY, not a per-screen one, and it is DEFAULTED
 * FROM THE DATA rather than authored: it renders from the `items[]` the widget
 * already carries, whenever those items carry list content (`title` + a
 * `description` or `timestamp`) — fields that exist for no other reason. A
 * heat surface, or points that are bare coordinates, stays map-only, and
 * `listRail: false` suppresses it on a labelled marker set that should not
 * have one. Search filters the LIST and the MARKERS from one query — filtering
 * only the list would be the worse half of the feature — and a row click
 * selects that item's marker, which is what opens its popup.
 *
 * TEXT ALTERNATIVE (verdict V10). A map encodes everything in position and
 * colour, exactly like a chart canvas, so it gets the same relief channel the
 * charts get: a visually-hidden `<table>` of every rendered item, linked from
 * the map region with `aria-describedby`. `MapPanel` overwrites MapLibre's own
 * literal `aria-label="Map"` on the canvas with the widget's sentence.
 */

const LazyMapPanel = lazy(() => import('@fams/v5-templates/map').then((mod) => ({ default: mod.MapPanel })))

function MapFallback() {
  return <div role="status" aria-label="Loading map" className="h-full min-h-72 w-full animate-pulse rounded-sm bg-muted" />
}

const DEFAULT_RAIL_WIDTH = '24rem'

/**
 * A legend entry's paint colour, in the SAME precedence every other coloured
 * datum in the dashboard uses (`toSeries`, `DonutWidget`, `CountersCell`):
 * `colorToken` (a non-categorical binding such as `var(--color-error-500)`)
 * wins over an explicit literal `color`, which wins over the categorical slot.
 *
 * `colorToken` was missing here, which is why a map legend authored entirely in
 * semantic tokens rendered four IDENTICAL swatches (every entry fell through to
 * `--color-chart-1`) while the donut and the stacked bar beside it carried the
 * four real category hues — same vocabulary, two answers (round-3 P1 #1).
 */
export function legendColor(entry: DashboardLegendEntry): string {
  if (entry.colorToken) return entry.colorToken
  if (entry.color) return entry.color
  return `var(--color-chart-${entry.colorIndex ?? 1})`
}

/* ── Map viewport ────────────────────────────────────────────────────────
 * `MapPanel`'s own default camera is the WORLD view (lon 0 / lat 20 / zoom
 * 1.5) — correct for a map with no data, wrong for a dashboard widget whose
 * points are all in one city. A dashboard map therefore derives its opening
 * camera from the DATA: the centre and zoom that fit `items[].position`. An
 * author can still override either half with `dataSource.center`/`zoom`.
 */

/** `360 / 2^zoom` degrees of longitude fill the viewport, so zoom = log2(360 / span). */
const WORLD_LONGITUDE_SPAN = 360
/** Extra room around the extent so no marker sits on the panel edge. */
const FIT_PADDING = 1.35
/** Never zoom past street level, even for a single point. */
const MAX_FIT_ZOOM = 13
/** Never zoom out past a continent — below this the world view is honest. */
const MIN_FIT_ZOOM = 2
/** Fallback camera when a map widget has no positioned items and no authored centre. */
const DEFAULT_FIT_ZOOM = 9

/**
 * The opening camera for a map widget: authored `center`/`zoom` win, otherwise
 * both are fitted to the bounding box of the widget's own positions. Latitude
 * span is converted to its longitude equivalent through the Mercator
 * `1/cos(lat)` factor so a tall, narrow extent is not cropped.
 */
export function fitViewState(
  positions: Array<[number, number]>,
  source: Pick<DashboardWidgetDataSource, 'center' | 'zoom'>,
): MapViewState | undefined {
  const authoredCenter = source.center
  if (positions.length === 0) {
    if (!authoredCenter) return undefined
    return { longitude: authoredCenter[0], latitude: authoredCenter[1], zoom: source.zoom ?? DEFAULT_FIT_ZOOM }
  }
  const longitudes = positions.map((position) => position[0])
  const latitudes = positions.map((position) => position[1])
  const minLongitude = Math.min(...longitudes)
  const maxLongitude = Math.max(...longitudes)
  const minLatitude = Math.min(...latitudes)
  const maxLatitude = Math.max(...latitudes)
  const centerLongitude = (minLongitude + maxLongitude) / 2
  const centerLatitude = (minLatitude + maxLatitude) / 2

  const mercatorStretch = Math.max(Math.cos((centerLatitude * Math.PI) / 180), 0.1)
  const longitudeSpan = maxLongitude - minLongitude
  const latitudeSpan = (maxLatitude - minLatitude) / mercatorStretch
  const span = Math.max(longitudeSpan, latitudeSpan) * FIT_PADDING

  const fitted = span <= 0 ? MAX_FIT_ZOOM : Math.log2(WORLD_LONGITUDE_SPAN / span)
  const zoom = source.zoom ?? Math.min(MAX_FIT_ZOOM, Math.max(MIN_FIT_ZOOM, fitted))

  return {
    longitude: authoredCenter?.[0] ?? centerLongitude,
    latitude: authoredCenter?.[1] ?? centerLatitude,
    zoom,
  }
}

/**
 * Whether this widget's points are LIST content or bare coordinates. A rail
 * over `[lng, lat]` pairs with no titles would be a column of blank rows.
 */
function itemsAreListable(items: DashboardListItem[]): boolean {
  return items.length > 0 && items.every((item) => Boolean(item.title) && Boolean(item.description ?? item.timestamp))
}

/** Plain-text haystack one rail row is matched against. */
function itemHaystack(item: DashboardListItem): string {
  return [item.title, item.description, item.timestamp, ...(item.meta ?? []).map((entry) => String(entry.value))]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/**
 * A map widget — categorical markers (`render: 'markers'`, the default) or a
 * heat surface (`render: 'heat'`). The legend is a titled checkbox group with
 * ≥44×44 rows (verdict V11); unchecking everything renders an explicit empty
 * state OVER the map rather than a bare basemap (verdict V10).
 */
export function GeospatialWidget(props: DashboardWidgetRenderProps) {
  const { widget, onItemSelect } = props
  const source = sourceOf(widget)
  const legend = source.legend ?? []
  const tableId = `${useId()}-map-items`

  // Global-sync (map-layer-switcher spec point 5): this widget carries no
  // layers control of its own, but it must still repaint when the layer is
  // switched from Live Monitoring or any other map surface.
  const mutedStyleUrl = useMutedBasemapStyle()
  const [globalBasemapId] = useGlobalBasemapId(DEFAULT_GLOBAL_BASEMAP_ID)
  const resolvedStyleUrl = resolveGlobalBasemapStyleUrl(globalBasemapId, mutedStyleUrl)

  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const toggle = (id: string) =>
    setHiddenIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))

  const allItems = useMemo(() => source.items ?? [], [source.items])
  const authoredRail = source.listRail
  const rail =
    authoredRail === false || source.render === 'heat' || !itemsAreListable(allItems)
      ? undefined
      : (authoredRail ?? {})
  const needle = query.trim().toLowerCase()

  // ONE query drives both channels: the rail rows and the markers. Filtering
  // only the list would leave the map contradicting the list beside it.
  const visibleItems = useMemo(
    () =>
      allItems.filter(
        (item) => !hiddenIds.includes(item.category ?? '') && (!needle || itemHaystack(item).includes(needle)),
      ),
    [allItems, hiddenIds, needle],
  )

  const points = visibleItems.filter((item) => item.position)
  const asHeat = source.render === 'heat'
  const colorFor = (category: string | undefined) => {
    const entry = legend.find((candidate) => candidate.id === category)
    return entry ? legendColor(entry) : undefined
  }

  const allHidden = legend.length > 0 && hiddenIds.length === legend.length
  // Fitted from ALL positioned items, not the currently-visible subset — the
  // camera must not jump every time a legend category or the search changes.
  const defaultViewState = fitViewState(
    allItems.flatMap((item) => (item.position ? [item.position] : [])),
    source,
  )

  const selectedItem = allItems.find((item) => item.id === selectedId)
  const rows: CriticalEventsListItem[] = visibleItems.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    severity: item.severity === 'critical' ? 'error' : item.severity === 'warning' ? 'warning' : 'info',
    timestamp: item.timestamp,
    meta: item.meta,
  }))

  const map = (
    <div className="relative h-full w-full">
      <Suspense fallback={<MapFallback />}>
        <LazyMapPanel
          aria-label={widgetAriaLabel(widget, props.filterSummary)}
          aria-describedby={tableId}
          // App-wide basemap selection (map-layer-switcher spec point 5): a
          // style picked on Live Monitoring repaints this widget too.
          styleUrl={resolvedStyleUrl}
          defaultViewState={defaultViewState}
          markers={
            asHeat
              ? []
              : points.map((item) => ({
                  id: item.id,
                  position: item.position as [number, number],
                  color: colorFor(item.category),
                  label: item.title,
                  data: item,
                }))
          }
          heat={asHeat ? points.map((item) => ({ position: item.position as [number, number], weight: item.weight })) : []}
          legend={legend.map((entry) => ({ id: entry.id, label: entry.label, color: legendColor(entry) }))}
          legendTitle={source.axis?.y?.title ?? 'Events'}
          hiddenLegendIds={hiddenIds}
          onLegendToggle={legend.length > 0 ? toggle : undefined}
          onMarkerClick={(marker) => setSelectedId(marker.id)}
          selectedMarkerId={selectedId}
          onPopupClose={() => setSelectedId(undefined)}
          renderMarkerPopup={(marker) => {
            // Deliberately NOT `VehiclePopupCard`: its prop surface is the
            // fleet-vehicle one (model/plate/driver/status), and a dashboard
            // map point is whatever the blueprint says it is. The popup
            // renders the item's own authored fields instead.
            const item = allItems.find((candidate) => candidate.id === marker.id)
            return <MarkerPopupBody item={item} fallbackTitle={marker.label ?? ''} />
          }}
        />
      </Suspense>
      {allHidden || points.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-card/80">
          <StatusView
            kind="empty"
            title={allHidden ? 'No categories selected' : needle ? 'No matches' : 'No locations'}
            description={
              allHidden
                ? 'Select at least one category to see events on the map.'
                : needle
                  ? 'No events match this search.'
                  : (source.emptyText ?? 'No mapped events for the current filters.')
            }
          />
        </div>
      ) : null}
    </div>
  )

  return (
    <WidgetCard {...props} count={allItems.length} bodyPadding="none" bodyHeight={widgetHeight(widget, 440)}>
      <div className="flex h-full w-full flex-col gap-0 md:flex-row">
        {rail ? (
          <div
            data-slot="dashboard-map-rail"
            className="flex min-h-0 shrink-0 flex-col gap-3 border-b border-border p-4 md:border-b-0 md:border-e"
            style={{ inlineSize: rail.width ?? DEFAULT_RAIL_WIDTH }}
          >
            <div className="flex items-center gap-2">
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={rail.searchPlaceholder ?? 'Search'}
                aria-label={rail.searchPlaceholder ?? 'Search'}
                leadingIcon={<Search aria-hidden="true" />}
                data-slot="dashboard-map-rail-search"
                className="min-w-0 flex-1"
              />
              {rail.filterable ? (
                <Button variant="secondary" size="md" aria-label="Filter events" className="shrink-0">
                  <Filter className="size-4" aria-hidden="true" />
                </Button>
              ) : null}
            </div>
            <div
              role="region"
              // Deliberate (WCAG 2.1.1 / verdict V5): a scroll container a
              // mouse can pan must be reachable and pannable by keyboard.
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
              tabIndex={0}
              aria-label={widget.title ?? 'Events'}
              className="min-h-0 flex-1 overflow-y-auto focus-visible:outline-2 focus-visible:outline-ring"
            >
              <CriticalEventsList
                items={rows}
                onItemClick={(id) => {
                  setSelectedId(id)
                  onItemSelect?.(widget.id, id)
                }}
                emptyState={<StatusView kind="empty" title="No matches" description="No events match this search." />}
                className="border-0 shadow-none"
              />
            </div>
          </div>
        ) : null}
        <div className="min-h-0 min-w-0 flex-1">{map}</div>
      </div>
      {/*
        Clip wrapper (fix5) — same pattern, and for the same reason, as
        `ChartContainer`'s: `sr-only`'s `width: 1px` does NOT shrink a
        `<table>` (auto table layout treats it as a minimum), so the
        absolutely-positioned twin laid out at its full min-content width and
        escaped `[data-slot="dashboard-widget"]`'s `overflow-x: hidden` —
        that element is not positioned, so it is not the table's containing
        block. This wrapper IS positioned (`sr-only` ⇒ `position: absolute`)
        and hides its overflow, so it clips the table to 1×1px of page
        overflow while the table stays in the a11y tree and Tab order.
      */}
      <div data-slot="dashboard-map-data-table-clip" className="sr-only overflow-hidden">
        <MapItemsTable id={tableId} caption={widgetAriaLabel(widget, props.filterSummary)} items={visibleItems} />
      </div>
      {selectedItem ? <span className="sr-only" role="status">{`${selectedItem.title} selected`}</span> : null}
    </WidgetCard>
  )
}

/** Popup body for a selected marker — the item's authored title, context and meta. */
function MarkerPopupBody({ item, fallbackTitle }: { item: DashboardListItem | undefined; fallbackTitle: string }) {
  return (
    <div className="flex min-w-48 flex-col gap-2 p-3">
      <span className="text-body-sm font-semibold text-foreground">{item?.title ?? fallbackTitle}</span>
      {item?.description ? <span className="text-caption text-muted-foreground">{item.description}</span> : null}
      {item?.timestamp ? <span className="text-caption text-muted-foreground">{item.timestamp}</span> : null}
      {item?.meta?.length ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
          {item.meta.map((entry, index) => (
            <div key={entry.id ?? index} className="flex flex-col">
              <dt className="text-caption uppercase tracking-wide text-muted-foreground">{entry.label}</dt>
              <dd className="text-caption text-foreground">
                <bdi>{entry.value}</bdi>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}

/**
 * The map's relief channel — one row per rendered item. `sr-only` +
 * `tabIndex={0}`, matching `ChartContainer`'s own twin: a screen-reader user
 * gets the events, not the word "Map".
 */
function MapItemsTable({ id, caption, items }: { id: string; caption: string; items: DashboardListItem[] }) {
  return (
    <table
      id={id}
      data-slot="dashboard-map-data-table"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className="sr-only"
    >
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Event</th>
          <th scope="col">Category</th>
          <th scope="col">Time</th>
          <th scope="col">Location</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <th scope="row">{item.title}</th>
            <td>{item.category ?? '—'}</td>
            <td>{item.timestamp ?? '—'}</td>
            <td>{item.description ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
