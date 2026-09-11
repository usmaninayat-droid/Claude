import { useId, useMemo } from 'react'
import { Check, ListFilter, Search } from '@fams/ui-kit/icons'
import {
  Button,
  Checkbox,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@fams/ui-kit'
import { cn } from '../lib/cn'
import type { InboxNotification } from './types'

/**
 * InboxToolbar — the search / filter / Clear-All control cluster of the inbox
 * feed (specs/inbox SPEC §Toolbar). [tier-2, part of `InboxView`]
 *
 * Split out of `InboxView` so the same cluster renders in BOTH toolbar homes
 * (portaled into the app bar's actions region when hosted; the standalone
 * toolbar row otherwise) without drifting.
 *
 * The funnel button opens a small filter popover (severity + module — the
 * facets the feed's own data carries); active filters put a dot on the
 * button (SPEC §Interaction "filter icon button"). It is only rendered when
 * the current tab's data actually offers a facet to filter on — an inert
 * control must be absent, never disabled (UX verdict V11).
 */
export interface InboxFilterState {
  /** Selected severity labels (empty = all). */
  severities: string[]
  /** Selected module labels (empty = all). */
  modules: string[]
}

/** Search (title + snippet, case-insensitive) + facet filters over one tab's items. */
export function applyInboxFilters(
  items: InboxNotification[],
  search: string,
  filters: InboxFilterState,
): InboxNotification[] {
  const q = search.trim().toLowerCase()
  return items.filter((n) => {
    if (q && !`${n.title} ${n.snippet ?? ''}`.toLowerCase().includes(q)) return false
    if (filters.severities.length && !filters.severities.includes(n.severity?.label ?? '')) return false
    if (filters.modules.length && !filters.modules.includes(n.module?.label ?? '')) return false
    return true
  })
}

export interface InboxToolbarProps {
  /** The current tab's (unsearched) items — the filter facets derive from them. */
  notifications: InboxNotification[]
  search: string
  onSearchChange: (value: string) => void
  filters: InboxFilterState
  onFiltersChange: (next: InboxFilterState) => void
  /** Opens the caller's Clear-All confirm. Omit → no Clear All button. */
  onClearAll?: () => void
  className?: string
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function FacetGroup({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  const id = useId()
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="pb-1 text-caption font-semibold text-muted-foreground">{legend}</legend>
      {options.map((option, index) => (
        <div key={option} className="flex items-center gap-2">
          <Checkbox
            id={`${id}-${index}`}
            checked={selected.includes(option)}
            onCheckedChange={() => onToggle(option)}
          />
          <Label htmlFor={`${id}-${index}`} className="text-body-sm font-medium">
            {option}
          </Label>
        </div>
      ))}
    </fieldset>
  )
}

export function InboxToolbar({
  notifications,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  onClearAll,
  className,
}: InboxToolbarProps) {
  const severityOptions = useMemo(
    () => [...new Set(notifications.map((n) => n.severity?.label).filter((v): v is string => Boolean(v)))],
    [notifications],
  )
  const moduleOptions = useMemo(
    () => [...new Set(notifications.map((n) => n.module?.label).filter((v): v is string => Boolean(v)))],
    [notifications],
  )
  const hasFacets = severityOptions.length > 0 || moduleOptions.length > 0
  const activeCount = filters.severities.length + filters.modules.length

  return (
    <div data-slot="inbox-toolbar" className={cn('flex items-center gap-2', className)}>
      <Input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search inbox"
        aria-label="Search inbox"
        leadingIcon={<Search aria-hidden className="size-4" />}
        className="h-9 w-72 min-w-48"
      />

      {hasFacets ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="tertiary"
              size="icon"
              aria-label={activeCount ? `Filters (${activeCount} active)` : 'Filters'}
              className="relative size-9"
            >
              <ListFilter aria-hidden className="size-4" />
              {activeCount > 0 ? (
                <span
                  aria-hidden
                  data-slot="inbox-filter-dot"
                  // Negative logical inset inline (see LiveFiltersPopover's note).
                  style={{ insetInlineEnd: '-0.125rem' }}
                  className="absolute -top-0.5 size-2 rounded-full bg-primary"
                />
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="flex w-56 flex-col gap-3">
            {severityOptions.length > 0 ? (
              <FacetGroup
                legend="Severity"
                options={severityOptions}
                selected={filters.severities}
                onToggle={(v) => onFiltersChange({ ...filters, severities: toggle(filters.severities, v) })}
              />
            ) : null}
            {moduleOptions.length > 0 ? (
              <FacetGroup
                legend="Module"
                options={moduleOptions}
                selected={filters.modules}
                onToggle={(v) => onFiltersChange({ ...filters, modules: toggle(filters.modules, v) })}
              />
            ) : null}
            {activeCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => onFiltersChange({ severities: [], modules: [] })}
              >
                Reset filters
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>
      ) : null}

      {onClearAll ? (
        <Button variant="tertiary" size="sm" className="h-9 gap-1.5 border-primary text-primary" onClick={onClearAll}>
          <Check aria-hidden className="size-4" />
          Clear All
        </Button>
      ) : null}
    </div>
  )
}

InboxToolbar.displayName = 'InboxToolbar'
