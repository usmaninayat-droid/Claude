import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, SearchX } from '@fams/ui-kit/icons'
import { Button } from '@fams/ui-kit'
import { ViewEmptyState } from './ViewEmptyState'

/**
 * RecordViewStates — the empty / filtered / error surfaces shared by EVERY
 * record lens (List · Kanban · Hybrid · Calendar). [tier-2 internal]
 *
 * UX note J.57 requires three DISTINCT causes with three distinct copies on
 * every lens, all through the shipped `ViewEmptyState` and no bespoke empty
 * markup. `calendar/CalendarStates.tsx` already implemented exactly that idiom
 * for one lens and was the only lens that passed the gate; this module is that
 * same idiom generalized so the other three follow it rather than each
 * inventing a second one (UX note L.76: "a new one-off for any of these is a
 * gate failure"). `CalendarEmptyState` now delegates here, so there is one
 * implementation and one wording set.
 *
 * The record NOUN is a parameter, never a literal: `uiConfig.recordNoun` (via
 * `actions/module-actions-config.ts`'s `recordNounFor`) supplies "task"/"tasks"
 * for a pipeline and "vehicle"/"vehicles" for a fleet module out of the same
 * component (root rule 10 — no business vocabulary baked into shared code).
 */
export type RecordViewEmptyCause = 'error' | 'filtered' | 'no-data'

/** Singular/plural record noun, as produced by `recordNounFor(config)`. */
export interface RecordNoun {
  one: string
  many: string
}

export const DEFAULT_RECORD_NOUN: RecordNoun = { one: 'record', many: 'records' }

/**
 * Which of the three causes applies. Kept as a function (not inlined per lens)
 * so "an error outranks a filter, and a filter outranks no-data" is decided in
 * ONE place — every lens ordering it for itself is how a filtered-to-zero board
 * ended up telling the user their pipeline was empty (UX note J.57).
 */
export function resolveEmptyCause(error: unknown, isFiltered: boolean): RecordViewEmptyCause {
  if (error != null) return 'error'
  return isFiltered ? 'filtered' : 'no-data'
}

/**
 * The empty / filtered / error SEAM every record lens takes, declared once so
 * List, Kanban and Hybrid cannot drift in prop name, default or meaning (UX
 * note J.57 asks for the same three causes on every lens). Lenses extend this
 * interface rather than re-declaring the five props.
 */
export interface RecordLensStateProps {
  /**
   * Record noun for every generated state copy (`recordNounFor(config)`).
   * Defaults to "record"/"records" — never a hardcoded domain word.
   */
  recordNoun?: RecordNoun
  /**
   * Whether a search/filter is narrowing the record set. This is what lets a
   * lens tell "nothing matches your filters" apart from "no records yet" —
   * round 1 showed the SAME "no records yet" copy for a search that matched
   * nothing, which tells the user the module is empty when it is not (J.57
   * causes (a) vs (b)).
   */
  isFiltered?: boolean
  /** Resets search + filters; renders the `Clear filters` affordance when given. */
  onClearFilters?: () => void
  /** A load failure — renders J.57 cause (c): the error surface with `Retry`. */
  error?: ReactNode
  onRetry?: () => void
  /** Create seam for the "no records yet" surface's action. */
  onCreateRecord?: (prefill?: Record<string, unknown>) => void
  /**
   * How many records exist BEFORE the caller's search/filters narrowed them —
   * the `M` in the lens's one "Showing N of M" count row (UX E.30). A lens only
   * ever receives the narrowed set, so it cannot derive this. Omit and the lens
   * renders no count row at all (rather than a wrong one).
   */
  totalCount?: number
}

export interface RecordViewEmptyStateProps {
  cause: RecordViewEmptyCause
  /** Record noun for the generated copy. Defaults to "record"/"records". */
  noun?: RecordNoun
  /** Reason line for the `error` cause (a correlation id, a status line, …). */
  error?: ReactNode
  onRetry?: () => void
  onClearFilters?: () => void
  onCreateRecord?: (prefill?: Record<string, unknown>) => void
  /** Copy for the `no-data` create action. Defaults to `"Create New"`. */
  createLabel?: string
  /** Overrides the leading glyph for the `no-data` cause (e.g. a calendar icon). */
  icon?: ReactNode
}

/** The centred three-cause empty surface. Always `ViewEmptyState` underneath. */
export function RecordViewEmptyState({
  cause,
  noun = DEFAULT_RECORD_NOUN,
  error,
  onRetry,
  onClearFilters,
  onCreateRecord,
  createLabel = 'Create New',
  icon,
}: RecordViewEmptyStateProps) {
  if (cause === 'error') {
    return (
      <ViewEmptyState
        icon={<AlertTriangle className="size-6" />}
        title={`Couldn't load ${noun.many}`}
        description={error ?? 'The request failed. Retry, or check back shortly.'}
        action={onRetry ? <Button onClick={onRetry}>Retry</Button> : undefined}
      />
    )
  }
  if (cause === 'filtered') {
    return (
      <ViewEmptyState
        icon={<SearchX className="size-6" />}
        title={`No ${noun.many} match your filters`}
        description="Clear the search and filters to see everything in this view."
        action={onClearFilters ? <Button onClick={onClearFilters}>Clear filters</Button> : undefined}
      />
    )
  }
  return (
    <ViewEmptyState
      icon={icon ?? <Inbox className="size-6" />}
      title={`No ${noun.many} yet`}
      description={`${noun.many[0].toUpperCase()}${noun.many.slice(1)} added to this module appear here.`}
      // Arrow-wrapped: `onCreateRecord` takes an optional PREFILL, and a bare
      // handler reference would hand it the click event as one.
      action={onCreateRecord ? <Button onClick={() => onCreateRecord()}>{createLabel}</Button> : undefined}
    />
  )
}

/**
 * The inline "everything is filtered out" hint, for a lens whose own structure
 * IS the content and must therefore stay on screen — the calendar's 42-cell
 * grid (UX J.59) and, since this wave, the kanban board's stage columns (UX
 * J.58: "an empty column must never collapse to zero width or disappear, or
 * cards can never be moved into it"). Replacing either with a centred state is
 * the defect; a hint above it with `Clear filters` is the fix.
 */
export function RecordViewFilterHint({
  onClear,
  message = 'No records match the current search and filters.',
}: {
  onClear?: () => void
  message?: ReactNode
}) {
  return (
    <div
      data-slot="view-filter-hint"
      className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-sm border border-border bg-muted px-3 py-2"
    >
      <p className="text-body-sm text-muted-foreground">{message}</p>
      {onClear ? (
        <Button variant="tertiary" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Wraps a lens whose STRUCTURE must stay on screen (the kanban board's stage
 * columns, the calendar's grid) with the filtered-to-zero hint above it, rather
 * than replacing it with a centred empty state. Pass `show={false}` and it is a
 * transparent passthrough, so the caller has one code path either way.
 */
export function RecordLensFrame({
  show,
  onClearFilters,
  message,
  children,
}: {
  show: boolean
  onClearFilters?: () => void
  message?: ReactNode
  children: ReactNode
}) {
  if (!show) return <>{children}</>
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <RecordViewFilterHint onClear={onClearFilters} message={message} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}

/** The error banner for a lens that keeps its structure standing (same rule as the hint). */
export function RecordViewErrorHint({ error, onRetry }: { error?: ReactNode; onRetry?: () => void }) {
  return (
    <div
      data-slot="view-error-hint"
      role="alert"
      className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-sm border border-destructive/40 bg-destructive/5 px-3 py-2"
    >
      <p className="text-body-sm text-foreground">
        {error ?? 'The request failed. Retry, or check back shortly.'}
      </p>
      {onRetry ? (
        <Button variant="tertiary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  )
}
