# CLAUDE.md — fams-v5-demo-environment (v2)

Multi-tenant **demo environment** for FAMS v5. Screens here are **metadata-driven**:
`@fams/v5-composer` renders them from blueprints. The React app in `app/` is thin
wiring around the design system. Full model: [`docs/tenant-model.md`](docs/tenant-model.md);
rationale: decisions #14–#20.

## Rule zero — where work goes

**This repo contains NO custom components and NO custom styling. Ever.**

- How something **LOOKS** (colors, spacing, shape, typography, a new visual
  element, "make X prettier/rounder/bigger") → the work happens in
  **`../fams-design-system`** under *its* CLAUDE.md. This repo consumes it via
  `pnpm link:`. If a visual doesn't exist in the design system yet, **create it
  there first**, then use it here. Never create or style a component in `app/`.
- What is **SHOWN** (fields, screens/modules, labels, stages, tabs, data,
  tenants, personas) → blueprints, deltas and seeds **here**.
- After changing the design system, **rebuild it or you will see nothing
  change** (packages serve from `dist/`): `cd ../fams-design-system &&
  pnpm --filter <package> build` (e.g. `@fams/ui-kit`, `@fams/tokens`) or
  `pnpm build` for cross-package changes. Then reload the app.

## Routing — designer request → action

| The request sounds like | Do this |
|---|---|
| Global look: buttons, colors, spacing, fonts | `../fams-design-system` → its skill **styling-change** |
| A new visual element / widget / card | `../fams-design-system` → its skill **new-component** |
| One tenant's logo / colors / font | skill **tenant-branding** |
| Add / rename / hide a field; tabs; pipeline stages | skill **edit-module** |
| A new screen or module | skill **new-module** |
| Data: "add 10 trucks", rename records, personas | skill **seed-data** |
| Match a Figma design | skill **figma-parity-loop** (WIP-root skill; if unavailable, follow `plan/overnight-2026-08-12/MORNING-REPORT.md` recipe from the parent checkout) |
| "It looks broken / weird" | Reproduce at `:6300` with `?tenant=<t>&persona=<p>`. Broken in the DS showcase (`:6100`) too → fix in `../fams-design-system`. Only here → blueprint/placement/seed issue; run `pnpm demo check`. |

**Vocabulary map:** trucks/vehicles → `asset` · drivers/staff → `workforce` ·
tickets/tasks/jobs → `ticketing` · for tenant `iwmp`, `asset` is the tenant-native
**Collection Point Management** module (shadows the core `asset` id).
**Tenants:** `fams` (Telematics), `iwmp` (Tadweer waste). Tenant not specified →
ask; if you can't ask, do `iwmp` and say so.

## The content model

- **READ** `resolved/<t>/<m>.blueprint.json` — the complete blueprint the app
  renders (one file, no merging). `resolved/<t>/<m>.provenance.json` — where each
  node came from (`core` | `delta` | tenant-native), keyed by stable id.
- **Tenant manifest** `tenants/<t>/tenant.json` — licensed `modules`,
  `applications[]` (outer nav rail: apps ≠ modules; each app lists its modules),
  `branding.logo`, `fontFamily`.
- **Blueprints** carry top-level `views` (`list`, `kanban`, `hybrid`, …) and a
  `uiConfig` metadata surface (creation sheet, filters, list columns/row height,
  icon, metadata-driven `profile.details`, kanban card placements) — ops and
  capture must respect both.
- **WRITE** `tenants/<t>/deltas/<m>.ops.json` (typed ops), `tenants/<t>/seeds/`
  (incl. `users.json` personas), `tenants/<t>/modules/<m>/` (tenant-native
  modules — new ids, or shadowing a core id for that tenant; incubate here
  before `demo promote`).

## Customizing a tenant — the primary path

**Vibecode-then-capture** (decisions #15/#17; full drill: [`docs/agent-drill.md`](docs/agent-drill.md)):

1. Edit `resolved/<t>/<m>.blueprint.json` directly to what the screen should be.
2. `pnpm demo capture <t>` — canonicalizes the diff into typed ops in
   `tenants/<t>/deltas/` (inexpressible → writes `*.ops.proposed.json` +
   explanation, exits non-zero; resolve by hand, never force).
3. `pnpm demo check` — must pass.

Hand-authoring ops is the fallback, not the default. Op families: `addField`
(optional `placements` fan-out), `placeField`, `hideField`, `setLabel`,
`setFieldProp`, `addStage`, `removeStage`, `addTab`, `hideTab`, `reorderTabs`
(schema: `tools/schemas/OpsFile.schema.json`).

**Mandatory visibility check:** a field renders only if it is both placed
(placements/regions) **and** listed in the blueprint's `systemColumns` —
otherwise it shows as bare text or not at all. Always verify on the running app
(`pnpm --filter app dev` → `:6300?tenant=<t>&persona=<p>`), not just in JSON.

## Hard rules

1. **Never hand-edit `resolved/`** except as input to `demo capture` (step 1
   above). `demo check` byte-compares `resolved/` against `resolve(core + deltas)`.
2. **Never edit `core/` to customize one tenant.** Shared change = core-first:
   touch `core/`, `pnpm demo resolve --all`, review the inheritance diff. Move a
   proven tenant change into core with `demo promote`.
3. **Stable ids are immutable.** Ops reference nodes by `id` only — never array
   index or path (decision #14). Renaming/reusing an id silently breaks deltas.
4. **Capture never guesses** (see primary path above).
5. **No paid deps** (decision #5). Tools stay on Node builtins +
   `@fams/v5-composer` + `ajv` + vitest.
6. **No components or styling in `app/`** (rule zero). `app/src/demo/` is the
   sanctioned wiring seam (human-gated) — even there, bodies must compose
   `@fams/*` components, never hand-rolled markup with utility classes.

## The demo app (`app/`)

Vite + React (port **6300**; note: the design system's Storybook must not run at
the same time on the same port). Boots the real stack — v5-kit `bootstrapTenant`
(+ `AppsProvider` apps/modules nav) + demo-kit store + MSW over the v5 API
contract + composer/templates — from committed `resolved/` blueprints, and mounts
`DemoConsole` for tenant/persona switching. Docs: [`app/README.md`](app/README.md).

## Gates

- After any content change: `pnpm demo resolve <t>` (or `--all`) →
  `pnpm demo check` (byte-compare, ops-schema validation via ajv, seed-reference
  integrity — dangling = FAIL, inert = WARN — and debt-dashboard staleness).
- App tests: `pnpm --filter app test` (vitest; render path proven by `vite build`).
- Visual matrix (local/pre-merge, not CI): `pnpm --filter app test:visual` —
  tenant × persona × screen, all 24 shots real (kanban is wired via
  `resolveModuleViews`). VRT upload mode: see `fams-design-system/infra/vrt/README.md`.

## Tools

`pnpm demo resolve [<t>|--all]` · `pnpm demo check` · `pnpm demo capture <t>` ·
`pnpm demo promote <t> --op <opId> | --module <m>` ·
`pnpm demo capture-action [--dry] [--override]` · `pnpm demo debt [--check]`.
Engine: `tools/lib/*.mjs`. The capture GitHub Action, failure ladder, override
debt, debt dashboard and seed-integrity details: [`docs/capture-action.md`](docs/capture-action.md).

## Ownership & review (`.github/CODEOWNERS`)

Agents customize the content surface freely — `core/`, `tenants/`, `resolved/`
have no owner (CI + capture are the safety net). The seams are human-gated to
`@fams/platform-team`: `tools/`, `.github/`, `app/src/demo/`, `CLAUDE.md`.
PR template: `.github/pull_request_template.md`.

## Design-system consumption

`@fams/*` packages are pnpm `link:`s to `../fams-design-system/packages/<name>`
(root: `link:../fams-design-system/packages/v5-composer`). Build the design
system before anything (`cd ../fams-design-system && pnpm build`). Switch
link ↔ pinned-registry mode ONLY via `node tools/ds-consumption.mjs --status |
--mode link | --mode registry` — never hand-edit `@fams/*` specifiers.

_v2 — 2026-08-13: routing-first rewrite; placement ops + `uiConfig`/`views` +
tenant `applications`/`branding` documented; kanban fixme removed; capture-Action
detail moved to `docs/capture-action.md`._
