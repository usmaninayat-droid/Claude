# Backlog — resolved records

Everything that has left [`../BACKLOG.md`](../BACKLOG.md), newest first. Kept in
full so the *why* survives the item leaving the open list; `BACKLOG.md` itself
stays a list of what is still open.

Entries marked **(working tree)** were resolved in an uncommitted working tree
and therefore carry no commit hash. Entries with hashes were resolved on
`feature/backlog-burndown` (2026-07-23) — the full execution ledger is
`.superpowers/sdd/progress.md` in each repo.

Both repos' resolved records live here; the demo repo's
[`../../../fams-v5-demo-environment/docs/BACKLOG.md`](../../../fams-v5-demo-environment/docs/BACKLOG.md)
points at this file.

---

## 2026-08-05 — overnight session (working tree, uncommitted)

### Kanban denied-move announcement — root-caused and fixed

**(working tree)** `ui-kit`'s `KanbanCard` no longer announces an optimistic
"Moved …" on its keyboard "Move to…" menu when the v5-tier move is denied, and
the `v5-templates` race workaround is gone.

Root-cause fix: a new `ui-kit` board-level hook
`KanbanBoardProps.formatMoveAnnouncement?: (move: KanbanMoveAnnouncement) =>
string | null` (+ exported `KanbanMoveAnnouncement` type), called synchronously
right AFTER `onCardMove` so the board's owner already knows the outcome;
returning `move.defaultMessage` keeps today's wording, any other string replaces
it, and `null` announces nothing. Callers that don't pass it are byte-for-byte
unchanged (`docs/API-GRAMMAR.md` § 5 `format<Noun>` — derive a plain value,
optional with a sensible default). `KanbanView` wires it and returns `null` for
every move it didn't commit (denial, unknown destination, same-stage no-op),
reading the outcome its own `handleCardMove` just recorded rather than
re-evaluating `canMove`; `KanbanCardView` needed no change (the hook is
board-level, where `onCardMove` already lives). `announce-denied.ts`'s macrotask
defer is deleted — the helper stays as the single denial-announce channel, now a
plain synchronous `announce()`.

**Found while fixing:** the old defer could never have worked in a built app
anyway. `ui-kit`'s dist BUNDLES its own copy of the live-region module
(`tsup.config.ts`'s `noExternal: [/^@atlaskit\/pragmatic-drag-and-drop/]`), so
ui-kit's `announce()` and `v5-templates`' drive two separate module instances
with two separate `role="status"` nodes; cross-instance neither call can cancel
the other's pending timer, so the false "Moved …" success was still delivered in
its own live region alongside the denial. Suppression at the source was the only
fix.

**(working tree)** The drop indicator
(`@atlaskit/pragmatic-drag-and-drop-react-drop-indicator`) in `ui-kit`'s
`KanbanCard.tsx` now renders in FAMS tokens instead of the library's default
Atlassian blue. `DropIndicator` exposes no color prop (only `appearance:
'default' | 'warning'`); per the installed package's source (`dist/esm/presets.js`
+ `internal/line.js`) its stroke color comes from the inherited CSS custom
property `--ds-border-selected` (Atlassian's own hex only as a `var()` fallback),
so the card declares `[--ds-border-selected:var(--color-primary)]` — the
library's supported theming seam, no raw hex (`pnpm lint:tokens` clean). Stroke
width is left on the library default: `@fams/tokens` carries no border-width
token, and minting one for a dependency's indicator is a design decision, not a
drive-by.

**(working tree)** The recommended pre-production smoke test is now an automated
suite — `packages/v5-templates/src/views/kanban/denied-move-live-region.test.tsx`,
the only one that mocks NOTHING: real live-region module, real `role="status"`
nodes, real 1000ms `announceDelay`, real timers. It asserts a denied keyboard
move ends with the denial in the live region and no `Moved …` success in ANY
live region on the page (the union matters — see the two-instance finding
above), plus a positive control that an allowed move still announces its
success, so the guarantee can't be met by simply never announcing. Verified to
actually catch the regression: with the suppression branch disabled in ui-kit's
built dist the suite fails with both messages present — `"Move not allowed: this
card can't move to Won. | Moved Hooli — Enterprise rollout to Won."`.

> Left open: post-commit denials are still unsuppressed, and the denied-move UX
> itself is still a pragmatic default pending UX review. Both are in
> `BACKLOG.md`.

### Storybook 10 installed

**(working tree, 2026-08-05 — founder reversed the earlier "not installed" call)**
Storybook 10 is installed as `workshop/storybook` (`@fams/storybook`, private,
changeset-ignored), a sibling workspace package to `workshop/showcase`. It is
**additive** — the showcase (port 6100) remains **the** primary workshop vehicle
and still owns `registry.json`, the DoD checklist, the route smoke and the
visual-regression suites.

- **Installed** (all MIT, verified `pnpm info <pkg> license version` 2026-08-05,
  all pinned in the `pnpm-workspace.yaml` `catalog:` block and documented in
  `docs/LIBRARIES.md`): `storybook@^10.5.6`, `@storybook/react-vite`,
  `@storybook/addon-docs`, `@storybook/addon-a11y`, `@storybook/addon-themes` —
  all locked to the same `^10.5.6` line because Storybook requires core and
  addons to match. React + Vite + TypeScript. **No pinned version moved**:
  `@storybook/react-vite` peers accept `vite@^5||^6||^7||^8` and `react@^19`, so
  the repo's Vite 6 / React 19 pins satisfied it as-is.
- **Wired to the real DS**: stories import `@fams/ui-kit` built `dist` via the
  package `exports` map, and `.storybook/preview.css` imports the same
  `@fams/tokens` entry points as `workshop/showcase/src/styles.css`
  (`theme.css`/`animations.css`/`fonts.css`/`tenants.css` + the `@source` scan of
  `packages/ui-kit/src`). `.storybook/main.ts`'s `viteFinal` mirrors the
  showcase's `vite.config.ts` (Tailwind v4 plugin, React dedupe/alias,
  `optimizeDeps.exclude` for the linked workspace packages).
- **Theming**: explicit light/dark via `withThemeByDataAttribute` writing
  `data-theme="light"|"dark"` on `<html>` — the same explicit mechanism as the
  showcase toggle (decision #2, ruling ⑤), never media-query-only. Toolbars for
  `data-tenant` (rule 6) and `lang`/`dir` (rule 4) are wired too.
- **No SaaS** (hard rule 1): Chromatic and every other hosted addon rejected;
  Storybook's opt-out telemetry AND crash reporting are both disabled in
  `.storybook/main.ts`.
- **CI**: the required `ci.yml` gate order is untouched (install → build tokens →
  build → typecheck → lint → test → axe). `storybook build` is **not** a blocking
  gate; a separate non-blocking `.github/workflows/storybook.yml` lane (modelled
  on the existing optional `visual.yml`) builds it on `workflow_dispatch` or the
  `storybook` PR label and uploads the static output as an artifact. The
  package's `typecheck` *does* get picked up by the existing `pnpm typecheck`
  turbo run, which is intentional and free.
- **Verified**: `pnpm install` (clean, `--frozen-lockfile` re-runs "Already up to
  date"), `pnpm --filter @fams/storybook build` (Storybook static build
  succeeds), `pnpm turbo run typecheck` (15/15), `pnpm lint` (7/7 +
  `lint:tokens` + llms check), `pnpm lint:tokens`. All 12 stories additionally
  smoke-rendered headless in BOTH themes with zero console errors and the token
  background verifiably switching (`rgb(249,250,251)` → `rgb(16,24,40)`).
- **Decisions taken**: (a) port 6300, following the 6100/6200 workshop
  convention; (b) turbo's global `build` task gained `storybook-static/**` as an
  output (turbo tasks here are global, not per-package, so this is the consistent
  registration — `storybook-static` was already in `.gitignore`); (c) no eslint
  config for the package, matching `workshop/showcase` (lint is a `packages/*`
  concern; `scripts/lint-tokens.mjs` and `scripts/build-llms.mjs` do not scan
  `workshop/`, so stories are outside the raw-hex/px and llms.txt gates by
  existing design).

> Left open: story coverage is a deliberate proof set, `@storybook/addon-vitest`
> was deliberately skipped, and port 6300 collides with the demo app. All three
> are in `BACKLOG.md`.

### Publishing flow — built, tested, deliberately dormant

**(working tree, 2026-08-05 — founder approved setting publishing up)** The old
item read "packages are `private: true`, consumed via `workspace:*`/`link:`; flip
when a registry exists". The mechanical half is now done and provable; the
decision half is explicitly still open. Full doc + human runbook:
**`docs/PUBLISHING.md`**.

- **Publishable (7), no longer `private: true`:** `@fams/tokens`, `ui-kit`,
  `skeleton-kit`, `demo-kit`, `v5-composer`, `v5-templates`, `v5-kit`. Each
  gained `license: "UNLICENSED"`, `publishConfig: { access: "restricted" }` and a
  `prepublishOnly` guard. **Private forever (4):** the monorepo root,
  `@fams/showcase`, `@fams/storybook`, `@fams/skeleton-example` — they are apps
  that consume the packages, not distributables, and they stay in
  `.changeset/config.json`'s `ignore` list. `pnpm release:audit`
  (`scripts/publish-config.mjs`) fails in **both** directions, so a `workshop/*`
  package cannot quietly become publishable.
- **Registry-agnostic, one switch:** the `FAMS_NPM_REGISTRY` env var (repository
  *variable* in CI) + a `FAMS_NPM_TOKEN` secret. No vendor URL exists anywhere in
  the repo, and `resolveRegistry()` **refuses** registry.npmjs.org outright.
- **Design forced by measured behaviour** (pnpm 11.1.3 / npm 11 /
  `@changesets/cli` 2.31.0, all reproduced — the matrix is in
  `docs/PUBLISHING.md` § How the switch actually works and
  `scripts/guard-publish.mjs`): (a) `publishConfig.registry` has **absolute**
  precedence in `pnpm publish` — it beats a scoped `@fams:registry`, `--registry`
  and every env var — so putting the switch (or a placeholder) there **disables**
  the switch; `publishConfig` therefore carries `access` only, and the audit
  rejects a `registry` key. (b) `pnpm publish` ignores `npm_config_*` env vars
  entirely, *including* the `npm_config_@fams:registry` that changesets sets for
  its child; only a workspace-root project `.npmrc` or an explicit CLI flag moves
  it — hence the **transient** `.npmrc` rendered from `.npmrc.publish` by
  `scripts/release.mjs` and removed in a `finally` (no committed `.npmrc`, so no
  `Failed to replace env in config` warning on every install, and the token never
  persists). (c) `npm publish` inside `packages/<x>/` does not read the
  workspace-root `.npmrc` at all — so the "never publish by accident" guarantee
  is a **`prepublishOnly` lifecycle script**, the one mechanism that fires for
  npm, pnpm and changesets alike, and which verifiably does **not** run on
  `pnpm pack`.
- **Scripts:** `pnpm release` (audit → build → `changeset publish`),
  `release:dry`, `release:audit`, `smoke:pack`. The old `"release": "turbo run
  build && changeset publish"` one-liner is replaced by `scripts/release.mjs`.
- **CI:** new `.github/workflows/release.yml` — `workflow_dispatch` (with
  `dry_run` defaulting to **true**) or a pushed `v*` tag, gated by a `preflight`
  job that fails with a `::error` annotation + step summary when the repository
  variable is missing. **The locked `ci.yml` gate order is untouched** (install →
  build tokens → build → typecheck → lint → test → axe); publishing never runs on
  a PR or a push to `main`. The lane is `contents: read` on purpose —
  `changeset publish` tags locally and never pushes, and tag-pushing is an open
  call.
- **Extended smoke test:** phase 1 §2's ad-hoc `pnpm pack` + outside-repo import
  check (PROGRESS.md Task 2, ui-kit + v5-templates only) is now permanent and
  covers **all 7 packages and all 20 `exports` entry points**,
  `@fams/v5-templates/map` included — `scripts/pack-smoke-test.mjs`
  (`pnpm smoke:pack`). Seven stages: pack → tarball manifest hygiene (no
  `private`, every `workspace:`/`catalog:` protocol rewritten, every
  manifest-referenced path actually inside the tarball) → install in a consumer
  **outside the repo** resolving `@fams/*` only from tarballs (direct +
  transitive, via pnpm `overrides`) → `import.meta.resolve()` every subpath →
  `tsc --noEmit` importing every JS entry *and touching a real named symbol* from
  each → runtime `import()` under Node + a jsdom shim → asset entries non-empty.
  Wildcard exports are expanded from the real files, so it grows by itself. All
  green.
- **Three real packaging bugs the audit caught and fixed:** (1) `@fams/ui-kit`
  emits `dist/index.css` (1.8 kB — the bundled
  `pragmatic-drag-and-drop-react-drop-indicator` styles) which was inside `files`
  but had **no `exports` entry**, so no external consumer could ever import it;
  now exported as `@fams/ui-kit/styles.css`. (2) `@fams/v5-composer` shipped
  `blueprints/` in `files` but absent from `exports`, which an exports map makes
  unreachable; now `./blueprints/*`. (3) `@fams/tokens` had no `sideEffects`
  declaration; now `["*.css"]`. Everything else (`main`/`module`/`types`,
  demo-kit's three-entry split, v5-templates' `map` split) was already correct.
- **Verified with real output** (2026-08-05, macOS, pnpm 11.1.3): audit passes
  over all 11 manifests; `pnpm release` with the switch unset builds/publishes
  nothing and exits 0 with the banner; the `prepublishOnly` guard blocks
  `pnpm publish --dry-run` and does not run on `pnpm pack`; with the switch set
  all 7 packages dry-run to *that* registry (`📦 <pkg>@0.9.0 →
  http://127.0.0.1:14873/`) and the transient `.npmrc` is created then removed;
  bad-URL / non-http / npmjs.org / missing-token are each refused cleanly;
  `pnpm smoke:pack` green; and the full DS gate (`install --frozen-lockfile`,
  `turbo run build`, `turbo run typecheck`, `lint`, `lint:tokens`, `test`,
  `test:axe`) green afterwards. Verdaccio was **not** installed or run — the
  tarball route made it unnecessary. `docs/PUBLISHING.md` § 7 is the
  authoritative verified-vs-unverified list.

> Left open: the six human decisions (registry, credentials, first version, first
> publish, tag policy, flipping the demo repo) and the unimported
> `@fams/ui-kit/styles.css`. All in `BACKLOG.md`.

### vitest patch drift across the two repos

**(working tree)** The vitest *patch* drift across the two repos' lockfiles (DS
`3.2.6` vs demo `3.2.7`, both `^3`) is gone — **both are now on `3.2.7`**, the
newest 3.x (`pnpm info vitest versions`, 2026-08-05; vitest 4 is a deliberate
non-move, the line stays `^3`). Fixed at the pinning mechanism, not by a one-off
dedupe: the DS `catalog:` entry moved from a bare `^3` to `^3.2.7`
(`pnpm-workspace.yaml`, with the rationale inline), which is what every DS
package resolves through. `fams-v5-demo-environment` has no shared catalog with this repo, so
it pins `^3.2.7` directly in its root + `app/` `package.json`; the catalog
comment and `docs/LIBRARIES.md` both say to keep the two in step. Verified:
`grep -oE '^  vitest@[0-9.]+' pnpm-lock.yaml | sort -u` yields exactly
`vitest@3.2.7` in BOTH repos, and both full test suites pass afterwards (DS 10/10
turbo test tasks + axe sweep; demo 96 root + 27 app tests).

### Demo coverage — the two genuine DoD gaps, plus reverse enforcement

**(working tree)** The two components that were exported but demoed nowhere are
now demoed, and the hole that let them through is closed by an automated check.

- `DropdownMenuGroup` / `DropdownMenuPortal` are covered by a new **"Grouping &
  portaling"** section inside the existing `DropdownMenuDemo` — deliberately not
  a new registry family, per DoD #7 (sub-parts of a compound component are
  covered by a section in their parent's demo).
- `DataTablePagination` gained a dedicated section **and** a `PropsTable` inside
  `DataTableDemo`; while transcribing it, DataTable's own missing pagination
  props were added to *its* `PropsTable` too.
- **`scripts/check-demo-coverage.mjs`** now enforces the REVERSE direction —
  every renderable component exported from `packages/ui-kit/src/index.ts` must be
  rendered somewhere under `workshop/showcase/src/`. Wired into
  `scripts/test-registry.mjs` as **assertion 5**, so it runs inside root
  `pnpm test` and is therefore already part of the locked CI gate order — no new
  job, no gate-order change.
  - Classification is **shape-based, never name-based** (JSX-returning
    function/arrow, `forwardRef`/`memo` factory, namespace pass-through ⇒
    component; `cva(…)` ⇒ variants; `use*` ⇒ hook; non-JSX function ⇒ util;
    literal/`as const` ⇒ constant). An export the script cannot classify is a
    **hard failure**, not a silent skip.
  - The `COVERED_BY_PARENT` allowlist (9 entries) **names the covering parent for
    each entry** and fails on a stale entry (now demoed, or no longer exported),
    so it can't rot into blanket silence.
- **Current state (verified by running it):** 201 renderable component exports,
  192 demoed directly, 9 covered via parent, **0 uncovered**; 18 non-component
  value exports skipped (15 variants, 2 functions, 1 constant).

> Left open: extending the reverse check beyond ui-kit, the unenforced
> import⇒rendered premise (`workshop/showcase` has no lint script), unlinted
> `scripts/*.mjs`, route-smoke flakiness, `DataTablePagination`'s missing
> landmark role, and the unexported DataTable sub-parts. All in `BACKLOG.md`.

### EntityProfile controlled-mode divergence (earlier session)

**(working tree)** `EntityProfile`'s controlled mode (`activeTabId`/`onTabChange`)
was found to silently override the caller's `activeTabId` without calling
`onTabChange` when the active tab loses visibility
(`packages/v5-templates/src/entity-profile/EntityProfile.tsx`, the `activeTab`
fallback to `visibleTabs[0]?.id`) — the uncontrolled (`internalTab`) path handled
this correctly via `handleTabChange`, but the controlled path's silent
re-derivation never notified the caller.

Decision taken: **notify** — a controlled component must never silently diverge
from the value its owner passed. Added a `useEffect` (fires post-render, never
during render) that calls `onTabChange(activeTab)` whenever the controlled
`activeTabId` no longer matches a visible tab, so the fallback the render path
already computes is also reported back to the owner. Guarded purely by the
effect's dependency array (`[activeTabId, activeTab, onTabChange]`) — it only
re-fires when one of those actually changes, so it can't loop or refire for a
state that hasn't moved, and it self-quiets once the owner's `activeTabId`
converges to match. When no tab is visible at all, `activeTab` is `undefined` and
the effect stays silent (nothing to notify with). The uncontrolled path is
untouched.

Tests added in `packages/v5-templates/src/entity-profile/EntityProfile.test.tsx`:
controlled active tab loses visibility → `onTabChange` called once with the
fallback id and the rendered tab matches; no spurious `onTabChange` when the
controlled tab stays visible across a rerender; no-visible-tabs case
(`companiesConfig`) never calls `onTabChange`.
`pnpm --filter @fams/v5-templates test` (23 files, 172 tests, includes the axe
sweep), `typecheck`, and `lint` all green.

### fams-v5-demo-environment — the `link:` ↔ pinned-versions switch

**(working tree, 2026-08-05)** The sibling `link:` dependency on the design-system
packages is non-hermetic — previously "Deferred (founder)" pending a published
registry. **`link:` was deliberately NOT ripped out** (local dev depends on it and
no registry is live); instead the repo gained a documented, tested **switch**:
`node tools/ds-consumption.mjs --status | --mode link | --mode registry`.

- `link` stays the **default** and is unchanged. `registry` mode rewrites all 8
  `@fams/*` specifiers (root `package.json` + `app/package.json`) to **exact
  pinned versions** — `"@fams/ui-kit": "0.9.0"`, no caret, so the design system
  moves only on a deliberate bump — and drops the sibling-checkout assumption.
  One command each way; the tool never installs, it prints the next step.
- **The versioned path is PROVEN without a registry.** `--tarballs <dir>` resolves
  the pinned versions from `pnpm pack` output (produced by the DS repo's
  `node scripts/pack-smoke-test.mjs --tarballs-only <dir>`) through a pnpm
  `overrides` block in `pnpm-workspace.yaml` — direct *and* the whole transitive
  `@fams` graph (`@fams/ui-kit` → `@fams/tokens` resolved by version, not by
  symlink). Verified 2026-08-05 in that mode: `pnpm install --frozen-lockfile`
  clean, `pnpm demo check` OK, **96** root tests, **27** app tests,
  `pnpm --filter app build` green — identical to the `link:`-mode baseline; then
  switched back to `link` and re-verified. The overrides block is a
  clearly-marked **proof harness**, auto-removed by `--mode link`, and `--status`
  warns loudly while it is active. Verdaccio was not used.
- **Real difference the proof surfaced** (and fixed): on the versioned path the
  demo repo inherits `@vaadin/vaadin-usage-statistics` as its **own** transitive
  build-script decision — reached via `@fams/v5-templates`' deck.gl stack — where
  `link:` had it covered by the design system's own `allowBuilds` policy, so
  `pnpm install` stopped with `ERR_PNPM_IGNORED_BUILDS`. `pnpm-workspace.yaml` now
  denies it explicitly (same verdict and wording as the DS repo) in both modes.

> Left open: the actual flip, which is blocked on the registry decision. In
> `BACKLOG.md`.

---

## 2026-07-23 — `feature/backlog-burndown`

### Tokens / build

- **Resolved** (`2183043`, `8d8cd03`): dark-value CSS naming parity now has a real
  assertion (`packages/tokens/test/theme-parity.test.js`) instead of hand-matching
  with no completeness check. Along the way it caught a real bug —
  `buildDarkModeCss` emitted flat `--fams-color-<key>` names for `color.dark.*`
  overrides, but `tokens.css`'s stock formatter full-path-joins `*.default`-collapsed
  families (e.g. `color.sidebar.default` → `--fams-color-sidebar-default`), so the
  sidebar dark override landed on an unused variable name and never actually
  applied. Fixed generically via a computed `collapsedDefaultGroups()` set (keyed
  off `core.tokens.json`, not a hardcoded `'sidebar'` case) so any future
  `*.default` family stays covered. It also left behind the 7 remaining
  `TODO: probable gap` allowlist entries — see `BACKLOG.md`.
- **Resolved** (`2bbe94e`): `packages/tokens`'s `test` turbo task now depends on
  its own `build`, not `^build` (deps' build).

### skeleton-kit

- **Resolved** (`7e6a6cc`, absorbed into `288c673`): `navEntry.path` ↔
  `createLazyRoute('/path')` drift now fails loudly via a dev-time guard instead
  of silently at navigation time.
- **Resolved** (`1b01077`): `defaultTheme`'s override of a stored theme choice is
  now an explicit config axis — `defaultThemeMode: 'force' | 'respect-stored'`
  (`packages/skeleton-kit/src/theming.ts`). The default is still `'force'`
  (today's pre-existing behavior, unchanged); whether an app *should* be able to
  override a returning user's stored choice remains open — see `BACKLOG.md`.

### v5-composer

- **Resolved** (`8463c14`): `store.ts`'s `genId()` counter is now scoped to the
  store instance rather than module-level.
- **Resolved** (`c6add14`): `compileFieldSet`'s cache now has a bounded,
  hand-rolled LRU eviction policy instead of no eviction at all.

### v5-templates

- **Resolved** (`aaa90cf`, `3d7215a`, `cefedb5`, `55694a8`): the whole
  `KanbanCardView`/two-stacks item. `ui-kit`'s `Kanban`/`KanbanCard` and
  `v5-templates`' `KanbanCardView`/`KanbanColumnView`/`KanbanView` all now run on
  `@atlaskit/pragmatic-drag-and-drop` — the hand-rolled `@hello-pangea/dnd` stack
  is gone, and `KanbanCardView` actually composes `ui-kit`'s `KanbanCard`
  (badges/coverImage/extra/footerEnd/size/selected all reach the real pipeline
  Kanban view, not just the showcase demo) instead of duplicating it (`aaa90cf`).
  The card model now carries the raw record through instead of reconstructing one
  from derived cells (`3d7215a`). A denied move now gives real feedback instead of
  being a silent no-op: `onMoveDenied` callback + a polite (`role="status"`)
  live-region announcement, originally deferred one macrotask past `ui-kit`'s own
  optimistic "Moved…" announce (`cefedb5`, race-condition fix in `55694a8`) — that
  defer was superseded on 2026-08-05, see above.
  This also closes `docs/phase-2-tickets.md` § KANBAN-DND in full: the ui-kit tier
  was the last remaining half and it is done.
- **Resolved** (`da6959b`): `MultiReference` test fixture added to
  `packages/v5-templates` (fixture + read-render coverage).
- **Resolved** (`fda10f6`, `38a6e7e`, `918a719`, `6890f3f`): all four Task-2.3
  re-verify items were real and are now fixed — the vacuous un-minimize/restore
  assertion in `useDetailStack` now actually asserts; `CreationSheet`'s
  `FormSheet`-bypass rationale is documented; the inert `useMemo` in
  `EntityProfile`'s tab merge is dropped; and privilege revoke now falls back to
  the first visible tab instead of leaving a dangling active tab.
- **Resolved** (`e698153`, `3543013`): `h-[640px]` in
  `workshop/showcase/src/demos/gate-demo/GateDemo.tsx` replaced with `h-160` (an
  initial `h-screen` swap was reviewed as a regression risk and corrected to
  `h-160`; net diff is `h-[640px]` → `h-160`).
- **Resolved** (`7e13003`): privilege reactivity (`v5-kit`) now also tests the
  revoke direction for `usePrivilege`/`Privileged` (previously grant-direction
  only).

### Accessibility

- **Resolved** (`9aa6a33`): `@fams/demo-kit/console` `DemoConsole` now has a real
  focus trap and focus-restore-on-close via a Base UI dialog primitive, instead of
  only claiming `aria-modal="true"`.

### CI / infra

- **Resolved** (demo repo `d677867`): the vitest major split across the linked
  graph is gone — everything is aligned on the `^3` line already used by app + DS
  catalog. (The remaining patch drift was closed 2026-08-05, see above.)
- **Resolved** (`962359d`, fix `1e400f8`): pnpm setup mechanism unified to
  `pnpm/action-setup` across workflows (a first pass also changed CI caching
  behavior; review flagged it as scope creep and the fix restored original
  caching, so the net diff is the corepack → `pnpm/action-setup` swap only).

### fams-v5-demo-environment tooling

- **Resolved** (`97893e1`): `demo check` now validates ops files against
  `tools/schemas/OpsFile.schema.json` for real — wired via `ajv` (MIT,
  `tools/lib/ops-schema.mjs`), alongside the existing shape/duplicate-opId checks
  and the resolver's stable-id validation. The schema was previously
  documentation-only.
- **Resolved** (`0183338`): `msw` `baseUrl` rationale in
  `packages/demo-kit/README.md` is crisper now.

## 2026-08-13 — CLAUDE.md re-evaluation session

- **Resolved** (uncommitted, this session): **Storybook moved off port 6300 → 6400.**
  `workshop/storybook/package.json` `dev`/`preview` now use `-p 6400`; root
  `CLAUDE.md` repo-structure entry, root `README.md` port table and
  `workshop/storybook/CLAUDE.md` updated. The demo app keeps 6300 (it predates
  Storybook). Was: "Storybook and the demo app both claim port 6300."
- **Resolved earlier** (`23441d0`, recorded now): the demo repo's
  `ticketing-kanban` `test.fixme` — `toModuleNode()` now derives views via
  `resolveModuleViews`; all 24 visual-matrix shots are real. The stale claims in
  that repo's `CLAUDE.md`/`app/README.md` were removed this session.
