import type { AppConfig } from '@ds/components/app-shell';

/**
 * Inbox BLOCK — the single cross-app notification surface. Inbox is NOT a
 * left-rail module: it lives in the blue **app nav** and is wired as
 * `AppConfig.collectiveInbox`. The DS renders the built-in cross-app InboxView
 * (Unread / All / Reminders / Assigned to me / @Mentions / Critical tabs, date
 * grouping, search, Clear All) — no views, no bespoke screen, just data.
 *
 * ADAPT: replace `notifications` with the app's real events. Per item set
 * `kind` (alert | system | mention), `unread`, `dateGroup` (Today / Yesterday /
 * a date), `module` (which app raised it), optional `priority` / `dueLabel` /
 * `avatarFallback`, and `categories` (assigned | critical | reminder | mention)
 * — the tabs filter on these. Vocabulary here is domain-neutral. See the md.
 */
export const inboxBlock: AppConfig['collectiveInbox'] = {
  notificationDot: true,
  data: {
    notifications: [
      // ── Today ──────────────────────────────────────────────────────────
      {
        id: 'n1', kind: 'alert', unread: true, dateGroup: 'Today', timestamp: '8:45 AM',
        title: 'Approval needed: high-value request',
        description: 'A request assigned to you needs approval before it can proceed.',
        sourceTag: 'ID-204', module: 'App A', priority: 'Critical', dueLabel: 'Today',
        categories: ['assigned', 'critical'],
      },
      {
        id: 'n2', kind: 'alert', unread: true, dateGroup: 'Today', timestamp: '8:20 AM',
        title: 'New item requires attention',
        description: 'An item was escalated to your team for review.',
        sourceTag: 'ID-204', module: 'App B', priority: 'Minor',
        categories: ['assigned'],
      },
      {
        id: 'n3', kind: 'alert', unread: true, dateGroup: 'Today', timestamp: '12:01 AM',
        title: 'Scheduled report generated',
        description: 'Your scheduled weekly report is ready for review.',
        sourceTag: 'ID-204', module: 'App A',
        categories: ['reminder'],
      },
      // ── Yesterday ──────────────────────────────────────────────────────
      {
        id: 'n4', kind: 'system', dateGroup: 'Yesterday', timestamp: '11:32 AM',
        title: 'Configuration updated',
        description: 'A teammate updated a shared configuration.',
        sourceTag: 'ID-204', module: 'App A',
      },
      {
        id: 'n5', kind: 'mention', unread: true, dateGroup: 'Yesterday', timestamp: '10:14 AM',
        avatarFallback: 'AK',
        title: 'Ahmed K. mentioned you',
        description: '@you Please take a look at the updated record when you have a moment.',
        sourceTag: 'ID-204', module: 'App B',
        categories: ['mention'],
      },
      // ── Earlier ────────────────────────────────────────────────────────
      {
        id: 'n6', kind: 'alert', dateGroup: '12 Jun 2026', timestamp: '12:01 AM',
        title: 'Reminder: review due',
        description: 'A periodic review is approaching its due date.',
        sourceTag: 'ID-204', module: 'App A', dueLabel: '12 Jun',
        categories: ['reminder', 'assigned'],
      },
    ],
  },
};
