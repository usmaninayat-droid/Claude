import { useMemo, useState } from 'react';
import { ListPanelHeader } from '../../shell/ListPanelHeader';
import { PlanCard } from './PlanCard';
import { PLAN_STATUS_META } from '../../data/status';
import type { DailyPlan, PlanStatus } from '../../data/types';

export interface PlansListPanelProps {
  plans: DailyPlan[];
  selectedPlanId: string | null;
  /** Card-body click — toggles the map-watch scene for that plan. */
  onSelect: (id: string) => void;
  /** Eye-icon click — opens the full PlanDetailSheet for that plan. */
  onViewDetails: (id: string) => void;
}

const STATUSES: PlanStatus[] = ['Scheduled', 'Executing', 'Completed'];

/**
 * PlansListPanel — 1:1 rebuild of the FAMS V5 web hybrid list panel,
 * mirroring RequestsListPanel: full toolbar above a status-grouped,
 * scrollable PlanCard list (SCHEDULED / EXECUTING / COMPLETED group
 * headers, in pipeline order).
 */
export function PlansListPanel({ plans, selectedPlanId, onSelect, onViewDetails }: PlansListPanelProps) {
  const [search, setSearch] = useState('');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [syncWithMap, setSyncWithMap] = useState(false);

  const assigneeOptions = useMemo(() => {
    const names = Array.from(new Set(plans.map((p) => p.inspector).filter(Boolean)));
    return names.sort().map((name) => ({ value: name, label: name }));
  }, [plans]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plans.filter((plan) => {
      if (q) {
        const haystack = `${plan.tanker} ${plan.driver} ${plan.id} ${plan.blackSpotZone}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (assignee && plan.inspector !== assignee) return false;
      return true;
    });
  }, [plans, search, assignee]);

  const grouped = useMemo(() => {
    const byStatus = new Map<PlanStatus, DailyPlan[]>();
    for (const status of STATUSES) byStatus.set(status, []);
    for (const plan of filtered) {
      if (!byStatus.has(plan.status)) byStatus.set(plan.status, []);
      byStatus.get(plan.status)!.push(plan);
    }
    return Array.from(byStatus.entries()).filter(([, items]) => items.length > 0);
  }, [filtered]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/20">
      <ListPanelHeader
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search Plan Monitoring"
        assigneeLabel="Inspector"
        assigneeOptions={assigneeOptions}
        assigneeValue={assignee}
        onAssigneeChange={setAssignee}
        syncWithMap={syncWithMap}
        onSyncWithMapChange={setSyncWithMap}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-3 fams-hide-scrollbar">
        {grouped.map(([status, items]) => (
          <div key={status} className="flex flex-col gap-3">
            <div className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              {PLAN_STATUS_META[status]?.label ?? status}
            </div>
            <div className="flex flex-col gap-3">
              {items.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  selected={plan.id === selectedPlanId}
                  onClick={() => onSelect(plan.id)}
                  onViewDetails={() => onViewDetails(plan.id)}
                />
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-body-sm text-muted-foreground">
            No matching plans.
          </div>
        ) : null}
      </div>
    </div>
  );
}
