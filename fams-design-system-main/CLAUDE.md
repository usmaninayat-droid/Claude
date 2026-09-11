# FAMS Design System — engineering guardrails

> Constitution: see docs/knowledge-base/ — locked decisions, naming, architecture, tech stack.

Platform-wide, framework-agnostic design system for FAMS products (IWMP, FAMS, MM, EAD, …). This file is the contract for everyone who writes code here — AI agents and human contributors alike. It exists to keep the system coherent as many hands (much of it AI-authored) add components. Follow it exactly.

## Session zero — how the team shares this repo (before anything else)

Detail: [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md). These rules govern *who*
and *which branch*. They never relax the engineering guardrails below — those
are what actually protect this repo, and they are non-negotiable for everyone.

```
main                      what the demo repo and FAMS Desk consume
└── design-master         the design team's build
    └── status-pill-density          named for the change, not the package
```

**Everything here is shared.** One pill, one token, forty screens — plus FAMS
Desk, which vendors this repo as a subtree. That is why the hard rules below
exist and why only one branch runs at a time. It is not a permissions problem;
it's a blast-radius problem.

**At every session start, and whenever anyone says "sync":** run
`bash scripts/fams-sync.sh --force` **from this repo's root** (sessions often
start at the workspace root, where that path doesn't exist). It saves and backs
up the current branch and pulls nothing into it.

| The designer… | You |
|---|---|
| starts work | Name the branch for **the change**, not the folder — `status-pill-density`, `uccp-brand-refresh`. A real change crosses `tokens` + `ui-kit` + `v5-templates`, so no package name is honest. Can't name it from their message? Ask **once** with `AskUserQuestion`: what should change, and on which screen. Branch off `design-master`. |
| stops, switches, or says "done" | **Ask**: is this finished, or still in progress? Finished → `bash scripts/fams-done.sh`. Not yet → `bash scripts/fams-sync.sh --force`. Never assume. |
| mentions fields, screens, data, labels, tenants' content | Different repo → `../fams-v5-demo-environment`. |

**No pull requests, no code review.** `fams-done.sh` runs the repo's own checks
before folding anything into `design-master` — that's the check. The judgement
call is a human looking at the running build before it is promoted to `main`.

**`/figma-parity-loop` edits this repo directly, by design**, on its own
`cycle/<date>-<slug>` branch with its own workflow. It branches off
**`design-master`, never `main`**. Follow the skill; don't apply the table above
to it.

**Rules**

1. **Never commit to `main` or `design-master`.** If you're on one, branch first.
2. **"You" is `git config user.name`.** Read it before applying any who-has-what rule; never guess.
3. **One unfinished branch in this repo at a time** — counting only branches not merged into `design-master`. Two branches editing `tokens/core.tokens.json` is the most expensive collision this workspace can produce.
4. **One change per branch.** Crossing packages is one change; two unrelated things are two branches.
5. **No claim files.** Git already knows who and when.
6. **Nothing merges without being asked.** `fams-done.sh` is the only thing that writes to `design-master`.

## Request routing — start here

Designers with no code knowledge prompt in this repo. Route their request before reading further; the skills carry the step-by-step detail (loaded on demand via the Skill tool):

| The request sounds like | Do this |
|---|---|
| Change how something looks (rounder buttons, more spacing, colors, fonts) | skill **styling-change** — decides token vs component edit; a scoped change does NOT trigger the full new-component DoD |
| A new component / widget / visual element | skill **new-component** — layer cascade + full Definition of done |
| One tenant's brand (logo, colors, font) | skill **tenant-branding** — `packages/tokens/tokens/tenants/<t>.tokens.json`, never a component fork |
| Fields, screens, data, labels in the demo | Wrong repo — that is `../fams-v5-demo-environment` (blueprints/deltas/seeds). Only the *components* those screens use live here. |
| Match a Figma design (Figma URL pasted, or "/figma-parity-loop" arrives as an unknown command) | skill **figma-parity-loop** — self-healing: if not installed at the workspace root, run `scripts/setup-workspace.sh` first, then proceed; the run itself is ALWAYS dispatched to a background subagent |
| "Is it working?" / preview | showcase: `pnpm --filter @fams/showcase dev` → `:6100` |

After any change consumed by the demo environment: rebuild (`pnpm --filter <package> build`) — it links against this repo's `dist/`.

## Hard rules (non-negotiable)
1. **Open-source dependencies only.** Every code dependency MIT / Apache-2.0 / BSD. No paid tiers, per-seat, or mandatory SaaS. (Rejected: AG Grid Enterprise, Highcharts, Mapbox GL, SheetJS Pro, marker.js, Fancybox, Dexie Cloud.) Licensed brand assets FAMS holds a licence for (e.g. the Gilroy web font) are permitted — this rule governs code dependencies, not brand assets.
2. **Tokens are the single source of truth.** NEVER hardcode hex / px / font values in a component. Use Tailwind utilities backed by `@fams/tokens` (`bg-primary`, `text-foreground`, `rounded-md`, `border-border`, …). A new visual value is a new token, not an inline value. Same for motion and stacking: use the semantic tokens (`duration-fast`/`duration-normal`/`duration-slow`, `ease-standard`/`ease-emphasized`/`ease-decelerate`/`ease-accelerate`, `z-dropdown` … `z-tooltip`) — never an ad-hoc transition duration or `z-index` value.
3. **TypeScript strict** everywhere. No `any`.
4. **RTL-safe always.** Logical properties only (`ms-`/`me-`/`ps-`/`pe-`, `text-start`) — never `ml-`/`mr-`/`text-left`. Arabic is a first-class locale.
5. **Accessibility is built-in, not added.** New primitives build on Base UI (`@base-ui/react`); date/time pickers (+ Tree) use React Aria instead (decision #7). Existing Radix-based components are grandfathered — migrate to Base UI/React Aria on touch, then remove the file from the eslint Radix allowlist; new `@radix-ui/*` imports are a lint error. Every interactive component passes axe.
6. **No per-tenant component forks.** One component; tenants differ only via tokens / `data-tenant` and the tenant config (logo/icon/brand). Never copy a component per tenant.
7. **No framework cross-imports.** The only shared layer is `@fams/tokens` (and pure TS utils). Vue track removed; production Vue lives in the v5 repo as read-only reference.
8. **State-agnostic presenters.** Components take data + callbacks via props — no data fetching, no global store (TanStack Query / Zustand / Pinia), no routing inside a component. That is the consuming app's layer. Render-optimized: memoizable, stable prop identities, virtualize large lists, patch high-frequency data instead of re-rendering.
9. **Layout owns spacing.** Spacing between components comes from layout primitives (Stack/FormGrid/FormSection/Toolbar) with semantic gap presets (`gap="field" | "section" | "inline"`) — never from margins in consumer code, never numeric gap values. Spacing inside a component comes from tokens.
10. **No business vocabulary in shared component props.** `options`, `columns`, `renderOption` — never `vehicleType`, `binStatus`, per-use-case boolean flags (`isVehiclePicker`). Variation goes through the three axes: behavior → props, content → render slots, data → app hooks. (Exception: the fleet-domain widget set `map/Vehicle*`.) Scope: this rule governs the core (`@fams/ui-kit`); in the tier-2 patterns package (`@fams/v5-templates`) product vocabulary is allowed — that's its purpose. **v5-specific patterns never enter the core** — membership per the 4-question cascade in `docs/BOUNDARIES.md`.
11. **Rule of three for admission.** A component enters the DS on its third real use (or second product). Generalize only the variation those uses demonstrated. Shells own chrome, slots own content; composition (tab sets, column sets) is app-side config, never DS code. **Demo-environment carve-out:** the demo environment may never host components (its CLAUDE.md rule zero), so a component it needs enters the DS immediately — `@fams/v5-templates` when v5-flavored, `@fams/ui-kit` per the cascade when product-agnostic — with the full DoD. The rule of three then governs *generalization and promotion into the core tier*, not whether the component may exist.
12. **~300 lines is the soft budget per component file.** Decompose (as `DataTable`/`TableCell` did — pulling out `DataTableColumnsMenu`/`DataTablePagination`/`DataTableSummaryRow`/`DataTableVirtualBody`/`TableCellRenderers`) when a file grows past it. **Ledger refreshed wholesale 2026-09-06 (fix8, closing the 2026-09-05 job-orders review's F1):** every number below is a fresh `wc -l` run that day, not carried forward from memory — round 1 and round 2 of that review both found the previous list stale (eleven drifted entries, plus one file still listed after it had already dropped under budget) and this replaces it in full. Re-check before adding to this list.

Accepted exceptions, verified by `wc -l` 2026-09-06: `DateRangePicker` (532, drifted up from 467 — decomposition still welcome on touch, not attempted this wave), `DataTable` (781, drifted up from 479 — the `TableCell`-family extraction already happened; the remainder is the toolbar plus virtualized body, splitting further would separate each from the state it reads), `ModuleRail` (398, drifted up from 345), `FilterPanel` (328, unchanged), `EntityPickerDrawer` (328, unchanged), `DemoConsole` (345, drifted up from 338, `packages/demo-kit/src/console/DemoConsole.tsx`), `SchemaForm` (462, drifted up from 380, `packages/v5-composer/src/fields/SchemaForm.tsx`), `EntityProfileShell` (317, unchanged, `packages/v5-templates/src/EntityProfileShell.tsx`), `ui-kit/src/shells/NavRail.tsx` (441, unchanged — split 2026-09-04, the switcher row moving to `NavRailParts`; the remainder is one interaction machine: modes/hover-intent/popovers), `v5-templates/src/creation-sheet/CreationSheet.tsx` (341, unchanged — the discard-guard state machine was extracted to `useDiscardGuard.tsx`; the remainder is three render shapes plus per-step validation), `v5-templates/src/creation-sheet/OnwaniLocationPickerWidget.tsx` (373, unchanged — already decomposed twice; the remainder is one interaction machine, the Onwani/free-text toggle and two-way text⇄pin sync), `v5-templates/src/renderers/v5-module-renderers.tsx` (1155, drifted up from the 531 last recorded 2026-08-13 — decomposition welcome on touch, not attempted this wave), `v5-templates/src/views/ModuleView.tsx` (**987** — re-measured 2026-09-08 after the operations-consoles wave, drifted up from the 949 recorded 2026-09-06; that wave added the four console kinds to `VIEW_KIND_TO_TYPE`/`VIEW_TAB_ICON` and the `tabIconFor` resolver that lets a blueprint's own `ViewSpec.icon` name override a kind's default glyph), `v5-templates/src/views/ModuleViewFilters.tsx` (1120, drifted up from 375 — the largest single drift on the list), `ui-kit/src/composites/FileUploader.tsx` (514, drifted up from 350), `ui-kit/src/composites/Kanban.tsx` (369, drifted up from 332), `v5-templates/src/entity-profile/EntityProfile.tsx` (758, unchanged — the `wrench`/`tool` placeholder-icon vocabulary addition; decomposition welcome on touch), `v5-templates/src/views/TaskDetail.tsx` (343, unchanged — registers the `LinkedRecordDetailSection` section renderer), `v5-composer/src/fields/registry.tsx` (482, unchanged — the single `FieldType`/named-component registry every field resolves through), `v5-templates/src/entity-profile/RecordTable.tsx` (345, unchanged — declared in the 2026-09-05 job-orders fix7 wave 6 when its `progress` column picked up `computeThresholdTone`; decomposition considered and deliberately deferred — `renderCell`'s per-column branches are one small dispatch each, and splitting the cell renderer out would relocate lines, not remove the coupling to `RecordTableColumn`).

`ui-kit/src/composites/KanbanCard.tsx`: **528** (corrected — the previous entry claimed the file was 509 pre-wave and 513 post-wave, "+4" net growth; measured per-commit, the pre-fix7 file was actually **508** and the post-fix7 file is **528**, a net **+20**, not +4). The extraction is still real and still what keeps it from being worse: the built-in "Move to…" trigger moved OUT verbatim to `KanbanCardMoveMenu.tsx` (53 lines) and its target-list/announce logic to the exported `use-kanban-card-move-targets.ts` hook (75 lines, also consumed by `v5-templates`' `RecordActionsMenu`) — without that extraction the file would be ~90 lines heavier than it is. The remainder is one interaction machine (drag registration, drop-target hit-testing, the click-open overlay's stacking) that would separate each branch from the state it reads if split further.

`v5-composer/src/fields/renderers.tsx`: **1356** (corrected four times. It was recorded 1303; commit `7de7646` added 6 more after that number was written, making 1309; then fix8's own F4/F5 edits in this very wave — collapsing the duplicate tone→text maps and widening `compileFieldSet`'s cache key — added 10 more, making 1319; then fix10's round-11 P1-11a truncation fix (the shared `ICON_VALUE_CLASS` plus its docblock, and the five icon-prefixed date/person value branches it replaced) added 24 more, making 1343; then the SAME fix10, on discovering that `min-w-0` alone did not make the value shrink (a block host does not shrink an inline child — `max-w-full` is what hands the shrink down), added 13 more lines of docblock recording that, making **1356**, verified by `wc -l` after THAT. Three corrections to one number in a single day is itself the finding: a rule-12 figure written before a wave stops editing the file is always wrong, so the number has to be taken last. Recording it as 1309 would have repeated, inside the fix for stale numbers, exactly the drift F1 was raised to correct: a number written before the wave finished editing the file.) Every named icon-bearing `Read*View` this package has shipped lives here; decomposition would mean splitting the whole `Read*View` family, still out of scope for a single-fix wave.

**Newly declared — the 2026-09-08 operations-consoles wave, verified by `wc -l` that day (numbers taken LAST, after the wave stopped editing these files, per the correction discipline recorded above):** `v5-templates/src/views/ModuleViewBody.tsx` (**533**, grown from 466 — it was under budget before this wave and is declared here for the first time; the growth is four new `case` arms in the one kind→lens switch this file exists to be, so splitting it would separate a lens from the switch that selects it. Decomposition welcome on touch). Every NEW file that wave added is under budget and none is declared: `views/consoles/WorkforcePulseView.tsx` (297), `TriageConsoleView.tsx` (282), `DispatcherCockpitView.tsx` (230), `FleetConsoleView.tsx` (224), `workforce-model.ts` (202), `console-model.ts` (198), `console-queue-columns.tsx` (153), `WorkforcePulseRoster.tsx` (128), `ConsoleKpiRow.tsx` (115), `ConsoleDrillSheet.tsx` (73), `ConsoleRecordSummary.tsx` (71), `fleet-model.ts` (69) — the wave split its four view templates' shared derivations, dense row, KPI band, drill sheet and summary panel out from the start rather than letting any one console file grow past the budget and then declaring it.

**Newly declared — undeclared and touched by the 2026-09-05 job-orders fix7 wave, verified by `wc -l` 2026-09-06:** `ui-kit/src/composites/ActivityFeed.tsx` (**499**, grown from 432 — the largest undeclared breach that wave touched; the system-actor concept, `ActivityFeedActor`/`ActivityFeedSystemActor` + `actorLabel`/`isSystemActor`, added two render branches without removing any; decomposition welcome on touch, not attempted this wave). `ui-kit/src/composites/KanbanColumn.tsx` (**403**, grown from 387 — the lane-tint wrapper and card meta-row plumbing added that wave; decomposition welcome on touch).

**Newly declared — pre-existing, not touched this cycle**, added now purely for ledger accuracy after the phase-7 review flagged it as undeclared drift: `v5-composer/src/fields/widgets.tsx` (**391**, verified by `wc -l` 2026-09-06 — untouched since the fix2/MME-FRMS-MVP port; decomposition welcome on touch). `v5-composer/src/fields/compiler.ts` (**369**, verified by `wc -l` 2026-09-06 — touched by fix8's F5 cache-key widening, +11 lines of which 10 are the `hashFields` docblock explaining why every descriptor input must be hashed; the file is one compile pipeline — `normalize` → `toDescriptor` → schema/profile derivation → the LRU — and splitting it would separate each stage from the shape it produces; decomposition welcome on touch).

**Off the list — under budget, verified by `wc -l` 2026-09-06:** `v5-templates/src/views/ListView.tsx` is **286** lines and no longer belongs here; it was carried at 469 through both rounds of the 2026-09-05 job-orders review despite having already dropped under budget. `v5-templates/src/home/HomeLaunchPad.tsx` came off this list on 2026-09-04 (was 225 then, its chrome and tiles split into `LaunchPadChrome`/`LaunchPadTiles`) and is now **252** — still comfortably under the 300-line budget, no action needed.

## Framework: React only — Vue track removed
- **`@fams/ui-kit` is the actively developed component library.** New components and fixes go here.
- **Vue track removed; production Vue lives in the v5 repo as read-only reference.** This repo is React-only going forward (greenfield rebuild, decision #3 in `docs/knowledge-base/decisions.md`).
- `@fams/tokens` stays framework-agnostic. This is what makes a future framework change cheap.

## Repo structure
- `packages/tokens` — `@fams/tokens`: DTCG `tokens/core.tokens.json` → Style Dictionary v5 → `dist/tokens.css` (CSS vars) + `dist/theme.css` (Tailwind v4 `@theme`). Tenant overrides live in `tokens/tenants/<tenant>.tokens.json` (fams, iwmp, ead, uccp).
- `packages/ui-kit` — `@fams/ui-kit`: React 19 + shadcn/ui (Radix). **Primary.** Tier-1, product-agnostic core.
- `packages/skeleton-kit` — `@fams/skeleton-kit`: **core tier**, product-agnostic. The generic app boot layer every FAMS React app starts from — folder convention, TanStack Router with per-module lazy code-splitting, TanStack Query defaults + per-class gcTime, theming bootstrap (`data-theme`/`data-tenant`), and error boundaries, all via one `createFamsApp(config)` call. Sits ABOVE `@fams/ui-kit`/`@fams/tokens`; its only real package.json dependency is React — `@fams/tokens` is consumed as compiled CSS at runtime by the consuming APP, not a package.json dependency of this package. Carries NO product vocabulary — product-specific kits (later phase) build on top of it.
- `packages/v5-templates` — `@fams/v5-templates`: **Tier 2** — v5-family patterns (multi-tab profile drawer, v5 side-sheets, entity detail scaffolds). Opt-in compositions of `@fams/ui-kit`; other products never need it. Membership decided by the 4-question cascade in `docs/BOUNDARIES.md` § The patterns tier.
- `packages/v5-composer` — `@fams/v5-composer`: **v5 tier** — the low-code composer: blueprint JSON (+ JSON schemas) → rendered module (`ComposedModule`, `SchemaForm`, field renderers, `resolveModuleViews`). The schema-first heart of the metadata-driven v5 UI; consumed by v5-kit and the demo environment's tools.
- `packages/v5-kit` — `@fams/v5-kit`: **v5 tier** — the React rewrite of v5's Vue boot layer, composed on top of `@fams/skeleton-kit` (`createFamsApp`) and `@fams/v5-composer` (`ComposedModule`). One async `bootstrapTenant(config)` turns a tenant's licensed-module list into the skeleton module contract (licensed-only route registration — unlicensed implementations are never referenced, decision #23), wires the composer blueprint path, applies per-tenant runtime theming (`applyTenantTheme`), provides reactive privilege gating (`<Privileged>`/`usePrivilege` — the `v-privilege` rewrite), per-tenant query-cache hygiene (`wipeTenantCache` + `logout`), and the apps-vs-modules navigation model (`AppsProvider`: outer rail = a tenant's `applications[]`, inner rail = the active app's modules; tenant manifest also carries `branding.logo` + `fontFamily`). Every data seam (modules/user/blueprints) is injectable — real API later, demo-kit in phase 3. MAY import skeleton-kit/composer/ui-kit; the core tier NEVER imports it (decision #13).
- `packages/demo-kit` — `@fams/demo-kit`: **core tier**, product-agnostic. Generic demo machinery for running a FAMS React app with no backend — a relational in-browser store with bidirectional referential integrity, its own injectable session `Persistence` (+ `SessionStoragePersistence`), a seed loader (loud on dangling refs), a React-free persona auth shim (`@fams/demo-kit/react` adds the optional `usePersona` hook), and an MSW mock-API generator (`buildHandlers`/`setupDemoWorker`). Carries NO v5 vocabulary and imports NO `@fams/v5-*` package (boundary lint, decision #13); the demo app (phase 3.3) bridges these generic contracts onto v5-kit's injectable seams.
- `workshop/showcase` — **the** live component preview + docs platform (port 6100), consuming the real `@fams/ui-kit`. **Primary** workshop vehicle and the single source of truth for "does this component work and how do I use it."
- `workshop/storybook` — `@fams/storybook` (private, changeset-ignored): Storybook 10 (React + Vite, port 6400 — moved off 6300, which the demo-environment app owns), **additive** — an isolated prop-level workbench (controls, autodocs, a11y panel) consuming the real `@fams/ui-kit` dist + `@fams/tokens` CSS, with explicit `data-theme` light/dark + `data-tenant` + `dir` toolbars. Deliberately a thin proof set of stories (Button/Input/KpiTile), NOT a catalogue — the showcase owns the catalogue, `registry.json` and the DoD below. `storybook build` is not a CI gate (optional `.github/workflows/storybook.yml` lane). No Chromatic / no hosted addon; telemetry disabled.
- `workshop/skeleton-example` — `@fams/skeleton-example` (private, changeset-ignored): minimal two-module app (`dashboard` + `settings`) demonstrating `createFamsApp` and per-module lazy chunking (port 6200).
- Vue track removed; production Vue lives in the v5 repo as read-only reference.
- (planned) `packages/icons` — `@fams/icons` (Iconify + Lucide + per-tenant sets).
- (planned) `packages/email` — HTML email templates (Maizzle) consuming the same tokens.

## Component authoring pattern
- Primitives from shadcn (owned source, themed via tokens). Composites built ON TOP of primitives.
- Variants via `class-variance-authority` (cva) + `cn()` (clsx + tailwind-merge).
- State props: use native `disabled`; `loading` for async (shows spinner + disables); `hasError` for invalid inputs. (`isLoading`/`isDisabled` are kept as deprecated aliases for back-compat — don't use them in new components.)
- Sizes: `size="sm" | "md" | "lg"` — never numeric. Variant names match the Figma/design names.
- React: `forwardRef`, extend native element props, `asChild`-style composition via Base UI's `useRender` (`@base-ui/react/use-render`, see `Text`/`Heading`) (or Radix `Slot` in grandfathered files only, decision #7) where useful.
- Export every component from `src/index.ts`. One component family per file group.

## Definition of done (per component)
A component is not done until all of the following hold:
1. Implementation covers every variant and size in the design.
2. Tokens only — no hardcoded hex/px/font (rule 2).
3. RTL-safe — logical properties only (rule 4). No per-demo `dir="rtl"` block — RTL is proven globally by the showcase header language switcher.
4. Accessible — built on a Base UI (or React Aria for date/time pickers + Tree) primitive; existing Radix/Reka-based components are grandfathered, migrate on touch (decision #7). Adds a fixture to the automated axe sweep (`packages/ui-kit/src/a11y.axe.test.tsx`, overlays rendered open) and passes it (rule 5).
5. Has a Vitest test (render + behaviour + key states).
6. Has a demo page on the **standard template**: `DocPage` → `Playground` (prop-bearing) or `Preview` (overlays/shells) → `Gallery` per dimension → `PropsTable` transcribed from the TS interface → `Guidelines` → `Accessibility`. Mirror `demos/BadgeDemo.tsx` (static) or `pages/ButtonPage.tsx` (interactive).
7. Registered in a **family** in `workshop/showcase/src/registry.tsx` (never a flat entry — pick the family it belongs to; discuss before creating a new family). Route smoke (`pnpm --filter @fams/showcase e2e`) picks it up automatically and must stay green. Sub-parts of a compound component (`DropdownMenuGroup`, `DataTablePagination`, …) do **not** get their own family member — they are covered by a section inside their parent's demo, and item 6's demo requirement is enforced for them by the reverse coverage check below.
8. Exported from `src/index.ts`.
9. State-agnostic and render-safe (rule 8) — no data fetching or global store; memoizable; large lists virtualized.

## You run the commands, never the designer

The people using this repo are designers, not developers. **Never answer with a
command for them to run.** Run it yourself, report what happened, and ask a
human only for what a human alone can do — a Figma decision, a brand call, or a
GitHub token (which needs their browser session).

That includes releasing. When a change here lands and the demo environment
depends on it, YOU run:

```bash
node scripts/release-version.mjs patch --publish
```

It bumps all seven packages, moves the demo environment's `ds.config.json` pin,
builds and publishes — then commit both repos. The token is found
automatically from `~/.npmrc` or `GITHUB_TOKEN`; ask for one only if none
exists, and it needs `write:packages`.

Skipping the release is not neutral: registry-mode consumers get a working app
whose own `demo check` fails on any blueprint using the new property, while
link mode looks perfect throughout — so you will not see it locally.

## Consumers install this, they don't check it out

Downstream repos (the demo environment, FAMS Desk) consume these packages as
compiled `dist`, and increasingly **without this repo on disk at all** — the
demo environment resolves `link` (sibling checkout) or `registry` (installed
packages) automatically. Two consequences that are easy to break:

- **A consumer's Tailwind cannot see our class names.** The DS therefore ships
  its utilities — from **exactly one** Tailwind compile.
  `packages/tokens/utilities.build.css` scans every markup package's `src`
  (`ui-kit`, `v5-templates`, `v5-composer`, `demo-kit`) and
  `scripts/build-css.mjs` (wired into `@fams/tokens`' `build`) emits
  `@fams/tokens/utilities.css`; each markup package's build then copies that
  byte-identical artifact into its own `dist/fams-<pkg>.css` for its
  `./utilities.css` export (`scripts/copy-utilities.mjs`, after tsup, which
  cleans `dist`). **Never split this back into a per-package compile** —
  Tailwind guarantees variant-after-base ordering (`md:flex` after `flex`)
  only within one compile, and separate compiles concatenated into the
  consumer's single `utilities` layer let a later package's plain `.hidden`
  beat an earlier one's `md:flex` (root cause of the 2026-09-08 login/AppShell
  layout collapse; the `!important` band-aids it forced were reverted with the
  fix). Consumers import `@fams/tokens/utilities.css` **once**. It happens
  automatically — but if you add a component whose classes come from a NEW
  source (a plugin, a custom `@utility`, a theme scale we don't define), add
  the matching `@reference` to `packages/tokens/utilities.build.css`, or the
  class is silently dropped: a utility whose value doesn't exist is simply not
  generated, with no error. That file documents why Tailwind's default theme
  AND `@fams/tokens/animations.css` are both referenced, and a new markup
  package must add its own `@source` line to it.
- **Never tell a consumer to `@source` our `src/`.** That ties them to a
  sibling checkout, which is exactly what the shipped stylesheets removed.

Published names are `@voltro-dxb/fams-<pkg>` (GitHub Packages requires the
scope to match the account), aliased back to `@fams/<pkg>` so imports never
change. See `docs/PUBLISHING.md` — the flow is built but nothing is published
yet.

## Tenancy (FAMS / IWMP / EAD / UCCP implemented; MM planned)
- Switch at runtime via `data-tenant="<tenant>"` on `<html>`.
- Token overrides: base `@theme` + per-tenant `[data-tenant='iwmp'] { --color-primary: … }` blocks emitted by Style Dictionary from `packages/tokens/tokens/tenants/<t>.tokens.json`.
- Logos/icons/brand name live in a per-tenant config object + asset set, surfaced via a `<Logo/>` / `<Icon/>` component — never hardcoded. In v5 apps the tenant manifest's `branding.logo` + `fontFamily` feed this (see v5-kit bullet).
## Testing (from day 1) — full contracts: `docs/TESTING.md`
- **Unit:** Vitest + Testing Library alongside every component (render + behaviour + key states). No component ships without tests.
- **a11y:** parametrized axe sweep `packages/ui-kit/src/a11y.axe.test.tsx` — add a fixture per new component; runs in the Vitest gate and CI.
- **Demo coverage, both directions:** `scripts/test-registry.mjs` + `scripts/check-demo-coverage.mjs` (inside root `pnpm test`) — every registry member must be a real export AND every renderable ui-kit export must be demoed in the showcase; unclassifiable or un-demoed exports are hard failures (allowlist: `COVERED_BY_PARENT`, each entry names its covering parent). Details: `docs/TESTING.md`.
- **Route smoke:** `pnpm --filter @fams/showcase e2e` (Playwright over every registry route; local/pre-merge gate).
- **Visual regression:** `test:visual` (curated) and `test:visual-all` (every registry route); local baselines by default, self-hosted VRT upload mode via `VRT_URL` (`infra/vrt/README.md`). Not part of required CI. Details: `docs/TESTING.md`.
## Use Base UI for / custom-build for
- USE Base UI (`@base-ui/react`): Button, Input, Select, Checkbox, Dialog/Modal, Popover, Tooltip, Dropdown/Menu, Tabs, Toast (Sonner), Command palette, Combobox.
- USE React Aria (`react-aria-components`) for date/time pickers and Tree only (decision #7) — unmatched Arabic/RTL/Islamic-calendar support.
- Existing Radix-based equivalents of the above are grandfathered — migrate to Base UI/React Aria on touch, then remove the file from the eslint Radix allowlist; new `@radix-ui/*` imports are a lint error everywhere in the repo.
- CUSTOM-build (on top of primitives): FilterPanel, DataTable (TanStack Table + Virtual), MapPanel (MapLibre), dashboard widgets, chart wrappers (ECharts), domain composites.
- NEVER reinvent accessible primitives (focus traps, etc.) — that is what Base UI/React Aria are for.

## Verify before finishing
Run and confirm green before claiming a task is done:
`pnpm --filter <package> test` and `pnpm --filter <package> typecheck` (or `pnpm build` / `pnpm test` for a repo-wide change). For UI changes, confirm the demo renders correctly in `workshop/showcase` (typecheck + build the app, and check it live if a dev server is available); for anything touching the showcase, `pnpm --filter @fams/showcase e2e` and, for visual changes, `test:visual`. CI (`.github/workflows/ci.yml`) runs install → build tokens → build packages → typecheck → lint (incl. `pnpm lint:tokens` — no raw hex/px in component source — and the core-tier `@fams/v5-*` boundary ban, decision #13) → test → a dedicated axe sweep (`pnpm test:axe`) on every PR and must be green before merge — it does **not** run e2e or visual regression; those are local/pre-merge gates only, run them yourself.

## Commit & branch conventions (unified with v5-codebase)
- **Commit format:** `<type>(<scope>)?: <message>` — types: `feat, fix, style, refactor, test, docs, chore, build, ci, revert` — plus `claim`, `wip` and `merge`, which the Session-zero flow and `scripts/fams-*.sh` emit; optional scope names the area, e.g. `feat(showcase):`, `refactor(ui-kit):`, `ci:`, `docs:`. Lowercase. Append the Jira ticket when there is one, e.g. `feat: FM-1234 add Select primitive`.
- **Branches:** see *Session zero* at the top of this file — a descriptive slug named for the change (`status-pill-density`), off `design-master`, merged back into `design-master` daily; `main` is reached by promotion only. (This supersedes the older `feature/FM-{id}-slug` convention; keep the Jira id in the commit message, not the branch name.) Never commit substantive work directly to `main` or `design-master`.
- **No PRs, no code review** (see *Session zero*): finished work is checked by `scripts/fams-done.sh` and folded into `design-master`; `main` is a promotion of a build a human has looked at. One logical change per branch.
- Keep history clean and conventional.

## Don'ts
- Never hardcode colors/sizes.
- Never add paid dependencies.
- Never use `ml`/`mr`/`left`/`right` — use logical properties.
- Never fork a component per tenant.
- Never import across frameworks.
- Never re-implement a component in a showcase app — import the real one.
- Never assume a consumer has this repo on disk — see *Consumers install this*.

## Agent enablement
- **Designer-request skills** → `.claude/skills/` (`styling-change`, `new-component`, `tenant-branding`) — loaded on demand; the routing table at the top of this file maps requests to them.
- **Package-specific guardrails** → `packages/<name>/CLAUDE.md` and `workshop/*/CLAUDE.md`. Each is pointers + package-specific deltas only — never a restatement of this file. If something here and a package `CLAUDE.md` conflict, this file wins; fix the package file.
- **Component/template discovery** → `registry.json` (repo root, shadcn-compatible schema, generated by `pnpm build:registry` from `workshop/showcase/src/registry.tsx` — the showcase stays the source of truth, this is a read-only discovery index, not a copy-source; the shadcn registry-copy distribution model is explicitly rejected, see `docs/BOUNDARIES.md` § Governance). Per-package machine-readable export index → `packages/*/llms.txt` (kept fresh by the same script's `--check` mode, wired into `pnpm lint`).

## Where other docs live
- **How to run / onboard** → `README.md`.
- **Architecture, token pipeline, distribution model, capability→library matrix** → `docs/ARCHITECTURE.md`.
- **Publishing (what is publishable, the `FAMS_NPM_REGISTRY` switch, the release runbook)** → `docs/PUBLISHING.md`. The flow is wired and **dormant**: never add a registry URL to a `package.json` `publishConfig` (it outranks the switch and breaks it), and never make a `workshop/*` package publishable — `pnpm release:audit` fails on both.
- **DS-vs-app boundary, layer model (L0–L4), patterns & anti-patterns with cases** → `docs/BOUNDARIES.md`.
- **Full library pick-list + licenses** → `docs/LIBRARIES.md`.
- **Doc index + reading order** → `docs/README.md`; **human contribution guide** → `CONTRIBUTING.md`.
- **Previewing the showcase** → run it locally (`README.md` § Preview the component showcase locally). No hosted preview.
- **Strategy, roadmap, plans** (wider-team mirror) → the FAMS Design System space in Outline.
- **This file** → rules only. Keep it that way; don't let it absorb strategy or how-to content.
