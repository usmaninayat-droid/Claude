import type { ReactNode } from 'react'
import type { CardModel, CompiledFieldSet, PipelineStage } from '@fams/v5-composer'
import type { RecordNoun } from '../RecordViewStates'
import { KanbanColumnView } from './KanbanColumnView'
import { KanbanCardView } from './KanbanCardView'
import type { KanbanDisplayMode } from './kanban-display'

/** How many lanes may be pinned at once — see `KanbanView`'s re-export. */
export const MAX_PINNED_COLUMNS = 2

/** Tooltip shown on a pin control refused by {@link MAX_PINNED_COLUMNS}. */
export const PIN_LIMIT_REASON = `Unpin a column first — at most ${MAX_PINNED_COLUMNS} columns can be pinned.`

export interface KanbanLanesProps {
  /** Stages in RENDER order, each flagged with whether it is pinned. */
  ordered: { stage: PipelineStage; pinned: boolean }[]
  /** How many of `ordered` are pinned — the separator lands on the last one. */
  pinnedCount: number
  cardsByStage: Map<string, CardModel[]>
  compiled: CompiledFieldSet
  /** Per-lane move predicate, one entry per stage id. */
  canDropCardByStage: Map<string, ((cardId: string) => boolean) | undefined>
  displayMode: KanbanDisplayMode
  recordNoun: RecordNoun
  emptyStageMessage?: string
  onTogglePin?: (stageId: string) => void
  onCardClick?: (recordId: string) => void
  /** Omit for a board with no card checkboxes at all. */
  selectedIds?: Set<string>
  onSelectedChange?: (cardId: string, next: boolean) => void
  renderCardActions?: (recordId: string, recordLabel: string) => ReactNode
  /** Raw Tailwind utility classes merged onto EVERY column — see `uiConfig.kanbanCard.columnClassName`. Omit → the shared default width. */
  columnClassName?: string
}

/**
 * KanbanLanes — the stage lanes and their cards. [tier-2 internal]
 *
 * Extracted from `KanbanView` verbatim under root rule 12's decompose-on-touch
 * (this wave added the lane a11y semantics and the count row and pushed the
 * file past its budget). Behaviour is unchanged — a move, not a rewrite. The
 * pinning arithmetic, the empty-lane copy and the per-card wiring are exactly as
 * they were; `KanbanView` still owns every piece of state and every predicate.
 */
export function KanbanLanes({
  ordered,
  pinnedCount,
  cardsByStage,
  compiled,
  canDropCardByStage,
  displayMode,
  recordNoun,
  emptyStageMessage,
  onTogglePin,
  onCardClick,
  selectedIds,
  onSelectedChange,
  renderCardActions,
  columnClassName,
}: KanbanLanesProps) {
  return (
    <>
      {ordered.map(({ stage, pinned }, position) => {
        const cards = cardsByStage.get(stage.id) ?? []
        return (
          <KanbanColumnView
            key={stage.id}
            stage={stage}
            count={cards.length}
            canDropCard={canDropCardByStage.get(stage.id)}
            pinned={pinned}
            // The rule between the pinned group and the unpinned remainder
            // (Dev Note `33534:45590`) — drawn on the LAST pinned lane.
            pinnedSeparator={pinned && position === pinnedCount - 1}
            onTogglePin={onTogglePin}
            pinDisabledReason={!pinned && pinnedCount >= MAX_PINNED_COLUMNS ? PIN_LIMIT_REASON : undefined}
            emptyMessage={emptyStageMessage ?? `No ${recordNoun.many}`}
            // The lane announces its NAME and its COUNT (UX K.69); the visible
            // chip is a bare numeral, which reads as nothing on its own.
            countLabel={`${cards.length} ${cards.length === 1 ? recordNoun.one : recordNoun.many}`}
            className={columnClassName}
          >
            {cards.map((card, index) => (
              <KanbanCardView
                key={card.id}
                card={card}
                compiled={compiled}
                index={index}
                displayMode={displayMode}
                onClick={onCardClick}
                selected={onSelectedChange ? Boolean(selectedIds?.has(card.id)) : undefined}
                onSelectedChange={onSelectedChange}
                actions={renderCardActions?.(card.id, card.ticketId ?? card.title ?? card.id)}
              />
            ))}
          </KanbanColumnView>
        )
      })}
    </>
  )
}

KanbanLanes.displayName = 'KanbanLanes'
