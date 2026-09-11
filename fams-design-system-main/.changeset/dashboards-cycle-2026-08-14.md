---
'@fams/ui-kit': minor
'@fams/tokens': minor
---

Dashboard cycle: charts, ranking widgets, the `--color-medal-*` token family, and
six behaviour changes an existing consumer will see.

## New public exports — `@fams/ui-kit`

- `ListRow`, `ListRowProps`, `ListRowMetaItem` — the row primitive behind the
  event rails (previously internal).
- `ChartContainer`, `ChartContainerProps`, `ChartDataTableSpec` — the one place
  the system touches `echarts`, plus the spec its visually-hidden `<table>` twin
  is built from.
- `HeatmapChart`, `HeatmapChartProps`, `HeatmapChartCell`, `HeatmapChartBin`,
  `HeatmapChartGroup` — two-categorical-axis magnitude chart, continuous ramp or
  discrete bins, with an optional outer group tier on the column axis.
- `Leaderboard`, `LeaderboardProps`, `LeaderboardItem`, `LeaderboardColumn`,
  `LeaderboardMovement` — ranked rows, `variant="table"` or `"podium"`.
- `StatBar`, `StatBarProps`, `StatBarTone` — a labelled value against a capacity.
- `InfoBannerVariant`, `InfoBannerTone` — the existing banner's variant/tone
  unions, now nameable by consumers.
- `resolveCssColor`, `useThemeVersion` — colour resolution for renderers that do
  not run the CSS cascade (ECharts canvas/SVG, WebGL map layers). Exported so
  the tier-2 packages resolve blueprint-supplied colour exactly the way the core
  does instead of forking a second implementation.

The chart axis / direction / data-table / heatmap-bin helpers (`chart-axis`,
`chart-direction`, `chart-data-table`, `heatmap-bins`) are deliberately NOT in
the barrel — they are internal to the chart composites.

## New tokens — `@fams/tokens`

- `--color-medal-{gold,silver,bronze}-{surface,accent,border}` — a dedicated
  ordinal (1st/2nd/3rd) family, so podium rank stops borrowing the reserved
  status tints (third place used to be painted in the error red on pages that
  also spend red on "worst bin" and "negative delta"). `-surface` and `-accent`
  carry real dark-theme values; `-border` is deliberately theme-neutral.
- `--color-chart-heat-1` … `-5` — a true 5-stop discrete sequential ramp, so a
  5-class binned scale no longer stretches the old 3-stop ramp across 5 classes.

## Behaviour changes (no build breaks; all visible to an existing consumer)

- **`DonutChart.showCounts` default `false` → `true`.** Every donut grows count
  chips in its legend. Purely additive visually; no API break.
- **`KpiTile.tone` default `'primary'` → `undefined`.** Narrower than it looks:
  the icon badge still falls back to `'primary'`, and an omitted `tone` still
  yields `text-foreground`, so *omitting* tone is a visual no-op. The real change
  is that a call site which **explicitly** passes `tone` now also inks the value,
  not just the badge. `data-tone` is new, so no existing selector breaks.
- **`ChartContainer` moved `role="img"` / `aria-label` onto the canvas element
  and dropped `aria-hidden="true"`.** Required: ARIA treats an `img` subtree as
  presentational, so the visually-hidden `<table>` twin had to become a sibling
  rather than a descendant. The outer wrapper keeps `data-slot` / `aria-busy` /
  `dir`, and `getByRole('img')` still resolves — but QA selectors that targeted
  the wrapper for the role need updating.
- **`ListRow` no longer paints `cursor: pointer` without a handler.** A
  correctness fix: `interactive` already gated the focus ring, so this only
  aligns the cursor with the affordance actually present.
- **`ListRow` is now its own `@container/list-row`**, with a columnar template at
  ≥42rem and a stacked one below it. Rows without `meta` keep byte-identical
  markup; **rows that pass `meta` get taller** (measured 107–150px → 184px in the
  telematics events rail). Deterministic row height is the point, but a
  fixed-height card will show fewer rows before scrolling.
- **`SideNav` / `ModuleRail` hit areas 28×28 → 44×44.** Pitch-neutral — the
  `HIT_AREA` box grew by exactly the `gap` that was removed (28+16 === 44+0), so
  there is no visual delta. **Contract move:** `SideNavFooterItem` now applies the
  caller's `className` to the outer 44px button instead of the 28×28 chip, whose
  `bg-white/20` / `bg-white` / `shadow-sm` moved to a new inner span. Any existing
  `className` override of the chip's background or shape becomes a **silent
  no-op**. No `chipClassName` prop is being added this cycle; if you were styling
  the chip, restyle the inner span via a descendant selector or file an issue.
- **`ChartLegend` interactive rows are now `min-h-11`** (44px, WCAG 2.5.5). ~20px
  taller per row on every toggleable legend (Area/Bar/Line/Donut/CompareBars);
  static legends are unaffected. Card heights in existing dashboard-like surfaces
  will shift.

## Token pipeline

`dist/theme.css` now emits `@theme static`. Tailwind v4 was tree-shaking
unreferenced `@theme` custom properties, so a token no component class happened
to use never reached the document and `resolveToken()` silently fell back at
runtime. Cost: all ~324 properties now ship unconditionally (~12.7 KB
uncompressed) instead of the used subset.
