# PROGRESS

Task-scoped status for `fams-v5-demo-environment`.

> Consolidated backlog lives at `../fams-design-system/docs/BACKLOG.md`.

## Task 3.2 — repo scaffold + resolve/check/capture/promote (DONE)

- [x] Repo scaffold (`core/`, `tenants/`, `resolved/`, `tools/`, `app/` placeholder, `docs/tenant-model.md`).
- [x] `@fams/v5-composer` consumed via pnpm `link:` (interim; registry deferred — see README).
- [x] Typed delta ops on stable ids (`tools/lib/ops.mjs`) + JSON Schema (`tools/schemas/OpsFile.schema.json`).
- [x] `demo resolve` — deterministic resolved blueprint + provenance; passes `validateBlueprint`.
- [x] `demo check` — CI gate (byte-compare, op/manifest/JSON validation).
- [x] `demo capture` — minimal-ops canonicalizer; proposal + non-zero on any ambiguity.
- [x] `demo promote --op` / `--module` — the two lifecycles (decision #16).
- [x] Example content: core `companies` + tenant `acme` deltas; committed `resolved/acme/`.
- [x] Tests (vitest, 39) + CI workflow.

Gate: `pnpm test` green; `pnpm demo resolve --all && pnpm demo check` green.

## Task 3.4 — pilot content + CI gate + founder walkthrough (DONE)

- [x] Core modules replace the companies scaffold (decision #24): `asset/vehicle`
      (entity, ~14 v5-faithful fields, ~50 seeds), `workforce/driver` (entity,
      ~20 seeds), `ticketing/ticket` (pipeline, stages + kanbanCard + `rules.json`
      with one role-gated transition, ~15 seeds).
- [x] Two tenants: `fams` (canonical blue, zero deltas) + `iwmp` (green + gradient
      via `[data-tenant]` token block; asset delta set +2/hide/rename + a ticketing
      setLabel; waste seeds). `resolved/` committed; `demo check` green.
- [x] Data coherence: `buildEntitySchemas` derives store references → the vehicle
      Assignments tab reads `store.getReferrers` (workforce→vehicle), proven through
      the real fetch/MSW path.
- [x] Pipeline path wired: transitions/move via the composer's `allowedTransitions`
      evaluator + userContext; pipeline-create default stage (parked 2.7 fix, app-side).
- [x] Tool tests decoupled from live content (synthetic fixture) + break-a-delta proof.
- [x] CI builds the design system + app, runs app tests (parked CI finding closed).
- [x] `docs/WALKTHROUGH.md` + jsdom/MSW integration suite covering the same path.

Gate: `pnpm test` (40) + `pnpm --filter app test` (21) green; `pnpm demo resolve --all
&& pnpm demo check` green; app builds. Design system untouched.

## Phase 4 — capture-as-Action, debt dashboard, drill, visual matrix (DONE)

- [x] `demo capture-action` — capture as a GitHub Action on PR approval/`/capture`
      comment, with the full failure ladder (SUCCESS / ① AMBIGUOUS / ② OVERRIDE
      tracked debt), override-aware `resolve`/`promote`, and hash-pinned
      integrity + `validateBlueprint` re-check on override content.
- [x] `demo debt` — customization debt dashboard (`docs/debt-dashboard.md`),
      staleness-gated in `demo check`.
- [x] Seed-integrity check wired into `demo check` (dangling → failure, inert →
      warning); CODEOWNERS + PR template gating the platform seams.
- [x] Phase-4 agent drill (`docs/agent-drill.md`): IWMP ticketing Severity Level
      + Penalty Payment Due Date, captured end-to-end and verified by
      `drill.verify.test.ts` + `render-path.test.ts`.
- [x] Visual regression Suite B (tenant × persona × screen matrix,
      `e2e/visual-matrix.spec.ts`), local/pre-merge gate.

Gate (current, re-run for this housekeeping pass): root `pnpm test` — **86
passed (9 files)**; `pnpm --filter app test` — **27 passed (7 files)**; `pnpm
demo resolve --all && pnpm demo check` green; `pnpm demo debt --check` up to
date.

## Next

- **Deferred (founder)** — replace the sibling `link:` with a published registry dep.
