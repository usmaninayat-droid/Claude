import {
  Clock,
  Droplets,
  Gauge,
  MapPin,
  Navigation,
  OctagonAlert,
  Radio,
  Siren,
  Truck,
} from 'lucide-react';
import {
  MobileActionButton,
  MobileAssetCard,
  MobileChip,
  MobileListCard,
  MobileMetric,
  MobileOverviewLayout,
  MobileProgressBar,
  MobileSolidChip,
  MobileStatTile,
  type DragProps,
} from './MobileCards';
import { priorityToDotColor } from '../components/MapCanvas';
import { INCIDENT_STATUS_META, PLAN_STATUS_META } from '../data/status';
import { relativeTimeFromNow } from '../utils/relativeTime';
import type { DailyPlan, Incident } from '../data/types';

/**
 * MobileRecordViews — the V5 data (Incidents INC-####, DailyPlans FPL-####)
 * poured into the old flood-demo shell's mobile card recipes
 * (see mobile/MobileCards.tsx for the provenance of each primitive).
 *
 * Three surfaces per record type, exactly as the old shell had them:
 *   · LIST card    → the sheet #1 list at its HALF snap (old MobileQueueCard)
 *   · PEEK card    → the sheet #2 compact card (old SelectedAssetCard)
 *   · OVERVIEW     → the sheet #2 80% stage (old overview: chip+title, muted
 *                    sub-line, progress, 2-up stat grid, bottom action stack)
 */

function hhmm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function mapsHref(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

function openNavigation(lat: number, lng: number) {
  window.open(mapsHref(lat, lng), '_blank', 'noopener,noreferrer');
}

/* ── incidents ──────────────────────────────────────────────────────── */

function incidentTone(incident: Incident): string {
  return priorityToDotColor(incident.priority);
}

export function IncidentMobileListCard({
  incident,
  selected,
  onClick,
}: {
  incident: Incident;
  selected?: boolean;
  onClick?: () => void;
}) {
  const tone = incidentTone(incident);
  const statusMeta = INCIDENT_STATUS_META[incident.status];
  return (
    <MobileListCard
      icon={incident.source === 'NCC' ? Siren : OctagonAlert}
      tone={tone}
      title={incident.title}
      dimmed={incident.status === 'closed'}
      selected={selected}
      onClick={onClick}
      chips={
        <>
          <MobileSolidChip label={incident.priority} color={tone} />
          {statusMeta ? <MobileChip label={statusMeta.label} color={statusMeta.color} /> : null}
          {incident.reopened ? <MobileChip label="Reopened" color="var(--destructive, #d92d20)" /> : null}
          {incident.tankerCount > 0 ? (
            <MobileMetric icon={Truck}>{incident.tankerCount}</MobileMetric>
          ) : null}
          <MobileMetric icon={Clock}>{relativeTimeFromNow(incident.reportedAt)}</MobileMetric>
        </>
      }
      meta={[incident.id, incident.source, incident.location, incident.zone].filter(Boolean).join(' · ')}
    />
  );
}

export function IncidentMobilePeekCard({
  incident,
  onExpand,
  onClose,
  dragProps,
}: {
  incident: Incident;
  onExpand: () => void;
  onClose: () => void;
  dragProps?: DragProps;
}) {
  const statusMeta = INCIDENT_STATUS_META[incident.status];
  return (
    <MobileAssetCard
      icon={incident.source === 'NCC' ? Siren : OctagonAlert}
      tone={incidentTone(incident)}
      meta={[
        { icon: MapPin, text: incident.location },
        { icon: Radio, text: incident.source },
      ]}
      title={incident.id}
      statusColor={statusMeta?.color ?? 'var(--muted-foreground)'}
      statusLabel={statusMeta?.label ?? incident.status}
      secondary={`${incident.priority} · ${relativeTimeFromNow(incident.reportedAt)}`}
      onTap={onExpand}
      onClose={onClose}
      dragProps={dragProps}
    />
  );
}

export function IncidentMobileOverview({
  incident,
  onViewFull,
}: {
  incident: Incident;
  onViewFull: () => void;
}) {
  const statusMeta = INCIDENT_STATUS_META[incident.status];
  return (
    <MobileOverviewLayout
      chipLabel={incident.priority}
      chipColor={incidentTone(incident)}
      title={incident.title}
      subline={
        <>
          {incident.id} · {incident.source} · {relativeTimeFromNow(incident.reportedAt)}
        </>
      }
      actions={
        <>
          <MobileActionButton variant="primary" onClick={onViewFull}>
            View full details
          </MobileActionButton>
          <MobileActionButton
            variant="outline"
            icon={Navigation}
            onClick={() => openNavigation(incident.lat, incident.lng)}
          >
            Navigate
          </MobileActionButton>
        </>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted-foreground)' }}>
        <span
          style={{
            width: 6,
            height: 6,
            flexShrink: 0,
            borderRadius: '50%',
            background: statusMeta?.color ?? 'var(--muted-foreground)',
          }}
        />
        {statusMeta?.label ?? incident.status}
        {incident.reopened ? ' · Reopened' : ''}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        <MobileStatTile label="Onwani" value={incident.onwani || '—'} />
        <MobileStatTile label="Zone" value={incident.zone} />
        <MobileStatTile label="Category" value={incident.category} />
        <MobileStatTile
          label="Tankers"
          value={incident.tankerAssigned ?? (incident.tankerCount > 0 ? `${incident.tankerCount}` : 'None assigned')}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--muted-foreground)' }}>
          Location
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--foreground)' }}>
          <MapPin size={14} style={{ flexShrink: 0, color: 'var(--muted-foreground)' }} />
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {incident.location} · {incident.municipality}
          </span>
        </div>
      </div>
    </MobileOverviewLayout>
  );
}

/* ── daily plans ────────────────────────────────────────────────────── */

function planTone(plan: DailyPlan): string {
  return PLAN_STATUS_META[plan.status]?.color ?? 'var(--muted-foreground)';
}

export function PlanMobileListCard({
  plan,
  selected,
  onClick,
}: {
  plan: DailyPlan;
  selected?: boolean;
  onClick?: () => void;
}) {
  const tone = planTone(plan);
  const stopsPct = plan.stopsTotal > 0 ? Math.round((plan.stopsCompleted / plan.stopsTotal) * 100) : 0;
  return (
    <MobileListCard
      icon={Truck}
      tone={tone}
      title={plan.title}
      dimmed={plan.status === 'Completed'}
      selected={selected}
      onClick={onClick}
      chips={
        <>
          <MobileSolidChip label={plan.status} color={tone} />
          <MobileChip label={plan.shift} />
          <MobileMetric icon={MapPin}>
            {plan.stopsCompleted}/{plan.stopsTotal}
          </MobileMetric>
          <MobileMetric icon={Gauge}>{plan.compliancePct}%</MobileMetric>
        </>
      }
      meta={[plan.id, plan.tanker, plan.driver, `${hhmm(plan.plannedStart)}–${hhmm(plan.plannedEnd)}`]
        .filter(Boolean)
        .join(' · ')}
      footer={
        <MobileProgressBar
          value={stopsPct}
          label="Stops"
          sublabel={`${plan.stopsCompleted} / ${plan.stopsTotal}`}
        />
      }
    />
  );
}

export function PlanMobilePeekCard({
  plan,
  onExpand,
  onClose,
  dragProps,
}: {
  plan: DailyPlan;
  onExpand: () => void;
  onClose: () => void;
  dragProps?: DragProps;
}) {
  return (
    <MobileAssetCard
      icon={Truck}
      tone={planTone(plan)}
      meta={[
        { icon: MapPin, text: plan.blackSpotZone },
        { icon: Truck, text: plan.tanker },
      ]}
      title={plan.id}
      statusColor={planTone(plan)}
      statusLabel={plan.status}
      secondary={`Compliance ${plan.compliancePct}%`}
      onTap={onExpand}
      onClose={onClose}
      dragProps={dragProps}
    />
  );
}

export function PlanMobileOverview({ plan, onViewFull }: { plan: DailyPlan; onViewFull: () => void }) {
  const stopsPct = plan.stopsTotal > 0 ? Math.round((plan.stopsCompleted / plan.stopsTotal) * 100) : 0;
  const terminal = plan.status === 'Completed';
  return (
    <MobileOverviewLayout
      chipLabel={plan.status}
      chipColor={planTone(plan)}
      title={`${plan.id} · ${plan.zone}`}
      subline={
        <>
          {plan.shift} shift · {hhmm(plan.plannedStart)}–{hhmm(plan.plannedEnd)} · {plan.blackSpotZone}
        </>
      }
      actions={
        <>
          <MobileActionButton variant="primary" onClick={onViewFull}>
            View full details
          </MobileActionButton>
          <MobileActionButton
            variant="outline"
            icon={Navigation}
            onClick={() => openNavigation(plan.lat, plan.lng)}
          >
            Navigate
          </MobileActionButton>
        </>
      }
    >
      {!terminal ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MobileProgressBar
            value={stopsPct}
            label="Stops"
            sublabel={`${plan.stopsCompleted} / ${plan.stopsTotal}`}
          />
          <MobileProgressBar
            value={plan.compliancePct}
            color={PLAN_STATUS_META.Completed.color}
            label="Compliance"
            sublabel={`${plan.compliancePct}%`}
          />
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        <MobileStatTile label="Tanker" value={plan.tanker} />
        <MobileStatTile label="Driver" value={plan.driver} />
        <MobileStatTile label="Water collected" value={`${(plan.waterCollectedL / 1000).toFixed(1)}k L`} />
        <MobileStatTile label="Inspector" value={plan.inspector} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--muted-foreground)' }}>
          Black spot
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--foreground)' }}>
          <Droplets size={14} style={{ flexShrink: 0, color: 'var(--muted-foreground)' }} />
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {plan.blackSpotZone}
          </span>
        </div>
      </div>
    </MobileOverviewLayout>
  );
}
