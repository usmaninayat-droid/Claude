import * as React from 'react';
import { cn } from '../utils/cn';
import { Eye, EyeOff, InfoCircle, TrendUp01 } from '../../icons';

/**
 * MapAnalyticsPanel — the operational analytics stack that sits on the top-left
 * of a flood-management map (Figma Flood Management + user reference).
 * Three cards, top to bottom:
 *   1. Flood Index — 0–100 score with risk chip + progress bar + KPI rows
 *   2. Rain Projection — Now / +1h / +2h with tinted bars + storm-cell footer
 *   3. Fleet Status — stacked availability bar + legend + utilisation footer
 * A "Hide / Show Analytics" pill toggle sits at the top so the operator can
 * clear the view. Purely presentational, config-driven, token-only chrome.
 */

export interface FloodIndexProps {
  score: number;                    // 0-100
  risk: 'Low' | 'Medium' | 'High';
  trendLabel?: string;              // e.g. "Increasing"
  rainIntensity?: string;           // e.g. "18 mm/hr"
  activeClusters?: number;
}
export interface RainProjectionSlot { label: string; mm: number }
export interface RainProjectionProps {
  slots: RainProjectionSlot[];      // typically 3 (Now, +1h, +2h)
  stormCellLabel?: string;          // e.g. "Moving NE"
}
export interface FleetStatusSegment { label: string; count: number; color: string }
export interface FleetStatusProps {
  segments: FleetStatusSegment[];
  utilisationPct?: number;
}

export interface MapAnalyticsPanelProps {
  floodIndex?: FloodIndexProps;
  rainProjection?: RainProjectionProps;
  fleet?: FleetStatusProps;
  /** Optional external control of the hidden state (default: internal). */
  hidden?: boolean;
  onHiddenChange?: (hidden: boolean) => void;
  /** Render the Hide/Show Analytics pill (default true). Set false on a
   *  secondary panel whose visibility is driven by a primary panel's toggle
   *  via the controlled `hidden` prop — e.g. a Fleet Status card placed
   *  bottom-right while Flood Index/Rain sit top-left. */
  showToggle?: boolean;
  className?: string;
}

const RISK_TONE = {
  Low: 'var(--status-success)',
  Medium: 'var(--status-warning)',
  High: 'var(--status-error)',
} as const;

function ToggleButton({ hidden, onClick }: { hidden: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!hidden}
      className="pointer-events-auto flex w-fit items-center gap-2 rounded-lg bg-primary px-3 py-2 text-body-sm font-semibold text-primary-foreground shadow-elevation transition-colors hover:bg-[color:var(--primary-dark)] focus-visible:ring-2 focus-visible:ring-ring"
    >
      {hidden ? <Eye size={16} /> : <EyeOff size={16} />}
      {hidden ? 'Show Analytics' : 'Hide Analytics'}
    </button>
  );
}

function FloodIndexCard({ p }: { p: FloodIndexProps }) {
  const pct = Math.max(0, Math.min(100, p.score));
  const tone = RISK_TONE[p.risk];
  return (
    <div className="pointer-events-auto rounded-xl border border-border bg-card p-3 shadow-elevation">
      <div className="flex items-start justify-between gap-2">
        <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Qatar Flood Index</span>
        <div className="flex items-center gap-1.5">
          <InfoCircle size={14} className="text-muted-foreground" />
          <span
            className="rounded-md px-2 py-0.5 text-caption font-bold"
            style={{ background: `color-mix(in srgb, ${tone} 15%, transparent)`, color: tone }}
          >
            {p.risk}
          </span>
        </div>
      </div>
      <div className="mt-1 flex items-baseline gap-1 text-foreground">
        <span className="text-h3 font-bold tabular-nums">{p.score}</span>
        <span className="text-body-sm text-muted-foreground">/ 100</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className="block h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500" style={{ width: `${pct}%`, background: tone }} />
      </div>
      <ul className="mt-2 flex flex-col gap-0.5 text-body-sm">
        {p.trendLabel && (
          <li className="flex items-center gap-1.5" style={{ color: 'var(--status-error)' }}>
            <TrendUp01 size={14} />
            <span className="font-semibold text-foreground">Trend:</span>
            <span className="text-foreground">{p.trendLabel}</span>
          </li>
        )}
        {p.rainIntensity && (
          <li className="flex items-center justify-between text-muted-foreground">
            <span>Rain Intensity</span>
            <span className="font-semibold text-foreground">{p.rainIntensity}</span>
          </li>
        )}
        {typeof p.activeClusters === 'number' && (
          <li className="flex items-center justify-between text-muted-foreground">
            <span>Active Clusters</span>
            <span className="font-semibold text-foreground">{p.activeClusters}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

function slotTone(mm: number): string {
  if (mm < 8) return 'var(--primary-dark)';
  if (mm < 20) return 'var(--primary)';
  return 'var(--status-error)';
}
function RainProjectionCard({ p }: { p: RainProjectionProps }) {
  return (
    <div className="pointer-events-auto rounded-xl border border-border bg-card p-3 shadow-elevation">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-[color:var(--status-info)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2s6 8 6 12a6 6 0 1 1-12 0c0-4 6-12 6-12z" /></svg>
        </span>
        <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Rain Projection</span>
        <InfoCircle size={12} className="ml-1 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {p.slots.map((s) => {
          const tone = slotTone(s.mm);
          return (
            <div key={s.label} className="flex flex-col items-center gap-1.5">
              <span className="text-body-md font-bold text-foreground tabular-nums">{s.mm}</span>
              <span className="h-1 w-full rounded-full" style={{ background: tone }} />
              <span className="text-caption text-muted-foreground">{s.label}</span>
            </div>
          );
        })}
      </div>
      {p.stormCellLabel && (
        <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-body-sm text-muted-foreground">
          <TrendUp01 size={14} className="text-[color:var(--status-warning)]" />
          <span>Storm Cell:</span>
          <span className="font-medium text-foreground">{p.stormCellLabel}</span>
        </div>
      )}
    </div>
  );
}

function FleetStatusCard({ p }: { p: FleetStatusProps }) {
  const total = p.segments.reduce((s, seg) => s + seg.count, 0) || 1;
  return (
    <div className="pointer-events-auto rounded-xl border border-border bg-card p-3 shadow-elevation">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Fleet Status</span>
        <InfoCircle size={12} className="text-muted-foreground" />
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full" aria-hidden>
        {p.segments.map((seg) => (
          <span key={seg.label} style={{ background: seg.color, width: `${(seg.count / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-col gap-1 text-body-sm">
        {p.segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2">
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: seg.color }} />
            <span className="flex-1 text-muted-foreground">{seg.label}</span>
            <span className="font-semibold tabular-nums text-foreground">{seg.count}</span>
          </li>
        ))}
      </ul>
      {typeof p.utilisationPct === 'number' && (
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-body-sm">
          <span className="text-muted-foreground">Utilisation</span>
          <span className="font-semibold text-foreground">{p.utilisationPct}%</span>
        </div>
      )}
    </div>
  );
}

export function MapAnalyticsPanel({ floodIndex, rainProjection, fleet, hidden, onHiddenChange, showToggle = true, className }: MapAnalyticsPanelProps) {
  const [internalHidden, setInternalHidden] = React.useState(false);
  const isHidden = hidden ?? internalHidden;
  const toggle = () => {
    const next = !isHidden;
    if (onHiddenChange) onHiddenChange(next);
    else setInternalHidden(next);
  };

  return (
    <div className={cn('pointer-events-none flex w-[220px] max-w-[calc(100vw-2rem)] flex-col gap-2', className)}>
      {showToggle && <ToggleButton hidden={isHidden} onClick={toggle} />}
      {!isHidden && (
        <>
          {floodIndex && <FloodIndexCard p={floodIndex} />}
          {rainProjection && <RainProjectionCard p={rainProjection} />}
          {fleet && <FleetStatusCard p={fleet} />}
        </>
      )}
    </div>
  );
}
