import { forwardRef, useEffect, useMemo, useState, type HTMLAttributes, type ReactNode } from 'react'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { announce } from '@atlaskit/pragmatic-drag-and-drop-live-region'
import { cn } from '../lib/cn'
import {
  KanbanBoardContext,
  kanbanNodeLabel,
  useKanbanColumnRegistry,
  type KanbanActiveDrag,
  type KanbanBlockedDrop,
  type KanbanBoardContextValue,
  type KanbanMoveAnnouncement,
} from './kanban-context'
import { resolveCardDropOutcome } from './kanban-model'

/**
 * Kanban — the board (+ `KanbanColumn` and `KanbanCard`, each split into its
 * own file per the ~300-line soft budget, root CLAUDE.md rule 12 — see
 * `KanbanColumn.tsx` / `KanbanCard.tsx`). [L3 composite]
 *
 * Drag-and-drop runs on `@atlaskit/pragmatic-drag-and-drop` (+ its `-hitbox`,
 * `-react-drop-indicator`, and `-live-region` companion packages) — the
 * locked stack (`pnpm-workspace.yaml` catalog, `docs/LIBRARIES.md`), matching
 * what `@fams/v5-templates`' `KanbanView` already runs on. `KanbanBoard` owns
 * a `monitorForElements` subscription and translates every completed, legal
 * drag into one call: `onCardMove(cardId, fromColumnId, toColumnId,
 * toIndex)`. It holds no board state — columns and cards are rendered by the
 * caller as `children` (`KanbanColumn` > `KanbanCard`); `columns` is only a
 * lookup used to reject drops onto an unknown destination.
 *
 * pragmatic-drag-and-drop ships no built-in keyboard DnD (unlike
 * `@hello-pangea/dnd`, this file's previous DnD library, chosen originally
 * for that reason). The keyboard + screen-reader parity gap is closed by a
 * `KanbanBoard`-provided React context (an internal column registry —
 * `kanban-context.ts`) that lets every `KanbanCard` render its own "Move
 * to…" menu — a `MoreVertical` trigger opening a `DropdownMenu` listing
 * every other reachable column — without the caller passing anything new.
 * Lift/drop are also announced via `@atlaskit/pragmatic-drag-and-drop-live-
 * region`, replacing hello-pangea's built-in live-region messaging.
 *
 * `KanbanColumn` is chrome only: title, count, and a caller-supplied
 * `canDrop` that gates its drop target (and every card nested in it, and
 * that column's own entry in the "Move to…" menu) — this is how a rule
 * engine (e.g. "this stage can't receive that ticket type") dims an illegal
 * lane without the component knowing any rule. `KanbanCard` (`KanbanCard.tsx`)
 * takes a title and a set of open, app-owned render slots — `badges`,
 * `metadataFields`, `coverImage`, `extra`, an avatar stack, and `footerEnd` —
 * plus a closed `tone` enum resolved to a status-token top accent, never a
 * raw hex (`docs/history/PORT-LEDGER.md` § policy 1). No business vocabulary
 * (ticket ids, priority, maintenance type, …) is a first-class prop here per
 * Rule 10 — that vocabulary belongs to the v5-tier caller composing these
 * slots with its own `Badge`/`LiveDurationCard` content.
 *
 * State-agnostic (Rule 8): nothing here fetches, stores, reorders, or applies
 * a move — the app commits `onCardMove` to its own data and re-renders with
 * new props, same as `Combobox` filters only the `options` it was given.
 *
 * @usage-v5
 *   `@fams/v5-templates`' `KanbanView` (`views/KanbanView.tsx` +
 *   `views/kanban/*`) already runs its own, parallel pragmatic-drag-and-drop
 *   implementation rather than composing this component — a tracked gap
 *   (`docs/BACKLOG.md`, `docs/phase-2-tickets.md` KANBAN-DND) for a separate
 *   task to reconcile now that both stacks speak the same DnD library.
 * @usage-index kanban
 */

// ---------------------------------------------------------------------------
// KanbanBoard
// ---------------------------------------------------------------------------

export interface KanbanBoardColumn {
  /** Must match the `id` given to the corresponding `KanbanColumn`. */
  id: string
}

export interface KanbanBoardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The board's known column ids. The board renders none of them — the
   * `KanbanColumn`/`KanbanCard` tree comes in as `children` — this list only
   * validates a drop's destination before `onCardMove` fires.
   */
  columns: KanbanBoardColumn[]
  /**
   * Fires once per completed, legal drag (pointer drop OR a card's "Move
   * to…" keyboard menu). `toIndex` is the destination's position within
   * `toColumnId`, counted AFTER the card has been removed from its source
   * slot (same contract as `@hello-pangea/dnd`'s `destination.index`).
   * Never fires for a drop back onto its own slot, or a drop outside a
   * known column (a `canDrop={false}` lane, or empty space) — the app never
   * has to re-validate a no-op move.
   */
  onCardMove?: (cardId: string, fromColumnId: string, toColumnId: string, toIndex: number) => void
  /**
   * Derives the screen-reader announcement a card's keyboard "Move to…" menu
   * makes, called once per pick — synchronously AFTER `onCardMove` has
   * returned, so a caller that gates the move inside `onCardMove` already
   * knows the outcome by the time this runs.
   *
   * Omit it and the board announces its own optimistic default
   * (`Moved <card> to <column>.`) — unchanged behavior for every existing
   * caller. Return `move.defaultMessage` to keep that wording, any other
   * string to replace it (localized copy, product vocabulary), or **`null`
   * to announce nothing at all** — the escape hatch for a caller whose
   * `onCardMove` REJECTED the move and does not want the board asserting a
   * success that never happened. Suppressing here (rather than announcing a
   * denial afterwards and hoping it wins) is the only reliable option:
   * `@atlaskit/pragmatic-drag-and-drop-live-region`'s `announce()` cancels
   * whatever announcement is still pending on every call, and this package's
   * dist bundles its own copy of that module — so a caller's later
   * `announce()` cannot cancel this one, it just adds a SECOND live region
   * saying the opposite.
   *
   * BOTH move paths route through this prop — the keyboard "Move to…" menu
   * and the pointer drag. The pointer path used to be exempt on the theory
   * that it "announces pick-up/drop, never a success", which was wrong:
   * `Dropped <card>.` fired unconditionally from the dragged card, before
   * the board had even asked `onCardMove`, so a REFUSED move was narrated as
   * a completed one. That announce is gone; the board now makes exactly one
   * announcement per drop, after the outcome is known, through this prop.
   *
   * Returning a STRING is therefore the recommended way to voice a denial:
   * the denial then occupies the same single live region as a success would
   * have, so there is never a stale success sitting beside it. Returning
   * `null` announces nothing at all — right when the caller has already
   * announced the outcome through some other channel.
   */
  formatMoveAnnouncement?: (move: KanbanMoveAnnouncement) => string | null
  /**
   * The refusal voice, for a pointer drop that landed on a lane which REFUSES
   * the card — a `canDrop={false}` lane, or one the active drag's
   * `getAllowedColumnIds` painted `invalid`. Such a drop resolves no move, so
   * it never reaches `onCardMove` and cannot reach `formatMoveAnnouncement`;
   * this is where it is voiced instead.
   *
   * Omit it and the board announces its own generic default
   * (`Move not allowed: this card can't move to <column>.`). Return
   * `drop.defaultMessage` to keep that wording, any other string to replace it
   * (localized copy, product vocabulary), or `null` to announce nothing —
   * the escape hatch for a caller that has already voiced the refusal through
   * some other channel of its own.
   *
   * Why this exists (UX notes F.35 / L.74): a refusing lane used to opt out of
   * being a drop target entirely, so a drop on it produced an EMPTY drop-target
   * list — indistinguishable from a drop into empty space — and the board said
   * `Dropped <card>.`, an optimistic, success-flavoured narration of a move
   * that never happened, with no denial anywhere. A refusing lane is now a real
   * drop target that reports itself blocked, so the aim can be named and the
   * refusal lands in the SAME single live region a success would have used.
   */
  formatBlockedDropAnnouncement?: (drop: KanbanBlockedDrop) => string | null
  /**
   * The caller's rule predicate, asked ONCE per drag: "which columns may this
   * card land in?". Resolved at drag START and published on the board context
   * (`KanbanActiveDrag.allowedColumnIds`) so every column paints its own
   * validity by a set lookup — the board never re-invokes a predicate per
   * column per dragover, and every lane therefore paints from ONE evaluation
   * and cannot disagree with its neighbours.
   *
   * The card's own column is unioned into the resolved set by the board (a
   * drop back home is a no-op, never a refusal), so a caller need not include
   * it. Return `null`/`undefined` for "no rule info" — the back-compat default,
   * where each `KanbanColumn` falls back to its own `canDropCard` prop.
   *
   * This is a PAINTING input only. It is deliberately NOT consulted on drop:
   * a drop can resolve through a card sitting inside a painted-invalid lane,
   * so the terminal path re-resolves the destination and hands it to
   * `onCardMove`, which re-evaluates the rules and owns the single denial
   * announcement (see the `onDrop` comment below).
   */
  getAllowedColumnIds?: (cardId: string) => readonly string[] | null | undefined
  children: ReactNode
}

export const KanbanBoard = forwardRef<HTMLDivElement, KanbanBoardProps>(
  (
    {
      className,
      columns,
      onCardMove,
      formatMoveAnnouncement,
      formatBlockedDropAnnouncement,
      getAllowedColumnIds,
      children,
      ...props
    },
    ref,
  ) => {
    const knownColumnIds = useMemo(() => new Set(columns.map((column) => column.id)), [columns])
    const { registry, registerColumn, unregisterColumn, version } = useKanbanColumnRegistry()
    // The card in flight, published on the context so every column can paint
    // its own drop validity DURING the drag (pre-emptive, per column) instead
    // of the board discovering it on drop.
    const [activeDrag, setActiveDrag] = useState<KanbanActiveDrag | null>(null)

    const contextValue = useMemo<KanbanBoardContextValue>(
      () => ({ onCardMove, formatMoveAnnouncement, registry, registerColumn, unregisterColumn, activeDrag }),
      // `version` isn't read, but bumping it must produce a new context
      // value so registry readers (a card's "Move to…" menu) re-render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [onCardMove, formatMoveAnnouncement, registry, registerColumn, unregisterColumn, version, activeDrag],
    )

    useEffect(() => {
      return monitorForElements({
        onDragStart: ({ source }) => {
          if (source.data.type !== 'card') return
          const cardId = source.data.cardId as string
          const fromColumnId = source.data.fromColumnId as string
          // Resolve the caller's rule predicate ONCE, here, and push the
          // result down the context — never once per column per dragover.
          const allowed = getAllowedColumnIds?.(cardId)
          setActiveDrag({
            cardId,
            fromColumnId,
            // The card's own column is always legal: a drop back home is a
            // no-op, not a refused transition, so it must never paint as
            // blocked even when the rules omit it as a destination.
            allowedColumnIds: allowed ? new Set([...allowed, fromColumnId]) : null,
          })
        },
        onDrop: ({ source, location }) => {
          // The paint snapshot is dropped BEFORE the destination is resolved,
          // and is deliberately not consulted below: a drop can resolve
          // through a CARD that sits inside a lane the paint marked invalid,
          // so the destination is re-resolved from the live drop targets and
          // handed to `onCardMove`, whose own re-evaluation is the terminal
          // authority (and the only place a denial is announced — refusing
          // silently here would lose that announcement entirely).
          setActiveDrag(null)
          if (source.data.type !== 'card') return
          const cardId = source.data.cardId as string
          const fromColumnId = source.data.fromColumnId as string
          const outcome = resolveCardDropOutcome(
            { cardId, fromColumnId, index: source.data.index as number },
            location.current.dropTargets,
            knownColumnIds,
          )
          // ONE announcement per pointer drop, made HERE and only here,
          // AFTER `onCardMove` has returned — so it can state the outcome
          // instead of predicting it. `KanbanCard`'s draggable deliberately
          // announces nothing on drop for exactly this reason (see its
          // `onDrop`): it runs before the monitors and would be guessing.
          const label = (source.data.cardLabel as string) || (source.data.cardId as string)
          if (outcome.kind === 'blocked') {
            // The user aimed at a specific lane and that lane refused the
            // card. Nothing is committed, but the refusal is stated — and it
            // NAMES the lane, so it is the same class of message the caller's
            // own `onCardMove` re-check produces for a refusal it decides.
            const toColumnLabel = kanbanNodeLabel(
              registry.get(outcome.toColumnId)?.title,
              outcome.toColumnId,
            )
            const defaultMessage = `Move not allowed: this card can't move to ${toColumnLabel}.`
            const blockedMessage = formatBlockedDropAnnouncement
              ? formatBlockedDropAnnouncement({
                  cardId,
                  fromColumnId,
                  toColumnId: outcome.toColumnId,
                  cardLabel: label,
                  toColumnLabel,
                  defaultMessage,
                })
              : defaultMessage
            if (blockedMessage) announce(blockedMessage)
            return
          }
          if (outcome.kind === 'none') {
            // Dropped back on its own slot, or released outside every lane.
            // Nothing was attempted and nothing was refused — so this must
            // never claim a drop landed (`Dropped <card>.` read as a success
            // for a card that had not moved, UX F.35): it states the outcome,
            // which is that the card stayed where it was.
            announce(`${label} was not moved.`)
            return
          }
          const move = outcome.move
          onCardMove?.(move.cardId, move.fromColumnId, move.toColumnId, move.toIndex)
          const toColumnLabel = kanbanNodeLabel(registry.get(move.toColumnId)?.title, move.toColumnId)
          const defaultMessage = `Moved ${label} to ${toColumnLabel}.`
          const message = formatMoveAnnouncement
            ? formatMoveAnnouncement({
                cardId: move.cardId,
                fromColumnId: move.fromColumnId,
                toColumnId: move.toColumnId,
                toIndex: move.toIndex,
                cardLabel: label,
                toColumnLabel,
                defaultMessage,
              })
            : defaultMessage
          if (message) announce(message)
        },
      })
      // `registry` is a `Map` mutated in place and never replaced
      // (`kanban-context.ts`), so reading it inside the monitor always sees
      // live column titles without re-subscribing the monitor.
    }, [
      onCardMove,
      knownColumnIds,
      getAllowedColumnIds,
      formatMoveAnnouncement,
      formatBlockedDropAnnouncement,
      registry,
    ])

    return (
      <KanbanBoardContext.Provider value={contextValue}>
        <div
          ref={ref}
          data-slot="kanban-board"
          // 32px column gutter — figma-spec-kanban.md §2 ("Column outer
          // pitch: 320px per column, 32px gap between columns"), exact match
          // to Tailwind's `gap-8` (2rem) scale step — no arbitrary value
          // needed.
          //
          // SCROLL AXES (UX notes A.3/B.9/B.10). The board owns exactly ONE
          // scroller and it is HORIZONTAL: `overflow-x-auto` + an explicit
          // `overflow-y-hidden`. The explicit y is load-bearing, not
          // decoration — CSS computes `overflow-y: visible` to `auto` as soon
          // as the other axis is not `visible`, so a bare `overflow-x-auto`
          // silently gave the board a SECOND, vertical scroller.
          //
          // `items-stretch` (not `items-start`) is what bounds the lanes: each
          // `KanbanColumn` then takes the board's own height, its card body
          // (`flex-1 min-h-0 overflow-y-auto`) becomes the per-column vertical
          // scroller, and its sticky header stays put. With `items-start` every
          // lane sized to its CONTENT instead, so a 120-card lane was 50,000px
          // tall, nothing scrolled per column, and the board grew a
          // board-height vertical scroller that took the headers off-screen.
          //
          // `relative` is the board's second containment guarantee, and it is
          // load-bearing too: an `overflow` ancestor only clips a descendant
          // it is a CONTAINING BLOCK for, so any absolutely-positioned
          // descendant (Tailwind `sr-only` text, a drop indicator, a caller's
          // own overlay) whose nearest positioned ancestor sat above this
          // scroller escaped the clip entirely and pushed its x-extent into
          // `documentElement.scrollWidth` — a page-level horizontal scrollbar
          // sourced from a 1px screen-reader span. Each `KanbanColumn` is
          // `relative` for the same reason; this catches anything rendered
          // between the lanes.
          className={cn('relative flex h-full items-stretch gap-8 overflow-x-auto overflow-y-hidden', className)}
          {...props}
        >
          {children}
        </div>
      </KanbanBoardContext.Provider>
    )
  },
)
KanbanBoard.displayName = 'KanbanBoard'


export {
  KanbanColumn,
  type KanbanColumnProps,
} from './KanbanColumn'

export type { KanbanActiveDrag, KanbanBlockedDrop, KanbanMoveAnnouncement } from './kanban-context'
export type { KanbanDragState } from './kanban-drag-paint'

export {
  KanbanCard,
  type KanbanCardProps,
  type KanbanCardAvatar,
  type KanbanTone,
  type KanbanCardSize,
} from './KanbanCard'

export { useKanbanCardMoveTargets, type KanbanCardMoveTarget } from './use-kanban-card-move-targets'
