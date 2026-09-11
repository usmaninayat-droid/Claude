import type { ViewKind } from '@fams/v5-composer'
import type { KanbanDisplayMode } from './kanban/kanban-display'

/**
 * Saved-views contract for `ModuleView`. [tier-2 pattern]
 *
 * A **saved view** is one entry in a ClickUp-style module view bar: a named
 * configuration pairing a *view kind* (list / kanban / hybrid …) with a
 * serializable slice of view state (filters, sort, search). The set of a
 * user's saved views for a module is persisted through an injected
 * `SavedViewsAdapter` — the template NEVER fetches or stores on its own
 * (Rule 8); the adapter is the single IO boundary, supplied by the app.
 *
 * `ViewState` is deliberately JSON-serializable so a TanStack Router search
 * param can hold it (wiring lives in apps, not here).
 */

/** Sort descriptor — mirrors the DataTable `SortState` shape, kept local + serializable. */
export interface ViewSort {
  key: string
  direction: 'asc' | 'desc'
}

/**
 * A `kind: 'date'` facet's applied value (UCCP pipeline-actions spec: every
 * date field filters on a RANGE, WITH time-of-day). ISO date strings — never
 * `Date` objects — so `ViewState` stays JSON-serializable end to end.
 * Times are 24h `HH:mm`, applied to the range bounds when present (an empty
 * time means "from start of day" / "to end of day").
 */
export interface DateRangeFilterValue {
  from?: string
  to?: string
  startTime?: string
  endTime?: string
}

/** Narrow guard for the date-range filter shape inside `ViewState.filters`. */
export function isDateRangeFilterValue(value: unknown): value is DateRangeFilterValue {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false
  const v = value as Record<string, unknown>
  const keys = ['from', 'to', 'startTime', 'endTime']
  const own = Object.keys(v)
  if (own.length === 0 || !own.every((k) => keys.includes(k))) return false
  return own.every((k) => v[k] === undefined || typeof v[k] === 'string')
}

/**
 * Parses a stored date string as a LOCAL calendar date. A bare `yyyy-MM-dd`
 * fed to `new Date()` is treated as UTC midnight, which shifts the day for
 * negative offsets — anchoring it with a local `T00:00:00` keeps the picked
 * day the day the user saw.
 */
function parseLocalDate(iso: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso)
}

/** `from`/`to` bounds as epoch ms, with time-of-day folded in. */
function dateRangeBounds(value: DateRangeFilterValue): { min: number; max: number } {
  const dayStart = (iso: string, hhmm?: string): number => {
    const d = parseLocalDate(iso)
    const [h, m] = (hhmm ?? '').split(':').map((n) => Number.parseInt(n, 10))
    d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0)
    return d.getTime()
  }
  const dayEnd = (iso: string, hhmm?: string): number => {
    const d = parseLocalDate(iso)
    const [h, m] = (hhmm ?? '').split(':').map((n) => Number.parseInt(n, 10))
    if (Number.isFinite(h)) d.setHours(h as number, Number.isFinite(m) ? (m as number) : 0, 59, 999)
    else d.setHours(23, 59, 59, 999)
    return d.getTime()
  }
  return {
    min: value.from ? dayStart(value.from, value.startTime) : Number.NEGATIVE_INFINITY,
    max: value.to ? dayEnd(value.to, value.endTime) : value.from ? dayEnd(value.from, value.endTime) : Number.POSITIVE_INFINITY,
  }
}

/**
 * The serializable state of an active view: which saved view is active, its
 * filter values (col → primitive/array), free-text search, and sort. Safe to
 * round-trip through `JSON.stringify` / router search params.
 */
export interface ViewState {
  /** Active saved-view id. */
  viewId: string
  /** Filter values keyed by facet col (string | string[] | boolean | null). */
  filters?: Record<string, string | string[] | boolean | null | DateRangeFilterValue>
  /** Free-text search query. */
  search?: string
  /** Active sort, or null for none. */
  sort?: ViewSort | null
  /**
   * The list view's active group-by column (figma-spec-list.md §4 — the
   * grouped variant), or `null`/omitted for the flat table. Kanban/hybrid
   * views ignore this — it only ever affects `ModuleView`'s `list` body.
   */
  groupBy?: string | null
  /**
   * The kanban lens's card-media mode — `'data'` is the toolbar's "Data-only
   * view" state (frame `33534:32278`), `'image'` the thumbnail state (frame
   * `33534:32740`). Lives here, not in component state, because the design
   * requires the choice to be STICKY per view; other lenses ignore it.
   */
  displayMode?: KanbanDisplayMode
  /**
   * Stage/column ids pinned to the front of the kanban board, in pin order
   * (Figma target 11 "Pin Column"). Sticky per view for the same reason as
   * `displayMode`; other lenses ignore it.
   */
  pinnedColumns?: string[]
}

/** A persisted, named view configuration. */
export interface SavedView {
  /** Stable id (unique per user+module). */
  id: string
  /** Display label for the tab. */
  label: string
  /** The view body to render (list / kanban / hybrid …). */
  kind: ViewKind
  /** Persisted filter/sort/search for this view (defaults to empty). */
  state?: Omit<ViewState, 'viewId'>
  /** System views (seeded from the blueprint) can't be deleted. */
  system?: boolean
  /**
   * Tab glyph-name override, from the blueprint's own `ViewSpec.icon`. Omit →
   * the tab falls back to the kind's default glyph (`VIEW_TAB_ICON` in
   * `ModuleView`). A NAME, not a component, because it travels through
   * blueprint JSON.
   */
  icon?: string
}

/** Scopes a saved-view lookup to one user and one module. */
export interface SavedViewsContext {
  userId: string
  moduleId: string
}

/**
 * Persistence port for saved views. Methods may be sync or async — `ModuleView`
 * awaits either. Implemented by the app (server-backed); the in-memory
 * implementation below is the default for demos + tests.
 */
export interface SavedViewsAdapter {
  list(ctx: SavedViewsContext): SavedView[] | Promise<SavedView[]>
  get(ctx: SavedViewsContext, id: string): SavedView | null | Promise<SavedView | null>
  save(ctx: SavedViewsContext, view: SavedView): SavedView | Promise<SavedView>
  delete(ctx: SavedViewsContext, id: string): void | Promise<void>
}

function keyOf(ctx: SavedViewsContext): string {
  return `${ctx.userId}::${ctx.moduleId}`
}

/**
 * In-memory `SavedViewsAdapter` — the default for demos + tests. Holds views
 * in a `Map` keyed by `userId::moduleId`; nothing touches the network or
 * browser storage. Seed it with `{ [userId::moduleId]: SavedView[] }`.
 */
export class InMemorySavedViewsAdapter implements SavedViewsAdapter {
  private store = new Map<string, SavedView[]>()

  constructor(seed?: Record<string, SavedView[]>) {
    if (seed) for (const [k, v] of Object.entries(seed)) this.store.set(k, [...v])
  }

  list(ctx: SavedViewsContext): SavedView[] {
    return [...(this.store.get(keyOf(ctx)) ?? [])]
  }

  get(ctx: SavedViewsContext, id: string): SavedView | null {
    return this.list(ctx).find((v) => v.id === id) ?? null
  }

  save(ctx: SavedViewsContext, view: SavedView): SavedView {
    const k = keyOf(ctx)
    const current = this.store.get(k) ?? []
    const next = current.some((v) => v.id === view.id)
      ? current.map((v) => (v.id === view.id ? view : v))
      : [...current, view]
    this.store.set(k, next)
    return view
  }

  delete(ctx: SavedViewsContext, id: string): void {
    const k = keyOf(ctx)
    this.store.set(k, (this.store.get(k) ?? []).filter((v) => v.id !== id))
  }
}

/**
 * Apply a `ViewState` to a record set — pure, serializable-in / array-out, so
 * both `ModuleView` and tests share one filtering/sort/search implementation.
 * `searchColumns` are the record keys free-text search scans.
 */
export function applyViewState<T extends Record<string, unknown>>(
  records: T[],
  state: Omit<ViewState, 'viewId'> | undefined,
  searchColumns: string[],
): T[] {
  if (!state) return records
  let out = records

  const filters = state.filters ?? {}
  const activeFilters = Object.entries(filters).filter(
    ([, v]) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0),
  )
  if (activeFilters.length) {
    out = out.filter((rec) =>
      activeFilters.every(([col, want]) => {
        const have = rec[col]
        /*
         * UCCP pipeline actions — a date facet's `{from,to,startTime,endTime}`
         * range (see `DateRangeFilterValue`): the record's own date-typed
         * value must fall inside the inclusive bounds, time-of-day included.
         * An unparsable/absent record value never matches an active range.
         */
        if (isDateRangeFilterValue(want)) {
          if (have == null || have === '') return false
          const ts = new Date(String(have)).getTime()
          if (Number.isNaN(ts)) return false
          const { min, max } = dateRangeBounds(want)
          return ts >= min && ts <= max
        }
        /*
         * FIX WAVE C-3 / P0 — a MULTI-VALUED record column (an `Assignee` or
         * `MultiReference` list, a tag array) matches on MEMBERSHIP: the
         * record is kept when any of its own values is wanted. Previously only
         * `String(have)` was compared, i.e. the array's comma-joined form,
         * which matched a one-element array by luck and a two-element one
         * never — the reason a real assignee pick filtered a task list to
         * zero. Scalar columns are compared exactly as before.
         */
        if (Array.isArray(have)) {
          const mine = have.map(String)
          if (Array.isArray(want)) return want.some((w) => mine.includes(String(w)))
          if (typeof want === 'boolean') return Boolean(have.length) === want
          return mine.includes(String(want))
        }
        if (Array.isArray(want)) return want.map(String).includes(String(have))
        if (typeof want === 'boolean') return Boolean(have) === want
        return String(have) === String(want)
      }),
    )
  }

  const q = state.search?.trim().toLowerCase()
  if (q) {
    out = out.filter((rec) =>
      searchColumns.some((col) => String(rec[col] ?? '').toLowerCase().includes(q)),
    )
  }

  if (state.sort) {
    const { key, direction } = state.sort
    const dir = direction === 'asc' ? 1 : -1
    out = [...out].sort((a, b) => {
      const av = a[key]
      const bv = b[key]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      return av < bv ? -dir : av > bv ? dir : 0
    })
  }

  return out
}
