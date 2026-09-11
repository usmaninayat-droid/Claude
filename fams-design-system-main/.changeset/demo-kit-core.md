---
'@fams/demo-kit': minor
---

Add `@fams/demo-kit` — CORE-tier, product-agnostic demo machinery (phase 3 §1).
Runs a FAMS React app with no backend: a relational in-browser store with
bidirectional referential integrity + dangling-ref cleanup (`getReferrers`,
`snapshot`/`load`), its own injectable session `Persistence`
(`SessionStoragePersistence` + in-memory default) with `reset()` re-seeding, a
seed loader that fails loudly on dangling cross-references, a React-free persona
auth shim (`createPersonaAuth`; optional `usePersona` hook at
`@fams/demo-kit/react`), and an MSW mock-API generator (`buildHandlers` /
`setupDemoWorker`). Carries no v5 vocabulary and imports no `@fams/v5-*` package
(boundary lint, decision #13); the demo app bridges these generic contracts onto
the product kits.
