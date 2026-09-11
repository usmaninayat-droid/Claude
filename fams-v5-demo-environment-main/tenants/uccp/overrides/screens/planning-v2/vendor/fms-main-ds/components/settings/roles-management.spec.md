# Roles Management — contract (`roles-management.tsx` + `role-sheet.tsx`)

Settings › Roles Management. Figma: `2:2480` (list) · `2:2618`/`2:3125`/`2:2818` (create wizard).

## RolesManagement (list)
The table of created roles. Config-driven, token-only.

**Props**
- `roles: RoleRow[]` — `{ id, name, access: {label, icon?}[], userCount, createdOn, status: 'active'|'disabled' }`
- `onCreateRole?()` · `onRoleAction?(role, 'edit'|'toggle'|'delete')`
- `title?` · `subtitle?` · `maxAccessChips?` (default 1, rest collapse to "+N") · `className?`

**Layout** — header (title + subtitle + "Create New Role") · table columns: Role (bordered primary pill, opens edit) · Role has access to (entity icon chips + "+N") · Total User · Created On · Status (Active=`--status-success` / Disabled=`--status-error`) · kebab (`DotsVertical` → Popover: Edit / Enable-Disable / Delete).

**States** — populated · empty ("No roles yet — create your first role."). Status is a data field, not a style.

## RoleSheet (create / edit wizard)
Right `Sheet`, 3 tabbed steps. `initial` (with `id`) → edit mode.

**Steps**
1. **Basic Details** — Role Name (`FloatingLabelInput`, required) + Role Description (`Textarea`). "Proceed" gated on name.
2. **Applications** — checkbox cards from `apps: RoleAppOption[]` (`{ id, name, icon?, entities? }`), entity pills per app.
3. **Privileges** — a matrix over `permissionAreas: PermissionArea[]`: a row-enable checkbox + Create/View/Edit/Delete cells; action cells disabled until the area is enabled. Final button = "Create Role" / "Save role" → `onSubmit(RoleDraft)`.

**RoleDraft** — `{ name, description, appIds, privileges: Record<areaId, {enabled,create,view,edit,delete}> }`.

**A11y** — step tabs are `role="tab"`/`aria-selected`; privilege cells are `role="checkbox"`/`aria-checked` with an `aria-label`; disabled action cells are non-interactive; every control has a focus-visible ring.

## Acceptance
- List matches `2:2480`; wizard steps match `2:2618`/`2:3125`/`2:2818` (parity-verified via `shoot.mjs`).
- Gates green (coherence · smoke · a11y · build). Colours from tokens; no raw hex in chrome.
- Wired at `blocks/settings` "Roles Management" `render`; appears in the live AppShell (Smart Cities settings).
- **Edit round-trip**: `RoleRow` carries `description`/`appIds`/`privileges` (optional) so editing a role pre-populates all 3 wizard steps with its current values — not just `name`. Editing with no changes preserves the existing `access`/`privileges`/`description` (no silent data loss on save).
