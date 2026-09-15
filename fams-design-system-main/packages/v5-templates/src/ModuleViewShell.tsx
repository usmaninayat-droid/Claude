import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { Lock, Pencil, Pin, X } from '@fams/ui-kit/icons'
import {
  ModuleViewTabs,
  TopNav,
  TopNavSlotPortal,
  useTopNavSlots,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  type ModuleViewTab,
} from '@fams/ui-kit'
import { cn } from './lib/cn'

/**
 * THE one module-page horizontal gutter (24px / `px-6`) — the toolbar
 * (filters/search row), the KPI summary row, and the list/table body all
 * read from this SINGLE constant so they can never drift apart at the
 * container level again (2026-09-01 gutter-alignment fix: the KPI row and
 * list/table lived inside `module-view-shell-body`'s `p-6`, which already
 * matched the filters row's `px-6` in principle, but the two were two
 * independently-typed literals — a future edit to one with no reason to
 * touch the other was exactly how they COULD drift). Any lens body that
 * wants full-bleed content opts out via `bodyInset="flush"`, not by
 * overriding this token.
 */
const MODULE_GUTTER_X = 'px-6'

/**
 * A saved view's kind. Purely descriptive data for the app's own body
 * rendering (see `renderView`) — the shell itself never branches on it.
 */
export type ModuleViewType = 'list' | 'map' | 'kanban' | 'hybrid' | 'grid'

/**
 * A saved view — one entry in the module's view bar (e.g. "My open tickets",
 * a list view with a saved filter + column set). The shell only needs enough
 * to render a tab and dispatch a switch; the filter/column/search DEFINITION
 * behind a view is app data, never passed to this component.
 */
export interface ModuleView {
  id: string
  label: ReactNode
  type: ModuleViewType
  /** Leading tab icon (see `ModuleViewTabs`' own `icon` field). */
  icon?: ComponentType<{ className?: string }>
  /** Renders the tab inert — a view kind with no real body yet ("coming soon"). */
  disabled?: boolean
  /**
   * The view is pinned (Customize View / the view menu's `Pin View`). The
   * shell renders a pin glyph BEFORE the tab label and floats the tab to the
   * FRONT of the strip (figma live-monitoring 495:51049 / SPEC §2.1). Purely
   * presentational — the caller still owns persistence.
   */
  pinned?: boolean
  /**
   * The view is protected (`Protect View`) — a lock glyph renders AFTER the
   * label (495:53979).
   */
  locked?: boolean
}

/**
 * One row of the active tab's `⋮` menu (figma live-monitoring 495:45132).
 * The plain `{ id, label, onSelect }` shape is the original one and still
 * renders an ordinary item — `kind` is additive, so existing callers are
 * untouched.
 */
export type ModuleViewMenuItem =
  | {
      kind?: 'item'
      id: string
      label: string
      /** 16px lead glyph (SPEC §2.9's row anatomy). */
      icon?: ReactNode
      destructive?: boolean
      /**
       * Renders the row inert. The row STAYS in the menu — a row set that
       * shrinks per view kind teaches a different menu on every tab; a
       * disabled row with `disabledReason` says why instead.
       */
      disabled?: boolean
      /** `title` on a disabled row — the reason it cannot be used here. */
      disabledReason?: string
      /**
       * `false` keeps the menu OPEN after the row fires. Needed by any row
       * whose feedback is an in-place label swap: `Copy Link to View` flips to
       * `Copied!` for ~2s (495:56908), which nobody can see if selecting the
       * row also dismisses the menu (round-2 interaction 2e). Defaults to
       * `true` — every existing caller is unchanged.
       */
      closeOnSelect?: boolean
      onSelect: (viewId: string) => void
    }
  | { kind: 'separator'; id: string }
  | {
      kind: 'toggle'
      id: string
      label: string
      /** 16px lead glyph (SPEC §2.9's row anatomy). */
      icon?: ReactNode
      checked: boolean
      disabled?: boolean
      disabledReason?: string
      onCheckedChange: (checked: boolean, viewId: string) => void
    }
  | {
      kind: 'submenu'
      id: string
      label: string
      /** 16px lead glyph (SPEC §2.9's row anatomy). */
      icon?: ReactNode
      disabled?: boolean
      disabledReason?: string
      /** Currently-selected option value — also the row's trailing summary. */
      value: string
      options: { value: string; label: string }[]
      onValueChange: (value: string, viewId: string) => void
    }

export interface ModuleViewShellProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** The module's saved views (order = tab order). */
  views: ModuleView[]
  /** Controlled active view id. */
  activeViewId: string
  /** Fires with the newly-selected view id. The shell does not switch itself. */
  onViewChange: (id: string) => void
  /**
   * Fires when the ALREADY-ACTIVE view tab is clicked (a same-value click
   * never reaches `onViewChange`) — e.g. to cancel a transient takeover like
   * the new-view picker. Optional.
   */
  onActiveViewClick?: (id: string) => void
  /**
   * Presence adds the `+` affordance to the view bar. Fires on click — the
   * shell does not create or persist anything; the app opens its own
   * "new view" flow (naming, initial filter set) and appends the result to
   * `views` once saved.
   */
  onCreateView?: () => void
  /**
   * Presence adds a per-view delete affordance next to the view bar,
   * scoped to the active view. Fires with the view's id — the shell does
   * not remove the view or call an API; the app deletes server-side and
   * drops the entry from `views` (and picks a new `activeViewId`).
   */
  onDeleteView?: (id: string) => void
  /**
   * Which tabs `onDeleteView` may actually be offered for. Round-4 finding
   * F4: the per-tab hover `x` used to be gated on the ACTIVE view's
   * deletability, so with an undeletable (system) view active NO tab ever
   * offered an `x`, and with a deletable one active the `x` appeared on tabs
   * that could not be deleted. Deletability is a property of the HOVERED tab,
   * so the shell asks per id.
   *
   * Defaults to "every tab", which is main's behaviour for every caller that
   * passes `onDeleteView` unconditionally.
   */
  canDeleteView?: (id: string) => boolean
  /**
   * Extra entries for the active view's `⋮` menu, above Delete (e.g.
   * "Customize View", figma live-monitoring spec §1.1). Each fires with the
   * active view's id; the shell renders and dispatches, nothing more.
   */
  viewMenuItems?: ModuleViewMenuItem[]
  /**
   * Per-tab hover `pencil-02` action (SPEC §2.1's hidden Actions group) —
   * "rename this view". Fires with the tab's id; the shell renames nothing.
   */
  onEditView?: (id: string) => void
  /**
   * Body padding. `'default'` keeps the 24px module-body frame every
   * saved-view module has always had; `'flush'` removes it for a body that
   * paints its own full-bleed surface (the live map hybrid — SPEC §2.1/§2.3
   * put the map flush to the viewport, visual #10). Defaults to `'default'`,
   * so no existing module changes.
   */
  bodyInset?: 'default' | 'flush'
  /** Renders the body for the given (active) view. */
  renderView: (view: ModuleView) => ReactNode
  /**
   * Body rendered when there is NO active view (`views` empty, or
   * `activeViewId` matching nothing) — e.g. `ModuleView`'s zero-views
   * "Select Preferred View" initial state (figma new-view spec: "if the
   * module has zero views yet, the picker is the module's initial state").
   * Omit to render nothing, the previous behavior.
   */
  emptyState?: ReactNode
  /**
   * Optional page title for the shell's OWN header bar. Ignored when the shell
   * is hosted inside an `AppShell`, which already renders the one bar and owns
   * the title (see the component doc). Omit for an embedded shell with no
   * header row.
   */
  title?: ReactNode
  /** Header action content (buttons), placed in the bar's actions region. */
  actions?: ReactNode
  /**
   * Filter chrome for the active view (chips, a `FilterPanel` trigger, a
   * date range…). Content and behavior are entirely the caller's — the
   * shell only reserves the row and never inspects what's inside.
   */
  filters?: ReactNode
  /** Search input for the active view. Same contract as `filters`. */
  search?: ReactNode
  /** Accessible label + i18n string for the create-view control. */
  createViewLabel?: string
  /** Accessible label + i18n string for the delete-view control. */
  deleteViewLabel?: string
}

/**
 * ModuleViewShell — the v5 saved-view module workhorse. **Draft exemplar —
 * for design review.** [v5-templates]
 *
 * A bar of saved views (each a saved filter/column/search configuration)
 * plus a swappable body that renders whichever view is active. This is the
 * shape behind roughly 85% of v5 modules — the real analogue is
 * `ModuleViewLayout.vue` + `ViewTabs.vue` wired to `useViewStore`, repeated
 * per-module across the v5 codebase with only the saved-view *data* varying.
 *
 * ## Composition (compose, never fork — `docs/BOUNDARIES.md` § the patterns tier)
 *
 * - The header row IS `TopNav` — figma-spec-nav §3's "Top Navbar": a 48px bar
 *   holding the Page Title and the view-tab strip in ONE bar, matching the
 *   design exactly instead of stacking a separate title row above a separate
 *   tab row.
 *
 *   **Which bar, though.** Under an `AppShell` the app ALREADY renders that one
 *   bar — it is the bar that survives navigation and owns the mobile hamburger,
 *   and it already knows the module title from route state (so the title needs
 *   no lazy page load to appear). Rendering a second `TopNav` here is what
 *   produced the stacked-bars defect. So when hosted, this shell PORTALS its tab
 *   strip and its actions into the app's bar (`TopNavSlotPortal`) and renders no
 *   bar of its own; `title` is then the app shell's to supply, and this shell's
 *   `title` prop is ignored. Standalone — a showcase demo, a unit test, an app
 *   that doesn't use `AppShell` — it renders its own `TopNav`, with `title` as
 *   an `<h1>` in the `brand` slot (compose an icon + text node yourself, e.g.
 *   `title={<><Truck className="size-5" />Fleet</>}`, for the spec's icon+text
 *   anatomy). Either way exactly one 48px bar exists.
 * - `ModuleViewTabs` (the `navbar` variant — figma-spec-nav §3's shared-
 *   border tab anatomy) renders the tab strip itself — `views` maps
 *   straight to its `{ id, label }` shape. `ModuleView.type` is carried
 *   through to `renderView` for the app to key its body off of (a
 *   `DataTable` for `'list'`, a `MapContainer` for `'map'`…) but the shell
 *   never branches on it itself, and doesn't pick a per-type icon — that's
 *   `ModuleViewTabs`' own `icon` field to set per view if the app wants one
 *   (see `ModuleViewTabsDemo`'s Hybrid/List/Map/Kanban set), not a business
 *   rule worth baking into this shell.
 *   `onCreateView` is threaded straight through as `ModuleViewTabs`'
 *   `onAddView` — the tab strip's own trailing "+" affordance is exactly the
 *   spec's "+ button… sits at the end of the tab row", no separate control
 *   needed.
 * - Deleting a *saved view* is a different shape than `ModuleViewTabs`
 *   supports (it has no per-tab menu — see its own doc comment on why:
 *   `ViewTabs.tsx` already owns the browser-style rename/close facet, and
 *   `ModuleViewTabs` deliberately covers only the plain kind-switch). Rather
 *   than fork `ModuleViewTabs` to add one, this shell adds an adjacent
 *   `DropdownMenu` scoped to the active view, passed into `TopNav`'s
 *   `actions` slot alongside any caller-supplied `actions` — composing core
 *   primitives next to the tab strip instead of reaching inside it.
 * - `filters`/`search` render in a SEPARATE row below the navbar — the
 *   figma-spec-kanban/list "toolbar" (search, filter, sort, assignee,
 *   density, create — see `ModuleViewFilters`), which is visually and
 *   structurally distinct from the title+tabs bar above it.
 *
 * ## The DS/app boundary — the reason this component exists as an exemplar
 *
 * This shell is presentational — the view TABS are chrome; the saved-view
 * definitions (filters/columns/search) and their server persistence are the
 * consuming app's concern (a useModuleView-style hook), passed in as `views`
 * + reported out via callbacks. The shell never fetches or stores.
 *
 * Concretely: `views` arrives fully formed, `renderView` hands back whatever
 * body the app wants for the active view (a `DataTable`, a `MapContainer`, a
 * `KanbanBoard`…), and `onViewChange` / `onCreateView` / `onDeleteView` are
 * pure intent callbacks. Nothing in this file ever imports a fetcher, a
 * store, or a router. An app wires it as:
 *
 * ```tsx
 * const { views, activeViewId, setActiveViewId, createView, deleteView } = useModuleView(moduleId)
 * <ModuleViewShell
 *   views={views}
 *   activeViewId={activeViewId}
 *   onViewChange={setActiveViewId}
 *   onCreateView={createView}
 *   onDeleteView={deleteView}
 *   renderView={(view) => <BinComplianceBody view={view} />}
 * />
 * ```
 *
 * Tokens only, RTL-safe (logical `gap`/`justify-end` — no physical-direction
 * utilities), `data-slot` on every rendered part.
 */
/** One tab's measured actions box, in strip-relative LOGICAL pixels. */
interface TabActionsBox {
  /** Distance from the STRIP's end edge to the TAB's end edge. */
  end: number
  top: number
  height: number
}

/**
 * A disabled menu row keeps its pointer events (Radix already blocks the
 * selection itself), so the `title` carrying the REASON is actually reachable
 * on hover — `pointer-events-none` would make a disabled row silent about why
 * it is disabled, which is the whole point of keeping the row.
 */
const DISABLED_ROW = 'data-[disabled]:pointer-events-auto data-[disabled]:cursor-not-allowed'

/** Value equality for the measured box map — the render loop guard. */
function sameTabBoxes(a: Record<string, TabActionsBox>, b: Record<string, TabActionsBox>): boolean {
  const aKeys = Object.keys(a)
  if (aKeys.length !== Object.keys(b).length) return false
  return aKeys.every((key) => {
    const left = a[key]
    const right = b[key]
    return Boolean(right) && left.end === right.end && left.top === right.top && left.height === right.height
  })
}

export function ModuleViewShell({
  views,
  activeViewId,
  onViewChange,
  onActiveViewClick,
  onCreateView,
  onDeleteView,
  canDeleteView,
  viewMenuItems,
  onEditView,
  bodyInset = 'default',
  renderView,
  emptyState,
  title,
  actions,
  filters,
  search,
  createViewLabel = 'Add view',
  deleteViewLabel = 'Delete view',
  className,
  ...props
}: ModuleViewShellProps) {
  const activeView = views.find((view) => view.id === activeViewId) ?? null
  const isHosted = useTopNavSlots() !== null

  /*
   * Pinned views float to the FRONT of the strip (SPEC §3.3 "Pin (For Me/For
   * All) → pin icon + tab moves to front"). Stable within each half, so an
   * unpinned tab never shuffles relative to its neighbours.
   */
  const orderedViews = [...views.filter((v) => v.pinned), ...views.filter((v) => !v.pinned)]

  /** Per-tab deletability (F4) — the hovered tab's own, never the active one's. */
  const deletable = (id: string) => Boolean(onDeleteView) && (canDeleteView?.(id) ?? true)
  const hasViewMenu = Boolean(viewMenuItems?.length || (activeViewId && deletable(activeViewId)))
  /** Whether ANY per-tab affordance renders — gates the overlay + its gutter. */
  const hasTabActions = Boolean(hasViewMenu || onEditView || onDeleteView)

  const tabs: ModuleViewTab[] = orderedViews.map((view) => ({
    id: view.id,
    // Tab decorations (SPEC §2.1 / 495:48122·51049·53979): pin BEFORE the
    // icon+label, lock AFTER the label, plus a reserved gutter the actions
    // overlay below sits in so it never covers the label.
    //
    // The gutter is reserved on the ACTIVE tab ONLY (round-2 visual #13).
    // Reserving it on every tab widened the whole strip — 135/116/123px
    // against Figma's 110/92/98 — because only the active tab has a
    // PERSISTENT control to make room for. An inactive tab's pencil/✕ pair is
    // hover-only, so it gets no permanent gutter and instead floats over the
    // tab's trailing edge on its own opaque backdrop (below); Figma's
    // inactive tabs likewise reserve nothing (495:2998, 495:16050).
    label: (
      <span data-slot="module-view-tab-label" className="inline-flex min-w-0 items-center gap-1">
        {view.pinned ? (
          <Pin data-slot="module-view-tab-pin" className="size-3 shrink-0 text-primary" aria-label="Pinned view" />
        ) : null}
        <span className="min-w-0 truncate">{view.label}</span>
        {view.locked ? (
          <Lock data-slot="module-view-tab-lock" className="size-3 shrink-0 text-muted-foreground" aria-label="Protected view" />
        ) : null}
        {hasViewMenu && view.id === activeViewId ? (
          <span aria-hidden="true" data-slot="module-view-tab-gutter" className="w-4 shrink-0" />
        ) : null}
      </span>
    ),
    icon: view.icon,
    disabled: view.disabled,
  }))

  const viewMenu =
    hasViewMenu && activeView ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={viewMenuItems?.length ? 'View options' : deleteViewLabel}
            title={viewMenuItems?.length ? 'View options' : deleteViewLabel}
            data-slot="module-view-tab-menu"
            /* 24×24 (WCAG 2.2 SC 2.5.8, round-4 finding S2): at 20×20 the
               ⋮ was undersized AND its 24px circle intersected the tab it
               sits inside, so the spacing exception could not rescue it.
               Only the hover plate grows — the glyph is unchanged. */
            className="flex size-6 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true" className="text-base leading-none">
              ⋮
            </span>
          </button>
        </DropdownMenuTrigger>
        {/* UX finding 13: a menu welded to the viewport edge reads as
            clipped — Radix clamps it with a 16px margin instead.

            `align="start"` (round-2 visual #27): Figma 495:45132 hangs the
            menu to the trailing side of the ⋮, over the map, not back over
            the list panel — measured box 1920-x390→643 with the ⋮ at x≈416,
            i.e. the menu's START edge sits on the trigger. `end` alignment
            put it at x203→425, covering the panel it was launched from.
            Logical alignment, so RTL mirrors it for free. */}
        {/*
         * Box geometry (round-4 visual #9). 495:45132's menu measures
         * 1024-x208→343 / y26→222 → **253 x ~370**; round 4 measured
         * 223 x 347. The row PITCH already matched, so the delta is type
         * width plus block padding: `min-w-64` (256) for the width, `p-2` for
         * the block padding and a 8px separator gutter for the two rules.
         */}
        <DropdownMenuContent align="start" collisionPadding={16} className="min-w-64 p-2">
          {viewMenuItems?.map((item) => {
            if (item.kind === 'separator') return <DropdownMenuSeparator key={item.id} className="my-2" />
            /* Every row carries a 16px lead glyph (SPEC §2.9 row anatomy) and
               the gutter is reserved even for a row that supplies none, so the
               labels of a mixed set still line up on one edge. */
            const lead = (
              <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center text-muted-foreground [&_svg]:size-4">
                {item.icon}
              </span>
            )
            if (item.kind === 'toggle')
              return (
                <DropdownMenuCheckboxItem
                  key={item.id}
                  /* `switch`, not a checkmark: an unchecked checkmark row is
                     indistinguishable from a plain item, so `Autosave for Me`
                     / `Private View` / `Protect View` rendered state-blind
                     (round-2 visual #2, UX finding 5). Figma paints a switch
                     pill at the row's trailing edge on exactly these three. */
                  indicator="switch"
                  checked={item.checked}
                  disabled={item.disabled}
                  title={item.disabled ? item.disabledReason : undefined}
                  className={item.disabled ? DISABLED_ROW : undefined}
                  onCheckedChange={(checked) => item.onCheckedChange(checked === true, activeView.id)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {lead}
                  {item.label}
                </DropdownMenuCheckboxItem>
              )
            if (item.kind === 'submenu') {
              const current = item.options.find((option) => option.value === item.value)
              return (
                <DropdownMenuSub key={item.id}>
                  <DropdownMenuSubTrigger
                    aria-label={item.label}
                    disabled={item.disabled}
                    title={item.disabled ? item.disabledReason : undefined}
                    className={item.disabled ? DISABLED_ROW : undefined}
                    /*
                     * `Pin View  None ⌄`, not `Pin View  None ›` — round-4
                     * visual N2. SPEC §2.9 writes `›` and SPEC §2.7 writes
                     * `▾`; fix4 settled that contradiction FROM THE FRAMES in
                     * favour of the caret and applied it to the Customize
                     * View drawer, which left this surface as the only one
                     * still drawing a bold near-black right chevron. Both are
                     * value pickers, 495:45132 and 495:26635 both draw the
                     * light caret, so both now read the same way.
                     */
                    indicator="caret-down"
                  >
                    {lead}
                    <span className="flex-1">{item.label}</span>
                    <span className="text-caption text-muted-foreground">{current?.label ?? item.value}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={item.value}
                      onValueChange={(value) => item.onValueChange(value, activeView.id)}
                    >
                      {item.options.map((option) => (
                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )
            }
            return (
              <DropdownMenuItem
                key={item.id}
                destructive={item.destructive}
                disabled={item.disabled}
                title={item.disabled ? item.disabledReason : undefined}
                className={item.disabled ? DISABLED_ROW : undefined}
                onSelect={(event) => {
                  // `closeOnSelect: false` keeps an in-place confirmation
                  // ("Copied!") on screen — see the prop's doc comment.
                  if (item.closeOnSelect === false) event.preventDefault()
                  item.onSelect(activeView.id)
                }}
              >
                {lead}
                {item.label}
              </DropdownMenuItem>
            )
          })}
          {/* Fallback Delete row for callers that supply NO menu model of
              their own. A caller that DOES pass `viewMenuItems` owns its whole
              row set — SPEC §2.9 puts `Delete View` last, in grey with a trash
              icon, and appending a second red one after it would duplicate the
              row (round-2 visual #1). */}
          {onDeleteView && deletable(activeView.id) && !viewMenuItems?.length ? (
            <DropdownMenuItem destructive onSelect={() => onDeleteView(activeView.id)}>
              {deleteViewLabel}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null

  /*
   * Per-tab actions (SPEC §2.1 + 495:45132): Figma puts the `⋮` ON the ACTIVE
   * TAB, with a hidden hover `Actions` group (12×12 `pencil-02` + `x`) on any
   * tab. `ModuleViewTabs` renders each tab as a Radix `Trigger` — a real
   * `<button>` — so these controls CANNOT live inside the label without
   * nesting interactive elements (axe `nested-interactive`). They are instead
   * absolutely positioned over the tab they belong to, measured from the
   * strip; the label above reserves a gutter so nothing is covered.
   */
  const stripRef = useRef<HTMLDivElement | null>(null)
  /**
   * The strip node as STATE, not only as a ref. When the shell is hosted, the
   * strip is PORTALLED into `TopNav`'s tabs region, whose host node is itself
   * discovered in a later commit — so on the first commit `stripRef.current`
   * is still null and there is nothing to measure. The measurement effect
   * below keys on this value, which is how it learns the strip has arrived
   * without falling back to "re-measure on every render" (Phase 7 code review,
   * finding 10).
   */
  const [stripEl, setStripEl] = useState<HTMLDivElement | null>(null)
  const setStripNode = useCallback((node: HTMLDivElement | null) => {
    stripRef.current = node
    setStripEl(node)
  }, [])
  const [hoverTabId, setHoverTabId] = useState<string | null>(null)
  /**
   * One measured box PER TAB, keyed by view id. It used to be a SINGLE box for
   * a single overlay parked over `hoverTabId ?? activeViewId` — which could
   * only ever express ONE target, so hovering any other tab MOVED the active
   * tab's `⋮` away and unmounted it (the whole SPEC §2.9 view menu became
   * unreachable, and stayed unreachable across a reload while the pointer
   * rested on that tab). Two targets are simultaneously real — the ACTIVE tab
   * owns the `⋮`, a HOVERED tab owns its rename/close pair — so there is now
   * one overlay per target.
   */
  const [tabBoxes, setTabBoxes] = useState<Record<string, TabActionsBox>>({})

  const measureActions = useCallback(() => {
    const strip = stripRef.current
    // `ModuleViewTabs` renders one trigger per view IN ORDER, so the index is
    // the stable handle (Radix owns the trigger's own id/attributes).
    const tabEls = strip ? [...strip.querySelectorAll<HTMLElement>('[data-slot="module-view-tab"]')] : []
    if (!strip || tabEls.length === 0) {
      setTabBoxes((prev) => (Object.keys(prev).length === 0 ? prev : {}))
      return
    }
    const stripBox = strip.getBoundingClientRect()
    const rtl = typeof getComputedStyle === 'function' && getComputedStyle(strip).direction === 'rtl'
    const next: Record<string, TabActionsBox> = {}
    orderedViews.forEach((view, index) => {
      const tab = tabEls[index]
      if (!tab) return
      const tabBox = tab.getBoundingClientRect()
      /* Logical geometry, measured to the tab's END edge and pinned with
         `insetInlineEnd` — no transform, so RTL needs no compensation (the
         previous `insetInlineStart` + `translateX(-100%)` pair moved the
         overlay the WRONG way under `dir="rtl"`). Inline styles because
         load-bearing geometry must never depend on a Tailwind class the
         consuming app's build might not emit. */
      const endOffset = rtl ? tabBox.left - stripBox.left : stripBox.right - tabBox.right
      next[view.id] = { end: endOffset, top: tabBox.top - stripBox.top, height: tabBox.height }
    })
    // Identity-stable when nothing moved: this runs on EVERY render (the tab
    // strip has no resize event of its own), so a fresh object here would be
    // an infinite render loop.
    setTabBoxes((prev) => (sameTabBoxes(prev, next) ? prev : next))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ids only
  }, [orderedViews.map((view) => view.id).join(',')])

  /* One measurement per COMMIT THAT COULD HAVE MOVED A TAB — keyed on the tab
     identities and the active tab, not on "every render".
     Previously this was a bare `useLayoutEffect(fn)` with NO dependency array,
     so a DOM read + `setState` ran on every single render and was held back
     only by `sameTabBoxes`' value equality. That is the same shape as the
     "Maximum update depth exceeded" bug this cycle already spent a wave on
     (per-frame `setState` from an effect whose value never changed): safe only
     because nothing above this component currently re-renders per animation
     frame — a property of today's tree, not an invariant (Phase 7 code review,
     finding 10). The continuous cases are covered by the observer below. */
  useLayoutEffect(() => {
    if (!hasTabActions) return
    measureActions()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ids + active tab
  }, [hasTabActions, measureActions, stripEl, orderedViews.map((view) => view.id).join(','), activeViewId])

  useEffect(() => {
    if (!hasTabActions) return
    const strip = stripRef.current
    window.addEventListener('resize', measureActions)
    strip?.addEventListener('scroll', measureActions, true)
    /* Layout can move a tab without any React render at all — a font finishing
       loading, a sibling in the top nav growing, the strip itself being
       resized by a drawer opening. A `ResizeObserver` on the strip catches
       those by CONSTRUCTION, which is what lets the effect above stop
       measuring on every render. Guarded: jsdom in older environments and SSR
       have no `ResizeObserver`. */
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measureActions())
    if (strip && observer) {
      observer.observe(strip)
      for (const child of Array.from(strip.children)) observer.observe(child)
    }
    return () => {
      window.removeEventListener('resize', measureActions)
      strip?.removeEventListener('scroll', measureActions, true)
      observer?.disconnect()
    }
  }, [hasTabActions, measureActions, stripEl])

  /*
   * Which tabs get an overlay, in tab order:
   * - the ACTIVE tab, whenever it has a `⋮` menu — ALWAYS, never conditioned
   *   on hover, so the view menu survives a pointer resting anywhere else;
   * - a HOVERED tab that is NOT the active one, for the 12×12 `pencil-02` + `x`
   *   pair. Figma's own `⋮` frame (495:45132) hovers the ACTIVE tab and shows
   *   the `⋮` ALONE — the hover pair never joins it there, and it would be
   *   redundant anyway (the menu carries Rename and Delete View as rows).
   */
  const hasHoverActions = (id: string) => Boolean(onEditView) || deletable(id)
  const overlayTabIds = orderedViews
    .map((view) => view.id)
    .filter(
      (id) =>
        Boolean(tabBoxes[id]) &&
        (id === activeViewId
          ? Boolean(viewMenu)
          : id === hoverTabId && hasHoverActions(id)),
    )

  const tabStrip = (
    <ModuleViewTabs
      variant="navbar"
      views={tabs}
      active={activeViewId}
      onSelect={onViewChange}
      onActiveTabClick={onActiveViewClick}
      onAddView={onCreateView}
      addViewLabel={createViewLabel}
      /*
       * Visual #25: Figma's active tab is a WHITE tab flanked by the strip's
       * 1px grey-200 separators with NO 2px `#0072D6` underline. `ui-kit`'s
       * `navbar` variant adds that underline DELIBERATELY (white-on-grey-50
       * is ~1.03:1, under WCAG 1.4.11's 3:1 non-text floor) — see its cva
       * comment. The run's arbitration rule is "Figma wins on look", so the
       * shell suppresses it here rather than forking the variant; deleting
       * this one line restores the DS default if the brand owner rules the
       * other way.
       */
      className="[&_[data-slot=module-view-tab][data-state=active]]:shadow-none"
    />
  )

  const tabStripWithActions = hasTabActions ? (
    <div
      ref={setStripNode}
      data-slot="module-view-tab-strip"
      className="relative flex h-full min-w-0 items-stretch"
      onPointerOver={(event) => {
        const strip = stripRef.current
        const target = event.target as HTMLElement | null
        /*
         * The actions overlay is a SIBLING of the tablist (it has to be: it is
         * absolutely positioned against the strip from measured tab boxes, and
         * `insetInlineEnd` is what makes it RTL-correct without a transform).
         * So the pointer crossing onto the pencil/x leaves every
         * `[data-slot="module-view-tab"]` subtree, `closest()` returned null,
         * `hoverTabId` was cleared, the overlay unmounted, the pointer was
         * over the bare tab again and it remounted — 22 mount/unmount events
         * in 2s with the pointer AT REST, and the press landing ~1 time in 3
         * (round-5 interaction gate R5-1, P1).
         *
         * The overlay carries its own tab id, so containment can be answered
         * without `closest()` on the tablist. Checked FIRST, and it re-asserts
         * the same id, so React's value-equality bail-out means hovering the
         * controls causes no state change and no re-render at all.
         */
        const actions = target?.closest<HTMLElement>('[data-slot="module-view-tab-actions"]')
        if (actions?.dataset.tabId) {
          setHoverTabId(actions.dataset.tabId)
          return
        }
        const tab = target?.closest<HTMLElement>('[data-slot="module-view-tab"]')
        if (!strip || !tab) {
          setHoverTabId(null)
          return
        }
        const index = [...strip.querySelectorAll<HTMLElement>('[data-slot="module-view-tab"]')].indexOf(tab)
        setHoverTabId(orderedViews[index]?.id ?? null)
      }}
      onPointerLeave={() => setHoverTabId(null)}
    >
      {tabStrip}
      {overlayTabIds.map((tabId) => {
        const box = tabBoxes[tabId]
        const isActive = tabId === activeViewId
        return (
          <div
            key={tabId}
            data-slot="module-view-tab-actions"
            data-tab-id={tabId}
            style={{
              insetInlineEnd: `${box.end}px`,
              top: `${box.top}px`,
              height: `${box.height}px`,
            }}
            className={cn(
              'absolute z-20 flex items-center gap-0.5 pe-2',
              // The active tab reserves a gutter for its persistent ⋮, so its
              // overlay needs no backdrop. A hovered INACTIVE tab reserves
              // nothing (visual #13), so its transient pair rides an opaque
              // card-coloured plate rather than sitting on top of the label.
              isActive ? null : 'bg-card ps-1',
            )}
          >
            {!isActive && onEditView ? (
              <button
                type="button"
                aria-label="Rename view"
                title="Rename view"
                data-slot="module-view-tab-edit"
                onClick={() => onEditView(tabId)}
                className="flex size-6 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pencil className="size-3" aria-hidden="true" />
              </button>
            ) : null}
            {!isActive && onDeleteView && deletable(tabId) ? (
              <button
                type="button"
                // Distinct from the `⋮` trigger's own accessible name (which
                // stays `deleteViewLabel` when the menu has no extra rows), so
                // the two controls are never ambiguous to AT or to a selector.
                aria-label="Remove view"
                title={deleteViewLabel}
                data-slot="module-view-tab-close"
                onClick={() => onDeleteView(tabId)}
                className="flex size-6 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            ) : null}
            {isActive ? viewMenu : null}
          </div>
        )
      })}
    </div>
  ) : (
    tabStrip
  )

  const barActions = actions ?? null

  return (
    <div
      data-slot="module-view-shell"
      className={cn('flex h-full min-h-0 flex-col', className)}
      {...props}
    >
      {/*
       * Inside an `AppShell`, the app already renders ONE top bar carrying the
       * module title (it survives navigation and owns the mobile drawer
       * trigger), so this shell fills that bar's tabs/actions regions instead
       * of rendering a second bar under it — the merge Figma's single 48px
       * "Top Navbar" asks for. Standalone (a showcase demo, a unit test, an app
       * that doesn't use `AppShell`) there is no host, so it renders its own
       * bar exactly as before. `useTopNavSlots()` returning non-`null` is the
       * host signal and is known on the FIRST render, so a second bar never
       * appears, not even for a frame — see `top-nav-slot.tsx`.
       */}
      {isHosted ? (
        <>
          <TopNavSlotPortal region="tabs">{tabStripWithActions}</TopNavSlotPortal>
          {barActions ? <TopNavSlotPortal region="actions">{barActions}</TopNavSlotPortal> : null}
        </>
      ) : (
        <TopNav
          brand={title ? <h1 className="truncate font-bold">{title}</h1> : undefined}
          tabs={tabStripWithActions}
          actions={barActions ?? undefined}
        />
      )}

      {filters || search ? (
        <div
          data-slot="module-view-shell-filters"
          className={cn('flex flex-wrap items-center gap-3 bg-background py-3', MODULE_GUTTER_X)}
        >
          {search}
          {filters}
        </div>
      ) : null}

      {/* `MODULE_GUTTER_X` (24px, `px-6`) is THE module-body horizontal inset —
          the same 24px frame `DashboardLayout` gives dashboard modules,
          applied here once so every saved-view module (list/kanban/hybrid/
          map) matches the filters row above without per-view padding. Read
          from the SAME constant as `module-view-shell-filters` above so the
          toolbar, the KPI summary row, and the list/table body all share one
          left/right gutter at the container level. This div itself never
          scrolls (`DataTable` owns its own inner `overflow-auto` scroller,
          sized to fill the remaining flex space) — `scrollbar-gutter:stable`
          was tried here first and rejected: it reserves scrollbar space
          unconditionally on ANY `overflow-auto` box regardless of whether
          THAT box actually overflows, which pulled the KPI row and table 15px
          in from the filters row's right edge for no real scrollbar (see
          2026-09-01 gutter-alignment verification run). If a future lens
          needs scrollbar-safe gutters, add `scrollbar-gutter:stable` to the
          element that ACTUALLY scrolls, not this pass-through frame. */}
      <div
        data-slot="module-view-shell-body"
        className={cn(
          'min-h-0 flex-1 overflow-auto',
          // Top inset is intentionally zero (`pt-0` vs `pb-6`): the filters/
          // search row above already supplies its own `py-3` bottom padding,
          // so ANY body top here stacks on top of that, plus the lens's own
          // reserved count row, and reads as a dead band between the toolbar
          // and the first content. Zero top collapses the doubled inset while
          // `pb-6` keeps the same bottom breathing room dashboards use.
          bodyInset === 'flush' ? 'p-0' : cn('pt-0 pb-6', MODULE_GUTTER_X),
        )}
      >
        {activeView ? renderView(activeView) : (emptyState ?? null)}
      </div>
    </div>
  )
}

ModuleViewShell.displayName = 'ModuleViewShell'
