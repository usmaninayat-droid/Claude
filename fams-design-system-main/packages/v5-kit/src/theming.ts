import type { TenantRuntimeConfig } from './types'

/**
 * Apply per-tenant theming at runtime.
 *
 * COMPOSES with (does NOT duplicate) skeleton-kit's theme bootstrap:
 *   - skeleton-kit's `bootstrapTheme` owns the light/dark axis — it writes an
 *     explicit `<html data-theme>` resolved from storage / OS preference.
 *   - this owns the TENANT axis — it writes `<html data-tenant>` (which selects
 *     the compiled `[data-tenant]` token block emitted by @fams/tokens) and,
 *     for tenants WITHOUT a compiled block, applies raw CSS custom-property
 *     overrides from `runtimeVars` (the documented escape hatch).
 *
 * `bootstrapTenant` calls skeleton-kit's bootstrap (data-theme + data-tenant)
 * first, then this to layer `runtimeVars`; calling `data-tenant` twice is
 * idempotent. It is also safe to call standalone (e.g. a runtime tenant switch).
 */
export function applyTenantTheme(tenant: TenantRuntimeConfig): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-tenant', tenant.tenant)
  if (tenant.runtimeVars) {
    for (const [prop, value] of Object.entries(tenant.runtimeVars)) {
      root.style.setProperty(prop, value)
    }
  }
}
