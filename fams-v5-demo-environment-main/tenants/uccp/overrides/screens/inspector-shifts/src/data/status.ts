/**
 * Status metadata — labels, token-based colours and ordering for the incident
 * lifecycle, inspection states and verification results. Colours are DS token
 * hex values (the live map legend needs concrete colours for Leaflet pins; UI
 * chrome should prefer the matching CSS variable noted alongside).
 *
 * NOTE: the two Figma specs disagreed on the colour of "Awaiting Rectification"
 * (one green, one amber). We chose the accessible, semantically-consistent scheme
 * below and recorded it in docs/DECISIONS.md.
 */
import type { IncidentStatus, InspectionStatus, InspectionResult, Severity } from './types';

export interface StatusMeta {
  key: string;
  label: string;
  color: string;   // concrete hex (matches a DS token)
  cssVar: string;  // the DS token variable to prefer in chrome
}

// Colours match the Tadweer April legend design.
export const INCIDENT_STATUS: Record<IncidentStatus, StatusMeta> = {
  awaiting_rectification: { key: 'awaiting_rectification', label: 'Awaiting Rectification', color: '#2E90FA', cssVar: 'var(--chart-2)' },
  rectification_submitted: { key: 'rectification_submitted', label: 'Rectification Submitted', color: '#F79009', cssVar: 'var(--status-warning)' },
  escalated: { key: 'escalated', label: 'Escalated', color: '#F04438', cssVar: 'var(--status-error)' },
  awaiting_esp_re_rectification: { key: 'awaiting_esp_re_rectification', label: 'Awaiting ESP Re-Rectification', color: '#B54708', cssVar: 'var(--warning-600)' },
  re_rectification_submitted: { key: 're_rectification_submitted', label: 'Re-rectification Submitted', color: '#12B76A', cssVar: 'var(--status-success)' },
  closed: { key: 'closed', label: 'Closed', color: '#667085', cssVar: 'var(--muted-foreground)' },
  invalid: { key: 'invalid', label: 'Invalid', color: '#B42318', cssVar: 'var(--status-error)' },
};

/** Order used for kanban columns + legend. */
export const INCIDENT_STATUS_ORDER: IncidentStatus[] = [
  'awaiting_rectification',
  'rectification_submitted',
  'escalated',
  'awaiting_esp_re_rectification',
  're_rectification_submitted',
  'closed',
  'invalid',
];

export const INSPECTION_STATUS: Record<InspectionStatus, StatusMeta> = {
  scheduled: { key: 'scheduled', label: 'Scheduled', color: '#0072D6', cssVar: 'var(--primary)' },
  ongoing: { key: 'ongoing', label: 'Ongoing', color: '#F79009', cssVar: 'var(--status-warning)' },
  completed: { key: 'completed', label: 'Completed', color: '#12B76A', cssVar: 'var(--status-success)' },
  overdue: { key: 'overdue', label: 'Overdue', color: '#F04438', cssVar: 'var(--status-error)' },
};

export const INSPECTION_RESULT: Record<InspectionResult, StatusMeta> = {
  compliant: { key: 'compliant', label: 'Compliant', color: '#12B76A', cssVar: 'var(--status-success)' },
  non_compliant: { key: 'non_compliant', label: 'Non-Compliant', color: '#F04438', cssVar: 'var(--status-error)' },
  partial: { key: 'partial', label: 'Partial', color: '#F79009', cssVar: 'var(--status-warning)' },
};

export const SEVERITY: Record<Severity, StatusMeta> = {
  low: { key: 'low', label: 'Low', color: '#98A2B3', cssVar: 'var(--muted-foreground)' },
  medium: { key: 'medium', label: 'Medium', color: '#F79009', cssVar: 'var(--status-warning)' },
  high: { key: 'high', label: 'High', color: '#DC6803', cssVar: 'var(--warning-600)' },
  critical: { key: 'critical', label: 'Critical', color: '#F04438', cssVar: 'var(--status-error)' },
};
