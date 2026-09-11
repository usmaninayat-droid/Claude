import type { ReactNode } from 'react'
import {
  KanbanBoard,
  type KanbanBoardColumn,
  type KanbanBlockedDrop,
  type KanbanMoveAnnouncement,
} from '@fams/ui-kit'
import { cn } from '../../lib/cn'
import { useScrollMemory } from '../../lib/use-scroll-memory'

export interface KanbanBoardRegionProps {
  /**
   * Stable identity for this board's remembered scroll offset — typically
   * `kanban:<module code>`. Omit to disable the memory entirely.
   */
  boardKey?: string
  /** Accessible name for the scrollable region. */
  label: string
  columns: KanbanBoardColumn[]
  onCardMove: (cardId: string, fromColumnId: string, toColumnId: string, toIndex: number) => void
  formatMoveAnnouncement: (announcement: KanbanMoveAnnouncement) => string | null
  formatBlockedDropAnnouncement: (drop: KanbanBlockedDrop) => string | null
  getAllowedColumnIds: (cardId: string) => string[]
  className?: string
  children: ReactNode
}

/**
 * KanbanBoardRegion — the lens's scrollable board region: the `ui-kit`
 * `KanbanBoard` plus the two things that are about the REGION rather than
 * about the lanes inside it — its accessible-scroller semantics and its
 * remembered scroll position. [tier-2 internal]
 *
 * Extracted from `KanbanView` under root rule 12's decompose-on-touch (that
 * file was at its 300-line budget when this wave added the scroll memory).
 *
 * **Scroll memory** (UX A.5). Switching lens unmounts this view, so a board
 * the user had scrolled 400px into used to return at 0 — a fresh-page-load
 * feeling in the middle of one continuous task. `useScrollMemory` keeps the
 * offset for the session, keyed per module so two modules' boards never
 * inherit each other's position. It is deliberately NOT part of the
 * persisted `ViewState`: a pixel offset is not a saved view.
 */
export function KanbanBoardRegion({
  boardKey,
  label,
  columns,
  onCardMove,
  formatMoveAnnouncement,
  formatBlockedDropAnnouncement,
  getAllowedColumnIds,
  className,
  children,
}: KanbanBoardRegionProps) {
  const boardRef = useScrollMemory<HTMLDivElement>(boardKey)
  return (
    <KanbanBoard
      ref={boardRef}
      columns={columns}
      onCardMove={onCardMove}
      formatMoveAnnouncement={formatMoveAnnouncement}
      formatBlockedDropAnnouncement={formatBlockedDropAnnouncement}
      getAllowedColumnIds={getAllowedColumnIds}
      className={cn('min-h-0', className)}
      // The board is the only horizontal scroller on the lens, so it must be
      // reachable without a horizontal wheel: focusable, named, and therefore
      // arrow-key scrollable by the browser itself (UX note B.8).
      role="group"
      aria-label={label}
      tabIndex={0}
    >
      {children}
    </KanbanBoard>
  )
}

KanbanBoardRegion.displayName = 'KanbanBoardRegion'
