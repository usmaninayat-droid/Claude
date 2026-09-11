# CLAUDE.md — V5 Design System

A **dynamic React composition design system**: compose any product from a fixed
menu of modules (new or existing) that always feels like one coherent product,
runs on **dummy data** (no backend), and is backend-swappable later.

> Contributing? Read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/`](docs/) (architecture,
> the module-type cookbook, ADRs). This folder is the shipped design system + its development
> docs — product builds and private session/build context live outside it.

## The 6 coherence laws (never break — this is what makes it "one product")
1. **Token-only styling.** No hex in components; use tokens / Tailwind utilities.
2. **One shell + IA.** Render `AppShell`; never hand-roll nav/kanban/detail/drawer.
3. **Fixed module-type menu.** entity·pipeline·dashboard·live-monitoring·reports·inbox·settings·calendar·forms. New product = config; new type = a registered renderer.
4. **Config-driven rendering.** A module is a config; its UI is derived (see `src/runtime/config-render.ts`). No per-product screen React.
5. **Theming = tokens + logo only.** A tenant re-skins, never restructures.
6. **Default brand = FAMS.** Every new product uses **FAMS primary blue (`--primary: #0072D6`) + the FAMS logo** by default — set NO `brand.theme` override and no custom logo. Add a `brand.theme` + custom logo **only** when the user explicitly asks for a different brand.

## Structure (everything needed to run is here — self-contained)
- `src/components`, `src/tokens`, `src/icons` — component library + Figma-aligned tokens + icons.
- `src/components/app-shell` — AppShell + module-registry + the 9 view renderers.
- `src/runtime/` — `composition.ts` (recipe→runtime, RBAC + rule-enforced moves) · `config-render.ts` (config→view-model bridge). Verified.
- `src/sim/` — dummy-data engine (EAV + rules + persistence). Verified.
- `src/showcase`, `src/stories` — live catalog + Storybook.
- `recipes/` — product compositions (golden: `recipes/crm/`).
- `schemas/` — `Recipe.schema.json` + per-module-type config schemas.
- `assets/`, `Font/` — raw icons/vectors/fonts (incl. `assets/icons/fams/`).

## How data flows (every module)
`recipe` → `createAppRuntime` (composition.ts) → records from `src/sim` → `buildPipelineModuleData`/`buildEntityModuleData` (config-render.ts) → shell renderer. create/move/detail write back through the runtime (rule-enforced, persisted).

## Never
- **Create a product/app inside THIS folder.** Products are NEVER written under
  `V5 Design System - Ai/`. They are scaffolded in the Code projects folder at
  **`D:\Claude Projects\Code\<slug>\`**, consuming this design system read-only.
  This folder changes only when the *design system itself* changes.
- Hardcode data in components — all data goes through the adapter/sim.
- Invent a screen — extend via config + the module-type registry.
- Put raw hex in components — tokens only.
- Add session logs / build narrative / product-build context here — those stay in the private
  build workspace. Architecture, ADRs, and the module-type cookbook DO live here, under `docs/`.

## Reference gallery vs product template
- `src/showcase/apps/` (workshop/sales/ead-rms/cement/ducon/generator) = **UI reference only** — finished demos on *static* `sample-data.ts`. Use them to pick components/layouts/views/brand-token patterns. **Never** import their configs or `sample-data.ts` into a product.
- `recipes/crm/` = the **product template**. Build products as a JSON recipe over the sim engine with their **own dummy data**, in the `Code` folder. Reference the UI here; bring your own data.

## Verified already (don't rebuild)
`src/sim` (engine), `src/runtime/composition.ts`, `src/runtime/config-render.ts`,
`schemas/Recipe.schema.json`, `recipes/crm/` — 41 sandbox checks.
