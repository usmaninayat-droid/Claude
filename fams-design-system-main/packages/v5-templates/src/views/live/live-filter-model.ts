import type { EntityConfig, EntityRecord, FilterFacet } from '@fams/v5-composer'

/**
 * live-filter-model.ts — pure state + derivation for the live-monitoring
 * list panel's All Filters popover, applied-filter chips, and saved filters
 * (figma live-monitoring spec §1.7). No React — `LiveHybridView`'s hook layer
 * owns the state; everything here is data-in / data-out so tests and the
 * popover/chips components share one implementation.
 */

/** The whole applied-filter state: per-column selections + free tags. */
export interface LiveFilterValue {
  /** Selected option values keyed by facet col. */
  filters: Record<string, string[]>
  /** Selected tag values (from `uiConfig.map.tagsCol`'s vocabulary). */
  tags: string[]
}

export function emptyLiveFilterValue(): LiveFilterValue {
  return { filters: {}, tags: [] }
}

/** One checkbox option inside a filter group, with its live record count. */
export interface LiveFilterOption {
  value: string
  /** Records matching this option under NO filters (spec: per-option counts). */
  count: number
}

/** One checkbox group in the All Filters popover (e.g. "Mobility Status"). */
export interface LiveFilterGroup {
  col: string
  label: string
  options: LiveFilterOption[]
}

/** A tag-suggestion group (spec §1.7: "Shift Type" / "My Private Tags"). */
export interface LiveTagGroup {
  label: string
  options: string[]
  /** Chip tone — warning = the spec's orange Shift Type chips. */
  tone?: 'warning' | 'muted'
}

/** A named, reusable filter set (spec §1.7 saved filters). */
export interface SavedLiveFilter {
  id: string
  name: string
  value: LiveFilterValue
}

/** "N conditions" subtitle for a saved filter's list row. */
export function conditionCount(value: LiveFilterValue): number {
  return (
    Object.values(value.filters).reduce((sum, arr) => sum + arr.length, 0) + value.tags.length
  )
}

/** Total active selections — the funnel badge's red count. */
export function countActiveLiveFilters(value: LiveFilterValue): number {
  return conditionCount(value)
}

/** Splits a possibly multi-valued cell ("street, night-shift") into values. */
function cellValues(raw: unknown): string[] {
  if (raw == null || raw === '') return []
  if (Array.isArray(raw)) return raw.map(String)
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Derives the popover's checkbox groups from the module's filter facets +
 * live per-option record counts. Facets without options (date/reference) are
 * skipped — the popover is a checkbox surface.
 */
export function buildLiveFilterGroups(facets: FilterFacet[], records: EntityRecord[]): LiveFilterGroup[] {
  return (
    facets
      .filter((facet) => facet.options?.length)
      .map((facet) => ({
        col: facet.col,
        label: facet.label,
        options: facet.options!.map((value) => ({
          value,
          count: records.filter((rec) => String(rec[facet.col] ?? '') === value).length,
        })),
      }))
      /* CHIP-AWARE facet set (2026-08-31 workforce-popup task): a group whose
         every option counts ZERO against the records in view belongs to the
         OTHER entity kind (vehicle facets while the Workforce chip is active,
         workforce facets under Vehicle) or is otherwise pure noise — it drops
         rather than rendering a column of dead checkboxes. Counts are
         computed under NO applied filters, so a group can never hide because
         of its own selection; the caller already feeds kind-filtered
         records, which is what makes this chip-aware for free. */
      .filter((group) => group.options.some((option) => option.count > 0))
  )
}

/**
 * Groups with selections jump to the top (spec §1.7), original order kept
 * within each half — stable, so unselected groups never shuffle.
 */
export function orderLiveFilterGroups(groups: LiveFilterGroup[], value: LiveFilterValue): LiveFilterGroup[] {
  const selected = groups.filter((g) => (value.filters[g.col]?.length ?? 0) > 0)
  const rest = groups.filter((g) => (value.filters[g.col]?.length ?? 0) === 0)
  return [...selected, ...rest]
}

/**
 * Derives the Tags suggestion vocabulary: one group per bound tags column —
 * `tagsCol` (first group, warning-tinted chips — SPEC §2.5 "Shift Type") and
 * the optional `privateTagsCol` (second group, grey outlined chips — "My
 * Private Tags"). Group labels come from each column's systemcolumn name.
 */
export function deriveTagGroups(config: EntityConfig, records: EntityRecord[]): LiveTagGroup[] {
  const map = config.uiConfig.map
  const groups: LiveTagGroup[] = []
  const bindings: { col?: string; tone: 'warning' | 'muted'; fallbackLabel: string }[] = [
    { col: map?.tagsCol, tone: 'warning', fallbackLabel: 'Tags' },
    { col: map?.privateTagsCol, tone: 'muted', fallbackLabel: 'My Private Tags' },
  ]
  for (const { col, tone, fallbackLabel } of bindings) {
    if (!col) continue
    const values = new Set<string>()
    for (const rec of records) for (const v of cellValues(rec[col])) values.add(v)
    if (values.size === 0) continue
    const label = config.systemcolumns.find((c) => c.col === col)?.name ?? fallbackLabel
    groups.push({ label, options: [...values].sort(), tone })
  }
  return groups
}

/**
 * Applies the filter value to a record set (AND across groups, OR within).
 * `privateTagsCol` (optional, additive) is the second tag vocabulary — a
 * selected tag matches records carrying it in EITHER bound tags column.
 */
export function applyLiveFilters(
  records: EntityRecord[],
  value: LiveFilterValue,
  tagsCol?: string,
  privateTagsCol?: string,
): EntityRecord[] {
  const active = Object.entries(value.filters).filter(([, v]) => v.length > 0)
  let out = records
  if (active.length) {
    out = out.filter((rec) => active.every(([col, want]) => want.includes(String(rec[col] ?? ''))))
  }
  const tagCols = [tagsCol, privateTagsCol].filter((c): c is string => Boolean(c))
  if (value.tags.length && tagCols.length) {
    out = out.filter((rec) => {
      const have = tagCols.flatMap((col) => cellValues(rec[col]))
      return value.tags.some((tag) => have.includes(tag))
    })
  }
  return out
}

/** Toggle helper — returns the next value with `option` (un)checked in `col`. */
export function toggleLiveFilter(value: LiveFilterValue, col: string, option: string, checked: boolean): LiveFilterValue {
  const current = value.filters[col] ?? []
  const next = checked ? [...new Set([...current, option])] : current.filter((o) => o !== option)
  const filters = { ...value.filters }
  if (next.length) filters[col] = next
  else delete filters[col]
  return { ...value, filters }
}

/** A search-highlight segment; `match` segments render emphasized. */
export interface MatchSegment {
  text: string
  match: boolean
}

/**
 * Splits `text` into segments around case-insensitive occurrences of `query`
 * (spec §1.6 matched-substring highlight). An empty query yields one
 * non-match segment.
 */
export function matchSegments(text: string, query: string): MatchSegment[] {
  const q = query.trim().toLowerCase()
  if (!q) return [{ text, match: false }]
  const lower = text.toLowerCase()
  const segments: MatchSegment[] = []
  let cursor = 0
  for (;;) {
    const at = lower.indexOf(q, cursor)
    if (at === -1) break
    if (at > cursor) segments.push({ text: text.slice(cursor, at), match: false })
    segments.push({ text: text.slice(at, at + q.length), match: true })
    cursor = at + q.length
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false })
  return segments.length ? segments : [{ text, match: false }]
}
