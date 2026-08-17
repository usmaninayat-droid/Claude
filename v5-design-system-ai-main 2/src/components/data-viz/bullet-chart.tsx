import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * BulletChart — compact "performance vs target" rows (WCAG AAA when values are
 * shown as text, which they always are here). Ideal for a KPI grid: SLA %, fill
 * rate, utilisation — each against a target with qualitative bad/ok/good ranges.
 *
 * Encoding is never colour-alone: every row shows `value / target · %ofTarget`
 * as text, and the range bands carry the semantic status tones. Token-only.
 */

export interface BulletItem {
  id: string;
  label: React.ReactNode;
  value: number;
  target: number;
  /** Scale max. Defaults to max(value, target, ranges) × 1.1. */
  max?: number;
  /** Ascending thresholds splitting the track into bad → ok → good bands. */
  ranges?: number[];
  unit?: string;
}

export interface BulletChartProps {
  items: BulletItem[];
  className?: string;
}

// Soft status tints (color-mix over tokens — the sanctioned tint path, no hex).
const BAND_TONES = ['--status-error', '--status-warning', '--status-success'];
const bandTint = (i: number, n: number) => {
  // Map band index onto bad→ok→good; if fewer bands, bias toward the good end.
  const tone = BAND_TONES[Math.min(BAND_TONES.length - 1, i + (BAND_TONES.length - n))] ?? '--muted-foreground';
  return `color-mix(in srgb, var(${tone}) 18%, transparent)`;
};

export function BulletChart({ items, className }: BulletChartProps) {
  if (!items.length) return <Empty />;
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {items.map((it) => {
        const bands = it.ranges && it.ranges.length ? [...it.ranges].sort((a, b) => a - b) : [];
        const max = it.max ?? ((Math.max(it.value, it.target, ...(bands.length ? bands : [0])) * 1.1) || 1);
        const pct = it.target ? Math.round((it.value / it.target) * 100) : 0;
        const stops = [0, ...bands, max];
        return (
          <div key={it.id}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="text-body-sm font-medium text-foreground">{it.label}</span>
              <span className="text-body-xs tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{it.value}{it.unit}</span> / {it.target}{it.unit}
                <span className={cn('ml-1.5 font-semibold', pct >= 100 ? 'text-[var(--status-success)]' : pct >= 80 ? 'text-[var(--status-warning)]' : 'text-[var(--status-error)]')}>· {pct}%</span>
              </span>
            </div>
            <div
              className="relative h-5 w-full overflow-hidden rounded-md"
              role="img"
              aria-label={`${typeof it.label === 'string' ? it.label : 'metric'}: ${it.value}${it.unit ?? ''} of target ${it.target}${it.unit ?? ''}, ${pct}% of target`}
            >
              {/* qualitative range bands */}
              {stops.slice(0, -1).map((from, i) => {
                const to = stops[i + 1];
                return (
                  <span
                    key={i}
                    className="absolute inset-y-0"
                    style={{ left: `${(from / max) * 100}%`, width: `${((to - from) / max) * 100}%`, background: bandTint(i, stops.length - 1) }}
                  />
                );
              })}
              {/* performance bar */}
              <span
                className="absolute top-1/2 h-2 -translate-y-1/2 rounded-sm bg-primary"
                style={{ left: 0, width: `${Math.min(100, (it.value / max) * 100)}%` }}
              />
              {/* target marker */}
              <span
                aria-hidden
                className="absolute inset-y-0 w-0.5 bg-foreground"
                style={{ left: `${Math.min(100, (it.target / max) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Empty() {
  return <div className="grid h-full min-h-24 place-items-center text-body-sm text-muted-foreground">No data</div>;
}
