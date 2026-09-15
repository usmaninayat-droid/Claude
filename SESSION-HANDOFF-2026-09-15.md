# Session handoff — IWMP demo work (2026-09-15)

Read this first, then continue. Everything below is **working-tree only — nothing committed this session** (in either repo). Two repos are involved:

- **Demo:** `fams-v5-demo-environment-main/` (blueprints, seeds, bespoke screens, wiring)
- **Design system:** `fams-design-system-main/` (React components; demo consumes it in **link mode**, so a `pnpm --filter <pkg> build` there is picked up on reload)

## How to run

```bash
cd fams-v5-demo-environment-main && pnpm --filter app dev    # → http://localhost:6300
```
Or the harness preview `fams-v5-demo`. If the browser can't connect, the dev server died — just restart it. After any blueprint/seed change: `pnpm demo resolve iwmp && pnpm demo check` (must stay green; there are 4 pre-existing INERT seed-integrity warnings that are expected).

Tenant is `iwmp`. Reach modules at `http://localhost:6300/<module>?tenant=iwmp` (e.g. `/contract-management`, `/deployment-dashboard`, `/training`, `/shift-rostering`).

---

## ⚠️ Uncommitted DS changes (important)

The design system is on branch **`main`** with **uncommitted edits**, already rebuilt so the demo shows them. Per `fams-design-system-main/CLAUDE.md` the proper flow is a branch off `design-master` + `node scripts/release-version.mjs patch --publish` for registry-mode consumers. The demo is link mode, so it works locally without the release, but **the DS changes are not committed/branched/released** — that decision is the user's.

DS files changed this session:
1. `packages/v5-templates/src/views/dashboard-widget-shell.tsx` — `resolveWidgetIcon` now falls back to the full DS icon registry (`getIcon`) when a name isn't in the small curated `WIDGET_ICONS` map, so any DS glyph a blueprint names renders (fixed blank KPI icons on dashboards).
2. `packages/v5-templates/src/views/ModuleViewFilters.tsx` — inline filter chips (`inline-filter-trigger`) now render the blueprint's `facet.icon` as a leading icon. Added `Icon` to the `@fams/ui-kit/icons` import.
3. `packages/v5-composer/src/fields/registry.tsx` — registered `'TextView' → ReadText` in `componentRegistry` (named-component overrides), so a column placing `component:{name:"TextView"}` renders plain text even for a `SingleSelect` (previously fell back to the enum Badge silently).
4. `packages/v5-templates/src/views/ModuleView.tsx` — added a `uiConfig.listGroupBy` gate (mirrors `listSort`) that hides the Group By toolbar control.
5. `packages/v5-composer/src/types.ts`, `packages/v5-composer/src/blueprint-schema.ts`, `packages/v5-composer/schemas/EntityModuleConfig.schema.json` — added the `listGroupBy?: boolean` uiConfig field.

Rebuilt: `@fams/v5-composer` and `@fams/v5-templates`. If you edit either again, rebuild that package.

---

## What was built / changed this session

### 1. Contract Management module (NEW — IWMP tenant-native, biggest piece)
Matches Figma "Tadweer — June Release", file `lXBH6N7ZpHfBuY60tH71TD`, node `3215-4609` (list + 10-step create wizard) and node `2303-2988` (detail dashboard). It's a **bespoke static screen** (like shift-rostering), iframe-embedded.

- Screen: `fams-v5-demo-environment-main/app/public/screens/contract-management/index.html` — one file: List (card grid + 5 KPI tiles + search/filter + Create) · full-screen **Create wizard** (vertical stepper: Basic Info · Zone map · Add Vehicles/Equipment/Workforce/Bins pickers→config cards · Service & Frequency · KPI Targets with Fixed/Yearly/Manual + 5-year preview bars · Attachments · Summary→Create) · **Detail dashboard** (compliance gauge + 6 KPI tiles + contractor + 8 Chart.js widgets, click a card to open).
- Blueprint: `tenants/iwmp/modules/contract-management/blueprint.json` (minimal, iframe-swapped).
- Wiring: `tenants/iwmp/tenant.json` (module licensed + first in app rail), `app/src/demo/seams.tsx` (iframe swap + rail icon `file-05`), `app/src/demo/model.ts` (privileges), `app/src/demo/contract-management-module.tsx`.
- **DS token symlink (untracked, required):** `app/public/fams-design-system → ../../fams-design-system-main` — the screen loads `/fams-design-system/packages/tokens/...`. If tokens look unstyled, this symlink is missing; recreate with `ln -sfn ../../fams-design-system-main fams-design-system` from `app/public/`.
- Styling aligned to DS tokens (radius-md cards, IdChip/StatusPill chips, DS shadows, KpiTile-like tiles).
- Design-reviewed against the Figma frames (saved under the session scratchpad `cm/`); high/med findings applied.

### 2. Project Management module (earlier — IWMP composer entity module)
From `IWMP-BRD-PMM-V02 (1).pdf` (Downloads). Composer blueprint with a wizard creation via `uiConfig.creation` (layout wizard, stepper, sections). Files: `tenants/iwmp/modules/project-management/blueprint.json`, `tenants/iwmp/seeds/project-management.seed.json`, plus tenant.json/model.ts registration. Parked per user ("leave it for now").

### 3. Shift Rostering (bespoke screen) — many enhancements
File: `tenants/iwmp/overrides/screens/shift-rostering/public/screens/shift-rostering/shift-rostering.html` (served via a vite middleware in `app/vite.config.ts`, single server — no more :6395).
- **Supervisor/Inspector cards** render differently from drivers: no route/vehicle/plan; show **"Sector X, Lot N"** (sector letter A–E + lot number) on top, shift below (Figma node 6824-11666).
- **Cell popover** for field roles: title = area, separate **Sector** and **Lot** rows, no Duty row; added a grey **Edit pencil** icon left of the close X (`fig/edit-02.svg`, hardcoded `#667085`); **Suggest Replacement** shows only when there's a conflict.
- **Edit** opens an "Edit Assignment" side sheet — all popup fields as DS-style dropdowns (Workforce/Vehicle/Plan editable; Sector/Lot **Locked**/disabled). Field roles: Workforce editable, Sector+Lot locked.
- **Replace Manually** panel role-adapted (no "driver" wording for supervisors/inspectors; role-aware id prefix D/H/S/I, "Search inspector", area header; candidates come from the matching role only).
- More **inspectors** added; licence/training/vehicle/retired-route conflicts **guarded** for field roles (they cover an area, not a vehicle) — rest/shift/leave/status conflicts still apply.
- Resolve-Route-Coverage drawer widened **700→880px** so the 4 KPI cards fit.
- **KPI cards** aligned to the DS `KpiTile` spec (radius-md, 40px tinted circular IconBadge, text-caption label, text-h4 value).

### 4. Deployment Dashboard (composer `kind: dashboard` module)
File: `tenants/iwmp/modules/deployment-dashboard/blueprint.json`.
- **KPI icons fixed** — was blank for `user`/`hard-hat`/`calendar`; fixed via the DS `resolveWidgetIcon` registry fallback (#1 above) and `hard-hat → briefcase` in the blueprint.
- **Widget variety** — reworked from 5 look-alike bars to: `compliance-gauge` (Deployment Compliance) · `donut` (Duty Mix) · `donut` (Deployment by Project) · `stacked-bar` (**Workforce Readiness** — segmented status bar, adapted from the Operations Center frame, node 2227-76367) · horizontal `bar` (Headcount) · `area` (Daily Deployment Trend) · grouped `bar` ×2 · `sparkline-table`. Data grounded in the existing manpower figures.

### 5. Training Management (composer module) — the last thing done
File: `tenants/iwmp/modules/training/blueprint.json`.
- **Filter chips have icons** now: Category `tag`, Licence Class Required `car`, Status `status` (DS render change #2 + blueprint `filters[].icon`).
- **Category & Licence columns → plain text** (were secondary Badges): the blueprint already set `component:{name:"TextView"}`; the DS `TextView` override (#3) makes it honored.
- **Group By control removed** via `uiConfig.listGroupBy: false` (DS gate #4). Sort was already off (`listSort: false`).

---

## Git state / caveats
- Demo repo `main` is 1 commit ahead of origin (an earlier cherry-picked "Monday" commit bringing attendance + deployment-dashboard). Everything from THIS session is uncommitted working-tree.
- A stash `in-progress-attendance-adhoc-2026-09-15` exists (superseded ad-hoc work; harmless).
- Branch `record-table-summary-tiles` is preserved (user said don't delete).
- Nothing has been committed or pushed this session in either repo. The user has not asked to commit.

## Reasonable next steps (not yet done)
- Decide whether to commit: DS changes on a proper `design-master` branch (+ release for registry consumers), and the demo working-tree changes.
- Contract Management: optional polish (real map imagery in the zone step; custom empty-state illustrations vs the FontAwesome placeholders; end-date field icon nuance).
- Confirm the `app/public/fams-design-system` symlink survives / is intended (untracked).
