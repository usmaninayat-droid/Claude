import { Truck, ChevronRight } from 'lucide-react';
import { StatusPill } from '../../../components/StatusPill';
import { useInspectorStore } from '../../../data/store';
import type { Incident } from '../../../data/types';

export interface RequestsRelatedTasksTabProps {
  incident: Incident;
}

/**
 * RequestsRelatedTasksTab — cards for the DailyPlans linked to this Incident
 * (via `linkedDailyPlanIds`). Clicking a card switches to Plan Monitoring and
 * selects that plan. Pure content component, shared with mobile later.
 */
export function RequestsRelatedTasksTab({ incident }: RequestsRelatedTasksTabProps) {
  const { plans, setActiveModule, selectPlan } = useInspectorStore();
  const linked = plans.filter((p) => incident.linkedDailyPlanIds.includes(p.id));

  if (linked.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
        No dispatched tanker plans linked to this request yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {linked.map((plan) => (
        <button
          key={plan.id}
          type="button"
          onClick={() => {
            setActiveModule('plans');
            selectPlan(plan.id);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            border: '1px solid var(--border)',
            borderRadius: 'var(--ins-radius-md)',
            background: 'var(--card)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--ins-radius-sm)',
              background: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Truck size={18} color="var(--primary)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{plan.id} — {plan.tanker}</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{plan.driver} · {plan.shift}</div>
          </div>
          <StatusPill status={plan.status} kind="plan" />
          <ChevronRight size={16} color="var(--muted-foreground)" />
        </button>
      ))}
    </div>
  );
}
