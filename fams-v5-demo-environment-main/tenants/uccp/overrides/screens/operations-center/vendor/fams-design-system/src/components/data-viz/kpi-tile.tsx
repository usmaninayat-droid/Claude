import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../utils/cn';
import { IconBadge } from './icon-badge';

/**
 * KpiTile — large stat card.
 *
 * Spec: `kpi-tile.spec.md`. Used at the top of every dashboard, asset
 * profile, settings dashboard.
 *
 * Layout:
 *   ┌────────────────────────────────────────┐
 *   │ ┌──┐  Label (uppercase muted)            │
 *   │ │📊│  28-32px BOLD foreground value      │
 *   │ └──┘  ↗ +12.5% vs last week              │
 *   └────────────────────────────────────────┘
 *
 * The icon tile (left) is optional. When present, it's a tinted-square in
 * the appropriate accent color (purple for cost, green for success, etc.).
 */

export type KpiTrend = 'up' | 'down' | 'neutral';

export interface KpiTileProps {
  /** Label above the value. Rendered uppercase tracked. */
  label: React.ReactNode;
  /** Big numeric value (or text like "7:45 hrs"). */
  value: React.ReactNode;
  /** Optional unit suffix beside the value (e.g. "AED", "km"). */
  unit?: React.ReactNode;
  /** Trend label (e.g. "+12.5% vs last week"). */
  trendValue?: React.ReactNode;
  /** Trend direction (drives icon + color). */
  trend?: KpiTrend;
  /** Optional helper text below the value. */
  description?: React.ReactNode;
  /** Optional icon (lucide) — rendered in the standard circular IconBadge. */
  icon?: React.ReactNode;
  /** @deprecated bg is derived from `iconColor` now (kept for back-compat). */
  iconBg?: string;
  /** Icon accent color (token or hex). Defaults to primary. The badge tints it. */
  iconColor?: string;
  className?: string;
  onClick?: () => void;
}

const TREND_CONFIG = {
  up:      { color: 'var(--chart-accent-green)',  Icon: TrendingUp },
  down:    { color: 'var(--chart-accent-red)',    Icon: TrendingDown },
  neutral: { color: 'var(--muted-foreground)',    Icon: Minus },
} as const;

export function KpiTile({
  label, value, unit, trendValue, trend, description,
  icon, iconBg = 'var(--secondary)', iconColor = 'var(--primary)',
  className, onClick,
}: KpiTileProps) {
  const trendCfg = trend ? TREND_CONFIG[trend] : null;
  const TrendIcon = trendCfg?.Icon;
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-border bg-card p-4',
        onClick && 'cursor-pointer transition-colors hover:bg-muted/40',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {icon ? <IconBadge icon={icon} color={iconColor} size={40} /> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-[28px] font-bold leading-tight text-foreground">
            {value}
          </span>
          {unit ? (
            <span className="text-sm font-medium text-muted-foreground">{unit}</span>
          ) : null}
        </div>
        {(trendCfg && trendValue) || description ? (
          <div className="flex items-center gap-1 text-xs">
            {trendCfg && TrendIcon ? (
              <span className="inline-flex" style={{ color: trendCfg.color }}>
                <TrendIcon size={12} strokeWidth={2.5} />
              </span>
            ) : null}
            {trendValue ? (
              <span className="font-semibold" style={{ color: trendCfg?.color ?? 'var(--muted-foreground)' }}>
                {trendValue}
              </span>
            ) : null}
            {description ? (
              <span className="text-muted-foreground">{description}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
