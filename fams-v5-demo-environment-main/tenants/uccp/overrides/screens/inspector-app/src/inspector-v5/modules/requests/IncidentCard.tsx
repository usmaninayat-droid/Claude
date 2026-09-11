import { Building2, Calendar, Eye, Flag, Hash, MapPin, Radio, X } from 'lucide-react';
import { cn } from '@ds/components/utils/cn';
import { RecordAvatar } from '../../components/RecordAvatar';
import { TruncatedText } from '../../components/TruncatedText';
import { INCIDENT_STATUS_META, PRIORITY_TONE } from '../../data/status';
import type { Incident } from '../../data/types';

export interface IncidentCardProps {
  incident: Incident;
  /** True while this incident is selected — either just highlighted (no
   *  linked plans) or actively watched on the map (linked plans). */
  selected?: boolean;
  /** True while this incident HAS linked plans AND its live scene (tanker
   *  badge(s) + capsules + discharge route + red zone) is being shown on the
   *  map — drives the "Watching" pill, mirroring PlanCard. */
  watching?: boolean;
  /** Card-body click. For an incident with `linkedDailyPlanIds`, toggles the
   *  map-watch scene and does NOT open the detail sheet (mirrors PlanCard /
   *  Plan Monitoring). For an incident with no linked plans, keeps the
   *  original behaviour: select + flyTo + open the detail sheet. */
  onClick?: () => void;
  /** Eye-button click — opens the full IncidentDetailSheet. Stops
   *  propagation so it never also toggles the map-watch selection. */
  onViewDetails?: () => void;
}

const TYPE_CHIP_CLASS: Record<Incident['type'], string> = {
  Request: 'bg-[color:var(--status-info)]/10 text-[color:var(--status-info)]',
  Complaint: 'bg-[color:var(--accent-family-plum,#7A5AF8)]/10 text-[color:var(--accent-family-plum,#7A5AF8)]',
};

const PRIORITY_CHIP_CLASS: Record<Incident['priority'], string> = {
  Critical: 'bg-[color:var(--status-error)]/10 text-[color:var(--status-error)]',
  High: 'bg-[#F79009]/10 text-[#F79009]',
  Medium: 'bg-[#EAAA08]/10 text-[#EAAA08]',
  Low: 'bg-[color:var(--status-success)]/10 text-[color:var(--status-success)]',
};

function formatCardDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${month}, ${year} ${hours}:${mins}`;
}

/**
 * IncidentCard — exact rebuild of the FAMS V5 web hybrid list panel's
 * record card (RecordMapCard / KanbanCardView, `displayMode="data"`),
 * matched to the user's reference screenshot: eye toggle + id chip + type
 * chip on row 1 (priority chip flush-right), solid status chip, bold
 * title, location + source meta rows, divider, avatar-stack + date + zone
 * chip footer.
 *
 * USER REQUIREMENT (parity with PlanCard/Plan Monitoring): for an incident
 * with `linkedDailyPlanIds`, card-body click toggles the "watch on map"
 * scene instead of opening the detail sheet — the eye button is the only
 * way to open `IncidentDetailSheet` for those. Incidents with no linked
 * plans are unaffected (body click still selects + opens the sheet, same as
 * before) — see `RequestsModule`/`MobileShell` for the split.
 */
export function IncidentCard({ incident, selected, watching, onClick, onViewDetails }: IncidentCardProps) {
  const statusMeta = INCIDENT_STATUS_META[incident.status];
  const priorityTone = PRIORITY_TONE[incident.priority];
  const hasPlans = incident.linkedDailyPlanIds.length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      data-incident-id={incident.id}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        'group relative w-full cursor-pointer rounded-[var(--ins-radius-md)] border bg-card p-4 text-left transition-shadow hover:shadow-sm',
        selected ? 'border-primary ring-1 ring-primary' : 'border-border',
      )}
    >
      {/* Row 1 — eye (opens details) + id + type chips, priority flush-right */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-label="View request details"
            title="View details"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails?.();
            }}
            className="relative grid size-6 shrink-0 place-items-center rounded-[var(--ins-radius-sm)] bg-primary/10 text-primary transition-colors before:absolute before:-inset-2.5 before:content-[''] hover:bg-primary/20"
          >
            <Eye size={13} />
          </button>
          <span className="inline-flex h-5 items-center gap-1 rounded-[var(--ins-radius-sm)] bg-muted px-1.5">
            <Hash size={10} className="text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase leading-none text-muted-foreground">{incident.id}</span>
          </span>
          <span
            className={cn(
              'inline-flex h-5 items-center rounded-[var(--ins-radius-sm)] px-1.5 text-[10px] font-semibold uppercase leading-none',
              TYPE_CHIP_CLASS[incident.type],
            )}
          >
            {incident.type}
          </span>
        </div>
        <span
          className={cn(
            'inline-flex h-5 shrink-0 items-center gap-1 rounded-[var(--ins-radius-sm)] px-1.5 text-[10px] font-semibold uppercase leading-none',
            PRIORITY_CHIP_CLASS[incident.priority],
          )}
          data-tone={priorityTone}
        >
          <Flag size={10} />
          {incident.priority}
        </span>
      </div>

      {/* Status chip — solid fill, plus a "Watching" pill when this incident's
          linked-plan scene is live on the map (mirrors PlanCard). */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {statusMeta ? (
          <span
            className="inline-flex h-5 items-center rounded-[var(--ins-radius-sm)] px-2 text-[10px] font-semibold uppercase leading-none text-white"
            style={{ backgroundColor: statusMeta.color }}
          >
            {statusMeta.label}
          </span>
        ) : null}
        {hasPlans && watching ? (
          <button
            type="button"
            aria-label="Stop watching on map"
            title="Stop watching on map"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="inline-flex h-5 shrink-0 items-center gap-1 rounded-[var(--ins-radius-sm)] bg-primary px-1.5 text-[10px] font-semibold uppercase leading-none text-white"
          >
            Watching <X size={10} />
          </button>
        ) : null}
      </div>

      {/* Title */}
      {incident.title ? (
        <p className="mt-2 text-body-sm font-bold leading-snug text-foreground [overflow-wrap:anywhere]">{incident.title}</p>
      ) : null}

      {/* Meta rows */}
      <div className="mt-1.5 flex flex-col gap-1">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
          <MapPin size={13} className="shrink-0" />
          <TruncatedText>{incident.location}</TruncatedText>
        </span>
        <span className="inline-flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
          <Radio size={13} className="shrink-0" />
          <TruncatedText>{incident.source}</TruncatedText>
        </span>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
        <div className="flex shrink-0 items-center">
          <RecordAvatar name={incident.assignedInspector || incident.reportedBy} className="ring-2 ring-card" />
          <RecordAvatar name={incident.reportedBy} className="-ml-2 ring-2 ring-card" />
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex min-w-0 items-center gap-1 text-caption text-muted-foreground">
            <Calendar size={13} className="shrink-0" />
            <TruncatedText>{formatCardDate(incident.reportedAt)}</TruncatedText>
          </span>
          <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-[var(--ins-radius-sm)] bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
            <Building2 size={10} />
            {incident.zone}
          </span>
        </div>
      </div>
    </div>
  );
}
