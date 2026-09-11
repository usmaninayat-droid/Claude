import { createElement } from 'react'
import { resolveFieldIcon, type EntityConfig } from '@fams/v5-composer'
import type { ColumnCatalogItem } from '@fams/ui-kit'

/**
 * live-list-model.ts — the hybrid list panel's width-state machine and
 * column derivation (figma live-monitoring spec §1.2). Pure — shared by
 * `LiveListPanel`, `LivePanelDivider`, and the Customize View drawer's
 * "List View State" dropdown so all three speak the same three values.
 */

/**
 * The divider's width steps — also Customize View's "List View State".
 * `'hidden'` is the ✕ grabber's state expressed as a VALUE (UX finding 7):
 * WCAG 2.5.8's exception only applies when an undersized control has an
 * equivalent elsewhere, so "Hide list" must be reachable from Customize View
 * too. Additive — `stepWidthState` still cycles only the three sizes.
 */
export type LiveListWidthState = 'collapsed' | 'expanded' | 'fully-expanded' | 'hidden'

export const LIVE_LIST_WIDTH_STATES: { value: LiveListWidthState; label: string }[] = [
  { value: 'collapsed', label: 'Collapsed' },
  { value: 'expanded', label: 'Expanded' },
  { value: 'fully-expanded', label: 'Fully Expanded' },
  { value: 'hidden', label: 'Hide list' },
]

/**
 * Panel width per state. Collapsed is the SPEC §2.2 geometry exactly —
 * the Figma panel spans x=118→590, i.e. **472px** (29.5rem) — so the
 * 119/140/150px columns + the pencil cell fit without crushing (UX-1).
 * Expanded/Fully Expanded step up from there; the table's own inner
 * horizontal scroll absorbs anything that still overflows, never the page.
 */
export const LIVE_LIST_WIDTH_CLASS: Record<LiveListWidthState, string> = {
  collapsed: 'md:w-[29.5rem]',
  expanded: 'md:w-[40rem]',
  'fully-expanded': 'md:w-[56rem]',
  // `hidden` never paints a panel (the caller unmounts it) — the entry keeps
  // the record total so a lookup can never be `undefined`.
  hidden: 'hidden',
}

/**
 * The width each state ASKS for, in CSS px — the same values
 * `LIVE_LIST_WIDTH_CLASS` expresses in rem. A rendered panel narrower than
 * its entry means the viewport clamp is binding, which is what tells the
 * divider not to offer a widen step whose outcome nobody can see (round-4
 * finding N5: at 1280 `Fully Expanded` renders pixel-identical to
 * `Expanded`).
 */
export const LIVE_LIST_WIDTH_PX: Record<LiveListWidthState, number> = {
  collapsed: 472,
  expanded: 640,
  'fully-expanded': 896,
  hidden: 0,
}

/** Fixed row rhythm (SPEC §2.2, UX-2's virtualization estimate) in CSS px —
 *  the scroll offset a not-yet-mounted virtual row sits at. */
export const LIVE_ROW_HEIGHT_PX = 48

const ORDER: LiveListWidthState[] = ['collapsed', 'expanded', 'fully-expanded']

/** One step narrower / wider; clamps at the ends. */
export function stepWidthState(state: LiveListWidthState, direction: 'narrower' | 'wider'): LiveListWidthState {
  const at = ORDER.indexOf(state)
  const next = direction === 'wider' ? Math.min(at + 1, ORDER.length - 1) : Math.max(at - 1, 0)
  return ORDER[next]
}

/** Resolves a listcolumns/systemcolumns reference (field id or col key) to a col key. */
function toCol(config: EntityConfig, key: string): string {
  return config.systemcolumns.find((c) => c.id === key)?.col ?? key
}

/**
 * The panel's default visible col keys per width state: the compact hybrid
 * columns (`uiConfig.hybrid.listColumns`, falling back to `listcolumns`),
 * plus `uiConfig.map.expandedColumns` from Expanded up. Expanded ORDER per
 * SPEC v2 §2.2 — identity column first, then the expanded columns in
 * blueprint order, then the remaining collapsed columns (VEHICLE · SPEED ·
 * TIMESTAMP · ACTIVITY OVERVIEW for the live-monitoring binding), not
 * collapsed-then-extras-appended.
 */
export function defaultLiveListColumns(config: EntityConfig, state: LiveListWidthState): string[] {
  const base = [
    ...new Set(
      (config.uiConfig.hybrid?.listColumns ?? config.listcolumns.map((p) => p.col)).map((key) => toCol(config, key)),
    ),
  ]
  if (state === 'collapsed') return base
  const extra = (config.uiConfig.map?.expandedColumns ?? []).map((key) => toCol(config, key))
  const [identity, ...rest] = base
  return [...new Set([identity, ...extra, ...rest].filter((c): c is string => Boolean(c)))]
}

/**
 * The Columns popover's default "Shown" value — `uiConfig.map.columnsShown`
 * when the blueprint binds it (SPEC v2 §2.6: Vehicle · Speed · Health · Last
 * Record Received, DECOUPLED from the collapsed table columns), else the
 * collapsed table columns as before. Once the user edits columns, their
 * explicit selection drives BOTH the popover and the rendered table.
 */
export function defaultLiveShownColumns(config: EntityConfig): string[] {
  const bound = config.uiConfig.map?.columnsShown
  if (bound?.length) return [...new Set(bound.map((key) => toCol(config, key)))]
  return defaultLiveListColumns(config, 'collapsed')
}

/**
 * Every systemcolumn as a Columns-popover catalog entry (col key = catalog
 * key). The OFF fields are sectioned by the blueprint's own
 * `SystemColumn.group` (SPEC §2.6's twelve category headers — `Asset – Basic
 * Info`, `Device – Technical`, `Workforce – Contact`, …); a column the
 * blueprint leaves ungrouped falls back to a single trailing bucket rather
 * than vanishing. Labels come from the blueprint too — never hardcoded here.
 */
export function liveListColumnCatalog(config: EntityConfig): ColumnCatalogItem[] {
  /*
   * Figma's chooser (495:19004 / popup-495-25285) has NO trailing catch-all
   * group: every surfaced field sits under one of the twelve named category
   * headers. A blueprint's internal binding columns (mobility status, dwell,
   * lat/lng, the popup's own fields…) carry no `group`, so surfacing them
   * invented an "Other Fields" section the design does not have. They are
   * filtered out here — EXCEPT any column the view actually shows
   * (`columnsShown` + the `title` identity column), which must stay
   * toggleable or the Shown group would render short.
   *
   * Only when the blueprint GROUPS ITS COLUMNS AT ALL: a module that authors
   * no `group` anywhere still gets its whole field set, in one bucket, as
   * before — this filter narrows a curated catalog, it never empties an
   * un-curated one.
   */
  const grouped = config.systemcolumns.some((col) => Boolean(col.group?.trim()))
  const keep = new Set<string>(['title', ...(config.uiConfig.map?.columnsShown ?? []).map((key) => toCol(config, key))])
  return config.systemcolumns
    .filter((col) => !grouped || Boolean(col.group?.trim()) || keep.has(col.col))
    .map((col) => {
      const Icon = resolveFieldIcon(liveFieldIconName(col.name, col.type))
      return {
        key: col.col,
        label: col.name,
        group: col.group?.trim() ? col.group : 'Other Fields',
        required: col.col === 'title',
        // SPEC §2.6 / visual #6: EVERY row (Shown and OFF alike) carries a
        // 16px lead glyph. Blueprints don't author per-column icons, so the
        // name resolves through the composer's own shared icon vocabulary —
        // never a second, private icon map.
        icon: Icon ? createElement(Icon, { className: 'size-4' }) : undefined,
      }
    })
}

/**
 * Maps a systemcolumn to a `FIELD_ICON_VOCABULARY` name (SPEC §2.6's per-row
 * 16px lead glyph). Name keywords first — a blueprint's own wording is the
 * strongest signal ("Plate", "Odometer", "Registration Date") — then the
 * field TYPE, then a generic tag glyph so no row is ever iconless. Pure and
 * exported for the unit test; keep the keyword list ordered most-specific
 * first (`fuel type` must not fall through to `type`).
 */
export function liveFieldIconName(name: string, type?: string): string {
  const n = name.toLowerCase()
  const keyword: [RegExp, string][] = [
    [/odometer|mileage|distance/, 'speedometer-02'],
    [/speed/, 'speedometer-04'],
    [/fuel|epa|consumption/, 'fuel'],
    [/temperature|thermo/, 'thermometer-03'],
    [/colou?r/, 'colors'],
    [/phone|mobile|contact/, 'phone'],
    [/driver|owner|name|gender|nationality|religion|language|workforce|birth/, 'user-03'],
    [/coordinate|latitude|longitude|location|country|timezone|zone|address|heading/, 'marker-pin-02'],
    [/date|year|time|received|record/, 'clock'],
    /*
     * 495:19004's semantic marks (round-4 visual N3). These sit ABOVE the
     * broader rules they used to fall through to, and each one is still a
     * KEYWORD — no live-monitoring column list is hardcoded here, and there
     * is deliberately no `SystemColumn.icon` key to add.
     *   health          → heart          (was `alert-square` via /health/)
     *   imei / vin      → hash           (was `signal-01` / `tag-03`)
     *   plate           → credit-card    (was the generic `tag-03`)
     *   make / brand    → brush          (was the generic `tag-03`)
     *   model           → speedometer-02 (the circular mark the frame draws)
     *   * type          → truck          (was the generic `tag-03`)
     *   * status        → check-square   (was `alert-square`)
     *   `Vehicle`       → car            (was the generic `tag-03`)
     * `Vehicle Color` still resolves to `colors` — the rule above catches it
     * first, and `colors` was ratified as the real Figma glyph in visual #32.
     */
    [/health|condition/, 'heart'],
    [/imei|\bvin\b|chassis/, 'hash'],
    [/plate|registration number|licen[cs]e no/, 'credit-card'],
    [/make|manufacturer|brand/, 'brush'],
    [/model|variant/, 'speedometer-02'],
    [/vehicle type|asset type|body type/, 'truck'],
    [/imei|serial|firmware|device|signal/, 'signal-01'],
    [/sos|alert|fault/, 'alert-square'],
    [/status/, 'check-square'],
    [/document|image|photo|attachment/, 'image-05'],
    [/trip|route/, 'route'],
    [/^vehicle$|^asset$/, 'car'],
    [/vin|reference|identifier|tag/, 'tag-03'],
  ]
  for (const [re, icon] of keyword) if (re.test(n)) return icon
  switch (type) {
    case 'Date':
    case 'DateTime':
      return 'clock'
    case 'Numeric':
    case 'Number':
      return 'gauge'
    case 'SingleSelect':
    case 'MultiSelect':
      return 'tag'
    default:
      return 'tag-03'
  }
}

/** Display label for a col key, from its systemcolumn. */
export function liveColumnLabel(config: EntityConfig, col: string): string {
  return config.systemcolumns.find((c) => c.col === col)?.name ?? col
}
