---
name: styling-change
description: Use for any change to how EXISTING components look — "make the buttons rounder", "more spacing", "bigger text", "softer shadows", "change the primary color". Decides token edit vs component edit and scopes the work correctly (a style tweak does NOT trigger the full new-component DoD). NOT for one tenant's branding (tenant-branding skill) or new components (new-component skill).
---

# Styling change (existing components)

## Step 1 — decide the blast radius (ask if unclear)

- **"This component should look different"** (buttons rounder, table rows taller)
  → edit that component's cva/base classes, swapping one token utility for
  another (e.g. `rounded-md` → `rounded-lg`). Other components are untouched.
- **"The whole system should look different"** (everything rounder, all spacing
  looser, brand color shift) → edit the token value in
  `packages/tokens/tokens/core.tokens.json` (radius, spacing, color, typography
  groups). Every component using that token follows.
- **One tenant only** → wrong skill; use `tenant-branding`.

When a designer says "make the buttons rounder" they almost always mean the
component-scoped edit — confirm before changing a global token.

## Step 2 — make the edit (rules that always apply)

- Components live in `packages/ui-kit/src/{primitives,layout,composites,shells}/`
  (e.g. `primitives/Button.tsx`), v5 patterns in `packages/v5-templates/src/`.
- **Tokens only** — never a hex value, never `-[Npx]` arbitrary values. A value
  no token expresses = add the token first in `packages/tokens`, then use it.
- **RTL-safe** — logical utilities only (`ms-`/`me-`/`ps-`/`pe-`/`text-start`).
- Motion/z-index through semantic tokens (`duration-fast`, `z-dropdown`, …).

## Step 3 — verify (scoped, not the full DoD)

```
pnpm --filter @fams/ui-kit test && pnpm --filter @fams/ui-kit typecheck
pnpm lint            # includes lint:tokens
```
(For a token change: `pnpm --filter @fams/tokens build` first.)

Look at it: `pnpm --filter @fams/showcase dev` → `http://localhost:6100`, find
the component's page, check light/dark, RTL (header language switcher) and each
tenant. Existing tests/demos already cover the component — you only add
tests/demo sections if you added a new variant or prop.

## Step 4 — propagate to the demo environment

`pnpm --filter <changed package> build` (tokens and/or ui-kit). The demo app
(`../fams-v5-demo-environment`, port 6300) links against `dist/` — no rebuild,
no visible change. Then reload the app and confirm there too.
