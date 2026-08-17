// Icons from the REAL V5 set (src/icons/v5).
import {
  Tool01,
  Cube01,
  Clipboard as ClipboardIcon,
  AlertTriangle,
  CheckCircle,
  BarChart03,
  PieChart01,
  Clock,
  MarkerPin01,
  Plus,
} from '../../icons';
import * as React from 'react';
import type { AppConfig, EntityModuleData, PipelineModuleData, SteppedFormSchema } from '../../components/app-shell';
import {
  InboxView, Dashboard, SteppedSchemaForm,
  TaskDetail, TaskSection, TaskInfoRow,
  EntityDetail, EntityDetailRow, EntityMetricCard, EntityChartCard, EntityListItem,
} from '../../components/app-shell';
import { Badge } from '../../components/primitives';
import { StatusTransitionDropdown } from '../../components/data-display';
import { ActivityFeed } from '../../components/widgets';
import type { FeedEntry } from '../../components/widgets';
import { BarChart, DonutChart, LineChart } from '../../components/data-viz';

/**
 * Ducon Industries — Phase II asset & maintenance management, composed from
 * the kit. Reference: `Code/ducon-demo` (factory machines + heavy vehicles
 * across two plants, work-order pipeline, lifecycle cost reporting). Amber
 * industrial brand to distinguish it from Truemax on the rail.
 */

interface DuconAsset {
  id: string;
  name: string;
  category: string;
  plant: 'Plant 1 — Mussafah' | 'Plant 2 — ICAD';
  kind: 'Factory Machine' | 'Vehicle';
  status: 'Running' | 'Idle' | 'Down';
  hours: number;
}

const DUCON_ASSETS: DuconAsset[] = [
  { id: 'DC-101', name: 'CNC Milling Center M-400', category: 'Machining', plant: 'Plant 1 — Mussafah', kind: 'Factory Machine', status: 'Running', hours: 12480 },
  { id: 'DC-102', name: 'Press Brake PB-220', category: 'Forming', plant: 'Plant 1 — Mussafah', kind: 'Factory Machine', status: 'Down', hours: 9320 },
  { id: 'DC-103', name: 'Powder Coating Line PC-3', category: 'Finishing', plant: 'Plant 1 — Mussafah', kind: 'Factory Machine', status: 'Running', hours: 15890 },
  { id: 'DC-104', name: 'Overhead Crane OC-10t', category: 'Lifting', plant: 'Plant 2 — ICAD', kind: 'Factory Machine', status: 'Idle', hours: 7210 },
  { id: 'DC-105', name: 'Forklift FL-3T-08', category: 'Material Handling', plant: 'Plant 2 — ICAD', kind: 'Vehicle', status: 'Running', hours: 4150 },
  { id: 'DC-106', name: 'Delivery Truck DT-12', category: 'Logistics', plant: 'Plant 2 — ICAD', kind: 'Vehicle', status: 'Running', hours: 6840 },
];

const duconStatusBadge = (s: DuconAsset['status']) =>
  s === 'Running' ? 'success' : s === 'Idle' ? 'warning' : 'destructive';
const duconStatusPill = (s: DuconAsset['status']) =>
  s === 'Running' ? '#12b76a' : s === 'Idle' ? '#f79009' : '#f04438';

const DUCON_STAGES = [
  { id: 'new', label: 'New Requests', color: '#f79009' },
  { id: 'scheduled', label: 'Scheduled', color: '#f12cc6' },
  { id: 'in-progress', label: 'In Progress', color: '#b54708' },
  { id: 'inspection', label: 'Under Inspection', color: '#ab47bc' },
  { id: 'closed', label: 'Closed', color: '#2aaa48' },
];

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; flagFill: string; flagStroke: string }> = {
  High: { bg: '#fef3f2', text: '#f04438', flagFill: '#F04438', flagStroke: '#F04438' },
  Medium: { bg: '#fffaeb', text: '#f79009', flagFill: '#F79009', flagStroke: '#F79009' },
  Low: { bg: '#ecfdf3', text: '#12b76a', flagFill: '#12B76A', flagStroke: '#12B76A' },
};
const TYPE_CONFIG: Record<string, { bg: string; text: string }> = {
  PREVENTIVE: { bg: '#fffaeb', text: '#f79009' },
  CORRECTIVE: { bg: '#ecfdf3', text: '#12b76a' },
};

function UnassignedAdd() {
  return (
    <span className="inline-flex size-6 items-center justify-center rounded-full border border-dashed border-primary/50 text-primary" title="Assign technician">
      <Plus size={12} />
    </span>
  );
}

const duconAssetById = new Map(DUCON_ASSETS.map((a) => [a.id, a]));
let duconWoSeq = 8;

/* ── per-WO activity feeds + shared badge chips ──────────────────────── */

const DUCON_TECHS = [
  { id: 'r', name: 'Rashid Karim', role: 'Maintenance Supervisor', avatarFallback: 'RK', color: '#b54708' },
  { id: 's', name: 'Sanjay Pillai', role: 'Line Technician', avatarFallback: 'SP', color: '#0072d6' },
];
const DUCON_FEED = new Map<string, FeedEntry[]>();
function duconFeed(id: string, dateLabel?: string): FeedEntry[] {
  if (!DUCON_FEED.has(id)) {
    DUCON_FEED.set(id, [{ kind: 'system', id: `${id}-sys`, text: 'Work order created', timestamp: dateLabel }]);
  }
  return DUCON_FEED.get(id)!;
}

function DuconStatusBadge({ label, bg }: { label: string; bg: string }) {
  return (
    <span className="inline-flex items-center rounded-[2px] px-1.5 py-1 text-caption font-semibold uppercase tracking-[0.5px] text-white" style={{ background: bg }}>
      {label}
    </span>
  );
}
function DuconTypeChip({ type, cfg }: { type: string; cfg?: { bg: string; text: string } }) {
  return (
    <span className="inline-flex items-center rounded-[3px] px-1.5 py-0.5 text-caption font-bold uppercase tracking-[0.3px]" style={{ background: cfg?.bg ?? '#f2f4f7', color: cfg?.text ?? '#667085' }}>
      {type}
    </span>
  );
}

const duconAssetWoCards = (assetId: string) =>
  duconPipeline.cards.filter((c) => c.metadataFields?.some((f) => f.value === assetId));

const duconPipeline: PipelineModuleData = {
  stages: DUCON_STAGES,
  filterField: { label: 'Priority', get: (c) => String(c.priority ?? '') },
  onCardMove: (cardId, toStageId) => {
    duconPipeline.cards = duconPipeline.cards.map((c) =>
      c.id === cardId ? { ...c, stageId: toStageId } : c
    );
  },
  cards: [
    { asset: 'DC-102', stage: 'new', title: 'Hydraulic ram leaking — press brake', priority: 'High', type: 'CORRECTIVE', date: '18 Feb, 2026', overdue: false, unassigned: true },
    { asset: 'DC-101', stage: 'scheduled', title: 'Spindle bearing replacement', priority: 'Medium', type: 'PREVENTIVE', date: '20 Feb, 2026', overdue: false, av: { letter: 'R', color: '#b54708' } },
    { asset: 'DC-103', stage: 'in-progress', title: 'Oven temperature drift calibration', priority: 'High', type: 'CORRECTIVE', date: '16 Feb, 2026', overdue: true, av: { letter: 'S', color: '#0072d6' } },
    { asset: 'DC-104', stage: 'in-progress', title: 'Hoist brake inspection', priority: 'Medium', type: 'PREVENTIVE', date: '17 Feb, 2026', overdue: false, av: { letter: 'R', color: '#b54708' } },
    { asset: 'DC-105', stage: 'inspection', title: 'Mast chain tension check', priority: 'Low', type: 'PREVENTIVE', date: '15 Feb, 2026', overdue: false, av: { letter: 'M', color: '#ab47bc' } },
    { asset: 'DC-106', stage: 'closed', title: 'Brake pad replacement', priority: 'Medium', type: 'CORRECTIVE', date: '12 Feb, 2026', overdue: false, av: { letter: 'S', color: '#0072d6' } },
  ].map((w, i) => {
    const a = duconAssetById.get(w.asset);
    return {
      id: `DWO-${100 + i}`,
      stageId: w.stage,
      ticketId: `#DWO-${100 + i}`,
      title: w.title,
      priority: w.priority,
      priorityConfig: PRIORITY_CONFIG[w.priority],
      type: w.type,
      typeConfig: TYPE_CONFIG[w.type],
      metadataFields: a
        ? [
            { icon: 'Container', value: a.name },
            { icon: 'Tag', value: a.id },
            { icon: 'MapPin', value: a.plant },
          ]
        : [],
      dateLabel: w.date,
      isOverdue: w.overdue,
      assignedAvatar: w.av,
      isUnassigned: w.unassigned,
      unassignedSlot: w.unassigned ? <UnassignedAdd /> : undefined,
    };
  }),
  columns: [
    { id: 'ticket', header: 'WO #', accessor: (c) => c.ticketId },
    { id: 'title', header: 'Title', accessor: (c) => c.title },
    { id: 'type', header: 'Type', accessor: (c) => c.type },
    { id: 'stage', header: 'Stage', accessor: (c) => DUCON_STAGES.find((s) => s.id === c.stageId)?.label },
    { id: 'due', header: 'Due', accessor: (c) => c.dateLabel },
  ],
  // STANDARD task detail (TaskDetail — same layout as the Workshop app).
  toDetail: (card) => ({
    id: card.id,
    category: 'Work Order',
    label: card.ticketId ?? card.id,
    render: (actions) => {
      const live = duconPipeline.cards.find((c) => c.id === card.id) ?? card;
      const asset = duconAssetById.get(String(live.metadataFields?.[1]?.value ?? ''));
      const mutate = (patch: Partial<typeof live>) => {
        duconPipeline.cards = duconPipeline.cards.map((c) =>
          c.id === live.id ? { ...c, ...patch } : c
        );
        actions.refresh();
      };
      return (
        <TaskDetail
          ticketId={String(live.ticketId ?? live.id).replace(/^#/, '')}
          moduleLabel="Maintenance"
          title={String(live.title ?? '')}
          status={
            <StatusTransitionDropdown
              stages={DUCON_STAGES.map((s) => ({
                id: s.id,
                label: s.label,
                color: s.color,
                ...(s.id === 'closed'
                  ? { guard: { title: 'Close work order', description: 'A completion note is required for the plant log.', reasonLabel: 'Completion note', confirmLabel: 'Close work order' } }
                  : {}),
              }))}
              currentId={live.stageId}
              onTransition={(toId, reason) => {
                mutate({ stageId: toId });
                if (reason) duconFeed(live.id).push({ kind: 'system', id: `${live.id}-${toId}`, text: `Closed — ${reason}`, timestamp: 'now' });
              }}
            />
          }
          cancel={
            live.stageId !== 'closed'
              ? {
                  onConfirm: (reason) => {
                    mutate({ stageId: 'closed' });
                    duconFeed(live.id).push({ kind: 'system', id: `${live.id}-cancel`, text: `Work order cancelled — ${reason}`, timestamp: 'now' });
                  },
                }
              : undefined
          }
          details={{
            left: [
              {
                label: 'Maintenance Type',
                value: <DuconTypeChip type={String(live.type ?? '')} cfg={live.typeConfig} />,
              },
              { label: 'Creation Date', value: '10 Feb 2026' },
              {
                label: 'Due Date',
                value: (
                  <span className={live.isOverdue && live.stageId !== 'closed' ? 'text-[14px] font-semibold text-destructive' : 'text-[14px] font-semibold text-foreground'}>
                    {live.dateLabel ?? '—'}
                  </span>
                ),
              },
              { label: 'Plant Location', value: asset?.plant ?? String(live.metadataFields?.[2]?.value ?? '—') },
            ],
            right: [
              {
                label: 'Priority',
                value: (
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden className="size-2.5 rounded-[2px]" style={{ background: live.priorityConfig?.flagFill ?? '#98a2b3' }} />
                    <span className="text-[14px] font-semibold text-foreground">{String(live.priority ?? '—')}</span>
                  </span>
                ),
              },
              {
                label: 'Assigned Technician',
                value: live.assignedAvatar ? (
                  <span className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-full text-[12px] font-semibold text-white" style={{ background: live.assignedAvatar.color }}>
                      {live.assignedAvatar.letter}
                    </span>
                    <span className="text-[14px] font-semibold text-foreground">Technician {live.assignedAvatar.letter}</span>
                  </span>
                ) : (
                  <span className="text-[14px] font-semibold text-muted-foreground">Unassigned</span>
                ),
              },
            ],
          }}
          timeline={
            <ActivityFeed
              className="h-full"
              entries={duconFeed(live.id, live.dateLabel)}
              users={DUCON_TECHS}
              onSubmit={(text, attachments) => {
                duconFeed(live.id).push({
                  kind: 'comment',
                  id: `${live.id}-c${duconFeed(live.id).length}`,
                  author: 'Rashid Karim',
                  avatarFallback: 'RK',
                  avatarColor: '#b54708',
                  timestamp: 'now',
                  text,
                  attachments,
                  isCurrentUser: true,
                });
                actions.refresh();
              }}
            />
          }
        >
          <TaskSection title="Asset Details">
            <div className="flex w-full items-start gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <TaskInfoRow label="Name" value={asset?.name ?? String(live.metadataFields?.[0]?.value ?? '—')} />
                <TaskInfoRow label="Operating Hours" value={asset ? `${asset.hours.toLocaleString()} hrs` : '—'} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <TaskInfoRow label="Plant" value={asset?.plant ?? '—'} />
                <TaskInfoRow
                  label="Status"
                  value={asset ? <DuconStatusBadge label={asset.status} bg={duconStatusPill(asset.status)} /> : '—'}
                />
              </div>
            </div>
          </TaskSection>
        </TaskDetail>
      );
    },
  }),
};

const duconAssetData: EntityModuleData<DuconAsset> = {
  columns: [
    { id: 'name', header: 'Asset', accessor: (r) => r.name, sortable: true },
    { id: 'kind', header: 'Kind', accessor: (r) => r.kind },
    { id: 'category', header: 'Category', accessor: (r) => r.category },
    { id: 'plant', header: 'Plant', accessor: (r) => r.plant },
    { id: 'status', header: 'Status', cell: (r) => <Badge variant={duconStatusBadge(r.status)} size="sm">{r.status}</Badge> },
    { id: 'hours', header: 'Operating Hours', align: 'right', accessor: (r) => `${r.hours.toLocaleString()} hrs` },
  ],
  rows: DUCON_ASSETS,
  getRowId: (r) => r.id,
  filterField: { label: 'Plant', get: (r) => r.plant },
  searchText: (r) => `${r.name} ${r.id} ${r.category} ${r.plant} ${r.kind}`,
  toListItem: (r) => ({ id: r.id, title: r.name, subtitle: `${r.category} · ${r.plant}`, trailing: <Badge variant={duconStatusBadge(r.status)} size="sm">{r.status}</Badge> }),
  // STANDARD entity detail (EntityDetail — same layout as Workshop assets).
  toDetail: (r) => ({
    id: r.id,
    category: 'Asset',
    label: r.name,
    render: () => {
      const woCards = duconAssetWoCards(r.id);
      const open = woCards.filter((c) => c.stageId !== 'closed').length;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const hoursTrend = months.map((m, i) => ({
        month: m,
        hours: Math.round((r.hours / 14) * (0.8 + ((r.hours + i * 31) % 10) / 25)),
      }));
      return (
        <EntityDetail
          avatarFallback={r.id.replace('DC-', '')}
          avatarColor={r.status === 'Down' ? '#f04438' : '#b54708'}
          statusOverlay={<DuconStatusBadge label={r.status} bg={duconStatusPill(r.status)} />}
          name={r.name}
          entityId={r.id}
          categoryBadge={
            <span className="inline-flex items-center rounded-[4px] bg-secondary px-2 py-[3px] text-caption font-bold uppercase tracking-[0.3px] text-primary">
              {r.category}
            </span>
          }
          infoTitle="Equipment Details"
          info={[
            { label: 'Operating Hours', value: `${r.hours.toLocaleString()} hrs` },
            { label: 'Kind', value: r.kind },
            { label: 'Category', value: r.category },
            { label: 'Plant', value: r.plant },
            { label: 'Status', value: r.status },
            { label: 'Open Work Orders', value: String(open) },
          ]}
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              render: () => (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-3 gap-3">
                    <EntityMetricCard label="Operating Hours" value={r.hours.toLocaleString()} sub="hrs total" />
                    <EntityMetricCard label="Open Work Orders" value={open} sub={`${woCards.length - open} completed`} />
                    <EntityMetricCard label="Plant">
                      <p className="text-[14px] font-semibold text-foreground">{r.plant}</p>
                      <div className="mt-1.5">
                        <DuconStatusBadge label={r.status} bg={duconStatusPill(r.status)} />
                      </div>
                    </EntityMetricCard>
                  </div>
                  <EntityChartCard title="Operating Hours Trend" subtitle="Monthly operating hours this year">
                    <LineChart data={hoursTrend} xKey="month" height={180} series={[{ dataKey: 'hours', name: 'Hours' }]} />
                  </EntityChartCard>
                  <EntityChartCard title="Recent Work Orders" subtitle="Latest maintenance activities for this asset">
                    {woCards.slice(0, 4).map((c, i, arr) => (
                      <EntityListItem
                        key={c.id}
                        leading={<DuconTypeChip type={String(c.type ?? '')} cfg={c.typeConfig} />}
                        title={String(c.title ?? '')}
                        trailing={
                          <>
                            <span className="text-caption font-medium text-muted-foreground">{c.dateLabel}</span>
                            <DuconStatusBadge
                              label={(DUCON_STAGES.find((s) => s.id === c.stageId)?.label ?? '—').toUpperCase()}
                              bg={DUCON_STAGES.find((s) => s.id === c.stageId)?.color ?? '#667085'}
                            />
                          </>
                        }
                        borderBottom={i < arr.length - 1}
                      />
                    ))}
                    {!woCards.length ? <p className="py-4 text-center text-[12px] text-muted-foreground">No events recorded</p> : null}
                  </EntityChartCard>
                </div>
              ),
            },
            {
              id: 'details',
              label: 'Details',
              render: () => (
                <div className="grid grid-cols-2 gap-x-8">
                  <div>
                    <EntityDetailRow label="Category" value={r.category} />
                    <EntityDetailRow label="Kind" value={r.kind} />
                    <EntityDetailRow label="Operating Hours" value={`${r.hours.toLocaleString()} hrs`} borderBottom={false} />
                  </div>
                  <div>
                    <EntityDetailRow label="Plant" value={r.plant} />
                    <EntityDetailRow label="Status" value={r.status} />
                    <EntityDetailRow label="Asset ID" value={r.id} borderBottom={false} />
                  </div>
                </div>
              ),
            },
          ]}
        />
      );
    },
  }),
};

function DuconDashboard() {
  const open = duconPipeline.cards.filter((c) => c.stageId !== 'closed').length;
  const byStage = DUCON_STAGES.map((s) => ({ stage: s.label, count: duconPipeline.cards.filter((c) => c.stageId === s.id).length }));
  const byKind = [
    { name: 'Factory Machines', value: DUCON_ASSETS.filter((a) => a.kind === 'Factory Machine').length, color: 'var(--chart-1)' },
    { name: 'Vehicles', value: DUCON_ASSETS.filter((a) => a.kind === 'Vehicle').length, color: 'var(--chart-3)' },
  ];
  return (
    <Dashboard
      dateLabel="February 2026"
      ranges={['Last 7 Days', 'Last 30 Days', 'This Quarter']}
      kpis={[
        { label: 'Open Work Orders', value: open, icon: <ClipboardIcon size={18} /> },
        { label: 'Assets Down', value: DUCON_ASSETS.filter((a) => a.status === 'Down').length, icon: <AlertTriangle size={18} />, iconBg: 'rgba(240,68,56,0.1)', iconColor: 'var(--destructive)' },
        { label: 'Assets Running', value: DUCON_ASSETS.filter((a) => a.status === 'Running').length, icon: <CheckCircle size={18} /> },
        { label: 'Plants', value: 2, icon: <MarkerPin01 size={18} /> },
      ]}
      sections={[
        { id: 'stage', title: 'Work Orders by Stage', icon: <BarChart03 size={16} />, span: 7, children: <BarChart data={byStage} xKey="stage" series={[{ dataKey: 'count', name: 'Work Orders' }]} height={260} /> },
        { id: 'kind', title: 'Fleet Composition', icon: <PieChart01 size={16} />, span: 5, children: <DonutChart data={byKind} height={260} centerLabel={<span className="text-h6 font-semibold">{DUCON_ASSETS.length}</span>} /> },
      ]}
    />
  );
}

function LifecycleCostReport() {
  const data = DUCON_ASSETS.map((a) => ({ asset: a.id, hours: a.hours }));
  return (
    <Dashboard
      sections={[
        { id: 'lc', title: 'Asset Lifecycle — Operating Hours', icon: <BarChart03 size={16} />, span: 12, children: <BarChart data={data} xKey="asset" series={[{ dataKey: 'hours', name: 'Hours', color: 'var(--chart-3)' }]} height={320} /> },
      ]}
    />
  );
}

export const duconApp: AppConfig = {
  id: 'ducon',
  brand: {
    name: 'Ducon Industries',
    icon: Tool01,
    theme: {
      '--primary': '#B54708',
      '--primary-foreground': '#FFFFFF',
      '--secondary': '#FEF0C7',
      '--secondary-foreground': '#B54708',
      '--accent': '#B54708',
      '--ring': '#FEF0C7',
      '--sidebar': '#7A2E0E',
    },
  },
  user: { name: 'Rashid Karim', email: 'rashid@ducon.ae', role: 'Maintenance Supervisor', avatarFallback: 'RK' },
  collectiveInbox: {
    notificationDot: true,
    render: () => (
      <InboxView
        data={{
          notifications: [
            { id: 'd1', title: 'Press brake DOWN', description: 'DC-102 hydraulic ram leaking — production halted on line 2.', source: 'Maintenance', severity: 'error', timestamp: '25m ago', unread: true },
            { id: 'd2', title: 'Calibration overdue', description: 'Powder coating oven temperature drift exceeds tolerance.', source: 'Maintenance', severity: 'warning', timestamp: '2h ago', unread: true },
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
      tabs: [{ id: 'ops', label: 'Plant Operations', render: () => <DuconDashboard /> }],
    },
    {
      id: 'maintenance',
      type: 'pipeline',
      label: 'Maintenance',
      data: duconPipeline,
      tabs: [
        { id: 'kanban', kind: 'kanban', label: 'Kanban View' },
        { id: 'list', kind: 'list', label: 'List View' },
      ],
      create: {
        // Multi-step creation (Basic Info → Select Equipment), per the demo.
        render: (close, actions) => {
          const schema: SteppedFormSchema = {
            title: 'Create Work Order',
            description: 'Raise a maintenance request.',
            submitLabel: 'Create work orders',
            summary: (v) => {
              const n = (v.assets ?? '').split(',').filter(Boolean).length;
              return n ? (
                <span><span className="font-semibold text-primary">{n}</span> work order{n === 1 ? '' : 's'} will be created</span>
              ) : (
                <span className="text-muted-foreground">No equipment selected yet</span>
              );
            },
            steps: [
              {
                id: 'basic',
                title: 'Basic Info',
                fields: [
                  { key: 'title', label: 'Title', required: true, span: 2 },
                  { key: 'type', label: 'Type', type: 'select', options: [{ label: 'Preventive', value: 'PREVENTIVE' }, { label: 'Corrective', value: 'CORRECTIVE' }] },
                  { key: 'priority', label: 'Priority', type: 'select', options: [{ label: 'High', value: 'High' }, { label: 'Medium', value: 'Medium' }, { label: 'Low', value: 'Low' }] },
                ],
              },
              {
                id: 'equipment',
                title: 'Select Equipment',
                fields: [
                  {
                    key: 'assets',
                    label: 'Equipment',
                    type: 'multi-picker',
                    placeholder: 'Search and select equipment…',
                    span: 2,
                    pickerOptions: DUCON_ASSETS.map((a) => ({
                      value: a.id,
                      label: a.name,
                      subtitle: `${a.category} · ${a.plant}`,
                      avatarFallback: a.id.replace('DC-', ''),
                      avatarColor: a.status === 'Down' ? '#f04438' : '#b54708',
                    })),
                  },
                ],
                validate: (v) =>
                  (v.assets ?? '').split(',').filter(Boolean).length ? null : 'Select at least one piece of equipment.',
              },
            ],
          };
          return (
            <SteppedSchemaForm
              schema={schema}
              onCancel={close}
              onSubmit={(v) => {
                const ids = (v.assets ?? '').split(',').filter(Boolean);
                const priority = v.priority || 'Medium';
                const type = v.type || 'CORRECTIVE';
                const newCards = ids.map((assetId) => {
                  duconWoSeq += 1;
                  const a = duconAssetById.get(assetId);
                  return {
                    id: `DWO-${100 + duconWoSeq}`,
                    stageId: 'new',
                    ticketId: `#DWO-${100 + duconWoSeq}`,
                    title: v.title || 'Untitled work order',
                    priority,
                    priorityConfig: PRIORITY_CONFIG[priority],
                    type,
                    typeConfig: TYPE_CONFIG[type],
                    metadataFields: a
                      ? [
                          { icon: 'Container', value: a.name },
                          { icon: 'Tag', value: a.id },
                          { icon: 'MapPin', value: a.plant },
                        ]
                      : [],
                    dateLabel: 'Unscheduled',
                    isUnassigned: true,
                    unassignedSlot: <UnassignedAdd />,
                  };
                });
                duconPipeline.cards = [...newCards, ...duconPipeline.cards];
                actions.refresh();
                close();
              }}
            />
          );
        },
      },
    },
    { id: 'assets', type: 'entity', label: 'Assets', data: duconAssetData },
    {
      id: 'reports',
      type: 'reports',
      label: 'Reports',
      tabKind: 'instance',
      tabs: [{ id: 'lifecycle', label: 'Lifecycle Costs', render: () => <LifecycleCostReport /> }],
    },
  ],
};
