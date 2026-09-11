/**
 * VerificationSheet — Inspector "Rectification Verification" side sheet
 * (Figma: IWMP "Rectification Verification" frame). Opened from the detail
 * when an ESP rectification/re-rectification has been submitted, so the
 * inspector can judge it satisfactory (→ closed) or not (→ escalated).
 *
 * Right-side DS Sheet (~560px), backdrop dims the detail behind it. Status
 * select (Satisfactory / Not Satisfactory), description textarea, optional
 * photo evidence via the shared `usePhotoCapture` controller (upload/camera
 * → annotate → EvidenceTile thumbnails with remove). Clicking a thumbnail
 * opens a nested "Image Preview" panel (higher z than the sheet).
 *
 * Token-only styling; the frame's green CTA is layout-only — FAMS blue
 * (`Button variant="primary"`) is used for the submit action per house rule.
 */
import * as React from 'react';
import * as Icons from '@ds/icons';
import {
  Button, Textarea, Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem, Sheet, SheetContent, SheetHeader,
  SheetTitle, SheetDescription, SheetFooter, toast,
} from '@ds/components/primitives';
import { useIims } from '@/store/store';
import { usePhotoCapture } from '@/flows/shared/PhotoCapture';
import { EvidenceTile, formatDateTime } from '@/lib/ui';
import type { EvidencePhoto, VerificationDecision } from '@/data/types';

/** Sentinel values for the Radix Select — never pass an empty string. */
const STATUS_OPTIONS: { value: VerificationDecision; label: string; dotColor: string }[] = [
  { value: 'satisfactory', label: 'Satisfactory', dotColor: 'var(--status-success)' },
  { value: 'not_satisfactory', label: 'Not Satisfactory', dotColor: 'var(--status-error)' },
];

/* ─────────────────────── nested Image Preview panel ─────────────────────── */

function ImagePreviewPanel({
  photo, onClose,
}: { photo: EvidencePhoto; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[760] flex justify-end" role="dialog" aria-label="Image Preview">
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

        <SheetFooter>
          <Button variant="primary" onClick={onClose}>Submit</Button>
        </SheetFooter>
      </div>
    </div>
  );
}

/* ─────────────────────────── VerificationSheet ───────────────────────────── */

export function VerificationSheet({
  incidentId, mode, onClose,
}: { incidentId: string; mode: 'verify' | 're_verify'; onClose: () => void }) {
  const s = useIims();
  const [decision, setDecision] = React.useState<VerificationDecision | ''>('');
  const [comment, setComment] = React.useState('');
  const [photos, setPhotos] = React.useState<EvidencePhoto[]>([]);
  const [previewPhoto, setPreviewPhoto] = React.useState<EvidencePhoto | null>(null);

  const capture = usePhotoCapture({
    getGps: () => s.incident(incidentId)?.location ?? null,
    onAdd: (photo) => setPhotos((prev) => [...prev, photo]),
  });

  const removePhoto = (id: string) => setPhotos((prev) => prev.filter((p) => p.id !== id));

  // Photo evidence is mandatory at every lifecycle step so the PO can compare
  // before/after and confirm the work was actually done.
  const canSubmit = decision !== '' && photos.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const finalDecision = decision as VerificationDecision;
    if (mode === 'verify') {
      s.verifyRectification(incidentId, finalDecision, comment.trim(), photos);
    } else {
      s.verifyReRectification(incidentId, finalDecision, comment.trim(), photos);
    }
    toast.success(
      finalDecision === 'satisfactory'
        ? 'Rectification verified as satisfactory · Incident closed'
        : 'Rectification rejected · Escalated to Project Officer'
    );
    onClose();
  };

  return (
    <>
      <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent side="right" width="min(560px, 92vw)" className="p-0">
          <SheetHeader>
            <SheetTitle>
              {mode === 're_verify' ? 'Re-Rectification Verification' : 'Rectification Verification'}
            </SheetTitle>
            <SheetDescription>
              Verify whether the rectification was completed by the ESP and provide proof for your decision.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
            {/* status select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-body-sm font-medium text-foreground">
                Status <span className="text-[var(--status-error)]">*</span>
              </label>
              <Select value={decision} onValueChange={(v) => setDecision(v as VerificationDecision)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: opt.dotColor }} />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-body-sm font-medium text-foreground">Description</label>
              <Textarea
                placeholder="Start writing here…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>

            {/* attachments */}
            <div className="flex flex-col gap-1.5">
              <label className="text-body-sm font-medium text-foreground">
                Attachments <span className="text-[var(--status-error)]">*</span>
              </label>
              <button
                type="button"
                onClick={() => capture.start('verification')}
                className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-secondary/40 py-5 text-body-sm text-muted-foreground transition hover:bg-secondary"
              >
                <Icons.Camera01 size={24} className="text-muted-foreground" />
                <span>
                  Click here to <span className="font-medium text-primary">upload</span> your files
                </span>
              </button>
              {photos.length === 0 && (
                <p className="text-body-xs text-muted-foreground">
                  At least one photo is required — it lets the Project Officer compare the evidence.
                </p>
              )}
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((ph) => (
                    <div key={ph.id} className="relative">
                      <EvidenceTile photo={ph} onClick={() => setPreviewPhoto(ph)} className="w-full" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePhoto(ph.id); }}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                        aria-label="Remove photo"
                      >
                        <Icons.XClose size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <SheetFooter>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
              Submit
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* photo capture overlays (upload dialog / camera / annotator) */}
      {capture.render()}

      {/* nested image preview — higher z than the sheet */}
      {previewPhoto && (
        <ImagePreviewPanel photo={previewPhoto} onClose={() => setPreviewPhoto(null)} />
      )}
    </>
  );
}
