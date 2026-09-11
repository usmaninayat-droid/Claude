import * as React from 'react';
// Icons from the REAL V5 set (src/icons/v5).
import {
  Tool02 as Wrench,
  Plus,
  Clipboard as ClipboardList,
  AlertTriangle,
  Cube01 as Boxes,
  CheckCircle as CheckCircle2,
  BarChart03 as BarChart3,
  PieChart01 as PieChart,
  Clock,
  MarkerPin01 as MapPin,
  Activity,
  Package as PackageOpen,
  CalendarCheck01 as CalendarClock,
} from '../../icons';
import type { AppConfig, EntityModuleData, PipelineModuleData, SteppedFormSchema } from '../../components/app-shell';
import {
  InboxView, Dashboard, RecordDetail, DetailSection, FieldGrid, SteppedSchemaForm,
  TaskDetail, TaskSection, TaskInfoRow, TaskToggleRow, BoxedField, BoxedTextarea, CollapsibleNote, AttachmentDrop,
  EntityDetail, EntityDetailRow, EntityMetricCard, EntityChartCard, EntityListItem,
} from '../../components/app-shell';
import type { EntityTag } from '../../components/app-shell';
import { Badge, Button } from '../../components/primitives';
import { StatePill, Timeline, StatusTransitionDropdown, PartsTable, ChecklistSection, DowntimeTimer, AssigneePicker } from '../../components/data-display';
import type { PartLine } from '../../components/data-display';
import { EntityProfileCard, ActivityFeed } from '../../components/widgets';
import type { FeedEntry, FeedUser } from '../../components/widgets';
import { KpiTile, BarChart, DonutChart, LineChart } from '../../components/data-viz';
import {
  ASSETS,
  ASSET_CENTER,
  ASSET_MARKERS,
  WORK_ORDERS,
  WO_STAGES,
  INVENTORY,
  WORKSHOP_NOTIFICATIONS,
  type Asset,
  type Part,
} from './sample-data';

const critBadge = (c: Asset['criticality']) =>
  c === 'Critical' ? 'destructive' : c === 'Medium' ? 'warning' : 'muted';
const statusBadge = (s: Asset['status']) =>
  s === 'Active' ? 'success' : s === 'Under Maintenance' ? 'warning' : 'muted';
const statusPillBg = (s: Asset['status']) =>
  s === 'Active' ? '#12b76a' : s === 'Under Maintenance' ? '#f79009' : '#667085';
const priorityBadge = (p?: string) =>
  p === 'High' ? 'destructive' : p === 'Medium' ? 'warning' : 'muted';
/** Due-date value style — red when overdue (demo DateDisplay). */
const cnDue = (red?: boolean) =>
  red ? 'text-[14px] font-semibold text-destructive' : 'text-[14px] font-semibold text-foreground';

/* ── Assets (Entity module — STANDARD entity detail view) ───────────── */

/** Per-asset managed tags (the demo's tag system). */
const ASSET_TAG_STATE = new Map<string, EntityTag[]>([
  ['EQ-001', [{ id: 't1', label: 'High Utilization' }]],
  ['EQ-005', [{ id: 't2', label: 'Night Shift' }]],
]);
const ASSET_TAG_SUGGESTIONS = ['High Utilization', 'Night Shift', 'Leased', 'Critical Spare', 'Due for Audit', 'All Vehicles'];
let assetTagSeq = 10;

/** WO cards belonging to an asset (metadata Tag chip carries the asset id). */
const assetWoCards = (assetId: string) =>
  pipelineData.cards.filter((c) => c.metadataFields?.some((f) => f.value === assetId));

const woStageColor = (stageId?: string) => WO_STAGES.find((s) => s.id === stageId)?.color ?? '#667085';
const woStageLabel = (stageId?: string) => {
  const label = WO_STAGES.find((s) => s.id === stageId)?.label ?? '—';
  return label === 'Closed' ? 'COMPLETED' : label.toUpperCase();
};

/** Demo badges (uppercase micro-pills). */
function EntityStatusBadge({ label, bg }: { label: string; bg: string }) {
  return (
    <span className="inline-flex items-center rounded-[2px] px-1.5 py-1 text-[10px] font-semibold uppercase tracking-[0.5px] text-white" style={{ background: bg }}>
      {label}
    </span>
  );
}
function TypeChip({ type, cfg }: { type: string; cfg?: { bg: string; text: string } }) {
  return (
    <span className="inline-flex items-center rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.3px]" style={{ background: cfg?.bg ?? '#f2f4f7', color: cfg?.text ?? '#667085' }}>
      {type}
    </span>
  );
}

/** Maintenance Log tab — search + filtered log table (demo). */
function AssetMaintenanceLog({ assetId }: { assetId: string }) {
  const [q, setQ] = React.useState('');
  const rows = assetWoCards(assetId).filter((c) =>
    `${c.title} ${c.ticketId} ${c.type}`.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="flex flex-col gap-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search maintenance log…"
        className="h-9 w-full max-w-sm rounded-[6px] border border-border bg-card px-3 text-[12px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="overflow-hidden rounded-[8px] border border-border">
        <div className="grid grid-cols-[90px_1fr_110px_90px_120px] gap-2 border-b border-border bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Type</span><span>Service</span><span>Due</span><span>Priority</span><span>Status</span>
        </div>
        {rows.map((c) => (
          <div key={c.id} className="grid grid-cols-[90px_1fr_110px_90px_120px] items-center gap-2 border-b border-border px-3 py-2 text-[12px] last:border-b-0 hover:bg-muted/30">
            <TypeChip type={String(c.type ?? '')} cfg={c.typeConfig} />
            <span className="truncate font-medium text-foreground">{c.title}</span>
            <span className="text-muted-foreground">{c.dateLabel}</span>
            <span className="flex items-center gap-1">
              <span aria-hidden className="size-2 rounded-[2px]" style={{ background: c.priorityConfig?.flagFill ?? '#98a2b3' }} />
              <span className="text-foreground">{String(c.priority ?? '—')}</span>
            </span>
            <EntityStatusBadge label={woStageLabel(c.stageId)} bg={woStageColor(c.stageId)} />
          </div>
        ))}
        {!rows.length ? <div className="px-3 py-4 text-center text-[12px] text-muted-foreground">No log entries.</div> : null}
      </div>
    </div>
  );
}

const assetData: EntityModuleData<Asset> = {
  columns: [
    { id: 'name', header: 'Asset', accessor: (r) => r.name, sortable: true },
    { id: 'category', header: 'Category', accessor: (r) => r.category },
    { id: 'plant', header: 'Plant', accessor: (r) => r.plant },
    { id: 'crit', header: 'Criticality', cell: (r) => <Badge variant={critBadge(r.criticality)} size="sm">{r.criticality}</Badge> },
    { id: 'status', header: 'Status', cell: (r) => <Badge variant={statusBadge(r.status)} size="sm">{r.status}</Badge> },
    { id: 'hours', header: 'Operating Hours', align: 'right', accessor: (r) => `${r.hours.toLocaleString()} hrs` },
  ],
  rows: ASSETS,
  getRowId: (r) => r.id,
  filterField: { label: 'Status', get: (r) => r.status },
  searchText: (r) => `${r.name} ${r.id} ${r.category} ${r.plant}`,
  map: { center: ASSET_CENTER, markers: ASSET_MARKERS },
  toListItem: (r) => ({ id: r.id, title: r.name, subtitle: `${r.category} · ${r.plant}`, trailing: <Badge variant={statusBadge(r.status)} size="sm">{r.status}</Badge> }),
  // STANDARD entity detail (faithful to the Make asset-detail design):
  // left identity panel (hero, status overlay, tags, Equipment Details rows)
  // + right underline tabs (Overview / Details / Maintenance Log).
  toDetail: (r) => ({
    id: r.id,
    category: 'Asset',
    label: r.name,
    render: (actions) => {
      const woCards = assetWoCards(r.id);
      const open = woCards.filter((c) => c.stageId !== 'closed').length;
      const closed = woCards.filter((c) => c.stageId === 'closed').length;
      // Deterministic monthly series derived from the asset's hours.
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const maintHistory = months.map((m, i) => ({
        month: m,
        Preventive: (r.hours + i * 7) % 3,
        Corrective: (r.hours + i * 13) % 2,
      }));
      const hoursTrend = months.map((m, i) => ({
        month: m,
        hours: Math.round((r.hours / 14) * (0.8 + ((r.hours + i * 31) % 10) / 25)),
      }));
      return (
        <EntityDetail
          avatarFallback={r.id.replace('EQ-', '')}
          avatarColor={r.criticality === 'Critical' ? '#b54708' : '#0072d6'}
          statusOverlay={<EntityStatusBadge label={r.status === 'Under Maintenance' ? 'MAINTENANCE' : r.status} bg={statusPillBg(r.status)} />}
          name={r.name}
          entityId={r.id}
          categoryBadge={
            <span className="inline-flex items-center rounded-[4px] bg-secondary px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.3px] text-primary">
              {r.category}
            </span>
          }
          tags={ASSET_TAG_STATE.get(r.id) ?? []}
          tagSuggestions={ASSET_TAG_SUGGESTIONS}
          onAddTag={(label) => {
            assetTagSeq += 1;
            ASSET_TAG_STATE.set(r.id, [...(ASSET_TAG_STATE.get(r.id) ?? []), { id: `t${assetTagSeq}`, label }]);
            actions.refresh();
          }}
          onRemoveTag={(tagId) => {
            ASSET_TAG_STATE.set(r.id, (ASSET_TAG_STATE.get(r.id) ?? []).filter((t) => t.id !== tagId));
            actions.refresh();
          }}
          infoTitle="Equipment Details"
          info={[
            { label: 'Operating Hours', value: `${r.hours.toLocaleString()} hrs` },
            { label: 'Model', value: `${r.category.split(' ')[0]}-${r.id.replace('EQ-', '')}X` },
            { label: 'Serial', value: `SN-${r.id.replace('EQ-', '')}88${r.hours % 97}` },
            { label: 'Category', value: r.category },
            { label: 'Plant', value: r.plant },
            { label: 'Location Area', value: 'Yard B — Service Bay 2' },
            { label: 'Criticality', value: r.criticality },
            { label: 'Last Service', value: '12 Jan, 2026' },
            { label: 'Linked Devices', value: '1' },
          ]}
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              render: () => (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-3 gap-3">
                    <EntityMetricCard label="Operating Hours" value={r.hours.toLocaleString()} sub="hrs total" />
                    <EntityMetricCard label="Open Work Orders" value={open} sub={`${closed} completed`} />
                    <EntityMetricCard label="Current Location">
                      <p className="text-[14px] font-semibold text-foreground">{r.plant}</p>
                      <p className="mt-0.5 text-[12px] font-medium text-muted-foreground">Yard B — Service Bay 2</p>
                      <div className="mt-1.5">
                        <EntityStatusBadge label={r.status === 'Under Maintenance' ? 'MAINTENANCE' : r.status} bg={statusPillBg(r.status)} />
                      </div>
                    </EntityMetricCard>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <EntityChartCard title="Maintenance History" subtitle="Work orders by month (Preventive vs Corrective)">
                      <BarChart data={maintHistory} xKey="month" height={180} series={[{ dataKey: 'Preventive', name: 'Preventive' }, { dataKey: 'Corrective', name: 'Corrective', color: '#f79009' }]} />
                    </EntityChartCard>
                    <EntityChartCard title="Operating Hours Trend" subtitle="Monthly operating hours this year">
                      <LineChart data={hoursTrend} xKey="month" height={180} series={[{ dataKey: 'hours', name: 'Hours' }]} />
                    </EntityChartCard>
                  </div>
                  <EntityChartCard title="Recent Work Orders" subtitle="Latest maintenance activities for this asset" icon={<Wrench size={14} className="text-primary" />}>
                    {woCards.slice(0, 4).map((c, i, arr) => (
                      <EntityListItem
                        key={c.id}
                        leading={<TypeChip type={String(c.type ?? '')} cfg={c.typeConfig} />}
                        title={String(c.title ?? '')}
                        trailing={
                          <>
                            <span className="text-[11px] font-medium text-muted-foreground">{c.dateLabel}</span>
                            <EntityStatusBadge label={woStageLabel(c.stageId)} bg={woStageColor(c.stageId)} />
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
                    <EntityDetailRow label="Criticality" value={r.criticality} />
                    <EntityDetailRow label="Operating Hours" value={`${r.hours.toLocaleString()} hrs`} />
                    <EntityDetailRow label="Status" value={r.status} borderBottom={false} />
                  </div>
                  <div>
                    <EntityDetailRow label="Plant" value={r.plant} />
                    <EntityDetailRow label="Location Area" value="Yard B — Service Bay 2" />
                    <EntityDetailRow label="Purchase Date" value="03 Mar, 2023" />
                    <EntityDetailRow label="Warranty" value="36 months" borderBottom={false} />
                  </div>
                </div>
              ),
            },
            {
              id: 'maintenance',
              label: 'Maintenance Log',
              render: () => <AssetMaintenanceLog assetId={r.id} />,
            },
          ]}
        />
      );
    },
  }),
};

/* ── Maintenance (Pipeline module) ──────────────────────────────────── */
const PRIORITY_CONFIG: Record<string, { bg: string; text: string; flagFill: string; flagStroke: string }> = {
  High: { bg: '#fef3f2', text: '#f04438', flagFill: '#F04438', flagStroke: '#F04438' },
  Medium: { bg: '#fffaeb', text: '#f79009', flagFill: '#F79009', flagStroke: '#F79009' },
  Low: { bg: '#ecfdf3', text: '#12b76a', flagFill: '#12B76A', flagStroke: '#12B76A' },
};
const TYPE_CONFIG: Record<string, { bg: string; text: string }> = {
  PREVENTIVE: { bg: '#fffaeb', text: '#f79009' },
  CORRECTIVE: { bg: '#ecfdf3', text: '#12b76a' },
};
const TIMES: Record<string, string> = {
  'WO-100001': '09:00', 'WO-100004': '08:00', 'WO-100006': '14:00', 'WO-100007': '18:00',
  'WO-100011': '18:00', 'WO-100013': '16:00', 'WO-100016': '16:00', 'WO-100021': '18:00',
};

const assetByName = new Map(ASSETS.map((a) => [a.name, a]));
const woById = new Map(WORK_ORDERS.map((w) => [w.id, w]));

/** "2026-03-04" (date input) → "04 Mar, 2026". */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDue(iso?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!m) return iso || 'Unscheduled';
  return `${m[3]} ${MONTHS[parseInt(m[2], 10) - 1]}, ${m[1]}`;
}
let woSeq = 22;
let assetSeq = 900;

/* ── per-WO workbench state (parts, checklist, activity, downtime) ───── */

const TECHNICIANS: FeedUser[] = [
  { id: 't1', name: 'Mushtaq Ali', role: 'Senior Technician', avatarFallback: 'MA', color: '#0072d6' },
  { id: 't2', name: 'Ravi Sharma', role: 'Hydraulics Specialist', avatarFallback: 'RS', color: '#ab47bc' },
  { id: 't3', name: 'Khalid Al-Mansoori', role: 'Workshop Manager', avatarFallback: 'KA', color: '#12b76a' },
];

const PART_COSTS: Record<string, number> = {
  'HF-200': 145, 'OIL-46': 320, 'BLD-300': 2150, 'SVP-15': 880, 'JAW-900': 4600,
};
const WO_INVENTORY = INVENTORY.map((p) => ({
  id: p.id, sku: p.sku, name: p.name, unitCost: PART_COSTS[p.sku] ?? 150, stock: p.onHand,
}));

const WO_CHECKLIST = [
  { id: 'c1', label: 'Isolate and lock out the asset' },
  { id: 'c2', label: 'Visual inspection — leaks, wear, damage' },
  { id: 'c3', label: 'Replace consumables per service plan' },
  { id: 'c4', label: 'Torque-check critical fasteners' },
  { id: 'c5', label: 'Function test under no load' },
  { id: 'c6', label: 'Update meter reading and close out' },
];

const WO_PARTS = new Map<string, PartLine[]>();
const WO_CHECKS = new Map<string, string[]>();
const WO_FEED = new Map<string, FeedEntry[]>();
const WO_DOWNTIME_START = new Map<string, Date>();

/** Per-WO Maintenance Report values (the demo's report fields). */
const WO_REPORT = new Map<string, Record<string, string>>();
function woReport(id: string, downtimeEnabled?: boolean): Record<string, string> {
  if (!WO_REPORT.has(id)) {
    WO_REPORT.set(id, {
      meterOpen: '', meterClose: '', completionDate: '', invoiceDate: '',
      invoiceNumber: '', totalAmount: '', actionTaken: '', rootCause: '',
      description: 'Scheduled service raised from the preventive plan. Technician to verify hydraulic pressures, replace consumables per the service sheet, and log closing meter reading before hand-back.',
      downtimeEnabled: downtimeEnabled ? '1' : '',
      downtimeStart: '', downtimeEnd: '',
    });
  }
  return WO_REPORT.get(id)!;
}

/** 24px demo avatar chip. */
function AvatarChip({ letter, color }: { letter: string; color: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-6 place-items-center rounded-full text-[12px] font-semibold text-white" style={{ background: color }}>
        {letter}
      </span>
    </span>
  );
}

function woFeed(id: string, dateLabel?: string): FeedEntry[] {
  if (!WO_FEED.has(id)) {
    WO_FEED.set(id, [
      { kind: 'system', id: `${id}-sys1`, text: 'Work order created', timestamp: dateLabel },
    ]);
  }
  return WO_FEED.get(id)!;
}

function woDowntimeStart(id: string): Date {
  if (!WO_DOWNTIME_START.has(id)) {
    // Demo: asset has been down ~5.4 hours when first opened.
    WO_DOWNTIME_START.set(id, new Date(Date.now() - 5.4 * 3600 * 1000));
  }
  return WO_DOWNTIME_START.get(id)!;
}

/** Stages where the report is still editable (the demos' isReportEditable). */
const EDITABLE_STAGES = new Set(['new', 'scheduled', 'in-progress']);

function UnassignedAdd() {
  return (
    <span
      className="inline-flex size-6 items-center justify-center rounded-full border border-dashed border-primary/50 text-primary"
      title="Assign technician"
    >
      <Plus size={12} />
    </span>
  );
}

const pipelineData: PipelineModuleData = {
  stages: WO_STAGES,
  filterField: { label: 'Priority', get: (c) => String(c.priority ?? '') },
  // Drag persists: replace the cards array so every view resyncs to the move.
  onCardMove: (cardId, toStageId) => {
    pipelineData.cards = pipelineData.cards.map((c) =>
      c.id === cardId ? { ...c, stageId: toStageId } : c
    );
  },
  cards: WORK_ORDERS.map((wo) => {
    const a = assetByName.get(wo.asset);
    return {
      id: wo.id,
      stageId: wo.stageId,
      ticketId: wo.ticketId,
      title: wo.title,
      priority: wo.priority,
      priorityConfig: wo.priority ? PRIORITY_CONFIG[wo.priority] : undefined,
      type: wo.type,
      typeConfig: wo.type ? TYPE_CONFIG[String(wo.type)] : undefined,
      metadataFields: a
        ? [
            { icon: 'Container', value: a.name },
            { icon: 'Tag', value: a.id },
            { icon: 'Clock', value: `${a.hours.toLocaleString()} hrs` },
            { icon: 'MapPin', value: `${a.plant}, Abu Dhabi` },
          ]
        : [{ icon: 'Container', value: wo.asset }],
      downtimeEnabled: wo.downtimeEnabled,
      downtimeStart: wo.downtimeStart,
      downtimeEnd: wo.downtimeEnd,
      isOverdue: wo.isOverdue,
      dateLabel: `${wo.dateLabel}${TIMES[wo.id] ? ` ${TIMES[wo.id]}` : ''}`,
      assignedAvatar: wo.assignedAvatar,
      isUnassigned: wo.isUnassigned,
      unassignedSlot: wo.isUnassigned ? <UnassignedAdd /> : undefined,
    };
  }),
  columns: [
    { id: 'ticket', header: 'WO #', accessor: (c) => c.ticketId },
    { id: 'title', header: 'Title', accessor: (c) => c.title },
    { id: 'type', header: 'Type', accessor: (c) => c.type },
    { id: 'priority', header: 'Priority', cell: (c) => <Badge variant={c.priority === 'High' ? 'destructive' : c.priority === 'Medium' ? 'warning' : 'muted'} size="sm">{c.priority}</Badge> },
    { id: 'stage', header: 'Stage', accessor: (c) => WO_STAGES.find((s) => s.id === c.stageId)?.label },
    { id: 'due', header: 'Due', accessor: (c) => c.dateLabel },
  ],
  toDetail: (card) => {
    return {
      id: card.id,
      category: 'Work Order',
      label: card.ticketId ?? card.id,
      // FAITHFUL adaptation of the Truemax ticket-detail (Figma Make design):
      // joined id/module pills + Cancel WO + status dropdown, 26px title,
      // two-column InfoRows, then Asset Details / Parts Used / Maintenance
      // Checklist / Maintenance Report sections, with the Timeline panel on
      // the right behind a collapse divider.
      render: (actions) => {
        const live = pipelineData.cards.find((c) => c.id === card.id) ?? card;
        const wo = woById.get(live.id);
        const asset = wo ? assetByName.get(wo.asset) : undefined;
        const editable = EDITABLE_STAGES.has(live.stageId);
        const report = woReport(live.id, wo?.downtimeEnabled);
        const checked = WO_CHECKS.get(live.id) ?? [];
        const mutate = (patch: Partial<typeof live>) => {
          pipelineData.cards = pipelineData.cards.map((c) =>
            c.id === live.id ? { ...c, ...patch } : c
          );
          actions.refresh();
        };
        const setReport = (key: string, value: string) => {
          report[key] = value;
          actions.refresh();
        };
        const meterCloseError =
          report.meterClose && report.meterOpen && Number(report.meterClose) < Number(report.meterOpen)
            ? `Invalid Entry: Closing hours cannot be less than the starting meter (Open: ${report.meterOpen})`
            : undefined;
        // The demo's hard-closure rules: "Closed" stays disabled until the
        // Maintenance Report satisfies them.
        const closedDisabledReason = meterCloseError
          ? 'Fix the meter readings first'
          : String(live.type) === 'PREVENTIVE' && !report.meterClose
            ? 'Meter at Close required (preventive)'
            : String(live.type) === 'CORRECTIVE' && !report.rootCause.trim()
              ? 'Root Cause required (corrective)'
              : undefined;
        return (
          <TaskDetail
            ticketId={String(live.ticketId ?? live.id).replace(/^#/, '')}
            moduleLabel="Maintenance"
            title={String(live.title ?? '')}
            status={
              <StatusTransitionDropdown
                stages={WO_STAGES.map((s) => ({
                  id: s.id,
                  label: s.label,
                  color: s.color,
                  ...(s.id === 'closed'
                    ? {
                        disabledReason: closedDisabledReason,
                        guard: { title: 'Close work order', description: 'Action Taken is required for closure — it feeds the service history.', reasonLabel: 'Action taken', confirmLabel: 'Close work order' },
                      }
                    : {}),
                }))}
                currentId={live.stageId}
                onTransition={(toId, reason) => {
                  mutate({ stageId: toId });
                  if (reason) {
                    report.actionTaken = report.actionTaken || reason;
                    woFeed(live.id).push({ kind: 'system', id: `${live.id}-${toId}`, text: `Closed — ${reason}`, timestamp: 'now' });
                  }
                }}
              />
            }
            cancel={
              live.stageId !== 'closed'
                ? {
                    onConfirm: (reason) => {
                      mutate({ stageId: 'closed' });
                      woFeed(live.id).push({ kind: 'system', id: `${live.id}-cancel`, text: `Work order cancelled — ${reason}`, timestamp: 'now' });
                    },
                  }
                : undefined
            }
            details={{
              left: [
                {
                  label: 'Maintenance Type',
                  value: (
                    <span className="rounded-[2px] px-2 py-1 text-[10px] font-semibold uppercase" style={{ background: live.typeConfig?.bg, color: live.typeConfig?.text }}>
                      {String(live.type ?? '')}
                    </span>
                  ),
                },
                {
                  label: 'Created By',
                  value: (
                    <span className="flex items-center gap-2">
                      <AvatarChip letter="K" color="#12b76a" />
                      <span className="text-[14px] font-semibold text-foreground">Khalid Al-Mansoori</span>
                    </span>
                  ),
                },
                { label: 'Creation Date', value: '12 Feb 2026' },
                {
                  label: 'Due Date',
                  value: (
                    <span className={cnDue(live.isOverdue && live.stageId !== 'closed')}>
                      {live.dateLabel ?? '—'}
                    </span>
                  ),
                },
                { label: 'Plant Location', value: asset ? `${asset.plant}, Abu Dhabi` : '—' },
              ],
              right: [
                { label: 'Service', value: String(live.title ?? '') },
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
                  // The demo's TechnicianAssignDropdown: searchable people
                  // picker that mutates the assignment in place.
                  value: (() => {
                    const matched = live.assignedAvatar
                      ? TECHNICIANS.find((t) => t.name.startsWith(live.assignedAvatar!.letter))
                      : null;
                    if (live.assignedAvatar && !matched) {
                      return (
                        <span className="flex items-center gap-2">
                          <AvatarChip letter={live.assignedAvatar.letter} color={live.assignedAvatar.color} />
                          <span className="text-[14px] font-semibold text-foreground">Technician {live.assignedAvatar.letter}</span>
                        </span>
                      );
                    }
                    return (
                      <AssigneePicker
                        people={TECHNICIANS.map((t) => ({ id: t.id, name: t.name, role: t.role, avatarFallback: t.avatarFallback, color: t.color }))}
                        value={matched?.id ?? null}
                        disabled={live.stageId === 'closed'}
                        onAssign={(p) => {
                          mutate({ assignedAvatar: { letter: p.name[0], color: p.color ?? '#0072d6' }, isUnassigned: false, unassignedSlot: undefined });
                          woFeed(live.id).push({ kind: 'system', id: `${live.id}-assign-${p.id}`, text: `Assigned to ${p.name}`, timestamp: 'now' });
                        }}
                        onClear={() => mutate({ assignedAvatar: undefined, isUnassigned: true })}
                      />
                    );
                  })(),
                },
              ],
            }}
            timeline={
              <ActivityFeed
                className="h-full"
                entries={woFeed(live.id, live.dateLabel)}
                users={TECHNICIANS}
                onSubmit={(text, attachments) => {
                  woFeed(live.id).push({
                    kind: 'comment',
                    id: `${live.id}-c${woFeed(live.id).length}`,
                    author: 'Khalid Al-Mansoori',
                    avatarFallback: 'KA',
                    avatarColor: '#12b76a',
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
            {/* ── Asset Details ─────────────────────────────────────── */}
            <TaskSection title="Asset Details">
              <div className="flex w-full items-start gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <TaskInfoRow
                    label="Name"
                    value={
                      <span className="flex items-center gap-2">
                        <span className="grid size-[26px] place-items-center rounded-full bg-muted text-muted-foreground"><Boxes size={14} /></span>
                        <span className="text-[14px] font-semibold text-foreground">{asset?.name ?? wo?.asset ?? '—'}</span>
                      </span>
                    }
                  />
                  <TaskInfoRow label="Operating Hours" value={asset ? `${asset.hours.toLocaleString()} hrs` : '—'} />
                  <TaskInfoRow label="Location Area" value="Yard B — Service Bay 2" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <TaskInfoRow label="Plant" value={asset?.plant ?? '—'} />
                  <TaskInfoRow label="Category" value={asset?.category ?? '—'} />
                  <TaskInfoRow
                    label="Status"
                    value={
                      <span className="rounded-[4px] px-1.5 py-[3px] text-[10px] font-semibold uppercase text-white" style={{ background: asset ? statusPillBg(asset.status) : '#98a2b3' }}>
                        {asset?.status ?? 'Active'}
                      </span>
                    }
                  />
                </div>
              </div>
            </TaskSection>

            {/* ── Parts Used ────────────────────────────────────────── */}
            <TaskSection title="Parts Used">
              <PartsTable
                parts={WO_PARTS.get(live.id) ?? []}
                inventory={WO_INVENTORY}
                editable={editable}
                onChange={(parts) => { WO_PARTS.set(live.id, parts); actions.refresh(); }}
              />
            </TaskSection>

            {/* ── Maintenance Checklist ─────────────────────────────── */}
            <TaskSection
              title="Maintenance Checklist"
              headerRight={
                <span className="text-[12px] font-semibold text-muted-foreground">
                  {checked.length}/{WO_CHECKLIST.length} completed
                </span>
              }
            >
              <ChecklistSection
                items={WO_CHECKLIST}
                checkedIds={checked}
                readOnly={live.stageId === 'closed'}
                onToggle={(cid) => {
                  const cur = WO_CHECKS.get(live.id) ?? [];
                  WO_CHECKS.set(live.id, cur.includes(cid) ? cur.filter((x) => x !== cid) : [...cur, cid]);
                  actions.refresh();
                }}
              />
            </TaskSection>

            {/* ── Maintenance Report ────────────────────────────────── */}
            <TaskSection title="Maintenance Report">
              <div className="flex w-full flex-col gap-4">
                <div className="flex w-full gap-4">
                  <BoxedField label="Operating Hours at Open" type="number" value={report.meterOpen} editable={editable} onChange={(v) => setReport('meterOpen', v)} />
                  <BoxedField label="Operating Hours at Close" type="number" value={report.meterClose} editable={editable} onChange={(v) => setReport('meterClose', v)} error={meterCloseError} />
                </div>
                <div className="flex w-full gap-4">
                  <BoxedField label="Completion Date" type="date" value={report.completionDate} editable={editable} onChange={(v) => setReport('completionDate', v)} />
                  <BoxedField label="Invoice Date" type="date" value={report.invoiceDate} editable={editable} onChange={(v) => setReport('invoiceDate', v)} />
                </div>
                <div className="flex w-full gap-4">
                  <BoxedField label="Invoice Number" value={report.invoiceNumber} editable={editable} onChange={(v) => setReport('invoiceNumber', v)} />
                  <BoxedField label="Total Amount" value={report.totalAmount} editable={editable} onChange={(v) => setReport('totalAmount', v)} />
                </div>

                <TaskToggleRow
                  label="Downtime Tracking"
                  enabled={report.downtimeEnabled === '1'}
                  disabled={!editable}
                  onToggle={(on) => setReport('downtimeEnabled', on ? '1' : '')}
                />
                {report.downtimeEnabled === '1' ? (
                  <div className="flex w-full flex-col gap-2">
                    <div className="flex w-full gap-4">
                      <BoxedField label="Downtime Start" type="date" value={report.downtimeStart} editable={editable} onChange={(v) => setReport('downtimeStart', v)} />
                      <BoxedField label="Downtime End" type="date" value={report.downtimeEnd} editable={editable} onChange={(v) => setReport('downtimeEnd', v)} />
                    </div>
                    <DowntimeTimer
                      start={report.downtimeStart || woDowntimeStart(live.id)}
                      end={report.downtimeEnd || undefined}
                    />
                  </div>
                ) : null}

                <BoxedTextarea
                  label="Action Taken"
                  required={live.stageId !== 'closed'}
                  value={report.actionTaken}
                  editable={editable}
                  onChange={(v) => setReport('actionTaken', v)}
                  placeholder="Describe actions taken..."
                />
                <BoxedTextarea
                  label="Root Cause"
                  required={String(live.type) === 'CORRECTIVE' && live.stageId !== 'closed'}
                  value={report.rootCause}
                  editable={editable}
                  onChange={(v) => setReport('rootCause', v)}
                  placeholder={String(live.type) === 'CORRECTIVE' ? 'Root cause analysis (required for corrective)...' : 'Root cause analysis (optional)...'}
                  minHeight={60}
                />
                <AttachmentDrop disabled={!editable} />
                {editable ? (
                  <BoxedTextarea
                    label="Description"
                    value={report.description}
                    onChange={(v) => setReport('description', v)}
                    placeholder="Enter description..."
                    minHeight={120}
                  />
                ) : (
                  <CollapsibleNote text={report.description} />
                )}
              </div>
            </TaskSection>
          </TaskDetail>
        );
      },
    };
  },
};

/* ── Inventory (Entity module) ──────────────────────────────────────── */
const inventoryData: EntityModuleData<Part> = {
  columns: [
    { id: 'name', header: 'Part', accessor: (r) => r.name, sortable: true },
    { id: 'sku', header: 'SKU', accessor: (r) => r.sku },
    { id: 'category', header: 'Category', accessor: (r) => r.category },
    { id: 'onHand', header: 'On hand', align: 'right', accessor: (r) => r.onHand },
    { id: 'reorder', header: 'Reorder at', align: 'right', accessor: (r) => r.reorder },
    { id: 'flag', header: 'Stock', cell: (r) => (r.onHand <= r.reorder ? <Badge variant="warning" size="sm">Low</Badge> : <Badge variant="success" size="sm">OK</Badge>) },
  ],
  rows: INVENTORY,
  getRowId: (r) => r.id,
  filterField: { label: 'Category', get: (r) => r.category },
  searchText: (r) => `${r.name} ${r.sku} ${r.category}`,
};

/* ── Preventive Maintenance (entity module) ─────────────────────────────
   Ported from the ducon-demo concept with its two bugs FIXED:
   1. Duplicate guard is PER PLAN (ducon blocked a new preventive WO if the
      asset had ANY open WO, even for a different plan).
   2. Threshold semantics are explicit: with interval I and reminder R,
      hours-since-service ≥ I → Overdue · ≥ I−R → Due · ≥ I−2R → Upcoming. */

interface PreventivePlan {
  id: string;
  assetId: string;
  title: string;
  intervalHours: number;
  reminderHours: number;
  lastServiceHours: number;
}

type PreventiveStatus = 'Overdue' | 'Due' | 'Upcoming' | 'OK';

const PREVENTIVE_PLANS: PreventivePlan[] = [
  { id: 'PM-01', assetId: 'EQ-001', title: 'Hydraulic system service', intervalHours: 250, reminderHours: 20, lastServiceHours: 3890 },
  { id: 'PM-02', assetId: 'EQ-001', title: 'Boom pipe wear inspection', intervalHours: 500, reminderHours: 40, lastServiceHours: 3700 },
  { id: 'PM-03', assetId: 'EQ-003', title: 'Mixer gearbox oil change', intervalHours: 1000, reminderHours: 80, lastServiceHours: 7150 },
  { id: 'PM-04', assetId: 'EQ-005', title: 'Drum blade replacement', intervalHours: 750, reminderHours: 60, lastServiceHours: 5680 },
  { id: 'PM-05', assetId: 'EQ-008', title: 'Jaw plate inspection', intervalHours: 400, reminderHours: 30, lastServiceHours: 11050 },
];

const assetById = new Map(ASSETS.map((a) => [a.id, a]));

function preventiveStatus(plan: PreventivePlan): { status: PreventiveStatus; hoursSince: number } {
  const asset = assetById.get(plan.assetId);
  const hoursSince = (asset?.hours ?? plan.lastServiceHours) - plan.lastServiceHours;
  if (hoursSince >= plan.intervalHours) return { status: 'Overdue', hoursSince };
  if (hoursSince >= plan.intervalHours - plan.reminderHours) return { status: 'Due', hoursSince };
  if (hoursSince >= plan.intervalHours - plan.reminderHours * 2) return { status: 'Upcoming', hoursSince };
  return { status: 'OK', hoursSince };
}

const preventiveBadge = (s: PreventiveStatus) =>
  s === 'Overdue' ? 'destructive' : s === 'Due' ? 'warning' : s === 'Upcoming' ? 'info' : 'success';

/** Open (non-closed) auto-generated WO for THIS plan — the fixed guard. */
function openWoForPlan(planId: string) {
  return pipelineData.cards.find((c) => c.id === `WO-${planId}` && c.stageId !== 'closed');
}

const preventiveData: EntityModuleData<PreventivePlan> = {
  columns: [
    { id: 'title', header: 'Plan', accessor: (r) => r.title, sortable: true },
    { id: 'asset', header: 'Asset', accessor: (r) => assetById.get(r.assetId)?.name ?? r.assetId },
    { id: 'interval', header: 'Interval', align: 'right', accessor: (r) => `${r.intervalHours} hrs` },
    { id: 'since', header: 'Since Service', align: 'right', accessor: (r) => `${preventiveStatus(r).hoursSince} hrs` },
    { id: 'status', header: 'Status', cell: (r) => { const s = preventiveStatus(r).status; return <Badge variant={preventiveBadge(s)} size="sm">{s}</Badge>; } },
    { id: 'wo', header: 'Open WO', cell: (r) => (openWoForPlan(r.id) ? <Badge variant="secondary" size="sm">{`WO-${r.id}`}</Badge> : <span className="text-body-sm text-muted-foreground">—</span>) },
  ],
  rows: PREVENTIVE_PLANS,
  getRowId: (r) => r.id,
  filterField: { label: 'Status', get: (r) => preventiveStatus(r).status },
  searchText: (r) => `${r.title} ${assetById.get(r.assetId)?.name ?? ''} ${preventiveStatus(r).status}`,
  toDetail: (plan) => ({
    id: plan.id,
    category: 'Preventive Plan',
    label: plan.title,
    render: (actions) => {
      const asset = assetById.get(plan.assetId);
      const { status, hoursSince } = preventiveStatus(plan);
      const existing = openWoForPlan(plan.id);
      const generateWo = () => {
        if (openWoForPlan(plan.id)) return; // per-plan guard (the ducon fix)
        pipelineData.cards = [
          {
            id: `WO-${plan.id}`,
            stageId: WO_STAGES[0].id,
            ticketId: `#WO-${plan.id}`,
            title: plan.title,
            priority: status === 'Overdue' ? 'High' : 'Medium',
            priorityConfig: PRIORITY_CONFIG[status === 'Overdue' ? 'High' : 'Medium'],
            type: 'PREVENTIVE',
            typeConfig: TYPE_CONFIG.PREVENTIVE,
            metadataFields: asset
              ? [
                  { icon: 'Container', value: asset.name },
                  { icon: 'Tag', value: asset.id },
                  { icon: 'Clock', value: `${asset.hours.toLocaleString()} hrs` },
                ]
              : [],
            dateLabel: 'Auto-generated',
            isUnassigned: true,
            unassignedSlot: <UnassignedAdd />,
          },
          ...pipelineData.cards,
        ];
        // Jump to the Maintenance board so the new WO is visible immediately.
        actions.openModule('maintenance', { tabId: 'kanban' });
        actions.refresh();
      };
      return (
        <RecordDetail
          icon={CalendarClock}
          category="Preventive Plan"
          title={plan.title}
          subtitle={asset ? `${asset.name} · ${asset.id}` : plan.assetId}
          status={<Badge variant={preventiveBadge(status)} size="sm">{status}</Badge>}
          actions={
            existing ? (
              <Badge variant="secondary" size="sm">Open WO exists for this plan</Badge>
            ) : (
              <Button size="sm" onClick={generateWo} disabled={status === 'OK'}>
                Generate work order
              </Button>
            )
          }
        >
          <DetailSection title="Trigger">
            <FieldGrid
              columns={3}
              fields={[
                { label: 'Trigger', value: 'Operating Hours' },
                { label: 'Interval', value: `${plan.intervalHours} hrs` },
                { label: 'Reminder window', value: `${plan.reminderHours} hrs` },
                { label: 'Last service at', value: `${plan.lastServiceHours.toLocaleString()} hrs` },
                { label: 'Asset now at', value: `${(asset?.hours ?? 0).toLocaleString()} hrs` },
                { label: 'Hours since service', value: `${hoursSince} hrs` },
              ]}
            />
          </DetailSection>
          <DetailSection title="Status semantics">
            <FieldGrid
              columns={3}
              fields={[
                { label: 'Overdue at', value: `≥ ${plan.intervalHours} hrs` },
                { label: 'Due at', value: `≥ ${plan.intervalHours - plan.reminderHours} hrs` },
                { label: 'Upcoming at', value: `≥ ${plan.intervalHours - plan.reminderHours * 2} hrs` },
              ]}
            />
          </DetailSection>
        </RecordDetail>
      );
    },
  }),
};

/* ── Dashboard + Reports instance renderers ─────────────────────────── */
const statusCounts = WO_STAGES.map((s) => ({
  stage: s.label,
  count: WORK_ORDERS.filter((w) => w.stageId === s.id).length,
}));
const byType = [
  { name: 'Preventive', value: WORK_ORDERS.filter((w) => w.type === 'PREVENTIVE').length, color: 'var(--chart-4)' },
  { name: 'Corrective', value: WORK_ORDERS.filter((w) => w.type === 'CORRECTIVE').length, color: 'var(--chart-1)' },
];

function OperationsDashboard() {
  const open = WORK_ORDERS.filter((w) => w.stageId !== 'closed').length;
  return (
    <Dashboard
      dateLabel="28 Jan – 26 Feb, 2026"
      ranges={['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'This Month', 'All Time']}
      kpis={[
        { label: 'Total Work Orders', value: WORK_ORDERS.length, icon: <ClipboardList size={18} /> },
        { label: 'Open Work Orders', value: open, trend: 'up', trendValue: '+3', description: 'vs last week', icon: <Wrench size={18} /> },
        { label: 'Overdue', value: WORK_ORDERS.filter((w) => w.isOverdue).length, trend: 'down', trendValue: '-1', icon: <AlertTriangle size={18} />, iconBg: 'rgba(240,68,56,0.1)', iconColor: 'var(--destructive)' },
        { label: 'Assets Tracked', value: ASSETS.length, icon: <Boxes size={18} /> },
        { label: 'Completion Rate', value: '71%', trend: 'up', trendValue: '+4%', icon: <CheckCircle2 size={18} /> },
      ]}
      sections={[
        { id: 'status', title: 'Work Orders by Status', icon: <BarChart3 size={16} />, span: 7, children: <BarChart data={statusCounts} xKey="stage" series={[{ dataKey: 'count', name: 'Work Orders' }]} height={260} /> },
        { id: 'type', title: 'Preventive vs Corrective', icon: <PieChart size={16} />, span: 5, children: <DonutChart data={byType} height={260} centerLabel={<span className="text-h6 font-semibold">{WORK_ORDERS.length}</span>} /> },
      ]}
    />
  );
}

function MaintenanceKpis() {
  const lifecycle = ASSETS.map((a) => ({ asset: a.name.split(' ').slice(-1)[0], hours: a.hours }));
  return (
    <Dashboard
      kpis={[
        { label: 'Critical Assets', value: ASSETS.filter((a) => a.criticality === 'Critical').length, icon: <AlertTriangle size={18} /> },
        { label: 'Under Maintenance', value: ASSETS.filter((a) => a.status === 'Under Maintenance').length, icon: <Wrench size={18} /> },
        { label: 'Avg Operating Hrs', value: Math.round(ASSETS.reduce((s, a) => s + a.hours, 0) / ASSETS.length).toLocaleString(), unit: 'hrs', icon: <Clock size={18} /> },
        { label: 'Low-stock Parts', value: INVENTORY.filter((p) => p.onHand <= p.reorder).length, icon: <PackageOpen size={18} />, iconBg: 'rgba(247,144,9,0.12)', iconColor: 'var(--chart-1)' },
      ]}
      sections={[
        { id: 'type', title: 'Preventive vs Corrective', icon: <PieChart size={16} />, span: 5, children: <DonutChart data={byType} height={260} centerLabel={<span className="text-h6 font-semibold">{WORK_ORDERS.length}</span>} /> },
        { id: 'lifecycle', title: 'Operating Hours by Asset', icon: <BarChart3 size={16} />, span: 7, children: <BarChart data={lifecycle} xKey="asset" series={[{ dataKey: 'hours', name: 'Hours', color: 'var(--chart-3)' }]} height={260} /> },
      ]}
    />
  );
}

function LifecycleReport() {
  const data = ASSETS.map((a) => ({ asset: a.name.split(' ').slice(-1)[0], hours: a.hours }));
  return (
    <Dashboard
      sections={[
        { id: 'lc', title: 'Asset Lifecycle — Operating Hours', icon: <BarChart3 size={16} />, span: 12, children: <BarChart data={data} xKey="asset" series={[{ dataKey: 'hours', name: 'Hours', color: 'var(--chart-3)' }]} height={320} /> },
      ]}
    />
  );
}

export const workshopApp: AppConfig = {
  id: 'workshop',
  brand: { name: 'Truemax Workshop', icon: Wrench },
  user: { name: 'Khalid Al-Mansoori', email: 'khalid@truemax.ae', role: 'Workshop Manager', avatarFallback: 'KA' },
  // Settings experience (Figma DS V2 730:271) — opens the SettingsNav next to the
  // side nav with no top nav. Content panels fall back to a default placeholder.
  settings: {
    title: 'Settings',
    sections: [
      {
        label: 'Platform Settings',
        items: [
          { id: 'tags', label: 'Tags & Categories', icon: ClipboardList },
          { id: 'roles', label: 'Roles Management', icon: CheckCircle2 },
          { id: 'pipeline', label: 'Pipeline Configuration', icon: Activity },
          { id: 'events', label: 'Event Configuration', icon: AlertTriangle },
          { id: 'modules', label: 'Module Management', icon: Boxes },
          { id: 'appearance', label: 'Appearance', icon: PieChart },
        ],
      },
      {
        label: 'Organization Settings',
        items: [
          { id: 'users', label: 'User Accounts', icon: Activity },
          { id: 'org', label: 'Organization Settings', icon: PackageOpen },
        ],
      },
      {
        label: 'My Settings',
        items: [
          { id: 'profile', label: 'User Profile', icon: Clock },
          { id: 'prefs', label: 'My Preferences', icon: CalendarClock },
        ],
      },
    ],
  },
  collectiveInbox: {
    notificationDot: true,
    render: () => <InboxView data={{ notifications: WORKSHOP_NOTIFICATIONS }} />,
  },
  modules: [
    {
      id: 'dashboard',
      type: 'dashboard',
      label: 'Dashboard',
      tabKind: 'instance',
      tabs: [
        { id: 'ops', label: 'Operations', render: () => <OperationsDashboard /> },
        { id: 'maint', label: 'Maintenance KPIs', render: () => <MaintenanceKpis /> },
      ],
    },
    {
      id: 'maintenance',
      type: 'pipeline',
      label: 'Maintenance',
      data: pipelineData,
      tabs: [
        { id: 'kanban', kind: 'kanban', label: 'Kanban View' },
        { id: 'list', kind: 'list', label: 'List View' },
      ],
      create: {
        // The demos' multi-step creation: Basic Info → Select Assets → Trigger.
        render: (close, actions) => {
          const schema: SteppedFormSchema = {
            title: 'Create Work Order',
            description: 'Raise a new maintenance request.',
            submitLabel: 'Create work orders',
            summary: (v) => {
              const n = (v.assets ?? '').split(',').filter(Boolean).length;
              return n ? (
                <span>
                  <span className="font-semibold text-primary">{n}</span> work order{n === 1 ? '' : 's'} will be created
                </span>
              ) : (
                <span className="text-muted-foreground">No assets selected yet</span>
              );
            },
            steps: [
              {
                id: 'basic',
                title: 'Basic Info',
                fields: [
                  { key: 'title', label: 'Title', placeholder: 'e.g. Hydraulic service', required: true, span: 2 },
                  { key: 'type', label: 'Maintenance type', type: 'select', options: [{ label: 'Preventive', value: 'PREVENTIVE' }, { label: 'Corrective', value: 'CORRECTIVE' }] },
                  { key: 'priority', label: 'Priority', type: 'select', options: [{ label: 'High', value: 'High' }, { label: 'Medium', value: 'Medium' }, { label: 'Low', value: 'Low' }] },
                  { key: 'due', label: 'Due date', type: 'date' },
                  { key: 'notes', label: 'Description', type: 'textarea', placeholder: 'Describe the issue…' },
                ],
              },
              {
                id: 'assets',
                title: 'Select Assets',
                fields: [
                  {
                    key: 'assets',
                    label: 'Asset',
                    type: 'multi-picker',
                    // The demo's Select Asset tab: Selected/Available TABLES
                    // with data columns and a select-all checkbox.
                    multiPickerMode: 'table',
                    placeholder: 'Search assets…',
                    span: 2,
                    tableColumns: [
                      { key: 'category', header: 'Category' },
                      { key: 'plant', header: 'Plant' },
                      { key: 'meter', header: 'Meter' },
                      { key: 'status', header: 'Status' },
                    ],
                    pickerOptions: assetData.rows.map((a) => ({
                      value: a.id,
                      label: a.name,
                      subtitle: a.id,
                      avatarFallback: a.id.replace('EQ-', ''),
                      avatarColor: a.criticality === 'Critical' ? '#f04438' : '#0072d6',
                      meta: {
                        category: a.category,
                        plant: a.plant.replace('Main ', ''),
                        meter: `${a.hours.toLocaleString()} hrs`,
                        status: <EntityStatusBadge label={a.status} bg={statusPillBg(a.status)} />,
                      },
                    })),
                  },
                ],
                validate: (v) =>
                  (v.assets ?? '').split(',').filter(Boolean).length ? null : 'Select at least one asset.',
              },
              {
                id: 'trigger',
                title: 'Trigger',
                // The demo's conditional trigger sections: toggles reveal
                // their interval fields; auto-create only for PREVENTIVE.
                fields: [
                  { key: 'opHours', label: 'Operating Hours Interval', type: 'toggle', placeholder: 'Generate from running hours' },
                  { key: 'intervalHours', label: 'Interval (hours)', type: 'number', placeholder: '250', visibleIf: (v) => v.opHours === '1' },
                  { key: 'reminderHours', label: 'Reminder threshold (hours)', type: 'number', placeholder: '20', visibleIf: (v) => v.opHours === '1' },
                  { key: 'dateTrigger', label: 'Date Interval', type: 'toggle', placeholder: 'Generate on a fixed cadence' },
                  { key: 'intervalDays', label: 'Periodic interval (days)', type: 'number', placeholder: '180', visibleIf: (v) => v.dateTrigger === '1' },
                  { key: 'autoCreate', label: 'Auto-create Work Order', type: 'toggle', placeholder: 'Create the next WO automatically when the trigger fires', visibleIf: (v) => v.type === 'PREVENTIVE' },
                ],
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
                // One work order per selected asset (the Truemax behavior).
                const newCards = ids.map((assetId) => {
                  woSeq += 1;
                  const a = assetData.rows.find((x) => x.id === assetId);
                  return {
                    id: `WO-1000${woSeq}`,
                    stageId: WO_STAGES[0].id,
                    ticketId: `#WO-${1000 + woSeq}`,
                    title: v.title || 'Untitled work order',
                    priority,
                    priorityConfig: PRIORITY_CONFIG[priority],
                    type,
                    typeConfig: TYPE_CONFIG[type],
                    metadataFields: a
                      ? [
                          { icon: 'Container', value: a.name },
                          { icon: 'Tag', value: a.id },
                          { icon: 'MapPin', value: `${a.plant}, Abu Dhabi` },
                        ]
                      : [],
                    dateLabel: formatDue(v.due),
                    isUnassigned: true,
                    unassignedSlot: <UnassignedAdd />,
                  };
                });
                pipelineData.cards = [...newCards, ...pipelineData.cards];
                actions.refresh();
                close();
              }}
            />
          );
        },
      },
    },
    {
      id: 'assets',
      type: 'entity',
      label: 'Assets',
      data: assetData,
      tabs: [
        { id: 'list', kind: 'list', label: 'List View' },
        { id: 'grouped', kind: 'grouped-list', label: 'Grouped List' },
        { id: 'map', kind: 'map', label: 'Map View' },
        { id: 'hybrid', kind: 'hybrid', label: 'Hybrid View' },
      ],
      create: {
        schema: {
          title: 'Add Asset',
          description: 'Register a new piece of equipment.',
          submitLabel: 'Add asset',
          fields: [
            { key: 'name', label: 'Asset name', required: true, span: 2 },
            { key: 'category', label: 'Category' },
            { key: 'plant', label: 'Plant', type: 'select', options: [{ label: 'Main Plant 1', value: 'Main Plant 1' }, { label: 'Main Plant 2', value: 'Main Plant 2' }] },
            { key: 'criticality', label: 'Criticality', type: 'select', options: [{ label: 'Critical', value: 'Critical' }, { label: 'Medium', value: 'Medium' }, { label: 'Low', value: 'Low' }] },
            { key: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Under Maintenance', value: 'Under Maintenance' }, { label: 'Inactive', value: 'Inactive' }] },
            { key: 'hours', label: 'Operating hours', type: 'number' },
          ],
        },
        onSubmit: (v, actions) => {
          assetSeq += 1;
          assetData.rows = [
            {
              id: `EQ-${assetSeq}`,
              name: v.name || 'New asset',
              category: v.category || 'Uncategorised',
              plant: v.plant || 'Main Plant 1',
              criticality: (v.criticality as Asset['criticality']) || 'Low',
              status: (v.status as Asset['status']) || 'Active',
              hours: Number(v.hours) || 0,
              position: ASSET_CENTER,
            },
            ...assetData.rows,
          ];
          actions.refresh();
        },
      },
    },
    { id: 'preventive', type: 'entity', label: 'Preventive', icon: CalendarClock, data: preventiveData },
    { id: 'inventory', type: 'entity', label: 'Inventory', data: inventoryData },
    {
      id: 'reports',
      type: 'reports',
      label: 'Reports',
      tabKind: 'instance',
      tabs: [{ id: 'lifecycle', label: 'Asset Lifecycle', render: () => <LifecycleReport /> }],
    },
  ],
};
