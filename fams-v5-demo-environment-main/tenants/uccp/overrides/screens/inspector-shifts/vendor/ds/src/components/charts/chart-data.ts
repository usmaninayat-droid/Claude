/** Shared chart palettes + sample data, matching the Figma Charts page. */

/** Multi-category donut palette (Incident Status). */
export const DONUT_PALETTE = [
  'var(--fig-accent-info-normal)', // blue
  'var(--fig-accent-aquagreen-normal)', // teal
  'var(--fig-accent-lime-normal)', // green
  'var(--fig-accent-flame-normal)', // orange
  'var(--fig-accent-lavender-normal)', // purple
  'var(--fig-accent-plum-normal)', // magenta
];

/** 10-step FAMS blue series ramp (stacked bars, heat scale). */
export const BLUE_SERIES = [
  'var(--chart-series-9)',
  'var(--chart-series-7)',
  'var(--chart-series-5)',
  'var(--chart-series-4)',
  'var(--chart-series-3)',
  'var(--chart-series-1)',
];

export const HEAT_BUCKETS = [
  { label: '0', color: 'var(--fig-neutral-light)', max: 0 },
  { label: '1-49', color: 'var(--fams-400)', max: 49 },
  { label: '50-89', color: 'var(--fams-600)', max: 89 },
  { label: '90-100', color: 'var(--fams-900)', max: 100 },
];

export function heatColor(v: number): string {
  for (const b of HEAT_BUCKETS) if (v <= b.max) return b.color;
  return HEAT_BUCKETS[HEAT_BUCKETS.length - 1].color;
}
