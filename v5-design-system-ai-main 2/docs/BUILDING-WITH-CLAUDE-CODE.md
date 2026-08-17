# Building (and composing) with Claude Code — the L4 guide

> How we feed Claude Code so it builds the design system and lets the design team
> compose on-brand products. Pairs with `ARCHITECTURE.md`. All work lands in
> **this folder** — fully self-contained.

## 1. The feeding stack (ranked by leverage)

1. **`CLAUDE.md` (root, always-loaded)** — the backbone. Short. Rules + map + decision tree. Spec in §3.
2. **Worked examples** — the single highest-leverage asset. Golden recipe + golden module config live at `recipes/crm/` (`crm.recipe.json`, `deals.module.json`). Skills point agents here to copy the pattern.
3. **Skills (lean, 4)** — repeatable build/compose actions. Specs in §2.
4. **Schemas** — `schemas/Recipe.schema.json` (+ per-kind `*ModuleConfig.schema.json`). Skills validate against these; the agent only ever emits a schema-valid recipe.
5. **`verify`** — programmatic coherence gate (schema-valid · token-only · builds). What stops drift.
6. **Subdir `CLAUDE.md`** (`src/`, `recipes/`) — area context that loads on demand.

## 2. The skills (the build surface)

Lean set; clear non-overlapping triggers; each ends by running `verify`.

### `init-product`
- **Trigger:** "build a CRM", "scaffold a fleet app", "new FAMS product".
- **Ask (AskUserQuestion):** product name · which modules (multi-select from the 9 types). **Brand defaults to FAMS** (primary blue `#0072D6` + FAMS logo) — only ask about / set a custom brand color + logo if the user explicitly requests one.
- **Default brand rule:** unless the user asks for a custom brand, the recipe sets **no `brand.theme` and no custom logo** (inherits FAMS blue + FAMS logo). Custom brand → add `brand.theme` token overrides + logo (see `theme-tenant`).
- **Steps:** write `recipes/<slug>/<slug>.recipe.json` (copy `recipes/crm/crm.recipe.json` as the pattern) → add per-module `*.module.json` (copy `deals.module.json` / an entity example) → add `*.seed.json` dummy data (~20–30 realistic, cross-referenced records) → mount via the runtime → `verify`.
- **UI reference (don't absorb data):** consult `src/showcase/apps/*` (workshop/sales/ead-rms/cement/ducon/generator) for which components/layouts/views/brand-token patterns to use — but build the product as a recipe with its **own** seed data; never import those configs or `sample-data.ts`.
- **Output:** recipe path + module list + "open the app to click it."
- **Never:** write bespoke screen React; hardcode data outside seeds/adapter; put hex in configs (use status colors from the palette); import `src/showcase/apps` configs or `sample-data.ts` into a product.

### `add-module`
- **Trigger:** "add a Leads pipeline", "wire up Reports", "create a Vehicles entity".
- **Ask:** module type (the 9) · id (kebab) · label (singular/plural) · for pipeline: stages.
- **Steps:** create `<module-id>.module.json` from the matching schema (read the golden example for the kind) → add the module entry to the recipe → add a `*.seed.json` → `verify`.
- **Never:** invent a new module *type* unless asked (that needs a registered renderer); modify unrelated modules.

### `theme-tenant`
- **Trigger:** "make a green Tadweer theme", "re-skin for EAD".
- **Steps:** set `brand.theme` token overrides in the recipe (CSS custom properties only — `--primary`, `--sidebar`, `--accent`, …) + a logo. **Nothing else** — theming is tokens + logo, never structure.
- **Never:** change components, layouts, or module structure to achieve a look.

### `verify`
- **Trigger:** "verify", "is this right", or auto-called by the others.
- **Checks:** recipes/configs validate against schemas · no raw hex in components/configs · the app builds (`pnpm build`/typecheck) · every module resolves a renderer + a data source · seeds satisfy field types.
- **Output:** a checklist with PASS/FAIL; FAIL blocks "done".

## 3. `CLAUDE.md` spec (the lean root brain — write at P1)

Keep it ~1–2 pages. Sections:
- **What this is:** a composition design system; products are recipes; everything feels like one product.
- **The 5 coherence laws** (from MASTER-PLAN §2) — token-only, one shell/IA, fixed module-type menu, config-driven rendering, theming = tokens+logo.
- **Structure map:** `src/tokens` · `src/components` · `src/components/app-shell` (renderers) · `src/runtime` · `src/sim` · `recipes` · `schemas` · `src/stories`.
- **Decision tree:** intent → skill (init-product / add-module / theme-tenant / verify); anything else → read MASTER-PLAN, don't freelance.
- **Hard "never" list:** no hex in components; never hand-roll shell/nav/kanban/detail; modules are config not React; all data through the adapter; products live in `recipes/` + run via the runtime.
- **Pointers:** golden example `recipes/crm/`; full plan `ARCHITECTURE.md`; this guide.

## 4. Where the library lives (all in this folder)

Everything is internal: `src/components` (primitives, data-display, data-viz, navigation, widgets, modals, basics, map), `src/tokens` (Figma-aligned + tenant themes), `src/components/app-shell` (AppShell + 9 module-type renderers), `src/icons`, `src/showcase` + `src/stories`. The dynamic core is `src/runtime` + `src/sim`. Nothing is referenced from outside this folder.


## 5. Build-phase vs compose-phase

- **While building the system (P1–P6):** feed via `ARCHITECTURE.md` + `CLAUDE.md` + per-phase intent ("build P1"). Skills are not the driver here — it's bespoke build work.
- **Once built (the wow):** the design team composes products through the **skills** above — "prompt → on-brand, clickable product on dummy data."

So: stand up L1/L2/L3 first; the skills (this guide) come fully alive at **P5**,
operating on the finished substance. The schema + golden example already exist so
they're ready when we get there.

## 6. Browser tab identity (mandatory for every product/demo)

Every product scaffolded from this DS ships the SAME tab identity, regardless of
product name or tenant brand:

- `<title>FAMS V5</title>` — exactly this string, not the product name.
- Favicon = the FAMS logo icon: copy `assets/brand/fams-icon.svg` (canonical copy,
  this repo) into the product's `public/fams-icon.svg` and link it:
  `<link rel="icon" type="image/svg+xml" href="/fams-icon.svg" />`
- The logo is TAB-ONLY branding — never reuse this icon file inside the app UI
  (login screens, headers, and shells keep their own DS-provided brand assets).

Applied retroactively to all 12 existing demos in `Code/` (2026-07-12, user directive).
