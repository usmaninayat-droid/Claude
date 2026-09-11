import type { ReactNode } from 'react';
import { Calendar, Clock, MapPin, Truck } from 'lucide-react';
import { Progress } from '@ds/components/primitives/progress';
import { ComplianceGauge } from '@ds/components/data-viz/compliance-gauge';
import { DetailSheet } from '../../shell/DetailSheet';
import { RecordAvatar } from '../../components/RecordAvatar';
import {
  RecordSection,
  RecordWorkspace,
  type RecordInfoRowDef,
} from '../../components/RecordWorkspace';
import { RecordActivityPanel, type ActivityLogRow } from '../../components/RecordActivityPanel';
import { PLAN_STATUS_META } from '../../data/status';
import { commentsForRecord } from '../../data/comments';
import { timelineForPlan } from '../../data/timeline';
import { SIGNED_IN_INSPECTOR } from '../../data/session';
import type { DailyPlan } from '../../data/types';
import { PlansRelatedTasksTab } from './detail/RelatedTasksTab';

export interface PlanDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: DailyPlan;
}

/**
 * PlanDetailSheet — the SAME web record-detail shell as IncidentDetailSheet
 * (the web pattern is module-generic: `side-sheet.tsx` DetailSheet chrome +
 * `task-detail.tsx` TaskDetail body + `pipeline-right-panel.tsx` tab strip),
 * carrying the plan module's own Execution / Progress fields.
 */
export function PlanDetailSheet({ open, onOpenChange, plan }: PlanDetailSheetProps) {
  const statusMeta = PLAN_STATUS_META[plan.status];
  const stopsPct = plan.stopsTotal > 0 ? Math.round((plan.stopsCompleted / plan.stopsTotal) * 100) : 0;

  const formatDateTime = (iso: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const personValue = (name: string) => (
    <span className="flex min-w-0 items-center gap-2">
      <RecordAvatar name={name} className="size-5 text-[10px]" />
      <span className="truncate text-[14px] font-semibold leading-4 text-foreground">{name}</span>
    </span>
  );

  const iconValue = (icon: ReactNode, text: string) => (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="truncate text-[14px] font-semibold leading-4 text-foreground">{text}</span>
    </span>
  );

  const details: { left: RecordInfoRowDef[]; right: RecordInfoRowDef[] } = {
    left: [
      { label: 'Tanker', value: iconValue(<Truck size={14} />, plan.tanker) },
      { label: 'Driver', value: personValue(plan.driver) },
      { label: 'Inspector', value: personValue(plan.inspector) },
      { label: 'Shift', value: iconValue(<Clock size={14} />, plan.shift) },
      { label: 'Black Spot Zone', value: iconValue(<MapPin size={14} />, plan.blackSpotZone) },
    ],
    right: [
      { label: 'Planned Start', value: iconValue(<Calendar size={14} />, formatDateTime(plan.plannedStart)) },
      { label: 'Planned End', value: iconValue(<Calendar size={14} />, formatDateTime(plan.plannedEnd)) },
      { label: 'Zone / Area', value: plan.zone },
      { label: 'Plan Date', value: iconValue(<Calendar size={14} />, plan.planDate) },
      { label: 'Source Request', value: plan.sourceRequestId ?? plan.sourcePlan ?? '—' },
    ],
  };

  const events = timelineForPlan(plan);
  const logs: ActivityLogRow[] = events.map((event, i) => {
    const meta = event.status ? PLAN_STATUS_META[event.status as keyof typeof PLAN_STATUS_META] : undefined;
    if (i === 0) {
      return {
        id: event.id,
        actor: event.actor,
        text: `created this daily plan — **${plan.id}**`,
        at: event.at,
        icon: 'added',
      };
    }
    return {
      id: event.id,
      actor: event.actor,
      text: 'moved this to',
      at: event.at,
      icon: 'updated',
      badge: meta ? { label: meta.label, tone: i === events.length - 1 ? 'success' : 'info' } : undefined,
    };
  });

  const comments = commentsForRecord(plan.id, plan.plannedStart, [plan.inspector, plan.driver]);

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      tabs={[{ id: plan.id, category: 'PLAN MONITORING', label: plan.id, icon: Truck }]}
      activeId={plan.id}
      onCloseTab={() => onOpenChange(false)}
      onCloseAll={() => onOpenChange(false)}
      onMinimize={() => onOpenChange(false)}
    >
      <RecordWorkspace
        recordId={plan.id}
        moduleLabel="Daily Plan"
        moduleIcon={<Truck size={12} className="text-muted-foreground" />}
        title={plan.title}
        statusSlot={
          <span
            className="inline-flex items-center px-2.5 py-1 text-[12px] font-semibold uppercase tracking-wide text-white"
            style={{ borderRadius: 'var(--ins-radius-full)', backgroundColor: statusMeta.color }}
          >
            {statusMeta.label}
          </span>
        }
        details={details}
        rightTabs={[
          {
            key: 'timeline',
            title: 'Timeline',
            render: () => (
              <RecordActivityPanel logs={logs} comments={comments} currentUser={SIGNED_IN_INSPECTOR} />
            ),
          },
          {
            key: 'related',
            title: 'Related Requests/Complaints',
            render: () => <PlansRelatedTasksTab plan={plan} />,
          },
        ]}
      >
        <RecordSection title="Progress">
          <div className="flex flex-wrap items-center gap-6">
            <ComplianceGauge value={plan.compliancePct} size={110} label="Compliance" />
            <div className="min-w-[160px] flex-1">
              <div className="mb-1.5 flex justify-between text-caption">
                <span className="text-muted-foreground">Stops</span>
                <span className="font-semibold text-foreground">
                  {plan.stopsCompleted}/{plan.stopsTotal}
                </span>
              </div>
              <Progress value={stopsPct} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <p className="w-[140px] shrink-0 text-[12px] font-semibold leading-[14px] text-muted-foreground">
              Water Collected
            </p>
            <p className="truncate text-[14px] font-semibold leading-4 text-foreground">
              {plan.waterCollectedL.toLocaleString()} L
            </p>
          </div>
        </RecordSection>
      </RecordWorkspace>
    </DetailSheet>
  );
}
