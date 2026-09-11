import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * The DOM regions of the app's single `TopNav` that the ACTIVE PAGE may fill.
 * `null` for a region means the host bar is mounted but that region's node
 * isn't attached yet (a ref callback hasn't run) — render nothing into it this
 * pass rather than falling back to a second bar.
 */
export interface TopNavSlotNodes {
  tabs: HTMLElement | null
  actions: HTMLElement | null
  /**
   * A LEADING slot inside the title group, before the host's own `brand`
   * node — for a page-scoped title adornment (e.g. the inbox spec's 20px
   * module icon before "Inbox"). The title TEXT stays host-owned (it is the
   * route-synchronous `<h1>`); pages only prepend to it.
   */
  title: HTMLElement | null
}

const TopNavSlotContext = createContext<TopNavSlotNodes | null>(null)

/**
 * The app shell's single top bar, made fillable by the routed page. [L4 shell]
 *
 * ## The problem this solves
 *
 * An app shell renders ONE persistent top bar — it is the thing that survives
 * navigation, and (via `AppShell`) the thing that owns the mobile hamburger
 * that opens the nav drawer. But half of that bar's content is page-scoped: a
 * module page's view-switch tabs and its per-view actions are page state, and
 * the shell has no business fabricating them (nor any way to know them).
 *
 * The tempting shortcut — let the page render its OWN `TopNav` — is what
 * produced the defect this contract exists to fix: two stacked bars, the outer
 * one holding the title, the inner one holding the tabs, where the design has
 * a single bar holding both. Deleting the outer bar instead is worse: it is the
 * bar with the hamburger, so mobile navigation goes with it.
 *
 * So ownership is split rather than duplicated. The shell owns the BAR (always
 * present, mounts synchronously, carries the title it already knows from route
 * state — no lazy-load flash and no layout shift). The page owns the bar's
 * CONTENTS for the regions that are page-scoped, and puts them there through a
 * portal.
 *
 * ## The contract
 *
 * - A **host** (`AppShell`) calls {@link useTopNavSlotHost}, spreads the
 *   returned `slotRefs` onto its `TopNav`, and wraps its page content in a
 *   {@link TopNavSlotProvider} carrying the returned `slots`.
 * - A **page** calls {@link useTopNavSlots}. A non-`null` result means "you are
 *   inside a host — do NOT render a bar of your own"; use
 *   {@link TopNavSlotPortal} to place content into a region. A `null` result
 *   means the component is standalone (a showcase demo, a unit test, an app
 *   that doesn't use `AppShell`) and should render its own bar exactly as
 *   before.
 *
 * Deciding *whether* a page owns a bar is therefore a first-render decision
 * based on context PRESENCE (known synchronously, never null-then-not), while
 * deciding *where* to portal depends on a DOM node that may arrive one commit
 * later. Keeping those two questions separate is what makes the swap
 * flash-free: the page never renders a competing bar, not even for a frame.
 *
 * Portals, not lifted state, carry the content: a page re-render re-renders its
 * portal children in place without pushing new state up into the shell, so
 * there is no render loop from a `ReactNode` prop that is a fresh object every
 * pass.
 *
 * @usage-index top-nav-slot
 */
export function useTopNavSlotHost(): {
  /** Spread onto the host `TopNav` so it exposes its fillable regions. */
  slotRefs: {
    tabsSlotRef: (node: HTMLElement | null) => void
    actionsSlotRef: (node: HTMLElement | null) => void
    titleSlotRef: (node: HTMLElement | null) => void
  }
  /**
   * The bar's fillable regions. Pass to {@link TopNavSlotProvider} as `value`
   * and wrap the host's page content in it.
   */
  slots: TopNavSlotNodes
} {
  const [tabs, setTabs] = useState<HTMLElement | null>(null)
  const [actions, setActions] = useState<HTMLElement | null>(null)
  const [title, setTitle] = useState<HTMLElement | null>(null)

  const slots = useMemo<TopNavSlotNodes>(() => ({ tabs, actions, title }), [tabs, actions, title])
  const slotRefs = useMemo(
    () => ({ tabsSlotRef: setTabs, actionsSlotRef: setActions, titleSlotRef: setTitle }),
    [],
  )

  return { slotRefs, slots }
}

/**
 * Publishes the host bar's regions to the page content wrapped inside it.
 *
 * This is a MODULE-LEVEL component on purpose, taking the nodes as a prop. The
 * slot nodes attach one commit after mount, so `value` necessarily changes right
 * after first paint — but React reconciles by element TYPE, and unmounts and
 * remounts any subtree whose type changed. A provider component defined inside
 * {@link useTopNavSlotHost} (or produced per-render by `bind`) would therefore
 * be a new type on that second render and would remount the host's whole page
 * subtree on every app boot: page state discarded, every page effect run twice.
 * Keeping the type fixed and letting only the prop change is what makes the
 * slot nodes arrive as a cheap context update instead of a remount.
 */
export function TopNavSlotProvider({
  value,
  children,
}: {
  value: TopNavSlotNodes
  children: ReactNode
}): ReactNode {
  return <TopNavSlotContext.Provider value={value}>{children}</TopNavSlotContext.Provider>
}

/**
 * The host bar's fillable regions, or `null` when there is no host.
 *
 * `null` is the signal to render your own bar; a non-`null` value is the signal
 * NOT to. Never treat a non-`null` value with `tabs === null` as "no host" — a
 * region's node can attach one commit after the context appears, and rendering
 * a fallback bar in that window is exactly the doubled-bar bug.
 */
export function useTopNavSlots(): TopNavSlotNodes | null {
  return useContext(TopNavSlotContext)
}

/**
 * Render `children` into one of the host bar's regions. Renders nothing when
 * there is no host, or when that region's node hasn't attached yet.
 */
export function TopNavSlotPortal({
  region,
  children,
}: {
  region: keyof TopNavSlotNodes
  children: ReactNode
}): ReactNode {
  const slots = useTopNavSlots()
  const node = slots?.[region] ?? null
  if (!node) return null
  return createPortal(children, node)
}
