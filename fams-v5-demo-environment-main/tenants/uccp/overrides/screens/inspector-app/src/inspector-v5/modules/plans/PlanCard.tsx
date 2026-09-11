import { Building2, Calendar, Eye, Hash, MapPin, X } from 'lucide-react';
import { cn } from '@ds/components/utils/cn';
import { RecordAvatar } from '../../components/RecordAvatar';
import { TruncatedText } from '../../components/TruncatedText';
import { PLAN_STATUS_META } from '../../data/status';
import type { DailyPlan } from '../../data/types';

export interface PlanCardProps {
  plan: DailyPlan;
  /** True while this plan's live scene is being watched on the map. */
  selected?: boolean;
  /** Card-body click — toggles the "watch on map" scene (tanker/incident/
   *  discharge overlays). Does NOT open the detail sheet (USER REQUIREMENT:
   *  Plan Monitoring card selection watches the map, it never opens the
   *  sheet). */
  onClick?: () => void;
  /** Eye-button click — opens the full PlanDetailSheet. Stops propagation so
   *  it never also toggles the map-watch selection. */
  onViewDetails?: () => void;
}

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
 * PlanCard — same card grammar as IncidentCard (RecordMapCard parity),
 * adapted for a DailyPlan: eye toggle + id chip + shift chip, solid status
 * chip, bold title "Tanker · Driver", black-spot zone row, divider,
 * avatar-stack + planned-start date + zone chip footer, plus a compact
 * stops/compliance progress row folded into the meta section.
 */
export function PlanCard({ plan, selected, onClick, onViewDetails }: PlanCardProps) {
  const statusMeta = PLAN_STATUS_META[plan.status];
  const stopsPct = plan.stopsTotal > 0 ? Math.round((plan.stopsCompleted / plan.stopsTotal) * 100) : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      data-plan-id={plan.id}
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
      {/* Row 1 — eye (opens details) + id chip, shift chip flush-right */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-label="View plan details"
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
            <span className="text-[11px] font-semibold uppercase leading-none text-muted-foreground">{plan.id}</span>
          </span>
        </div>
        {selected ? (
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
        ) : (
          <span className="inline-flex h-5 shrink-0 items-center rounded-[var(--ins-radius-sm)] bg-muted px-1.5 text-[10px] font-semibold uppercase leading-none text-muted-foreground">
            {plan.shift}
          </span>
        )}
      </div>

      {/* Status chip — solid fill */}
      {statusMeta ? (
        <span
          className="mt-2 inline-flex h-5 items-center rounded-[var(--ins-radius-sm)] px-2 text-[10px] font-semibold uppercase leading-none text-white"
          style={{ backgroundColor: statusMeta.color }}
        >
          {statusMeta.label}
        </span>
      ) : null}

      {/* Title */}
      <p className="mt-2 text-body-sm font-bold leading-snug text-foreground [overflow-wrap:anywhere]">
        {plan.tanker} · {plan.driver}
      </p>

      {/* Meta rows */}
      <div className="mt-1.5 flex flex-col gap-1">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
          <MapPin size={13} className="shrink-0" />
          <TruncatedText>{plan.blackSpotZone}</TruncatedText>
        </span>
        <div className="mt-0.5 flex items-center justify-between text-caption text-muted-foreground">
          <span>Stops {plan.stopsCompleted}/{plan.stopsTotal}</span>
          <span className="font-semibold text-foreground">{plan.compliancePct}% compliance</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${stopsPct}%` }} />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
        <div className="flex shrink-0 items-center">
          <RecordAvatar name={plan.driver} className="ring-2 ring-card" />
          <RecordAvatar name={plan.inspector} className="-ml-2 ring-2 ring-card" />
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex min-w-0 items-center gap-1 text-caption text-muted-foreground">
            <Calendar size={13} className="shrink-0" />
            <TruncatedText>{formatCardDate(plan.plannedStart)}</TruncatedText>
          </span>
          <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-[var(--ins-radius-sm)] bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
            <Building2 size={10} />
            {plan.zone}
          </span>
        </div>
      </div>
    </div>
  );
}
