/**
 * InspectionDetail — right side-sheet body, restyled to the DS TaskDetail
 * visual language (26px title, joined [# id][⚠ type] pill group, 2-column
 * horizontal InfoRow grid, collapsible TaskSections, underline tabs).
 * Sections: header, details grid, mini-map, checklist results,
 * activity timeline, related incidents list.
 */
import * as React from 'react';
import { Badge, Button } from '@ds/components/primitives';
import { TaskInfoRow, TaskSection } from '@ds/components/app-shell';
import { StatePill } from '@ds/components/data-display';
import * as Icons from '@ds/icons';
import { useIims } from '@/store/store';
import { useNav } from '@/app/nav';
import {
  InspectionStatusPill, InspectionResultPill, IncidentStatusPill,
  AvatarChip, formatDate, formatDateTime,
} from '@/lib/ui';
import { IncidentMap } from '@/lib/IncidentMap';
import { kpiCategoriesForZone, KPI_CATEGORIES } from '@/data/catalog';
import type { KpiCategory } from '@/data/types';

/* ========================= component ==================================== */
export function InspectionDetailFlow({
  inspectionId,
  onClose,
  embedded,
}: {
  inspectionId: string;
  onClose: () => void;
  embedded?: boolean;
}) {
  const s = useIims();
  const nav = useNav();
  const [activeTab, setActiveTab] = React.useState<'kpis' | 'timeline' | 'incidents'>('kpis');

  const inspection = s.inspectionById(inspectionId);

  /* Close on Escape */
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!inspection) {
    return (
      <div
        className={embedded ? 'contents' : 'fixed inset-0 z-[680] flex justify-end bg-black/50'}
        onClick={embedded ? undefined : onClose}
        role={embedded ? undefined : 'dialog'}
        aria-modal={embedded ? undefined : true}
      >
        <div
          className={embedded
            ? 'flex h-full w-full flex-col bg-card'
            : 'flex h-full w-[640px] flex-col border-l border-border bg-card'}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <span className="text-body-sm text-muted-foreground">
              Inspection not found: {inspectionId}
            </span>
            {!embedded && (
              <Button variant="ghost" size="icon" onClick={onClose} className="ml-auto">
                <Icons.XClose size={18} />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const zone = s.zone(inspection.zoneId);
  const esp = s.esp(inspection.espId);
  const insp = s.inspector(inspection.inspectorId);

  /* Time taken */
  const timeTakenLabel = inspection.timeTakenMins != null
    ? (() => {
        const h = Math.floor(inspection.timeTakenMins / 60);
        const m = inspection.timeTakenMins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      })()
    : '—';

  /* Related incidents reported during this inspection */
  const relatedIncidents = inspection.observationIncidentIds
    .map((id) => s.incident(id))
    .filter((i): i is NonNullable<typeof i> => i != null);

  /* Timeline — lifecycle steps interleaved with each reported incident, ordered
   * by time; "Completed" always sits last. */
  type TLStep = { key: string; label: React.ReactNode; icon: typeof Icons.Calendar; at?: string; done: boolean; tone?: 'incident'; incidentId?: string };
  const timelineSteps: TLStep[] = [
    { key: 'scheduled', label: 'Scheduled', icon: Icons.Calendar, at: inspection.scheduledFor, done: true },
    { key: 'started', label: 'Started', icon: Icons.Play, at: inspection.startedAt, done: !!inspection.startedAt },
    ...relatedIncidents.map((inc): TLStep => ({
      key: `inc-${inc.id}`, label: `Incident reported · ${inc.title}`, icon: Icons.AlertTriangle,
      at: inc.reportedAt, done: true, tone: 'incident', incidentId: inc.id,
    })),
  ].sort((a, b) => (a.at ? new Date(a.at).getTime() : 0) - (b.at ? new Date(b.at).getTime() : 0));
  timelineSteps.push({ key: 'completed', label: 'Completed', icon: Icons.CheckCircle, at: inspection.completedAt, done: !!inspection.completedAt });

  /* KPI results — the categories assessed this inspection, mirroring the New
   * Inspection "Inspection KPIs" table. A category with ≥1 reported incident
   * reads Not Satisfactory (reporting one is exactly the "Not Satisfactory"
   * action in the flow); the rest read Satisfactory. Each row also shows how
   * many incidents were reported against that KPI. */
  const incidentsByCat = new Map<KpiCategory, typeof relatedIncidents>();
  for (const inc of relatedIncidents) {
    const arr = incidentsByCat.get(inc.category) ?? [];
    arr.push(inc);
    incidentsByCat.set(inc.category, arr);
  }
  // Prefer the saved KPI-step verdict (what the inspector filled); fall back to
  // inferring Not Satisfactory from a reported incident when no verdict exists.
  const verdictByCat = new Map<KpiCategory, 'satisfactory' | 'not_satisfactory'>();
  for (const k of inspection.kpiResults ?? []) verdictByCat.set(k.category, k.result);
  const kpiDefs = kpiCategoriesForZone(inspection.zoneId);
  const kpiRows = (kpiDefs.length ? kpiDefs : KPI_CATEGORIES.slice(0, 6)).map((c) => {
    const incidents = incidentsByCat.get(c.category) ?? [];
    const result = verdictByCat.get(c.category) ?? (incidents.length ? 'not_satisfactory' as const : 'satisfactory' as const);
    return { no: c.no, title: c.title, category: c.category, incidents, result };
  });

  const scorePct = inspection.scorePct;
  const scoreColor = scorePct == null
    ? undefined
    : scorePct >= 80
      ? 'var(--status-success)'
      : scorePct >= 50
        ? 'var(--status-warning)'
        : 'var(--status-error)';

  /* ── Details InfoRows (two columns) ── */
  const leftRows = [
    { label: 'Service Type', value: inspection.serviceType },
    { label: 'Zone', value: (
      <span className="flex items-center gap-1.5 text-[14px] font-semibold text-foreground">
        <Icons.MarkerPin01 size={13} className="text-muted-foreground" />
        {zone?.name ?? '—'}
      </span>
    ) },
    { label: 'ESP Contractor', value: esp?.name ?? '—' },
    { label: 'Inspector', value: (
      insp ? (
        <span className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
          <AvatarChip name={insp.name} color={insp.avatarColor} size={22} />
          <span>{insp.name}</span>
        </span>
      ) : '—'
    ) },
  ];
  const rightRows = [
    { label: 'Scheduled', value: formatDateTime(inspection.scheduledFor) },
    { label: 'Started', value: inspection.startedAt ? formatDateTime(inspection.startedAt) : '—' },
    { label: 'Completed', value: inspection.completedAt ? formatDateTime(inspection.completedAt) : '—' },
    { label: 'Time Taken', value: timeTakenLabel },
  ];

  const tabs = [
    { key: 'kpis' as const, label: 'Inspection KPIs' },
    { key: 'timeline' as const, label: 'Timeline' },
    { key: 'incidents' as const, label: 'Related Incidents', count: relatedIncidents.length },
  ];

  return (
    /* Standalone overlay; pass-through (display:contents) when embedded in the DS DetailSheet */
    <div
      className={embedded ? 'contents' : 'fixed inset-0 z-[680] flex justify-end bg-black/50'}
      onClick={embedded ? undefined : onClose}
      role={embedded ? undefined : 'dialog'}
      aria-modal={embedded ? undefined : true}
      aria-label={`Inspection detail — ${inspection.id}`}
    >
      {/* Sheet */}
      <div
        className={embedded
          ? 'flex h-full w-full flex-col bg-card'
          : 'flex h-full w-[640px] flex-col border-l border-border bg-card shadow-[var(--elevation-md)]'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== Standalone header (DS sheet chrome supplies this when embedded) ===== */}
        {!embedded && (
          <div className="flex shrink-0 items-center justify-end border-b border-border bg-card px-6 py-3">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <Icons.XClose size={18} />
            </Button>
          </div>
        )}

        {/* ===== Main column — DS TaskDetail body ===== */}
        <div className="min-w-0 flex-1 overflow-y-auto bg-card">
            <div className="flex w-full flex-col gap-8 p-6">

              {/* ── Header block ── */}
              <div className="flex w-full flex-col gap-4">
                <div className="flex w-full items-center justify-between gap-2">
                  {/* Joined pill group: [# id][⚠ type] */}
                  <div className="flex items-center">
                    <span className="flex h-[26px] items-center gap-1 rounded-l-[3px] border border-border bg-card px-2">
                      <Icons.Hash02 size={12} className="text-muted-foreground" />
                      <span className="text-[14px] font-semibold text-muted-foreground">{inspection.id}</span>
                    </span>
                    <span className="-ml-px flex h-[26px] items-center gap-1 rounded-r-[3px] border border-border bg-card px-2">
                      <Icons.AlertTriangle size={12} className="text-muted-foreground" />
                      <span className="text-[14px] font-semibold uppercase text-muted-foreground">
                        {inspection.type === 'planned' ? 'Planned' : 'Ad-hoc'}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <InspectionStatusPill status={inspection.status} size="sm" />
                    {inspection.result && (
                      <InspectionResultPill result={inspection.result} size="sm" />
                    )}
                  </div>
                </div>

                <h2 className="w-full whitespace-pre-wrap text-[26px] font-semibold leading-snug text-foreground">
                  {inspection.title}
                </h2>

                {scorePct != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-muted-foreground">Score</span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold text-white"
                      style={{ background: scoreColor }}
                    >
                      {scorePct}%
                    </span>
                  </div>
                )}

                {/* Details — two columns of horizontal InfoRows */}
                <div className="flex w-full flex-wrap items-start gap-x-8 gap-y-5 border-b border-border pb-4">
                  <div className="flex min-w-[220px] flex-1 basis-[220px] flex-col gap-5">
                    {leftRows.map((d, i) => <TaskInfoRow key={i} {...d} />)}
                  </div>
                  <div className="flex min-w-[220px] flex-1 basis-[220px] flex-col gap-5">
                    {rightRows.map((d, i) => <TaskInfoRow key={i} {...d} />)}
                  </div>
                </div>
              </div>

              {/* ── Location section — inspection spot + any reported incidents ── */}
              <TaskSection title={relatedIncidents.length ? `Location & Reported Incidents (${relatedIncidents.length})` : 'Location'} inset={false}>
                <div className="h-56 overflow-hidden rounded-[6px] border border-border">
                  <IncidentMap
                    incidents={relatedIncidents}
                    locationMarker={[inspection.location.lat, inspection.location.lng]}
                    center={[inspection.location.lat, inspection.location.lng]}
                    zoom={14}
                  />
                </div>
                {relatedIncidents.length > 0 && (
                  <p className="mt-2 flex items-center gap-1.5 text-body-xs text-muted-foreground">
                    <span className="inline-block size-2 rounded-full" style={{ background: '#7F56D9' }} /> Inspection point
                    <span className="ml-3 inline-block size-2 rounded-full" style={{ background: 'var(--status-error)' }} /> Reported incident
                  </p>
                )}
              </TaskSection>

              {/* ── Tabbed lower section — underline tabs ── */}
              <div className="flex flex-col">
                <div className="flex items-center gap-8 border-b border-border">
                  {tabs.map((t) => {
                    const active = activeTab === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setActiveTab(t.key)}
                        className={[
                          'flex items-center gap-1.5 pb-2.5 text-[14px] transition-colors',
                          active
                            ? 'border-b-2 border-primary font-semibold text-primary'
                            : 'border-b-2 border-transparent font-medium text-muted-foreground hover:text-foreground',
                        ].join(' ')}
                      >
                        {t.label}
                        {t.key === 'incidents' && (t.count ?? 0) > 0 && (
                          <Badge variant="destructive" size="xs">{t.count}</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-5">
                  {/* ----- INSPECTION KPIs TAB ----- */}
                  {activeTab === 'kpis' && (
                    <KpiResultsSection rows={kpiRows} onOpenIncident={(id) => nav.openIncident(id)} />
                  )}

                  {/* ----- TIMELINE TAB ----- */}
                  {activeTab === 'timeline' && (
                    <div className="flex flex-col gap-0">
                      {timelineSteps.map((step, idx) => {
                        const StepIcon = step.icon;
                        const isLast = idx === timelineSteps.length - 1;
                        const isIncident = step.tone === 'incident';
                        const dotClass = isIncident
                          ? 'border-[var(--status-error)] bg-[var(--status-error)] text-white'
                          : step.done
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card text-muted-foreground';
                        const clickable = isIncident && step.incidentId;
                        return (
                          <div key={step.key} className="flex gap-3">
                            {/* line + dot column */}
                            <div className="flex flex-col items-center">
                              <div className={['flex h-8 w-8 items-center justify-center rounded-full border-2', dotClass].join(' ')}>
                                <StepIcon size={15} />
                              </div>
                              {!isLast && (
                                <div
                                  className={['w-px flex-1 my-1', step.done ? 'bg-primary/40' : 'bg-border'].join(' ')}
                                  style={{ minHeight: 24 }}
                                />
                              )}
                            </div>
                            {/* content */}
                            <div
                              className={['pb-5 pt-1 min-w-0', clickable ? 'cursor-pointer' : ''].join(' ')}
                              onClick={clickable ? () => nav.openIncident(step.incidentId!) : undefined}
                            >
                              <p className={['text-[14px] font-semibold', clickable ? 'text-[var(--status-error)] hover:underline' : 'text-foreground'].join(' ')}>{step.label}</p>
                              {step.at ? (
                                <p className="text-[12px] text-muted-foreground">{formatDateTime(step.at)}</p>
                              ) : (
                                <p className="text-[12px] italic text-muted-foreground">Not yet</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ----- RELATED INCIDENTS TAB ----- */}
                  {activeTab === 'incidents' && (
                    <div className="flex flex-col gap-2">
                      {relatedIncidents.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                          <Icons.CheckCircle size={32} className="opacity-30" />
                          <p className="text-body-sm">No incidents reported in this inspection.</p>
                        </div>
                      ) : (
                        relatedIncidents.map((inc) => {
                          const incZone = s.zone(inc.zoneId);
                          const incInsp = s.inspector(inc.reportedByInspectorId);
                          return (
                            <button
                              key={inc.id}
                              type="button"
                              onClick={() => nav.openIncident(inc.id)}
                              className="w-full rounded-[6px] border border-border bg-card p-4 text-left transition-colors hover:bg-secondary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                            >
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <span className="text-caption font-medium text-muted-foreground">{inc.id}</span>
                                <IncidentStatusPill status={inc.status} size="sm" />
                              </div>
                              <p className="mb-1 line-clamp-1 text-body-sm font-semibold text-foreground">
                                {inc.title}
                              </p>
                              <div className="flex items-center gap-3 text-body-xs text-muted-foreground">
                                {incZone && (
                                  <span className="flex items-center gap-1">
                                    <Icons.MarkerPin01 size={11} />
                                    {incZone.name}
                                  </span>
                                )}
                                <span>{formatDate(inc.reportedAt)}</span>
                                {incInsp && (
                                  <span className="ml-auto">
                                    <AvatarChip name={incInsp.name} color={incInsp.avatarColor} size={20} />
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

/* ========================= sub-components ================================ */

/** Inspection KPIs — a table mirroring the New Inspection "Inspection KPIs"
 *  step: each assessed KPI category with a Satisfactory (green) / Not
 *  Satisfactory (red) status and the count of incidents reported against it.
 *  A category with ≥1 reported incident reads Not Satisfactory. */
function KpiResultsSection({
  rows,
  onOpenIncident,
}: {
  rows: { no: number; title: string; category: string; incidents: { id: string; title: string }[]; result: 'satisfactory' | 'not_satisfactory' }[];
  onOpenIncident: (id: string) => void;
}) {
  if (!rows.length) {
    return <p className="py-4 text-body-sm italic text-muted-foreground">No KPI categories assigned to this lot.</p>;
  }
  const satisfactory = rows.filter((r) => r.result === 'satisfactory').length;
  return (
    <div className="flex flex-col gap-3">
      {/* summary line */}
      <div className="flex items-center gap-4 text-body-xs font-medium text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: 'var(--status-success)' }} />{satisfactory} Satisfactory</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: 'var(--status-error)' }} />{rows.length - satisfactory} Not Satisfactory</span>
      </div>

      <div className="overflow-hidden rounded-[8px] border border-border">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5">KPI Category</th>
              <th className="px-4 py-2.5 text-center">Status</th>
              <th className="px-4 py-2.5 text-center">Incidents</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const count = row.incidents.length;
              const notOk = row.result === 'not_satisfactory';
              const color = notOk ? 'var(--status-error)' : 'var(--status-success)';
              return (
                <tr key={row.category} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3">
                    <p className="text-body-sm font-medium leading-snug text-foreground">{row.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">KPI {row.no.toFixed(1)} · {row.category}</p>
                    {row.incidents.length > 0 && (
                      <div className="mt-1.5 flex flex-col gap-1">
                        {row.incidents.map((inc) => (
                          <button
                            key={inc.id}
                            type="button"
                            onClick={() => onOpenIncident(inc.id)}
                            className="inline-flex items-center gap-1 text-left text-[11px] font-medium text-[var(--status-error)] hover:underline"
                          >
                            <Icons.AlertTriangle size={10} className="shrink-0" /> #{inc.id.replace('INC-2026-', '')} · {inc.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatePill label={notOk ? 'Not Satisfactory' : 'Satisfactory'} bg={color} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="inline-flex min-w-[24px] items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-semibold"
                      style={{ background: notOk ? 'color-mix(in srgb, var(--status-error) 14%, transparent)' : 'var(--muted)', color: notOk ? 'var(--status-error)' : 'var(--muted-foreground)' }}
                    >
                      {count}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
