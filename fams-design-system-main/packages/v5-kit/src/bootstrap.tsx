import { createFamsApp } from '@fams/skeleton-kit'
import { AppsProvider } from './apps'
import { wipeTenantCache } from './cache'
import { resolveLandingPath } from './landing'
import { resolveTenantModules } from './modules'
import { PrivilegeProvider } from './privilege'
import { applyTenantTheme } from './theming'
import { V5AppShell } from './shell'
import { V5Home } from './home'
import type { BootstrapTenantConfig, PrivilegeUser, V5App } from './types'

const ANON_USER: PrivilegeUser = { privileges: [], userType: 'user' }

/**
 * The v5 boot layer, composed on top of skeleton-kit's `createFamsApp`.
 *
 * BOOT SEQUENCE (mirrors v5's async `boot()` in `v5/src/frontend/boot/index.js`,
 * which awaited `GET bootstrap` before registering routes):
 *   1. Fetch the tenant's licensed modules  (`modulesSource.getLicensedModules`).
 *   2. Fetch the current user               (`user?.getUser`, defaults to anon).
 *   3. Resolve licensed ∩ implemented → skeleton `FamsModule[]` (decision #23:
 *      unlicensed implementations are never referenced; missing ones warn+skip).
 *   4. `createFamsApp({ modules, ... })` — skeleton wires theming (data-theme +
 *      data-tenant), query, router (per-module lazy chunks) and error boundaries.
 *      The root shell defaults to this package's `V5AppShell` (the real two-bar
 *      chrome) via skeleton-kit's `shellComponent` override — callers may pass
 *      their own `config.shellComponent` to opt out.
 *   5. `applyTenantTheme` layers the tenant's `runtimeVars` (escape hatch).
 *   6. Wrap the skeleton app in `PrivilegeProvider` (fed by the resolved user)
 *      and `AppsProvider` (fed by the tenant's `applications`/`branding`, so
 *      `V5AppShell` can split the outer "apps" rail from the inner "modules"
 *      rail without skeleton-kit's `ShellComponentProps` ever knowing about it).
 *
 * WHY ASYNC + composed (returns a built app, not a bare modules array): the
 * module list is fetched at runtime, so the async orchestration has to live
 * somewhere. Composing `createFamsApp` here keeps it in ONE place and lets us
 * add the two v5-specific wrappers a bare array couldn't — the privilege
 * provider around the tree and the tenant-scoped `logout()`. That is the
 * cleaner seam than handing the app a modules array + a pile of wiring notes.
 * (`resolveTenantModules` is exported for callers who genuinely want just the
 * mapping — e.g. tests.)
 */
export async function bootstrapTenant(config: BootstrapTenantConfig): Promise<V5App> {
  const [licensed, user] = await Promise.all([
    config.modulesSource.getLicensedModules(),
    config.user ? config.user.getUser() : Promise.resolve(ANON_USER),
  ])

  const { modules, skipped } = resolveTenantModules({
    licensed,
    implementations: config.implementations,
    tenant: config.tenant,
    blueprintSource: config.blueprintSource,
    composer: config.composer,
  })

  // Optional tenant landing policy: `/` may redirect to a module instead of
  // rendering Home. Resolved to a plain path here (v5-kit knows modules);
  // skeleton-kit only ever sees the path.
  const indexRedirectTo = resolveLandingPath(config.tenant.landingModule, modules)

  const base = createFamsApp({
    modules,
    theme: { tenant: config.tenant.tenant, defaultTheme: config.defaultTheme },
    query: config.query,
    brandLabel: config.brandLabel,
    // Index route defaults to the metadata-driven launch pad (V5Home) —
    // callers may still pass their own indexComponent to opt out.
    indexComponent:
      config.indexComponent ??
      (() => <V5Home modules={modules} brandLabel={config.brandLabel} />),
    // When the tenant configures a `landingModule`, `/` redirects there
    // instead of rendering the index component above (Home stays routed +
    // reachable from its nav entry).
    indexRedirectTo,
    shellComponent: config.shellComponent ?? V5AppShell,
  })

  // Layer the tenant's runtime CSS var overrides after skeleton-kit has set
  // data-theme + data-tenant (idempotent re-set of data-tenant is fine).
  applyTenantTheme(config.tenant)

  async function logout(): Promise<void> {
    wipeTenantCache(base.queryClient, config.tenant.tenant)
    await config.onLogout?.()
  }

  const BaseApp = base.App
  function App() {
    return (
      <PrivilegeProvider value={user}>
        <AppsProvider
          value={{
            applications: config.tenant.applications ?? [],
            logo: config.tenant.branding?.logo,
            // The tenant's logo asset may already carry its wordmark — then
            // the adjacent text label next to it is a duplicate.
            hideBrandLabel: config.tenant.branding?.hideName,
            logoExpanded: config.tenant.branding?.logoExpanded,
            poweredBy: config.tenant.branding?.poweredBy,
            // Identity + logout for the shell's rail-footer user popover.
            // `user.identity` is the OPTIONAL display half of the UserSource
            // seam — absent, the shell keeps its decorative user item.
            user: user.identity,
            onUserLogout: () => {
              void logout()
            },
            // Pinned rail entries + their cross-module indicator dots (e.g.
            // the inbox unread dot) — both injectable seams, both optional.
            railStart: config.tenant.railStart,
            railIndicators: config.railIndicators,
          }}
        >
          <BaseApp />
        </AppsProvider>
      </PrivilegeProvider>
    )
  }
  App.displayName = 'V5App'

  return {
    App,
    router: base.router,
    queryClient: base.queryClient,
    modules,
    skipped,
    logout,
  }
}
