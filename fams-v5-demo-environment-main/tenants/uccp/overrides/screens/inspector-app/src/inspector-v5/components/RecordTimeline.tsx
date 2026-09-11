import { Timeline } from '@ds/components/data-display/timeline';
import type { TimelineItem } from '@ds/components/data-display/timeline';
import type { TimelineEvent } from '../data/types';

export interface RecordTimelineProps {
  events: TimelineEvent[];
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** RecordTimeline — wraps the DS Timeline to render Incident/DailyPlan TimelineEvent[]. */
export function RecordTimeline({ events }: RecordTimelineProps) {
  const items: TimelineItem[] = events.map((event) => ({
    id: event.id,
    title: event.action,
    subtitle: [event.actor, event.note].filter(Boolean).join(' — ') || undefined,
    timestamp: formatTimestamp(event.at),
  }));

  return <Timeline items={items} />;
}
