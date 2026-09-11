/**
 * PhotoCapture — shared camera/gallery capture pieces + an orchestrating
 * controller, hoisted verbatim (CameraCapture / UploadMethodDialog) out of
 * ReportIncident.tsx so every photo-adding surface (Report Incident,
 * Rectification-submit sheet, Verification sheet) shares one implementation.
 *
 * `CameraCapture` and `UploadMethodDialog` are unchanged from their original
 * ReportIncident.tsx definitions — only relocated + exported.
 *
 * `usePhotoCapture()` orchestrates the full add-a-photo flow:
 *   open UploadMethodDialog → user picks Camera (→ CameraCapture) or Gallery
 *   (→ hidden file input) → the resulting dataURL is routed through
 *   <ImageAnnotator> so every captured/uploaded image can be marked up →
 *   on "Submit Image" builds an EvidencePhoto (id via newPhotoId(), kind from
 *   the `start(kind)` call, dataUrl, caption, gps, timestamp) and calls back
 *   `onAdd(photo)`.
 *
 * Usage:
 *   const capture = usePhotoCapture({ getGps: () => state.location, onAdd: (p) => ... });
 *   <button onClick={() => capture.start('incident')}>Upload</button>
 *   {capture.render()}
 */
import * as React from 'react';
import { createPortal } from 'react-dom';
import * as Icons from '@ds/icons';
import { Button } from '@ds/components/primitives';
import { toast } from '@ds/components/primitives';
import { newPhotoId } from '@/store/store';
import type { EvidencePhoto, GeoPoint } from '@/data/types';
import { ImageAnnotator } from '@/flows/shared/ImageAnnotator';

/* ─────────────────────── Live camera capture ───────────────── */

/**
 * CameraCapture — full-screen live device-camera capture.
 *
 * - `getUserMedia({ video: { facingMode: 'environment' } })` → live `<video>`
 *   preview. Shutter grabs the current frame to a `<canvas>` → JPEG data URL.
 * - After the shutter fires we show a **freeze-frame review** (Retake / Use
 *   Photo) so a bad frame can be re-shot before it enters the annotator.
 * - All tracks are stopped on close/unmount (no leaked camera light).
 * - Permission-denied / no-camera / insecure-context is handled gracefully:
 *   a clear message + a "Choose From Gallery" fallback (via `onFallback`).
 */
export function CameraCapture({
  onCapture,
  onClose,
  onFallback,
}: {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  /** Optional — offered in the error state so the user can still add a photo
   *  from their gallery when the camera is unavailable/denied. */
  onFallback?: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  /** Non-null once the shutter has fired — the frozen frame under review. */
  const [snapshot, setSnapshot] = React.useState<string | null>(null);

  const stopStream = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  React.useEffect(() => {
    let active = true;
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) {
      setErr(
        window.isSecureContext === false
          ? 'The camera needs a secure (HTTPS) connection.'
          : 'Camera API not available in this browser.',
      );
      return;
    }
    md.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => setReady(true)).catch(() => setReady(true));
        }
      })
      .catch((e: unknown) => {
        // Normalise the common getUserMedia rejections into a plain-English line.
        const name = e instanceof DOMException ? e.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setErr('Camera permission was denied.');
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') {
          setErr('No camera was found on this device.');
        } else if (name === 'NotReadableError') {
          setErr('The camera is already in use by another app.');
        } else {
          setErr(e instanceof Error ? e.message : 'Unable to access the camera.');
        }
      });
    return () => { active = false; stopStream(); };
  }, [stopStream]);

  /** Grab the current video frame to a JPEG and enter the review state. */
  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    setSnapshot(canvas.toDataURL('image/jpeg', 0.85));
  };

  /** Accept the frozen frame → stop the camera and hand it upward. */
  const usePhoto = () => {
    if (!snapshot) return;
    stopStream();
    onCapture(snapshot);
  };

  /** Discard the frozen frame and return to the live preview. */
  const retake = () => setSnapshot(null);

  const closeAll = () => { stopStream(); onClose(); };

  return (
    <div className="fixed inset-0 z-[850] flex flex-col bg-black">
      <div className="flex shrink-0 items-center justify-between px-5 py-4 text-white">
        <span className="flex items-center gap-2 text-body-md font-semibold">
          <Icons.CameraLens size={18} className="text-white/80" />
          {snapshot ? 'Review Photo' : 'Live Capture'}
        </span>
        <button type="button" onClick={closeAll} aria-label="Close camera" className="rounded-md p-1.5 transition hover:bg-white/10"><Icons.XClose size={20} /></button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {err ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white">
            <span className="grid size-16 place-items-center rounded-full bg-white/10">
              <Icons.CameraOff size={36} className="text-white/70" />
            </span>
            <p className="text-body-md font-semibold">Camera unavailable</p>
            <p className="max-w-sm text-body-sm text-white/70">{err} You can still add a photo from your gallery.</p>
            <div className="mt-2 flex items-center gap-3">
              {onFallback && (
                <Button variant="primary" size="md" className="gap-2" onClick={() => { stopStream(); onFallback(); }}>
                  <Icons.Image01 size={16} /> Choose From Gallery
                </Button>
              )}
              <Button variant="tertiary" size="md" onClick={closeAll}>Close</Button>
            </div>
          </div>
        ) : snapshot ? (
          /* freeze-frame review */
          <img src={snapshot} alt="Captured frame" className="h-full w-full object-contain" />
        ) : (
          <>
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            {/* subtle framing affordance + hint while the stream warms up */}
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-2">
              {!ready && (
                <span className="rounded-full bg-black/50 px-3 py-1 text-body-xs text-white/80">Starting camera…</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* shutter (live) OR retake/use (review) — hidden entirely in the error state */}
      {!err && (
        snapshot ? (
          <div className="flex shrink-0 items-center justify-center gap-3 px-6 py-6">
            <Button variant="tertiary" size="lg" className="gap-2" onClick={retake}>
              <Icons.RefreshCcw01 size={16} /> Retake
            </Button>
            <Button variant="primary" size="lg" className="gap-2" onClick={usePhoto}>
              <Icons.CheckCircle size={16} /> Use Photo
            </Button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center justify-center py-6">
            <button
              type="button"
              onClick={capture}
              disabled={!ready}
              aria-label="Capture photo"
              className="grid size-16 place-items-center rounded-full bg-white ring-4 ring-white/40 transition active:scale-95 disabled:opacity-40"
              style={{ boxShadow: '0 0 0 6px color-mix(in srgb, var(--primary) 55%, transparent)' }}
            >
              <span className="size-12 rounded-full border-4 border-black/80" />
            </button>
          </div>
        )
      )}
    </div>
  );
}

/* ─────────────────────── Upload-method dialog ───────────────── */

export function UploadMethodDialog({ onCamera, onGallery, onClose }: { onCamera: () => void; onGallery: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[840] grid place-items-center bg-black/50 p-6" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[var(--elevation-md)]" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground">
          <Icons.XClose size={18} />
        </button>
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>
          <Icons.ImagePlus size={26} />
        </span>
        <h3 className="text-h5 font-bold text-foreground">Select Upload Method.</h3>
        <p className="mt-1 text-body-sm text-muted-foreground">Choose how you&apos;d like to add an image.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="primary" size="lg" className="w-full gap-2" onClick={onCamera}>
            <Icons.CameraPlus size={18} /> Live Capture With Camera
          </Button>
          <Button variant="tertiary" size="lg" className="w-full gap-2" onClick={onGallery}>
            <Icons.Image01 size={18} /> Choose From Gallery
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── usePhotoCapture() controller ───────────────── */

export interface UsePhotoCaptureOptions {
  /** GPS to stamp onto the resulting EvidencePhoto (e.g. the wizard's current location). */
  getGps?: () => GeoPoint | null | undefined;
  /** Caption builder — defaults to "Evidence photo". Receives a running index (1-based). */
  caption?: (index: number) => string;
  /** Called with the finished EvidencePhoto once the user submits the annotator. */
  onAdd: (photo: EvidencePhoto) => void;
  /** Toast on success — defaults to true. */
  notify?: boolean;
}

export interface PhotoCaptureController {
  /** Opens the upload-method dialog for a photo of the given `kind`. */
  start: (kind: EvidencePhoto['kind']) => void;
  /** Renders the dialog/camera/annotator overlays + hidden file input. Mount once, near the root of the flow. */
  render: () => React.ReactNode;
}

/**
 * Orchestrates: UploadMethodDialog → CameraCapture | gallery file input →
 * ImageAnnotator → EvidencePhoto → onAdd(). Reusable by ReportIncident, the
 * Rectification-submit sheet, and the Verification sheet — each only needs to
 * call `start(kind)` and mount `render()`.
 */
export function usePhotoCapture({ getGps, caption, onAdd, notify = true }: UsePhotoCaptureOptions): PhotoCaptureController {
  const [kind, setKind] = React.useState<EvidencePhoto['kind']>('incident');
  const [showUpload, setShowUpload] = React.useState(false);
  const [showCamera, setShowCamera] = React.useState(false);
  const [pendingSrc, setPendingSrc] = React.useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = React.useState<string>('image.jpg');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const countRef = React.useRef(0);

  function start(k: EvidencePhoto['kind']) {
    setKind(k);
    setShowUpload(true);
  }

  function openAnnotator(dataUrl: string, fileName: string) {
    setPendingSrc(dataUrl);
    setPendingFileName(fileName);
  }

  function finishPhoto(dataUrl: string) {
    countRef.current += 1;
    const photo: EvidencePhoto = {
      id: newPhotoId(),
      kind,
      seed: (countRef.current * 7 + 3) % 1000,
      caption: caption ? caption(countRef.current) : `Evidence photo ${countRef.current}`,
      gps: getGps?.() ?? { lat: 0, lng: 0 },
      timestamp: new Date().toISOString(),
      dataUrl,
    };
    onAdd(photo);
    setPendingSrc(null);
    if (notify) toast.success('Photo added');
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const [first, ...rest] = files;
    if (first) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') openAnnotator(reader.result, first.name);
      };
      reader.readAsDataURL(first);
    }
    // Extra files beyond the first are added directly (annotation is a
    // one-at-a-time flow) so a multi-select gallery pick doesn't stall.
    rest.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') finishPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = ''; // allow re-picking the same file
  }

  function render() {
    // The overlays are portaled to <body> so they always sit above the side
    // sheet / detail sheet they were launched from (those establish their own
    // stacking contexts — an inline overlay would render UNDER them).
    return (
      <>
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />

        {typeof document !== 'undefined' && createPortal(
          <>
            {showUpload && (
              <UploadMethodDialog
                onCamera={() => { setShowUpload(false); setShowCamera(true); }}
                onGallery={() => { setShowUpload(false); fileInputRef.current?.click(); }}
                onClose={() => setShowUpload(false)}
              />
            )}

            {showCamera && (
              <CameraCapture
                onCapture={(url) => { setShowCamera(false); openAnnotator(url, `capture-${Date.now()}.jpg`); }}
                onClose={() => setShowCamera(false)}
                onFallback={() => { setShowCamera(false); fileInputRef.current?.click(); }}
              />
            )}

            {pendingSrc && (
              <ImageAnnotator
                src={pendingSrc}
                fileName={pendingFileName}
                onSubmit={finishPhoto}
                onCancel={() => finishPhoto(pendingSrc)}
              />
            )}
          </>,
          document.body,
        )}
      </>
    );
  }

  return { start, render };
}
