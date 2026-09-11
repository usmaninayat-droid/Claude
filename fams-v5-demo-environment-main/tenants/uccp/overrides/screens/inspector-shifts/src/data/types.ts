/**
 * IIMS-INS domain types — the single source of truth for the Inspector app.
 *
 * The app is a bespoke tablet experience (camera/GPS/dynamic checklists / before-
 * after evidence) so — like the `fams-app` mobile precedent — it drives its UI from
 * a typed in-memory store rather than the DS sim/EAV engine. Styling stays
 * token-only and presentation uses DS components. See docs/DATA-MODEL.md.
 */

export type IncidentStatus =
  | 'awaiting_rectification'
  | 'rectification_submitted'
  | 'escalated'
  | 'awaiting_esp_re_rectification'
  | 're_rectification_submitted'
  | 'closed'
  | 'invalid';

export type InspectionStatus = 'scheduled' | 'ongoing' | 'completed' | 'overdue';
export type InspectionType = 'planned' | 'adhoc';
export type InspectionResult = 'compliant' | 'non_compliant' | 'partial';

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type VerificationDecision = 'satisfactory' | 'not_satisfactory';

/** The 7 KPI service categories used to classify a violation (from the Figma KPI picker). */
export type KpiCategory =
  | 'Solid Waste'
  | 'Mechanical Sweeping'
  | 'Manual Sweeping'
  | 'Fleet'
  | 'EHS'
  | 'Resource Allocation'
  | 'PCC';

export type ServiceType =
  | 'Bin Washing'
  | 'Container Collection'
  | 'Mechanical Street Sweeping'
  | 'Manual Sweeping'
  | 'Fleet & Vehicle'
  | 'EHS Compliance';

export type AssetType = 'Bin' | 'Container' | 'Sweeper Vehicle' | 'Street Segment' | 'Skip';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Zone {
  id: string;
  name: string;          // Doha operational zone, e.g. "Al Sadd"
  code: string;          // Operations Center zone id, e.g. "Z-1043"
  center: GeoPoint;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface Esp {
  id: string;
  name: string;          // Environmental Service Provider (contractor)
  code: string;
  contactPerson: string;
  zoneIds: string[];
  slaCompliancePct: number;  // 0-100
  avatarColor: string;       // token var or hex for the avatar chip
}

export interface Inspector {
  id: string;
  name: string;
  badge: string;
  avatarColor: string;
  homeZoneId: string;
}

/** A KPI / violation type in the penalty matrix. */
export interface ViolationType {
  id: string;
  pmCode: string;            // penalty-matrix code e.g. "PM-SW-03"
  category: KpiCategory;
  name: string;              // e.g. "Missed scheduled collection"
  nameAr?: string;
  defaultSeverity: Severity;
  zeroTolerance: boolean;    // critical EHS/environmental breach → auto-escalate
  penaltyAed: number;        // penalty if confirmed
  rectifyWithinHrs: number;  // SLA window for the ESP to rectify
}

export interface Asset {
  id: string;
  type: AssetType;
  label: string;             // e.g. "1100L Bin · Al Sadd Street"
  rfid: string;
  zoneId: string;
  espId: string;
  location: GeoPoint;
}

export interface EvidencePhoto {
  id: string;
  kind: 'incident' | 'before' | 'after' | 'verification' | 'checklist';
  /** deterministic seed so the UI renders a stable placeholder tile */
  seed: number;
  caption: string;
  gps: GeoPoint;
  timestamp: string;         // ISO
  /** Real captured/uploaded image as a data URL (camera or gallery). When set,
   *  the tile renders the actual photo instead of the placeholder gradient. */
  dataUrl?: string;
}

export interface TimelineEvent {
  id: string;
  at: string;                // ISO
  actorRole: 'Inspector' | 'ESP' | 'Project Officer' | 'System';
  actorName: string;
  action: string;            // short verb phrase
  note?: string;
}

export interface Rectification {
  submittedAt: string;
  espUser: string;
  description: string;
  beforePhotos: EvidencePhoto[];
  afterPhotos: EvidencePhoto[];
}

export interface Verification {
  decision: VerificationDecision;
  at: string;
  byInspectorId: string;
  comment: string;
  photos: EvidencePhoto[];
}

export interface PoDecision {
  at: string;
  byOfficer: string;
  action: 'allow_re_rectification' | 'apply_penalty';
  penaltyAed?: number;
  note?: string;
}

export interface Incident {
  id: string;                // INC-2026-####
  title: string;
  description: string;
  violationTypeId: string;
  category: KpiCategory;
  severity: Severity;
  zeroTolerance: boolean;
  status: IncidentStatus;
  espId: string;
  zoneId: string;
  assetId?: string;
  reportedByInspectorId: string;
  reportedAt: string;        // ISO
  slaDueAt: string;          // ISO — rectification deadline
  location: GeoPoint;
  locationAccuracyM: number; // GPS accuracy in metres
  evidence: EvidencePhoto[];
  notes?: string;
  penaltyAed: number;        // accrued/issued penalty
  sourceInspectionId?: string;
  rectification?: Rectification;
  verification?: Verification;
  reRectification?: Rectification;
  reVerification?: Verification;
  poDecision?: PoDecision;
  timeline: TimelineEvent[];
  comments?: { id: string; authorId: string; authorRole?: 'inspector' | 'esp' | 'po'; text: string; at: string }[];
}

/** One non-compliance line in an issued Penalty (from the KPI Selection). */
export interface PenaltyLineItem {
  id: string;
  code: string;            // KPI number, e.g. "2.2"
  nonCompliance: string;   // the violation / non-compliance text
  amountAed: number;
}

export type PenaltyStatus = 'issued' | 'acknowledged' | 'disputed' | 'paid';

/** A financial penalty issued by the Project Officer against an incident's ESP. */
export interface Penalty {
  id: string;                // 'PEN-2026-####'
  incidentId: string;
  lineItems: PenaltyLineItem[];
  totalAed: number;
  status: PenaltyStatus;
  issuedById: string;        // PO id (PROJECT_OFFICER)
  issuedAt: string;          // ISO
  dueAt: string;             // ISO — issuedAt + 7d
  comments?: { id: string; authorId: string; authorRole?: 'inspector' | 'esp' | 'po'; text: string; at: string }[];
}

export type ChecklistResponseType = 'pass_fail' | 'yes_no' | 'rating' | 'numeric' | 'photo';

export interface ChecklistItemTemplate {
  id: string;
  section: string;
  text: string;
  responseType: ChecklistResponseType;
  required: boolean;
  /** a failing response on this item is a candidate observation/violation */
  violationTypeId?: string;
}

export interface ChecklistTemplate {
  id: string;
  serviceType: ServiceType;
  items: ChecklistItemTemplate[];
}

export interface ChecklistResponse {
  itemId: string;
  /** 'pass'|'fail' | 'yes'|'no' | rating number as string | numeric value | 'done' */
  value: string;
  note?: string;
  photoIds: string[];
  raisedIncidentId?: string;
}

export interface Inspection {
  id: string;                // INSP-2026-####
  title: string;
  type: InspectionType;
  serviceType: ServiceType;
  checklistTemplateId: string;
  status: InspectionStatus;
  result?: InspectionResult;
  scorePct?: number;
  espId: string;
  zoneId: string;
  assetId?: string;
  inspectorId: string;
  scheduledFor: string;      // ISO
  startedAt?: string;
  completedAt?: string;
  location: GeoPoint;
  responses: ChecklistResponse[];
  /** Per-KPI-category verdict captured in the "Inspection KPIs" step. */
  kpiResults?: { category: KpiCategory; result: 'satisfactory' | 'not_satisfactory' }[];
  observationIncidentIds: string[];
  timeTakenMins?: number;
}

/** A planned inspector shift (Inspector Shifts · Planning view). Lives in the
 *  store so both the PO planner and the Inspector app see the same roster. A
 *  recurring series shares one `seriesId`; a one-off shift's `seriesId === id`. */
export interface PlannedShift {
  id: string;
  seriesId: string;      // groups a recurring series (== id for one-offs)
  inspectorId: string;   // '' allowed → "missing assignment" (amber)
  dateISO: string;       // 'YYYY-MM-DD'
  start: string;         // 'HH:MM' 24h
  end: string;           // 'HH:MM' 24h
  lotId: string;         // zone id
  sector: string;        // 'Sector A'…'Sector E'
  task: string;          // e.g. 'Inspection' / 'General Inspection'
  recurring: boolean;
  notes?: string;
}

/** Full app dataset held by the store. */
export interface IimsData {
  zones: Zone[];
  esps: Esp[];
  inspectors: Inspector[];
  violationTypes: ViolationType[];
  assets: Asset[];
  checklistTemplates: ChecklistTemplate[];
  incidents: Incident[];
  inspections: Inspection[];
  /** issued penalties (Issue Penalty flow · Penalties pipeline) */
  penalties: Penalty[];
  /** planned inspector shifts (Inspector Shifts · Planning) */
  shifts: PlannedShift[];
  /** the signed-in inspector */
  currentInspectorId: string;
  onDuty: boolean;
  /** Home day-view task ids the inspector has finished — dropped from Home. */
  completedTaskIds?: string[];
}
