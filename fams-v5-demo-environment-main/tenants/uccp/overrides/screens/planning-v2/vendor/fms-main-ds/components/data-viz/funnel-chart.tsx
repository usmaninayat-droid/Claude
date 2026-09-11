import * as React from 'react';
import { cn } from '../utils/cn';
import { CHART_SERIES_SEQUENTIAL } from './chart-tokens';

/**
 * FunnelChart — stage-to-stage conversion (funnel / flow, WCAG AA). Accessible
 * row form: one centered bar per stage (width ∝ value), with the value and the
 * conversion % vs the previous stage shown as TEXT on every row, and the biggest
 * drop flagged. Single-hue sequential ramp (tokens). Token-only.
 */

export interface FunnelStage {
  id: string;
  label: React.ReactNode;
  value: number;
}

export interface FunnelChartProps {
  stages: FunnelStage[];
  /** Sequential color ramp; defaults to the DS chart sequential tokens. */
  colors?: string[];
  className?: string;
}

export function FunnelChart({ stages, colors = CHART_SERIES_SEQUENTIAL, className }: FunnelChartProps) {
  if (!stages.length) return <div className="grid h-full min-h-24 place-items-center text-body-sm text-muted-foreground">No data</div>;
  const first = stages[0].value || 1;
  // Precompute step-over-step conversion to flag the biggest drop.
  const drops = stages.map((s, i) => (i === 0 ? 0 : (stages[i - 1].value ? 1 - s.value / stages[i - 1].value : 0)));
  const worst = drops.indexOf(Math.max(...drops));

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {stages.map((s, i) => {
        const widthPct = Math.max(4, (s.value / first) * 100);
        const conv = i === 0 ? 100 : stages[i - 1].value ? Math.round((s.value / stages[i - 1].value) * 100) : 0;
        const color = colors[Math.min(i, colors.length - 1)];
        return (
          <div key={s.id} className="flex items-center gap-3">
            <div className="w-32 shrink-0 truncate text-body-sm text-foreground">{s.label}</div>
            <div className="relative flex-1">
              <div
                className="mx-auto flex h-9 items-center justify-center rounded-md text-body-xs font-semibold text-primary-foreground"
                style={{ width: `${widthPct}%`, background: color }}
                role="img"
                aria-label={`${typeof s.label === 'string' ? s.label : 'stage'}: ${s.value}${i > 0 ? `, ${conv}% of previous` : ''}`}
              >
                {s.value.toLocaleString()}
              </div>
            </div>
            <div className="w-24 shrink-0 text-right text-body-xs tabular-nums">
              {i === 0 ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <span className={cn('font-semibold', i === worst ? 'text-[var(--status-error)]' : 'text-muted-foreground')}>
                  {conv}%{i === worst ? ' ▼' : ''}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
