# `@fams/tokens` — CLAUDE.md

> Pointers + deltas only. Constitution: root `CLAUDE.md`. Full build/decisions: `README.md`.

`@fams/tokens` is **L0 — the vocabulary**: DTCG `tokens/core.tokens.json` compiled by Style Dictionary v5 into `dist/theme.css` (Tailwind v4 `@theme`) and `dist/tokens.css` (prefixed `--fams-*` raw vars for non-Tailwind consumers), plus `dist/tenants.css` (per-tenant semantic overrides) and `dist/theme.echarts.json`. Every other package and app consumes tokens through here — this is what makes tenant re-theming and a future framework change cheap (root CLAUDE.md § Framework).

## Tier + boundary rules
- **Framework-agnostic, foundational.** No React, no components — CSS + JSON only. Everything else depends on this; this depends on nothing in-repo.
- A new visual value is a **new token**, reviewed once here — never hardcoded downstream (root rule 2).

## Key entry points
- `tokens/core.tokens.json` — the full DTCG token set.
- `tokens/tenants/<tenant>.tokens.json` — one file per tenant, overridden semantic vars only.
- Package exports: `./theme.css`, `./tokens.css`, `./tenants.css`, `./theme.echarts.json`, `./fonts.css`, `./fonts/*`.

## Adding a token here
1. Add the `$type`/`$value` entry to `core.tokens.json` (or a tenant file for an override) — never invent a parallel naming scheme; follow `docs/knowledge-base/naming.md`.
2. Status-ramp values use the `-scale` suffix convention (`color.success-scale.500` → `--color-success-500`) — DTCG can't have both a leaf and a group at the same path; see README § Decisions.
3. `pnpm --filter @fams/tokens build` to regenerate `dist/`.
4. Consume via a Tailwind utility (`bg-primary`, `text-foreground`, …) in the consuming package — never read the CSS var name back into a JS literal except through `resolveToken()` (see `scripts/lint-tokens.mjs`'s documented exemption).

## Tests to run
- `pnpm --filter @fams/tokens test` (`test/build.test.js` — build output shape).
- `pnpm --filter @fams/tokens build` before testing any downstream package that consumes fresh tokens (CI order: build tokens → build packages → typecheck/lint/test, root `CLAUDE.md` § Verify).
- No typecheck/lint scripts here (both are no-ops) — the real gate is `pnpm lint:tokens` at the repo root, which scans *consumers* for raw hex/px, not this package.

## Definition of done
A token change is done when: it's added to `core.tokens.json` (or a tenant override), the build regenerates cleanly, and at least one consumer switches to the new Tailwind utility (no orphaned tokens).

## Links
- `packages/tokens/README.md` (build table, font/tenant decisions) · root `CLAUDE.md` · `docs/knowledge-base/naming.md` · `docs/knowledge-base/tech-stack.md`.
