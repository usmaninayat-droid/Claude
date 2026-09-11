import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { ChartCard, WidgetCard, KpiTile, DonutChart, BulletChart, FunnelChart, WaterfallChart, WaffleChart, CalendarHeatmap, TreemapChart, SankeyChart, ScatterChart, ComboChart, BoxPlot } from './components/data-viz';
import { RawDataSheet } from './components/data-display';
import type { DataTableColumn } from './components/data-display';
import { Toaster, Badge } from './components/primitives';
import * as Icons from './icons';
import './styles.css';

/** Standalone widget/chart chrome demo (served at `/widgets.html`). Exercises:
 *  KPI tiles (varied icon accents) · ChartCard (divider + raw-data drill) ·
 *  WidgetCard map-only + hybrid · RawDataSheet (view → download). */

interface Route { id: string; plan: string; vehicle: string; driver: string; service: string; waste: string }
const ROUTES: Route[] = Array.from({ length: 42 }, (_, i) => ({
  id: `R-${42313 + i}`,
  plan: `Bin Collection Site ${i + 1}`,
  vehicle: '2342',
  driver: ['Ali Raza', 'Bina Khan', 'Cyrus Patel', 'Danish Alli', 'Ehsan Malik'][i % 5],
  service: 'Bin Collection',
  waste: 'Recyclable',
}));
const ROUTE_COLS: DataTableColumn<Route>[] = [
  { id: 'id', header: 'Route', accessor: (r) => r.id },
  { id: 'plan', header: 'Plan', accessor: (r) => r.plan },
  { id: 'vehicle', header: 'Vehicle', accessor: (r) => r.vehicle },
  { id: 'driver', header: 'Driver', accessor: (r) => r.driver },
  { id: 'service', header: 'Service Type', accessor: (r) => r.service, cell: (r) => <Badge>{r.service}</Badge> },
  { id: 'waste', header: 'Waste Type', accessor: (r) => r.waste },
];

const KPIS = [
  { label: 'Total Incidents', value: '89', icon: <Icons.AlertCircle size={18} />, iconColor: 'var(--status-error)', trend: 'up' as const, trendValue: '6.6%' },
  { label: 'Inspections Conducted', value: '43', icon: <Icons.SearchMd size={18} />, iconColor: 'var(--status-success)', trend: 'up' as const, trendValue: '4.2%' },
  { label: 'Pending Reviews', value: '12', icon: <Icons.RefreshCcw01 size={18} />, iconColor: 'var(--primary)', trend: 'down' as const, trendValue: '4.2%' },
  { label: 'Avg. Resolution Time', value: '2.5 h', icon: <Icons.CheckCircle size={18} />, iconColor: 'var(--chart-4)', trend: 'neutral' as const, trendValue: '0%' },
];

const DONUT = [
  { name: 'Reported', value: 2311 }, { name: 'Awaiting', value: 231 },
  { name: 'Submitted', value: 400 }, { name: 'In Progress', value: 200 }, { name: 'Closed', value: 200 },
];

function Demo() {
  const [raw, setRaw] = React.useState(false);
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="mb-5 text-h5 font-semibold text-foreground">Dashboard widget chrome</h1>

      {/* KPI row — varied per-tile icon accents (NOT primary) */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-card">
            <KpiTile label={k.label} value={k.value} icon={k.icon} iconColor={k.iconColor} trend={k.trend} trendValue={k.trendValue} onClick={() => setRaw(true)} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ChartCard — divider + primary icon + raw-data drill */}
        <ChartCard title="Reported Incidents Distribution" icon={<Icons.PieChart01 size={16} />} onViewRawData={() => setRaw(true)} bodyHeight={280}>
          <DonutChart data={DONUT} centerLabel="3753 Total" />
        </ChartCard>

        {/* WidgetCard map-only */}
        <WidgetCard title="Service Locations" icon={<Icons.MarkerPin01 size={16} />} variant="map" onViewRawData={() => setRaw(true)} bodyHeight={280}>
          <div className="grid size-full place-items-center bg-muted text-body-sm text-muted-foreground">[ map ]</div>
        </WidgetCard>

        {/* WidgetCard hybrid — panel + map under one header */}
        <WidgetCard
          title="Zone Compliance Map"
          icon={<Icons.Map01 size={16} />}
          variant="hybrid"
          bodyHeight={280}
          className="lg:col-span-2"
          panel={(
            <ul className="divide-y divide-border">
              {['Lot 12 · 86%', 'Lot 11 · 75%', 'Lot 8 · 33%', 'Lot 2 · 15%', 'Lot 1 · 13%'].map((l) => (
                <li key={l} className="px-4 py-3 text-body-sm text-foreground">{l}</li>
              ))}
            </ul>
          )}
        >
          <div className="grid size-full place-items-center bg-muted text-body-sm text-muted-foreground">[ heatmap ]</div>
        </WidgetCard>
      </div>

      {/* New chart types — SVG/div based (render without recharts) */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="SLA vs Target" icon={<Icons.Target04 size={16} />} bodyHeight={200}>
          <BulletChart items={[
            { id: 'a', label: 'Fulfilment Rate', value: 91, target: 95, ranges: [70, 90], unit: '%' },
            { id: 'b', label: 'On-time Pickup', value: 88, target: 85, ranges: [70, 90], unit: '%' },
            { id: 'c', label: 'Utilisation', value: 62, target: 80, ranges: [50, 75], unit: '%' },
          ]} />
        </ChartCard>
        <ChartCard title="Recruitment Funnel" icon={<Icons.FilterFunnel01 size={16} />} bodyHeight={200}>
          <FunnelChart stages={[
            { id: 's1', label: 'Applied', value: 2400 },
            { id: 's2', label: 'Screened', value: 1300 },
            { id: 's3', label: 'Interviewed', value: 420 },
            { id: 's4', label: 'Hired', value: 96 },
          ]} />
        </ChartCard>
        <ChartCard title="Headcount Movement" icon={<Icons.BarChartSquare02 size={16} />} bodyHeight={200}>
          <WaterfallChart items={[
            { id: 'w1', label: 'Start', value: 320, kind: 'start' },
            { id: 'w2', label: 'Hires', value: 48, kind: 'delta' },
            { id: 'w3', label: 'Exits', value: -22, kind: 'delta' },
            { id: 'w4', label: 'Transfers', value: 12, kind: 'delta' },
            { id: 'w5', label: 'End', value: 358, kind: 'total' },
          ]} height={180} />
        </ChartCard>
      </div>

      {/* Advanced charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Cost by Category" icon={<Icons.Grid01 size={16} />} bodyHeight={220}>
          <TreemapChart data={[
            { id: 'a', label: 'Fleet', value: 4200 }, { id: 'b', label: 'Labour', value: 3100 },
            { id: 'c', label: 'Fuel', value: 1800 }, { id: 'd', label: 'Maintenance', value: 1200 },
            { id: 'e', label: 'Admin', value: 700 }, { id: 'f', label: 'Other', value: 400 },
          ].map(({ id, ...r }) => r)} />
        </ChartCard>
        <ChartCard title="Waste Stream Flow" icon={<Icons.Share07 size={16} />} bodyHeight={220}>
          <SankeyChart links={[
            { source: 'Residential', target: 'Recycling', value: 320 },
            { source: 'Residential', target: 'Landfill', value: 180 },
            { source: 'Commercial', target: 'Recycling', value: 210 },
            { source: 'Commercial', target: 'Incineration', value: 140 },
            { source: 'Industrial', target: 'Landfill', value: 90 },
          ]} />
        </ChartCard>
        <ChartCard title="Waste Mix" icon={<Icons.PieChart01 size={16} />} bodyHeight={200}>
          <WaffleChart data={[
            { label: 'Recyclable', value: 46 }, { label: 'Organic', value: 28 },
            { label: 'Landfill', value: 18 }, { label: 'Hazardous', value: 8 },
          ]} />
        </ChartCard>
        <ChartCard title="Collections / Day" icon={<Icons.Calendar size={16} />} bodyHeight={200}>
          <CalendarHeatmap days={Array.from({ length: 84 }, (_, i) => {
            const d = new Date(2026, 3, 1); d.setDate(d.getDate() + i);
            return { date: d.toISOString().slice(0, 10), value: Math.round(Math.abs(Math.sin(i / 5) * 10)) };
          })} />
        </ChartCard>
      </div>

      {/* Enterprise: scatter/bubble, combo dual-axis, box plot */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Cost vs Risk" icon={<Icons.Dotpoints01 size={16} />} bodyHeight={240}>
          <ScatterChart
            xLabel="Cost" yLabel="Risk" bubbleRange={[60, 400]} xReference={50} yReference={50}
            series={[
              { name: 'Sites', points: [{ x: 20, y: 30, z: 40 }, { x: 65, y: 70, z: 120 }, { x: 40, y: 55, z: 80 }, { x: 80, y: 25, z: 60 }, { x: 55, y: 85, z: 200 }] },
              { name: 'Depots', points: [{ x: 30, y: 20, z: 50 }, { x: 70, y: 45, z: 90 }, { x: 45, y: 35, z: 70 }] },
            ]}
          />
        </ChartCard>
        <ChartCard title="Volume vs SLA" icon={<Icons.BarChartSquare02 size={16} />} bodyHeight={240}>
          <ComboChart
            xKey="m" rightUnit="%"
            data={[{ m: 'Jan', vol: 320, sla: 92 }, { m: 'Feb', vol: 280, sla: 94 }, { m: 'Mar', vol: 360, sla: 90 }, { m: 'Apr', vol: 410, sla: 96 }]}
            series={[{ dataKey: 'vol', name: 'Volume', type: 'bar', axis: 'left' }, { dataKey: 'sla', name: 'SLA %', type: 'line', axis: 'right' }]}
          />
        </ChartCard>
        <ChartCard title="Resolution Time (hrs)" icon={<Icons.BarChart01 size={16} />} bodyHeight={240}>
          <BoxPlot unit="h" data={[
            { label: 'Cleaning', min: 1, q1: 3, median: 5, q3: 8, max: 12, outliers: [16] },
            { label: 'Security', min: 2, q1: 4, median: 6, q3: 9, max: 14 },
            { label: 'MEP', min: 3, q1: 6, median: 9, q3: 13, max: 20, outliers: [26] },
          ]} />
        </ChartCard>
      </div>

      <RawDataSheet
        open={raw}
        onOpenChange={setRaw}
        title="Scheduled Routes"
        rows={ROUTES}
        columns={ROUTE_COLS}
        fileName="scheduled-routes"
        basisNote="Basis: current shift · Today"
      />
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');
createRoot(container).render(<><Demo /><Toaster position="bottom-right" richColors /></>);
