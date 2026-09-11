import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

/**
 * Internal Kanban plumbing — not exported from the package barrel.
 *
 * `pragmatic-drag-and-drop` ships no keyboard DnD, so `KanbanCard` builds its
 * own "Move to…" keyboard-accessible menu (see `Kanban.tsx`). To list every
 * OTHER reachable column with its label, a card needs to know the board's
 * full column set — but `KanbanBoardProps.columns` only carries `{id}` (no
 * label; labels live on each `KanbanColumn`'s own `title` prop). This module
 * is the registry that closes that gap: every `KanbanColumn` registers
 * itself (id → title/canDrop/count) on mount and un-registers on unmount, and
 * any `KanbanCard` anywhere in the tree can read the current full registry.
 */

export interface KanbanColumnRegistryEntry {
  title: ReactNode
  /** Static, caller-decided drop gating — same value as `KanbanColumnProps.canDrop`. */
  canDrop: boolean
  /**
   * CARD-AWARE drop gating — same function as `KanbanColumnProps.canDropCard`.
   * Where `canDrop` is a whole-column boolean, this answers the question the
   * column alone cannot: "may THIS card land here?". It is the seam that lets
   * ONE caller-side rule predicate drive both consumers of the rule —
   * a card's keyboard "Move to…" menu (which reads it from this registry) and
   * the pointer-drag validity painting (which the column reads for the card
   * currently in flight) — instead of each re-deriving the rule. Omit for no
   * per-card gating (`canDrop` alone decides, unchanged behavior).
   */
  canDropCard?: (cardId: string) => boolean
  /** Current card count — lets a keyboard "Move to…" pick append to the end of the target column. */
  count: number
}

/**
 * The card currently in flight on a pointer drag, published on the board
 * context so any `KanbanColumn` can paint its own drop validity DURING the
 * drag rather than discovering it on drop. `null` when no drag is active.
 */
export interface KanbanActiveDrag {
  cardId: string
  fromColumnId: string
  /**
   * The columns this card may legally land in, RESOLVED ONCE at drag start
   * from `KanbanBoardProps.getAllowedColumnIds` and pushed down here — so a
   * column paints by a `Set.has` lookup instead of the board re-invoking a
   * per-column predicate on every dragover. The card's OWN column is always
   * unioned in: dropping a card back where it came from is a no-op, never an
   * illegal move, and must never paint as refused even when the caller's rules
   * would not otherwise name that column as a destination.
   *
   * `null` when the board was given no `getAllowedColumnIds` — the back-compat
   * default, where each column falls back to its own `canDropCard` prop.
   */
  allowedColumnIds: ReadonlySet<string> | null
}

/**
 * The move a card's keyboard "Move to…" menu just handed to `onCardMove`,
 * as the input to `KanbanBoardProps.formatMoveAnnouncement`. Carries plain
 * strings (never `ReactNode`) so a caller can build a message without
 * re-deriving labels from its own data.
 */
export interface KanbanMoveAnnouncement {
  cardId: string
  fromColumnId: string
  toColumnId: string
  /** The `toIndex` that was passed to `onCardMove` (the destination column's card count). */
  toIndex: number
  /** The card's own label — its `title` when that is a plain string, else its `id`. */
  cardLabel: string
  /** The destination column's label — its `title` when that is a plain string, else its id. */
  toColumnLabel: string
  /** What the board announces when `formatMoveAnnouncement` is not supplied. Return it unchanged to keep the default wording. */
  defaultMessage: string
}

/**
 * A pointer drop that landed on a lane the board could identify but which
 * REFUSED the card — a lane whose `canDrop` is `false`, or one the active
 * drag's `allowedColumnIds` painted `invalid`. Such a lane resolves no move
 * (nothing may be committed), so it never reaches `onCardMove` and therefore
 * never reaches `formatMoveAnnouncement`; it is announced through
 * `KanbanBoardProps.formatBlockedDropAnnouncement` instead. Same plain-string
 * shape as {@link KanbanMoveAnnouncement} so a caller can voice both outcomes
 * from the same vocabulary.
 */
export interface KanbanBlockedDrop {
  cardId: string
  fromColumnId: string
  /** The lane the card was dropped on and refused by. */
  toColumnId: string
  /** The card's own label — its `title` when that is a plain string, else its `id`. */
  cardLabel: string
  /** The refusing lane's label — its `title` when that is a plain string, else its id. */
  toColumnLabel: string
  /** What the board announces when `formatBlockedDropAnnouncement` is not supplied. */
  defaultMessage: string
}

export interface KanbanBoardContextValue {
  onCardMove?: (cardId: string, fromColumnId: string, toColumnId: string, toIndex: number) => void
  formatMoveAnnouncement?: (move: KanbanMoveAnnouncement) => string | null
  registry: Map<string, KanbanColumnRegistryEntry>
  registerColumn: (id: string, entry: KanbanColumnRegistryEntry) => void
  unregisterColumn: (id: string) => void
  /** The card in flight on the current pointer drag, or `null`. */
  activeDrag: KanbanActiveDrag | null
}

/**
 * A `title` prop may be arbitrary `ReactNode`, but a live-region string or an
 * `aria-label` cannot be — fall back to the stable id whenever the node is not
 * already plain text. Shared by `KanbanCard` (card + destination-column names
 * in its "Move to…" announcement) and `KanbanBoard` (the same names in the
 * one announcement it makes per pointer drop), so the two paths can never
 * name the same lane differently.
 */
export function kanbanNodeLabel(node: ReactNode, fallbackId: string): string {
  return typeof node === 'string' ? node : fallbackId
}

export const KanbanBoardContext = createContext<KanbanBoardContextValue | null>(null)

/** Lets a `KanbanCard` read its own enclosing column's id without an explicit prop. */
export const KanbanColumnIdContext = createContext<string | null>(null)

/**
 * The registry state a `KanbanBoard` owns: a `Map` mutated in place (so any
 * reader always sees the latest content, no matter how stale its own render
 * closure is) plus a version counter that bumps on every register/
 * unregister to force React to re-render context consumers — a common
 * lightweight escape hatch, not a reach for a state-management library.
 */
export function useKanbanColumnRegistry() {
  const registryRef = useRef(new Map<string, KanbanColumnRegistryEntry>())
  const [version, setVersion] = useState(0)

  const registerColumn = useCallback((id: string, entry: KanbanColumnRegistryEntry) => {
    registryRef.current.set(id, entry)
    setVersion((v) => v + 1)
  }, [])

  const unregisterColumn = useCallback((id: string) => {
    registryRef.current.delete(id)
    setVersion((v) => v + 1)
  }, [])

  return { registry: registryRef.current, registerColumn, unregisterColumn, version }
}

export function useKanbanBoardContext() {
  return useContext(KanbanBoardContext)
}

export function useKanbanColumnId() {
  return useContext(KanbanColumnIdContext)
}
