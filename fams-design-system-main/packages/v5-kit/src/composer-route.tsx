import { useQuery } from '@tanstack/react-query'
import { createLazyRoute } from '@tanstack/react-router'
import { queryClassOptions, type ModuleRouteLoader } from '@fams/skeleton-kit'
import { ComposedModule, type DataAdapter } from '@fams/v5-composer'
import { Skeleton } from '@fams/ui-kit'
import type { BlueprintSource, ComposerConfig } from './types'

/** Adapter used when the app supplies no `composer.createData` (renders empties). */
const EMPTY_ADAPTER: DataAdapter = {
  list: () => [],
  get: () => undefined,
}

/**
 * Which geometry the first paint should reserve. Derived from the module's
 * licensed `meta.layout_config.views` at boot (no fetch needed), so a list
 * module never flashes a KPI strip and a map pane that never arrive — the
 * P1-2 finding against the previous one-shape-fits-all skeleton.
 */
export type ComposerPendingShape = 'neutral' | 'list' | 'kanban' | 'split' | 'dashboard'

export interface ComposerModulePendingProps {
  /** Defaults to the NEUTRAL single-body frame — never assert a layout we don't know. */
  shape?: ComposerPendingShape
}

/** Header row + filter chip row — every module surface has these. */
function PendingChrome() {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <Skeleton variant="rect" className="h-7 w-56" />
        <Skeleton variant="rect" className="h-9 w-40" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rect" className="h-9 w-28" />
        ))}
      </div>
    </>
  )
}

function PendingMetricStrip() {
  return (
    <div data-slot="composer-pending-metrics" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} variant="rect" className="h-24 w-full" />
      ))}
    </div>
  )
}

function PendingBody({ shape }: { shape: ComposerPendingShape }) {
  if (shape === 'split') {
    return (
      <div
        data-slot="composer-pending-split"
        className="grid min-h-96 flex-1 grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]"
      >
        <div className="flex flex-col gap-2">
          <Skeleton variant="rect" className="h-12 w-full" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rect" className="h-28 w-full" />
          ))}
        </div>
        <Skeleton variant="rect" className="h-full min-h-64 w-full" />
      </div>
    )
  }

  if (shape === 'kanban') {
    return (
      <div data-slot="composer-pending-kanban" className="grid min-h-96 flex-1 grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((col) => (
          <div key={col} className="flex flex-col gap-2">
            <Skeleton variant="rect" className="h-9 w-full" />
            {[0, 1, 2].map((card) => (
              <Skeleton key={card} variant="rect" className="h-24 w-full" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (shape === 'list') {
    return (
      <div data-slot="composer-pending-list" className="flex min-h-96 flex-1 flex-col gap-2">
        <Skeleton variant="rect" className="h-12 w-full" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} variant="rect" className="h-11 w-full" />
        ))}
      </div>
    )
  }

  if (shape === 'dashboard') {
    return (
      <div data-slot="composer-pending-dashboard" className="grid min-h-96 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rect" className="h-full min-h-40 w-full" />
        ))}
      </div>
    )
  }

  /* NEUTRAL — one honest body block. Asserts nothing about the layout. */
  return (
    <div data-slot="composer-pending-neutral" className="flex min-h-96 flex-1 flex-col">
      <Skeleton variant="rect" className="h-full min-h-64 w-full" />
    </div>
  )
}

/**
 * The composer route's first paint while a blueprint resolves. It reserves the
 * module surface's REAL geometry instead of a lone centered block, which read
 * as a blank white page and blew the CLS gate on every module (round-1 UX MUST
 * D.17 / F.27c).
 *
 * The geometry is now SHAPE-DEPENDENT (P1-2): the previous version painted the
 * cockpit's 6-up KPI strip, `2fr_3fr` split and 2-up band for every blueprint
 * module, so a list or kanban module flashed a layout that never arrived —
 * worse than a neutral block, because it asserts something wrong. Only the
 * `split`/`dashboard` shapes get the metric strip; the default is neutral.
 * Purely structural — no module vocabulary. `aria-busy` + a polite label
 * announce the wait once.
 */
export function ComposerModulePending({ shape = 'neutral' }: ComposerModulePendingProps = {}) {
  return (
    <div
      data-slot="composer-route-pending"
      data-shape={shape}
      role="status"
      aria-busy="true"
      aria-label="Loading module"
      className="flex h-full min-h-0 flex-col gap-4 p-6"
    >
      <PendingChrome />
      {shape === 'split' || shape === 'dashboard' ? <PendingMetricStrip /> : null}
      <PendingBody shape={shape} />
    </div>
  )
}

export interface ComposerModuleViewProps {
  blueprintRef: string
  tenant: string
  blueprintSource: BlueprintSource
  composer?: ComposerConfig
  /** First-paint geometry while the blueprint resolves (defaults to neutral). */
  pendingShape?: ComposerPendingShape
}

/**
 * The low-code composer route body. Resolves the module's blueprint via the
 * injected `blueprintSource` (cached under the per-tenant `[tenant, ...]`
 * queryKey convention, `static` class) and renders it through v5-composer's
 * `ComposedModule` (blueprint path). Exported for direct unit testing.
 */
export function ComposerModuleView({
  blueprintRef,
  tenant,
  blueprintSource,
  composer,
  pendingShape,
}: ComposerModuleViewProps) {
  const { data: blueprint, isPending, error } = useQuery({
    queryKey: [tenant, 'blueprint', blueprintRef],
    queryFn: () => blueprintSource.getBlueprint(blueprintRef),
    ...queryClassOptions('static'),
  })

  if (isPending) return <ComposerModulePending shape={pendingShape} />

  // Surface a resolution failure to the route-level error boundary.
  if (error) throw error
  if (!blueprint) throw new Error(`Blueprint "${blueprintRef}" resolved to nothing`)

  const data = composer?.createData?.(blueprint) ?? EMPTY_ADAPTER
  return <ComposedModule blueprint={blueprint} data={data} renderers={composer?.renderers} />
}

/**
 * Build a skeleton `ModuleRouteLoader` for the low-code path. The route is
 * assembled lazily (matching the bespoke path's code-splitting shape) and its
 * component is {@link ComposerModuleView}.
 */
export function makeComposerRouteLoader(opts: {
  path: string
  blueprintRef: string
  tenant: string
  blueprintSource: BlueprintSource
  composer?: ComposerConfig
  pendingShape?: ComposerPendingShape
}): ModuleRouteLoader {
  return () =>
    Promise.resolve(
      createLazyRoute(opts.path)({
        component: () => (
          <ComposerModuleView
            blueprintRef={opts.blueprintRef}
            tenant={opts.tenant}
            blueprintSource={opts.blueprintSource}
            composer={opts.composer}
            pendingShape={opts.pendingShape}
          />
        ),
      }),
    )
}
