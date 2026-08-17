import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * CompareBars — a labelled multi-bar comparison widget (Figma DS V2
 * "Gross Weight – Collected vs Received", 5235:8605).
 *
 * A card with a header, an optional meta row (timestamp / discrepancy / a
 * tolerance badge), and 2+ horizontal bars — each with a label above and its
 * value at the end of the track. Bars share a common scale (the largest value,
 * or an explicit `max`) so lengths are visually comparable.
 */

const TONE: Record<string, string> = {
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  error: 'var(--status-error)',
  info: 'var(--status-info)',
  primary: 'var(--primary)',
};

export interface CompareBar {
  label: React.ReactNode;
  value: number;
  /** End-of-bar display (e.g. "3200 Kg"). Defaults to the value. */
  valueLabel?: React.ReactNode;
  /** Tone key (success/warning/error/info/primary) or a CSS colour. */
  color?: string;
}

export interface CompareBarsProps {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  /** Inline meta pairs shown in a tinted strip under the header. */
  meta?: { label: React.ReactNode; value: React.ReactNode }[];
  /** Status pill on the right of the meta strip (e.g. "Within tolerance"). */
  badge?: { label: React.ReactNode; tone?: 'success' | 'warning' | 'error' | 'info' };
  bars: CompareBar[];
  /** Shared scale max. Defaults to the largest bar value. */
  max?: number;
  className?: string;
}

const resolveColor = (c: string | undefined, fallback: string) =>
  c ? TONE[c] ?? c : fallback;

export function CompareBars({ title, icon, meta, badge, bars, max, className }: CompareBarsProps) {
  const scale = max ?? Math.max(1, ...bars.map((b) => b.value));
  const badgeColor = badge ? TONE[badge.tone ?? 'info'] : undefined;

  return (
    <div className={cn('flex flex-col gap-4 rounded-xl border border-border bg-card p-5', className)}>
      {(title || icon) && (
        <div className="flex items-center gap-2">
          {icon ? <span className="flex size-5 items-center justify-center text-primary">{icon}</span> : null}
          <h3 className="text-body-md font-bold text-foreground">{title}</h3>
        </div>
      )}

      {(meta?.length || badge) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-muted px-3 py-2">
          {meta?.map((m, i) => (
            <span key={i} className="text-caption text-muted-foreground">
              {m.label}: <span className="font-semibold text-foreground">{m.value}</span>
            </span>
          ))}
          {badge ? (
            <span
              className="ml-auto rounded-[3px] px-2 py-0.5 text-caption font-semibold text-white"
              style={{ background: badgeColor }}
            >
              {badge.label}
            </span>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {bars.map((bar, i) => {
          const color = resolveColor(bar.color, i === 0 ? 'var(--status-success)' : 'var(--primary)');
          const pct = Math.max(0, Math.min(100, (bar.value / scale) * 100));
          return (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-medium text-foreground">{bar.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-muted">
                  <div className="h-full rounded-md transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="w-16 shrink-0 text-right text-body-sm font-semibold tabular-nums text-foreground">
                  {bar.valueLabel ?? bar.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
