import type { DailyPlan, Incident, TimelineEvent } from './types';
import { INCIDENT_PIPELINE } from './status';

function addMinutes(iso: string, minutes: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

const INCIDENT_ACTION_LABEL: Record<string, string> = {
  intake: 'Incident logged',
  triage: 'Triaged by control room',
  acknowledged: 'Acknowledged by inspector',
  assessed: 'Site assessed',
  'tanker-assigned': 'Tanker(s) assigned',
  'job-ongoing': 'Job started',
  'job-completed': 'Job completed',
  closed: 'Incident closed',
  reopened: 'Incident reopened',
};

export function timelineForIncident(incident: Incident): TimelineEvent[] {
  const idx = INCIDENT_PIPELINE.indexOf(incident.status);
  const stepsUpTo = incident.reopened
    ? INCIDENT_PIPELINE // include full sequence, reopened tacked on at end via its own status
    : INCIDENT_PIPELINE.slice(0, idx + 1);

  const events: TimelineEvent[] = [];
  let cursor = incident.reportedAt;
  const actorFor = (status: string): string => {
    if (status === 'intake') return incident.source === 'NCC' ? 'NCC Operator' : 'System';
    if (status === 'triage' || status === 'acknowledged') return 'System';
    return incident.assignedInspector || 'System';
  };

  const relevantSteps = incident.reopened
    ? INCIDENT_PIPELINE.filter((s) => s !== 'reopened').slice(0, INCIDENT_PIPELINE.indexOf('closed') + 1)
    : stepsUpTo;

  relevantSteps.forEach((status, i) => {
    events.push({
      id: `${incident.id}-evt-${i}`,
      at: cursor,
      actor: actorFor(status),
      action: INCIDENT_ACTION_LABEL[status] ?? status,
      status,
    });
    cursor = addMinutes(cursor, 35 + i * 10);
  });

  if (incident.reopened) {
    events.push({
      id: `${incident.id}-evt-reopen`,
      at: incident.lastUpdated,
      actor: incident.custName,
      action: INCIDENT_ACTION_LABEL.reopened,
      note: 'Issue recurred after initial closure.',
      status: 'reopened',
    });
  } else if (events.length) {
    events[events.length - 1] = { ...events[events.length - 1], at: incident.lastUpdated };
  }

  return events;
}

const PLAN_ACTION_LABEL: Record<string, string> = {
  Scheduled: 'Plan scheduled',
  Executing: 'Route in progress',
  Completed: 'Route completed',
};

export function timelineForPlan(plan: DailyPlan): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: `${plan.id}-evt-0`,
      at: plan.plannedStart,
      actor: 'System',
      action: 'Plan created',
      note: plan.sourcePlan,
      status: 'Scheduled',
    },
  ];

  if (plan.status === 'Executing' || plan.status === 'Completed') {
    events.push({
      id: `${plan.id}-evt-1`,
      at: plan.plannedStart,
      actor: plan.driver,
      action: PLAN_ACTION_LABEL.Executing,
      note: `${plan.stopsCompleted}/${plan.stopsTotal} stops completed`,
      status: 'Executing',
    });
  }

  if (plan.status === 'Completed') {
    events.push({
      id: `${plan.id}-evt-2`,
      at: plan.plannedEnd,
      actor: plan.inspector,
      action: PLAN_ACTION_LABEL.Completed,
      note: `${plan.waterCollectedL.toLocaleString()} L collected`,
      status: 'Completed',
    });
  }

  return events;
}
