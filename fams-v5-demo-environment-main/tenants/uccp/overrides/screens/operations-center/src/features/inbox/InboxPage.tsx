import { useMemo, useState } from 'react'
import { Inbox as InboxIcon, Search, Filter, Check } from 'lucide-react'
import { Button, Input, cn } from '@fams/design-system'
import { NotificationCard } from './NotificationCard'
import { NOTIFICATIONS, INBOX_TABS, SECTION_ORDER, type InboxTabId } from './inboxData'
import { CustomScrollbar } from '../../components/CustomScrollbar'

function matchesSearch(title: string, message: string, query: string) {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  return title.toLowerCase().includes(q) || message.toLowerCase().includes(q)
}

export function InboxPage() {
  const [activeTab, setActiveTab] = useState<InboxTabId>('unread')
  const [query, setQuery] = useState('')
  const [clearedIds, setClearedIds] = useState<Set<string>>(
    () => new Set(NOTIFICATIONS.filter((n) => n.read).map((n) => n.id))
  )

  const searched = useMemo(
    () => NOTIFICATIONS.filter((n) => matchesSearch(n.title, n.message, query)),
    [query]
  )

  const counts = useMemo(() => {
    const c: Record<InboxTabId, number> = { unread: 0, all: 0, reminders: 0, assigned: 0, mentions: 0, critical: 0 }
    for (const n of searched) {
      c.all += 1
      if (!clearedIds.has(n.id)) c.unread += 1
      for (const tag of n.tags) c[tag] += 1
    }
    return c
  }, [searched, clearedIds])

  const visible = useMemo(() => {
    if (activeTab === 'all') return searched
    if (activeTab === 'unread') return searched.filter((n) => !clearedIds.has(n.id))
    return searched.filter((n) => n.tags.includes(activeTab))
  }, [searched, activeTab, clearedIds])

  const bySection = SECTION_ORDER.map((section) => ({
    section,
    items: visible.filter((n) => n.section === section),
  })).filter((g) => g.items.length > 0)

  const clearOne = (id: string) => setClearedIds((prev) => new Set(prev).add(id))
  const clearAll = () => setClearedIds(new Set(NOTIFICATIONS.map((n) => n.id)))

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-center border-b border-border bg-card px-4 py-4">
        <div className="flex w-full max-w-[1080px] items-center justify-between">
          <div className="flex items-center gap-2">
            <InboxIcon className="size-5 text-foreground" />
            <p className="text-base font-semibold text-foreground">Inbox</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Inline search input on ≥ sm; collapses to an icon button on mobile
                so the header stays comfortable at 375px. */}
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search inbox"
              leadingIcon={<Search />}
              containerClassName="hidden w-[320px] sm:block"
              className="h-9 rounded-md"
            />
            <Button
              variant="tertiary"
              size="icon"
              className="size-9 rounded-[4px] sm:hidden"
              aria-label="Search inbox"
            >
              <Search className="size-5" />
            </Button>
            <Button variant="tertiary" size="icon" className="size-9 rounded-[4px]" aria-label="Filter">
              <Filter className="size-5" />
            </Button>
            <Button
              variant="tertiary"
              onClick={clearAll}
              className="h-9 gap-2 rounded-[4px] border-primary text-primary hover:bg-secondary/50"
              aria-label="Clear all"
            >
              <Check className="size-5" />
              <span className="hidden sm:inline">Clear All</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Feed */}
      <CustomScrollbar className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-2 px-4 py-4">
          {/* Switch Tabs */}
          <div className="flex items-center gap-6 overflow-x-auto border-b border-gray-300 no-scrollbar">
            {INBOX_TABS.map((tab) => {
              const active = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex h-8 shrink-0 items-center gap-1 border-b-2 border-transparent px-1 text-sm outline-none transition-colors',
                    active ? '-mb-px border-primary font-semibold text-primary' : 'font-medium text-gray-700 hover:text-foreground'
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      'flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-medium',
                      active ? 'bg-secondary text-secondary-foreground' : 'bg-gray-200 text-gray-600'
                    )}
                  >
                    {String(counts[tab.id]).padStart(2, '0')}
                  </span>
                </button>
              )
            })}
          </div>

          {bySection.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-24 text-center">
              <p className="text-sm font-semibold text-foreground">You're all caught up!</p>
              <p className="text-xs text-muted-foreground">No notifications here right now.</p>
            </div>
          ) : (
            bySection.map((group) => (
              <div key={group.section} className="flex flex-col gap-2">
                <div className="flex h-[30px] items-center">
                  <p className="text-xs font-medium text-muted-foreground">{group.section}</p>
                </div>
                {group.items.map((item) => (
                  <NotificationCard
                    key={item.id}
                    item={item}
                    unread={!clearedIds.has(item.id)}
                    onClear={() => clearOne(item.id)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </CustomScrollbar>
    </div>
  )
}
