import type { MouseEvent, ReactNode } from 'react'
import { Checkbox, KanbanCard, type KanbanCardAvatar } from '@fams/ui-kit'
import { useDisplayName } from '@fams/v5-composer'
import type { Cell, CardModel, CompiledFieldSet } from '@fams/v5-composer'
import { CellRowLine, renderCardCell } from './kanban-card-cells'
import { extractAssigneeAvatars, groupCellRows, isDescriptionCell } from './kanban-model'
import { DEFAULT_KANBAN_DISPLAY_MODE, type KanbanDisplayMode } from './kanban-display'

export interface KanbanCardViewProps {
  card: CardModel
  compiled: CompiledFieldSet | null
  /** Position within its column — `ui-kit`'s `KanbanCard` needs this for drag/keyboard-move ordering. */
  index: number
  /**
   * The lens's display mode. `'data'` (the toolbar's "Data-only view" state,
   * frame `33534:32278`) suppresses the cover thumbnail and changes NOTHING
   * else — one card component with a media flag, never a second card. Defaults
   * to `'image'`.
   */
  displayMode?: KanbanDisplayMode
  onClick?: (cardId: string) => void
  /**
   * Selection state for the board's ONE flat selection set (UX note G.45) —
   * `undefined` means this board is not selectable and no checkbox renders.
   * The set itself lives in `ModuleView`, so a selection spanning three stages
   * is one set and one bulk action; nothing per-column is stored here.
   */
  selected?: boolean
  onSelectedChange?: (cardId: string, selected: boolean) => void
  /** The shared hover-revealed `…` options menu, built once by `ModuleView`. */
  actions?: ReactNode
  /**
   * A lens-specific control rendered at the START of the card's first badge
   * row, before the id pill — the hybrid lens's eye/visibility toggle (SPEC
   * §1.3), or the kanban board's own bulk-select checkbox when it leads
   * instead of the eye. Distinct from `selectionControl` (`KanbanCard`'s own
   * leading multi-select slot), which the bulk-selection chrome owns, so a
   * card can carry both. Omit for none (default: every other lens is
   * unaffected).
   */
  leading?: ReactNode
  /**
   * A badge rendered on its OWN full-width line, directly below the leading
   * row (id pill + type chip + severity) and above the metadata rows — the
   * card's pipeline-stage/status pill (SPEC: card layout parity fix
   * 2026-09-01). Kept OUT of the leading row's flex line (where it used to
   * sit ahead of the id pill) so the reference layout's "status on its own
   * line, left-aligned" renders without a bespoke second card. Omit for a
   * caller with no per-card stage chip.
   */
  secondaryBadge?: ReactNode
}

/**
 * KanbanCardView — maps a blueprint-derived `CardModel` (via `deriveCard`)
 * onto `@fams/ui-kit`'s real `KanbanCard`. [tier-2 internal]
 *
 * `KanbanCard` itself is now draggable, keyboard-movable (its own "Move to…"
 * menu, built from `KanbanBoard`'s column registry), and tone/size-aware — so
 * this component is a pure presentational mapping, not DnD wiring. Cell-row
 * grouping (`groupCellRows`) ports the real v5 Vue reference's `groupRows`
 * (`TaskCard.vue`): cells sharing a config `order` render on one line, split
 * into `left`/`right` by `pos`.
 *
 * Slot mapping:
 * - `title` ← `card.title ?? card.ticketId ?? card.id` (unchanged from the
 *   pre-ui-kit implementation) — kept a plain STRING (never wrapped in an
 *   interactive element) so `KanbanCard`'s internal `cardLabel()` can use it
 *   verbatim for the "Move to…" menu's aria-label/live-region announcements,
 *   instead of falling back to the card id.
 * - `badges` ← `card.header` cells EXCLUDING the title's own `col` (the
 *   composer mixes the title cell into `header`), grouped into rows.
 * - `metadataFields` ← `card.body` cells, grouped into rows, plus any
 *   `card.footer` `pos:'left'` cell that is NOT `Assignee`-typed (there is no
 *   dedicated non-avatar "footer-left" slot on `KanbanCard`, so it folds in
 *   here — no current blueprint exercises this path).
 * - `coverImage`/`coverImageAlt` ← `card.imageUrl` / the resolved title.
 * - `avatars` ← `card.footer` `pos:'left'` cells whose resolved field TYPE is
 *   `Assignee`, via `extractAssigneeAvatars` — option (b) from the port brief:
 *   preferred over generically rendering `ReadAssignee` because it gets
 *   `KanbanCard`'s dedicated overlapping-ring avatar-stack treatment.
 * - `footerEnd` ← `card.footer` `pos:'right'` cells.
 * - `highlightColor` ← `card.highlightColor` (`deriveCard`'s resolution of
 *   `uiConfig.kanbanCard.highlight.col`, figma-spec-kanban.md §6's full-
 *   border card-highlight state) — a generic runtime color, `undefined` for
 *   an unflagged card.
 * - `maxAvatars` ← a fixed cap of 3 (figma-spec-kanban.md §3's assignee
 *   overflow "+N" counter) — a presentation constant, not blueprint data;
 *   `KanbanCard` itself decides how the overflow renders.
 * - `tone`/`size`/`selected` — no data source on `CardModel` today; left at
 *   `KanbanCard`'s defaults (a future enhancement, not guessed at here).
 *
 * Clicking the card opens the record (`onClick`) — attached to the whole
 * card (not just the title) since `KanbanCard`'s title is now plain text, not
 * an interactive element. Guarded against the internal "Move to…" trigger
 * button and its portaled menu content: both fire real DOM click events that
 * bubble to this handler (a portal is a React-tree, not real-DOM, boundary),
 * so clicks landing on either are filtered out by real-DOM ancestry
 * (`[aria-haspopup]` for the trigger, `[role="menu"]` for the portaled
 * content) rather than treated as "open the record."
 */
export function KanbanCardView({
  card,
  compiled,
  index,
  displayMode = DEFAULT_KANBAN_DISPLAY_MODE,
  onClick,
  selected,
  onSelectedChange,
  actions,
  leading,
  secondaryBadge,
}: KanbanCardViewProps) {
  const displayName = useDisplayName()
  const title = card.title ?? card.ticketId ?? card.id

  // The composer mixes the title cell into `header` — exclude its own `col`
  // before grouping the remaining cells into badge rows.
  const badgeRows = groupCellRows(card.header.filter((c) => c.col !== 'title'))
  const metadataRows = groupCellRows(card.body)
  // The drag ghost's CONDENSED body: the same meta rows minus the long-form
  // description cells (frame `33534:30521`). Type-derived, so no blueprint's
  // description column is special-cased here.
  const ghostMetadataRows = groupCellRows(card.body.filter((c) => !isDescriptionCell(compiled, c)))

  const footerLeft = card.footer.filter((c) => (c.pos ?? 'left') !== 'right')
  const footerRight = card.footer.filter((c) => (c.pos ?? 'left') === 'right')

  const avatars: KanbanCardAvatar[] = []
  const genericFooterLeft: Cell[] = []
  for (const cell of footerLeft) {
    // The footer avatar stack bypasses `ReadAssignee` (it wants ui-kit's
    // overlapping-ring treatment), so it needs the SAME id→name resolution
    // that renderer gets — otherwise this one surface still showed initials
    // derived from a raw user id (finding A7b-1).
    const extracted = extractAssigneeAvatars(compiled, cell, displayName)
    if (extracted) avatars.push(...extracted)
    else genericFooterLeft.push(cell)
  }

  // The raw record `card` was derived from (`CardModel.record`, `v5-composer`'s
  // `deriveCard`) — read renderers get real field values straight off it
  // instead of a record reconstructed from the derived cells.
  const record = card.record

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!onClick) return
    const target = event.target as HTMLElement
    // UX note G.46: neither the selection checkbox nor the row-options
    // control may open the detail — while clicking the card body still does,
    // even with a selection active (selection mode never hijacks the primary
    // action). Same real-DOM ancestry test the portaled move-menu uses.
    if (target.closest('[role="menu"]') || target.closest('[aria-haspopup]')) return
    if (target.closest('[data-slot="kanban-card-selection"]')) return
    onClick(card.id)
  }

  return (
    <KanbanCard
      id={card.id}
      index={index}
      title={title}
      moveMenuLabel="Move to stage"
      onClick={onClick ? handleClick : undefined}
      className={onClick ? 'cursor-pointer' : undefined}
      badges={
        badgeRows.length || leading || secondaryBadge ? (
          // Two stacked lines (card layout parity fix 2026-09-01): the id
          // row (leading control + badge-row cells) on top, the stage/status
          // pill on its OWN full-width line underneath — matching the
          // reference's "status pill never shares the id row" layout instead
          // of being folded into the id row's trailing column.
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {/* items-center: the leading control (eye toggle) and the first
                badge row's chips share ONE vertical center line (card layout
                parity fix 2026-09-01 — items-start let the chips float to
                the top of the taller leading box). */}
            <div className={leading ? 'flex min-w-0 items-center gap-2' : 'contents'}>
              {leading}
              <div className={leading ? 'flex min-w-0 flex-1 flex-col gap-1.5' : 'contents'}>
                {badgeRows.map((row) => (
                  <CellRowLine
                    key={row.order}
                    row={row}
                    compiled={compiled}
                    record={record}
                    className="flex w-full flex-wrap items-center gap-1.5"
                  />
                ))}
              </div>
            </div>
            {secondaryBadge ? <div className="flex w-full items-center">{secondaryBadge}</div> : null}
          </div>
        ) : undefined
      }
      metadataFields={
        metadataRows.length || genericFooterLeft.length ? (
          <>
            {metadataRows.map((row) => (
              <CellRowLine
                key={row.order}
                row={row}
                compiled={compiled}
                record={record}
                className="flex w-full flex-wrap items-center gap-x-3 gap-y-1"
              />
            ))}
            {genericFooterLeft.length ? (
              <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1">
                {genericFooterLeft.map((cell) => (
                  <span key={cell.col} className="inline-flex items-center gap-1">
                    {renderCardCell(compiled, record, cell)}
                  </span>
                ))}
              </div>
            ) : null}
          </>
        ) : undefined
      }
      selected={selected}
      selectionControl={
        onSelectedChange ? (
          <Checkbox
            checked={Boolean(selected)}
            onCheckedChange={(checked) => onSelectedChange(card.id, checked === true)}
            aria-label={`Select ${title}`}
          />
        ) : undefined
      }
      actions={actions}
      coverImage={displayMode === 'data' ? undefined : card.imageUrl}
      coverImageAlt={displayMode === 'data' || !card.imageUrl ? undefined : title}
      dragGhost={
        <>
          {badgeRows.map((row) => (
            <CellRowLine
              key={row.order}
              row={row}
              compiled={compiled}
              record={record}
              className="flex w-full flex-wrap items-center gap-1.5"
            />
          ))}
          <p className="font-semibold leading-snug text-card-foreground">{title}</p>
          {ghostMetadataRows.map((row) => (
            <CellRowLine
              key={row.order}
              row={row}
              compiled={compiled}
              record={record}
              className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-body-xs text-muted-foreground"
            />
          ))}
          {footerRight.length ? (
            <div className="flex items-center gap-2 border-t border-border pt-2 text-body-xs text-muted-foreground">
              {footerRight.map((cell) => (
                <span key={cell.col} className="inline-flex items-center gap-1">
                  {renderCardCell(compiled, record, cell)}
                </span>
              ))}
            </div>
          ) : null}
        </>
      }
      avatars={avatars.length ? avatars : undefined}
      maxAvatars={3}
      highlightColor={card.highlightColor}
      footerEnd={
        footerRight.length ? (
          <div className="flex items-center gap-2">
            {footerRight.map((cell) => (
              <span key={cell.col} className="inline-flex items-center gap-1">
                {renderCardCell(compiled, record, cell)}
              </span>
            ))}
          </div>
        ) : undefined
      }
    />
  )
}

KanbanCardView.displayName = 'KanbanCardView'
