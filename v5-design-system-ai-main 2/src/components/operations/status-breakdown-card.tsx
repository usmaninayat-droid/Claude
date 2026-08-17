import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';

/**
 * StatusBreakdownCard — Operations Center Fleet Availability / Workforce Readiness
 * panel (FAMS, from the Tadweer Dispatcher Cockpit ref). A row of labelled counts
 * over a single overlapping-segment proportion bar. Colours are DATA (category
 * colours the consumer supplies — pass DS tokens), so the component is token-clean.
 */

export type StatIcon = React.ComponentType<{ size?: number; className?: string }>;
export interface StatColumn { label: string; value: string; color: string }
export interface StatusBar { color: string; width: number } // width = cumulative %

export interface StatusBreakdownCardProps {
  title: string;
  icon?: StatIcon;
  filterLabel?: string;
  stats: StatColumn[];
  bars: StatusBar[];
  className?: string;
}

export function StatusBreakdownCard({ title, icon: Icon, filterLabel, stats, bars, className }: StatusBreakdownCardProps) {
  // widest behind (low z) → narrowest on top (high z) = the segmented look
  const layered = [...bars].sort((a, b) => b.width - a.width);
  return (
    <div className={cn('rounded-md border border-border bg-card', className)}>
      <div className="flex items-center gap-3 border-b border-border p-4">
        {Icon && <span className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground"><Icon size={16} /></span>}
        <h2 className="flex-1 text-body-lg font-semibold text-foreground">{title}</h2>
        {filterLabel && (
          <button type="button" className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3 text-body-sm text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
            {filterLabel}<Icons.ChevronDown size={16} className="text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-7 p-4">
        <div className="flex items-center">
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              <div className="flex flex-1 flex-col items-center gap-1 text-center">
                <span className="text-body-sm font-medium text-muted-foreground">{s.label}</span>
                <span className="text-h6 font-semibold tabular-nums" style={{ color: s.color }}>{s.value}</span>
              </div>
              {i < stats.length - 1 && <span className="h-12 w-px shrink-0 bg-border" />}
            </React.Fragment>
          ))}
        </div>

        <div className="relative h-3 rounded-full bg-muted">
          {layered.map((b, i) => (
            <div key={i} className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${b.width}%`, background: b.color, zIndex: i + 1 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
