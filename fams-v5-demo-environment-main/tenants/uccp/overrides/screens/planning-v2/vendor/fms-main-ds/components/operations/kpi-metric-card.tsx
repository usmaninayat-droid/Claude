import * as React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * KpiMetricCard — Operations Center value-first KPI card (FAMS, from the Tadweer
 * Dispatcher Cockpit ref, node 2227-76367). A big value + optional colored left
 * accent + a delta/status badge, optionally clickable (opens a raw-data sheet in a
 * later pass). Complements the DS label-first `KpiTile`; token-only.
 *
 * Fleet Manager Console pass (T-FMC-1): += optional `trend` / `sub` / `link` —
 * ADDITIVE, fully backward-compatible (all new fields optional, existing
 * `value`/`label`/`accent`/`badge` consumers — e.g. the Dispatcher Cockpit KPI
 * grid — render byte-identically since none of them set the new props).
 */

export type KpiAccent = 'success' | 'warning' | 'error' | 'primary';
export type KpiBadgeTone = 'up' | 'down' | 'success' | 'warning' | 'link';

export interface KpiMetricCardProps {
  id?: string;
  value: string;
  label: string;
  accent?: KpiAccent;
  badge?: { text: string; tone: KpiBadgeTone };
  /** Inline trend chip rendered next to the value (e.g. "▲ +2.1%"). Distinct
   *  from `badge` (which sits at the header's trailing edge) — a card may set
   *  either, both, or neither. `tone` overrides the default up=success/down=error. */
  trend?: { direction: 'up' | 'down' | 'none'; value?: string; tone?: string };
  /** Extra muted line rendered below the label (e.g. "within 30 days", "6 in transit · 4 delayed"). */
  sub?: React.ReactNode;
  /** Clickable text link rendered as the card's last line (e.g. "View Details"). */
  link?: { label: string; onClick?: () => void };
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
const TREND_COLOR: Record<'up' | 'down' | 'none', string | undefined> = {
  up: 'var(--status-success)', down: 'var(--status-error)', none: undefined,
};

/** "270/292" → bold head + muted "/tail". */
function renderValue(value: string): React.ReactNode {
  if (value.includes('/')) {
    const [head, tail] = value.split('/');
    return <>{head}<span className="text-muted-foreground">/{tail}</span></>;
  }
  return value;
}

export function KpiMetricCard({ value, label, accent, badge, trend, sub, link, onClick, className }: KpiMetricCardProps) {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : null;
  const trendColor = trend ? (trend.tone ?? TREND_COLOR[trend.direction]) : undefined;
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      // Guard against a nested `link` button (interactive-in-interactive):
      // only react to Enter/Space that originates on the card itself, never
      // a bubbled keydown from the inner link button.
      onKeyDown={onClick ? (e) => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={cn(
        'relative overflow-hidden rounded-md border border-border bg-card p-4',
        onClick && 'cursor-pointer outline-none transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {accent && <span className="absolute inset-y-0 left-0 w-1" style={{ background: ACCENT[accent] }} />}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-h6 font-semibold leading-none tabular-nums text-foreground">{renderValue(value)}</span>
          {trend?.value && trend.direction !== 'none' ? (
            <span className="inline-flex items-center gap-0.5 text-caption font-semibold" style={{ color: trendColor }}>
              {TrendIcon ? <TrendIcon size={12} strokeWidth={2.5} /> : null}{trend.value}
            </span>
          ) : null}
        </div>
        {badge && <span className={cn('shrink-0 whitespace-nowrap text-body-xs font-semibold', TONE[badge.tone])}>{badge.text}</span>}
      </div>
      <div className="mt-2 text-body-sm text-muted-foreground">{label}</div>
      {trend?.direction === 'none' && trend.value ? (
        <div className="mt-1 text-caption font-medium" style={{ color: trendColor ?? 'var(--muted-foreground)' }}>{trend.value}</div>
      ) : null}
      {sub ? <div className="mt-1 text-caption text-muted-foreground">{sub}</div> : null}
      {link ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); link.onClick?.(); }}
          className="mt-1 text-caption font-semibold text-primary hover:underline"
        >
          {link.label}
        </button>
      ) : null}
    </div>
  );
}
