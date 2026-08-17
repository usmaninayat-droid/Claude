import * as React from 'react';
import type { ModuleConfig, MonitoringEntity, MonitoringRoute, MonitoringModuleData, DetailDescriptor } from '@ds/components/app-shell';
import { TaskDetail, TaskSection } from '@ds/components/app-shell';
import { StateTransitionToolbar, getForwardTransitions } from '@ds/components/data-display';
import { ActivityFeed } from '@ds/components/widgets';
import type { FeedEntry } from '@ds/components/widgets';
import { toast } from '@ds/components/primitives';
import { cn } from '@ds/components/utils/cn';
import {
  Route as RouteIcon,
  AlertTriangle,
  Droplets01,
  CurrencyDollar,
  Package,
  Scales01,
  Clock,
  Compass01,
  Phone,
  MessageChatCircle,
  CheckCircle,
  XCircle,
  Play,
  FlagFilled,
  MarkerPin01,
  assetVectorUrl,
} from '@ds/icons';

/**
 * Trip Management BLOCK — a `live-monitoring` module CONFIG (Law 3: no new module
 * type). Delivers the hybrid list+map (Pass 1 — the spine) + the trip DETAIL
 * (Pass 2 — this update): selecting a trip opens the shell's existing detail
 * mechanism (`entity.toDetail` → `DetailDescriptor` → the shell's `DetailSheet`),
 * rendering a **`TaskDetail`** (C5 — reuse, never a bespoke sheet).
 *
 * PASS PLAN (ticketed, not built here): Pass 3 route-replay + playback scrubber,
 * Pass 4 New-Trip wizard + Optimize action + Send-Trip-Plan drawer, Pass 5
 * workforce-by-site/pickup table. This block is the FAMS Web Portal (canonical,
 * richest) skin.
 *
 * DOMAIN-AGNOSTIC BY CONFIG — everything below is DATA, not baked component
 * vocabulary: `LABELS` is the whole skin (module title, status taxonomy, which
 * metric chips show); `TRIP_DETAILS` is the whole detail content (summary
 * fields, assigned vehicle/driver, stop timeline, alarm events) — swap either
 * for Berkeley's 5-state taxonomy or Americana's binary Seats
 * Available/Unavailable and the SAME `TripCard`/`LiveMonitoringView`/`TaskDetail`
 * renders a different-looking product, zero component changes.
 */

// Status taxonomy — tokens, not literal hex (bridged once here, referenced by seed rows below).
const LABELS = {
  moduleTitle: 'Trip Management',
  createVerb: 'New Trip', // Pass 4 (New-Trip wizard) — not wired to `onCreate` yet, see below.
  statusList: {
    Completed: 'var(--status-success)',
    Ongoing: 'var(--status-warning)',
    Upcoming: 'var(--chart-3)',
  },
};
type TripStatus = keyof typeof LABELS.statusList;
const STATUS_ORDER: TripStatus[] = ['Upcoming', 'Ongoing', 'Completed'];

const CAR_IMG = assetVectorUrl('Car', 'map');

/* ── Pass 2 detail seed data ─────────────────────────────────────────────
 * One record per seeded trip: the summary grid + assigned vehicle/driver +
 * ordered stop timeline + alarm events. Kept separate from the list-only
 * `ENTITIES` below (Pass 1) so the two can be adapted independently. */

interface StopEntry {
  kind: 'start' | 'delivery' | 'stop' | 'end' | 'missed';
  time: string;
  /** Full display text — domain-specific wording (e.g. "Missed Delivery Point
   *  C, Jumeirah, Dubai") lives here as DATA, never baked into a component. */
  label: string;
  customer?: string;
  reason?: string;
}

interface AlarmEntry {
  time: string;
  type: string;
  detail?: string;
  location: string;
  severity: 'critical' | 'normal';
}

interface TripDetailSeed {
  orderType: string;
  fuel: string;
  cost: string;
  distance: string;
  timeWindow: string;
  weight: string;
  vehicleModel: string;
  driverName: string;
  driverPhone: string;
  stops: StopEntry[];
  alarms: AlarmEntry[];
}

const TRIP_DETAILS: Record<string, TripDetailSeed> = {
  'T#9876543': {
    orderType: 'Delivery',
    fuel: '5 Ltr',
    cost: '18 AED',
    distance: '22 km',
    timeWindow: '08:00 AM – 09:30 AM',
    weight: '95 kg',
    vehicleModel: 'Toyota Hiace',
    driverName: 'Ben Harrison',
    driverPhone: '+1 202 555 0143',
    stops: [
      { kind: 'start', time: '07:58 AM', label: 'Station Point A, Deira, Dubai', customer: 'Fatima Noor' },
      { kind: 'stop', time: '08:12 AM', label: 'Warehouse 4, Al Qusais, Dubai', customer: 'Fatima Noor' },
      { kind: 'delivery', time: '08:41 AM', label: 'Delivery At Marina Walk, Dubai', customer: 'Fatima Noor' },
      { kind: 'delivery', time: '09:05 AM', label: 'Delivery At JBR Walk, Dubai', customer: 'Fatima Noor' },
      { kind: 'end', time: '09:28 AM', label: 'Station Point B, Al Quoz 1, Dubai', customer: 'Fatima Noor' },
    ],
    alarms: [
      { time: '08:20 AM', type: 'Over Speeding', detail: 'at 118km/h', location: 'Sheikh Zayed Road, Dubai', severity: 'critical' },
      { time: '08:50 AM', type: 'Idle Engine', detail: '(4 min)', location: 'Marina Walk, Dubai', severity: 'normal' },
    ],
  },
  'T#4567890': {
    orderType: 'Delivery',
    fuel: '3 Ltr',
    cost: '12 AED',
    distance: '16 km',
    timeWindow: '09:00 AM – 10:00 AM',
    weight: '60 kg',
    vehicleModel: 'Nissan Urvan',
    driverName: 'Alex Johnson',
    driverPhone: '+1 202 555 0158',
    stops: [
      { kind: 'start', time: '08:57 AM', label: 'Station Point C, Karama, Dubai', customer: 'Reem Al Suwaidi' },
      { kind: 'delivery', time: '09:22 AM', label: 'Delivery At Oud Metha, Dubai', customer: 'Reem Al Suwaidi' },
      { kind: 'end', time: '09:52 AM', label: 'Station Point B, Al Quoz 1, Dubai', customer: 'Reem Al Suwaidi' },
    ],
    alarms: [], // Completed with zero events — an honest empty state, distinct from "not started yet".
  },
  'T#3210987': {
    // Parity target — matches the FAMS-portal reference frames (hi-29367-14783 / hi-29550-56781).
    orderType: 'Delivery',
    fuel: '7 Ltr',
    cost: '10 AED',
    distance: '14 km',
    timeWindow: '10:00 AM – 12:00 PM',
    weight: '120 kg',
    vehicleModel: 'Rolls Royce',
    driverName: 'Chris Thompson',
    driverPhone: '+1 225 623 8209',
    stops: [
      { kind: 'start', time: '11:03 AM', label: 'Station Point E, Um Suqeim, Dubai', customer: 'Arlene McCoy' },
      { kind: 'delivery', time: '11:40 AM', label: 'Delivery At Al Safa, Dubai, UAE', customer: 'Arlene McCoy' },
      { kind: 'missed', time: '11:52 AM', label: 'Missed Delivery Point C, Jumeirah, Dubai', customer: 'Arlene McCoy', reason: 'Customer Refused Delivery' },
      { kind: 'delivery', time: '12:10 PM', label: 'Delivery At Al Safa, Dubai, UAE', customer: 'Arlene McCoy' },
      { kind: 'delivery', time: '12:43 PM', label: 'Delivery At Al Safa, Dubai, UAE', customer: 'Arlene McCoy' },
      { kind: 'end', time: '01:43 PM', label: 'Station Point B, Al Quoz 1, Dubai', customer: 'Arlene McCoy' },
    ],
    alarms: [
      { time: '12:43 PM', type: 'Over Speeding', detail: 'at 140km/h', location: '3 / 621 Juvenal Ridge, Port Saeed, Dubai', severity: 'critical' },
      { time: '12:41 PM', type: 'Over Speeding', detail: 'at 132km/h', location: '3 / 621 Juvenal Ridge, Port Saeed, Dubai', severity: 'critical' },
      { time: '12:38 PM', type: 'Over Speeding', detail: 'at 128km/h', location: 'Al Ittihad Road, Dubai', severity: 'critical' },
      { time: '12:20 PM', type: 'Harsh Braking', location: 'Sheikh Zayed Road, Dubai', severity: 'critical' },
      { time: '12:05 PM', type: 'Over Speeding', detail: 'at 141km/h', location: 'Al Rebat Street, Dubai', severity: 'critical' },
      { time: '11:50 AM', type: 'Over Speeding', detail: 'at 136km/h', location: 'Al Wasl Road, Dubai', severity: 'critical' },
      { time: '11:30 AM', type: 'Idle Engine', detail: '(5 min)', location: 'Station Point E, Um Suqeim, Dubai', severity: 'normal' },
      { time: '11:10 AM', type: 'Geofence Entry', location: 'Villa 12, Al Safa 2, Dubai', severity: 'normal' },
    ],
  },
  'T#6543210': {
    orderType: 'Pickup',
    fuel: '4 Ltr',
    cost: '14 AED',
    distance: '19 km',
    timeWindow: '11:00 AM – 01:00 PM',
    weight: '80 kg',
    vehicleModel: 'Ford Transit',
    driverName: 'Jordan Kim',
    driverPhone: '+1 202 555 0172',
    stops: [
      { kind: 'start', time: '11:02 AM', label: 'Station Point F, Business Bay, Dubai', customer: 'Noura Hassan' },
      { kind: 'delivery', time: '11:34 AM', label: 'Pickup At Downtown Views, Dubai', customer: 'Noura Hassan' },
    ],
    alarms: [
      { time: '11:20 AM', type: 'Over Speeding', detail: 'at 104km/h', location: 'Al Khail Road, Dubai', severity: 'critical' },
      { time: '11:08 AM', type: 'Harsh Braking', location: 'Business Bay, Dubai', severity: 'critical' },
      { time: '10:58 AM', type: 'Idle Engine', detail: '(3 min)', location: 'Station Point F, Business Bay, Dubai', severity: 'normal' },
    ],
  },
  'T#1029384': {
    orderType: 'Delivery',
    fuel: '—',
    cost: '—',
    distance: '—',
    timeWindow: '02:00 PM – 04:00 PM',
    weight: '110 kg',
    vehicleModel: 'Toyota Hiace',
    driverName: 'Morgan Lee',
    driverPhone: '+1 202 555 0186',
    stops: [], // Trip hasn't started — an honest empty timeline, not fake data.
    alarms: [],
  },
  'T#1357924': {
    orderType: 'Delivery',
    fuel: '—',
    cost: '—',
    distance: '—',
    timeWindow: '03:00 PM – 05:00 PM',
    weight: '70 kg',
    vehicleModel: 'Nissan Urvan',
    driverName: 'Jamie Patel',
    driverPhone: '+1 202 555 0199',
    stops: [],
    alarms: [],
  },
};

/** In-session status-change log (Pass 2 — `StateTransitionToolbar`'s optional
 *  note capture). Kept separate from the static `TRIP_DETAILS` seed so a status
 *  change doesn't mutate the "source of truth" seed; surfaces in the "All logs"
 *  sub-tab so the captured reason is actually visible somewhere, not discarded. */
const STATUS_LOG: Record<string, { time: string; text: string }[]> = {};
function logStatusChange(id: string, toStatus: TripStatus, note?: string) {
  const arr = STATUS_LOG[id] ?? (STATUS_LOG[id] = []);
  arr.unshift({ time: 'Just now', text: note ? `Status changed to ${toStatus} — ${note}` : `Status changed to ${toStatus}` });
}

const STOP_ICON: Record<StopEntry['kind'], typeof Play> = {
  start: Play,
  delivery: CheckCircle,
  stop: MarkerPin01,
  end: FlagFilled,
  missed: XCircle,
};
const STOP_TONE: Record<StopEntry['kind'], string> = {
  start: 'var(--status-success)',
  delivery: 'var(--status-success)',
  stop: 'var(--primary)',
  end: 'var(--status-success)',
  missed: 'var(--status-error)',
};

function stopToFeedEntry(s: StopEntry, i: number): FeedEntry {
  const Icon = STOP_ICON[s.kind];
  const textParts = [s.customer ? `CUSTOMER · ${s.customer}` : null, s.reason ? `Reason: ${s.reason}` : null].filter(Boolean);
  return {
    kind: 'system',
    id: `stop-${i}`,
    dateGroup: '24 May, 25',
    timestamp: s.time,
    icon: <Icon size={13} style={{ color: STOP_TONE[s.kind] }} />,
    author: s.label,
    text: textParts.join(' · '),
    chip: s.kind === 'missed' ? { label: 'Missed', tone: 'danger' } : undefined,
  };
}

function alarmToFeedEntry(a: AlarmEntry, i: number): FeedEntry {
  return {
    kind: 'system',
    id: `alarm-${i}`,
    dateGroup: '24 May, 25',
    timestamp: a.time,
    icon: <AlertTriangle size={13} style={{ color: a.severity === 'critical' ? 'var(--status-error)' : 'var(--status-warning)' }} />,
    author: a.detail ? `${a.type} ${a.detail}` : a.type,
    text: a.location,
  };
}

function logToFeedEntry(l: { time: string; text: string }, i: number): FeedEntry {
  return { kind: 'system', id: `log-${i}`, dateGroup: 'Today', timestamp: l.time, icon: <Clock size={13} className="text-primary" />, text: l.text };
}

/** Alarms sub-tab — Critical/Normal/All segment filter + the shared `ActivityFeed`
 *  (read-only; no composer). A genuine child component (not a plain closure) so
 *  its local filter state is a real, hook-safe React component. */
function TripAlarmsPanel({ alarms }: { alarms: AlarmEntry[] }) {
  const [filter, setFilter] = React.useState<'critical' | 'normal' | 'all'>('critical');
  const criticalCount = alarms.filter((a) => a.severity === 'critical').length;
  const normalCount = alarms.filter((a) => a.severity === 'normal').length;
  const visible = filter === 'all' ? alarms : alarms.filter((a) => a.severity === filter);
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {(
          [
            ['critical', `Critical Events ${criticalCount}`],
            ['normal', `Normal Events ${normalCount}`],
            ['all', 'All'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              'rounded-full border px-3 py-1 text-caption font-semibold transition-colors',
              filter === id ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <ActivityFeed className="min-h-0 flex-1" entries={visible.map(alarmToFeedEntry)} />
    </div>
  );
}

function trip(
  id: string,
  status: TripStatus,
  plate: string,
  metricChips: MonitoringEntity['metricChips'],
  segments: { done: boolean }[],
  position: [number, number],
): MonitoringEntity {
  const seed = TRIP_DETAILS[id];
  return {
    id,
    position,
    status: status === 'Ongoing' ? 'reporting' : 'default',
    title: id,
    dateTime: '13 Jan, 25 | 12:43 PM',
    statusLabel: status,
    statusTone: LABELS.statusList[status],
    // Reuse the DS vehicle AssetKind glyph (the same mechanism FleetRow's `image`
    // field already supports) — never a raw emoji, which is font-dependent and
    // breaks the text-initials convention (`ignored-existing-ds-component`).
    // Falls back to plate-derived initials (FleetRow's own `avatarFallback`
    // idiom) on the rare chance the glyph asset can't resolve.
    image: CAR_IMG,
    avatarFallback: plate.replace(/\s+/g, '').slice(0, 2).toUpperCase(),
    plate,
    driver: { name: seed.driverName },
    metricChips,
    segments,
    // Pass 2 — selecting this trip opens its detail (TaskDetail) via the shell's
    // standard `openDetail` mechanism (wired in `live-monitoring-view.tsx`'s
    // `select()`, gated on `listVariant==='trip'`). Reads the CURRENT live entity
    // (not the closed-over `id` alone) so an in-session status change is reflected
    // the next time the detail re-renders.
    toDetail: () => buildTripDetail(id),
  };
}

const CHIP_ALERT = (n: number) => ({ icon: AlertTriangle, value: n, tone: 'var(--status-error)' });
const CHIP_FUEL = (v: string) => ({ icon: Droplets01, value: v });
const CHIP_COST = (v: string) => ({ icon: CurrencyDollar, value: v });

let ENTITIES: MonitoringEntity[] = [
  trip('T#9876543', 'Completed', 'N 1234', [CHIP_ALERT(12), CHIP_FUEL('1 Ltr'), CHIP_COST('10 AED')], [{ done: true }, { done: true }, { done: true }, { done: true }], [25.212, 55.27]),
  trip('T#4567890', 'Completed', 'N 5678', [CHIP_ALERT(12), CHIP_FUEL('1 Ltr'), CHIP_COST('10 AED')], [{ done: true }, { done: true }, { done: true }, { done: true }], [25.221, 55.281]),
  trip('T#3210987', 'Ongoing', 'N 4321', [CHIP_ALERT(6), CHIP_COST('10 AED')], [{ done: true }, { done: true }, { done: false }, { done: false }], [25.2048, 55.2708]),
  trip('T#6543210', 'Ongoing', 'N 8765', [CHIP_ALERT(2), CHIP_COST('10 AED')], [{ done: true }, { done: false }, { done: false }, { done: false }], [25.198, 55.288]),
  trip('T#1029384', 'Upcoming', 'N 2938', undefined, [{ done: false }, { done: false }, { done: false }, { done: false }], [25.235, 55.26]),
  trip('T#1357924', 'Upcoming', 'N 5792', undefined, [{ done: false }, { done: false }, { done: false }, { done: false }], [25.19, 55.255]),
];

/** Mutate the live entity + reassign `tripManagementBlock.data` to a NEW object
 *  reference (not just the array in place) — `LiveMonitoringView` memoises its
 *  derived entities off the `data` prop's identity, so the outer object must
 *  change reference for a status edit to reach the list row / map marker after
 *  `actions.refresh()` (mirrors the workshop block's `pipelineData.cards = …`
 *  mutate-then-refresh pattern). */
function setTripStatus(id: string, toStatus: TripStatus, note?: string) {
  ENTITIES = ENTITIES.map((e) =>
    e.id === id ? { ...e, status: toStatus === 'Ongoing' ? 'reporting' : 'default', statusLabel: toStatus, statusTone: LABELS.statusList[toStatus] } : e
  );
  logStatusChange(id, toStatus, note);
  tripManagementBlock.data = { ...(tripManagementBlock.data as MonitoringModuleData), entities: ENTITIES };
}

function buildTripDetail(id: string): DetailDescriptor {
  return {
    id,
    category: 'Trip',
    label: id,
    // Narrower than the shell's `min(1100px, 94vw)` default — the frame's own
    // detail pane is a compact middle column, not a near-full-screen profile;
    // the shell has no literal 3-pane (list | detail | map) slot today (see
    // block .spec.md), so this is the closest faithful reuse of `DetailSheet`.
    width: 'min(960px, 92vw)',
    render: (actions) => {
      const live = ENTITIES.find((e) => e.id === id) ?? ENTITIES[0];
      const seed = TRIP_DETAILS[id];
      const currentStatus = (live.statusLabel as TripStatus) ?? 'Upcoming';
      const log = STATUS_LOG[id] ?? [];
      return (
        <TaskDetail
          ticketId={id.replace(/^T#/, '')}
          title={`${seed.orderType} Trip`}
          details={{
            left: [
              {
                label: 'Status',
                value: (
                  <StateTransitionToolbar
                    currentStage={{ id: currentStatus, label: currentStatus, color: LABELS.statusList[currentStatus] }}
                    transitions={getForwardTransitions(
                      STATUS_ORDER.map((s) => ({ id: s, label: s })),
                      currentStatus
                    ).map((t) => ({ ...t, noteLabel: 'Reason for status change', confirmMessage: `Update this trip's status to ${t.actionLabel}?` }))}
                    onTransition={(toId, note) => {
                      setTripStatus(id, toId as TripStatus, note);
                      actions.refresh();
                    }}
                  />
                ),
              },
              {
                label: <span className="flex items-center gap-1"><Droplets01 size={12} /> Fuel Consumption</span>,
                value: seed.fuel,
              },
              {
                label: <span className="flex items-center gap-1"><Compass01 size={12} /> Distance Traveled</span>,
                value: seed.distance,
              },
              {
                label: <span className="flex items-center gap-1"><Scales01 size={12} /> Weight</span>,
                value: seed.weight,
              },
            ],
            right: [
              {
                label: <span className="flex items-center gap-1"><Package size={12} /> Order Type</span>,
                value: seed.orderType,
              },
              {
                label: <span className="flex items-center gap-1"><CurrencyDollar size={12} /> Trip Cost</span>,
                value: seed.cost,
              },
              {
                label: <span className="flex items-center gap-1"><Clock size={12} /> Time Window</span>,
                value: seed.timeWindow,
              },
            ],
          }}
          rightPanelTabs={[
            {
              id: 'trip-info',
              label: 'Trip Info',
              render: () => <ActivityFeed className="h-full" entries={seed.stops.map(stopToFeedEntry)} />,
            },
            {
              id: 'alarms',
              label: 'Alarms',
              render: () => <TripAlarmsPanel alarms={seed.alarms} />,
            },
            {
              id: 'all-logs',
              label: 'All logs',
              render: () => (
                <ActivityFeed
                  className="h-full"
                  entries={[...log.map(logToFeedEntry), ...seed.stops.map(stopToFeedEntry), ...seed.alarms.map(alarmToFeedEntry)]}
                />
              ),
            },
          ]}
        >
          <TaskSection title="Assigned Vehicle">
            <div className="flex items-center gap-3">
              <img src={CAR_IMG} alt="" className="size-10 shrink-0 rounded-md bg-muted object-contain p-1.5" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[14px] font-semibold text-foreground">{seed.vehicleModel}</span>
                <span className="truncate text-caption text-muted-foreground">Plate# {live.plate}</span>
              </div>
            </div>
          </TaskSection>

          <TaskSection title="Assigned Driver">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-body-sm font-semibold text-primary">
                {seed.driverName.slice(0, 2).toUpperCase()}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] font-semibold text-foreground">{seed.driverName}</span>
                <span className="truncate text-caption text-muted-foreground">{seed.driverPhone}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={`tel:${seed.driverPhone.replace(/\s+/g, '')}`}
                  aria-label={`Call ${seed.driverName}`}
                  className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Phone size={15} />
                </a>
                <button
                  type="button"
                  aria-label={`Message ${seed.driverName}`}
                  onClick={() => toast.info(`Opening chat with ${seed.driverName}…`)}
                  className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <MessageChatCircle size={15} />
                </button>
              </div>
            </div>
          </TaskSection>
        </TaskDetail>
      );
    },
  };
}

// Route — a straight polyline through ordered stop points (OSRM road geometry + numbered
// START/STOP/END markers land in Pass 3); `entityId` means it only draws while THAT trip's row
// is selected (Trip Management's "on trip select, draw its route").
const ROUTES: MonitoringRoute[] = [
  { id: 'r-3210987', entityId: 'T#3210987', points: [[25.235, 55.255], [25.222, 55.262], [25.2048, 55.2708]], color: 'var(--primary)' },
];

export const tripManagementBlock: ModuleConfig<MonitoringModuleData> = {
  id: 'trip-management',
  type: 'live-monitoring',
  label: LABELS.moduleTitle,
  icon: RouteIcon,
  data: {
    center: [25.2048, 55.2708],
    zoom: 12,
    listVariant: 'trip',
    listKpi: { label: 'Fleet Utilization', value: 149, total: 156 },
    listWidth: 360,
    emptyPreview: { title: 'No Trip Preview!', hint: 'Click on a trip to preview it on the map.' },
    entities: ENTITIES,
    routes: ROUTES,
    // Pass 4 wires the New-Trip 2-step wizard through `onCreate` (StepWizardSheet) — left
    // unset here so Pass 1/2 never renders an unwired decorative "+" button.
  },
};
