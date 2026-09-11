# Decision record — chart engine, DataTable capability, and DS scope boundary (2026-07-04)

Follows the initial Shaheer-DS port (see `PORT-LEDGER.md`, `adoption-from-shaheer-ds.md`). That port executed most of the reference component set; this session closed the remaining genuine gaps and drew an explicit boundary around what does **not** belong in the DS.

## What was built

- **Design tokens** (`packages/tokens/tokens/core.tokens.json`): added the reference chart tokens (`chart-accent`, `chart-heat` scales), the 12 missing `accent-family` ramps, `overlay` tokens, a dark-mode scaffold group, and light-mode `sidebar` tokens. New Style Dictionary output `dist/theme.echarts.json` (an ECharts theme generated from the chart tokens — categorical `color` + `visualMap` heat ramp). Tenant tokens reconciled to the reference pattern: `secondary` reverted to the light-blue value (the fams gray was drift), `accent = primary` + soft-tint focus `ring` across tenants. `popover` deliberately kept a **light** card surface (the reference's dark value is a tooltip convention, not a shared popover surface).

- **Charts — the deferred "engine phase" (9 renderers on ECharts).** The chassis already had engine-agnostic chart *chrome* (`ChartCard`/`ChartLegend`/`ChartTooltip`) but no engine and no renderers. Added `ChartContainer` (a hand-rolled `echarts.init` wrapper — resize/dispose/token-theme/reduced-motion/RTL; `echarts-for-react` is deliberately NOT used, per `LIBRARIES.md`) and the renderers: `BarChart`, `AreaChart`, `DonutChart` (rounded segments — the customization ApexCharts denied us), `Gauge`, `LineChart`, `HeatmapChart`, `Sparkline`, `CompareBars`, `ComplianceGauge`. All token-driven, RTL-safe, axe-tested.
  - **Chart library decision: ECharts (Apache-2.0), not Recharts.** The reference DS used Recharts (the shadcn default). ECharts wins for this platform: framework-agnostic core (serves the Vue track too), canvas rendering + datazoom for telemetry-scale data, deep styling (per-segment border radius etc.), and one JSON theme drivable from the token pipeline. The reference's Recharts charts were used only as a *visual* spec, rebuilt on ECharts.

- **DataTable capability gap** (the chassis's own top-flagged gap in `REVIEW-FINDINGS.md`; 27 v5 `BaseTable` consumers): added, all opt-in/additive so existing usage is unchanged —
  - **Virtualization** via `@tanstack/react-virtual`, with **stable graceful degradation** (renders all rows when the viewport can't be measured — jsdom/hidden/SSR — rather than nothing).
  - **Controlled pagination** (`page`/`pageSize`/`rowCount`/`onPaginationChange`). Presentational only: server mode renders the given page as-is and never fetches or re-slices; client mode slices its own data as a convenience.
  - **Controlled group-collapse** (`collapsedGroupKeys`/`onGroupToggle`) alongside the existing uncontrolled default.
  - **Summary/KPI rows** — the one genuinely-missing presentational piece from the reference `ReportTable`.

- **Button**: added `iconRound` size (circular icon-only — v5 `q-btn round` parity; 55 v5 files use it).

## Scope decisions — what does NOT enter the DS

- **ShiftPlanner + WorkforceCompliance → app-level, not DS.** The reference's ShiftPlanner is an 869-line single-surface composition (recurrence, conflict detection, utilization derivation). By the DS's own **rule of three** (a component earns DS membership on its third use / second product) and the DS-vs-app boundary in `BOUNDARIES.md`, this is a product-feature composition with exactly one home (the smart-planning wizard). It belongs in the product/app repo, composing DS primitives (DataTable, Sheet, DatePicker, StatePill). Building it into the DS would bloat the library with single-use domain logic and violate the boundary.

- **ReportBuilder → app-level, not DS.** The builder workflow (catalog, save/delete, side-sheet wizard) is a product feature, same reasoning. Its one genuinely reusable presentational element — summary/KPI rows — was folded into DataTable instead (see above). No standalone `ReportTable` was added: our DataTable already has group-by, so a separate near-clone would be redundant.

- **RadarChart, Command palette, People/Assignee/LinkedEntity pickers → excluded.** Zero v5 usage (per the usage sweep) or no canonical v5 component to derive from. Not built speculatively.

## Net

After this session the DS covers real v5 needs: full chart set on a sanctioned engine, the DataTable performance/pagination capability, and the small deltas. Remaining work is app-level composition (ShiftPlanner, report builder) that belongs in product repos, not here.
