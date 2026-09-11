import { RecordTimeline } from '../../../components/RecordTimeline';
import { INCIDENT_PIPELINE, INCIDENT_STATUS_META } from '../../../data/status';
import { timelineForIncident } from '../../../data/timeline';
import type { Incident } from '../../../data/types';

export interface RequestsTimelineTabProps {
  incident: Incident;
}

/** RequestsTimelineTab — pipeline stepper + record timeline (shared with mobile in Stage 4). */
export function RequestsTimelineTab({ incident }: RequestsTimelineTabProps) {
  const steps = INCIDENT_PIPELINE.filter((s) => s !== 'reopened');
  const currentIdx = steps.indexOf(incident.status === 'reopened' ? 'intake' : incident.status);

  return (
    <div>
      <div
        className="fams-hide-scrollbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          padding: '8px 4px 20px',
          marginBottom: 8,
        }}
      >
        {steps.map((step, i) => {
          const meta = INCIDENT_STATUS_META[step];
          const state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'todo';
          return (
            <div key={step} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 92 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: state === 'todo' ? 'var(--muted)' : 'var(--primary)',
                    opacity: state === 'current' ? 1 : state === 'done' ? 0.7 : 1,
                    border: state === 'current' ? '2px solid var(--primary)' : 'none',
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    marginTop: 6,
                    textAlign: 'center',
                    color: state === 'todo' ? 'var(--muted-foreground)' : 'var(--foreground)',
                    fontWeight: state === 'current' ? 600 : 400,
                  }}
                >
                  {meta.label}
                </span>
              </div>
              {i < steps.length - 1 ? (
                <div
                  style={{
                    width: 24,
                    height: 2,
                    background: i < currentIdx ? 'var(--primary)' : 'var(--border)',
                    flexShrink: 0,
                    marginBottom: 18,
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      {incident.reopened ? (
        <div style={{ fontSize: 12, color: 'var(--destructive)', marginBottom: 12, fontWeight: 600 }}>
          Reopened after closure
        </div>
      ) : null}
      <RecordTimeline events={timelineForIncident(incident)} />
    </div>
  );
}
