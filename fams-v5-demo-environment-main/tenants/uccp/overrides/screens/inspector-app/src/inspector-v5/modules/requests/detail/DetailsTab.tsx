import { Image as ImageIcon } from 'lucide-react';
import { SectionCard } from '../../../components/SectionCard';
import { FieldRow } from '../../../components/FieldRow';
import { Collapsible } from '../../../components/Collapsible';
import { StatusPill } from '../../../components/StatusPill';
import { PriorityChip } from '../../../components/PriorityChip';
import type { Incident } from '../../../data/types';

export interface RequestsDetailsTabProps {
  incident: Incident;
  /** 'default' (tablet, unchanged) renders always-open SectionCards.
   *  'mobile' renders key fields up top (status/priority) then the same
   *  sections wrapped in a Collapsible, first expanded. */
  variant?: 'default' | 'mobile';
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function EvidenceTile() {
  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: 'var(--ins-radius-md)',
        background: 'var(--muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <ImageIcon size={20} color="var(--muted-foreground)" />
    </div>
  );
}

const evidenceBody = (incident: Incident) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div>
      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 6 }}>Before Images</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {incident.beforeImages.length ? (
          incident.beforeImages.map((_, i) => <EvidenceTile key={i} />)
        ) : (
          <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>No images</span>
        )}
      </div>
    </div>
    <div>
      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 6 }}>Completion Proofs</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {incident.completionProofs.length ? (
          incident.completionProofs.map((_, i) => <EvidenceTile key={i} />)
        ) : (
          <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>No completion proofs yet</span>
        )}
      </div>
    </div>
  </div>
);

/** RequestsDetailsTab — pure content for the Requests "Details" tab (shared with mobile in Stage 4). */
export function RequestsDetailsTab({ incident, variant = 'default' }: RequestsDetailsTabProps) {
  const sections = [
    {
      title: 'Report',
      body: (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <FieldRow label="Type" value={incident.type} />
          <FieldRow label="Category" value={incident.category} />
          <FieldRow label="Source" value={incident.source} />
          <FieldRow label="Source Ref" value={incident.sourceRef} />
          <FieldRow label="Reported At" value={formatDateTime(incident.reportedAt)} />
          <FieldRow label="Reported By" value={incident.reportedBy} />
          <div className="col-span-2">
            <FieldRow label="Description" value={incident.description} />
          </div>
        </div>
      ),
    },
    {
      title: 'Location',
      body: (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <FieldRow label="Location" value={incident.location} />
          <FieldRow label="Onwani" value={incident.onwani} />
          <FieldRow label="Municipality" value={incident.municipality} />
          <FieldRow label="Zone" value={incident.zone} />
          <FieldRow label="Lat / Lng" value={`${incident.lat.toFixed(4)}, ${incident.lng.toFixed(4)}`} />
        </div>
      ),
    },
    {
      title: 'Customer',
      body: (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <FieldRow label="Name" value={incident.custName} />
          <FieldRow label="Contact" value={incident.custContact} />
        </div>
      ),
    },
    {
      title: 'Assignment',
      body: (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <FieldRow label="Assigned Inspector" value={incident.assignedInspector} />
          <FieldRow label="Contractor" value={incident.contractor} />
          <FieldRow label="Tanker Assigned" value={incident.tankerAssigned || '—'} />
          <FieldRow label="Tanker Count" value={incident.tankerCount} />
          <FieldRow label="Vehicle Driver" value={incident.vehDriver || '—'} />
        </div>
      ),
    },
    { title: 'Evidence', body: evidenceBody(incident) },
  ];

  if (variant === 'mobile') {
    return (
      <div>
        {/* Mobile header = one horizontal chip row (the old shell's card
            chip row), not stacked label-over-pill FieldRows. */}
        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <StatusPill status={incident.status} kind="incident" />
          <PriorityChip priority={incident.priority} />
          <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
            {incident.id} · {incident.zone}
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
