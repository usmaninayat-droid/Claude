# Decision record — three-tier package structure (2026-07-06)

**Trigger:** Head of Design (Abusufean Ali) review question: the structure looked "built for the showcase," and — the substantive point — *v5 has its own patterns (asset profile, task detail, multi-tab side-sheets); many v5 products need them, but other/new tools must not inherit them. How do we manage that?* Independently, the v5 functional analysis (2026-07-05) found the same: the multi-tab pinned ProfileDrawer and the saved-view module shell are v5-signature patterns (17+ call sites / 85% of modules), not universal UI.

## Decision

Adopt the **Carbon model** (cf. IBM's `@carbon/react` + `@carbon/ibm-products`): a strictly product-agnostic core plus a separate, opt-in product-family pattern package, in one monorepo under one quality gate.

| Tier | Package | Consumers |
| --- | --- | --- |
| 1 — Core | `@fams/tokens`, `@fams/ui-react` | every FAMS product; **new tools use only this** |
| 2 — Patterns | `@fams/v5-patterns` | v5-family products opt in; others never need it |
| 3 — App | product repos | manifests, data wiring, feature screens |

**Locked principle: v5-specific patterns never enter `@fams/ui-react`.**

Laws (full text: `docs/BOUNDARIES.md` § The patterns tier): absolute dependency direction (`v5-patterns → ui-react → tokens`); compose-never-fork; business vocabulary allowed in tier 2, banned in tier 1; identical quality gates; promotion/demotion across tiers via the rule of three. Membership decided by the **4-question cascade** (extends the original 3-question test): fetch/store/route → app · second product family unchanged → core · second v5-family module unchanged → patterns · else → app.

## Rejected alternatives

- **Everything in one package (flags/folders):** the core silently absorbs v5 opinions; non-v5 products inherit them — how design systems rot.
- **Separate repos:** drift, no atomic cross-package changes, duplicated CI. Package boundaries give the isolation that matters (dependency graph, version); the monorepo keeps gates/showcase/refactors unified.
- **v5 patterns as app code only:** every v5-family product re-forks the profile drawer — the exact v5 disease (31 hand-rolled profiles) the DS exists to cure.

## Status

`@fams/v5-patterns` scaffolded (0.9.0, versioned via changesets) and **intentionally empty**. First candidates — multi-tab ProfileDrawer, v5 side-sheet pattern, saved-view module shell assembly, Wizard shell (generic parts → core) — enter only after the design-team review adjudicates each against the cascade. The per-component tier-1/tier-2 line is the design review's to draw; the structure itself is settled.
