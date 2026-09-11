/**
 * Inbox surface vocabulary (specs/inbox/SPEC.md). [tier-2 — v5 vocabulary
 * allowed] These are PRESENTER types: `InboxView` renders what it is given
 * and owns only its own UI state (active tab, search text) — where the
 * notifications come from, and what clearing/opening them means, is the
 * consuming app's business (rule 8).
 */

/** Picks the card's leading icon treatment. `mention` renders the avatar. */
export type InboxNotificationKind = 'notification' | 'approval' | 'system' | 'mention'

/** Severity chip tone — Figma shows Critical (error) and Minor (success). */
export type InboxSeverity = 'critical' | 'minor'

export interface InboxNotification {
  id: string
  /** Card title — 14px semibold, single-line truncated. */
  title: string
  /** Message snippet — 12px, single-line truncated. */
  snippet?: string
  /** ISO timestamp — drives the date grouping and the time label. */
  timestamp: string
  /** Unread → 7px primary dot next to the time; feeds the Unread tab. */
  read?: boolean
  /** Icon treatment (defaults to `notification` = bell). */
  kind?: InboxNotificationKind
  /** Avatar for `mention` cards. */
  avatarSrc?: string
  /** Reference chip ("# FM-882") — deep-links to the referenced record. */
  reference?: { id: string; label: string }
  /** Severity chip, when present. */
  severity?: { label: string; tone: InboxSeverity }
  /** Due chip label ("Today"), when present. */
  due?: string
  /** Borderless trailing module chip ("CCMS"). */
  module?: { label: string }
  /** Tab facets — the caller decides what each means for its data. */
  reminder?: boolean
  assignedToMe?: boolean
  mention?: boolean
}

/** The six fixed filter tabs (specs/inbox SPEC §Filter tabs row). */
export type InboxTabId = 'unread' | 'all' | 'reminders' | 'assigned' | 'mentions' | 'critical'

export const INBOX_TABS: { id: InboxTabId; label: string }[] = [
  { id: 'unread', label: 'Unread' },
  { id: 'all', label: 'All' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'assigned', label: 'Assigned to me' },
  { id: 'mentions', label: '@Mentions' },
  { id: 'critical', label: 'Critical' },
]

/** Whether one notification belongs to one tab. */
export function inTab(n: InboxNotification, tab: InboxTabId): boolean {
  switch (tab) {
    case 'unread':
      return !n.read
    case 'all':
      return true
    case 'reminders':
      return Boolean(n.reminder)
    case 'assigned':
      return Boolean(n.assignedToMe)
    case 'mentions':
      return Boolean(n.mention || n.kind === 'mention')
    case 'critical':
      return n.severity?.tone === 'critical'
  }
}

/** Figma zero-pads counts under 10 ("05", "03"); larger counts render plain. */
export function formatTabCount(count: number): string {
  return count < 10 ? String(count).padStart(2, '0') : String(count)
}

/**
 * Date-group label for a timestamp: "Today" / "Yesterday" / "12 APR 2026"
 * (SPEC §Date group headers). `now` is injectable for tests.
 */
export function dateGroupLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const day = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  if (day(date) === day(now)) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (day(date) === day(yesterday)) return 'Yesterday'
  const month = date.toLocaleString('en', { month: 'short' }).toUpperCase()
  return `${date.getDate()} ${month} ${date.getFullYear()}`
}

/** Group a (already filtered) list into date groups, newest group first. */
export function groupByDate(
  items: InboxNotification[],
  now: Date = new Date(),
): { label: string; items: InboxNotification[] }[] {
  const sorted = [...items].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
  const groups: { label: string; items: InboxNotification[] }[] = []
  for (const item of sorted) {
    const label = dateGroupLabel(item.timestamp, now)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(item)
    else groups.push({ label, items: [item] })
  }
  return groups
}
