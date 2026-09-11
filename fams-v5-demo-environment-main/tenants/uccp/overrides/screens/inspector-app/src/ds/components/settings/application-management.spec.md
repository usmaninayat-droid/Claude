# Application Management — contract

Settings › Application Management. Figma: `2:437` (list) · `2:633`/`2:868`/`2:107`/`2:1141`/`2:1462` (create wizard).

## ApplicationManagement (`application-management.tsx`)
Responsive card grid of the org's applications. Config-driven, token-only.

**Props** — `apps: AppCard[]` (`{ id, name, description?, icon?, tags? }`) · `onCreateApp?()` · `onOpenApp?(app)` · `maxTags?` (default 5) · `title?` · `subtitle?`.

**Layout** — header (title + subtitle + "Create New Application") · `grid lg:grid-cols-2`; each card = tinted icon square + name + description + module/entity pills (+N more) + a hover/focus ↗ open. Empty state when `apps=[]`.

## AppSheet (`app-sheet.tsx`) — create / edit wizard
Right sheet, **4 steps** on the shared `StepWizardSheet`. `initial` (with `id`) → edit.
1. **Basic Details** — Application Name (required) + Description.
2. **Modules** — `SelectableCard` per module; a **selected** module expands to *Configure your module*: a **feature multi-select** (popover → chips) + **Custom Name** input.
3. **Sub-Organizations** — checkbox rows (org · active users · Active/Inactive · date).
4. **User Roles** — `SelectableCard` per role (icon + entity pills) → "Create Application".

**AppDraft** — `{ name, description, modules: Record<id,{enabled,featureIds,customName}>, subOrgIds, roleIds }`.

## Shared shells (reused, not rebuilt)
- **StepWizardSheet** (`step-wizard-sheet.tsx`) — the wizard chrome (header · clickable step tabs `role=tab` · scrollable body · Back/Proceed footer, final step submits). Each step supplies `render` + `canProceed`. **RoleSheet and AppSheet both use it** — no flow re-implements wizard chrome.
- **SelectableCard** (`selectable-card.tsx`) — checkbox option card (checkbox + icon + title + description/pills) with an optional expand slot (the AppSheet module config). Used across role/app/module/entity selection.

## Acceptance
- List matches `2:437`; wizard steps + the module-expand config match their frames (parity-verified via `shoot.mjs`; RoleSheet re-verified after refactor — no regression).
- Gates green (coherence · smoke · a11y · build); token-only; access model per decisions.md (Settings are role/privilege + org-scope gated). Wired at `blocks/settings`; live in Smart Cities.
- **Step gating is intentional**: only Basic Details (`name`) gates submission. Modules / Sub-Organizations / User Roles are optional by design — an application can be created with none selected and configured later. Don't add hard "must pick ≥1" gating without a product decision.
