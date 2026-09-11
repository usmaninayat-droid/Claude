import type { IncidentStatus, PlanStatus, Priority } from './types';

export interface StatusMeta {
  label: string;
  color: string;
}

export const INCIDENT_STATUS_META: Record<IncidentStatus, StatusMeta> = {
  intake: { label: 'Intake', color: '#f79009' },
  triage: { label: 'Triage', color: '#0072d6' },
  acknowledged: { label: 'Acknowledged', color: '#4e5ba6' },
  assessed: { label: 'Assessed', color: '#005cb0' },
  'tanker-assigned': { label: 'Tanker Assigned', color: '#4e5ba6' },
  'job-ongoing': { label: 'Job Ongoing', color: '#00478a' },
  'job-completed': { label: 'Job Completed', color: '#027a48' },
  closed: { label: 'Closed', color: '#667085' },
  reopened: { label: 'Reopened', color: '#d92d20' },
};

export const PLAN_STATUS_META: Record<PlanStatus, StatusMeta> = {
  Scheduled: { label: 'Scheduled', color: '#FDB022' },
  Executing: { label: 'Executing', color: '#0072D6' },
  Completed: { label: 'Completed', color: '#12B76A' },
};

export type ToneName = 'error' | 'warning' | 'success' | 'info' | 'neutral';

export const PRIORITY_TONE: Record<Priority, ToneName> = {
  Critical: 'error',
  High: 'warning',
  Medium: 'warning',
  Low: 'success',
};

export const INCIDENT_PIPELINE: IncidentStatus[] = [
  'intake',
  'triage',
  'acknowledged',
  'assessed',
  'tanker-assigned',
  'job-ongoing',
  'job-completed',
  'closed',
  'reopened',
];
