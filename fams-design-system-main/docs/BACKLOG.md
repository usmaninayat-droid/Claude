# Backlog

**What is still open.** Everything already resolved has moved to
[`history/backlog-resolved.md`](history/backlog-resolved.md) — nothing was
deleted, only relocated, so this file reads as a worklist rather than a ledger.

Last reconciled: **2026-08-05**, after the overnight session that closed the
Kanban denied-move a11y bug, installed Storybook, built the publishing flow,
aligned vitest, and added reverse demo-coverage enforcement. That work is
**uncommitted** — items it left behind are tagged accordingly, and resolved
records carry no commit hashes.

Every open item states **what it is**, **why it matters**, and **the next
concrete action**, and sits in exactly one of three sections:

| Section | Meaning |
| --- | --- |
| [Open engineering work](#open-engineering-work) | Someone can pick it up and do it. No decision blocks it. |
| [Blocked on a founder / human decision](#blocked-on-a-founder--human-decision) | The mechanics are understood; a person must choose before code moves. |
| [Deliberately not doing](#deliberately-not-doing) | Considered and declined, with the rationale — so it is not re-litigated by accident. |

A fourth section, [Known characteristics](#known-characteristics-not-bugs),
records accepted behaviour that looks like a bug in a bug report but is not one.

Other backlogs, not duplicated here:

- `docs/matrix-backlog.md` — the Ben-vs-Shaheer component gap matrix.
- `docs/phase-2-tickets.md` — `KANBAN-DND`, **closed 2026-07-23** (both tiers now
  on `@atlaskit/pragmatic-drag-and-drop`). Kept for the scoping evidence only.
- `../fams-v5-demo-environment/docs/BACKLOG.md` — the demo repo's own summary + pointer.

---

## Open engineering work

### ui-kit / v5-templates

**Post-commit Kanban denials are still announced as successes.**
`KanbanBoardProps.formatMoveAnnouncement` (added 2026-08-05) suppresses ui-kit's
optimistic "Moved …" for every move `KanbanView` did not commit — but only for
denials it knows about at that moment. When an app's `onMove` **accepts** the move
and only its guarded write then rejects it
(`packages/v5-templates/src/renderers/v5-module-renderers.tsx`'s catch sites),
`KanbanView` has already counted the move as committed by the time ui-kit asks
for the announcement, so the denial lands alongside a false success. *Why it
matters:* a screen-reader user is told the move succeeded when it did not — the
exact class of bug the 2026-08-05 work existed to kill, just one layer further
out. *Next action:* add a commit-outcome signal to `KanbanViewProps.onMove` (e.g.
allow it to return/resolve a rejection) so `KanbanView` can retract, and thread
it into the `formatMoveAnnouncement` decision. This is a **public contract
change** on `v5-templates`, hence out of scope for the fix that found it; it is
documented as `KNOWN LIMIT` in `KanbanView`'s `formatMoveAnnouncement` JSDoc.
Regression cover already exists for the pre-commit case
(`packages/v5-templates/src/views/kanban/denied-move-live-region.test.tsx`) and
is the natural place to extend.

**`DataTablePagination` has no landmark role or accessible name.**
`packages/ui-kit/src/composites/DataTablePagination.tsx` labels its individual
buttons (`aria-label="Previous page"` / `"Next page"`) but the control as a whole
is an unlabelled `div`. *Why it matters:* it is now demoed as a standalone
section in `DataTableDemo` (2026-08-05), so consumers will legitimately use it on
its own, and a pagination control is the textbook case for a labelled `<nav>`.
*Next action:* render it as `<nav aria-label="Pagination">` (or accept a
`label` prop with that default) and add the fixture to
`packages/ui-kit/src/a11y.axe.test.tsx`. This is a small **component API change**,
so treat it as one — DoD items 1–9, not a drive-by.

### showcase / docs

**`KanbanDemo.tsx` documentation is stale from the pdnd migration.**
`workshop/showcase/src/demos/KanbanDemo.tsx` still tells readers the board is
"built on `@hello-pangea/dnd`" (line 134 summary), that ordering is "Required by
`@hello-pangea/dnd`" (line 431 `PropsTable`), and that keyboard DnD works via
"Space to lift a card, arrow keys to move it, Space to drop, Escape to cancel"
(lines 139 and 517, Accessibility list). None of that is true: `@hello-pangea/dnd`
was removed from ui-kit on 2026-07-23 and `@atlaskit/pragmatic-drag-and-drop` has
**no built-in keyboard DnD** — the keyboard path is the "Move to…" card menu.
*Why it matters:* the showcase is the authoritative "does this work and how do I
use it" surface (`docs/BOUNDARIES.md` § Governance); it is currently promising an
a11y affordance that does not exist. Pre-existing, discovered 2026-08-05.
*Next action:* rewrite those four passages against the real implementation
(`packages/ui-kit/src/composites/Kanban.tsx` / `KanbanCard.tsx`), including the
"Move to…" menu and the new `formatMoveAnnouncement` hook. While in there, fix
the same stale phrase in `workshop/showcase/src/demos/V5KanbanViewDemo.tsx:56`
("ui-kit's legacy @hello-pangea Kanban") — the distinction it draws is still
valid, the library name is not.

**`workshop/showcase` has no lint script, so the demo-coverage premise is
unenforced.** `scripts/check-demo-coverage.mjs` reads coverage as *"the component
is value-imported by a file under `workshop/showcase/src/`"*, which is only
equivalent to *"it is rendered"* if unused imports cannot survive. That is
normally guaranteed by lint — but `workshop/showcase/package.json` has no `lint`
script and no eslint config (a deliberate decision, mirrored by
`workshop/storybook`: lint is a `packages/*` concern). *Why it matters:* today
nothing stops a demo file from importing a component and never rendering it,
which would satisfy the check while leaving the component undemoed — the precise
hole the check was built to close. *Next action:* pick one — (a) add eslint + a
`lint` script to `workshop/showcase`, which also brings ~200 demo files under the
Radix-ban and logical-properties rules for the first time (expect a real cleanup
pass, and note that root `pnpm lint` is a per-package turbo run so it would join
automatically); or (b) tighten the check to require a **JSX-position** reference
rather than any value import, which needs no new lint surface. (a) is stronger,
(b) is cheaper and self-contained.

**`scripts/*.mjs` are entirely unlinted.** Root `pnpm lint` is a per-package turbo
run, and `scripts/` belongs to no package. *Why it matters:* that directory now
holds gate-critical logic — `test-registry.mjs`, `check-demo-coverage.mjs`,
`publish-config.mjs`, `guard-publish.mjs`, `release.mjs`, `pack-smoke-test.mjs`,
`lint-tokens.mjs`, `build-llms.mjs` — and none of it is type- or lint-checked.
*Next action:* add a root-level eslint pass over `scripts/**/*.mjs` (Node/ESM
config, no React rules) wired into `pnpm lint` alongside `lint:tokens`.

**Route smoke is flaky under parallel CPU load.**
`pnpm --filter @fams/showcase e2e` family routes in the `data` group time out at
30 s cold but pass in ~2 s warm. *Why it matters:* it is a local/pre-merge gate;
a flaky gate gets ignored, and then stops catching anything. *Next action:* warm
the dev server before the suite (a preflight request to one route in each group),
or raise the family-route timeout specifically. Prefer warming — raising the
timeout hides the cold-start cost rather than removing it.

**DataTable sub-parts named in `CLAUDE.md` rule 12 are not exported.**
`DataTableColumnsMenu`, `DataTableSummaryRow` and `DataTableVirtualBody` are cited
in rule 12 as evidence of the decomposition but are not in
`packages/ui-kit/src/index.ts`. *Why it matters:* nothing is broken today, but the
moment any of them is exported the new reverse coverage check will fail it as
undemoed. *Next action:* nothing now — this is a **watch item**. If one is ever
exported, either give it a section in `DataTableDemo` (DoD #7's sub-part rule) or
add it to `COVERED_BY_PARENT` naming `DataTable` as the covering parent.

### Cross-repo / infra

**DS-bypass cleanup in the demo app (audit 2026-08-13): move the last hand-rolled
visuals out of `fams-v5-demo-environment/app/src/demo/` into the DS.** The demo
app is otherwise DS-clean (no hex, no arbitrary values, no physical utilities,
no radix/cva imports), but five profile-tab/settings surfaces still hand-roll
markup that rule zero (that repo's CLAUDE.md v2) now forbids. Each item is
DS-first: build/extend the component here, rebuild, then swap the app's markup
for the import.

1. `profile-tabs.tsx:31-40` AssignmentsTab hand-builds `<li>` rows — replace
   with `@fams/ui-kit` `ListRow` (+ `Stack`).
2. `profile-tabs.tsx:46-64` OverviewSummary hand-builds a `<dl>` label/value
   grid — extract a generic `DescriptionList`/`DetailsGrid` composite into
   ui-kit (precedent: `EntityProfileCard`'s detail body) and consume it.
3. `profile-tabs.tsx:19-21` local `empty()` `<p>` helper — replace with
   `ViewEmptyState` (`@fams/v5-templates`) / `StatusView` (`@fams/ui-kit`).
4. `profile-tabs.tsx:124-135` @mention parsing + `text-primary` span — move
   into ui-kit `ActivityFeed` (built-in mention rendering or a `renderMention`
   slot); the app then passes plain text.
5. `settings-module.tsx:10-22` SettingsPage hand-set typography — recompose
   from DS parts; if an inline-code/Kbd primitive is missing, add it to ui-kit.
6. (minor) `seams.tsx:78-81` logo `<img className="size-7">` sizing — the
   V5AppShell/SideNav logo slot (or ui-kit `Logo`) should own sizing/fit and
   accept a URL; (minor) re-export the icon surface (`@fams/ui-kit/icons`) and
   move blueprint-icon-name resolution into v5-kit so apps drop their direct
   `lucide-react` dependency; (minor) ship the html/body/#root base reset as
   `@fams/tokens/base.css` instead of copies in showcase + demo app.

*Why it matters:* these are the only remaining violations of "every component is
derived from the design system" — and the exact patterns a designer-driven agent
would otherwise copy as precedent.

---

## Blocked on a founder / human decision

### Publishing — the mechanics are done and dormant

The flow is built, tested and provably inert (see
[history](history/backlog-resolved.md#publishing-flow--built-tested-deliberately-dormant)
and the runbook in **`docs/PUBLISHING.md`**). Six things need a person:

1. **Choose the registry.** Nothing in the repo assumes one.
   Hard-rule-1-compatible candidates: Verdaccio (MIT), GitHub Packages, Gitea,
   Nexus OSS. The choice belongs in `docs/knowledge-base/decisions.md`.
2. **Create the credential** and set the repository variable
   `FAMS_NPM_REGISTRY` + secret `FAMS_NPM_TOKEN`.
3. **Decide the first published version.** Everything sits at `0.9.0`; whether
   release 1 is `0.9.x`, `0.10.0` or `1.0.0` is a public-API commitment, not a
   mechanical step.
4. **Run the first real publish.** Nothing has been published; no tag or release
   was created.
5. **Decide whether release tags get pushed.** `.github/workflows/release.yml` is
   `contents: read` on purpose — `changeset publish` tags locally and never
   pushes.
6. **Flip `fams-v5-demo-environment` off `link:`** — one command
   (`node tools/ds-consumption.mjs --mode registry`), see that repo's backlog.

*Why it matters:* until (1) and (2) land, four things remain **unverifiable**:
authentication, `changeset publish` itself (only per-package
`pnpm publish --dry-run` was exercised — changesets' already-published check
needs `npm info` against a live registry), registry-side `access: "restricted"` /
scope-creation behaviour, and a real registry install in the demo repo.
`docs/PUBLISHING.md` § 7 is the authoritative verified-vs-unverified list.

**`@fams/ui-kit/styles.css` is reachable but imported by nothing.** The 2026-08-05
packaging audit found `dist/index.css` (1.8 kB — the bundled
`pragmatic-drag-and-drop-react-drop-indicator` styles) had no `exports` entry and
added one. But no surface in this monorepo imports it: the showcase and Storybook
each build their own `styles.css`/`preview.css` from `@fams/tokens` and never
pull ui-kit's emitted CSS, and `@fams/ui-kit/tailwind.css` appears only inside a
showcase docs code sample. *Why it matters:* the Kanban drop indicator's stroke
CSS is therefore **absent in every consuming surface today**, including the one
we just themed to `--ds-border-selected`. *Next action:* decide the CSS contract —
either every consumer (showcase, Storybook, demo app, and the documented
integration steps) adds the import, or `tailwind.css` `@import`s
`./dist/index.css`, which couples a shipped source file to a build output that
only exists because of one dependency's CSS. The first is explicit and boring;
the second is convenient and slightly incestuous. Not a drive-by either way.

### Design / product decisions

**7 `TODO: probable gap` entries in the theme-parity allowlist.**
`packages/tokens/test/theme-parity.test.js` lists `color-success`,
`color-warning`, `color-info` (semantic singletons with no dark override at all,
unlike primary/destructive which do have one even where unchanged) and
`color-surface-primary` / `color-surface-minimal` / `color-surface-secondary` /
`color-surface-low-contrast` (background-family surfaces, parallel to
background/card/popover/muted which all *do* have dark overrides). *Why it
matters:* these look like oversights in the original `.dark` port rather than
deliberate neutrality — meaning dark mode may be quietly wrong for status colours
and four surfaces. *Next action:* a design decision on the dark value for each
(or an explicit "intentionally theme-neutral" ruling), then either add the
override or convert the `TODO` into a stated rationale.

**Should an app override a returning user's stored theme choice?**
`packages/skeleton-kit/src/theming.ts` made this an explicit axis on 2026-07-23 —
`defaultThemeMode: 'force' | 'respect-stored'` — but the default is still
`'force'`, i.e. today's pre-existing behaviour. *Why it matters:* forcing a theme
over a stored user preference is a product-values call, not a technical one; the
config axis exists so the answer can change without a breaking change. *Next
action:* rule on the default. Flipping it to `'respect-stored'` is now a one-line
change plus a changeset.

**Denied-move UX is a pragmatic default, not a reviewed one.** A denied Kanban
move produces an `onMoveDenied` callback + a polite `role="status"` live-region
announcement — no toast, no shake, no visual signal at all for sighted users.
*Why it matters:* the a11y half is now genuinely correct (2026-08-05), which
makes the visual half the weaker one. *Next action:* a UX review of denial
feedback across the v5 pipeline surfaces, then implement whatever it picks;
`packages/v5-templates/src/views/kanban/announce-denied.ts` is deliberately the
single denial channel, so there is exactly one place to add to.

**How far should Storybook coverage go?** `workshop/storybook` ships a deliberate
**proof set** — 3 components / 12 stories (`Button` primitive, `Input` form,
`KpiTile` composite) — with no schedule to grow. The remaining ~400
`@fams/ui-kit` barrel exports have no stories, and **a story does not satisfy DoD
#6/#7**: a showcase demo registered in a `registry.tsx` family is still required.
*Why it matters:* two catalogues that both claim completeness is how a design
system rots; one catalogue plus one workbench is coherent. *Next action:* rule on
whether Storybook stays permanently a thin isolated-work surface (recommended,
and what `CLAUDE.md` currently states) or becomes a second catalogue — and if the
latter, what happens to DoD #6/#7.

**Extend reverse demo-coverage beyond `@fams/ui-kit`?**
`scripts/check-demo-coverage.mjs` currently checks only ui-kit's barrel.
`v5-templates`, `v5-composer`, `skeleton-kit` and `demo-kit` exports are
unchecked. *Why it matters:* the same hole that hid `DropdownMenuGroup` exists in
those packages. *Next action:* a **scope decision first** — `v5-composer` and
`demo-kit` are outside `build-registry`'s scope and much of what they export is
not a renderable component at all, so "every export must be demoed" may be the
wrong rule for them. Decide which packages the rule applies to, then extend the
script (its classifier is package-agnostic already).

---

## Deliberately not doing

- **`@storybook/addon-vitest` — skipped on purpose (founder call, 2026-08-05).**
  It would stand up a second axe path running alongside
  `packages/ui-kit/src/a11y.axe.test.tsx`, which is the authoritative gate
  (`pnpm test:axe`, required in `ci.yml`). Two a11y signals that can disagree is
  worse than one that cannot. Revisit only if the sweep is retired.
- **Chromatic and every hosted Storybook addon — rejected.** Hard rule 1 (no
  paid tiers, no mandatory SaaS). Storybook's own telemetry *and* crash reporting
  are disabled in `.storybook/main.ts`. Visual regression is served by the
  self-hosted VRT path (`infra/vrt/`) instead.
- **A registry URL in any `package.json` `publishConfig`.** Measured: it has
  absolute precedence in `pnpm publish` and would silently disable the
  `FAMS_NPM_REGISTRY` switch. `pnpm release:audit` rejects a `registry` key.
- **vitest 4.** The line stays `^3` deliberately; both repos are pinned at
  `3.2.7`.
- **Ripping `link:` out of `fams-v5-demo-environment`.** Local dev depends on it and no
  registry is live. A documented switch was built instead — see that repo's
  backlog.
- **Storybook stories as a substitute for showcase demos.** DoD #6/#7 are
  unchanged: the showcase owns the catalogue, `registry.json`, the route smoke and
  the visual-regression suites.

---

## Known characteristics (not bugs)

- **Some `userEvent` tests are load-sensitive.** Several tests that drive
  `@testing-library/user-event` time out under heavy parallel CPU load, and pass
  reliably in isolation or at `--concurrency=1`. This is `userEvent`'s real-timer
  advancement competing for CPU, not a product defect. If a run fails there,
  re-run that file alone before investigating.
- **The two repos' vitest pins must be moved together.** `fams-v5-demo-environment` shares no
  `catalog:` with this repo, so the version lives in two places by construction:
  this repo's `pnpm-workspace.yaml` catalog (`^3.2.7`) and the demo's root +
  `app/` `package.json` (`^3.2.7`). Both `docs/LIBRARIES.md` and the catalog
  comment say so.
- **`workshop/*` packages are outside the raw-hex/px and `llms.txt` gates.**
  `scripts/lint-tokens.mjs` and `scripts/build-llms.mjs` do not scan `workshop/`
  by existing design — lint is a `packages/*` concern. Related but distinct from
  the missing showcase lint script above, which is a real gap.
