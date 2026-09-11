# ADR-001 — Tailwind 4 (not 3)

**Status:** Accepted
**Date:** 2026-06-08
**Decision-makers:** Kit maintainers

## Context

When initially scaffolding the kit, two Tailwind major versions were viable:
- Tailwind 3 — mature, JS-preset-driven theming via `tailwind.config.ts`
- Tailwind 4 — released late 2025, CSS-variable-driven theming via `@theme`
  blocks directly in CSS

The kit needed to:
- Theme based on CSS variables (because tenants override at runtime via
  per-tenant CSS files)
- Self-host fonts (Gilroy)
- Be auditable by Claude Code without TS compilation knowledge

## Decision

**Use Tailwind 4.**

CSS-variable-driven theming maps 1:1 to the tenant model: `--primary`,
`--sidebar`, etc. are already the natural shape of FAMS production tokens.
JS presets would have meant duplicating values between `tailwind.config.ts`
(JS) and `theme.css` (CSS) and keeping them in sync — fragile.

## Consequences

### Positive
- Tenant overrides JUST WORK — change the CSS var, every utility re-themes
- No `tailwind.config.ts` to keep in sync (it exists for IDE intellisense
  but Tailwind itself ignores it)
- Native dark-mode binding via `@custom-variant dark`
- Modern PostCSS pipeline (Lightning CSS)

### Negative
- Tailwind 4 is newer; some tooling (Storybook, jest-tailwind, etc.) hasn't
  fully migrated as of this writing
- The `@source` directive is unfamiliar to developers used to Tailwind 3's
  `content[]` array — easy to forget, which silently breaks builds
- Plugin ecosystem still catching up

### The single biggest gotcha
The `@source` directive in `styles.css` MUST include the kit's TSX paths
(`packages/ui/src`, `packages/shell/src`, `packages/modules/src`).
Without it, Tailwind 4 only scans the importing project, doesn't see
`bg-sidebar` usages in the kit, and silently drops the utility.

This is THE #1 cause of "white sidebar" failures. We mitigate it with:
- The `fams-v5-style-fix` skill (auto-diagnoses + auto-fixes)
- The `fams-v5-verify` skill (check #2 catches it)
- The `audit.mjs` script (drift check #4)
- Templates that ship the correct `styles.css` out of the box

## Alternatives considered

**Tailwind 3 + CSS-in-JS bridge.** Would let us use `tailwind.config.ts`
presets but synchronize via a runtime CSS-var bridge. Rejected: double
maintenance burden, more moving parts.

**No Tailwind at all (only CSS vars + manual classes).** Rejected: loses
the ergonomic utility-class authoring experience for shadcn primitives. The
ecosystem of shadcn primitives we use ships as Tailwind-class-bearing TSX.

## See also

- `docs/02-tokens.md` — how the @theme inline block works
- `ADR-002` — why @theme inline (not JS preset)
- `scripts/verify.mjs` — check #2 catches @source omissions
