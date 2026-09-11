import type { PipelineStage } from '@fams/v5-composer'
import type { CanMove } from './kanban-model'

/**
 * The ONE status-workflow predicate for a kanban board. [tier-2 internal]
 *
 * The designer's rule is "status workflow config determines allowed
 * transitions", and it has THREE consumers that must never disagree:
 *
 * 1. the pre-emptive per-column painting during a pointer drag (valid lanes
 *    tinted + stroked with a transition pill, invalid lanes near-white with a
 *    refusal message),
 * 2. every card's keyboard "Move to…" menu, whose offered set must exclude the
 *    lanes the rules deny, and
 * 3. the commit path, which is the only one allowed to announce a denial.
 *
 * All three call {@link canCardEnterStage} — the predicate is factored here so
 * the rule logic exists exactly once. Consumers 1 and 2 both reach it through
 * {@link makeCanDropCard}, which is handed to `ui-kit`'s
 * `KanbanColumn.canDropCard` (the column paints from it; the board registry
 * republishes it to every card's move menu). Consumer 3 reaches it through
 * `kanban-model.ts`'s `resolveMove`/`isMoveDenied`, which apply the same
 * `canMove` they were given.
 *
 * Everything here is stage-NAME agnostic: stages arrive as data
 * (`uiConfig.statusList`), so the identical code drives a six-stage incident
 * register and a six-stage pipeline with no shared vocabulary.
 */

/**
 * May `recordId` move out of `fromStage` and into `toStage`? A same-stage drop
 * is a no-op rather than a transition, and an unknown destination is not a
 * denial — both answer `false` here without being *refusals*, which is why the
 * denial-announcement decision stays in `isMoveDenied`, not this predicate.
 */
export function canCardEnterStage(
  recordId: string,
  fromStage: string,
  toStage: string,
  knownStageIds: Set<string>,
  canMove?: CanMove,
): boolean {
  if (!knownStageIds.has(toStage)) return false
  if (fromStage === toStage) return false
  if (!canMove) return true
  return canMove(recordId, fromStage, toStage)
}

/**
 * Bind the predicate for ONE destination stage, in the shape `ui-kit`'s
 * `KanbanColumn.canDropCard` takes: `(cardId) => boolean`. `stageOfCard`
 * resolves a card id to the stage it currently sits in — the board owns that
 * mapping, this module never guesses it.
 */
export function makeCanDropCard(
  toStage: string,
  stageOfCard: (cardId: string) => string | undefined,
  knownStageIds: Set<string>,
  canMove?: CanMove,
): (cardId: string) => boolean {
  return (cardId: string) => {
    const fromStage = stageOfCard(cardId)
    if (fromStage === undefined) return true
    return canCardEnterStage(cardId, fromStage, toStage, knownStageIds, canMove)
  }
}

/**
 * Lift the per-destination predicates into the shape `ui-kit`'s
 * `KanbanBoardProps.getAllowedColumnIds` takes: "which stages may this card
 * enter?", answered in ONE pass.
 *
 * This is deliberately built FROM the very same bound `makeCanDropCard`
 * functions the lanes and the "Move to…" menu use, not from a second walk of
 * the rules — so there is exactly one place `canCardEnterStage` is reached
 * from, and the drag painting, the keyboard menu and the commit path cannot
 * drift apart. The board resolves this once at drag start (and unions the
 * card's own stage in), which is what removes the per-lane, per-dragover
 * re-evaluation the earlier prop-drilled `canDropCard` painting did.
 */
export function makeAllowedStageIds(
  canDropCardByStage: ReadonlyMap<string, (cardId: string) => boolean>,
): (cardId: string) => string[] {
  return (cardId: string) => {
    const allowed: string[] = []
    for (const [stageId, canDropCard] of canDropCardByStage) {
      if (canDropCard(cardId)) allowed.push(stageId)
    }
    return allowed
  }
}

/**
 * Order stages with the pinned ones hoisted to the FRONT, each group keeping
 * its configured relative order. The designer's own rule (Figma "Pin Column"
 * Dev Note `33534:45589`): "Clicking the pin icon will pin that column to the
 * first position, regardless of its current location."
 *
 * `pinnedIds` may name stages that no longer exist in the config (a saved view
 * outliving a blueprint edit) — those are ignored rather than throwing.
 */
export function orderStagesByPinned(
  stages: PipelineStage[],
  pinnedIds: readonly string[],
): { stage: PipelineStage; pinned: boolean }[] {
  const pinnedSet = new Set(pinnedIds)
  const pinned = stages.filter((s) => pinnedSet.has(s.id)).map((stage) => ({ stage, pinned: true }))
  const rest = stages.filter((s) => !pinnedSet.has(s.id)).map((stage) => ({ stage, pinned: false }))
  return [...pinned, ...rest]
}

/** Toggle one stage in a pinned-id list, preserving the order pins were added in. */
export function togglePinned(pinnedIds: readonly string[], stageId: string): string[] {
  return pinnedIds.includes(stageId)
    ? pinnedIds.filter((id) => id !== stageId)
    : [...pinnedIds, stageId]
}
