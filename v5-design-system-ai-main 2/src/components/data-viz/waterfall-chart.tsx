import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * WaterfallChart — cumulative increases/decreases between a start and end total
 * (WCAG AA). Increase / decrease / total are distinguished by BOTH colour (status
 * tokens) AND a ▲/▼ direction glyph + a value label on every bar (never colour
 * alone). Responsive via an SVG viewBox (no ResizeObserver), token-only.
 */

export interface WaterfallItem {
  id: string;
  label: string;
  value: number;
  /** 'start'/'total' render as absolute bars from the baseline; 'delta' floats. */
  kind?: 'start' | 'delta' | 'total';
}

export interface WaterfallChartProps {
  items: WaterfallItem[];
  height?: number;
  className?: string;
}

export function WaterfallChart({ items, height = 240, className }: WaterfallChartProps) {
  if (!items.length) return <div className="grid h-full min-h-24 place-items-center text-body-sm text-muted-foreground">No data</div>;

  const barW = 44, gap = 26, padX = 12, padTop = 22, padBottom = 44;
  const vw = padX * 2 + items.length * barW + (items.length - 1) * gap;
  const plotTop = padTop, plotBottom = height - padBottom;

  let running = 0;
  const bars = items.map((it) => {
    let lo: number, hi: number, rise = true;
    if (it.kind === 'delta') {
      const from = running; running += it.value; rise = it.value >= 0;
      lo = Math.min(from, running); hi = Math.max(from, running);
    } else {
      lo = 0; hi = it.value; running = it.value;
    }
    return { ...it, lo, hi, rise, top: running };
  });
  const maxY = Math.max(...bars.map((b) => b.hi), 1);
  const y = (v: number) => plotBottom - (v / maxY) * (plotBottom - plotTop);
  const x = (i: number) => padX + i * (barW + gap);
  const fill = (b: (typeof bars)[number]) =>
    b.kind === 'delta' ? (b.rise ? 'var(--status-success)' : 'var(--status-error)') : 'var(--primary)';

  return (
    <svg
      viewBox={`0 0 ${vw} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Waterfall of cumulative changes"
      className={cn('block', className)}
    >
      {bars.map((b, i) => {
        const bx = x(i), by = y(b.hi), bh = Math.max(2, y(b.lo) - y(b.hi));
        const arrow = b.kind === 'delta' ? (b.rise ? '▲' : '▼') : '';
        const sign = b.kind === 'delta' && b.value > 0 ? '+' : '';
        return (
          <g key={b.id}>
            {/* connector from previous running level */}
            {i > 0 && b.kind === 'delta' ? (
              <line
                x1={x(i - 1) + barW} y1={y(bars[i - 1].top)} x2={bx} y2={y(bars[i - 1].top)}
                stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3"
              />
            ) : null}
            <rect x={bx} y={by} width={barW} height={bh} rx={3} fill={fill(b)} />
            {/* value + direction (a11y: not colour alone) */}
            <text x={bx + barW / 2} y={by - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--foreground)">
              {arrow}{sign}{b.value.toLocaleString()}
            </text>
            {/* x label */}
            <text x={bx + barW / 2} y={height - 24} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
              {b.label.length > 8 ? b.label.slice(0, 8) + '…' : b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
