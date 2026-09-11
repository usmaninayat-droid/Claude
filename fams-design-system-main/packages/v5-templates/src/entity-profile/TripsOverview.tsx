import { useEffect, useMemo, useState } from 'react'
import { KpiTile, Input, Switch } from '@fams/ui-kit'
import { Pause, Play } from '@fams/ui-kit/icons'
import { cn } from '../lib/cn'
import { RecordMapSlot } from '../views/hybrid/RecordMapSlot'
import type { MapMarkerDatum, MapPathDatum } from '../map/MapPanel.types'
import type { LocationMapPin } from '../map/LocationMap'
import { readRows, resolveOptionalIcon } from './overview-widget-parts'
import type { TripsOverviewProps, TripsOverviewTripRow } from './TripsOverview.types'

/**
 * TripsOverview — the tanker-detail "Trips" tab: KPI chip row + date picker,
 * a grouped/scrollable trip list, and a route-map end pane with layer
 * checkboxes + a Timeline scrub card. [tier-2 pattern]
 *
 * Generic/entity-agnostic (root CLAUDE.md rule 10): every value is
 * FIELD-KEY INDIRECTED off `record` — no "trip"/"tanker" vocabulary lives
 * here, only in the blueprint config + seed data that instantiate it.
 *
 * See `TripsOverview.types.ts` for the documented START/END callout and
 * Timeline-scrub simplifications.
 */
export function TripsOverview({
  record,
  kpiField,
  itemsField,
  pinsField,
  layers,
  strings,
  mapAriaLabel = 'Trip route map',
  className,
}: TripsOverviewProps) {
  const s = {
    dateLabel: 'Date',
    groupOnMapLabel: 'Group Trips on Map',
    timelineLabel: 'Timeline',
    totalTimeLabel: 'Total Time',
    totalDistanceLabel: 'Total Distance',
    startLabel: 'START',
    endLabel: 'END',
    playLabel: 'Play',
    pauseLabel: 'Pause',
    ...strings,
  }

  const kpis = readRows(record, kpiField) as unknown as {
    label: string
    value: string
    unit?: string
    icon?: string
  }[]
  const trips = readRows(record, itemsField) as unknown as TripsOverviewTripRow[]
  const extraPins = ((pinsField ? record?.[pinsField] : undefined) as LocationMapPin[] | undefined) ?? []

  const [selectedId, setSelectedId] = useState<string | undefined>(trips[0]?.id)
  const [groupOnMap, setGroupOnMap] = useState(false)
  const [activeLayers, setActiveLayers] = useState<Set<string>>(
    () => new Set((layers ?? []).map((l) => l.key)),
  )
  const [speed, setSpeed] = useState<1 | 2>(1)
  const [playing, setPlaying] = useState(false)
  const [scrub, setScrub] = useState(0)

  const selectedTrip = trips.find((t) => t.id === selectedId) ?? trips[0]

  const groups = useMemo(() => {
    const byDay = new Map<string, { dayLabel: string; rows: TripsOverviewTripRow[] }>()
    for (const trip of trips) {
      const entry = byDay.get(trip.dayKey) ?? { dayLabel: trip.dayLabel, rows: [] }
      entry.rows.push(trip)
      byDay.set(trip.dayKey, entry)
    }
    return Array.from(byDay.values())
  }, [trips])

  const filteredPins = extraPins.filter((p) => !p.category || activeLayers.has(p.category))

  const markers: MapMarkerDatum[] = groupOnMap
    ? trips.flatMap((t) => [
        { id: `${t.id}-start`, position: t.originPosition, color: 'var(--color-success)' },
        { id: `${t.id}-end`, position: t.destinationPosition, color: 'var(--color-error-500)' },
      ])
    : selectedTrip
      ? [
          { id: `${selectedTrip.id}-start`, position: selectedTrip.originPosition, color: 'var(--color-success)' },
          { id: `${selectedTrip.id}-end`, position: selectedTrip.destinationPosition, color: 'var(--color-error-500)' },
        ]
      : []
  markers.push(...filteredPins.map((p) => ({ id: p.id, position: p.position, color: p.color, label: p.label })))

  const paths: MapPathDatum[] = groupOnMap
    ? trips
        .filter((t) => t.route?.length > 1)
        .map((t) => ({ id: `route-${t.id}`, points: t.route, color: 'var(--color-primary)', widthPx: 4 }))
    : selectedTrip && selectedTrip.route?.length > 1
      ? [{ id: `route-${selectedTrip.id}`, points: selectedTrip.route, color: 'var(--color-primary)', widthPx: 4 }]
      : []

  const scrubMax = Math.max(0, (selectedTrip?.route?.length ?? 1) - 1)

  // The map has no natural single center (a trip's route spans two distant
  // points), so the camera must FIT the current marker set rather than sit at
  // `MapPanel`'s default view — `RecordMapSlot`/`MapPanel` only re-fit on a
  // bumped `fitToMarkersNonce`, never automatically, so this bumps one every
  // time the visible marker set actually changes (selection, group-on-map,
  // layer toggles).
  const [fitNonce, setFitNonce] = useState(1)
  useEffect(() => {
    setFitNonce((n) => n + 1)
  }, [selectedTrip?.id, groupOnMap, filteredPins.length])

  return (
    <div data-slot="trips-overview" className={cn('flex flex-col gap-section', className)}>
      <div className="flex flex-wrap items-center justify-between gap-inline">
        <div className="grid flex-1 grid-cols-1 gap-inline sm:grid-cols-3">
          {kpis.map((tile, index) => (
            <KpiTile
              key={index}
              layout="stat"
              label={tile.label}
              value={tile.value}
              unit={tile.unit}
              icon={resolveOptionalIcon(tile.icon)}
            />
          ))}
        </div>
        <Input
          type="date"
          aria-label={s.dateLabel}
          className="h-9 w-auto shrink-0"
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </div>

      <div className="grid grid-cols-1 gap-section lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div data-slot="trips-list" className="flex min-h-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            {/* A raw `<label><input type="checkbox">` reads as a multi-select
                affordance; "Group Trips on Map" is a single on/off DISPLAY
                MODE for the route map (grouped vs. individual pins) — the
                same semantic distinction that makes every other single-state
                toggle in this system (`Switch`, built on Radix `Switch`) the
                right control here rather than a checkbox (P2 a11y backlog,
                round1-summary.md §P2). */}
            <label htmlFor="trips-group-on-map" className="flex items-center gap-2 text-body-sm text-foreground">
              {s.groupOnMapLabel}
            </label>
            <Switch id="trips-group-on-map" checked={groupOnMap} onCheckedChange={setGroupOnMap} />
          </div>
          <div className="fams-scroll-region flex max-h-[32rem] flex-col gap-4 overflow-y-auto pe-1">
            {groups.map((group) => (
              <div key={group.dayLabel} className="flex flex-col gap-2">
                <p className="text-body-sm font-semibold text-foreground">{group.dayLabel}</p>
                {group.rows.map((trip) => {
                  const active = trip.id === selectedTrip?.id
                  return (
                    <button
                      key={trip.id}
                      type="button"
                      onClick={() => setSelectedId(trip.id)}
                      data-slot="trip-row"
                      data-active={active}
                      className={cn(
                        'flex flex-col gap-2 rounded-sm border border-border bg-card p-3 text-start outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                        active && 'border-s-4 border-s-primary',
                      )}
                    >
                      <div className="flex items-center justify-between text-caption text-muted-foreground">
                        <span />
                        <span className="font-medium text-foreground">{trip.tripNumber}</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="size-2 shrink-0 rounded-full bg-success-scale-500" />
                          <span className="truncate text-body-sm font-medium text-foreground">
                            {trip.originLabel}
                          </span>
                          <span className="ms-auto shrink-0 text-caption text-muted-foreground">
                            {trip.originTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="size-2 shrink-0 rounded-full bg-error-500" />
                          <span className="truncate text-body-sm font-medium text-foreground">
                            {trip.destinationLabel}
                          </span>
                          <span className="ms-auto shrink-0 text-caption text-muted-foreground">
                            {trip.destinationTime}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-caption text-muted-foreground">
                        <span>Events: {trip.eventsCount}</span>
                        <span>Distance: {trip.distance}</span>
                        <span>Duration: {trip.duration}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div data-slot="trips-map" className="relative min-h-[28rem] overflow-hidden rounded-md border border-border">
          {layers?.length ? (
            <div className="absolute start-4 top-4 z-10 flex flex-wrap gap-2">
              {layers.map((layer) => (
                <label
                  key={layer.key}
                  className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2 py-1 text-caption text-foreground shadow-sm"
                >
                  <input
                    type="checkbox"
                    checked={activeLayers.has(layer.key)}
                    onChange={(e) =>
                      setActiveLayers((prev) => {
                        const next = new Set(prev)
                        if (e.target.checked) next.add(layer.key)
                        else next.delete(layer.key)
                        return next
                      })
                    }
                    className="size-3.5 accent-[var(--color-primary)]"
                  />
                  {layer.color ? (
                    <span className="size-2 rounded-full" style={{ background: layer.color }} />
                  ) : null}
                  {layer.label}
                </label>
              ))}
            </div>
          ) : null}

          <RecordMapSlot
            markers={markers}
            zones={[]}
            paths={paths}
            fitToMarkersNonce={fitNonce}
            aria-label={mapAriaLabel}
          />

          {selectedTrip ? (
            <>
              <div className="absolute end-4 top-4 z-10 max-w-[16rem] rounded-sm border border-border bg-card px-3 py-2 shadow-md">
                <p className="text-body-sm font-semibold text-foreground">({s.endLabel})</p>
                <p className="text-caption text-muted-foreground">{selectedTrip.destinationTime}</p>
                <p className="truncate text-caption text-muted-foreground">{selectedTrip.destinationLabel}</p>
              </div>
              <div className="absolute start-4 bottom-24 z-10 max-w-[16rem] rounded-sm border border-border bg-card px-3 py-2 shadow-md">
                <p className="text-body-sm font-semibold text-foreground">({s.startLabel})</p>
                <p className="text-caption text-muted-foreground">{selectedTrip.originTime}</p>
                <p className="truncate text-caption text-muted-foreground">{selectedTrip.originLabel}</p>
              </div>
            </>
          ) : null}

          <div
            data-slot="trips-timeline-scrub"
            className="absolute bottom-4 start-4 z-10 flex w-[calc(100%-2rem)] max-w-lg flex-col gap-2 rounded-md border border-border bg-card p-3 shadow-md"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={playing ? s.pauseLabel : s.playLabel}
                onClick={() => setPlaying((p) => !p)}
                className="grid size-8 shrink-0 place-items-center rounded-sm border border-border text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
              </button>
              <div className="flex items-center gap-1">
                {([1, 2] as const).map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setSpeed(sp)}
                    aria-pressed={speed === sp}
                    className={cn(
                      'rounded-full border border-border px-2 py-0.5 text-caption font-medium',
                      speed === sp ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
              <span className="text-caption font-medium text-foreground">{s.timelineLabel}</span>
              <span className="ms-auto shrink-0 text-end text-caption text-muted-foreground">
                {selectedTrip?.duration} / {s.totalTimeLabel}
              </span>
            </div>
            <Input
              type="range"
              aria-label={s.timelineLabel}
              min={0}
              max={scrubMax}
              value={Math.min(scrub, scrubMax)}
              onChange={(e) => setScrub(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted p-0 accent-[var(--color-primary)]"
            />
            <p className="text-caption text-muted-foreground">
              {s.totalDistanceLabel}: {selectedTrip?.distance}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

TripsOverview.displayName = 'TripsOverview'
