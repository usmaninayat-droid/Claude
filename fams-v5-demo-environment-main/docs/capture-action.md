# Capture as a GitHub Action — the failure ladder, debt dashboard & seed integrity

> Moved out of `CLAUDE.md` (v2) — this is CI/maintainer detail. The everyday flow is in
> `CLAUDE.md` § Customization and `docs/agent-drill.md`. Rationale: decisions #15/#17.

## The Action + failure ladder (decision #17)

Capture runs **as a GitHub Action** (`.github/workflows/capture.yml`) on PR
**approval** or a **`/capture`** comment. It diffs each tenant's hand-edited
`resolved/` against `resolve(core + committed deltas)` and walks the ladder:

- **SUCCESS** — every changed module is expressible → the minimal typed ops are
  appended to the deltas, `resolved/` (+ the debt dashboard) regenerate, the bot
  commits to the PR branch, and the **ops list is posted as a PR comment**.
- **① AMBIGUOUS** — a module is inexpressible → **nothing is committed**, a
  `*.ops.proposed.json` + explanation is written, the check goes **red** (PR
  stays open, never merged-wrong), and the proposal is posted as a comment.
- **② OVERRIDE** — label the PR **`needs-canonicalization`** to land an ambiguous
  edit as **visible, tracked debt** while still shipping everything that IS
  expressible. The action exits 0 and: (a) canonicalizes + commits every
  expressible module exactly like SUCCESS; (b) for each inexpressible module,
  commits a tracked **`tenants/<t>/deltas/<m>.override.json`** record (the proposed
  ops + a `sha256` of the hand-edited resolved blueprint) and keeps the hand-edited
  `resolved/` **as-is**; (c) regenerates + commits the dashboard. The branch is
  then BOTH mergeable AND visibly in debt: `demo check` **skips the byte-compare**
  for that module and stays **green with a loud warning** — *provided* the
  record's hash still matches the committed resolved blueprint AND that pinned
  content still passes `validateBlueprint`. Edit `resolved/` again without
  re-flagging → hash mismatch → **check FAILS**. Resolve the debt by deleting the
  `override.json` and canonicalizing the edit into typed deltas (the normal path
  then resumes). **What the hash does and does not guarantee:** the `sha256` is an
  **integrity** anchor (the pinned resolved has not been *silently re-edited*),
  **not an authenticity** one — it does not prove the content is legitimate. Any
  agent can pin a self-consistent hash over any resolved/, because CODEOWNERS
  intentionally leaves `resolved/` and `tenants/` **agent-writable** (no required
  review; CI + capture are the safety net). Legitimacy comes from **human review
  of the PR** plus the **visible dashboard debt entry** — so `demo check` also
  runs `validateBlueprint` on the pinned content, ensuring at minimum that
  schema-invalid/garbage resolved cannot pass behind a matching hash.
  `demo resolve`/`demo promote` never regenerate an override module (its pinned
  resolved/ is left byte-untouched), and `demo promote` **refuses** to promote out
  of a module that still carries override debt — canonicalize it first.
- **Never silent** — every path posts a comment (locally: writes `capture-report.md`,
  in a `try/finally` so even a core crash still produces a report with the error).

Core logic is in `tools/lib/capture-action.mjs` (unit-tested); the GitHub/git
glue is `tools/capture-action.mjs`. Drill/test it without GitHub:
`pnpm demo capture-action --dry` (add `--override` to simulate the label).

## Debt dashboard

`pnpm demo debt` regenerates `docs/debt-dashboard.md` — per-tenant delta counts
per module, outstanding capture debt (committed **`*.override.json`** records +
any local `*.ops.proposed.json`), override-flagged screens, and **promotion
candidates** (the same op shape in ≥2 tenants). Deterministic and **committed**;
`demo check` fails if it is stale (byte-compare, like `resolved/`).

## Seed integrity (part of `demo check`)

`demo check` validates every `SingleReference`/`MultiReference` seed value —
ported from the app's boot-time `validateSeedRefs` (demo-kit) so CI catches
dangling refs **without booting the app**:

- **Dangling → FAILURE.** The target `entityType` IS a licensed module's blueprint
  `code`, but the referenced id is not among that type's seeds.
- **Inert → WARNING (never a silent pass).** The target `entityType` has no
  licensed module (e.g. `device/tracker`) so the app never wires it as a store
  reference; we surface it loudly instead of skipping it.
- Empty/null reference cells are "no reference", not dangling.

`demo check` also validates every ops file against
`tools/schemas/OpsFile.schema.json` (ajv, `tools/lib/ops-schema.mjs`).
