# Backlog — fams-v5-demo-environment

> **The canonical backlog for this repo is
> [`../../fams-design-system/docs/BACKLOG.md`](../../fams-design-system/docs/BACKLOG.md).**
> It is maintained there so the cross-repo items (which almost all of them are)
> live next to their design-system halves. This file exists so the state is
> discoverable from inside this repo, and it deliberately carries only the
> summary + a pointer — **do not fork detail into it.**
>
> Resolved records for both repos:
> [`../../fams-design-system/docs/history/backlog-resolved.md`](../../fams-design-system/docs/history/backlog-resolved.md).

Last reconciled: **2026-08-05.** This file lists what is still **open**; the
2026-08-05 session's resolutions (the `link:` ↔ pinned-versions switch and the
vitest patch alignment) have moved to the history file above.

Sections match the design-system backlog's three categories.

## Open engineering work

- **DS-bypass cleanup: replace the hand-rolled visuals in `app/src/demo/` with
  design-system components (audit 2026-08-13).** Five surfaces in
  `profile-tabs.tsx` / `settings-module.tsx` / `seams.tsx` violate rule zero
  (custom list rows, a `<dl>` grid, a local empty-state, @mention styling,
  hand-set typography, logo sizing). Detail + DS-first fix per item: the
  design-system backlog § Cross-repo / infra.

*(Resolved since 2026-08-05: the `ticketing-kanban` fixme — fixed in `23441d0`
via `resolveModuleViews`, all 24 matrix shots real — and the Storybook port-6300
collision — Storybook moved to 6400 on 2026-08-13. Records:
`../../fams-design-system/docs/history/backlog-resolved.md`.)*

## Blocked on a founder / human decision

- **The actual flip off `link:` is pending the registry decision.** The switch
  itself is built and proven (`node tools/ds-consumption.mjs --status | --mode
  link | --mode registry`; `link` remains the default). What is still needed is
  the registry choice, credentials, and a first real publish — all tracked in the
  design-system backlog. *What a real registry adds that the offline tarball
  proof cannot cover:* authentication, `@fams:registry` resolution, and
  registry-side integrity-hash provenance. Runbook:
  `../../fams-design-system/docs/PUBLISHING.md` § 6 step 7 — it also lists the
  docs **in this repo** that still describe `link:` as the only mode and must be
  updated at flip time.

## Still deferred (accepted risk / by design)

- **Provenance resolution is last-writer-wins with no conflict signal.**
  Re-verified 2026-07-23 (investigation only, no code changed): `resolveModule`'s
  `nodes[id] = {…}` is a plain overwrite, not an accumulation, and nothing
  detects or reports the collision. **Verdict: latent risk, keep deferred** — the
  overwrite affects only the human-facing `provenance.json` side-channel (the
  resolved blueprint content is unaffected: `applyOp` mutates it cumulatively and
  correctly), nothing downstream reads `provenance.nodes` (not the app, not
  `promote`, not the debt dashboard), and no committed tenant delta today touches
  the same node id with more than one op, so no shipped content can trigger it.
  *Fix recipe if picked up (~2–4 h):* accumulate a `touchedBy` history array in
  `resolve.mjs` instead of overwriting (populate it only when length > 1, so
  today's provenance files stay byte-identical), and tighten
  `tools/test/resolve.test.mjs`'s loose `toMatchObject({ source: 'delta' })`
  assertion to actually pin which op wins.

- **Override records enforce integrity (hash), not authenticity.** A
  `*.override.json` `sha256` proves the pinned `resolved/` has not been silently
  re-edited; it does not prove the content is legitimate. Legitimacy relies on
  human PR review plus the visible debt-dashboard entry (and `demo check` running
  `validateBlueprint` over the pinned content, so schema-invalid garbage cannot
  pass behind a matching hash). *Revisit if agents ever get merge rights* — that
  is the assumption the whole design rests on.

- **Tenant theme switching is manual-only, by design.** Light/dark has automated
  coverage; tenant identity does not. Covered instead by the visual-matrix
  suite's tenant axis.

- **`Installed Devices` `MultiReference` targets `device/tracker`**, which has no
  registered module — inert by design, warned loudly (never silently skipped) by
  `demo check`. Becomes real when a devices module lands; no action until then.

## Known characteristics (not bugs)

- **Keep this repo's vitest pin in step with the design system's.** There is no
  shared `catalog:` between the two repos, so the version lives in two places by
  construction: here it is `^3.2.7` in the root and `app/` `package.json`; there
  it is the `pnpm-workspace.yaml` catalog. Both are on **3.2.7**.
- **`@vaadin/vaadin-usage-statistics`' postinstall is explicitly denied** in
  `pnpm-workspace.yaml`, in both consumption modes. It only becomes this repo's
  decision on the versioned path (reached via `@fams/v5-templates`' deck.gl
  stack); on `link:` the design system's own `allowBuilds` policy covered it.
