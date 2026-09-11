# Multi-Tenant Demo-Environment Model — locked (research-verified)

**Verdict: materialized hybrid — "deltas are the database, resolved is the UI."** Verified against SAP Fiori adaptation layers, Salesforce packages, Kustomize, Shopify/WordPress failures, game-mod overlays. Full evidence: [research.html](../research.html) §1.

## The mechanism

- **`core/modules/<m>/`** — canonical product: screens + `blueprint.json` (every node has a **stable ID**) + seeds.
- **`tenants/<t>/`** — `tenant.json` (manifest, theme) · `deltas/<m>.ops.json` (**typed ops on stable IDs**: `addField{after:id}`, `hideField{id}`, `setLabel{id}`, `addStage{…}` — NEVER JSON-Patch paths/indexes, the Odoo lesson) · `seeds/` (incl. `users.json` personas) · `overrides/screens/` (rare bespoke UIs, e.g. waste dispatcher) · `modules/` (**tenant-native modules**, e.g. UCCP flood management).
- **`resolved/<t>/`** — GENERATED + COMMITTED (lockfile pattern): complete concrete blueprint per tenant + provenance per node (core | delta | override). **Agents read this; the app renders this.**
- **Tools:** `demo resolve` · `demo check` (CI: `resolve(core+deltas) === resolved`, else build fails) · `demo capture` · `demo promote`.

## How people work

- **Designers vibecode. No visual editor exists (decision #15).** Open the demo environment → Demo Console (hover top edge → grid overlay) → tenant IWMP + persona "Dispatcher" → app renders as that logged-in user → tell Claude Code: "add Severity Level and Penalty Payment Due Date to Ticketing task details" → review the preview as that persona → approve or refine.
- **Agents** read `resolved/<t>/` (one complete file, token-cheap, zero merging), write typed deltas, run resolve+check.
- **Capture (approval-time canonicalizer):** while iterating, the agent changes whatever is fastest. On PR approval (or `/capture` comment) a GitHub Action canonicalizes the locked-in diff into minimal typed deltas, commits, posts the ops list as a PR comment; preview redeploys; human sees the run.
- **Capture failure = loud + harmless:** mismatch → red check, PR stays open (never merged-wrong). Ladder: ① agent proposes ops in a comment → one-click approve; ② ambiguous → merge as override flagged "needs canonicalization" (visible debt, cleaned later); ③ never silent, never stuck.

## Three module lifecycles (decision #16)

1. **Core-first** — changes to shared modules land in core; every tenant's resolved regenerates; inheritance visible in the PR diff.
2. **Tenant-first incubation** — new modules are built entirely inside a tenant workspace (IWMP driver-behaviour). When proven: `demo promote --module` **moves** it to core — no copy stays; the tenant renders 1:1 via core + zero deltas; tenant-specific bits remain as deltas.
3. **Tenant-forever** — stays tenant-owned (UCCP flood management). A second tenant wanting it IS the promotion trigger.

Governance: shared modules change core-first; NEW modules incubate tenant-first. Lint flags ≥2–3 tenants carrying near-identical ops → "promote to core". Dashboard tracks per-tenant customization debt.

## Escape valve

If a tenant's deltas + overrides exceed ~⅓–½ of a module: stop pretending it's a variant — consciously graduate it to an owned override/tenant-native module.

## Demo data (decision #19)

Seeds → in-browser relational store (formalized from Shaheer's `sim/`) → MSW mock API serving the **production API contract**. Coherent cross-module links (create workforce entity → link to vehicle → appears in vehicle profile), reset = re-seed on logout/button, per-viewer isolated state, fully static deploy. Frontend code is identical to production — agents never write data plumbing, only screens + seeds.
