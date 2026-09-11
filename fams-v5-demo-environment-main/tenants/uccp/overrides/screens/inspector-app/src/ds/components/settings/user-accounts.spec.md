# UserAccounts — contract

Settings › User Accounts (FAMS Launch Pad, Figma 4479-24369). Invite and manage the people in
an organization.

## Shape
`UserAccounts({ title?, subtitle?, users, stats?, onCreateUser?, onUserAction?, searchQuery?, onSearchChange?, className? })`

- `users: UserRow[]` — `{ id, name, email?, username?, avatarUrl?, phone, status, roles: {label,color?}[], lastLogin?, lastActivity? }`.
- `status: 'active'|'invited'|'inactive'|'pending'|'suspended'` → a status `Badge` on the matching status token.
- `stats?: UserStat[]` — summary cards. Defaults to Total / Active / Invited / Pending / Suspended
  counts DERIVED from `users` when omitted (so it works with zero config).
- `onUserAction(user, 'edit'|'resend'|'suspend'|'activate'|'delete')` — the consumer owns mutations.
  Resend/activate/suspend are shown conditionally by current status.

## Behaviour
- Header: title + subtitle + a global search (name / email / username / phone / role) + New User.
- Stat-card row (icon-well + label + count).
- Sortable table: User (avatar + name + email/username) · Phone · Status badge · Roles (color pills) ·
  Last Login · Last Activity · row kebab. Name / Last Login / Last Activity headers cycle
  asc → desc → none; "Never" for empty times. Sort is by string (no parseable dates in the DS demo).
- Search + sort are uncontrolled unless the controlled props are supplied.
- Empty state distinguishes "no users" from "no search matches".

## Laws
- Token-only (role/status tones are `var(--*)` tokens or caller-supplied color DATA). Config-driven +
  domain-agnostic. a11y: search + sort buttons labelled, kebab items labelled, avatar has alt/fallback.
