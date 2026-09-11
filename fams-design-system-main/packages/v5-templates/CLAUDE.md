# `@fams/v5-templates` — CLAUDE.md

> Pointers + deltas only. Constitution: root `CLAUDE.md`. Full membership rules + laws: `README.md` and `docs/BOUNDARIES.md` § The patterns tier.

`@fams/v5-templates` is the **tier-2 patterns package** — opt-in compositions of `@fams/ui-kit` into v5-signature product surfaces (multi-tab profile drawer, v5 side-sheets, blueprint-driven views, the map template). Other FAMS product families never need this package; v5-family products (IWMP, FAMS, MM, EAD) opt in.

## Tier + boundary rules
- **Patterns tier**, not core. Membership = the 4-question cascade (README § Membership); business vocabulary IS allowed here (`AssetProfileShell`-style names) — banned in `@fams/ui-kit`.
- **Dependency direction is absolute**: `v5-templates → ui-kit → tokens` (+ `@fams/v5-composer` for blueprint-driven templates). The core never imports this package.
- **Compose, never fork** a core component — needing to fork means core has an API gap; fix core instead.
- Same quality gates as core: tokens-only, RTL, axe per component, `docs/API-GRAMMAR.md`.
- Promotion/demotion stays alive: second product family adopts unchanged → promote to core; single-module only → demote to app code.

## Two entry points
- `.` (`src/index.ts`) — shells, blueprint templates (`EntityProfile`, `CreationSheet`), view templates (`ModuleView`/`ListView`/`KanbanView`/`HybridView`/`TaskDetail`).
- `./map` (`src/map/index.ts`) — `MapPanel` ONLY. A separate build entry, deliberately not imported by the main barrel, so consumers that never render a map don't pay for `maplibre-gl`/`deck.gl`/`terra-draw`/`supercluster`. See README § MapPanel before touching anything under `src/map/`.

## Adding a template here
1. Run the cascade first (README § Membership) — don't skip to "it feels v5-shaped".
2. Compose `@fams/ui-kit` primitives/composites/shells; never re-implement one.
3. Export from `src/index.ts` (or `src/map/index.ts` only for the map stack).
4. Register in the `v5-templates` group in `workshop/showcase/src/registry.tsx`, DRAFT-labeled until design-team adjudication (see existing family `intro` strings for the expected tone).
5. Full Definition of Done from root `CLAUDE.md` still applies (tokens, RTL, axe, tests, demo page, registered, exported).

## Tests to run
- `pnpm --filter @fams/v5-templates test` · `typecheck` · `lint`.
- Axe fixtures: `src/a11y.axe.test.tsx` (main barrel) and `src/map/a11y.axe.test.tsx` (map entry) — add to whichever barrel your component ships from.
- Touching the showcase too: `pnpm --filter @fams/showcase e2e`.

## Definition of done
Same as `@fams/ui-kit` (root CLAUDE.md "Definition of done (per component)"), plus: passes the membership cascade, composes rather than forks, and stays on the correct side of the `./map` split if it touches the map stack.

## Links
- `packages/v5-templates/README.md` (full laws, MapPanel deep-dive) · root `CLAUDE.md` · `docs/BOUNDARIES.md` § The patterns tier · `docs/LIBRARIES.md` (map stack licenses).
