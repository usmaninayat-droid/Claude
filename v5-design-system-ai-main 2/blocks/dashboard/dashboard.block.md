# Dashboard block — monitoring (KPI strip + chart grid + widgets)

**Type:** `dashboard` · **Form:** TSX `ModuleConfig` (`dashboard.block.tsx`) spliced into the app.
(The JSON `DashboardModuleConfig` schema exists but isn't wired through the recipe loader — view
modules compose in React, like facilities-ops `dashboard.tsx`.)

## What it is
The reusable **monitoring surface**: a filter-fields bar + a KPI strip + a chart grid + a declarative
widget grid. Use it for any "how are things going" view (plan/incident/compliance monitoring).

## Anatomy
- **Filter-fields bar** — date-range + category/status/group-by filters + **Export**.
- **KPI strip** — `kpis[]` big-number cards (icon, tone, trend).
- **Sections** — chart cards (`BarChart`, `DonutChart`, `LineChart`, …) at a column `span`.
- **Widget grid** — `DashboardWidgetGrid` declarative widgets: `gauge`, `compareBars`,
  `statusBreakdown`, `ragHeatmap`, stacked `bar`, `leaderboard`.

## Adapt to a use case (the knobs)
1. `id` / `label` / `icon`; the tab `label`.
2. **Derive all numbers from the app's real record arrays** — replace the placeholder `byStage` /
   `byCategory` series with values computed from the data the other modules use (numbers must agree).
3. `kpis`, `sections`, and the `widgets` list — pick the metrics/charts the use case needs.
4. `filters` — the filter dimensions.

## Compose
Splice into the app's `App.tsx` modules (it's a config-only view module, not in the recipe JSON):
```ts
import { dashboardBlock } from './dashboard';   // adapted copy
// modules: [ dashboardBlock, ...base.modules, ...otherViewModules ]
```
Reference: `D:\Claude Projects\Code\facilities-ops\src\recipe\dashboard.tsx`.
