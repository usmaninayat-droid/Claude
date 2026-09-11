import * as React from 'react';
// Icons from the REAL V5 set (src/icons/v5).
import {
  TrendUp01 as TrendingUp,
  Plus,
  Building02 as Building2,
  Briefcase01 as Briefcase,
  Target01 as Target,
  Users01 as Users,
  CurrencyDollar as DollarSign,
  BarChart03 as BarChart3,
  Trophy01 as Trophy,
  User02 as Contact2,
  CalendarCheck01 as CalendarCheck,
  Phone,
  CheckCircle as CheckCircle2,
} from '../../icons';
import type { AppConfig, CalendarModuleData, EntityModuleData, PipelineModuleData } from '../../components/app-shell';
import {
  InboxView, Dashboard, RecordDetail, DetailSection, FieldGrid,
  EntityDetail, EntityDetailRow, EntityMetricCard, EntityChartCard, EntityListItem,
} from '../../components/app-shell';
import { Badge, Button } from '../../components/primitives';
import { StatePill, Timeline, StatusTransitionDropdown } from '../../components/data-display';
import { EntityProfileCard } from '../../components/widgets';
import { KpiTile, BarChart } from '../../components/data-viz';
import {
  COMPANIES,
  DEALS,
  DEAL_STAGES,
  SALES_NOTIFICATIONS,
  type Company,
} from './sample-data';

/**
 * A deliberately different domain (a lean sales CRM) under a green brand theme,
 * composed from the *same* kit as the Workshop app — proving the FAMS V5 thesis.
 */

const companyStatusBadge = (s: Company['status']) =>
  s === 'Customer' ? 'success' : s === 'Prospect' ? 'info' : 'muted';
const companyStatusPill = (s: Company['status']) =>
  s === 'Customer' ? '#16a34a' : s === 'Prospect' ? '#0072d6' : '#667085';

const companyData: EntityModuleData<Company> = {
  columns: [
    { id: 'name', header: 'Company', accessor: (r) => r.name, sortable: true },
    { id: 'industry', header: 'Industry', accessor: (r) => r.industry },
    { id: 'owner', header: 'Owner', accessor: (r) => r.owner },
    { id: 'arr', header: 'ARR', align: 'right', accessor: (r) => r.arr },
    { id: 'status', header: 'Status', cell: (r) => <Badge variant={companyStatusBadge(r.status)} size="sm">{r.status}</Badge> },
  ],
  rows: COMPANIES,
  getRowId: (r) => r.id,
  filterField: { label: 'Status', get: (r) => r.status },
  searchText: (r) => `${r.name} ${r.industry} ${r.owner}`,
  toListItem: (r) => ({ id: r.id, title: r.name, subtitle: `${r.industry} · ${r.owner}`, trailing: <Badge variant={companyStatusBadge(r.status)} size="sm">{r.status}</Badge> }),
  // STANDARD entity detail — same layout as Workshop assets (CRM company
  // panel shape): left identity panel + Overview / Details / Deals tabs.
  toDetail: (r) => ({
    id: r.id,
    category: 'Company',
    label: r.name,
    render: (actions) => {
      const companyDeals = dealData.cards.filter((c) =>
        c.metadataFields?.some((f) => f.value === r.name)
      );
      const openDeals = companyDeals.filter((c) => c.stageId !== 'won' && c.stageId !== 'lost');
      const wonDeals = companyDeals.filter((c) => c.stageId === 'won');
      const byStage = DEAL_STAGES.map((s) => ({
        stage: s.label,
        deals: companyDeals.filter((c) => c.stageId === s.id).length,
      }));
      const companyContacts = CONTACTS.filter((ct) => ct.company === r.name);
      const stagePill = (stageId?: string) => {
        const s = DEAL_STAGES.find((x) => x.id === stageId);
        return (
          <span className="inline-flex items-center rounded-[2px] px-1.5 py-1 text-[10px] font-semibold uppercase tracking-[0.5px] text-white" style={{ background: s?.color ?? '#667085' }}>
            {s?.label ?? '—'}
          </span>
        );
      };
      return (
        <EntityDetail
          avatarFallback={r.name.slice(0, 2).toUpperCase()}
          avatarColor="#16a34a"
          statusOverlay={
            <span className="inline-flex items-center rounded-[2px] px-1.5 py-1 text-[10px] font-semibold uppercase tracking-[0.5px] text-white" style={{ background: companyStatusPill(r.status) }}>
              {r.status}
            </span>
          }
          name={r.name}
          entityId={r.id}
          categoryBadge={
            <span className="inline-flex items-center rounded-[4px] bg-secondary px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.3px] text-primary">
              {r.industry}
            </span>
          }
          infoTitle="Company Details"
          info={[
            { label: 'Industry', value: r.industry },
            { label: 'Owner', value: r.owner },
            { label: 'ARR', value: r.arr },
            { label: 'Status', value: r.status },
            { label: 'Open Deals', value: String(openDeals.length) },
            { label: 'Contacts', value: String(companyContacts.length) },
          ]}
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              render: () => (
                <div className="flex flex-col gap-5">
                  {/* Quick cross-module actions (View deals / New deal) */}
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => actions.openModule('deals')}>
                      View deals
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        actions.openModule('deals');
                        actions.openCreate();
                      }}
                    >
                      New deal
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <EntityMetricCard label="Open Deals" value={openDeals.length} sub={`${wonDeals.length} won`} />
                    <EntityMetricCard label="ARR" value={r.arr} sub="annual recurring" />
                    <EntityMetricCard label="Win Rate" value={companyDeals.length ? `${Math.round((wonDeals.length / companyDeals.length) * 100)}%` : '—'} sub={`${companyDeals.length} total deals`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <EntityChartCard title="Deals by Stage" subtitle="This account's pipeline distribution">
                      <BarChart data={byStage} xKey="stage" height={180} series={[{ dataKey: 'deals', name: 'Deals' }]} />
                    </EntityChartCard>
                    <EntityChartCard title="Key Contacts" subtitle="People on this account">
                      {companyContacts.slice(0, 4).map((ct, i, arr) => (
                        <EntityListItem
                          key={ct.id}
                          leading={
                            <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">
                              {ct.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                            </span>
                          }
                          title={ct.name}
                          trailing={<span className="text-[11px] font-medium text-muted-foreground">{ct.role}</span>}
                          borderBottom={i < arr.length - 1}
                        />
                      ))}
                      {!companyContacts.length ? <p className="py-4 text-center text-[12px] text-muted-foreground">No contacts linked</p> : null}
                    </EntityChartCard>
                  </div>
                  <EntityChartCard title="Recent Deals" subtitle="Latest opportunities on this account">
                    {companyDeals.slice(0, 4).map((c, i, arr) => (
                      <EntityListItem
                        key={c.id}
                        title={String(c.title ?? '')}
                        trailing={
                          <>
                            <span className="text-[11px] font-medium text-muted-foreground">{c.dateLabel}</span>
                            {stagePill(c.stageId)}
                          </>
                        }
                        borderBottom={i < arr.length - 1}
                      />
                    ))}
                    {!companyDeals.length ? <p className="py-4 text-center text-[12px] text-muted-foreground">No deals yet</p> : null}
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
                    <EntityDetailRow label="Industry" value={r.industry} />
                    <EntityDetailRow label="Owner" value={r.owner} />
                    <EntityDetailRow label="Status" value={r.status} borderBottom={false} />
                  </div>
                  <div>
                    <EntityDetailRow label="ARR" value={r.arr} />
                    <EntityDetailRow label="Region" value="GCC · Dubai HQ" />
                    <EntityDetailRow label="Since" value="2024" borderBottom={false} />
                  </div>
                </div>
              ),
            },
            {
              id: 'deals',
              label: 'Deals',
              render: () => (
                <div className="flex flex-col">
                  {companyDeals.map((c, i, arr) => (
                    <EntityListItem
                      key={c.id}
                      leading={
                        <span className="inline-flex items-center rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.3px]" style={{ background: c.typeConfig?.bg ?? '#f2f4f7', color: c.typeConfig?.text ?? '#667085' }}>
                          {String(c.type ?? '')}
                        </span>
                      }
                      title={String(c.title ?? '')}
                      trailing={
                        <>
                          <span className="text-[11px] font-medium text-muted-foreground">{c.dateLabel}</span>
                          {stagePill(c.stageId)}
                        </>
                      }
                      borderBottom={i < arr.length - 1}
                    />
                  ))}
                  {!companyDeals.length ? <p className="py-6 text-center text-[12px] text-muted-foreground">No deals on this account.</p> : null}
                </div>
              ),
            },
          ]}
        />
      );
    },
  }),
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; flagFill: string; flagStroke: string }> = {
  High: { bg: '#fef3f2', text: '#f04438', flagFill: '#F04438', flagStroke: '#F04438' },
  Medium: { bg: '#fffaeb', text: '#f79009', flagFill: '#F79009', flagStroke: '#F79009' },
  Low: { bg: '#ecfdf3', text: '#12b76a', flagFill: '#12B76A', flagStroke: '#12B76A' },
};
const TYPE_CONFIG: Record<string, { bg: string; text: string }> = {
  NEW: { bg: '#e6f2fc', text: '#0072d6' },
  EXPANSION: { bg: '#f4ebff', text: '#9e77ed' },
  RENEWAL: { bg: '#dcfce7', text: '#16a34a' },
};

function UnassignedAdd() {
  return (
    <span
      className="inline-flex size-6 items-center justify-center rounded-full border border-dashed border-primary/50 text-primary"
      title="Assign owner"
    >
      <Plus size={12} />
    </span>
  );
}

const dealById = new Map(DEALS.map((d) => [d.id, d]));
let dealSeq = 110;
const dealData: PipelineModuleData = {
  stages: DEAL_STAGES,
  filterField: { label: 'Priority', get: (c) => String(c.priority ?? '') },
  onCardMove: (cardId, toStageId) => {
    dealData.cards = dealData.cards.map((c) =>
      c.id === cardId ? { ...c, stageId: toStageId } : c
    );
  },
  cards: DEALS.map((d) => ({
    id: d.id,
    stageId: d.stageId,
    ticketId: d.ticketId,
    title: d.title,
    priority: d.priority,
    priorityConfig: d.priority ? PRIORITY_CONFIG[d.priority] : undefined,
    type: d.type,
    typeConfig: d.type ? TYPE_CONFIG[String(d.type)] : undefined,
    metadataFields: [{ icon: 'Building2', value: d.company }],
    dateLabel: d.dateLabel,
    assignedAvatar: d.assignedAvatar,
    isUnassigned: d.isUnassigned,
    unassignedSlot: d.isUnassigned ? <UnassignedAdd /> : undefined,
  })),
  columns: [
    { id: 'title', header: 'Deal', accessor: (c) => c.title },
    { id: 'type', header: 'Type', accessor: (c) => c.type },
    { id: 'stage', header: 'Stage', accessor: (c) => DEAL_STAGES.find((s) => s.id === c.stageId)?.label },
    { id: 'close', header: 'Close', accessor: (c) => c.dateLabel },
  ],
  toDetail: (card) => {
    return {
      id: card.id,
      category: 'Deal',
      label: card.title,
      render: (actions) => {
        const live = dealData.cards.find((c) => c.id === card.id) ?? card;
        const deal = dealById.get(live.id);
        const stage = DEAL_STAGES.find((s) => s.id === live.stageId);
        const closed = live.stageId === 'won' || live.stageId === 'lost';
        const moveTo = (toStageId: string) => {
          dealData.cards = dealData.cards.map((c) =>
            c.id === live.id ? { ...c, stageId: toStageId } : c
          );
          actions.refresh();
        };
        return (
        <RecordDetail
          icon={Briefcase}
          category="Deal"
          title={live.title}
          subtitle={deal?.company ?? String(live.metadataFields?.[0]?.value ?? '')}
          status={
            // The CRM stage machine: forward-only, with Lost guarded behind
            // a required loss reason (the "Mark as Lost" dialog).
            <StatusTransitionDropdown
              size="sm"
              disabled={closed}
              stages={DEAL_STAGES.map((s) =>
                s.id === 'lost'
                  ? {
                      ...s,
                      guard: {
                        title: 'Close deal as Lost',
                        description: 'A loss reason is required before closing — it feeds the win/loss report.',
                        reasonLabel: 'Loss reason',
                        confirmLabel: 'Close Lost',
                        destructive: true,
                      },
                    }
                  : s
              )}
              currentId={live.stageId}
              onTransition={(toId) => moveTo(toId)}
            />
          }
          meta={
            <>
              {live.type ? <Badge variant="secondary" size="sm">{String(live.type)}</Badge> : null}
              {closed ? <Badge variant={live.stageId === 'won' ? 'success' : 'destructive'} size="sm">{stage?.label}</Badge> : null}
            </>
          }
          aside={
            <DetailSection title="Deal facts">
              <FieldGrid
                columns={1}
                fields={[
                  { label: 'Company', value: deal?.company },
                  { label: 'Owner', value: live.assignedAvatar ? `AE ${live.assignedAvatar.letter}` : 'Unassigned' },
                  { label: 'Target close', value: live.dateLabel },
                ]}
              />
            </DetailSection>
          }
        >
          <DetailSection title="Details">
            <FieldGrid
              columns={3}
              fields={[
                { label: 'Company', value: deal?.company },
                { label: 'Type', value: String(live.type) },
                { label: 'Stage', value: stage?.label },
                { label: 'Priority', value: String(live.priority) },
                { label: 'Target close', value: live.dateLabel },
              ]}
            />
          </DetailSection>
          <DetailSection title="Activity">
            <Timeline
              items={[
                { id: 'a', title: 'Deal created', subtitle: 'Acme Sales', timestamp: live.dateLabel, color: 'var(--primary)' },
              ]}
            />
          </DetailSection>
        </RecordDetail>
        );
      },
    };
  },
};

/* ── contacts (entity module, per the CRM demo) ──────────────────────── */

interface SalesContact {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  owner: string;
}

const CONTACTS: SalesContact[] = [
  { id: 'CT-01', name: 'Fatima Al Marri', role: 'Procurement Director', company: 'Northwind Traders', email: 'fatima@northwind.ae', phone: '+971 50 110 2233', owner: 'Dana Reyes' },
  { id: 'CT-02', name: 'James Okafor', role: 'Plant Manager', company: 'Globex Corp', email: 'j.okafor@globex.com', phone: '+971 55 887 1120', owner: 'Sam Patel' },
  { id: 'CT-03', name: 'Priya Nair', role: 'CTO', company: 'Initech', email: 'priya@initech.io', phone: '+971 52 334 9087', owner: 'Dana Reyes' },
  { id: 'CT-04', name: 'Hassan Yusuf', role: 'Ops Lead', company: 'Soylent Inc', email: 'hassan@soylent.co', phone: '+971 54 776 5511', owner: 'Mia Chen' },
  { id: 'CT-05', name: 'Lena Fischer', role: 'VP Engineering', company: 'Hooli', email: 'lena@hooli.com', phone: '+971 50 990 4456', owner: 'Sam Patel' },
];

const contactData: EntityModuleData<SalesContact> = {
  columns: [
    { id: 'name', header: 'Contact', accessor: (r) => r.name, sortable: true },
    { id: 'role', header: 'Role', accessor: (r) => r.role },
    { id: 'company', header: 'Company', accessor: (r) => r.company },
    { id: 'email', header: 'Email', accessor: (r) => r.email },
    { id: 'owner', header: 'Owner', accessor: (r) => r.owner },
  ],
  rows: CONTACTS,
  getRowId: (r) => r.id,
  filterField: { label: 'Owner', get: (r) => r.owner },
  searchText: (r) => `${r.name} ${r.role} ${r.company} ${r.email}`,
  toListItem: (r) => ({ id: r.id, title: r.name, subtitle: `${r.role} · ${r.company}`, trailing: <Badge variant="secondary" size="sm">{r.owner}</Badge> }),
  // STANDARD entity detail — the CRM contact panel shape.
  toDetail: (r) => ({
    id: r.id,
    category: 'Contact',
    label: r.name,
    render: (actions) => {
      const company = companyData.rows.find((c) => c.name === r.company);
      const contactDeals = dealData.cards.filter((c) =>
        (dealById.get(c.id)?.company ?? String(c.metadataFields?.[0]?.value ?? '')) === r.company
      );
      const openDeals = contactDeals.filter((c) => c.stageId !== 'won' && c.stageId !== 'lost');
      return (
        <EntityDetail
          avatarFallback={r.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
          avatarColor="#16a34a"
          statusOverlay={
            <span className="inline-flex items-center rounded-[2px] bg-black/40 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-[0.5px] text-white">
              {r.role}
            </span>
          }
          name={r.name}
          entityId={r.id}
          categoryBadge={
            <span className="inline-flex items-center rounded-[4px] bg-secondary px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.3px] text-primary">
              {r.company}
            </span>
          }
          infoTitle="Contact Details"
          info={[
            { label: 'Email', value: r.email },
            { label: 'Phone', value: r.phone },
            { label: 'Company', value: r.company },
            { label: 'Owner', value: r.owner },
            { label: 'Open Deals', value: String(openDeals.length) },
          ]}
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              render: () => (
                <div className="flex flex-col gap-5">
                  {company ? (
                    <div className="flex justify-end">
                      {/* Cross-module pivot: open Companies WITH this
                          contact's company detail already open. */}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => actions.openModule('companies', { detail: companyData.toDetail!(company) })}
                      >
                        View company
                      </Button>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-3 gap-3">
                    <EntityMetricCard label="Open Deals" value={openDeals.length} sub={`${contactDeals.length} total`} />
                    <EntityMetricCard label="Company">
                      <p className="text-[14px] font-semibold text-foreground">{r.company}</p>
                      {company ? <p className="text-[11px] font-medium text-muted-foreground">{company.industry} · {company.status}</p> : null}
                    </EntityMetricCard>
                    <EntityMetricCard label="Owner">
                      <p className="text-[14px] font-semibold text-foreground">{r.owner}</p>
                      <p className="text-[11px] font-medium text-muted-foreground">Account Executive</p>
                    </EntityMetricCard>
                  </div>
                  <EntityChartCard title="Deals" subtitle="Opportunities at this contact's company">
                    {contactDeals.map((c, i, arr) => (
                      <EntityListItem
                        key={c.id}
                        leading={
                          <span aria-hidden className="size-2.5 rounded-full" style={{ background: DEAL_STAGES.find((s) => s.id === c.stageId)?.color ?? '#667085' }} />
                        }
                        title={String(c.title ?? '')}
                        trailing={
                          <>
                            <span className="text-[11px] font-medium text-muted-foreground">{c.dateLabel}</span>
                            <Badge variant="secondary" size="sm">{DEAL_STAGES.find((s) => s.id === c.stageId)?.label ?? '—'}</Badge>
                          </>
                        }
                        borderBottom={i < arr.length - 1}
                      />
                    ))}
                    {!contactDeals.length ? <p className="py-4 text-center text-[12px] text-muted-foreground">No deals yet.</p> : null}
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
                    <EntityDetailRow label="Company" value={r.company} />
                    <EntityDetailRow label="Role" value={r.role} borderBottom={false} />
                  </div>
                  <div>
                    <EntityDetailRow label="Email" value={r.email} />
                    <EntityDetailRow label="Phone" value={r.phone} borderBottom={false} />
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

/* ── activities (entity module: calls / meetings / tasks) ────────────── */

interface SalesActivity {
  id: string;
  kind: 'Call' | 'Meeting' | 'Task';
  title: string;
  withWhom: string;
  due: string;
  status: 'Upcoming' | 'Overdue' | 'Done';
}

const ACTIVITIES: SalesActivity[] = [
  { id: 'AC-01', kind: 'Call', title: 'Pilot scope call', withWhom: 'James Okafor (Globex)', due: '18 Feb, 10:00', status: 'Upcoming' },
  { id: 'AC-02', kind: 'Meeting', title: 'Enterprise rollout demo', withWhom: 'Lena Fischer (Hooli)', due: '19 Feb, 14:30', status: 'Upcoming' },
  { id: 'AC-03', kind: 'Task', title: 'Send Initech expansion quote', withWhom: 'Priya Nair (Initech)', due: '16 Feb', status: 'Overdue' },
  { id: 'AC-04', kind: 'Call', title: 'Renewal check-in', withWhom: 'Fatima Al Marri (Northwind)', due: '14 Feb, 09:00', status: 'Done' },
  { id: 'AC-05', kind: 'Task', title: 'Draft Soylent annual plan', withWhom: 'Hassan Yusuf (Soylent)', due: '20 Feb', status: 'Upcoming' },
];

const activityBadge = (s: SalesActivity['status']) =>
  s === 'Done' ? 'success' : s === 'Overdue' ? 'destructive' : 'info';

let activitySeq = 5;

const activityData: EntityModuleData<SalesActivity> = {
  columns: [
    { id: 'kind', header: 'Type', cell: (r) => <Badge variant="secondary" size="sm">{r.kind}</Badge> },
    { id: 'title', header: 'Activity', accessor: (r) => r.title, sortable: true },
    { id: 'with', header: 'With', accessor: (r) => r.withWhom },
    { id: 'due', header: 'Due', accessor: (r) => r.due },
    { id: 'status', header: 'Status', cell: (r) => <Badge variant={activityBadge(r.status)} size="sm">{r.status}</Badge> },
  ],
  rows: ACTIVITIES,
  getRowId: (r) => r.id,
  filterField: { label: 'Status', get: (r) => r.status },
  searchText: (r) => `${r.kind} ${r.title} ${r.withWhom} ${r.status}`,
  toListItem: (r) => ({ id: r.id, title: r.title, subtitle: `${r.kind} · ${r.withWhom} · ${r.due}`, trailing: <Badge variant={activityBadge(r.status)} size="sm">{r.status}</Badge> }),
  toDetail: (row) => ({
    id: row.id,
    category: 'Activity',
    label: row.title,
    render: (actions) => {
      const live = activityData.rows.find((a) => a.id === row.id) ?? row;
      const markDone = () => {
        activityData.rows = activityData.rows.map((a) => (a.id === live.id ? { ...a, status: 'Done' as const } : a));
        actions.refresh();
      };
      return (
        <RecordDetail
          icon={live.kind === 'Call' ? Phone : live.kind === 'Meeting' ? Users : CalendarCheck}
          category={live.kind}
          title={live.title}
          subtitle={live.withWhom}
          status={<Badge variant={activityBadge(live.status)} size="sm">{live.status}</Badge>}
          actions={
            live.status !== 'Done' ? (
              <Button size="sm" onClick={markDone}>
                <CheckCircle2 size={14} /> Mark complete
              </Button>
            ) : (
              <Badge variant="success" size="sm">Completed</Badge>
            )
          }
        >
          <DetailSection title="Details">
            <FieldGrid
              columns={2}
              fields={[
                { label: 'Type', value: live.kind },
                { label: 'With', value: live.withWhom },
                { label: 'Due', value: live.due },
                { label: 'Status', value: live.status },
              ]}
            />
          </DetailSection>
        </RecordDetail>
      );
    },
  }),
};

/* ── activities calendar (calendar module) ───────────────────────────── */
// Feb 2026 starts on a Sunday; events bucketed from the activities list.
const ACTIVITY_COLORS: Record<SalesActivity['kind'], string> = {
  Call: '#0072d6',
  Meeting: '#ab47bc',
  Task: '#f79009',
};

const salesCalendar: CalendarModuleData = {
  monthLabel: 'February 2026',
  startWeekday: 0,
  daysInMonth: 28,
  today: 17,
  events: ACTIVITIES.map((a) => {
    const day = parseInt(/^(\d{1,2})/.exec(a.due)?.[1] ?? '0', 10);
    return { day, label: a.title, color: ACTIVITY_COLORS[a.kind] };
  }).filter((e) => e.day > 0),
};

function CeoOverview() {
  const byStage = DEAL_STAGES.map((s) => ({ stage: s.label, deals: DEALS.filter((d) => d.stageId === s.id).length }));
  const customers = COMPANIES.filter((c) => c.status === 'Customer').length;
  return (
    <Dashboard
      dateLabel="This quarter"
      ranges={['This Week', 'This Month', 'This Quarter', 'This Year']}
      kpis={[
        { label: 'Open Deals', value: DEALS.filter((d) => d.stageId !== 'won').length, trend: 'up', trendValue: '+2', icon: <Briefcase size={18} /> },
        { label: 'Won (MTD)', value: DEALS.filter((d) => d.stageId === 'won').length, icon: <Trophy size={18} /> },
        { label: 'Customers', value: customers, icon: <Users size={18} /> },
        { label: 'Pipeline', value: '$394k', trend: 'up', trendValue: '+12%', icon: <DollarSign size={18} /> },
      ]}
      sections={[
        { id: 'stage', title: 'Deals by Stage', icon: <BarChart3 size={16} />, span: 12, children: <BarChart data={byStage} xKey="stage" series={[{ dataKey: 'deals', name: 'Deals', color: 'var(--primary)' }]} height={280} /> },
      ]}
    />
  );
}

export const salesApp: AppConfig = {
  id: 'sales',
  brand: {
    name: 'Acme Sales',
    icon: TrendingUp,
    theme: {
      '--primary': '#16A34A',
      '--primary-foreground': '#FFFFFF',
      '--secondary': '#DCFCE7',
      '--secondary-foreground': '#15803D',
      '--accent': '#16A34A',
      '--sidebar': '#15803D',
      '--ring': '#DCFCE7',
    },
  },
  user: { name: 'Dana Reyes', email: 'dana@acme.io', role: 'Account Executive', avatarFallback: 'DR' },
  collectiveInbox: {
    notificationDot: true,
    render: () => <InboxView data={{ notifications: SALES_NOTIFICATIONS }} />,
  },
  modules: [
    {
      id: 'dashboard',
      type: 'dashboard',
      label: 'Dashboard',
      tabKind: 'instance',
      tabs: [{ id: 'ceo', label: 'CEO Overview', render: () => <CeoOverview /> }],
    },
    {
      id: 'companies',
      type: 'entity',
      label: 'Companies',
      data: companyData,
      tabs: [
        { id: 'list', kind: 'list', label: 'List View' },
        { id: 'grouped', kind: 'grouped-list', label: 'Grouped List' },
      ],
      create: {
        schema: {
          title: 'Add Company',
          description: 'Create a new account.',
          submitLabel: 'Add company',
          fields: [
            { key: 'name', label: 'Company name', required: true, span: 2 },
            { key: 'industry', label: 'Industry' },
            { key: 'owner', label: 'Owner', type: 'select', options: [{ label: 'Dana Reyes', value: 'Dana Reyes' }, { label: 'Sam Patel', value: 'Sam Patel' }, { label: 'Mia Chen', value: 'Mia Chen' }] },
            { key: 'arr', label: 'ARR', placeholder: 'AED / $' },
            { key: 'status', label: 'Status', type: 'select', options: [{ label: 'Prospect', value: 'Prospect' }, { label: 'Customer', value: 'Customer' }, { label: 'Churned', value: 'Churned' }] },
          ],
        },
        onSubmit: (v, actions) => {
          companyData.rows = [
            {
              id: `C-${String(companyData.rows.length + 1).padStart(2, '0')}`,
              name: v.name || 'New company',
              industry: v.industry || '—',
              owner: v.owner || 'Dana Reyes',
              arr: v.arr || '$0',
              status: (v.status as Company['status']) || 'Prospect',
            },
            ...companyData.rows,
          ];
          actions.refresh();
        },
      },
    },
    {
      id: 'deals',
      type: 'pipeline',
      label: 'Deals',
      data: dealData,
      tabs: [
        { id: 'kanban', kind: 'kanban', label: 'Kanban View' },
        { id: 'list', kind: 'list', label: 'List View' },
      ],
      create: {
        schema: {
          title: 'Create Deal',
          description: 'Add a new opportunity to the pipeline.',
          submitLabel: 'Create deal',
          fields: [
            { key: 'title', label: 'Deal name', required: true, span: 2 },
            {
              key: 'company',
              label: 'Company',
              type: 'picker',
              placeholder: 'Choose a company…',
              // Live rows so newly-added companies appear; inline "+ create new"
              // (the CRM pattern) persists into the Companies module.
              pickerOptions: companyData.rows.map((c) => ({
                value: c.id,
                label: c.name,
                subtitle: `${c.industry} · ${c.status}`,
                avatarFallback: c.name.slice(0, 2).toUpperCase(),
                avatarColor: '#16a34a',
              })),
              createNew: {
                label: 'company',
                fields: [
                  { key: 'name', label: 'Company name', required: true, span: 2 },
                  { key: 'industry', label: 'Industry' },
                  { key: 'owner', label: 'Owner', type: 'select', options: [{ label: 'Dana Reyes', value: 'Dana Reyes' }, { label: 'Sam Patel', value: 'Sam Patel' }] },
                ],
                map: (v) => ({
                  value: `C-${String(companyData.rows.length + 1).padStart(2, '0')}`,
                  label: v.name || 'New company',
                  subtitle: `${v.industry || '—'} · Prospect`,
                  avatarFallback: (v.name || 'NC').slice(0, 2).toUpperCase(),
                  avatarColor: '#16a34a',
                }),
                onCreate: (v) => {
                  companyData.rows = [
                    {
                      id: `C-${String(companyData.rows.length + 1).padStart(2, '0')}`,
                      name: v.name || 'New company',
                      industry: v.industry || '—',
                      owner: v.owner || 'Dana Reyes',
                      arr: '$0',
                      status: 'Prospect',
                    },
                    ...companyData.rows,
                  ];
                },
              },
            },
            { key: 'type', label: 'Type', type: 'select', options: [{ label: 'New', value: 'NEW' }, { label: 'Expansion', value: 'EXPANSION' }, { label: 'Renewal', value: 'RENEWAL' }] },
            { key: 'priority', label: 'Priority', type: 'select', options: [{ label: 'High', value: 'High' }, { label: 'Medium', value: 'Medium' }, { label: 'Low', value: 'Low' }] },
            { key: 'close', label: 'Target close', type: 'date' },
          ],
        },
        // New deals land in the Lead stage.
        onSubmit: (v, actions) => {
          dealSeq += 1;
          const company = COMPANIES.find((c) => c.id === v.company);
          const priority = v.priority || 'Medium';
          const type = v.type || 'NEW';
          dealData.cards = [
            {
              id: `D-${dealSeq}`,
              stageId: DEAL_STAGES[0].id,
              ticketId: `D-${dealSeq}`,
              title: v.title || 'Untitled deal',
              priority,
              priorityConfig: PRIORITY_CONFIG[priority],
              type,
              typeConfig: TYPE_CONFIG[type],
              metadataFields: company ? [{ icon: 'Building2', value: company.name }] : [],
              dateLabel: v.close || 'TBD',
              isUnassigned: true,
              unassignedSlot: <UnassignedAdd />,
            },
            ...dealData.cards,
          ];
          actions.refresh();
        },
      },
    },
    {
      id: 'contacts',
      type: 'entity',
      label: 'Contacts',
      icon: Contact2,
      data: contactData,
      tabs: [
        { id: 'list', kind: 'list', label: 'List View' },
        { id: 'grouped', kind: 'grouped-list', label: 'Grouped List' },
      ],
      create: {
        schema: {
          title: 'Add Contact',
          description: 'Create a new contact on an account.',
          submitLabel: 'Add contact',
          fields: [
            { key: 'name', label: 'Full name', required: true, span: 2 },
            { key: 'role', label: 'Role' },
            { key: 'company', label: 'Company', type: 'select', options: COMPANIES.map((c) => ({ label: c.name, value: c.name })) },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'owner', label: 'Owner', type: 'select', options: [{ label: 'Dana Reyes', value: 'Dana Reyes' }, { label: 'Sam Patel', value: 'Sam Patel' }, { label: 'Mia Chen', value: 'Mia Chen' }] },
          ],
        },
        onSubmit: (v, actions) => {
          contactData.rows = [
            {
              id: `CT-${String(contactData.rows.length + 1).padStart(2, '0')}`,
              name: v.name || 'New contact',
              role: v.role || '—',
              company: v.company || '—',
              email: v.email || '—',
              phone: v.phone || '—',
              owner: v.owner || 'Dana Reyes',
            },
            ...contactData.rows,
          ];
          actions.refresh();
        },
      },
    },
    {
      id: 'activities',
      type: 'entity',
      label: 'Activities',
      icon: CalendarCheck,
      data: activityData,
      tabs: [
        { id: 'list', kind: 'list', label: 'List View' },
        { id: 'grouped', kind: 'grouped-list', label: 'Grouped List' },
      ],
      create: {
        schema: {
          title: 'Log Activity',
          description: 'Schedule a call, meeting, or task.',
          submitLabel: 'Log activity',
          fields: [
            { key: 'title', label: 'Title', required: true, span: 2 },
            { key: 'kind', label: 'Type', type: 'select', options: [{ label: 'Call', value: 'Call' }, { label: 'Meeting', value: 'Meeting' }, { label: 'Task', value: 'Task' }] },
            { key: 'withWhom', label: 'With', placeholder: 'Contact (Company)' },
            { key: 'due', label: 'Due', placeholder: 'e.g. 21 Feb, 11:00' },
          ],
        },
        onSubmit: (v, actions) => {
          activitySeq += 1;
          activityData.rows = [
            {
              id: `AC-${String(activitySeq).padStart(2, '0')}`,
              kind: (v.kind as SalesActivity['kind']) || 'Task',
              title: v.title || 'Untitled activity',
              withWhom: v.withWhom || '—',
              due: v.due || 'TBD',
              status: 'Upcoming',
            },
            ...activityData.rows,
          ];
          actions.refresh();
        },
      },
    },
    { id: 'calendar', type: 'calendar', label: 'Calendar', data: salesCalendar },
  ],
};
