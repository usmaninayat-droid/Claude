# Chart Primitives — consolidated behavioral spec

> Spec for all 11 chart primitives in `@fams-v5/ui/data-viz`.
> Source of truth: `knowledge-base/product-context/28-charts-taxonomy-and-styling.md`.

## Primitives at a glance

| Primitive | File | Source library | When to use |
|---|---|---|---|
| `ChartCard` | `chart-card.tsx` | (own) | Wrap every chart — icon + title + subtitle + body |
| `ChartLegend` | `chart-legend.tsx` | (own) | Horizontal/vertical legend, hover + toggle |
| `ChartTooltip` | `chart-tooltip.tsx` | (own — Recharts content) | Dark-navy popover with per-series rows |
| `KpiTile` | `kpi-tile.tsx` | (own) | Big number + label + optional trend on dashboards |
| `BarChart` | `bar-chart.tsx` | Recharts | Vertical/horizontal, single/multi-series, stacked/grouped |
| `LineChart` | `line-chart.tsx` | Recharts | Time-series single or multi-line |
| `AreaChart` | `area-chart.tsx` | Recharts | Filled line (single or stacked) |
| `DonutChart` | `donut-chart.tsx` | Recharts | Pie/donut with optional center stat |
| `GaugeChart` | `gauge-chart.tsx` | (own SVG) | Half-arc speedometer with color sectors |
| `HeatmapChart` | `heatmap-chart.tsx` | (own) | Categorical grid with intensity buckets |
| `RadarChart` | `radar-chart.tsx` | Recharts | Polar / spider |
| `ActivityBar` | `activity-bar.tsx` | (own) | Multi-color horizontal bar (Leaderboard) |
| `MiniDonutCell` | `mini-donut-cell.tsx` | (own SVG) | Inline % donut for table cells |

All charts that need to fit a container use Recharts `<ResponsiveContainer>`,
so they're **desktop responsive by default** — fill parent width, height
configurable per instance.

## Color spec (universal)

```
spec    →    resolved
─────────────────────
'series-3'  →  var(--chart-series-3)   # FAMS blue ramp position
'purple'    →  var(--chart-accent-purple)
'green'     →  var(--chart-accent-green)
'#FF00FF'   →  passes through
undefined   →  CHART_SERIES_DEFAULT[i]  # round-robin
```

Use the `resolveChartColor(spec, fallbackIndex)` helper.

## Hard constraints

1. **Never hardcode hex in chart files.** Use `CHART_SERIES_*`, `CHART_ACCENTS`, or `resolveChartColor`.
2. **All chart axes hide their lines + tick marks** by default (`CHART_AXIS_PROPS`). Grid lines are dashed at 60% opacity.
3. **Tooltip is always dark navy** (`var(--popover)` + `var(--popover-foreground)`) — production-correct.
4. **Charts emit `var(--chart-series-N)` references** in fills/strokes so tenant overrides cascade.
5. **Bar charts use 4px corner radius** (top-only for vertical, right-only for horizontal). Single-side rounding.
6. **DonutChart center text is `text-2xl font-bold`** — matches Figma "79.5%" / "2493" stat-on-donut pattern.
7. **GaugeChart sectors use the standard 4-color ramp** (red/orange/yellow/green) unless explicitly overridden.

## Patterns the kit's chart primitives implement

### KPI tile + chart card grid (dashboard top)

```tsx
<div className="grid grid-cols-4 gap-4">
  <KpiTile label="Total Inspectors" value="60" icon={<Users size={16} />} />
  <KpiTile label="Clocked-In" value="18" icon={<Clock size={16} />} iconBg="var(--chart-accent-green)" iconColor="#fff" />
  <KpiTile label="Avg. Shift" value="7:45" unit="hrs" icon={<Hourglass size={16} />} />
  <KpiTile label="Incidents" value="981" trend="up" trendValue="+12%" />
</div>
```

### Stacked bar chart (Issues Breakdown style)

```tsx
<ChartCard
  icon={<BarChart3 size={16} />}
  title="Issues Breakdown by Category"
  legend={<ChartLegend items={legendItems} />}
>
  <BarChart
    data={issues}
    xKey="date"
    series={[
      { dataKey: 'breakdown', label: 'Breakdown', color: 'teal', stackId: 'a' },
      { dataKey: 'accident',  label: 'Accident',  color: 'purple', stackId: 'a' },
      { dataKey: 'others',    label: 'Others',    color: 'series-5', stackId: 'a' },
    ]}
    yAxisLabel="No. of Issues Reported"
    xAxisLabel="Date"
  />
</ChartCard>
```

### Half-gauge with sub-label (Fuel Usage Compliance style)

```tsx
<ChartCard icon={<Fuel size={16} />} title="Fuel Usage Compliance">
  <GaugeChart value={81} label="Current Fuel Level" />
</ChartCard>
```

### Heatmap (Issues Density by Step style)

```tsx
<ChartCard icon={<Grid size={16} />} title="Reported Issues Density by Step">
  <HeatmapChart
    yCategories={['Documents & Safety', 'Exterior & Lights', 'Mechanical & Ops']}
    xCategories={['Z 1234', 'Z 1234', ...]}
    cells={[...]}
    xAxisLabel="Vehicles"
  />
</ChartCard>
```

### Mini donut cells inside a DataTable

```tsx
<DataTable
  columns={[
    { id: 'area', label: 'AREA/LOT' },
    { id: 'expectedVisit', label: 'EXPECTED VISIT' },
    { id: 'actualVisits', label: 'ACTUAL VISITS' },
    { id: 'coverage', label: 'COVERAGE %', render: (row) => <MiniDonutCell value={row.coveragePct} /> },
  ]}
  data={lots}
/>
```

## Module JSON integration

The Dashboards module config (per `docs/04-chassis.md` + `26-dashboards-module-spec.md`)
declares each widget by kind:

```json
{
  "widgets": [
    {
      "kind": "kpi-tile",
      "label": "Total Inspectors",
      "valueField": "totalInspectors",
      "icon": "Users"
    },
    {
      "kind": "bar-chart",
      "title": "Issues Breakdown by Category",
      "subtitle": "Last 30 days",
      "xKey": "date",
      "series": [
        { "dataKey": "breakdown", "label": "Breakdown", "color": "teal", "stackId": "a" },
        { "dataKey": "accident",  "label": "Accident",  "color": "purple", "stackId": "a" }
      ],
      "yAxisLabel": "No. of Issues Reported"
    },
    {
      "kind": "gauge-chart",
      "title": "Fuel Usage Compliance",
      "valueField": "fuelComplianceScore",
      "label": "Current Fuel Level"
    },
    {
      "kind": "heatmap-chart",
      "title": "Reported Issues Density",
      "yCategoriesField": "categories",
      "xCategoriesField": "vehicles",
      "cellsField": "densityCells"
    }
  ]
}
```

The `DashboardsModule` chassis reads each widget's `kind` and renders the
matching primitive with data from the adapter.

## Anti-patterns

- ❌ Embedding chart configuration inline in dashboard JSX (wrap in ChartCard + use primitives)
- ❌ Passing hardcoded color arrays — use the token-based palette
- ❌ Custom tooltips per chart — share `<ChartTooltip />` everywhere
- ❌ Hiding the chart card chrome — it's the standardized container; embracing it makes charts look native
- ❌ Sized at fixed widths — use ResponsiveContainer + grid parent for desktop responsiveness

## Cross-references

- Pattern docs: `knowledge-base/product-context/28-charts-taxonomy-and-styling.md`
- Tokens: `packages/tokens/theme.css` (`--chart-series-*`, `--chart-accent-*`, `--chart-heat-*`)
- Dashboards chassis: `packages/modules/src/dashboards/` (Stage 4 work — chassis is currently a stub but will consume these primitives)
- Recharts docs: https://recharts.org/en-US/api
