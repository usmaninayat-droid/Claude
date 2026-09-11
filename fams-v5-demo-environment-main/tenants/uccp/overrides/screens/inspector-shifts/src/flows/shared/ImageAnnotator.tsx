/**
 * ImageAnnotator — WhatsApp-style "Image Uploaded" markup overlay (Figma: IWMP
 * "Image Uploaded" frame). Shown after ANY image is captured/uploaded (report
 * incident, rectification, verification) so the user can draw on it before it's
 * attached as evidence.
 *
 * - Full-screen overlay (fixed, z-850, dark scrim) — header "Image Uploaded" +
 *   subtitle "You have uploaded image <fileName>", close (X).
 * - Image centered on a dark canvas. Round pen-toggle button (FAMS blue when
 *   active) at the image's top-right, plus a vertical colour-palette strip.
 * - Freehand drawing on a `<canvas>` overlaid exactly on the rendered image
 *   (pointer events, ~4px round strokes). Undo (last stroke) + Clear.
 * - Footer CTA "Submit Image" (FAMS blue) — composites the source image + the
 *   strokes onto an offscreen canvas at natural resolution, exports a JPEG
 *   data URL, and calls `onSubmit`. Cancel returns the original via `onCancel`.
 *
 * Token-only styling; the frame's green CTA is layout-only — FAMS blue (`--primary`)
 * is used for all CTAs/active states per house rule.
 */
import * as React from 'react';
import * as Icons from '@ds/icons';
import { Button } from '@ds/components/primitives';

const PALETTE = [
  '#F04438', // red
  '#F79009', // orange
  '#FDB022', // yellow
  '#12B76A', // green
  '#0072D6', // blue (FAMS)
  '#9E77ED', // purple
  '#101828', // black
  '#FFFFFF', // white
] as const;

interface Point { x: number; y: number }
interface Stroke { color: string; points: Point[] }

export interface ImageAnnotatorProps {
  /** Source image — data URL or any renderable <img> src. */
  src: string;
  /** File name shown in the subtitle, e.g. "photo_0231.jpg". */
  fileName?: string;
  /** Called with the annotated (or unchanged) image as a JPEG data URL. */
  onSubmit: (dataUrl: string) => void;
  /** Called when the user cancels — callers typically fall back to the original src. */
  onCancel: () => void;
}

export function ImageAnnotator({ src, fileName = 'image.jpg', onSubmit, onCancel }: ImageAnnotatorProps) {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [imgSize, setImgSize] = React.useState<{ w: number; h: number } | null>(null);
  const [penActive, setPenActive] = React.useState(true);
  const [color, setColor] = React.useState<string>(PALETTE[4]); // FAMS blue default
  const [strokes, setStrokes] = React.useState<Stroke[]>([]);
  const drawingRef = React.useRef<Stroke | null>(null);

  /* Size the overlay canvas to match the rendered <img> box exactly. */
  const syncCanvasSize = React.useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    setImgSize({ w: rect.width, h: rect.height });
  }, []);

  React.useEffect(() => {
    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);
    return () => window.removeEventListener('resize', syncCanvasSize);
  }, [syncCanvasSize]);

  /* Redraw all committed strokes + the in-progress one whenever they change. */
  const redraw = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgSize) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const all = drawingRef.current ? [...strokes, drawingRef.current] : strokes;
    for (const s of all) {
      if (s.points.length < 2) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      ctx.stroke();
    }
  }, [strokes, imgSize]);

  React.useEffect(() => { redraw(); }, [redraw]);

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!penActive) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawingRef.current = { color, points: [pointFromEvent(e)] };
    redraw();
  }
  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!penActive || !drawingRef.current) return;
    drawingRef.current.points.push(pointFromEvent(e));
    redraw();
  }
  function handlePointerUp() {
    if (drawingRef.current) {
      const finished = drawingRef.current;
      drawingRef.current = null;
      if (finished.points.length > 1) setStrokes((prev) => [...prev, finished]);
    }
  }

  function handleUndo() { setStrokes((prev) => prev.slice(0, -1)); }
  function handleClear() { setStrokes([]); }

  /** Composite the source image + strokes onto an offscreen canvas at natural
   *  resolution, scaling stroke coordinates from rendered→natural pixels. */
  function handleSubmit() {
    const img = imgRef.current;
    if (!img || !imgSize || strokes.length === 0) {
      // nothing drawn (or image not ready) — pass the original through untouched
      onSubmit(src);
      return;
    }
    const natW = img.naturalWidth || imgSize.w;
    const natH = img.naturalHeight || imgSize.h;
    const scaleX = natW / imgSize.w;
    const scaleY = natH / imgSize.h;

    const out = document.createElement('canvas');
    out.width = natW;
    out.height = natH;
    const ctx = out.getContext('2d');
    if (!ctx) { onSubmit(src); return; }
    ctx.drawImage(img, 0, 0, natW, natH);
    for (const s of strokes) {
      if (s.points.length < 2) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 4 * Math.max(scaleX, scaleY);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(s.points[0].x * scaleX, s.points[0].y * scaleY);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x * scaleX, s.points[i].y * scaleY);
      }
      ctx.stroke();
    }
    onSubmit(out.toDataURL('image/jpeg', 0.9));
  }

  return (
    <div className="fixed inset-0 z-[850] flex flex-col bg-black">
      {/* header */}
      <div className="flex shrink-0 items-start justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="text-h5 font-bold text-white">Image Uploaded</h2>
          <p className="mt-0.5 text-body-sm text-white/60">You have uploaded image {fileName}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="rounded-md p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <Icons.XClose size={20} />
        </button>
      </div>

      {/* canvas area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
        <div className="relative inline-block max-h-full max-w-full">
          <img
            ref={imgRef}
            src={src}
            alt="Uploaded evidence"
            onLoad={syncCanvasSize}
            className="block max-h-[70vh] max-w-full select-none rounded-lg object-contain"
            draggable={false}
          />
          {imgSize && (
            <canvas
              ref={canvasRef}
              width={imgSize.w}
              height={imgSize.h}
              className="absolute inset-0 touch-none rounded-lg"
              style={{ cursor: penActive ? 'crosshair' : 'default' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          )}

          {/* pen toggle — round button at the image's top-right */}
          <button
            type="button"
            onClick={() => setPenActive((v) => !v)}
            aria-label={penActive ? 'Disable pen' : 'Enable pen'}
            aria-pressed={penActive}
            className="absolute -right-4 -top-4 grid size-10 place-items-center rounded-full shadow-[var(--elevation-md)] transition"
            style={{
              background: penActive ? 'var(--primary)' : '#FFFFFF',
              color: penActive ? '#FFFFFF' : '#101828',
            }}
          >
            <Icons.Edit03 size={18} />
          </button>

          {/* vertical colour palette strip, beside the pen toggle */}
          <div className="absolute -right-4 top-8 flex flex-col items-center gap-2 rounded-full bg-black/50 p-2 backdrop-blur-sm">
            {PALETTE.map((c) => {
              const active = c === color;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Colour ${c}`}
                  aria-pressed={active}
                  className="size-5 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-transparent transition"
                  style={{
                    background: c,
                    border: c === '#FFFFFF' ? '1px solid rgba(0,0,0,0.15)' : 'none',
                    ['--tw-ring-color' as string]: active ? 'var(--primary)' : 'transparent',
                  }}
                />
              );
            })}
          </div>

          {/* undo / clear — bottom-left of the image */}
          <div className="absolute -bottom-4 left-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-body-xs font-medium text-white transition hover:bg-black/75 disabled:opacity-40"
            >
              <Icons.CornerUpLeft size={13} /> Undo
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-body-xs font-medium text-white transition hover:bg-black/75 disabled:opacity-40"
            >
              <Icons.Trash01 size={13} /> Clear
            </button>
          </div>
        </div>
      </div>

      {/* footer CTA */}
      <div className="shrink-0 border-t border-white/10 px-5 py-4">
        <Button variant="primary" size="lg" className="w-full" onClick={handleSubmit}>
          Submit Image
        </Button>
      </div>
    </div>
  );
}
