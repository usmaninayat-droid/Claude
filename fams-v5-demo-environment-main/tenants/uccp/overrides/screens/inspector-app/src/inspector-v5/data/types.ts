export type IncidentType = 'Complaint' | 'Request';

/** FM-6272's category list. `Flooding` is in the creation form's dropdown but
 *  unused by the current seed — kept so the form's options stay complete. */
export type IncidentCategory =
  | 'Rainwater Removal'
  | 'Flooding'
  | 'Blocked Drain'
  | 'Sewage Overflow'
  | 'Road Waterlogging'
  | 'Other';

export type IncidentSource =
  | 'NCC'
  | '184 Call Center'
  | 'Oracle e-Service'
  | 'Oun app (citizen)'
  | 'Ashghal (PWA)';

export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

export type IncidentStatus =
  | 'intake'
  | 'triage'
  | 'acknowledged'
  | 'assessed'
  | 'tanker-assigned'
  | 'job-ongoing'
  | 'job-completed'
  | 'closed'
  | 'reopened';

/** The 5 municipalities of the shared seeds (DATA-LINKAGE.md §2). "Al Wakrah",
 *  never the older "Al Wakra" — normalised across the seeds 2026-09-01. */
export type Municipality = 'Doha' | 'Al Rayyan' | 'Al Wakrah' | 'Umm Salal' | 'Al Daayen';

export interface Incident {
  id: string; // INC-####
  title: string;
  type: IncidentType;
  category: IncidentCategory;
  location: string;
  onwani: string;
  municipality: Municipality;
  zone: string;
  source: IncidentSource;
  sourceRef: string;
  priority: Priority;
  reportedAt: string; // ISO
  description: string;
  tankerAssigned?: string;
  tankerCount: number;
  status: IncidentStatus;
  reportedBy: string;
  contractor: string;
  assignedInspector: string;
  lastUpdated: string;
  custName: string;
  custContact: string;
  reopened: boolean;
  vehDriver?: string;
  lat: number;
  lng: number;
  beforeImages: string[];
  completionProofs: string[];
  linkedDailyPlanIds: string[];
}

export type PlanStatus = 'Scheduled' | 'Executing' | 'Completed';
export type Shift = 'Morning' | 'Afternoon' | 'Night';

export interface DailyPlan {
  id: string; // FPL-####
  title: string;
  sourcePlan?: string;
  blackSpotZone: string;
  zone: string;
  tanker: string;
  driver: string;
  inspector: string;
  shift: Shift;
  plannedStart: string;
  plannedEnd: string;
  status: PlanStatus;
  stopsCompleted: number;
  stopsTotal: number;
  compliancePct: number;
  waterCollectedL: number;
  lat: number;
  lng: number;
  sourceRequestId?: string;
  planDate: string;
}

export interface TimelineEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  note?: string;
  status?: string;
}
