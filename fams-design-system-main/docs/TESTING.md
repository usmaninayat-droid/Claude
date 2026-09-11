# Testing — full contracts

> Deep detail moved out of root `CLAUDE.md` (which keeps the gate list + pointers).
> If this file and root `CLAUDE.md` conflict, root wins; fix this file.

## Unit (Vitest + Testing Library)

Per component: render + behaviour + key states. Tests live alongside the
component. Test-with-the-component (not strict test-first), but no component
ships without tests.

## a11y (automated)

A single parametrized axe sweep — `packages/ui-kit/src/a11y.axe.test.tsx` —
renders every barrel export and asserts zero violations. Runs in the Vitest gate
and in CI (`pnpm test:axe`). Add a fixture for every new component (overlays
rendered open).

## Demo coverage, both directions (automated)

`node scripts/test-registry.mjs` (runs inside root `pnpm test`, so it is part of
the locked CI gate order — no separate job). It has always enforced *registry
member ⇒ real barrel export*; since 2026-08-06 it also enforces the **reverse**,
via `scripts/check-demo-coverage.mjs`: **every renderable component exported from
`packages/ui-kit/src/index.ts` must be rendered somewhere under
`workshop/showcase/src/`** ("if a state isn't demoed here, it doesn't exist" —
`docs/BOUNDARIES.md` § Governance). Without it, an export could be demoed nowhere
and CI stayed green — which is how `DropdownMenuGroup`/`DropdownMenuPortal`/
`DataTablePagination` went uncovered.

- *Classification is shape-based, never name-based.* Each value export
  (type-only specifiers dropped) is resolved to its declaration and classified by
  AST shape: JSX-returning function/arrow, `forwardRef`/`memo` factory, or
  namespace pass-through (`= DropdownMenuPrimitive.Group`) ⇒ **component, in
  scope**; `cva(…)` ⇒ variant helper; `use*` ⇒ hook; non-JSX function ⇒ util;
  literal/`as const` ⇒ constant. An export the script cannot classify is a
  **hard failure**, not a silent skip — teach it the new shape.
- *Allowlist, not silence.* Genuine internal sub-parts that a parent renders for
  you (`DialogPortal`/`DialogOverlay`, `AlertDialogPortal`/`AlertDialogOverlay`,
  `SheetPortal`/`SheetOverlay`, `DrawerPortal`/`DrawerOverlay`, `ScrollBar`) are
  exempted through the explicit `COVERED_BY_PARENT` map in
  `scripts/check-demo-coverage.mjs`, and **every entry must name the covering
  parent**. Forcing a page for each would document an invisible element; leaving
  them silently absent is what caused the hole. A new export that is neither
  demoed nor allowlisted fails; so does a stale allowlist entry (now demoed, or
  no longer exported). Adding an entry is a deliberate, diff-reviewable decision.

## Route smoke (automated)

Playwright — `workshop/showcase/e2e/` — visits every family + member + doc route
and fails on any console error. Run `pnpm --filter @fams/showcase e2e`
(auto-derives routes from the registry; not yet in CI — local/pre-merge gate).

## Visual regression (harness exists, not a CI gate)

Playwright screenshots — `workshop/showcase/e2e/visual.spec.ts`. Run
`pnpm --filter @fams/showcase test:visual` (update baselines with
`test:visual:update`). Baselines are OS-specific and gitignored (see
`workshop/showcase/.gitignore`) until Linux baselines are generated on the CI OS
and wired into `.github/workflows/ci.yml` — local/pre-merge gate for now.

## Visual regression, exhaustive (phase 4 §2)

`workshop/showcase/e2e/visual-all.spec.ts` — every registry route (doc + family
+ member; the count grows with the registry), full-page, plus a ~10-route
dark-mode sample. Derived from the showcase's registry route list (the same
derivation `routes.smoke.spec.ts`/`visual.spec.ts` use), NOT from a built
Storybook `index.json`. This is unchanged by Storybook's arrival in
`workshop/storybook` (2026-08-05): the showcase registry stays the route source
of truth, and Storybook's stories are not screenshotted by any suite. Run
`pnpm --filter @fams/showcase test:visual-all` (update with
`test:visual-all:update`); same OS-specific gitignored baseline policy as
`visual.spec.ts`. Dual mode: unset `VRT_URL` → local baselines (default); set it
(+ `VRT_APIKEY`/`VRT_PROJECT`) → every screenshot uploads to a self-hosted
Visual Regression Tracker instead — see `infra/vrt/README.md` for standing one
up, the API key, and the designer Accept/Reject-becomes-baseline workflow.
`.github/workflows/visual.yml` runs either suite on `workflow_dispatch` or the
`visual-regression` PR label — **not** part of the required `ci.yml` gate (needs
VRT reachable; keeps required CI fast).
