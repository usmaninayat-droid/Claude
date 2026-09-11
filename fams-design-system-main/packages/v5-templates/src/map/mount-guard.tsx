import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'

/**
 * mount-guard.tsx — the one-map-PER-SLOT rule (perf rule 3), enforced IN the
 * component rather than left as a "please don't" convention: a real MapLibre
 * GL context is expensive (its own WebGL context, tile cache, deck.gl
 * overlay) and most browsers cap live WebGL contexts per page — an
 * ACCIDENTAL second concurrently-mounted `MapPanel` of the same kind doesn't
 * just waste memory, it can silently evict the first map's context.
 * `useSingleMapGuard` is a module-scope registry, one per (SCOPE, SLOT) pair
 * — "who currently owns this slot, in this scope" id: the first `MapPanel`
 * to claim a given (scope, slot) pair keeps it; any other instance rendered
 * under the SAME pair while it's held renders `MapFallbackCard` instead of
 * standing up a second GL context, and logs a loud dev-only console.error so
 * the violation is impossible to miss in development.
 *
 * TWO INDEPENDENT AXES, reconciled here (round 2026-08-31, §3d — this file
 * previously had two parallel fixes for the same bug class, built on
 * different branches without visibility into each other; this merges them
 * into one mechanism instead of keeping both):
 *
 * - SCOPE (from `wt-detail-ds`, `ecbaee4`): a docked, no-scrim side-sheet
 *   (`EntityProfile`, wrapped in `MapGuardScopeProvider`) is a separate
 *   visual context from the page underneath it, not a sibling competing for
 *   the same screen real estate — its tab content's map(s) must not collide
 *   with the page's own live map. Every `MapPanel` under a given
 *   `MapGuardScopeProvider` resolves the SAME scope id; outside any
 *   provider, everything resolves the shared `GLOBAL_SCOPE`.
 * - SLOT (from `wt-parity-ds`, fix-wave `58ff01f`): within a single scope,
 *   a slot names the map's ROLE, not its identity — two DIFFERENT,
 *   deliberately-composed roles on the same page/sheet (e.g. a page's
 *   primary record map and a small inline "Address" location map) must not
 *   block each other either, even though they share a scope. `MapPanel`
 *   takes an optional `guardSlot` prop for this; everything that doesn't
 *   pass one shares `DEFAULT_MAP_SLOT`.
 *
 * The registry is keyed by the (scope, slot) PAIR: two `MapPanel`s only
 * conflict if they share BOTH the same scope AND the same slot — which is
 * exactly the "genuine accidental duplicate" case this guard exists to
 * catch. Different scopes never collide (sheet vs. page); different slots
 * in the same scope never collide (primary map vs. inline location map);
 * two full page-level maps in the same (default) scope and (default) slot
 * still correctly refuse each other, which is the guard's original purpose.
 *
 * SHARED ACROSS MODULE COPIES, deliberately (globalThis-anchored). tsup
 * builds `src/index.ts` and `src/map/index.ts` as two INDEPENDENT entries
 * with `splitting: false` (see `MapPanel.tsx`'s lazy-weight header) — so
 * this module's code is duplicated into BOTH output bundles, and a plain
 * module-scope `const` would give each copy its own registry and its own
 * React context object. `EntityProfile` (light barrel) provides the scope;
 * `MapPanel` (map entry) consumes it — with per-copy state the provider's
 * context would never reach the hook, and worse, two copies' registries
 * would stop seeing each other's `heldBy` at all. Anchoring both the
 * scope→slot registry and the context object on `globalThis` under a
 * namespaced `Symbol.for` key makes every copy resolve the SAME objects
 * (React context identity is object identity — one shared React instance,
 * one shared context object, so provider and consumer match across
 * bundles).
 *
 * THE CLAIM CHECK IS SYNCHRONOUS, AT RENDER TIME — not deferred to an
 * effect. This matters because React's render phase is single-threaded and
 * depth-first: for `<><MapPanel/><MapPanel/></>`, the first instance's
 * entire subtree (down to `MapLibreMap` and whatever GL setup ITS render
 * schedules) is fully rendered before the second instance's function is
 * even called. If the claim only happened in a `useEffect`, both instances
 * would see the slot as free at render time (neither's effect has fired
 * yet), both would render `MapPanelInner`, and react-map-gl would construct
 * a real second `maplibregl.Map` for one whole commit before the effects
 * sorted out who's blocked — exactly the eviction risk this guard exists to
 * prevent. Reading (and claiming) the module-scope `heldBy` slot directly
 * during render closes that window: by the time the second sibling's
 * render function runs, `heldBy` already holds the first instance's id, so
 * the second instance never renders `MapPanelInner` — and never mounts a
 * second `MapLibreMap` — at all.
 *
 * StrictMode caution: React 19 StrictMode dev-only double-invokes both
 * render and mount effects for the SAME instance (render → render again;
 * mount effect → cleanup → mount effect again) to surface impurities. The
 * instance id is generated once via `useRef` so it's stable across a
 * double-render, and `heldBy === id` (this exact instance already holds the
 * slot) is always treated as allowed — so the second of a StrictMode
 * double-render never blocks itself. The effect exists only for bookkeeping
 * (not the block/allow decision, which is already settled at render): it
 * releases the slot on real unmount / the StrictMode synthetic unmount
 * (only if it still holds it), and reclaims it on a subsequent mount / the
 * StrictMode synthetic remount, so the release-then-reclaim dance is safe
 * and a genuine remount later still works.
 *
 * Abandoned claims (a render that never commits): the render-time claim
 * above is a two-edged sword — it closes the sibling-race window, but it
 * also means a render pass that gets DISCARDED before ever committing (no
 * effect ever runs for it) can orphan the slot forever, permanently
 * blocking every later, genuinely live instance. This is not hypothetical:
 * a component that suspends behind a `Suspense` boundary
 * (`React.lazy` — e.g. `entity-profile/OverviewWidgets`'s `locationMap`
 * widget, or `views/LocationMapSectionSlot.tsx`) can, under dev StrictMode,
 * go through an extra render-then-discard pass as part of resolving the
 * suspended boundary — that discarded pass still runs this hook's render-time
 * code (claiming the slot) but never reaches its `useEffect` (nothing to
 * confirm the claim, nothing to release it). `confirmed`/the `setTimeout`
 * below is the fix: a claim is PROVISIONAL until its own effect actually
 * fires (proving the render committed); if nothing confirms it within one
 * macrotask — long after any real commit's effects have already run, so a
 * genuinely mounted map is never affected — it self-releases and notifies
 * `releaseListeners` so any instance blocked behind it gets a real second
 * chance (re-render → re-decide the claim above, exactly as if the abandoned
 * instance had never rendered at all).
 *
 * Notification-vs-subscribe race (fixed): the expiry above can fire before a
 * blocked sibling's own effect has run (observed in practice via React's
 * "recovered by synchronously rendering the entire root" concurrent-render
 * fallback — a discarded render still claims the slot at render time, then
 * expires; a genuinely-committed blocked instance's effect can run either
 * side of that expiry). `notifyReleased()` only reaches listeners already in
 * `releaseListeners`, so a blocked instance whose effect hasn't subscribed
 * yet would miss the notification and wait forever for a release that
 * already happened — a permanent, un-recoverable fallback card despite the
 * slot being free. The blocked branch below re-checks `heldBy` synchronously
 * BEFORE subscribing, closing the window (no yield point between the check
 * and the subscribe, so nothing can change state in between).
 */

const GLOBAL_SCOPE = 'fams-map-guard-global-scope'

/** Default slot name — every existing call site that doesn't opt into a
 *  named slot keeps exactly the pre-slots single-scope-wide behavior. */
export const DEFAULT_MAP_SLOT = 'default'

/** Per-(scope, slot) registry state. */
interface SlotState {
  heldBy: string | null
  releaseListeners: Set<() => void>
  /** Ids whose OWN effect has actually run — i.e. a render that truly committed, not one StrictMode/Suspense discarded before it ever mounted. */
  confirmed: Set<string>
}

interface GuardGlobals {
  /** scope id -> slot name -> registry state. */
  scopes: Map<string, Map<string, SlotState>>
  nextId: number
  context: ReturnType<typeof createContext<string | undefined>>
}
const GUARD_GLOBALS_KEY = Symbol.for('fams.v5-templates.map-guard')
const guardGlobals: GuardGlobals = ((globalThis as Record<symbol, unknown>)[GUARD_GLOBALS_KEY] as GuardGlobals) ?? {
  scopes: new Map<string, Map<string, SlotState>>(),
  nextId: 0,
  context: createContext<string | undefined>(undefined),
}
;(globalThis as Record<symbol, unknown>)[GUARD_GLOBALS_KEY] = guardGlobals

function nextInstanceId(): string {
  guardGlobals.nextId += 1
  return `fams-map-${guardGlobals.nextId}`
}

function getSlotState(scope: string, slot: string): SlotState {
  let slotsForScope = guardGlobals.scopes.get(scope)
  if (!slotsForScope) {
    slotsForScope = new Map<string, SlotState>()
    guardGlobals.scopes.set(scope, slotsForScope)
  }
  let state = slotsForScope.get(slot)
  if (!state) {
    state = { heldBy: null, releaseListeners: new Set(), confirmed: new Set() }
    slotsForScope.set(slot, state)
  }
  return state
}

function notifyReleased(state: SlotState): void {
  for (const listener of state.releaseListeners) listener()
}

/** Releases the slot iff `id` still holds it — a no-op for an id that was already superseded (e.g. by another confirmed claim). */
function release(state: SlotState, id: string): void {
  if (state.heldBy === id) {
    state.heldBy = null
    state.confirmed.delete(id)
    notifyReleased(state)
  }
}

/**
 * Context carrying the current map-guard scope id. `undefined` (no provider
 * above) resolves to `GLOBAL_SCOPE` — the original, un-scoped behaviour. Not
 * exported directly; consumed via `useSingleMapGuard` and provided via
 * `MapGuardScopeProvider` below.
 */
const MapGuardScopeContext = guardGlobals.context

/**
 * Opens a new map-guard scope for everything rendered inside it — e.g. the
 * tanker detail side-sheet's `EntityProfile`, so its tab content's map(s)
 * compete only against EACH OTHER (still split further by `slot`, see file
 * header), never against the live map on the page underneath the sheet
 * overlay. Nest freely: each provider's `useId()`-backed scope id is unique,
 * so a scope nested inside another scope still gets its own independent set
 * of slots.
 */
export function MapGuardScopeProvider({ children }: { children?: ReactNode }) {
  const scopeId = useId()
  const idRef = useRef<string | undefined>(undefined)
  if (idRef.current === undefined) idRef.current = `fams-map-guard-scope-${scopeId}`
  return <MapGuardScopeContext.Provider value={idRef.current}>{children}</MapGuardScopeContext.Provider>
}

export interface SingleMapGuardResult {
  /** `true` once this instance holds (or has claimed) this slot. Decided
   *  synchronously at render time — never lags a commit. */
  granted: boolean
  /** `true` when another `MapPanel` in the SAME scope AND slot already
   *  holds it — render the fallback card, not the GL map. A `MapPanel` in a
   *  DIFFERENT scope or a DIFFERENT slot never blocks this one (see file
   *  header). */
  blocked: boolean
}

/**
 * @param slot Names the map's ROLE, not its identity — every `MapPanel`
 * instance playing the same role in the same scope competes for the same
 * (scope, slot) pair (the accidental-duplicate case this guard exists to
 * catch); two different, deliberately-composed roles (e.g. a page's primary
 * record map and a docked sheet's small inline location map) use different
 * slots and never block each other, even within the same scope. Defaults to
 * `DEFAULT_MAP_SLOT`. Scope is resolved from `MapGuardScopeContext`
 * (`MapGuardScopeProvider`), defaulting to `GLOBAL_SCOPE` outside any
 * provider.
 */
export function useSingleMapGuard(slot: string = DEFAULT_MAP_SLOT): SingleMapGuardResult {
  const scopeId = useContext(MapGuardScopeContext) ?? GLOBAL_SCOPE
  const idRef = useRef<string | undefined>(undefined)
  if (idRef.current === undefined) idRef.current = nextInstanceId()
  const id = idRef.current
  const state = getSlotState(scopeId, slot)
  // Persists across a StrictMode double-render (same hook state, see file
  // header) so the dev console.error fires exactly once per instance that
  // actually becomes blocked, not once per render.
  const loggedRef = useRef(false)
  // Bumped by `notifyReleased()` to force this (blocked) instance to
  // re-render and re-evaluate the claim below once the slot frees up.
  const [, retry] = useState(0)

  // Synchronous, render-time decision + claim (see file header for why this
  // can't be deferred to an effect). `state.heldBy === id` covers this exact
  // instance re-rendering (or StrictMode double-rendering) while it already
  // holds the slot — that must never read as blocked.
  const blocked = state.heldBy !== null && state.heldBy !== id
  if (blocked) {
    if (!loggedRef.current) {
      loggedRef.current = true
      // DEFERRED BY ONE MACROTASK, deliberately. A block is only a real
      // violation if it PERSISTS: when a map is remounted in place (a changed
      // React `key`, a route-level swap), the replacement's render runs while
      // the outgoing instance still holds the slot, so it is momentarily
      // blocked and then granted as soon as the outgoing effect cleanup
      // releases. Logging at render time reported that ordinary handover as
      // "another map is already mounted", which is how a false P1 landed in
      // round 2 — a warning fired inside a single route with only one map on
      // it. Checking again a macrotask later distinguishes the two: a genuine
      // second concurrent map still holds the slot; a handover does not.
      const blockedId = id
      setTimeout(() => {
        if (state.heldBy === null || state.heldBy === blockedId) return
        // Intentional, loud dev signal (perf rule 3) — no `no-console` rule is
        // configured in this package's eslint config, but the intent is the
        // same as if there were: this one is deliberate, not left-over debug.
        console.error(
          `[MapPanel] Another map is already mounted in the "${slot}" slot (scope "${scopeId}") on this ` +
            'page. Only one MapPanel per slot, per scope, may be mounted at a time (perf rule 3 — a ' +
            'second live MapLibre GL context in the same role is expensive and can evict the first). ' +
            'Rendering the fallback card instead of a second map. (A MapPanel in a different slot, or a ' +
            'different scope such as a docked side-sheet, is unaffected — this is not a page-wide ' +
            'single-map limit.)',
        )
      }, 0)
    }
  } else {
    state.heldBy = id
    // Provisional (see "Abandoned claims" above) — give this render pass one
    // macrotask to prove it actually committed (the effect below adds `id`
    // to `confirmed`); a real commit's effects always run well before a
    // `setTimeout(0)` fires, so this never touches a genuinely mounted map.
    const claimedId = id
    setTimeout(() => {
      if (!state.confirmed.has(claimedId)) release(state, claimedId)
    }, 0)
  }

  useEffect(() => {
    if (blocked) {
      // RACE this closes: an abandoned claim's `setTimeout(0)` expiry (see
      // "Abandoned claims" above) can fire — and call `release()`, which
      // notifies whoever is CURRENTLY subscribed — at any point relative to
      // THIS effect actually running (React may defer passive effects past a
      // macrotask boundary, especially after the "recover by synchronously
      // re-rendering the entire root" path a concurrent-render error can
      // trigger). If the expiry fires first, `notifyReleased()` finds this
      // listener not yet in `state.releaseListeners` (it hasn't subscribed
      // yet) — the notification is delivered to no one, and a `retry` that
      // only reacts to a FUTURE release would then wait forever for an event
      // that already happened, permanently stuck on the fallback card even
      // though the slot is free. Re-checking the CURRENT state synchronously,
      // right here before subscribing, closes the gap: no other code can run
      // between this check and `state.releaseListeners.add` below
      // (single-threaded JS, no `await`/yield in between), so there is no
      // remaining window for the module state to change out from under us
      // unobserved.
      if (state.heldBy === null) {
        retry((n) => n + 1)
        return
      }
      // Not the holder — subscribe to the slot's release so a later free
      // slot gets a real second chance instead of staying blocked forever
      // (see "Abandoned claims" above).
      const onReleased = () => retry((n) => n + 1)
      state.releaseListeners.add(onReleased)
      return () => {
        state.releaseListeners.delete(onReleased)
      }
    }
    // This render committed for real — confirm it (cancels the provisional
    // claim's expiry above) and reclaim in case a prior cleanup (a
    // StrictMode-simulated unmount, or this exact instance re-running after
    // another render) released the slot out from under us.
    state.heldBy = id
    state.confirmed.add(id)
    return () => {
      state.confirmed.delete(id)
      release(state, id)
    }
  }, [id, blocked, state])

  return { granted: !blocked, blocked }
}

/** Test-only escape hatch — resets the module-scope registry between test
 *  cases so one test's mounted-and-unmounted map can't leak into the next. */
export function __resetSingleMapGuardForTests(): void {
  guardGlobals.scopes.clear()
}
