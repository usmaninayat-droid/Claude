# Dashboard widget / chart chrome + raw-data drill — contract (G1)

Source: FAMS Design-System-V2 (Figma 5246-10805 overview · 5235-8565 chart · 5235-8632
hybrid · 5235-9077 map-only · widget catalog 5186-156xx) + Tadweer raw-data sheets
(June 2227-79382/94303/76577). Unifies the dashboard/widget/chart layer:

## Rules (from the frames)
1. **Widget/chart header** = a defined row: a **primary-palette** `IconBadge` + bold title
   (+ optional subtitle/actions), separated from the body by a **divider line**.
2. **Chart/widget header icon = primary** (always). **Top-KPI tile icons = dynamic/varied**
   (a distinct accent per KPI — `KpiTile.iconColor`/`iconTone`), never forced to primary.
3. Every chart/widget header carries a **⋮ overflow menu** (`WidgetMenu`, top-right, replacing the
   old raw-data icon): **View raw data** + **Export** (chart/widget UI → PDF via the browser's
   native print, `exportNodeToPdf`). Export is on by default (built-in self-print); override with a
   handler or hide with `false`.
4. Every **KPI / chart / widget** can open a **Raw Data side sheet**: the underlying rows in a
   `DataTable`, **viewable** then **downloadable**. The sheet's **Download** button opens a
   **format chooser** (PDF / CSV) using the real `FileTypeIcon` artwork — CSV = exactly the shown
   rows (`downloadCsv`); PDF = the table layout (`exportNodeToPdf`). Title "`<name>` (Raw Data)" +
   "Showing N items". Close = a floating circular button on the drawer's outer seam (not in-corner).
4. **Hybrid** widget = standardized top header + a left side panel beside a right map (like the
   live-monitoring hybrid). **Map-only** widget = header + full-bleed map (+ optional legend overlay).
5. Config-driven, usecase→usecase: header icon, drill data, and layout kind are all declarable.

## Components

### `RawDataSheet` (data-display)
`RawDataSheet({ open, onOpenChange, title, subtitle?, rows, columns, csvColumns?, fileName?, basisNote?, side? })`
- Wide right `Sheet`: header = title + muted "(Raw Data)" + a **download** button (CSV via
  `downloadCsv`, `utils/csv`), then "Showing {rows.length} items" (+ optional `basisNote`), then a
  `DataTable` (`scrollMode="lazy"`) of `rows`/`columns`.
- `csvColumns` defaults to `columns` (header text + `accessor`). Download exports **exactly `rows`**
  (the shown basis). Resolves T-103 (KpiDrillSheet) generically.

### `WidgetCard` (data-viz)
`WidgetCard({ title, subtitle?, icon?, iconTone?='primary', iconColor?, actions?, onViewRawData?, onExpand?, divider?=true, variant?='default', panel?, bodyPadding?, bodyHeight?, children, className })`
- Header: `IconBadge` (**primary** tone default) + title/subtitle + `actions` + optional **raw-data**
  button (`onViewRawData`) + optional expand; then a **divider** (`divider` default true).
- `variant`: `default` (children in a padded body) · `map` (children = map, full-bleed, no padding) ·
  `hybrid` (`panel` on the left beside `children`/map on the right, both under the one header).
- Token-only; reuses `IconBadge`. The shared frame for non-chart widgets + map/hybrid.

### `ChartCard` (data-viz) — evolved, back-compat
- Add **`divider?: boolean` (default true)** — a line under the header (was absent).
- Add **`onViewRawData?: () => void`** — renders a raw-data button in the header actions.
- Icon path already routes through `IconBadge` primary — unchanged.

## Laws / a11y
Token-only (IconBadge tones / `--status-*` / chart tokens; no raw hex). Config-driven; reuses
`IconBadge`, `DataTable`, `downloadCsv`, `Sheet`, `MapView` — no forks. Raw-data + expand + drill
buttons are icon-only with `aria-label`; the sheet is a focus-trapped `Sheet` with a title.

## Acceptance
1. `WidgetCard` renders the primary-icon header + divider + body; `map`/`hybrid` variants lay out
   full-bleed map / panel+map under one header.
2. `ChartCard` shows a divider by default and a raw-data action when `onViewRawData` is set;
   existing usages still render (back-compat).
3. `RawDataSheet` lists rows in a DataTable and downloads a CSV of exactly those rows (BOM, filename).
4. KPI tiles keep per-tile varied icon colors; chart/widget headers default to primary.
5. Coherence + a11y-static + tsc/build green.
