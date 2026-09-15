/**
 * v5 composer — core data shapes (React-free, pure TS).
 *
 * Ported from Shaheer's `src/sim/engine/types.ts` and merged with v5's real
 * `entityconfig` facts (see the blueprint schema + docs). These are the shapes
 * the runtime consumes: the in-memory data store registers `EntityConfig`s,
 * the rules evaluator reads `PipelineRules` + `UserContext`, and the config →
 * view-model bridge (`config-render.ts`) derives columns/cards/detail from
 * `UiConfig`. No React, no DS imports.
 *
 * `id` (stable identity) is OPTIONAL on these runtime shapes — the runtime keys
 * off `col`/`key`/`code`, never `id`. The stable-ID rule is a *contract*
 * requirement enforced by `validateBlueprint` (see `validate.ts`), not a
 * runtime one; the authored blueprint types in `blueprint-schema.ts` require it.
 */

/**
 * Field descriptor type. Merges Shaheer's set with v5's real frontend type
 * set. Aliases are intentional and both accepted (v5 uses both forms):
 *   - `BigText` ≡ `LongText`  (multiline text)
 *   - `Numeric` ≡ `Number`    (numeric input)
 * `Currency` is retained from Shaheer's set (v5 derives currency from a
 * `Numeric` + format, but keeping it avoids breaking ported configs).
 *
 * `Color` and `Assignee` are NOT first-class v5 types — v5 derives them from a
 * field's name / `refModule=Users`. They are modeled here as OPTIONAL explicit
 * types because the blueprint is the forward-looking contract; see the mapping
 * note in `blueprint-schema.ts`.
 */
export type FieldType =
  | 'Auto'
  | 'SmallText'
  | 'BigText'
  | 'LongText'
  | 'Email'
  | 'Phone'
  | 'Numeric'
  | 'Number'
  | 'Currency'
  | 'Boolean'
  | 'SingleSelect'
  | 'MultiSelect'
  | 'SingleReference'
  | 'MultiReference'
  | 'Date'
  | 'DateTime'
  | 'tags'
  | 'Color'
  | 'Assignee'

/** The kind of thing a reference points at (v5's real `refModule` domain). */
export type ReferenceKind = 'Entity' | 'Tag' | 'Users'

export interface SystemColumn {
  /**
   * Storage slot key: `title` | `status` | `uniqueidentifier` | `tags` |
   * `systemcol1..N` | `usercol1..N`.
   */
  col: string
  name: string
  type: FieldType
  /** Stable identity (contract-required; default convention `fld_<col>`). */
  id?: string
  /**
   * Catalog section this field belongs to in the columns chooser, e.g.
   * `Asset – Basic Info` / `Device – Technical` / `Workforce – Contact`
   * (SPEC v2 §2.6 groups the OFF fields under uppercase category headers).
   * Consumed as `ColumnCatalogItem.group`; absent → the caller's default
   * bucket. Purely presentational — never affects storage or resolution.
   */
  group?: string
  required?: boolean
  unique?: boolean
  default?: unknown
  listValues?: string[]
  /** Reference domain for Single/MultiReference (Entity | Tag | Users). */
  refModule?: ReferenceKind
  /** For `refModule: 'Entity'` — the referenced entity code, e.g. `crm/companies`. */
  entityType?: string
  /** Append-only field (v5 audit fields). */
  append?: boolean
  /** Numeric bounds for `Numeric`/`Number`. */
  min?: number
  max?: number
  /**
   * Display unit appended after a numeric read value (`5,061 km`, `2,986 hrs`,
   * `1,200 AED`). Column-level metadata: it travels onto every descriptor for
   * this column, so EVERY surface that reads the field (list cell, detail row,
   * kanban card) prints the same unit without each placement restating it.
   * Lowest-precedence source — `compileFieldSet`'s `units` option and a
   * `component.props.unit`/`suffix` both still win over it (see
   * `fields/compiler.ts`'s `toDescriptor`). Absent = today's bare number.
   */
  unit?: string
  /**
   * Field-level creation-form visibility (distinct from `UiConfig.creation`'s
   * FORM-level layout/chrome knobs above — this is per-FIELD). `hidden: true`
   * excludes this field from every `computeCreationGroups` bucket (`@fams/
   * v5-templates`'s `grouping.ts`) — the implicit "Basic Info"/trailing
   * "Details" catch-all AND any `profile.sections` placement — while leaving
   * every OTHER surface (detail grid, a section, kanban/list) completely
   * unaffected, since only the create-sheet grouping consults this. The
   * scalpel for a field that's genuinely needed elsewhere (e.g. a `profile.
   * sections` placement load-bearing for the detail accordion) but shouldn't
   * also surface in the create form (figma-spec-create-sheet.md's exact
   * field list vs. an "Assigned Driver" section whose Name/Phone fields read
   * as duplicates of the create form's own Customer Name/Phone Number
   * fields) — hiding every field a section places is what removes that
   * section from create entirely (an empty section renders nothing).
   *
   * `autofill` — see `FieldDescriptor.creation` in `fields/types.ts` for the
   * full contract; mirrored here since this is the authored (blueprint) shape
   * the compiler reads it from.
   */
  creation?: {
    hidden?: boolean
    autofill?: { whenCol: string; equals?: unknown; value?: unknown; map?: Record<string, unknown>; template?: string }
  }
}

export interface StatusDef {
  /** The stored status value written to `record.status`. */
  key: string
  label: string
  color: string
  /** Stable identity (contract-required; default convention `sts_<key>`). */
  id?: string
  bgColor?: string
  chipColor?: string
  /**
   * Semantic lifecycle tone (`neutral|info|warning|success|danger`) — the
   * DS-token-driven reading of this stage, distinct from `color` (the raw
   * hex escape hatch). When present, renderers should prefer resolving the
   * stage's visual treatment from this token over `color`; `color` stays
   * populated (kept in sync with the token's hex) for callers/surfaces that
   * haven't been wired to consume `tone` yet.
   */
  tone?: 'neutral' | 'info' | 'warning' | 'success' | 'danger'
  /**
   * Text color override for `color`'s solid fill — only needed when the
   * stage's `color` is light enough (e.g. an amber/warning-family hex) that
   * the default white pill text fails WCAG AA. DS-token hex, never a design
   * decision made in a component.
   */
  textColor?: string
  /**
   * When moving TO this stage, first collect data via a side-sheet form (e.g.
   * completing a job opens a "Maintenance Report"). Plain field shape (no DS
   * imports); the renderer maps it to the DS SchemaForm.
   */
  transitionForm?: {
    title?: string
    submitLabel?: string
    fields: {
      key: string
      label: string
      type?: string
      placeholder?: string
      required?: boolean
      options?: { label: string; value: string }[]
    }[]
  }
}

export interface FieldPlacement {
  col: string
  /** Stable identity (contract-required; default convention `fld_<col>`). */
  id?: string
  pos?: 'left' | 'right'
  order?: number
  showLabel?: boolean
  name?: string
  component?: { name: string; props?: Record<string, unknown> }
}

export interface ProfileSection {
  name: string
  order: number
  fields: FieldPlacement[]
  /** Stable identity (contract-required; default convention `sec_<slug>`). */
  id?: string
  /**
   * Opt this whole section into a named, registered SECTION renderer (e.g.
   * `LocationMapSection`/`NotesSection`/`BeforePhotosSection`,
   * figma-spec-detail.md §§4–7) instead of the default label/value
   * `FieldGrid` of `fields` — resolved via `@fams/v5-templates`'s
   * `getSectionComponentRenderer(name)`. `props` is opaque field-key
   * indirection the renderer defines (e.g. `{centerField: "locationCenter"}`),
   * never a hardcoded business shape. `fields` may be empty when a section
   * carries a `component` (the renderer reads the record directly).
   */
  component?: { name: string; props?: Record<string, unknown> }
  /**
   * Per-section layout overrides for the default `FieldGrid` rendering.
   * `fieldEmphasis` threads straight to `FieldGrid`'s own `emphasis` prop
   * (see its doc comment) — `'strong'` for a section whose OWN Figma source
   * confirms `Gilroy:SemiBold` labels/values (e.g. the incident Task Detail
   * sheet, SPEC `task-detail-29-42895`), omitted/`'regular'` to keep every
   * other section's existing look.
   */
  layout?: { labelWidth?: string; fieldEmphasis?: 'regular' | 'strong' }
  /**
   * Show this section's own `name` as a heading when it renders inside the
   * CREATE sheet's `layout="flat"` grouping (`computeCreationGroups`,
   * `CreationSheet.tsx`) — scoped to CREATE only, no effect on the detail
   * page's own section rendering (a separate code path that always shows
   * `name`). Default `false`/omitted: figma-spec-create-sheet.md's field
   * list has exactly ONE section heading ("Location Details") — every other
   * section flows its fields unlabeled, same as the unconditional "Basic
   * Info" bucket, so a bare `SmallText`/`BigText` field's own inline label
   * (e.g. "Note", "Upload Before Images") isn't doubled by a redundant
   * section title above it (finding: "Note" rendered twice, a lone "KPI"
   * heading floated above just the Compliance Time field).
   */
  showLabel?: boolean
  /**
   * Exclude this section from the DETAIL page's own section list
   * (`deriveDetail`/`TaskDetail.tsx` — the accordion below the top field
   * grid), while it still fully participates in the CREATE sheet's grouping
   * (`computeCreationGroups` never reads this flag — it only controls
   * `deriveDetail`). The scalpel for a section whose ONLY purpose is
   * controlling CREATE field order/pairing for fields that are ALSO placed
   * in `profile.details` (the detail page's own top field grid) — without
   * this, such a section would render a SECOND, duplicate accordion on the
   * detail page for fields already shown above (figma-spec-create-sheet.md's
   * exact field order needs "Customer Name" / "Phone Number" / "Priority
   * Level" + "Customer Language" (paired) / "Supervisor" in specific CREATE
   * positions, but all five are `profile.details`-only on the detail page —
   * see `qa/deviations.md`'s FIX-3/FIX-4 entries for the prior workaround
   * this flag replaces). Default `false`/omitted: the section renders on
   * both surfaces, exactly as before this flag existed.
   */
  detailHidden?: boolean
  /**
   * Show this section only when the given rule-evaluator `Condition` holds
   * against `{ user, task: record }` on the DETAIL page (`TaskDetail`).
   * Omit to always render. Analogous to `ProfileTab.visibleWhen`.
   */
  visibleWhen?: Condition
}

/**
 * How a filter field behaves and renders — `FilterDef` v2's discriminator,
 * replacing a `control` + `multiple` pair. Everything module-specific (the
 * status vocabulary, the tag categories, the entity columns) stays DATA on
 * the surrounding fields: no vocabulary ever lives in the composer.
 *
 * - `single-select` — one value, radio rows, auto-closes on pick.
 * - `multi-select` — checkbox rows, the default.
 * - `status` — multi + a colour dot per row (colour is data, from `statusList`).
 * - `tags` — multi + chips grouped by `categoryCol`'s value.
 * - `entity` — records of a referenced module; pairs with `expandable`.
 * - `date` — a date/range picker; never multiple.
 * - `checkbox-group` — a short flat option list rendered inline in the panel
 *   (no dropdown), for small `listValues` sets.
 *
 * Omitted ⇒ derived by `deriveFilters()`: `col === 'status'` → `status`;
 * a `SingleSelect` with ≤ 8 `listValues` → `checkbox-group`; a reference
 * column → `entity`; a `Date` column → `date`; anything else →
 * `multi-select`.
 */
export type FilterKind =
  | 'single-select'
  | 'multi-select'
  | 'status'
  | 'tags'
  | 'entity'
  | 'date'
  | 'checkbox-group'

/**
 * Where a filter field's options come from.
 * - `listValues` — the matching `systemcolumns` entry's `listValues`.
 * - `statusList` — `uiConfig.statusList[]` (key/label/colour).
 * - `records` — the referenced entity's records, resolved at render time by
 *   the host (the composer is record-free, so `deriveFilters()` marks the
 *   source and leaves `optionDefs` undefined).
 * - `inline` — the authored `FilterDef.options[]` verbatim.
 */
export type FilterOptionsSource = 'listValues' | 'statusList' | 'records' | 'inline'

/**
 * One resolved filter option. `category` groups `kind: 'tags'` chips (the
 * palette is assigned BY INDEX downstream, never by category name, so no
 * category vocabulary leaks into the DS). `color` is a raw runtime colour
 * carried from the blueprint (`StatusDef.chipColor ?? StatusDef.color`),
 * never a token name. `count` is the option's record count when the caller
 * already knows it.
 */
export interface FilterOption {
  value: string
  label: string
  category?: string
  color?: string
  count?: number
  /**
   * Scalar cells of the record this option was resolved from, keyed by column
   * — the ONLY way a compact dropdown row can render the same
   * `expandView.rowTemplate` elements (ID pill, status badge) the sheet's
   * table rows do (R-38/DN-30). Filled by the host's entity adapter; absent
   * for every facet kind whose options are not record-derived, in which case
   * the template elements it would have fed are omitted.
   */
  meta?: Record<string, string>
}

/** One column of an expandable entity selector's side-sheet table. */
export interface FilterExpandColumn {
  col: string
  label: string
  sortable?: boolean
  /** Hidden by default; revealed through the sheet's column settings. */
  hidden?: boolean
  /** Minimum rendered width in px (the sheet floors columns for h-scroll). */
  minWidth?: number
}

/**
 * Tone of a `FilterRowTemplate.statusBadge` chip. Semantic names only — the
 * renderer maps them onto `@fams/tokens` badge variants, so no raw colour
 * ever reaches the blueprint (hard rule 2) and no status VOCABULARY ever
 * reaches the design system (J.87 — the keys are the tenant's own).
 */
export type FilterRowBadgeTone = 'success' | 'warning' | 'info' | 'destructive' | 'muted'

/**
 * R-38/DN-30 — the RICH entity row: `☐ avatar · title over an ID pill ·
 * right-aligned status badge`, drawn identically by the compact dropdown and
 * by the side sheet's first table cell.
 *
 * Every member names a COLUMN of the resolved entity row (or, in the compact
 * dropdown, a key of `FilterOption.meta`). An element whose column the host
 * cannot resolve is omitted gracefully — a template is a request, never a
 * requirement, so the same template can be authored for two entities that
 * expose different columns.
 *
 * `avatar` supplies the text an initials fallback is derived from (there is
 * no image column in this model yet); omit it to fall back to `title`.
 */
export interface FilterRowTemplate {
  avatar?: string
  title: string
  subtitle?: string
  idPill?: string
  statusBadge?: { col: string; colors?: Record<string, FilterRowBadgeTone> }
}

/**
 * `'plain'` (the default) draws one cell per column, as it always did.
 * `'avatar-id-status'` is shorthand for the conventional person template
 * resolved by the renderer from what the entity adapter already provides
 * (`title` for the name, `id` for the pill, `status` for the badge). An
 * explicit `FilterRowTemplate` names the columns itself.
 */
export type FilterExpandRowTemplate = 'plain' | 'avatar-id-status' | FilterRowTemplate

/**
 * The side-sheet table config for `kind: 'entity'` + `expandable: true`.
 * `columns` is the ONLY source of the sheet's column set — the composer
 * never infers entity columns.
 */
export interface FilterExpandView {
  columns: FilterExpandColumn[]
  searchable?: boolean
  sortable?: boolean
  /** Show the per-column show/hide/reorder control. */
  columnSettings?: boolean
  /** Offer the "Selected to Top" ordering toggle. */
  selectedToTop?: boolean
  /** See `FilterExpandRowTemplate`. Omitted ⇒ `'plain'`. */
  rowTemplate?: FilterExpandRowTemplate
}

/** Create-a-record-from-the-search-query affordance inside a filter field. */
export interface FilterCreateFromSearch {
  enabled: boolean
  /** Module code of the entity to create. */
  entity: string
  /** Privilege the persona must hold; without it the CTA is not rendered. */
  requirePrivilege?: string
}

/**
 * The leading dot on an option row. `'status'` reads the option's own
 * `color` (already resolved from `chipColor ?? color`); `'tone'` maps the
 * field's `component.props.optionTone` values through the semantic tone
 * tokens; `false` renders no dot. Defaults to `'status'` for
 * `kind: 'status'`, else `false`.
 */
export type FilterOptionDot = 'status' | 'tone' | false

/**
 * Panel-level chrome for the All Filters panel. All numbers are px and are
 * clamped by the renderer against the viewport. Defaults: title
 * `'All Filters'`, `clearAll` `true`, `width` 448, `height` 660,
 * `sheetWidth` 722.
 */
export interface FiltersPanelConfig {
  title?: string
  clearAll?: boolean
  width?: number
  height?: number
  sheetWidth?: number
}

export interface FilterDef {
  col: string
  /** Stable identity (contract-required; default convention `flt_<col>`). */
  id?: string
  order?: number
  name?: string
  boolean?: boolean
  booleanOptions?: { trueLabel: string; falseLabel: string }
  userTypes?: string[]
  orgUsers?: boolean
  visibility?: { excludeRoles?: string[]; includeRoles?: string[]; requirePrivileges?: string[] }

  // ── v2 (all optional; a filter that sets none of these resolves exactly
  // as it did before these fields existed) ──────────────────────────────

  /** See `FilterKind`. Omitted ⇒ derived from the column metadata. */
  kind?: FilterKind
  /**
   * Multi vs. single selection. Defaults to `true` for every kind except
   * `date` and `single-select`. `false` ⇒ radio rows that close on pick.
   */
  multiple?: boolean
  /** See `FilterOptionsSource`. Omitted ⇒ derived alongside `kind`. */
  optionsFrom?: FilterOptionsSource
  /** The option list, for `optionsFrom: 'inline'` only. */
  options?: FilterOption[]
  /**
   * For `kind: 'tags'` — the option field carrying the chip's category. A
   * real `systemcolumns` key, never an inline literal; the chip palette is
   * assigned by index downstream, so category NAMES stay tenant data.
   */
  categoryCol?: string
  /** Kebab-case lucide icon for the field's 24px slot. Falls back to `filter`. */
  icon?: string
  /**
   * `true` ⇒ the field's dropdown offers the ⧉ trigger that opens the
   * full-table side-sheet selector. Legal only for `kind: 'entity'`.
   */
  expandable?: boolean
  /** The side-sheet table config — required for a meaningful `expandable`. */
  expandView?: FilterExpandView
  /** Offer "create <query>" from an empty search result. */
  createFromSearch?: FilterCreateFromSearch
  /** Render the per-option record-count pill. */
  showCounts?: boolean
  /** See `FilterOptionDot`. */
  optionDot?: FilterOptionDot
}

export interface ProfileTab {
  key: string
  title: string
  order: number
  component: { name: string; props?: Record<string, unknown> }
  /** Stable identity (contract-required; default convention `tab_<key>`). */
  id?: string
  /**
   * Same rule-evaluator `Condition` the pipeline rules use, evaluated with the
   * `{ user, task }` scope (`$.task.*` = the profiled RECORD). Lets ONE
   * module's blueprint carry two tab sets for two record shapes — e.g. a Live
   * Monitoring module whose `kind: "workforce"` rows show a person's tabs and
   * whose tanker rows show the asset's — without forking the module.
   * Authored here; enforced by `@fams/v5-templates`' `isProfileTabVisible`.
   */
  visibleWhen?: Condition
  /** Every listed privilege must be in `userContext.privileges` for the tab to render. */
  requiredPrivileges?: string[]
}

/**
 * One identity-rail variant (`UiConfig.profile.identityVariants`). Matches on
 * a PLAIN FIELD VALUE rather than a rule `Condition`: it discriminates on the
 * record's own shape, so it needs no `{user}` scope and stays evaluable
 * anywhere `deriveDetail` runs.
 */
export interface ProfileIdentityVariant {
  /** Record column whose value selects this variant, e.g. `"kind"`. */
  whenField: string
  /** Values of `whenField` this variant claims (stringified comparison). */
  whenEquals: (string | number | boolean)[]
  /** Replaces `profile.details` for a matching record. */
  details?: FieldPlacement[]
  /** Replaces `profile.infoTitle` for a matching record. */
  infoTitle?: string
  /** Replaces `profile.placeholderIcon` for a matching record. */
  placeholderIcon?: string
}

export interface UiConfig {
  /**
   * Optional lucide icon name in kebab-case (e.g. `"map-pin"`), resolved
   * dynamically by the consuming app's module rail (e.g. the demo env's
   * `seams.tsx`) instead of its default per-module-id icon. Distinct from
   * `listSummary[].icon`'s small closed named-glyph vocabulary above.
   */
  icon?: string
  statusList: StatusDef[]
  statusChangeRule?: Record<string, string[]>
  kanbanCard?: {
    header: FieldPlacement[]
    body: FieldPlacement[]
    footer: FieldPlacement[]
    /** Optional cover image: the column holding an image URL. */
    image?: { col: string }
    /**
     * Raw Tailwind utility classes merged (via `cn`/tailwind-merge, last
     * wins) onto the board's own scroll container — the opt-in escape hatch
     * for a module that needs a different column gap and/or leading/
     * trailing scroll-edge padding than the shared `KanbanBoard` default
     * (32px gap, figma-spec-kanban.md §2). Padding must live on the
     * SCROLLABLE element itself (not a wrapper) to still be visible at the
     * far scroll edge — this class lands exactly there. Token-scale
     * utilities only (e.g. `"gap-5 ps-5 pe-5"`), never an arbitrary value.
     * Omit → the board renders with its existing default classes, unchanged.
     */
    boardClassName?: string
    /**
     * Raw Tailwind utility classes merged onto EVERY column — the same
     * escape hatch as `boardClassName`, for a module that needs wider
     * columns than the shared `KanbanColumn` default (320px / `w-80`).
     * Omit → columns render at the existing default width, unchanged.
     */
    columnClassName?: string
    /**
     * Optional card-level highlight: the column holding a raw runtime color
     * (e.g. `"#f79009"`) for the card's own shell — figma-spec-kanban.md §6's
     * full-border card-highlight state ("Reopened" in the sample data, but
     * this is a GENERIC flag/color slot, never a hardcoded concept: any
     * record-level reason for flagging a card — reopened, escalated, SLA
     * breach — sets this column to a color; an empty/falsy value renders no
     * highlight). Consumed by `deriveCard`'s `CardModel.highlightColor`,
     * which `@fams/v5-templates`' `KanbanCardView` threads onto `@fams/
     * ui-kit`'s `KanbanCard.highlightColor` prop. Pair it with a `header`
     * placement using `component: {name: "StatusPill", props: {color: …}}`
     * (see `fields/renderers.tsx`'s `ReadStatusPill`) for the matching solid
     * status chip — the two are independent placements, not auto-linked, so
     * a card can carry one, the other, or both.
     */
    highlight?: { col: string }
  }
  /**
   * Optional geo binding for the map-bearing views. `latCol`/`lngCol` are
   * the minimum viable binding; their PRESENCE is also the switch that makes
   * the module's `hybrid` view kind render as the live list+map hybrid
   * (`LiveHybridView`) instead of the list+detail split, and gives the
   * `map` view kind a real map body (`MapView`) — both in
   * `@fams/v5-templates`' `ModuleView`. The remaining `*Col` bindings are
   * the live-monitoring vocabulary (figma live-monitoring spec §1.3): each
   * names the systemcolumn `col` whose per-record value feeds that marker/
   * popup facet. All optional — an unbound facet simply doesn't render.
   */
  map?: {
    center?: [number, number]
    latCol?: string
    lngCol?: string
    zoneCol?: string
    zones?: {
      id: string
      points: [number, number][]
      color?: string
      label?: string
      parent?: string
      /**
       * Free-form tag labels backing the zones drawer's tag-filter buttons
       * (SPEC v2 3.20). Presentational/filtering only.
       */
      tags?: string[]
    }[]
    /**
     * RECORD-GEOMETRY map bindings — the generic "these records live on a
     * map" declaration (SPEC §1.3's Hybrid lens). Its PRESENCE is what makes
     * the module's `hybrid` view kind render `@fams/v5-templates`'
     * `MapHybridView` (list pane + record map) instead of the fleet-flavoured
     * `LiveHybridView`, whose remaining `*Col` bindings above are the
     * live-monitoring vehicle vocabulary.
     *
     * Geometry is PER RECORD and never a mode: a record with a
     * `latCol`/`lngCol` pair draws a pin, a record whose `zoneCol` value
     * names one of `zones` draws that polygon, and a record carrying both
     * draws both — the two Figma frames ("Only Task Locations" /
     * "Zone Based Tasks") are therefore two DATA shapes of one lens, not two
     * lenses (see `PLATFORM-MODEL.md`: compositions, never new primitives).
     */
    records?: {
      /**
       * The column whose per-record value keys the pin/polygon colour, plus
       * that column's value→colour map in legend order (e.g. Priority →
       * High/Medium/Low). `color` may be a hex literal OR a `var(--token)`
       * reference: the DOM chrome (legend swatch, chips) gets the token
       * verbatim while the GPU map layer gets it RESOLVED (`map/color.ts`),
       * which is the one thing a WebGL layer cannot do for itself.
       */
      colorBy?: {
        col: string
        values?: { value: string; label?: string; color: string }[]
        /** Colour for records whose value matches no entry. */
        fallbackColor?: string
        /** Legend heading. Defaults to the column's own field label. */
        legendTitle?: string
        /**
         * `false` renders the legend as a STATIC key (swatches, no
         * checkboxes) instead of a filter — it is dual-purpose and must
         * render either way (UX note E.32). Defaults to `true`.
         */
        filterable?: boolean
      }
      /** Polygon fill opacity. Defaults to `0.12` (SPEC §1.3 Mode B). */
      fillOpacity?: number
      /** Pin radius in pixels. Defaults to `7` (SPEC §1.3's ~14px circle). */
      radius?: number
      /**
       * Declarative in-panel toolbar for the record-map hybrid's list pane
       * (SPEC `pipelines-hybrid-29-41808` §1.1 + Addendum). Presence turns
       * the toolbar on; each key opts one control in. The template derives
       * the actual facets/options from the SAME blueprint derivations the
       * page-level toolbar uses (`deriveFilters`/`deriveColumns`) — this
       * block only declares WHICH controls render, never a second
       * vocabulary. When set, the module's page-level toolbar row is
       * suppressed on the hybrid lens (the controls live in-panel instead —
       * same pattern as live-monitoring modules).
       */
      toolbar?: {
        /** Search input. `true` for the derived default placeholder, or an object to override it. */
        search?: boolean | { placeholder?: string }
        /** Filter funnel fed by the module's own derived facets (uiConfig.filters vocabulary). */
        filters?: boolean
        /**
         * Create button. `true` renders the compact "+" icon button;
         * `{ label }` renders a primary labeled button right-aligned in the
         * toolbar (Addendum detail 5: export + create flush right).
         */
        create?: boolean | { label?: string }
        /**
         * Group By popover (Addendum "Group By popup"). `cols` are
         * systemcolumn cols offered as radio options (labels resolved from
         * the blueprint); `defaultCol` is what Reset restores — mandatory,
         * this control has no "ungrouped" state.
         */
        groupBy?: { cols: string[]; defaultCol: string }
        /** Tri-state Sort popover (Addendum "Sort popup") over the module's sortable listcolumns. */
        sort?: boolean
        /** Assignee split-pill (only meaningful when the module has an Assignee-typed facet). */
        assignee?: boolean
        /**
         * Generic single-select facet dropdown over ANY named systemcolumn
         * (row 2, alongside the Assignee pill/Sort/Group By) — the seam a
         * field that ISN'T `Assignee`-typed uses to get the "assignee split-
         * pill" toolbar experience (single active value, live counts,
         * filters list+map) without retyping the field. Reuses the SAME
         * facet derivation `deriveFilters()`/`useModuleViewFacets` already
         * compute for the page-level "All Filters" panel — this only names
         * WHICH derived facet also gets its own dedicated toolbar control;
         * it is never a second facet vocabulary. Counts are LIVE (recomputed
         * from the pane's own search/other-filters-narrowed record set, same
         * convention as the live-monitoring legend's per-tone counts), not a
         * static blueprint-authored total.
         */
        facetCol?: string
        /** Download/export button — exports the pane's CURRENT narrowed record set as CSV. */
        download?: boolean
        /**
         * Stage tabs (Addendum "Stage tabs") — a `CountTabs` row ABOVE the
         * rest of this toolbar: "All" plus one tab per `uiConfig.statusList`
         * entry, each with a live count. Selecting a stage narrows list+map
         * to it; because the active tab already states the stage, the
         * per-card stage chip (`card.stageChip`) and any Group-By-status
         * section header are suppressed while one is active (both return on
         * "All"). Requires a non-empty `uiConfig.statusList` — ignored
         * otherwise.
         */
        stageTabs?: boolean
      }
      /**
       * Per-card display options for the hybrid list pane's card (SPEC
       * `29:41877`) — entity-agnostic, never a per-module hardcode in the
       * renderer.
       */
      card?: {
        /**
         * Shows a pipeline-stage chip (label + tone) on each card, resolved
         * from `uiConfig.statusList` by the record's own `status` value —
         * the SAME stage vocabulary the Kanban board's columns already use,
         * just surfaced as a chip here since the hybrid list mixes every
         * stage in one flat/grouped list (unlike a Kanban column, which
         * already signals stage by position). Scoped to the hybrid list
         * card only — never added to the shared `kanbanCard` config, so the
         * real Kanban board (whose columns already ARE the stage) is
         * unaffected. Defaults to `false`.
         */
        stageChip?: boolean
      }
    }
    /**
     * Points of interest for the map's POI drawer (figma live-monitoring spec
     * §1.4): checked POIs plot custom pins; `radiusMeters` draws the hover
     * radius circle. `position` is `[lng, lat]` (GeoJSON order, matching
     * everything under the map entry).
     */
    pois?: {
      id: string
      name: string
      position: [number, number]
      color?: string
      radiusMeters?: number
      /** Free-form tag labels backing the POI drawer's tag-filter buttons (SPEC v2 3.21). */
      tags?: string[]
    }[]
    /**
     * Named places the map's place-search filters over, flies to, and can drop
     * a POI pin on (SPEC v2 3.18). The design system ships NO gazetteer and
     * performs NO geocoding: its map takes this list as a generic search
     * source, so every place name is application data supplied here.
     * `position` is `[lng, lat]` (GeoJSON order, as everywhere under `map`).
     */
    places?: {
      id: string
      name: string
      position: [number, number]
      category?: string
      /** Full "District, Municipality, Country" line — the muted subtitle of a gazetteer row in the map search. Authored here, never derived. */
      address?: string
    }[]
    /**
     * Map tools that render and stay focusable/clickable but are not wired to
     * a live data source in this deployment: activating one raises `message`
     * as a toast instead of toggling (SPEC v2 3.19 traffic overlay). The
     * design system holds no environment-specific copy - the message text is
     * always supplied here.
     */
    unavailableTools?: { tool: string; message: string }[]
    /**
     * Which floating map tools render, by id — `search`, `pin`, `refresh`,
     * `cluster`, `layers`, `traffic`, `zones`, `poi`. Omitted, the map renders
     * the reference app's default set (`LIVE_MAP_DEFAULT_TOOL_IDS`: search,
     * cluster, layers, traffic, zones, poi — no `pin`, no `refresh`). A
     * deployment that wants the drop-pin or refresh controls back lists them
     * here; the design system never hardcodes one tenant's tool set.
     */
    tools?: string[]
    /**
     * Renders the map's TRAFFIC tool (default `true`). The overlay it toggles
     * is deterministic PSEUDO-traffic painted along the basemap's major
     * roads — FAMS ships no live traffic feed and the design system never
     * calls an external one (`v5-templates/src/map/traffic.ts` explains the
     * seeding). The overlay itself always starts OFF and is thereafter the
     * user's own persisted choice; set this `false` to drop the control
     * entirely.
     */
    trafficOverlay?: boolean
    /**
     * Basemap LABEL renames. The vector tiles are OpenStreetMap-derived and
     * some names differ from what a deployment's users expect; each rule
     * rewrites the matching feature's rendered label without patching tiles
     * or forking a style. Matched against `name`, `name:en` and `name_en`,
     * applied to the style's water/marine label layers, and re-applied after
     * every basemap switch. Only the matched field is replaced — labels in
     * other languages are untouched.
     */
    labelOverrides?: { match: { name: string }; text: string }[]
    /**
     * Weather monitoring layer (`uiConfig.map.weather`) — the station set the
     * map plots and its detail drawer reads. `enabled: false` keeps the
     * authored stations in the blueprint but renders none of the layer.
     *
     * `stations` is left structurally open here: its full shape is
     * `@fams/v5-templates`' `WeatherStationDatum`, and the composer tier must
     * not take a dependency on the templates tier to name it. The schema
     * (`EntityModuleConfig.schema.json`) is the authority on the shape;
     * `MapView` casts once at the boundary.
     */
    weather?: {
      enabled?: boolean
      stations?: unknown[]
      /**
       * The map's bottom forecast panel (Open-Meteo / QMD timeline strip),
       * shown while the weather layer is on. Structurally open for the same
       * tier-boundary reason as `stations`: the full shape is
       * `@fams/v5-templates`' `WeatherForecastPanelData`.
       */
      forecast?: unknown
    }
    /**
     * `true` routes the record-map hybrid's record-open to the docked
     * weather-station drawer (SPEC 22:38014/22:40509) instead of the app's
     * generic profile: the opened record is matched against
     * `weather.stations` by name (station `name` vs record `title`,
     * case-insensitive) or id, and the drawer renders that station's
     * readings grid, 24h trend, and Forecast/QMD tables. A record with no
     * matching station falls back to the generic profile open.
     */
    stationDrawer?: boolean
    /** Basemap attribution strip: hidden | compact | visible (default). */
    attribution?: 'hidden' | 'compact' | 'visible'
    /**
     * Suppress the detached fullscreen tile under the `'figma'` zoom pill
     * (SPEC-adjacent module opt-out, 2026-09-01 — Requests & Complaints:
     * the module's own records already ARE the incidents, so the incidents
     * toggle and traffic toggle are dropped from `tools` above, and this
     * flag additionally drops the corner-brackets fullscreen tile). The zoom
     * pill itself and every other tool stay; default `false` (unchanged).
     */
    hideFullscreenControl?: boolean
    /**
     * Extra list-panel columns (systemcolumn `col` keys) revealed when the
     * hybrid list panel steps to its Expanded / Fully Expanded width states
     * (spec §1.2 — e.g. Speed, Timestamp). Collapsed shows only
     * `uiConfig.hybrid.listColumns`.
     */
    expandedColumns?: string[]
    /**
     * A Tags-like column whose per-record values back the All Filters
     * popover's Tags multiselect (spec §1.7) — the FIRST suggestion group
     * (warning-tinted chips, e.g. "Shift Type"). Values are matched by
     * substring-free equality; multi-value cells may be comma-separated.
     */
    tagsCol?: string
    /**
     * A second Tags-like column — the Tags multiselect's SECOND suggestion
     * group (grey outlined chips, SPEC v2 §2.5's "My Private Tags"). Same
     * value shape and matching rules as `tagsCol`. Selected tags from either
     * group filter records that carry the tag in EITHER bound column.
     */
    privateTagsCol?: string
    /**
     * The Columns popover's default "Shown" set (systemcolumn ids or col
     * keys), decoupled from the collapsed table columns (SPEC v2 §2.6 shows
     * Vehicle · Speed · Health · Last Record Received as Shown while the
     * collapsed table renders `hybrid.listColumns`). Omitted → the popover
     * seeds from the collapsed table columns as before.
     */
    columnsShown?: string[]
    /**
     * Mobility-status column. Values are matched case-insensitively against
     * `moving` / `idling` / `stopped`; anything else (or unbound) reads as
     * non-reporting (grey). Drives marker ring color, cluster ring
     * segments, and the popup status line.
     */
    statusCol?: string
    /** Plate column — the ONE identity shown everywhere (list VEHICLE cell,
     *  marker's leading chip, popup header tag). Never bind the internal
     *  record id here (A22). */
    plateCol?: string
    /** Make column — combined with `modelCol` for the popup title (e.g.
     *  "Mercedes-Benz Actros 3340"). Optional; omit if `title` already reads
     *  as a model name. */
    makeCol?: string
    /** Model column — combined with `makeCol` for the popup title. Falls
     *  back to `title` when unbound (A22: popup title is the model, never
     *  the internal record id). */
    modelCol?: string
    /** Vehicle-type column (e.g. "Tanker", "Sedan") — the mixed
     *  Name·ID·Type·Location list's Type column for a vehicle row (2026-08-31
     *  workforce enhancement, task §2). Optional; a vehicle row with no bound
     *  value there shows an em dash, same as any other unbound cell. */
    vehicleTypeCol?: string
    /** Speed column (km/h, numeric or numeric string) — the trailing chip while moving. */
    speedCol?: string
    /** Pre-formatted dwell-duration column (e.g. "12 mins") — the trailing chip while idle/stopped. */
    dwellCol?: string
    /** Heading column in degrees (0 = north, clockwise) — the moving marker's direction arrow. */
    headingCol?: string
    /** Driver display-name column — popup meta row. */
    driverCol?: string
    /**
     * Vehicle photo URL column.
     * @deprecated SPEC v2 (run 2026-08-24) P0-1: every vehicle depiction is
     * the 3D isometric SVG (`VehicleIcon3D`), never a photo. The binding is
     * still ACCEPTED (existing blueprints keep validating; the column data
     * flows through `deriveLiveVehicles.photoUrl` unchanged) but the DS list
     * surfaces no longer render it. Kept for public-API back-compat — do not
     * bind it in new blueprints.
     */
    photoCol?: string
    /** Human-readable location column — popup meta row. */
    locationCol?: string
    /** Status-since column (pre-formatted, e.g. "since 2 minutes") — popup status line detail. */
    statusSinceCol?: string
    /**
     * Activity-overview column: the record's value is an array of
     * `{ icon?, count, tone? }` pairs (icon = kebab-case lucide name from the
     * renderer's closed map; tone = `danger`/`warning`/`success`/`neutral`)
     * rendered as the compact icon+count "Activity Overview" cell (figma
     * live-monitoring spec §2's hybrid/list column).
     */
    activityCol?: string
    /**
     * Fill-level column: the record's value is a number 0-100 (or a numeric
     * string) rendered as a colored progress bar + percentage in the hybrid
     * list (figma live-monitoring spec §1's "FILL LEVEL" column). Generic —
     * no tenant-specific wording is assumed; the header label still comes
     * from the bound systemcolumn's own `name` (`liveColumnLabel`), so a
     * tenant can call this field anything ("Fill Level", "Tank Level", …).
     * Color thresholds are fixed DS-wide: red &lt;20%, orange 20-79%,
     * green &ge;80%.
     */
    fillLevelCol?: string
    /**
     * Which `VehicleIcon3D` illustration ('car' | 'tanker' | 'weather-
     * station') the map marker, list-row cell, and popup header render for
     * every record in this module — generic, config-driven per rule #10 (no
     * `vehicleType`-style prop, no per-tenant component fork). Omitted →
     * 'car', the original Figma master art. `'weather-station'` (A24) is
     * for entity modules whose assets are stationary sensors, not vehicles.
     */
    vehicleArt?: 'car' | 'tanker' | 'weather-station'
    /**
     * Workforce bindings (2026-08-31 "add WORKFORCE alongside vehicles"
     * enhancement) — PRESENCE of `kindCol` is what turns on the Live
     * Monitoring All/Vehicle/Workforce chips and the mixed Name·ID·Type·
     * Location list columns; omitted, the module renders exactly as before
     * (vehicle-only, no chips). Workforce rows share this SAME module's
     * `records` array with the vehicle rows and this SAME `latCol`/`lngCol`
     * position bindings — told apart only by `kindCol`'s value, never a
     * second `records`/config prop, so one blueprint + one seed array
     * describes both kinds (compositions, never new primitives).
     */
    workforce?: {
      /** Discriminator column: a record whose value here reads `'workforce'`
       *  (case-insensitive) is a workforce member; every other value —
       *  including every record when this key is unbound — is a vehicle. */
      kindCol: string
      /** Employee ID column — the mixed list's ID column and the marker
       *  card's identity chip. */
      employeeIdCol?: string
      /** Job title / designation column — the mixed list's Type column and
       *  the marker card's subtitle. */
      designationCol?: string
      /** Duty-status column: `on-duty` | `on-break` | `in-transit`
       *  (case-insensitive, spaces/hyphens both matched); unbound or
       *  unrecognized reads as on-duty. Drives the marker art's ring/tint
       *  colour and the marker card's status line. */
      statusCol?: string
      /** Which glyph the mixed list's Location column shows: `plain` (street
       *  address) | `zone` | `poi`; unbound or unrecognized reads as plain. */
      locationKindCol?: string
      /** Human-readable location line — often the SAME column a vehicle
       *  module binds to `locationCol` above (a plain address, a Zone label,
       *  or a POI name), reused rather than duplicated per record. */
      locationLabelCol?: string
      /**
       * Workforce popup card bindings (2026-08-31 workforce-popup task,
       * Figma 6Twj2L7KPGP5y8unBP9KS6 nodes 3439:4860/6849/9590) — the same
       * tabbed-card contract the vehicle `popup` block carries, renamed to
       * the workforce vocabulary: Overview fields grid, a Critical Events
       * tab (`VehicleEventItem[]` shape), and a SHIFTS tab that is the
       * workforce analogue of Trips (`VehicleTripRow[]` shape; a row's
       * `kind: 'stay'` renders the static clock-in/clock-out variant).
       * Unbound → the workforce marker keeps a fields-only simple card.
       */
      popup?: {
        /** Overview grid, authored order — same cell contract as `popup.fields`. */
        fields?: {
          col?: string
          label: string
          icon?: string
          suffix?: string
          format?: 'number'
          kind?: 'coordinates' | 'progress' | 'tags'
          thresholds?: { min: number; tone: 'success' | 'warning' | 'error' | 'muted' }[]
          tagTones?: Record<string, 'success' | 'warning' | 'error' | 'muted'>
        }[]
        /** Column holding a `VehicleEventItem[]`-shaped array — the Critical Events tab. */
        eventsCol?: string
        /** Column holding a `VehicleTripRow[]`-shaped array — the Shifts tab's rows. */
        shiftsCol?: string
        /** Column holding a `VehicleTripDateChip[]`-shaped array — the Shifts tab's date strip. */
        shiftDatesCol?: string
        /** Column holding a `{ distance, trips, duration }` object — the Shifts tab's summary line. */
        shiftSummaryCol?: string
        /** Ordered pinned tab ids (`overview`, `events`, `shifts`). */
        visibleTabs?: string[]
        /** Segments before the bar's overflow slot. @default 3 */
        maxVisibleTabs?: number
      }
    }
    /**
     * Marker clustering for the generic record-map hybrid lens (same
     * supercluster pipeline + eye toggle Live Monitoring's fleet map already
     * ships, `cluster-toggle-store.ts`'s `useClusterEnabled`). Omitted/false
     * keeps the lens's existing one-circle-per-record behavior (never
     * aggregated — the default for every module that doesn't opt in).
     * Generic per rule #10 — a boolean default, not a per-tenant fork.
     */
    cluster?: boolean
    /**
     * Zoom at or above which map markers render their info capsule (plate +
     * fill level / speed) instead of the plain pin. Omitted → the design's
     * own threshold. Generic per rule #10 — a number, not a per-tenant fork.
     */
    markerDetailZoom?: number
    /**
     * Vehicle popup card bindings (figma live-monitoring spec §1.5) — the
     * Overview grid's authored field list plus the columns whose record
     * values feed the Critical Events / Trips / Devices tab bodies. All
     * optional: an unbound tab is simply omitted from the popup's tab bar,
     * and without `fields` the popup derives its default four-field grid.
     */
    popup?: {
      /**
       * The Overview grid, in authored order. `kind: 'coordinates'` renders
       * the record's `latCol`/`lngCol` pair with a copy affordance instead
       * of reading `col`. `suffix` appends a display unit (e.g. " km/h").
       */
      fields?: {
        col?: string
        label: string
        icon?: string
        suffix?: string
        /**
         * Display formatting for a PLAIN label/value cell.
         *
         * `'number'` groups the value's digits with the locale's thousands
         * separator (`132800` -> `132,800`) before `suffix` is appended.
         * Opt-in per field on purpose: a bare "is it numeric?" test would
         * also group years, model numbers and any other digit run that is an
         * identifier rather than a quantity (`2025` -> `2,025`).
         * Non-numeric values pass through untouched.
         */
        format?: 'number'
        /**
         * Cell shape:
         * - `'coordinates'` renders the record's `latCol`/`lngCol` pair with a
         *   copy affordance instead of reading `col`;
         * - `'progress'` renders `col`'s 0-100 number as the board's 8px bar
         *   plus a percentage (Fill Level / Fuel Level);
         * - `'tags'` renders `col`'s array (or comma-separated string) as the
         *   board's tinted chip row.
         * Omitted, the cell is a plain label/value pair.
         */
        kind?: 'coordinates' | 'progress' | 'tags'
        /**
         * `kind: 'progress'` only — value thresholds mapping the number onto a
         * bar tone, highest-first (e.g. `[{ min: 60, tone: 'success' },
         * { min: 30, tone: 'warning' }, { min: 0, tone: 'error' }]`). Omitted,
         * the bar is always `success`.
         */
        thresholds?: { min: number; tone: 'success' | 'warning' | 'error' | 'muted' }[]
        /**
         * `kind: 'tags'` only — per-tag tone by exact label, for tags that
         * carry a meaning (a hazmat tag in `error`, say). Unlisted tags render
         * in the neutral chip.
         */
        tagTones?: Record<string, 'success' | 'warning' | 'error' | 'muted'>
      }[]
      /** Column holding a `VehicleEventItem[]`-shaped array — the Critical Events tab. */
      eventsCol?: string
      /** Column holding a `VehicleTripRow[]`-shaped array — the Trips tab. */
      tripsCol?: string
      /** Column holding a `VehicleTripDateChip[]`-shaped array — the Trips tab's date strip. */
      tripDatesCol?: string
      /** Column holding a `{ distance, trips, duration }` object — the Trips tab's summary line. */
      tripSummaryCol?: string
      /** Column holding a `VehicleDeviceRow[]`-shaped array — the Devices tab. */
      devicesCol?: string
      /**
       * Ordered ids of the tabs pinned to the popup's visible tab bar; every
       * other tab lands in the bar's overflow menu. Omitted, the first
       * `maxVisibleTabs` are pinned. Ids: `overview`, `events`, `trips`,
       * `workforce`, `devices`.
       */
      visibleTabs?: string[]
      /** How many tab segments the bar shows before its overflow slot. @default 3 */
      maxVisibleTabs?: number
      /**
       * The Workforce tab (board 16:22182) — the assigned crew's info card.
       * Every entry is a record column; a column with no value is skipped, and
       * with nothing bound at all the tab renders its empty state.
       */
      workforce?: {
        /** Column holding an image URL for the 120x120 photo tile. */
        photoCol?: string
        /** Ordered entries — label + the column read for the value. */
        entries?: { col: string; label: string; icon?: string }[]
      }
    }
  }
  profile?: {
    title: FieldPlacement
    details: FieldPlacement[]
    sections: ProfileSection[]
    /** Dashboard widgets for the profile "Overview" tab (loosely typed). */
    overview?: unknown[]
    rightPanel?: { type: 'tab'; tabs: ProfileTab[] }
    /**
     * Section label above the identity-pane detail rows (e.g. "RMCC Point
     * Details"). Defaults to "Details" when absent.
     */
    infoTitle?: string
    /**
     * Named glyph (e.g. `"map-pin"`) for the identity panel's hero-image
     * placeholder slot when the record has no `image` — a light-grey square
     * with a large centered icon instead of the default solid-color initials
     * block. Resolved by `@fams/v5-templates`'s own icon map (same "opt in
     * by name" contract as `IconTextView`'s `props.icon` — an unrecognized
     * name still renders A glyph, defaulting to the map-pin one, rather than
     * throwing). Omit to keep the initials-block look.
     */
    placeholderIcon?: string
    /**
     * Which field drives the STATUS CHIP overlaid on the identity rail's art
     * tile. Defaults to the record's own `status`. A list is tried in order
     * and the first non-empty value wins — that is what lets ONE module whose
     * rows have two shapes (e.g. assets keyed on `assetStatus`, people on
     * `workforceStatus`) light the same rail chip correctly for both.
     *
     * Why it is separate from `status`: on an asset detail sheet the rail
     * chip states the asset's LIFECYCLE ("Active") while the record's live
     * `status` ("Stopped") belongs to the motion/telemetry surfaces — two
     * different facts that a single field cannot carry.
     */
    statusOverlayField?: string | string[]
    /**
     * Solid pill colour per `statusOverlayField` value, for values that are
     * not keys of `uiConfig.statusList` (which stays the source of truth for
     * the record's own `status`). Same blueprint-driven hex escape hatch
     * `StatusPill.color` documents; a value with no entry falls back to the
     * neutral pill.
     */
    statusOverlayColors?: Record<string, string>
    /**
     * Per-record-shape overrides of the IDENTITY RAIL, tried in order — the
     * rail counterpart of `ProfileTab.visibleWhen`. One module whose rows have
     * two shapes (a Live Monitoring module carrying both assets and people)
     * gets each shape's own rail heading + key-detail rows without forking the
     * module or inventing a second blueprint.
     */
    identityVariants?: ProfileIdentityVariant[]
    /**
     * Layout for the top-level `details` `FieldGrid` — e.g. the Ticket
     * Detail page's 145px label column (figma-spec-detail.md §3) vs. a
     * different record surface's own measurement, plus `fieldEmphasis` (see
     * `ProfileSection.layout`'s doc comment). Per-section overrides live on
     * `ProfileSection.layout` instead.
     */
    layout?: { labelWidth?: string; fieldEmphasis?: 'regular' | 'strong' }
  }
  filters?: FilterDef[]
  /** All Filters panel chrome — see `FiltersPanelConfig`. */
  filtersPanel?: FiltersPanelConfig
  search?: {
    columns: string[]
    /**
     * The toolbar search box's placeholder text (e.g. `"Search Ticket"`,
     * figma-spec-list.md §1/figma-spec-kanban.md §1) — threaded through
     * `ModuleView` to `ModuleViewFilters.searchPlaceholder`. Omit for the
     * generic default `"Search {module label, singularized}"` (`ModuleView`
     * derives it from `EntityConfig.name` — see `singularize` in
     * `ModuleView.tsx`); a plural-looking or irregular module name (e.g.
     * "Tickets" → the naive singularizer's `"Ticket"` happens to match here,
     * but "Inventory" wouldn't singularize sensibly) is exactly when to set
     * this explicitly instead of relying on the guess.
     */
    placeholder?: string
  }
  /**
   * List-view stat-card tiles (figma-spec-list.md §2 — 5 cards above the
   * table). Each tile's `value` is DERIVED at render time (a record count,
   * by default), never authored — the blueprint only says WHAT to count.
   * `filter` narrows which records count toward this tile; omit for "count
   * every record". `icon` is a small named-glyph string (resolved by
   * `@fams/v5-templates`'s icon map, same "opt in by name" contract as
   * `IconTextView.props.icon` — an unrecognized name renders no icon rather
   * than throwing). `tone` is `KpiTile`/`IconBadge`'s closed tone set;
   * `iconColor`/`iconBg` are the same raw-color escape hatch `kanbanCard.
   * highlight` uses, for a hue `tone` doesn't name (e.g. the spec's
   * dedicated terracotta "Accent 8" tile). See `deriveSummaryTiles` in
   * `config-render.ts` for the exact derivation this array feeds.
   */
  listSummary?: {
    id: string
    label: string
    icon?: string
    tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
    iconColor?: string
    iconBg?: string
    filter?: { col: string; equals?: unknown; in?: unknown[] }
  }[]
  /**
   * Column order to use ONLY while the list view is grouped (figma-spec-
   * list.md §4 — the grouped variant re-flows Ticket Type before Title).
   * An ordered list of `col` keys; columns not named here keep their
   * flat-mode relative order, appended after the named ones. Threaded
   * straight through to `ListView.groupedColumnOrder`/`ModuleView.
   * groupedColumnOrder` — see that prop's doc for the full contract
   * (grouping itself is auto-derived from any SingleSelect-backed
   * listcolumn; this key ONLY reorders while grouped).
   */
  listGroupedColumns?: string[]
  /**
   * The module's record noun, singular + plural, for the generated copy that
   * talks ABOUT records rather than naming the module — "Delete 12 tasks?",
   * "Showing 175 of 175 mapped tasks", "Fit all tasks in view".
   *
   * Omit and the noun is derived from `config.name` by the naive
   * lowercase+singularize convention `recordNounFor` documents, which is
   * right whenever the module name IS the plural record noun ("Tasks" →
   * task/tasks). It is WRONG whenever the module name is a
   * discipline/area name rather than a plural of its records — the
   * pipelines module is called "Pipeline Management", which lowercased into
   * a plural-noun slot read "Showing 175 of 175 mapped pipeline management"
   * (finding A7b-4). Such a module states its noun here instead.
   */
  recordNoun?: { one: string; many: string }
  /**
   * The list view's body-row vertical rhythm — see `DataTable.rowHeight`.
   * `'lg'` (ticketing's figma-spec-list.md §3 64px row) is the template's own
   * historical default when omitted; a module whose Figma spec wants a
   * shorter row (e.g. asset/Collection-Point's figma-spec-list.md §3 44px
   * row) sets `'md'`. Threaded straight through to `ModuleView`/`ListView`.
   */
  listRowHeight?: 'md' | 'lg'
  /**
   * Hides the toolbar's Sort control (figma-spec-list.md §1's icon-button
   * row) when set to `false` — omit/`true` keeps it shown (default,
   * unchanged). Every module otherwise gets one (`deriveColumns` marks every
   * listcolumns entry sortable), so a spec with no Sort affordance at all
   * (asset/Collection-Point's figma-spec-list.md §3: search + filter + CTA
   * only) opts out explicitly rather than the template guessing.
   */
  listSort?: boolean
  /** Hides the toolbar's Group By control when `false`. Mirrors `listSort`. */
  listGroupBy?: boolean
  /**
   * Hides the "Showing N of M …" results-count line across this module's
   * lenses (list, kanban, record-map hybrid) when `true` (SPEC
   * `pipelines-hybrid-29-41808` Addendum detail 7). Omit/`false` keeps the
   * row (default, unchanged) — a per-module knob, never a global removal:
   * the row itself stays available to every other module.
   */
  hideResultsCount?: boolean
  /**
   * `false` hides the shared toolbar's list/grid display-mode segmented
   * switcher (SPEC `pipelines-hybrid-29-41808` Addendum detail 4 — redundant
   * with the view tabs on pipeline screens). Omit/`true` keeps it (default,
   * unchanged, still kanban-lens-only as before).
   */
  viewSwitcher?: boolean
  /**
   * Shows a leading checkbox column for multi-row selection (figma-spec-
   * list.md §2's selection column) — threaded straight through to
   * `ModuleView`/`ListView.selectable`. Omit/`false` keeps today's default
   * (no selection column, unchanged).
   */
  listSelectable?: boolean
  /**
   * `false` hides the kanban card's bulk-selection checkbox (top-left of each
   * `KanbanCard`) by withholding `KanbanView.selectedIds`/
   * `onSelectedIdsChange` (2026-08-31 P0 — pipeline kanban has no bulk
   * actions; the shared flat selection set stays wired for `ListView`'s own
   * `listSelectable` column regardless). Omit/`true` keeps today's default
   * (checkbox shown, unchanged) — every other kanban-lens module is
   * unaffected.
   */
  kanbanSelectable?: boolean
  /**
   * `true` makes every kanban lane a fixed drop target — `canMove` is
   * overridden to always deny, so no card can be dragged into a different
   * stage from the board at all (status changes only via the detail view's
   * own transition control). UCCP Requests & Complaints (FM-6271: "Kanban is
   * READ-ONLY for status — no drag-to-change"). Omit/`false` keeps today's
   * default (the module's own `canMove`/transition rules apply, unchanged).
   */
  kanbanReadOnly?: boolean
  /**
   * Curated option set for the shared toolbar's **Group By** control
   * (Figma overlay `33534:31649` — `Status` / `Service Type` / `None`).
   * SHARED module-view chrome, not a list-only key: `ModuleView` already owns
   * the whole `ModuleViewGroupByFacet` → `ViewState.groupBy` →
   * `ListView.groupByCol` chain, and this array only narrows and RE-LABELS
   * which columns it offers. Omit to keep the auto-derived set (every
   * SingleSelect-backed listcolumn) — the unchanged default. `None` is
   * rendered by the control itself and clears grouping, so it is never
   * authored here. An entry whose `col` is not a groupable column of this
   * module is dropped rather than offered as a dead option. An entry naming
   * a listed column that is not SingleSelect-backed IS honoured — curating it
   * is an explicit authoring act, and grouping only reads the column's value.
   *
   * An entry's `icon` (a name from the shared field-glyph vocabulary) is the
   * leading glyph THIS grouping's group-header rows carry — Figma
   * `29535:4487`'s `Asset Icons/List/Car` on a vehicle group. Per entry, not
   * per module, so regrouping by Status does not keep the car. Omitted (every
   * existing consumer) → no glyph, unchanged headers.
   *
   * `default: true` marks the grouping a **`grouped-list`** view OPENS with
   * (the kind exists precisely to open grouped). Ignored by every other kind:
   * a `list` view still opens ungrouped, unchanged. The user can regroup or
   * choose `None` afterwards and that choice sticks.
   */
  groupByOptions?: { col: string; label?: string; icon?: string; default?: boolean }[]
  /**
   * Per-record row/card options menu — the hover-revealed `…` control
   * (Figma Dev Notes `33534:32266`/`33534:32263`, overlay `33534:32262`).
   * SHARED chrome: one key drives List rows, Hybrid cards and Kanban cards.
   * The menu's contents are exactly the designer's two items and nothing may
   * be added:
   *  - `delete` — the destructive, CONFIRMED action. Only takes effect when
   *    the app also wires `ModuleView.onDeleteRecords` (a menu item that
   *    cannot act is not rendered).
   *  - `archive` — the designer's acknowledged placeholder ("other is just
   *    placeholder", Dev Note `33534:32265`). Rendered DISABLED with a
   *    tooltip explaining why; it is never wired to an action.
   * `requiredPrivilege`, when set, gates the whole menu through
   * `userContext.privileges` — the same semantics as an `EntityProfileTab`'s
   * `requiredPrivileges` (absent user or absent privilege denies). Omit the
   * block entirely for no row menu (default, unchanged).
   */
  /**
   * `alwaysVisible: true` opts THIS module's rows out of the shared hover
   * reveal, painting the `…` control at rest. The DEFAULT stays hover-revealed
   * — that is what Dev Notes `33534:32266`/`33534:32263` drew for the modules
   * that own those frames, and it must not change under them. A module whose
   * own reference frame draws the control persistently sets this flag rather
   * than the shared default being flipped for everyone. Purely a RESTING-look
   * switch: the button is in the DOM, focusable and named in both modes (it
   * always was — the hover rule is opacity, never mounting), so nothing about
   * keyboard or AT behaviour differs between the two.
   */
  rowActions?: { delete?: boolean; archive?: boolean; requiredPrivilege?: string; alwaysVisible?: boolean }
  /**
   * Bulk action bar shown while ≥1 record is selected (Figma Dev Note
   * `33534:32267`). SHARED chrome, gated by `listSelectable` — a module that
   * renders the selection column gets the bar from the same code path, so the
   * already-shipped Tickets list gains it without a second selection idiom
   * (UX note L.75). Contents are exactly `Delete` + `Export`.
   *
   * Omit to accept the selection-driven default: `export` on (it is
   * client-side and needs no app wiring) and `delete` on only when
   * `ModuleView.onDeleteRecords` is wired. Pass `{}` to render the selection
   * column with NO bar, or set either key to `false` to drop that one action.
   * `requiredPrivilege` gates the bar exactly as `rowActions`'s does.
   */
  bulkActions?: { delete?: boolean; export?: boolean; requiredPrivilege?: string }
  /**
   * Shows the list toolbar's trailing header-only pencil/edit affordance
   * (figma-spec-list.md §2's header pencil icon) — threaded straight
   * through to `ModuleView.headerAction`/`ListView.headerAction` as `{}`
   * (the default Pencil glyph, no click behavior of its own — a metadata
   * boolean can't carry a callback; the app/renderer layer wires a real
   * `onClick` by passing its own `headerAction` prop directly to
   * `ModuleView` instead of setting this flag, when one is needed). Omit/
   * `false` keeps today's default (no trailing column).
   */
  listHeaderAction?: boolean
  /**
   * Hint line for the module's "Select Preferred View" new-view picker
   * (figma new-view spec §hint footer) — threaded straight through to
   * `ModuleView`/`ViewTypePicker.hint`. Per-module metadata, same as the
   * picker's option set (the blueprint's `views` kinds). Omit to hide the
   * hint row entirely (the picker reserves no space for it).
   */
  viewPickerHint?: string
  /**
   * Create-sheet rendering knobs (figma-spec-create-sheet.md) — threaded
   * straight through to `CreationSheet.layout`/`CreationSheet.fieldChrome`.
   * Omit either key to keep that knob's own default (`'auto'` layout,
   * `'default'` chrome).
   */
  creation?: {
    layout?: 'auto' | 'flat' | 'wizard'
    fieldChrome?: 'default' | 'inset-label'
    /** Create-CTA label (e.g. "New Collection Point"); falls back to "Create New". */
    label?: string
    /**
     * Hides the module-header create CTA (`ModuleView`'s primary "New X"
     * button) and every inline "create from empty facet" affordance derived
     * from it. Read-only affordances (search/filters/list actions) are
     * untouched. Default `false` (unchanged behavior).
     *
     * Use when the module's create flow is not yet implemented / disabled by
     * policy — the button was the only visible entry to a broken flow, and
     * leaving it live invited an unfinished wizard. Prefer this over
     * removing `uiConfig.creation` entirely: the rest of that block (label,
     * layout, chrome) may still be authored for when the flow reopens, and
     * a privilege-driven hide is a separate concern this doesn't replace.
     */
    disabled?: boolean
    /**
     * How many leading editable fields form the implicit first "Basic Info"
     * group (`computeCreationGroups`). Defaults to the locked v1 constant of
     * `5`. Set it when a wizard's first step must contain an EXACT field count
     * (e.g. the FAMS Requests & Complaints create wizard: exactly the four
     * Basic-Info fields, with Source/Onwani flowing into their own steps) —
     * the decision-#10 TODO's metadata-driven step sizing, scoped to the
     * first group. Every field beyond this count is placed by
     * `profile.sections` (or the trailing catch-all) exactly as before.
     */
    basicCount?: number
    /**
     * Hidden-in-create gate for `computeCreationGroups`' trailing catch-all
     * "Details" group (`@fams/v5-templates`'s `grouping.ts`). Default
     * (`false`/omitted, unchanged): every remaining editable field the
     * blueprint's `profile.sections` didn't explicitly place still lands in
     * a trailing "Details" group — the pre-existing behavior every module
     * without this flag keeps relying on.
     *
     * `true`: that trailing catch-all is suppressed entirely — the create
     * form shows ONLY the implicit "Basic Info" (first-N) group plus
     * whatever `profile.sections` explicitly place, nothing else. This is
     * the fix for fields that are genuinely needed elsewhere (a `profile.
     * details` top-grid placement, a DIFFERENT section) leaking into the
     * create form's trailing bucket just because no section claimed them
     * (figma-spec-create-sheet.md's exact field list vs. the "Assigned
     * Driver"/duplicate-looking Customer Name fields the catch-all used to
     * add) — placement-driven rather than a per-field flag, consistent with
     * `grouping.ts`'s existing "a section's own placement decides what
     * shows" model (no new per-field schema key needed).
     */
    explicit?: boolean
    /**
     * Append a synthesized read-only Summary/review step to the wizard —
     * `CreationSheet`'s `showSummaryStep`. The recap is derived from the
     * OTHER groups' entered values, so it needs no `profile.sections` entry
     * of its own; each section carries an Edit affordance back to its step.
     * Wizard path only (`layout: 'wizard'`, or `'auto'` with 2+ groups);
     * ignored by `flat`. Default off, so every existing form is unchanged.
     */
    showSummaryStep?: boolean
    /**
     * Step-nav treatment for the wizard rail — `Stepper`'s own `variant`,
     * threaded through `CreationSheet.stepperVariant`. `'numbered'`
     * (default) is the numbered/icon circle rail; `'tabs'` is the
     * horizontal text-tab strip. Ignored by the `flat` path.
     */
    stepperVariant?: 'numbered' | 'tabs'
    /**
     * Per-step rail icon, keyed by `CreationGroup.id` (`'basic'`, a
     * `profile.sections` entry's own id, the trailing `'details'` bucket, or
     * `'summary'`). Values are icon NAMES from the shared
     * `FIELD_ICON_VOCABULARY` (the same closed set `IconTextView`'s
     * `props.icon` resolves through) — an unknown name falls back to the
     * default numbered/check marker rather than throwing. Authorable from
     * blueprint JSON, which a `ReactNode` would not be.
     */
    stepIcons?: Record<string, string>
  }
  /**
   * Optional alert strip pinned above the module's filters row (attendance's
   * "N assignments need attention" bar, mirroring the shift-rostering
   * `#alertBar` pattern). Clicking the bar opens a side sheet listing the
   * matching records — the derivation is driven by `filter` (a
   * `records`-level predicate the composer resolves the same way summary
   * tiles' filters resolve, e.g. `{ col: "status", equals: "Absent" }`).
   */
  alertBar?: {
    /** Icon glyph shown in the leading circle; DS icon-registry name. Defaults to `alarm`. */
    icon?: string
    /** Tone driving the bar's tint (soft `-scale-50` bg + `-scale-700` text/icon). */
    tone?: 'danger' | 'warning' | 'info' | 'success'
    /**
     * Message template. `{count}` is replaced with the matched-record count.
     * Example: "{count} employees are absent — dispatch a reliever now."
     */
    message: string
    /** Trailing CTA text (e.g. "Click to resolve"). Defaults to "View". */
    ctaLabel?: string
    /** Predicate that selects the conflicting records; same shape as `listSummary[].filter`. */
    filter?: { col: string; equals?: string; in?: string[] }
    /** Side-sheet title (e.g. "Resolve Dispatching Conflicts"). */
    sheetTitle?: string
    /** Side-sheet description under the title; `{count}` interpolates the total. */
    sheetDescription?: string
    /** Empty-state text when the filter matches zero records. Defaults to "No conflicts right now." */
    emptyLabel?: string
    /**
     * Outbound-row copy (the record's own strike-through row inside each
     * conflict card). Field keys are the same shape `DispatchAction` uses.
     */
    outbound?: {
      /** Column key for the person's display name. Defaults to `title`. */
      nameField?: string
      /** Column key for a short id (e.g. `E-102`) shown before the name. */
      idField?: string
      /** Column key for the record uid shown in the card header. Defaults to `uniqueidentifier`. */
      uidField?: string
      /** Column key for the context line after the uid. Defaults to `systemcol2`. */
      contextField?: string
      /** Pill label on the outbound row. Defaults to "Absent". */
      reasonLabel?: string
      /** Header top-right tag. Defaults to "Employee Absent". */
      headerTag?: string
      /** Prefix prepended to the numeric part of the uid in each card's header line (default `R#`). Formats a record uid like `ATT-2012` as `R#2012 · <context>`, matching the shift-rostering "R#…" convention. */
      routeIdPrefix?: string
    }
    /** Suggested reliever pool; cards rotate through this list by index. */
    suggestions?: { id: string; name: string; role?: string; meta?: string; shortId?: string }[]
    /** Section header label above the cards. Defaults to "Records Requiring Action". */
    sectionLabel?: string
    /** "Approve All" text button label. Omit to hide the affordance. */
    approveAllLabel?: string
    /** Ghost "View Plan"-style footer button label on each card. Omit to hide. */
    viewLinkLabel?: string
    /** Toast copy when an individual replacement is approved. */
    approveToastTitle?: string
    approveToastDescription?: string
  }
  /** Hybrid (split list + profile) view options. */
  hybrid?: {
    /** systemcolumn ids shown in the compact left list of the hybrid view. */
    listColumns?: string[]
    /**
     * Stage tabs (SPEC Addendum "Stage tabs" — the SAME lens
     * `uiConfig.map.records.toolbar.stageTabs` adds to the record-map
     * hybrid) — a `CountTabs` row above this hybrid's compact left list:
     * "All" plus one tab per `uiConfig.statusList` entry, each with a live
     * count. Selecting a stage narrows the list to it; because the active
     * tab already states the stage, this also suppresses the now-redundant
     * per-row STATUS pill (both return on "All"). Requires a non-empty
     * `uiConfig.statusList` — ignored otherwise. Omit (or `false`) for no
     * stage-tab row at all (unchanged default).
     */
    stageTabs?: boolean
  }
  /**
   * Operations-cockpit lens options for the `hybrid` view kind. PRESENCE of
   * this block (on a module that also binds coordinates via `uiConfig.map`)
   * switches the module's `hybrid` view body from the live list+map hybrid
   * to `@fams/v5-templates`' `CockpitView` — a KPI strip + card queue + live
   * map + status-panel band lens over the SAME records. This is a VIEW
   * option on an existing module type (entity / pipeline / live-monitoring),
   * never a new module type: everything here is generic engine vocabulary
   * (statuses, counts, columns), no business words.
   */
  cockpit?: {
    /** Full-width notice strip above the filters row. Omit → no strip. */
    alert?: {
      text: string
      /** Right-aligned countdown/aside text (pre-formatted). */
      countdown?: string
      /** Default `'danger'`. */
      tone?: 'danger' | 'warning' | 'info'
    }
    /**
     * KPI strip cards, in order. `value` is a static pre-formatted value;
     * `countStatus` instead derives the value by counting records whose
     * `status` equals it (the two are mutually exclusive — `value` wins).
     */
    kpis?: {
      id: string
      label: string
      value?: string | number
      /** Count records with this `record.status` as the card value. */
      countStatus?: string
      accent?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
      badge?: { label: string; tone?: 'up' | 'down' | 'success' | 'warning' | 'link' | 'neutral' }
      /** Columns (systemcolumn `col` keys) shown in the KPI's detail-table sheet. Omit → card is passive. */
      detailColumns?: string[]
      /** `'issues'` routes the card's click to the attention-items sheet
       *  (`flows.issues`) instead of the generic detail table. */
      opens?: 'detail' | 'issues'
    }[]
    /**
     * Filter-pill row between the alert strip and the KPI strip. A pill with
     * a `col` filters the queue + map (equality on that column's values, the
     * option set defaulting to the column's distinct values); a col-less
     * pill is presentational scope (its selection only swaps the label).
     */
    filters?: {
      id: string
      label: string
      /** Column the selection filters on. Omit for a label-only scope pill. */
      col?: string
      /** Explicit option list; defaults to the col's distinct record values. */
      options?: string[]
      /** Renders the label muted until a value is chosen. */
      placeholder?: boolean
    }[]
    /**
     * Icon-action buttons at the end of the filters row. `kind: 'menu'`
     * opens a small menu of `items` (each item toasts its `message` when
     * activated); `kind: 'toast'` fires a toast directly. `icon` is a
     * generic glyph name (`'broadcast' | 'actions' | 'export'`).
     */
    actions?: {
      id: string
      label: string
      icon?: 'broadcast' | 'actions' | 'export'
      /** Primary-tinted treatment. */
      primary?: boolean
      kind?: 'menu' | 'toast'
      items?: { id: string; label: string; message?: string }[]
      /** Toast title fired on activation (`kind: 'toast'`) or item default. */
      message?: string
    }[]
    /** Map-popup options for the cockpit lens. */
    popup?: {
      /** Popup width override (CSS length, e.g. `'22.5rem'`). */
      maxWidth?: string
      /** Column holding the contact string the call CTA reveals. */
      contactCol?: string
      /**
       * Remote commands in the popup's header overflow menu (e.g. an
       * immobilize/mobilize pair). Each entry toasts its `message`; a
       * `'warning'` tone marks a queued/deferred command, `'danger'` a
       * disruptive one. Purely generic — the engine never names a command.
       */
      commands?: { id: string; label: string; message?: string; tone?: 'default' | 'warning' | 'danger' }[]
    }
    /**
     * The cockpit's operational flows (all optional — a flow renders only
     * when configured). Labels/wording all come from here; the engine only
     * knows generic flow shapes.
     */
    flows?: {
      /** File-a-report form sheet (popup CTA on non-attention records). */
      report?: {
        /** CTA label, e.g. "Report Breakdown". */
        label: string
        title?: string
        /** Required single-select field label + options. */
        typeLabel?: string
        typeOptions: string[]
        noteLabel?: string
        /** Checkbox label for the follow-on replacement flow. */
        dispatchLabel?: string
        /** Status the record moves to on submit (via the guarded move path). */
        targetStatus?: string
        successTitle?: string
        successDescription?: string
      }
      /** Attention-items sheet (records whose `status` matches `status`). */
      issues?: {
        title?: string
        /** Records with this status are the sheet's items. */
        status: string
        /** Column read as the item's reason line. */
        reasonCol?: string
        /** Per-item CTA label opening the candidates sheet. */
        suggestLabel?: string
      }
      /** Candidate-records assignment sheet. */
      assign?: {
        title?: string
        assignLabel?: string
        replaceLabel?: string
        successTitle?: string
        successDescription?: string
      }
      /** Resource-replacement confirm sheet (popup CTA on attention records). */
      replace?: {
        /** CTA label, e.g. "Suggest Replacement". */
        label: string
        title?: string
        /** Columns holding the current (struck-through) resources. */
        currentCols?: string[]
        /** Columns holding the standby resources on the record. */
        standbyCols?: string[]
        confirmLabel?: string
        /** Status the record moves to on confirm. */
        resolveStatus?: string
        successTitle?: string
        successDescription?: string
      }
      /** Call/contact CTA label, e.g. "Call Driver". */
      callLabel?: string
    }
    /** Queue-card bindings — systemcolumn `col` keys read off each record. */
    queue?: {
      /** Card title column. Defaults to the record's `title`. */
      titleCol?: string
      subtitleCol?: string
      /** Numeric 0–100 progress column. */
      progressCol?: string
      /** Pre-formatted progress text column (pairs with the bar). */
      progressLabelCol?: string
      /** Pre-formatted planned-times line column. */
      plannedCol?: string
      /** Pre-formatted actual-times line column. */
      actualCol?: string
      /** Small meta-chip columns (plan name, zone, …). */
      metaCols?: string[]
      /** Risk/notice line column (empty → no banner on that card). */
      bannerCol?: string
      /** Banner tone column (`warning`/`danger`/`info`); default `warning`. */
      bannerToneCol?: string
      /** Columns matched by the queue search box (plus title/subtitle). */
      searchCols?: string[]
      /** Person-name column rendered as the card's leading avatar. */
      avatarCol?: string
      /** Pre-formatted deviation-text column (e.g. "Running 26 min late"). */
      deltaCol?: string
    }
    /**
     * Selected-record route geometry: columns holding `[lng, lat][]` arrays.
     * The actual path draws solid, the planned path dashed (never color
     * alone) — both only for the selected record.
     */
    routes?: { plannedCol?: string; actualCol?: string }
    /**
     * Bottom status-panel band (proportion-bar cards). `rows` are static
     * counts; `countByCol` instead derives rows from the distribution of
     * that column's record values (`toneMap` colors them by value).
     */
    panels?: {
      id: string
      title: string
      /** Generic glyph name for the title icon (`'group' | 'people' | 'chart'`). */
      icon?: 'group' | 'people' | 'chart'
      /** Header filter chip: label + option list (selection re-scopes rows by
       *  matching row/stat ids when `optionRowIds` maps them; label-only otherwise). */
      filter?: { label: string; options?: string[] }
      stats?: { id?: string; label: string; value: string | number }[]
      rows?: { id?: string; label: string; count: number; tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' }[]
      countByCol?: string
      toneMap?: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'>
      emptyLabel?: string
    }[]
  }
  /**
   * Declarative cross-module side effects — see `RecordAutomation` below.
   * Evaluated by the PURE `evalRecordAutomations` (`automation.ts`) against a
   * record's previous value and an incoming patch; THIS PACKAGE DOES NO I/O —
   * the consuming app performs the actual create/patch from the returned
   * `RecordAutomationEffect[]` (see the demo env's `composer-data.ts`). Omit
   * for no automation. Carries no business vocabulary (rule 10): `col`/
   * `entityType`/target column keys are opaque strings the blueprint author
   * supplies, same discipline as every other `UiConfig` field.
   */
  recordAutomation?: RecordAutomation[]
}

/**
 * One declarative record-automation rule (`UiConfig.recordAutomation`) — the
 * generic "when this column reaches this value, create a record in another
 * module and reference it back" vocabulary. Before this, the only precedent
 * for a cross-module side effect was hand-wired app code (the demo env's
 * `app/src/demo/boot.ts` `createDailyPlan`, whose own comment says "no such
 * vocabulary exists in the rules engine yet") — this type + `evalRecordAutomations`
 * (`automation.ts`) is that vocabulary, generic and reusable by any pair of
 * modules, not just preventive-maintenance → job-orders.
 */
export interface RecordAutomation {
  /** Stable identity — same convention as every other blueprint node id. */
  id: string
  /**
   * Fires when `col`'s value BECOMES exactly `equals` — an enter transition.
   * It does not fire if `col` already equaled `equals` before the incoming
   * patch, so re-applying the same patch (or an unrelated later patch that
   * leaves `col` untouched) never re-fires it.
   */
  when: { col: string; equals: unknown }
  create: {
    /** Target module's entity code, e.g. `"maintenance/job-order"`. */
    entityType: string
    /**
     * Target column → value mapping, resolved against the SOURCE record
     * (its previous value merged with the incoming patch). `fromCol` copies
     * a source column's value verbatim (e.g. the back-reference to the
     * source record's own vehicle); `const` is a literal (e.g. the target's
     * initial status).
     */
    values: Record<string, { fromCol?: string; const?: unknown }>
  }
  /**
   * Optional patch applied back onto the SOURCE record once the target
   * record exists (e.g. the source's own status flipping as an EFFECT of
   * the automation, plus a reference to the newly created record). `const`
   * is a literal; `fromCreated` names a column on the just-created target
   * record (typically `"id"`) — only resolvable once that record is real,
   * so it stays an unresolved spec on `RecordAutomationEffect` for the
   * caller to fill in after creating, rather than a value `evalRecordAutomations`
   * (a pure function with no I/O) could compute itself.
   */
  patchSource?: Record<string, { const?: unknown; fromCreated?: string }>
}

/**
 * One triggered automation's intended effect — `evalRecordAutomations`'s
 * return shape. `create.values` is fully resolved (no I/O needed to compute
 * it); `patchSource`, when present, is passed through unresolved because
 * `fromCreated` needs the real created record, which only the caller has.
 */
export interface RecordAutomationEffect {
  automationId: string
  create: { entityType: string; values: Record<string, unknown> }
  patchSource?: Record<string, { const?: unknown; fromCreated?: string }>
}

/**
 * The registered per-entity config. `systemcolumns` is Shaheer's single family;
 * v5 splits columns into families — the optional families below are accepted
 * and folded into the same descriptor list at registration time (see
 * `store.ts`). Runtime derivations read the merged descriptor list.
 */
export interface EntityConfig {
  code: string
  name: string
  systemcolumns: SystemColumn[]
  uiConfig: UiConfig
  listcolumns: FieldPlacement[]
  uidPrefix?: string
  /** v5 column families — optional, merged into the descriptor set on register. */
  streamcolumns?: SystemColumn[]
  datacolumns?: SystemColumn[]
  usercolumns?: SystemColumn[]
  validation_columns?: SystemColumn[]
}

export interface EntityRecord {
  id: string
  uniqueidentifier?: string
  title?: string
  status?: string
  tags?: string[]
  deleted?: boolean
  createdAt?: string
  updatedAt?: string
  [systemcol: string]: unknown
}

/**
 * JSONLogic-lite condition: a path leaf ("$.user.roles" / "$.task.systemcol34")
 * mapped to an operator, or a combinator ($and/$or).
 */
export type Condition =
  | { $and: Condition[] }
  | { $or: Condition[] }
  | { [path: string]: { $in?: unknown[]; $eq?: unknown; $ne?: unknown } }

export interface PipelineRules {
  statuses: string[]
  transitions: Record<string, string[]>
  transition_rules?: Record<string, Condition>
  field_rules?: Record<string, { view?: Condition; update?: Condition }>
  status_rules?: Record<string, { view?: Condition }>
  task_rules?: { view?: Condition[] }
}

export interface ResolvedPermissions {
  fieldRules: Record<string, { view: boolean; update: boolean }>
  statusRules: Record<string, { view: boolean }>
  transitionRules: Record<string, boolean>
}

export interface UserContext {
  id: string
  roles: string[]
  orgId?: string
  privileges?: string[]
  type?: string
}
