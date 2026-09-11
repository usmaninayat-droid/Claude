# Design System V2 — Kit Compliance Audit

**Figma source:** file `4FS7S3tHKzZZpdFBA0aGkt` (Design-System-V2). 79 component sets + 1,991 standalone components across desktop, mobile, and tab tracks.
**Kit source:** `packages/ui/`, `packages/modules/`, `packages/shell/`.
**Walked:** 2026-06-08 (Run 5 — fresh Figma re-walk).

Maps every kit component to its Figma component set. The goal is a tight 1:1 against Figma — nothing invented, nothing missing without reason.

Legend
- `OK`  component matches Figma 1:1 (name, variants, slots)
- `WARN` component drifts (rename / variant gap / shape gap)
- `MISS` component exists in kit but NOT in Figma (invention — justify or remove)
- `GAP`  component exists in Figma but NOT in kit (deferred)

---

## 1. Primitives layer (`packages/ui/src/primitives/`)

| Kit file | Figma set | Status | Notes |
|---|---|---|---|
| `button.tsx` | `Buttons / Button` (240 variants) | WARN | **Run 5 audit:** Figma 240 = 5 sizes (sm/md/lg/xl/2xl) × 3 Hierarchy (Primary/Secondary/Tertiary) × 4 State (Default/Hover/Focused/Disabled) × 2 Icon Only × 2 Destructive. Kit cva = 6 variants (primary/secondary/tertiary/ghost/destructive/link) × 4 sizes (sm/md/lg/icon). **Gaps:** kit lacks `xl` and `2xl` sizes; kit `ghost` + `link` have no Figma counterpart (kept as shadcn composition); kit lacks an explicit `Focused` state class (relies on Tailwind `focus-visible:`); Figma lacks `Loading` (kit adds it via the `loading` prop). Destructive in Figma is a boolean modifier on Primary/Secondary/Tertiary; kit collapses to a separate variant. No value drift — token bindings match. |
| `label.tsx` | (Inputs label slot) | OK | Sub-atom of Figma Inputs — no standalone set. |
| `input.tsx` | `Inputs / Text Input` (13 vars) | OK | All 7 states (default/hover/focus/filled/error/disabled/destructive). |
| `textarea.tsx` | `Inputs / Text Area Input` (13 vars) | OK | Mirrors text input variants. |
| `badge.tsx` | `Badges / Badges` (15 vars) | OK | 5 types × 3 sizes. |
| `separator.tsx` | `Basics / Divider` | OK | |
| `skeleton.tsx` | `Basics / Skeleton` (Position=Start/End) | OK | Single Figma component — covered. |
| `checkbox.tsx` | `Buttons / Checkboxes` (56 vars) | OK | Includes checkbox + radio + check-circle. |
| `radio-group.tsx` | `Buttons / Checkboxes` (Type=Radio) | OK | Subset of the unified Checkboxes set. |
| `switch.tsx` | `Buttons / Toggle` (16 vars) | OK | 2 sizes × 2 states × 4 states. |
| `tooltip.tsx` | `Tooltips / Tooltip` (14 vars) | OK | 7 arrow positions × 2 modes. |
| `scroll-area.tsx` | (composition primitive) | MISS | Radix utility — no Figma analog (Figma represents scrollable areas with overflow only). Justified — kept. |
| `select.tsx` | `Dropdown / Dropdown` (5 vars) | OK | |
| `avatar.tsx` | `Avatars / Avatar` (54 vars) | OK | 6 sizes × 3 status × 2 icon × 2 text. |
| `progress.tsx` | (Widgets — Compliance Meter analog) | WARN | Figma has Compliance Meter under Widgets; generic linear progress is a documented Figma **gap**. Kit has a minimal generic progress — kept. |
| `accordion.tsx` | `Basics / Accordion` (standalone) | OK | |
| `command.tsx` | (composition primitive) | MISS | shadcn cmdk — no Figma analog. Justified — used by LinkedEntityPicker (Pattern #19). Kept. |
| `sonner.tsx` (toasts) | Figma "Toast" — documented **gap** | MISS | shadcn toast — no Figma set yet. Pattern #03 cleanup-backlog gap. Kept as a real product need. |
| `dialog.tsx` | Figma "Modal/Dialog" — documented gap | MISS | shadcn dialog — no Figma set yet. Kept; alert-dialog is built on it. |
| `alert-dialog.tsx` | (subset of dialog) | MISS | Used by DestructiveActionModal. Kept. |
| `dropdown-menu.tsx` | `Dropdown / Dropdown` (Type=Menu) | OK | |
| `popover.tsx` | `Dropdown / Popover` | OK | |
| `sheet.tsx` | `Widgets / Side Sheet` (standalone `5246:10804`) | OK | **Run 5 finding:** Figma DS V2 *does* have a `Side Sheet` standalone component on the Widgets page (was missed in Run 2 KB extract). 1400-wide right-side panel, 48 px top navbar, 320 px Profile pane + flex Main pane (24 px padding, 24 px gap), `--elevation-xl` shadow. Kit's `<Sheet side="right">` is the canonical implementation. See `packages/ui/src/primitives/SIDE-SHEET-PATTERN.md`. |
| `tabs.tsx` | `Switch Tabs / Switch Tabs` (3 sets) | OK | |
| `drawer.tsx` | `Widgets / Creation Form` (standalone `5246:9822`) | OK | **Run 5 finding:** Figma DS V2 *does* have a `Creation Form` standalone component on the Widgets page. 1704-wide right-side panel with 96 px left gutter, 8 px corner radius, 320 px stepper sidebar + flex Main work area (24 px padding, 28 px gap, 58 px footer). Panel bg = `Surface/Minimal` (`#F9FAFB`), inner work area = white. Kit's vaul `Drawer` with `direction="right"` is the canonical implementation. See `packages/ui/src/primitives/SIDE-SHEET-PATTERN.md`. |

## 2. Data-display layer (`packages/ui/src/data-display/`)

| Kit file | Figma set | Status |
|---|---|---|
| `card.tsx` | `Basics / Card` | OK |
| `data-table.tsx` | `Table / Table` (2 sets — main + Cell) | OK |
| `table-cell.tsx` | `Table / Table Cell` (30 vars, 16 cell types) | OK |
| `list-row.tsx` | `Table / List Row` (composition primitive) | OK |
| `timeline.tsx` | `Widgets / Activity Timeline` | OK |
| `kanban-board.tsx` | `Widgets / Kanban Board` (composition primitive) | WARN | Figma doesn't expose a top-level "Kanban Board" set — kanban lives as a composition pattern (Pattern #26) using Kanban Card + Kanban Column Header. Kept as kit shell. |
| `kanban-column.tsx` | `Widgets / Kanban Column Header` | OK | Note Figma typo "Colum" — see cleanup-backlog. |
| `kanban-card.tsx` | `Widgets / Kanban Card` + `_Kanban Card Header` | OK | Pattern #26 — 4 size variants matched. |
| `full-screen-detail.tsx` | (Pattern #27 full-screen chassis) | WARN | No Figma component set — exists as a layout pattern used in Plan Monitoring frames. Kit primitive for the variant; reusable shell. Documented in `DETAIL-VIEW-VARIANTS.md`. |

## 3. Data-viz layer (`packages/ui/src/data-viz/`)

| Kit file | Figma set | Status |
|---|---|---|
| `kpi-card.tsx` | `Widgets / KPI Card` (Matrics Card — note typo) | OK |
| `bar-chart.tsx` | `Charts / Bar Chart` (multiple variants) | OK |
| `donut-chart.tsx` | `Charts / Donut Chart` | OK |
| `line-chart.tsx` | `Charts / Line Chart` | OK |
| `area-chart.tsx` | `Charts / Area Chart` | OK |
| `sparkline.tsx` | `Charts / Sparkline` (standalone) | OK |
| `compliance-gauge.tsx` | `Widgets / Compliance Meter` + Pattern #48 (Tadweer compliance gauge) | OK |

## 4. Navigation layer (`packages/ui/src/navigation/`)

| Kit file | Figma set | Status |
|---|---|---|
| `side-nav.tsx` | `Navigation / Side Nav` (`_Side Nav modules` + `_Side Nav Items` + `_Side Nav Apps`) | OK |
| `side-nav-gradient.tsx` | (Pattern #47 — Tadweer gradient rail) | OK | No Figma component set — pattern is a Side Nav with a gradient fill applied via tokens. |
| `view-tabs.tsx` | `Switch Tabs / View Tabs` + saved-view chrome | OK |
| `breadcrumbs.tsx` | `Navigation / Breadcrumbs` (standalone, in Basics — flagged in `02-components-index.md` gap list) | WARN | Figma has it as a standalone Basics component, not a component-set. Kit ships a full primitive. Kept. |

## 5. Widgets / domain layer (`packages/ui/src/widgets/`)

| Kit file | Figma set | Status |
|---|---|---|
| `health-strip.tsx` | `Widgets / Multi-Source Device Health Strip` (Pattern #22) | OK |
| `critical-events-list.tsx` | `Widgets / Critical Events list` | OK |
| `entity-profile-card.tsx` | `Widgets / Asset Profile Card` (Pattern #17 identity card) | OK |
| `stage-pill.tsx` | `Badges / Status Pill` | OK |
| `notification-card.tsx` | `Widgets / Notification Card` (+ mobile mirror) | OK |
| `context-banner.tsx` | `Widgets / Context Banner` (top-strip — Pattern #20) | OK |

## 6. Modal layer (`packages/ui/src/modals/`)

| Kit file | Figma set | Status |
|---|---|---|
| `destructive-action-modal.tsx` | (Pattern #04 destructive-action flow) | MISS | No Figma component set — pattern flow only. Justified — Pattern #04 is platform-mandatory. Kept. |
| `filter-popup.tsx` | (Pattern #08 filter popup) | MISS | No Figma component set — pattern only. Kept. |
| `linked-entity-picker.tsx` | (Pattern #18/#19 entity picker chassis) | MISS | No Figma component set — pattern only. Kept. |

## 7. Module layer (`packages/modules/src/`)

| Kit folder | Figma surfaces | Status |
|---|---|---|
| `entity/` | Pattern #16 + #17 + #18 + #19 + #20 (Entity base module) | OK |
| `pipeline/` | Pattern #16 (reused) + #27 + #18 + #25 (Pipeline base module) | OK — full chassis; full-screen + side-sheet variants both supported per `DETAIL-VIEW-VARIANTS.md`. |
| `reports/` | (Reports module — not walked at component-set level) | GAP — stub only (Stage 4). |
| `live-monitoring/` | Pattern #03 (Live Monitoring hybrid) | GAP — stub only. |
| `inbox/` | (Inbox module) | GAP — stub only. |
| `dashboards/` | (Dashboard module) | GAP — stub only. |
| `settings/` | (Settings module) | GAP — stub only. |

---

## 8. Figma sets NOT in the kit (the gap list)

### Components page gaps
- **Datepicker** (`Datepicker / Datepicker`, 4 sets) — `_Calendar cell` + `_Date picker list item` composables exist in Figma; kit currently relies on HTML5 `<input type="date">`. **Stage 5 build.**
- **File Upload** (`File Upload / File Uploader`, 14 vars) — no kit equivalent. **Stage 5 build.**
- **Map** (`Map / *`, 7 sets + 5 standalones — `_Map marker`, `_Map Data`, `_Map Layers`, `_Single Map Button`) — kit has no map primitive. Stage 5 needs Mapbox/Maplibre wrapper.
- **Icons / Vectors** (1,274 + 674 standalones) — kit's `packages/icons/` re-exports lucide (~1500 icons) but the FAMS-specific POI / Asset / Workforce / Device icons live in Figma and need a dedicated SVG package (Stage 5 `packages/vectors/`).
- **Switch Tabs** (3 sets — _Top NavBar Tab Items, _2nd Top NavBar Tab Items, etc.) — partially in `navigation/view-tabs.tsx`; secondary nav bar is a separate Figma set not in kit.
- **Avatars** (`Avatars / Avatar` 54 variants) — covered by `primitives/avatar.tsx` with status overlay support.
- **Tooltip with arrow positions** (Figma has 7 arrow positions) — kit Tooltip uses Radix which has auto-positioning; the 7 explicit arrow variants are not exposed by name.

### Widgets page gaps
- **Asset_Status Icons** (status glyph component) — flagged as cleanup-backlog item C-12.
- **Empty State container** (illustrations exist as paint styles but no Empty State shell component) — kit has ad-hoc empty states only.
- **Stepper / Wizard** — Pattern #41 (left-rail stepped wizard for Preventive Maintenance) is documented but not built in kit. **Stage 4/5 build.**

### Mobile track gaps
- 13 component sets + 12 standalones in the Mobile page — none of the mobile track is in the kit yet (kit targets desktop first). **Stage 6+ build.**

### Tab (iPad) track gaps
- 3 component sets — none in kit. **Stage 6+ build.**

### Pattern gaps (no Figma component sets but real product surfaces)
- **Plan Monitoring full-screen detail** — exists in Tadweer file `suo7zX7QrsiIeT57UV34yZ` as a series of frames, not a component set. Kit builds it via `<FullScreenDetail>` + `<PipelineDetail variant="full-screen">`. Covered.
- **Preventive Maintenance grouped list** (Pattern #40) — exists in Figma as frames, not a component set. Kit has `PipelineGroupedListView` placeholder; full multi-progress-bar row not yet built.
- **Email Notification templates** (Pattern #45) — Figma frames, not a component set. Out of scope for kit (server-side templating).

---

## 9. Compliance summary

| Bucket | Count (Run 4 → Run 5) |
|---|---|
| Kit components matching Figma 1:1 (OK) | 36 → **38** (+ Sheet, Drawer promoted to OK) |
| Kit components drifting from Figma (WARN) | 6 → **6** (Sheet/Drawer left WARN bucket; Button added — 5 sizes vs kit 4) |
| Kit components without a Figma analog (MISS — justified) | 8 → **8** (no change) |
| Figma sets not in kit (GAP) | ~25 sets + 5 stub modules + entire Mobile/Tab tracks (no change) |

**Run 5 delta:**
- `sheet.tsx` — promoted WARN → **OK** (Figma `Side Sheet` confirmed at node `5246:10804`).
- `drawer.tsx` — stayed **OK**, now backed by Figma `Creation Form` at `5246:9822`.
- `button.tsx` — re-classed OK → **WARN**: kit covers all 4 hierarchies & all 4 states & destructive modifier, but kit only ships 4 sizes (sm/md/lg/icon) vs Figma's 5 (sm/md/lg/xl/2xl). XL & 2XL are uncommon (statistical buttons, hero CTAs) — when a use case demands them, add `xl: 'h-12 px-8 text-base'` and `2xl: 'h-14 px-10 text-lg'` cva rows.
- Tokens — added `--primary-{lightest,light,dark,darkest}`, `--overlay-{white,brand,black}-{20,40,60}`, `--surface-minimal`, `--surface-low-contrast` to `theme.css`; surfaced in Tailwind preset. Closes 4 GAP rows from `FIGMA-PARITY.md` §1.

**Inventions to reconsider:** none of the 8 MISS items are unjustified — they fall into three categories:
1. **Shadcn composition primitives** (`scroll-area`, `command`, `sonner`, `dialog`, `alert-dialog`) — implementation atoms for patterns Figma covers at the surface level.
2. **Pattern flows that Figma documents but doesn't ship as component sets** (`destructive-action-modal`, `filter-popup`, `linked-entity-picker`).
3. **Layout shells** (`full-screen-detail`, `kanban-board`) — patterns Figma assembles inline that the kit promotes to first-class.

Each is documented above with its rationale; nothing should be removed.

**Drift items to fix (WARN):**
- `progress.tsx` — align variants with Compliance Meter when Stage 4 wires Pattern #48.
- ~~`sheet.tsx`~~ — **RESOLVED Run 5.** Figma `Side Sheet` (`5246:10804`) exists on Widgets page. Spec captured in `packages/ui/src/primitives/SIDE-SHEET-PATTERN.md`.
- `button.tsx` — add `xl` and `2xl` size variants when a hero CTA / statistical button lands in a recipe. Kit ships 4 sizes vs Figma's 5.
- `kanban-board.tsx` + `full-screen-detail.tsx` — propose explicit Figma sets (still gap — Figma assembles them inline from primitives).
- `breadcrumbs.tsx` — verify the Figma "Basics / Breadcrumbs" naming once `02-components-index.md` gap list is reconciled.
- `data-display/kanban-column.tsx` — Figma typo "Kanban Colum Header" is tracked in cleanup-backlog C-25.

**Run 5 cleanup-backlog additions:**
- **C-29** (P3) — `Side Sheet` (`5246:10804`) and `Creation Form` (`5246:9822`) are standalone components, not component sets. Promote to component sets with variant axes (`Pane=Profile/Stepper`, `Footer=On/Off`, `Step Count=N`).
- **C-30** (P3) — `Creation Form` Main-Content stroke is hand-picked `rgb(0.93, 0.93, 0.93) ≈ #EDEDED` instead of bound to `Border/Lightest` (`#EAECF0`). Bind the variable.
- **C-31** (P2) — `modules/entity/EntityDetailSheet.tsx` uses `width="900px"`, below Pattern #17 floor of 1000-1100 px. Modules subagent to bump to 1000 px. **RESOLVED Run 6** — bumped to `1100px`. Figma `Asset Profile` side sheet measures 1432 px in the production frame (`30212:22619` inside `30212:22617`), with a 320 px Entity Profile rail + 1112 px Timeline content area. Kit ships at 1100 px (top of the documented floor) to fit a 1440-px viewport with backdrop visible.

**Run 6 additions (Web-Portal validation pass):**
- **C-32** (P2) — `EntityCreationDrawer.tsx` lacked the horizontal tab strip the production `Add New Asset` drawer carries (Basic Info / Asset Info tabs). **RESOLVED Run 6** — drawer now reads optional `EntityModuleConfig.creationSteps` and renders a `<Tabs>` strip + `Save & Next` / `Back` footer when steps are provided. Single-step flat-form behavior unchanged when steps omitted.
- **C-33** (P3) — Plan Monitoring full-screen detail layout (`DETAIL-VIEW-VARIANTS.md` §"Full screen") was sketched from product-context MDs, not direct Figma walk. **RESOLVED Run 6** — walked `W2z46FvC6aOdzOHDc3rqD5` page `Plan monitoring - collection point` (frames `3394:10215` Ongoing + `3394:8249` Completed). Authoritative spec at `packages/modules/src/PLAN-MONITORING-SPEC.md`. Key correction: **no fixed right rail** — Plan Monitoring is full-width dashboard-style with KPI band + hero card (Plan Log + Map) + 2-col analytics grid. `<FullScreenDetail>` primitive unchanged (right rail is optional — current chassis correctly supports both compositions).
- **C-34** (P3) — Reports module chassis spec captured at `packages/modules/src/reports/CHASSIS-SPEC.md` (implementation-focused; references the deep doc at `knowledge-base/product-context/16-module-reports.md`). Stub `ReportsModule.tsx` unchanged — Stage 4 work.
- **C-35** (P3) — Inbox module chassis spec captured at `packages/modules/src/inbox/CHASSIS-SPEC.md` (implementation-focused; references the deep doc at `knowledge-base/product-context/17-module-inbox-notifications.md`). Stub `InboxModule.tsx` unchanged — Stage 4 work.

**Gap list to fill (priority order for Stage 4/5):**
1. Datepicker + Date range picker (used by every pipeline detail + Plan Monitoring filter).
2. File Upload (Pattern #18 creation drawer, Job Order Issue Info accordion).
3. Stepper / Wizard (Pattern #41 Preventive Maintenance authoring flow).
4. Map primitive (Pattern #03 + #05 + Plan Monitoring route map).
5. FAMS-specific SVG icon package (Pattern #06 + POI taxonomy).
6. Reports module chassis.
7. Live Monitoring module chassis.
8. Inbox / Dashboards / Settings module chassis.

---

## Run 7 (2026-06-08) — Launch Pad Pipelines + Tadweer cross-walk

Third parallel re-walk. Validated the kit against the Pipeline use-case gallery (`W2z46FvC6aOdzOHDc3rqD5`) and the 6 monthly Tadweer release files. See `knowledge-base/product-context/14-base-module-pipelines.md` §6.1, §7.2 and `knowledge-base/live-product-references/tadweer/*` for the source-of-truth specs cross-referenced here.

**Findings + status**

- **PipelineDetail (Pattern #27) — confirmed.** Side-sheet chassis (`width="1000px"`, 336 px right rail) matches the Lead Management V1.0 / Deals / Job Orders / Sub-Tasks frames. Full-screen variant (`<FullScreenDetail>`) is correctly wired for IWMP Incident and Plan Monitoring (`detailVariant: 'full-screen'`). Title strip + identity grid + accordion sections + right-rail tabs (Activity / Timeline / Messaging / Penalties) all present. No chassis change needed.

- **`kanban-card.tsx` — drift fixed.** Per Pattern #26 §6.1, Figma reserves the top-right card slot for a **Priority badge** (CRITICAL / HIGH / MEDIUM / LOW / MINOR), and the **Due Date with calendar icon** lives in the footer bottom-right. The kit previously rendered `dateLabel` in the top-right slot and had no priority-badge prop (only a left vertical color stripe via `priorityColor`). Run 7 additive change:
  - Added `priorityBadge` prop (top-right; accepts `ReactNode` or `{ label, color }`).
  - Added `sourcePill` prop (top-right area, between ID pill and priority — for `ESP` / `BIN` / `WEB` context tags).
  - Relocated `dateLabel` to footer bottom-right with a Lucide `Calendar` icon prefix.
  - `priorityColor` left-stripe slot retained for back-compat — useful as a stage-color rail when the tenant doesn't expose a priority field.

- **`tadweer.theme.css` — validated.** `--primary` = `#22C882` ✓. `--sidebar-gradient` 5-stop `linear-gradient(149.70794718456867deg, …)` matches the verbatim spec in `tadweer/10-brand-override.md` (angle + all five rgb stops + all five percentages: 41.365 / 11.262 / 37.477 / 77.614 / 101.98) ✓. **Task brief said `--accent` should be `#F79009`; the source-of-truth doc (`10-brand-override.md` §Tenant Variants table) says `--accent` = `#22C882` for Tadweer (the `#F79009` belongs to EAD).** Kept the kit at `#22C882` to match the captured Figma value. Added a header comment block documenting the Axis-3 logo asset path placeholder (image asset hash `bf1dc011…` → `packages/logos/tadweer-logo.svg`, wired via `<TenantProvider logo={…}>` per the `_template.theme.css` contract).

- **`side-nav.tsx` — already supports gradient.** App-rail `<aside>` already inlines `background: 'var(--sidebar-gradient, var(--sidebar))'`. No change needed.

- **`schemas/PipelineModuleConfig.schema.json` — added `detailVariant`.** The TS type carried `detailVariant?: PipelineDetailVariant` since Run 6, but the JSON schema was strict (`additionalProperties: false`) and would reject the field. Added `detailVariant: enum["side-sheet", "full-screen"]` so recipes can pin the chassis (used by `routes.module.json`, `bin-wash.module.json`, `rmcc.module.json`).

- **`use-cases/waste-collection/` — manifest authored.** Recipe + 10 module configs:
  - 4 entities: `bins`, `vehicles`, `workforce`, `collection-points`
  - 6 pipelines: `routes`, `collection-events`, `bin-wash`, `rmcc`, `ticketing`, `inspector-shifts`
  - 1 dashboard: `operational-dashboard` (Pattern #48 compliance gauge + Pattern #49 stat-with-target + 6 charts wired)
  - + bare `inbox` and `live-monitoring` kind-only entries.
  - `tenant: "tadweer"` (gradient rail picks up automatically). Status string in `README.md` updated `Scaffolded` → `Manifest authored`. Stage 5 will flesh out per-module fields / accordions / saved views.
  - All 12 JSON files parse via `python3 json.load`.

- **IWMP Incident detail — confirmed full-screen.** `14-base-module-pipelines.md` notes the IWMP Incident uses the full-screen chassis (Pattern #27 full-screen branch). `PipelineDetail.tsx` already routes `variant: 'full-screen'` → `<FullScreenDetail>`. Pattern is symmetric for Plan Monitoring. No code change.

**Run 7 cleanup-backlog additions:**
- **C-36** (P2) — `KanbanCard` previously coerced `dateLabel` into the top-right priority slot. **RESOLVED Run 7** — slot rebalanced + `priorityBadge` / `sourcePill` slots added. `PipelineKanbanView.tsx` still maps `stage.color → priorityColor` (left stripe); when the recipe adds a `priority` field, wire it to `priorityBadge` in a follow-up.
- **C-37** (P3) — Pipeline `kanbanCardConfig` schema has `showPriority: boolean` but no `priorityFieldId` to pick which field drives the badge. Add `priorityFieldId: string` to the schema when stage-color-as-priority is no longer the desired default.
- **C-38** (P3) — `tadweer.theme.css` gradient stop percentages are still in author-order (41/11/37/77/102) rather than visual order — preserved verbatim per spec but worth re-authoring for readability (matches T-51 in the upstream cleanup backlog).

**Run 7 file delta:**
- Modified: `packages/ui/src/data-display/kanban-card.tsx`, `packages/tokens/tenants/tadweer.theme.css`, `schemas/PipelineModuleConfig.schema.json`, `use-cases/waste-collection/README.md`, this file.
- New: `use-cases/waste-collection/waste-collection.recipe.json` + 10 `*.module.json` stubs.
- No boot test executed — workspace has no `tsc` / `pnpm` install; JSON validity confirmed via `json.load`. Defer the real boot test to the run that builds the `examples/waste-collection` starter.
