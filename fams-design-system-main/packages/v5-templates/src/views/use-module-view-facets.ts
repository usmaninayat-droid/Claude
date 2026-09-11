import { useMemo } from 'react'
import { deriveColumns, deriveFilters, type EntityConfig, type EntityRecord } from '@fams/v5-composer'
import type {
  ModuleViewAssigneeFacet,
  ModuleViewGroupByOption,
  ModuleViewSortOption,
} from './ModuleViewFilters'

/**
 * Best-effort singularization for the search box's generic default
 * placeholder ("Search {module label}") — e.g. `"Tickets"` → `"Ticket"`,
 * `"Companies"` → `"Company"`. Deliberately simple (a handful of common
 * English plural suffixes), since it only ever feeds a DEFAULT string: a
 * module whose name doesn't singularize sensibly this way (e.g.
 * `"Inventory"`, already singular) should set `uiConfig.search.placeholder`
 * explicitly (`types.ts`) rather than rely on the guess — see that field's
 * doc for the full contract.
 */
export function singularize(label: string): string {
  if (/ies$/i.test(label)) return label.replace(/ies$/i, 'y')
  if (/(ses|xes|zes|ches|shes)$/i.test(label)) return label.replace(/es$/i, '')
  if (/s$/i.test(label) && !/ss$/i.test(label)) return label.replace(/s$/i, '')
  return label
}

/**
 * The v2 `FilterDef` fields (D-1). A blueprint that sets ANY of them — or a
 * `uiConfig.filtersPanel` — has opted into the "All Filters" panel; one that
 * sets none keeps today's toolbar exactly as it is.
 */
const V2_FILTER_DEF_KEYS = [
  'kind',
  'multiple',
  'optionsFrom',
  'options',
  'categoryCol',
  'icon',
  'expandable',
  'expandView',
  'createFromSearch',
  'showCounts',
  'optionDot',
] as const

/** Whether this module's blueprint opted into the v2 filter panel (WAVE C6 gate). */
export function hasAuthoredFilterV2(config: EntityConfig): boolean {
  if (config.uiConfig.filtersPanel != null) return true
  return (config.uiConfig.filters ?? []).some((def) => {
    const raw = def as unknown as Record<string, unknown>
    return V2_FILTER_DEF_KEYS.some((key) => raw[key] !== undefined)
  })
}

/**
 * useModuleViewFacets — `ModuleView`'s blueprint-derived toolbar inputs,
 * extracted whole (root rule 12's decompose-on-touch, WP5). [tier-2 pattern]
 *
 * Everything here is a pure derivation from the props already in hand
 * (Rule 8 — no fetching): filter facets, search columns + placeholder, sort
 * options, group-by options, and the Assignee facet's distinct values.
 * See each memo's comment for the design decision it encodes.
 */
export function useModuleViewFacets(
  config: EntityConfig,
  records: EntityRecord[],
  resolveAssigneeName?: (id: string) => string | undefined,
  /**
   * Per-person display extras for the Assignee panel's rows (Figma
   * "Filter By You" `33534:26092`): a secondary line (an email) and a photo
   * URL. Same id→display shape as `resolveAssigneeName`, kept as separate
   * optional resolvers so a host that only knows names is unaffected.
   */
  resolveAssigneeDetail?: (id: string) => string | undefined,
  resolveAssigneeAvatarUrl?: (id: string) => string | undefined,
  /**
   * The signed-in user's id. Supplying it turns on the "Filter for your Tasks"
   * quick-toggle and the pinned **You** row; omitting it degrades the control
   * to a plain multi-select.
   */
  currentUserId?: string,
) {
  /*
   * FAMILY C / WAVE C6 — the v2 activation gate, resolved HERE because this
   * is where blueprint metadata becomes toolbar props.
   *
   * `deriveFilters()` (C1) always fills the v2 fields — `kind` and friends are
   * DERIVED for every facet, authored or not — so "the facet has a `kind`" is
   * true of every shipped module and cannot, by itself, mean "this module
   * opted in". The opt-in signal is what the BLUEPRINT authored: a
   * `uiConfig.filtersPanel`, or any v2 field on any `FilterDef`. Until a
   * module authors one (WAVE C7), the facets handed to the toolbar are the
   * legacy `{col,label,type,options}` shape, byte for byte, and the toolbar's
   * own `isFilterPanelV2Active` therefore keeps the legacy flat facet list.
   */
  const filtersV2Authored = useMemo(() => hasAuthoredFilterV2(config), [config])
  const facets = useMemo(() => {
    const derived = deriveFilters(config)
    if (!filtersV2Authored) return derived.map(({ col, label, type, options }) => ({ col, label, type, options }))
    /*
     * `showCounts` — the per-option record-count pill (UCCP pipeline-actions
     * reference: Status/Priority/… options carry live counts). The composer is
     * record-free, so authored inline counts are all it can surface; THIS is
     * the seam that holds the records, so a `showCounts` facet's options are
     * (re)counted here against the module's full record set. Multi-valued
     * columns count by membership, matching `applyViewState`'s own rule.
     */
    return derived.map((facet) => {
      if (!facet.showCounts || !facet.optionDefs?.length) return facet
      const counts = new Map<string, number>()
      for (const record of records) {
        const raw = record[facet.col]
        const values = Array.isArray(raw) ? raw.map(String) : raw == null || raw === '' ? [] : [String(raw)]
        for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
      }
      return {
        ...facet,
        optionDefs: facet.optionDefs.map((o) => ({ ...o, count: counts.get(o.value) ?? 0 })),
      }
    })
  }, [config, filtersV2Authored, records])
  const searchColumns = useMemo(() => config.uiConfig.search?.columns ?? ['title'], [config])
  /**
   * Toolbar search placeholder (figma-spec-list.md §1/figma-spec-kanban.md
   * §1's "Search Ticket") — `uiConfig.search.placeholder` wins when the
   * blueprint sets one; otherwise a generic `"Search {singular module
   * label}"` default derived from `config.name` (see `singularize`'s doc).
   * Previously `ModuleViewFilters`'s own `searchPlaceholder` prop had no
   * config wiring at all (it only ever got its hardcoded `'Search…'`
   * default) — `qa/deviations.md`'s FIX-3 entry.
   */
  const searchPlaceholder = useMemo(
    () => config.uiConfig.search?.placeholder ?? `Search ${singularize(config.name)}`,
    [config],
  )
  // The toolbar's Sort control is otherwise ALWAYS shown — `deriveColumns`
  // marks every listcolumns entry `sortable: true` unconditionally, so
  // `sortOptions` is never empty. A module whose Figma spec has no Sort
  // affordance at all (asset/Collection-Point's figma-spec-list.md §3:
  // search + filter + CTA only, no sort icon) opts out via
  // `uiConfig.listSort: false` — a generic per-module knob, not a hardcoded
  // module check.
  const sortOptions = useMemo<ModuleViewSortOption[]>(
    () =>
      config.uiConfig.listSort === false
        ? []
        : deriveColumns(config).filter((c) => c.sortable).map((c) => ({ col: c.accessorKey, label: c.header })),
    [config],
  )

  // The list view's group-by choices — auto-derived (Rule 8, same pattern as
  // `assigneeFacet` below): any `listcolumns` field backed by a
  // `SingleSelect` `systemcolumns` entry is offered, generic across ANY
  // module (a ticketing "Status"/"Ticket Type"/"Source" field, a CRM
  // "Stage", …) — no new blueprint key required. No such field → no group-by
  // control (matches figma-spec-list.md §1: the dropdown only exists on the
  // grouped variant).
  const groupableOptions = useMemo<ModuleViewGroupByOption[]>(() => {
    const listedCols = new Set(deriveColumns(config).map((c) => c.accessorKey))
    return config.systemcolumns
      .filter((c) => c.type === 'SingleSelect' && listedCols.has(c.col))
      .map((c) => ({ value: c.col, label: c.name }))
  }, [config])

  /*
   * Every LISTED column as a Group By candidate, whatever its type. NOT the
   * automatic option set (that stays `groupableOptions` above, unchanged) —
   * this is only what a blueprint's CURATED `uiConfig.groupByOptions` may
   * name, so authoring "group by Vehicle" on a reference column resolves
   * instead of being silently dropped (`views/group-by.ts`). Grouping reads
   * `row[col]`, so no column type is excluded on mechanical grounds.
   */
  const listedColumnOptions = useMemo<ModuleViewGroupByOption[]>(() => {
    const listedCols = new Set(deriveColumns(config).map((c) => c.accessorKey))
    return config.systemcolumns
      .filter((c) => listedCols.has(c.col))
      .map((c) => ({ value: c.col, label: c.name }))
  }, [config])

  // The Assignee split-dropdown is generic: any blueprint with an
  // `Assignee`-typed field gets one, driven off the distinct values seen in
  // `records` (Rule 8 — no fetching, just deriving from the props already
  // in hand). Modules with no such field simply omit the control.
  const assigneeFacet = useMemo<ModuleViewAssigneeFacet | undefined>(() => {
    const field = config.systemcolumns.find((c) => c.type === 'Assignee')
    if (!field) return undefined
    const seen = new Set<string>()
    for (const record of records) {
      const value = record[field.col]
      const names = Array.isArray(value) ? value.map(String) : value ? [String(value)] : []
      for (const name of names) seen.add(name)
    }
    return {
      col: field.col,
      label: field.name,
      options: [...seen].sort(),
      optionLabel: resolveAssigneeName ? (id: string) => resolveAssigneeName(id) ?? id : undefined,
      optionDetail: resolveAssigneeDetail,
      optionAvatarUrl: resolveAssigneeAvatarUrl,
      // Only claim an identity the module actually knows about, so the You row
      // can never be a value this column has never held.
      currentUserId: currentUserId && seen.has(currentUserId) ? currentUserId : undefined,
    }
  }, [
    config,
    records,
    resolveAssigneeName,
    resolveAssigneeDetail,
    resolveAssigneeAvatarUrl,
    currentUserId,
  ])

  return { facets, searchColumns, searchPlaceholder, sortOptions, groupableOptions, listedColumnOptions, assigneeFacet }
}
