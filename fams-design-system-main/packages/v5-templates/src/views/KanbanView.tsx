import { useMemo, useState, type ReactNode } from 'react'
import {
  buildPipelineModuleData,
  compileFieldSet,
  type EntityConfig,
  type EntityRecord,
  type PipelineStage,
} from '@fams/v5-composer'
import {
  DEFAULT_RECORD_NOUN,
  RecordLensFrame,
  RecordViewEmptyState,
  resolveEmptyCause,
  type RecordLensStateProps,
} from './RecordViewStates'
import { cn } from '../lib/cn'
import { RecordCountRow } from './RecordCountRow'
import { GroupByMenuButton, type GroupByMenuOption, type GroupByOrder } from './GroupByMenuButton'
import { KanbanBoardRegion } from './kanban/KanbanBoardRegion'
import { KanbanLanes } from './kanban/KanbanLanes'
import { groupCardsByColumnValue, groupCardsByStage, type CanMove } from './kanban/kanban-model'
import { orderStagesByPinned, togglePinned } from './kanban/move-rules'
import { useKanbanMoves } from './kanban/use-kanban-moves'
import { DEFAULT_KANBAN_DISPLAY_MODE, type KanbanDisplayMode } from './kanban/kanban-display'

/**
 * The sentinel `GroupByMenuOption.key` naming the board's REAL pipeline-stage
 * lanes (full drag-and-drop, `uiConfig.statusList` order) — as opposed to
 * every other offered grouping, which is a DISPLAY-only regroup by an
 * arbitrary column's value (`kanban-model.ts`'s `groupCardsByColumnValue`).
 * `groupByDefaultKey` defaults to this, so a board wired with `groupByOptions`
 * and no explicit default still opens on its normal stage lanes, and `Reset`
 * always lands back on them (SPEC Addendum AC-6.2's "Reset restores the
 * default grouping" ruling, applied to Kanban the same way it already applies
 * to the hybrid list's own Group By control in `hybrid/MapHybridView.tsx`).
 */
export const KANBAN_STATUS_GROUP_KEY = 'status'

/**
 * How many lanes may be pinned at once, and the refusal copy. Pinned lanes are
 * sticky, so an unbounded pin count would eat the whole board width and leave
 * nothing to scroll — two is the cap that still fits at 1280 (UX note B.12).
 * Defined beside the lanes that enforce them; re-exported here because this is
 * the public surface callers already import them from.
 */
export { MAX_PINNED_COLUMNS, PIN_LIMIT_REASON } from './kanban/KanbanLanes'

export interface KanbanViewProps extends RecordLensStateProps {
  /** Pipeline module config — stages come from `uiConfig.statusList`, cards from `kanbanCard`. */
  config: EntityConfig
  /** Records to lay out across the stage lanes. */
  records: EntityRecord[]
  /**
   * Guards every move (drag OR the card's keyboard "Move to stage" menu).
   * Wire it to the rule evaluator, e.g.
   * `allowedTransitions(rules, user, record).includes(toStage)`. Gates
   * whether a resolved move actually COMMITS (i.e. whether `onMove` fires) —
   * `ui-kit`'s `KanbanCard` computes its "Move to…" menu options from each
   * `KanbanColumn`'s static `canDrop` (a whole-column boolean, not a function
   * of the specific card/record), so a `canMove` denial no longer hides that
   * menu option; it denies the move if selected instead — surfaced via
   * `onMoveDenied` (see below) rather than a silent no-op. See
   * `kanban/KanbanColumnView.tsx`'s docblock for the same trade-off on the
   * pointer-drag path.
   */
  canMove?: CanMove
  /** Fires once a legal move resolves — `(recordId, fromStage, toStage)`. */
  onMove?: (recordId: string, fromStage: string, toStage: string) => void
  /**
   * Fires when a drag OR the keyboard "Move to…" menu resolves to a move
   * that `canMove` denies — `(recordId, fromStage, toStage)`. NOT fired for
   * an unknown destination or a same-stage no-op (those are silent ignores,
   * not denials — see `kanban/kanban-model.ts`'s `isMoveDenied`). Wire this
   * to a toast, a shake animation, etc.
   *
   * DEFAULT UX (chosen here pending broader design review — see file header):
   * when this prop is omitted, `KanbanView` announces the denial itself via
   * `@atlaskit/pragmatic-drag-and-drop-live-region`'s `announce` — a polite
   * (`role="status"`, the library's own deliberate choice — NOT assertive),
   * non-blocking, dependency-free screen-reader message. ui-kit's competing
   * optimistic "Moved…" announce is suppressed at the source via
   * `KanbanBoardProps.formatMoveAnnouncement` (see `formatMoveAnnouncement`
   * below), so this message is the only one made. The design system deliberately
   * carries no toast dependency; apps opt into a toast (or any richer
   * feedback) by providing this callback instead.
   */
  onMoveDenied?: (recordId: string, fromStage: string, toStage: string) => void
  /** Card click — opens the record (detail / hybrid). */
  onCardClick?: (recordId: string) => void
  /**
   * Card-media mode. `'data'` is the toolbar's "Data-only view" state — the
   * cover thumbnail is dropped, the board shape is untouched. Controlled by
   * the caller so the choice can be persisted per view (`ViewState.
   * displayMode`); defaults to `'image'`.
   */
  displayMode?: KanbanDisplayMode
  /**
   * Stage ids currently pinned, in pin order. Pinned lanes are hoisted to the
   * front of the board and stick to its inline start. Controlled by the caller
   * so the choice is sticky per view (`ViewState.pinnedColumns`).
   */
  pinnedStages?: readonly string[]
  /**
   * Fires with the next pinned-id list when a lane's pin control is used. Omit
   * to render no pin control at all (a board whose owner cannot persist the
   * choice must not offer it).
   */
  onPinnedStagesChange?: (pinnedStageIds: string[]) => void
  /**
   * The board's ONE flat selection set (UX note G.45): ids of selected cards
   * across EVERY column, so a bulk action over cards from three stages is one
   * action. Omit (together with `onSelectedIdsChange`) and no card renders a
   * checkbox — there is deliberately no per-column selection store.
   */
  selectedIds?: readonly string[]
  onSelectedIdsChange?: (ids: string[]) => void
  /**
   * Builds the shared hover-revealed `…` options control for a card. Supplied
   * by `ModuleView` from `uiConfig.rowActions`, so List rows, Hybrid cards and
   * Kanban cards all render the SAME menu component (the designer wrote one
   * rule — `INTERACTIONS.md`). Omit for no card options menu.
   */
  renderCardActions?: (recordId: string, recordLabel: string) => ReactNode
  /**
   * Copy for the muted in-column line an EMPTY stage shows (UX note J.58).
   * Defaults to "No {recordNoun.many}". The lane keeps its header, its `0` chip
   * and its drop target regardless — this is only the line inside it.
   */
  emptyStageMessage?: string
  emptyState?: React.ReactNode
  className?: string

  /**
   * Group By popover options (SPEC Addendum AC-6.1..6.4 — the SAME control,
   * options and Reset-to-default contract `hybrid/MapHybridView.tsx`'s
   * `RecordMapListToolbar` already offers for the hybrid list, generalized
   * to Kanban lanes). Config-driven: omit entirely for a board with no
   * Group By control at all (every existing caller, unchanged). One entry's
   * `key` MUST equal `groupByDefaultKey` (defaulting to
   * `KANBAN_STATUS_GROUP_KEY`) — that entry's grouping is the board's real
   * pipeline-stage lanes with full drag-and-drop; every OTHER option groups
   * lanes by that column's literal value instead (a DISPLAY regroup, no move
   * semantics — dragging a card between e.g. Severity lanes is not a status
   * transition, so every lane rejects drops while a non-status grouping is
   * active, same as a genuinely denied move elsewhere in this view).
   */
  groupByOptions?: GroupByMenuOption[]
  /** Restored by the popover's `Reset`. @default `KANBAN_STATUS_GROUP_KEY` ('status') */
  groupByDefaultKey?: string
  /** Controlled active grouping key. Uncontrolled (internal state, seeded from `groupByDefaultKey`) when omitted. */
  groupBy?: string
  onGroupByChange?: (value: string) => void
}

/**
 * KanbanView — the blueprint-driven pipeline board. [tier-2 pattern]
 *
 * Stages derive from `statusList`, cards from `deriveCard` (fields rendered by
 * the FieldRegistry read renderers, task 2.2). Drag-and-drop is `@fams/ui-kit`'s
 * `KanbanBoard`/`KanbanColumn`/`KanbanCard` (`@atlaskit/pragmatic-drag-and-drop`
 * under the hood) — this view composes the real ui-kit composite instead of
 * running its own parallel DnD wiring (the former KANBAN-DND gap, now closed).
 *
 * `KanbanBoard` reports every completed, legal drag as `(cardId,
 * fromColumnId, toColumnId, toIndex)`. `toIndex` (position within the
 * destination stage) has no meaning for this app — a pipeline stage has no
 * ordering within it — so it's discarded once translated through
 * `resolveMove` (which also re-validates the destination and applies
 * `canMove`) into this view's own 3-arg `onMove(recordId, fromStage,
 * toStage)` contract; that public signature is unchanged by this migration.
 *
 * Accessibility: each card carries `ui-kit`'s built-in, tested "Move to…"
 * menu (labeled "Move to stage" here) as the keyboard-equivalent path —
 * `KanbanCardView` no longer hand-rolls one.
 *
 * Denied-move feedback: a `canMove` denial defaults to a POLITE
 * (`role="status"`) live-region announcement (see `onMoveDenied` below)
 * rather than a silent no-op, made through `kanban/announce-denied.ts`'s
 * shared `announceDenied`. ui-kit's own optimistic "Moved…" success announce
 * is suppressed for any move this view doesn't commit, via the board's
 * `formatMoveAnnouncement` hook (see below) — a root-cause fix that replaced
 * an earlier defer-a-macrotask race workaround. This is a UX default CHOSEN HERE (no toast/shake decision
 * has come back from design) — pending broader UX review; revisit if/when
 * that review lands a different pattern.
 */
export function KanbanView({
  config,
  records,
  canMove,
  onMove,
  onMoveDenied,
  onCardClick,
  displayMode = DEFAULT_KANBAN_DISPLAY_MODE,
  pinnedStages,
  onPinnedStagesChange,
  selectedIds,
  onSelectedIdsChange,
  renderCardActions,
  emptyStageMessage,
  recordNoun = DEFAULT_RECORD_NOUN,
  totalCount,
  isFiltered = false,
  onClearFilters,
  error,
  onRetry,
  onCreateRecord,
  emptyState,
  className,
  groupByOptions,
  groupByDefaultKey = KANBAN_STATUS_GROUP_KEY,
  groupBy: groupByProp,
  onGroupByChange,
}: KanbanViewProps) {
  const compiled = useMemo(() => compileFieldSet(config), [config])
  const data = useMemo(() => buildPipelineModuleData(config, records), [config, records])

  // Group By (SPEC Addendum AC-6.1..6.4, generalized to Kanban) — same
  // controlled-if-supplied / internal-otherwise pattern `hybrid/
  // MapHybridView.tsx`'s own Group By state uses. Only active when the
  // caller actually wired `groupByOptions` (every existing caller omits it
  // and keeps today's stage-only lanes, unconditionally).
  const [internalGroupBy, setInternalGroupBy] = useState<string | undefined>(undefined)
  const groupBy = groupByOptions?.length ? (groupByProp ?? internalGroupBy ?? groupByDefaultKey) : groupByDefaultKey
  const setGroupBy = (next: string) => {
    if (groupByProp === undefined) setInternalGroupBy(next)
    onGroupByChange?.(next)
  }
  const isStatusGrouping = groupBy === groupByDefaultKey

  // A non-status grouping's lane order/labels — the SAME convention
  // `MapHybridView`'s own `groupMeta` uses: a SingleSelect column's authored
  // `listValues` rank known values, anything unranked sorts alphabetically
  // after them (`kanban-model.ts`'s `groupCardsByColumnValue`).
  const groupColMeta = useMemo(() => {
    if (isStatusGrouping) return undefined
    const order = new Map<string, number>()
    const labels = new Map<string, string>()
    const col = config.systemcolumns.find((c) => c.col === groupBy)
    ;(col?.listValues ?? []).forEach((value, i) => order.set(value, i))
    return { order, labels, colLabel: col?.name ?? groupBy }
  }, [isStatusGrouping, groupBy, config])

  const statusGrouped = useMemo(() => groupCardsByStage(data.stages, data.cards), [data])
  const virtualGrouped = useMemo(() => {
    if (isStatusGrouping || !groupColMeta) return []
    return groupCardsByColumnValue(
      data.cards,
      groupBy,
      groupColMeta.order,
      (value) => groupColMeta.labels.get(value) ?? (value || `No ${groupColMeta.colLabel}`),
    )
  }, [isStatusGrouping, groupColMeta, data.cards, groupBy])
  const rawGrouped = isStatusGrouping ? statusGrouped : virtualGrouped
  /*
   * ORDER · WITHIN GROUPS (pipeline-actions reference recording): the Group By
   * popup's segmented row re-orders the LANES of the active grouping —
   * `default` keeps the natural order (statusList / listValues rank), `asc`/
   * `desc` sort lanes by label, `count` sorts by lane size (desc). Display
   * state local to the board, reset alongside the popup's own Reset.
   */
  const [groupOrder, setGroupOrder] = useState<GroupByOrder>('default')
  const grouped = useMemo(() => {
    if (groupOrder === 'default') return rawGrouped
    const sorted = [...rawGrouped]
    if (groupOrder === 'count') sorted.sort((a, b) => b.cards.length - a.cards.length)
    else
      sorted.sort(
        (a, b) => a.stage.label.localeCompare(b.stage.label) * (groupOrder === 'asc' ? 1 : -1),
      )
    return sorted
  }, [rawGrouped, groupOrder])
  const laneStages: PipelineStage[] = useMemo(() => grouped.map((g) => g.stage), [grouped])
  const knownStageIds = useMemo(() => new Set(data.stages.map((s) => s.id)), [data.stages])
  const boardColumns = useMemo(() => laneStages.map((s) => ({ id: s.id })), [laneStages])

  // Which lane a card currently sits in — the mapping the move predicate needs
  // and the only place it lives.
  const stageOfCard = useMemo(() => {
    const byId = new Map(data.cards.map((card) => [card.id, card.stageId]))
    return (cardId: string) => byId.get(cardId)
  }, [data.cards])

  // The board's whole status-workflow move machinery — one predicate, three
  // consumers, plus the denied-move announcement suppression. Extracted to
  // `kanban/use-kanban-moves.ts` (root rule 12's decompose-on-touch).
  const realMoves = useKanbanMoves({
    stages: data.stages,
    stageOfCard,
    knownStageIds,
    canMove,
    onMove,
    onMoveDenied,
  })
  // A non-status grouping's lanes carry no move semantics (SPEC Addendum
  // AC-6.1..6.4 doc comment on `groupCardsByColumnValue`) — every lane
  // rejects every drop rather than silently reinterpreting a drag as a
  // stage change, so cards stay inspectable/selectable but not draggable
  // BETWEEN these display-only lanes.
  const noDropByStage = useMemo(() => new Map(laneStages.map((s) => [s.id, () => false])), [laneStages])
  const { canDropCardByStage, getAllowedStageIds, handleCardMove, formatMoveAnnouncement, formatBlockedDropAnnouncement } =
    isStatusGrouping
      ? realMoves
      : {
          canDropCardByStage: noDropByStage,
          getAllowedStageIds: () => [] as string[],
          handleCardMove: () => {},
          formatMoveAnnouncement: realMoves.formatMoveAnnouncement,
          formatBlockedDropAnnouncement: realMoves.formatBlockedDropAnnouncement,
        }

  const pinnedIds = useMemo(() => pinnedStages ?? [], [pinnedStages])
  // Pinned lanes are hoisted to the FRONT of the board, each group keeping its
  // configured order (Figma "Pin Column" Dev Note `33534:45589`).
  const ordered = useMemo(() => orderStagesByPinned(laneStages, pinnedIds), [laneStages, pinnedIds])
  const pinnedCount = ordered.filter((entry) => entry.pinned).length
  const cardsByStage = useMemo(() => new Map(grouped.map((g) => [g.stage.id, g.cards])), [grouped])

  // ONE flat set, read straight off the caller's array — never a per-column
  // map, so "3 selected" can span three lanes (UX note G.45).
  const selected = useMemo(() => new Set(selectedIds ?? []), [selectedIds])
  const toggleSelected = onSelectedIdsChange
    ? (cardId: string, next: boolean) => {
        const current = selectedIds ?? []
        onSelectedIdsChange(next ? [...current, cardId] : current.filter((id) => id !== cardId))
      }
    : undefined

  const handleTogglePin = (stageId: string) => {
    onPinnedStagesChange?.(togglePinned(pinnedIds, stageId))
  }

  // UX J.57 + J.58: the STAGE COLUMNS are the content, so a filtered-to-zero
  // board keeps every lane (each with its header, `0` chip and drop target) and
  // gets a hint above them — the same ruling the calendar lens applies to its
  // 42-cell grid. Only a load ERROR or a genuinely empty module replaces it.
  const cause = resolveEmptyCause(error, isFiltered)
  if (error != null || data.stages.length === 0 || (data.cards.length === 0 && !isFiltered)) {
    if (cause === 'no-data' && emptyState) return emptyState
    return (
      <RecordViewEmptyState
        cause={cause}
        noun={recordNoun}
        error={error}
        onRetry={onRetry}
        onClearFilters={onClearFilters}
        onCreateRecord={onCreateRecord}
      />
    )
  }

  const board = (
    <KanbanBoardRegion
      boardKey={`kanban:${config.code}`}
      label={`${config.name} board`}
      columns={boardColumns}
      onCardMove={handleCardMove}
      formatMoveAnnouncement={formatMoveAnnouncement}
      formatBlockedDropAnnouncement={formatBlockedDropAnnouncement}
      getAllowedColumnIds={getAllowedStageIds}
      className={cn(className, config.uiConfig.kanbanCard?.boardClassName)}
    >
      <KanbanLanes
        ordered={ordered}
        pinnedCount={pinnedCount}
        cardsByStage={cardsByStage}
        compiled={compiled}
        canDropCardByStage={canDropCardByStage}
        displayMode={displayMode}
        recordNoun={recordNoun}
        emptyStageMessage={emptyStageMessage}
        onTogglePin={onPinnedStagesChange ? handleTogglePin : undefined}
        onCardClick={onCardClick}
        selectedIds={selected}
        onSelectedChange={toggleSelected}
        renderCardActions={renderCardActions}
        columnClassName={config.uiConfig.kanbanCard?.columnClassName}
      />
    </KanbanBoardRegion>
  )

  return (
    <section data-slot="kanban-view" className="flex h-full min-h-0 min-w-0 flex-col gap-2">
      {/* The lens's own region label, under the page `h1` and above the lanes'
          `h3` stage names — one unbroken, sequential outline (UX K.68). */}
      <h2 className="sr-only">{`${config.name} board`}</h2>
      {(typeof totalCount === 'number' && !config.uiConfig.hideResultsCount) || groupByOptions?.length ? (
        <div className="flex items-center justify-between gap-2">
          {typeof totalCount === 'number' && !config.uiConfig.hideResultsCount ? (
            <RecordCountRow slot="kanban-count-row" shown={data.cards.length} total={totalCount} noun={recordNoun} />
          ) : (
            <span />
          )}
          {groupByOptions?.length ? (
            <GroupByMenuButton
              options={groupByOptions}
              value={groupBy}
              defaultValue={groupByDefaultKey}
              onChange={setGroupBy}
              order={groupOrder}
              onOrderChange={setGroupOrder}
            />
          ) : null}
        </div>
      ) : null}
      {/* `h-full` on the board means it needs a bounded flex child to live in
          — the count row above it is the only other row, so the board takes
          whatever is left (this is what keeps A.3's single-scroller geometry). */}
      {/* `min-w-0` is load-bearing on BOTH this wrapper and the section: the
          board is the lens's horizontal scroller, and a flex child's automatic
          minimum size is its CONTENT width — without it the 6×320px board
          widens its ancestors and the PAGE gets a horizontal scrollbar
          (UX A.1), which is exactly what regressed when the count row's
          section was introduced around the board. */}
      <div className="min-h-0 min-w-0 flex-1">
        <RecordLensFrame
          show={isFiltered && data.cards.length === 0}
          onClearFilters={onClearFilters}
          message={`No ${recordNoun.many} match the current search and filters.`}
        >
          {board}
        </RecordLensFrame>
      </div>
    </section>
  )
}

KanbanView.displayName = 'KanbanView'
