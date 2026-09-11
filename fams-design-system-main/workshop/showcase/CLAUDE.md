# `@fams/showcase` — CLAUDE.md

> Pointers + deltas only. Constitution: root `CLAUDE.md`.

This is **the** live component preview + docs platform (port 6100), consuming the real `@fams/ui-kit`/`@fams/v5-templates`/`@fams/v5-composer` — never re-implementations. `workshop/storybook` (Storybook 10, port 6300) exists alongside it since 2026-08-05 but is additive and deliberately thin — this app stays **primary** and owns the catalogue, `registry.json` and the DoD. Per `docs/BOUNDARIES.md` § Governance: **"if a state isn't demoed here, it doesn't exist."** `src/registry.tsx` is also the upstream source of truth `scripts/build-registry.mjs` reads to generate the repo-root `registry.json`.

## Boundary rules
- Never re-implement a component here — import it (root CLAUDE.md "Don'ts").
- This app is private (`"private": true`, no publish) and is itself NOT part of `registry.json`/`llms.txt` — it's the input to those, not an item in them.

## Key entry points
- `src/registry.tsx` — `COMPONENT_GROUPS: Group[]` (Group → Family → FamilyMember). Groups are pages of nav; families bundle related components behind a tab strip; a family's `intro` string is prose, read by humans in the UI AND by `scripts/build-registry.mjs`/`scripts/build-llms.mjs` to derive `registry.json` descriptions.
- `src/nav.ts` — builds nav from `COMPONENT_GROUPS`.
- `src/App.tsx` — routes `group/family[/member]` via `COMPONENT_GROUPS`.
- `src/demos/*Demo.tsx` — the standard demo template (`DocPage` → `Playground`/`Preview` → `Gallery` → `PropsTable` → `Guidelines` → `Accessibility`); `src/pages/*Page.tsx` for the few richer, hand-curated pages (`ButtonPage`, `ComboboxPage`).
- `e2e/routes.smoke.spec.ts` — Playwright route smoke, auto-derived from the registry; `e2e/visual.spec.ts` — visual regression (local gate, OS-specific baselines, gitignored).

## Adding a component demo here
1. Never create a new family without discussing it first (root CLAUDE.md DoD #7) — pick the existing family it belongs to.
2. Write the intro string carefully: it becomes both the in-app family description AND the `registry.json` item description for every member of that family, plus feeds `llms.txt` generation upstream.
3. Import the new `*Demo` component and add a `FamilyMember` entry; the route, nav, and registry all update automatically — no other file to touch.
4. Regenerate the registry after registering: `pnpm build:registry` (repo root) — CI/lint fails if it's stale.

## Tests to run
- `pnpm --filter @fams/showcase typecheck` (also runs on `build`, which is `tsc --noEmit && vite build`).
- `pnpm --filter @fams/showcase e2e` (route smoke — must stay green after any registry change; not yet in CI, run it yourself).
- `pnpm --filter @fams/showcase test:visual` for visual changes.
- Repo root `pnpm build:registry` + its test (`node scripts/test-registry.mjs`) after any `registry.tsx` edit. That test also runs the **reverse** coverage check (`scripts/check-demo-coverage.mjs`, standalone for a readable report): every renderable `@fams/ui-kit` export must be rendered by some file under `src/`, or be in the `COVERED_BY_PARENT` allowlist naming the parent that renders it. Sub-parts of a compound component belong in a section of the parent's demo, not a new family member — see root CLAUDE.md § Testing.

## Definition of done
A demo is done when its component's full DoD (root CLAUDE.md) is met AND the route smoke test passes AND `registry.json`/`llms.txt` reflect it (regenerate, don't hand-edit either file).

## Links
- Root `CLAUDE.md` (constitution, component DoD) · `docs/BOUNDARIES.md` § Governance · `scripts/build-registry.mjs` / `scripts/build-llms.mjs` (readers of this app's registry).
