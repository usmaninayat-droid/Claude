# Settings block — tenant/app configuration (app-nav)

**Form:** TSX, wired as the `settings` slot on the `AppConfig` (NOT a module).

## What it is
The app/tenant configuration surface — reached from the **blue app-rail footer gear**. When in
Settings, the app/module is deselected. A left settings-nav + a content pane per section.

## Anatomy
- **Settings nav** (left) — grouped sections (Profile, Account, Users & Roles, Preferences, Integrations…).
- **Content pane** — section forms (DS inputs/switches/selects), section header + save.

## Adapt
The section list + each section's fields.

## Compose
Set `settings` on the `AppConfig` in `App.tsx`. Reference: facilities-ops `settings.tsx` + DS `settings-nav`.
