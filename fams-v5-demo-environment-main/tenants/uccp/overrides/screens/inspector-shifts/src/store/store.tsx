/**
 * IimsStore — the single source of truth for the Inspector app. Holds the full
 * dataset, persists to localStorage, and exposes domain actions (report incident,
 * run/complete inspection, verify rectification, …) plus lookup + KPI selectors.
 *
 * Screens consume it via `useIims()`. All lifecycle transitions are enforced here
 * so the data stays consistent and interconnected (the "dynamic" behaviour).
 */
import * as React from 'react';
import type {
  IimsData, Incident, IncidentStatus, Inspection, InspectionType, ServiceType,
  EvidencePhoto, VerificationDecision, ChecklistResponse, Severity, GeoPoint,
  PlannedShift, Penalty, PenaltyLineItem, PenaltyStatus, KpiCategory,
} from '../data/types';
import { buildSeedData, buildSeedShifts, buildSeedPenalties, SEED_NOW } from '../data/seed';
import {
  ZONES, ESPS, INSPECTORS, VIOLATION_TYPES, ASSETS, CHECKLIST_TEMPLATES,
} from '../data/catalog';

const STORAGE_KEY = 'iims-ins:v6';

/* ----------------------------- input shapes ----------------------------- */
export interface ReportIncidentInput {
  violationTypeId: string;
  zoneId: string;
  espId: string;
  assetId?: string;
  severity?: Severity;
  description?: string;
  notes?: string;
  location: GeoPoint;
  locationAccuracyM: number;
  evidence: EvidencePhoto[];
  sourceInspectionId?: string;
}
export interface StartInspectionInput {
  type: InspectionType;
  serviceType: ServiceType;
  zoneId: string;
  espId: string;
  assetId?: string;
  scheduledFor?: string;
  location: GeoPoint;
}

/* ------------------------------- helpers -------------------------------- */
// The whole app is anchored to SEED_NOW (stable "today" for demo determinism),
// so new records must be stamped on that same clock — NOT the real wall clock —
// or "Reported Today"/"Conducted Today" KPIs and SLA/overdue chips desync.
const now = () => new Date(SEED_NOW).toISOString();
const sameDay = (iso: string, ref: number) => {
  const d = new Date(iso); const r = new Date(ref);
  return d.getFullYear() === r.getFullYear() && d.getMonth() === r.getMonth() && d.getDate() === r.getDate();
};
let seqRef = { incident: 9000, inspection: 9000, photo: 90000 };
const nextIncidentId = () => `INC-2026-${++seqRef.incident}`;
const nextInspectionId = () => `INSP-2026-${++seqRef.inspection}`;
export const newPhotoId = () => `ph-${++seqRef.photo}`;

function load(): IimsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as IimsData;
      // Backfill planned shifts for stores persisted before the Inspector Shifts
      // feature existed (the key isn't bumped so other data is preserved).
      if (!Array.isArray(parsed.shifts)) parsed.shifts = buildSeedShifts();
      // Backfill issued penalties for stores persisted before the Issue Penalty
      // flow existed (preserve all other data — key stays v3).
      if (!Array.isArray(parsed.penalties)) parsed.penalties = buildSeedPenalties(parsed.incidents);
      return parsed;
    }
  } catch { /* ignore */ }
  return buildSeedData();
}

/* ------------------------------- context -------------------------------- */
interface IimsContextValue {
  data: IimsData;
  now: number;            // anchored "now" for stable today/SLA calcs (SEED_NOW)
  // lookups
  zone: (id?: string) => (typeof ZONES)[number] | undefined;
  esp: (id?: string) => (typeof ESPS)[number] | undefined;
  inspector: (id?: string) => (typeof INSPECTORS)[number] | undefined;
  violation: (id?: string) => (typeof VIOLATION_TYPES)[number] | undefined;
  asset: (id?: string) => (typeof ASSETS)[number] | undefined;
  checklist: (id?: string) => (typeof CHECKLIST_TEMPLATES)[number] | undefined;
  incident: (id?: string) => Incident | undefined;
  inspectionById: (id?: string) => Inspection | undefined;
  penaltyById: (id?: string) => Penalty | undefined;
  penaltyForIncident: (incidentId?: string) => Penalty | undefined;
  currentInspector: () => (typeof INSPECTORS)[number];
  // KPI selectors
  kpis: () => {
    reportedToday: number; totalReported: number;
    conductedToday: number; totalConducted: number;
    pendingVerifications: number; pendingReVerifications: number;
    openIncidents: number; escalated: number;
  };
  countByStatus: () => Record<IncidentStatus, number>;
  // actions
  toggleDuty: () => void;
  /** Mark a Home day-view task done so it drops off the Home task list. */
  completeTask: (taskId: string) => void;
  reportIncident: (input: ReportIncidentInput) => Incident;
  startInspection: (input: StartInspectionInput) => Inspection;
  setInspectionResponse: (inspectionId: string, response: ChecklistResponse) => void;
  completeInspection: (inspectionId: string, kpiResults?: { category: KpiCategory; result: 'satisfactory' | 'not_satisfactory' }[]) => void;
  verifyRectification: (incidentId: string, decision: VerificationDecision, comment: string, photos: EvidencePhoto[]) => void;
  verifyReRectification: (incidentId: string, decision: VerificationDecision, comment: string, photos: EvidencePhoto[]) => void;
  markInvalid: (incidentId: string, reason: string) => void;
  submitRectification: (incidentId: string, input: { description: string; photos: EvidencePhoto[]; espUser?: string }) => void;
  submitReRectification: (incidentId: string, input: { description: string; photos: EvidencePhoto[]; espUser?: string }) => void;
  addComment: (incidentId: string, input: { authorId: string; authorRole?: 'inspector' | 'esp' | 'po'; text: string }) => void;
  // Project-Officer enforcement actions (PO app)
  applyPenalty: (incidentId: string, amountAed: number, reason: string) => void;
  allowReRectification: (incidentId: string, note: string) => void;
  /** Issue a structured Penalty (KPI line items) against an incident's ESP. */
  issuePenalty: (incidentId: string, lineItems: PenaltyLineItem[]) => Penalty | undefined;
  addPenaltyComment: (penaltyId: string, input: { authorId: string; authorRole?: 'inspector' | 'esp' | 'po'; text: string }) => void;
  transitionPenalty: (penaltyId: string, status: PenaltyStatus) => void;
  // Inspector Shifts (planning) actions
  addShifts: (shifts: PlannedShift[]) => void;
  updateShift: (id: string, patch: Partial<PlannedShift>) => void;
  /** Delete a shift. For recurring series, scope uses seriesId + dateISO:
   *  'one' = just this shift; 'following' = this + later dates in the series;
   *  'all' = the whole series. */
  deleteShift: (id: string, scope: 'one' | 'following' | 'all') => void;
  reset: () => void;
}

/** The signed-in Project Officer (PO app actor). */
export const PROJECT_OFFICER = { id: 'po-1', name: 'Hessa Al Owais', avatarColor: '#7F56D9' };

const Ctx = React.createContext<IimsContextValue | null>(null);

export function IimsProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<IimsData>(() => load());

  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, [data]);

  const value = React.useMemo<IimsContextValue>(() => {
    const byId = <T extends { id: string }>(arr: T[], id?: string) => arr.find((x) => x.id === id);
    const ref = SEED_NOW;

    const mutateIncident = (id: string, fn: (i: Incident) => Incident) =>
      setData((d) => ({ ...d, incidents: d.incidents.map((i) => (i.id === id ? fn(i) : i)) }));

    return {
      data,
      now: ref,
      zone: (id) => byId(ZONES, id),
      esp: (id) => byId(ESPS, id),
      inspector: (id) => byId(INSPECTORS, id),
      violation: (id) => byId(VIOLATION_TYPES, id),
      asset: (id) => byId(ASSETS, id),
      checklist: (id) => byId(CHECKLIST_TEMPLATES, id),
      incident: (id) => byId(data.incidents, id),
      inspectionById: (id) => byId(data.inspections, id),
      penaltyById: (id) => byId(data.penalties, id),
      penaltyForIncident: (incidentId) => data.penalties.find((p) => p.incidentId === incidentId),
      currentInspector: () => byId(INSPECTORS, data.currentInspectorId) ?? INSPECTORS[0],

      kpis: () => {
        const inc = data.incidents;
        const insp = data.inspections;
        const open = (i: Incident) => i.status !== 'closed' && i.status !== 'invalid';
        return {
          reportedToday: inc.filter((i) => sameDay(i.reportedAt, ref)).length,
          totalReported: inc.length,
          conductedToday: insp.filter((i) => i.completedAt && sameDay(i.completedAt, ref)).length,
          totalConducted: insp.filter((i) => i.status === 'completed').length,
          pendingVerifications: inc.filter((i) => i.status === 'rectification_submitted').length,
          pendingReVerifications: inc.filter((i) => i.status === 're_rectification_submitted').length,
          openIncidents: inc.filter(open).length,
          escalated: inc.filter((i) => i.status === 'escalated').length,
        };
      },
      countByStatus: () => {
        const out = {
          awaiting_rectification: 0, rectification_submitted: 0, escalated: 0,
          awaiting_esp_re_rectification: 0, re_rectification_submitted: 0, closed: 0, invalid: 0,
        } as Record<IncidentStatus, number>;
        for (const i of data.incidents) out[i.status]++;
        return out;
      },

      toggleDuty: () => setData((d) => ({ ...d, onDuty: !d.onDuty })),

      completeTask: (taskId) => setData((d) => ({
        ...d,
        completedTaskIds: d.completedTaskIds?.includes(taskId)
          ? d.completedTaskIds
          : [...(d.completedTaskIds ?? []), taskId],
      })),

      reportIncident: (input) => {
        const vt = byId(VIOLATION_TYPES, input.violationTypeId)!;
        const insp = byId(INSPECTORS, data.currentInspectorId)!;
        const at = now();
        const zeroTol = vt.zeroTolerance;
        const status: IncidentStatus = zeroTol ? 'escalated' : 'awaiting_rectification';
        const zoneName = byId(ZONES, input.zoneId)?.name ?? '';
        const id = nextIncidentId();
        const slaDue = new Date(SEED_NOW + vt.rectifyWithinHrs * 3600_000).toISOString();
        const inc: Incident = {
          id,
          title: vt.name,
          description: input.description || `${vt.name} observed at ${zoneName}.`,
          violationTypeId: vt.id,
          category: vt.category,
          severity: input.severity ?? (zeroTol ? 'critical' : vt.defaultSeverity),
          zeroTolerance: zeroTol,
          status,
          espId: input.espId,
          zoneId: input.zoneId,
          assetId: input.assetId,
          reportedByInspectorId: insp.id,
          reportedAt: at,
          slaDueAt: slaDue,
          location: input.location,
          locationAccuracyM: input.locationAccuracyM,
          evidence: input.evidence,
          notes: input.notes,
          penaltyAed: 0,
          sourceInspectionId: input.sourceInspectionId,
          timeline: [
            { id: `${id}-t1`, at, actorRole: 'Inspector', actorName: insp.name, action: 'Reported incident', note: `${vt.pmCode} · ${vt.name}` },
            ...(zeroTol ? [{ id: `${id}-tz`, at, actorRole: 'System' as const, actorName: 'IIMS', action: 'Auto-escalated (Zero-Tolerance)', note: 'Critical breach bypassed ESP rectification' }] : []),
          ],
        };
        setData((d) => {
          const inspections = input.sourceInspectionId
            ? d.inspections.map((ins) => ins.id === input.sourceInspectionId
              ? { ...ins, observationIncidentIds: [...ins.observationIncidentIds, id] } : ins)
            : d.inspections;
          return { ...d, incidents: [inc, ...d.incidents], inspections };
        });
        return inc;
      },

      startInspection: (input) => {
        const tpl = CHECKLIST_TEMPLATES.find((t) => t.serviceType === input.serviceType)!;
        const id = nextInspectionId();
        const at = now();
        const insp: Inspection = {
          id,
          title: `${input.serviceType} — ${byId(ZONES, input.zoneId)?.name ?? ''}`,
          type: input.type,
          serviceType: input.serviceType,
          checklistTemplateId: tpl.id,
          status: 'ongoing',
          espId: input.espId,
          zoneId: input.zoneId,
          assetId: input.assetId,
          inspectorId: data.currentInspectorId,
          scheduledFor: input.scheduledFor ?? at,
          startedAt: at,
          location: input.location,
          responses: [],
          observationIncidentIds: [],
        };
        setData((d) => ({ ...d, inspections: [insp, ...d.inspections] }));
        return insp;
      },

      setInspectionResponse: (inspectionId, response) =>
        setData((d) => ({
          ...d,
          inspections: d.inspections.map((ins) => ins.id === inspectionId
            ? { ...ins, responses: [...ins.responses.filter((r) => r.itemId !== response.itemId), response] }
            : ins),
        })),

      completeInspection: (inspectionId, kpiResults) =>
        setData((d) => ({
          ...d,
          inspections: d.inspections.map((ins) => {
            if (ins.id !== inspectionId) return ins;
            const completedAt = now();
            const mins = ins.startedAt ? Math.max(1, Math.round((SEED_NOW - new Date(ins.startedAt).getTime()) / 60000)) : undefined;
            // Prefer the KPI-step verdicts (what the inspector actually filled);
            // fall back to the checklist responses when none were captured.
            if (kpiResults && kpiResults.length) {
              const fails = kpiResults.filter((k) => k.result === 'not_satisfactory').length;
              const total = kpiResults.length || 1;
              const result = fails === 0 ? 'compliant' : fails > 2 ? 'non_compliant' : 'partial';
              return { ...ins, status: 'completed', result, scorePct: Math.round(100 - (fails / total) * 100), completedAt, timeTakenMins: mins, kpiResults };
            }
            const tpl = CHECKLIST_TEMPLATES.find((t) => t.id === ins.checklistTemplateId)!;
            const fails = ins.responses.filter((r) => r.value === 'fail' || r.value === 'no').length;
            const total = tpl.items.length || 1;
            const result = fails === 0 ? 'compliant' : fails > 2 ? 'non_compliant' : 'partial';
            return { ...ins, status: 'completed', result, scorePct: Math.round(100 - (fails / total) * 100), completedAt, timeTakenMins: mins };
          }),
        })),

      verifyRectification: (incidentId, decision, comment, photos) => {
        const insp = byId(INSPECTORS, data.currentInspectorId)!;
        const at = now();
        mutateIncident(incidentId, (i) => {
          const next: IncidentStatus = decision === 'satisfactory' ? 'closed' : 'escalated';
          return {
            ...i,
            status: next,
            verification: { decision, at, byInspectorId: insp.id, comment, photos },
            timeline: [...i.timeline, {
              id: `${i.id}-v${i.timeline.length}`, at, actorRole: 'Inspector', actorName: insp.name,
              action: decision === 'satisfactory' ? 'Verified satisfactory · Closed' : 'Rejected rectification · Escalated to PO',
              note: comment,
            }],
          };
        });
      },

      verifyReRectification: (incidentId, decision, comment, photos) => {
        const insp = byId(INSPECTORS, data.currentInspectorId)!;
        const at = now();
        mutateIncident(incidentId, (i) => {
          const next: IncidentStatus = decision === 'satisfactory' ? 'closed' : 'escalated';
          return {
            ...i,
            status: next,
            reVerification: { decision, at, byInspectorId: insp.id, comment, photos },
            timeline: [...i.timeline, {
              id: `${i.id}-rv${i.timeline.length}`, at, actorRole: 'Inspector', actorName: insp.name,
              action: decision === 'satisfactory' ? 'Re-verified satisfactory · Closed' : 'Rejected re-rectification · Escalated to PO',
              note: comment,
            }],
          };
        });
      },

      markInvalid: (incidentId, reason) => {
        const insp = byId(INSPECTORS, data.currentInspectorId)!;
        const at = now();
        mutateIncident(incidentId, (i) => ({
          ...i, status: 'invalid',
          timeline: [...i.timeline, { id: `${i.id}-iv${i.timeline.length}`, at, actorRole: 'Inspector', actorName: insp.name, action: 'Marked invalid', note: reason }],
        }));
      },

      submitRectification: (incidentId, input) => {
        const at = now();
        const espUser = input.espUser ?? '<ESP contact>';
        mutateIncident(incidentId, (i) => ({
          ...i,
          status: 'rectification_submitted',
          rectification: { submittedAt: at, espUser, description: input.description, beforePhotos: [], afterPhotos: input.photos },
          timeline: [...i.timeline, {
            id: `${i.id}-rs${i.timeline.length}`, at, actorRole: 'ESP', actorName: espUser,
            action: 'Submitted rectification', note: input.description,
          }],
        }));
      },

      submitReRectification: (incidentId, input) => {
        const at = now();
        const espUser = input.espUser ?? '<ESP contact>';
        mutateIncident(incidentId, (i) => ({
          ...i,
          status: 're_rectification_submitted',
          reRectification: { submittedAt: at, espUser, description: input.description, beforePhotos: [], afterPhotos: input.photos },
          timeline: [...i.timeline, {
            id: `${i.id}-rrs${i.timeline.length}`, at, actorRole: 'ESP', actorName: espUser,
            action: 'Submitted re-rectification', note: input.description,
          }],
        }));
      },

      addComment: (incidentId, input) => {
        const at = now();
        mutateIncident(incidentId, (i) => ({
          ...i,
          comments: [...(i.comments ?? []), {
            id: `${i.id}-c${(i.comments ?? []).length}`,
            authorId: input.authorId, authorRole: input.authorRole, text: input.text, at,
          }],
        }));
      },

      applyPenalty: (incidentId, amountAed, reason) => {
        const at = now();
        mutateIncident(incidentId, (i) => ({
          ...i,
          status: 'closed',
          penaltyAed: amountAed,
          poDecision: { action: 'apply_penalty', penaltyAed: amountAed, note: reason, at, byOfficer: PROJECT_OFFICER.name },
          timeline: [...i.timeline, {
            id: `${i.id}-pen${i.timeline.length}`, at, actorRole: 'Project Officer' as const, actorName: PROJECT_OFFICER.name,
            action: `Penalty issued · AED ${amountAed.toLocaleString()}`, note: reason,
          }],
        }));
      },

      allowReRectification: (incidentId, note) => {
        const at = now();
        mutateIncident(incidentId, (i) => ({
          ...i,
          status: 'awaiting_esp_re_rectification',
          poDecision: { action: 'allow_re_rectification', note, at, byOfficer: PROJECT_OFFICER.name },
          timeline: [...i.timeline, {
            id: `${i.id}-arr${i.timeline.length}`, at, actorRole: 'Project Officer' as const, actorName: PROJECT_OFFICER.name,
            action: 'Allowed re-rectification', note,
          }],
        }));
      },

      issuePenalty: (incidentId, lineItems) => {
        const inc = byId(data.incidents, incidentId);
        if (!inc) return undefined;
        const at = now();
        const total = lineItems.reduce((sum, li) => sum + li.amountAed, 0);
        const dueAt = new Date(SEED_NOW + 7 * 24 * 3600_000).toISOString();
        const penalty: Penalty = {
          id: incidentId.replace('INC-2026-', 'PEN-2026-'),
          incidentId,
          lineItems,
          totalAed: total,
          status: 'issued',
          issuedById: PROJECT_OFFICER.id,
          issuedAt: at,
          dueAt,
          comments: [],
        };
        setData((d) => ({
          ...d,
          // replace any existing penalty for this incident, else append
          penalties: d.penalties.some((p) => p.incidentId === incidentId)
            ? d.penalties.map((p) => (p.incidentId === incidentId ? penalty : p))
            : [...d.penalties, penalty],
          incidents: d.incidents.map((i) => i.id === incidentId ? {
            ...i,
            penaltyAed: total,
            timeline: [...i.timeline, {
              id: `${i.id}-pen${i.timeline.length}`, at, actorRole: 'Project Officer' as const, actorName: PROJECT_OFFICER.name,
              action: `Issued penalty · AED ${total.toLocaleString()}`, note: `${lineItems.length} KPI line item${lineItems.length > 1 ? 's' : ''}`,
            }],
          } : i),
        }));
        return penalty;
      },

      addPenaltyComment: (penaltyId, input) => {
        const at = now();
        setData((d) => ({
          ...d,
          penalties: d.penalties.map((p) => p.id === penaltyId ? {
            ...p,
            comments: [...(p.comments ?? []), {
              id: `${p.id}-c${(p.comments ?? []).length}`,
              authorId: input.authorId, authorRole: input.authorRole, text: input.text, at,
            }],
          } : p),
        }));
      },

      transitionPenalty: (penaltyId, status) => setData((d) => ({
        ...d,
        penalties: d.penalties.map((p) => (p.id === penaltyId ? { ...p, status } : p)),
      })),

      addShifts: (shifts) => setData((d) => ({ ...d, shifts: [...d.shifts, ...shifts] })),

      updateShift: (id, patch) => setData((d) => ({
        ...d,
        shifts: d.shifts.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh)),
      })),

      deleteShift: (id, scope) => setData((d) => {
        const target = d.shifts.find((sh) => sh.id === id);
        if (!target) return d;
        if (scope === 'one' || !target.recurring) {
          return { ...d, shifts: d.shifts.filter((sh) => sh.id !== id) };
        }
        if (scope === 'all') {
          return { ...d, shifts: d.shifts.filter((sh) => sh.seriesId !== target.seriesId) };
        }
        // 'following' — this occurrence and every later date in the series
        return {
          ...d,
          shifts: d.shifts.filter((sh) => !(sh.seriesId === target.seriesId && sh.dateISO >= target.dateISO)),
        };
      }),

      reset: () => setData(buildSeedData()),
    };
  }, [data]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIims(): IimsContextValue {
  const v = React.useContext(Ctx);
  if (!v) throw new Error('useIims must be used within <IimsProvider>');
  return v;
}
