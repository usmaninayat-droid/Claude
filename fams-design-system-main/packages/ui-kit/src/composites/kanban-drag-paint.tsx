import type { CSSProperties, ReactNode } from 'react'
import { Info } from '../icons'
import { cn } from '../lib/cn'
import type { KanbanActiveDrag } from './kanban-context'

/**
 * Pre-emptive drag-validity painting for `KanbanColumn` — split out of
 * `Kanban.tsx` per the ~300-line soft budget (root CLAUDE.md rule 12).
 *
 * A drop's legality is decided by the CALLER's rule predicate — resolved ONCE
 * per drag by the board (`KanbanBoardProps.getAllowedColumnIds`) and pushed
 * down as `KanbanActiveDrag.allowedColumnIds`, and mirrored on the board's
 * column registry (`canDropCard`) so a card's keyboard "Move to…" menu reads
 * the SAME predicate — and painted while the pointer drag is still in flight,
 * never discovered on drop.
 *
 * Both messages are `aria-hidden` decoration: they are visual redundancy for a
 * sighted user mid-drag. The equivalent information reaches assistive tech
 * exactly ONCE, from the caller, on the terminal denial — painting must never
 * announce per column, because the live-region module cancels whatever
 * announcement is still pending on every call (see `@fams/v5-templates`'
 * `views/kanban/announce-denied.ts` for the full write-up of that race).
 */

export type KanbanDragState = 'valid' | 'invalid'

/**
 * Resolve what a column should paint for the drag currently in flight.
 * `null` = paint nothing (no drag at all, or the legacy no-rule-info case on
 * the card's own source column).
 *
 * PREFERRED path: the board resolved the caller's predicate ONCE at drag start
 * and published the result as `activeDrag.allowedColumnIds` — every column then
 * paints by a single set lookup, so no predicate runs per column per dragover
 * and no two lanes can disagree. That set always contains the card's own
 * column (unioned in by the board), which is why a drop back home paints VALID
 * rather than staying neutral.
 *
 * LEGACY path (`allowedColumnIds === null`, i.e. no `getAllowedColumnIds` on
 * the board): fall back to this column's own `canDropCard` prop, unchanged
 * behaviour for callers that never adopted the board-level predicate.
 */
export function resolveDragState(
  columnId: string,
  activeDrag: KanbanActiveDrag | null,
  canDrop: boolean,
  canDropCard?: (cardId: string) => boolean,
): KanbanDragState | null {
  if (!activeDrag) return null
  if (activeDrag.allowedColumnIds) {
    if (!canDrop) return 'invalid'
    return activeDrag.allowedColumnIds.has(columnId) ? 'valid' : 'invalid'
  }
  if (activeDrag.fromColumnId === columnId) return null
  if (!canDrop) return 'invalid'
  if (canDropCard && !canDropCard(activeDrag.cardId)) return 'invalid'
  return 'valid'
}

/**
 * The column body's paint for a drag state. A VALID target takes a ~8% tint of
 * the stage's own runtime `accentColor` plus a 2px stroke in that same color
 * (genuine per-tenant runtime data, the `CountChip.tintFromAccent` precedent —
 * never a literal in source); an INVALID target goes near-white with no stroke
 * emphasis. Colour is never the only signal: each state also renders its own
 * centred text/icon message below.
 */
export function dragPaintStyle(
  state: KanbanDragState | null,
  accentColor: string | undefined,
): CSSProperties | undefined {
  if (state !== 'valid' || !accentColor) return undefined
  return {
    backgroundColor: `color-mix(in srgb, ${accentColor} 8%, var(--color-card, white))`,
    borderColor: accentColor,
  }
}

/** Class half of {@link dragPaintStyle} — token-only, no runtime colour. */
export function dragPaintClasses(state: KanbanDragState | null): string | undefined {
  if (state === 'valid') return 'border-2 border-solid'
  if (state === 'invalid') return 'bg-card'
  return undefined
}

export interface KanbanDragMessageProps {
  state: KanbanDragState
  /** Caller-supplied pill copy naming the transition (valid targets). */
  validDropLabel?: ReactNode
  /** Caller-supplied refusal copy (invalid targets). */
  invalidDropMessage?: ReactNode
  /** Stage accent for the valid-state pill — runtime data, never a literal. */
  accentColor?: string
}

/**
 * The centred, NON-BLOCKING in-column message — a pill naming the transition
 * on a valid target, an info glyph over the caller's refusal copy on an
 * invalid one. Never a toast, never a modal, and never focus-stealing: it is
 * a hint painted inside the lane the pointer is over.
 */
export function KanbanDragMessage({
  state,
  validDropLabel,
  invalidDropMessage,
  accentColor,
}: KanbanDragMessageProps) {
  const content =
    state === 'valid' ? (
      validDropLabel ? (
        <span
          data-slot="kanban-drag-valid-pill"
          className={cn(
            'inline-flex items-center rounded-full px-3 py-1 text-body-xs font-semibold',
            !accentColor && 'bg-primary/10 text-primary',
          )}
          style={accentColor ? { backgroundColor: `color-mix(in srgb, ${accentColor} 16%, var(--color-card, white))`, color: accentColor } : undefined}
        >
          {validDropLabel}
        </span>
      ) : null
    ) : invalidDropMessage ? (
      <span
        data-slot="kanban-drag-invalid-message"
        className="inline-flex flex-col items-center gap-1 text-body-xs font-medium text-muted-foreground"
      >
        <Info className="size-4" />
        <span>{invalidDropMessage}</span>
      </span>
    ) : null

  if (!content) return null
  return (
    <div
      data-slot="kanban-drag-message"
      aria-hidden="true"
      className="pointer-events-none flex shrink-0 items-center justify-center px-2 py-4 text-center"
    >
      {content}
    </div>
  )
}

KanbanDragMessage.displayName = 'KanbanDragMessage'
