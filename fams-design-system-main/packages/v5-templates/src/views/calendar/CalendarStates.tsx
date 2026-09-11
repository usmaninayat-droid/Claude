import type { ReactNode } from 'react'
import { CalendarDays } from '@fams/ui-kit/icons'
import { Skeleton } from '@fams/ui-kit'
import {
  RecordViewEmptyState,
  RecordViewFilterHint,
  type RecordViewEmptyCause,
} from '../RecordViewStates'

/**
 * The calendar's empty / loading / error surfaces. [tier-2 internal]
 *
 * Three distinct causes get three distinct copies, all through the SHIPPED
 * `ViewEmptyState` — no bespoke empty markup anywhere (UX J.57 + verdict 23's
 * reuse gate).
 *
 * This lens was the only one that got J.57 right, so its idiom was generalized
 * into `../RecordViewStates.tsx` for List/Kanban/Hybrid to follow. These two
 * exports are now thin calendar-flavoured wrappers over that shared
 * implementation (one calendar glyph, one calendar-period wording) — NOT a
 * second copy of the same three states.
 */
export type CalendarEmptyCause = RecordViewEmptyCause

export interface CalendarEmptyStateProps {
  cause: CalendarEmptyCause
  /** Reason line for the error cause. */
  error?: ReactNode
  onRetry?: () => void
  onClearFilters?: () => void
  onCreateRecord?: () => void
}

export function CalendarEmptyState({
  cause,
  error,
  onRetry,
  onClearFilters,
  onCreateRecord,
}: CalendarEmptyStateProps) {
  return (
    <RecordViewEmptyState
      cause={cause}
      error={error}
      onRetry={onRetry}
      onClearFilters={onClearFilters}
      onCreateRecord={onCreateRecord}
      icon={<CalendarDays className="size-6" />}
    />
  )
}

/**
 * The inline "everything is filtered out" hint. UX J.59 is explicit that a month
 * with nothing to show keeps its FULL grid — the grid IS the content — so the
 * filtered-to-zero feedback is a dismissible-shaped hint ABOVE the grid with the
 * `Clear filters` action, never a centred empty state replacing it.
 */
export function CalendarFilterHint({ onClear }: { onClear: () => void }) {
  return (
    <RecordViewFilterHint
      onClear={onClear}
      message="No records match the current filters in this period."
    />
  )
}

/** Dimension-matched loading grid — weekday header + 42 cells, never a spinner (UX J.59). */
export function CalendarGridSkeleton() {
  return (
    <div
      data-slot="calendar-skeleton"
      className="min-h-0 flex-1 overflow-hidden"
      role="status"
      aria-label="Loading"
    >
      <div className="grid grid-cols-7 border-s border-t border-border">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={`head-${i}`} variant="custom" className="h-12 border-e border-b border-border" />
        ))}
        {Array.from({ length: 42 }).map((_, i) => (
          <Skeleton key={`cell-${i}`} variant="custom" className="min-h-28 border-e border-b border-border" />
        ))}
      </div>
    </div>
  )
}
