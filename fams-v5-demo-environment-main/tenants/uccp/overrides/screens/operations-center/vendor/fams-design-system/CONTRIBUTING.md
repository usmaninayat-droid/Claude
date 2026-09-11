# Contributing to the V5 Design System

Thanks for contributing! This is a **dynamic React composition design system**: products are
composed from a fixed menu of module *types* (config, not bespoke screens) and always feel like one
coherent product. This guide gets you running and explains the rules that keep it coherent.

## Prerequisites
- **Node 18+** and **pnpm** (`npm i -g pnpm`).

## Setup & run
```bash
pnpm install
pnpm dev            # live component showcase (Vite)
pnpm storybook      # component workbench
pnpm test           # vitest (runtime/sim spine tests)
pnpm typecheck      # tsc --noEmit
pnpm build          # tsc + vite production build
```
Open a PR only when `pnpm typecheck` **and** `pnpm build` pass.

## Project layout
- `src/components` · `src/tokens` · `src/icons` — component library, Figma-aligned tokens, icon set.
- `src/components/app-shell` — `AppShell` + the module-registry + the 9 view renderers (the chrome).
- `src/runtime` — `composition.ts` (recipe → runtime, RBAC + rule-enforced moves) and
  `config-render.ts` (config → view-model bridge). **Verified core — extend additively, don't rewrite.**
- `src/sim` — dummy-data engine (EAV + rules + localStorage). Verified.
- `recipes/` — declarative product compositions (golden example: `recipes/crm/`).
- `schemas/` — Recipe + per-module-type JSON Schemas.
- `docs/` — architecture, ADRs, the module-type cookbook (read these before extending — see below).

## The 6 coherence laws (never break — this is what makes it "one product")
1. **Token-only styling.** No hex in components; use tokens / Tailwind utilities backed by `@theme inline`.
2. **One shell + IA.** Render `AppShell`; never hand-roll nav / kanban / detail / drawer.
3. **Fixed module-type menu.** entity · pipeline · dashboard · live-monitoring · reports · inbox · settings · calendar · forms. New product = config; new *type* = a registered renderer.
4. **Config-driven rendering.** A module is a config; its UI is derived (`src/runtime/config-render.ts`). No per-product screen React.
5. **Theming = tokens + logo only.** A tenant re-skins, never restructures.
6. **Default brand = FAMS** (`--primary: #0072D6` + FAMS logo) unless a custom brand is explicitly requested.

## How to extend
- **Add/adjust a component:** put it under the right `src/components/*` area, token-only styling, add a
  `*.spec.md` and a Storybook story. Keep the API domain-agnostic (config-driven, not one domain's vocab).
- **Add a module to a product:** it's **config**, not React — author it from the golden snippet in
  [`docs/MODULE-TYPE-COOKBOOK.md`](docs/MODULE-TYPE-COOKBOOK.md) (the decision guide + per-type recipes).
- **Add a new module *type*:** register a renderer in `src/components/app-shell/module-registry.tsx` and
  add a config schema under `schemas/`. This is the only time you write a new screen.
- **Entity statuses** stay simple (Active / Inactive; + Under Maintenance for vehicles/equipment).
  Multi-stage statuses belong to **pipeline** modules.

## Required reading (in `docs/`)
- [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) — vision, the 4 layers, coherence laws, roadmap.
- [`MODULE-TYPE-COOKBOOK.md`](docs/MODULE-TYPE-COOKBOOK.md) — decision guide + a golden recipe per module type.
- [`BUILD-SEQUENCE.md`](docs/BUILD-SEQUENCE.md) — how the system is built/extended phase by phase + the verify gate.
- [`BUILDING-WITH-CLAUDE-CODE.md`](docs/BUILDING-WITH-CLAUDE-CODE.md) — driving the DS with Claude Code (optional).
- [`adr/`](docs/adr) — architecture decisions (Tailwind 4, theme-inline, JSON configs, …).
- [`learnings/`](docs/learnings) — platform principles, the pattern ledger, compliance notes.

## Optional: Claude Code automation
`.claude/commands/` ships two slash commands for working on the DS with Claude Code:
- `/build` — build/extend the system phase by phase (per `docs/BUILD-SEQUENCE.md`).
- `/verify` — coherence gate: schemas valid · token-only · builds · every module resolves.
These are optional conveniences; the pnpm scripts above are the source of truth.

## PR checklist
- [ ] `pnpm typecheck` and `pnpm build` pass.
- [ ] New/changed components are token-only (no raw hex) and have a story.
- [ ] No product code added under this folder — products live in their own repos and consume this read-only.
- [ ] Follows the 6 coherence laws above.
