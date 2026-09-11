import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, LayoutGrid, Layers, ListFilter, Rows3, Search, X } from '@fams/ui-kit/icons'
import {
  Avatar,
  Input,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  IconControl,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RadioGroup,
  RadioGroupItem,
  Checkbox,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@fams/ui-kit'
import type { FilterFacet, FiltersPanelConfig } from '@fams/v5-composer'
import {
  DEFAULT_KANBAN_DISPLAY_MODE,
  KANBAN_DISPLAY_MODE_LABEL,
  type KanbanDisplayMode,
} from './kanban/kanban-display'
import { FilterPanelV2, appliedCount } from './filters/FilterPanelV2'
import { selectedIdsOf } from './filters/FilterField'
import { ExpandableSelectorSheet, type SelectorRow } from './filters/ExpandableSelectorSheet'
import { entityRows, entityValueOf, needsRecordOptions, withEntityOptions } from './filters/entity-facet'
import { isTagsFacet, withTagOptions } from './filters/tags-facet'
import type { FilterSession } from './filters/use-filter-session'
import type { DateRangeFilterValue, ViewSort } from './saved-views'
import { cn } from '../lib/cn'

/**
 * One row in the SORT BY menu (Figma "Sorting" `33534:45591`): full-width,
 * caption type, label truncates. The active row's tint and the direction arrow
 * are applied by the caller, since the arrow is a SIBLING hit target rather
 * than part of the row button.
 */
const SORT_OPTION_CLASS =
  'flex min-w-0 flex-1 items-center gap-2 rounded-sm px-2 py-1.5 text-caption text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** A single group-by choice offered by the optional group-by dropdown. */
export interface ModuleViewGroupByOption {
  value: string
  label: string
}

/**
 * The module's group-by control (figma-spec-list.md §1 "Status" dropdown —
 * grouped variant only). Generic across ANY groupable column, not hardcoded
 * to a status field — the view enables it by passing this facet at all;
 * omitting it (the default) hides the control entirely, matching the flat
 * list variant.
 */
export interface ModuleViewGroupByFacet {
  /** Currently active group-by column, or `null` for "no grouping". */
  value: string | null
  options: ModuleViewGroupByOption[]
  onChange: (value: string | null) => void
  /** Trigger label when nothing is grouped. Defaults to `'Group by'`. */
  label?: string
}

/** A sortable column offered by the Sort control (blueprint-derived, so any module's sortable columns can drive it). */
export interface ModuleViewSortOption {
  col: string
  label: string
}

/** The module's Assignee-typed field, resolved to its distinct values — drives the Assignee split-dropdown. */
export interface ModuleViewAssigneeFacet {
  col: string
  label: string
  options: string[]
  /**
   * Resolves a raw stored value (e.g. a user id like `u_dispatcher`) to a
   * display name. Omit to show the raw value as-is — the facet's `options`
   * stay the actual filter values either way, only the on-screen label
   * changes (finding: assignee dropdown showed raw ids instead of names).
   */
  optionLabel?: (value: string) => string
  /**
   * Secondary line for an option row — an email address in Figma
   * (`33534:27561`). Omit for a single-line row. Like `optionLabel` this is
   * display-only; `options` stay the actual filter values.
   */
  optionDetail?: (value: string) => string | undefined
  /** Photo URL for an option's avatar. Omit to fall back to hashed initials. */
  optionAvatarUrl?: (value: string) => string | undefined
  /**
   * The signed-in user's id, when it is drawn from the same namespace as
   * `options`. Presence of this is what enables the "Filter for your Tasks"
   * quick-toggle and the pinned **You** row (Figma "Filter By You"
   * `33534:26092`); omit it — e.g. an unauthenticated preview — and the control
   * degrades to the plain multi-select list.
   */
  currentUserId?: string
}

export interface ModuleViewFiltersProps {
  facets: FilterFacet[]
  filters: Record<string, string | string[] | boolean | null | DateRangeFilterValue>
  onFilterChange: (col: string, value: string[]) => void
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  /** Sortable columns for the Sort control. Omit (or pass `[]`) to hide the control. */
  sortOptions?: ModuleViewSortOption[]
  /** Active sort, or `null`/`undefined` for none. */
  sort?: ViewSort | null
  /** Fires with the next sort (or `null` to clear). Required when `sortOptions` is non-empty. */
  onSortChange?: (sort: ViewSort | null) => void
  /** The module's Assignee facet. Omit to hide the split-dropdown (e.g. modules with no Assignee-typed field). */
  assigneeFacet?: ModuleViewAssigneeFacet
  /**
   * The module's group-by control (figma-spec-list.md §1 — list view's
   * grouped variant only; kanban has no group-by). Omit to hide it — a
   * generic slot the view opts into, never a hardcoded "group by status".
   * Renders between the Filter and Sort buttons, per spec.
   */
  groupByFacet?: ModuleViewGroupByFacet
  /**
   * Shows the trailing list/grid display-density toggle (figma-spec-kanban.md
   * §1's toolbar — legitimate there). figma-spec-list.md §1's own toolbar
   * table has no such control at all (round-1 design QA A4: it showed up in
   * the LIST toolbar too, since this one toolbar backs every view kind).
   * Defaults to `true` — unchanged behavior for any existing caller that
   * hasn't opted out; `ModuleView` passes `false` for the `list` view kind.
   */
  densityToggle?: boolean
  /**
   * The kanban display-mode (card-media) toggle's current value. Supplying it
   * makes the control CONTROLLED, which is what the design requires: the mode
   * is sticky per view, so the owner persists it in `ViewState.displayMode`
   * rather than this toolbar forgetting it on every remount. Omit and the
   * control keeps its own local state (the pre-existing, cosmetic behaviour).
   */
  displayMode?: KanbanDisplayMode
  /** Fires with the next display mode. Required for `displayMode` to be controlled. */
  onDisplayModeChange?: (mode: KanbanDisplayMode) => void
  /**
   * The `Export` control — an icon button that opens the `Export CSV` /
   * `Export Excel` menu (Figma overlay `33534:32261`). A slot rather than a
   * built-in so the toolbar stays presentational: `ModuleView` builds the real
   * `ExportMenu` over the FILTERED records it already computed. Omit to hide
   * the control (a view whose spec has no export — e.g. frame `33534:32278` —
   * simply passes nothing).
   */
  exportAction?: ReactNode
  /** Trailing "create record" action (e.g. a primary "Create New" button), right-aligned after the display toggle. */
  createAction?: ReactNode

  /* ── FAMILY C / WAVE C6 — the "All Filters" panel (v2) ──────────────── */

  /**
   * The view session (D-2), mounted ONCE per view instance by `ModuleView`
   * (`useFilterSession(moduleCode + viewId)`) and passed straight through.
   * It must outlive this toolbar — the panel unmounts on every close, the
   * session must not. Omit and the toolbar stays on the legacy flat facet
   * list no matter what the facets carry (see `isFilterPanelV2Active`).
   */
  session?: FilterSession
  /**
   * `uiConfig.filtersPanel` (D-1). Supplying it is one of the two v2
   * activation signals; every number inside is clamped by `FilterPanelV2`.
   */
  filtersPanel?: FiltersPanelConfig
  /**
   * The panel's `Clear all` (G.62 requires the view's zero-results empty
   * state to share this exact handler). Omit and `Clear all` falls back to
   * emitting an empty value for each panel-owned facet through
   * `onFilterChange`.
   */
  onClearAllFilters?: () => void
  /**
   * Rows for an `expandable` `kind: 'entity'` facet's side sheet (WAVE C5).
   * The DS layer has no reference-entity fetch of its own — `ModuleView`
   * defaults this to the view's OWN records, and a host/demo shell that can
   * resolve the referenced entity supplies a real resolver instead. May
   * return the rows synchronously or as a promise.
   */
  resolveExpandRows?: (facet: FilterFacet) => SelectorRow[] | Promise<SelectorRow[]>
  /**
   * FIX WAVE C-3 / P0 — `(id) => display name` for a REFERENCE column
   * (`Assignee`, `Single`/`MultiReference`): the host already owns this
   * mapping for the list cells and the toolbar's own Assignee control
   * (`ModuleView.resolveAssigneeName`), and an entity facet on such a column
   * needs exactly it — the value stays the stored id (so the view's filter
   * model still matches), the LABEL becomes the referenced row's name.
   */
  resolveEntityLabel?: (value: string) => string | undefined
  /**
   * R-37 — the create-from-search path, handed to BOTH the compact dropdown's
   * empty state and the Expandable Selector sheet's, so one affordance exists
   * in one place. Omit and the CTA still renders (the metadata asked for it)
   * but does nothing.
   */
  onCreateFromSearch?: (facet: FilterFacet, query: string) => void
}

/**
 * The v2 GATE (WAVE C6). The "All Filters" panel replaces the flat facet
 * dropdown when the module opted in — either by authoring
 * `uiConfig.filtersPanel` or by any facet carrying a v2 `kind`. A module
 * whose facets carry no v2 field at all renders EXACTLY the legacy UI, DOM
 * for DOM: that is what keeps every shipped blueprint (and this file's
 * pre-existing tests) unchanged until C7 opts the first module in.
 */
export function isFilterPanelV2Active(facets: FilterFacet[], filtersPanel?: FiltersPanelConfig): boolean {
  return Boolean(filtersPanel) || facets.some((facet) => facet.kind != null)
}

/**
 * J.95 — the facets the panel OWNS while it is active. A host that also
 * renders a page-level chip row (`LiveFilterChips`) must skip every column in
 * this set: the design's model puts the summary inside the field trigger and
 * the count inside the toolbar trigger (I.74), and shipping both metaphors on
 * one view is the defect the verdict names. Anything NOT in this set (the
 * search term, a facet the panel does not render) is unaffected.
 *
 * Empty while the panel is inactive, so a legacy view keeps every chip.
 */
export function panelOwnedFilterCols(
  facets: FilterFacet[],
  filtersPanel?: FiltersPanelConfig,
): Set<string> {
  if (!isFilterPanelV2Active(facets, filtersPanel)) return new Set()
  return new Set(facets.map((facet) => facet.col))
}

// Plain helper (not a hook — no React hook calls inside), deliberately not
// named `use*` so it can be called conditionally/in a `.map` below without
// tripping the rules-of-hooks lint rule.
function facetToggleState(col: string, filters: ModuleViewFiltersProps['filters'], onFilterChange: ModuleViewFiltersProps['onFilterChange']) {
  const active = (() => {
    const v = filters[col]
    return Array.isArray(v) ? v : v == null || v === '' ? [] : [String(v)]
  })()
  const toggle = (option: string, checked: boolean) => {
    onFilterChange(col, checked ? [...active, option] : active.filter((o) => o !== option))
  }
  return { active, toggle }
}

/**
 * ModuleViewFilters — the module toolbar: search + a single Filter popover
 * (housing every blueprint facet) + an optional Group-by dropdown + Sort +
 * an Assignee split-dropdown + a cosmetic display-density toggle + a
 * trailing create-action slot. [tier-2 internal]
 *
 * Every control past Search is data-driven and optional, so this one toolbar
 * serves any blueprint-driven module: `facets` come from `deriveFilters`,
 * `sortOptions` from a module's sortable columns, `assigneeFacet` only when
 * the blueprint has an `Assignee`-typed field, `groupByFacet` only when the
 * view enables grouping (figma-spec-list.md §1 — list-view only, kanban
 * omits it). Presentational — it reports changes out
 * (`onFilterChange`/`onSortChange`/`groupByFacet.onChange`) and applies
 * nothing itself.
 */
export function ModuleViewFilters({
  facets,
  filters,
  onFilterChange,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  sortOptions = [],
  sort,
  onSortChange,
  assigneeFacet,
  groupByFacet,
  densityToggle = true,
  displayMode,
  onDisplayModeChange,
  exportAction,
  createAction,
  session,
  filtersPanel,
  onClearAllFilters,
  resolveExpandRows,
  resolveEntityLabel,
  onCreateFromSearch,
}: ModuleViewFiltersProps) {
  const [sortOpen, setSortOpen] = useState(false)
  const [assigneeOpen, setAssigneeOpen] = useState(false)
  const [assigneeQuery, setAssigneeQuery] = useState('')
  const [uncontrolledMode, setUncontrolledMode] = useState<KanbanDisplayMode>(DEFAULT_KANBAN_DISPLAY_MODE)
  const activeMode = displayMode ?? uncontrolledMode
  const setMode = (mode: KanbanDisplayMode) => {
    if (displayMode === undefined) setUncontrolledMode(mode)
    onDisplayModeChange?.(mode)
  }
  const filterableFacets = facets.filter((facet) => facet.options?.length)
  const activeFilterCount = filterableFacets.reduce((sum, facet) => {
    const v = filters[facet.col]
    return sum + (Array.isArray(v) ? v.length : v != null && v !== '' ? 1 : 0)
  }, 0)

  /* ── FAMILY C / WAVE C6 — the v2 "All Filters" panel ────────────────── */
  const panelActive = isFilterPanelV2Active(facets, filtersPanel) && session != null
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [expandFacet, setExpandFacet] = useState<FilterFacet | null>(null)
  const expandTriggerRef = useRef<HTMLElement | null>(null)
  const panelApplied = useMemo(
    () => (panelActive ? appliedCount(facets, filters) : 0),
    [panelActive, facets, filters],
  )
  // I.74 — the trigger's accessible name IS the applied count; a bare
  // "Filter" icon button with no count is the P1 anti-pattern this replaces.
  const panelTriggerName = panelApplied ? `Filters, ${panelApplied} applied` : 'Filters'

  const clearAllPanelFilters = useCallback(() => {
    if (onClearAllFilters) {
      onClearAllFilters()
      return
    }
    // Fallback for a host that wired no shared handler: empty every facet the
    // panel owns, one live-apply write each. The search term is NOT ours.
    for (const facet of facets) onFilterChange(facet.col, [])
  }, [onClearAllFilters, facets, onFilterChange])

  /*
   * FIX WAVE C-2 / P0-3 — the referenced rows behind every `kind: 'entity'`
   * facet, resolved ONCE per facet and shared by BOTH surfaces that need them:
   * the compact dropdown's option list and the Expandable Selector sheet's
   * table. Resolving them only when the sheet opened is why the dropdown said
   * `No results found!` for every query — `deriveFilters()` cannot fill
   * `optionDefs` for `optionsFrom: 'records'` (the composer holds no records),
   * so the panel had literally no options to render.
   *
   * `resolveExpandRows` may answer synchronously (the common case —
   * `ModuleView` hands over the records it already holds) or with a promise (a
   * host that fetches the referenced entity); `await` takes either.
   */
  /*
   * FIX WAVE C-4 / P0-1 — a `kind: 'tags'` facet needs the SAME record rows an
   * entity facet does: its chips are the distinct tag values the records carry
   * (`tags-facet.ts`), not whatever a blueprint authored inline.
   */
  const recordFacets = useMemo(
    () => facets.filter((facet) => needsRecordOptions(facet) || isTagsFacet(facet)),
    [facets],
  )
  /*
   * FIX WAVE C-3 / P0 — the RAW resolved rows per facet, kept raw on purpose:
   * both surfaces derive from them (`entityRows` for the sheet,
   * `entityOptions` for the dropdown), so a reference facet's per-value counts
   * and its de-duplication are computed from the same source exactly once.
   */
  const [entityRawByCol, setEntityRawByCol] = useState<Record<string, SelectorRow[]>>({})
  useEffect(() => {
    if (!resolveExpandRows || recordFacets.length === 0) return
    let live = true
    void Promise.all(
      recordFacets.map(async (facet) => [facet.col, (await resolveExpandRows(facet)) ?? []] as const),
    ).then((pairs) => {
      if (live) setEntityRawByCol(Object.fromEntries(pairs))
    })
    return () => {
      live = false
    }
  }, [recordFacets, resolveExpandRows])

  const facetByCol = useMemo(() => new Map(facets.map((facet) => [facet.col, facet])), [facets])
  const entityRowsByCol = useMemo<Record<string, SelectorRow[]>>(() => {
    const out: Record<string, SelectorRow[]> = {}
    for (const [col, rows] of Object.entries(entityRawByCol)) {
      const facet = facetByCol.get(col)
      // Sheet rows are an ENTITY-facet surface only (a tags facet is never
      // expandable) — FIX WAVE C-4.
      if (facet && needsRecordOptions(facet)) out[col] = entityRows(facet, rows, resolveEntityLabel)
    }
    return out
  }, [entityRawByCol, facetByCol, resolveEntityLabel])

  /*
   * The facets the PANEL renders. An entity facet gains the `optionDefs` its
   * compact dropdown needs; every other facet is passed through by identity,
   * so no legacy `options: string[]` facet changes at all.
   */
  const panelFacets = useMemo(
    () =>
      facets.map((facet) =>
        withTagOptions(withEntityOptions(facet, entityRawByCol[facet.col], resolveEntityLabel), entityRawByCol[facet.col]),
      ),
    [facets, entityRawByCol, resolveEntityLabel],
  )

  const expandRows = expandFacet ? entityRowsByCol[expandFacet.col] : undefined
  const loadExpandRows = useCallback(async (): Promise<SelectorRow[]> => {
    if (!expandFacet || !resolveExpandRows) return []
    return entityRows(expandFacet, (await resolveExpandRows(expandFacet)) ?? [], resolveEntityLabel)
  }, [expandFacet, resolveExpandRows, resolveEntityLabel])

  /*
   * A.9 / D-3 — when the sheet closes, focus returns to the `⧉` that opened
   * it. The sheet is CONDITIONALLY RENDERED here, so it unmounts instead of
   * re-rendering with `open=false`: its own open→closed restore effect never
   * runs, and neither does Radix's close-auto-focus. Restoring from this side,
   * on the same open→closed flip, is the mechanism the shipped `AlertDialog`
   * restore encodes (FIX WAVE C-2 / P0-2 — "focus lands on that layer's
   * trigger").
   */
  const sheetWasOpen = useRef(false)
  useEffect(() => {
    if (expandFacet) {
      sheetWasOpen.current = true
      return
    }
    if (!sheetWasOpen.current) return
    sheetWasOpen.current = false
    expandTriggerRef.current?.focus()
  }, [expandFacet])

  /*
   * The field dropdown stays suspended for one tick PAST the sheet's close.
   * Cancel / Confirm are clicks on the sheet's own footer, i.e. geometrically
   * outside the dropdown: lifting the suspension in the same tick let that one
   * click dismiss the dropdown as well, so a single gesture closed two layers
   * (the sheet AND the dropdown) and focus landed on the field trigger instead
   * of the `⧉` the gesture belonged to. Holding it one tick lets the closing
   * event drain first (FIX WAVE C-2 / P0-2).
   */
  const [suspendedCol, setSuspendedCol] = useState<string | null>(null)
  useEffect(() => {
    if (expandFacet) {
      setSuspendedCol(expandFacet.col)
      return
    }
    if (suspendedCol == null) return
    const timer = setTimeout(() => setSuspendedCol(null), 0)
    return () => clearTimeout(timer)
  }, [expandFacet, suspendedCol])

  const assignee = assigneeFacet
    ? facetToggleState(assigneeFacet.col, filters, onFilterChange)
    : null
  // J.95 — while the panel owns a facet, no SECOND page-level surface for the
  // same facet may render. The assignee split-dropdown is this toolbar's own
  // such surface; the search box (never panel-owned) is untouched.
  const showAssignee = Boolean(
    assignee && assigneeFacet && !panelOwnedFilterCols(facets, filtersPanel).has(assigneeFacet.col),
  )

  /*
   * "Filter By You" derivations (Figma `33534:26092`). All of them are pure
   * functions of the facet + the active filter, so the avatar quick-toggle, the
   * pinned You row and the count badge cannot drift out of sync — there is one
   * source of truth (`assignee.active`) and no second piece of local state
   * mirroring it.
   */
  const meOption = assigneeFacet?.currentUserId
  const meLabel = meOption ? (assigneeFacet?.optionLabel?.(meOption) ?? meOption) : undefined
  const meAvatarUrl = meOption ? assigneeFacet?.optionAvatarUrl?.(meOption) : undefined
  /** The quick-toggle is "on" only when the filter is EXACTLY the current user. */
  const isMeOnly = Boolean(meOption && assignee?.active.length === 1 && assignee.active[0] === meOption)

  const toggleMeFilter = () => {
    if (!meOption || !assigneeFacet) return
    onFilterChange(assigneeFacet.col, isMeOnly ? [] : [meOption])
  }

  /** Group rows = every option except the pinned You row, narrowed by the search term. */
  const groupRows = useMemo(() => {
    if (!assigneeFacet) return []
    const term = assigneeQuery.trim().toLowerCase()
    return assigneeFacet.options
      .filter((value) => value !== meOption)
      .filter((value) => {
        if (!term) return true
        const label = assigneeFacet.optionLabel?.(value) ?? value
        const detail = assigneeFacet.optionDetail?.(value) ?? ''
        return label.toLowerCase().includes(term) || detail.toLowerCase().includes(term)
      })
  }, [assigneeFacet, assigneeQuery, meOption])

  const allGroupSelected =
    groupRows.length > 0 && groupRows.every((value) => assignee?.active.includes(value))

  /** Select All / Clear All over the rows CURRENTLY listed, leaving others alone. */
  const selectAllAssignees = (select: boolean) => {
    if (!assigneeFacet || !assignee) return
    const listed = new Set(groupRows)
    const next = select
      ? [...new Set([...assignee.active, ...groupRows])]
      : assignee.active.filter((value) => !listed.has(value))
    onFilterChange(assigneeFacet.col, next)
  }

  /**
   * Picking a sort ROW. Figma "Sorting" Dev Notes `33534:45592` ("Once the user
   * clicks on any of the options, it will first sort in ascending order") and
   * `33534:45620` ("Clicking it again will remove the sorting") make the row a
   * TWO-state affordance: set-ascending, then clear. Direction is NOT cycled
   * here — that is the arrow's job (`toggleSortDirection`), per Dev Note
   * `33534:45647`, so a user refining direction can never accidentally fall off
   * the end of a three-state cycle and lose their sort.
   */
  const selectSort = (col: string) => {
    if (!onSortChange) return
    onSortChange(sort?.key === col ? null : { key: col, direction: 'asc' })
  }

  /**
   * The active row's arrow, as its own hit target. Dev Note `33534:45647`:
   * "Clicking the arrow will change the sorting order from ascending to
   * descending, and from descending back to ascending." It never clears.
   */
  const toggleSortDirection = (col: string) => {
    if (!onSortChange || sort?.key !== col) return
    onSortChange({ key: col, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
  }

  return (
    <>
      {/* 400px per figma-spec-kanban.md §4.1 — no spacing token covers this
          exact width, so a `rem` arbitrary value is used (token-lint only
          flags `px` arbitrary values; `rem` brackets are the established
          escape hatch, e.g. KanbanColumn's `w-[18.75rem]`). */}
      {/* 400px per figma-spec-kanban.md §4.1 is the CEILING; UX note I.54's
          collapse order item 1 adds the floor — the search input shrinks to
          200px (`12.5rem`) and never below, so it yields width to the rest of
          the toolbar before anything else is allowed to collapse. `flex-1`
          inside the shell's flex toolbar row is what makes it the yielding
          control; `min-w-` is what stops the yield at the floor. */}
      <div className="relative w-full min-w-[12.5rem] max-w-[25rem] flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label="Search"
          className="h-10 ps-10"
        />
      </div>

      {panelActive && session ? (
        /*
         * WAVE C6 — the toolbar trigger opens `FilterPanelV2` (A.1's second
         * focus layer) instead of the flat facet menu. The panel owns its own
         * dismiss layer (Escape / outside-click / focus restore, D-3), so it
         * is rendered as a plain positioned child rather than nested in a
         * second Popover, which would put two dismiss layers on one Escape.
         */
        <div className="relative shrink-0">
          <IconControl tip="Filters" name={panelTriggerName}>
            <Button
              ref={triggerRef}
              variant="tertiary"
              size="icon"
              className="relative size-10"
              data-slot="filter-panel-trigger"
              aria-haspopup="dialog"
              aria-expanded={panelOpen}
              onClick={() => setPanelOpen((open) => !open)}
            >
              <ListFilter className="size-5" aria-hidden="true" />
              {/*
                FIX WAVE C-5 / P1 (V13) — the APPLIED state must be visible,
                not only announced. The accessible name already carries the
                count (I.74), so this badge is `aria-hidden`: it is the sighted
                half of the same fact, and duplicating it in the a11y tree
                would make the button read its count twice.
              */}
              {panelApplied > 0 ? (
                <span
                  data-slot="filter-panel-trigger-badge"
                  aria-hidden="true"
                  className="absolute -end-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-caption font-bold text-primary-foreground"
                >
                  {panelApplied}
                </span>
              ) : null}
            </Button>
          </IconControl>
          {/*
            FIX WAVE C-6 / A.4 — the panel stays MOUNTED and is driven by
            `open`. Unmounting it on close meant the OPEN→CLOSED flip its focus
            restore hangs off never happened, and focus was left on `<body>`
            after Escape / `✕` / an outside click (the panel renders nothing
            while closed, so this costs no paint).
          */}
          <div className="absolute top-full start-0 z-dropdown mt-2">
              <FilterPanelV2
                facets={panelFacets}
                value={filters}
                // G.63 — live-apply. `ViewState.filters` carries
                // `string | string[] | boolean | null | DateRangeFilterValue`:
                // a `date` facet's serialized range/time object passes through
                // UNTOUCHED (UCCP pipeline actions — `applyViewState` matches
                // it), every other facet is normalised to its id list.
                onChange={(col, next) =>
                  onFilterChange(
                    col,
                    facetByCol.get(col)?.kind === 'date'
                      ? (next as unknown as string[])
                      : selectedIdsOf(next),
                  )
                }
                onClearAll={clearAllPanelFilters}
                onExpand={(facet) => {
                  expandTriggerRef.current = document.activeElement as HTMLElement | null
                  setExpandFacet(facet)
                }}
                session={session}
                panelConfig={filtersPanel}
                open={panelOpen}
                onClose={() => setPanelOpen(false)}
                triggerRef={triggerRef}
                // D-3 — while the sheet is up, IT is the innermost layer and
                // the panel must ignore every dismiss gesture (P0-2).
                expandedCol={expandFacet?.col ?? suspendedCol}
                onCreateFromSearch={onCreateFromSearch}
              />
          </div>
          {expandFacet ? (
            <ExpandableSelectorSheet
              open
              facet={expandFacet}
              rows={expandRows}
              loadRows={expandRows ? undefined : loadExpandRows}
              value={selectedIdsOf(filters[expandFacet.col])}
              session={session}
              triggerRef={expandTriggerRef}
              sheetWidth={filtersPanel?.sheetWidth}
              // P0-3 — row identity IS the facet's value space (see
              // `entity-facet.ts`), so what Confirm writes is exactly what the
              // view's filter model matches on, and a sheet pick and a
              // dropdown pick are the same value.
              getRowId={(row) => entityValueOf(expandFacet, row)}
              onCreateFromSearch={onCreateFromSearch}
              // Confirm writes through the SAME live-apply seam every other
              // control uses — the sheet is only where the commit is deferred.
              onConfirm={(next) => {
                onFilterChange(expandFacet.col, next)
                setExpandFacet(null)
              }}
              onCancel={() => setExpandFacet(null)}
            />
          ) : null}
        </div>
      ) : filterableFacets.length ? (
        <DropdownMenu>
          {/* UX note K.67: every icon-only control carries a specific
              accessible name AND a tooltip on hover AND keyboard focus.
              `IconControl` is the ONE place that pairing is applied — and it
              nests `DropdownMenuTrigger` OUTSIDE the tooltip trigger, which
              this call site previously got backwards (see its docblock: the
              inverted order hands `data-state` and the Escape/focus-restore
              path to the tooltip layer instead of the menu). */}
          <IconControl
            tip="Filter"
            name={activeFilterCount ? `Filter (${activeFilterCount} active)` : 'Filter'}
            menuTrigger
          >
            <Button variant="tertiary" size="icon" className="relative size-10">
              <ListFilter className="size-5" aria-hidden="true" />
            </Button>
          </IconControl>
          <DropdownMenuContent align="start" className="w-56">
            {filterableFacets.map((facet, i) => {
              const { active, toggle } = facetToggleState(facet.col, filters, onFilterChange)
              return (
                <div key={facet.col}>
                  {i > 0 ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuLabel>{facet.label}</DropdownMenuLabel>
                  {facet.options!.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option}
                      checked={active.includes(option)}
                      onCheckedChange={(checked) => toggle(option, checked === true)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {option}
                    </DropdownMenuCheckboxItem>
                  ))}
                </div>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {sortOptions.length ? (
        /* The SORT BY menu (Figma "Sorting" section `33534:45591`). A Popover
           rather than a DropdownMenu because the active row carries TWO
           independent hit targets — the row (set/clear) and its direction arrow
           (flip asc/desc) — and a menu item swallows clicks on anything nested
           inside it. */
        <Popover open={sortOpen} onOpenChange={setSortOpen}>
          <IconControl tip="Sort" name={sort ? 'Sort, 1 applied' : 'Sort'} popoverTrigger>
            <Button
              variant="tertiary"
              size="icon"
              className={cn('relative size-10', (sort || sortOpen) && 'border-primary text-primary')}
            >
              <ArrowUpDown className="size-5" aria-hidden="true" />
              {/* Reference recording: the toolbar's sort trigger carries a
                  count badge while a sort is applied — the sighted twin of the
                  accessible name above, so it stays `aria-hidden` (same
                  pattern as the filter trigger's badge). */}
              {sort ? (
                <span
                  data-slot="sort-trigger-badge"
                  aria-hidden="true"
                  className="absolute -end-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-caption font-bold text-primary-foreground"
                >
                  1
                </span>
              ) : null}
            </Button>
          </IconControl>
          <PopoverContent align="start" aria-label="Sort by" data-slot="sort-menu" className="w-56 p-1.5">
            <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-1.5">
              <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Sort by</p>
              {/* Figma draws a Reset affordance in the header; it clears the
                  sort WITHOUT closing, so the user can immediately pick
                  another. Hidden while there is nothing to reset rather than
                  rendered dead. */}
              {sort ? (
                <button
                  type="button"
                  onClick={() => onSortChange?.(null)}
                  className="rounded-sm text-caption font-medium text-destructive-emphasis outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Reset
                </button>
              ) : null}
            </div>
            <div role="listbox" aria-label="Sort by" className="flex flex-col">
              <button
                type="button"
                role="option"
                aria-selected={!sort}
                className={cn(SORT_OPTION_CLASS, !sort && 'bg-muted/60')}
                onClick={() => {
                  onSortChange?.(null)
                  setSortOpen(false)
                }}
              >
                <span className="flex-1 truncate text-start">
                  None <span className="text-muted-foreground">(default)</span>
                </span>
              </button>
              {sortOptions.map((option) => {
                const activeDir = sort?.key === option.col ? sort.direction : null
                const DirIcon = activeDir === 'desc' ? ArrowDown : ArrowUp
                return (
                  <div
                    key={option.col}
                    className={cn(
                      'flex items-center gap-1 rounded-sm',
                      activeDir ? 'bg-muted/60' : 'hover:bg-muted',
                    )}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={Boolean(activeDir)}
                      className={cn(SORT_OPTION_CLASS, activeDir && 'text-primary')}
                      onClick={() => {
                        selectSort(option.col)
                        setSortOpen(false)
                      }}
                    >
                      <span className="flex-1 truncate text-start">{option.label}</span>
                    </button>
                    {activeDir ? (
                      <button
                        type="button"
                        aria-label={`Sort ${option.label} ${activeDir === 'asc' ? 'descending' : 'ascending'}`}
                        className="me-1 flex size-6 shrink-0 items-center justify-center rounded-sm text-primary outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => toggleSortDirection(option.col)}
                      >
                        <DirIcon className="size-3.5" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      ) : null}

      {groupByFacet ? (
        /*
         * The GROUP BY radio popup (SPEC addendum AC-6.1..6.4, visuals
         * reconciled to the 2026-08-31 pipeline-actions reference recording):
         * icon-only 40×40 trigger in the same button group as Filter/Sort, a
         * "GROUP BY" header with a Reset affordance, and a true single-select
         * RADIO list — LIVE-APPLY, same contract as `GroupByMenuButton`
         * (which owns the kanban lens's in-body control). This toolbar
         * variant differs only in having a "None" state (the flat list),
         * which Reset restores.
         */
        <Popover>
          <IconControl tip="Group by" popoverTrigger>
            <Button
              variant="tertiary"
              size="icon"
              className={cn('size-10', groupByFacet.value && 'border-primary text-primary')}
              data-slot="group-by-trigger"
            >
              <Layers className="size-5" aria-hidden="true" />
            </Button>
          </IconControl>
          <PopoverContent align="start" aria-label="Group by" data-slot="group-by-menu" className="w-56 p-1.5">
            <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-1.5">
              <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                {groupByFacet.label ?? 'Group by'}
              </p>
              {groupByFacet.value ? (
                <button
                  type="button"
                  onClick={() => groupByFacet.onChange(null)}
                  className="rounded-sm text-caption font-medium text-destructive-emphasis outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Reset
                </button>
              ) : null}
            </div>
            <RadioGroup
              value={groupByFacet.value ?? '__none__'}
              onValueChange={(next) => groupByFacet.onChange(next === '__none__' ? null : next)}
              aria-label="Group by"
              className="flex flex-col gap-0"
            >
              {[{ value: '__none__', label: 'None' }, ...groupByFacet.options].map((option) => (
                <label
                  key={option.value}
                  data-slot="group-by-option"
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 outline-none hover:bg-muted"
                >
                  <RadioGroupItem value={option.value} aria-label={option.label} />
                  <span className="flex-1 truncate text-body-sm text-foreground">{option.label}</span>
                </label>
              ))}
            </RadioGroup>
          </PopoverContent>
        </Popover>
      ) : null}

      {showAssignee && assignee && assigneeFacet ? (
        /* The Assignee control (Figma "Filter By You" `33534:26092`). ONE pill
           carrying two affordances: the leading avatar is the
           "Filter for your Tasks" quick-toggle, the label opens the
           multi-select panel. Both write the same facet, so they can never
           disagree. */
        <div className="relative inline-flex h-10 shrink-0 items-center gap-2 rounded-sm border border-border bg-card ps-1.5 pe-3">
          {/* Dev Note `33534:27616`: the count badge represents the number of
              assignees selected. Rendered once for the whole control. */}
          {assignee.active.length ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-2 -end-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-caption font-semibold text-primary-foreground"
            >
              {assignee.active.length}
            </span>
          ) : null}

          {assigneeFacet.currentUserId ? (
            /* Dev Note `33534:27070`: "The user can simply click on the [avatar]
               to view their own tasks… To clear this filter, the user can click
               the cross button on it." A single toggle button: pressing it sets
               the facet to EXACTLY the current user, pressing it again clears
               the facet entirely. The ✕ is the pressed state's own glyph, so
               there is one control and one hit target rather than two
               overlapping ones competing for a 24px square. */
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Filter for your Tasks"
                  aria-pressed={isMeOnly}
                  onClick={() => toggleMeFilter()}
                  className="relative flex size-7 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar
                    size="xs"
                    name={isMeOnly ? meLabel : undefined}
                    src={isMeOnly ? meAvatarUrl : undefined}
                    className={cn(isMeOnly && 'ring-2 ring-primary ring-offset-1 ring-offset-card')}
                  />
                  {isMeOnly ? (
                    <span className="absolute -top-0.5 -end-0.5 flex size-3.5 items-center justify-center rounded-full bg-foreground text-card">
                      <X className="size-2.5" aria-hidden="true" />
                    </span>
                  ) : null}
                </button>
              </TooltipTrigger>
              <TooltipContent>Filter for your Tasks</TooltipContent>
            </Tooltip>
          ) : (
            /* No signed-in identity: the avatar stays the decorative facet
               marker it was, and only the multi-select panel remains. */
            <Avatar aria-hidden="true" size="xs" />
          )}

          <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 items-center gap-1.5 text-body-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="truncate">
                  {assignee.active.length
                    ? assignee.active.length > 1
                      ? `${assigneeFacet.label} (${assignee.active.length})`
                      : (assigneeFacet.optionLabel?.(assignee.active[0]) ?? assignee.active[0])
                    : assigneeFacet.label}
                </span>
                <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden="true" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" aria-label={assigneeFacet.label} className="w-80 p-0">
              {/* Search row — filters the list client-side on name OR email. */}
              <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                  value={assigneeQuery}
                  onChange={(e) => setAssigneeQuery(e.target.value)}
                  placeholder="Search by Name or Email"
                  aria-label={`Search ${assigneeFacet.label}`}
                  className="min-w-0 flex-1 bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="max-h-80 overflow-y-auto py-1">
                {/* The pinned You row, above the group and never repeated
                    inside it. Checking it is the same state the avatar
                    quick-toggle produces. */}
                {meOption ? (
                  <AssigneeRow
                    value={meOption}
                    label="You"
                    detail={assigneeFacet.optionDetail?.(meOption)}
                    avatarUrl={meAvatarUrl}
                    avatarName={meLabel}
                    checked={assignee.active.includes(meOption)}
                    onCheckedChange={(next) => assignee.toggle(meOption, next)}
                  />
                ) : null}
                <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-2">
                  <span className="text-caption text-muted-foreground">{assigneeFacet.label}</span>
                  {/* Dev Note `33534:27612`: a Select All option alongside
                      manual selection. It respects the active search term, and
                      flips to Clear all once everything listed is selected —
                      never a dead control. */}
                  {groupRows.length ? (
                    <button
                      type="button"
                      onClick={() => selectAllAssignees(!allGroupSelected)}
                      className="rounded-sm text-caption font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {allGroupSelected ? 'Clear All' : 'Select All'}
                    </button>
                  ) : null}
                </div>
                {groupRows.length ? (
                  groupRows.map((value) => (
                    <AssigneeRow
                      key={value}
                      value={value}
                      label={assigneeFacet.optionLabel?.(value) ?? value}
                      detail={assigneeFacet.optionDetail?.(value)}
                      avatarUrl={assigneeFacet.optionAvatarUrl?.(value)}
                      avatarName={assigneeFacet.optionLabel?.(value) ?? value}
                      checked={assignee.active.includes(value)}
                      onCheckedChange={(next) => assignee.toggle(value, next)}
                    />
                  ))
                ) : (
                  <p className="px-3 py-3 text-body-sm text-muted-foreground">
                    No people match “{assigneeQuery}”
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ) : null}

      {densityToggle ? (
        // The kanban display-mode segmented control (frames `33534:32278` /
        // `33534:32740`). It is a card-MEDIA switch, not a rows/table lens and
        // not a fifth view kind: the left state drops the cover thumbnail and
        // leaves the board shape alone. Both buttons carry a tooltip AND an
        // accessible name — the left one's is the designer's own tooltip copy,
        // "Data-only view", verbatim.
        // UX I.56: a mutually-exclusive pair of states is a RADIOGROUP, not two
        // independent toggles — `aria-pressed` on each said "two switches, both
        // of which happen to be off", which is not what the control does. As a
        // radiogroup it also gets the pattern's keyboard model for free: one tab
        // stop for the group (roving `tabIndex`), arrow keys to change the
        // choice.
        <div
          role="radiogroup"
          data-slot="display-mode-group"
          aria-label="Card display mode"
          className="inline-flex h-10 shrink-0 items-center gap-0.5 rounded-sm border border-border p-0.5"
        >
          {(['data', 'image'] as const).map((mode) => {
            const Glyph = mode === 'data' ? Rows3 : LayoutGrid
            const label = KANBAN_DISPLAY_MODE_LABEL[mode]
            const active = activeMode === mode
            return (
              <IconControl key={mode} tip={label}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  // Roving tabindex: the group is ONE tab stop and the checked
                  // radio is the one that holds it (WAI-ARIA radiogroup).
                  tabIndex={active ? 0 : -1}
                  data-slot={`display-mode-${mode}`}
                  onClick={() => setMode(mode)}
                  onKeyDown={(event) => {
                    if (!/^Arrow(Left|Right|Up|Down)$/.test(event.key)) return
                    event.preventDefault()
                    setMode(mode === 'data' ? 'image' : 'data')
                    // Focus follows the selection, or the group would be left
                    // with its tab stop on an unfocused radio.
                    const sibling =
                      event.currentTarget.nextElementSibling ?? event.currentTarget.previousElementSibling
                    if (sibling instanceof HTMLElement) sibling.focus()
                  }}
                  className={cnDensity(active)}
                >
                  <Glyph className="size-5" aria-hidden="true" />
                </button>
              </IconControl>
            )
          })}
        </div>
      ) : null}

      {exportAction || createAction ? (
        // Flush-right primary group (export + "create record"), separated from
        // the left-side search/filter/sort/assignee/density cluster by an
        // auto-margin spacer — the SAME `ms-auto` pattern
        // `hybrid/RecordMapListToolbar.tsx`'s row1 primary group already uses
        // (WP4 `33534:*` parity). Wrapped together (rather than each getting
        // its own `ms-auto`) so a lone export action with no create action
        // still lands at the extreme right instead of just after the density
        // toggle.
        <div data-slot="module-view-toolbar-primary-group" className="ms-auto flex shrink-0 items-center gap-2">
          {exportAction}
          {createAction}
        </div>
      ) : null}
    </>
  )
}

function cnDensity(active: boolean): string {
  return [
    'flex size-9 shrink-0 items-center justify-center rounded-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
    active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
  ].join(' ')
}

ModuleViewFilters.displayName = 'ModuleViewFilters'

/**
 * One person row in the Assignee panel (Figma `33534:27561`): checkbox ·
 * avatar · name over a muted secondary line. Factored out because the pinned
 * **You** row and every group row are the SAME row — only their label and
 * source of truth differ — and duplicating the markup is how the two drift
 * apart visually.
 */
function AssigneeRow({
  value,
  label,
  detail,
  avatarUrl,
  avatarName,
  checked,
  onCheckedChange,
}: {
  value: string
  label: string
  detail?: string
  avatarUrl?: string
  avatarName?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label
      className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted"
      data-slot="assignee-row"
      data-value={value}
    >
      {/* Named explicitly: a Radix Checkbox is a `button`, which jsdom and
          screen readers do NOT associate with a wrapping `<label>` the way a
          native input is, so without this the row's control is anonymous. */}
      <Checkbox
        aria-label={label}
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next === true)}
      />
      <Avatar size="sm" name={avatarName ?? label} src={avatarUrl} aria-hidden="true" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-body-sm font-medium text-foreground">{label}</span>
        {detail ? <span className="truncate text-caption text-muted-foreground">{detail}</span> : null}
      </span>
    </label>
  )
}

AssigneeRow.displayName = 'AssigneeRow'
