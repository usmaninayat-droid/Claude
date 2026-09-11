import type { EntityRecord } from '@fams/v5-composer'

/**
 * The `TripsOverview` CONFIG CONTRACT. [tier-2]
 *
 * A tanker-detail "Trips" tab: 3 `KpiTile` chips + an end-aligned date picker,
 * a grouped/scrollable trip list, and a route-map end pane with layer
 * checkboxes + a Timeline scrub card. Same FIELD-KEY INDIRECTION discipline as
 * `OverviewWidgets`/`InteractiveReplay` — no "trip"/"tanker" vocabulary is
 * hardcoded, every value is read off `record[someField]` so a later
 * Weather Stations (or any other entity) detail sheet can reuse this
 * component with its own field names and vocabulary.
 *
 * Documented simplifications:
 *  - START/END floating callout cards anchor at two fixed corners of the map
 *    pane (end-ish for END, start-ish for START) rather than literal
 *    pixel-precise pin-position projection — consistent with
 *    `InteractiveReplay`'s own documented simplifications; a live MapLibre
 *    coordinate→pixel projection is a heavier lift this composite does not
 *    attempt.
 *  - The Timeline scrub card's day ticks are evenly spaced across the
 *    selected trip's own start/end (not a literal multi-day calendar axis),
 *    since a single trip's route is what's being scrubbed.
 */

/** One row in the trip list — a single trip. */
export interface TripsOverviewTripRow {
  id: string
  /** Calendar day this trip belongs to, e.g. `"2025-01-01"` — rows are grouped by this key. */
  dayKey: string
  /** Pre-formatted day heading, e.g. `"Today"`, `"01 Jan, 2025"`. */
  dayLabel: string
  originLabel: string
  originTime: string
  destinationLabel: string
  destinationTime: string
  eventsCount: string
  distance: string
  duration: string
  /** e.g. `"Trip#15"`. */
  tripNumber: string
  /** `[lng, lat]` route polyline for this trip; drawn on the map when this row is selected. */
  route: [number, number][]
  originPosition: [number, number]
  destinationPosition: [number, number]
}

/** One layer checkbox above the map (Critical Events / Normal Events / Checkpoints). All start checked. */
export interface TripsOverviewLayer {
  key: string
  label: string
  color?: string
}

export interface TripsOverviewStrings {
  dateLabel: string
  groupOnMapLabel: string
  timelineLabel: string
  totalTimeLabel: string
  totalDistanceLabel: string
  startLabel: string
  endLabel: string
  playLabel: string
  pauseLabel: string
}

export interface TripsOverviewProps {
  record: EntityRecord | undefined
  /** `record[kpiField]` — `{label,value,unit?,icon?}[]`, exactly 3 tiles (Total Trips / Total Time / Total Distance). */
  kpiField: string
  /** `record[itemsField]` — `TripsOverviewTripRow[]`. */
  itemsField: string
  /** `record[pinsField]` — additional `LocationMapPin[]` overlaid on the map (checkpoints, critical/normal events) alongside the selected trip's own route. */
  pinsField?: string
  /** Layer checkboxes rendered top-start over the map. Omit for none. */
  layers?: TripsOverviewLayer[]
  strings?: Partial<TripsOverviewStrings>
  mapAriaLabel?: string
  className?: string
}
