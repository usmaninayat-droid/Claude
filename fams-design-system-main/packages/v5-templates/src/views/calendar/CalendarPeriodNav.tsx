import { ChevronDown, ChevronLeft, ChevronRight, Eye } from '@fams/ui-kit/icons'
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  IconControl,
  ModuleViewTabs,
} from '@fams/ui-kit'
import { cn } from '../../lib/cn'
import type { CalendarDateField, CalendarMode } from './calendar-model'

export interface CalendarPeriodNavProps {
  mode: CalendarMode
  onModeChange: (mode: CalendarMode) => void
  /** Already-formatted period label (long or short form — the view decides). */
  label: string
  onStep: (delta: -1 | 1) => void
  /** `View By` options (config-derived). A single option still renders the menu. */
  dateFields: CalendarDateField[]
  dateField: string
  onDateFieldChange: (col: string) => void
}

/**
 * CalendarPeriodNav — the calendar's own sub-toolbar row: the `Monthly | Weekly`
 * switcher, the `‹`/`›` period stepper, the period label and the `View By`
 * date-field menu (SPEC §1.4, Dev Notes 32274 + 32275). [tier-2 internal]
 *
 * The switcher REUSES `ui-kit`'s `ModuleViewTabs` in its `segment` variant — the
 * shipped bordered/active-fill segmented shape — rather than hand-rolling a
 * third toggle idiom; the only override is the 40px control height (UX K.65's
 * desktop floor, applied through the spacing-scale `h-10`, not a raw px).
 *
 * `‹`/`›` change their accessible names with the mode (`Previous month` vs
 * `Previous week`, UX K.67) — the same control means a different thing in each
 * grid shape and a screen reader must hear which.
 *
 * NOTE (deviation from SPEC §1.1's toolbar table): the design puts `View By` in
 * the module toolbar's FIRST row, beside search/filter/assignee. That row is
 * `ModuleViewFilters`' shared, every-lens composition; parking a calendar-only
 * control there is a change to a file this wave does not own, so `View By` sits
 * at the START of this row instead — same controls, same two rows, one row down.
 */
export function CalendarPeriodNav({
  mode,
  onModeChange,
  label,
  onStep,
  dateFields,
  dateField,
  onDateFieldChange,
}: CalendarPeriodNavProps) {
  const activeField = dateFields.find((f) => f.col === dateField)
  const stepNoun = mode === 'weekly' ? 'week' : 'month'
  return (
    <div
      data-slot="calendar-period-nav"
      className="flex min-w-0 shrink-0 flex-wrap items-center gap-2"
    >
      {dateFields.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-slot="calendar-view-by"
              className={cn(
                'inline-flex h-10 min-w-0 shrink-0 items-center gap-2 rounded-sm border border-border bg-card px-3',
                'text-body-sm font-medium text-muted-foreground outline-none transition-colors',
                'hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
              )}
              aria-label={`View by: ${activeField?.label ?? dateField}`}
            >
              <Eye className="size-4 shrink-0 opacity-70" aria-hidden="true" />
              <span className="truncate">{activeField?.label ?? dateField}</span>
              <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>View By</DropdownMenuLabel>
            {dateFields.map((field) => (
              <DropdownMenuCheckboxItem
                key={field.col}
                checked={field.col === dateField}
                // Single-select (overlay `33534:31648` shows exactly one row
                // filled): re-picking the active field is a no-op rather than
                // an "uncheck", which would leave the grid with no date axis.
                onCheckedChange={(checked) => {
                  if (checked) onDateFieldChange(field.col)
                }}
              >
                {field.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <ModuleViewTabs
        variant="segment"
        aria-label="Calendar period"
        active={mode}
        onSelect={(id) => onModeChange(id as CalendarMode)}
        views={[
          { id: 'monthly', label: 'Monthly' },
          { id: 'weekly', label: 'Weekly' },
        ]}
        className="shrink-0 [&_[data-slot=module-view-tab]]:h-10"
      />

      <div className="flex shrink-0 items-center gap-1">
        {/* Icon-only ⇒ name + hover/focus tooltip through the one helper, and
            both change with the mode (UX K.67). */}
        <IconControl tip={`Previous ${stepNoun}`}>
          <Button variant="tertiary" size="icon" className="size-10" onClick={() => onStep(-1)}>
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Button>
        </IconControl>
        <IconControl tip={`Next ${stepNoun}`}>
          <Button variant="tertiary" size="icon" className="size-10" onClick={() => onStep(1)}>
            <ChevronRight className="size-5" aria-hidden="true" />
          </Button>
        </IconControl>
      </div>

      <p data-slot="calendar-period-label" className="min-w-0 truncate text-body font-semibold text-foreground">
        {label}
      </p>
    </div>
  )
}

CalendarPeriodNav.displayName = 'CalendarPeriodNav'
