import type { EntityRecord } from '@fams/v5-composer'

/**
 * The `SearchableRecordList` CONFIG CONTRACT. [tier-2]
 *
 * A detail-sheet tab that is a SEARCH INPUT over a SCROLLING LIST of compact
 * rows — the dense "related records" row anatomy (bordered row, id + title
 * lead, muted meta line, trailing solid status pill) the demo env's Related
 * Requests/Complaints tab established, lifted into the design system so any
 * module's blueprint can name it instead of every app forking its own copy.
 *
 * Same FIELD-KEY INDIRECTION discipline as `RecordTable`/`OverviewWidgets`:
 * rows come from `record[itemsField]` and every rendered slot names the ROW
 * KEY it reads. No module vocabulary lives here — "plan", "zone", "stops" are
 * blueprint labels, never identifiers in this file (root `CLAUDE.md` rule 10).
 *
 * State-agnostic (Rule 8) with the one deliberate exception `RecordTable`
 * already documents: the search box filters rows ALREADY IN MEMORY (substring
 * match across the id/title/meta values), which is local UI state, not a fetch.
 */

/** One muted meta item on a row's second line. */
export interface SearchableRecordMeta {
  /** Row-object key this meta item reads. */
  key: string
  /** Optional named glyph rendered ahead of the value (same small vocabulary the overview widgets use). */
  icon?: string
  /** Optional prefix printed before the value, e.g. `"Zone "`. */
  prefix?: string
}

export interface SearchableRecordListStrings {
  searchPlaceholder: string
  emptyText: string
  /** `{query}` is substituted with the typed text. */
  noMatchText: string
}

export interface SearchableRecordListProps {
  record: EntityRecord | undefined
  /** `record[itemsField]` — the row array (`Record<string, unknown>[]`). */
  itemsField: string
  /** Row key for the stable react key; falls back to the index. */
  idKey?: string
  /** Row key rendered as the small muted lead identifier (e.g. a plan id). */
  leadKey?: string
  /** Row key rendered as the row's bold title. */
  titleKey: string
  /** Row key holding the status value — rendered as a trailing solid pill. */
  statusKey?: string
  /** Status value → solid pill hex, the same blueprint-driven escape hatch `RecordTable.statusColors` documents. */
  statusColors?: Record<string, string>
  /** Muted second-line meta items, in order. */
  meta?: SearchableRecordMeta[]
  strings?: Partial<SearchableRecordListStrings>
  className?: string
}
