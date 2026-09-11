import type {
  EntityConfig,
  EntityRecord,
  FieldPlacement,
  FieldType,
  FilterCreateFromSearch,
  FilterDef,
  FilterExpandView,
  FilterKind,
  FilterOption,
  FilterOptionDot,
  FilterOptionsSource,
  SystemColumn,
} from './types'

/**
 * Config-driven render bridge (the keystone). Ported from Shaheer's
 * `src/runtime/config-render.ts`.
 *
 * Turns a module's CONFIG (systemcolumns + uiConfig) + records into the design
 * system's view-model — columns, kanban cards, filter facets, detail surfaces —
 * **derived from field metadata, with no per-product React**. This is what makes
 * "a module is config, not code" true, and therefore what keeps every product
 * inside one coherent design.
 *
 * Output shapes mirror the v5 template contracts (`EntityModuleData` /
 * `PipelineModuleData`); the React templates (in `@fams/v5-templates`, later
 * tasks) consume these. Pure TS — no React, no DS imports.
 */

/* ── View-model (mirrors the template contracts) ────────────────────────────── */

/**
 * Content-shape classification for a derived list column — structurally
 * IDENTICAL to `@fams/ui-kit`'s `DataTableColumnContentType` (same 4 literal
 * values), kept as an independent local union rather than an import so this
 * module's own "pure TS, no DS imports" contract (module doc above) stays
 * true. `useListColumns` (`@fams/v5-templates`) assigns a `Column`'s value
 * straight onto `DataTableColumn.contentType` — TS accepts it structurally,
 * no cast needed, because the two unions' members line up exactly.
 */
export type ColumnContentType = 'fixed-id' | 'variable-id' | 'descriptive' | 'fixed-content'

export interface Column {
  id: string
  header: string
  /** Key to read off a record. */
  accessorKey: string
  /**
   * The listcolumns placement's own named-component override, name AND
   * props (e.g. `{name:"TextView", props:{handleOverflow:true}}` for a
   * truncating title cell) — mirrors `Cell.component`'s "carry the whole
   * object, not just the name" fix, for the same reason: a consumer
   * resolving the renderer by name needs somewhere to read `props` from.
   * Previously this was a bare `c.component?.name` string, which is why a
   * listcolumns-level override with `props` (or one with no systemcolumn-
   * level counterpart) had no way to reach the list table's cell renderer.
   */
  component?: { name: string; props?: Record<string, unknown> }
  sortable?: boolean
  /**
   * Feeds `DataTable`'s per-column truncation AND its viewport-driven
   * auto-hide priority (`useDataTableResponsiveColumns`, text-truncation.md
   * §8) — see `ColumnContentType`'s doc comment. Derived automatically from
   * the field's own `FieldType` (`deriveContentType` below), so every
   * column reaching a `DataTable` through this composer carries a real
   * classification instead of silently falling to the hook's
   * `DEFAULT_HIDE_TIER` — the exact root cause of run 2026-09-05's C1: an
   * unclassified column hides FIRST as the container narrows, which is how
   * a row's own identity column (PM's SERVICE) disappeared before this.
   * `uniqueidentifier` is always `'fixed-id'` regardless of its declared
   * type — it is the platform's identity slot on every module.
   */
  contentType?: ColumnContentType
}

/**
 * Default `Column.contentType` by the field's `FieldType` — the "reachable
 * for every table on the platform" half of the C1 fix (run 2026-09-05, W9):
 * short fixed-format values (numbers, dates, booleans, single-choice enums —
 * exactly PM's SERVICE/STATUS shape) are never auto-hidden or truncated;
 * reference-ish columns wrap-then-middle-truncate; everything else keeps
 * today's plain/free-text treatment. A blueprint that needs to diverge from
 * this default may still set `FieldPlacement`/systemcolumn metadata the
 * platform doesn't read yet — this is a sensible default, not a lock.
 */
/**
 * Every `FieldType` -> its column hide-tier, for
 * `useDataTableResponsiveColumns`. **Deliberately TOTAL, not `Partial`**: a
 * missing entry silently falls to `DEFAULT_HIDE_TIER = 0` (hide FIRST), which
 * is the exact root cause of the 1280px defect where a `SmallText` title
 * column — the row's identity — was the first thing dropped. Typing it total
 * makes TypeScript fail the build when a new `FieldType` is added without a
 * decision here, so the next person cannot reintroduce the bug by omission.
 *
 * Tiers (`ui-kit`'s `useDataTableResponsiveColumns`): `fixed-content` and
 * `fixed-id` are never auto-hidden; `variable-id` hides after `descriptive`;
 * `descriptive` hides first.
 */
const CONTENT_TYPE_BY_FIELD_TYPE: Record<FieldType, ColumnContentType> = {
  // Compact, self-sized values — never worth hiding, they cost little width.
  Numeric: 'fixed-content',
  Number: 'fixed-content',
  Currency: 'fixed-content',
  Date: 'fixed-content',
  DateTime: 'fixed-content',
  Boolean: 'fixed-content',
  Color: 'fixed-content',
  SingleSelect: 'fixed-content',
  // Identity-bearing short text: a row without it cannot be told apart, so it
  // is protected like an id rather than treated as prose.
  Auto: 'fixed-id',
  SmallText: 'fixed-id',
  Email: 'fixed-id',
  Phone: 'fixed-id',
  // Reference-ish: meaningful but restatable elsewhere.
  SingleReference: 'variable-id',
  MultiReference: 'variable-id',
  tags: 'variable-id',
  Assignee: 'variable-id',
  MultiSelect: 'variable-id',
  // Genuinely long prose — the only things that should give way first.
  BigText: 'descriptive',
  LongText: 'descriptive',
}

function deriveContentType(col: string, type: FieldType | undefined): ColumnContentType | undefined {
  if (col === 'uniqueidentifier') return 'fixed-id'
  return type ? CONTENT_TYPE_BY_FIELD_TYPE[type] : undefined
}

export interface Cell {
  col: string
  label: string
  value: unknown
  pos?: 'left' | 'right'
  /** Visual row grouping — cells sharing an `order` render in the same row (v5 parity: `groupRows`). */
  order?: number
  /**
   * The field placement's own named-component override, name AND props
   * (e.g. `{name:"StatusPill", props:{color:"#f79009", icon:"refresh"}}` for
   * the kanban card's "Reopened" flag, figma-spec-kanban.md §6). Previously
   * this only carried `p.component?.name` (a bare string), which silently
   * dropped the placement's own `props` — a consumer resolving the renderer
   * by this name still had nowhere to read `color`/`icon`/etc. from, since
   * those live on `descriptor.component.props` (the SYSTEMCOLUMN's own
   * default component, a different, unrelated object) not on this `Cell`.
   * Carrying the full object here is what lets a per-placement override
   * (kanbanCard/listcolumns-level, not the field's own default) render with
   * its authored props intact.
   */
  component?: { name: string; props?: Record<string, unknown> }
}

export interface CardModel {
  id: string
  stageId: string
  ticketId?: string
  title?: string
  /** Cover image URL, resolved from `kanbanCard.image.col` (empty → text-only). */
  imageUrl?: string
  /** Point location `[lat, lng]` for the hybrid map, from `uiConfig.map.lat/lngCol`. */
  location?: [number, number]
  /** Zone id for the hybrid map, from `uiConfig.map.zoneCol` (references a map zone). */
  zoneId?: string
  /**
   * Card-level highlight color, resolved from `kanbanCard.highlight.col` —
   * a raw runtime color (never a token/hardcoded value; see `UiConfig.
   * kanbanCard.highlight`'s JSDoc). `undefined` when the config carries no
   * `highlight` binding, or the record's value at that column is empty.
   */
  highlightColor?: string
  /** Config-resolved cells, grouped as in the kanbanCard config. */
  header: Cell[]
  body: Cell[]
  footer: Cell[]
  /**
   * The raw record this card was derived from — carried through so a template
   * consuming a `CardModel` (e.g. `v5-templates`' `KanbanCardView`) can read
   * field renderers straight off the source record instead of reconstructing
   * one from `header`/`body`/`footer` cells (which only round-trips the
   * fields the kanbanCard config happens to place on the card).
   */
  record: EntityRecord
}

export interface FilterFacet {
  col: string
  label: string
  /** 'select' | 'boolean' | 'date' | 'reference' … derived from the field type. */
  type: string
  /**
   * Allowed values for select/status facets — the LEGACY flat list, still
   * the exact array it has always been (raw stored values, no labels). Every
   * shipped consumer (`ModuleViewFilters`, `buildLiveFilterGroups`) reads
   * this; v2 renderers read `optionDefs` instead.
   */
  options?: string[]

  // ── v2 (mirrors `FilterDef`'s v2 fields; see `types.ts` for the docs) ──

  /** Resolved from `FilterDef.kind`, else derived from the column metadata. */
  kind?: FilterKind
  /** Resolved multi/single selection. `false` ⇒ radio + auto-close. */
  multiple?: boolean
  /** Where `optionDefs` came from (or would come from, for `'records'`). */
  optionsFrom?: FilterOptionsSource
  /**
   * The RICH option list — labels, tag categories, status colours, counts.
   * Deliberately a separate field from `options` (which is `string[]` and
   * load-bearing for shipped callers) rather than a widening of it.
   * `undefined` for `optionsFrom: 'records'`: the composer is record-free,
   * so the host resolves referenced records itself.
   */
  optionDefs?: FilterOption[]
  categoryCol?: string
  /** Lucide icon name; always set (falls back to `'filter'`) so the 24px slot renders. */
  icon?: string
  /** `true` only for `kind: 'entity'` fields that opted in. */
  expandable?: boolean
  expandView?: FilterExpandView
  createFromSearch?: FilterCreateFromSearch
  showCounts?: boolean
  optionDot?: FilterOptionDot
}

export interface DetailModel {
  title: unknown
  details: Cell[]
  /** `FieldGrid` label-column width for `details`, from `uiConfig.profile.layout.labelWidth` (undefined → the template's own default). */
  detailsLabelWidth?: string
  /** `FieldGrid` `emphasis` for `details`, from `uiConfig.profile.layout.fieldEmphasis` (undefined → `FieldGrid`'s own `'regular'` default). */
  detailsFieldEmphasis?: 'regular' | 'strong'
  /** Identity-rail section label — `uiConfig.profile.infoTitle`, or the matching `identityVariants[].infoTitle`. */
  infoTitle?: string
  /** Identity-rail placeholder glyph name — `uiConfig.profile.placeholderIcon`, or the matching `identityVariants[].placeholderIcon`. */
  placeholderIcon?: string
  sections: {
    /** Stable identity, from the blueprint section's own `id` (falls back to `name` when absent — hand-authored test fixtures often omit it). */
    id: string
    name: string
    fields: Cell[]
    /** Named section renderer to use INSTEAD OF the default `FieldGrid` of `fields` — see `ProfileSection.component` in `types.ts`. */
    component?: string
    /** Opaque props for `component` — field-key indirection the renderer itself defines. */
    componentProps?: Record<string, unknown>
    /** `FieldGrid` label-column width override for this section's own `FieldGrid` (ignored when `component` is set). */
    labelWidth?: string
    /** `FieldGrid` `emphasis` override for this section's own `FieldGrid` (ignored when `component` is set). */
    fieldEmphasis?: 'regular' | 'strong'
    /** Blueprint `ProfileSection.visibleWhen` passed through — `TaskDetail` evaluates it with `{ user, task: record }` and hides the section when false. */
    visibleWhen?: import('./types').Condition
  }[]
  rightPanelTabs: {
    key: string
    title: string
    component?: string
    /**
     * Opaque props for `component` — the same field-key indirection the
     * SECTION renderers above already carry. Without this a blueprint could
     * name a generic tab component but never tell it WHICH field to render,
     * so every generic tab body degraded to the "not wired yet" placeholder
     * and the only tabs that could ever work were bespoke per-app ones.
     */
    componentProps?: Record<string, unknown>
  }[]
}

export interface EntityModuleData {
  columns: Column[]
  rows: EntityRecord[]
  filters: FilterFacet[]
  searchColumns: string[]
  toDetail: (record: EntityRecord) => DetailModel
}

export interface PipelineStage {
  id: string
  label: string
  color?: string
}

export interface MapZoneShape {
  id: string
  points: [number, number][]
  color?: string
  label?: string
}

export interface PipelineModuleData {
  stages: PipelineStage[]
  cards: CardModel[]
  columns: Column[]
  filters: FilterFacet[]
  searchColumns: string[]
  toDetail: (record: EntityRecord) => DetailModel
  onCardMove?: (cardId: string, toStageId: string) => void
  /** Hybrid-map config (from `uiConfig.map`). */
  mapCenter?: [number, number]
  mapZones?: MapZoneShape[]
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function fieldName(config: EntityConfig, col: string): string {
  return config.systemcolumns.find((c) => c.col === col)?.name ?? col
}

function resolveCell(config: EntityConfig, record: EntityRecord, p: FieldPlacement): Cell {
  return {
    col: p.col,
    label: p.name ?? fieldName(config, p.col),
    value: record[p.col],
    pos: p.pos,
    order: p.order,
    component: p.component,
  }
}

/** Empty per the same `!= null && !== ''` convention `deriveCard` already applies to `imageUrl`/`zoneId`/`highlightColor`. */
function isEmptyCellValue(value: unknown): boolean {
  return value == null || value === ''
}

/** Columns from listcolumns (preferred) or, failing that, the systemcolumns. */
export function deriveColumns(config: EntityConfig): Column[] {
  const source: FieldPlacement[] =
    config.listcolumns.length > 0
      ? config.listcolumns
      : config.systemcolumns.map((c) => ({ col: c.col, id: c.id }))
  return source.map((c) => ({
    // Prefer the placement's stable id; fall back to the storage slot key so a
    // column always has a stable identity even in the systemcolumns fallback.
    id: c.id ?? c.col,
    // Honor an explicit per-column label (like detail placements do); else fall
    // back to the field name, else the raw key — so built-in cols such as
    // `uniqueidentifier` can present a friendly header (e.g. "Plan ID").
    header: c.name ?? fieldName(config, c.col),
    accessorKey: c.col,
    component: c.component,
    sortable: true,
    contentType: deriveContentType(c.col, config.systemcolumns.find((sc) => sc.col === c.col)?.type),
  }))
}

/** A kanban card, fully derived from the kanbanCard config + the record. */
export function deriveCard(config: EntityConfig, record: EntityRecord): CardModel {
  const kc = config.uiConfig.kanbanCard
  // Drop empty-valued placements entirely rather than resolving them into a
  // Cell that some downstream renderer then shows as a literal "–"
  // placeholder (figma-spec-kanban.md §3/§6: a non-reopened card has NO
  // filler row between the ID/priority row and the title — the "Reopened"
  // status-badge slot renders nothing at all when unset, not a dash). One
  // fix here covers every kanbanCard placement (header/body/footer) instead
  // of requiring every current AND future field renderer to individually
  // remember to return `null` for an empty value.
  const group = (ps?: FieldPlacement[]) =>
    (ps ?? [])
      .map((p) => resolveCell(config, record, p))
      .filter((cell) => !isEmptyCellValue(cell.value))
  const imageVal = kc?.image ? record[kc.image.col] : undefined
  const mp = config.uiConfig.map
  const lat = mp?.latCol != null ? Number(record[mp.latCol]) : NaN
  const lng = mp?.lngCol != null ? Number(record[mp.lngCol]) : NaN
  const zoneVal = mp?.zoneCol != null ? record[mp.zoneCol] : undefined
  const highlightVal = kc?.highlight ? record[kc.highlight.col] : undefined
  return {
    id: record.id,
    stageId: (record.status as string) ?? '',
    ticketId: record.uniqueidentifier,
    title: record.title,
    imageUrl: imageVal != null && imageVal !== '' ? String(imageVal) : undefined,
    location: Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : undefined,
    zoneId: zoneVal != null && zoneVal !== '' ? String(zoneVal) : undefined,
    highlightColor: highlightVal != null && highlightVal !== '' ? String(highlightVal) : undefined,
    header: group(kc?.header),
    body: group(kc?.body),
    footer: group(kc?.footer),
    record,
  }
}

const REFERENCE_TYPES = new Set(['SingleReference', 'MultiReference', 'tags'])
const DATE_TYPES = new Set(['Date', 'DateTime'])
/** Above this many `listValues`, an inline checkbox group stops being usable. */
const CHECKBOX_GROUP_MAX = 8

/** `kind` when the blueprint did not state one — purely from column metadata. */
function deriveFilterKind(f: FilterDef, def: SystemColumn | undefined): FilterKind {
  if (f.kind) return f.kind
  if (f.boolean) return 'checkbox-group'
  if (f.col === 'status') return 'status'
  if (def && DATE_TYPES.has(def.type)) return 'date'
  if (def && REFERENCE_TYPES.has(def.type)) return 'entity'
  if (def?.type === 'SingleSelect' && (def.listValues?.length ?? 0) <= CHECKBOX_GROUP_MAX) {
    return 'checkbox-group'
  }
  return 'multi-select'
}

/** `optionsFrom` when the blueprint did not state one. */
function deriveOptionsSource(
  f: FilterDef,
  kind: FilterKind,
  def: SystemColumn | undefined,
): FilterOptionsSource | undefined {
  if (f.optionsFrom) return f.optionsFrom
  if (f.options?.length) return 'inline'
  // A boolean filter's two labels are its option list, whatever the column
  // metadata happens to carry.
  if (f.boolean) return 'inline'
  if (kind === 'status') return 'statusList'
  if (kind === 'entity') return 'records'
  if (kind === 'date') return undefined
  if (def?.listValues?.length) return 'listValues'
  return undefined
}

/**
 * Filter facets from uiConfig.filters, typed from the field metadata.
 *
 * Backward compatibility contract: `col`/`label`/`type`/`options` are
 * computed exactly as they were before `FilterDef` v2 existed, so a
 * blueprint that sets none of the v2 fields resolves to the same facet it
 * always did, plus v2 fields DERIVED from the same metadata (additive keys —
 * `deriveFilters.test.ts`'s legacy-parity test pins this).
 */
export function deriveFilters(config: EntityConfig): FilterFacet[] {
  const statusList = config.uiConfig.statusList
  const statusKeys = statusList.map((s) => s.key)
  return (config.uiConfig.filters ?? []).map((f) => {
    const def = config.systemcolumns.find((c) => c.col === f.col)
    const type = f.boolean ? 'boolean' : f.col === 'status' ? 'select' : (def?.type ?? 'text')
    const options = f.col === 'status' ? statusKeys : (def?.listValues ?? undefined)

    const kind = deriveFilterKind(f, def)
    const optionsFrom = deriveOptionsSource(f, kind, def)

    let optionDefs: FilterOption[] | undefined
    if (optionsFrom === 'inline') {
      optionDefs =
        f.options ??
        (f.boolean
          ? [
              { value: 'true', label: f.booleanOptions?.trueLabel ?? 'Yes' },
              { value: 'false', label: f.booleanOptions?.falseLabel ?? 'No' },
            ]
          : undefined)
    } else if (optionsFrom === 'statusList') {
      // D-5: the option dot's colour is `chipColor ?? color` — resolved here
      // once, so no consumer re-reads `statusList` (and no status vocabulary
      // ever reaches the design system).
      optionDefs = statusList.map((s) => ({
        value: s.key,
        label: s.label,
        color: s.chipColor ?? s.color,
      }))
    } else if (optionsFrom === 'listValues') {
      optionDefs = (def?.listValues ?? []).map((v) => ({ value: v, label: v }))
    } else if (optionsFrom === 'records' && kind === 'tags' && f.options?.length) {
      /*
       * FIX WAVE C-4 / P0-1 — a `tags` facet's OPTION SET comes from the
       * records (the host's `tags-facet.ts` derives the distinct values it
       * sees), so a chip can never match zero records. Authored `options` on
       * such a facet are therefore not the set: they are METADATA about values
       * (`label`, `category`, `color`) that the host merges over the values
       * that actually exist, and ignores for the ones that do not. Passing
       * them through is what keeps the human-meaningful category grouping in
       * metadata, where it belongs (a records column cannot carry it — it
       * describes the RECORD's category, never the TAG's).
       */
      optionDefs = f.options
    }
    // `records`: resolved by the host from the referenced entity — the
    // composer has no records here, so `optionDefs` stays undefined.

    const counts = f.showCounts ? optionCounts(f) : undefined
    if (optionDefs && counts) {
      optionDefs = optionDefs.map((o) =>
        typeof counts[o.value] === 'number' ? { ...o, count: counts[o.value] } : o,
      )
    }

    return {
      col: f.col,
      label: f.name ?? def?.name ?? f.col,
      type,
      options,
      kind,
      multiple: f.multiple ?? (kind === 'date' || kind === 'single-select' ? false : true),
      optionsFrom,
      optionDefs,
      categoryCol: f.categoryCol,
      icon: f.icon ?? 'filter',
      expandable: kind === 'entity' && f.expandable === true,
      expandView: f.expandView,
      createFromSearch: f.createFromSearch,
      showCounts: f.showCounts,
      optionDot: f.optionDot ?? (kind === 'status' ? 'status' : false),
    }
  })
}

/**
 * Counts the composer already knows: authored inline on the options
 * themselves. Record-derived counts belong to the host (which holds the
 * records); this only surfaces what the blueprint stated.
 */
function optionCounts(f: FilterDef): Record<string, number> | undefined {
  if (!f.options?.length) return undefined
  const out: Record<string, number> = {}
  let any = false
  for (const o of f.options) {
    if (typeof o.count === 'number') {
      out[o.value] = o.count
      any = true
    }
  }
  return any ? out : undefined
}

/**
 * One list-view stat-card tile, with `value` already computed — the pure
 * (no-React) half of `uiConfig.listSummary`'s derivation. `@fams/v5-
 * templates`'s `V5ModuleSurface` maps `icon`/`tone` onto a real `LucideIcon`
 * + `IconBadgeTone` and hands the result straight to `ListView.summaryTiles`
 * (see that prop's "Blueprint contract" doc in `ListView.tsx`).
 */
export interface SummaryTileModel {
  id: string
  label: string
  value: string
  icon?: string
  tone?: string
  iconColor?: string
  iconBg?: string
}

function matchesSummaryFilter(
  record: EntityRecord,
  filter: { col: string; equals?: unknown; in?: unknown[] },
): boolean {
  const value = (record as Record<string, unknown>)[filter.col]
  if (filter.in) return filter.in.includes(value)
  if (filter.equals !== undefined) return value === filter.equals
  return true
}

/**
 * Derives `uiConfig.listSummary`'s tiles into their rendered `value`s — each
 * tile counts the records matching its (optional) `filter`, or every record
 * when `filter` is omitted. Returns `[]` when the config carries no
 * `listSummary` (the caller renders no stat-card row at all, matching
 * `ListView.summaryTiles`'s "omit → no row" contract).
 */
export function deriveSummaryTiles(config: EntityConfig, records: EntityRecord[]): SummaryTileModel[] {
  const tiles = config.uiConfig.listSummary
  if (!tiles?.length) return []
  return tiles.map((t) => ({
    id: t.id,
    label: t.label,
    value: String(t.filter ? records.filter((r) => matchesSummaryFilter(r, t.filter!)).length : records.length),
    icon: t.icon,
    tone: t.tone,
    iconColor: t.iconColor,
    iconBg: t.iconBg,
  }))
}

/** The detail surface, derived from uiConfig.profile. */
export function deriveDetail(config: EntityConfig, record: EntityRecord): DetailModel {
  const p = config.uiConfig.profile
  if (!p) {
    return { title: record.title, details: [], sections: [], rightPanelTabs: [] }
  }
  // `detailHidden` sections exist ONLY to control the CREATE sheet's field
  // order/pairing for fields that are ALSO placed in `p.details` (the top
  // grid) — showing them here too would duplicate those fields in a second
  // accordion (see `ProfileSection.detailHidden`'s doc comment in types.ts).
  const orderedSections = [...p.sections]
    .filter((s) => !s.detailHidden)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  // Identity-rail VARIANT (see `ProfileIdentityVariant` in `types.ts`): the
  // first variant whose `whenField` value is in `whenEquals` wins and its
  // `details`/`infoTitle`/`placeholderIcon` replace the defaults. A plain
  // field match rather than a rule `Condition`, because this discriminates on
  // the RECORD's own shape and so needs no user scope to evaluate.
  const variant = (p.identityVariants ?? []).find((v) => {
    const actual = record[v.whenField]
    return v.whenEquals.some((expected) => String(actual ?? '') === String(expected))
  })
  return {
    title: record[p.title.col],
    details: (variant?.details ?? p.details).map((d) => resolveCell(config, record, d)),
    detailsLabelWidth: p.layout?.labelWidth,
    detailsFieldEmphasis: p.layout?.fieldEmphasis,
    infoTitle: variant?.infoTitle ?? p.infoTitle,
    placeholderIcon: variant?.placeholderIcon ?? p.placeholderIcon,
    sections: orderedSections.map((s, index) => ({
      id: s.id ?? `section-${index}`,
      name: s.name,
      fields: [...s.fields]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((f) => resolveCell(config, record, f)),
      component: s.component?.name,
      componentProps: s.component?.props,
      labelWidth: s.layout?.labelWidth,
      fieldEmphasis: s.layout?.fieldEmphasis,
      visibleWhen: s.visibleWhen,
    })),
    rightPanelTabs: (p.rightPanel?.tabs ?? []).map((t) => ({
      key: t.key,
      title: t.title,
      component: t.component?.name,
      componentProps: t.component?.props,
    })),
  }
}

/* ── Module-data builders (what the templates consume) ──────────────────────── */

export function buildEntityModuleData(
  config: EntityConfig,
  records: EntityRecord[],
): EntityModuleData {
  return {
    columns: deriveColumns(config),
    rows: records,
    filters: deriveFilters(config),
    searchColumns: config.uiConfig.search?.columns ?? ['title'],
    toDetail: (r) => deriveDetail(config, r),
  }
}

export function buildPipelineModuleData(
  config: EntityConfig,
  records: EntityRecord[],
  opts?: { onCardMove?: (cardId: string, toStageId: string) => void },
): PipelineModuleData {
  return {
    stages: config.uiConfig.statusList.map((s) => ({ id: s.key, label: s.label, color: s.color })),
    cards: records.map((r) => deriveCard(config, r)),
    columns: deriveColumns(config),
    filters: deriveFilters(config),
    searchColumns: config.uiConfig.search?.columns ?? ['title'],
    toDetail: (r) => deriveDetail(config, r),
    onCardMove: opts?.onCardMove,
    mapCenter: config.uiConfig.map?.center,
    mapZones: config.uiConfig.map?.zones,
  }
}
