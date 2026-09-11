import {
  NOTIFICATION_TYPES, ROLES, CHANNELS_NO_PUSH as CHANNELS,
  type NotificationType, type Role, type Channel,
} from '../notifications-configuration/notificationsConfigData'

/** The 9 non-admin roles this page can simulate viewing as. Admin already has the full authoring
 * view (NotificationsConfigurationPage) — this page is explicitly for "other", non-admin users. */
export const VIEWER_ROLES: Role[] = ROLES.filter((r) => r !== 'Admin')

/** `rc()` in notificationsConfigData.ts seeds Inbox `true` for every role on every type by
 * default, so "eligible for any channel" alone would count nearly the entire enabled catalog as
 * "relevant" to every role — Inbox eligibility isn't a meaningful per-role routing signal in this
 * seed data, unlike an admin actively routing Toast/Push/Email/SMS to a role. */
const ACTIVE_CHANNELS = CHANNELS.filter((c) => c.id !== 'inbox')

/** Notification types actually relevant to a given role: platform-enabled (a type the admin has
 * disabled platform-wide is invisible here, not just harder to reach — nothing is being sent for
 * it) AND the role is routed at least one active channel (Toast/Push/Email/SMS) for it — Inbox
 * alone doesn't count a type as "yours" (see ACTIVE_CHANNELS above). */
export function getUserNotifications(role: Role): NotificationType[] {
  return NOTIFICATION_TYPES.filter(
    (t) => t.platformEnabled && ACTIVE_CHANNELS.some((c) => t.roleChannels[role][c.id] === true)
  )
}

/** Channels this role is actually eligible for on a given type — the only ones this user's
 * personal view ever shows. A channel the admin never routed to this role isn't rendered at all,
 * not shown-and-disabled. NOTE: includes Inbox (unlike `getUserNotifications`'s relevance check)
 * — only ever call this on a type that already passed `getUserNotifications`'s gate, since `rc()`
 * seeds Inbox `true` for every role on every type regardless of real relevance; calling this
 * standalone would misreport "Inbox eligible" for an unrelated role. */
export function eligibleChannels(type: NotificationType, role: Role): Channel[] {
  return CHANNELS.filter((c) => type.roleChannels[role][c.id] === true).map((c) => c.id)
}

/** Partial, not total, over Role — Admin is intentionally excluded (see VIEWER_ROLES) and has no
 * count here; the one consumer (MyNotificationsPage) already guards with `?? 0`. */
export const VIEWER_ROLE_COUNTS: Partial<Record<Role, number>> = Object.fromEntries(
  VIEWER_ROLES.map((role) => [role, getUserNotifications(role).length])
)

/** Plain-language "what is this channel" text, shared by every channel-toggle tooltip on this
 * page — the per-row `ChannelChip` (NotificationPreferenceRow.tsx) and the bulk-selection
 * `SelectionChannelButton` (MyNotificationsPage.tsx) both lead with this before stating the
 * effect, since the bare label ("Toast", "SMS") alone doesn't tell an unfamiliar user what it does. */
export const CHANNEL_DESCRIPTIONS: Record<Channel, string> = {
  toast: 'an in-app pop-up while you’re using the dashboard',
  push: 'a push notification on your device',
  email: 'an email to your inbox',
  sms: 'a text message to your phone',
  whatsapp: 'a WhatsApp message to your phone',
  inbox: 'a message in your Inbox feed',
}
