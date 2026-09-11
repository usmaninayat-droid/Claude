import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'

/**
 * Pure, React-free translation of a completed `pragmatic-drag-and-drop` drop
 * into a `KanbanBoard` move (or `null` for a no-op) — mirrors
 * `packages/v5-templates/src/views/kanban/kanban-model.ts`'s split so the
 * trickiest logic (index math) is unit-testable without rendering anything.
 *
 * Replicates `@hello-pangea/dnd`'s `destination.index` contract exactly: the
 * index is the item's position in the destination list AFTER the dragged
 * item has been removed from its source slot. `KanbanCard`'s own drop
 * target attaches a closest-edge (top/bottom) to whichever card is under the
 * pointer; `KanbanColumn`'s drop target (used when there is no card under
 * the pointer, e.g. dropping into empty space) reports the column's current
 * card count, i.e. "append to the end".
 */

export interface KanbanDropSource {
  cardId: string
  fromColumnId: string
  index: number
}

export interface KanbanDropTargetLike {
  data: Record<string | symbol, unknown>
}

export interface KanbanCardMove {
  cardId: string
  fromColumnId: string
  toColumnId: string
  toIndex: number
}

/**
 * What a completed drop actually was. Three outcomes, not two, because a
 * refusal is NOT the same event as "nothing happened":
 *
 *  - `move`    — a legal destination resolved; the board commits it.
 *  - `blocked` — the drop landed on a lane the board can NAME but which
 *                refuses the card (`canDrop === false`, or painted `invalid`
 *                by the active drag's allowed set). Nothing may be committed,
 *                but the user aimed somewhere specific and must be told the
 *                aim was refused — the case that used to fall into the same
 *                bucket as "dropped on nothing" and get narrated as the
 *                success-flavoured `Dropped <card>.` (UX notes F.35 / L.74).
 *  - `none`    — dropped back on its own slot, or outside every lane. Nothing
 *                was attempted and nothing was refused.
 */
export type KanbanDropOutcome =
  | { kind: 'move'; move: KanbanCardMove }
  | { kind: 'blocked'; toColumnId: string }
  | { kind: 'none' }

/** Thin back-compat wrapper over {@link resolveCardDropOutcome}: the move, or `null`. */
export function resolveCardDrop(
  source: KanbanDropSource,
  dropTargets: readonly KanbanDropTargetLike[],
  knownColumnIds: ReadonlySet<string>,
): KanbanCardMove | null {
  const outcome = resolveCardDropOutcome(source, dropTargets, knownColumnIds)
  return outcome.kind === 'move' ? outcome.move : null
}

export function resolveCardDropOutcome(
  source: KanbanDropSource,
  dropTargets: readonly KanbanDropTargetLike[],
  knownColumnIds: ReadonlySet<string>,
): KanbanDropOutcome {
  if (dropTargets.length === 0) return { kind: 'none' }

  const cardTarget = dropTargets.find((t) => t.data.type === 'card' && t.data.cardId !== source.cardId)
  const columnTarget = dropTargets.find((t) => t.data.type === 'column')

  let toColumnId: string | undefined
  let toIndex: number | undefined

  if (cardTarget) {
    toColumnId = cardTarget.data.fromColumnId as string
    const edge = extractClosestEdge(cardTarget.data)
    const targetIndex = cardTarget.data.index as number
    toIndex = edge === 'bottom' ? targetIndex + 1 : targetIndex
  } else if (columnTarget) {
    toColumnId = columnTarget.data.columnId as string
    toIndex = columnTarget.data.count as number
  }

  if (toColumnId === undefined || toIndex === undefined) return { kind: 'none' }
  if (!knownColumnIds.has(toColumnId)) return { kind: 'none' }

  // A drop back on the card's OWN lane is a no-op, never a refusal — even if
  // that lane happens to be flagged blocked (it cannot refuse a card it
  // already holds), so this test comes before the blocked test.
  if (source.fromColumnId === toColumnId) {
    if (source.index < toIndex) toIndex -= 1
    if (source.index === toIndex) return { kind: 'none' }
    return { kind: 'move', move: { cardId: source.cardId, fromColumnId: source.fromColumnId, toColumnId, toIndex } }
  }

  // Only a COLUMN target carries the blocked flag. A drop that resolved
  // through a CARD is left alone deliberately: it produces a real, resolvable
  // destination, and the caller's `onCardMove` re-check is the terminal
  // authority there (it may legally accept what the paint pessimistically
  // marked invalid), so that path must keep reaching `onCardMove`.
  if (!cardTarget && columnTarget?.data.blocked === true) {
    return { kind: 'blocked', toColumnId }
  }

  return { kind: 'move', move: { cardId: source.cardId, fromColumnId: source.fromColumnId, toColumnId, toIndex } }
}
