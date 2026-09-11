import { forwardRef, useId, useState } from 'react'
import { CalendarDays, ChevronDown } from '../icons'
import type { DateRange } from 'react-day-picker'
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns'
import { cn } from '../lib/cn'
import { Button } from '../primitives/Button'
import { Calendar } from '../primitives/Calendar'
import { Popover, PopoverTrigger, PopoverContent } from '../primitives/Popover'
import { InsetField } from '../primitives/InsetField'

/**
 * DateRangePicker — the platform's one date/date-range popup. [L3 composite]
 *
 * Built on the existing `Calendar` (`react-day-picker`, `mode="range"` or
 * `mode="single"`) inside `Popover`, with a `Button` trigger — no month-grid
 * math is re-implemented here. A caller-supplied `presets` list sits beside
 * the grid; selection is staged locally and only committed via `onChange`
 * when Apply is pressed (Cancel discards the stage), matching the reference
 * design's Apply/Cancel footer.
 *
 * `triggerVariant="field"` swaps the bordered `Button` trigger for a
 * borderless, label-above-value form-field look (reference design's `field`
 * render mode) — for report-builder / filter-panel placements.
 *
 * State-agnostic (Rule 8): `open`/staged-selection are presentational UI
 * state only. The committed value is fully owned by the caller through
 * `value`/`onChange` — no fetch, no store, no formatting business logic
 * beyond display.
 *
 * @usage-v5
 *   Ports `pickers/DatePicker.vue` — 3 near-identical tenant forks
 *   (iwmp/fams/ead), each: `range` prop, preset rows (Today/Yesterday/…),
 *   optional Start/End time, `dateTime` `{from,to}` value +
 *   `update:dateTime` emit. Same `{from,to}` shape also hand-rolled in:
 *   - iwmp/components/common/DateFilter.vue — `q-date range emit-value`,
 *     `modelValue` string or `{from,to}`, moment-formatted trigger label
 *   - shared/components/filters/ReportFilter.vue — `modelDate.range{from,to}`,
 *     computed "From: X, To: Y" label
 *   - shared/components/filters/TripFilters.vue — `filters.dates{from,to}`
 *   - iwmp/components/cards/FilterCard.vue — dashboard filter-card date range
 *   - iwmp/components/dialog/ContractCreateStepper.vue,
 *     shared/components/dialog/AddLeadDrawer.vue,
 *     shared/components/_visionai/AssetVisionAI.vue — further `q-date range` uses
 *   Forms needed: mode {range|single}, presets, optional time-of-day —
 *   exactly the three axes this component covers; the tenant forks differ
 *   only in copy/branding, confirming Rule 6 (no per-tenant fork).
 * @usage-index date-range-picker
 */
export type DateRangePickerMode = 'range' | 'single'

/**
 * `button` (default) — the standard bordered `Button` trigger, unchanged.
 * `field` — a borderless, form-field-style trigger with the label rendered
 * above the selected value, for report-builder / filter-panel placements
 * (matches the reference design's `field` render mode).
 * `inset` — the platform field-states shell: an `InsetField` (leading
 * calendar glyph · label-as-placeholder that floats to the small caption when
 * a value is applied · trailing chevron) wrapping a bare trigger button, per
 * the IconSelect/PhoneInput composition convention. For filter panels and
 * forms that must match the platform field spec.
 */
export type DateRangePickerTriggerVariant = 'button' | 'field' | 'inset'

/**
 * `{ from, to }` — structurally identical to `react-day-picker`'s `DateRange`,
 * re-exported so consumers don't need a direct dependency on that package
 * just to type their own state.
 */
export type DateRangePickerValue = DateRange

/**
 * A preset's range as a fixed value, or a thunk that computes it on demand.
 * `DEFAULT_RANGE_PRESETS` uses thunks so "Today" / "This week" / etc. are
 * always evaluated against the current date — matching the v5 reference
 * (`pickers/DatePicker.vue`), which recomputes `moment()` on every click
 * rather than freezing "today" at module load.
 */
export type DateRangePickerPresetRange = DateRangePickerValue | (() => DateRangePickerValue)

export interface DateRangePickerPreset {
  /** Shown as a row in the preset list. */
  label: string
  /** The value this preset resolves to when picked (`to` unused in `single` mode). */
  range: DateRangePickerPresetRange
}

function resolvePresetRange(preset: DateRangePickerPreset): DateRangePickerValue {
  return typeof preset.range === 'function' ? preset.range() : preset.range
}

function isSingleDayRange(range: DateRangePickerValue): boolean {
  return !!range.from && !!range.to && isSameDay(range.from, range.to)
}

/**
 * The platform's 8 built-in quick-picks, ported 1:1 from the reference
 * design's `dateOptions` (`pickers/DatePicker.vue` lines ~64-220) — Today,
 * Yesterday, This week, Last week, This month, Last month, This year, Last
 * year — recomputed with `date-fns` instead of `moment`.
 *
 * Week boundaries use `weekStartsOn: 1` (Monday), matching FAMS' Sun–Thu /
 * Mon–Fri regional work-week convention rather than `date-fns`'s Sunday
 * default. The v5 reference relies on `moment()`'s locale-default week
 * start, which is Monday in the app's configured locale — so this preserves
 * the same "This week" / "Last week" spans.
 *
 * Each entry is a thunk (not a precomputed value) so the resolved range is
 * always relative to "now" at the moment the preset is read — on every
 * render (for active-preset highlighting) and every click (for applying).
 *
 * DateRangePicker uses this list automatically when no `presets` prop is
 * given; pass `presets` to override with caller-supplied shortcuts instead.
 */
export const DEFAULT_RANGE_PRESETS: DateRangePickerPreset[] = [
  {
    label: 'Today',
    range: () => {
      const today = startOfDay(new Date())
      return { from: today, to: today }
    },
  },
  {
    label: 'Yesterday',
    range: () => {
      const yesterday = subDays(startOfDay(new Date()), 1)
      return { from: yesterday, to: yesterday }
    },
  },
  {
    label: 'This week',
    range: () => {
      const now = new Date()
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
    },
  },
  {
    label: 'Last week',
    range: () => {
      const lastWeek = subWeeks(new Date(), 1)
      return { from: startOfWeek(lastWeek, { weekStartsOn: 1 }), to: endOfWeek(lastWeek, { weekStartsOn: 1 }) }
    },
  },
  {
    label: 'This month',
    range: () => {
      const now = new Date()
      return { from: startOfMonth(now), to: endOfMonth(now) }
    },
  },
  {
    label: 'Last month',
    range: () => {
      const lastMonth = subMonths(new Date(), 1)
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    },
  },
  {
    label: 'This year',
    range: () => {
      const now = new Date()
      return { from: startOfYear(now), to: endOfYear(now) }
    },
  },
  {
    label: 'Last year',
    range: () => {
      const lastYear = subYears(new Date(), 1)
      return { from: startOfYear(lastYear), to: endOfYear(lastYear) }
    },
  },
]

export interface DateRangePickerTime {
  /** 24h `HH:mm`. */
  start: string
  end: string
}

export interface DateRangePickerProps {
  /** `range` (default) selects a from/to span; `single` selects one date. */
  mode?: DateRangePickerMode
  /** Controlled committed value. In `single` mode only `from` is read. */
  value?: DateRangePickerValue
  /** Fires with the staged value when Apply is pressed. */
  onChange: (value: DateRangePickerValue | undefined) => void
  /**
   * Quick picks shown beside the calendar. Defaults to `DEFAULT_RANGE_PRESETS`
   * (Today / Yesterday / This week / Last week / This month / Last month /
   * This year / Last year — ported from the reference design's `DatePicker.vue`
   * shortcuts). Pass your own array to override; pass `[]` to hide the list.
   */
  presets?: DateRangePickerPreset[]
  /** Show Start/End time-of-day inputs alongside the calendar. */
  withTime?: boolean
  /** Controlled time-of-day, only read/emitted when `withTime`. */
  time?: DateRangePickerTime
  onTimeChange?: (time: DateRangePickerTime) => void
  placeholder?: string
  disabled?: boolean
  hasError?: boolean
  size?: 'sm' | 'md' | 'lg'
  /** `button` (default, current bordered look) or `field` (borderless, label-above-value). */
  triggerVariant?: DateRangePickerTriggerVariant
  /** Label shown above the value when `triggerVariant="field"` (ignored otherwise). Defaults to a mode-based label. */
  fieldLabel?: string
  /** Popover alignment relative to the trigger. */
  align?: 'start' | 'center' | 'end'
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean
  className?: string
}

const EMPTY_TIME: DateRangePickerTime = { start: '', end: '' }

// Trigger/summary labels stay native Intl formatting — date-fns is used only
// for the DEFAULT_RANGE_PRESETS range math above.
const dateLabelFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function formatDate(date: Date): string {
  return dateLabelFormatter.format(date)
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDateLabel(range: DateRange | undefined, mode: DateRangePickerMode): string | null {
  if (!range?.from) return null
  if (mode === 'single' || !range.to || isSameDay(range.from, range.to)) {
    return formatDate(range.from)
  }
  return `${formatDate(range.from)} – ${formatDate(range.to)}`
}

/** In `single` mode only `from` is meaningful — a range preset (e.g. "This
 * week") is still "active" once its start day matches the picked date. */
function presetMatches(preset: DateRangePickerPreset, draft: DateRange | undefined, mode: DateRangePickerMode): boolean {
  const range = resolvePresetRange(preset)
  if (!draft?.from || !range.from || !isSameDay(draft.from, range.from)) return false
  if (mode === 'single') return true
  if (range.to || draft.to) {
    if (!range.to || !draft.to) return false
    return isSameDay(draft.to, range.to)
  }
  return true
}

export const DateRangePicker = forwardRef<HTMLButtonElement, DateRangePickerProps>(
  (
    {
      mode = 'range',
      value,
      onChange,
      presets,
      withTime = false,
      time,
      onTimeChange,
      placeholder,
      disabled = false,
      hasError = false,
      size = 'md',
      triggerVariant = 'button',
      fieldLabel,
      align = 'start',
      defaultOpen = false,
      className,
    },
    ref,
  ) => {
    const [open, setOpen] = useState(defaultOpen)
    const [draft, setDraft] = useState<DateRange | undefined>(value)
    const [draftTime, setDraftTime] = useState<DateRangePickerTime>(time ?? EMPTY_TIME)
    const startTimeId = useId()
    const endTimeId = useId()

    const handleOpenChange = (next: boolean) => {
      if (disabled) return
      if (next) {
        setDraft(value)
        setDraftTime(time ?? EMPTY_TIME)
      }
      setOpen(next)
    }

    const handleApply = () => {
      onChange(draft)
      if (withTime) onTimeChange?.(draftTime)
      setOpen(false)
    }

    const handleCancel = () => {
      setDraft(value)
      setDraftTime(time ?? EMPTY_TIME)
      setOpen(false)
    }

    const handlePreset = (preset: DateRangePickerPreset) => {
      const range = resolvePresetRange(preset)
      setDraft(mode === 'single' ? { from: range.from } : range)
    }

    const triggerLabel = formatDateLabel(value, mode)
    const summaryLabel = formatDateLabel(draft, mode)
    const fallbackText = placeholder ?? (mode === 'single' ? 'Select date' : 'Select date range')
    const monthKey = draft?.from ? `${draft.from.getFullYear()}-${draft.from.getMonth()}` : 'default'
    const resolvedFieldLabel = fieldLabel ?? (mode === 'single' ? 'Date' : 'Date Range')
    const isFieldVariant = triggerVariant === 'field'
    // No caller `presets`: fall back to the built-in shortcuts. In `single`
    // mode, only the ones that resolve to one calendar day (Today,
    // Yesterday) make sense — "This week" etc. stay range-mode-only, same
    // as the reference design hiding its quick-picks outside range mode.
    const resolvedPresets =
      presets ??
      (mode === 'single'
        ? DEFAULT_RANGE_PRESETS.filter((preset) => isSingleDayRange(resolvePresetRange(preset)))
        : DEFAULT_RANGE_PRESETS)

    // Shared popup panel (presets rail · calendar · optional time row ·
    // summary + Cancel/Apply footer) — identical across every trigger variant.
    const pickerContent = (
      <PopoverContent align={align} aria-label="Date range" className="w-auto p-0" data-slot="date-range-picker-content">
        <div className="flex">
          {resolvedPresets.length > 0 ? (
            <div
              role="listbox"
              aria-label="Presets"
              className="flex w-40 shrink-0 flex-col gap-0.5 border-e border-border p-2"
            >
              {resolvedPresets.map((preset) => {
                const active = presetMatches(preset, draft, mode)
                return (
                  <button
                    key={preset.label}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => handlePreset(preset)}
                    className={cn(
                      'rounded-sm px-3 py-2 text-start text-body-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                      active ? 'bg-secondary font-semibold text-primary' : 'text-foreground hover:bg-muted',
                    )}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          ) : null}

          <div className="flex flex-col">
            {/* Keyed on the anchor month so picking a preset re-centers the grid;
                `Calendar`'s `defaultMonth` is otherwise read once, on mount. */}
            {mode === 'range' ? (
              <Calendar
                key={monthKey}
                mode="range"
                selected={draft}
                onSelect={setDraft}
                defaultMonth={draft?.from ?? new Date()}
              />
            ) : (
              <Calendar
                key={monthKey}
                mode="single"
                selected={draft?.from}
                onSelect={(date) => setDraft(date ? { from: date } : undefined)}
                defaultMonth={draft?.from ?? new Date()}
              />
            )}

            {withTime ? (
              <div className="flex items-center gap-field border-t border-border px-4 py-3">
                <label htmlFor={startTimeId} className="text-body-sm text-muted-foreground">
                  Start time
                </label>
                <input
                  id={startTimeId}
                  type="time"
                  value={draftTime.start}
                  onChange={(e) => setDraftTime((t) => ({ ...t, start: e.target.value }))}
                  className="h-8 w-24 rounded-sm border border-border bg-card px-2 text-body-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <label htmlFor={endTimeId} className="text-body-sm text-muted-foreground">
                  End time
                </label>
                <input
                  id={endTimeId}
                  type="time"
                  value={draftTime.end}
                  onChange={(e) => setDraftTime((t) => ({ ...t, end: e.target.value }))}
                  className="h-8 w-24 rounded-sm border border-border bg-card px-2 text-body-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-field border-t border-border px-4 py-3">
              <span className="text-caption text-muted-foreground">{summaryLabel ?? '—'}</span>
              <div className="flex items-center gap-inline">
                <Button type="button" variant="secondary" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={handleApply}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    )

    if (triggerVariant === 'inset') {
      /*
       * Platform field-states shell (2026-09-01 handoff): the trigger is an
       * `InsetField` — leading calendar glyph, the label at placeholder
       * position while empty and floated to the small caption once a range is
       * applied, trailing chevron — wrapping a BARE button (the shell owns
       * the one outline + focus ring), per the IconSelect composition note.
       * Clicking anywhere on the shell opens the popup; the inner button
       * keeps native keyboard/AT semantics.
       */
      return (
        <Popover open={open} onOpenChange={handleOpenChange}>
          <InsetField
            label={resolvedFieldLabel}
            hasValue={Boolean(triggerLabel)}
            disabled={disabled}
            hasError={hasError}
            data-slot="date-range-picker-field"
            data-open={open || undefined}
            leadingIcon={<CalendarDays className="size-5" aria-hidden="true" />}
            trailingIcon={
              <ChevronDown
                aria-hidden="true"
                className={cn('size-4 transition-transform duration-fast', open && 'rotate-180')}
              />
            }
            className={cn('cursor-pointer', open && 'border-success', className)}
            onClick={(e) => {
              // The bare button is the Radix trigger — a click on it already
              // toggles; only clicks on the rest of the shell are forwarded.
              if (disabled) return
              const target = e.target as HTMLElement
              if (target.closest('[data-slot="date-range-picker-trigger"]')) return
              ;(e.currentTarget.querySelector('[data-slot="date-range-picker-trigger"]') as HTMLButtonElement | null)?.click()
            }}
          >
            <PopoverTrigger asChild>
              <button
                ref={ref}
                type="button"
                disabled={disabled}
                data-slot="date-range-picker-trigger"
                className="w-full truncate bg-transparent text-start outline-none"
              >
                {triggerLabel ?? fallbackText}
              </button>
            </PopoverTrigger>
          </InsetField>
          {pickerContent}
        </Popover>
      )
    }

    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant={isFieldVariant ? 'ghost' : 'tertiary'}
            size={size}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            data-slot="date-range-picker-trigger"
            className={cn(
              isFieldVariant
                ? 'h-auto w-full flex-col items-start gap-0.5 rounded-sm px-3 py-2 text-start font-normal'
                : 'w-full justify-between font-normal',
              !triggerLabel && 'text-muted-foreground',
              hasError && 'border-destructive focus-visible:ring-destructive',
              className,
            )}
          >
            {isFieldVariant ? (
              <>
                <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                  {resolvedFieldLabel}
                </span>
                <span className="flex w-full items-center justify-between gap-inline">
                  <span className="flex min-w-0 items-center gap-inline text-body-sm font-medium text-foreground">
                    <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{triggerLabel ?? fallbackText}</span>
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                </span>
              </>
            ) : (
              <>
                <span className="flex min-w-0 items-center gap-inline">
                  <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{triggerLabel ?? fallbackText}</span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              </>
            )}
          </Button>
        </PopoverTrigger>

        {pickerContent}
      </Popover>
    )
  },
)

DateRangePicker.displayName = 'DateRangePicker'
