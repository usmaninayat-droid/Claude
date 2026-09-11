---
name: edit-module
description: Use for any change to WHAT a module shows — add/rename/hide a field, change a label, reorder/add/hide tabs, add/remove pipeline stages, change required/list values, move a field between regions. Triggers include "add a phone number field to drivers", "rename Tasks to Jobs", "hide the notes column", "add a stage to the ticket pipeline".
---

# Edit a module (fields / labels / tabs / stages)

**Vocabulary:** drivers/staff → `workforce` · trucks/vehicles → `asset` · tickets/tasks/jobs → `ticketing`. Tenants: `fams`, `iwmp` (Tadweer; its `asset` = Collection Point Management). Tenant unspecified → ask; if you can't, use `iwmp` and say so.

## One tenant (the normal case) — vibecode-then-capture

1. Open `resolved/<t>/<m>.blueprint.json` and edit it to what the screen should be.
   - A **new field** needs THREE things or it will not render properly:
     the field descriptor, a **placement** (region: `details`, `list`,
     `kanbanCard.header|body|footer`), **and** an entry in `systemColumns`.
   - Respect stable `id`s — never rename or reuse one.
   - `uiConfig` (creation sheet, filters, list columns, profile.details) is part
     of the blueprint surface — edit it the same way.
2. `pnpm demo capture <t>` — canonicalizes your diff into typed ops in
   `tenants/<t>/deltas/<m>.ops.json`. Non-zero exit + `*.ops.proposed.json`
   means your edit isn't expressible as ops — read the explanation and adjust
   the edit; never force it.
3. `pnpm demo check` — must pass.
4. **Verify visually**: `pnpm --filter app dev` → `http://localhost:6300/?tenant=<t>&persona=u_admin`.
   A field that shows as bare text = missing systemColumns entry (the classic trap).

Full drill with examples: `docs/agent-drill.md`. Fallback (hand-authored ops,
op families, schema): CLAUDE.md § Customizing a tenant.

## All tenants (shared change)

Edit `core/modules/<m>/blueprint.json` instead → `pnpm demo resolve --all` →
`pnpm demo check` → review the diff in EVERY tenant's `resolved/`. Never use
`core/` to customize one tenant; promote a proven tenant change with
`pnpm demo promote <t> --op <opId>`.

## Never

- Never leave `resolved/` edited without running capture — `demo check` fails the build.
- Never touch `app/` for this — module content is metadata, not React.
- If the request is actually about how a field/table LOOKS (styling), that's
  `../fams-design-system` → its `styling-change` skill.
