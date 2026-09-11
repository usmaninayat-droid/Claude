# START HERE — kickoff brief for Claude Code

> Open Claude Code on this folder. Everything is self-contained — the component
> library, tokens, app shell, dynamic core, and dummy-data engine are all in
> `src/`. Nothing is referenced from outside this folder.

## 0. Read first (in order)
1. `CLAUDE.md` (auto-loaded) — the 5 coherence laws + structure + data flow.
2. `ARCHITECTURE.md` — vision, the 4 layers, roadmap.
3. `docs/BUILDING-WITH-CLAUDE-CODE.md` — skills + automation.

## 1. State of play
**In the folder + verified (pure TS, 41 sandbox checks — don't rebuild):**
- `src/sim/` — dummy-data engine (EAV, rules, localStorage).
- `src/runtime/composition.ts` — `createAppRuntime(recipe)`: RBAC lists + rule-enforced moves.
- `src/runtime/config-render.ts` — the keystone: config → columns/cards/filters/detail.
- `schemas/Recipe.schema.json` + `recipes/crm/` — recipe contract + golden example.

**In the folder, ready to wire:** `src/components`, `src/tokens`, `src/icons`,
`src/components/app-shell` (AppShell + 9 renderers), `src/showcase`, `src/stories`,
plus build config (`package.json`, `vite.config.ts`, `tsconfig.json`, `.storybook`).

## 2. Pre-flight
```
pnpm install
pnpm dev          # the showcase should boot — if not, fix before building
pnpm storybook    # the component workbench
```

## 3. Build sequence (what `/build [B1..B6]` runs)
- **B1 — Boot check.** `pnpm install` + `pnpm dev`; confirm the showcase renders. Commit.
- **B2 — Wire the bridge.** Connect `src/runtime/config-render.ts` output to the
  app-shell renderers (`src/components/app-shell`): unify the local view-model
  interfaces in `config-render.ts` with the shell's `app-shell/types.ts`. Data flow:
  `recipes/crm` → `createAppRuntime` → records → `buildPipelineModuleData`/
  `buildEntityModuleData` → renderer; create/move/detail go back through the runtime.
- **B3 — Boot the CRM recipe (the proof).** Mount `AppShell` with the CRM recipe
  over the sim store. Confirm live: create a deal → persists across reload; as
  `SalesManager` drag a proposal → Won works, as `SalesRep` the same drag is
  rejected; apply the green tenant theme → re-skins via tokens only.
- **B4 — Cover module types.** Confirm all 9 types render from config; fill gaps.
- **B5 — Agent surface.** Write the 4 skills (`init-product`/`add-module`/
  `theme-tenant`/`verify`) per `docs/BUILDING-WITH-CLAUDE-CODE.md`.
- **B6 — Tenants + gallery + backend stub.** 3 themes; a few demo products; a
  documented REST adapter stub (swap the data source — no UI change).

## 4. Verify gate (before "done")
- Recipes/configs validate against `schemas/*`.
- No raw hex in `src/components`/`src/runtime` (token-only).
- App builds + boots; every module resolves a renderer + a data source.
- Re-run / port the spine tests to a `vitest` spec under `src/__tests__`.

## 5. Guardrails
- Modules are **config, not React** — extend via config + the module-type registry.
- **Token-only**; theming = tokens + logo, never structure.
- **All data through the adapter/sim** (dummy-data now, REST later — no UI change).

## 6. First prompts
1. "Read CLAUDE.md and ARCHITECTURE.md, then run B1: pnpm install and boot the showcase; confirm it renders and report."
2. "Run B2: wire config-render.ts to the app-shell renderers, then B3: boot the CRM recipe from recipes/crm over the sim store."
3. "Run the verify gate and port the spine tests to vitest."
