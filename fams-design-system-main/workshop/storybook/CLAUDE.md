# `@fams/storybook` — CLAUDE.md

> Pointers + deltas only. Constitution: root `CLAUDE.md`.

Storybook 10 (React + Vite, TypeScript) on port 6400 (moved off 6300, owned by the demo-environment app) — **ADDITIVE**, a second workshop vehicle. `workshop/showcase` (port 6100) remains **the** live component preview + docs platform and the source of truth for `registry.json` / the DoD checklist. Storybook exists for isolated, prop-level component work (controls, autodocs, the a11y panel), not as a replacement for the showcase.

## Boundary rules
- Never re-implement a component here — import it from `@fams/ui-kit` (root CLAUDE.md "Don'ts"). Stories consume the built `dist` via the package `exports` map, same as the showcase.
- Private (`"private": true`), changeset-ignored, and NOT part of `registry.json`/`llms.txt`.
- Adding a story does **not** satisfy the root DoD — DoD #6/#7 still mean a showcase demo page registered in a `registry.tsx` family.
- Hard rule 1: MIT-only Storybook packages, all pinned via the `catalog:` block in `pnpm-workspace.yaml`. **No Chromatic or any other hosted/SaaS addon.** Telemetry + crash reports are disabled in `.storybook/main.ts` — keep them disabled.
- The `storybook` core package and every `@storybook/*` addon must stay on the same 10.x version (Storybook enforces this); bump them together in the catalog.

## Key entry points
- `.storybook/main.ts` — framework, addons, and the `viteFinal` merge that mirrors `workshop/showcase/vite.config.ts` (Tailwind v4 plugin, React dedupe/alias, `optimizeDeps.exclude` for the linked workspace packages).
- `.storybook/preview.tsx` — global chrome: explicit light/dark via `withThemeByDataAttribute` writing `data-theme` on `<html>` (never media-query-derived — decision #2 ruling ⑤, same as the showcase toggle), plus `data-tenant` and `lang`/`dir` toolbars (rules 4 + 6).
- `.storybook/preview.css` — the same `@fams/tokens` entry points the showcase's `styles.css` imports, plus the `@source` scan of `packages/ui-kit/src` (Tailwind v4 cannot see into workspace source).
- `src/stories/*.stories.tsx` — the harness proof set: `Button` (primitive), `Input` (form), `KpiTile` (composite). **Story coverage is deliberately partial** — see `docs/BACKLOG.md` § CI / infra.

## Commands
- `pnpm --filter @fams/storybook dev` — dev server, port 6400.
- `pnpm --filter @fams/storybook build` — `tsc --noEmit && storybook build` → `storybook-static/` (gitignored). Requires `@fams/ui-kit`/`@fams/tokens` `dist` to exist (turbo's `^build` handles it).
- Not a CI gate: `storybook build` is intentionally absent from `.github/workflows/ci.yml`'s locked order (build → typecheck → lint → test → axe). It runs in the optional `storybook.yml` lane only.
