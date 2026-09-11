import type { ReactNode } from 'react'
import { Pin, PinOff } from '@fams/ui-kit/icons'
import { IconControl, KanbanColumn } from '@fams/ui-kit'
import type { PipelineStage } from '@fams/v5-composer'

/** The literal refusal copy from Dev Note `33534:32268`. Never paraphrase it. */
export const DENIED_DROP_MESSAGE = "This item can't move here."

export interface KanbanColumnViewProps {
  stage: PipelineStage
  count: number
  /**
   * The status-workflow predicate for THIS lane, bound by `move-rules.ts`'s
   * `makeCanDropCard`. Paints the lane's pre-emptive drag validity AND (via
   * `ui-kit`'s board registry) filters every card's keyboard "Move to…" menu —
   * one predicate, both consumers.
   */
  canDropCard?: (cardId: string) => boolean
  /** Whether this lane is currently pinned to the front of the board. */
  pinned?: boolean
  /** Draws the rule separating the pinned group from the unpinned remainder. */
  pinnedSeparator?: boolean
  /** Fires when the pin control is activated. Omit to render no pin control at all. */
  onTogglePin?: (stageId: string) => void
  /** Explains why pinning is refused; when set the control is disabled and carries this as its tooltip. */
  pinDisabledReason?: string
  /**
   * Muted in-column line for an EMPTY stage (UX note J.58) — the lane keeps its
   * header, its `0` chip and its drop target either way. Passed straight to
   * `ui-kit`'s `KanbanColumn.emptyMessage`; the copy is the caller's.
   */
  emptyMessage?: ReactNode
  /**
   * Screen-reader text for the lane's count chip — e.g. `"18 tasks"`. The lane
   * announces its NAME and its COUNT together (UX K.69); the caller owns the
   * record noun. Omit and the count stays visual-only.
   */
  countLabel?: string
  /** Raw Tailwind utility classes merged onto this column — see `uiConfig.kanbanCard.columnClassName`. Omit → the shared `KanbanColumn` default width. */
  className?: string
  children?: ReactNode
}

/**
 * KanbanColumnView — a stage lane over `@fams/ui-kit`'s `KanbanColumn`
 * (chrome: title, count, drop target, pinning, drag painting). [tier-2 internal]
 *
 * The stage's blueprint `color` is runtime DATA (like `ReadColor`), so it's
 * threaded through as `accentColor` — never a hardcoded value (Rule 2).
 *
 * **Pinning** (Figma target 11, `33534:43315` "Pin Column"). The glyph used to
 * be rendered unconditionally and wired to nothing; it is now a real toggle.
 * Its behaviour is the designer's own, from that section's Dev Notes:
 * - `33534:45589` — "When the user hovers over a Column Status, a pin icon will
 *   appear. Clicking the pin icon will pin that column to the first position,
 *   regardless of its current location." So pinning HOISTS the lane to the
 *   front of the board (`move-rules.ts`'s `orderStagesByPinned`), and the
 *   control is hover-revealed. Hover-reveal alone would be a hover-only
 *   affordance, so the control is also revealed on keyboard focus and stays
 *   permanently visible once the lane IS pinned — a pinned lane must be able to
 *   show its own state without a pointer.
 * - `33534:45590` — "A vertical line will act as a separator between pinned and
 *   unpinned columns." → `pinnedSeparator`.
 * - `33534:44660` — "Horizontal scrolling will be applied to all columns
 *   together… no separate behavior where pinned columns remain fixed… This is
 *   to prevent multiple scrollbars in smaller viewports." The stated CONCERN is
 *   honoured (a sticky lane inside the board's single scroller adds no second
 *   scrollbar) but the literal instruction is not: `ui-kit`'s `pinned` also
 *   sticks the lane to the scroller's inline start, because a pin that scrolls
 *   away with everything else does nothing at all once the board is wider than
 *   the viewport — which is the case this design is for. Flagged to the
 *   designer rather than silently dropped.
 *
 * **Drag painting.** `canDropCard` is the caller's ONE status-workflow
 * predicate; `KanbanColumn` paints from it. A valid lane gets a tint + stroke
 * in the stage colour and a pill naming the transition (the destination stage
 * — the transition's only variable part, since the source is the card's own
 * lane); an invalid lane gets a near-white body and the literal
 * `DENIED_DROP_MESSAGE`. Both are decoration: the denial is ANNOUNCED once, on
 * the terminal event, by `KanbanView` through `announce-denied.ts`. Painting
 * announces nothing — see that file for why a second voice cannot work.
 */
export function KanbanColumnView({
  stage,
  count,
  canDropCard,
  pinned = false,
  pinnedSeparator = false,
  onTogglePin,
  pinDisabledReason,
  emptyMessage,
  countLabel,
  className,
  children,
}: KanbanColumnViewProps) {
  const pinLabel = pinned ? `Unpin column ${stage.label}` : `Pin column ${stage.label}`
  const PinGlyph = pinned ? PinOff : Pin

  return (
    <KanbanColumn
      id={stage.id}
      title={stage.label}
      count={count}
      accentColor={stage.color}
      canDropCard={canDropCard}
      pinned={pinned}
      pinnedSeparator={pinnedSeparator}
      emptyMessage={emptyMessage}
      className={className}
      // The stage name is an `h3` under the lens's own `h2` (UX K.68) and the
      // lane is a labelled group naming itself and its count (UX K.69).
      headingLevel={3}
      countLabel={countLabel}
      validDropLabel={stage.label}
      invalidDropMessage={DENIED_DROP_MESSAGE}
      headerEnd={
        onTogglePin ? (
          <IconControl tip={pinDisabledReason ?? pinLabel} name={pinLabel}>
            <button
              type="button"
              aria-pressed={pinned}
              // `aria-disabled`, not `disabled`: a refused pin must stay
              // focusable so its tooltip can explain WHY (UX note B.12 —
              // "refused with a tooltip, not silently no-op"); a `disabled`
              // button receives no pointer or focus events and the explanation
              // would be unreachable.
              aria-disabled={pinDisabledReason ? true : undefined}
              onClick={() => {
                if (pinDisabledReason) return
                onTogglePin(stage.id)
              }}
              // Hover-revealed per Dev Note 33534:45589, but ALSO revealed on
              // focus and permanently visible while pinned — a state the user
              // must be able to see and reach without a pointer.
              className={[
                'flex size-6 items-center justify-center rounded-xs opacity-0 outline-none transition-opacity',
                'group-hover/kanban-column:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring',
                pinDisabledReason ? 'cursor-not-allowed text-muted-foreground' : '',
                pinned ? 'bg-primary/10 text-primary opacity-100' : 'hover:bg-muted',
              ].join(' ')}
            >
              <PinGlyph className="size-4" aria-hidden="true" />
            </button>
          </IconControl>
        ) : undefined
      }
    >
      {children}
    </KanbanColumn>
  )
}

KanbanColumnView.displayName = 'KanbanColumnView'
