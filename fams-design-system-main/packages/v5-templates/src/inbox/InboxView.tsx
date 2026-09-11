import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Inbox as InboxIcon } from '@fams/ui-kit/icons'
import { CountTabs, DestructiveActionModal, StatusView, TopNavSlotPortal, useTopNavSlots } from '@fams/ui-kit'
import { cn } from '../lib/cn'
import { InboxNotificationCard } from './InboxNotificationCard'
import { InboxToolbar, applyInboxFilters, type InboxFilterState } from './InboxToolbar'
import {
  INBOX_TABS,
  formatTabCount,
  groupByDate,
  inTab,
  type InboxNotification,
  type InboxTabId,
} from './types'

/**
 * InboxView — the date-grouped notification feed surface (specs/inbox
 * SPEC.md; the `inbox` module type's `InboxView` template ref). [tier-2]
 *
 * Layout: a centered feed column (max 1080px) under a fixed toolbar
 * (search / filter / Clear All) and the six-tab `CountTabs` strip; ONLY the
 * feed below the tabs scrolls (own scroll region, `overscroll-contain`),
 * with the date-group headers sticking inside it (UX-NOTES §4).
 *
 * Toolbar placement follows `ModuleViewShell`'s host contract: inside an
 * `AppShell` (whose `TopNav` already carries the module title), the search /
 * filter / Clear-All cluster portals into the app bar's `actions` region —
 * one 48px bar holds title + controls, exactly the Figma toolbar row.
 * Standalone (showcase, tests), it renders its own toolbar row with the
 * icon + title group instead.
 *
 * Presenter rules (rule 8): notifications come in as data; opening, clearing
 * and clearing-all are callbacks — what they MEAN (mark read, archive,
 * navigate) is the consuming app's business. The only state owned here is UI
 * state: active tab, search text, filter selection, the confirm dialog, and
 * the ids currently animating out.
 */
export interface InboxViewProps {
  notifications: InboxNotification[]
  /** Open the underlying record; the caller also marks the item read. */
  onOpen?: (notification: InboxNotification) => void
  /** Clear one item (the hover/focus-revealed card button). Omit → no Clear affordances. */
  onClear?: (notification: InboxNotification) => void
  /**
   * Clear every notification currently in `tab` (fired AFTER the user
   * confirms the destructive bulk action — UX-NOTES §4). Omit → no
   * "Clear All" button.
   */
  onClearAll?: (visible: InboxNotification[], tab: InboxTabId) => void
  /** Module title for the STANDALONE toolbar (hosted mode reads the app bar's). */
  title?: string
  /** "Now" for the Today/Yesterday date grouping — injectable for tests/demos. */
  now?: Date
  className?: string
}

/** How long a cleared card fades before it is reported cleared (duration-normal). */
const CLEAR_ANIMATION_MS = 200

export function InboxView({
  notifications,
  onOpen,
  onClear,
  onClearAll,
  title = 'Inbox',
  now,
  className,
}: InboxViewProps) {
  const [tab, setTab] = useState<InboxTabId>('unread')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<InboxFilterState>({ severities: [], modules: [] })
  const [confirmingClearAll, setConfirmingClearAll] = useState(false)
  const [clearingIds, setClearingIds] = useState<ReadonlySet<string>>(new Set())
  const feedRef = useRef<HTMLDivElement>(null)
  const hosted = useTopNavSlots() !== null

  // Tab counts are TAB totals (per Figma), independent of search/filters.
  const counts = useMemo(
    () =>
      Object.fromEntries(
        INBOX_TABS.map((t) => [t.id, notifications.filter((n) => inTab(n, t.id)).length]),
      ) as Record<InboxTabId, number>,
    [notifications],
  )

  const inCurrentTab = useMemo(() => notifications.filter((n) => inTab(n, tab)), [notifications, tab])
  const visible = useMemo(
    () => applyInboxFilters(inCurrentTab, search, filters),
    [inCurrentTab, search, filters],
  )
  const groups = useMemo(() => groupByDate(visible, now), [visible, now])

  const selectTab = (next: string) => {
    setTab(next as InboxTabId)
    // Each tab starts at the top (UX-NOTES §4 "tab switch preserves
    // scroll-to-top"). Assignment, not `scrollTo()` — jsdom implements only
    // the property.
    if (feedRef.current) feedRef.current.scrollTop = 0
  }

  const clearOne = onClear
    ? (n: InboxNotification) => {
        // Fade the card out first, then report the clear — the list collapses
        // without jumping (UX-NOTES §4).
        setClearingIds((prev) => new Set(prev).add(n.id))
        window.setTimeout(() => {
          setClearingIds((prev) => {
            const next = new Set(prev)
            next.delete(n.id)
            return next
          })
          onClear(n)
        }, CLEAR_ANIMATION_MS)
      }
    : undefined

  const toolbar = (
    <InboxToolbar
      notifications={inCurrentTab}
      search={search}
      onSearchChange={setSearch}
      filters={filters}
      onFiltersChange={setFilters}
      onClearAll={onClearAll ? () => setConfirmingClearAll(true) : undefined}
    />
  )

  const isSearchEmpty = visible.length === 0 && inCurrentTab.length > 0
  // Empty states center VERTICALLY within the feed scroll region (UX-NOTES §4
  // "center within the feed region"), never top-aligned with dead space below.
  const centered = (status: ReactNode): ReactNode => (
    <div className="flex min-h-full items-center justify-center">{status}</div>
  )
  let feedBody: ReactNode
  if (groups.length > 0) {
    feedBody = groups.map((group) => (
      <section key={group.label} aria-label={group.label} className="relative">
        <h2 className="sticky top-0 z-10 bg-surface-minimal py-1.5 text-caption font-semibold text-muted-foreground">
          {group.label}
        </h2>
        <ul className="mt-1 flex flex-col gap-2">
          {group.items.map((n) => (
            <li key={n.id}>
              <InboxNotificationCard
                notification={n}
                onOpen={onOpen}
                onClear={clearOne}
                clearing={clearingIds.has(n.id)}
              />
            </li>
          ))}
        </ul>
      </section>
    ))
  } else if (isSearchEmpty) {
    feedBody = centered(
      <StatusView
        kind="empty"
        icon={<InboxIcon aria-hidden className="size-8" />}
        title="No results found"
        description="No notifications match your search or filters."
      />,
    )
  } else {
    feedBody = centered(
      <StatusView
        kind="empty"
        icon={<InboxIcon aria-hidden className="size-8" />}
        title="You're all caught up"
        description="New notifications will show up here."
      />,
    )
  }

  return (
    <div
      data-slot="inbox-view"
      className={cn('flex h-full min-h-0 flex-col bg-surface-minimal', className)}
    >
      {hosted ? (
        <>
          {/* The 20px brand-blue module icon before the host bar's "Inbox"
              title (SPEC §Toolbar "module title group") — portaled into the
              title-lead slot; the title TEXT stays the shell's `<h1>`. */}
          <TopNavSlotPortal region="title">
            <InboxIcon aria-hidden className="size-5 text-primary" />
          </TopNavSlotPortal>
          <TopNavSlotPortal region="actions">{toolbar}</TopNavSlotPortal>
        </>
      ) : (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-6 py-3.5">
          <span className="flex items-center gap-2 text-body font-semibold text-foreground">
            <InboxIcon aria-hidden className="size-5 text-primary" />
            {title}
          </span>
          {toolbar}
        </div>
      )}

      <div className="mx-auto flex min-h-0 w-full max-w-[67.5rem] flex-1 flex-col px-6">
        <div className="shrink-0 pt-4">
          <CountTabs
            aria-label="Inbox filters"
            value={tab}
            onValueChange={selectTab}
            items={INBOX_TABS.map((t) => ({
              id: t.id,
              label: t.label,
              count: formatTabCount(counts[t.id] ?? 0),
            }))}
          />
        </div>
        {/* Counts announced politely for assistive tech (UX-NOTES §7). */}
        <p aria-live="polite" className="sr-only">
          Showing {visible.length} notifications
        </p>
        <div
          ref={feedRef}
          data-slot="inbox-feed"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6"
        >
          {feedBody}
        </div>
      </div>

      {onClearAll ? (
        <DestructiveActionModal
          open={confirmingClearAll}
          onOpenChange={setConfirmingClearAll}
          title="Clear all notifications?"
          description={`This clears all ${inCurrentTab.length} notifications in the “${INBOX_TABS.find((t) => t.id === tab)?.label ?? tab}” tab.`}
          confirmLabel="Clear All"
          onConfirm={() => {
            onClearAll(inCurrentTab, tab)
            setConfirmingClearAll(false)
          }}
        />
      ) : null}
    </div>
  )
}

InboxView.displayName = 'InboxView'
