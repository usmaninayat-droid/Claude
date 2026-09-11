---
'@fams/v5-kit': minor
---

Add `@fams/v5-kit` — the React rewrite of v5's Vue boot layer (phase 2 §4).
Composes `@fams/skeleton-kit` + `@fams/v5-composer`: `bootstrapTenant()` maps a
tenant's licensed modules to the skeleton module contract (licensed-only route
registration, decision #23), wires the composer blueprint path, applies
per-tenant runtime theming (`applyTenantTheme`), provides reactive privilege
gating (`<Privileged>` / `usePrivilege`), and per-tenant query-cache hygiene
(`wipeTenantCache` + `logout`). All data seams are injectable.
