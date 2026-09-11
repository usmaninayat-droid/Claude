import { useMemo, useRef } from 'react'
import type { KanbanBlockedDrop, KanbanMoveAnnouncement } from '@fams/ui-kit'
import type { PipelineStage } from '@fams/v5-composer'
import { isMoveDenied, resolveMove, type CanMove } from './kanban-model'
import { makeAllowedStageIds, makeCanDropCard } from './move-rules'

export interface UseKanbanMovesOptions {
  stages: PipelineStage[]
  /** Which lane a card currently sits in — the mapping the move predicate needs. */
  stageOfCard: (cardId: string) => string | undefined
  knownStageIds: Set<string>
  canMove?: CanMove
  onMove?: (recordId: string, fromStage: string, toStage: string) => void
  onMoveDenied?: (recordId: string, fromStage: string, toStage: string) => void
}

export interface KanbanMoves {
  /** Per-lane bound status-workflow predicate — the ONE evaluator, three consumers. */
  canDropCardByStage: Map<string, (cardId: string) => boolean>
  /** Asked ONCE per drag, so every lane paints from a single evaluation. */
  getAllowedStageIds: (cardId: string) => string[]
  handleCardMove: (cardId: string, fromStageId: string, toStageId: string) => void
  formatMoveAnnouncement: (announcement: KanbanMoveAnnouncement) => string | null
  /**
   * The SAME voice for the other half of a refusal: a drop that landed on a
   * lane the workflow already painted invalid, which resolves no move at all
   * and so never reaches `handleCardMove` (UX F.35 / L.74). Both halves speak
   * `deniedMoveMessage`, so the two refusal paths are indistinguishable to a
   * screen-reader user — as they are to a sighted one.
   */
  formatBlockedDropAnnouncement: (drop: KanbanBlockedDrop) => string | null
}

/**
 * The ONE denial sentence. Both refusal paths — a drop that resolves and is
 * then refused by the dragEnd re-check, and a drop straight onto a lane the
 * painting already marked invalid — build their message here so they can
 * never drift into two different-sounding refusals.
 */
export function deniedMoveMessage(toStageLabel: string): string {
  return `Move not allowed: this card can't move to ${toStageLabel}.`
}

/**
 * use-kanban-moves — the board's status-workflow move machinery, extracted
 * from `KanbanView` (root rule 12's decompose-on-touch; that file was at its
 * 300-line budget). Behaviour is unchanged — this is a move, not a rewrite.
 *
 * The ONE status-workflow predicate is bound per destination stage
 * (`move-rules.ts`) and has three consumers, all reaching it through
 * `canDropCardByStage` so they cannot drift:
 *
 *  1. the pointer-drag painting — via `getAllowedStageIds`, resolved by the
 *     board ONCE at drag start (no per-lane, per-dragover call),
 *  2. every card's keyboard "Move to…" menu — still per lane, read off
 *     `ui-kit`'s board column registry, and
 *  3. the commit path — `handleCardMove`'s dragEnd re-check.
 *
 * `formatMoveAnnouncement` is the SINGLE VOICE for every move's outcome, on
 * both the keyboard "Move to…" path and the pointer-drag path. `ui-kit` calls
 * it synchronously right after `handleCardMove` returns, in the same stack,
 * so the ref that handler just set IS this move's outcome: read rather than
 * re-derived, so the announcement can never disagree with what happened (and
 * `canMove`, which may be a real rule-engine call, runs once). A committed
 * move returns the default "Moved X to Y."; a refused one returns the DENIAL
 * text, which then lands in the very same live region — never a denial in one
 * region and a stale success in another.
 *
 * KNOWN LIMIT (carried): this only covers what the view can see. An app whose
 * `onMove` accepts here and only then has a guarded write reject has already
 * been counted as committed by the time ui-kit asks.
 */
export function useKanbanMoves({
  stages,
  stageOfCard,
  knownStageIds,
  canMove,
  onMove,
  onMoveDenied,
}: UseKanbanMovesOptions): KanbanMoves {
  const canDropCardByStage = useMemo(() => {
    const map = new Map<string, (cardId: string) => boolean>()
    for (const stage of stages) {
      map.set(stage.id, makeCanDropCard(stage.id, stageOfCard, knownStageIds, canMove))
    }
    return map
  }, [stages, stageOfCard, knownStageIds, canMove])

  const getAllowedStageIds = useMemo(() => makeAllowedStageIds(canDropCardByStage), [canDropCardByStage])

  // What the LAST `onCardMove` actually did, recorded for the
  // `formatMoveAnnouncement` call ui-kit makes immediately afterwards in the
  // same synchronous stack. A ref, not state: a within-stack handoff between
  // two callbacks, never rendered.
  //
  // It carries the DENIAL TEXT, not just a committed flag, because the
  // announcement and the outcome must be the same decision. Handing ui-kit
  // the denial to say — rather than announcing it separately here and
  // suppressing ui-kit's — puts success and refusal in the SAME live region,
  // so a refused move can never end up sitting next to a leftover success.
  const lastMoveRef = useRef<{ committed: boolean; deniedMessage: string | null }>({
    committed: false,
    deniedMessage: null,
  })

  const stageLabel = (stageId: string) => stages.find((s) => s.id === stageId)?.label ?? stageId

  const handleCardMove = (cardId: string, fromStageId: string, toStageId: string) => {
    lastMoveRef.current = { committed: false, deniedMessage: null }
    const move = resolveMove(cardId, fromStageId, toStageId, knownStageIds, canMove)
    // The dragEnd RE-CHECK. A drop can resolve through a CARD sitting inside a
    // lane the painting marked invalid, so the terminal path never trusts the
    // set captured at drag start: it re-invokes the SAME bound predicate that
    // painted the lanes, on the destination the drop actually resolved to.
    const allowedNow = canDropCardByStage.get(toStageId)?.(cardId) ?? false
    if (move && allowedNow) {
      lastMoveRef.current = { committed: true, deniedMessage: null }
      onMove?.(move.cardId, move.fromStage, move.toStage)
      return
    }
    if (!isMoveDenied(cardId, fromStageId, toStageId, knownStageIds, canMove)) return
    if (onMoveDenied) {
      // The caller owns the outcome's voice — say nothing on its behalf.
      onMoveDenied(cardId, fromStageId, toStageId)
      return
    }
    // Default UX: a polite, dependency-free screen-reader announcement — no
    // toast in the DS. Recorded rather than announced HERE: ui-kit's board
    // asks for the announcement synchronously right after this returns and
    // owns the live region the drop is narrated in (UX notes F.35 / L.74).
    lastMoveRef.current = { committed: false, deniedMessage: deniedMoveMessage(stageLabel(toStageId)) }
  }

  // A drop onto a lane the painting already marked invalid. ui-kit resolves no
  // move for it (nothing to commit, so `handleCardMove` is never called) and
  // hands the refusal here to be voiced — in the same live region, with the
  // same sentence, as a refusal decided by the re-check above.
  const formatBlockedDropAnnouncement = ({ cardId, fromColumnId, toColumnId }: KanbanBlockedDrop) => {
    if (onMoveDenied) {
      // The caller owns the outcome's voice — say nothing on its behalf.
      onMoveDenied(cardId, fromColumnId, toColumnId)
      return null
    }
    return deniedMoveMessage(stageLabel(toColumnId))
  }

  const formatMoveAnnouncement = ({ defaultMessage }: KanbanMoveAnnouncement): string | null =>
    lastMoveRef.current.committed ? defaultMessage : lastMoveRef.current.deniedMessage

  return {
    canDropCardByStage,
    getAllowedStageIds,
    handleCardMove,
    formatMoveAnnouncement,
    formatBlockedDropAnnouncement,
  }
}
