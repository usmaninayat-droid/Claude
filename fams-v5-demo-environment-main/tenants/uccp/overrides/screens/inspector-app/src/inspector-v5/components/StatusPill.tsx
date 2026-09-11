import { Badge } from '@ds/components/primitives/badge';
import { INCIDENT_STATUS_META, PLAN_STATUS_META } from '../data/status';
import type { IncidentStatus, PlanStatus } from '../data/types';

export interface StatusPillProps {
  status: IncidentStatus | PlanStatus;
  kind: 'incident' | 'plan';
}

/**
 * StatusPill — token-driven status badge for incidents and plans, colored
 * from data/status.ts's meta maps (`color` is a runtime value carried per
 * status, not a hardcoded hex in this component).
 */
export function StatusPill({ status, kind }: StatusPillProps) {
  const meta =
    kind === 'incident'
      ? INCIDENT_STATUS_META[status as IncidentStatus]
      : PLAN_STATUS_META[status as PlanStatus];

  if (!meta) return null;

  return (
    <Badge variant="outline" size="sm" color={meta.color}>
      {meta.label}
    </Badge>
  );
}
