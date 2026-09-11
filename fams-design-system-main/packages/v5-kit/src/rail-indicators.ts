/**
 * Rail-indicator seam — cross-module notification state for the outer nav
 * rail's pinned entries (the Inbox unread dot, specs/inbox SPEC §Shell
 * placement). [v5 tier]
 *
 * The dot is CROSS-MODULE state (an inbox clear inside one module must
 * update chrome owned by the shell), so it cannot live in component state —
 * it is an injectable, subscribable source, same seam family as
 * `ModulesSource`/`UserSource` (v5-kit CLAUDE.md rule: every data seam is
 * injectable, never hardcoded). `V5AppShell` reads it with
 * `useSyncExternalStore`, so any `set` re-renders exactly the rail.
 *
 * `createRailIndicators` is the reference implementation apps can use
 * directly: a tiny imperative controller — the app computes "does rail item
 * X carry a dot" from its own store and pushes it here.
 */

/** Subscribable source of per-rail-item indicator dots, keyed by rail-item id. */
export interface RailIndicatorSource {
  /** Subscribe to any indicator change. Returns the unsubscribe. */
  subscribe: (listener: () => void) => () => void
  /** Whether the rail item with this id currently carries an indicator dot. */
  hasIndicator: (id: string) => boolean
  /**
   * Optional unread COUNT for this rail item. When a source supplies a
   * positive number the rail renders the reference's red count pill instead
   * of the bare dot; sources that only know "on/off" simply omit this.
   */
  indicatorCount?: (id: string) => number | undefined
}

export interface RailIndicatorController extends RailIndicatorSource {
  /** Set one rail item's indicator; notifies subscribers on actual change. */
  set: (id: string, on: boolean) => void
  /**
   * Set one rail item's unread COUNT (and, implicitly, its dot: count > 0
   * means "on"). Notifies subscribers on actual change.
   */
  setCount: (id: string, count: number) => void
}

export function createRailIndicators(initial: Record<string, boolean> = {}): RailIndicatorController {
  const state = new Map<string, boolean>(Object.entries(initial))
  const counts = new Map<string, number>()
  const listeners = new Set<() => void>()
  const notify = () => {
    for (const listener of [...listeners]) listener()
  }
  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    hasIndicator(id) {
      return state.get(id) === true
    },
    indicatorCount(id) {
      return counts.get(id)
    },
    set(id, on) {
      if ((state.get(id) === true) === on) return
      state.set(id, on)
      notify()
    },
    setCount(id, count) {
      const next = Math.max(0, Math.trunc(count))
      if (counts.get(id) === next && (state.get(id) === true) === next > 0) return
      counts.set(id, next)
      state.set(id, next > 0)
      notify()
    },
  }
}
