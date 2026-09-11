import { useMemo } from 'react';
import { AlertTriangle, ClipboardList, Truck, Timer, ChevronRight } from 'lucide-react';
import { WidgetCard, BarChart, GaugeChart } from '@ds/components/data-viz';
import { StaticDonutChart, StaticAreaChart } from './StaticCharts';
import { useInspectorStore } from '../../data/store';
import {
  openRequests,
  criticalNow,
  tankersActive,
  avgResponseHrs,
  plansExecuting,
  complianceAvg,
  sevenDayTrend,
  categoryDonut,
} from '../../data/kpis';
import { PLAN_STATUS_META } from '../../data/status';
import { KpiTile } from '../../components/KpiTile';
import { IncidentCard } from '../requests/IncidentCard';
import { PlanCard } from '../plans/PlanCard';
import { IncidentMobileListCard, PlanMobileListCard } from '../../mobile/MobileRecordViews';
import type { PlanStatus } from '../../data/types';

export interface DashboardModuleProps {
  isMobile?: boolean;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const PLAN_STATUS_ORDER: PlanStatus[] = ['Scheduled', 'Executing', 'Completed'];

/** DashboardModule — Inspector V5 dashboard: welcome block, KPI row, charts
 *  grid, and two attention/plans lists. Rendered by both TabletShell and
 *  MobileShell inside their own scroll containers. */
export function DashboardModule({ isMobile = false }: DashboardModuleProps) {
  const { incidents, plans, setActiveModule, selectIncident, selectPlan } = useInspectorStore();

  const openReq = openRequests(incidents);
  const critical = criticalNow(incidents);
  const tankers = tankersActive(plans);
  const avgResp = avgResponseHrs(incidents);
  const executing = plansExecuting(plans);
  const compliance = complianceAvg(plans);

  const trend = useMemo(() => sevenDayTrend(incidents), [incidents]);
  const donutData = useMemo(() => {
    const byCategory = categoryDonut(incidents);
    return Object.entries(byCategory).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  const planStatusByZone = useMemo(() => {
    const zones = Array.from(new Set(plans.map((p) => p.zone))).slice(0, 6);
    return zones.map((zone) => {
      const row: Record<string, number | string> = { zone };
      PLAN_STATUS_ORDER.forEach((status) => {
        row[status] = plans.filter((p) => p.zone === zone && p.status === status).length;
      });
      return row;
    });
  }, [plans]);

  const attention = useMemo(
    () =>
      incidents
        .filter((i) => i.priority === 'Critical' || i.reopened)
        .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
        .slice(0, 5),
    [incidents]
  );

  const todaysPlans = useMemo(
    () =>
      [...plans]
        .sort((a, b) => {
          const order: Record<PlanStatus, number> = { Executing: 0, Scheduled: 1, Completed: 2 };
          return order[a.status] - order[b.status];
        })
        .slice(0, 5),
    [plans]
  );

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const kpiGrid: React.CSSProperties = isMobile
    ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }
    : { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 };

  const chartsGrid: React.CSSProperties = isMobile
    ? { display: 'grid', gridTemplateColumns: '1fr', gap: 16 }
    : { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 };

  const listsGrid: React.CSSProperties = isMobile
    ? { display: 'grid', gridTemplateColumns: '1fr', gap: 16 }
    : { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 };

  return (
    <div style={{ padding: isMobile ? '20px 20px 24px' : 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Welcome block */}
      <div>
        <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: 'var(--foreground)' }}>
          {greeting()}, Ahmed Khalid
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted-foreground)' }}>{today}</p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--foreground)' }}>
          {openReq} open request{openReq === 1 ? '' : 's'} · {executing} plan{executing === 1 ? '' : 's'} executing
        </p>
      </div>

      {/* KPI row */}
      <div style={kpiGrid}>
        <KpiTile
          label="Open Requests"
          value={openReq}
          onClick={() => setActiveModule('requests')}
        />
        <KpiTile
          label="Critical Now"
          value={critical}
          trend={critical > 0 ? 'down' : 'neutral'}
          delta={critical > 0 ? `${critical} need attention` : undefined}
          onClick={() => setActiveModule('requests')}
        />
        <KpiTile
          label="Tankers Active"
          value={tankers}
          onClick={() => setActiveModule('plans')}
        />
        <KpiTile
          label="Avg Response"
          value={avgResp}
          unit="hrs"
          onClick={() => setActiveModule('requests')}
        />
      </div>

      {/* Charts grid */}
      <div style={chartsGrid}>
        <WidgetCard title="Requests by Category" icon={<ClipboardList size={16} />}>
          {donutData.length ? (
            <StaticDonutChart data={donutData} height={220} />
          ) : (
            <EmptyChart />
          )}
        </WidgetCard>

        <WidgetCard title="7-Day Requests vs Closures" icon={<Timer size={16} />}>
          <StaticAreaChart
            data={trend}
            xKey="date"
            series={[
              { dataKey: 'requests', name: 'Requests', color: 'var(--chart-1)' },
              { dataKey: 'closures', name: 'Closures', color: 'var(--chart-2)' },
            ]}
            height={220}
          />
        </WidgetCard>

        <WidgetCard title="Plans by Status" subtitle="per zone" icon={<Truck size={16} />}>
          {planStatusByZone.length ? (
            <BarChart
              data={planStatusByZone}
              xKey="zone"
              series={PLAN_STATUS_ORDER.map((status) => ({
                dataKey: status,
                name: PLAN_STATUS_META[status].label,
                color: PLAN_STATUS_META[status].color,
              }))}
              stacked
              showLegend
              height={220}
            />
          ) : (
            <EmptyChart />
          )}
        </WidgetCard>

        <WidgetCard title="Today's Compliance" icon={<AlertTriangle size={16} />}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
            <GaugeChart value={compliance} label="Compliance avg" />
          </div>
        </WidgetCard>
      </div>

      {/* Two lists */}
      <div style={listsGrid}>
        <ListSection
          title="Needs your attention"
          emptyLabel="Nothing critical right now"
          isMobile={isMobile}
          onViewAll={() => setActiveModule('requests')}
        >
          {attention.map((incident) => {
            const open = () => {
              setActiveModule('requests');
              selectIncident(incident.id);
            };
            return isMobile ? (
              <IncidentMobileListCard key={incident.id} incident={incident} onClick={open} />
            ) : (
              <IncidentCard key={incident.id} incident={incident} onClick={open} />
            );
          })}
        </ListSection>

        <ListSection
          title="Today's plans"
          emptyLabel="No plans scheduled"
          isMobile={isMobile}
          onViewAll={() => setActiveModule('plans')}
        >
          {todaysPlans.map((plan) => {
            const open = () => {
              setActiveModule('plans');
              selectPlan(plan.id);
            };
            return isMobile ? (
              <PlanMobileListCard key={plan.id} plan={plan} onClick={open} />
            ) : (
              <PlanCard key={plan.id} plan={plan} onClick={open} />
            );
          })}
        </ListSection>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
      No data yet
    </div>
  );
}

function ListSection({
  title,
  emptyLabel,
  onViewAll,
  isMobile = false,
  children,
}: {
  title: string;
  emptyLabel: string;
  onViewAll: () => void;
  isMobile?: boolean;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div
      style={{
        // Grid items default to `min-width: auto`, which lets a nowrap card
        // line push the track wider than the viewport — pin it to 0 so the
        // cards truncate instead.
        minWidth: 0,
        border: '1px solid var(--border)',
        // Mobile matches the sheet/card rhythm of the module screens: 16px
        // inset and a shallow card shadow instead of the desktop panel's
        // flat surface. Corners normalized to the radius spec's md token
        // (6px) — both mobile and desktop are >=48px large-surface widgets.
        borderRadius: 'var(--ins-radius-md)',
        background: isMobile ? 'var(--muted)' : 'var(--card)',
        boxShadow: isMobile ? '0 1px 3px rgba(16,24,40,0.06)' : undefined,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</h3>
        <button
          type="button"
          onClick={onViewAll}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--primary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          View all <ChevronRight size={14} />
        </button>
      </div>
      {hasChildren ? (
        <div style={{ display: 'flex', minWidth: 0, flexDirection: 'column', gap: 8 }}>{children}</div>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-foreground)' }}>{emptyLabel}</p>
      )}
    </div>
  );
}
