import { RecordTimeline } from '../../../components/RecordTimeline';
import { timelineForPlan } from '../../../data/timeline';
import type { DailyPlan } from '../../../data/types';

export interface PlansTimelineTabProps {
  plan: DailyPlan;
}

/** PlansTimelineTab — RecordTimeline of timelineForPlan(plan). Pure content component. */
export function PlansTimelineTab({ plan }: PlansTimelineTabProps) {
  return <RecordTimeline events={timelineForPlan(plan)} />;
}
