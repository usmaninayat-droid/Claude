// Icons from the REAL V5 set (src/icons/v5).
import {
  Building07 as Factory,
  Package,
  Signal01 as Radio,
  BankNote01 as Banknote,
  Clipboard as ClipboardList,
  Truck01 as TruckIcon,
  BarChart03 as BarChart3,
  PieChart01 as PieChart,
  Receipt,
  Scales01 as Scale,
} from '../../icons';
import { cn } from '../../components/utils/cn';
import type { AppConfig, EntityModuleData, MonitoringModuleData, ShellActions, SteppedFormSchema } from '../../components/app-shell';
import {
  InboxView, Dashboard, SteppedSchemaForm,
  TaskDetail, TaskSection, TaskInfoRow,
} from '../../components/app-shell';
import { Badge, Button } from '../../components/primitives';
import { StatePill } from '../../components/data-display';
import { ActivityFeed } from '../../components/widgets';
import type { FeedEntry } from '../../components/widgets';
import { BarChart, DonutChart } from '../../components/data-viz';
import type { LatLng } from '../../components/map';

/**
 * FAMS Cement Delivery OS — composed from the kit, referencing the static
 * `Code/cement-demo` prototype (bulk cement via 30t silo tankers, Dubai/AED,
 * NET-30 on-account). PRESENTER PATTERN preserved from the demo: the 12-step
 * order timeline in the detail sheet is **clickable** — clicking any step flips
 * the order to that state instantly, so a presenter can walk the full delivery
 * journey without waiting on a live flow.
 */

/* ── the canonical 12-step order pipeline (from cement-demo CLAUDE.md) ── */

const ORDER_STEPS = [
  'Order received',
  'Confirmed',
  'Dispatch',
  'Gate in',
  'Weighbridge (empty)',
  'Loading',
  'Weighbridge (loaded)',
  'Dispatch from plant',
  'Transit',
  'Arrival',
  'Unloading',
  'Proof of delivery',
] as const;

interface CementOrder {
  id: string;
  customer: string;
  grade: string;
  tonnage: number;
  site: string;
  totalAed: string;
  /** Index into ORDER_STEPS — the presenter-clickable state. */
  step: number;
  driver?: string;
  tanker?: string;
  slot: string;
}

const ORDERS: CementOrder[] = [
  { id: 'ORD-7812', customer: 'Al-Rashid Construction', grade: 'OPC 42.5N', tonnage: 30, site: 'Expo City Dubai, District 2B', totalAed: 'AED 11,970', step: 8, driver: 'Waqar Ahmed', tanker: 'Dubai D-4536', slot: '17 Feb, 14:00–16:00' },
  { id: 'ORD-7811', customer: 'Emaar South JV', grade: 'OPC 52.5N', tonnage: 28, site: 'Emaar South, Plot 7A', totalAed: 'AED 12,348', step: 11, driver: 'Waqar Ahmed', tanker: 'Dubai D-4536', slot: '17 Feb, 08:00–10:00' },
  { id: 'ORD-7810', customer: 'Binladin Marine Works', grade: 'SRC 42.5N', tonnage: 30, site: 'Dubai Harbour, Berth 4', totalAed: 'AED 14,490', step: 5, driver: 'Waqar Ahmed', tanker: 'Dubai D-4536', slot: '18 Feb, 10:00–12:00' },
  { id: 'ORD-7809', customer: 'Al-Rashid Construction', grade: 'PPC 42.5N', tonnage: 24, site: 'Expo City Dubai, District 2B', totalAed: 'AED 9,072', step: 1, slot: '19 Feb, 14:00–16:00' },
  { id: 'ORD-7808', customer: 'Nakheel Contracting', grade: 'OPC 42.5N', tonnage: 30, site: 'Palm Jebel Ali, Frond M', totalAed: 'AED 11,970', step: 0, slot: '20 Feb, 08:00–10:00' },
];

const stepPill = (step: number) =>
  step >= 11 ? '#12b76a' : step >= 8 ? '#0072d6' : step >= 2 ? '#f79009' : '#667085';

let orderSeq = 7812;

/** Known customers (the demo's customer picker, with inline create-new). */
const CEMENT_CUSTOMERS = [
  { id: 'CU-01', name: 'Al-Rashid Construction', trn: 'TRN 100 1234 5678 9003' },
  { id: 'CU-02', name: 'Emaar South JV', trn: 'TRN 100 8821 3344 0007' },
  { id: 'CU-03', name: 'Binladin Marine Works', trn: 'TRN 100 5511 2299 0014' },
  { id: 'CU-04', name: 'Nakheel Contracting', trn: 'TRN 100 7700 6612 0021' },
];

const GRADE_RATES: Record<string, number> = {
  'OPC 42.5N': 380, 'OPC 52.5N': 420, 'SRC 42.5N': 460, 'PPC 42.5N': 360,
};
/** Live order total: tonnage × grade rate × 1.05 VAT (the demo's footer). */
function orderTotal(v: Record<string, string>): number | null {
  const rate = GRADE_RATES[v.grade ?? ''];
  const t = Number(v.tonnage);
  if (!rate || !t) return null;
  return Math.round(Math.min(30, Math.max(22, t)) * rate * 1.05);
}

/* ── presenter-clickable 12-step timeline ────────────────────────────── */

function ClickableOrderTimeline({
  step,
  onStepClick,
}: {
  step: number;
  onStepClick: (idx: number) => void;
}) {
  return (
    <div className="overflow-x-auto pb-1">
      <ol className="flex min-w-max items-start gap-0">
        {ORDER_STEPS.map((label, i) => {
          const done = i <= step;
          const isCurrent = i === step;
          return (
            <li key={label} className="flex w-[92px] flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span className={cn('h-0.5 flex-1', i === 0 ? 'bg-transparent' : done ? 'bg-primary' : 'bg-border')} />
                <button
                  type="button"
                  onClick={() => onStepClick(i)}
                  aria-label={`Set state: ${label}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'grid size-6 shrink-0 cursor-pointer place-items-center rounded-full border-2 text-caption font-bold transition-colors',
                    done
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary'
                  )}
                >
                  {i + 1}
                </button>
                <span className={cn('h-0.5 flex-1', i === ORDER_STEPS.length - 1 ? 'bg-transparent' : i < step ? 'bg-primary' : 'bg-border')} />
              </div>
              <span className={cn('mt-1.5 px-1 text-caption leading-tight', isCurrent ? 'font-semibold text-primary' : done ? 'text-foreground' : 'text-muted-foreground')}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── orders (entity module) ──────────────────────────────────────────── */

const orderData: EntityModuleData<CementOrder> = {
  columns: [
    { id: 'id', header: 'Order', accessor: (r) => r.id, sortable: true },
    { id: 'customer', header: 'Customer', accessor: (r) => r.customer },
    { id: 'grade', header: 'Grade', accessor: (r) => r.grade },
    { id: 'tonnage', header: 'Tonnage', align: 'right', accessor: (r) => `${r.tonnage} t` },
    { id: 'site', header: 'Site', accessor: (r) => r.site },
    { id: 'state', header: 'State', cell: (r) => <StatePill label={ORDER_STEPS[r.step]} bg={stepPill(r.step)} /> },
    { id: 'total', header: 'Total', align: 'right', accessor: (r) => r.totalAed },
  ],
  rows: ORDERS,
  getRowId: (r) => r.id,
  filterField: { label: 'Grade', get: (r) => r.grade },
  searchText: (r) => `${r.id} ${r.customer} ${r.grade} ${r.site} ${ORDER_STEPS[r.step]}`,
  toListItem: (r) => ({
    id: r.id,
    title: `${r.id} — ${r.customer}`,
    subtitle: `${r.tonnage}t ${r.grade} · ${r.site}`,
    trailing: <StatePill label={ORDER_STEPS[r.step]} bg={stepPill(r.step)} />,
  }),
  // STANDARD task detail (TaskDetail) hosting the PRESENTER timeline —
  // clicking any of the 12 steps still flips the order to that state.
  toDetail: (row) => ({
    id: row.id,
    category: 'Order',
    label: row.id,
    render: (actions: ShellActions) => {
      const live = orderData.rows.find((o) => o.id === row.id) ?? row;
      const setStep = (idx: number) => {
        orderData.rows = orderData.rows.map((o) => (o.id === live.id ? { ...o, step: idx } : o));
        actions.refresh();
      };
      // Order-events feed derived from the current step (read-only panel).
      const events: FeedEntry[] = ORDER_STEPS.slice(0, live.step + 1).map((s, i) => ({
        kind: 'system',
        id: `${live.id}-ev${i}`,
        text: s,
        timestamp: i === live.step ? 'current' : undefined,
      }));
      return (
        <TaskDetail
          ticketId={live.id}
          moduleLabel="Orders"
          title={`${live.customer} — ${live.tonnage}t ${live.grade}`}
          status={
            <span className="flex items-center gap-2">
              <StatePill size="sm" label={ORDER_STEPS[live.step]} bg={stepPill(live.step)} />
              {live.step < ORDER_STEPS.length - 1 ? (
                <Button size="sm" onClick={() => setStep(live.step + 1)}>
                  Next: {ORDER_STEPS[live.step + 1]}
                </Button>
              ) : (
                <Badge variant="success" size="sm">POD issued</Badge>
              )}
            </span>
          }
          details={{
            left: [
              { label: 'Customer', value: live.customer },
              {
                label: 'Cement Grade',
                value: <Badge variant="secondary" size="sm">{live.grade}</Badge>,
              },
              { label: 'Tonnage', value: `${live.tonnage} t` },
              { label: 'Delivery Slot', value: live.slot },
            ],
            right: [
              { label: 'Site', value: live.site },
              { label: 'Payment', value: 'NET-30 on account' },
              {
                label: 'Driver',
                value: live.driver ? (
                  <span className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-full bg-primary text-[12px] font-semibold text-white">
                      {live.driver.split(' ').map((w) => w[0]).join('')}
                    </span>
                    <span className="text-[14px] font-semibold text-foreground">{live.driver} · {live.tanker}</span>
                  </span>
                ) : (
                  <span className="text-[14px] font-semibold text-muted-foreground">Awaiting dispatch</span>
                ),
              },
              { label: 'Order Total', value: live.totalAed },
            ],
          }}
          timeline={<ActivityFeed className="h-full" entries={events} />}
          timelineTitle="Order Events"
        >
          <TaskSection
            title="Delivery Journey"
            headerRight={<span className="text-[12px] font-semibold text-muted-foreground">Click any step to set the order state</span>}
            inset={false}
          >
            <ClickableOrderTimeline step={live.step} onStepClick={setStep} />
          </TaskSection>
          <TaskSection title="Order Details">
            <div className="flex w-full items-start gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <TaskInfoRow label="Cement Grade" value={`${live.grade} (EN 197-1)`} />
                <TaskInfoRow label="Supply Method" value="Silo tanker · pneumatic" />
                <TaskInfoRow label="Plant" value="Jebel Ali Cement Terminal" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <TaskInfoRow label="Tonnage" value={`${live.tonnage} t`} />
                <TaskInfoRow label="Total (incl. 5% VAT)" value={live.totalAed} />
                <TaskInfoRow label="Site" value={live.site} />
              </div>
            </div>
          </TaskSection>
          <TaskSection title="Weighbridge">
            <div className="flex w-full items-start gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <TaskInfoRow label="Ticket" value={live.step >= 6 ? 'WB-88421' : 'Pending'} />
                <TaskInfoRow label="Tare" value={live.step >= 4 ? '14,200 kg' : '—'} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <TaskInfoRow label="Gross" value={live.step >= 6 ? '44,200 kg' : '—'} />
                <TaskInfoRow label="Net" value={live.step >= 6 ? '30,000 kg' : '—'} />
              </div>
            </div>
          </TaskSection>
          {live.step >= 11 ? (
            <TaskSection title="Tax Invoice">
              <div className="flex w-full items-start gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <TaskInfoRow label="Invoice" value={`TAX-${live.id.replace('ORD-', '')}`} />
                  <TaskInfoRow label="Compliance" value="PINT-AE · FTA stamped" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <TaskInfoRow label="Settlement" value="Monthly statement (NET-30)" />
                </div>
              </div>
            </TaskSection>
          ) : null}
        </TaskDetail>
      );
    },
  }),
};

/* ── live monitoring (Dubai) ─────────────────────────────────────────── */

const PLANT: LatLng = [25.0181, 55.0965]; // Jebel Ali Cement Terminal
const SITE: LatLng = [24.9614, 55.1517]; // Expo City Dubai · District 2B

const cementMonitoring: MonitoringModuleData = {
  center: [25.0, 55.13],
  zoom: 12,
  listTitle: 'Tankers',
  liveBadge: { label: 'ORD-7812 arriving', countdownFromSec: 12 * 60 },
  legend: [
    { label: 'In transit', color: '#12B76A' },
    { label: 'Loading', color: '#F79009' },
    { label: 'Plant · Site', color: '#98A2B3' },
  ],
  // Real road geometry from Jebel Ali → Expo City; the en-route tanker creeps
  // along it live (animateMarkerId).
  routes: [{ id: 'r-7812', points: [PLANT, SITE], osrm: true, dashed: true, color: '#0072D6', animateMarkerId: 'ORD-7812' }],
  entities: [
    // Origin / destination anchors (kind plant/site → excluded from the list).
    { id: 'plant', position: PLANT, status: 'idle', kind: 'plant', mapLabel: 'Jebel Ali Terminal', title: 'Jebel Ali Cement Terminal' },
    { id: 'site-expo', position: SITE, status: 'reporting', kind: 'site', mapLabel: 'Expo City · 2B', title: 'Expo City Dubai · District 2B' },
    // Active tankers.
    {
      id: 'ORD-7812',
      position: [25.05, 55.18],
      status: 'reporting',
      statusLabel: 'In transit',
      kind: 'vehicle',
      live: true,
      heading: 150,
      mapLabel: 'D-4536',
      title: 'D-4536 · Waqar Ahmed',
      subtitle: 'ORD-7812 · 30t OPC 42.5N',
      metric: '54 km/h',
      metricSub: 'ETA 12 min',
      avatarFallback: 'WA',
      tooltip: 'D-4536 · ORD-7812 · In transit to Expo City',
      telemetry: [
        { label: 'Order', value: 'ORD-7812' },
        { label: 'Speed', value: '54 km/h' },
        { label: 'ETA', value: '12 min' },
        { label: 'Customer', value: 'Al-Rashid' },
        { label: 'Net load', value: '30,000 kg' },
        { label: 'Driver', value: 'Waqar Ahmed' },
      ],
      toDetail: () => orderData.toDetail!(orderData.rows.find((o) => o.id === 'ORD-7812')!),
    },
    {
      id: 'ORD-7810',
      position: [25.02, 55.11],
      status: 'warning',
      statusLabel: 'Loading',
      kind: 'vehicle',
      heading: 0,
      mapLabel: 'D-4536',
      title: 'D-7720 · Imran S.',
      subtitle: 'ORD-7810 · 30t SRC 42.5N',
      metric: '0 km/h',
      metricSub: 'Loading bay 2',
      avatarFallback: 'IS',
      tooltip: 'Loading bay 2 · ORD-7810',
      telemetry: [
        { label: 'Order', value: 'ORD-7810' },
        { label: 'Status', value: 'Loading' },
        { label: 'Bay', value: 'Bay 2' },
        { label: 'Customer', value: 'Binladin Marine' },
      ],
      toDetail: () => orderData.toDetail!(orderData.rows.find((o) => o.id === 'ORD-7810')!),
    },
  ],
};

/* ── finance dashboard ───────────────────────────────────────────────── */

function FinanceDashboard() {
  const byGrade = ['OPC 42.5N', 'OPC 52.5N', 'SRC 42.5N', 'PPC 42.5N'].map((g, i) => ({
    name: g,
    value: ORDERS.filter((o) => o.grade === g).length,
    color: [`var(--chart-1)`, `var(--chart-3)`, `var(--chart-4)`, `var(--chart-2)`][i],
  }));
  const weekly = [
    { week: 'W3 Jan', aed: 96 },
    { week: 'W4 Jan', aed: 118 },
    { week: 'W1 Feb', aed: 104 },
    { week: 'W2 Feb', aed: 141 },
    { week: 'W3 Feb', aed: 59 },
  ];
  return (
    <Dashboard
      dateLabel="February 2026"
      ranges={['This Week', 'This Month', 'This Quarter', 'All Time']}
      kpis={[
        { label: 'Orders', value: ORDERS.length, icon: <ClipboardList size={18} /> },
        { label: 'Tonnes Delivered', value: '58', unit: 't', trend: 'up', trendValue: '+12%', icon: <Scale size={18} /> },
        { label: 'Revenue (MTD)', value: 'AED 59.8k', trend: 'up', trendValue: '+9%', icon: <Banknote size={18} /> },
        { label: 'Outstanding (NET-30)', value: 'AED 23.9k', icon: <Receipt size={18} />, iconBg: 'rgba(247,144,9,0.12)', iconColor: '#f79009' },
        { label: 'Active Tankers', value: 1, icon: <TruckIcon size={18} /> },
      ]}
      sections={[
        { id: 'rev', title: 'Weekly Revenue (AED k)', icon: <BarChart3 size={16} />, span: 7, children: <BarChart data={weekly} xKey="week" series={[{ dataKey: 'aed', name: 'AED (k)' }]} height={260} /> },
        { id: 'grade', title: 'Orders by Grade', icon: <PieChart size={16} />, span: 5, children: <DonutChart data={byGrade} height={260} centerLabel={<span className="text-h6 font-semibold">{ORDERS.length}</span>} /> },
      ]}
    />
  );
}

/* ── app config ──────────────────────────────────────────────────────── */

export const cementApp: AppConfig = {
  id: 'cement',
  brand: { name: 'Cement Delivery OS', icon: Factory },
  user: { name: 'Omar Haddad', email: 'omar@fams.ae', role: 'Operations Manager', avatarFallback: 'OH' },
  collectiveInbox: {
    notificationDot: true,
    render: () => (
      <InboxView
        data={{
          notifications: [
            { id: 'c1', title: 'ORD-7812 in transit', description: 'D-4536 departed Jebel Ali — ETA Expo City 42 min.', source: 'Orders', severity: 'info', timestamp: '18m ago', unread: true },
            { id: 'c2', title: 'POD issued for ORD-7811', description: 'Tax invoice TAX-7811 stamped and sent (PINT-AE).', source: 'Finance', severity: 'success', timestamp: '2h ago', unread: true },
            { id: 'c3', title: 'Statement due in 5 days', description: 'Al-Rashid Construction · AED 21,042 · NET-30.', source: 'Finance', severity: 'warning', timestamp: 'Yesterday' },
          ],
        }}
      />
    ),
  },
  modules: [
    {
      id: 'orders',
      type: 'entity',
      label: 'Orders',
      icon: Package,
      data: orderData,
      tabs: [
        { id: 'list', kind: 'list', label: 'List View' },
        { id: 'grouped', kind: 'grouped-list', label: 'Grouped List' },
      ],
      create: {
        // The demo's 4-step order flow with LIVE pricing in the footer:
        // Who is it for? → Cement & supply → Where and when? → Credit check.
        render: (close, actions) => {
          const schema: SteppedFormSchema = {
            title: 'Create Order',
            description: 'New bulk cement order (silo tanker, pneumatic discharge).',
            submitLabel: 'Create order',
            summary: (v) => {
              const total = orderTotal(v);
              return total ? (
                <span>
                  Order total <span className="font-semibold text-primary">AED {total.toLocaleString()}</span>
                  <span className="text-muted-foreground"> incl. 5% VAT · NET-30</span>
                </span>
              ) : (
                <span className="text-muted-foreground">Pick a grade and tonnage to price the order</span>
              );
            },
            steps: [
              {
                id: 'customer',
                title: 'Who is it for?',
                fields: [
                  {
                    key: 'customer',
                    label: 'Customer',
                    type: 'picker',
                    required: true,
                    placeholder: 'Choose a customer…',
                    span: 2,
                    pickerOptions: CEMENT_CUSTOMERS.map((c) => ({
                      value: c.name,
                      label: c.name,
                      subtitle: c.trn,
                      avatarFallback: c.name.split(' ').map((w) => w[0]).join('').slice(0, 2),
                      avatarColor: '#0072d6',
                    })),
                    createNew: {
                      label: 'customer',
                      fields: [
                        { key: 'name', label: 'Company name', required: true, span: 2 },
                        { key: 'trn', label: 'TRN', span: 2 },
                      ],
                      map: (nv) => ({
                        value: nv.name || 'New customer',
                        label: nv.name || 'New customer',
                        subtitle: nv.trn || 'TRN pending',
                        avatarFallback: (nv.name || 'NC').split(' ').map((w) => w[0]).join('').slice(0, 2),
                        avatarColor: '#0072d6',
                      }),
                      onCreate: (nv) => {
                        CEMENT_CUSTOMERS.push({ id: `CU-${CEMENT_CUSTOMERS.length + 1}`, name: nv.name || 'New customer', trn: nv.trn || 'TRN pending' });
                      },
                    },
                  },
                ],
              },
              {
                id: 'cement',
                title: 'Cement & supply',
                fields: [
                  { key: 'grade', label: 'Cement grade', type: 'select', required: true, options: [{ label: 'OPC 42.5N — AED 380/t', value: 'OPC 42.5N' }, { label: 'OPC 52.5N — AED 420/t', value: 'OPC 52.5N' }, { label: 'SRC 42.5N — AED 460/t', value: 'SRC 42.5N' }, { label: 'PPC 42.5N — AED 360/t', value: 'PPC 42.5N' }] },
                  { key: 'tonnage', label: 'Tonnage (22–30t)', type: 'number', required: true, placeholder: '30' },
                ],
                validate: (v) => {
                  const t = Number(v.tonnage);
                  return t >= 22 && t <= 30 ? null : 'Tonnage must be between 22 and 30 tonnes (one silo tanker).';
                },
              },
              {
                id: 'site',
                title: 'Where and when?',
                fields: [
                  { key: 'site', label: 'Delivery site', required: true, span: 2 },
                  { key: 'slot', label: 'Delivery slot', placeholder: 'e.g. 21 Feb, 08:00–10:00' },
                ],
              },
              {
                id: 'credit',
                title: 'Credit check',
                fields: [
                  { key: 'po', label: 'Customer PO (optional)', placeholder: 'PO number', span: 2 },
                ],
                validate: (v) => (orderTotal(v) ? null : 'Go back and complete grade and tonnage first.'),
              },
            ],
          };
          return (
            <SteppedSchemaForm
              schema={schema}
              onCancel={close}
              onSubmit={(v) => {
                orderSeq += 1;
                const grade = v.grade || 'OPC 42.5N';
                const tonnage = Math.min(30, Math.max(22, Number(v.tonnage) || 30));
                const total = orderTotal(v) ?? Math.round(tonnage * GRADE_RATES[grade] * 1.05);
                orderData.rows = [
                  {
                    id: `ORD-${orderSeq}`,
                    customer: v.customer || 'New customer',
                    grade,
                    tonnage,
                    site: v.site || 'TBD',
                    totalAed: `AED ${total.toLocaleString()}`,
                    step: 0,
                    slot: v.slot || 'TBD',
                  },
                  ...orderData.rows,
                ];
                actions.refresh();
                close();
              }}
            />
          );
        },
      },
    },
    { id: 'monitoring', type: 'live-monitoring', label: 'Live Monitoring', icon: Radio, data: cementMonitoring },
    {
      id: 'finance',
      type: 'dashboard',
      label: 'Finance',
      icon: Banknote,
      tabKind: 'instance',
      tabs: [{ id: 'finance', label: 'Finance Overview', render: () => <FinanceDashboard /> }],
    },
  ],
};
