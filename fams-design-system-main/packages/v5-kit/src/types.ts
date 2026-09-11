import type { ComponentType, ReactNode } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { FamsModule, ModuleRouteLoader, NavEntry, ShellComponentProps } from '@fams/skeleton-kit'
import type { DataAdapter, ModuleBlueprint, RendererRegistry } from '@fams/v5-composer'
import type { AppDefinition } from './apps'

/* ─────────────────────────────────────────────────────────────────────────────
 * v5 → React entry-shape mapping
 *
 * v5's `GET bootstrap` returns the tenant's licensed-module array. Each entry is:
 *   { name, basemodule, code, meta: { layout, requiresAuth, layout_config, module_config }, menu: { path, component } }
 * where `menu.component` is a STRING resolved through a static manifest map
 * (component-name → lazy component). A missing manifest entry made v5 SILENTLY
 * skip the route (see v5 `composables/app.js registerRoutes`).
 *
 * The React rewrite keeps the same wire shape (`LicensedModule` below) so the
 * real API needs no translation, but:
 *   - `menu.component` (a manifest key) is replaced by the `implementations` map
 *     keyed on `code` — the React equivalent of the v5 component manifest;
 *   - a licensed module with NO implementation is a LOUD dev warning, never a
 *     silent skip (see `modules.ts`).
 * ───────────────────────────────────────────────────────────────────────────── */

/** v5 `meta.layout_config`. Carried through for renderers; unused by boot. */
export interface LayoutConfig {
  type: string
  views: string[]
}

/** v5 `meta.module_config`. Carried through for renderers; unused by boot. */
export interface ModuleConfigMeta {
  entities: string[]
}

/** v5 module `meta`. Optional per the v5 shape (`browse_task` omits fields). */
export interface LicensedModuleMeta {
  layout?: string
  requiresAuth?: boolean
  layout_config?: LayoutConfig
  module_config?: ModuleConfigMeta
}

/** v5 module `menu`. `component` is the legacy manifest key (kept for fidelity). */
export interface LicensedModuleMenu {
  /** Route path this module mounts at. */
  path: string
  /** Legacy v5 manifest component name. In React the `implementations` map (keyed on `code`) replaces this. */
  component?: string
}

/**
 * One tenant-licensed module, modeled on v5's `GET bootstrap` entry shape.
 * `code` is the stable identity used to look up the React implementation.
 */
export interface LicensedModule {
  /** Stable module code — the key into {@link ModuleImplementationMap}. */
  code: string
  /** Human-readable name → the derived nav label. */
  name: string
  /** v5 base-module family (e.g. many `task/*` modules share `basemodule: 'task'`). */
  basemodule?: string
  meta?: LicensedModuleMeta
  menu: LicensedModuleMenu
}

/** Injectable source of the tenant's licensed modules (real API later; demo-kit in phase 3). */
export interface ModulesSource {
  getLicensedModules: () => Promise<LicensedModule[]>
}

/**
 * Display identity of the current user — what identity chrome (the rail
 * footer's `UserPopover`) shows. Separate from the privilege facts so gating
 * never depends on display fields; all optional because an API may not
 * surface them (the shell falls back to a decorative user item, see
 * `shell.tsx`).
 */
export interface UserIdentity {
  name?: string
  email?: string
  avatarSrc?: string
}

/** The current user's privilege facts, feeding {@link PrivilegeContext}. */
export interface PrivilegeUser {
  /** Permission strings the user holds. */
  privileges: string[]
  /** v5 `authUser.user_type`. Anything other than `'user'` bypasses gating. */
  userType: string
  /** Optional display identity (name/email/avatar) for identity chrome. */
  identity?: UserIdentity
}

/** Injectable source of the current user (real API later; demo-kit in phase 3). */
export interface UserSource {
  getUser: () => Promise<PrivilegeUser>
}

/**
 * Injectable blueprint resolver for the low-code composer path. Given a module's
 * `blueprintRef`, returns the single {@link ModuleBlueprint} node the composer
 * renders. Real API/demo-kit provide the implementation.
 */
export interface BlueprintSource {
  getBlueprint: (blueprintRef: string) => Promise<ModuleBlueprint>
}

/**
 * How the app wires a licensed `code` to its React implementation — the React
 * replacement for v5's component manifest. Exactly one path per implementation:
 *   - BESPOKE: provide `routes` (a lazy route loader, same contract as the skeleton).
 *   - LOW-CODE: provide `composerModule.blueprintRef` — v5-kit synthesizes the
 *     route, resolves the blueprint via `blueprintSource`, and renders it
 *     through v5-composer's `ComposedModule` (blueprint path).
 */
export interface ModuleImplementation {
  /** Bespoke path: the module supplies its own lazy route subtree. */
  routes?: ModuleRouteLoader
  /** Low-code path: render through the composer from a resolved blueprint. */
  composerModule?: { blueprintRef: string }
  /** Overrides merged over the nav entry derived from the licensed module. */
  navEntry?: Partial<NavEntry>
  /** Privileges a future gating layer requires (carried onto the FamsModule). */
  requiredPrivileges?: string[]
}

/** `code` → implementation. Unlicensed entries are NEVER referenced (decision #23). */
export type ModuleImplementationMap = Record<string, ModuleImplementation>

/**
 * Per-tenant runtime theming config.
 *
 * `tenant` selects the compiled `[data-tenant]` token block. `runtimeVars` is the
 * documented ESCAPE HATCH for tenants without a compiled block: raw CSS custom
 * properties applied to `<html>` at runtime (e.g. `{ '--color-primary': '#...' }`).
 */
export interface TenantRuntimeConfig {
  /** Value written to `<html data-tenant>`. */
  tenant: string
  /** Optional raw CSS custom-property overrides for tenants without a compiled token block. */
  runtimeVars?: Record<string, string>
  /**
   * Application grouping for the outer nav rail (apps ≠ modules — a tenant
   * has APPLICATIONS, each containing MODULES; see `apps.tsx`). Omit for a
   * tenant that hasn't opted in yet: `V5AppShell` falls back to a single
   * implicit app spanning every module, so nothing breaks.
   */
  applications?: AppDefinition[]
  /**
   * Pinned entries rendered ABOVE the application icons in the outer rail,
   * framed by dividers (`SideNav.preItems` — the Figma Inbox slot,
   * specs/inbox SPEC §Shell placement). Each pins one licensed MODULE; its
   * nav label/icon/path come from that module's resolved nav entry, so this
   * stays pure wiring (a module id + optional overrides), never a parallel
   * nav definition. An entry whose module didn't resolve is skipped.
   */
  railStart?: RailStartEntry[]
  /** Tenant branding surfaced in the outer rail (currently: the logo slot). */
  branding?: {
    /** Rendered in `SideNav`'s logo slot. Falls back to the `Logo` wordmark composite when unset. */
    logo?: ReactNode
    /**
     * Suppress the tenant NAME label rendered next to the rail logo. For a
     * tenant whose `logo` asset already contains its wordmark, the adjacent
     * text label is a duplicate. Purely presentational and scoped to that one
     * slot — `brandLabel` still feeds the top bar fallback title, the app
     * switcher and the command palette.
     */
    hideName?: boolean
    /**
     * Full brand wordmark shown while the rail is EXPANDED (the collapsed
     * `logo` stays the compact mark). Genuinely tenant-varying: each tenant
     * ships its own on-brand, white-on-rail asset. Falls back to `logo`.
     */
    logoExpanded?: ReactNode
    /**
     * Attribution wordmark pinned below the rail footer ("Powered By …").
     * White-label tenants set it; the first-party tenant does not.
     */
    poweredBy?: ReactNode
  }
  /**
   * Where the index route `/` LANDS. Unset (the default) — `/` renders the
   * metadata-driven Home launch pad, unchanged. Set to a licensed module id —
   * or the literal `'first'`, meaning the first entry of the tenant's ordered
   * `modules` array — and `/` redirects to that module's route instead. Home
   * keeps its route and its nav entry either way; an id that matches no
   * resolved module falls back to Home with a dev warning.
   */
  landingModule?: string
}

/** One pinned outer-rail entry (see {@link TenantRuntimeConfig.railStart}). */
export interface RailStartEntry {
  /** Stable rail-item id — also the key a {@link RailIndicatorSource} is queried with. */
  id: string
  /** Licensed module id this pinned entry navigates to. */
  module: string
  /** Tooltip/accessible label override; defaults to the module's nav label. */
  label?: string
  /** Glyph override; defaults to the module's nav icon. */
  icon?: ReactNode
}

/** App-supplied composer wiring for the low-code path. */
export interface ComposerConfig {
  /** Renderers keyed by template contract ref (from v5-composer's module-type registry). */
  renderers?: RendererRegistry
  /** Build the data adapter a resolved blueprint renders from. Defaults to an empty adapter. */
  createData?: (blueprint: ModuleBlueprint) => DataAdapter
}

/** The full v5 boot config. Every data seam is injectable. */
export interface BootstrapTenantConfig {
  /** Where the tenant's licensed modules come from. */
  modulesSource: ModulesSource
  /** `code` → React implementation. */
  implementations: ModuleImplementationMap
  /** Per-tenant theming (data-tenant + optional runtime var overrides). */
  tenant: TenantRuntimeConfig
  /** Optional current-user source feeding the privilege context. */
  user?: UserSource
  /** Optional blueprint resolver (required only if any implementation is low-code). */
  blueprintSource?: BlueprintSource
  /**
   * Optional cross-module rail-indicator source (the pinned rail entries'
   * notification dots — e.g. inbox unread). Injectable like every other data
   * seam; `createRailIndicators()` is the reference implementation.
   */
  railIndicators?: import('./rail-indicators').RailIndicatorSource
  /** Optional composer renderers / data-adapter factory for the low-code path. */
  composer?: ComposerConfig
  /** Optional forced theme mode; otherwise resolved from storage/OS by skeleton-kit. */
  defaultTheme?: 'light' | 'dark'
  /** Query defaults + per-class gcTime overrides (forwarded to skeleton-kit). */
  query?: import('@fams/skeleton-kit').QueryConfig
  /** Label rendered above the nav rail. */
  brandLabel?: string
  /** Component rendered at the index route `/` (forwarded to skeleton-kit). */
  indexComponent?: () => import('react').ReactNode
  /**
   * Override the root-shell chrome (forwarded to skeleton-kit as
   * `shellComponent`). Defaults to this package's `V5AppShell` — the real
   * two-bar `@fams/ui-kit` frame — so every v5-tier app gets it for free.
   * Pass a different component to opt out (e.g. a bespoke app-level shell).
   */
  shellComponent?: ComponentType<ShellComponentProps>
  /**
   * App logout hook. `V5App.logout()` wipes THIS tenant's query cache (perf rule
   * 8 / decision #23) and then invokes this callback (e.g. clear tokens, redirect).
   */
  onLogout?: () => void | Promise<void>
}

/** The resolution of licensed modules → skeleton contract, before app assembly. */
export interface ResolvedTenant {
  /** Only licensed modules WITH an implementation, as skeleton `FamsModule`s. */
  modules: FamsModule[]
  /** Licensed modules whose implementation was missing (skipped, warned). */
  skipped: LicensedModule[]
}

/** The composed v5 app — skeleton `FamsApp` plus v5 boot extras. */
export interface V5App {
  /** Root React component (privilege provider → skeleton app tree). */
  App: import('react').ComponentType
  /** The TanStack router instance. */
  router: import('@fams/skeleton-kit').FamsRouter
  /** The TanStack QueryClient. */
  queryClient: QueryClient
  /** The registered modules (licensed ∩ implemented). */
  modules: FamsModule[]
  /** Licensed-but-unimplemented modules that were skipped. */
  skipped: LicensedModule[]
  /** Wipe this tenant's query cache, then run the app's `onLogout` hook. */
  logout: () => Promise<void>
}
