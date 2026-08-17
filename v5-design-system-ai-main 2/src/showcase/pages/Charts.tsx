import {
  WidgetCard,
  TrendBadge,
  ChartLegend,
  DonutChart,
  ActivityGauge,
  StackedBarChart,
  AreaTrendChart,
  HeatChart,
  HeatLegend,
  DONUT_PALETTE,
  BLUE_SERIES,
} from '../../components/charts';
import { PieChart, Gauge, BarChart3, Grid3x3, TrendingUp, Scale, Flame, ShieldCheck, MapPin } from 'lucide-react';
import { CompareBars } from '../../components/data-viz';
import { EventsHeatmap, ZoneComplianceMap, ServiceLocationsMap } from '../../components/map';
import { DashboardWidgetGrid, type DashboardWidget } from '../../components/app-shell';

const DASH_WIDGETS: DashboardWidget[] = [
  { kind: 'donut', title: 'Incident Status', span: 4, centerValue: '3,753', data: [
    { name: 'Open', value: 1820, color: 'var(--status-error)' },
    { name: 'In Review', value: 980, color: 'var(--status-warning)' },
    { name: 'Resolved', value: 953, color: 'var(--status-success)' },
  ] },
  { kind: 'gauge', title: 'Overall Compliance', span: 4, value: 81 },
  { kind: 'bar', title: 'Weekly Throughput', span: 4, xKey: 'd', series: [{ dataKey: 'v', color: 'var(--primary)', name: 'Tasks' }],
    data: [1,2,3,4,5,6,7].map((d) => ({ d: `D${d}`, v: 30 + ((d * 13) % 40) })) },
  { kind: 'compareBars', span: 12, title: 'Gross Weight — Collected vs Received',
    badge: { label: 'Within tolerance', tone: 'info' },
    bars: [
      { label: 'Collected Weight', value: 3200, valueLabel: '3200 Kg', color: 'success' },
      { label: 'Received Gross Weight', value: 3400, valueLabel: '3400 kg', color: 'primary' },
    ] },
];

/* Abu Dhabi sample geo (deterministic) for the map widgets. */
const AD: [number, number] = [24.453, 54.397];
const EVENT_HEAT = [
  [24.49, 54.36, 0.9], [24.47, 54.38, 0.8], [24.46, 54.40, 0.6], [24.44, 54.39, 0.5],
  [24.45, 54.35, 0.7], [24.50, 54.41, 0.4], [24.43, 54.43, 0.85], [24.48, 54.45, 0.3],
  [24.42, 54.37, 0.6], [24.46, 54.33, 0.5], [24.51, 54.38, 0.7], [24.44, 54.46, 0.4],
].map(([la, ln, i]) => ({ position: [la, ln] as [number, number], intensity: i }));
const ZONES = [
  { id: 'z1', label: 'Al Reef Village', color: '#7C3AED', points: [[24.50, 54.34], [24.52, 54.38], [24.49, 54.40], [24.48, 54.35]] as [number, number][] },
  { id: 'z2', label: 'Capital Mall', color: '#0072D6', points: [[24.43, 54.41], [24.45, 54.45], [24.42, 54.47], [24.41, 54.43]] as [number, number][] },
  { id: 'z3', label: 'Prestige Tower', color: '#F79009', points: [[24.45, 54.36], [24.47, 54.37], [24.46, 54.40], [24.44, 54.39]] as [number, number][] },
];
const SITE_PINS = [
  { id: 's1', position: [24.50, 54.36] as [number, number], kind: 'site' as const, status: 'reporting' as const, label: 'AR' },
  { id: 's2', position: [24.43, 54.43] as [number, number], kind: 'site' as const, status: 'warning' as const, label: 'CM' },
  { id: 's3', position: [24.455, 54.38] as [number, number], kind: 'site' as const, status: 'default' as const, label: 'PT' },
];

/* ── sample data (deterministic, no RNG) ─────────────────────────── */
const INCIDENTS = [
  { name: 'Reported Incidents', value: 2311, color: DONUT_PALETTE[0] },
  { name: 'Awaiting ESP Action', value: 231, color: DONUT_PALETTE[1] },
  { name: 'Completed', value: 400, color: DONUT_PALETTE[2] },
  { name: 'Review in Progress', value: 200, color: DONUT_PALETTE[3] },
  { name: 'Escalated', value: 180, color: DONUT_PALETTE[4] },
  { name: 'Closed', value: 200, color: DONUT_PALETTE[5] },
];

const DATES = Array.from({ length: 15 }, (_, i) => (i + 1) * 2);
const BAR_SERIES = BLUE_SERIES.map((color, i) => ({ key: `s${i + 1}`, color }));
const BAR_DATA = DATES.map((d, i) => {
  const row: Record<string, number | string> = { date: d };
  BAR_SERIES.forEach((s, j) => {
    row[s.key] = 70 + ((i * 7 + j * 23) % 60) + (j === 0 ? 30 : 0);
  });
  return row;
});

const DRIVERS = ['Arif', 'Rinku', 'Ishan', 'Sanju', 'Usman', 'Shahid', 'MON'];
const HEAT = DRIVERS.map((_, r) => DATES.map((_, c) => ((r * 17 + c * 29 + r * c) % 101)));

const TREND = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
  weight: 120 + Math.round(40 * Math.sin(i / 1.7) + i * 6),
}));

function Sec({ id, title, desc, children }: { id: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border py-10">
      <h2 className="text-h4 font-semibold text-foreground">{title}</h2>
      {desc && <p className="mt-1 mb-6 max-w-3xl text-body-sm text-muted-foreground">{desc}</p>}
      {!desc && <div className="mb-6" />}
      {children}
    </section>
  );
}

export function Charts() {
  return (
    <div>
      <Sec
        id="sample-dashboards"
        title="Sample Dashboards"
        desc="The Figma “Sample Design” adaptations — each chart wrapped in the standard widget card (icon chip + title), with center values, trend badges and legends."
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <WidgetCard title="Incident Status Overview" icon={<PieChart className="size-4" />}>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <DonutChart
                data={INCIDENTS}
                centerValue="3753"
                centerLabel="Total Incidents"
                trend={<TrendBadge value="20%" direction="down" />}
                size={240}
              />
              <ChartLegend
                orientation="vertical"
                counter
                items={INCIDENTS.map((d) => ({ label: d.name, color: d.color, count: d.value }))}
              />
            </div>
          </WidgetCard>

          <WidgetCard title="Compliance by Service Type" icon={<Gauge className="size-4" />}>
            <div className="flex flex-col items-center gap-4">
              <ActivityGauge
                rings={[
                  { label: 'Bin Collection', value: 81, color: 'var(--fig-accent-info-normal)' },
                  { label: 'Bin Washing', value: 77, color: 'var(--fig-accent-plum-normal)' },
                ]}
                centerValue="79.5%"
                trend={<TrendBadge value="20%" direction="down" />}
                size={240}
              />
              <ChartLegend
                items={[
                  { label: 'Bin Collection', color: 'var(--fig-accent-info-normal)' },
                  { label: 'Bin Washing', color: 'var(--fig-accent-plum-normal)' },
                ]}
              />
            </div>
          </WidgetCard>
        </div>

        <div className="mt-6">
          <WidgetCard
            title="Operational Progress Overview"
            icon={<BarChart3 className="size-4" />}
            actions={
              <ChartLegend
                className="hidden md:flex"
                items={BAR_SERIES.map((s, i) => ({ label: `Series ${i + 1}`, color: s.color }))}
              />
            }
          >
            <StackedBarChart data={BAR_DATA} xKey="date" series={BAR_SERIES} yLabel="Active users" xLabel="Date" height={320} />
          </WidgetCard>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <WidgetCard
            title="Driver Safety Score Heatmap"
            icon={<Grid3x3 className="size-4" />}
            actions={<HeatLegend />}
          >
            <HeatChart rows={DRIVERS} cols={DATES} values={HEAT} yLabel="Drivers" xLabel="Date" />
          </WidgetCard>

          <WidgetCard title="Weight Collection Trend" icon={<TrendingUp className="size-4" />}>
            <AreaTrendChart data={TREND} xKey="month" dataKey="weight" height={300} />
          </WidgetCard>
        </div>
      </Sec>

      <Sec
        id="legend"
        title="Legend"
        desc="The _Legend base component — Type (Horizontal / Vertical) × Background (On / Off) × Counter (On / Off)."
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {([false, true] as const).map((bg) =>
            ([false, true] as const).map((counter) => (
              <div key={`h-${bg}-${counter}`} className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 text-caption text-muted-foreground">
                  Horizontal · Background {bg ? 'On' : 'Off'} · Counter {counter ? 'On' : 'Off'}
                </div>
                <ChartLegend
                  background={bg}
                  counter={counter}
                  items={[
                    { label: 'Series 1', color: 'var(--fig-accent-flame-normal)', count: 1 },
                    { label: 'Series 2', color: 'var(--fig-accent-cyan-normal)', count: 1 },
                    { label: 'Series 3', color: 'var(--fig-accent-lavender-normal)', count: 1 },
                  ]}
                />
              </div>
            )),
          )}
        </div>
      </Sec>

      <Sec
        id="compare-bars"
        title="Compare Bars"
        desc="Labelled multi-bar comparison with a header, meta strip (timestamp / discrepancy / tolerance badge) and a shared scale — e.g. Gross Weight: Collected vs Received."
      >
        <div className="max-w-2xl">
          <CompareBars
            title="Gross Weight — Collected vs Received"
            icon={<Scale size={16} />}
            meta={[
              { label: 'Timestamp', value: '20 Oct, 2025  03:04 pm' },
              { label: 'Discrepancy Percentage', value: '5.9%' },
              { label: 'Weight Difference', value: '~200 kg' },
            ]}
            badge={{ label: 'Within tolerance', tone: 'info' }}
            bars={[
              { label: 'Collected Weight', value: 3200, valueLabel: '3200 Kg', color: 'success' },
              { label: 'Received Gross Weight', value: 3400, valueLabel: '3400 kg', color: 'primary' },
            ]}
          />
        </div>
      </Sec>

      <Sec
        id="map-widgets"
        title="Map Widgets"
        desc="Dashboard maps over the extended LeafletMap — density heatmaps, a compliance map with a table, and service-location pins with zone polygons."
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <EventsHeatmap
              icon={<Flame size={16} />}
              center={AD}
              zoom={11}
              heat={EVENT_HEAT}
              legend={[
                { label: 'Harsh Braking', color: '#F04438' },
                { label: 'Harsh Acceleration', color: '#F79009' },
                { label: 'Harsh Cornering', color: '#12B76A' },
              ]}
            />
            <ServiceLocationsMap
              icon={<MapPin size={16} />}
              center={AD}
              zoom={11}
              markers={SITE_PINS}
              zones={ZONES}
              legend={[
                { label: 'Al Reef Village', color: '#7C3AED' },
                { label: 'Capital Mall', color: '#0072D6' },
                { label: 'Prestige Tower', color: '#F79009' },
              ]}
            />
          </div>
          <ZoneComplianceMap
            icon={<ShieldCheck size={16} />}
            center={AD}
            zoom={11}
            heat={EVENT_HEAT}
            valueHeader="Complaints"
            rows={[
              { name: 'Lot 12', parent: 'Z-2394', value: '12' },
              { name: 'Lot 11', parent: 'A-3423', value: '9' },
              { name: 'Lot 8', parent: 'D-4322', value: '15' },
              { name: 'Lot 2', parent: 'C-2345', value: '5' },
              { name: 'Lot 1', parent: 'A-3234', value: '13' },
            ]}
          />
        </div>
      </Sec>

      <Sec
        id="declarative-dashboard"
        title="Declarative Dashboard Widgets"
        desc="A dashboard module renders this 12-col grid from a typed JSON `widgets` array — each widget names a kind (donut · gauge · bar · compareBars · map) that the runtime maps to a DS component. No hand-coded screen React."
      >
        <DashboardWidgetGrid widgets={DASH_WIDGETS} />
      </Sec>
    </div>
  );
}
