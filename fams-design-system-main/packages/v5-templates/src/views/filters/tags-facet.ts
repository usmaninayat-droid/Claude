import type { FilterFacet, FilterOption } from '@fams/v5-composer'
import type { SelectorRow } from './ExpandableSelectorSheet'

/**
 * tags-facet — the ONE value adapter for `kind: 'tags'` filter facets.
 * [v5-templates]
 *
 * FIX WAVE C-4 / P0-1. Every tag chip filtered the list to `0 of 179`: the
 * chips were an INLINE option list authored in the blueprint, and not one of
 * its values existed in the records' own tag column. `applyViewState` matched
 * them (correctly, by membership — FIX WAVE C-3) against nothing.
 *
 * **The decision (mirrors `entity-facet.ts`): a tags facet's OPTION SET is the
 * distinct values the RECORDS actually carry.** Authored `options` are no
 * longer the source of the option set — they are metadata ABOUT values
 * (`label`, `category`, `color`), merged in for the values that exist and
 * ignored for the values that do not. Consequences:
 *
 * - a facet can never again offer a chip that matches zero records, whatever
 *   a blueprint authors, because the option set comes from the data;
 * - the category grouping (`FilterOptionGroups`, R-22) still comes from
 *   metadata, which is the only place a human-meaningful grouping can live —
 *   never from a records column (`categoryCol` describes the RECORD's own
 *   category, not the TAG's, so it cannot group tag chips at all);
 * - a value with no authored metadata is still offered, labelled with itself
 *   and uncategorised, so a seed can add a tag without a blueprint edit.
 *
 * The value space is `String(tag)` — exactly what `applyViewState`'s
 * membership matcher compares against — so a record carrying
 * `['sla-watch','urgent']` matches a filter of `['urgent']`.
 *
 * Vocabulary-free (J.87): the facet's own `col` is the only key read, and no
 * tag, category or module name appears here.
 */

/** Is this the facet kind whose options are tag values? */
export function isTagsFacet(facet: FilterFacet): boolean {
  return facet.kind === 'tags'
}

/**
 * Every tag one record carries. A tags column stores an ARRAY (a record may
 * carry several), but a single scalar is accepted too, so a module that stores
 * one tag per record is not silently optionless.
 */
export function tagValuesOf(facet: FilterFacet, row: SelectorRow): string[] {
  const raw = row[facet.col]
  const items = Array.isArray(raw) ? raw : raw == null ? [] : [raw]
  const out: string[] = []
  for (const item of items) {
    if (typeof item !== 'string' && typeof item !== 'number' && typeof item !== 'boolean') continue
    const value = String(item)
    if (value.length > 0) out.push(value)
  }
  return out
}

/** Distinct tag values across the records, with a count each, first-seen order. */
function tagCounts(facet: FilterFacet, rows: readonly SelectorRow[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const row of rows) {
    for (const value of tagValuesOf(facet, row)) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return counts
}

/**
 * The chips the panel renders: one per DISTINCT tag value in the records,
 * carrying the authored option's `label`/`category`/`color` when the blueprint
 * declares metadata for that value. Ordered by the AUTHORED option order first
 * (so a blueprint's category layout is stable and intentional), then any
 * unauthored value in first-seen order.
 */
export function tagOptions(facet: FilterFacet, rows: readonly SelectorRow[]): FilterOption[] {
  const counts = tagCounts(facet, rows)
  const authored = new Map((facet.optionDefs ?? []).map((o) => [o.value, o]))
  const out: FilterOption[] = []
  for (const [value, meta] of authored) {
    const count = counts.get(value)
    if (count == null) continue
    out.push({ ...meta, value, ...(facet.showCounts ? { count } : {}) })
  }
  for (const [value, count] of counts) {
    if (authored.has(value)) continue
    out.push({ value, label: value, ...(facet.showCounts ? { count } : {}) })
  }
  return out
}

/**
 * The facet as the panel should render it: a tags facet's `optionDefs` become
 * the records-derived set above; every other facet is returned untouched
 * (identity), so no other facet kind's object changes at all.
 */
export function withTagOptions(facet: FilterFacet, rows: readonly SelectorRow[] | undefined): FilterFacet {
  if (!rows || !isTagsFacet(facet)) return facet
  return { ...facet, optionDefs: tagOptions(facet, rows) }
}
