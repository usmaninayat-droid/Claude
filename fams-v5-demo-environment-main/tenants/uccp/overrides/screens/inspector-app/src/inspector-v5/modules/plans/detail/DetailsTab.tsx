import { SectionCard } from '../../../components/SectionCard';
import { FieldRow } from '../../../components/FieldRow';
import { Collapsible } from '../../../components/Collapsible';
import { StatusPill } from '../../../components/StatusPill';
import { ComplianceGauge } from '@ds/components/data-viz/compliance-gauge';
import { Progress } from '@ds/components/primitives/progress';
import type { DailyPlan } from '../../../data/types';

export interface PlansDetailsTabProps {
  plan: DailyPlan;
  /** 'default' (tablet, unchanged) renders always-open SectionCards.
   *  'mobile' renders key fields up top (status) then the same sections
   *  wrapped in a Collapsible, first expanded. */
  variant?: 'default' | 'mobile';
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * PlansDetailsTab — pure content component for a DailyPlan's Details tab body:
 * Execution + Progress sections. Shared between tablet (PlanDetailSheet) and,
 * later, mobile.
 */
export function PlansDetailsTab({ plan, variant = 'default' }: PlansDetailsTabProps) {
  const stopsPct = plan.stopsTotal > 0 ? Math.round((plan.stopsCompleted / plan.stopsTotal) * 100) : 0;

  const sections = [
    {
      title: 'Execution',
      body: (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <FieldRow label="Tanker" value={plan.tanker} />
          <FieldRow label="Driver" value={plan.driver} />
          <FieldRow label="Inspector" value={plan.inspector} />
          <FieldRow label="Shift" value={plan.shift} />
          <FieldRow label="Planned Start" value={formatDateTime(plan.plannedStart)} />
          <FieldRow label="Planned End" value={formatDateTime(plan.plannedEnd)} />
          <FieldRow label="Black Spot Zone" value={plan.blackSpotZone} />
          <FieldRow label="Zone" value={plan.zone} />
          <FieldRow label="Plan Date" value={plan.planDate} />
        </div>
      ),
    },
    {
      title: 'Progress',
      body: (
        <>
          <div className="flex flex-wrap items-center gap-6">
            <ComplianceGauge value={plan.compliancePct} size={110} label="Compliance" />
            <div className="min-w-[160px] flex-1">
              <div className="mb-1.5 flex justify-between text-caption">
                <span className="text-muted-foreground">Stops</span>
                <span className="font-semibold text-foreground">{plan.stopsCompleted}/{plan.stopsTotal}</span>
              </div>
              <Progress value={stopsPct} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <FieldRow label="Water Collected" value={`${plan.waterCollectedL.toLocaleString()} L`} />
          </div>
        </>
      ),
    },
  ];

  if (variant === 'mobile') {
    return (
      <div>
        {/* Mobile header = one horizontal chip row (the old shell's card
            chip row), not a stacked label-over-pill FieldRow. */}
        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <StatusPill status={plan.status} kind="plan" />
          <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
            {plan.id} · {plan.shift} · {plan.zone}
          </span>
        </div>
        {sections.map((section, i) => (
          <Collapsible key={section.title} title={section.title} defaultExpanded={i === 0}>
            {section.body}
          </Collapsible>
        ))}
      </div>
    );
  }

  return (
    <div>
      {sections.map((section) => (
        <SectionCard key={section.title} title={section.title}>
          {section.body}
        </SectionCard>
      ))}
    </div>
  );
}
