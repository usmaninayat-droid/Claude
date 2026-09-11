import { useMemo } from 'react'
import type { StatusDef } from '@fams/v5-composer'
import { LegendFilter } from '../legend/LegendFilter'

export interface CalendarLegendProps {
  /** Statuses to key + filter by, in blueprint order. */
  statuses: StatusDef[]
  /** Currently checked status keys. */
  visible: string[]
  onToggle: (key: string, checked: boolean) => void
  /** Per-status TOTALS (never filtered counts — Dev Note 32273). */
  totals: Map<string, number>
  /** Hide the `(14)` counts and move them into the accessible name (UX I.54.2). */
  hideCounts?: boolean
  /** Collapse the whole fieldset into a `Status` popover (UX I.54.4). */
  collapsed?: boolean
}

/**
 * CalendarLegend — the calendar's status legend, built as a FILTER, not
 * decoration. [tier-2 internal]
 *
 * SPEC §1.4 renders checkbox + swatch + label + muted count; Dev Note 32273
 * makes the checkboxes real filters whose parenthesised numbers are per-status
 * TOTALS that do not move when a sibling is unchecked.
 *
 * The mechanics live in the shared `LegendFilter` (wave A6): the hybrid map's
 * priority legend is the same control over a different axis, and
 * `REFERENCE-MINING.md` §4.3 calls one shared legend primitive the right
 * answer. This file is now only the status→entry mapping — every a11y and
 * responsive ruling (E.27/E.28/E.29/I.54/K.65) is enforced in one place.
 */
export function CalendarLegend({ statuses, visible, onToggle, totals, hideCounts, collapsed }: CalendarLegendProps) {
  const entries = useMemo(
    () => statuses.map((status) => ({ key: status.key, label: status.label, color: status.color })),
    [statuses],
  )
  // Every status carries a count, `(0)` included — an absent number would
  // read as "no data for this status" rather than "none in this period".
  const filled = useMemo(
    () => new Map(statuses.map((status) => [status.key, totals.get(status.key) ?? 0])),
    [statuses, totals],
  )
  return (
    <LegendFilter
      entries={entries}
      visible={visible}
      onToggle={onToggle}
      totals={filled}
      hideCounts={hideCounts}
      collapsed={collapsed}
      title="Filter by status"
      collapsedLabel="Status"
      slot="calendar-legend"
    />
  )
}

CalendarLegend.displayName = 'CalendarLegend'
