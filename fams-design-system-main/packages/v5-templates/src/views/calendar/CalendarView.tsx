import { useMemo, useState, type ReactNode } from 'react'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { cn } from '../../lib/cn'
import { RecordCountRow } from '../RecordCountRow'
import { CalendarLegend } from './CalendarLegend'
import { CalendarMonthGrid } from './CalendarMonthGrid'
import { CalendarPeriodNav } from './CalendarPeriodNav'
import { CalendarWeekGrid } from './CalendarWeekGrid'
import { CalendarEmptyState, CalendarFilterHint, CalendarGridSkeleton } from './CalendarStates'
import { useCalendarMetrics } from './use-calendar-metrics'
import { periodLabel, periodLabelShort } from './calendar-format'
import {
  dateFieldsFromConfig,
  dateFromKey,
  dayKeyOf,
  eventsInPeriod,
  filterByStatus,
  monthGrid,
  statusTotals,
  stepPeriod,
  toCalendarEvents,
  weekGrid,
  type CalendarDateField,
  type CalendarEvent,
  type CalendarMode,
} from './calendar-model'

export interface CalendarViewProps {
  /** Module config — statuses from `uiConfig.statusList`, date fields from `systemcolumns`. */
  config: EntityConfig
  /** Records to lay out. Already search/filter-narrowed by the caller. */
  records: EntityRecord[]
  /**
   * `View By` options. Defaults to `dateFieldsFromConfig` — every `Date`/
   * `DateTime` systemcolumn plus the `createdAt`/`updatedAt` stamps the records
   * actually carry. Pass this to restrict or re-label them.
   */
  dateFields?: CalendarDateField[]
  /** Controlled active date column; omit for uncontrolled (first option wins). */
  dateField?: string
  onDateFieldChange?: (col: string) => void
  /** Controlled grid shape; omit for uncontrolled (`monthly`). */
  mode?: CalendarMode
  onModeChange?: (mode: CalendarMode) => void
  /**
   * Controlled period anchor as a `YYYY-MM-DD` key — ANY day inside the visible
   * period. Omit for uncontrolled (anchored on `today`). Preserved across a
   * Monthly↔Weekly switch (SPEC row 27).
   */
  anchorDate?: string
  onAnchorDateChange?: (dayKey: string) => void
  /** Injectable "now" for test/SSR determinism. Defaults to `new Date()`. */
  today?: Date
  /** Controlled legend selection (status keys). Omit for uncontrolled (all on). */
  visibleStatuses?: string[]
  onVisibleStatusesChange?: (keys: string[]) => void
  /** 0 = Sunday, 1 = Monday (the design's MON→SUN grid). Default 1. */
  weekStartsOn?: 0 | 1
  /** Chip click — opens the record. */
  onOpenRecord?: (record: EntityRecord) => void
  /**
   * Empty-day-cell activation (click, or Enter/Space on the focused cell) —
   * starts a create pre-filled with that `YYYY-MM-DD`. The second argument is
   * the date COLUMN the grid is currently laid out by (the `View By` choice), so
   * the caller can prefill the field the user was actually looking at without
   * having to guess which one that is. Omit and no create affordance is
   * rendered at all, rather than a dead cell.
   */
  onCreateAtDate?: (dayKey: string, dateCol: string) => void
  /** Toolbar `Create New` equivalent, offered inside the no-data empty state. */
  onCreateRecord?: () => void
  /** Resets the caller's search + filters; also re-checks every legend status. */
  onClearFilters?: () => void
  /** True when the caller's own search/filters are narrowing `records`. */
  filtered?: boolean
  /** Dimension-matched skeleton instead of the grid (UX J.59). */
  loading?: boolean
  /** Load failure — renders the error state with `Retry` (UX J.57c). */
  error?: ReactNode
  onRetry?: () => void
  /** Overrides the derived per-cell chip cap. Escape hatch for tests/consumers. */
  chipCap?: number
  className?: string
}

/**
 * CalendarView — the generic, config-driven calendar lens. [tier-2 pattern]
 *
 * Monthly (SPEC §1.4) and Weekly (§1.5) in one component, driven entirely by the
 * module `config` + `records`: which column supplies the date comes from the
 * `View By` menu over the config's date-typed fields, the title is the record's
 * own `title`, and the chip's leading status colour is `statusList[].color`.
 * Nothing here names a domain — the same component renders any module's records
 * (the two-blueprint parity check, UX L.78).
 *
 * Sub-toolbar: the `Monthly | Weekly` switcher, `‹`/`›` stepping one month or
 * one week, the period label, the `View By` menu and the status legend — the
 * legend being a real filter whose parenthesised numbers are per-status TOTALS
 * that do not move when a sibling is unchecked (Dev Note 32273). Unchecking
 * EVERY status is allowed and leaves the grid standing with the filtered-to-zero
 * hint above it, per UX E.28's explicit strike of SPEC row 29's invented floor
 * and J.59's "the grid IS the content" rule.
 *
 * Every piece of view state is controlled-optional in the same shape the sibling
 * view templates use, and the template never fetches or mutates (rule 8): it
 * reports `onOpenRecord` / `onCreateAtDate` and the app owns the surface.
 */
export function CalendarView({
  config,
  records,
  dateFields,
  dateField,
  onDateFieldChange,
  mode,
  onModeChange,
  anchorDate,
  onAnchorDateChange,
  today,
  visibleStatuses,
  onVisibleStatusesChange,
  weekStartsOn = 1,
  onOpenRecord,
  onCreateAtDate,
  onCreateRecord,
  onClearFilters,
  filtered,
  loading,
  error,
  onRetry,
  chipCap,
  className,
}: CalendarViewProps) {
  const metrics = useCalendarMetrics()
  const now = useMemo(() => today ?? new Date(), [today])
  const statuses = config.uiConfig.statusList

  const fields = useMemo(
    () => dateFields ?? dateFieldsFromConfig(config, records),
    [dateFields, config, records],
  )
  const [fieldState, setFieldState] = useState<string | null>(null)
  const activeField = dateField ?? fieldState ?? fields[0]?.col ?? ''
  const setField = (col: string) => {
    setFieldState(col)
    onDateFieldChange?.(col)
  }

  const [modeState, setModeState] = useState<CalendarMode>('monthly')
  const activeMode = mode ?? modeState
  const setMode = (next: CalendarMode) => {
    setModeState(next)
    onModeChange?.(next)
  }

  const [anchorState, setAnchorState] = useState<string | null>(null)
  const anchorKey = anchorDate ?? anchorState ?? dayKeyOf(now)
  const anchor = useMemo(() => dateFromKey(anchorKey), [anchorKey])
  const step = (delta: -1 | 1) => {
    const next = dayKeyOf(stepPeriod(anchor, activeMode, delta))
    setAnchorState(next)
    onAnchorDateChange?.(next)
  }

  const allKeys = useMemo(() => statuses.map((s) => s.key), [statuses])
  const [statusState, setStatusState] = useState<string[] | null>(null)
  const activeStatuses = visibleStatuses ?? statusState ?? allKeys
  const toggleStatus = (key: string, checked: boolean) => {
    const next = checked ? [...activeStatuses, key] : activeStatuses.filter((k) => k !== key)
    setStatusState(next)
    onVisibleStatusesChange?.(next)
  }
  const clearFilters = () => {
    setStatusState(allKeys)
    onVisibleStatusesChange?.(allKeys)
    onClearFilters?.()
  }

  const events = useMemo(() => toCalendarEvents(config, records, activeField), [config, records, activeField])
  // Totals come from the PERIOD's population BEFORE legend filtering (Dev Note
  // 32273): search / filters / the visible period move them, unchecking a
  // sibling status does not.
  const periodEvents = useMemo(
    () => eventsInPeriod(events, anchor, activeMode, weekStartsOn),
    [events, anchor, activeMode, weekStartsOn],
  )
  const totals = useMemo(() => statusTotals(periodEvents), [periodEvents])
  const shown = useMemo(() => filterByStatus(periodEvents, activeStatuses), [periodEvents, activeStatuses])

  const weeks = useMemo(
    () => (activeMode === 'monthly' ? monthGrid(anchor, shown, now, weekStartsOn) : []),
    [activeMode, anchor, shown, now, weekStartsOn],
  )
  const days = useMemo(
    () => (activeMode === 'weekly' ? weekGrid(anchor, shown, now, weekStartsOn) : []),
    [activeMode, anchor, shown, now, weekStartsOn],
  )

  const openRecord = onOpenRecord
    ? (event: CalendarEvent) => onOpenRecord(event.record)
    : undefined
  // The grid reports only WHICH DAY; which column that day belongs to is this
  // view's own `View By` state, so it is bound here rather than plumbed down.
  const createAtDate = onCreateAtDate ? (dayKey: string) => onCreateAtDate(dayKey, activeField) : undefined
  const label = metrics.shortPeriodLabel
    ? periodLabelShort(anchor, activeMode, weekStartsOn)
    : periodLabel(anchor, activeMode, weekStartsOn)

  const narrowed = Boolean(filtered) || activeStatuses.length < allKeys.length
  const cause = error != null ? 'error' : narrowed ? 'filtered' : 'no-data'
  const emptyState = (
    <CalendarEmptyState
      cause={cause}
      error={error}
      onRetry={onRetry}
      onClearFilters={clearFilters}
      onCreateRecord={onCreateRecord}
    />
  )
  // A load failure, or a module with genuinely nothing in it, replaces the grid.
  // Anything else keeps the grid standing (UX J.59/J.60).
  const replaceGrid = error != null || (records.length === 0 && !narrowed)

  return (
    <section
      data-slot="calendar-view"
      className={cn('flex h-full min-h-0 min-w-0 flex-col gap-3', className)}
    >
      <h2 className="sr-only">Calendar</h2>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <CalendarPeriodNav
          mode={activeMode}
          onModeChange={setMode}
          label={label}
          onStep={step}
          dateFields={fields}
          dateField={activeField}
          onDateFieldChange={setField}
        />
        <CalendarLegend
          statuses={statuses}
          visible={activeStatuses}
          onToggle={toggleStatus}
          totals={totals}
          hideCounts={metrics.hideLegendCounts}
          collapsed={metrics.collapseLegend}
        />
      </div>

      {/* The single count row per lens (UX E.30) — the SHARED implementation,
          with this lens's own "all statuses hidden" truth passed through it
          rather than a second paragraph of its own. */}
      <RecordCountRow
        slot="calendar-count-row"
        shown={shown.length}
        total={periodEvents.length}
        noun={{ one: 'record', many: 'records' }}
      >
        {activeStatuses.length === 0
          ? `0 of ${periodEvents.length} records — all statuses hidden`
          : undefined}
      </RecordCountRow>

      {shown.length === 0 && !replaceGrid && narrowed ? (
        <CalendarFilterHint onClear={clearFilters} />
      ) : null}

      {loading ? (
        <CalendarGridSkeleton />
      ) : replaceGrid ? (
        emptyState
      ) : activeMode === 'monthly' ? (
        <CalendarMonthGrid
          weeks={weeks}
          chipCap={chipCap ?? metrics.chipCap}
          density={metrics.density}
          weekStartsOn={weekStartsOn}
          onOpenRecord={openRecord}
          onCreateAtDate={createAtDate}
          onStepPeriod={step}
        />
      ) : (
        <CalendarWeekGrid
          days={days}
          onOpenRecord={openRecord}
          onCreateAtDate={createAtDate}
          onStepPeriod={step}
          // UX J.60: an empty WEEK shows exactly one message; an empty COLUMN
          // shows none. The hint above already covers the filtered cause, so
          // this is the no-data/empty-period copy.
          emptyState={narrowed ? undefined : emptyState}
        />
      )}
    </section>
  )
}

CalendarView.displayName = 'CalendarView'
