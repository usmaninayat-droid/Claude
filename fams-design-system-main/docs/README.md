# Docs index

One-screen map of the documentation. Root also has `README.md` (what/why/how to run), `CLAUDE.md` (agent-enforced authoring rules), and `CHANGELOG.md`.

## Start here (recommended reading order)

| # | Doc | What it covers |
| --- | --- | --- |
| 1 | [ARCHITECTURE.md](ARCHITECTURE.md) | Why this exists, the token pipeline, the L0–L4 tier model, the three-tier package model (core / `@fams/v5-templates` / product repos), distribution model, capability→library matrix. |
| 2 | [BOUNDARIES.md](BOUNDARIES.md) | DS-vs-application boundary rule, the layer model with real v5 evidence, the patterns tier (`@fams/v5-templates`) and its 4-question cascade, patterns & anti-patterns per layer. |
| 3 | [COMPONENT-GUIDE.md](COMPONENT-GUIDE.md) | When to use which component — disambiguates look-alikes (Alert vs NotificationCard, FilterPanel vs FilterPopup, etc). |
| 4 | [LIBRARIES.md](LIBRARIES.md) | Canonical OSS library pick-list, licenses, rejected alternatives. |
| 5 | [ASSETS.md](ASSETS.md) | Icon/logo/illustration/font naming, folder structure, SVG hygiene. |
| 6 | [USAGE-INDEX.md](USAGE-INDEX.md) | Per-component map to the v5 pattern it replaces (auto-derived from `@usage-v5` JSDoc blocks). |

## Reference

| Doc | What it covers |
| --- | --- |
| [guidelines/text-truncation.md](guidelines/text-truncation.md) | UX guideline: text truncation in tables/lists — never-truncate identifiers, 2-line wrap + middle-truncation fallback for variable-length identifiers, tooltip-gated end-truncation for descriptive text, width-allocation priority, narrow-panel row shape (open item), plus the column-expansion and viewport-driven column-hide interaction spec (proposed, not yet implemented). Also surfaced in the showcase under Guidelines → Text truncation. |
| [BACKLOG.md](BACKLOG.md) | What is still open, across both repos — split into open engineering work, blocked-on-a-human decisions, deliberately-not-doing (with rationale), and known characteristics. Resolved items move to `history/backlog-resolved.md`. |
| [TESTING.md](TESTING.md) | Full testing contracts — the demo-coverage checker's AST classification + `COVERED_BY_PARENT` allowlist rules, route smoke, and both visual-regression suites incl. the VRT dual mode. Root `CLAUDE.md` § Testing keeps only the gate list. |
| [PUBLISHING.md](PUBLISHING.md) | What is publishable vs private forever, the registry-agnostic `FAMS_NPM_REGISTRY` switch (and the verified pnpm/npm precedence quirks behind it), the version→build→publish flow, the dormant CI release lane, the pack/import smoke test, the `fams-v5-demo-environment` `link:` ↔ pinned-versions switch, why a `file:` install of `catalog:`-pinned packages fails and `link:` is required until publish, consuming from a workspace of your own (React/router/query singletons), and the human runbook — plus an explicit verified-vs-unverified list. |
| [token-reconciliation.md](token-reconciliation.md) | The audited 7-difference diff between Ben's canonical DTCG tokens and Shaheer's `theme.css` (decision #2) — ruling per difference and status after each fix. |

## History

| Doc | What it covers |
| --- | --- |
| [history/backlog-resolved.md](history/backlog-resolved.md) | Every backlog item that has been resolved, newest first, in full detail. The live worklist is `BACKLOG.md`; this is where items go when they close. |
| [history/](history/) | Working documents from the initial reference-DS port project (June–July 2026) — port ledger, porting playbook, review findings, adoption notes. Provenance only, not living documentation. |
