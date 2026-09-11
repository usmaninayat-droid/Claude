import { useState } from 'react'
import { Activity, Download, Fuel, Gauge, MapPin } from '@fams/ui-kit/icons'
import {
  Button,
  ChartCard,
  DashboardLayout,
  DateRangePicker,
  KpiTile,
  type DateRangePickerPreset,
  type DateRangePickerValue,
} from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, PropsTable, Guidelines, A11yList } from '../docs'

/**
 * DashboardLayoutDemo — standalone showcase for the DashboardLayout shell.
 * The shell itself never imports DateRangePicker/KpiTile/ChartCard — this
 * demo composes them as ordinary children to show a realistic dashboard.
 */

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => {
  const next = startOfDay(d)
  next.setDate(next.getDate() + n)
  return next
}
const today = startOfDay(new Date())

const PRESETS: DateRangePickerPreset[] = [
  { label: 'Today', range: { from: today, to: today } },
  { label: 'Last 7 days', range: { from: addDays(today, -6), to: today } },
  { label: 'Last 30 days', range: { from: addDays(today, -29), to: today } },
]

/** A dependency-free chart placeholder — DashboardLayout is chart-engine-agnostic. */
function ChartPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-40 w-full items-center justify-center rounded-xs bg-muted text-body-sm text-muted-foreground">
      {label}
    </div>
  )
}

export default function DashboardLayoutDemo() {
  const [range, setRange] = useState<DateRangePickerValue | undefined>({
    from: addDays(today, -6),
    to: today,
  })

  return (
    <DocPage
      title="DashboardLayout"
      badge="stable"
      summary="The standard dashboard-page skeleton — an optional header, a KPI tile row that wraps responsively, and a responsive 12-column chart grid, plus a footer slot. Pure chrome: it has no idea what a DateRangePicker, KpiTile, or ChartCard is — those are caller children, shown here for a realistic example."
    >
      <DocSection id="preview" title="Preview">
        <Demo
          title="Full dashboard — header, KPI row, chart grid, footer"
          hint="each chart wraps itself in a div with its own lg:col-span-* utility — the shell never sees a `span` prop"
          code={`<DashboardLayout
  header={
    <>
      <h1 className="text-h4 font-semibold text-foreground">Fleet overview</h1>
      <DateRangePicker value={range} onChange={setRange} presets={presets} />
      <Button variant="secondary" size="sm"><Download />Export</Button>
    </>
  }
  kpis={
    <>
      <KpiTile label="Active trucks" value="128" icon={Activity} />
      <KpiTile label="Fuel used" value="4,820" unit="L" icon={Fuel} tone="warning" />
      <KpiTile label="Avg. utilization" value="76%" icon={Gauge} tone="success" />
      <KpiTile label="Open geofence alerts" value="9" icon={MapPin} tone="danger" />
    </>
  }
  footer={<ChartCard title="Recent events">{eventsTable}</ChartCard>}
>
  <div className="lg:col-span-8">
    <ChartCard title="Fleet utilization" icon={Activity}>{chart}</ChartCard>
  </div>
  <div className="lg:col-span-4">
    <ChartCard title="Fuel theft events" icon={Fuel} iconTone="warning">{chart}</ChartCard>
  </div>
  <div className="lg:col-span-6">
    <ChartCard title="GPS uptime" icon={Gauge} iconTone="info">{chart}</ChartCard>
  </div>
  <div className="lg:col-span-6">
    <ChartCard title="Geofence alerts" icon={MapPin} iconTone="danger">{chart}</ChartCard>
  </div>
</DashboardLayout>`}
          bare
        >
          <div className="w-full rounded-md border border-border bg-background shadow-sm">
            <DashboardLayout
              header={
                <>
                  <h1 className="text-h4 font-semibold text-foreground">Fleet overview</h1>
                  <DateRangePicker value={range} onChange={setRange} presets={PRESETS} />
                  <Button variant="secondary" size="sm">
                    <Download className="size-4" />
                    Export
                  </Button>
                </>
              }
              kpis={
                <>
                  <KpiTile label="Active trucks" value="128" icon={Activity} />
                  <KpiTile label="Fuel used" value="4,820" unit="L" icon={Fuel} tone="warning" />
                  <KpiTile label="Avg. utilization" value="76%" icon={Gauge} tone="success" />
                  <KpiTile label="Open geofence alerts" value="9" icon={MapPin} tone="danger" />
                </>
              }
              footer={
                <ChartCard title="Recent events">
                  <ChartPlaceholder label="Events table placeholder" />
                </ChartCard>
              }
            >
              <div className="lg:col-span-8">
                <ChartCard title="Fleet utilization" icon={Activity}>
                  <ChartPlaceholder label="Chart placeholder" />
                </ChartCard>
              </div>
              <div className="lg:col-span-4">
                <ChartCard title="Fuel theft events" icon={Fuel} iconTone="warning">
                  <ChartPlaceholder label="Chart placeholder" />
                </ChartCard>
              </div>
              <div className="lg:col-span-6">
                <ChartCard title="GPS uptime" icon={Gauge} iconTone="info">
                  <ChartPlaceholder label="Chart placeholder" />
                </ChartCard>
              </div>
              <div className="lg:col-span-6">
                <ChartCard title="Geofence alerts" icon={MapPin} iconTone="danger">
                  <ChartPlaceholder label="Chart placeholder" />
                </ChartCard>
              </div>
            </DashboardLayout>
          </div>
        </Demo>
      </DocSection>

      <DocSection id="minimal" title="Minimal composition">
        <Demo
          title="Chart grid only"
          hint="header, kpis, and footer are all optional — omit any of them"
          code={`<DashboardLayout>
  <div className="lg:col-span-12">
    <ChartCard title="Trips this week">{chart}</ChartCard>
  </div>
</DashboardLayout>`}
          bare
        >
          <div className="w-full rounded-md border border-border bg-background shadow-sm">
            <DashboardLayout>
              <div className="lg:col-span-12">
                <ChartCard title="Trips this week" icon={Activity}>
                  <ChartPlaceholder label="Chart placeholder" />
                </ChartCard>
              </div>
            </DashboardLayout>
          </div>
        </Demo>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'header',
              type: 'ReactNode',
              description:
                'Header region — title, date-range control, filter fields, export action. Fully composed by the caller; the shell only owns the surrounding spacing. Omit to render no header row.',
            },
            {
              prop: 'kpis',
              type: 'ReactNode',
              description:
                'KPI tile row — caller-supplied tiles (e.g. KpiTile), laid out in a grid that wraps responsively (1 col, then 2, then 4). Omit to hide the row.',
            },
            {
              prop: 'children',
              type: 'ReactNode',
              required: true,
              description:
                'Chart grid content. Rendered in a responsive grid — a single column below lg, twelve columns from lg up. Each child controls its own width via a col-span-*/lg:col-span-* utility on its own wrapper; the shell has no opinion on how many columns any one chart takes.',
            },
            {
              prop: 'footer',
              type: 'ReactNode',
              description: 'Extra content rendered below the chart grid (tables, activity feeds, …).',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'className and any native div attribute pass through to the outer frame.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use DashboardLayout for any page whose main job is KPIs + charts over a date range.',
            'Give each chart its own col-span-*/lg:col-span-* wrapper — the shell never assigns spans itself.',
            'Omit header, kpis, or footer entirely when a page has none — the chrome disappears cleanly.',
            'Keep DateRangePicker/export controls in header; keep tables/feeds in footer.',
          ]}
          donts={[
            'Don’t import a chart engine into the shell — DashboardLayout stays chart-agnostic; charts are always caller children.',
            'Don’t hand-roll the KPI row grid elsewhere — reuse the kpis slot so wrapping stays consistent.',
            'Don’t nest another DashboardLayout for a sub-section — compose ChartCard rows directly instead.',
            'Don’t fix pixel widths on chart wrappers — use the 12-column lg:col-span-* scale.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Purely structural — no landmarks or roles beyond what the header/kpis/children content itself provides.',
            'Grid reflow (KPI row, chart grid) is driven by breakpoint classes only; no JS-measured layout that could desync from focus order.',
            'DOM order matches visual order (header, then kpis, then chart grid, then footer), so keyboard and screen-reader navigation follow the reading sequence.',
            'Layout uses only flex/grid and logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
