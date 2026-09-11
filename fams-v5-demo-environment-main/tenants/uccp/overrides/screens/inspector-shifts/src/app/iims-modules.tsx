/**
 * iims-modules — builds the FAMS V5 AppShell `AppConfig` for IIMS · Inspector.
 *
 * The Incidents and Inspections modules are authored as **config-driven DS
 * pipeline modules**: we hand the shell a `PipelineModuleData` (stages + cards +
 * facets + sort + list columns) derived live from the `useIims` store, and the
 * built-in pipeline renderer draws the real DS kanban/list chrome (tinted column
 * headers, count badges, structured cards, facet toolbar, detail side-sheet).
 *
 * The genuinely-bespoke inspector surfaces stay bespoke and plug into the
 * documented extension points: the detail side-sheet renders our existing
 * Incident/Inspection detail flows (embedded mode) via `toDetail`; the wizards
 * (Report Incident / New Inspection) keep launching from the Home tiles.
 */
import * as React from 'react';
import * as Icons from '@ds/icons';
import { Logo } from '@ds/components/basics';
import type {
  AppConfig, ModuleConfig, PipelineModuleData, PipelineCardModel, DetailDescriptor, InboxModuleData,
} from '@ds/components/app-shell';
import type { MapZone } from '@ds/components/map';
import type { DataTableColumn } from '@ds/components/data-display';
import { useIims, PROJECT_OFFICER } from '@/store/store';
import { useNav } from '@/app/nav';
import {
  buildDashboardModule, buildInspectorMgmtModule, buildEspDashboardModule,
} from './po-modules';
import { buildInspectorShiftsModule } from './inspector-shifts';
import { INCIDENT_STATUS, INCIDENT_STATUS_ORDER, INSPECTION_STATUS, SEVERITY } from '@/data/status';
import { slaLabel, formatDate, formatDateTime, formatAed, initials } from '@/lib/ui';
import { Home } from '@/screens/Home';
import { IncidentDetailFlow } from '@/flows/IncidentDetail';
import { InspectionDetailFlow } from '@/flows/InspectionDetail';
import type { Incident, Inspection, InspectionStatus } from '@/data/types';

type Store = ReturnType<typeof useIims>;

/* ── Hybrid-map geo helpers (list + map view) ───────────────────────────────
 * Zones carry only a centre, so we synthesize a small deterministic polygon box
 * around each for the map's zone overlay, coloured by the zone's risk level. */
const DOHA_CENTER: [number, number] = [25.2854, 51.5310];
/** View tabs for the Incidents / Inspections pipelines — adds Hybrid (list+map). */
const PIPELINE_VIEW_TABS = [
  { id: 'kanban', kind: 'kanban' as const, label: 'Kanban View' },
  { id: 'list', kind: 'list' as const, label: 'List View' },
  { id: 'hybrid', kind: 'hybrid' as const, label: 'Hybrid View' },
];
const RISK_COLOR: Record<'low' | 'medium' | 'high', string> = {
  low: '#12B76A', medium: '#F79009', high: '#F04438',
};
const zoneSeed = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return Math.abs(h); };
function zonePolygon(center: { lat: number; lng: number }, seed: number): [number, number][] {
  const d = 0.016; // ~1.8km half-box
  const j = (n: number) => (((seed * 9301 + n * 49297) % 233280) / 233280) * 0.008 - 0.004;
  return [
    [center.lat + d + j(1), center.lng - d + j(2)],
    [center.lat + d + j(3), center.lng + d + j(4)],
    [center.lat - d + j(5), center.lng + d + j(6)],
    [center.lat - d + j(7), center.lng - d + j(8)],
  ];
}
function buildMapZones(s: Store, zoneIds: string[]): MapZone[] {
  return Array.from(new Set(zoneIds))
    .map((id) => {
      const z = s.zone(id);
      if (!z) return null;
      return { id, label: z.name, points: zonePolygon(z.center, zoneSeed(id)), color: RISK_COLOR[z.riskLevel], fillOpacity: 0.16 } as MapZone;
    })
    .filter(Boolean) as MapZone[];
}

/* ════════════════════════════ Incidents pipeline ═══════════════════════════ */

function buildIncidentsData(s: Store, showPenalties = false, role: 'inspector' | 'esp' | 'po' = 'inspector', espId?: string): PipelineModuleData {
  // The ESP app is single-tenant per contractor: when an espId is given, the
  // board only ever shows that contractor's own incidents.
  const incidents = espId ? s.data.incidents.filter((i) => i.espId === espId) : s.data.incidents;
  const byId = new Map(incidents.map((i) => [i.id, i]));

  // Stage column labels match the live IIMS platform's incident board
  // (the "Closed" column reads "Closed < 3 Days" there).
  const STAGE_LABELS: Record<string, string> = { closed: 'Closed < 3 Days' };
  const baseStages = INCIDENT_STATUS_ORDER.map((st) => ({
    id: st,
    label: STAGE_LABELS[st] ?? INCIDENT_STATUS[st].label,
    color: INCIDENT_STATUS[st].color,
  }));
  // PO-only: a leading "Reported Incidents" triage lane holding freshly-reported
  // incidents (reported in the last 3 days, not yet dispatched to an ESP). This
  // is a presentation grouping for the PO board only — the incident's status is
  // unchanged (still awaiting_rectification underneath).
  const REPORTED_WINDOW_MS = 3 * 86400000;
  const isReported = (inc: Incident) =>
    role === 'po' && inc.status === 'awaiting_rectification' && (s.now - new Date(inc.reportedAt).getTime()) <= REPORTED_WINDOW_MS;
  const stages = role === 'po'
    ? [{ id: 'reported', label: 'Reported Incidents', color: '#9E77ED' }, ...baseStages]
    : baseStages;

  const cards: PipelineCardModel[] = incidents.map((inc) => {
    const zone = s.zone(inc.zoneId);
    const esp = s.esp(inc.espId);
    const reporter = s.inspector(inc.reportedByInspectorId);
    const sla = slaLabel(inc.slaDueAt, s.now);
    const sev = SEVERITY[inc.severity];
    const avatars = [
      esp && { letter: esp.name[0].toUpperCase(), color: esp.avatarColor },
      reporter && { letter: reporter.name[0].toUpperCase(), color: reporter.avatarColor },
    ].filter(Boolean) as { letter: string; color: string }[];

    return {
      id: inc.id,
      stageId: isReported(inc) ? 'reported' : inc.status,
      location: [inc.location.lat, inc.location.lng] as [number, number],
      zoneId: inc.zoneId,
      ticketId: inc.id.replace('INC-2026-', ''),
      priority: sev.label,
      priorityConfig: {
        bg: `color-mix(in srgb, ${sev.color} 14%, transparent)`,
        text: sev.color, flagFill: sev.color, flagStroke: sev.color,
      },
      type: inc.zeroTolerance ? 'Zero Tolerance' : inc.category,
      typeConfig: inc.zeroTolerance
        ? { bg: 'color-mix(in srgb, var(--status-error) 14%, transparent)', text: 'var(--status-error)' }
        : { bg: 'var(--secondary)', text: 'var(--secondary-foreground)' },
      title: inc.title,
      metadataFields: [
        { icon: 'MapPin', value: zone?.name ?? '—' },
        { icon: 'Tag', value: inc.category },
      ],
      avatars,
      dateLabel: sla.text,
      isOverdue: sla.overdue,
    };
  });

  const inc = (c: PipelineCardModel) => byId.get(c.id)!;
  const uniq = (vals: string[]) => Array.from(new Set(vals));

  const columns: DataTableColumn<PipelineCardModel>[] = [
    { id: 'id', header: 'ID', accessor: (c) => inc(c).id, width: '120px', sortable: true },
    { id: 'title', header: 'Violation', accessor: (c) => inc(c).title, sortable: true },
    { id: 'category', header: 'Category', accessor: (c) => inc(c).category, width: '150px', sortable: true },
    { id: 'severity', header: 'Severity', accessor: (c) => SEVERITY[inc(c).severity].label, width: '100px', sortable: true },
    { id: 'zone', header: 'Zone', accessor: (c) => s.zone(inc(c).zoneId)?.name ?? '—', width: '130px', sortable: true },
    { id: 'esp', header: 'ESP', accessor: (c) => s.esp(inc(c).espId)?.name ?? '—', width: '150px', sortable: true },
    { id: 'status', header: 'Status', accessor: (c) => INCIDENT_STATUS[inc(c).status].label, width: '180px' },
    { id: 'sla', header: 'SLA Due', accessor: (c) => slaLabel(inc(c).slaDueAt, s.now).text, width: '120px', sortable: true },
  ];

  return {
    stages,
    cards,
    columns,
    mapCenter: DOHA_CENTER,
    mapZones: buildMapZones(s, incidents.map((i) => i.zoneId)),
    toDetail: (card): DetailDescriptor => ({
      id: card.id,
      label: inc(card).title,
      category: '#' + card.ticketId,
      render: (actions) => (
        <IncidentDetailFlow incidentId={card.id} embedded showPenalties={showPenalties} role={role} onClose={actions.closeDetails} />
      ),
    }),
    searchText: (c) => {
      const i = inc(c);
      return [i.id, i.title, i.category, s.zone(i.zoneId)?.name, s.esp(i.espId)?.name].filter(Boolean).join(' ');
    },
    facets: [
      {
        col: 'status', label: 'Status', icon: 'Flag06',
        get: (c) => inc(c).status,
        options: INCIDENT_STATUS_ORDER.map((st) => ({ value: st, label: STAGE_LABELS[st] ?? INCIDENT_STATUS[st].label })),
      },
      {
        col: 'severity', label: 'Severity', icon: 'AlertTriangle',
        get: (c) => inc(c).severity,
        options: (['low', 'medium', 'high', 'critical'] as const).map((v) => ({ value: v, label: SEVERITY[v].label })),
      },
      {
        col: 'category', label: 'Category', icon: 'Tag01',
        get: (c) => inc(c).category,
        options: uniq(incidents.map((i) => i.category)).map((v) => ({ value: v, label: v })),
      },
      {
        col: 'zone', label: 'Zone', icon: 'MarkerPin01',
        get: (c) => inc(c).zoneId,
        options: uniq(incidents.map((i) => i.zoneId)).map((id) => ({ value: id, label: s.zone(id)?.name ?? id })),
      },
    ],
    sortFields: [
      { key: 'sla', label: 'SLA Due', get: (c) => new Date(inc(c).slaDueAt).getTime() },
      { key: 'reported', label: 'Reported', get: (c) => new Date(inc(c).reportedAt).getTime() },
      { key: 'severity', label: 'Severity', get: (c) => ['low', 'medium', 'high', 'critical'].indexOf(inc(c).severity) },
    ],
  };
}

/* ═══════════════════════════ Inspections pipeline ══════════════════════════ */

const INSPECTION_STAGE_ORDER: InspectionStatus[] = ['scheduled', 'ongoing', 'overdue', 'completed'];

function buildInspectionsData(s: Store): PipelineModuleData {
  const inspections = s.data.inspections;
  const byId = new Map(inspections.map((i) => [i.id, i]));
  const present = INSPECTION_STAGE_ORDER.filter((st) => inspections.some((i) => i.status === st));
  const order = present.length ? present : INSPECTION_STAGE_ORDER;

  const stages = order.map((st) => ({
    id: st,
    label: INSPECTION_STATUS[st].label,
    color: INSPECTION_STATUS[st].color,
  }));

  const cards: PipelineCardModel[] = inspections.map((ins) => {
    const zone = s.zone(ins.zoneId);
    const insp = s.inspector(ins.inspectorId);
    const avatars = insp ? [{ letter: insp.name[0].toUpperCase(), color: insp.avatarColor }] : [];
    // Result badge belongs only on Completed cards (spec); others show nothing.
    const dateLabel = ins.status === 'completed'
      ? (ins.result === 'compliant' ? 'Compliant' : ins.result === 'non_compliant' ? 'Non-Compliant' : ins.result === 'partial' ? 'Partial' : ins.scorePct != null ? `${ins.scorePct}%` : undefined)
      : undefined;

    return {
      id: ins.id,
      stageId: ins.status,
      location: [ins.location.lat, ins.location.lng] as [number, number],
      zoneId: ins.zoneId,
      ticketId: ins.id.replace('INSP-2026-', ''),
      type: ins.type === 'adhoc' ? 'Ad-hoc' : 'Planned',
      typeConfig: ins.type === 'adhoc'
        ? { bg: 'var(--secondary)', text: 'var(--secondary-foreground)' }
        : { bg: 'color-mix(in srgb, var(--primary) 12%, transparent)', text: 'var(--primary)' },
      title: ins.title,
      metadataFields: [
        { icon: 'MapPin', value: zone?.name ?? '—' },
        { icon: 'Calendar', value: formatDateTime(ins.scheduledFor) },
      ],
      avatars,
      dateLabel,
    };
  });

  const ins = (c: PipelineCardModel) => byId.get(c.id)!;
  const uniq = (vals: string[]) => Array.from(new Set(vals));

  const columns: DataTableColumn<PipelineCardModel>[] = [
    { id: 'id', header: 'ID', accessor: (c) => ins(c).id, width: '120px', sortable: true },
    { id: 'title', header: 'Inspection', accessor: (c) => ins(c).title, sortable: true },
    { id: 'type', header: 'Type', accessor: (c) => (ins(c).type === 'adhoc' ? 'Ad-hoc' : 'Planned'), width: '100px', sortable: true },
    { id: 'zone', header: 'Zone', accessor: (c) => s.zone(ins(c).zoneId)?.name ?? '—', width: '140px', sortable: true },
    { id: 'observations', header: 'Observations', accessor: (c) => ins(c).observationIncidentIds.length, width: '120px', sortable: true },
    { id: 'inspector', header: 'Inspector', accessor: (c) => s.inspector(ins(c).inspectorId)?.name ?? '—', width: '160px', sortable: true },
    { id: 'scheduled', header: 'Scheduled', accessor: (c) => formatDate(ins(c).scheduledFor), width: '130px', sortable: true },
    { id: 'timeTaken', header: 'Time Taken', accessor: (c) => { const m = ins(c).timeTakenMins; return m == null ? '—' : m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; }, width: '110px', sortable: true },
    { id: 'status', header: 'Status', accessor: (c) => INSPECTION_STATUS[ins(c).status].label, width: '120px' },
    { id: 'result', header: 'Result', accessor: (c) => { const r = ins(c).result; return r === 'compliant' ? 'Satisfactory' : r === 'non_compliant' ? 'Not Satisfactory' : r === 'partial' ? 'Partial' : '—'; }, width: '140px' },
  ];

  return {
    stages,
    cards,
    columns,
    mapCenter: DOHA_CENTER,
    mapZones: buildMapZones(s, inspections.map((i) => i.zoneId)),
    toDetail: (card): DetailDescriptor => ({
      id: card.id,
      label: ins(card).title,
      category: '#' + card.ticketId,
      render: (actions) => (
        <InspectionDetailFlow inspectionId={card.id} embedded onClose={actions.closeDetails} />
      ),
    }),
    searchText: (c) => {
      const i = ins(c);
      return [i.id, i.title, s.zone(i.zoneId)?.name, s.inspector(i.inspectorId)?.name].filter(Boolean).join(' ');
    },
    facets: [
      {
        col: 'status', label: 'Status', icon: 'Flag06',
        get: (c) => ins(c).status,
        options: order.map((st) => ({ value: st, label: INSPECTION_STATUS[st].label })),
      },
      {
        col: 'type', label: 'Type', icon: 'Tag01',
        get: (c) => ins(c).type,
        options: [{ value: 'planned', label: 'Planned' }, { value: 'adhoc', label: 'Ad-hoc' }],
      },
      {
        col: 'zone', label: 'Zone', icon: 'MarkerPin01',
        get: (c) => ins(c).zoneId,
        options: uniq(inspections.map((i) => i.zoneId)).map((id) => ({ value: id, label: s.zone(id)?.name ?? id })),
      },
    ],
    sortFields: [
      { key: 'scheduled', label: 'Scheduled', get: (c) => new Date(ins(c).scheduledFor).getTime() },
      { key: 'title', label: 'Title', get: (c) => ins(c).title },
    ],
  };
}

/* ════════════════════════════ Penalties pipeline ═══════════════════════════ */
/* PO sub-task derived from incidents that carry a penalty; each penalty's detail
 * is its parent incident (Penalties tab), reachable from the parent task. */

const PENALTY_STAGES = [
  { id: 'issued', label: 'Issued', color: '#F79009' },
  { id: 'acknowledged', label: 'Acknowledged', color: '#06B6D4' },
  { id: 'disputed', label: 'Disputed', color: '#F04438' },
  { id: 'paid', label: 'Paid', color: '#12B76A' },
] as const;

function buildPenaltiesData(s: Store, role: 'inspector' | 'esp' | 'po' = 'po', espId?: string): PipelineModuleData {
  // Scoped to a single contractor in the ESP app (one app instance per ESP).
  const penalised = s.data.incidents.filter((i) => i.penaltyAed > 0 && (!espId || i.espId === espId));
  const byId = new Map(penalised.map((i) => [i.id, i]));
  const inc = (c: PipelineCardModel) => byId.get(c.id)!;
  const uniq = (vals: string[]) => Array.from(new Set(vals));

  const cards: PipelineCardModel[] = penalised.map((i) => {
    const zone = s.zone(i.zoneId);
    const esp = s.esp(i.espId);
    const sev = SEVERITY[i.severity];
    return {
      id: i.id,
      // Column reflects the penalty's REAL status so the board matches the detail
      // and moves when the status transitions (was a stale hash of the id).
      stageId: s.penaltyForIncident(i.id)?.status ?? 'issued',
      ticketId: i.id.replace('INC-2026-', 'PEN-'),
      priority: sev.label,
      priorityConfig: { bg: `color-mix(in srgb, ${sev.color} 14%, transparent)`, text: sev.color, flagFill: sev.color, flagStroke: sev.color },
      type: i.category,
      typeConfig: { bg: 'var(--secondary)', text: 'var(--secondary-foreground)' },
      title: i.title,
      metadataFields: [
        { icon: 'MapPin', value: zone?.name ?? '—' },
        { icon: 'Building2', value: esp?.name ?? '—' },
      ],
      avatars: esp ? [{ letter: esp.name[0].toUpperCase(), color: esp.avatarColor }] : [],
      dateLabel: formatAed(i.penaltyAed),
    };
  });

  return {
    stages: PENALTY_STAGES.map((p) => ({ id: p.id, label: p.label, color: p.color })),
    cards,
    columns: [
      { id: 'pen', header: 'Penalty', accessor: (c) => inc(c).id.replace('INC-2026-', 'PEN-'), width: '120px', sortable: true },
      { id: 'title', header: 'Violation', accessor: (c) => inc(c).title, sortable: true },
      { id: 'esp', header: 'ESP', accessor: (c) => s.esp(inc(c).espId)?.name ?? '—', width: '160px', sortable: true },
      { id: 'zone', header: 'Zone', accessor: (c) => s.zone(inc(c).zoneId)?.name ?? '—', width: '140px', sortable: true },
      { id: 'amount', header: 'Amount', accessor: (c) => formatAed(inc(c).penaltyAed), width: '120px', sortable: true },
    ],
    toDetail: (card): DetailDescriptor => ({
      id: card.id, label: inc(card).title, category: card.ticketId,
      render: (actions) => <IncidentDetailFlow incidentId={card.id} embedded showPenalties role={role} onClose={actions.closeDetails} />,
    }),
    searchText: (c) => { const i = inc(c); return [i.id, i.title, s.zone(i.zoneId)?.name, s.esp(i.espId)?.name].filter(Boolean).join(' '); },
    facets: [
      { col: 'esp', label: 'ESP', icon: 'Building07', get: (c) => inc(c).espId, options: uniq(penalised.map((i) => i.espId)).map((id) => ({ value: id, label: s.esp(id)?.name ?? id })) },
      { col: 'zone', label: 'Zone', icon: 'MarkerPin01', get: (c) => inc(c).zoneId, options: uniq(penalised.map((i) => i.zoneId)).map((id) => ({ value: id, label: s.zone(id)?.name ?? id })) },
      { col: 'severity', label: 'Severity', icon: 'AlertTriangle', get: (c) => inc(c).severity, options: (['low', 'medium', 'high', 'critical'] as const).map((v) => ({ value: v, label: SEVERITY[v].label })) },
    ],
    sortFields: [
      { key: 'amount', label: 'Amount', get: (c) => inc(c).penaltyAed },
      { key: 'reported', label: 'Reported', get: (c) => new Date(inc(c).reportedAt).getTime() },
    ],
  };
}

/* ═══════════════════════════════ Cross-app Inbox ═══════════════════════════ */

function buildInbox(s: Store, espId?: string): InboxModuleData {
  // ESP app is single-tenant: only THIS contractor's incidents, and only the
  // buckets an ESP acts on (rectification required · escalated). No other
  // contractor's data, and no PO/inspector "verification pending" items.
  if (espId) {
    const mine = s.data.incidents.filter((i) => i.espId === espId);
    const toRectify = mine.filter((i) => i.status === 'awaiting_rectification' || i.status === 'awaiting_esp_re_rectification').slice(0, 6);
    const esc = mine.filter((i) => i.status === 'escalated').slice(0, 5);
    const notifications = [
      ...toRectify.map((i) => ({
        id: `nf-rect-${i.id}`, kind: 'system' as const,
        title: `Rectification required · ${i.title}`,
        description: `${s.zone(i.zoneId)?.name ?? ''}`,
        sourceTag: i.id.replace('INC-2026-', '#'), module: 'IIMS',
        dueLabel: 'Today', dateGroup: 'Today', categories: ['assigned' as const],
      })),
      ...esc.map((i) => ({
        id: `nf-esc-${i.id}`, kind: 'alert' as const,
        title: `Escalated · ${i.title}`,
        description: `${s.zone(i.zoneId)?.name ?? ''}`,
        sourceTag: i.id.replace('INC-2026-', '#'), module: 'IIMS',
        priority: 'Critical' as const, dateGroup: 'Today', categories: ['critical' as const],
      })),
    ];
    return { title: 'Inbox', notifications };
  }
  const esc = s.data.incidents.filter((i) => i.status === 'escalated').slice(0, 6);
  const pend = s.data.incidents.filter((i) => i.status === 'rectification_submitted').slice(0, 5);
  const notifications = [
    ...esc.map((i) => ({
      id: `nf-esc-${i.id}`, kind: 'alert' as const,
      title: `Escalated · ${i.title}`,
      description: `${s.zone(i.zoneId)?.name ?? ''} · ${s.esp(i.espId)?.name ?? ''}`,
      sourceTag: i.id.replace('INC-2026-', '#'), module: 'IIMS',
      priority: 'Critical' as const, dateGroup: 'Today', categories: ['critical' as const],
    })),
    ...pend.map((i) => ({
      id: `nf-pv-${i.id}`, kind: 'system' as const,
      title: `Verification pending · ${i.title}`,
      description: `Rectification submitted by ${s.esp(i.espId)?.name ?? ''}`,
      sourceTag: i.id.replace('INC-2026-', '#'), module: 'IIMS',
      dueLabel: 'Today', dateGroup: 'Today', categories: ['assigned' as const],
    })),
  ];
  return { title: 'Inbox', notifications };
}

/* ═══════════════════════════════ App configs ═══════════════════════════════ */

const famsLogo = <Logo brand="fams" variant="icon" height={26} className="brightness-0 invert" aria-label="FAMS" />;

/** Bridges the DS toolbar "Create New" button to a bespoke wizard: on open it
 *  launches the NavProvider overlay (Report Incident / New Inspection) and closes
 *  the empty create sheet. */
function CreateLauncher({ launch, close }: { launch: () => void; close: () => void }) {
  React.useEffect(() => { launch(); close(); /* eslint-disable-line */ }, []);
  return null;
}

/** Build all IIMS apps for the shared AppShell app rail: Inspector · Project
 *  Officer · ESP. One system, one store; the blue rail switches apps. */
export function useIimsApps(): AppConfig[] {
  const s = useIims();
  const nav = useNav();
  // Memoize on the store snapshot so the apps array keeps a stable identity
  // across cosmetic re-renders — otherwise AppShell resets to the first app on
  // every render. Rebuilds only when store data actually changes.
  return React.useMemo<AppConfig[]>(() => {
  const me = s.currentInspector();
  const inbox = buildInbox(s);

  /* ── IIMS · Inspector ── */
  const insApp: AppConfig = {
    id: 'iims-ins',
    brand: { name: 'IIMS · Inspector', logo: famsLogo, icon: Icons.ClipboardCheck },
    user: { name: me.name, role: 'Inspector', avatarFallback: initials(me.name) },
    collectiveInbox: { notificationDot: true, data: inbox },
    // All modules stay in the rail. When off duty the non-Home rail items are
    // made non-clickable via CSS (see IimsShell `data-duty` + index.css); create
    // actions are gated too.
    modules: [
      { id: 'home', type: 'dashboard', label: 'Home', icon: Icons.Home01, render: (ctx) => <Home openDetail={ctx.openDetail} /> },
      { id: 'incidents', type: 'pipeline', label: 'Incidents', icon: Icons.AlertTriangle, tabs: PIPELINE_VIEW_TABS, data: buildIncidentsData(s, false, 'inspector'),
        ...(s.data.onDuty ? { create: { render: (close: () => void) => <CreateLauncher launch={() => nav.openReportIncident()} close={close} /> } } : {}) },
      { id: 'inspections', type: 'pipeline', label: 'Inspections', icon: Icons.ClipboardCheck, tabs: PIPELINE_VIEW_TABS, data: buildInspectionsData(s),
        ...(s.data.onDuty ? { create: { render: (close: () => void) => <CreateLauncher launch={() => nav.openNewInspection()} close={close} /> } } : {}) },
      // NOTE: the "My Tasks" rail module is intentionally hidden for the Inspector.
      // Scheduled tasks still live on Home's "My Tasks" tab, which is where an
      // inspection is started (task → Start → New Inspection).
    ],
  };

  /* ── IIMS · Project Officer ── */
  const poApp: AppConfig = {
    id: 'iims-po',
    brand: { name: 'IIMS · Project Officer', logo: famsLogo, icon: Icons.Building07 },
    user: { name: PROJECT_OFFICER.name, role: 'Project Officer', avatarFallback: initials(PROJECT_OFFICER.name) },
    collectiveInbox: { notificationDot: true, data: inbox },
    modules: [
      buildDashboardModule(s),
      { id: 'incidents', type: 'pipeline', label: 'Incidents', icon: Icons.AlertTriangle, tabs: PIPELINE_VIEW_TABS, data: buildIncidentsData(s, true, 'po') },
      { id: 'inspections', type: 'pipeline', label: 'Inspections', icon: Icons.ClipboardCheck, tabs: PIPELINE_VIEW_TABS, data: buildInspectionsData(s) },
      { id: 'penalties', type: 'pipeline', label: 'Penalties', icon: Icons.CurrencyDollarCircle, data: buildPenaltiesData(s, 'po') },
      buildInspectorMgmtModule(s),
      buildInspectorShiftsModule(s),
    ],
  };

  /* ── IIMS · ESP (contractor) — self-monitoring dashboard + work queues ── */
  const ESP_ID = 'esp-bayan';
  const currentEsp = s.esp(ESP_ID);
  const espApp: AppConfig = {
    id: 'iims-esp',
    brand: { name: 'IIMS · ESP', logo: famsLogo, icon: Icons.Truck01 },
    user: { name: currentEsp?.name ?? 'Bayan Ops', role: 'Contractor', avatarFallback: initials(currentEsp?.name ?? 'Bayan Facility Care') },
    collectiveInbox: { notificationDot: true, data: buildInbox(s, ESP_ID) },
    modules: [
      buildEspDashboardModule(s, ESP_ID),
      { id: 'rectifications', type: 'pipeline', label: 'Rectifications', icon: Icons.AlertTriangle, data: buildIncidentsData(s, true, 'esp', ESP_ID) },
      { id: 'penalties', type: 'pipeline', label: 'Penalties', icon: Icons.CurrencyDollarCircle, data: buildPenaltiesData(s, 'esp', ESP_ID) },
    ],
  };

  return [insApp, poApp, espApp];
  }, [s, nav]);
}
