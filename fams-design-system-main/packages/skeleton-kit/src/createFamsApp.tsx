import { type ComponentType } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, type RouterHistory } from '@tanstack/react-router'
import { RootErrorBoundary, type ErrorFallbackProps } from './error-boundary'
import {
  buildRouter,
  type FamsRouter,
  type RouteComponentFn,
  type RouteErrorComponentFn,
  type ShellComponentProps,
} from './router'
import { bootstrapTheme, type ThemeBootstrapConfig } from './theming'
import { createFamsQueryClient, type QueryConfig } from './query'
import type { FamsModule } from './types'

export interface FamsAppConfig {
  /** The app's modules. Routes + nav are derived from this list. */
  modules: FamsModule[]
  /** Theming bootstrap (data-theme resolution + data-tenant). */
  theme?: ThemeBootstrapConfig
  /** Query defaults + per-class gcTime overrides. Ignored if `queryClient` is passed. */
  query?: QueryConfig
  /** Provide a pre-built QueryClient instead of letting the skeleton create one. */
  queryClient?: QueryClient
  /** Root error boundary fallback override. */
  errorFallback?: ComponentType<ErrorFallbackProps>
  /** Route-level error component override. */
  routeErrorComponent?: RouteErrorComponentFn
  /** Label rendered above the nav rail. */
  brandLabel?: string
  /** Component rendered at the index route `/`. */
  indexComponent?: RouteComponentFn
  /** When set, `/` redirects here instead of rendering `indexComponent`. */
  indexRedirectTo?: string
  /** Router history override (e.g. memory history for tests). */
  history?: RouterHistory
  /** Override the root-shell chrome. Defaults to the package's minimal `AppShell`. */
  shellComponent?: ComponentType<ShellComponentProps>
}

export interface FamsApp {
  /** The root React component to render (wraps error boundary, query, router). */
  App: ComponentType
  /** The TanStack router instance (exposed for tests / advanced use). */
  router: FamsRouter
  /** The TanStack QueryClient instance. */
  queryClient: QueryClient
}

/**
 * The generic FAMS app boot function. Wires theming, query, routing (with
 * per-module lazy code-splitting) and error boundaries from a single typed
 * config. Product-agnostic: no product-specific vocabulary lives here.
 */
export function createFamsApp(config: FamsAppConfig): FamsApp {
  // Bootstrap theming synchronously at boot (before render) to avoid a flash.
  bootstrapTheme(config.theme)

  const queryClient = config.queryClient ?? createFamsQueryClient(config.query)

  const router = buildRouter({
    modules: config.modules,
    brandLabel: config.brandLabel,
    indexComponent: config.indexComponent,
    indexRedirectTo: config.indexRedirectTo,
    routeErrorComponent: config.routeErrorComponent,
    history: config.history,
    shellComponent: config.shellComponent,
  })

  function App() {
    return (
      <RootErrorBoundary fallback={config.errorFallback}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </RootErrorBoundary>
    )
  }
  App.displayName = 'FamsApp'

  return { App, router, queryClient }
}
