import { QueryClient, type QueryClientConfig } from '@tanstack/react-query'

/**
 * Query classes (performance rule 8). `gcTime` controls how long an INACTIVE
 * query's cache is retained before garbage collection. Classifying queries by
 * how volatile their data is keeps memory bounded without hand-tuning every
 * call site. Fully generic — no product semantics.
 */
export type QueryClass = 'static' | 'session' | 'volatile'

/** Default per-class gcTime presets (ms). Override per-app via {@link QueryConfig}. */
export const DEFAULT_GC_TIMES: Record<QueryClass, number> = {
  static: 24 * 60 * 60 * 1000, // 24h — reference data that rarely changes
  session: 30 * 60 * 1000, //      30m — stable for the length of a session
  volatile: 30 * 1000, //           30s — frequently-changing, short-lived
}

export interface QueryConfig {
  /** Override any per-class gcTime preset. */
  gcTimes?: Partial<Record<QueryClass, number>>
  /** Extra QueryClient config merged over the built-in sensible defaults. */
  clientConfig?: QueryClientConfig
}

/** Resolve the gcTime for a class, honouring per-app overrides. */
export function gcTimeForClass(cls: QueryClass, config?: QueryConfig): number {
  return config?.gcTimes?.[cls] ?? DEFAULT_GC_TIMES[cls]
}

/**
 * Spread into a useQuery / queryOptions call to apply a class's gcTime:
 *   useQuery({ queryKey, queryFn, ...queryClassOptions('static') })
 */
export function queryClassOptions(cls: QueryClass, config?: QueryConfig): { gcTime: number } {
  return { gcTime: gcTimeForClass(cls, config) }
}

/**
 * Create a QueryClient with sensible generic defaults. Per-query gcTime is set
 * at the call site via {@link queryClassOptions}; the client's own default
 * gcTime uses the `session` preset as a reasonable middle ground.
 */
export function createFamsQueryClient(config?: QueryConfig): QueryClient {
  return new QueryClient({
    ...config?.clientConfig,
    defaultOptions: {
      ...config?.clientConfig?.defaultOptions,
      queries: {
        gcTime: gcTimeForClass('session', config),
        staleTime: 30 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
        ...config?.clientConfig?.defaultOptions?.queries,
      },
    },
  })
}
