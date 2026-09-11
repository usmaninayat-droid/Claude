import type { FamsModule } from '@fams/skeleton-kit'

/**
 * The literal `landingModule` value meaning "whatever module comes first in
 * the tenant's ordered module list" — so a tenant can pin its landing page to
 * the top of its own nav without repeating a module id that may be renamed.
 */
export const FIRST_MODULE = 'first'

/** Dev-only LOUD warning (silenced in production builds, like React's own dev warnings). */
function devWarn(message: string): void {
  // Exact literal form required — Vite/esbuild define substitution matches only `process.env.NODE_ENV`, not with optional chain.
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return
  console.warn(`[@fams/v5-kit] ${message}`)
}

/**
 * Resolve a tenant's optional `landingModule` to the route path the index
 * route `/` should redirect to.
 *
 * GENERIC, not tenant-specific:
 *   - unset          → `undefined` (index keeps rendering the launch pad Home)
 *   - `'first'`      → the first RESOLVED module's route (module order is the
 *                      tenant's own `modules` order, which `resolveTenantModules`
 *                      preserves)
 *   - a module id    → that module's route
 *   - an unknown id  → `undefined` + a loud dev warning (fall back to Home
 *                      rather than dead-ending the app on a route that does
 *                      not exist)
 *
 * Home's own route and nav entry are untouched either way — this only changes
 * what `/` does on entry.
 */
export function resolveLandingPath(
  landingModule: string | undefined,
  modules: FamsModule[],
): string | undefined {
  if (!landingModule) return undefined

  if (landingModule === FIRST_MODULE) {
    const first = modules[0]
    if (!first) {
      devWarn(`landingModule: "${FIRST_MODULE}" but the tenant resolved no modules — landing on Home.`)
      return undefined
    }
    return first.navEntry.path
  }

  const match = modules.find((m) => m.id === landingModule)
  if (!match) {
    devWarn(
      `landingModule "${landingModule}" matches no resolved module ` +
        `(resolved: ${modules.map((m) => m.id).join(', ') || 'none'}) — landing on Home.`,
    )
    return undefined
  }
  return match.navEntry.path
}
