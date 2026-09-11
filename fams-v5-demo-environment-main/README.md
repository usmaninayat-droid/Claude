# fams-v5-demo-environment

The FAMS **v5 multi-tenant demo environment**. It holds the canonical product
modules, each tenant's typed customizations, and the generated per-tenant
blueprints the demo app renders — plus the tool suite that keeps them honest.

> **"Deltas are the database, resolved is the UI."** — the locked tenant model
> ([`docs/tenant-model.md`](docs/tenant-model.md), decision #14).

## Layout

```
core/modules/<m>/        canonical module: blueprint.json (every node has a stable id) + screens/ + seeds/
tenants/<t>/
  tenant.json            manifest: theme + licensed modules (TenantConfig shape)
  deltas/<m>.ops.json    typed ops on stable ids (NEVER JSON-Patch paths — the Odoo lesson)
  seeds/                 per-tenant seed data incl. users.json personas
  overrides/screens/     rare bespoke screens (referenced, never merged)
  modules/<m>/           tenant-native modules (incubated here, may be promoted)
resolved/<t>/            GENERATED + COMMITTED: <m>.blueprint.json + <m>.provenance.json
tools/                   the resolve / check / capture / promote engine + CLIs
```

Agents **read** `resolved/<t>/` (one complete file per module — token-cheap, zero
merging) and **write** typed deltas. The app renders `resolved/`.

## Tools (`pnpm demo <cmd>`)

| Command | What it does |
|---|---|
| `pnpm demo resolve <t>` / `--all` | base blueprint (core or tenant-native) + ordered deltas → `resolved/` (deterministic: sorted keys + trailing newline). Output must pass `validateBlueprint`. |
| `pnpm demo check` | CI gate: re-resolve in memory and byte-compare to committed `resolved/`; validate every ops file (shape + stable-id existence) and tenant manifest; lint all JSON. Non-zero + precise diff on mismatch. |
| `pnpm demo capture <t>` | canonicalize a hand-edited `resolved/` into **minimal** typed deltas; append + re-resolve. **Any** inexpressible change → `*.ops.proposed.json` + explanation + non-zero (never guesses silently — decision #17). |
| `pnpm demo promote <t> --op <opId>` | fold a delta's effect into core, drop the delta, re-resolve all tenants (inheritance visible — decision #16). |
| `pnpm demo promote <t> --module <m>` | **move** a tenant-native module into core (no copy stays); grant it; tenant renders 1:1 via core + zero deltas. |

The op families (all on stable ids): `addField`, `hideField`, `setLabel`,
`setFieldProp` (allowlist: required/listValues/append/min/max), `addStage`,
`removeStage`, `addTab`, `hideTab`, `reorderTabs`. See
[`tools/lib/ops.mjs`](tools/lib/ops.mjs) and
[`tools/schemas/OpsFile.schema.json`](tools/schemas/OpsFile.schema.json).

## Design-system consumption — two modes, one switch

This repo consumes the FAMS design system in one of two modes. Check and change
it with:

```bash
node tools/ds-consumption.mjs --status
node tools/ds-consumption.mjs --mode link       # sibling checkout  (DEFAULT, today)
node tools/ds-consumption.mjs --mode registry   # exact pinned versions (hermetic)
```

It only rewrites `package.json` / `app/package.json` / `pnpm-workspace.yaml` and
then tells you which install command to run.

### Mode `link` — the current, default mode

Tools consume `@fams/v5-composer` (blueprint types + `validateBlueprint`), and
`app/` consumes seven `@fams/*` packages, from the design-system monorepo via
pnpm **`link:`** dependencies:

```json
"@fams/v5-composer": "link:../fams-design-system/packages/v5-composer"
```

`link:` (not `file:`) is deliberate: the package's own deps use pnpm
`workspace:`/`catalog:` protocols that only resolve inside that monorepo. `link:`
symlinks the package and lets Node resolve its transitive deps through the design
system's own `node_modules` (via realpath). This means:

1. **Prerequisite — build the design system first.** Tools import the built
   `dist`, and the transitive deps must be installed:
   ```bash
   cd ../fams-design-system && pnpm install && pnpm turbo run build
   cd ../fams-v5-demo-environment && pnpm install
   ```
2. **It is non-hermetic on purpose.** The lockfile records a path, not an
   integrity hash, and a sibling checkout at the right commit is assumed. That is
   the right trade while the design system is under active development and there
   is no registry to resolve versions against — you want edit-and-see-it.

### Mode `registry` — the hermetic path, ready but not yet armed

`--mode registry` pins **exact** versions (`"@fams/ui-kit": "0.9.0"` — no caret,
so the design system moves only when someone bumps it deliberately) and drops the
sibling-checkout assumption entirely. Turn it on in one step **once the packages
are actually published** — see
[`../fams-design-system/docs/PUBLISHING.md`](../fams-design-system/docs/PUBLISHING.md)
§ Runbook, step 7, for the exact sequence (including the `@fams:registry` line
and read token this repo's `.npmrc` will need).

**Status: proven, not live.** No registry exists yet, so the versioned path was
verified offline against local `pnpm pack` tarballs:

```bash
# in ../fams-design-system
node scripts/pack-smoke-test.mjs --tarballs-only /tmp/fams-tarballs
# here
node tools/ds-consumption.mjs --mode registry --tarballs /tmp/fams-tarballs
pnpm install --no-frozen-lockfile && pnpm demo check && pnpm test:all
```

`--tarballs` writes a pnpm `overrides` block into `pnpm-workspace.yaml` so the
pinned versions — direct *and* the whole transitive `@fams` graph — resolve from
those tarballs with no registry running. It is a **proof harness, not the
production path**, and `--mode link` / `--mode registry` (without `--tarballs`)
removes it again. Verified 2026-08-05: `pnpm install --frozen-lockfile` clean,
`demo check` OK, 96 root tests + 27 app tests, `pnpm --filter app build` green —
identical to the `link:`-mode baseline.

**What a real registry adds that the tarball proof cannot cover:**
authentication, `@fams:registry` resolution, and registry integrity-hash
provenance. Those stay unverified until a registry is live.

## Quick start

```bash
pnpm install
pnpm demo resolve --all   # regenerate resolved/
pnpm demo check           # verify (the CI gate)
pnpm test                 # vitest
```

## The demo app (`app/`)

A Vite + React app (port 6300, a second workspace package) boots the real stack
with no backend — `@fams/v5-kit` `bootstrapTenant` + a `@fams/demo-kit` store +
MSW serving the v5 API contract + the composer/templates rendering `resolved/`
blueprints — plus the `DemoConsole` for tenant/persona switching. It proves
decision #19's loop end to end. See [`app/README.md`](app/README.md).

```bash
cd ../fams-design-system && pnpm install && pnpm build   # prerequisite
cd ../fams-v5-demo-environment && pnpm install
pnpm --filter app dev        # http://localhost:6300
pnpm --filter app build      # production build
pnpm --filter app test       # vitest (boot + adapter + gating)
```

## Pilot content

Three core modules — `asset/vehicle` (entity, ~14 v5-faithful fields, ~50
seeds), `workforce/driver` (entity), and `ticketing/ticket` (pipeline, with
`rules.json` for its transitions). Two tenants license all three:

- **`fams`** — canonical blue (`[data-tenant='fams']`), **zero deltas** (the
  reference view).
- **`iwmp`** — green + gradient rail (`[data-tenant='iwmp']`); asset delta set
  (+2 `addField`, 1 `hideField`, 1 `setLabel`) + a ticketing `setLabel`;
  waste-flavored override seeds.

Each has an `admin` + `dispatcher` persona in `seeds/users.json`. The full
click-path is [`docs/WALKTHROUGH.md`](docs/WALKTHROUGH.md).

## Static deployment (Vercel or any static host)

The whole demo — the main app *and* the three UCCP override screen apps that
are iframed into it — builds to one static directory. There is no backend:
MSW (`mockServiceWorker.js`, scope `/`) is the data layer, so a plain static
host is all it needs.

```bash
bash scripts/vercel-build.sh                 # DS → 3 screens → app → assemble
node scripts/serve-dist.mjs 6400             # serve it like the host does
cd app && npx playwright test --config=playwright.static.config.ts
```

`scripts/vercel-build.sh` builds each override screen with
`--base=/screens/<name>/` and copies its `dist/` under `app/dist/screens/`, so
in a production build the iframes point at **same-origin** `/screens/…` paths
instead of the `:6360` / `:6370` / `:6380` dev servers
(`app/src/demo/*-module.tsx`, switched on `import.meta.env.DEV`). Output is
`app/dist`; the host needs a filesystem-first SPA rewrite to `/index.html` that
does **not** swallow `/screens/`, `/assets/`, `/branding/` —
`scripts/serve-dist.mjs` is the local reference implementation, and the
consuming repo's root `vercel.json` is the deployed one.
`app/e2e/static-deploy-verify.spec.ts` is the gate: login, MSW registration,
records rendering, all three embedded screens, and a deep-link reload.
