/**
 * Deterministic seed generator. Produces a rich, interconnected Doha dataset:
 * ~36 incidents spread across every lifecycle state (with evidence, ESP
 * rectifications, inspector verifications, PO decisions and consistent
 * timelines) plus ~24 planned/ad-hoc inspections, some of which raised the
 * incidents (sourceInspectionId ↔ observationIncidentIds).
 *
 * Seeded PRNG → stable across reloads, but varied and realistic. Anchored to a
 * fixed "now" so SLA / overdue states are reproducible.
 */
import type {
  Incident, IncidentStatus, Inspection, InspectionStatus, InspectionType,
  EvidencePhoto, TimelineEvent, Rectification, Verification, ChecklistResponse, IimsData,
  PlannedShift, Penalty,
} from './types';
import {
  ZONES, ESPS, INSPECTORS, VIOLATION_TYPES, ASSETS, CHECKLIST_TEMPLATES, CURRENT_INSPECTOR_ID, kpiCodeFor,
} from './catalog';

export const SEED_NOW = new Date('2026-06-30T09:00:00+04:00').getTime();
const HR = 3600_000;
const DAY = 24 * HR;

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260630);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const jitter = (base: number, span: number) => base + (rnd() - 0.5) * span;
const iso = (ms: number) => new Date(ms).toISOString();
const pad = (n: number) => String(n).padStart(4, '0');

let photoSeq = 1;
function photo(kind: EvidencePhoto['kind'], caption: string, gps: { lat: number; lng: number }, atMs: number): EvidencePhoto {
  return { id: `ph-${photoSeq++}`, kind, seed: Math.floor(rnd() * 100000), caption, gps, timestamp: iso(atMs) };
}

const ESP_USERS = ['Field Supervisor', 'Operations Lead', 'Site Foreman', 'Shift In-charge'];
const PO_OFFICERS = ['Hessa Al Owais (PO)', 'Hassan Al Falasi (PO)', 'Aisha Darwish (PO)'];

/** distribution of incidents across statuses (sums to 36) */
const STATUS_PLAN: { status: IncidentStatus; n: number }[] = [
  { status: 'awaiting_rectification', n: 8 },
  { status: 'rectification_submitted', n: 7 },
  { status: 'escalated', n: 6 },
  { status: 'awaiting_esp_re_rectification', n: 3 },
  { status: 're_rectification_submitted', n: 3 },
  { status: 'closed', n: 7 },
  { status: 'invalid', n: 2 },
];

function buildIncident(idx: number, status: IncidentStatus): Incident {
  const vt = pick(VIOLATION_TYPES);
  const zone = pick(ZONES);
  const esp = pick(ESPS.filter((e) => e.zoneIds.includes(zone.id))) ?? pick(ESPS);
  const asset = ASSETS.find((a) => a.zoneId === zone.id);
  const inspector = pick(INSPECTORS);
  const zeroTol = vt.zeroTolerance;
  const reportedAt = SEED_NOW - Math.floor(jitter(3, 6)) * DAY - Math.floor(rnd() * 8) * HR;
  const slaDueAt = reportedAt + vt.rectifyWithinHrs * HR;
  const loc = { lat: jitter(zone.center.lat, 0.02), lng: jitter(zone.center.lng, 0.02) };
  const accuracy = Math.round(jitter(14, 22)); // 3..25m
  const id = `INC-2026-${pad(idx)}`;

  const timeline: TimelineEvent[] = [
    { id: `${id}-t1`, at: iso(reportedAt), actorRole: 'Inspector', actorName: inspector.name, action: 'Reported incident', note: `${vt.pmCode} · ${vt.name}` },
  ];
  const evidence = [
    photo('incident', `${vt.name} — wide shot`, loc, reportedAt),
    photo('incident', `${vt.name} — close up`, loc, reportedAt + 60_000),
  ];

  const inc: Incident = {
    id,
    title: vt.name,
    description: `${vt.name} observed at ${zone.name}${asset ? ` near ${asset.label}` : ''}. ${esp.name} responsible under contract.`,
    violationTypeId: vt.id,
    category: vt.category,
    severity: zeroTol ? 'critical' : vt.defaultSeverity,
    zeroTolerance: zeroTol,
    status,
    espId: esp.id,
    zoneId: zone.id,
    assetId: asset?.id,
    reportedByInspectorId: inspector.id,
    reportedAt: iso(reportedAt),
    slaDueAt: iso(slaDueAt),
    location: loc,
    locationAccuracyM: accuracy,
    evidence,
    penaltyAed: 0,
    notes: rnd() > 0.5 ? 'Repeat occurrence at this location this month.' : undefined,
    timeline,
  };

  const submittedAt = reportedAt + Math.floor(jitter(2, 3) + 1) * HR;
  const mkRect = (kind: 'before' | 'after', atMs: number): Rectification => ({
    submittedAt: iso(atMs),
    espUser: `${pick(ESP_USERS)}, ${esp.name}`,
    description: 'Issue rectified per contract requirements. Area cleaned and restored; evidence attached.',
    beforePhotos: [photo('before', 'Before rectification', loc, atMs - 30 * 60_000)],
    afterPhotos: [photo('after', 'After rectification', loc, atMs)],
  });

  // Zero-tolerance always escalates straight to PO on report.
  if (zeroTol && (status === 'escalated' || status === 'awaiting_esp_re_rectification' || status === 're_rectification_submitted')) {
    timeline.push({ id: `${id}-tz`, at: iso(reportedAt + 60_000), actorRole: 'System', actorName: 'IIMS', action: 'Auto-escalated (Zero-Tolerance)', note: 'Critical breach bypassed ESP rectification' });
  }

  if (status === 'rectification_submitted') {
    inc.rectification = mkRect('after', submittedAt);
    timeline.push({ id: `${id}-t2`, at: iso(submittedAt), actorRole: 'ESP', actorName: esp.name, action: 'Submitted rectification', note: 'Before/after evidence uploaded' });
  }

  if (status === 'escalated') {
    if (!zeroTol) {
      inc.rectification = mkRect('after', submittedAt);
      const verAt = submittedAt + Math.floor(jitter(2, 3) + 1) * HR;
      inc.verification = { decision: 'not_satisfactory', at: iso(verAt), byInspectorId: inspector.id, comment: 'Rectification incomplete — residue still present on inspection.', photos: [photo('verification', 'Re-inspection', loc, verAt)] };
      timeline.push({ id: `${id}-t2`, at: iso(submittedAt), actorRole: 'ESP', actorName: esp.name, action: 'Submitted rectification' });
      timeline.push({ id: `${id}-t3`, at: iso(verAt), actorRole: 'Inspector', actorName: inspector.name, action: 'Rejected rectification', note: 'Escalated to Project Officer' });
    }
    inc.penaltyAed = 0;
  }

  if (status === 'awaiting_esp_re_rectification' || status === 're_rectification_submitted') {
    if (!zeroTol) {
      inc.rectification = mkRect('after', submittedAt);
      const verAt = submittedAt + 3 * HR;
      inc.verification = { decision: 'not_satisfactory', at: iso(verAt), byInspectorId: inspector.id, comment: 'Not resolved to standard.', photos: [] };
      timeline.push({ id: `${id}-t2`, at: iso(submittedAt), actorRole: 'ESP', actorName: esp.name, action: 'Submitted rectification' });
      timeline.push({ id: `${id}-t3`, at: iso(verAt), actorRole: 'Inspector', actorName: inspector.name, action: 'Rejected rectification' });
    }
    const poAt = submittedAt + 6 * HR;
    inc.poDecision = { at: iso(poAt), byOfficer: pick(PO_OFFICERS), action: 'allow_re_rectification', note: 'One further rectification attempt granted.' };
    timeline.push({ id: `${id}-t4`, at: iso(poAt), actorRole: 'Project Officer', actorName: inc.poDecision.byOfficer, action: 'Allowed re-rectification' });
    if (status === 're_rectification_submitted') {
      const reAt = poAt + 4 * HR;
      inc.reRectification = mkRect('after', reAt);
      timeline.push({ id: `${id}-t5`, at: iso(reAt), actorRole: 'ESP', actorName: esp.name, action: 'Submitted re-rectification' });
    }
  }

  if (status === 'closed') {
    if (zeroTol) {
      const poAt = reportedAt + 8 * HR;
      inc.penaltyAed = vt.penaltyAed;
      inc.poDecision = { at: iso(poAt), byOfficer: pick(PO_OFFICERS), action: 'apply_penalty', penaltyAed: vt.penaltyAed, note: 'Zero-Tolerance penalty applied per matrix.' };
      timeline.push({ id: `${id}-t2`, at: iso(poAt), actorRole: 'Project Officer', actorName: inc.poDecision.byOfficer, action: `Applied penalty AED ${vt.penaltyAed.toLocaleString()}` });
      timeline.push({ id: `${id}-t3`, at: iso(poAt + HR), actorRole: 'System', actorName: 'IIMS', action: 'Closed' });
    } else {
      inc.rectification = mkRect('after', submittedAt);
      const verAt = submittedAt + 2 * HR;
      inc.verification = { decision: 'satisfactory', at: iso(verAt), byInspectorId: inspector.id, comment: 'Verified resolved to standard.', photos: [photo('verification', 'Verified', loc, verAt)] };
      timeline.push({ id: `${id}-t2`, at: iso(submittedAt), actorRole: 'ESP', actorName: esp.name, action: 'Submitted rectification' });
      timeline.push({ id: `${id}-t3`, at: iso(verAt), actorRole: 'Inspector', actorName: inspector.name, action: 'Verified satisfactory · Closed' });
    }
  }

  if (status === 'invalid') {
    timeline.push({ id: `${id}-t2`, at: iso(reportedAt + 2 * HR), actorRole: 'Inspector', actorName: inspector.name, action: 'Marked invalid', note: 'Duplicate / not a genuine non-compliance.' });
  }

  return inc;
}

function buildInspections(incidents: Incident[]): Inspection[] {
  const out: Inspection[] = [];
  const planN: { status: InspectionStatus; type: InspectionType; n: number }[] = [
    { status: 'scheduled', type: 'planned', n: 7 },
    { status: 'ongoing', type: 'planned', n: 3 },
    { status: 'ongoing', type: 'adhoc', n: 2 },
    { status: 'completed', type: 'planned', n: 7 },
    { status: 'completed', type: 'adhoc', n: 3 },
    { status: 'overdue', type: 'planned', n: 2 },
  ];
  // incidents that can be attributed to a completed inspection as an observation
  const attributable = incidents.filter((i) => i.status !== 'invalid');
  let attrIdx = 0;
  let idx = 1;
  for (const plan of planN) {
    for (let k = 0; k < plan.n; k++) {
      const tpl = pick(CHECKLIST_TEMPLATES);
      const zone = pick(ZONES);
      const esp = pick(ESPS.filter((e) => e.zoneIds.includes(zone.id))) ?? pick(ESPS);
      const inspector = pick(INSPECTORS);
      const asset = ASSETS.find((a) => a.zoneId === zone.id);
      const id = `INSP-2026-${pad(idx++)}`;
      const base = SEED_NOW + (plan.status === 'scheduled' ? Math.floor(jitter(2, 4) + 1) * DAY : -Math.floor(jitter(3, 6)) * DAY);
      const loc = { lat: jitter(zone.center.lat, 0.015), lng: jitter(zone.center.lng, 0.015) };

      const responses: ChecklistResponse[] = [];
      const observationIncidentIds: string[] = [];
      let fails = 0;
      if (plan.status === 'completed') {
        for (const item of tpl.items) {
          let value = 'pass';
          if (item.responseType === 'pass_fail') {
            const fail = rnd() < 0.18;
            value = fail ? 'fail' : 'pass';
            if (fail) fails++;
          } else if (item.responseType === 'numeric') value = String(Math.round(jitter(70, 50)));
          else if (item.responseType === 'photo') value = 'done';
          responses.push({ itemId: item.id, value, photoIds: [], note: value === 'fail' ? 'Below contract standard' : undefined });
        }
        // attribute up to one incident as an observation raised by this inspection
        if (fails > 0 && attrIdx < attributable.length) {
          const linked = attributable[attrIdx++];
          linked.sourceInspectionId = id;
          observationIncidentIds.push(linked.id);
        }
      }

      const startedAt = plan.status === 'scheduled' ? undefined : base;
      const completedAt = plan.status === 'completed' ? base + Math.floor(jitter(40, 40) + 20) * 60_000 : undefined;
      const result = plan.status === 'completed' ? (fails === 0 ? 'compliant' : fails > 2 ? 'non_compliant' : 'partial') : undefined;
      const scorePct = plan.status === 'completed' && tpl.items.length ? Math.round(100 - (fails / tpl.items.length) * 100) : undefined;

      out.push({
        id,
        title: `${tpl.serviceType} — ${zone.name}`,
        type: plan.type,
        serviceType: tpl.serviceType,
        checklistTemplateId: tpl.id,
        status: plan.status,
        result,
        scorePct,
        espId: esp.id,
        zoneId: zone.id,
        assetId: asset?.id,
        inspectorId: inspector.id,
        scheduledFor: iso(base),
        startedAt: startedAt ? iso(startedAt) : undefined,
        completedAt: completedAt ? iso(completedAt) : undefined,
        location: loc,
        responses,
        observationIncidentIds,
        timeTakenMins: completedAt && startedAt ? Math.round((completedAt - startedAt) / 60000) : undefined,
      });
    }
  }
  return out;
}

/* ─────────────────────────── planned shifts (Inspector Shifts) ──────────────
 * Deterministic (index math only, no rnd) roster for the ISO week containing
 * SEED_NOW. Layout:
 *   • Monday-anchored week around SEED_NOW; shifts land Mon–Fri.
 *   • Most inspectors get 1–2 shifts/day; the last TWO inspectors get NONE
 *     (→ "NOT UTILIZED").
 *   • A couple of deliberate OVERLAPPING pairs (same inspector + date, times
 *     overlap) → red conflict.
 *   • A couple with inspectorId:'' → amber "missing assignment".
 * ─────────────────────────────────────────────────────────────────────────── */
const SECTORS = ['Sector A', 'Sector B', 'Sector C', 'Sector D', 'Sector E'];
const SHIFT_TASKS = ['Inspection', 'General Inspection', 'Bin Audit', 'Route Check'];
const SHIFT_SLOTS = ['08:00', '10:00', '13:00', '15:00', '17:00'];

/** Monday of the ISO week that contains `ms`. */
function isoMonday(ms: number): Date {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addMin(hhmm: string, min: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const t = h * 60 + m + min;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

export function buildSeedShifts(): PlannedShift[] {
  const monday = isoMonday(SEED_NOW);
  const dateFor = (dayIdx: number) => { const d = new Date(monday); d.setDate(monday.getDate() + dayIdx); return isoDate(d); };
  const out: PlannedShift[] = [];
  let seq = 1;
  const mk = (inspectorId: string, dayIdx: number, slotIdx: number, durMin: number, seriesId?: string, recurring = false): PlannedShift => {
    const id = `shift-${seq++}`;
    const zi = Math.max(0, INSPECTORS.findIndex((x) => x.id === inspectorId));
    const start = SHIFT_SLOTS[slotIdx % SHIFT_SLOTS.length];
    // Spread each inspector's shifts across a small pool — their home zone, the
    // West Bay central zone, and one rotating zone — so a roster covers several
    // areas (not just the home zone).
    const home = INSPECTORS[zi]?.homeZoneId;
    const pool = inspectorId && home
      ? [home, 'z-westbay', ZONES[(zi + 3) % ZONES.length].id]
      : [ZONES[(dayIdx + slotIdx) % ZONES.length].id];
    const lot = pool[(dayIdx + slotIdx) % pool.length];
    return {
      id, seriesId: seriesId ?? id, inspectorId, dateISO: dateFor(dayIdx),
      start, end: addMin(start, durMin),
      lotId: lot, sector: SECTORS[(zi + dayIdx + slotIdx) % SECTORS.length],
      task: SHIFT_TASKS[(zi + slotIdx) % SHIFT_TASKS.length], recurring,
    };
  };

  // The last two inspectors are intentionally left with NO shifts (NOT UTILIZED).
  const utilized = INSPECTORS.slice(0, Math.max(1, INSPECTORS.length - 2));

  // Base roster — Mon(0)…Fri(4). Deterministic 1–2 shifts/day per utilized inspector.
  utilized.forEach((insp, ii) => {
    for (let day = 0; day < 5; day++) {
      // ~most days get a shift; skip one day per inspector for variety.
      if ((day + ii) % 5 === 4) continue;
      out.push(mk(insp.id, day, (day + ii) % SHIFT_SLOTS.length, 120));
      // a second, non-overlapping afternoon shift on some days
      if ((day + ii) % 3 === 0) out.push(mk(insp.id, day, ((day + ii) % SHIFT_SLOTS.length) + 3, 90));
    }
  });

  // Deliberate OVERLAPPING pairs (same inspector + date, overlapping times) → red conflict.
  const c0 = utilized[0].id, c1 = utilized[1 % utilized.length].id;
  out.push(mk(c0, 1, 0, 150)); // 08:00–10:30 (overlaps c0's Tue 08:00–10:00 base)
  out.push(mk(c1, 2, 2, 150)); // 13:00–15:30 (overlaps c1's Wed base)

  // A couple with NO inspector assigned → amber "missing assignment".
  out.push(mk('', 3, 1, 120)); // Thu
  out.push(mk('', 0, 4, 90));  // Mon

  // One recurring series (same slot Mon–Fri) so the calendar shows recurring
  // shifts and the "Delete Recurring Shift?" dialog is reachable.
  const recInspector = utilized[2 % utilized.length].id;
  const recSeries = `series-seed-1`;
  for (let day = 0; day < 5; day++) out.push(mk(recInspector, day, 4, 120, recSeries, true)); // 17:00–19:00 daily

  return out;
}

/* ─────────────────────────── seeded penalties ──────────────────────────────
 * Deterministically issue a Penalty against the first two eligible incidents so
 * the Penalties pipeline + Penalty detail have real data on first load. Each
 * penalty carries 1–2 KPI line items (from the incident's own violation + a
 * sibling in the same category) and sets `incident.penaltyAed = total`. Issued
 * by the signed-in PO (po-1, Hessa Al Owais — matches store.PROJECT_OFFICER).
 * ─────────────────────────────────────────────────────────────────────────── */
const SEED_PO_ID = 'po-1';

/** KPI line-item code — delegates to the shared canonical numbering so seeded
 *  penalties match in-app penalties and the inspection KPI table. */
function kpiNumberFor(violationId: string): string {
  return kpiCodeFor(violationId);
}

export function buildSeedPenalties(incidents: Incident[]): Penalty[] {
  // Eligible = escalated/closed incidents the PO would realistically penalise.
  const eligible = incidents.filter((i) => i.status === 'escalated' || i.status === 'closed').slice(0, 2);
  const out: Penalty[] = [];
  eligible.forEach((inc, n) => {
    const vt = VIOLATION_TYPES.find((v) => v.id === inc.violationTypeId);
    if (!vt) return;
    // second line item = another violation in the same category (if any)
    const sibling = VIOLATION_TYPES.find((v) => v.category === vt.category && v.id !== vt.id);
    const lineItems = [
      { id: `${inc.id}-li-1`, code: kpiNumberFor(vt.id), nonCompliance: vt.name, amountAed: vt.penaltyAed },
      ...(n === 0 && sibling
        ? [{ id: `${inc.id}-li-2`, code: kpiNumberFor(sibling.id), nonCompliance: sibling.name, amountAed: sibling.penaltyAed }]
        : []),
    ];
    const totalAed = lineItems.reduce((sum, li) => sum + li.amountAed, 0);
    const issuedAt = new Date(inc.reportedAt).getTime() + 8 * HR;
    inc.penaltyAed = totalAed;
    out.push({
      id: inc.id.replace('INC-2026-', 'PEN-2026-'),
      incidentId: inc.id,
      lineItems,
      totalAed,
      status: 'issued',
      issuedById: SEED_PO_ID,
      issuedAt: iso(issuedAt),
      dueAt: iso(issuedAt + 7 * DAY),
      comments: n === 0
        ? [{ id: `${inc.id}-pc-1`, authorId: SEED_PO_ID, authorRole: 'po', text: `@ESP please review the issued penalty for ${vt.name} and respond within the compliance window.`, at: iso(issuedAt + HR) }]
        : [],
    });
  });
  return out;
}

export function buildSeedData(): IimsData {
  photoSeq = 1;
  const incidents: Incident[] = [];
  let idx = 1;
  for (const plan of STATUS_PLAN) {
    for (let k = 0; k < plan.n; k++) incidents.push(buildIncident(idx++, plan.status));
  }
  const inspections = buildInspections(incidents);
  const penalties = buildSeedPenalties(incidents);
  return {
    zones: ZONES,
    esps: ESPS,
    inspectors: INSPECTORS,
    violationTypes: VIOLATION_TYPES,
    assets: ASSETS,
    checklistTemplates: CHECKLIST_TEMPLATES,
    incidents,
    inspections,
    penalties,
    shifts: buildSeedShifts(),
    currentInspectorId: CURRENT_INSPECTOR_ID,
    onDuty: true,
  };
}
