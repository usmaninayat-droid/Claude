import {
  forwardRef,
  useId,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { CalendarDays, Clock, Route, Waypoints, X } from '../../icons'
import { cn } from '../../lib/cn'
import { Checkbox } from '../../primitives/Checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '../../primitives/Popover'

/**
 * VehicleTripsPanel — the vehicle popup's "Trips" tab body (live-monitoring
 * Figma 495:8937).
 *
 * Anatomy, top to bottom:
 * - **Date chip strip** — recent day chips, an OUTLINED `Today` chip (blue
 *   border + blue label, never solid), and one SOLID `#0072D6` calendar chip
 *   carrying the picked date with a calendar glyph and a WHITE ✕ clear
 *   (round-1 visual #15 found these two inverted).
 * - **Summary line** — `route` Distance · `waypoints` Trips · `clock`
 *   Duration, values in primary (#44: the Trips glyph is the ROUTE mark, not
 *   a map-pin).
 * - **`Show latest trip (up till)`** — checked by DEFAULT (#44).
 * - **Trip rows** — each a bordered box: `15:30` + a green ring dot + origin,
 *   a DOTTED connector down to `11:21` + a terminus dot + the greyed end
 *   location, an icon+metric line between them, and a per-row checkbox at the
 *   end (#16 / interaction 16b).
 *
 * ### Selection actually changes the body (interaction 16a)
 * Round 1 found the chips were real buttons that changed nothing. Two fixes,
 * both generic:
 * 1. Selection is **controlled OR uncontrolled** — omit `selectedDateId` and
 *    the panel keeps its own, so a bare `<VehicleTripsPanel>` still selects.
 * 2. A chip may carry **its own `trips` + `summary`**, so picking a day swaps
 *    the body with no caller state at all. The panel-level `trips` / `summary`
 *    remain the fallback for callers that fetch per selection.
 *
 * The calendar chip opens a date picker when the caller passes one
 * (`datePicker`, rendered in a popover) and/or calls `onOpenDatePicker`
 * (interaction 16d). The design system ships no calendar of its own here so
 * the host owns locale, range rules and fetch.
 */

export interface VehicleTripSummary {
  distance: string
  trips: number
  duration: string
}

export interface VehicleTripDateChip {
  id: string
  label: string
  /** Renders the OUTLINED "Today" treatment (blue border + blue label). */
  today?: boolean
  /**
   * Marks the SOLID calendar chip that carries the picked date — the Figma's
   * `15 Oct 2024`: primary fill, calendar glyph, white ✕ clear, and the chip
   * that opens the date picker. At most one chip should set it.
   */
  calendar?: boolean
  /** Trip rows for this day; falls back to the panel's `trips` (16a). */
  trips?: VehicleTripRow[]
  /** Summary for this day; falls back to the panel's `summary` (16a). */
  summary?: VehicleTripSummary
}

export interface VehicleTripRow {
  id: string
  startTime: string
  endTime: string
  origin: string
  /** End location, rendered greyed under the connector (Figma 495:8937). */
  destination?: string
  events: number
  distance: string
  duration: string
  /**
   * Row variant (2026-08-31 workforce Shifts tab). `'trip'` (default) is the
   * vehicle A→B row: origin/destination plus Events · Distance · Duration.
   * `'stay'` is the STATIC-workforce shift row — one location where the
   * member clocked in (`startTime`) and out (`endTime`), with `duration`
   * read as the total time spent there; Events/Distance are not rendered
   * and `destination` is ignored (echoing the location would assert a move).
   */
  kind?: 'trip' | 'stay'
}

export interface VehicleTripsPanelProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue'> {
  dates: VehicleTripDateChip[]
  /**
   * Controlled selection. Omit the PROP for the panel's own (uncontrolled)
   * state; passing it as `undefined` is the legal "no day selected" state
   * (the calendar chip's ✕ clears to exactly that, interaction 16d).
   */
  selectedDateId?: string
  /** Initial selection while uncontrolled. Defaults to the calendar chip, then
   *  the `today` chip, then the first chip. */
  defaultSelectedDateId?: string
  onDateChange?: (id: string) => void
  /** Clears the calendar chip's picked date (its white ✕). */
  onClearDate?: () => void
  /** Date-picker body shown in a popover when the calendar chip is clicked. */
  datePicker?: ReactNode
  /** Called when the calendar chip is activated (open your own picker). */
  onOpenDatePicker?: () => void
  /** Fallback summary — a selected chip's own `summary` wins. */
  summary?: VehicleTripSummary
  /** Controlled `Show latest trip (up till)`. Uncontrolled default: CHECKED. */
  showLatest?: boolean
  defaultShowLatest?: boolean
  onShowLatestChange?: (checked: boolean) => void
  /** Fallback trip rows — a selected chip's own `trips` wins. */
  trips: VehicleTripRow[]
  /** Controlled per-row trip selection (interaction 16b). */
  selectedTripIds?: string[]
  defaultSelectedTripIds?: string[]
  onTripSelectionChange?: (ids: string[]) => void
  emptyLabel?: string
  /**
   * The summary line's count word (2026-08-31 workforce Shifts tab reuses
   * this panel as the Trips analogue). @default 'Trips'
   */
  summaryCountLabel?: string
  /** The show-latest checkbox's label. @default 'Show latest trip (up till)' */
  showLatestLabel?: string
}

/** Chip geometry — Figma 495:8937 chips are 24px tall on a 6px radius. */
const CHIP =
  'inline-flex h-6 items-center gap-1 rounded-md border text-caption font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring'

export const VehicleTripsPanel = forwardRef<HTMLDivElement, VehicleTripsPanelProps>(
  (allProps, ref) => {
    const {
      dates,
      selectedDateId,
      defaultSelectedDateId,
      onDateChange,
      onClearDate,
      datePicker,
      onOpenDatePicker,
      summary,
      showLatest,
      defaultShowLatest = true,
      onShowLatestChange,
      trips,
      selectedTripIds,
      defaultSelectedTripIds,
      onTripSelectionChange,
      emptyLabel = 'No trips for this day',
      summaryCountLabel = 'Trips',
      showLatestLabel = 'Show latest trip (up till)',
      className,
      ...props
    } = allProps
    const showLatestId = useId()

    /**
     * Controlled-ness is decided by whether the caller PASSES the prop, not by
     * whether its value is defined: `selectedDateId={undefined}` is the legal
     * "no day selected" state a controlled caller reaches through the chip's
     * ✕ (interaction 16d). Reading `?? ownDateId` instead silently re-selected
     * the panel's own default and made clearing impossible.
     */
    const dateControlled = 'selectedDateId' in allProps

    /* ── Date selection: controlled OR uncontrolled (interaction 16a) ─────── */
    const fallbackDateId =
      defaultSelectedDateId ??
      dates.find((d) => d.calendar)?.id ??
      dates.find((d) => d.today)?.id ??
      dates[0]?.id
    const [ownDateId, setOwnDateId] = useState<string | undefined>(fallbackDateId)
    const activeDateId = dateControlled ? selectedDateId : ownDateId
    const selectDate = (id: string) => {
      if (!dateControlled) setOwnDateId(id)
      onDateChange?.(id)
    }

    /* ── `Show latest trip` — CHECKED by default (visual #44) ─────────────── */
    const [ownShowLatest, setOwnShowLatest] = useState(defaultShowLatest)
    const latestChecked = showLatest ?? ownShowLatest
    const setLatest = (checked: boolean) => {
      if (showLatest === undefined) setOwnShowLatest(checked)
      onShowLatestChange?.(checked)
    }

    /* ── Per-row trip selection (interaction 16b) ─────────────────────────── */
    const [ownTripIds, setOwnTripIds] = useState<string[]>(defaultSelectedTripIds ?? [])
    const activeTripIds = selectedTripIds ?? ownTripIds
    const toggleTrip = (id: string, checked: boolean) => {
      const next = checked
        ? [...activeTripIds.filter((t) => t !== id), id]
        : activeTripIds.filter((t) => t !== id)
      if (selectedTripIds === undefined) setOwnTripIds(next)
      onTripSelectionChange?.(next)
    }

    /* The selected day's OWN data wins, so a chip click changes the body even
       when the caller keeps no state at all (round-1 interaction 16a FAIL). */
    const activeDate = dates.find((d) => d.id === activeDateId)
    const activeTrips = activeDate?.trips ?? trips
    const activeSummary = activeDate?.summary ?? summary

    return (
      <div
        ref={ref}
        data-slot="vehicle-trips-panel"
        className={cn('flex flex-col gap-3', className)}
        {...props}
      >
        {/* Date chip strip. The calendar chip's ✕ is a SIBLING button inside a
            shared pill wrapper — never a focusable element nested in the chip
            button (axe nested-interactive). */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Trip date">
          {dates.map((date) => {
            const selected = date.id === activeDateId

            if (date.calendar) {
              const chipButton = (
                <button
                  type="button"
                  aria-pressed={selected}
                  data-slot="trip-date-calendar-chip"
                  onClick={() => {
                    selectDate(date.id)
                    onOpenDatePicker?.()
                  }}
                  className="inline-flex items-center gap-1 ps-2 pe-1 text-caption font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CalendarDays className="size-3" aria-hidden="true" />
                  {date.label}
                </button>
              )
              return (
                <span
                  key={date.id}
                  className={cn(
                    'inline-flex h-6 items-stretch overflow-hidden rounded-md border',
                    'border-primary bg-primary text-primary-foreground',
                  )}
                >
                  {datePicker ? (
                    <Popover>
                      <PopoverTrigger asChild>{chipButton}</PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        {datePicker}
                      </PopoverContent>
                    </Popover>
                  ) : (
                    chipButton
                  )}
                  {onClearDate ? (
                    <button
                      type="button"
                      aria-label="Clear selected date"
                      onClick={onClearDate}
                      className="grid place-items-center pe-1.5 ps-0.5 text-primary-foreground outline-none transition-colors hover:bg-primary-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="size-2.5" aria-hidden="true" />
                    </button>
                  ) : null}
                </span>
              )
            }

            return (
              <button
                key={date.id}
                type="button"
                aria-pressed={selected}
                onClick={() => selectDate(date.id)}
                className={cn(
                  CHIP,
                  'px-2',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : date.today
                      ? // Figma: OUTLINED, blue label — never a solid fill (#15).
                        'border-primary bg-card text-primary hover:bg-primary/10'
                      : 'border-border bg-card text-gray-400 hover:text-foreground',
                )}
              >
                {date.label}
              </button>
            )
          })}
        </div>

        {/* Summary line — `Trips:` carries the ROUTE glyph (visual #44). */}
        {activeSummary ? (
          <div
            data-slot="vehicle-trips-summary"
            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-gray-400"
          >
            <span className="inline-flex items-center gap-1">
              <Waypoints className="size-3.5" aria-hidden="true" />
              Distance: <span className="font-semibold text-primary">{activeSummary.distance}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Route className="size-3.5" aria-hidden="true" />
              {summaryCountLabel}: <span className="font-semibold text-primary">{activeSummary.trips}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden="true" />
              Duration: <span className="font-semibold text-primary">{activeSummary.duration}</span>
            </span>
          </div>
        ) : null}

        {/* Show-latest checkbox — CHECKED by default (visual #44). */}
        <label
          htmlFor={showLatestId}
          className="flex w-fit items-center gap-2 text-caption font-semibold text-foreground"
        >
          <Checkbox
            id={showLatestId}
            checked={latestChecked}
            onCheckedChange={(c) => setLatest(c === true)}
          />
          {showLatestLabel}
        </label>

        {/* Trip rows */}
        {activeTrips.length === 0 ? (
          <div className="py-4 text-center text-caption text-gray-400">{emptyLabel}</div>
        ) : (
          <ul className="flex max-h-40 flex-col gap-2 overflow-y-auto">
            {activeTrips.map((trip) => (
              <TripRow
                key={trip.id}
                trip={trip}
                checked={activeTripIds.includes(trip.id)}
                onCheckedChange={(c) => toggleTrip(trip.id, c)}
              />
            ))}
          </ul>
        )}
      </div>
    )
  },
)

VehicleTripsPanel.displayName = 'VehicleTripsPanel'

/**
 * One bordered trip box (Figma 495:8937 row anatomy, round-1 visual #16).
 *
 * A four-column grid — time · status rail · content · checkbox — over three
 * rows, so the dotted connector lines up under the origin dot and the end
 * time lines up with the terminus dot without a single magic offset.
 */
function TripRow({
  trip,
  checked,
  onCheckedChange,
}: {
  trip: VehicleTripRow
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <li
      data-slot="vehicle-trip-row"
      className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-x-2 rounded-md border border-border p-2.5"
    >
      {/* Row 1 — start time · origin ring dot · origin. */}
      <span className="text-caption font-semibold text-foreground">{trip.startTime}</span>
      <span
        aria-hidden="true"
        className="size-2.5 justify-self-center rounded-full border-2 border-success bg-card"
      />
      <span className="truncate text-caption font-semibold text-foreground">{trip.origin}</span>
      {/* Checkbox spans the whole box, pinned to the top-end corner. */}
      <span className="row-span-3 self-start">
        <Checkbox
          checked={checked}
          onCheckedChange={(c) => onCheckedChange(c === true)}
          aria-label={`Select trip ${trip.startTime} to ${trip.endTime}`}
        />
      </span>

      {/* Row 2 — dotted connector · icon+metric line. A `'stay'` row (static
          workforce shift) has no journey, so Events/Distance drop and the
          duration reads as the total time spent at the location. */}
      <span />
      <span
        aria-hidden="true"
        className="h-5 w-0 justify-self-center border-s-2 border-dotted border-gray-300"
      />
      <span className="flex flex-wrap items-center gap-x-3 py-1 text-caption text-gray-400">
        {trip.kind === 'stay' ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden="true" />
            Total Time: <span className="font-semibold text-foreground">{trip.duration}</span>
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-1">
              <Waypoints className="size-3" aria-hidden="true" />
              Events: <span className="font-semibold text-destructive-emphasis">{trip.events}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Route className="size-3" aria-hidden="true" />
              Distance: <span className="font-semibold text-foreground">{trip.distance}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" aria-hidden="true" />
              Duration: <span className="font-semibold text-foreground">{trip.duration}</span>
            </span>
          </>
        )}
      </span>

      {/* Row 3 — end time · terminus dot · greyed end location. */}
      <span className="text-caption font-semibold text-foreground">{trip.endTime}</span>
      <span
        aria-hidden="true"
        className="size-2.5 justify-self-center rounded-full border-2 border-destructive bg-card"
      />
      {/* End location, greyed. Rendered only when the caller HAS one — echoing
          the origin would assert the trip ended where it began. */}
      <span className="truncate text-caption text-gray-400">{trip.destination ?? ''}</span>
    </li>
  )
}
