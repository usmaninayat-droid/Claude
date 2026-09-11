import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Calendar,
  ChevronDown,
  CircleDot,
  Flag,
  MapPin,
  MessageSquareWarning,
  MoreHorizontal,
  Send,
  Truck,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ds/components/primitives/dropdown-menu';
import { DetailSheet } from '../../shell/DetailSheet';
import { RecordAvatar } from '../../components/RecordAvatar';
import {
  RecordNoteBlock,
  RecordSection,
  RecordWorkspace,
  type RecordInfoRowDef,
} from '../../components/RecordWorkspace';
import { RecordActivityPanel, type ActivityLogRow } from '../../components/RecordActivityPanel';
import type { ActivityTone } from '../../components/ActivityFeed';
import { INCIDENT_PIPELINE, INCIDENT_STATUS_META, PRIORITY_TONE } from '../../data/status';
import { commentsForRecord } from '../../data/comments';
import { timelineForIncident } from '../../data/timeline';
import { useInspectorStore } from '../../data/store';
import { SIGNED_IN_INSPECTOR } from '../../data/session';
import type { Incident, Priority } from '../../data/types';
import { RequestsRelatedTasksTab } from './detail/RelatedTasksTab';
import { DispatchTankerSheet } from './DispatchTankerSheet';

export interface IncidentDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: Incident;
}

/**
 * IncidentDetailSheet — 1:1 port of the FAMS V5 WEB record-detail experience
 * for Requests & Complaints:
 *   · `shell/DetailSheet`      ← app-shell/side-sheet.tsx `DetailSheet`
 *                                (traffic lights + browser-tab strip)
 *   · `components/RecordWorkspace` ← app-shell/task-detail.tsx `TaskDetail`
 *                                (id/module pill pair, 26px title, two-column
 *                                 InfoRow grid, chevron sections, `»` collapse)
 *   · right panel tab strip    ← app-shell/pipeline-right-panel.tsx
 *   · Timeline tab feed        ← v5-templates task-detail/ActivityCommentFeed
 *                                over ui-kit's `ActivityFeed` composite
 *
 * Change Status is functional (advances through INCIDENT_PIPELINE via the
 * store); Dispatch Tankers lives in the header overflow menu.
 */
export function IncidentDetailSheet({ open, onOpenChange, incident }: IncidentDetailSheetProps) {
  const { advanceStatus } = useInspectorStore();
  const [dispatchOpen, setDispatchOpen] = useState(false);

  const statusMeta = INCIDENT_STATUS_META[incident.status];
  const pipeline = INCIDENT_PIPELINE.filter((s) => s !== 'reopened');
  const currentIdx = pipeline.indexOf(incident.status === 'reopened' ? 'closed' : incident.status);
  const forward = pipeline.slice(currentIdx + 1);

  const priorityTone: Record<Priority, ActivityTone> = {
    Critical: 'danger',
    High: 'warning',
    Medium: 'warning',
    Low: 'success',
  };
  const priorityColorVar =
    PRIORITY_TONE[incident.priority] === 'error'
      ? 'var(--status-error)'
      : PRIORITY_TONE[incident.priority] === 'warning'
        ? 'var(--status-warning)'
        : 'var(--status-success)';

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
      { label: 'UCCP Operator', value: personValue(incident.reportedBy) },
      { label: 'Municipality', value: iconValue(<MapPin size={14} />, incident.municipality) },
      { label: 'Zone / Area', value: incident.zone },
      { label: 'Location', value: iconValue(<MapPin size={14} />, incident.location) },
      { label: 'Assigned Inspector', value: personValue(incident.assignedInspector) },
      { label: 'Onwani Number', value: incident.onwani },
      {
        label: 'Category',
        value: (
          <span
            className="inline-flex items-center px-2 py-0.5 text-[12px] font-semibold"
            style={{
              borderRadius: 'var(--ins-radius-full)',
              backgroundColor: 'color-mix(in srgb, var(--status-success) 14%, transparent)',
              color: 'var(--status-success)',
            }}
          >
            {incident.category}
          </span>
        ),
      },
    ],
    right: [
      { label: 'Reported At', value: iconValue(<Calendar size={14} />, formatDateTime(incident.reportedAt)) },
      {
        label: 'Priority',
        value: (
          <span
            className="inline-flex items-center gap-1 text-[14px] font-semibold uppercase tracking-wide"
            style={{ color: priorityColorVar }}
          >
            <Flag size={14} className="shrink-0" />
            {incident.priority}
          </span>
        ),
      },
      { label: 'Source', value: iconValue(<CircleDot size={14} />, incident.source) },
      { label: 'Contractor', value: personValue(incident.contractor) },
      { label: 'Last Updated', value: iconValue(<Calendar size={14} />, formatDateTime(incident.lastUpdated)) },
      {
        label: 'Type',
        value: (
          <span
            className="inline-flex items-center border px-2 py-0.5 text-[12px] font-semibold"
            style={{
              borderRadius: 'var(--ins-radius-full)',
              borderColor: 'var(--status-info)',
              color: 'var(--status-info)',
            }}
          >
            {incident.type}
          </span>
        ),
      },
      { label: 'Source Reference', value: incident.sourceRef || '—' },
    ],
  };

  /* ── Timeline logs: pipeline history + the severity row ──────────────── */
  const events = timelineForIncident(incident);
  const logs: ActivityLogRow[] = events.map((event, i) => {
    const meta = event.status ? INCIDENT_STATUS_META[event.status as keyof typeof INCIDENT_STATUS_META] : undefined;
    if (i === 0) {
      return {
        id: event.id,
        actor: event.actor,
        text: `created this ${incident.type.toLowerCase()} — **${incident.id}**`,
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
  if (events.length > 1) {
    logs.splice(1, 0, {
      id: `${incident.id}-evt-severity`,
      actor: events[0].actor,
      text: 'changed severity to',
      at: events[0].at,
      icon: 'updated',
      severity: { label: incident.priority, tone: priorityTone[incident.priority] },
    });
  }

  const comments = commentsForRecord(incident.id, incident.lastUpdated, [
    incident.assignedInspector,
    incident.contractor,
  ]);

  /* ── Assessment notes: the report description + the field write-up ───── */
  const fieldAssessment = [
    `Field assessment for ${incident.id} (${incident.category}) at ${incident.location}.`,
    `Inspector ${incident.assignedInspector} recorded standing water across the affected stretch and classified the`,
    `incident as ${incident.priority.toLowerCase()} priority. ${incident.contractor} is the assigned contractor;`,
    incident.tankerAssigned
      ? `tanker ${incident.tankerAssigned} (${incident.tankerCount} unit${incident.tankerCount === 1 ? '' : 's'}) is committed to the extraction.`
      : 'no tanker has been committed yet — extraction capacity is still being sourced.',
    `Onwani ${incident.onwani}, ${incident.zone}, ${incident.municipality}. Reported via ${incident.source}.`,
  ].join(' ');

  return (
    <>
      <DetailSheet
        open={open}
        onOpenChange={onOpenChange}
        tabs={[
          {
            id: incident.id,
            category: 'REQUESTS & COMPLAINTS',
            label: incident.id,
            icon: MessageSquareWarning,
          },
        ]}
        activeId={incident.id}
        onCloseTab={() => onOpenChange(false)}
        onCloseAll={() => onOpenChange(false)}
        onMinimize={() => onOpenChange(false)}
      >
        <RecordWorkspace
          recordId={incident.id}
          moduleLabel={incident.type}
          moduleIcon={<Send size={12} className="text-muted-foreground" />}
          title={incident.title}
          statusSlot={
            <span
              className="inline-flex items-center px-2.5 py-1 text-[12px] font-semibold uppercase tracking-wide text-white"
              style={{ borderRadius: 'var(--ins-radius-full)', backgroundColor: statusMeta.color }}
            >
              {statusMeta.label}
            </span>
          }
          actions={
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={forward.length === 0}
                    className="flex h-8 items-center gap-1.5 border border-border bg-card px-2.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    style={{ borderRadius: 'var(--ins-radius-sm)' }}
                  >
                    Change Status
                    <ChevronDown size={14} className="text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Advance to</DropdownMenuLabel>
                  {forward.map((status) => (
                    <DropdownMenuItem key={status} onSelect={() => advanceStatus(incident.id, status)}>
                      {INCIDENT_STATUS_META[status].label}
                    </DropdownMenuItem>
                  ))}
                  {incident.status === 'closed' ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => advanceStatus(incident.id, 'reopened')}>
                        {INCIDENT_STATUS_META.reopened.label}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="More actions"
                    className="relative grid size-8 place-items-center border border-border bg-card text-muted-foreground transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:bg-muted hover:text-foreground"
                    style={{ borderRadius: 'var(--ins-radius-sm)' }}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setDispatchOpen(true)}>
                    <Truck size={14} />
                    Dispatch Tankers
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
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
              render: () => <RequestsRelatedTasksTab incident={incident} />,
            },
          ]}
        >
          <RecordSection title="Customer Info">
            <div className="flex w-full flex-wrap items-start gap-x-8 gap-y-5">
              <div className="flex min-w-[220px] flex-1 basis-[220px] flex-col gap-5">
                <div className="flex items-center gap-4">
                  <p className="w-[140px] shrink-0 text-[12px] font-semibold leading-[14px] text-muted-foreground">
                    Customer Name
                  </p>
                  <p className="truncate text-[14px] font-semibold leading-4 text-foreground">
                    {incident.custName || '—'}
                  </p>
                </div>
              </div>
              <div className="flex min-w-[220px] flex-1 basis-[220px] flex-col gap-5">
                <div className="flex items-center gap-4">
                  <p className="w-[140px] shrink-0 text-[12px] font-semibold leading-[14px] text-muted-foreground">
                    Customer Phone
                  </p>
                  <p className="truncate text-[14px] font-semibold leading-4 text-foreground">
                    {incident.custContact || '—'}
                  </p>
                </div>
              </div>
            </div>
          </RecordSection>

          <RecordSection title="Assessment Notes">
            <RecordNoteBlock label="Notes" text={`${incident.description}\n\n${fieldAssessment}`} />
          </RecordSection>
        </RecordWorkspace>
      </DetailSheet>

      <DispatchTankerSheet open={dispatchOpen} onOpenChange={setDispatchOpen} incident={incident} />
    </>
  );
}
