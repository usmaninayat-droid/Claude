// Icons from the REAL V5 set (src/icons/v5).
import {
  Globe02 as Leaf,
  FileCheck02 as FileCheck2,
  Truck01 as Truck,
  Signal01 as Radio,
  MarkerPin04 as MapPinned,
  Clipboard as ClipboardList,
  AlertTriangle,
  BarChart03 as BarChart3,
  PieChart01 as PieChart,
  ClipboardCheck as Recycle,
  Speedometer03 as Gauge,
  File02 as FileText,
  TrendUp01 as TrendingUp,
} from '../../icons';
import type { AppConfig, EntityModuleData, MonitoringModuleData, ShellActions, SteppedFormSchema } from '../../components/app-shell';
import {
  InboxView, Dashboard, SteppedSchemaForm,
  TaskDetail, TaskSection,
  EntityDetail, EntityDetailRow,
} from '../../components/app-shell';
import { Badge } from '../../components/primitives';
import { Timeline, StatusTransitionDropdown } from '../../components/data-display';
import { EntityProfileCard } from '../../components/widgets';
import { KpiTile, BarChart, DonutChart, AreaChart } from '../../components/data-viz';
import type { LatLng } from '../../components/map';
import type { DetailDescriptor } from '../../components/app-shell';

/**
 * EAD RMS — white-label regulatory app (Environment Agency, Abu Dhabi),
 * composed from the same kit. Reference: `Code/ead-rms-demo` (waste manifests
 * with a lifecycle, vehicle licensing, zones, live monitoring). Brand theme =
 * the ead-rms tenant tokens (deep navy + orange accent, solid sidebar).
 */

/* ── domain data (from the EAD RMS demo's mock model) ────────────────── */

type ManifestStatus = 'Created' | 'In Transit' | 'Delivered' | 'Flagged';

interface Manifest {
  id: string;
  producer: string;
  wasteType: string;
  stream: 'Inert' | 'Hazardous' | 'Organic' | 'Construction';
  transporter: string;
  facility: string;
  vehicle: string;
  status: ManifestStatus;
  date: string;
}

interface Vehicle {
  id: string;
  plate: string;
  transporter: string;
  category: string;
  permitExpiry: string;
  status: 'Licensed' | 'Expiring' | 'Suspended';
}

interface Zone {
  id: string;
  name: string;
  type: 'Collection' | 'Transfer' | 'Disposal';
  manifestsToday: number;
  status: 'Active' | 'Restricted';
}

const MANIFEST_FLOW: ManifestStatus[] = ['Created', 'In Transit', 'Delivered'];

const MANIFEST_STATUS_PILL: Record<ManifestStatus, string> = {
  Created: '#667085',
  'In Transit': '#0072d6',
  Delivered: '#12b76a',
  Flagged: '#f04438',
};

const MANIFESTS: Manifest[] = [
  { id: 'MF-24115', producer: 'Al Dhafra Constructions', wasteType: 'C&D Debris', stream: 'Construction', transporter: 'Emirates Waste Co', facility: 'Al Dafra Landfill', vehicle: 'AD 54213', status: 'In Transit', date: '17 Feb, 2026' },
  { id: 'MF-24114', producer: 'Gulf Food Industries', wasteType: 'Organic Waste', stream: 'Organic', transporter: 'Tadweer Logistics', facility: 'Composting Plant 2', vehicle: 'AD 88172', status: 'Delivered', date: '17 Feb, 2026' },
  { id: 'MF-24113', producer: 'ADNOC Refining', wasteType: 'Spent Solvents', stream: 'Hazardous', transporter: 'HazMat Transport LLC', facility: 'Hazardous TSDF', vehicle: 'AD 11290', status: 'Flagged', date: '17 Feb, 2026' },
  { id: 'MF-24112', producer: 'Khalifa Port FZ', wasteType: 'Inert Fill', stream: 'Inert', transporter: 'Emirates Waste Co', facility: 'Inert Recycling', vehicle: 'AD 54213', status: 'Delivered', date: '16 Feb, 2026' },
  { id: 'MF-24111', producer: 'Mussafah Steel Works', wasteType: 'Slag & Scale', stream: 'Construction', transporter: 'Al Ain Haulage', facility: 'Al Dafra Landfill', vehicle: 'AD 33761', status: 'Delivered', date: '16 Feb, 2026' },
  { id: 'MF-24110', producer: 'City Municipality', wasteType: 'Green Waste', stream: 'Organic', transporter: 'Tadweer Logistics', facility: 'Composting Plant 2', vehicle: 'AD 88172', status: 'Created', date: '16 Feb, 2026' },
  { id: 'MF-24109', producer: 'Etihad Rail Sites', wasteType: 'Excavation Spoil', stream: 'Inert', transporter: 'Emirates Waste Co', facility: 'Inert Recycling', vehicle: 'AD 67120', status: 'Delivered', date: '15 Feb, 2026' },
  { id: 'MF-24108', producer: 'Cleveland Clinic AD', wasteType: 'Clinical Waste', stream: 'Hazardous', transporter: 'HazMat Transport LLC', facility: 'Medical Incinerator', vehicle: 'AD 11290', status: 'Delivered', date: '15 Feb, 2026' },
];

const VEHICLES: Vehicle[] = [
  { id: 'V-01', plate: 'AD 54213', transporter: 'Emirates Waste Co', category: 'Roll-off Truck', permitExpiry: '12 Aug, 2026', status: 'Licensed' },
  { id: 'V-02', plate: 'AD 88172', transporter: 'Tadweer Logistics', category: 'Compactor', permitExpiry: '03 Mar, 2026', status: 'Expiring' },
  { id: 'V-03', plate: 'AD 11290', transporter: 'HazMat Transport LLC', category: 'Tanker (ADR)', permitExpiry: '21 Nov, 2026', status: 'Licensed' },
  { id: 'V-04', plate: 'AD 33761', transporter: 'Al Ain Haulage', category: 'Tipper', permitExpiry: '14 Feb, 2026', status: 'Suspended' },
  { id: 'V-05', plate: 'AD 67120', transporter: 'Emirates Waste Co', category: 'Skip Loader', permitExpiry: '30 Sep, 2026', status: 'Licensed' },
];

const ZONES: Zone[] = [
  { id: 'Z-01', name: 'Mussafah Industrial', type: 'Collection', manifestsToday: 14, status: 'Active' },
  { id: 'Z-02', name: 'Al Dafra Landfill', type: 'Disposal', manifestsToday: 22, status: 'Active' },
  { id: 'Z-03', name: 'ICAD Transfer Station', type: 'Transfer', manifestsToday: 9, status: 'Active' },
  { id: 'Z-04', name: 'Saadiyat Protected Zone', type: 'Collection', manifestsToday: 0, status: 'Restricted' },
];

/** Live fleet telematics around Abu Dhabi (demo center 24.4539, 54.3773). */
interface FleetUnit {
  vehicleId: string;
  position: LatLng;
  status: 'reporting' | 'warning' | 'stopped';
  statusLabel: string;
  speed: number;
  heading: number;
  lastSeen: string;
  activity: string;
  driver: string;
  contact: string;
  odometer: number;
  temperature: number;
  altitude: number;
}
const FLEET: FleetUnit[] = [
  { vehicleId: 'V-01', position: [24.466, 54.36], status: 'reporting', statusLabel: 'Moving', speed: 48, heading: 40, lastSeen: '12s ago', activity: 'En route to Al Dafra', driver: 'Imran Sayed', contact: '+971 50 118 2243', odometer: 84210, temperature: 33, altitude: 12 },
  { vehicleId: 'V-02', position: [24.42, 54.47], status: 'reporting', statusLabel: 'Collecting', speed: 12, heading: 170, lastSeen: '20s ago', activity: 'Collecting (Organic)', driver: 'Bilal Khan', contact: '+971 55 663 7781', odometer: 61040, temperature: 31, altitude: 8 },
  { vehicleId: 'V-03', position: [24.37, 54.5], status: 'warning', statusLabel: 'Idle', speed: 0, heading: 0, lastSeen: '22 min ago', activity: 'Idle 22 min', driver: 'Yusuf Omar', contact: '+971 52 904 1130', odometer: 102880, temperature: 36, altitude: 5 },
  { vehicleId: 'V-04', position: [24.34, 54.55], status: 'stopped', statusLabel: 'Suspended', speed: 0, heading: 0, lastSeen: '2 h ago', activity: 'Permit suspended', driver: 'Ali Hassan', contact: '+971 54 220 7745', odometer: 47330, temperature: 30, altitude: 4 },
  { vehicleId: 'V-05', position: [24.5, 54.39], status: 'reporting', statusLabel: 'Returning', speed: 55, heading: 300, lastSeen: '8s ago', activity: 'Returning empty', driver: 'Tariq Aziz', contact: '+971 50 771 9982', odometer: 73190, temperature: 34, altitude: 15 },
];

/* ── manifests (entity module with lifecycle) ────────────────────────── */

const manifestBadge = (s: ManifestStatus) =>
  s === 'Delivered' ? 'success' : s === 'In Transit' ? 'info' : s === 'Flagged' ? 'destructive' : 'muted';

let manifestSeq = 24115;

const manifestData: EntityModuleData<Manifest> = {
  columns: [
    { id: 'id', header: 'Manifest', accessor: (r) => r.id, sortable: true },
    { id: 'producer', header: 'Producer', accessor: (r) => r.producer },
    { id: 'type', header: 'Waste Type', accessor: (r) => r.wasteType },
    { id: 'stream', header: 'Stream', cell: (r) => <Badge variant={r.stream === 'Hazardous' ? 'destructive' : 'secondary'} size="sm">{r.stream}</Badge> },
    { id: 'transporter', header: 'Transporter', accessor: (r) => r.transporter },
    { id: 'facility', header: 'Facility', accessor: (r) => r.facility },
    { id: 'status', header: 'Status', cell: (r) => <Badge variant={manifestBadge(r.status)} size="sm">{r.status}</Badge> },
    { id: 'date', header: 'Date', accessor: (r) => r.date },
  ],
  rows: MANIFESTS,
  getRowId: (r) => r.id,
  filterField: { label: 'Stream', get: (r) => r.stream },
  searchText: (r) => `${r.id} ${r.producer} ${r.wasteType} ${r.transporter} ${r.facility} ${r.status}`,
  toListItem: (r) => ({
    id: r.id,
    title: `${r.id} — ${r.wasteType}`,
    subtitle: `${r.producer} → ${r.facility}`,
    trailing: <Badge variant={manifestBadge(r.status)} size="sm">{r.status}</Badge>,
  }),
  // STANDARD task detail (TaskDetail) — the manifest lifecycle as a stage
  // machine: Created → In Transit → Delivered, with Flagged guarded behind a
  // required inspection reason (forwardOnly off so a flag can be resolved).
  toDetail: (row) => ({
    id: row.id,
    category: 'Waste Manifest',
    label: row.id,
    render: (actions: ShellActions) => {
      const live = manifestData.rows.find((m) => m.id === row.id) ?? row;
      const flowIdx = MANIFEST_FLOW.indexOf(live.status as (typeof MANIFEST_FLOW)[number]);
      const setStatus = (status: ManifestStatus) => {
        manifestData.rows = manifestData.rows.map((m) => (m.id === live.id ? { ...m, status } : m));
        actions.refresh();
      };
      return (
        <TaskDetail
          ticketId={live.id}
          moduleLabel="Manifests"
          title={`${live.producer} → ${live.facility}`}
          status={
            <StatusTransitionDropdown
              forwardOnly={false}
              stages={[
                { id: 'Created', label: 'Created', color: MANIFEST_STATUS_PILL.Created },
                { id: 'In Transit', label: 'In Transit', color: MANIFEST_STATUS_PILL['In Transit'] },
                { id: 'Delivered', label: 'Delivered', color: MANIFEST_STATUS_PILL.Delivered },
                {
                  id: 'Flagged',
                  label: 'Flagged',
                  color: MANIFEST_STATUS_PILL.Flagged,
                  guard: {
                    title: 'Flag manifest for inspection',
                    description: 'A reason is required — it is recorded on the compliance file.',
                    reasonLabel: 'Inspection reason',
                    confirmLabel: 'Flag manifest',
                    destructive: true,
                  },
                },
              ]}
              currentId={live.status}
              onTransition={(toId) => setStatus(toId as ManifestStatus)}
            />
          }
          details={{
            left: [
              { label: 'Producer', value: live.producer },
              { label: 'Waste Type', value: live.wasteType },
              {
                label: 'Stream',
                value: <Badge variant={live.stream === 'Hazardous' ? 'destructive' : 'secondary'} size="sm">{live.stream}</Badge>,
              },
              { label: 'Date', value: live.date },
            ],
            right: [
              { label: 'Transporter', value: live.transporter },
              { label: 'Vehicle', value: live.vehicle },
              { label: 'Destination Facility', value: live.facility },
            ],
          }}
        >
          <TaskSection title="Chain of Custody">
            <Timeline
              items={[
                { id: '1', title: 'Manifest created', subtitle: live.producer, timestamp: live.date, color: 'var(--muted-foreground)' },
                ...(flowIdx >= 1 || live.status === 'Flagged'
                  ? [{ id: '2', title: 'Picked up by transporter', subtitle: live.transporter, timestamp: live.date, color: 'var(--primary)' }]
                  : []),
                ...(live.status === 'Delivered'
                  ? [{ id: '3', title: 'Received at facility', subtitle: live.facility, timestamp: live.date, color: '#12b76a' }]
                  : []),
                ...(live.status === 'Flagged'
                  ? [{ id: 'f', title: 'Flagged for inspection', subtitle: 'Compliance Officer', timestamp: live.date, color: '#f04438' }]
                  : []),
              ]}
            />
          </TaskSection>
        </TaskDetail>
      );
    },
  }),
};

/* ── vehicles + zones (entity modules) ───────────────────────────────── */

const vehicleBadge = (s: Vehicle['status']) =>
  s === 'Licensed' ? 'success' : s === 'Expiring' ? 'warning' : 'destructive';

const vehicleData: EntityModuleData<Vehicle> = {
  columns: [
    { id: 'plate', header: 'Plate', accessor: (r) => r.plate, sortable: true },
    { id: 'transporter', header: 'Transporter', accessor: (r) => r.transporter },
    { id: 'category', header: 'Category', accessor: (r) => r.category },
    { id: 'expiry', header: 'Permit Expiry', accessor: (r) => r.permitExpiry },
    { id: 'status', header: 'Licence', cell: (r) => <Badge variant={vehicleBadge(r.status)} size="sm">{r.status}</Badge> },
  ],
  rows: VEHICLES,
  getRowId: (r) => r.id,
  filterField: { label: 'Licence', get: (r) => r.status },
  searchText: (r) => `${r.plate} ${r.transporter} ${r.category} ${r.status}`,
};

const zoneData: EntityModuleData<Zone> = {
  columns: [
    { id: 'name', header: 'Zone', accessor: (r) => r.name, sortable: true },
    { id: 'type', header: 'Type', accessor: (r) => r.type },
    { id: 'today', header: 'Manifests Today', align: 'right', accessor: (r) => r.manifestsToday },
    { id: 'status', header: 'Status', cell: (r) => <Badge variant={r.status === 'Active' ? 'success' : 'warning'} size="sm">{r.status}</Badge> },
  ],
  rows: ZONES,
  getRowId: (r) => r.id,
  filterField: { label: 'Type', get: (r) => r.type },
  searchText: (r) => `${r.name} ${r.type} ${r.status}`,
};

/* ── live monitoring (Abu Dhabi fleet) ───────────────────────────────── */

/** Build the full vehicle EntityDetail (shared by the map popup + zone drills). */
function vehicleDetail(v: Vehicle): DetailDescriptor {
  const statusBg = v.status === 'Licensed' ? '#12b76a' : v.status === 'Expiring' ? '#f79009' : '#f04438';
  return {
    id: v.id,
    category: 'Vehicle',
    label: v.plate,
    render: () => (
        <EntityDetail
          avatarFallback={v.plate.replace('AD ', '').slice(0, 3)}
          avatarColor="#004B87"
          statusOverlay={
            <span className="inline-flex items-center rounded-[2px] px-1.5 py-1 text-caption font-semibold uppercase tracking-[0.5px] text-white" style={{ background: statusBg }}>
              {v.status}
            </span>
          }
          name={v.plate}
          entityId={v.id}
          categoryBadge={
            <span className="inline-flex items-center rounded-[4px] bg-secondary px-2 py-[3px] text-caption font-bold uppercase tracking-[0.3px] text-primary">
              {v.category}
            </span>
          }
          infoTitle="Vehicle Details"
          info={[
            { label: 'Transporter', value: v.transporter },
            { label: 'Category', value: v.category },
            { label: 'Permit Expiry', value: v.permitExpiry },
            { label: 'Licence', value: v.status },
          ]}
          tabs={[
            {
              id: 'licence',
              label: 'Licence',
              render: () => (
                <div className="grid grid-cols-2 gap-x-8">
                  <div>
                    <EntityDetailRow label="Category" value={v.category} />
                    <EntityDetailRow label="Permit Expiry" value={v.permitExpiry} borderBottom={false} />
                  </div>
                  <div>
                    <EntityDetailRow label="Transporter" value={v.transporter} />
                    <EntityDetailRow label="Status" value={v.status} borderBottom={false} />
                  </div>
                </div>
              ),
            },
            {
              id: 'manifests',
              label: 'Manifests',
              render: () => (
                <div className="flex flex-col">
                  {manifestData.rows.filter((m) => m.vehicle === v.plate).map((m, i, arr) => (
                    <div key={m.id} className={i < arr.length - 1 ? 'border-b border-border py-2' : 'py-2'}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[12px] font-medium text-foreground">{m.id} — {m.wasteType}</span>
                        <Badge variant={manifestBadge(m.status)} size="sm">{m.status}</Badge>
                      </div>
                      <p className="text-caption text-muted-foreground">{m.producer} → {m.facility}</p>
                    </div>
                  ))}
                  {!manifestData.rows.some((m) => m.vehicle === v.plate) ? (
                    <p className="py-6 text-center text-[12px] text-muted-foreground">No manifests carried by this vehicle.</p>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
    ),
  };
}

const STATUS_HEX_EAD: Record<string, string> = { reporting: '#12B76A', warning: '#F79009', stopped: '#D92D20' };

const monitoringData: MonitoringModuleData = {
  center: [24.4539, 54.3773],
  zoom: 12,
  listTitle: 'Vehicles',
  liveBadge: { label: `${FLEET.filter((f) => f.status === 'reporting').length} vehicles reporting` },
  legend: [
    { label: 'Moving', color: '#12B76A', count: FLEET.filter((f) => f.status === 'reporting').length },
    { label: 'Idle', color: '#F79009', count: FLEET.filter((f) => f.status === 'warning').length },
    { label: 'Stopped', color: '#D92D20', count: FLEET.filter((f) => f.status === 'stopped').length },
  ],
  entities: FLEET.map((f) => {
    const v = VEHICLES.find((x) => x.id === f.vehicleId)!;
    return {
      id: f.vehicleId,
      position: f.position,
      status: f.status,
      statusLabel: f.statusLabel,
      // DS V2 AssetMarker pin (state colour + dynamic asset glyph).
      assetType: 'tanker',
      live: f.status === 'reporting',
      heading: f.heading,
      mapLabel: v.plate,
      title: v.plate,
      subtitle: `${f.driver} · ${v.transporter}`,
      metric: `${f.speed} km/h`,
      metricSub: f.lastSeen,
      avatarFallback: v.plate.replace('AD ', '').slice(0, 2),
      tooltip: `${v.plate} · ${f.activity}`,
      since: f.lastSeen,
      alerts: f.status === 'stopped' ? 2 : f.status === 'warning' ? 1 : 0,
      connections: f.status === 'stopped' ? 0 : 3,
      distanceKm: Math.round(f.odometer / 1000) % 90,
      tripSummary: { distance: `${(Math.round(f.odometer / 1000) % 90) + 30} km`, trips: f.status === 'reporting' ? 5 : 2, duration: '6h 30m' },
      // Full EAD telemetry grid (Driver/Contact/Speed/Coordinates/Last
      // Record/Odometer/SOS/Temperature/Altitude).
      telemetry: [
        { label: 'Driver', value: f.driver },
        { label: 'Contact', value: f.contact },
        { label: 'Speed', value: `${f.speed} km/h` },
        { label: 'Coordinates', value: `${f.position[0].toFixed(3)}, ${f.position[1].toFixed(3)}` },
        { label: 'Last record', value: f.lastSeen },
        { label: 'Odometer', value: `${f.odometer.toLocaleString()} km` },
        { label: 'SOS', value: f.status === 'stopped' ? 'ALERT' : '—' },
        { label: 'Temperature', value: `${f.temperature}°C` },
        { label: 'Altitude', value: `${f.altitude} m` },
      ],
      events:
        f.status === 'stopped'
          ? [{ id: 'e1', title: 'Permit suspended', meta: f.lastSeen, severity: 'error' as const }]
          : f.status === 'warning'
            ? [{ id: 'e1', title: 'Idle beyond 20 min', meta: f.lastSeen, severity: 'warning' as const }]
            : undefined,
      // Recent trips (the EAD Trips tab) for moving units.
      trips:
        f.status === 'reporting'
          ? [
              { id: 't1', time: '07:42', destination: 'Mussafah ICAD collection run', distance: '34 km', duration: '1h 12m' },
              { id: 't2', time: '06:10', destination: 'Depot → first pickup', distance: '11 km', duration: '24m' },
            ]
          : undefined,
      devices: [
        { id: 'd1', name: `Telematics GW-${v.plate.replace('AD ', '')}`, meta: f.status === 'stopped' ? 'Offline' : 'Online' },
        { id: 'd2', name: 'Load cell sensor', meta: 'Online' },
      ],
      toDetail: () => vehicleDetail(v),
    };
  }),
};

/* ── dashboard ───────────────────────────────────────────────────────── */

function ComplianceDashboard() {
  const delivered = MANIFESTS.filter((m) => m.status === 'Delivered').length;
  const flagged = MANIFESTS.filter((m) => m.status === 'Flagged').length;
  const byStream = (['Construction', 'Organic', 'Hazardous', 'Inert'] as const).map((s, i) => ({
    name: s,
    value: MANIFESTS.filter((m) => m.stream === s).length,
    color: ['var(--chart-1)', 'var(--chart-4)', '#f04438', 'var(--chart-3)'][i],
  }));
  const byTransporter = ['Emirates Waste Co', 'Tadweer Logistics', 'HazMat Transport LLC', 'Al Ain Haulage'].map((t) => ({
    transporter: t.split(' ')[0],
    manifests: MANIFESTS.filter((m) => m.transporter === t).length,
  }));
  return (
    <Dashboard
      dateLabel="This week · 11 – 17 Feb, 2026"
      ranges={['Today', 'This Week', 'This Month', 'This Quarter']}
      kpis={[
        { label: 'Manifests', value: MANIFESTS.length, icon: <ClipboardList size={18} /> },
        { label: 'Delivered', value: delivered, trend: 'up', trendValue: '+8%', icon: <FileCheck2 size={18} /> },
        { label: 'Flagged', value: flagged, icon: <AlertTriangle size={18} />, iconBg: 'rgba(240,68,56,0.1)', iconColor: 'var(--destructive)' },
        { label: 'Licensed Vehicles', value: VEHICLES.filter((v) => v.status === 'Licensed').length, icon: <Truck size={18} /> },
        { label: 'Compliance Rate', value: '94%', trend: 'up', trendValue: '+2%', icon: <Gauge size={18} /> },
      ]}
      sections={[
        { id: 'stream', title: 'Manifests by Waste Stream', icon: <PieChart size={16} />, span: 5, children: <DonutChart data={byStream} height={260} centerLabel={<span className="text-h6 font-semibold">{MANIFESTS.length}</span>} /> },
        { id: 'transporter', title: 'Manifests by Transporter', icon: <BarChart3 size={16} />, span: 7, children: <BarChart data={byTransporter} xKey="transporter" series={[{ dataKey: 'manifests', name: 'Manifests' }]} height={260} /> },
      ]}
    />
  );
}

/* ── reports (instance tabs, per the EAD demo's reports section) ─────── */

function WasteVolumeReport() {
  const byStream = (['Construction', 'Organic', 'Hazardous', 'Inert'] as const).map((s) => ({
    stream: s,
    manifests: MANIFESTS.filter((m) => m.stream === s).length,
  }));
  const byFacility = [...new Set(MANIFESTS.map((m) => m.facility))].map((f) => ({
    facility: f.split(' ').slice(0, 2).join(' '),
    manifests: MANIFESTS.filter((m) => m.facility === f).length,
  }));
  return (
    <Dashboard
      dateLabel="11 – 17 Feb, 2026"
      kpis={[
        { label: 'Total Manifests', value: MANIFESTS.length, icon: <ClipboardList size={18} /> },
        { label: 'Facilities Receiving', value: byFacility.length, icon: <MapPinned size={18} /> },
        { label: 'Hazardous Share', value: `${Math.round((MANIFESTS.filter((m) => m.stream === 'Hazardous').length / MANIFESTS.length) * 100)}%`, icon: <AlertTriangle size={18} />, iconBg: 'rgba(240,68,56,0.1)', iconColor: 'var(--destructive)' },
      ]}
      sections={[
        { id: 'stream', title: 'Volume by Waste Stream', icon: <BarChart3 size={16} />, span: 6, children: <BarChart data={byStream} xKey="stream" series={[{ dataKey: 'manifests', name: 'Manifests' }]} height={280} /> },
        { id: 'facility', title: 'Volume by Destination Facility', icon: <BarChart3 size={16} />, span: 6, children: <BarChart data={byFacility} xKey="facility" series={[{ dataKey: 'manifests', name: 'Manifests', color: 'var(--chart-3)' }]} height={280} /> },
      ]}
    />
  );
}

function ComplianceTrendReport() {
  const weeks = [
    { week: 'W2 Jan', compliance: 89, flagged: 4 },
    { week: 'W3 Jan', compliance: 91, flagged: 3 },
    { week: 'W4 Jan', compliance: 90, flagged: 3 },
    { week: 'W1 Feb', compliance: 93, flagged: 2 },
    { week: 'W2 Feb', compliance: 94, flagged: 1 },
  ];
  return (
    <Dashboard
      dateLabel="Last 5 weeks"
      kpis={[
        { label: 'Compliance Rate', value: '94%', trend: 'up', trendValue: '+5pts', description: 'vs W2 Jan', icon: <Gauge size={18} /> },
        { label: 'Open Flags', value: MANIFESTS.filter((m) => m.status === 'Flagged').length, icon: <AlertTriangle size={18} />, iconBg: 'rgba(240,68,56,0.1)', iconColor: 'var(--destructive)' },
      ]}
      sections={[
        { id: 'trend', title: 'Compliance Trend (%)', icon: <TrendingUp size={16} />, span: 7, children: <AreaChart data={weeks} xKey="week" series={[{ dataKey: 'compliance', name: 'Compliance %' }]} height={280} /> },
        { id: 'flags', title: 'Flags per Week', icon: <BarChart3 size={16} />, span: 5, children: <BarChart data={weeks} xKey="week" series={[{ dataKey: 'flagged', name: 'Flagged', color: '#f04438' }]} height={280} /> },
      ]}
    />
  );
}

function TransporterPerformanceReport() {
  const transporters = [...new Set(MANIFESTS.map((m) => m.transporter))];
  const perf = transporters.map((t) => ({
    transporter: t.split(' ')[0],
    delivered: MANIFESTS.filter((m) => m.transporter === t && m.status === 'Delivered').length,
    flagged: MANIFESTS.filter((m) => m.transporter === t && m.status === 'Flagged').length,
  }));
  const share = transporters.map((t, i) => ({
    name: t,
    value: MANIFESTS.filter((m) => m.transporter === t).length,
    color: ['var(--chart-1)', 'var(--chart-3)', '#f04438', 'var(--chart-4)'][i % 4],
  }));
  return (
    <Dashboard
      kpis={[
        { label: 'Active Transporters', value: transporters.length, icon: <Truck size={18} /> },
        { label: 'Suspended Vehicles', value: VEHICLES.filter((v) => v.status === 'Suspended').length, icon: <AlertTriangle size={18} />, iconBg: 'rgba(240,68,56,0.1)', iconColor: 'var(--destructive)' },
      ]}
      sections={[
        { id: 'perf', title: 'Delivered vs Flagged by Transporter', icon: <BarChart3 size={16} />, span: 7, children: <BarChart data={perf} xKey="transporter" series={[{ dataKey: 'delivered', name: 'Delivered', color: 'var(--chart-4)' }, { dataKey: 'flagged', name: 'Flagged', color: '#f04438' }]} height={280} showLegend /> },
        { id: 'share', title: 'Manifest Share', icon: <PieChart size={16} />, span: 5, children: <DonutChart data={share} height={280} centerLabel={<span className="text-h6 font-semibold">{MANIFESTS.length}</span>} /> },
      ]}
    />
  );
}

/* ── app config ──────────────────────────────────────────────────────── */

export const eadRmsApp: AppConfig = {
  id: 'ead-rms',
  brand: {
    name: 'EAD RMS',
    icon: Leaf,
    // Tenant tokens from src/tokens/ead-rms.theme.css, applied per-app.
    theme: {
      '--primary': '#004B87',
      '--primary-foreground': '#FFFFFF',
      '--secondary': '#EAECF0',
      '--secondary-foreground': '#004B87',
      '--accent': '#F79009',
      '--accent-foreground': '#FFFFFF',
      '--ring': '#EAECF0',
      '--sidebar': '#004B87',
      '--chart-1': '#004B87',
    },
  },
  user: { name: 'Mariam Al Suwaidi', email: 'mariam@ead.gov.ae', role: 'Compliance Officer', avatarFallback: 'MS' },
  collectiveInbox: {
    notificationDot: true,
    render: () => (
      <InboxView
        data={{
          notifications: [
            { id: 'e1', title: 'Manifest MF-24113 flagged', description: 'Hazardous stream — seal mismatch reported at gate.', source: 'Manifests', severity: 'error', timestamp: '32m ago', unread: true },
            { id: 'e2', title: 'Permit expiring: AD 88172', description: 'Tadweer Logistics compactor permit expires 03 Mar.', source: 'Vehicles', severity: 'warning', timestamp: '2h ago', unread: true },
            { id: 'e3', title: 'Zone restricted', description: 'Saadiyat Protected Zone closed to collections this week.', source: 'Zones', severity: 'info', timestamp: 'Yesterday' },
          ],
        }}
      />
    ),
  },
  modules: [
    {
      id: 'dashboard',
      type: 'dashboard',
      label: 'Dashboard',
      tabKind: 'instance',
      tabs: [{ id: 'compliance', label: 'Compliance Overview', render: () => <ComplianceDashboard /> }],
    },
    {
      id: 'manifests',
      type: 'entity',
      label: 'Manifests',
      icon: Recycle,
      data: manifestData,
      tabs: [
        { id: 'list', kind: 'list', label: 'List View' },
        { id: 'grouped', kind: 'grouped-list', label: 'Grouped List' },
      ],
      create: {
        // Two-step creation: Waste details → Logistics (transporter picker).
        render: (close, actions) => {
          const schema: SteppedFormSchema = {
            title: 'Create Manifest',
            description: 'Register a new waste movement.',
            submitLabel: 'Create manifest',
            steps: [
              {
                id: 'waste',
                title: 'Waste Details',
                fields: [
                  { key: 'producer', label: 'Producer', required: true, span: 2 },
                  { key: 'wasteType', label: 'Waste type', required: true },
                  { key: 'stream', label: 'Stream', type: 'select', options: [{ label: 'Inert', value: 'Inert' }, { label: 'Hazardous', value: 'Hazardous' }, { label: 'Organic', value: 'Organic' }, { label: 'Construction', value: 'Construction' }] },
                ],
              },
              {
                id: 'logistics',
                title: 'Logistics',
                fields: [
                  {
                    key: 'vehicle',
                    label: 'Transporter vehicle',
                    type: 'picker',
                    required: true,
                    placeholder: 'Choose a licensed vehicle…',
                    span: 2,
                    pickerOptions: VEHICLES.filter((v) => v.status !== 'Suspended').map((v) => ({
                      value: v.id,
                      label: `${v.plate} — ${v.transporter}`,
                      subtitle: `${v.category} · permit to ${v.permitExpiry}`,
                      avatarFallback: v.plate.replace('AD ', '').slice(0, 2),
                      avatarColor: '#004B87',
                    })),
                  },
                  { key: 'facility', label: 'Destination facility', span: 2 },
                ],
              },
            ],
          };
          return (
            <SteppedSchemaForm
              schema={schema}
              onCancel={close}
              onSubmit={(v) => {
                manifestSeq += 1;
                const vehicle = VEHICLES.find((x) => x.id === v.vehicle);
                manifestData.rows = [
                  {
                    id: `MF-${manifestSeq}`,
                    producer: v.producer || 'Unknown producer',
                    wasteType: v.wasteType || '—',
                    stream: (v.stream as Manifest['stream']) || 'Inert',
                    transporter: vehicle?.transporter ?? 'Unassigned',
                    facility: v.facility || 'TBD',
                    vehicle: vehicle?.plate ?? '—',
                    status: 'Created',
                    date: '17 Feb, 2026',
                  },
                  ...manifestData.rows,
                ];
                actions.refresh();
                close();
              }}
            />
          );
        },
      },
    },
    { id: 'vehicles', type: 'entity', label: 'Vehicles', icon: Truck, data: vehicleData },
    { id: 'monitoring', type: 'live-monitoring', label: 'Live Monitoring', icon: Radio, data: monitoringData },
    { id: 'zones', type: 'entity', label: 'Zones', icon: MapPinned, data: zoneData },
    {
      id: 'reports',
      type: 'reports',
      label: 'Reports',
      icon: FileText,
      tabKind: 'instance',
      tabs: [
        { id: 'volume', label: 'Waste Volume', render: () => <WasteVolumeReport /> },
        { id: 'compliance', label: 'Compliance Trend', render: () => <ComplianceTrendReport /> },
        { id: 'transporters', label: 'Transporter Performance', render: () => <TransporterPerformanceReport /> },
      ],
    },
  ],
};
