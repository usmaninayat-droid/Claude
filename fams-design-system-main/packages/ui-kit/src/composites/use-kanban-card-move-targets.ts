import { announce } from '@atlaskit/pragmatic-drag-and-drop-live-region'
import { kanbanNodeLabel, useKanbanBoardContext, useKanbanColumnId } from './kanban-context'

/** One reachable destination for a card's keyboard move path — generic, no business vocabulary (root rule 10). */
export interface KanbanCardMoveTarget {
  /** Destination column id — the same id `KanbanBoardProps.onCardMove` expects as `toColumnId`. */
  id: string
  /** The destination column's own label, resolved to a plain string. */
  title: string
  /** Commits the move and makes the same board announcement `KanbanCard`'s own "Move to…" menu would. */
  onSelect: () => void
}

/**
 * useKanbanCardMoveTargets — the reachable-lane list behind `KanbanCard`'s
 * built-in "Move to…" menu, exposed so a caller supplying its OWN `actions`
 * menu can still offer a keyboard move path.
 *
 * Why this exists: `KanbanCard` renders exactly ONE overflow trigger — the
 * caller's `actions` when supplied, else its own built-in "Move to…" `⋮`
 * (see that component's docblock on the double-overflow-menu bug this
 * guards against). That means a caller who supplies `actions` (e.g.
 * `@fams/v5-templates`' `RecordActionsMenu`) is the ONLY place left that can
 * expose a move path for that card — so it needs the same reachable-column
 * list and the same commit/announce behavior `KanbanCard` itself would have
 * used, without duplicating that logic per caller. This hook is that seam:
 * `KanbanCard` and any external `actions` menu both call it and therefore can
 * never disagree about which lanes are reachable or how a move is announced.
 *
 * Must be called from a component mounted inside a `KanbanCard` (i.e. inside
 * a `KanbanBoard`'s column tree) to return anything — outside that tree (for
 * example `RecordActionsMenu` also renders for plain list/hybrid rows with no
 * kanban board at all) it safely returns `[]`, same as a card with no board
 * context or no other reachable column.
 *
 * `cardId` must match the `KanbanCard` this menu belongs to. `cardLabel`
 * (optional, defaults to `cardId`) is what the move announcement names the
 * card as — pass the same label the caller already has for that record.
 */
export function useKanbanCardMoveTargets(cardId: string, cardLabel?: string): KanbanCardMoveTarget[] {
  const boardCtx = useKanbanBoardContext()
  const fromColumnId = useKanbanColumnId()
  if (!boardCtx || !fromColumnId) return []
  const label = cardLabel ?? cardId

  return Array.from(boardCtx.registry.entries())
    .filter(
      ([columnId, entry]) =>
        columnId !== fromColumnId && entry.canDrop !== false && entry.canDropCard?.(cardId) !== false,
    )
    .map(([columnId, entry]) => {
      const toColumnLabel = kanbanNodeLabel(entry.title, columnId)
      return {
        id: columnId,
        title: toColumnLabel,
        onSelect: () => {
          const toIndex = entry.count
          boardCtx.onCardMove?.(cardId, fromColumnId, columnId, toIndex)
          const defaultMessage = `Moved ${label} to ${toColumnLabel}.`
          const message = boardCtx.formatMoveAnnouncement
            ? boardCtx.formatMoveAnnouncement({
                cardId,
                fromColumnId,
                toColumnId: columnId,
                toIndex,
                cardLabel: label,
                toColumnLabel,
                defaultMessage,
              })
            : defaultMessage
          if (message) announce(message)
        },
      }
    })
}
