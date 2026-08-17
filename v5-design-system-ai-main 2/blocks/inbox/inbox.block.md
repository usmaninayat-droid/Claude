# Inbox block — cross-app notification surface (app-nav)

**Form:** TSX, wired as the `collectiveInbox` slot on the `AppConfig` (NOT a module).

## What it is
One **cross-app, view-less** notification surface covering every app's notifications — reached from
the **blue app-rail** Inbox icon. When in Inbox, the app/module is deselected. It is not a per-module
list and has no views/module chrome.

## Anatomy
- Segmented filter (All / Unread / Mentions / System) + mark-all-read.
- Grouped notification list (Today / Earlier) of DS `NotificationCard`s (icon/tone, title, source app,
  timestamp, optional action). Empty state when clear. Clicking deep-links to the record.

## Adapt
The segments, grouping, and notification taxonomy/sources.

## Compose
Set `collectiveInbox` on the `AppConfig` in `App.tsx`. Reference: facilities-ops `inbox.tsx`.
