# `@fams/ui-kit` — CLAUDE.md

> Pointers + deltas only. Constitution: root `CLAUDE.md`. Layer model + admission rule: `docs/BOUNDARIES.md`.

`@fams/ui-kit` is the **primary, actively-developed** component library: React 19 + shadcn/ui (Radix) primitives, layout grammar, behavioral composites, and page-archetype shells, all themed from `@fams/tokens`. It is the tier-1, product-agnostic core every FAMS product consumes directly.

## Tier + boundary rules
- **Core tier.** Product-agnostic, no business vocabulary (root rule 10) — the one deliberate exception is the fleet-domain `domain/map/Vehicle*` set (fleet is FAMS's product domain across all tenants).
- **Never imports `@fams/v5-*`** (decision #13, boundary-linted). Depends only on `@fams/tokens` + React.
- Admission is the 4-question cascade in `docs/BOUNDARIES.md`, not a wish list — rule of three (root rule 11).

## Layout (`src/`)
- `primitives/` (L1) — single-purpose parts on Radix: Button, Input, Select, Dialog, Tabs, …
- `layout/` (L2) — spacing grammar: Stack, FormGrid, FormSection, Toolbar. Semantic `gap` presets only.
- `composites/` (L3) — behavioral: DataTable, Combobox, FilterPanel, charts, …
- `shells/` (L4) — page archetypes, chrome + slots, zero content: AppShell, ProfileLayout, ListView, …
- `domain/map/` — the one allowed business-vocabulary exception (fleet).
- Every export goes through `src/index.ts` — that barrel is also what `scripts/build-registry.mjs` reads to resolve each showcase member's source file, so a component missing from it is invisible to the registry.

## Adding a component here
1. Pick the layer (L1–L4) per the cascade; one file per component (soft budget ~300 lines, root rule 12).
2. Variants via `cva` + `cn()`; sizes `sm|md|lg`; state props `disabled`/`loading`/`hasError` (root rule 3 authoring pattern).
3. Export from `src/index.ts`.
4. Register in a **family** in `workshop/showcase/src/registry.tsx` (never a flat entry) — this also makes it appear in `registry.json` on the next `pnpm build:registry` and in the route smoke test automatically.
5. Add the full Definition of Done below.

## Tests to run
- `pnpm --filter @fams/ui-kit test` (Vitest, render + behavior + key states, colocated with the component).
- `pnpm --filter @fams/ui-kit test:axe` — add a fixture to `src/a11y.axe.test.tsx` (overlays rendered open) for every new component.
- `pnpm --filter @fams/ui-kit typecheck` and `lint` (Radix-ban + boundary rules enforced here).
- Touching the showcase too: `pnpm --filter @fams/showcase e2e` (route smoke, local gate).

## Definition of done
All of root CLAUDE.md's "Definition of done (per component)" — every variant/size implemented, tokens-only, RTL-safe (logical properties), axe fixture passing, Vitest test, standard demo template, registered in a registry family, exported, state-agnostic/render-safe.

## Links
- Root `CLAUDE.md` (constitution) · `docs/BOUNDARIES.md` (layers, cascade, patterns-tier split) · `docs/knowledge-base/decisions.md` (#7 Base UI/Radix, #8 TanStack Table, #13 tier boundary) · no package README yet — this file plus root docs are the reference.
