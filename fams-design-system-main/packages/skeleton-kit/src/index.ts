// ─────────────────────────────────────────────────────────────────────────
// @fams/skeleton-kit — the generic app boot layer (core tier, product-agnostic)
// ─────────────────────────────────────────────────────────────────────────

// Boot
export { createFamsApp, type FamsAppConfig, type FamsApp } from './createFamsApp'

// Module contract
export type {
  FamsModule,
  NavEntry,
  ModuleRouteLoader,
  ModuleRouteEntry,
  ModuleSearchValidator,
} from './types'

// Routing
export {
  buildRouter,
  withNavRouteDriftGuard,
  withAdditionalRouteDriftGuard,
  DefaultRouteErrorComponent,
  type BuildRouterOptions,
  type FamsRouter,
  type ShellComponentProps,
} from './router'
export { AppShell, deriveNavEntries, type AppShellProps, type DerivedNavItem } from './shell'

// Query
export {
  createFamsQueryClient,
  queryClassOptions,
  gcTimeForClass,
  DEFAULT_GC_TIMES,
  type QueryClass,
  type QueryConfig,
} from './query'

// Theming
export {
  useTheme,
  setTheme,
  getTheme,
  toggleTheme,
  bootstrapTheme,
  resolveInitialTheme,
  type ThemeMode,
  type ThemeBootstrapConfig,
  type DefaultThemeMode,
} from './theming'

// Error boundaries
export {
  RootErrorBoundary,
  DefaultErrorFallback,
  type ErrorFallbackProps,
} from './error-boundary'
