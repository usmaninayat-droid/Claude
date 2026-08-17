import * as React from 'react';

/**
 * ChartTooltip — universal Recharts tooltip content.
 *
 * Spec: `chart-tooltip.spec.md`.
 *
 * Dark navy popover that appears on hover:
 *
 *   ┌───────────────────────┐
 *   │ 2026-06-08            │  ← x-axis label / timestamp
 *   │ ● Series 1     384    │  ← per-series rows
 *   │ ● Series 2     281    │
 *   └───────────────────────┘
 *
 * Pass as `<Tooltip content={<ChartTooltip />} />` to any Recharts chart.
 */

export interface ChartTooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
  payload?: any;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string | number;
  /** Optional formatter for values. */
  formatter?: (value: number | string, name?: string) => React.ReactNode;
  /** Optional formatter for the label (x-axis). */
  labelFormatter?: (label: string | number) => React.ReactNode;
  /** When true, hide the label row (only show series rows). */
  hideLabel?: boolean;
}

export function ChartTooltip({
  active, payload, label,
  formatter, labelFormatter, hideLabel,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="pointer-events-none rounded-md border border-popover/50 bg-popover px-3 py-2 text-caption text-popover-foreground shadow-lg"
      style={{ minWidth: 120 }}
      role="tooltip"
    >
      {!hideLabel && label !== undefined && label !== null ? (
        <div className="mb-1 text-caption font-medium">
          {labelFormatter ? labelFormatter(label) : String(label)}
        </div>
      ) : null}
      <ul className="flex flex-col gap-0.5">
        {payload.map((item, idx) => {
          const formatted = formatter
            ? formatter(item.value as any, item.name)
            : item.value;
          return (
            <li
              key={item.dataKey ?? idx}
              className="flex items-center justify-between gap-3 text-caption leading-tight tabular-nums"
            >
              <span className="inline-flex items-center gap-1.5 opacity-80">
                <span
                  className="inline-block size-2 rounded-full"
                  // Line/bar/area expose `color`; pie slices carry it on the datum.
                  style={{ background: item.color ?? (item as any).payload?.fill ?? (item as any).payload?.color }}
                  aria-hidden
                />
                {item.name ?? item.dataKey}
              </span>
              <span className="font-semibold">{formatted}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
