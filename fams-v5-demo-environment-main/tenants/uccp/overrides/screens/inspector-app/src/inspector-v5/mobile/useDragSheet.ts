import { useRef } from "react";

/**
 * useDragSheet — generalized CSS-transform drag-to-snap machine for the
 * Inspector mobile shell's bottom sheets (no library). ONE mechanism shared
 * by every sheet in the shell (Field Dispatching's queue + complaint-detail
 * sheets, Task Monitoring's task-list + task-detail sheets) instead of each
 * one re-implementing its own pointer handlers — only the ORDERED snap list
 * and each snap's pixel offset differ per sheet.
 *
 * `snaps` must be ordered from the most-OPEN state (offset 0 or smallest) to
 * the most-CLOSED state the sheet can rest at. Every snap of every sheet now
 * lives in ONE transformed DOM node — including each detail sheet's "full"
 * stage (offset 0, full-bleed) — so the same drag mechanics and the same
 * easing apply across the whole peek → overview → full progression, in both
 * directions.
 *
 * TWO geometry channels are returned and MUST both be applied:
 *   · `style`      → the sheet ROOT: fixed `height: contentH` + the animated
 *                    `translateY(offset)`.
 *   · `innerStyle` → a single wrapper INSIDE the root: `height = contentH −
 *                    offset`, i.e. exactly the region of the sheet that is
 *                    actually on-screen at the current snap. Laying content
 *                    out inside that wrapper is what keeps a sheet's bottom
 *                    action stack on-screen at every snap instead of below
 *                    the fold. Both channels animate with the same duration
 *                    and easing so they stay in lockstep.
 *
 * Pointer capture: `setPointerCapture` retargets all subsequent pointer
 * events to the CAPTURING element. The handlers live on the drag handle, so
 * capture is taken on `e.currentTarget` (the handle itself) — capturing on
 * the sheet root instead silently kills every drag after pointerdown,
 * because React then routes the moves to the root, which has no handlers.
 */
export interface DragSheetConfig<S extends string> {
  /** Ordered OPEN → CLOSED. */
  snaps: readonly S[];
  offsetPx: (snap: S) => number;
  snap: S;
  setSnap: (s: S) => void;
  contentH: number;
  /** Dragging past the most-CLOSED snap's offset by this many px (default
   *  60) fires `onOverdrag` instead of snapping to it — lets a sheet fully
   *  close/deselect on an aggressive downward swipe. */
  onOverdrag?: () => void;
}

/** iOS-sheet easing, shared by the transform and the visible-height channel
 *  so the two never drift apart mid-animation. */
const SHEET_EASING = "cubic-bezier(0.32,0.72,0,1)";
const SHEET_MS = 300;
export const SHEET_TRANSFORM_TRANSITION = `transform ${SHEET_MS}ms ${SHEET_EASING}`;
export const SHEET_HEIGHT_TRANSITION = `height ${SHEET_MS}ms ${SHEET_EASING}`;

export function useDragSheet<S extends string>(cfg: DragSheetConfig<S>) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; startOffset: number } | null>(null);
  /** The element that actually holds the pointer capture (the handle). */
  const captureEl = useRef<HTMLElement | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { startY: e.clientY, startOffset: cfg.offsetPx(cfg.snap) };
    const el = e.currentTarget as HTMLElement;
    captureEl.current = el;
    // Capture on the element that OWNS these handlers, never on the sheet
    // root — see the note in this file's header.
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort; the drag still works via bubbling */
    }
    if (ref.current) ref.current.style.transition = "none";
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.startY;
    const next = Math.min(cfg.contentH - 24, Math.max(0, drag.current.startOffset + dy));
    if (ref.current) ref.current.style.transform = `translateY(${next}px)`;
  };

  const finish = (e: React.PointerEvent, cancelled: boolean) => {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.startY;
    const current = cancelled ? drag.current.startOffset : Math.max(0, drag.current.startOffset + dy);
    drag.current = null;
    if (captureEl.current) {
      try {
        captureEl.current.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      captureEl.current = null;
    }
    // Restore the REAL transition value. Assigning "" would delete the
    // inline property, and React never re-applies an unchanged style prop —
    // which permanently killed the animation after the first drag.
    if (ref.current) ref.current.style.transition = SHEET_TRANSFORM_TRANSITION;

    const closedMost = cfg.snaps[cfg.snaps.length - 1];
    const closedPx = cfg.offsetPx(closedMost);
    if (!cancelled && cfg.onOverdrag && current > closedPx + 60) {
      cfg.onOverdrag();
      return;
    }
    let best: S = cfg.snaps[0];
    let bestDist = Infinity;
    for (const s of cfg.snaps) {
      const d = Math.abs(current - cfg.offsetPx(s));
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    // Drive the element to the chosen snap imperatively as well: when the
    // drag ends on the SAME snap it started from, React re-renders nothing
    // and the imperative transform left by onPointerMove would otherwise
    // stick at the half-dragged position.
    if (ref.current) ref.current.style.transform = `translateY(${cfg.offsetPx(best)}px)`;
    cfg.setSnap(best);
  };

  const onPointerUp = (e: React.PointerEvent) => finish(e, false);
  const onPointerCancel = (e: React.PointerEvent) => finish(e, true);

  const offset = cfg.offsetPx(cfg.snap);
  return {
    ref,
    style: {
      height: `${cfg.contentH}px`,
      transform: `translateY(${offset}px)`,
      transition: SHEET_TRANSFORM_TRANSITION,
    } as const,
    /** Visible window of the sheet at the current snap — apply to the single
     *  wrapper that holds all of the sheet's content. */
    innerStyle: {
      height: `${Math.max(0, cfg.contentH - offset)}px`,
      transition: SHEET_HEIGHT_TRANSITION,
    } as const,
    /** Spread onto the DRAG HANDLE (the element the user grabs). */
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}
