/**
 * RectificationSubmitSheet — ESP "Submit Rectification" / "Submit Re-Rectification"
 * right side sheet (Flow 2 / Flow 5 in docs/lifecycle-specs/02-lifecycle-flows-and-contract.md).
 *
 * Opened from the detail's ESP Rectification/Re-Rectification accordion empty state.
 * Title/description + a mandatory photo dropzone (via the shared usePhotoCapture
 * controller — upload/camera → annotate → EvidencePhoto) → on submit calls
 * store.submitRectification / submitReRectification, toasts, and closes.
 */
import * as React from 'react';
import * as Icons from '@ds/icons';
import {
  Button, Input, Textarea, toast,
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@ds/components/primitives';
import { useIims } from '@/store/store';
import { EvidenceTile } from '@/lib/ui';
import { usePhotoCapture } from '@/flows/shared/PhotoCapture';
import type { EvidencePhoto } from '@/data/types';

export function RectificationSubmitSheet({
  incidentId,
  mode,
  onClose,
}: {
  incidentId: string;
  mode: 'rectification' | 're_rectification';
  onClose: () => void;
}) {
  const s = useIims();
  const isReRectification = mode === 're_rectification';

  const [title, setTitle] = React.useState('Rectification Submitted for Non-Compliance');
  const [description, setDescription] = React.useState('');
  const [photos, setPhotos] = React.useState<EvidencePhoto[]>([]);

  const capture = usePhotoCapture({
    getGps: () => s.incident(incidentId)?.location ?? null,
    onAdd: (photo) => setPhotos((prev) => [...prev, photo]),
  });

  const canSubmit = photos.length > 0 && description.trim().length > 0;

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  function handleSubmit() {
    if (!canSubmit) return;
    // Stamp the submitting ESP's contact (was falling back to "<ESP contact>").
    const esp = s.esp(s.incident(incidentId)?.espId);
    const espUser = esp ? `${esp.contactPerson} · ${esp.name}` : undefined;
    if (isReRectification) {
      s.submitReRectification(incidentId, { description, photos, espUser });
    } else {
      s.submitRectification(incidentId, { description, photos, espUser });
    }
    toast.success(isReRectification ? 'Re-rectification submitted' : 'Rectification submitted');
    onClose();
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" width="min(560px, 92vw)" className="p-0">
        <SheetHeader>
          <SheetTitle>{isReRectification ? 'Submit Re-Rectification' : 'Submit Rectification'}</SheetTitle>
          <SheetDescription>
            Fill the following Details to Submit {isReRectification ? 'Re-Rectification' : 'Rectification'}.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-auto p-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-body-sm font-semibold text-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-body-sm font-semibold text-foreground">Description</label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Start writing here…"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-body-sm font-semibold text-foreground">Attachments</label>
            <button
              type="button"
              onClick={() => capture.start('after')}
              className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card px-6 py-6 text-center transition-colors hover:border-primary hover:bg-secondary"
            >
              <span className="grid size-10 place-items-center rounded-full bg-secondary text-primary">
                <Icons.UploadCloud01 size={20} />
              </span>
              <p className="text-body-sm text-foreground">
                Drag &amp; drop here, or <span className="font-semibold text-primary">Choose files</span>
              </p>
              <div className="mt-1 flex w-full items-center justify-between text-caption text-muted-foreground">
                <span>Supported formats: png, jpeg</span>
                <span>Maximum size: 5 MB</span>
              </div>
            </button>

            {photos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative">
                    <EvidenceTile photo={photo} showMeta={false} />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      aria-label="Remove photo"
                      className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                    >
                      <Icons.XClose size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <SheetFooter>
          <Button variant="primary" size="lg" className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
            Submit Reason
          </Button>
        </SheetFooter>

        {capture.render()}
      </SheetContent>
    </Sheet>
  );
}
