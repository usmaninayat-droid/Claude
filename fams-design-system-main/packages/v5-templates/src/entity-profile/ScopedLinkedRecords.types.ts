import type { EntityRecord } from '@fams/v5-composer'
import type { RecordTableColumn } from './RecordTable'

/**
 * The `ScopedLinkedRecords` CONFIG CONTRACT. [tier-2]
 *
 * A detail-sheet tab over ANOTHER module's records, scoped down to the ones
 * that reference the profiled record — the generic seam Wave A of the
 * 2026-09-05 job-orders run introduces so a vehicle's "Job Orders" /
 * "Preventive Maintenance" tabs (and any future module's "records that point
 * back at me" tab) share ONE implementation instead of each forking a
 * private cross-module list.
 *
 * Same field-key-indirection discipline as `RecordTable`/`SearchableRecordList`
 * — `entityType`/`matchField`/`matchAgainst` are blueprint-authored strings,
 * never a hardcoded business relationship (root `CLAUDE.md` rule 10).
 */
export interface ScopedLinkedRecordsProps {
  /** The record being profiled — every row is scoped against ITS `matchAgainst` value. */
  record?: EntityRecord
  /** The target module's blueprint `code` (e.g. `maintenance/job-order`) — resolved via `useModuleRecords()`. */
  entityType: string
  /** Column, on a target-module record, holding the back-reference — read as scalar OR array, stringified either way. */
  matchField: string
  /** Column on the PROFILED record to match against. Default `'id'`. */
  matchAgainst?: string
  columns: RecordTableColumn[]
  /** Shows a search input above the table, filtering the already-scoped rows client-side. Default `false`. */
  search?: boolean
  searchPlaceholder?: string
  /** Empty-state title when no target-module record scopes to this one. */
  emptyLabel?: string
  /** `statusPill` column color lookup — the same blueprint-driven hex escape hatch `RecordTable.statusColors` documents. */
  statusColors?: Record<string, string>
  /** Caps the number of scoped rows rendered (applied after scoping/before search). Omit for no cap. */
  limit?: number
  className?: string
}
