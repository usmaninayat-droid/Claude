import type { ReactNode } from 'react'
import type { IconBadgeTone } from '@fams/ui-kit'
import type { RecordTableColumn } from './RecordTable'

/**
 * The `OverviewWidgets` CONFIG CONTRACT. [tier-2]
 *
 * Every widget is a small type tag plus FIELD-KEY INDIRECTION into the record
 * (`valueField`/`seriesField`/`itemsField`/`metaFields`…) — the same "field-key
 * indirection, never a hardcoded business shape" rule the rest of this package
 * follows (root `CLAUDE.md` rule 10). Icons and tones are named by STRING
 * (`"telematics"`, `"success"`) because a JSON-authored blueprint cannot carry a
 * component reference; unknown names degrade rather than crash.
 *
 * Split from `OverviewWidgets.tsx` so a blueprint author (and the demo layer's
 * JSON) can be type-checked against the contract without pulling the renderer's
 * ui-kit/map import chain.
 */

/**
 * Semantic tint vocabulary, shared by every widget that carries a tone. Reuses
 * `IconBadgeTone`'s closed enum rather than inventing a parallel one, so a tone
 * a blueprint names is the same tone `IconBadge`/`KpiTile` already understand.
 */
export type OverviewTone = IconBadgeTone

/**
 * Which of the Overview grid's two columns a widget belongs to.
 *
 * `'start'` / `'end'` place the widget in that column's own vertical stack;
 * `'full'` (the default) spans the whole width. The frame's Overview is exactly
 * this: a `'full'` alert banner, then the telematics card + live map in the
 * start column and the trips chart + critical-events card in the end column.
 *
 * A widget list where NO widget names a column renders as a single stack —
 * which is what every pre-existing `OverviewWidgets` consumer authored, so this
 * whole feature is opt-in and back-compatible.
 */
export type OverviewWidgetColumn = 'start' | 'end' | 'full'

interface OverviewWidgetBase {
  /** See `OverviewWidgetColumn`. Default `'full'`. */
  column?: OverviewWidgetColumn
}

/**
 * One `metaFields` entry — a bare field name (no icon) or `{field, icon}` to opt
 * that one meta value into a leading glyph (the frame's calendar glyph before
 * the trip datetime). `icon` is a NAME, resolved through `@fams/ui-kit/icons`'
 * `getIcon`.
 */
export type OverviewMetaField = string | { field: string; icon?: string }

/**
 * The frame's full-width alert strip: info-tinted, leading bell glyph, message,
 * end-aligned meta chips.
 *
 * `type: 'planBanner'` is the ORIGINAL name (still used by the iwmp asset
 * blueprint) and stays a first-class member of the union, rendering
 * identically — `'alertBanner'` is the name the tanker-detail frame's widget
 * goes by. Both accept the same config; neither is deprecated in behaviour.
 */
/**
 * One decorative filter-row field — same "no wired behavior" precedent
 * `InteractiveReplayFilterField` documents (a `RecordTable` `timeframeSelect`
 * lookalike): a static label/value pill with a leading glyph and trailing
 * chevron, module-agnostic and field-key free by design (there is no
 * underlying record shape to indirect into — it is chrome, not data).
 */
export interface OverviewFilterField {
  kind: 'dateRange' | 'multiSelect' | 'select'
  label: string
  /** Bold value line under `label` (e.g. `"01/01/2026 - 03/01/2026"`) — omit to fall back to `label` alone. */
  value?: string
  /** Named leading glyph, resolved through `@fams/ui-kit/icons`' `getIcon`. Defaults per `kind` when omitted. */
  icon?: string
}

/**
 * The frame's top-start filter row (e.g. Fill Level Monitoring's date-range
 * field) — one or more `OverviewFilterField`s rendered as a button row above
 * the rest of the tab's widgets.
 */
export interface OverviewFilterBarWidget extends OverviewWidgetBase {
  type: 'filterBar'
  filters: OverviewFilterField[]
}

export interface OverviewAlertBannerWidget extends OverviewWidgetBase {
  type: 'alertBanner' | 'planBanner'
  /** Named leading glyph (e.g. `"bell"`, `"calendar"`). Unknown/omitted → a bell. */
  icon?: string
  title: ReactNode
  /** Record field names (or `{field, icon}`), read in order and rendered as end-aligned, divider-separated metadata. */
  metaFields?: OverviewMetaField[]
  /** Tint of the strip. Default `'info'` (the frame's own). */
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral'
}

/**
 * Icon + caption over a large, tone-coloured status VALUE, with an end-aligned
 * meta line — the frame's "Telematics / Reporting / Last Received: 5 min ago"
 * card.
 */
export interface OverviewStatusCardWidget extends OverviewWidgetBase {
  type: 'statusCard'
  /** Named leading glyph, fixed at authoring time. */
  icon?: string
  /** …or read the glyph NAME off the record, for a status whose icon varies per row. Wins over `icon`. */
  iconField?: string
  /** The small muted caption above the value. */
  label: ReactNode
  /** `record[valueField]` — the big status word. Renders an em dash when absent. */
  valueField: string
  /** `record[toneField]` — a tone name, or a key into `toneMap`. */
  toneField?: string
  /** Maps a domain status value (`"reporting"`, `"offline"`) to an `OverviewTone`. */
  toneMap?: Record<string, OverviewTone>
  /** `record[metaField]` — the end-aligned meta value (e.g. `"5 min ago"`). */
  metaField?: string
  /** Prefix rendered before the meta value as `"<metaLabel>: <value>"` (e.g. `"Last Received"`). */
  metaLabel?: ReactNode
}

/**
 * One tile's config inside a `statusCardRow` — the same fields `statusCard`
 * itself carries, minus `type`/`column` (the row owns placement, not the tile).
 */
export type OverviewStatusCardConfig = Omit<OverviewStatusCardWidget, 'type' | 'column'>

/**
 * A horizontal row of `statusCard` tiles, equal width — the frame's 4-across
 * Telematics/DMS/Temperature/Fill-Level strip. `statusCard` itself stays a
 * single full-width tile (back-compat for every existing consumer); this is
 * the additive N-up sibling for when a design wants several side by side.
 */
export interface OverviewStatusCardRowWidget extends OverviewWidgetBase {
  type: 'statusCardRow'
  cards: OverviewStatusCardConfig[]
  /** Tiles per row at `sm` and up. Default `4`. */
  columns?: 1 | 2 | 3 | 4
}

/** One stat in a `levelSummary` card's divider-separated row. */
export interface OverviewLevelStat {
  label: ReactNode
  /** `record[valueField]` — pre-formatted by the data layer (Rule 8). */
  valueField: string
  /** Light-weight unit/qualifier rendered after the value (e.g. `"of 60L"`). */
  unit?: ReactNode
}

/**
 * The frame's fuel/fill-level summary card: header icon+title, a divider-
 * separated stat row, and a full-width level bar with tick labels underneath —
 * the Overview tab's "Fuel Monitoring" end-column card (UCCP: "Fill Level
 * Monitoring"). Generic: the bar's fraction and its tick captions are all
 * field-key indirected, so nothing here knows this is fuel.
 */
export interface OverviewLevelSummaryWidget extends OverviewWidgetBase {
  type: 'levelSummary'
  title: ReactNode
  icon?: string
  stats: OverviewLevelStat[]
  /** `record[barValueField]` — 0-100, the bar's filled fraction. */
  barValueField: string
  /** Tick caption under the bar's start edge (e.g. `"0L"`). */
  barMinLabel?: ReactNode
  /** Tick caption under the bar's end edge (e.g. `"60L"`). */
  barMaxLabel?: ReactNode
  /** Tone of the filled bar. Default `'success'` (the frame's green). */
  tone?: OverviewTone
}

/** One extra stacked caption/value column in an `eventList` row (`layout: 'columns'`). */
export interface OverviewEventColumn {
  label: ReactNode
  /** Row key this column reads. */
  key: string
}

/** One tile in a `kpiTiles` grid. */
export interface OverviewKpiTileConfig {
  label: ReactNode
  /** `record[valueField]` — pre-formatted by the data layer (Rule 8). */
  valueField: string
  /** Unit suffix beside the value (e.g. `"km"`, `"QAR"`). */
  unit?: ReactNode
  /** Named leading glyph. */
  icon?: string
  /** Tints both the icon chip and the value ink. Omit to stay neutral. */
  tone?: OverviewTone
}

/** A responsive grid of `KpiTile`s, driven entirely by a config array. */
export interface OverviewKpiTilesWidget extends OverviewWidgetBase {
  type: 'kpiTiles'
  tiles: OverviewKpiTileConfig[]
  /** Tiles per row at `sm` and up. Default `2`. */
  columns?: 1 | 2 | 3 | 4
}

/**
 * A categorical bar-chart card — the frame's "Number of Trips" widget (icon +
 * title, vertical bars, a value-axis title, Jan…Dec categories).
 */
export interface OverviewBarChartWidget extends OverviewWidgetBase {
  type: 'barChart'
  title: ReactNode
  /** Named glyph for the card header. */
  icon?: string
  /** `record[seriesField]` — a row array, one row per bar. */
  seriesField: string
  /** Row key holding each bar's category label. Default `'label'`. */
  categoryKey?: string
  /** Row key holding each bar's numeric value. Default `'value'`. */
  valueKey?: string
  /** Series name used in the tooltip. Defaults to `yAxisTitle`, then `title`. */
  seriesLabel?: string
  /** Category-axis title. Omit for none. */
  xAxisTitle?: string
  /** Value-axis title (the frame's rotated "Number Of Trips"). */
  yAxisTitle?: string
  /** Raw bar colour override. Defaults to `var(--color-primary)` — the tenant's own brand hue. */
  color?: string
  /** Plot height in px. Default `280`. */
  height?: number
}

/**
 * A titled card listing bordered event rows: leading type glyph + label on the
 * start side, time over address on the end side — the frame's "Critical Events".
 */
export interface OverviewEventListWidget extends OverviewWidgetBase {
  type: 'eventList'
  title: ReactNode
  /** Named glyph for the card header. */
  icon?: string
  /** `record[itemsField]` — the event row array. */
  itemsField: string
  /** Row key holding each event's stable id (used as the `onEventSelect` argument). Default `'id'`. */
  idKey?: string
  /** Row key holding the event TYPE — the lookup key for `iconMap`/`toneMap`. Default `'type'`. */
  typeKey?: string
  /** Row key holding the display label. Default `'label'`; falls back to the type value. */
  labelKey?: string
  /** Row key holding the pre-formatted time. Default `'time'`. */
  timeKey?: string
  /** Row key holding the address line. Default `'address'`. */
  addressKey?: string
  /** Event type → named glyph. */
  iconMap?: Record<string, string>
  /** Named glyph used for a row whose type `iconMap` does not name. */
  itemIcon?: string
  /** Event type → tone, tinting that row's glyph. */
  toneMap?: Record<string, OverviewTone>
  /** Shown instead of the rows when the field is empty/absent. */
  emptyText?: ReactNode
  /**
   * `'inline'` (default) is the original time-over-address end block.
   * `'columns'` is the frame's "Critical Events" populated-state layout: a
   * severity chip beside the label, then N stacked caption/value columns
   * (Driver/Location/Start Time/End Time) — set `columns` to describe them.
   * `'icons'` is the Events tab's icon-row layout: a colored circular icon
   * badge (via `toneMap`) + bold label on the start side, a clock-icon
   * time line over a pin-icon address line on the end side — used by
   * `EventsOverview`.
   */
  layout?: 'inline' | 'columns' | 'icons'
  /** Row key holding a severity/status word (e.g. `"critical"`). Rendered as a tone chip beside the label when `layout: 'columns'`. */
  severityKey?: string
  /** Fixed chip text override (e.g. always `"CRITICAL"|`); falls back to the row's own `severityKey` value, upper-cased. */
  severityLabel?: ReactNode
  /** Severity value → tone for the chip. Default `'danger'`. */
  severityToneMap?: Record<string, OverviewTone>
  /** The extra stacked columns rendered end-of-row when `layout: 'columns'` (e.g. Driver/Location/Start Time/End Time). */
  columns?: OverviewEventColumn[]
}

/** One series in a `lineChart` widget — see `LineChart`'s own dual-axis note before using `axis: 'trailing'`. */
export interface OverviewLineSeries {
  /** Row key holding this series' numeric value. */
  key: string
  label: string
  unit?: string
  axis?: 'leading' | 'trailing'
  color?: string
}

/**
 * A time-series line-chart card, one/two series — the frame's "Fuel Consumed
 * Over Distance" (UCCP: "Fill Level Over Distance") dual-axis chart. Row shape
 * is `{ [categoryKey]: string, ...series keys }[]`, read off `record[rowsField]`.
 */
export interface OverviewLineChartWidget extends OverviewWidgetBase {
  type: 'lineChart'
  title: ReactNode
  icon?: string
  /** `record[rowsField]` — one row per x-axis category. */
  rowsField: string
  /** Row key holding the x-axis category label. Default `'label'`. */
  categoryKey?: string
  series: OverviewLineSeries[]
  yAxisTitle?: string
  yAxisTitleTrailing?: string
  height?: number
}

/** Overridable strings on the map widget's overlay furniture (a11y names + the card caption). */
export interface OverviewLocationCardStrings {
  title: ReactNode
  openLabel: string
  zoomInLabel: string
  zoomOutLabel: string
  fullscreenLabel: string
}

/**
 * The live-location map slot — a map with the frame's overlay furniture: a
 * status pill top-start, a "Current Location" card with an open-in-new action
 * bottom-start, and a zoom ±/fullscreen stack bottom-end.
 *
 * `polygonsField` remains supported for the original polygon-overlay use (the
 * iwmp collection-point zone); `pinsField`/`centerField` are the additive
 * point-location path the tanker frame needs.
 */
export interface OverviewLocationMapWidget extends OverviewWidgetBase {
  type: 'locationMap'
  title: ReactNode
  /** Named glyph for the card header. Ignored when `hideHeader` is set. Defaults to a map glyph. */
  icon?: string
  /** `record[polygonsField]` — `LocationMapPolygon[]`. The camera fits their combined bounds. */
  polygonsField?: string
  /** `record[pinsField]` — `LocationMapPin[]`. */
  pinsField?: string
  /** `record[centerField]` — an explicit `[lng, lat]` camera centre; wins over a derived one. */
  centerField?: string
  /** Explicit camera zoom; wins over the polygon bounds-fit. */
  zoom?: number
  /** `record[statusField]` — the label for the top-start status pill. Omit for no pill. */
  statusField?: string
  /** Maps that status value to the pill's fill tone. */
  statusToneMap?: Record<string, OverviewTone>
  /** `record[addressField]` — the "Current Location" card's address line. Omit for no card. */
  addressField?: string
  /** Overrides for the overlay's strings. */
  strings?: Partial<OverviewLocationCardStrings>
  /** Map height in px. Default `292`. */
  height?: number
  /** Renders the card WITHOUT the header chrome, so the map fills the widget. Default `false`. */
  hideHeader?: boolean
  /**
   * Checkbox pin-filter chips above the map (the "Fill Level Events" map's
   * Refill/Empty/Theft toggles) — each entry's `key` matches a pin's own
   * `category`. Omit for no filter row (every pin always shown, the original
   * behaviour). All filters start checked.
   */
  pinFilters?: { key: string; label: string; color?: string }[]
}

/**
 * The ORIGINAL area-chart card (an over-time trend from a `{month, value}[]`
 * field). Kept as a first-class union member for back-compat — `barChart` is
 * the additive categorical sibling the tanker frame needs, not a replacement.
 */
export interface OverviewTrendChartWidget extends OverviewWidgetBase {
  type: 'trendChart'
  title: ReactNode
  /** `record[seriesField]` — `{ month: string; value: number }[]`. */
  seriesField: string
  /** Series label shown in the chart's tooltip. Defaults to `title`. */
  yLabel?: string
  /** Raw colour override for the series line/fill. */
  color?: string
}

/**
 * One optional intra-day block on a `dailyTimeline` row. `start`/`end` are
 * `"HH:MM"` clock times inside the widget's window; `state` defaults to
 * `'active'`. A row carrying `segments[]` is the PREFERRED shape — it is the
 * real on/off pattern; without it the row degrades to one proportional active
 * block plus one inactive block computed from the minute totals.
 */
export interface OverviewDailyTimelineSegment {
  state?: 'active' | 'inactive'
  /** `"HH:MM"`. */
  start?: string
  /** `"HH:MM"`. */
  end?: string
}

/** Overridable strings on a `dailyTimeline` (header captions + the off-day track). */
export interface OverviewDailyTimelineStrings {
  day: string
  summary: string
  active: string
  inactive: string
  off: string
  empty: string
}

/**
 * The day-by-day activity timeline — one ROW PER DAY over a FIXED clock window,
 * with active/inactive segments, a muted "no planned shift" track for off days,
 * and the day's figures stated in words beside it (never colour-only).
 *
 * Row shape, all field-key indirected: `{[dateKey], [weekdayKey], [offKey],
 * [activeMinutesKey], [inactiveMinutesKey], [usagePctKey], [segmentsKey]?}` read
 * off `record[rowsField]`. Minute values are NUMBERS (this widget derives the
 * `"7h 36m"` reading and the bar geometry from them — the one arithmetic
 * exception the board makes, the same way `levelSummary` derives its fraction).
 */
export interface OverviewDailyTimelineWidget extends OverviewWidgetBase {
  type: 'dailyTimeline'
  title: ReactNode
  /** Supporting line under the title (e.g. the window + date range). */
  subtitle?: ReactNode
  /** Named glyph for the card header. */
  icon?: string
  /** `record[rowsField]` — one row per day, newest-first or oldest-first as authored. */
  rowsField: string
  /** Window start as `"HH:MM"`. Default `"05:00"`. */
  windowStart?: string
  /** Window end as `"HH:MM"`. Default `"19:00"`. */
  windowEnd?: string
  /** Hours between axis ticks. Default `2`. */
  tickStepHours?: number
  /** Row key holding the date label. Default `'date'`. */
  dateKey?: string
  /** Row key holding the weekday label. Default `'weekday'`. */
  weekdayKey?: string
  /** Row key holding the truthy "no planned shift" flag. Default `'isOff'`. */
  offKey?: string
  /** Row key holding the day's active minutes. Default `'activeMinutes'`. */
  activeMinutesKey?: string
  /** Row key holding the day's inactive minutes. Default `'inactiveMinutes'`. */
  inactiveMinutesKey?: string
  /** Row key holding the day's usage percentage. Default `'usagePct'`. Omit-safe. */
  usagePctKey?: string
  /** Row key holding the OPTIONAL `OverviewDailyTimelineSegment[]`. Default `'segments'`. */
  segmentsKey?: string
  strings?: Partial<OverviewDailyTimelineStrings>
}

/**
 * A titled card wrapping a full `RecordTable` over one of the record's own
 * array fields — the composing escape hatch for a tab that needs a chart (or
 * KPIs) AND a clean data table together, which no single other widget covers.
 * The `columns` shape is `RecordTable`'s own column contract; `field` indirects
 * into `record[field]` exactly like every other widget here.
 */
export interface OverviewRecordTableWidget extends OverviewWidgetBase {
  type: 'recordTable'
  /** Card header title. Omit for a bare table with no card chrome. */
  title?: ReactNode
  /** Named glyph for the card header. */
  icon?: string
  /** `record[field]` — the row array the table renders. */
  field: string
  /** `RecordTable` column definitions (same contract as the `RecordTable` tab component). */
  columns: RecordTableColumn[]
  /** Shows the table's client-side search box. Default `false`. */
  search?: boolean
  /** `statusPill` column color lookup, keyed by the raw cell value. */
  statusColors?: Record<string, string>
  /** Shown instead of the table when the field is empty/absent. */
  emptyText?: ReactNode
}

export type OverviewWidget =
  | OverviewFilterBarWidget
  | OverviewAlertBannerWidget
  | OverviewTrendChartWidget
  | OverviewStatusCardWidget
  | OverviewStatusCardRowWidget
  | OverviewKpiTilesWidget
  | OverviewBarChartWidget
  | OverviewEventListWidget
  | OverviewLocationMapWidget
  | OverviewLevelSummaryWidget
  | OverviewLineChartWidget
  | OverviewDailyTimelineWidget
  | OverviewRecordTableWidget

/**
 * `planBanner`'s original standalone type name, kept as an alias so existing
 * imports (`OverviewPlanBannerWidget`) keep resolving.
 */
export type OverviewPlanBannerWidget = OverviewAlertBannerWidget
