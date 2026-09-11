import type { QueryClient } from '@tanstack/react-query'

/**
 * Per-tenant query-cache hygiene (performance rule 8 / decision #23).
 *
 * CONVENTION: every tenant-scoped query MUST prefix its queryKey with the tenant
 * id — `[tenant, ...rest]` (e.g. `['crm', 'assets', page]`). demo-kit and apps
 * follow this so a tenant switch or logout can drop exactly that tenant's cached
 * data without touching another tenant's (leak-free tenant isolation).
 *
 * `wipeTenantCache` removes every query whose key starts with `[tenant]`.
 * TanStack's `removeQueries` uses partial (prefix) matching by default, so a
 * bare `[tenant]` filter matches all `[tenant, ...]` keys and nothing else.
 */
export function wipeTenantCache(queryClient: QueryClient, tenant: string): void {
  queryClient.removeQueries({ queryKey: [tenant] })
}
