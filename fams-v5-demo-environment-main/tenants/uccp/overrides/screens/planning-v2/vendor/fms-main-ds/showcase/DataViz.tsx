import { Section, Demo } from './kit';
import {
  KpiTile,
  BarChart,
  LineChart,
  AreaChart,
  DonutChart,
  GaugeChart,
  RadarChart,
  Sparkline,
  ActivityBar,
  ComplianceGauge,
  ChartCard,
} from '../components';
import { TrendingUp, Truck, Fuel, Wrench } from 'lucide-react';

const MONTHS = [
  { month: 'Jan', preventive: 42, corrective: 18 },
  { month: 'Feb', preventive: 38, corrective: 24 },
  { month: 'Mar', preventive: 51, corrective: 16 },
  { month: 'Apr', preventive: 46, corrective: 22 },
  { month: 'May', preventive: 58, corrective: 14 },
  { month: 'Jun', preventive: 63, corrective: 19 },
];

const TREND = MONTHS.map((m) => ({ month: m.month, uptime: 80 + m.preventive / 6 }));

const DONUT = [
  { name: 'Active', value: 62, color: 'var(--status-success)' },
  { name: 'Maintenance', value: 24, color: 'var(--status-warning)' },
  { name: 'Offline', value: 14, color: 'var(--status-error)' },
];

const RADAR = [
  { axis: 'Speed', fleet: 80 },
  { axis: 'Fuel', fleet: 65 },
  { axis: 'Safety', fleet: 90 },
  { axis: 'Uptime', fleet: 72 },
  { axis: 'Cost', fleet: 58 },
];

export function DataViz() {
  return (
    <Section
      id="data-viz"
      title="Data Visualisation"
      description="KPI tiles and a Recharts-based chart family wired to the chart token palette. Charts read --chart-* variables, so they re-theme per tenant automatically."
    >
      <Demo title="KPI tiles">
        <KpiTile label="ACTIVE ASSETS" value="248" trend="up" trendValue="+12" description="vs last week" icon={<Truck className="size-5" />} />
        <KpiTile label="AVG UPTIME" value="94.2" unit="%" trend="up" trendValue="+1.8%" icon={<TrendingUp className="size-5" />} />
        <KpiTile label="FUEL SPEND" value="38,400" unit="AED" trend="down" trendValue="-4.1%" icon={<Fuel className="size-5" />} />
        <KpiTile label="OPEN WORK ORDERS" value="17" trend="neutral" trendValue="0" icon={<Wrench className="size-5" />} />
      </Demo>

      <Demo title="Bar · Line · Area" className="flex-col items-stretch gap-6 lg:flex-row">
        <ChartCard title="Work orders" subtitle="by type" className="flex-1">
          <BarChart
            data={MONTHS}
            xKey="month"
            series={[
              { dataKey: 'preventive', color: 'var(--chart-series-5)', name: 'Preventive' },
              { dataKey: 'corrective', color: 'var(--chart-1)', name: 'Corrective' },
            ]}
            height={220}
            showLegend
          />
        </ChartCard>
        <ChartCard title="Uptime trend" subtitle="rolling %" className="flex-1">
          <LineChart data={TREND} xKey="month" series={[{ dataKey: 'uptime', color: 'var(--primary)', name: 'Uptime' }]} height={220} />
        </ChartCard>
        <ChartCard title="Cumulative" subtitle="area" className="flex-1">
          <AreaChart data={TREND} xKey="month" series={[{ dataKey: 'uptime', color: 'var(--chart-2)' }]} height={220} />
        </ChartCard>
      </Demo>

      <Demo title="Donut · Gauge · Compliance · Radar">
        <div className="flex flex-col items-center gap-2">
          <DonutChart data={DONUT} height={180} centerLabel="248" />
          <span className="text-caption text-muted-foreground">Fleet status</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <GaugeChart
            value={72}
            unit="%"
            label="Fuel level"
            sectors={[
              { from: 0, to: 30, color: 'var(--chart-accent-red)' },
              { from: 30, to: 60, color: 'var(--chart-accent-orange)' },
              { from: 60, to: 100, color: 'var(--chart-accent-green)' },
            ]}
            size={180}
          />
        </div>
        <ComplianceGauge value={88} size={140} label="Compliance" />
        <div className="flex flex-col items-center gap-2">
          <RadarChart data={RADAR} axisKey="axis" series={[{ dataKey: 'fleet', label: 'Fleet', color: 'var(--primary)', fillOpacity: 0.2 }]} height={200} />
          <span className="text-caption text-muted-foreground">Fleet scorecard</span>
        </div>
      </Demo>

      <Demo title="Sparkline · Activity bar" className="flex-col items-stretch gap-5">
        <div className="flex items-center gap-3">
          <span className="w-28 text-body-sm text-muted-foreground">7-day trend</span>
          <Sparkline data={[12, 18, 14, 22, 19, 28, 24]} color="var(--chart-2)" width={120} height={32} />
        </div>
        <ActivityBar
          segments={[
            { id: 'a', label: 'Driving', value: 6, color: 'var(--chart-series-5)' },
            { id: 'b', label: 'Idle', value: 2, color: 'var(--chart-1)' },
            { id: 'c', label: 'Parked', value: 4, color: 'var(--gray-300)' },
          ]}
          height={14}
          showLabels
        />
      </Demo>
    </Section>
  );
}
