---
name: new-module
description: Use when a request needs a NEW screen or module — "add a screen where X is listed", "we need a maintenance section", "add contract management". Also when a tenant needs its own variant of an existing module. NOT for adding fields to an existing module (use edit-module) and NOT for new visual components (design system).
---

# Add a new screen / module

**First check it isn't already there:** trucks/vehicles → `asset`, drivers →
`workforce`, tickets/tasks → `ticketing` (see `core/modules/`). A "new screen"
for existing data is usually a **view** (`list`, `kanban`, `hybrid`) or
`uiConfig` change on an existing module → use the `edit-module` skill.

## Genuinely new module (tenant-native incubation)

1. Create `tenants/<t>/modules/<m>/blueprint.json` — copy the closest existing
   blueprint as a template (`core/modules/*/blueprint.json` or
   `tenants/iwmp/modules/asset/blueprint.json` for a tenant-native example).
   Set `code`, `name`, `views`, fields (+ placements + `systemColumns`), `uiConfig`.
   A tenant-native module may also **shadow a core module id** to replace it for
   that tenant (that is how iwmp's Collection Point Management replaces `asset`).
2. License it in `tenants/<t>/tenant.json`: add `<m>` to **both** the top-level
   `modules` array **and** the right `applications[].modules` array (otherwise
   it never appears in the nav).
3. Seed it: `tenants/<t>/seeds/<m>.seed.json` — reference values must point at
   existing seed ids (`demo check` fails on dangling refs).
4. `pnpm demo resolve <t>` → `pnpm demo check`.
5. Verify at `http://localhost:6300/?tenant=<t>&persona=u_admin` (run
   `pnpm --filter app dev`).

Promotion to `core/` later: `pnpm demo promote <t> --module <m>`.

## When this is NOT enough

If the module needs a **view kind or visual component that doesn't exist**
(a calendar view, a map view, a new card type), that part is design-system work:
build it in `../fams-design-system` (`packages/v5-composer` / `v5-templates` /
`ui-kit`, under its CLAUDE.md + skills), rebuild (`pnpm --filter <pkg> build`),
then reference it from the blueprint. Never build UI in `app/`.
