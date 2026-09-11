import type { LucideIcon } from 'lucide-react'
import { Siren, Bell, Activity, Hash, Flag, Clock, ShieldCheck, FileSearch, Layers, Truck, Trash2, FileText, Fuel, UserCheck, Wrench, MapPin } from 'lucide-react'
import type { IconBadgeTone } from '@fams/design-system'

export type InboxTabId = 'unread' | 'all' | 'reminders' | 'assigned' | 'mentions' | 'critical'

export const INBOX_TABS: { id: InboxTabId; label: string }[] = [
  { id: 'unread', label: 'Unread' },
  { id: 'all', label: 'All' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'assigned', label: 'Assigned to me' },
  { id: 'mentions', label: '@Mentions' },
  { id: 'critical', label: 'Critical' },
]

export type ChipKind = 'tag' | 'critical' | 'minor' | 'today' | 'plain'

export interface NotificationChip {
  kind: ChipKind
  icon: LucideIcon
  label: string
}

export interface NotificationItem {
  id: string
  icon?: LucideIcon
  avatarInitials?: string
  title: string
  message: string
  chips: NotificationChip[]
  time: string
  section: 'Today' | 'Yesterday' | '12 APR 2026'
  /** Tags this notification into the secondary tabs (beyond Unread/All). */
  tags: Exclude<InboxTabId, 'unread' | 'all'>[]
  /** Starts already read (Figma node 31046:8000 — the "Yesterday" section is read by default). */
  read?: boolean
  /** Overrides the default unread/read icon tone — used by batched digest rows to surface the
   * severity of what got queued (see Settings > Notifications Configuration > Notification Batching). */
  iconTone?: IconBadgeTone
}

// 18 sample notifications (n1–n8 ported from the Figma "Inbox" screen, node 31046:7925; n9–n18
// added to give the feed — and the Home dashboard's notifications panel — a scrollable ~20-row
// list), plus two batched-digest samples (n0, n0b) demonstrating the Notification Batching feature:
// n0 is a platform-default digest (40/5m), n0b is tied to the Events module's own custom 5/2min
// override (see Settings > Notifications Configuration) — individual alerts collapse into one summary row
// instead of flooding the feed.
export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n0',
    icon: Bell,
    iconTone: 'danger',
    title: '48 new critical events',
    message: 'Need your attention from the last 30 minutes',
    chips: [
      { kind: 'critical', icon: Flag, label: 'Critical' },
      { kind: 'plain', icon: ShieldCheck, label: 'UCCP' },
    ],
    time: 'Just now',
    section: 'Today',
    tags: ['critical'],
  },
  {
    id: 'n0b',
    icon: Activity,
    iconTone: 'warning',
    title: '14 new Water-Level alerts',
    message: 'Batched from Events — queued over the last 2 minutes, per its custom batching window.',
    chips: [
      { kind: 'tag', icon: Layers, label: 'Batched' },
      { kind: 'plain', icon: ShieldCheck, label: 'Events' },
    ],
    time: '2 min ago',
    section: 'Today',
    tags: [],
  },
  {
    id: 'n1',
    icon: Siren,
    title: 'Approval needed: Tanker maintenance',
    message: 'Tanker LMV-QA05 scheduled maintenance requires your approval before dispatch.',
    chips: [
      { kind: 'tag', icon: Hash, label: 'FM-882' },
      { kind: 'critical', icon: Flag, label: 'Critical' },
      { kind: 'today', icon: Clock, label: 'Today' },
      { kind: 'plain', icon: ShieldCheck, label: 'UCCP' },
    ],
    time: '8:45 AM',
    section: 'Today',
    tags: ['critical', 'assigned'],
  },
  {
    id: 'n2',
    icon: Bell,
    title: 'Minor complaint requires attention',
    message: 'Standing water reported at Industrial Area, Zone 3. Escalated to your team.',
    chips: [
      { kind: 'tag', icon: Hash, label: 'FM-882' },
      { kind: 'minor', icon: Flag, label: 'Minor' },
      { kind: 'plain', icon: FileSearch, label: 'MME' },
    ],
    time: '8:20 AM',
    section: 'Today',
    tags: [],
  },
  {
    id: 'n3',
    icon: Bell,
    title: 'Weekly compliance report generated',
    message: 'Your scheduled compliance report for Al Rayyan is ready for review.',
    chips: [
      { kind: 'tag', icon: Hash, label: 'FM-882' },
      { kind: 'plain', icon: FileSearch, label: 'MME' },
    ],
    time: '12:01 AM',
    section: 'Today',
    tags: ['reminders'],
  },
  {
    id: 'n9',
    icon: Truck,
    title: 'Response route RR-114 completed',
    message: 'All stations on route RR-114 were checked and the tanker returned to the response base.',
    chips: [
      { kind: 'tag', icon: Hash, label: 'OPS-231' },
      { kind: 'minor', icon: Flag, label: 'Minor' },
      { kind: 'plain', icon: ShieldCheck, label: 'UCCP' },
    ],
    time: '10:12 AM',
    section: 'Today',
    tags: [],
  },
  {
    id: 'n10',
    icon: Trash2,
    title: 'Water level critical at Al Wakrah Corniche',
    message: 'Station RSN-06 reported 96% of threshold — dispatch a response team.',
    chips: [
      { kind: 'tag', icon: Hash, label: 'RSN-06' },
      { kind: 'critical', icon: Flag, label: 'Critical' },
      { kind: 'today', icon: Clock, label: 'Today' },
      { kind: 'plain', icon: ShieldCheck, label: 'UCCP' },
    ],
    time: '9:58 AM',
    section: 'Today',
    tags: ['critical'],
  },
  {
    id: 'n11',
    avatarInitials: 'SR',
    title: 'Sara R. mentioned you in Requests & Complaints',
    message: '@you Can you confirm the reassignment for the Lusail Marina pooling report?',
    chips: [
      { kind: 'tag', icon: Hash, label: 'INC-02' },
      { kind: 'plain', icon: FileSearch, label: 'MME' },
    ],
    time: '9:15 AM',
    section: 'Today',
    tags: ['mentions', 'assigned'],
  },
  {
    id: 'n4',
    icon: Activity,
    title: 'Tanker maintenance plan updated',
    message: 'Ahmed K. updated the tanker maintenance plan',
    chips: [
      { kind: 'tag', icon: Hash, label: 'FM-882' },
      { kind: 'plain', icon: FileSearch, label: 'MME' },
    ],
    time: '11:32 AM',
    section: 'Yesterday',
    tags: [],
    read: true,
  },
  {
    id: 'n5',
    avatarInitials: 'AK',
    title: 'Ahmed K. mentioned you in Pipeline',
    message: '@you Please review the updated response route schedule for next week.',
    chips: [
      { kind: 'tag', icon: Hash, label: 'FM-882' },
      { kind: 'plain', icon: FileSearch, label: 'MME' },
    ],
    time: '12:01 AM',
    section: 'Yesterday',
    tags: ['mentions', 'assigned'],
    read: true,
  },
  {
    id: 'n6',
    icon: Activity,
    title: 'Telematics alert: Tanker LMV-QA11 exceeded speed limit',
    message: 'Tanker LMV-QA11 recorded 85 km/h in a 60 km/h zone near Mesaieed Industrial Zone.',
    chips: [
      { kind: 'tag', icon: Hash, label: 'FM-882' },
      { kind: 'plain', icon: FileSearch, label: 'MME' },
    ],
    time: '09:23 PM',
    section: 'Yesterday',
    tags: ['critical'],
    read: true,
  },
  {
    id: 'n12',
    icon: FileText,
    title: 'Driver shift report submitted',
    message: 'Omar F. submitted the end-of-shift report for Al Rayyan Zone.',
    chips: [
      { kind: 'tag', icon: Hash, label: 'WF-120' },
      { kind: 'plain', icon: FileSearch, label: 'MME' },
    ],
    time: '06:40 PM',
    section: 'Yesterday',
    tags: ['reminders'],
    read: true,
  },
  {
    id: 'n13',
    icon: Fuel,
    title: 'Fuel threshold alert: Tanker LMV-QA09',
    message: 'Fuel dropped below 15% during the afternoon response run.',
    chips: [
      { kind: 'tag', icon: Hash, label: 'FM-901' },
      { kind: 'minor', icon: Flag, label: 'Minor' },
      { kind: 'plain', icon: ShieldCheck, label: 'UCCP' },
    ],
    time: '04:22 PM',
    section: 'Yesterday',
    tags: [],
    read: true,
  },
  {
    id: 'n14',
    avatarInitials: 'MK',
    title: 'Mariam K. mentioned you in Plans',
    message: '@you Updated the deep-maintenance plan — please approve the new frequency.',
    chips: [
      { kind: 'tag', icon: Hash, label: 'PL-045' },
      { kind: 'plain', icon: FileSearch, label: 'MME' },
    ],
    time: '02:10 PM',
    section: 'Yesterday',
    tags: ['mentions', 'assigned'],
    read: true,
  },
  {
    id: 'n7',
    icon: Activity,
    title: 'Tanker maintenance plan updated',
    message: 'Ahmed K. updated the tanker maintenance plan',
    chips: [
      { kind: 'tag', icon: Hash, label: 'FM-882' },
      { kind: 'plain', icon: FileSearch, label: 'MME' },
    ],
    time: '12:01 AM',
    section: '12 APR 2026',
    tags: [],
  },
  {
    id: 'n8',
    avatarInitials: 'AK',
    title: 'Ahmed K. mentioned you in Pipeline',
    message: '@you Please review the updated response route schedule for next week.',
    chips: [
      { kind: 'tag', icon: Hash, label: 'FM-882' },
      { kind: 'plain', icon: FileSearch, label: 'MME' },
    ],
    time: '12:01 AM',
    section: '12 APR 2026',
    tags: ['mentions', 'assigned'],
  },
  {
    id: 'n15',
    icon: FileText,
    title: 'Contract renewal reminder',
    message: 'The Ashghal drainage-maintenance contract MC-2025 expires in 14 days.',
    chips: [
      { kind: 'tag', icon: Hash, label: 'CT-2025' },
      { kind: 'plain', icon: FileSearch, label: 'MME' },
    ],
    time: '05:30 PM',
    section: '12 APR 2026',
    tags: ['reminders'],
  },
  {
    id: 'n16',
    icon: UserCheck,
    title: 'New service request assigned to you',
    message: 'Service request SR-8890 (Kahramaa drainage flag) was routed to your team.',
    chips: [
      { kind: 'tag', icon: Hash, label: 'SR-8890' },
      { kind: 'plain', icon: ShieldCheck, label: 'UCCP' },
    ],
    time: '03:05 PM',
    section: '12 APR 2026',
    tags: ['assigned'],
  },
  {
    id: 'n17',
    icon: Wrench,
    title: 'Maintenance completed: Tanker LMV-QA15',
    message: 'Scheduled maintenance closed out — the tanker is back in the available pool.',
    chips: [
      { kind: 'tag', icon: Hash, label: 'FM-778' },
      { kind: 'plain', icon: ShieldCheck, label: 'UCCP' },
    ],
    time: '11:45 AM',
    section: '12 APR 2026',
    tags: [],
    read: true,
  },
  {
    id: 'n18',
    icon: MapPin,
    title: 'Geofence breach: Tanker LMV-QA11',
    message: 'Tanker left its assigned zone near Umm Salal for 8 minutes.',
    chips: [
      { kind: 'tag', icon: Hash, label: 'FM-882' },
      { kind: 'critical', icon: Flag, label: 'Critical' },
      { kind: 'plain', icon: FileSearch, label: 'MME' },
    ],
    time: '10:20 AM',
    section: '12 APR 2026',
    tags: ['critical'],
  },
]

export const SECTION_ORDER: NotificationItem['section'][] = ['Today', 'Yesterday', '12 APR 2026']
