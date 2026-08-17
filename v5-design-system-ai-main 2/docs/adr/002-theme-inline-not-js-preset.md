# ADR-002 — `@theme inline` in CSS (not JS preset)

**Status:** Accepted
**Date:** 2026-06-08

## Context

Even within Tailwind 4, there are two valid ways to declare design tokens:

1. **JS preset** — `tailwind.config.ts` exports a `theme.extend` object
2. **`@theme inline` block in CSS** — declares tokens as CSS variables that
   Tailwind reads at build time

The kit's `packages/tokens/tailwind.preset.ts` was scaffolded with the JS
approach. When this approach didn't produce the expected results (utilities
like `bg-sidebar` weren't resolving in built CSS), we investigated.

## The discovery

**Tailwind 4 IGNORES the JS preset for theming.** The `tailwind.config.ts`
file is read for `darkMode`, `plugins`, and `content`/`source` configuration,
but `theme.extend` is a no-op. Tokens MUST be in CSS via `@theme inline`.

This is documented in the Tailwind 4 migration notes but easy to miss. We
discovered it during the Phase 2 kit audit (see CHANGELOG).

## Decision

**All tokens live in `packages/tokens/theme.css` inside an `@theme inline`
block.** The legacy `tailwind.preset.ts` exists only for IDE intellisense and
TS compile compatibility — Tailwind itself ignores it.

```css
/* theme.css */
:root {
  --sidebar: rgba(0, 114, 214, 1);
  /* ...all CSS vars... */
}

@theme inline {
  --color-sidebar: var(--sidebar);
  /* ...maps every var to a Tailwind utility name... */
}
```

## Consequences

### Positive
- Single source of truth (just `theme.css`)
- Tenant overrides work transparently (re-declaring `:root` vars cascades
  through `@theme inline`)
- No "are my tokens in JS or CSS?" cognitive overhead

### Negative
- `tailwind.config.ts` is misleading — developers think editing it changes
  theme, but it doesn't. We kept it for IDE support; documented as a no-op.
- If `theme.css` isn't imported, utilities silently fail (no JS preset
  fallback)
- Migration from Tailwind 3 codebases requires re-thinking where tokens live

### The fix to a common failure
"`bg-sidebar` doesn't work" almost always means the `@theme inline` block
isn't being seen. Causes:
- `styles.css` doesn't `@import '@fams-v5/tokens/theme.css'`
- `theme.css` is imported BUT the `@theme inline` block was removed
- A tenant override happened BEFORE `theme.css` (cascade order issue —
  rare; tenant files only override `:root`, not `@theme inline`)

The `fams-v5-style-fix` skill diagnoses each.

## Alternatives considered

**Keep the JS preset working AND have @theme inline (both).** Rejected:
violates "one source of truth per fact." Tokens would drift.

**Compile JS preset → CSS @theme at build time.** Rejected: extra build
step, breaks Vite's straight-through CSS pipeline.

## See also

- `docs/02-tokens.md`
- `ADR-001` — why Tailwind 4 at all
- `packages/tokens/theme.css` — the actual `@theme inline` block
- `packages/tokens/tailwind.preset.ts` — the kept-for-intellisense no-op
