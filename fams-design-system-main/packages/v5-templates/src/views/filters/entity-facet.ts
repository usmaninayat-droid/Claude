import type { FilterFacet, FilterOption } from '@fams/v5-composer'
import type { SelectorRow } from './ExpandableSelectorSheet'

/**
 * entity-facet — the ONE value adapter for `kind: 'entity'` filter facets.
 * [v5-templates]
 *
 * FIX WAVE C-2 / P0-3. Two symptoms, one root cause: the compact dropdown
 * showed `No results found!` for every query, and confirming a real selection
 * in the Expandable Selector sheet filtered the list to zero records.
 *
 * The cause is that an entity facet had no agreed VALUE SHAPE.
 * `deriveFilters()` leaves `optionDefs` undefined for `optionsFrom: 'records'`
 * (the composer holds no records, by design), so the dropdown had nothing to
 * render; and the sheet wrote its own ROW IDS (`row.id`, else the first
 * column's text — e.g. `"WF-01"`), while `applyViewState` matches a filter
 * value against `String(record[facet.col])` — e.g. the `title` `"Omar
 * Darwish"`. Two different id spaces, so nothing ever matched.
 *
 * **The decision (binding for both layers): an entity facet's value space is
 * the string value of `facet.col` on the referenced row** — exactly the value
 * space every other facet kind already uses. Consequences:
 *
 * - `applyViewState`'s matching is UNCHANGED, so legacy `options: string[]`
 *   facets keep working byte for byte (the alternative — writing record ids
 *   and teaching the live-filter model to resolve them — would have needed
 *   the record set inside a pure function that deliberately has none).
 * - the compact dropdown's options and the sheet's row identity are built
 *   from the same rows by the same helper, so `select via sheet` and `select
 *   via dropdown` are interchangeable and round-trip.
 * - the label is the referenced row's DISPLAY value for that column, which is
 *   what `expandView.columns` already names.
 *
 * Nothing here knows any module, entity or column vocabulary (J.87): the
 * facet's own `col` is the only key read.
 */

/** Scalar text of one cell, or `''` for anything that has no text form. */
function text(row: SelectorRow, col: string | undefined): string {
  if (!col) return ''
  const raw = row[col]
  if (raw == null) return ''
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return String(raw)
  return ''
}

/**
 * Column types whose stored value is a REFERENCE to another entity — an id (or
 * a list of ids) that is displayed as the referenced thing's name, never as
 * itself. `FilterFacet.type` carries the referencing column's own type
 * (`deriveFilters`), so this is pure metadata: no module, entity or column
 * vocabulary (J.87).
 */
const REFERENCE_COLUMN_TYPES = new Set(['Assignee', 'SingleReference', 'MultiReference'])

/**
 * FIX WAVE C-3 / P0. Does this entity facet reference ANOTHER entity?
 *
 * Two genuinely different shapes hide behind `kind: 'entity'`:
 *
 * - SAME-ENTITY (e.g. a facet on the view's own display column): the stored
 *   value IS the display value, and the view's own records are the option
 *   source. Unchanged from C-2.
 * - REFERENCE (`Assignee` / `Single`/`MultiReference`): the stored value is an
 *   id — one, or an ARRAY of them — of a row in another entity, and the
 *   displayed value is that row's name. C-2 read such a column with `text()`,
 *   which yields `''` for an array, fell through to `row.id`, and so offered
 *   the REFERENCING record's own id (a task id) as both option and value —
 *   the P0.
 */
export function isReferenceFacet(facet: FilterFacet): boolean {
  return facet.kind === 'entity' && REFERENCE_COLUMN_TYPES.has(facet.type)
}

/** Synthetic-row key holding a referenced row's display name. */
const REF_LABEL_COL = 'title'
/** Synthetic-row key holding how many source records carry the reference. */
const REF_COUNT_COL = 'count'

/**
 * EVERY facet value one source record carries. A reference column may store an
 * array of ids (`MultiReference`, and `Assignee` in practice), so this is a
 * list; a same-entity facet still yields exactly one value, so its behaviour is
 * byte for byte what `entityValueOf` gave.
 */
export function entityValuesOf(facet: FilterFacet, row: SelectorRow): string[] {
  const raw = row[facet.col]
  if (Array.isArray(raw)) {
    const out: string[] = []
    for (const item of raw) {
      if (item == null) continue
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        const value = String(item)
        if (value.length > 0) out.push(value)
      }
    }
    return out
  }
  const one = entityValueOf(facet, row)
  return one.length > 0 ? [one] : []
}

/**
 * The facet's value for one referenced row.
 *
 * `facet.col` FIRST — that is the record column the view's filter model
 * matches against, so it is the only value that can round-trip. A resolver
 * that hands back rows of a genuinely different entity (one that does not
 * carry the facet's own column) keeps the previous identity — `row.id`, else
 * the first configured column's text — so such a host is not silently broken
 * by this rule.
 */
export function entityValueOf(facet: FilterFacet, row: SelectorRow): string {
  const own = text(row, facet.col)
  if (own.length > 0) return own
  const id = text(row, 'id')
  if (id.length > 0) return id
  return text(row, facet.expandView?.columns?.[0]?.col)
}

/** Label for one facet value: the host's reference resolver, else the value. */
function labelOf(facet: FilterFacet, value: string, resolveLabel?: EntityLabelResolver): string {
  if (!isReferenceFacet(facet)) return value
  const resolved = resolveLabel?.(value)
  return resolved != null && resolved.length > 0 ? resolved : value
}

/** `(id) => display name` for a reference column — the host's own resolver. */
export type EntityLabelResolver = (value: string) => string | undefined

/** Distinct facet values across the source records, with a count each, first-seen order. */
function valueCounts(facet: FilterFacet, rows: readonly SelectorRow[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const row of rows) {
    for (const value of entityValuesOf(facet, row)) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  }
  return counts
}

/**
 * The rows the sheet actually renders for an entity facet: one row per
 * DISTINCT facet value, in first-seen order, valueless rows dropped.
 *
 * SAME-ENTITY facet → the source row itself (a view's own record), deduped:
 * resolving against the view's records otherwise repeats the same person once
 * per task, and duplicate row ids collide in the sheet's `byId` map.
 *
 * REFERENCE facet (FIX WAVE C-3 / P0) → one row per REFERENCED entity, built
 * from the only two things the DS layer can know about it: the id the column
 * stores (`facet.col`, and `id`, so the sheet's `getRowId` round-trips) and the
 * display name the host's own reference resolver gives (`title`) — the same
 * resolver the list cells and the toolbar's Assignee control already use. A
 * `count` of how many source records carry the reference comes free.
 */
export function entityRows(
  facet: FilterFacet,
  rows: readonly SelectorRow[],
  resolveLabel?: EntityLabelResolver,
): SelectorRow[] {
  if (isReferenceFacet(facet)) {
    return [...valueCounts(facet, rows).entries()].map(([value, count]) => ({
      id: value,
      [facet.col]: value,
      [REF_LABEL_COL]: labelOf(facet, value, resolveLabel),
      [REF_COUNT_COL]: count,
    }))
  }
  const seen = new Set<string>()
  const out: SelectorRow[] = []
  for (const row of rows) {
    const value = entityValueOf(facet, row)
    if (value.length === 0 || seen.has(value)) continue
    seen.add(value)
    out.push(row)
  }
  return out
}

/**
 * The compact dropdown's options for an entity facet — the same values as the
 * sheet's rows, sorted by LABEL for a stable, scannable list. `showCounts` gets
 * a real count of how many source rows carry the value.
 */
export function entityOptions(
  facet: FilterFacet,
  rows: readonly SelectorRow[],
  resolveLabel?: EntityLabelResolver,
): FilterOption[] {
  // FIX WAVE C-5 / P1 (R-38/DN-30) — the compact dropdown must draw the SAME
  // rich row the sheet does, and it only ever sees the OPTION. So each option
  // carries `meta`: the scalar cells of the row it was resolved from, keyed by
  // column, which is exactly what `expandView.rowTemplate` names. Built from
  // `entityRows`, so the dropdown and the sheet read one source.
  const metaByValue = new Map<string, Record<string, string>>()
  for (const row of entityRows(facet, rows, resolveLabel)) {
    const cells: Record<string, string> = {}
    for (const key of Object.keys(row)) {
      const cell = text(row, key)
      if (cell.length > 0) cells[key] = cell
    }
    metaByValue.set(entityValueOf(facet, row), cells)
  }
  return [...valueCounts(facet, rows).entries()]
    .map(([value, count]) => {
      const meta = metaByValue.get(value)
      return {
        value,
        label: labelOf(facet, value, resolveLabel),
        ...(facet.showCounts ? { count } : {}),
        ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
}

/** Is this a facet whose options the HOST must resolve from records (D-1)? */
export function needsRecordOptions(facet: FilterFacet): boolean {
  return facet.kind === 'entity' && !facet.optionDefs?.length
}

/**
 * The facet as the panel should render it: an entity facet gains the
 * `optionDefs` its compact dropdown needs; every other facet is returned
 * untouched (identity), so no legacy facet's object changes at all.
 */
export function withEntityOptions(
  facet: FilterFacet,
  rows: readonly SelectorRow[] | undefined,
  resolveLabel?: EntityLabelResolver,
): FilterFacet {
  if (!rows || !needsRecordOptions(facet)) return facet
  const optionDefs = entityOptions(facet, rows, resolveLabel)
  if (optionDefs.length === 0) return facet
  return { ...facet, optionDefs }
}
