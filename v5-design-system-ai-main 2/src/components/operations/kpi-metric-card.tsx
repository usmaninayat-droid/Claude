import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * KpiMetricCard — Operations Center value-first KPI card (FAMS, from the Tadweer
 * Dispatcher Cockpit ref, node 2227-76367). A big value + optional colored left
 * accent + a delta/status badge, optionally clickable (opens a raw-data sheet in a
 * later pass). Complements the DS label-first `KpiTile`; token-only.
 */

export type KpiAccent = 'success' | 'warning' | 'error' | 'primary';
export type KpiBadgeTone = 'up' | 'down' | 'success' | 'warning' | 'link';

export interface KpiMetricCardProps {
  id?: string;
  value: string;
  label: string;
  accent?: KpiAccent;
  badge?: { text: string; tone: KpiBadgeTone };
  onClick?: () => void;
  className?: string;
}

const ACCENT: Record<KpiAccent, string> = {
  success: 'var(--status-success)', warning: 'var(--status-warning)', error: 'var(--status-error)', primary: 'var(--primary)',
};
const TONE: Record<KpiBadgeTone, string> = {
  up: 'text-[color:var(--status-success)]', down: 'text-[color:var(--status-error)]',
  success: 'text-[color:var(--status-success)]', warning: 'text-[color:var(--status-warning)]', link: 'text-primary',
};

/** "270/292" → bold head + muted "/tail". */
function renderValue(value: string): React.ReactNode {
  if (value.includes('/')) {
    const [head, tail] = value.split('/');
    return <>{head}<span className="text-muted-foreground">/{tail}</span></>;
  }
  return value;
}

export function KpiMetricCard({ value, label, accent, badge, onClick, className }: KpiMetricCardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={cn(
        'relative overflow-hidden rounded-md border border-border bg-card p-4',
        onClick && 'cursor-pointer outline-none transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {accent && <span className="absolute inset-y-0 left-0 w-1" style={{ background: ACCENT[accent] }} />}
      <div className="flex items-start justify-between gap-2">
        <span className="text-h6 font-semibold leading-none tabular-nums text-foreground">{renderValue(value)}</span>
        {badge && <span className={cn('shrink-0 whitespace-nowrap text-body-xs font-semibold', TONE[badge.tone])}>{badge.text}</span>}
      </div>
      <div className="mt-2 text-body-sm text-muted-foreground">{label}</div>
    </div>
  );
}
