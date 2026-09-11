/**
 * @fams/v5-kit — the v5 boot layer for React. [v5 tier]
 *
 * The React rewrite of v5's Vue boot layer, composed ON TOP of the
 * product-agnostic @fams/skeleton-kit (createFamsApp) and @fams/v5-composer
 * (ComposedModule). It adds the v5 product vocabulary the core deliberately
 * lacks: tenant-licensed module registration (decision #23 — licensed-only,
 * unlicensed chunks never referenced), the composer blueprint path, per-tenant
 * runtime theming, reactive privilege gating, and per-tenant query-cache
 * hygiene. Every data seam (modules / user / blueprints) is injectable — the
 * real API wires them later; phase 3's demo-kit provides in-memory ones.
 *
 * Tier laws (docs/BOUNDARIES.md): v5 tier — MAY import skeleton-kit / composer /
 * ui-kit; the core tier NEVER imports this (decision #13, lint-enforced).
 */

/* ── Boot ────────────────────────────────────────────────────────────────────── */
export { bootstrapTenant } from './bootstrap'
export { resolveTenantModules, type ResolveTenantOptions } from './modules'
export { resolveLandingPath, FIRST_MODULE } from './landing'

/* ── App shell (the real v5 chrome, wired as bootstrapTenant's default shellComponent) ── */
export { V5AppShell, type V5AppShellProps } from './shell'

/* ── Apps ≠ modules: application grouping fed to V5AppShell's outer rail ─────────── */
export {
  AppsProvider,
  useApps,
  type AppDefinition,
  type AppsContextValue,
  type AppsProviderProps,
} from './apps'

/* ── Tenant theming ────────────────────────────────────────────────────────────── */
export { applyTenantTheme } from './theming'

/* ── Privilege gating (reactive `v-privilege` rewrite) ──────────────────────────── */
export {
  PrivilegeProvider,
  Privileged,
  usePrivilege,
  type PrivilegeProviderProps,
  type PrivilegedProps,
  type PrivilegeContextValue,
} from './privilege'

/* ── Query-cache hygiene ─────────────────────────────────────────────────────────── */
export { wipeTenantCache } from './cache'

/* ── Rail-indicator seam (pinned rail entries' notification dots, e.g. inbox unread) ── */
export {
  createRailIndicators,
  type RailIndicatorSource,
  type RailIndicatorController,
} from './rail-indicators'

/* ── Composer low-code route (exported for advanced wiring / testing) ───────────── */
export {
  ComposerModulePending,
  type ComposerModulePendingProps,
  type ComposerPendingShape,
  ComposerModuleView,
  makeComposerRouteLoader,
  type ComposerModuleViewProps,
} from './composer-route'

/* ── Types ───────────────────────────────────────────────────────────────────────── */
export type {
  LicensedModule,
  LicensedModuleMeta,
  LicensedModuleMenu,
  LayoutConfig,
  ModuleConfigMeta,
  ModulesSource,
  PrivilegeUser,
  UserIdentity,
  UserSource,
  BlueprintSource,
  ModuleImplementation,
  ModuleImplementationMap,
  TenantRuntimeConfig,
  RailStartEntry,
  ComposerConfig,
  BootstrapTenantConfig,
  ResolvedTenant,
  V5App,
} from './types'
export { V5Home, V5CommandPalette, buildLaunchCatalog } from './home'
export type { V5HomeProps, LaunchCatalogEntry } from './home'
