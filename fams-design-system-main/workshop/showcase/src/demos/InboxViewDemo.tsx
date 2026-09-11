import { useState } from 'react'
import {
  InboxView,
  InboxNotificationCard,
  inboxNotificationFixtures,
  INBOX_FIXTURE_NOW,
  type InboxNotification,
} from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code, Gallery } from '../docs'

/**
 * InboxViewDemo — the `inbox` module type's feed surface (tier-2, DRAFT).
 * Renders from `inboxNotificationFixtures`, the same reference data the
 * package's own tests and axe sweep run against. Clearing here mutates local
 * demo state only — in an app the surface writes through the composer's
 * guarded DataAdapter (see `InboxModuleSurface`).
 */
function LiveExample() {
  const [items, setItems] = useState<InboxNotification[]>(inboxNotificationFixtures)
  const markRead = (ids: string[]) =>
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)))
  return (
    <div className="h-[36rem] overflow-hidden rounded-md border border-border">
      <InboxView
        notifications={items}
        now={INBOX_FIXTURE_NOW}
        onOpen={(n) => markRead([n.id])}
        onClear={(n) => markRead([n.id])}
        onClearAll={(visible) => markRead(visible.map((n) => n.id))}
      />
    </div>
  )
}

export default function InboxViewDemo() {
  const [approval, minor, , mention] = inboxNotificationFixtures
  return (
    <DocPage
      title="InboxView"
      badge="wip"
      summary="The inbox module type's date-grouped notification feed: six count tabs (Unread / All / Reminders / Assigned to me / @Mentions / Critical), search + filter + Clear All toolbar, sticky date-group headers, and hover/focus-revealed per-item Clear. DRAFT — first-adopter exemplar from the WP4 inbox parity run."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Fully interactive: switch tabs, search, open the filter popover, clear an item (hover or
          focus the card), or Clear All (confirm dialog). Opening or clearing marks the item read —
          it leaves the Unread tab and its count decrements. Only the feed scrolls; the toolbar and
          the tab strip stay fixed.
        </Prose>
        <LiveExample />
      </DocSection>

      <DocSection id="cards" title="Notification cards">
        <Prose>
          <Code>InboxNotificationCard</Code> is the feed's row: a 28px type-icon container (or an
          avatar for mentions), a single-line title + snippet, the chip row (reference / severity /
          due / module), and the timestamp column with the 7px unread dot and the revealed Clear.
          The whole card is one open target (a stretched title button); Clear is a nested stop.
        </Prose>
        <Gallery
          minColRem={30}
          items={[
            { label: 'unread + critical + due', node: <InboxNotificationCard notification={approval} onOpen={() => {}} onClear={() => {}} /> },
            { label: 'minor severity', node: <InboxNotificationCard notification={minor} onOpen={() => {}} onClear={() => {}} /> },
            { label: 'mention (avatar)', node: <InboxNotificationCard notification={mention} onOpen={() => {}} onClear={() => {}} /> },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'notifications', type: 'InboxNotification[]', description: 'The feed, unfiltered — tabs/search/filters are applied inside.' },
            { prop: 'onOpen', type: '(n: InboxNotification) => void', description: 'Whole-card click: open the record (the caller also marks it read).' },
            { prop: 'onClear', type: '(n: InboxNotification) => void', description: 'Per-item Clear (hover/focus-revealed). Omit → no Clear affordances.' },
            { prop: 'onClearAll', type: '(visible, tab) => void', description: 'Fired AFTER the destructive-bulk confirm with the current tab’s items.' },
            { prop: 'title', type: 'string', default: "'Inbox'", description: 'Standalone toolbar title. Hosted in an AppShell, the toolbar portals into the app bar instead.' },
            { prop: 'now', type: 'Date', description: 'Injectable “now” for the Today/Yesterday grouping (tests/demos).' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Feed it presenter data (InboxNotification) — map store records in the app layer (see toInboxNotification).',
            'Let opening a record mark it read; the unread dot and tab counts derive from the data.',
            'Keep cross-module unread state (the rail dot) in an injectable source, not component state.',
            'Use the inbox module type in a blueprint — the composer resolves this surface via the InboxView template ref.',
          ]}
          donts={[
            'Don’t render it inside another scrolling page — the feed owns the scroll region.',
            'Don’t add per-product chips to the card — reference/severity/due/module cover the vocabulary.',
            'Don’t make Clear hover-only anywhere else either; it must be focus-revealed too.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The tab strip is the CountTabs composite — WAI-ARIA tabs pattern with counts in the accessible names.',
            'Each card is an <article>; the title is a real button stretched over the card, so the open target has an accessible name.',
            'Per-item Clear is revealed on hover AND focus-within, and carries the notification title in its name.',
            'Clear All confirms through an alert dialog (focus-trapped, Escape closes).',
            'Result counts announce politely via a visually-hidden live region.',
            'Logical properties only — the feed mirrors under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
