import { Sparkline } from '@ds/components/data-viz';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

export type KpiTileTrend = 'up' | 'down' | 'neutral';

export interface KpiTileProps {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  /** Delta label, e.g. "+3 vs yesterday". Omit for no delta row. */
  delta?: string;
  /** Direction driving the delta's icon + color. Ignored without `delta`. */
  trend?: KpiTileTrend;
  /** Optional tiny sparkline series shown beside the delta. */
  sparkline?: number[];
  onClick?: () => void;
}

const TREND_COLOR: Record<KpiTileTrend, string> = {
  up: 'var(--chart-accent-green)',
  down: 'var(--chart-accent-red)',
  neutral: 'var(--muted-foreground)',
};

const TREND_ICON: Record<KpiTileTrend, typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

/**
 * KpiTile — Inspector V5's dashboard stat tile. Local, lightweight wrapper
 * (visual reference: FRMS ui-kit KpiTile composite) rather than a direct
 * re-export, since @ds's own data-viz KpiTile doesn't carry a sparkline slot.
 */
export function KpiTile({ label, value, unit, delta, trend = 'neutral', sparkline, onClick }: KpiTileProps) {
  const TrendIcon = TREND_ICON[trend];
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        borderRadius: 'var(--ins-radius-md)',
        border: '1px solid var(--border)',
        background: 'var(--card)',
        padding: 16,
        cursor: onClick ? 'pointer' : undefined,
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--muted-foreground)' }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1, color: 'var(--foreground)' }}>{value}</span>
        {unit ? <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted-foreground)' }}>{unit}</span> : null}
      </div>
      {delta || sparkline ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {delta ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: TREND_COLOR[trend] }}>
              <TrendIcon size={12} strokeWidth={2.5} />
              {delta}
            </span>
          ) : <span />}
          {sparkline && sparkline.length > 1 ? (
            <Sparkline data={sparkline} color={TREND_COLOR[trend]} width={56} height={20} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
