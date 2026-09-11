/**
 * Dashboard blueprint authoring contract — the TS twin of
 * `packages/v5-composer/schemas/DashboardModuleConfig.schema.json`.
 *
 * Kept in its OWN file (not `blueprint-schema.ts`, already at the ~300-line
 * soft budget — hard rule 12): a dashboard config shares no structure with the
 * entity/pipeline configs beyond the stable-`id` rule, so there is nothing to
 * factor out and every reason to keep the two contracts separately readable.
 *
 * WHY `dataSource` IS TYPED, NOT `Record<string, unknown>`:
 * the JSON Schema leaves it free-form (`additionalProperties: true`) because it
 * was written before any renderer existed. `DashboardGrid`
 * (`@fams/v5-templates`'s `DashboardView`) now consumes it, so the vocabulary
 * is real and a blueprint author deserves completion + compile errors for it.
 * The index signature on `DashboardWidgetDataSource` keeps authoring
 * permissive — an unknown key is still legal, exactly as the schema says.
 *
 * DATA MODEL NOTE (rule 8): none of this fetches or aggregates. `kind: 'static'`
 * means the values ARE the blueprint; `kind: 'module'` is a declaration that a
 * consuming app is expected to resolve from a licensed module's records before
 * handing the config to the renderer. `DashboardView` renders what it is given.
 */

/** Categorical swatch index — mirrors `@fams/ui-kit`'s `BadgeColorIndex` without importing it (this package stays React/ui-kit-free at the type level). */
export type DashboardColorIndex = 1 | 2 | 3 | 4 | 5

/**
 * A CSS colour a blueprint may bind a series/slice/counter/legend entry to when
 * the categorical `colorIndex` palette is the wrong vocabulary — a KPI that is
 * conceptually THE brand measure (`"var(--color-primary)"`), or a category that
 * IS a status (`"var(--color-error-500)"`).
 *
 * Written as a token reference, never a hex: the renderer resolves it through
 * `resolveCssColor` at paint time, so it follows the active theme and tenant.
 * A literal (`"#f04438"`, `"tomato"`) is accepted but freezes the value out of
 * the token system — prefer `var(--token)`.
 */
export type DashboardColorToken = string

/**
 * The dimension values one datum belongs to — the declarative link between a
 * header filter pill and the data it filters.
 *
 * A pill declares the dimension it drives (`DashboardFilterPill.dimension`,
 * defaulting to the pill's own `id`); every filterable datum (a series, a
 * slice, a list item, a leaderboard row, a heat cell, a category position)
 * declares which values of that dimension it belongs to. Selecting an option
 * keeps the data whose dimension values intersect the selection.
 *
 * OMISSION MEANS "NOT SCOPED BY THIS DIMENSION", never "excluded": a datum that
 * carries no entry for a pill's dimension survives every selection of that
 * pill. That is what lets one pill filter the four widgets it is about without
 * blanking the five it is not, and it is why an un-annotated dashboard renders
 * exactly as it did before this key existed.
 *
 * ```json
 * { "timeframe": ["today", "last-7-days"], "vehicle": "dxb-b-1007" }
 * ```
 */
export type DashboardDimensionValues = Record<string, string | string[]>

/** The 14 widget forms `DashboardModuleConfig.schema.json` names. */
export type DashboardWidgetType =
  | 'donut'
  | 'bar'
  | 'line'
  | 'stacked-bar'
  | 'area'
  | 'compliance-gauge'
  | 'heatmap-calendar'
  | 'geospatial-heatmap'
  | 'leaderboard'
  | 'list'
  | 'kpi-card'
  | 'stat-with-target'
  | 'sparkline-table'
  | 'stack'

/** One plotted series (line / area / bar / stacked-bar / donut-as-single-series). */
export interface DashboardSeries {
  /** Stable id — drives legend toggling. Falls back to the series index. */
  id?: string
  label: string
  /** Values aligned 1:1 with `categories`. */
  data: number[]
  colorIndex?: DashboardColorIndex
  /** Non-categorical colour binding — wins over `colorIndex`. See `DashboardColorToken`. */
  colorToken?: DashboardColorToken
  /** Stack group — set the same value on every series that stacks together. */
  stackId?: string
  /** Dual-axis opt-in. `'leading'` (default) is the shared scale; `'trailing'` is the second scale on the mirrored edge (verdict V4 — use only when a design mandates it). */
  axis?: 'leading' | 'trailing'
  /** Unit suffix shown in the tooltip and the data-table twin, e.g. `'L'`. */
  unit?: string
  /** Renders the line dashed (forecast/target overlays). */
  dashed?: boolean
  /** Dimension values this series belongs to — see `DashboardDimensionValues`. */
  dimensions?: DashboardDimensionValues
}

/** One proportional slice — the `donut` widget's data shape. */
export interface DashboardSlice {
  id?: string
  label: string
  value: number
  colorIndex?: DashboardColorIndex
  /** Non-categorical colour binding — wins over `colorIndex`. See `DashboardColorToken`. */
  colorToken?: DashboardColorToken
  /** Dimension values this slice belongs to — see `DashboardDimensionValues`. */
  dimensions?: DashboardDimensionValues
}

/** Severity vocabulary shared by list rows and map markers. */
export type DashboardSeverity = 'critical' | 'warning' | 'info' | 'success'

/** One label-over-value metadata column on a list row. */
export interface DashboardMetaItem {
  id?: string
  label: string
  value: string | number
}

/** A `list` row, or a `geospatial-heatmap` point (`position` present). */
export interface DashboardListItem {
  id: string
  title: string
  description?: string
  severity?: DashboardSeverity
  /** Pre-formatted by the author (rule 8) — never parsed here. */
  timestamp?: string
  meta?: DashboardMetaItem[]
  /** `[longitude, latitude]` — GeoJSON order, matching `MapPanel`. */
  position?: [number, number]
  /** Heat intensity 0–1 (`render: 'heat'`). */
  weight?: number
  /** Legend/category id this point belongs to — matched against `legend[].id`. */
  category?: string
  /** Dimension values this item belongs to — see `DashboardDimensionValues`. */
  dimensions?: DashboardDimensionValues
}

/** One `leaderboard` / `sparkline-table` row. */
export interface DashboardRow {
  id: string
  /** 1-based rank. Falls back to the row's position. */
  rank?: number
  /** Rank movement since the previous period — rendered as an arrow + value, never colour alone (V12). */
  rankDelta?: number
  primary: string
  secondary?: string
  /** Marks the row as a podium card (`variant: 'podium'`). */
  podium?: 'gold' | 'silver' | 'bronze'
  score?: number | string
  /** Micro-trend for a `sparkline-table` row. */
  sparkline?: number[]
  /** Column values keyed by `DashboardColumn.key`. */
  cells?: Record<string, string | number | number[] | null>
  /** Score change since the previous period, rendered as the trailing delta column. */
  scoreDelta?: number
  /** Leading visual of the row's entity block — an avatar or a tinted glyph. */
  media?: DashboardMedia
  /** Plain text the built-in search matches. Falls back to `primary`/`secondary`. */
  searchText?: string
  /** Dimension values this row belongs to — see `DashboardDimensionValues`. */
  dimensions?: DashboardDimensionValues
}

/**
 * The leading visual of a row's entity block. JSON-expressible on purpose: a
 * blueprint cannot carry a React node, so it names WHAT to draw and the
 * renderer picks the component — `src`/`initials` render an `Avatar`, a bare
 * `icon` renders a tinted `IconBadge`. `src` wins over `initials` wins over
 * `icon` when more than one is authored.
 */
export interface DashboardMedia {
  /** Image URL. Falls back to `initials` on load error. */
  src?: string
  /** Initials source — a display name, not pre-abbreviated. */
  initials?: string
  /** Named lucide icon, kebab-case — the non-person case (a vehicle glyph, a site marker). */
  icon?: string
  /** Accessible name. Falls back to the row's `primary`. */
  label?: string
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}

/** A metric column of a `leaderboard` / `sparkline-table`. */
export interface DashboardColumn {
  key: string
  label: string
  align?: 'start' | 'center' | 'end'
  width?: string
  minWidth?: string
  /** Cell presentation. `'text'` (default), `'bar'` (a `StatBar`), `'sparkline'`, `'delta'` (arrow + value), `'counters'` (a `number[]` cell rendered as chips). */
  render?: 'text' | 'bar' | 'sparkline' | 'delta' | 'counters'
  /** Unit suffix appended to a `'text'`/`'bar'` cell. */
  unit?: string
  /**
   * Named lucide icon, kebab-case, drawn before every cell of this column —
   * the entity glyph a code-shaped column carries (a vehicle plate, a site
   * reference). The same JSON-expressible seam `DashboardMedia.icon` uses for
   * a ROW's entity block, at column scope: a blueprint cannot carry a React
   * node, so it names the glyph and the renderer resolves it. Decorative by
   * construction — the cell's own text is the accessible content.
   */
  icon?: string
  /** Fill tone of a `render: 'bar'` cell when no `thresholds` band matches. Default `'primary'`. */
  tone?: DashboardBarTone
  /**
   * Per-counter key for a `render: 'counters'` cell — one entry per position
   * in the cell's `number[]`, giving each count its icon and categorical
   * colour so the counters read as the same vocabulary the charts use.
   */
  counters?: DashboardCounterKey[]
  /**
   * Threshold bands for a `render: 'bar'` cell — the highest band whose `from`
   * the value clears wins. Generic on purpose (rule 10): the author states the
   * bands their own metric uses; no metric is ever named in the renderer.
   */
  thresholds?: DashboardBarThreshold[]
}

/** One position of a `render: 'counters'` cell. */
export interface DashboardCounterKey {
  label: string
  /** Named lucide icon, kebab-case. */
  icon?: string
  colorIndex?: DashboardColorIndex
  /** Non-categorical colour binding — wins over `colorIndex`. See `DashboardColorToken`. */
  colorToken?: DashboardColorToken
}

/** Fill tones a bar cell can take — mirrors `@fams/ui-kit`'s `StatBarTone`. */
export type DashboardBarTone = 'primary' | 'success' | 'warning' | 'danger'

/** One band of a bar cell's tone ramp. */
export interface DashboardBarThreshold {
  /** Inclusive lower bound of the band, in the cell's own units. */
  from: number
  tone: DashboardBarTone
  /**
   * The band stated in WORDS, appended to the cell's value. Without it the
   * band is encoded by fill colour alone (verdict V12) — a red bar and a
   * number tell a colour-blind reader nothing about which band they are in.
   */
  label?: string
}

/** One `heatmap-calendar` cell. `value: null` is an explicit "no data" (V12). */
export interface DashboardHeatCell {
  x: string | number
  y: string | number
  value: number | null
  /** Dimension values this cell belongs to — see `DashboardDimensionValues`. */
  dimensions?: DashboardDimensionValues
}

/** One discrete bin of a binned heat scale. Each states its numeric range in text. */
export interface DashboardBin {
  /** Inclusive lower bound. Omit on the first bin. */
  from?: number
  /** Exclusive upper bound. Omit on the last bin. */
  to?: number
  label: string
  /** Literal colour (a magnitude ramp, not a categorical hue — same vocabulary as `Gauge.sectors`). */
  color?: string
  /** Marks the "no data" class — gets a distinct glyph, never colour alone. */
  noData?: boolean
}

/** A legend/category declared ONCE and referenced by every widget that shows it. */
export interface DashboardLegendEntry {
  id: string
  label: string
  colorIndex?: DashboardColorIndex
  /** Non-categorical colour binding — wins over `color` and `colorIndex`. See `DashboardColorToken`. */
  colorToken?: DashboardColorToken
  /** Literal colour, for legends whose swatches are not the categorical palette (map markers, heat classes). */
  color?: string
}

/** One coloured band of a gauge arc. `to` is a percent of `[min, max]`. */
export interface DashboardGaugeSector {
  to: number
  color: string
}

/** The centre stack of a donut or gauge. */
export interface DashboardCenterLabel {
  value: string
  caption?: string
  trend?: { direction: 'up' | 'down' | 'flat'; value: string; note?: string }
}

export interface DashboardAxisSpec {
  title?: string
  /** Presentation hint for the author's own formatter, e.g. `'int'`, `'currency-AED'`. */
  format?: string
  /**
   * Pinned lower bound of a VALUE axis. Omit to let the chart fit the data.
   * Two independently-fitted scales on one dual-axis chart pin unrelated traces
   * together and invent a correlation (verdict V4) — zero-basing both is the
   * fix, and this is the key that expresses it. Ignored on a category axis.
   */
  min?: number
  /** Pinned upper bound of a VALUE axis — widen it so the tallest bar is not flush with the top gridline. */
  max?: number
  /**
   * Outer tier of a `heatmap-calendar` x-axis: group labels drawn under the
   * column labels, each centred on its own run of columns (sixteen weekly
   * columns reading under four month labels). `span` is the run length in
   * columns. Only read on `axis.x`.
   */
  groups?: { label: string; span: number }[]
  /**
   * Display labels for a `heatmap-calendar` column axis, parallel to
   * `categories`. `categories` are IDENTIFIERS (`cells[].x` is matched against
   * them), so they must stay unique; a two-tier axis wants the opposite —
   * `W1 W2 W3 W4` repeated under four month labels. Only read on `axis.x`.
   */
  tickLabels?: Array<string | number>
}

/**
 * A whole-source override that applies only under one combination of filter
 * values — the scalar counterpart of per-datum `dimensions`.
 *
 * Tagging works for a COLLECTION (drop the rows that do not belong); it cannot
 * express "under `Today` this gauge reads 92 and its sentence names today",
 * because there is no collection to filter — the datum IS the widget. A variant
 * states that case directly: the first variant whose `when` matches every
 * active pill value is shallow-merged over the base source, so an author
 * overrides only the keys that differ (`value`, `centerLabel`, `ariaLabel`, …).
 *
 * Applied BEFORE per-datum filtering, so a variant may itself supply a
 * different `series`/`rows` set that is then filtered as normal.
 */
export interface DashboardSourceVariant extends Partial<Omit<DashboardWidgetDataSource, 'variants'>> {
  /** Dimension values this variant applies under. Every entry must match. */
  when: DashboardDimensionValues
}

/**
 * The one data-binding vocabulary every widget type reads from. Each widget
 * uses the subset its form needs; the index signature keeps unknown keys legal.
 */
export interface DashboardWidgetDataSource {
  /** `'static'` (default) — the values are authored here. `'module'` — derived from `module` by the consuming app. */
  kind?: 'static' | 'module'
  /** Module id the values derive from when `kind: 'module'`. */
  module?: string
  aggregate?: 'count' | 'sum' | 'avg'
  /** Storage column on `module`'s blueprint that rows are grouped by. */
  groupBy?: string

  /** x categories (y categories when `orientation: 'horizontal'`). */
  categories?: Array<string | number>
  series?: DashboardSeries[]
  /** `donut` slices. */
  slices?: DashboardSlice[]
  /** `list` rows / `geospatial-heatmap` points. */
  items?: DashboardListItem[]
  /** `leaderboard` / `sparkline-table` rows. */
  rows?: DashboardRow[]
  columns?: DashboardColumn[]
  /** `heatmap-calendar` cells. */
  cells?: DashboardHeatCell[]
  bins?: DashboardBin[]
  legend?: DashboardLegendEntry[]

  /** Single-value widgets (`kpi-card`, `stat-with-target`, `compliance-gauge`). */
  value?: number | string
  unit?: string
  target?: number | string
  targetLabel?: string
  /** Muted text after the value, e.g. `"until critical at current consumption"`. */
  valueSuffix?: string
  /** Trailing chip on a KPI's label row, e.g. `"Real Time"`. */
  badge?: string
  trend?: { direction: 'up' | 'down' | 'flat'; value: string; note?: string }
  /** Named lucide icon, kebab-case. */
  icon?: string
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

  min?: number
  max?: number
  sectors?: DashboardGaugeSector[]
  centerLabel?: DashboardCenterLabel
  axis?: { x?: DashboardAxisSpec; y?: DashboardAxisSpec; yRight?: DashboardAxisSpec }

  orientation?: 'vertical' | 'horizontal'
  stacked?: boolean
  /** Muted full-height track behind every bar (a ranked bar list's "how far along the scale" affordance). */
  showTrack?: boolean
  smooth?: boolean
  /** `geospatial-heatmap` discriminator: categorical markers, or a heat surface. Default `'markers'`. */
  render?: 'markers' | 'heat'
  /**
   * `geospatial-heatmap` opening camera centre, `[longitude, latitude]`.
   * Omit to fit the camera to `items[].position` — authoring this only pins a
   * frame the data should not move.
   */
  center?: [number, number]
  /** `geospatial-heatmap` opening zoom. Omit to fit it to `items[].position`. */
  zoom?: number
  /**
   * Legend placement for a `donut` widget: `'horizontal'` (default) puts the
   * legend in the card's legend row above the chart; `'vertical'` puts it
   * beside the chart, which is what both dashboard donuts draw.
   */
  legendOrientation?: 'horizontal' | 'vertical'
  /**
   * Legend placement for a `bar` / `stacked-bar` / `line` widget: `'bottom'`
   * (default) or `'top'`. Distinct from `legendOrientation`, which is the
   * donut's beside-vs-above knob — a card whose donut keys above the plot and
   * whose bar keys below it reads as two different cards.
   */
  legendPlacement?: 'top' | 'bottom'
  /** `leaderboard` shape. Default `'table'`. */
  variant?: 'table' | 'podium'
  /**
   * Header of a `leaderboard`'s entity column. Default `'Name'` — author the
   * noun the board actually ranks ("Vehicle", "Driver", "Site").
   */
  entityLabel?: string
  /**
   * Renders the leaderboard's leading RANK column. Default `true`. Set `false`
   * for a board whose rows are already in rank order and whose design carries
   * no rank column; the podium keeps its medallion either way.
   */
  showRank?: boolean
  podiumCount?: number
  searchable?: boolean
  /** Placeholder of the `leaderboard` search field. Default `'Search'`. */
  searchPlaceholder?: string
  /** Caption above each podium card's headline score, e.g. `'Behavior score'`. */
  scoreLabel?: string
  /** Unit appended to a podium card's score, e.g. `'pts'`. */
  scoreUnit?: string
  /** Caption above each podium card's counters block, e.g. `'Critical events'`. */
  detailLabel?: string
  /** Named lucide icon rendered as the podium card's decorative emblem, e.g. `'trophy'`. */
  podiumEmblem?: string
  /** `cells` key whose `counters` column also fills the podium cards' detail block. */
  detailKey?: string

  /**
   * A select scoped to THIS widget, rendered in its card header — the shape a
   * board that ranks one slice of a collection needs ("All vehicles", one
   * depot, one shift). Distinct from a page filter pill, which scopes every
   * widget; a widget-scoped control belongs on the widget it scopes.
   */
  scopeFilter?: DashboardScopeFilter

  /**
   * The list rail beside a `geospatial-heatmap`'s map — a search field, an
   * optional filter control, and a scrollable list of `items[]` whose search
   * filters BOTH the list and the markers, and whose rows select a marker.
   *
   * DEFAULTED FROM THE DATA, not authored: a marker widget whose `items[]`
   * carry list content (a `title` plus a `description` or `timestamp`) gets
   * the rail, because those fields exist for no other reason. A heat surface,
   * or points that are bare coordinates, stays map-only. Author the object to
   * customise the rail (placeholder, width, filter control) or `false` to
   * suppress it on a widget whose points happen to be labelled.
   */
  listRail?: DashboardListRail | false

  /** Renders each bar's value at the bar end — use when the track carries no meaning of its own. */
  showValues?: boolean
  /** Supporting line under the card title. */
  subtitle?: string

  /** Fixed body height in px. Omit to use the widget's own default. */
  height?: number
  /** The chart's sentence-shaped `aria-label` (verdict V10). Falls back to the widget title. */
  ariaLabel?: string
  /** Rendered centred and muted when the widget has no data. */
  emptyText?: string
  /** Rendered with a retry affordance when the widget is in an error state. */
  errorText?: string

  /**
   * Dimension values of each x/y CATEGORY, parallel to `categories`.
   *
   * A category axis is the one filterable collection that is not a list of
   * objects — the days a trend is plotted over are bare strings, so they have
   * nowhere to carry their own `dimensions`. This array does it positionally:
   * dropping a category drops that index from `categories`, from
   * `axis.x.tickLabels`, and from EVERY series' `data[]` in step, which is what
   * makes a Time Frame pill actually narrow a trend line.
   */
  categoryDimensions?: DashboardDimensionValues[]

  /**
   * Whole-source overrides per filter combination — see `DashboardSourceVariant`.
   * First match wins and is shallow-merged over this source.
   */
  variants?: DashboardSourceVariant[]

  [key: string]: unknown
}

/** A widget-scoped single-select, rendered in the widget's own card header. */
export interface DashboardScopeFilter {
  id: string
  /** Accessible name / visible label of the control. */
  label: string
  options: { value: string; label: string }[]
  /**
   * Label of the UNSCOPED option, which the renderer always injects first and
   * always defaults to. Default `"All <label>"`. A scoping control with no way
   * back to the unscoped view is a one-way door, so the option is not optional
   * — only its wording is.
   */
  allLabel?: string
  defaultValue?: string
}

/** Options of the list rail beside a `geospatial-heatmap`'s map. */
export interface DashboardListRail {
  /** Placeholder + accessible name of the search field. Default `'Search'`. */
  searchPlaceholder?: string
  /** Renders a filter control beside the search field. Only set it when `onFilter` has somewhere to go — an unwired control must be absent (verdict V11). */
  filterable?: boolean
  /** Rail width as a CSS length. Default `'22rem'`. */
  width?: string
}

/** One widget in the 12-column grid. */
export interface DashboardWidget {
  id: string
  title?: string
  type: DashboardWidgetType
  /** Columns of 12 the widget occupies at `lg` and up. 1–12, default 6. */
  span?: number
  dataSource?: DashboardWidgetDataSource
  /**
   * `type: 'stack'` ONLY — the widgets stacked vertically inside this one grid
   * cell, in order.
   *
   * WHY A CONTAINER AND NOT A `rowSpan`: the grid's rows are auto-sized, so a
   * `rowSpan` only lines up while every widget in the affected rows happens to
   * be the same height — the moment one card grows, the spanned cell tears. A
   * stack states the intent directly ("these two cards share one column"),
   * needs no row model at all, and each child keeps its own authored
   * `dataSource.height`, which is what actually produces the Figma masonry
   * column (308 over 596 beside a 452/452 column).
   *
   * A stack is a LAYOUT node: it has no `dataSource` of its own, its `span` is
   * the cell it occupies, and its children's `span` is ignored (they are full
   * width of the stack). Nesting a stack inside a stack is rejected by the
   * validator — one level is all the masonry needs and more is a grid.
   */
  children?: DashboardWidget[]
}

/** One tile of the top KPI region. */
export interface DashboardKpiTile {
  id: string
  label: string
  /** Named lucide icon, kebab-case. */
  icon?: string
  type: 'stat' | 'stat-with-target' | 'delta' | 'trend'
  /** Field id on the source module the target is read from (`stat-with-target`). */
  targetFieldId?: string
  /**
   * Number presentation, applied by `DashboardView` through `Intl.NumberFormat`
   * in the document's own locale. Recognised: `'integer'` (thousands
   * separators, no decimals), `'decimal'` / `'decimal:<n>'` (fixed decimals,
   * default 1), `'percent'`, `'currency-<ISO>'` (e.g. `'currency-AED'`).
   * Anything else is left verbatim — a value that is already a formatted
   * string ("7:45 hrs") stays untouched.
   */
  format?: string
  unit?: string
  valueSuffix?: string
  badge?: string
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  dataSource?: DashboardWidgetDataSource
}

/** One filter pill in the header toolbar. Pills scope EVERY widget on the page. */
export interface DashboardFilterPill {
  id: string
  label: string
  type: 'time-range' | 'single-select' | 'multi-select' | 'group-by'
  /**
   * The data dimension this pill drives. Defaults to the pill's own `id`.
   *
   * This is the whole link between a pill and the data: the renderer keeps a
   * datum when its `dimensions[dimension]` intersects the pill's value, and
   * keeps every datum that does not carry the key at all. A pill that no datum
   * on the page carries is NOT RENDERED — a control that cannot change anything
   * must be absent from the DOM, never inert (verdict V11).
   */
  dimension?: string
  /** Entity the options conceptually come from (documentation; a dashboard module has no adapter of its own). */
  entityId?: string
  defaultValue?: string | string[]
  /** Explicit option list — the authored source of truth for the pill's menu. */
  options?: { value: string; label: string }[]
  /**
   * Label of the UNSCOPED option the renderer injects at the head of every
   * collection pill (single-select / group-by). Default `"All <label>"`.
   * Never author an "all" option yourself — a value no datum carries would
   * filter everything away. `time-range` pills get no injected option: their
   * widest preset already is the unscoped view.
   */
  allLabel?: string
}

export interface DashboardSavedView {
  id: string
  label: string
  isDefault?: boolean
}

/** The authored dashboard module-config document. Mirrors `DashboardModuleConfig.schema.json`. */
export interface DashboardModuleConfigBlueprint {
  $schema?: string
  /** Stable module id — `^[a-z][a-z0-9-]*$`. */
  id: string
  kind: 'dashboard'
  displayName: { singular: string; plural?: string }
  /** Named lucide icon, kebab-case. */
  icon?: string
  description?: string
  kpiStrip?: DashboardKpiTile[]
  filterPills?: DashboardFilterPill[]
  widgetGrid: DashboardWidget[]
  views?: DashboardSavedView[]
  rbac?: Record<string, unknown>
}

/** Every legal `DashboardWidget.type`, in schema order — the runtime twin of the union. */
export const DASHBOARD_WIDGET_TYPES: readonly DashboardWidgetType[] = [
  'donut',
  'bar',
  'line',
  'stacked-bar',
  'area',
  'compliance-gauge',
  'heatmap-calendar',
  'geospatial-heatmap',
  'leaderboard',
  'list',
  'kpi-card',
  'stat-with-target',
  'sparkline-table',
  'stack',
] as const

/** Every legal `DashboardKpiTile.type`. */
export const DASHBOARD_KPI_TYPES: readonly DashboardKpiTile['type'][] = [
  'stat',
  'stat-with-target',
  'delta',
  'trend',
] as const

/** Every legal `DashboardFilterPill.type`. */
export const DASHBOARD_FILTER_PILL_TYPES: readonly DashboardFilterPill['type'][] = [
  'time-range',
  'single-select',
  'multi-select',
  'group-by',
] as const
