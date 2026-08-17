import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { KpiMetricCard } from './kpi-metric-card';
import type { KpiMetricCardProps } from './kpi-metric-card';
import { StatusBreakdownCard } from './status-breakdown-card';
import type { StatusBreakdownCardProps } from './status-breakdown-card';

/**
 * DispatcherCockpit — Operations Center › Dispatcher Cockpit (FAMS; from the Tadweer
 * ref, Figma lXBH6N7ZpHfBuY60tH71TD node 2227-76367). A scrollable operations page:
 * next-shift alert · filters + actions · value-first KPI grid · Fleet/Workforce
 * status panels · then a `children` slot for the Live GIS Map + analytics widgets
 * (later passes). Fully config-driven + token-only; FAMS-branded by default.
 */

export type CockpitIcon = React.ComponentType<{ size?: number; className?: string }>;
export interface CockpitAlert { text: React.ReactNode; timeLeft?: string; tone?: 'error' | 'warning' | 'info' }
export interface CockpitFilter { label: string; icon?: CockpitIcon; placeholder?: boolean }
export interface CockpitAction { id: string; label: string; icon: CockpitIcon; primary?: boolean; onClick?: () => void }

export interface DispatcherCockpitProps {
  alert?: CockpitAlert;
  filters?: CockpitFilter[];
  /** FUNCTIONAL filter fields (selects/date pickers) rendered in the filters
   *  row — for products whose filters actually drive the data (T-021). */
  filterSlot?: React.ReactNode;
  actions?: CockpitAction[];
  kpis: KpiMetricCardProps[];
  onKpiClick?: (kpi: KpiMetricCardProps) => void;
  /** Rendered directly above the KPI grid — e.g. a tab strip scoping the KPI set. */
  kpiHeader?: React.ReactNode;
  statusPanels?: StatusBreakdownCardProps[];
  /** Live GIS Map + analytics widgets slot (later passes). */
  children?: React.ReactNode;
  className?: string;
}

const TONE_VAR: Record<NonNullable<CockpitAlert['tone']>, string> = {
  error: 'var(--status-error)', warning: 'var(--status-warning)', info: 'var(--primary)',
};

export function DispatcherCockpit({ alert, filters, filterSlot, actions, kpis, onKpiClick, kpiHeader, statusPanels, children, className }: DispatcherCockpitProps) {
  return (
    <div className={cn('min-h-0 flex-1 overflow-y-auto', className)}>
      {alert && (
        <div className="px-6 pt-4">
          <div
            className="flex items-center justify-between gap-3 rounded-md border px-3.5 py-2.5"
            style={{ borderColor: `color-mix(in srgb, ${TONE_VAR[alert.tone ?? 'error']} 20%, transparent)`, background: `color-mix(in srgb, ${TONE_VAR[alert.tone ?? 'error']} 6%, transparent)` }}
          >
            <div className="flex items-center gap-2.5 text-body-sm text-foreground">
              <span className="grid size-6 shrink-0 place-items-center rounded-md" style={{ background: `color-mix(in srgb, ${TONE_VAR[alert.tone ?? 'error']} 12%, transparent)`, color: TONE_VAR[alert.tone ?? 'error'] }}>
                <Icons.AlertTriangle size={15} />
              </span>
              <span>{alert.text}</span>
            </div>
            {alert.timeLeft && <span className="shrink-0 text-body-xs font-medium text-muted-foreground">{alert.timeLeft}</span>}
          </div>
        </div>
      )}

      {(filters?.length || actions?.length || filterSlot) && (
        <div className="flex items-center gap-3 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {filterSlot}
            {filters?.map((f) => {
              const FI = f.icon;
              return (
                <button key={f.label} type="button" className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-body-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                  {FI && <FI size={16} className="text-muted-foreground" />}
                  <span className={f.placeholder ? 'text-muted-foreground' : 'text-foreground'}>{f.label}</span>
                  <Icons.ChevronDown size={16} className="text-muted-foreground" />
                </button>
              );
            })}
          </div>
          {actions?.length ? (
            <div className="ml-auto flex items-center gap-2.5">
              {actions.map((a) => {
                const AI = a.icon;
                return (
                  <button key={a.id} type="button" aria-label={a.label} onClick={a.onClick}
                    className={cn('grid size-9 place-items-center rounded-md border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                      a.primary ? 'border-primary/45 bg-secondary text-primary hover:brightness-95' : 'border-border bg-card text-muted-foreground hover:bg-muted')}>
                    <AI size={18} />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      <div className="px-6">
        {kpiHeader ? <div className="mb-3">{kpiHeader}</div> : null}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((k, i) => (
            <KpiMetricCard key={k.id ?? k.label ?? i} {...k} onClick={k.onClick ?? (onKpiClick ? () => onKpiClick(k) : undefined)} />
          ))}
        </div>
      </div>

      {statusPanels?.length ? (
        <div className="mt-4 grid grid-cols-1 gap-4 px-6 pb-6 lg:grid-cols-2">
          {statusPanels.map((p) => <StatusBreakdownCard key={p.title} {...p} />)}
        </div>
      ) : null}

      {children}
    </div>
  );
}
