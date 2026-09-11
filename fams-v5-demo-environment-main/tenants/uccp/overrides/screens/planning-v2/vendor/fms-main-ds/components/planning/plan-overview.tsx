import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { AreaChart, ComplianceGauge } from '../data-viz';

/**
 * PlanOverview — the aggregate summary of a RECURRING plan, shown before the
 * per-day monitoring detail. A plan configured in Interactive Planning repeats
 * daily over a long period (months → years); this rolls every daily instance up
 * into one "where do I focus?" view: KPIs, a compliance-over-time trend, a daily
 * heatmap calendar (click a day → that day's full detail), a needs-attention
 * list, and a per-service-point (POI) summary.
 *
 * Domain-neutral: a plan assigns workforce to **service points (POIs)** in zones
 * on a recurring schedule — "bins" are just one kind of service point. Brand =
 * FAMS blue; green/amber/red are genuine compliance/status. Config-driven `data`.
 */

export type DayStatus = 'completed' | 'ongoing' | 'scheduled' | 'missed';
export interface OverviewDay { dateISO: string; day: number; status: DayStatus; compliancePct?: number }
export interface OverviewPoint { name: string; serviced: number; total: number; compliancePct: number }
export interface PlanOverviewData {
  id: string;
  name: string;
  contractor: string;
  period: string;
  recurrence: string;
  status: string;
  avgCompliance: number;
  totalDays: number;
  completed: number;
  ongoing: number;
  scheduled: number;
  missedCollections: number;
  onTimePct: number;
  trend: { t: string; compliance: number }[];
  days: OverviewDay[];
  points: OverviewPoint[];
}
export interface PlanOverviewProps {
  data: PlanOverviewData;
  onBack?: () => void;
  onOpenDay?: (dateISO: string) => void;
  className?: string;
}

const OK = 'var(--status-success)';
const WARN = 'var(--status-warning)';
const ERR = 'var(--status-error)';
const P = 'var(--primary)';
const MUTED = 'var(--muted-foreground)';

const tierColor = (pct?: number, status?: DayStatus) => {
  if (status === 'scheduled') return 'var(--muted)';
  if (status === 'missed') return ERR;
  if (pct == null) return 'var(--muted)';
  return pct >= 90 ? OK : pct >= 75 ? WARN : ERR;
};

function Kpi({ icon, label, value, tone = P, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}>{icon}</span>
      <div className="flex flex-col">
        <span className="text-body-sm text-muted-foreground">{label}</span>
        <span className="text-h4 font-semibold text-foreground">{value}</span>
        {sub && <span className="text-body-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = status === 'COMPLETED' ? OK : status === 'ONGOING' ? P : WARN;
  return <span className="inline-flex items-center rounded-md px-2.5 py-1 text-caption font-bold uppercase tracking-wide text-white" style={{ background: tone }}>{status}</span>;
}

export function PlanOverview({ data, onBack, onOpenDay, className }: PlanOverviewProps) {
  // group days into weeks (7-col heatmap)
  const weeks: OverviewDay[][] = [];
  for (let i = 0; i < data.days.length; i += 7) weeks.push(data.days.slice(i, i + 7));

  const attention = [...data.days]
    .filter((d) => d.status === 'missed' || (d.compliancePct != null && d.compliancePct < 80))
    .sort((a, b) => (a.compliancePct ?? 0) - (b.compliancePct ?? 0))
    .slice(0, 5);

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-auto bg-muted/30', className)}>
      {/* top bar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-card px-6 py-3">
        <button type="button" onClick={onBack} aria-label="Back" className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.ChevronLeft size={16} /></button>
        <span className="text-body-sm font-semibold text-foreground">{data.id}</span>
        <span className="text-body-sm text-muted-foreground">{data.name}</span>
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-caption font-semibold text-muted-foreground">{data.contractor}</span>
        <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-caption font-medium text-foreground"><Icons.Calendar size={11} className="text-muted-foreground" />{data.period}</span>
        <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-caption font-medium text-foreground"><Icons.RefreshCcw01 size={11} className="text-muted-foreground" />{data.recurrence}</span>
        <span className="ml-auto"><StatusPill status={data.status} /></span>
      </div>

      <div className="flex flex-col gap-4 p-6">
        {/* KPI band */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 lg:flex-row lg:items-center">
          <div className="flex flex-col items-center gap-1 lg:pr-6 lg:border-r lg:border-border">
            <ComplianceGauge value={data.avgCompliance} size={120} />
            <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Avg Compliance</span>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Kpi icon={<Icons.Calendar size={18} />} label="Total Days" value={data.totalDays} tone={P} />
            <Kpi icon={<Icons.CheckCircle size={18} />} label="Completed" value={data.completed} tone={OK} />
            <Kpi icon={<Icons.Activity size={18} />} label="Ongoing" value={data.ongoing} tone={P} />
            <Kpi icon={<Icons.Clock size={18} />} label="Scheduled" value={data.scheduled} tone={WARN} />
            <Kpi icon={<Icons.AlertTriangle size={18} />} label="Missed Collections" value={data.missedCollections} tone={ERR} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* compliance trend */}
          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-body-sm font-semibold text-foreground"><Icons.TrendUp01 size={15} className="text-primary" />Compliance Over Time</span>
              <span className="text-body-xs text-muted-foreground">On-time {data.onTimePct}%</span>
            </div>
            <AreaChart data={data.trend} xKey="t" height={220} series={[{ dataKey: 'compliance', name: 'Compliance %', color: P }]} />
          </section>

          {/* needs attention */}
          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
            <span className="flex items-center gap-2 text-body-sm font-semibold text-foreground"><Icons.AlertTriangle size={15} className="text-[color:var(--status-error)]" />Needs Attention</span>
            {attention.length ? (
              <ul className="flex flex-col divide-y divide-border/70">
                {attention.map((d) => (
                  <li key={d.dateISO}>
                    <button type="button" onClick={() => onOpenDay?.(d.dateISO)} className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:opacity-80">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg text-caption font-bold text-white" style={{ background: tierColor(d.compliancePct, d.status) }}>{d.day}</span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-body-sm font-medium text-foreground">{d.dateISO}</span>
                        <span className="text-body-xs text-muted-foreground">{d.status === 'missed' ? 'Collections missed' : `Compliance ${d.compliancePct}%`}</span>
                      </span>
                      <Icons.ChevronRight size={15} className="shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="py-6 text-center text-body-sm text-muted-foreground">All days on track.</p>}
          </section>
        </div>

        {/* daily heatmap calendar */}
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-body-sm font-semibold text-foreground"><Icons.Calendar size={15} className="text-muted-foreground" />Daily Instances</span>
            <div className="flex items-center gap-3 text-body-xs text-muted-foreground">
              {[['≥90%', OK], ['75–89%', WARN], ['<75% / missed', ERR], ['scheduled', 'var(--muted)']].map(([l, c]) => (
                <span key={l} className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm" style={{ background: c }} />{l}</span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {weeks.map((wk, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1.5">
                {wk.map((d) => {
                  const c = tierColor(d.compliancePct, d.status);
                  const missed = d.status === 'missed';
                  return (
                    <button
                      key={d.dateISO}
                      type="button"
                      onClick={() => onOpenDay?.(d.dateISO)}
                      title={`${d.dateISO} · ${d.status}${d.compliancePct != null ? ` · ${d.compliancePct}%` : ''}`}
                      className="flex aspect-[4/3] flex-col items-start justify-between rounded-lg border p-2 text-left transition-transform hover:scale-[1.03]"
                      style={{ borderColor: missed ? ERR : 'var(--border)', background: `color-mix(in srgb, ${c} ${d.status === 'scheduled' ? 60 : 16}%, var(--card))` }}
                    >
                      <span className="text-body-xs font-semibold text-foreground">{d.day}</span>
                      <span className="inline-block size-2 rounded-full" style={{ background: c }} />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        {/* per-service-point summary */}
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <span className="flex items-center gap-2 text-body-sm font-semibold text-foreground"><Icons.MarkerPin01 size={15} className="text-muted-foreground" />Service Points Summary</span>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-body-sm">
              <thead className="bg-muted/40 text-caption uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-4 py-2.5 font-semibold">Location</th><th className="px-4 py-2.5 font-semibold">Serviced</th><th className="px-4 py-2.5 font-semibold">Coverage</th><th className="px-4 py-2.5 font-semibold text-right">Avg Compliance</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.points.map((pt) => {
                  const cov = pt.total ? Math.round((pt.serviced / pt.total) * 100) : 0;
                  return (
                    <tr key={pt.name} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{pt.name}</td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">{pt.serviced} / {pt.total}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2"><span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full" style={{ width: `${cov}%`, background: cov >= 90 ? OK : cov >= 75 ? WARN : ERR }} /></span><span className="text-body-xs text-muted-foreground">{cov}%</span></span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: pt.compliancePct >= 90 ? OK : pt.compliancePct >= 75 ? WARN : ERR }}>{pt.compliancePct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
