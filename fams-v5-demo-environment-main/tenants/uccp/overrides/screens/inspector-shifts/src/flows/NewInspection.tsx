/**
 * NewInspectionFlow — full-screen side sheet (Tadweer design), matching the
 * IncidentDetail/ReportIncident overlay shell (fixed, backdrop, large panel).
 *
 * 4 horizontal tabs (FAMS primary-blue active underline — brand accent, per
 * coherence law #6; the Figma reference is layout-only, its green accents are
 * NOT adopted):
 *   1. Basic Info         — Lot / Area dropdowns + a large GPS map.
 *   2. Related Incidents  — split map (radius circle + red pins) + list.
 *   3. Inspection KPIs    — table of the lot's assigned KPI categories, each row
 *                            togglable Satisfactory (green) / Not Satisfactory
 *                            (red) — the ONE semantic-status exception to the
 *                            no-green rule; "Not Satisfactory" reveals a blue
 *                            "+ Report Incident" which opens the Report-Incident
 *                            sheet in DETAIL-ONLY mode.
 *   4. Reported Incidents — search/filter toolbar + table of incidents raised
 *                            during this inspection; Submit completes it.
 *
 * Header carries a live mm:ss timer pill (Clock icon) + close (X). Footer is
 * "Save as Draft" (tabs 2-4, blue text) + a primary-blue CTA ("Save and
 * Continue" / "Submit").
 */
import * as React from 'react';
import { useIims } from '@/store/store';
import type { ServiceType, GeoPoint, Incident, KpiCategory } from '@/data/types';
import { ESPS, KPI_CATEGORIES, kpiCategoriesForZone, type KpiCategoryDef } from '@/data/catalog';
import { formatDate } from '@/lib/ui';
import {
  Button,
  ScrollArea,
  Input,
  toast,
  Sheet, SheetContent, SheetTitle,
} from '@ds/components/primitives';
import type { NewInspectionTaskContext, OpenReportIncidentOpts } from '@/app/nav';
import * as Icons from '@ds/icons';
import { LocationStep, LOTS, AREAS } from '@/flows/shared/LocationStep';
import { NearbyIncidentsStep, randomAccuracy } from '@/flows/shared/NearbyIncidentsStep';

/* ─────────────────────────────── constants ─────────────────────────────── */
const TABS = ['Basic Info', 'Related Incidents', 'Inspection KPIs', 'Reported Incidents'] as const;
type TabIdx = 0 | 1 | 2 | 3;

/* Lot / Area model, haversine, and the synthetic-nearby-incidents pool now
 * live in the shared step modules (src/flows/shared/LocationStep.tsx,
 * src/flows/shared/NearbyIncidentsStep.tsx) so both flows agree on the same
 * data + labels. */

function useElapsed(startMs: number) {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startMs) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startMs]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/* ─────────────────────────── Tab 1: Basic Info ──────────────────────────── */
interface SetupState {
  lotId: string;
  areaId: string;
  zoneId: string;
  espId: string;
  serviceType: ServiceType | '';
  location: GeoPoint;
  accuracyM: number;
}

/**
 * Tab 1: Basic Info — now the shared LocationStep (identical markup/behaviour
 * to Report Incident's Step 0): map-first LeafletMap, read-only Incident Lot /
 * Incident Area overlay cards, detect + show-areas top-right, zoom/recenter/
 * fullscreen bottom-right, GPS accuracy pill, and the SectorDetectOverlay while
 * `detecting`. Task-launched inspections already know lot/area — the detect
 * button here re-runs the same simulated verification as `onRelocate` did.
 */
function TabBasicInfo({
  state,
  onChange,
  detecting,
  willSucceed,
  onDetect,
  onDetectComplete,
}: {
  state: SetupState;
  onChange: (s: Partial<SetupState>) => void;
  /** GPS location-verification animation state (same as Report Incident). */
  detecting: boolean;
  willSucceed: boolean;
  onDetect: (succeed: boolean) => void;
  onDetectComplete: (ok: boolean, geo?: { location: GeoPoint; accuracyM: number }) => void;
}) {
  return (
    <LocationStep
      lotId={state.lotId}
      areaId={state.areaId}
      location={state.location}
      accuracyM={state.accuracyM}
      detecting={detecting}
      willSucceed={willSucceed}
      onDetect={onDetect}
      onDetectComplete={(ok, geo) => {
        onDetectComplete(ok, geo);
        if (!ok) return;
        // Task-launched inspections already know their lot/area — keep them.
        // A live GPS fix just confirms the inspector is on-site: update the
        // pin + accuracy but leave lotId/areaId as-is.
        const lot = LOTS.find((l) => l.id === state.lotId) ?? LOTS[0];
        const area = AREAS.find((a) => a.lotId === lot.id) ?? null;
        if (geo) {
          onChange({
            zoneId: lot.zoneId,
            espId: ESPS.find((e) => e.zoneIds.includes(lot.zoneId))?.id ?? state.espId,
            location: geo.location,
            accuracyM: geo.accuracyM,
          });
        } else {
          toast('Live location unavailable — using your assigned area');
          onChange({
            lotId: lot.id,
            areaId: area?.id ?? state.areaId,
            zoneId: lot.zoneId,
            espId: ESPS.find((e) => e.zoneIds.includes(lot.zoneId))?.id ?? state.espId,
            location: { ...lot.center },
            accuracyM: randomAccuracy(),
          });
        }
      }}
    />
  );
}

/**
 * Tab 2: Related Incidents — now the shared NearbyIncidentsStep (identical
 * markup/behaviour to Report Incident's Step 1): split RadiusMap + list with
 * KPI Category / Reported By / Reported On columns, rows clickable → the same
 * IncidentDetailFlow(incidentOverride) side sheet.
 */
function TabRelatedIncidents({
  zoneId,
  location,
  radius,
  onRadiusChange,
  accuracyM,
}: {
  zoneId: string;
  location: GeoPoint;
  radius: number;
  onRadiusChange: (v: number) => void;
  accuracyM: number;
}) {
  return (
    <div className="h-full p-4">
      <NearbyIncidentsStep
        center={location}
        zoneId={zoneId}
        radius={radius}
        onRadius={onRadiusChange}
        accuracyM={accuracyM}
      />
    </div>
  );
}

/* ───────────────────── Tab 3: Inspection KPIs ───────────────────────────── */
function KpiActionToggle({
  value,
  onChange,
}: {
  value: 'satisfactory' | 'not_satisfactory' | null;
  onChange: (v: 'satisfactory' | 'not_satisfactory') => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        onClick={() => onChange('satisfactory')}
        className="px-3 py-1.5 text-body-xs font-semibold transition-colors"
        style={
          value === 'satisfactory'
            ? { background: 'var(--status-success)', color: 'white' }
            : { background: 'var(--card)', color: 'var(--muted-foreground)' }
        }
      >
        Satisfactory
      </button>
      <button
        type="button"
        onClick={() => onChange('not_satisfactory')}
        className="border-l border-border px-3 py-1.5 text-body-xs font-semibold transition-colors"
        style={
          value === 'not_satisfactory'
            ? { background: 'var(--status-error)', color: 'white' }
            : { background: 'var(--card)', color: 'var(--muted-foreground)' }
        }
      >
        Not Satisfactory
      </button>
    </div>
  );
}

function TabInspectionKpis({
  kpiRows,
  responses,
  onToggle,
  onReportIncident,
  incidentCounts,
}: {
  kpiRows: KpiCategoryDef[];
  responses: Map<KpiCategory, 'satisfactory' | 'not_satisfactory'>;
  onToggle: (cat: KpiCategory, v: 'satisfactory' | 'not_satisfactory') => void;
  onReportIncident: (cat: KpiCategory) => void;
  incidentCounts: Map<KpiCategory, number>;
}) {
  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-[56px_1fr_180px_320px] gap-2 border-b border-border bg-secondary/40 px-4 py-2.5 text-body-xs font-bold uppercase tracking-wide text-muted-foreground">
          <span>#</span>
          <span>Title</span>
          <span>Reported Incidents</span>
          <span>Action</span>
        </div>
        <div className="divide-y divide-border">
          {kpiRows.map((row) => {
            const val = responses.get(row.category) ?? null;
            const count = incidentCounts.get(row.category) ?? 0;
            return (
              <div key={row.no} className="grid grid-cols-[56px_1fr_180px_320px] items-center gap-2 px-4 py-3.5">
                <span className="text-body-sm font-semibold tabular-nums text-muted-foreground">{row.no.toFixed(1)}</span>
                <span className="text-body-sm font-medium text-foreground">{row.title}</span>
                <span className="flex items-center gap-1.5 text-body-sm">
                  {count > 0 ? (
                    <>
                      <Icons.AlertTriangle size={14} className="text-[var(--status-warning)]" />
                      <span className="font-semibold text-foreground">{count}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <KpiActionToggle value={val} onChange={(v) => onToggle(row.category, v)} />
                  {val === 'not_satisfactory' && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="gap-1"
                      onClick={() => onReportIncident(row.category)}
                    >
                      <Icons.Plus size={13} />
                      Report Incident
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── Tab 4: Reported Incidents ────────────────────────── */
function TabReportedIncidents({
  s,
  incidents,
  onReportIncident,
}: {
  s: ReturnType<typeof useIims>;
  incidents: Incident[];
  onReportIncident: () => void;
}) {
  const [search, setSearch] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return incidents;
    return incidents.filter(
      (i) => i.title.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || i.id.toLowerCase().includes(q),
    );
  }, [incidents, search]);

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icons.SearchMd size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search anything here"
            className="h-9 pl-9"
          />
        </div>
        <Button variant="secondary" size="md" aria-label="Filter">
          <Icons.FilterLines size={15} />
        </Button>
        <Button variant="primary" size="md" className="gap-1" onClick={onReportIncident}>
          <Icons.Plus size={15} />
          Report Incident
        </Button>
      </div>

      {/* table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
          <Icons.AlertTriangle size={26} className="text-muted-foreground" />
          <p className="text-body-sm font-medium text-foreground">No incidents reported yet</p>
          <p className="text-body-xs text-muted-foreground">
            Use "Report Incident" to raise a non-conformity for this inspection.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr] gap-2 border-b border-border bg-secondary/40 px-4 py-2.5">
            {['Title', 'Reported On', 'Due Date', 'Attachments', 'Tag'].map((h) => (
              <span key={h} className="text-body-xs font-bold uppercase tracking-wide text-muted-foreground">{h}</span>
            ))}
          </div>
          <div className="divide-y divide-border">
            {filtered.map((inc) => (
              <div key={inc.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr] items-center gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-medium text-foreground">{inc.title}</p>
                  <p className="truncate text-body-xs text-muted-foreground">{inc.category}</p>
                </div>
                <span className="text-body-xs tabular-nums text-muted-foreground">{formatDate(inc.reportedAt)}</span>
                <span className="text-body-xs tabular-nums text-muted-foreground">{formatDate(inc.slaDueAt)}</span>
                <span className="flex items-center gap-1.5 text-body-xs text-muted-foreground">
                  <Icons.Image01 size={13} />
                  {inc.evidence.length}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-body-xs font-semibold"
                    style={{ borderColor: 'color-mix(in srgb, var(--primary) 35%, transparent)', color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)' }}
                  >
                    <Icons.Tag01 size={11} />
                    {s.violation(inc.violationTypeId)?.pmCode ?? inc.category}
                  </span>
                  <span className="text-body-xs text-muted-foreground">+0</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────── Main flow ─────────────────────────────── */
export function NewInspectionFlow({
  task,
  onClose,
  onReportIncident,
}: {
  task?: NewInspectionTaskContext;
  onClose: () => void;
  onReportIncident: (opts: OpenReportIncidentOpts) => void;
}) {
  const s = useIims();
  const openedAt = React.useRef(Date.now());
  const elapsed = useElapsed(openedAt.current);

  const [tab, setTab] = React.useState<TabIdx>(0);
  const [visited, setVisited] = React.useState<Set<TabIdx>>(() => new Set<TabIdx>([0]));

  const initialLot = task?.zoneId ? LOTS.find((l) => l.zoneId === task.zoneId) : undefined;
  const initialArea = initialLot ? AREAS.find((a) => a.lotId === initialLot.id) : undefined;

  const [setup, setSetup] = React.useState<SetupState>(() => ({
    lotId: initialLot?.id ?? '',
    areaId: initialArea?.id ?? '',
    zoneId: task?.zoneId ?? initialLot?.zoneId ?? '',
    espId: task?.espId ?? '',
    serviceType: task?.serviceType ?? '',
    location: initialLot ? { ...initialLot.center } : { lat: 25.18, lng: 55.30 },
    accuracyM: randomAccuracy(),
  }));

  const [radius, setRadius] = React.useState(25);
  const [inspectionId, setInspectionId] = React.useState<string | null>(null);
  // GPS location-verification animation — auto-runs once when the sheet opens
  // (same "detecting your sector → verified" overlay as the Report-Incident flow).
  const [detecting, setDetecting] = React.useState(true);
  const [willSucceed, setWillSucceed] = React.useState(true);
  const [kpiResponses, setKpiResponses] = React.useState<Map<KpiCategory, 'satisfactory' | 'not_satisfactory'>>(new Map());

  function runDetect(succeed: boolean) {
    setWillSucceed(succeed);
    setDetecting(true);
  }

  const liveInspection = inspectionId ? s.inspectionById(inspectionId) : undefined;

  const kpiRows = React.useMemo(
    () => (setup.zoneId ? kpiCategoriesForZone(setup.zoneId) : KPI_CATEGORIES.slice(0, 6)),
    [setup.zoneId],
  );

  const reportedIncidents = React.useMemo<Incident[]>(() => {
    if (!liveInspection) return [];
    return liveInspection.observationIncidentIds.map((id) => s.incident(id)).filter((i): i is Incident => Boolean(i));
  }, [liveInspection?.observationIncidentIds, s]);

  /** reported-incidents count per KPI category, derived from THIS inspection's
   *  linked incidents — auto-increments after each "+ Report Incident". */
  const incidentCounts = React.useMemo(() => {
    const m = new Map<KpiCategory, number>();
    for (const inc of reportedIncidents) m.set(inc.category, (m.get(inc.category) ?? 0) + 1);
    return m;
  }, [reportedIncidents]);

  /* ── ensure an inspection exists once Lot/Area/service are known ── */
  function ensureInspection(): string | null {
    if (inspectionId) return inspectionId;
    if (!setup.zoneId || !setup.espId) return null;
    const insp = s.startInspection({
      type: task ? 'planned' : 'adhoc',
      serviceType: (setup.serviceType || 'Bin Washing') as ServiceType,
      zoneId: setup.zoneId,
      espId: setup.espId,
      location: setup.location,
    });
    setInspectionId(insp.id);
    return insp.id;
  }

  /* ── navigation ── */
  const canLeaveBasicInfo = !!setup.lotId && !!setup.areaId && !detecting;

  function goTo(idx: TabIdx) {
    if (idx === tab) return;
    if (idx > tab && tab === 0 && !canLeaveBasicInfo) {
      toast.error('Select an Incident Lot and Area to continue.');
      return;
    }
    if (idx > tab && tab === 0) ensureInspection();
    setVisited((prev) => new Set(prev).add(idx));
    setTab(idx);
  }

  function handleSaveAndContinue() {
    if (tab === 0) {
      if (!canLeaveBasicInfo) { toast.error('Select an Incident Lot and Area to continue.'); return; }
      ensureInspection();
    }
    if (tab < 3) {
      const next = (tab + 1) as TabIdx;
      setVisited((prev) => new Set(prev).add(next));
      setTab(next);
    }
  }

  function handleSaveAsDraft() {
    toast.success('Inspection saved as draft');
    onClose();
  }

  function handleSubmit() {
    if (!inspectionId) return;
    const kpiResults = Array.from(kpiResponses, ([category, result]) => ({ category, result }));
    s.completeInspection(inspectionId, kpiResults);
    if (task?.taskId) s.completeTask(task.taskId);
    toast.success('Inspection completed');
    onClose();
  }

  /* ── report-incident passthrough (opens in DETAIL-ONLY mode, stacked above) ── */
  function handleReportIncident(presetCategory?: KpiCategory) {
    const id = ensureInspection();
    if (!id) { toast.error('Select an Incident Lot and Area first.'); return; }
    onReportIncident({
      sourceInspectionId: id,
      mode: 'detail',
      presetCategory,
      zoneId: setup.zoneId,
      espId: s.inspectionById(id)?.espId,
      location: setup.location,
    });
  }

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        hideClose
        width="100vw"
        aria-label="New Inspection"
        className="flex flex-col gap-0 border-0 p-0"
      >
        <SheetTitle className="sr-only">New Inspection</SheetTitle>
        <div className="flex h-full flex-col overflow-hidden bg-card">

          {/* ── header ── */}
          <div className="flex items-center justify-between border-b border-border px-6 pt-5 pb-4">
            <h2 className="text-h5 font-bold text-foreground">New Inspection</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5">
                <Icons.Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono text-body-xs font-semibold tabular-nums text-foreground">{elapsed}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 hover:bg-secondary"
                aria-label="Close"
              >
                <Icons.XClose size={18} />
              </button>
            </div>
          </div>

          {/* ── 4 horizontal tabs (primary-blue active underline — FAMS brand accent) ── */}
          <div className="flex gap-7 border-b border-border px-6">
            {TABS.map((label, i) => {
              const idx = i as TabIdx;
              const active = idx === tab;
              const clickable = visited.has(idx) || idx <= tab;
              return (
                <button
                  key={label}
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && goTo(idx)}
                  className={`relative py-3 text-[15px] font-semibold transition-colors ${
                    active ? 'text-primary' : clickable ? 'text-muted-foreground hover:text-foreground' : 'cursor-not-allowed text-muted-foreground/50'
                  }`}
                >
                  {label}
                  <span className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full ${active ? 'bg-primary' : 'bg-transparent'}`} />
                </button>
              );
            })}
          </div>

          {/* ── body ── */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {tab === 0 && (
              <TabBasicInfo
                state={setup}
                onChange={(p) => setSetup((prev) => ({ ...prev, ...p }))}
                detecting={detecting}
                willSucceed={willSucceed}
                onDetect={runDetect}
                onDetectComplete={(ok) => { setDetecting(false); if (ok) setWillSucceed(true); }}
              />
            )}
            {tab === 1 && (
              <TabRelatedIncidents zoneId={setup.zoneId} location={setup.location} radius={radius} onRadiusChange={setRadius} accuracyM={setup.accuracyM} />
            )}
            {tab === 2 && (
              <ScrollArea className="h-full">
                <TabInspectionKpis
                  kpiRows={kpiRows}
                  responses={kpiResponses}
                  onToggle={(cat, v) => setKpiResponses((prev) => new Map(prev).set(cat, v))}
                  onReportIncident={handleReportIncident}
                  incidentCounts={incidentCounts}
                />
              </ScrollArea>
            )}
            {tab === 3 && (
              <ScrollArea className="h-full">
                <TabReportedIncidents s={s} incidents={reportedIncidents} onReportIncident={() => handleReportIncident()} />
              </ScrollArea>
            )}
          </div>

          {/* ── footer ── */}
          <div className="flex shrink-0 items-center justify-between border-t border-border bg-card px-6 py-4">
            <div>
              {tab > 0 && (
                <Button variant="ghost" onClick={handleSaveAsDraft} className="text-primary hover:text-primary">
                  Save as Draft
                </Button>
              )}
            </div>
            {tab < 3 ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveAndContinue}
                disabled={tab === 0 && !canLeaveBasicInfo}
              >
                Save and Continue
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmit}
              >
                Submit
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
