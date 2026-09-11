/**
 * IncidentDetail — rebuilt to pixel-match docs/lifecycle-specs/01-detail-layout.md.
 *
 * LEFT column (scrollable): identity header (id/title + 2-col field grid with a
 * StatusTransitionDropdown), Incident Location mini-map, KPI / Incident Report /
 * ESP Rectification / Re-Rectification accordions (empty→filled states, role×status
 * gated CTAs opening RectificationSubmitSheet / VerificationSheet).
 * RIGHT panel (fixed, own scroll): Penalties / Timeline / Related Incidents tabs.
 *
 * Role × status gates the ESP submit / Inspector verify / PO decision affordances
 * per docs/lifecycle-specs/02-lifecycle-flows-and-contract.md. Brand law: every
 * green in the source frames (active tab underline, CTAs, @mention chips, send
 * button) is FAMS primary blue — only genuine status semantics keep real colour.
 */
import * as React from 'react';
import { createPortal } from 'react-dom';
import * as Icons from '@ds/icons';
import {
  Button, Badge, Input, toast,
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
  Textarea,
} from '@ds/components/primitives';
import { Timeline, StatusTransitionDropdown } from '@ds/components/data-display';
import type { TransitionStage } from '@ds/components/data-display';
import { useIims, PROJECT_OFFICER } from '@/store/store';
import { useNav } from '@/app/nav';
import {
  SeverityPill, EvidenceTile, AvatarChip, formatAed, formatDateTime, formatDate,
  IncidentStatusPill, slaLabel,
} from '@/lib/ui';
import { IncidentMap } from '@/lib/IncidentMap';
import { INCIDENT_STATUS, SEVERITY } from '@/data/status';
import { RectificationSubmitSheet } from '@/flows/RectificationSubmitSheet';
import { VerificationSheet } from '@/flows/VerificationSheet';
import { IssuePenaltySheet, PenaltiesTabEmpty, PenaltyDetail, PenaltySummaryCard } from '@/flows/IssuePenaltyFlow';
import type { EvidencePhoto, Incident, IncidentStatus } from '@/data/types';

type Role = 'inspector' | 'esp' | 'po';

/* ─────────────────────────── Image Preview Sheet ─────────────────────────── */

function ImagePreview({ photo, onClose }: { photo: EvidencePhoto; onClose: () => void }) {
  // Portaled to <body> so it overlays the (embedded) detail sheet instead of
  // being trapped inside its stacking context.
  return createPortal((
    <div className="fixed inset-0 z-[860] flex justify-end" role="dialog" aria-label="Image Preview">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="relative z-[1] flex h-full w-[520px] flex-col border-l border-border bg-card shadow-[var(--elevation-md)]">
        <div className="flex shrink-0 items-start justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-h5 font-semibold text-foreground">Image Preview</p>
            <p className="mt-0.5 text-body-xs text-muted-foreground">
              This image was uploaded on {formatDateTime(photo.timestamp)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-secondary"
            aria-label="Close preview"
          >
            <Icons.XClose size={16} />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-hidden bg-black/90 p-4">
          <EvidenceTile photo={photo} className="w-full" showMeta={false} />
        </div>
        <div className="shrink-0 border-t border-border px-5 py-3">
          <div className="flex items-center gap-2 text-body-xs text-muted-foreground">
            <Icons.MarkerPin01 size={13} />
            <span>{photo.gps.lat.toFixed(5)}, {photo.gps.lng.toFixed(5)}</span>
          </div>
          <p className="mt-1 text-body-xs capitalize text-muted-foreground">
            Kind: <span className="font-medium text-foreground">{photo.kind}</span>
          </p>
        </div>
      </div>
    </div>
  ), document.body);
}

/* ─────────────────────── Mark Invalid Dialog ─────────────────────────────── */

function MarkInvalidDialog({ onConfirm, onClose }: { onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = React.useState('');
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" width="min(460px, 92vw)" className="p-0">
        <SheetHeader>
          <SheetTitle>Mark as Invalid</SheetTitle>
          <SheetDescription>
            Provide a reason for marking this incident as invalid. This action cannot be undone.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-auto p-6">
          <Textarea placeholder="Enter reason..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </div>
        <SheetFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>
            Mark Invalid
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ─────────────────────────── PO decision sheets ───────────────────────────── */

function CloseIncidentDialog({ onConfirm, onClose }: { onConfirm: (amountAed: number, reason: string) => void; onClose: () => void }) {
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');
  const canSubmit = reason.trim().length > 0;
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" width="min(460px, 92vw)" className="p-0">
        <SheetHeader>
          <SheetTitle>Close Incident</SheetTitle>
          <SheetDescription>Issue a final penalty (if any) and close this incident.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-body-sm font-medium text-foreground">Penalty amount (AED)</label>
            <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-body-sm font-medium text-foreground">
              Reason <span className="text-[var(--status-error)]">*</span>
            </label>
            <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain the decision…" />
          </div>
        </div>
        <SheetFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!canSubmit} onClick={() => onConfirm(Number(amount) || 0, reason.trim())}>
            Close Incident
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ReRectificationDialog({ onConfirm, onClose }: { onConfirm: (note: string) => void; onClose: () => void }) {
  const [note, setNote] = React.useState('');
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" width="min(460px, 92vw)" className="p-0">
        <SheetHeader>
          <SheetTitle>Send for Re-Rectification</SheetTitle>
          <SheetDescription>Give the ESP another chance to rectify this incident.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-auto p-6">
          <Textarea placeholder="Note for the ESP…" value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
        </div>
        <SheetFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!note.trim()} onClick={() => onConfirm(note.trim())}>
            Send for Re-Rectification
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ────────────────────────── Field grid (label/value) ─────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-body-sm font-medium text-foreground">{children}</span>
    </div>
  );
}

/* ───────────────────── Notes with "Show more" clamp ───────────────────────── */

function ClampedNotes({ text }: { text: string }) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div className="rounded-[6px] border border-border bg-secondary/30 p-3">
      <div className="relative">
        <p className={`whitespace-pre-wrap text-body-sm text-foreground ${expanded ? '' : 'line-clamp-5'}`}>
          {text}
        </p>
        {!expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-secondary/30 to-transparent" />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mx-auto mt-1 flex items-center gap-1 text-body-xs font-medium text-primary hover:underline"
      >
        {expanded ? 'Show less' : 'Show more'}
        <Icons.ChevronDown size={12} className={expanded ? 'rotate-180' : ''} />
      </button>
    </div>
  );
}

/* ───────────────────── ESP Rectification block (filled state) ─────────────── */

function RectificationFilled({
  rect, onPhotoClick,
}: { rect: NonNullable<Incident['rectification']>; onPhotoClick: (p: EvidencePhoto) => void }) {
  const allPhotos = [...rect.beforePhotos, ...rect.afterPhotos];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Field label="Rectified On">{formatDateTime(rect.submittedAt)}</Field>
        <div className="flex items-center gap-2">
          <AvatarChip name={rect.espUser} color="#7F56D9" size={22} />
          <span className="text-body-sm font-medium text-foreground">{rect.espUser}</span>
        </div>
      </div>
      <div>
        <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
          Rectification Submitted for Non-Compliance
        </p>
        <p className="text-body-sm text-foreground">{rect.description}</p>
      </div>
      {allPhotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {allPhotos.map((ph) => (
            <EvidenceTile key={ph.id} photo={ph} onClick={() => onPhotoClick(ph)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────── Verification result (read-only) ────────────────────── */

function VerificationResult({ v, inspectorName }: { v: NonNullable<Incident['verification']>; inspectorName: string }) {
  const isOk = v.decision === 'satisfactory';
  return (
    <div className="rounded-[6px] border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Verification Result</p>
        <Badge variant={isOk ? 'success' : 'destructive'} size="sm">{isOk ? 'Satisfactory' : 'Rejected'}</Badge>
      </div>
      <div className="mb-1 flex items-center gap-2 text-body-xs text-muted-foreground">
        <Icons.User01 size={13} />
        <span>{inspectorName} · {formatDateTime(v.at)}</span>
      </div>
      {v.comment && <p className="mb-2 text-body-sm text-foreground">{v.comment}</p>}
      {v.photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {v.photos.map((ph) => <EvidenceTile key={ph.id} photo={ph} showMeta={false} />)}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Empty-state dropzone card ──────────────────────── */

function RectificationEmptyState({
  illustration, title, subtitle, ctaLabel, onCta,
}: { illustration: string; title: string; subtitle: string; ctaLabel?: string; onCta?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-border bg-secondary/20 px-6 py-8 text-center">
      <img src={illustration} alt="" className="h-24 w-24 object-contain" />
      <div>
        <p className="text-body-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-body-xs text-muted-foreground">{subtitle}</p>
      </div>
      {ctaLabel && onCta && (
        <Button variant="primary" size="md" onClick={onCta}>{ctaLabel}</Button>
      )}
    </div>
  );
}

/* ─────────────────────────── Comment thread + composer ─────────────────────── */

function renderCommentBody(text: string) {
  // Render @Mentions inline in FAMS primary blue (brand law — the frame's mention
  // chips are TADWEER green, recoloured here).
  const parts = text.split(/(@[A-Za-z][A-Za-z0-9_-]*)/g);
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="font-semibold text-primary">{part}</span>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );
}

/** Composer only — comments drop into the unified activity stream above. */
function CommentComposer({ onSend }: { onSend: (text: string) => void }) {
  const [draft, setDraft] = React.useState('');
  function submit() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  }
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary"
        aria-label="Attach file"
      >
        <Icons.Paperclip size={16} />
      </button>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        placeholder="Write a comment here …"
        className="flex-1"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!draft.trim()}
        aria-label="Send comment"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
      >
        <Icons.Send01 size={15} />
      </button>
    </div>
  );
}

/* ════════════════════════ IncidentDetailFlow ════════════════════════════════ */

export function IncidentDetailFlow({
  incidentId, onClose, embedded, showPenalties = false, incidentOverride, role = 'inspector',
}: {
  incidentId: string;
  onClose: () => void;
  embedded?: boolean;
  showPenalties?: boolean;
  incidentOverride?: Incident;
  role?: Role;
}) {
  const s = useIims();
  const nav = useNav();

  // Prefer an explicitly-passed incident (e.g. a synthetic "nearby" incident not
  // in the store); otherwise resolve it by id from the store. Read-only whenever
  // an override is supplied (no action CTAs on synthetic records).
  const incident = incidentOverride ?? s.incident(incidentId);
  const readOnly = !!incidentOverride;

  const [showRectSheet, setShowRectSheet] = React.useState<'rectification' | 're_rectification' | null>(null);
  const [showVerifySheet, setShowVerifySheet] = React.useState<'verify' | 're_verify' | null>(null);
  const [showInvalidDialog, setShowInvalidDialog] = React.useState(false);
  const [showCloseDialog, setShowCloseDialog] = React.useState(false);
  const [showReRectDialog, setShowReRectDialog] = React.useState(false);
  const [showPenaltySheet, setShowPenaltySheet] = React.useState(false);
  const [viewingPenalty, setViewingPenalty] = React.useState(false);
  const [previewPhoto, setPreviewPhoto] = React.useState<EvidencePhoto | null>(null);
  const [activeTab, setActiveTab] = React.useState<'penalties' | 'timeline' | 'related'>(showPenalties ? 'penalties' : 'timeline');
  const [penaltySearch, setPenaltySearch] = React.useState('');

  if (!incident) {
    return (
      <div className="fixed inset-0 z-[680] flex justify-end bg-black/40" role="dialog">
        <div className="h-full w-full max-w-[680px] border-l border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-body-md text-muted-foreground">Incident not found: {incidentId}</p>
            <Button variant="ghost" size="icon" onClick={onClose}><Icons.XClose size={18} /></Button>
          </div>
        </div>
      </div>
    );
  }

  const zone = s.zone(incident.zoneId);
  const esp = s.esp(incident.espId);
  const reporter = s.inspector(incident.reportedByInspectorId);
  const inspector = s.inspector(incident.reportedByInspectorId);
  const violation = s.violation(incident.violationTypeId);
  const sourceInspection = incident.sourceInspectionId ? s.inspectionById(incident.sourceInspectionId) : undefined;
  const me = s.currentInspector();

  const related = s.data.incidents
    .filter((i) => i.id !== incident.id && (i.espId === incident.espId || i.zoneId === incident.zoneId))
    .slice(0, 8);

  const verifyInspectorName = incident.verification
    ? (s.inspector(incident.verification.byInspectorId)?.name ?? incident.verification.byInspectorId) : '';
  const reVerifyInspectorName = incident.reVerification
    ? (s.inspector(incident.reVerification.byInspectorId)?.name ?? incident.reVerification.byInspectorId) : '';

  /* ─── status control: filter INCIDENT_STATUS_ORDER to the legal next stages ─── */
  const legalNextStatuses = (from: IncidentStatus): IncidentStatus[] => {
    switch (from) {
      case 'awaiting_rectification': return [];
      case 'rectification_submitted': return [];
      case 're_rectification_submitted': return [];
      case 'awaiting_esp_re_rectification': return [];
      case 'escalated':
        return role === 'po' ? ['closed', 'awaiting_esp_re_rectification'] : [];
      case 'closed':
      case 'invalid':
      default:
        return [];
    }
  };
  const nextStatuses = readOnly ? [] : legalNextStatuses(incident.status);
  const stages: TransitionStage[] = [incident.status, ...nextStatuses].map((st) => ({
    id: st, label: INCIDENT_STATUS[st].label, color: INCIDENT_STATUS[st].color,
  }));
  const handleStatusTransition = (toId: string) => {
    const to = toId as IncidentStatus;
    if (to === 'closed') s.applyPenalty(incidentId, 0, 'Closed by Project Officer');
    else if (to === 'awaiting_esp_re_rectification') s.allowReRectification(incidentId, 'Sent for re-rectification');
  };

  /* ─── role × status gates ─── */
  const canSubmitRect = !readOnly && role === 'esp' && incident.status === 'awaiting_rectification';
  const canSubmitReRect = !readOnly && role === 'esp' && incident.status === 'awaiting_esp_re_rectification';
  const canVerify = !readOnly && role === 'inspector' && incident.status === 'rectification_submitted';
  const canReVerify = !readOnly && role === 'inspector' && incident.status === 're_rectification_submitted';
  const canMarkInvalid = !readOnly && role === 'inspector' && incident.status !== 'closed' && incident.status !== 'invalid';
  const canPoDecide = !readOnly && role === 'po' && incident.status === 'escalated';
  const canIssuePenalty = !readOnly && role === 'po';

  /* ─── unified activity stream — system changes + comments interleaved by
     time (DS / ClickUp activity style; no separate comments section). ─── */
  const hhmm = (at: string) => new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const timelineItems = [
    ...incident.timeline.map((ev) => ({
      at: ev.at,
      item: {
        id: ev.id,
        title: <span><span className="font-semibold text-foreground">{ev.actorName}</span> <span className="text-muted-foreground">{ev.action}</span></span>,
        subtitle: ev.note,
        timestamp: hhmm(ev.at),
        icon: ev.actorRole === 'System'
          ? <Icons.Bell01 size={12} />
          : ev.action.toLowerCase().includes('report')
            ? <Icons.Plus size={12} />
            : <Icons.Edit01 size={12} />,
        // FAMS-blue branding for activity nodes; system events stay neutral grey.
        color: ev.actorRole === 'System' ? 'var(--muted-foreground)' : 'var(--primary)',
      },
    })),
    ...(incident.comments ?? []).map((c) => {
      // Resolve the display name by ROLE, not by assuming every author is an
      // inspector (a PO/ESP comment must show the PO/ESP name).
      const name = c.authorRole === 'po'
        ? PROJECT_OFFICER.name
        : c.authorRole === 'esp'
          ? (s.esp(incident.espId)?.contactPerson ?? s.esp(incident.espId)?.name ?? 'ESP')
          : (s.inspector(c.authorId)?.name ?? c.authorId);
      return {
        at: c.at,
        item: {
          id: c.id,
          title: <span><span className="font-semibold text-foreground">{name}</span> <span className="text-muted-foreground">commented</span></span>,
          subtitle: <span className="whitespace-pre-wrap">{renderCommentBody(c.text)}</span>,
          timestamp: hhmm(c.at),
          icon: <Icons.MessageTextSquare01 size={12} />,
          color: 'var(--primary)',
        },
      };
    }),
  ]
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .map((x) => x.item);

  /* ─── handlers ─── */
  const handleMarkInvalid = (reason: string) => {
    s.markInvalid(incidentId, reason);
    setShowInvalidDialog(false);
    toast.success('Incident marked as invalid.');
    onClose();
  };
  const handleClose = (amountAed: number, reason: string) => {
    s.applyPenalty(incidentId, amountAed, reason);
    setShowCloseDialog(false);
    toast.success('Incident closed.');
  };
  const handleReRect = (note: string) => {
    s.allowReRectification(incidentId, note);
    setShowReRectDialog(false);
    toast.success('Sent for re-rectification.');
  };
  const handleSendComment = (text: string) => {
    const authorId = role === 'po' ? PROJECT_OFFICER.id : role === 'esp' ? incident.espId : me.id;
    s.addComment(incidentId, { authorId, authorRole: role, text });
  };

  // The structured penalty issued against this incident (if any).
  const penalty = s.penaltyForIncident(incidentId);

  /* ─── right-panel tabs content (shared between embedded + standalone) ─── */
  const rightPanel = (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex h-full flex-col">
      <TabsList className="shrink-0 px-1">
        <TabsTrigger value="penalties">Penalties</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="related">Related Incidents</TabsTrigger>
      </TabsList>

      <TabsContent value="penalties" className="flex flex-1 flex-col gap-3 overflow-hidden p-1 pt-4">
        {viewingPenalty && penalty ? (
          <PenaltyDetail penaltyId={penalty.id} role={role} onBack={() => setViewingPenalty(false)} />
        ) : penalty ? (
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
            <div className="flex items-center gap-2">
              <Input
                value={penaltySearch}
                onChange={(e) => setPenaltySearch(e.target.value)}
                placeholder="Search anything here"
                className="flex-1"
              />
              {canIssuePenalty && (
                <Button variant="primary" size="md" className="shrink-0 gap-1" onClick={() => setShowPenaltySheet(true)}>
                  <Icons.Plus size={14} /> Issue Penalty
                </Button>
              )}
            </div>
            <PenaltySummaryCard penalty={penalty} onOpen={() => setViewingPenalty(true)} />
          </div>
        ) : canIssuePenalty ? (
          <PenaltiesTabEmpty search={penaltySearch} onSearch={setPenaltySearch} onIssue={() => setShowPenaltySheet(true)} />
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Icons.AlertTriangle size={28} className="opacity-40" />
            <p className="text-body-sm">No penalties issued yet.</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="timeline" className="flex flex-1 flex-col overflow-hidden p-1 pt-4">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="mb-3 flex items-center justify-center">
            <span className="rounded-full bg-secondary px-3 py-1 text-body-xs font-semibold text-muted-foreground">
              {formatDate(incident.reportedAt)}
            </span>
          </div>
          <Timeline items={timelineItems} />
        </div>
        <div className="shrink-0 border-t border-border pt-3">
          <CommentComposer onSend={handleSendComment} />
        </div>
      </TabsContent>

      <TabsContent value="related" className="flex flex-1 flex-col gap-2 overflow-y-auto p-1 pt-4">
        {related.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Icons.SearchMd size={28} className="opacity-40" />
            <p className="text-body-sm">No related incidents found.</p>
          </div>
        ) : (
          related.map((rel) => {
            const relZone = s.zone(rel.zoneId);
            const relEsp = s.esp(rel.espId);
            const relSla = slaLabel(rel.slaDueAt, s.now);
            return (
              <button
                key={rel.id}
                type="button"
                className="flex flex-col gap-1 rounded-[6px] border border-border bg-card p-3 text-left transition hover:bg-secondary/50"
                onClick={() => nav.openIncident(rel.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="outline" size="sm" className="font-mono">{rel.id}</Badge>
                    <SeverityPill severity={rel.severity} size="sm" />
                  </div>
                  <IncidentStatusPill status={rel.status} size="sm" />
                </div>
                <p className="line-clamp-1 text-body-sm font-medium text-foreground">{rel.title}</p>
                <div className="flex items-center gap-3 text-body-xs text-muted-foreground">
                  {relZone && <span className="flex items-center gap-1"><Icons.MarkerPin01 size={11} />{relZone.name}</span>}
                  {relEsp && <span>{relEsp.name}</span>}
                  <span className={relSla.overdue ? 'text-[var(--status-error)]' : ''}>{relSla.text}</span>
                </div>
              </button>
            );
          })
        )}
      </TabsContent>
    </Tabs>
  );

  return (
    <>
      {!embedded && <div className="fixed inset-0 z-[678] bg-black/40" onClick={onClose} aria-hidden="true" />}

      <div
        className={embedded
          ? 'flex h-full w-full'
          : 'fixed right-0 top-0 z-[680] flex h-full w-full max-w-[1100px] border-l border-border bg-card shadow-[var(--elevation-md)]'}
        role="dialog"
        aria-label={`Incident ${incident.id}`}
      >
        {!embedded && (
          <div className="absolute right-3 top-3 z-[1]">
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><Icons.XClose size={18} /></Button>
          </div>
        )}

        {/* ═══ LEFT column — scrollable ═══ */}
        <div className="min-w-0 flex-1 basis-[65%] overflow-y-auto border-r border-border bg-card">
          <div className="flex w-full flex-col gap-6 p-6">

            {/* ── Identity header ── */}
            <div className="flex flex-col gap-3">
              <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{incident.id}</p>
              <h2 className="text-h5 font-semibold leading-snug text-foreground">{incident.title}</h2>

              <div className="grid grid-cols-2 gap-x-8 gap-y-5 pt-2">
                {/* left col */}
                <div className="flex flex-col gap-5">
                  <Field label="Status">
                    <StatusTransitionDropdown
                      stages={stages}
                      currentId={incident.status}
                      onTransition={handleStatusTransition}
                      forwardOnly={false}
                      disabled={readOnly || nextStatuses.length === 0}
                      size="sm"
                    />
                  </Field>
                  <Field label="Reported On">{formatDateTime(incident.reportedAt)}</Field>
                  <Field label="Reported By">
                    <span className="flex items-center gap-1.5">
                      {reporter && <AvatarChip name={reporter.name} color={reporter.avatarColor} size={20} />}
                      {reporter?.name ?? '—'}
                    </span>
                  </Field>
                  {sourceInspection && (
                    <Field label="Linked Inspection">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-body-sm font-medium text-primary hover:underline"
                        onClick={() => nav.openInspection(sourceInspection.id)}
                      >
                        <Icons.ClipboardCheck size={14} />
                        {sourceInspection.title || sourceInspection.id}
                      </button>
                    </Field>
                  )}
                </div>
                {/* right col */}
                <div className="flex flex-col gap-5">
                  <Field label="Severity">
                    <span className="flex items-center gap-1.5">
                      <Icons.Flag06 size={14} style={{ color: SEVERITY[incident.severity].color }} />
                      <span className="text-body-sm font-medium text-foreground">{SEVERITY[incident.severity].label}</span>
                    </span>
                  </Field>
                  <Field label="Due Date">
                    {formatDateTime(incident.slaDueAt)}
                  </Field>
                  <Field label="Assigned Inspector">
                    <span className="flex items-center gap-1.5">
                      {inspector && <AvatarChip name={inspector.name} color={inspector.avatarColor} size={20} />}
                      {inspector?.name ?? '—'}
                    </span>
                  </Field>
                  <Field label="Contractor">
                    <span className="flex items-center gap-1.5">
                      {esp && <AvatarChip name="EP" color="#101828" size={20} />}
                      {esp?.name ?? '—'}
                    </span>
                  </Field>
                </div>
              </div>
            </div>

            {/* ── Incident Location mini-map ── */}
            <div className="relative overflow-hidden rounded-[8px] border border-border" style={{ height: 260 }}>
              <IncidentMap incidents={[]} single={incident.location} className="h-full w-full" />
              <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-[8px] bg-card px-3 py-2 shadow-[var(--elevation-sm)]">
                <div className="flex flex-col leading-tight">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Incident Location</span>
                  <span className="text-body-sm font-semibold text-foreground">{zone?.name ?? '—'}</span>
                </div>
                <Icons.ChevronRight size={14} className="text-muted-foreground" />
              </div>
            </div>

            {/* ── Accordions ── */}
            <Accordion type="multiple" defaultValue={['kpi', 'report', 'rect', 'rerect']} className="flex flex-col">
              {/* KPI */}
              <AccordionItem value="kpi">
                <AccordionTrigger>KPI</AccordionTrigger>
                <AccordionContent>
                  {violation ? (
                    <div className="flex flex-col gap-3 rounded-[8px] border border-border bg-card p-4">
                      <div className="flex items-start gap-2">
                        <Icons.ClipboardCheck size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Incident KPI</p>
                          <p className="text-body-sm font-medium text-foreground">{violation.pmCode} · {violation.name}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">KPI Category</p>
                        <p className="text-body-sm font-medium text-foreground">{violation.category}</p>
                      </div>
                      <div>
                        <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Non Compliance</p>
                        <p className="text-body-sm font-medium text-foreground">{violation.name}</p>
                      </div>
                      <div>
                        <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Compliance Time</p>
                        <p className="text-body-sm font-medium text-foreground">{violation.rectifyWithinHrs}h</p>
                      </div>
                      <div>
                        <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Penalty</p>
                        <p className="text-body-sm font-medium text-foreground">{formatAed(violation.penaltyAed)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-body-sm text-muted-foreground">No KPI data available.</p>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Incident Report */}
              <AccordionItem value="report">
                <AccordionTrigger>Incident Report</AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                      <ClampedNotes text={incident.notes || incident.description || 'No notes provided.'} />
                    </div>
                    <div>
                      <p className="mb-1.5 text-caption font-semibold uppercase tracking-wide text-muted-foreground">Proofs</p>
                      {incident.evidence.length === 0 ? (
                        <p className="text-body-sm text-muted-foreground">No proofs attached.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {incident.evidence.map((ph) => (
                            <EvidenceTile key={ph.id} photo={ph} onClick={() => setPreviewPhoto(ph)} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ESP Rectification */}
              <AccordionItem value="rect">
                <AccordionTrigger>ESP Rectification</AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-3">
                    {incident.rectification ? (
                      <>
                        <RectificationFilled rect={incident.rectification} onPhotoClick={setPreviewPhoto} />
                        {incident.verification && (
                          <VerificationResult v={incident.verification} inspectorName={verifyInspectorName} />
                        )}
                        {canVerify && (
                          <button
                            type="button"
                            onClick={() => setShowVerifySheet('verify')}
                            className="flex flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed border-primary bg-primary/5 py-5 text-primary transition hover:bg-primary/10"
                          >
                            <img src={new URL('../assets/illustrations/verification.svg', import.meta.url).href} alt="" className="h-16 w-16 object-contain" />
                            <span className="text-body-sm font-semibold">Start Verification</span>
                            <span className="text-body-xs opacity-70">Review the ESP's rectification and issue a decision</span>
                          </button>
                        )}
                      </>
                    ) : canSubmitRect ? (
                      <RectificationEmptyState
                        illustration={new URL('../assets/illustrations/rectification.svg', import.meta.url).href}
                        title="No Rectification Submitted"
                        subtitle="Submit the rectification details for this incident."
                        ctaLabel="Submit Rectification"
                        onCta={() => setShowRectSheet('rectification')}
                      />
                    ) : (
                      <RectificationEmptyState
                        illustration={new URL('../assets/illustrations/rectification.svg', import.meta.url).href}
                        title="Awaiting Rectification"
                        subtitle="Awaiting rectification from ESP."
                      />
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Re-Rectification — only relevant once the flow has reached that stage */}
              {(incident.reRectification || canSubmitReRect || incident.status === 'awaiting_esp_re_rectification' || incident.status === 're_rectification_submitted') && (
                <AccordionItem value="rerect">
                  <AccordionTrigger>Re-Rectification</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-3">
                      {incident.reRectification ? (
                        <>
                          <RectificationFilled rect={incident.reRectification} onPhotoClick={setPreviewPhoto} />
                          {incident.reVerification && (
                            <VerificationResult v={incident.reVerification} inspectorName={reVerifyInspectorName} />
                          )}
                          {canReVerify && (
                            <button
                              type="button"
                              onClick={() => setShowVerifySheet('re_verify')}
                              className="flex flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed border-primary bg-primary/5 py-5 text-primary transition hover:bg-primary/10"
                            >
                              <img src={new URL('../assets/illustrations/verification.svg', import.meta.url).href} alt="" className="h-16 w-16 object-contain" />
                              <span className="text-body-sm font-semibold">Start Verification</span>
                              <span className="text-body-xs opacity-70">Issue a second decision on the re-submitted rectification</span>
                            </button>
                          )}
                        </>
                      ) : canSubmitReRect ? (
                        <RectificationEmptyState
                          illustration={new URL('../assets/illustrations/rectification.svg', import.meta.url).href}
                          title="No Re-Rectification Submitted"
                          subtitle="Submit the re-rectification details for this incident."
                          ctaLabel="Submit Re-Rectification"
                          onCta={() => setShowRectSheet('re_rectification')}
                        />
                      ) : (
                        <RectificationEmptyState
                          illustration={new URL('../assets/illustrations/rectification.svg', import.meta.url).href}
                          title="Awaiting Re-Rectification"
                          subtitle="Awaiting re-rectification from ESP."
                        />
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            {/* ── PO decision note (read-only history) ── */}
            {incident.poDecision && (
              <div className="rounded-[6px] border border-border bg-secondary/50 px-3 py-2">
                <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Project Officer Decision</p>
                <p className="text-body-sm text-foreground">
                  {incident.poDecision.action === 'allow_re_rectification'
                    ? 'PO allowed re-rectification'
                    : `PO closed the case${incident.poDecision.penaltyAed ? ` · Penalty ${formatAed(incident.poDecision.penaltyAed)}` : ''}`}
                </p>
                {incident.poDecision.note && <p className="mt-0.5 text-body-xs text-muted-foreground">{incident.poDecision.note}</p>}
              </div>
            )}

            {/* ── Inspector / PO footer actions ── */}
            {(canMarkInvalid || canPoDecide) && (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                {canMarkInvalid && (
                  <Button variant="destructive" size="md" onClick={() => setShowInvalidDialog(true)}>
                    Mark Invalid
                  </Button>
                )}
                {canPoDecide && (
                  <>
                    <Button variant="primary" size="md" onClick={() => setShowCloseDialog(true)}>Close</Button>
                    <Button variant="secondary" size="md" onClick={() => setShowReRectDialog(true)}>
                      Send for Re-Rectification
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT column — fixed, own scroll ═══ */}
        <div className="hidden shrink-0 basis-[35%] flex-col overflow-hidden bg-card p-4 md:flex" style={{ minWidth: 340, maxWidth: 420 }}>
          {rightPanel}
        </div>
      </div>

      {/* ── Sheets ── */}
      {showRectSheet && (
        <RectificationSubmitSheet
          incidentId={incidentId}
          mode={showRectSheet}
          onClose={() => setShowRectSheet(null)}
        />
      )}
      {showVerifySheet && (
        <VerificationSheet
          incidentId={incidentId}
          mode={showVerifySheet}
          onClose={() => setShowVerifySheet(null)}
        />
      )}
      {showInvalidDialog && (
        <MarkInvalidDialog onConfirm={handleMarkInvalid} onClose={() => setShowInvalidDialog(false)} />
      )}
      {showCloseDialog && (
        <CloseIncidentDialog onConfirm={handleClose} onClose={() => setShowCloseDialog(false)} />
      )}
      {showReRectDialog && (
        <ReRectificationDialog onConfirm={handleReRect} onClose={() => setShowReRectDialog(false)} />
      )}
      {showPenaltySheet && (
        <IssuePenaltySheet incidentId={incidentId} onClose={() => setShowPenaltySheet(false)} />
      )}

      {/* ── Image preview nested sheet ── */}
      {previewPhoto && <ImagePreview photo={previewPhoto} onClose={() => setPreviewPhoto(null)} />}
    </>
  );
}
