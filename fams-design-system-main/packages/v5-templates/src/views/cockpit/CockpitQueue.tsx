import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Download, Inbox, ListFilter, Search, X } from '@fams/ui-kit/icons'
import {
  Avatar,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Input,
  RouteJobCard,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toast,
} from '@fams/ui-kit'
import { cn } from '../../lib/cn'
import type { CockpitQueueItemModel } from './cockpit-model'

/**
 * CockpitQueue — the cockpit's searchable card queue (SPEC §2 rows 11–17;
 * UX-NOTES F.25–31): a one-line toolbar (search keeps ≥160px, icon slots
 * never wrap under it), a live count row, and an internally-scrolling
 * `RouteJobCard` list — the ONLY inner vertical scroll region besides side
 * sheets (A.1). Three distinct empty states (no data / no matches with a
 * clear affordance / loading skeletons); selecting via the map auto-scrolls
 * the card into view (`block: 'nearest'`, F.28). Selection is controlled by
 * the parent so the map pane stays in sync.
 */
export interface CockpitQueueProps {
  items: CockpitQueueItemModel[]
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  /** Toolbar icon-button slots after the search box (filter, export, …). */
  toolbarSlot?: ReactNode
  /**
   * Status options for the built-in Filter popover (checkboxes). Omit → no
   * built-in Filter button (the `toolbarSlot` can still supply one).
   */
  statusOptions?: { key: string; label: string }[]
  /** Shows the built-in Export icon button (fires a success toast). */
  exportable?: boolean
  searchPlaceholder?: string
  /** Shows skeleton cards instead of the list. */
  loading?: boolean
  /** No-data empty-state title. Default "Nothing scheduled". */
  emptyTitle?: string
  className?: string
}

/** Card count for the loading branch — 5 fills the 480px split at 151px each
 *  without over-drawing below the fold (UX F.27c asks for 4–6). */
const QUEUE_SKELETON_COUNT = 5

export function CockpitQueue({
  items,
  selectedId,
  onSelect,
  toolbarSlot,
  statusOptions,
  exportable = false,
  searchPlaceholder = 'Search',
  loading = false,
  emptyTitle = 'Nothing scheduled',
  className,
}: CockpitQueueProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set())
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let next = items
    if (statusFilter.size) next = next.filter((item) => item.status && statusFilter.has(item.status.label))
    if (q) next = next.filter((item) => item.searchText.includes(q))
    return next
  }, [items, query, statusFilter])

  const toggleStatus = (label: string) => {
    setStatusFilter((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  // Map-side selection scrolls the matching card into view (F.28) — nearest,
  // never a jarring jump to top.
  useEffect(() => {
    if (!selectedId) return
    const node = listRef.current?.querySelector<HTMLElement>(`[data-queue-id="${CSS.escape(selectedId)}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  // Singular-aware grammar ("Total 1 item", never "1 items" — UX F.26 nit).
  const unit = (n: number) => (n === 1 ? 'item' : 'items')
  const countRow =
    filtered.length === items.length
      ? `Total ${items.length} ${unit(items.length)}`
      : `Total ${filtered.length} ${unit(filtered.length)} out of ${items.length}`

  const TOOLBAR_BUTTON =
    'flex size-9 flex-none items-center justify-center rounded-sm border border-border bg-card text-muted-foreground outline-none transition-colors duration-fast hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div data-slot="cockpit-queue" className={cn('flex h-full min-h-0 flex-col gap-2 pe-2', className)}>
      <div className="flex flex-none items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className={cn('h-9 ps-8', query && 'pe-8')}
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search input"
              onClick={() => setQuery('')}
              className="absolute end-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {statusOptions?.length ? (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger
                  aria-label="Filter"
                  data-slot="cockpit-queue-filter"
                  className={cn(
                    TOOLBAR_BUTTON,
                    statusFilter.size > 0 && 'border-primary/45 bg-secondary text-primary hover:bg-primary/10',
                  )}
                >
                  <ListFilter className="size-4" aria-hidden="true" />
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Filter</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              {statusOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.key}
                  checked={statusFilter.has(option.label)}
                  onCheckedChange={() => toggleStatus(option.label)}
                  onSelect={(e: Event) => e.preventDefault()}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {exportable ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Export"
                data-slot="cockpit-queue-export"
                className={TOOLBAR_BUTTON}
                onClick={() => toast.success('Export ready', { description: `${filtered.length} ${unit(filtered.length)} exported.` })}
              >
                <Download className="size-4" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Export</TooltipContent>
          </Tooltip>
        ) : null}
        {toolbarSlot ? <div className="flex flex-none items-center gap-2">{toolbarSlot}</div> : null}
      </div>

      <p data-slot="cockpit-queue-count" aria-live="polite" className="flex-none text-caption text-muted-foreground">
        {countRow}
      </p>

      {loading ? (
        <div data-slot="cockpit-queue-skeletons" className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden" aria-hidden="true">
          {Array.from({ length: QUEUE_SKELETON_COUNT }, (_, i) => (
            <Skeleton
              key={i}
              variant="custom"
              data-slot="cockpit-queue-skeleton"
              // Pinned to the LOADED RouteJobCard height (151px = 9.4375rem)
              // so the swap to real cards shifts nothing (UX D.17 / F.27c).
              className="h-[9.4375rem] flex-none rounded-md border border-border"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div data-slot="cockpit-queue-empty" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-section text-center">
          <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
          {items.length === 0 ? (
            <>
              <p className="text-body-sm font-medium text-foreground">{emptyTitle}</p>
              <p className="text-caption text-muted-foreground">Items appear here as they are scheduled.</p>
            </>
          ) : (
            <>
              <p className="text-body-sm font-medium text-foreground">
                {query.trim() ? <>No matches for “{query.trim()}”</> : 'No matches for the active filters'}
              </p>
              <button
                type="button"
                className="rounded-sm text-caption text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setQuery('')
                  setStatusFilter(new Set())
                }}
              >
                Clear search
              </button>
            </>
          )}
        </div>
      ) : (
        <ul ref={listRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto" aria-label="Queue">
          {filtered.map((item) => (
            <li key={item.id} data-queue-id={item.id} className="flex-none">
              <RouteJobCard
                title={item.title}
                subtitle={item.subtitle}
                leading={item.avatarName ? <Avatar name={item.avatarName} size="sm" /> : undefined}
                accentColor={item.accentColor}
                deltaLabel={item.deltaLabel}
                status={item.status ? { label: item.status.label, color: item.status.color, appearance: 'tint' } : undefined}
                progressPct={item.progressPct}
                progressLabel={item.progressLabel}
                plannedLabel={item.plannedLabel}
                actualLabel={item.actualLabel}
                meta={item.meta.map((label, index) => ({ id: `${item.id}-meta-${index}`, label }))}
                banner={item.banner}
                selected={item.id === selectedId}
                onSelect={onSelect ? () => onSelect(item.id === selectedId ? null : item.id) : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

CockpitQueue.displayName = 'CockpitQueue'
