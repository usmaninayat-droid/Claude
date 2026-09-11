import type { InboxNotification } from './types'

/**
 * Shared inbox fixtures for tests, the axe sweep, and the showcase demo —
 * mirrors the Figma sample content (specs/inbox SPEC §Content).
 * `INBOX_FIXTURE_NOW` pins "today" so the Today/Yesterday grouping is stable.
 */
export const INBOX_FIXTURE_NOW = new Date('2026-08-15T12:00:00')

export const inboxNotificationFixtures: InboxNotification[] = [
  {
    id: 'ntf-1',
    title: 'Approval needed: Fleet maintenance',
    snippet: 'Vehicle AJ-2341 scheduled maintenance requires your approval before dispatch.',
    timestamp: '2026-08-15T08:45:00',
    kind: 'approval',
    reference: { id: 'TKT-01', label: 'TKT-01' },
    severity: { label: 'Critical', tone: 'critical' },
    due: 'Today',
    module: { label: 'Ticketing' },
    assignedToMe: true,
  },
  {
    id: 'ntf-2',
    title: 'Minor Incident requires attention',
    snippet: 'Hazardous waste spill reported at Industrial Zone, Lot 3. Escalated to your team.',
    timestamp: '2026-08-15T08:20:00',
    kind: 'notification',
    reference: { id: 'TKT-02', label: 'TKT-02' },
    severity: { label: 'Minor', tone: 'minor' },
    module: { label: 'Ticketing' },
    reminder: true,
  },
  {
    id: 'ntf-3',
    title: 'Weekly compliance report generated',
    snippet: 'Your scheduled compliance report for Zone 4 is ready for review.',
    timestamp: '2026-08-15T00:01:00',
    kind: 'system',
    module: { label: 'Telematics' },
  },
  {
    id: 'ntf-4',
    title: 'Ahmed K. mentioned you in Pipeline',
    snippet: '@you Please review the updated waste collection schedule for next week.',
    timestamp: '2026-08-14T12:01:00',
    kind: 'mention',
    avatarSrc: 'https://picsum.photos/seed/ahmed/56/56',
    reference: { id: 'TKT-03', label: 'TKT-03' },
    module: { label: 'Ticketing' },
  },
  {
    id: 'ntf-5',
    title: 'Telematics alert: Vehicle AJ-1189 exceeded speed limit',
    snippet: 'Vehicle AJ-1189 recorded 85 km/h in a 60 km/h zone near Al Quoz Industrial Area.',
    timestamp: '2026-08-14T21:23:00',
    kind: 'system',
    read: true,
    module: { label: 'Telematics' },
  },
  {
    id: 'ntf-6',
    title: 'Vehicle maintenance plan updated',
    snippet: 'Ahmed K. updated the Vehicle maintenance plan.',
    timestamp: '2026-04-12T00:01:00',
    kind: 'notification',
    read: true,
    reference: { id: 'TKT-01', label: 'TKT-01' },
    module: { label: 'Ticketing' },
  },
]
