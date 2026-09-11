import { AlertTriangle, ChevronRight } from 'lucide-react';
import { StatusPill } from '../../../components/StatusPill';
import { PriorityChip } from '../../../components/PriorityChip';
import { useInspectorStore } from '../../../data/store';
import type { DailyPlan } from '../../../data/types';

export interface PlansRelatedTasksTabProps {
  plan: DailyPlan;
}

/**
 * PlansRelatedTasksTab — card for the source Incident (via `sourceRequestId`).
 * Clicking it switches to Requests & Complaints and selects that incident.
 */
export function PlansRelatedTasksTab({ plan }: PlansRelatedTasksTabProps) {
  const { incidents, setActiveModule, selectIncident } = useInspectorStore();
  const source = plan.sourceRequestId ? incidents.find((i) => i.id === plan.sourceRequestId) : undefined;

  if (!source) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
        This plan is not linked to a source request.
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setActiveModule('requests');
        selectIncident(source.id);
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
        width: '100%',
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
        <AlertTriangle size={18} color="var(--primary)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{source.id} — {source.title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{source.location}</div>
      </div>
      <PriorityChip priority={source.priority} />
      <StatusPill status={source.status} kind="incident" />
      <ChevronRight size={16} color="var(--muted-foreground)" />
    </button>
  );
}
