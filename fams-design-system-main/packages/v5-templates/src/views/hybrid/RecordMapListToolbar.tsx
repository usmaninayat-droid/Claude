import { useRef, useState } from 'react'
import { ChevronDown, Download, ListFilter, Plus, Search } from '@fams/ui-kit/icons'
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  IconControl,
  Input,
} from '@fams/ui-kit'
import type { FilterFacet } from '@fams/v5-composer'
import { cn } from '../../lib/cn'
import { GroupByMenuButton, type GroupByMenuOption } from '../GroupByMenuButton'
import { SortMenuButton, type SortMenuOption } from '../SortMenuButton'
import type { ModuleViewAssigneeFacet } from '../ModuleViewFilters'
import type { ViewSort } from '../saved-views'
import { FilterPanelV2, appliedCount } from '../filters/FilterPanelV2'
import { selectedIdsOf } from '../filters/FilterField'
import { useFilterSession } from '../filters/use-filter-session'

/**
 * RecordMapListToolbar — the hybrid map's IN-PANEL list toolbar (SPEC
 * `pipelines-hybrid-29-41808` §1.1, two rows). [tier-2 internal]
 *
 * Composes existing generic controls rather than re-authoring them:
 * `SortMenuButton` (its `variant="toggle"` mode — SPEC Addendum "Sort popup" /
 * AC-7.1..7.4, see that component's own docblock for the reconcile-vs-conflict
 * note against `parity/pipeline-list-kanban`'s sort menu), the new
 * `GroupByMenuButton` (SPEC Addendum "Group By popup" / AC-6.1..6.4), the same
 * `FilterFacet` / `ModuleViewAssigneeFacet` shapes `ModuleViewFilters`
 * and `useModuleViewFacets` already derive from a blueprint (a caller wiring
 * this toolbar is doing the SAME `deriveFilters`/`useModuleViewFacets`
 * derivation, not a second one), and the shared `Input`/`Button`/
 * `DropdownMenu` primitives every other toolbar in this package is built
 * from. Nothing here is a new primitive — see root rule "compositions, never
 * new primitives."
 *
 * Two physical rows, not one wrapping row: the panel is a fixed ~360-422px
 * width (UX AC-4.2 — "no wrap, no truncation… at 1280px"), so row 1 is
 * search-weighted (Filter/Create are fixed-width, Search is the one flexible
 * element) and row 2 is entirely fixed-width controls (Group By / Sort /
 * Assignee pill / Download) — neither row ever needs to wrap.
 *
 * Every control is independently optional (its own prop or a non-empty
 * config array/object) so a module with no Assignee-typed field, no
 * sortable columns, or no export handler still gets a toolbar with only the
 * controls it actually has — never a dead/disabled affordance for a facet
 * that doesn't exist (SPEC's own "every control optional via props/config").
 * The component renders nothing at all (not even an empty row) when the
 * caller has enabled zero controls.
 */
export interface RecordMapListToolbarProps {
  /** Row 1 — search input. Omit `onSearchChange` to hide the control entirely. */
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  /**
   * Row 1 — filter funnel button, one section per facet (identical shape to
   * `ModuleViewFilters`'s legacy flat facet list — `@fams/v5-composer`'s
   * `deriveFilters()` output). A facet with no `options` is skipped, same as
   * `ModuleViewFilters`'s own `filterableFacets` gate. Omit (or pass `[]`) to
   * hide the button.
   */
  filterFacets?: FilterFacet[]
  /** Shared filter values (facet col → selected values), read by BOTH the filter button and the assignee pill below — same convention `ModuleViewFilters` uses (the assignee facet's value lives at `filters[assigneeFacet.col]`). */
  filters?: Record<string, string[]>
  onFilterChange?: (col: string, values: string[]) => void
  /** Row 1 — "+" create button. Omit to hide (wires straight into the lens's own `onCreateRecord` seam — no new create-flow prop). */
  onCreateRecord?: () => void
  /**
   * SPEC Addendum detail 5 — a labeled PRIMARY create button ("+ Report New
   * Incident") flush-right in row 1, with the Download/export control lifted
   * out of row 2 to sit immediately before it (left group stays
   * search/filter + row 2's group-by/sort). Omit for the compact "+" icon
   * button (unchanged default).
   */
  createLabel?: string
  /**
   * Row 2 — Group By control (`GroupByMenuButton`, SPEC Addendum "Group By
   * popup" / AC-6.1..6.4). Config-fed `{key,label}` options — field-agnostic,
   * never a hardcoded field list. Omit (or `[]` options) to hide. `groupBy`
   * falls back to `groupByDefaultKey` when omitted/undefined (this control
   * always has an active grouping — there is no "ungrouped" state, AC-6.2).
   */
  groupByOptions?: GroupByMenuOption[]
  /** Restored by the popover's `Reset`. Required when `groupByOptions` is non-empty. */
  groupByDefaultKey?: string
  groupBy?: string
  onGroupByChange?: (value: string) => void
  /**
   * Row 2 — Sort control. `SortMenuButton` in its `variant="toggle"` mode
   * (SPEC Addendum "Sort popup" / AC-7.1..7.4: header "SORT" + Reset,
   * per-row tri-state off/asc/desc toggle, single active sort). Omit (or
   * `[]`) to hide.
   */
  sortOptions?: SortMenuOption[]
  sort?: ViewSort | null
  onSortChange?: (sort: ViewSort | null) => void
  /**
   * Row 2 — Assignee split-pill. Its selected values live at
   * `filters[assigneeFacet.col]`, read/written through the SAME
   * `filters`/`onFilterChange` pair every other facet uses — never a second,
   * parallel filter channel. Omit to hide.
   */
  assigneeFacet?: ModuleViewAssigneeFacet
  /**
   * Row 2 — generic single-select facet dropdown (`uiConfig.map.records.
   * toolbar.facetCol`). Unlike the Assignee pill above (multi-select, no
   * counts), this is a SINGLE active value with a live count per option —
   * the "assignee split-pill" experience for a field that isn't
   * `Assignee`-typed (e.g. a `SingleSelect` "Assigned Team"), without
   * retyping that field. Its value lives at `filters[facet.col]` — a
   * single-element array, or `[]` for "no selection" — same shared
   * `filters`/`onFilterChange` channel every other facet uses. Omit to
   * hide.
   */
  facet?: { col: string; label: string; options: { value: string; label: string; count: number }[] }
  /** Row 2 — download/export button. Omit to hide. */
  onDownload?: () => void
  /**
   * WAVE — filter unification: identity for the shared `FilterPanelV2`
   * view-session ("All Filters" panel, D-2). Same convention as
   * `ModuleView`'s `moduleCode + viewId`; defaults to a fixed key since a
   * hybrid pane is always one view per mount.
   */
  filtersViewKey?: string
  className?: string
}

const ICON_BUTTON =
  'flex size-10 shrink-0 items-center justify-center rounded-sm border border-border bg-card text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring'

export function RecordMapListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search here',
  filterFacets = [],
  filters = {},
  onFilterChange,
  onCreateRecord,
  createLabel,
  groupByOptions = [],
  groupByDefaultKey,
  groupBy,
  onGroupByChange,
  sortOptions = [],
  sort,
  onSortChange,
  assigneeFacet,
  facet,
  onDownload,
  filtersViewKey = 'record-map-list-toolbar',
  className,
}: RecordMapListToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const filterTriggerRef = useRef<HTMLButtonElement | null>(null)
  const filterSession = useFilterSession(filtersViewKey)
  const filterableFacets = filterFacets.filter((facet) => facet.options?.length || facet.optionDefs?.length)
  const activeFilterCount = appliedCount(filterableFacets, filters)

  const assigneeActive = assigneeFacet ? (filters[assigneeFacet.col] ?? []) : []
  // Still used by the Assignee split-pill dropdown below (unaffected by the
  // filter-unification change — only the "All Filters" trigger moved to
  // `FilterPanelV2`).
  const toggleFacet = (col: string, option: string, checked: boolean) => {
    if (!onFilterChange) return
    const active = filters[col] ?? []
    onFilterChange(col, checked ? [...active, option] : active.filter((existing) => existing !== option))
  }

  // The generic facet is SINGLE-select (unlike `assigneeFacet`'s multi-select
  // pill): picking a value replaces any prior one; picking the ACTIVE value
  // again clears the selection back to "no filter" — same as a radio group
  // with an off state.
  const facetActive = facet ? (filters[facet.col]?.[0] ?? null) : null
  const selectFacetOption = (col: string, value: string) => {
    if (!onFilterChange) return
    onFilterChange(col, facetActive === value ? [] : [value])
  }

  const showGroupBy = groupByOptions.length > 0 && groupByDefaultKey != null && Boolean(onGroupByChange)

  // Addendum detail 5: a labeled primary create button pulls Download up into
  // row 1's flush-right group beside it (export + create right-aligned).
  const liftDownloadToRow1 = Boolean(createLabel) && Boolean(onDownload)
  const downloadButton = onDownload ? (
    <IconControl tip="Download">
      <button
        type="button"
        className={cn(ICON_BUTTON, 'border-primary text-primary')}
        onClick={() => onDownload()}
      >
        <Download className="size-5" aria-hidden="true" />
      </button>
    </IconControl>
  ) : null

  const showRow1 = Boolean(onSearchChange) || filterableFacets.length > 0 || Boolean(onCreateRecord) || liftDownloadToRow1
  const showRow2 =
    showGroupBy ||
    sortOptions.length > 0 ||
    Boolean(assigneeFacet) ||
    Boolean(facet) ||
    (Boolean(onDownload) && !liftDownloadToRow1)
  if (!showRow1 && !showRow2) return null

  return (
    <div data-slot="record-map-list-toolbar" className={cn('flex flex-col gap-2', className)}>
      {showRow1 ? (
        <div data-slot="record-map-list-toolbar-row1" className="flex items-center gap-2">
          {onSearchChange ? (
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search ?? ''}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label="Search"
                className="h-10 ps-10"
              />
            </div>
          ) : null}

          {filterableFacets.length ? (
            <div className="relative shrink-0">
              {/*
               * Filter unification — this trigger opens the SAME
               * `FilterPanelV2` ("All Filters") component the List/Kanban
               * toolbar (`ModuleViewFilters`) uses, rather than a bespoke
               * dropdown. One shared, config-driven panel filtering
               * whatever the caller's records are (here, the hybrid pane's
               * list + map).
               */}
              <IconControl
                tip="Filter"
                name={activeFilterCount ? `Filter (${activeFilterCount} active)` : 'Filter'}
              >
                <button
                  ref={filterTriggerRef}
                  type="button"
                  className={cn(ICON_BUTTON, 'relative size-9')}
                  aria-haspopup="dialog"
                  aria-expanded={filterOpen}
                  onClick={() => setFilterOpen((open) => !open)}
                >
                  <ListFilter className="size-5" aria-hidden="true" />
                  {activeFilterCount > 0 ? (
                    <span
                      data-slot="filter-panel-trigger-badge"
                      aria-hidden="true"
                      className="absolute -end-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-caption font-bold text-primary-foreground"
                    >
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>
              </IconControl>
              <div className="absolute top-full start-0 z-dropdown mt-2">
                <FilterPanelV2
                  facets={filterableFacets}
                  value={filters}
                  onChange={(col, next) => onFilterChange?.(col, selectedIdsOf(next))}
                  onClearAll={() => filterableFacets.forEach((facet) => onFilterChange?.(facet.col, []))}
                  session={filterSession}
                  open={filterOpen}
                  onClose={() => setFilterOpen(false)}
                  triggerRef={filterTriggerRef}
                />
              </div>
            </div>
          ) : null}

          {createLabel && (onCreateRecord || liftDownloadToRow1) ? (
            <div data-slot="record-map-list-toolbar-primary-group" className="ms-auto flex shrink-0 items-center gap-2">
              {liftDownloadToRow1 ? downloadButton : null}
              {onCreateRecord ? (
                /*
                 * Hybrid panel is icon-only for create, even when a
                 * `createLabel` is configured for the List/Kanban toolbars
                 * (`ModuleView`'s own labeled button) — the panel is a fixed
                 * ~360-422px width with no room for a labeled primary button
                 * next to the search field (Design-Lead: search must keep
                 * comfortable width, row stays one line). `createLabel`
                 * still drives the tooltip/aria-label here, it just never
                 * renders as visible text in this panel.
                 */
                <IconControl tip={createLabel}>
                  <Button
                    type="button"
                    size="icon"
                    className="size-10 shrink-0"
                    onClick={() => onCreateRecord()}
                    aria-label={createLabel}
                  >
                    <Plus className="size-5" aria-hidden="true" />
                  </Button>
                </IconControl>
              ) : null}
            </div>
          ) : onCreateRecord ? (
            <IconControl tip="Create">
              <Button type="button" size="icon" className="size-10 shrink-0" onClick={() => onCreateRecord()}>
                <Plus className="size-5" aria-hidden="true" />
              </Button>
            </IconControl>
          ) : null}
        </div>
      ) : null}

      {showRow2 ? (
        <div data-slot="record-map-list-toolbar-row2" className="flex items-center gap-2">
          {sortOptions.length ? (
            <SortMenuButton
              variant="toggle"
              options={sortOptions}
              sort={sort ?? null}
              onSortChange={(next) => onSortChange?.(next)}
              className="size-10"
            />
          ) : null}

          {showGroupBy ? (
            <GroupByMenuButton
              options={groupByOptions}
              value={groupBy ?? groupByDefaultKey!}
              defaultValue={groupByDefaultKey!}
              onChange={(next) => onGroupByChange?.(next)}
              className="size-10"
            />
          ) : null}

          {assigneeFacet ? (
            <div className="inline-flex h-10 shrink-0 items-stretch overflow-hidden rounded-sm border border-border bg-card">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center border-e border-border"
              >
                <Avatar size="xs" name={assigneeActive[0] ?? assigneeFacet.label} />
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex min-w-0 items-center gap-1 px-2 text-body-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="truncate">
                      {assigneeActive.length
                        ? assigneeActive.length > 1
                          ? `${assigneeFacet.label} (${assigneeActive.length})`
                          : (assigneeFacet.optionLabel?.(assigneeActive[0]) ?? assigneeActive[0])
                        : assigneeFacet.label}
                    </span>
                    <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{assigneeFacet.label}</DropdownMenuLabel>
                  {assigneeFacet.options.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option}
                      checked={assigneeActive.includes(option)}
                      onCheckedChange={(checked) => toggleFacet(assigneeFacet.col, option, checked === true)}
                      onSelect={(event) => event.preventDefault()}
                    >
                      {assigneeFacet.optionLabel?.(option) ?? option}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}

          {facet ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-slot="record-map-list-toolbar-facet"
                  className="flex h-10 min-w-0 shrink-0 items-center gap-1 rounded-sm border border-border bg-card px-3 text-body-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="truncate">
                    {facetActive
                      ? (facet.options.find((o) => o.value === facetActive)?.label ?? facetActive)
                      : facet.label}
                  </span>
                  <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{facet.label}</DropdownMenuLabel>
                {facet.options.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={facetActive === option.value}
                    onCheckedChange={() => selectFacetOption(facet.col, option.value)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="truncate">{option.label}</span>
                      <span className="text-muted-foreground">{option.count}</span>
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {!liftDownloadToRow1 ? downloadButton : null}
        </div>
      ) : null}
    </div>
  )
}

RecordMapListToolbar.displayName = 'RecordMapListToolbar'
