import { useEffect, useMemo, useState } from 'react'
import { Input } from '@fams/ui-kit'
import { Calendar, EyeOff, Filter, Search } from '@fams/ui-kit/icons'
import { cn } from '../lib/cn'
import { RecordMapSlot } from '../views/hybrid/RecordMapSlot'
import type { MapMarkerDatum } from '../map/MapPanel.types'
import { EventListWidget, readRows } from './overview-widget-parts'
import type { OverviewTone } from './OverviewWidgets.types'
import type { EventsOverviewProps, EventsOverviewRow } from './EventsOverview.types'

const TONE_FILL: Record<OverviewTone, string> = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success-scale-500)',
  warning: 'var(--color-warning-scale-500)',
  danger: 'var(--color-error-500)',
  info: 'var(--color-info-scale-500)',
  neutral: 'var(--color-muted-foreground)',
}

/**
 * EventsOverview — the tanker-detail "Events" tab: a functional search box +
 * filter popover + "Select Time Frame" control over an icon-row event list
 * (`EventListWidget`'s `layout: 'icons'` variant, W3's addition to that
 * widget rather than a forked list renderer), and a map end pane with
 * colour-coded pins matching the list rows plus zoom/fullscreen (via
 * `RecordMapSlot`/`MapPanel`'s own controls) and a hide-pins toggle.
 *
 * Generic/entity-agnostic: every value is FIELD-KEY INDIRECTED off `record`
 * — no "tanker" vocabulary lives here.
 *
 * Documented simplification: "Select Time Frame" is a working popover with
 * from/to native date inputs that filters the visible rows by their `time`
 * field's date portion — not a full calendar-range picker widget.
 */
export function EventsOverview({
  record,
  itemsField,
  iconMap,
  toneMap,
  strings,
  mapAriaLabel = 'Event locations map',
  className,
}: EventsOverviewProps) {
  const s = {
    searchPlaceholder: 'Search events...',
    filterLabel: 'Filter',
    timeFrameLabel: 'Select Time Frame',
    hidePinsLabel: 'Hide pins',
    emptyText: 'No events match your filters.',
    ...strings,
  }

  const allRows = readRows(record, itemsField) as unknown as EventsOverviewRow[]
  const types = useMemo(() => Array.from(new Set(allRows.map((r) => r.type))), [allRows])

  const [query, setQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [timeFrameOpen, setTimeFrameOpen] = useState(false)
  const [activeTypes, setActiveTypes] = useState<Set<string>>(() => new Set(types))
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [pinsHidden, setPinsHidden] = useState(false)

  const filteredRows = allRows.filter((row) => {
    if (query && !`${row.label} ${row.address}`.toLowerCase().includes(query.toLowerCase())) return false
    if (!activeTypes.has(row.type)) return false
    if (fromDate && row.time.slice(0, 10) < fromDate) return false
    if (toDate && row.time.slice(0, 10) > toDate) return false
    return true
  })

  // See `TripsOverview`'s identical comment: the camera must FIT the pins,
  // since there is no single natural center — bump on any change to the
  // visible pin set.
  const [fitNonce, setFitNonce] = useState(1)
  useEffect(() => {
    setFitNonce((n) => n + 1)
  }, [filteredRows.length, pinsHidden])

  const markers: MapMarkerDatum[] = pinsHidden
    ? []
    : filteredRows.map((row) => ({
        id: row.id,
        position: [row.lng, row.lat],
        label: row.label,
        color: TONE_FILL[toneMap?.[row.type] ?? 'primary'],
      }))

  return (
    <div data-slot="events-overview" className={cn('flex flex-col gap-section', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[16rem] flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={s.searchPlaceholder}
            placeholder={s.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ps-9"
          />
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label={s.filterLabel}
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((o) => !o)}
            className="grid size-9 place-items-center rounded-sm border border-border text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Filter className="size-4" aria-hidden="true" />
          </button>
          {filterOpen ? (
            <div className="absolute end-0 top-full z-20 mt-2 w-56 rounded-md border border-border bg-card p-3 shadow-lg">
              <p className="mb-2 text-caption font-medium text-muted-foreground">Event type</p>
              <div className="flex flex-col gap-1.5">
                {types.map((type) => (
                  <label key={type} className="flex items-center gap-2 text-body-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={activeTypes.has(type)}
                      onChange={(e) =>
                        setActiveTypes((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(type)
                          else next.delete(type)
                          return next
                        })
                      }
                      className="size-4 accent-[var(--color-primary)]"
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="relative ms-auto">
          <button
            type="button"
            aria-expanded={timeFrameOpen}
            onClick={() => setTimeFrameOpen((o) => !o)}
            className="flex h-9 items-center gap-2 rounded-sm border border-border px-3 text-body-sm text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Calendar className="size-4" aria-hidden="true" />
            {s.timeFrameLabel}
          </button>
          {timeFrameOpen ? (
            <div className="absolute end-0 top-full z-20 mt-2 w-64 rounded-md border border-border bg-card p-3 shadow-lg">
              <div className="flex flex-col gap-2">
                <label htmlFor="events-overview-from-date" className="flex flex-col gap-1 text-caption text-muted-foreground">
                  From
                  <Input id="events-overview-from-date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8" />
                </label>
                <label htmlFor="events-overview-to-date" className="flex flex-col gap-1 text-caption text-muted-foreground">
                  To
                  <Input id="events-overview-to-date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8" />
                </label>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-section lg:grid-cols-[minmax(280px,380px)_1fr]">
        <div className="fams-scroll-region max-h-[32rem] overflow-y-auto pe-1">
          <EventListWidget
            widget={{
              type: 'eventList',
              title: '',
              itemsField: '__rows__',
              layout: 'icons',
              iconMap,
              toneMap,
              emptyText: s.emptyText,
            }}
            record={{ id: 'events-overview', __rows__: filteredRows } as unknown as Parameters<typeof EventListWidget>[0]['record']}
          />
        </div>

        <div data-slot="events-map" className="relative min-h-[28rem] overflow-hidden rounded-md border border-border">
          <button
            type="button"
            aria-label={s.hidePinsLabel}
            aria-pressed={pinsHidden}
            onClick={() => setPinsHidden((h) => !h)}
            className="absolute start-4 bottom-4 z-10 grid size-9 place-items-center rounded-sm border border-border bg-card text-foreground shadow-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <EyeOff className="size-4" aria-hidden="true" />
          </button>
          <RecordMapSlot markers={markers} zones={[]} fitToMarkersNonce={fitNonce} aria-label={mapAriaLabel} />
        </div>
      </div>
    </div>
  )
}

EventsOverview.displayName = 'EventsOverview'
