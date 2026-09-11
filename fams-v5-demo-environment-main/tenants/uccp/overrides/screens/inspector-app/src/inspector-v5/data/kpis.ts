import type { DailyPlan, Incident, IncidentStatus } from './types';

const OPEN_STATUSES: IncidentStatus[] = [
  'intake', 'triage', 'acknowledged', 'assessed', 'tanker-assigned', 'job-ongoing', 'reopened',
];

export function openRequests(incidents: Incident[]): number {
  return incidents.filter((i) => OPEN_STATUSES.includes(i.status)).length;
}

export function criticalNow(incidents: Incident[]): number {
  return incidents.filter((i) => i.priority === 'Critical' && OPEN_STATUSES.includes(i.status)).length;
}

export function tankersActive(plans: DailyPlan[]): number {
  return new Set(plans.filter((p) => p.status === 'Executing').map((p) => p.tanker)).size;
}

export function avgResponseHrs(incidents: Incident[]): number {
  const closedOrCompleted = incidents.filter(
    (i) => i.status === 'job-completed' || i.status === 'closed'
  );
  if (!closedOrCompleted.length) return 0;
  const totalHrs = closedOrCompleted.reduce((sum, i) => {
    const start = new Date(i.reportedAt).getTime();
    const end = new Date(i.lastUpdated).getTime();
    return sum + Math.max(0, end - start) / 3_600_000;
  }, 0);
  return Math.round((totalHrs / closedOrCompleted.length) * 10) / 10;
}

export function plansExecuting(plans: DailyPlan[]): number {
  return plans.filter((p) => p.status === 'Executing').length;
}

export function complianceAvg(plans: DailyPlan[]): number {
  if (!plans.length) return 0;
  const total = plans.reduce((sum, p) => sum + p.compliancePct, 0);
  return Math.round(total / plans.length);
}

export function waterCollectedToday(plans: DailyPlan[]): number {
  return plans.reduce((sum, p) => sum + p.waterCollectedL, 0);
}

export function statusBreakdown(incidents: Incident[]): Record<string, number> {
  const out: Record<string, number> = {};
  incidents.forEach((i) => {
    out[i.status] = (out[i.status] ?? 0) + 1;
  });
  return out;
}

export interface TrendPoint {
  date: string;
  requests: number;
  closures: number;
}

export function sevenDayTrend(incidents: Incident[]): TrendPoint[] {
  const days: TrendPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 86_400_000;
    const requests = incidents.filter((inc) => {
      const t = new Date(inc.reportedAt).getTime();
      return t >= dayStart && t < dayEnd;
    }).length;
    const closures = incidents.filter((inc) => {
      if (inc.status !== 'closed' && inc.status !== 'job-completed') return false;
      const t = new Date(inc.lastUpdated).getTime();
      return t >= dayStart && t < dayEnd;
    }).length;
    days.push({ date: d.toISOString().slice(0, 10), requests, closures });
  }
  return days;
}

export function categoryDonut(incidents: Incident[]): Record<string, number> {
  const out: Record<string, number> = {};
  incidents.forEach((i) => {
    out[i.category] = (out[i.category] ?? 0) + 1;
  });
  return out;
}
