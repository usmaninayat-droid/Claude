import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { viewLabelIn, viewSpecKind, type ViewKind, type ViewSpec } from '@fams/v5-composer'
import type { SavedView, SavedViewsAdapter, SavedViewsContext, ViewState } from './saved-views'

/** The mutable part of a view's state (everything but `viewId`). */
export type ViewStateBody = Omit<ViewState, 'viewId'>

/*
 * There is deliberately no "coming soon" placeholder-tab list here any more.
 *
 * This state machine used to append always-disabled `Hybrid`/`Calendar` tabs to
 * every module's strip so the full four-kind set was "always visible (matching
 * the design)". That reading of the design was wrong on both counts. Figma node
 * 6995:419 shows a module's REAL views and nothing else (List + Kanban + the
 * `+`), and in a 48px bar with a contended width budget, permanently reserving
 * space for views that can never activate crowds out the ones that can — while
 * presenting a control that looks clickable and silently isn't.
 *
 * The tab strip now reflects exactly what the blueprint DECLARES in its `views`
 * array, so this is metadata-reversible: a module that wants a Hybrid tab
 * declares `hybrid` in its blueprint.
 */
export function seedViews(views: ViewSpec[]): SavedView[] {
  // A blueprint entry is either the bare KIND or a `{ kind, label?, icon? }`
  // object naming the module's own lens (composer `ViewSpec`). The label
  // override wins; without one the kind's context-aware default applies
  // ("Map View"/"List View" beside a hybrid sibling — see `viewLabelIn`).
  const kinds = views.map(viewSpecKind)
  return views.map((spec, i) => {
    const kind = kinds[i]
    const named = typeof spec === 'string' ? undefined : spec
    const view: SavedView = {
      id: `sys-${kind}`,
      label: named?.label ?? viewLabelIn(kind, kinds),
      kind,
      system: true,
    }
    if (named?.icon) view.icon = named.icon
    return view
  })
}

export interface UseSavedViewTabsOptions {
  /** The module's blueprint view entries — the seed tab set (bare kinds or
   *  `{ kind, label?, icon? }` objects). */
  views: ViewSpec[]
  /** Persistence port; omit for local-only (seed) tabs. */
  savedViews?: SavedViewsAdapter
  /** Scopes persistence to one user + module. */
  context: SavedViewsContext
  /** Controlled active-view id (see `ModuleViewProps.activeViewId`). */
  activeViewId?: string
  /** Reports every active-view/filters/sort/search change (router wiring). */
  onStateChange?: (state: ViewState) => void
}

/**
 * useSavedViewTabs — `ModuleView`'s saved-view tab state machine, extracted
 * whole (root rule 12's decompose-on-touch: ModuleView was 529 lines when the
 * WP5 view-type picker landed). [tier-2 pattern]
 *
 * Owns: the tab list (blueprint seed merged with the adapter's saved views),
 * the active view (controlled/uncontrolled), each view's serializable
 * `ViewState` body, and create/delete through the injected adapter — WITH a
 * local-only fallback when no adapter is wired, so `+` never silently
 * disappears and never becomes a one-way control (see the create/delete
 * comments below). The hook never fetches or stores beyond the adapter
 * (Rule 8).
 */
/**
 * The QUERY part of a view state — what the module TOOLBAR owns (the filter
 * panel, the search box, the sort control), as opposed to the per-lens DISPLAY
 * part (`groupBy`, `displayMode`).
 *
 * FIX WAVE C-4 / P0-2. Filters/search/sort used to live per view TAB, so
 * switching a filtered List to Kanban activated the Kanban tab's own (empty)
 * state and the board painted every record — the filter looked "ignored",
 * while switching back to List restored it. But the toolbar carrying those
 * controls is ONE toolbar rendered above every lens: the query the user can
 * see in it must be the query every lens renders. So the query part is held
 * ONCE per module here and merged over whichever view is active, while the
 * display part stays per view (a lens's grouping/density is genuinely its
 * own). A saved view's persisted query still applies — it is adopted as the
 * shared query the first time that view is activated.
 */
type QueryBody = Pick<ViewStateBody, 'filters' | 'search' | 'sort' | 'groupBy'>

/** The defined query keys of a view state — absent keys must not shadow. */
function queryOf(state: ViewStateBody | undefined): QueryBody {
  const out: QueryBody = {}
  if (!state) return out
  if (state.filters !== undefined) out.filters = state.filters
  if (state.search !== undefined) out.search = state.search
  if (state.sort !== undefined) out.sort = state.sort
  // FM-6271 — the Kanban⇄List toggle preserves the active grouping the same
  // way it preserves filters/search/sort: grouping is part of the ONE query
  // the shared toolbar shows, not a per-lens display preference. Lenses that
  // cannot express it (`hybrid`, `calendar`) simply ignore it, exactly as
  // they ignore an inapplicable sort.
  if (state.groupBy !== undefined) out.groupBy = state.groupBy
  return out
}

export function useSavedViewTabs({
  views,
  savedViews,
  context,
  activeViewId,
  onStateChange,
}: UseSavedViewTabsOptions) {
  const [tabs, setTabs] = useState<SavedView[]>(() => seedViews(views))
  // Keeps a synchronous read of the latest `tabs` for use inside async
  // continuations (see `deleteView`) — a plain closure over `tabs` there
  // would read whatever `tabs` was at the render that created the closure,
  // not the value as of the moment the promise resolves.
  const tabsRef = useRef(tabs)
  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])

  const [internalActiveId, setInternalActiveId] = useState<string>(() => seedViews(views)[0]?.id ?? '')
  // Controlled/uncontrolled, same shape as `HybridView`'s `selectedId`.
  const activeId = activeViewId ?? internalActiveId
  const [states, setStates] = useState<Record<string, ViewStateBody>>({})
  // The module-wide query (FIX WAVE C-4 / P0-2 — see `QueryBody`).
  const [query, setQuery] = useState<QueryBody>({})

  // Load saved views through the adapter (falls back to the blueprint seed).
  useEffect(() => {
    if (!savedViews) return
    let cancelled = false
    Promise.resolve(savedViews.list(context)).then((loaded) => {
      if (cancelled) return
      const seeded = seedViews(views)
      const merged = loaded.length ? [...seeded.filter((s) => !loaded.some((l) => l.id === s.id)), ...loaded] : seeded
      setTabs(merged)
      setInternalActiveId((cur) => (merged.some((v) => v.id === cur) ? cur : (merged[0]?.id ?? '')))
      setStates((cur) => {
        const next = { ...cur }
        for (const v of merged) if (v.state && !next[v.id]) next[v.id] = v.state
        return next
      })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedViews, context.userId, context.moduleId])

  const activeView = tabs.find((v) => v.id === activeId) ?? tabs[0]
  // Display part from the active view, query part from the module-wide state,
  // so EVERY lens filters/searches/sorts the same record set (C-4 / P0-2).
  const ownState = states[activeId] ?? activeView?.state
  const activeState: ViewStateBody = useMemo(() => ({ ...(ownState ?? {}), ...query }), [ownState, query])

  const emit = useCallback(
    (next: ViewStateBody) => {
      setStates((cur) => ({ ...cur, [activeId]: next }))
      setQuery(queryOf(next))
      onStateChange?.({ viewId: activeId, ...next })
    },
    [activeId, onStateChange],
  )

  /**
   * Switches the active view (tab click, a newly-created view becoming
   * active, or the fallback after deleting the active view) — the single
   * place that both drives the uncontrolled fallback and reports the change
   * out through `onStateChange`: the active view is part of the serializable
   * `ViewState`, not just filters/search/sort.
   */
  const switchActiveView = useCallback(
    (id: string, body?: ViewStateBody) => {
      if (activeViewId === undefined) setInternalActiveId(id)
      const own = body ?? states[id] ?? tabs.find((v) => v.id === id)?.state ?? {}
      /*
       * C-4 / P0-2: the shared query carries across the switch. A view being
       * activated for the FIRST time and carrying a persisted query of its own
       * (a saved view, or an explicit `body`) adopts it instead — that query is
       * the point of saving the view.
       */
      const visited = states[id] !== undefined
      // An explicit `body` IS the query (a freshly created view's defaults —
      // an empty query, deliberately, not a copy of the active one).
      const adopted = visited ? {} : queryOf(own)
      const nextQuery = body !== undefined ? queryOf(body) : Object.keys(adopted).length ? adopted : query
      if (nextQuery !== query) setQuery(nextQuery)
      onStateChange?.({ viewId: id, ...own, ...nextQuery })
    },
    [activeViewId, states, tabs, query, onStateChange],
  )

  /**
   * Creates a saved view of the given kind with a de-duplicated default name
   * ("Map View", then "Map View 2", …, figma new-view spec §Create Only) and
   * DEFAULT state (the spec's "renders the new view immediately with
   * defaults" — not a copy of the active view's filters), then activates it.
   *
   * WITH a `savedViews` adapter the new view persists; WITHOUT one it falls
   * back to local-only tab state, so the create affordance itself is never
   * unavailable just because the app hasn't wired a backend for it yet.
   * `deleteView` is symmetric — see its comment.
   */
  const createView = useCallback(
    (kind: ViewKind): Promise<SavedView> => {
      const taken = new Set(tabsRef.current.map((v) => String(v.label)))
      // Dedupe base uses the same context-aware name the picker card showed
      // (SPEC §2.1: "Map View", then "Map View 2", …). The created kind
      // itself joins the context so e.g. creating `hybrid`'s sibling stays
      // consistent even when the seed set lacked it.
      const base = viewLabelIn(kind, [...views.map(viewSpecKind), kind])
      let label = base
      for (let n = 2; taken.has(label); n += 1) label = `${base} ${n}`
      const view: SavedView = { id: `view-${Date.now()}`, label, kind, state: {} }
      return Promise.resolve(savedViews?.save(context, view)).then(() => {
        setTabs((cur) => [...cur, view])
        switchActiveView(view.id, {})
        return view
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedViews, context.userId, context.moduleId, switchActiveView],
  )

  /**
   * Deletion is offered for exactly as long as there is something deletable —
   * a non-system view — rather than only when a persistence adapter happens
   * to be wired. It used to be gated behind `savedViews`, which made `+` a
   * ONE-WAY control in the demo/seed-only default: pressing it appended a tab
   * that could never be removed for the rest of the session, permanently
   * eating width in a 48px bar. WITH an adapter the delete persists; WITHOUT
   * one it is a local-state removal (nothing to persist, since the view was
   * local-only too). System (blueprint-declared) views stay undeletable
   * either way — the guard below, not the adapter, protects them.
   */
  const deleteView = useCallback(
    (id: string) => {
      const target = tabsRef.current.find((v) => v.id === id)
      if (!target || target.system) return
      Promise.resolve(savedViews?.delete(context, id)).then(() => {
        setTabs((cur) => cur.filter((v) => v.id !== id))
        if (activeId === id) {
          // Read the latest committed tabs through the ref rather than the
          // `tabs` closed over at render time — by the time this promise
          // resolves, other updates may already have landed.
          const next = tabsRef.current.filter((v) => v.id !== id)
          switchActiveView(next[0]?.id ?? '')
        }
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedViews, context.userId, context.moduleId, activeId, switchActiveView],
  )

  const hasDeletableView = activeView ? !activeView.system : false

  return {
    tabs,
    activeId,
    activeView,
    activeState,
    emit,
    switchActiveView,
    createView,
    deleteView,
    hasDeletableView,
  }
}
