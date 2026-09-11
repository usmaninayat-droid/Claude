---
name: new-component
description: Use when a request needs a component/widget/visual element that does not exist yet — "add a stat card", "we need a timeline", "a rating widget" — including components the demo environment needs (they are built HERE, never there). Carries the layer cascade + full Definition of done.
---

# New component

## Step 0 — does it already exist?

Check `registry.json` (repo root) / `packages/*/llms.txt` before building.
Close-but-not-quite → extend the existing component (new variant/slot), don't
duplicate.

## Step 1 — where does it live?

Decide per the 4-question cascade in `docs/BOUNDARIES.md`:
- Product-agnostic, no business vocabulary → `packages/ui-kit/src/` in its layer:
  `primitives/` (single-purpose), `layout/` (spacing grammar), `composites/`
  (behavioral), `shells/` (page chrome + slots).
- v5-flavored pattern (profile drawers, module views, entity scaffolds) →
  `packages/v5-templates/src/`.
- Needed by the demo environment: it STILL goes in one of the above (demo-env
  carve-out, root CLAUDE.md rule 11) — never into the demo repo's `app/`.

## Step 2 — build it

- New primitives on **Base UI** (`@base-ui/react`); date/time pickers + Tree on
  React Aria. New `@radix-ui/*` imports are a lint error — Radix is frozen at
  its existing allowlisted usages (root `CLAUDE.md` decision #7,
  `packages/ui-kit/eslint.radix-allowlist.mjs`: "do NOT add new files here").
  Migrate-on-touch only; never add a new Radix import, and never implement
  `asChild` with Radix `Slot`.
- `asChild` composition: use Base UI's `useRender` from
  `@base-ui/react/use-render`, never `@radix-ui/react-slot`. Copy the shipped
  pattern in `packages/ui-kit/src/primitives/Text.tsx` /
  `Heading.tsx` exactly:

  ```tsx
  import { useRender } from '@base-ui/react/use-render'

  return useRender({
    render: asChild ? (children as ReactElement) : undefined,
    defaultTagName: as ?? 'span', // or your element's default tag
    ref,
    props: {
      ...props,
      className: cn(/* variants */, className),
      ...(asChild ? {} : { children }),
    },
  })
  ```

- Variants via `cva` + `cn()`; sizes `sm|md|lg`; state props
  `disabled`/`loading`/`hasError`; `forwardRef`; extend native element props.
- Tokens only, logical properties only, semantic motion/z tokens (hard rules 2/4).
- State-agnostic presenter: data + callbacks via props — no fetching, no store,
  no routing. ~300-line soft budget; decompose past it.

## Step 3 — Definition of done (ALL of it, per root CLAUDE.md)

1. Every variant + size from the design implemented.
2. Vitest test alongside the component (render + behavior + key states).
3. Axe fixture in `packages/ui-kit/src/a11y.axe.test.tsx` (overlays rendered open).
4. Export from `src/index.ts`.
5. Demo page on the standard template (`DocPage` → `Playground`/`Preview` →
   `Gallery` → `PropsTable` → `Guidelines` → `Accessibility` — mirror
   `demos/BadgeDemo.tsx` or `pages/ButtonPage.tsx`).
6. Registered in a **family** in `workshop/showcase/src/registry.tsx` (never a
   flat entry). Root `pnpm test` HARD-FAILS on any undemoed export
   (`scripts/check-demo-coverage.mjs`).

## Step 4 — gates, then hand-off

```
pnpm --filter @fams/ui-kit test typecheck && pnpm test:axe && pnpm lint
pnpm --filter @fams/showcase e2e     # route smoke (local gate)
```
Verify visually at `:6100`. If the demo environment asked for it:
`pnpm --filter <pkg> build`, then wire it there via its existing seams
(blueprint `uiConfig` / `app/src/demo/` wiring — see that repo's CLAUDE.md).
