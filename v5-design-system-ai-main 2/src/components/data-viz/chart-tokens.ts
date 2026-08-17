/**
 * Chart token helpers — read the chart palette from CSS variables.
 *
 * Spec: `knowledge-base/product-context/28-charts-taxonomy-and-styling.md`
 *
 * Use these helpers instead of hardcoding hex in chart components. They
 * resolve to `var(--chart-...)` so tenant theme overrides cascade correctly.
 */

export const CHART_SERIES_VAR = (n: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10) =>
  `var(--chart-series-${n})`;

/** Default 10-step series palette (FAMS blue ramp by default). */
export const CHART_SERIES_DEFAULT: string[] = [
  CHART_SERIES_VAR(5),  // primary brand first (most prominent)
  CHART_SERIES_VAR(3),
  CHART_SERIES_VAR(7),
  CHART_SERIES_VAR(2),
  CHART_SERIES_VAR(6),
  CHART_SERIES_VAR(4),
  CHART_SERIES_VAR(8),
  CHART_SERIES_VAR(1),
  CHART_SERIES_VAR(9),
  CHART_SERIES_VAR(10),
];

/** Sequential ramp for "Series 1 → N" use (stacks dark → light). */
export const CHART_SERIES_SEQUENTIAL: string[] = [
  CHART_SERIES_VAR(1),
  CHART_SERIES_VAR(2),
  CHART_SERIES_VAR(3),
  CHART_SERIES_VAR(4),
  CHART_SERIES_VAR(5),
  CHART_SERIES_VAR(6),
  CHART_SERIES_VAR(7),
  CHART_SERIES_VAR(8),
  CHART_SERIES_VAR(9),
  CHART_SERIES_VAR(10),
];

/** Named accent palette — use for semantically-meaningful charts. */
export const CHART_ACCENTS = {
  purple: 'var(--chart-accent-purple)',
  orange: 'var(--chart-accent-orange)',
  green:  'var(--chart-accent-green)',
  red:    'var(--chart-accent-red)',
  pink:   'var(--chart-accent-pink)',
  teal:   'var(--chart-accent-teal)',
  cyan:   'var(--chart-accent-cyan)',
  yellow: 'var(--chart-accent-yellow)',
} as const;

export type ChartAccentName = keyof typeof CHART_ACCENTS;

/** Resolve a color spec to a real CSS color value. */
export function resolveChartColor(
  spec: string | undefined,
  fallbackSeriesIndex = 0,
): string {
  if (!spec) return CHART_SERIES_DEFAULT[fallbackSeriesIndex % CHART_SERIES_DEFAULT.length];
  // Direct hex / rgb / var(--…) — pass through
  if (spec.startsWith('#') || spec.startsWith('rgb') || spec.startsWith('var(')) return spec;
  // Named accent
  if (spec in CHART_ACCENTS) return CHART_ACCENTS[spec as ChartAccentName];
  // Series-N
  const match = spec.match(/^series-(\d+)$/);
  if (match) {
    const n = parseInt(match[1], 10);
    return CHART_SERIES_VAR(Math.max(1, Math.min(10, n)) as any);
  }
  return spec;
}

/** Heatmap intensity scales — warm (yellow→red) or cool (light→dark blue). */
export const CHART_HEAT_WARM: string[] = [
  'var(--chart-heat-0)',
  'var(--chart-heat-low)',
  'var(--chart-heat-mid)',
  'var(--chart-heat-high)',
];

export const CHART_HEAT_COOL: string[] = [
  'var(--chart-heat-cool-0)',
  'var(--chart-heat-cool-mid)',
  'var(--chart-heat-cool-high)',
];

/** Standard buckets for heatmap intensity. */
export interface HeatmapBucket {
  /** Inclusive lower bound for this bucket. */
  min: number;
  /** Inclusive upper bound. Use Infinity for unbounded. */
  max: number;
  /** Color (CSS variable or hex). */
  color: string;
  /** Display label for the legend. */
  label: string;
}

export const HEATMAP_WARM_BUCKETS: HeatmapBucket[] = [
  { min: 0,  max: 0,        color: CHART_HEAT_WARM[0], label: '0' },
  { min: 1,  max: 5,        color: CHART_HEAT_WARM[1], label: '1-5' },
  { min: 6,  max: 10,       color: CHART_HEAT_WARM[2], label: '6-10' },
  { min: 11, max: Infinity, color: CHART_HEAT_WARM[3], label: '10+' },
];

/** Resolve a numeric value to a heatmap bucket color. */
export function bucketColor(value: number, buckets: HeatmapBucket[]): string {
  const found = buckets.find((b) => value >= b.min && value <= b.max);
  return found?.color ?? buckets[0].color;
}

/** Common Recharts axis + grid styling — pass into chart components. */
export const CHART_AXIS_PROPS = {
  axisLine: false,
  tickLine: false,
  tick: { fill: 'var(--muted-foreground)', fontSize: 12 },
  style: { fontFamily: 'var(--font-family-sans)' },
} as const;

export const CHART_GRID_PROPS = {
  stroke: 'var(--border)',
  strokeDasharray: '3 3',
  opacity: 0.6,
} as const;
