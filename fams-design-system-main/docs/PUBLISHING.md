# Publishing the `@fams/*` packages

> Status (2026-08-05): **the flow is built and dormant.** Every mechanical piece
> is in place and tested. **No registry has been chosen, no credential exists,
> and nothing has been published.** Arming it is a short, explicit human task —
> the runbook below. Read § What is verified vs what is not before trusting any
> claim in this document.

---

## GitHub Packages — the chosen registry (2026-09-08)

`scripts/publish-github.mjs` is the path to use. The `release.mjs` /
`changeset publish` flow documented below was written for a generic registry
where the `@fams` scope is publishable; GitHub Packages requires the scope to
match the owning account, and `fams` on github.com belongs to an unrelated
user, so it cannot be used as-is.

**What it does.** Packs each package as a consumer would receive it, then
rewrites only the manifest inside the tarball:

| | |
|---|---|
| `name` | `@fams/ui-kit` -> `@voltro-dxb/fams-ui-kit` |
| internal deps | `"@fams/tokens": "workspace:*"` -> `"npm:@voltro-dxb/fams-tokens@0.9.0"` |
| adds | `repository` (GitHub links a package to a repo through it), `publishConfig.registry` |
| removes | `scripts` (a published library needs none, and `prepublishOnly` points at a repo path absent from the tarball) |

Nothing in the repo is renamed. The dependency **alias** is what makes it
invisible: pnpm/npm install `@voltro-dxb/fams-tokens` into
`node_modules/@fams/tokens`, so the compiled `import ... from '@fams/tokens'`
resolves untouched in every package and every consumer.

**Publishing.**

```bash
node scripts/publish-github.mjs --dry-run        # no credential needed
export GITHUB_TOKEN=ghp_...                      # classic PAT, write:packages
node scripts/publish-github.mjs
```

The packages are **private**: GitHub Packages takes an npm package's visibility
from the repository named in `repository`, and `voltro-dxb/fams-design-system`
is private. Consumers need a classic PAT with `read:packages` -- the consumer
steps are in `fams-v5-demo-environment/ONBOARDING.md`.

**Verified 2026-09-08, everything except the authenticated upload.** Rehearsed
against a local verdaccio with `--registry http://localhost:14873`: all 7
published, then a demo-environment checkout with **no design system on disk**
installed them, resolved every alias into `node_modules/@fams/*`, and built and
rendered byte-for-byte the same CSS as link mode (1,685 selectors, zero
missing) with no console errors. Only auth is unproven -- GitHub requires a
classic PAT, and fine-grained token support for its npm registry is untested.

**If you later move to a registry that allows the `@fams` scope** (a
self-hosted verdaccio, say), this script becomes unnecessary: `release.mjs`
already does the right thing, and the demo repo's `ds.config.json`
`registryScope` / `registryPrefix` revert to `@fams` / `""`.

Related: `docs/ARCHITECTURE.md` § 7 (distribution model, "consume, don't fork"),
`docs/BOUNDARIES.md` § Governance (why the shadcn registry-copy model is
rejected), `CONTRIBUTING.md` (changesets in the PR flow).

---

## 1. What is publishable and what is private forever

The list lives in exactly one place — `scripts/publish-config.mjs` — and
`pnpm release:audit` fails if reality drifts from it.

**Publishable (7).** These lost `private: true` and gained
`license`/`publishConfig`/a `prepublishOnly` guard:

| Package | Tier | What a consumer gets |
| --- | --- | --- |
| `@fams/tokens` | L0 | compiled CSS + `theme.echarts.json` + fonts. No JS entry — CSS-only, `sideEffects: ["*.css"]` |
| `@fams/ui-kit` | core | the component library (`dist/index.js` + `dist/index.d.ts`), `./tailwind.css`, `./styles.css` |
| `@fams/skeleton-kit` | core | `createFamsApp` app boot layer |
| `@fams/demo-kit` | core | demo machinery; `.`, `./react`, `./console` |
| `@fams/v5-composer` | v5 | composer runtime; `.`, `./schemas/*`, `./blueprints/*` |
| `@fams/v5-templates` | tier 2 | v5 patterns; `.` plus the separate heavy `./map` entry |
| `@fams/v5-kit` | v5 | `bootstrapTenant` boot layer |

**Private forever (4).** These are *apps that consume the packages*, not
distributables. They keep `private: true`, stay in `.changeset/config.json`'s
`ignore` list, and the audit fails if any of them ever becomes publishable:

- the monorepo root (`fams-design-system`)
- `workshop/showcase` (`@fams/showcase`) — the primary preview platform
- `workshop/storybook` (`@fams/storybook`) — the additive prop-level workbench
- `workshop/skeleton-example` (`@fams/skeleton-example`)

**Workshop packages must never become publishable.** They embed local paths,
dev-only tooling and preview content; publishing one would ship the workshop as
a library. The audit enforces this in both directions.

---

## 2. The registry switch

One switch, one name, no vendor anywhere in the repo:

```
FAMS_NPM_REGISTRY=https://<host>/<path>     # the registry to publish to
FAMS_NPM_TOKEN=<publish token>              # the credential for it
```

`FAMS_NPM_REGISTRY` unset is the dormant state and is handled loudly at every
layer:

| Layer | Behaviour with the switch unset |
| --- | --- |
| `pnpm release` | runs the audit, prints a banner naming the two variables, **exits 0 without building or publishing** |
| `pnpm publish` / `npm publish` in any package | **blocked** by the `prepublishOnly` guard (`scripts/guard-publish.mjs`), exit 1 |
| `changeset publish` | same — it shells out to `pnpm publish`, so the guard fires |
| `.github/workflows/release.yml` | the `preflight` job fails the run with a `::error` annotation + a step summary telling a human exactly what to set; the `publish` job never starts |

`resolveRegistry()` additionally **refuses `registry.npmjs.org` / `registry.yarnpkg.com`
outright** — `@fams/*` is internal, so pointing the switch at the public
registry is treated as a mistake, not a choice.

### How the switch actually works — verified behaviour

This part is unintuitive and cost a redesign, so it is written down. Measured on
**pnpm 11.1.3 / npm 11 / `@changesets/cli` 2.31.0, 2026-08-05**:

1. **`publishConfig.registry` in `package.json` has ABSOLUTE precedence in
   `pnpm publish`.** It beats a scoped `@fams:registry`, `--registry`, and every
   environment variable. Proven: with `publishConfig.registry =
   https://registry.invalid/PLACEHOLDER` and
   `npm_config_@fams:registry=http://127.0.0.1:14873/`, `pnpm publish --dry-run`
   reported `📦 @fams/skeleton-kit@0.9.0 → https://registry.invalid/PLACEHOLDER/`.
   → **Therefore `publishConfig` here carries `access: "restricted"` only.** A
   `registry` value there — even a placeholder — would make the switch
   inoperable. The audit fails if anyone adds one back.
2. **`pnpm publish` ignores `npm_config_*` environment variables entirely** —
   including the `npm_config_@fams:registry` that `@changesets/cli` sets for its
   publish child, and `npm_config_registry`. It also ignores
   `NPM_CONFIG_USERCONFIG` for a key the project `.npmrc` already defines. The
   only channels that move it: a **project `.npmrc` at the workspace root**, or
   an explicit `--@fams:registry=` CLI flag.
   → **Therefore the registry is delivered via a transient workspace-root
   `.npmrc`** rendered from `.npmrc.publish` by `scripts/release.mjs`, and
   removed again in a `finally`. `changeset publish` inherits it because
   `pnpm publish` reads it.
   *(npm behaves the opposite way — a scoped `@fams:registry` env var does beat
   `publishConfig.registry` there. Do not rely on that; pnpm is the tool
   changesets actually uses in this repo.)*
3. **`npm publish` run inside `packages/<x>/` does not read the workspace-root
   `.npmrc` at all**, so on its own it would default to registry.npmjs.org.
   → **Therefore the "never publish by accident" guarantee is a
   `prepublishOnly` lifecycle script**, not a clever URL: it is the one
   mechanism that fires for npm, for pnpm, and therefore for changesets. It does
   **not** run on `pnpm pack`, so the pack smoke test is unaffected. Verified
   both ways.
4. There is **no committed `.npmrc`**. A committed
   `@fams:registry=${FAMS_NPM_REGISTRY}` was tried and rejected: with the switch
   unset pnpm prints `Failed to replace env in config` warnings on *every*
   `pnpm install`, and the dormant state is the normal state.

### Choosing a registry (hard rule 1 applies)

Any choice must be free, license-verified OSS or an entitlement FAMS already
holds — no paid tier, no new SaaS subscription. Not yet decided; the options
`docs/ARCHITECTURE.md` § 7 already anticipates:

- **Verdaccio** — MIT, self-hostable, works fully offline. The standing
  recommendation in `docs/ARCHITECTURE.md`. **Not exercised here** (see § What is
  verified vs what is not).
- **GitHub Packages npm registry** — included with the existing GitHub org, no
  extra subscription. Registry URL `https://npm.pkg.github.com`; note it maps
  scope→owner, so `@fams` must match the org name or packages need renaming.
- **Gitea / Forgejo package registry** — MIT/AGPL respectively, self-hosted.
- Artifactory/Nexus **paid tiers are out** under hard rule 1; Nexus OSS is EPL
  and would be allowed.

Nothing in this repo assumes any of them.

---

## 3. The version + publish flow

```bash
pnpm changeset            # 1. author a changeset (per PR, as today)
pnpm version-packages     # 2. changeset version → bumps + CHANGELOGs
pnpm release              # 3. audit → build → changeset publish
```

Supporting scripts:

| Script | Does |
| --- | --- |
| `pnpm release:audit` | publish-surface audit only (private flags, `files`/`exports`/`sideEffects`, `publishConfig`, the guards, the changesets ignore list) |
| `pnpm release:dry` | audit → build → `pnpm publish --dry-run` per package, printing the resolved target registry. Publishes nothing |
| `pnpm smoke:pack` | the outside-repo pack + import smoke test (§ 4) |
| `pnpm release` | the real thing; refuses without `FAMS_NPM_TOKEN` |

`node scripts/pack-smoke-test.mjs --tarballs-only <dir>` packs the 7 tarballs
without running the consumer test — that is how the demo repo's versioned-path
proof gets its inputs.

### The CI lane

`.github/workflows/release.yml`. **Manual/dormant by design**:
`workflow_dispatch` (with a `dry_run` input defaulting to **true**) or a pushed
`v*` tag. It requires the repository **variable** `FAMS_NPM_REGISTRY` and the
repository **secret** `FAMS_NPM_TOKEN`, neither of which exists, and no-ops
loudly without them.

**The required gate `ci.yml` is untouched.** Its locked order — install → build
tokens → build → typecheck → lint → test → axe — is unchanged; publishing is
not in it and never runs on a PR or a push to `main`.

The lane has `permissions: contents: read` on purpose: `changeset publish`
creates git tags **locally** and never pushes them, and whether release tags get
pushed is an open decision (§ 6).

---

## 4. Is the published shape actually correct?

`pnpm smoke:pack` (`scripts/pack-smoke-test.mjs`) is the phase-1 §2 ad-hoc
`pnpm pack` check made permanent and widened from 2 packages to **all 7 and
every entry point in every `exports` map** — wildcards included, expanded
against the real files so it grows by itself. Seven stages:

1. `pnpm pack` all 7.
2. Tarball manifest hygiene: no `private`, `publishConfig` present, and **every
   `workspace:` / `catalog:` protocol rewritten** to a resolvable range; every
   path referenced by `main`/`module`/`types`/`exports` is actually inside the
   tarball.
3. Install into a consumer **outside the repo** (`os.tmpdir()`) whose only
   source for `@fams/*` — direct *and transitive* — is those tarballs, via a
   pnpm `overrides` block. No registry involved.
4. `import.meta.resolve()` every `exports` subpath there (honours the exports
   map + `import` condition).
5. `tsc --noEmit` over a consumer that imports every JS entry **and touches a
   real named symbol** from each, proving `types`/`exports.types`.
6. Runtime `import()` of every entry under Node + a jsdom global shim, asserting
   a non-empty export set. One documented exclusion:
   `@fams/v5-templates/map` (maplibre-gl + deck.gl at module scope; no WebGL in
   jsdom — it is a browser-only lazy entry by construction). It is still
   resolve-checked and type-checked.
7. Asset entries (CSS/JSON/fonts) exist and are non-empty.

Latest run: **7 packages, 20 entry points, all green.**

### Fixes this audit forced

- **`@fams/ui-kit` shipped an unreachable stylesheet.** `tsup` emits
  `dist/index.css` (1.8 kB — the bundled `@atlaskit/pragmatic-drag-and-drop-react-drop-indicator`
  styles, pulled in by `noExternal`). It was inside `files` but had **no
  `exports` entry**, so no external consumer could import it. Now exported as
  **`@fams/ui-kit/styles.css`**. → **Consumers must import it** (alongside
  `@fams/tokens` CSS) or the Kanban drop indicator renders unstyled.
  **Caveat, honestly:** nothing in this monorepo imports it yet either, so the
  in-repo surfaces still have the gap. Logged in `docs/BACKLOG.md`.
- **`@fams/v5-composer` shipped `blueprints/` unreachably** — in `files` but
  absent from `exports`, which an exports map makes inaccessible. Now
  `./blueprints/*`.
- **`@fams/tokens` had no `sideEffects`** declaration. Now `["*.css"]`.

Everything else (`main`/`module`/`types`, the `demo-kit` three-entry split, the
`v5-templates` `map` split) checked out as already correct.

---

## 5. Cross-repo consumption — `fams-v5-demo-environment`

`link:` is **kept as the default** and is not going anywhere until a registry is
live: local dev needs edit-and-see-it, and there is nothing to resolve versions
against. What the demo repo now has is a *switch*, not a rip-out:

```bash
node tools/ds-consumption.mjs --status                     # which mode am I in?
node tools/ds-consumption.mjs --mode link                  # sibling checkout (default)
node tools/ds-consumption.mjs --mode registry              # exact pinned versions
node tools/ds-consumption.mjs --mode registry --tarballs D  # the offline proof
```

`registry` mode writes **exact** versions (`"@fams/ui-kit": "0.9.0"` — no
caret, deliberately) into the root and `app/` manifests. `link` mode restores
the canonical `link:` specifiers. Neither installs; it prints the next command.

**The versioned path is proven, without a registry.** With `--tarballs`, the
pinned versions resolve from `pnpm pack` output through a pnpm `overrides` block
in `pnpm-workspace.yaml`. That is a *proof harness*, not the production path —
but it exercises the same hermetic machinery: exact versions, the full
transitive `@fams` graph resolved by version rather than by symlink, and a
lockfile with `--frozen-lockfile` passing. Verified end to end 2026-08-05:
`demo check` OK, 96 root tests, 27 app tests, `app build` green (identical to
the `link:`-mode baseline). Verdaccio was **not** used.

**Real difference the proof surfaced:** on the versioned path the demo repo
inherits `@vaadin/vaadin-usage-statistics` as its *own* transitive build-script
decision (via `@fams/v5-templates`' deck.gl stack), where `link:` had it covered
by the design system's `allowBuilds` policy. Its `pnpm-workspace.yaml` now
denies it explicitly in both modes, matching the DS verdict.

### `catalog:` / `file:` — what breaks for a consumer outside this monorepo

`packages/ui-kit/package.json` carries 14 `catalog:` version refs and
`packages/skeleton-kit/package.json` 7 (2 of those — `@tanstack/react-router`
and `@tanstack/react-query` — are declared **twice**, once in
`peerDependencies` and once in `devDependencies`; see the peer-dependency
contract below for why). `catalog:` is a pnpm-workspace-only protocol — it
resolves against **this repo's** `pnpm-workspace.yaml` `catalog` table and
means nothing anywhere else. pnpm also installs a `file:` dependency's own
`dependencies` **and peerDependencies aren't auto-installed by any
installer**, so a consumer who points at `@fams/ui-kit` or
`@fams/skeleton-kit` via `file:` fails on any *remaining* `catalog:`-pinned
plain `dependencies` with:

```
ERR_PNPM_SPEC_NOT_SUPPORTED_BY_ANY_RESOLVER: some-package@catalog:
```

It is not obvious from that error that the package itself is fine — it reads
as a broken package. **`link:` is required for source consumption until these
packages are published to a registry** (§ 1–2, still dormant): `link:`
symlinks the package into `node_modules` **without** installing the target's
own `dependencies` block, so an unresolvable `catalog:` ref there is never
touched. This is exactly why `fams-v5-demo-environment` above defaults to
`link:`, and why `registry` mode there writes exact pinned versions (no
`catalog:`, no `workspace:`) instead. Any other consumer — including a repo
vendoring this one via git subtree, outside the `fams-v5-demo-environment`
relationship entirely — hits the same failure and needs the same fix: `link:`,
not `file:`, until a real publish (§ 6) rewrites `catalog:`/`workspace:` to
resolvable ranges.

**Peer dependencies still need an explicit install.** `react`/`react-dom` and,
as of this doc, `@tanstack/react-router`/`@tanstack/react-query` are
`peerDependencies` of `@fams/skeleton-kit` (and of `@fams/v5-kit`, which sits
on top of it) — `link:`/`file:`/a real registry install all leave
`peerDependencies` for the consumer to satisfy themselves. That is
deliberate, not a gap: it is the only way a consumer's own copy of a
React-context-owning package is guaranteed to be the copy `@fams/skeleton-kit`
runs against. Full contract, the complete singleton list, and what an
external consumer must install: `packages/skeleton-kit/README.md` § Consuming
from another workspace (the canonical, single copy of this — see the note
just below).

### Consuming from another workspace (beyond `fams-v5-demo-environment`)

A consumer in a workspace of its own — e.g. vendoring this repo as a git
subtree, rather than the sibling-checkout relationship `fams-v5-demo-environment`
has with this repo — needs the `link:` treatment above, plus a React-context
singleton concern the demo repo doesn't hit (it shares this workspace's
`node_modules`, so it only ever sees one copy of anything already). Full
detail — the complete singleton package list, why a duplicate breaks
(`Invalid hook call` / a null hook dispatcher), and a copy-pasteable Vite
`resolve.dedupe` + `resolve.alias` block — lives in
`packages/skeleton-kit/README.md` § Consuming from another workspace, mirrored
by the reference implementation in `workshop/skeleton-example/vite.config.ts`.

---

## 6. Runbook — arming this for real

Preconditions: a registry exists, and you hold a publish credential for it.

1. **Choose the registry** (§ 2) and record the decision in
   `docs/knowledge-base/decisions.md`. Confirm the licence — hard rule 1.
2. **Set the switch locally** and dry-run:
   ```bash
   export FAMS_NPM_REGISTRY=https://<host>/<path>
   pnpm release:audit
   pnpm smoke:pack
   pnpm release:dry            # prints the resolved target registry per package
   ```
3. **Set the CI switch**: repository **variable** `FAMS_NPM_REGISTRY`, repository
   **secret** `FAMS_NPM_TOKEN`.
4. **Cut versions.** The packages sit at `0.9.0`. Decide whether the first
   published release is `0.9.x`, `0.10.0` or `1.0.0` — that is a public API
   commitment, not a mechanical step. Then:
   ```bash
   pnpm changeset && pnpm version-packages
   ```
   Review the bumps + CHANGELOGs and commit them.
5. **Publish**: dispatch `.github/workflows/release.yml` with `dry_run: false`,
   or locally `FAMS_NPM_TOKEN=… pnpm release`.
6. **Decide about tags.** `changeset publish` tags locally and does not push.
   Either push them yourself, or raise the workflow to `contents: write` and add
   an explicit `git push --follow-tags` step.
7. **Flip `fams-v5-demo-environment`** onto the versioned path:
   ```bash
   cd ../fams-v5-demo-environment
   node tools/ds-consumption.mjs --mode registry --version <published version>
   printf '@fams:registry=%s\n' "$FAMS_NPM_REGISTRY" >> .npmrc   # + a READ token
   pnpm install --no-frozen-lockfile
   pnpm demo check && pnpm test:all && pnpm --filter app build
   git add -A && git commit    # the lockfile is now hermetic — commit it
   ```
   Then update that repo's `README.md` § Design-system consumption and
   `CLAUDE.md` § Prerequisite, which still describe `link:` as the live mode.
8. **Update the docs that describe the old world**: `docs/ARCHITECTURE.md` § 7
   ("plan, not yet wired") and the resolved entries in `docs/BACKLOG.md`.

---

## 7. What is verified vs what is not

**Verified, with real command output (2026-08-05, pnpm 11.1.3, macOS):**

- The publish-surface audit passes over all 11 workspace manifests; the 7
  publishable ones are non-private with `publishConfig`, `license`, `files`,
  `exports`, `sideEffects` and a `prepublishOnly` guard; the 4 private ones are
  still private and still changeset-ignored.
- Dormant behaviour: `pnpm release` with the switch unset builds and publishes
  nothing and exits 0 with the banner.
- The `prepublishOnly` guard blocks `pnpm publish --dry-run` with the switch
  unset, and does **not** run on `pnpm pack`.
- `FAMS_NPM_REGISTRY=…` makes all 7 packages dry-run to that exact registry
  (`📦 <pkg>@0.9.0 → http://127.0.0.1:14873/`), the transient `.npmrc` is
  rendered and then removed, and `.npmrc` does not persist.
- Refusals: a non-URL, a non-http(s) URL, `registry.npmjs.org`, and a set
  registry with no `FAMS_NPM_TOKEN` are each rejected with a clean message.
- `pnpm smoke:pack`: 7 packages, 20 entry points — pack, protocol rewriting,
  tarball contents, outside-repo install, exports resolution, `tsc --noEmit`,
  jsdom runtime import, asset presence.
- The demo repo's versioned/hermetic consumption path, against local tarballs:
  `pnpm install --frozen-lockfile` clean, `demo check` OK, 96 + 27 tests, `app
  build` green.
- Both repos' full gates green after the vitest 3.2.7 alignment.

**NOT verified, and unverifiable until a registry exists:**

- **Any actual publish.** Nothing has been uploaded anywhere. No tag, no
  release.
- **Authentication.** The `//<host><path>/:_authToken=…` line rendered from
  `.npmrc.publish` is the standard npm/pnpm form, but it has never been
  exercised against a live registry. Some registries (GitHub Packages) also want
  `always-auth=true` (included) and are picky about the scope→owner mapping.
- **`changeset publish` itself.** Only `pnpm publish --dry-run` per package has
  been run. changesets' "which versions are already published" check calls
  `npm info` against the registry, which cannot be exercised offline.
- **Registry-side behaviour of `access: "restricted"`**, scope creation, and
  whether the chosen host accepts a 450 kB `@fams/tokens` tarball.
- **A real registry install in the demo repo.** The versioned path was proven
  against tarballs via `overrides`; a live registry adds auth, `@fams:registry`
  resolution and integrity-hash provenance that tarballs do not.
- **Verdaccio.** Not installed, not run. The tarball route was sufficient and
  needed no service.
- The CI lane itself has **never executed** — it cannot get past `preflight`
  without the repository variable.
