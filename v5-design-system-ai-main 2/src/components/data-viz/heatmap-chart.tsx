import * as React from 'react';
import { cn } from '../utils/cn';
import { HEATMAP_WARM_BUCKETS, bucketColor, type HeatmapBucket } from './chart-tokens';

/**
 * HeatmapChart — categorical grid with color-intensity scale.
 *
 * Spec: `heatmap-chart.spec.md`.
 *
 * Production usage:
 *   - Reported Issues Density by Step (Tadweer)
 *   - Driver Safety Score Heatmap (DS V2)
 *
 * Grid is row-major: rows = Y categories, columns = X categories.
 * Each cell holds a numeric value, colored by which `bucket` it falls into.
 */

export interface HeatmapCell {
  /** Row category. */
  y: string;
  /** Column category. */
  x: string;
  /** Numeric value. */
  value: number;
}

export interface HeatmapChartProps {
  cells: HeatmapCell[];
  /** Y-axis categories (rows), top to bottom. */
  yCategories: string[];
  /** X-axis categories (columns), left to right. */
  xCategories: string[];
  /** Bucket definitions (defaults to warm 4-step: 0 / 1-5 / 6-10 / 10+). */
  buckets?: HeatmapBucket[];
  /** Cell size in px. Default 32. */
  cellSize?: number;
  /** Gap between cells in px. Default 2. */
  gap?: number;
  /** Hide the bucket legend at the top-right. */
  hideLegend?: boolean;
  /** X-axis title rendered below grid. */
  xAxisLabel?: string;
  /** Tooltip formatter. */
  tooltipFormatter?: (cell: HeatmapCell) => React.ReactNode;
  className?: string;
}

export function HeatmapChart({
  cells, yCategories, xCategories,
  buckets = HEATMAP_WARM_BUCKETS,
  cellSize = 32,
  gap = 2,
  hideLegend, xAxisLabel,
  tooltipFormatter,
  className,
}: HeatmapChartProps) {
  // Index cells by (y, x) for O(1) lookup
  const cellMap = React.useMemo(() => {
    const m = new Map<string, HeatmapCell>();
    cells.forEach((c) => m.set(`${c.y}|${c.x}`, c));
    return m;
  }, [cells]);

  const [hover, setHover] = React.useState<HeatmapCell | null>(null);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {!hideLegend ? (
        <div className="flex items-center justify-end gap-3 text-caption">
          {buckets.map((b) => (
            <span key={b.label} className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span
                className="inline-block size-2.5 rounded-sm"
                style={{ background: b.color }}
                aria-hidden
              />
              {b.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative overflow-x-auto">
        <table className="border-separate" style={{ borderSpacing: 0 }}>
          <tbody>
            {yCategories.map((y) => (
              <tr key={y}>
                <th
                  scope="row"
                  className="pr-3 text-right text-caption font-medium text-muted-foreground"
                  style={{ paddingTop: gap / 2, paddingBottom: gap / 2 }}
                >
                  {y}
                </th>
                {xCategories.map((x) => {
                  const cell = cellMap.get(`${y}|${x}`);
                  const value = cell?.value ?? 0;
                  const color = bucketColor(value, buckets);
                  return (
                    <td
                      key={x}
                      className="cursor-pointer rounded-sm transition-transform hover:scale-110"
                      style={{
                        width: cellSize,
                        height: cellSize,
                        padding: 0,
                        background: color,
                        marginLeft: gap,
                        marginTop: gap,
                      }}
                      onMouseEnter={() => cell && setHover(cell)}
                      onMouseLeave={() => setHover(null)}
                      aria-label={`${y} × ${x}: ${value}`}
                    />
                  );
                })}
              </tr>
            ))}
            <tr>
              <th />
              {xCategories.map((x) => (
                <td
                  key={x}
                  className="pt-2 text-center text-caption text-muted-foreground"
                  style={{ width: cellSize }}
                >
                  {x}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        {hover ? (
          <div className="pointer-events-none absolute right-0 top-0 rounded-md bg-popover px-3 py-2 text-caption text-popover-foreground shadow-lg">
            {tooltipFormatter ? tooltipFormatter(hover) : (
              <>
                <div className="font-semibold">{hover.y} × {hover.x}</div>
                <div className="opacity-80">Value: {hover.value}</div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {xAxisLabel ? (
        <p className="text-center text-caption text-muted-foreground">{xAxisLabel}</p>
      ) : null}
    </div>
  );
}
