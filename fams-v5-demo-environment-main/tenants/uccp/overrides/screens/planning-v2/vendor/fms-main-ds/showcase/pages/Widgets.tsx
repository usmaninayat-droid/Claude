import { cn } from '../../components/utils/cn';
import {
  MetricCard,
  Stepper,
  NotificationCard,
  EventLogCard,
  UserRoleCard,
  KpiSelectionCard,
  SAMPLE_NOTIF_CHIPS,
} from '../../components/widgets-v2';
import { Truck, Users, Fuel, Lock, Pause, AlertTriangle, ClipboardCheck, FileWarning } from 'lucide-react';
import { AssetMarker, type AssetMarkerState } from '../../components/map';
import { AssetGlyph } from '../../icons';
import { EntityProfileCard } from '../../components/widgets';
import { DonutChart, AreaChart, ComplianceGauge } from '../../components/data-viz';
import { Badge } from '../../components/primitives';

const INCIDENT_DONUT = [
  { name: 'Open', value: 1820, color: 'var(--status-error)' },
  { name: 'In Review', value: 980, color: 'var(--status-warning)' },
  { name: 'Resolved', value: 953, color: 'var(--status-success)' },
];
const TREND = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
  value: 40 + Math.round(30 * Math.sin(i / 1.8) + i * 4),
}));

const MARKER_STATES: AssetMarkerState[] = [
  'moving', 'stopped', 'idle', 'excess-idling', 'immobilized', 'non-moving', 'non-reporting',
];

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

export function Widgets() {
  return (
    <div>
      <Sec id="metric-cards" title="Metric Cards" desc="Compact KPI cards — icon chip, label, value and trend. The dashboard building block.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MetricCard label="Active Vehicles" value="248" icon={<Truck className="size-5" />} trendValue="100%" trendDirection="up" />
          <MetricCard label="Workforce On Duty" value="1,204" icon={<Users className="size-5" />} trendValue="3.2%" trendDirection="up" />
          <MetricCard label="Fuel Spend (AED)" value="38.4k" icon={<Fuel className="size-5" />} trendValue="4.1%" trendDirection="down" />
        </div>
      </Sec>

      <Sec id="notification-cards" title="Notification Cards" desc="Read / unread states with meta chips, timestamp and a hover Clear action.">
        <div className="flex flex-col gap-3">
          <NotificationCard
            unread
            title="Approval needed: Fleet maintenance"
            description="Vehicle AJ-2341 scheduled maintenance requires your approval before dispatch."
            chips={SAMPLE_NOTIF_CHIPS}
            time="8:45 AM"
            onClear={() => undefined}
          />
          <NotificationCard
            title="Approval needed: Fleet maintenance"
            description="Vehicle AJ-2341 scheduled maintenance requires your approval before dispatch."
            chips={SAMPLE_NOTIF_CHIPS}
            time="8:45 AM"
          />
        </div>
      </Sec>

      <Sec id="event-log" title="Event Log Cards" desc="Driving / collection event entries with status, vehicle, driver and a location/time footer — Default, Hover and Selected states.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <EventLogCard state="default" title="Harsh Braking" status="STATUS" vehicle="M2345" driver="Ali Raza" location="Location here" time="05:32 PM" />
          <EventLogCard state="hover" title="Harsh Braking" status="STATUS" vehicle="M2345" driver="Ali Raza" location="Location here" time="05:32 PM" />
          <EventLogCard state="selected" title="Harsh Braking" status="STATUS" vehicle="M2345" driver="Ali Raza" location="Location here" time="05:32 PM" />
        </div>
      </Sec>

      <Sec id="stepper" title="Stepper" desc="Vertical progress stepper — Completed, Current and Default step states.">
        <div className="w-80 rounded-xl border border-border bg-card p-6">
          <Stepper
            steps={[
              { label: 'Step 1', text: 'Contract details captured', state: 'completed' },
              { label: 'Step 2', text: 'Assign resources & schedule', state: 'current' },
              { label: 'Step 3', text: 'Review & activate', state: 'default' },
            ]}
          />
        </div>
      </Sec>

      <Sec id="kpi-selection" title="KPI Selection Card" desc="Contract KPI rows with an expandable compliance detail panel (View More / View Less).">
        <div className="flex flex-col gap-3">
          <KpiSelectionCard number="1.1" title="Workforce Deployment" subtitle="As Defined in the Contract Document." tag="1.0 · Resource Allocation" />
          <KpiSelectionCard
            number="1.1"
            title="Workforce Deployment"
            subtitle="As Defined in the Contract Document."
            tag="1.0 · Resource Allocation"
            defaultOpen
            details={[
              { label: 'Non Compliance', text: 'Failure to collect within timeframe.' },
              { label: 'Period Of Compliance', text: '12 hours for missed collections; 1 hour where containers are overflowing.' },
              { label: 'Penalty (AED)', text: 'AED 100 per bin per incident / day; AED 1,000 per bin per incident per day.' },
            ]}
          />
        </div>
      </Sec>

      <Sec id="user-role" title="User Role Card" desc="Role row with assigned-app pills.">
        <div className="max-w-md">
          <UserRoleCard title="User Role" apps={['App 1', 'App 2', 'App 3']} />
        </div>
      </Sec>

      <Sec
        id="entity-profile"
        title="Entity Profile"
        desc="The asset/workforce profile screen — a left identity panel (hero + status badges + tags + detail fields) beside a tabbed overview built from dashboard widgets (KPIs · distribution · compliance · trend)."
      >
        <div className="flex flex-col gap-5 lg:flex-row">
          <EntityProfileCard
            className="w-full shrink-0 lg:w-[320px]"
            hero={
              <div className="flex h-44 items-center justify-center bg-[color:var(--secondary)]">
                <AssetGlyph name="Default Workforce" size={88} />
              </div>
            }
            heroBadges={
              <>
                <span className="flex gap-1.5">
                  <Badge variant="default">Active</Badge>
                  <Badge variant="warning"><AlertTriangle className="size-3" /> Condition</Badge>
                </span>
                <Badge variant="outline">Inspector</Badge>
              </>
            }
            name="Faisal Al Saud"
            subtitle="ID #9232734"
            tags={[{ label: 'Tag 1' }, { label: 'Tag 2' }]}
            fields={[
              { label: 'Designation', value: 'Inspector' },
              { label: 'Assigned Lot', value: <Badge variant="secondary">Lot 10</Badge> },
              { label: 'Employment Tenure', value: '1 year 2 months' },
              { label: 'Overall Experience', value: '2 years 5 months' },
              { label: 'Phone Number', value: '+971 800 1232342' },
              { label: 'Email', value: 'faisal@tadweer.com' },
              { label: 'Nationality', value: 'France' },
              { label: 'Join Date', value: '29 Feb, 2024' },
            ]}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {/* Tab strip (Overview active) */}
            <div className="flex items-center gap-1 border-b border-border">
              {['Overview', 'Details', 'Reported Incidents', 'Inspections', 'Timeline'].map((t, i) => (
                <span
                  key={t}
                  className={cn(
                    'cursor-default px-3 py-2 text-body-sm',
                    i === 0 ? 'border-b-2 border-primary font-semibold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard label="Tasks Completed" value="142" icon={<ClipboardCheck className="size-5" />} trendValue="6%" trendDirection="up" />
              <MetricCard label="Incidents Reported" value="39" icon={<FileWarning className="size-5" />} trendValue="1.6%" trendDirection="up" />
              <MetricCard label="Inspections" value="58" icon={<AlertTriangle className="size-5" />} trendValue="2%" trendDirection="down" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-2 text-body-md font-bold text-foreground">Reported Incidents Distribution</h3>
                <DonutChart data={INCIDENT_DONUT} centerLabel={<div className="text-center"><div className="text-h4 font-bold text-foreground">3,753</div><div className="text-caption text-muted-foreground">Total</div></div>} />
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4">
                <h3 className="mb-2 self-start text-body-md font-bold text-foreground">Overall Compliance</h3>
                <ComplianceGauge value={81} size={160} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 text-body-md font-bold text-foreground">Incident vs Inspection Trend</h3>
              <AreaChart data={TREND} xKey="month" series={[{ dataKey: 'value', color: 'var(--primary)', name: 'Incidents' }]} height={220} />
            </div>
          </div>
        </div>
      </Sec>

      <Sec
        id="asset-markers"
        title="Asset Markers (live monitoring)"
        desc="The map pin. Colour reflects the asset's live state; the inner glyph is a dynamic ASSET VECTOR (vehicle, workforce, or bin — map variant). Active = selected. Optional corner badge for sub-states."
      >
        <div className="flex flex-wrap items-end gap-6">
          {MARKER_STATES.map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <AssetMarker state={s}><AssetGlyph name="Car" size={22} /></AssetMarker>
              <span className="text-caption text-muted-foreground">{s}</span>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-end gap-6">
          <div className="flex flex-col items-center gap-2">
            <AssetMarker state="moving" active><AssetGlyph name="Car" size={22} /></AssetMarker>
            <span className="text-caption text-muted-foreground">active</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <AssetMarker state="moving"><AssetGlyph name="Tanker" size={22} /></AssetMarker>
            <span className="text-caption text-muted-foreground">vehicle: tanker</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <AssetMarker state="non-moving"><AssetGlyph name="Default Workforce" size={20} /></AssetMarker>
            <span className="text-caption text-muted-foreground">workforce</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <AssetMarker state="stopped"><AssetGlyph name="Bin" size={20} /></AssetMarker>
            <span className="text-caption text-muted-foreground">bin</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <AssetMarker state="immobilized" badge={<Lock className="size-2.5" />}><AssetGlyph name="Car" size={22} /></AssetMarker>
            <span className="text-caption text-muted-foreground">badge: lock</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <AssetMarker state="idle" badge={<Pause className="size-2.5" />}><AssetGlyph name="Car" size={22} /></AssetMarker>
            <span className="text-caption text-muted-foreground">badge: pause</span>
          </div>
        </div>
      </Sec>
    </div>
  );
}
