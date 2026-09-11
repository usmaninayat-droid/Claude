import type { FamsModule } from '@fams/skeleton-kit'
import { makeComposerRouteLoader, type ComposerPendingShape } from './composer-route'
import type {
  BlueprintSource,
  ComposerConfig,
  LicensedModule,
  ModuleImplementation,
  ModuleImplementationMap,
  ResolvedTenant,
  TenantRuntimeConfig,
} from './types'

/**
 * Which first-paint geometry a low-code module's pending skeleton should
 * reserve (P1-2). Read from the licensed module's own `meta.layout_config`,
 * which boot already has — no blueprint fetch needed. Unknown or absent
 * layout config falls back to the NEUTRAL frame: never assert a layout we
 * cannot know.
 */
function pendingShapeOf(meta: LicensedModule['meta']): ComposerPendingShape {
  const views = meta?.layout_config?.views ?? []
  if (views.includes('hybrid')) return 'split'
  if (views.includes('dashboard')) return 'dashboard'
  if (views.includes('kanban')) return 'kanban'
  if (views.includes('list') || views.includes('table')) return 'list'
  return 'neutral'
}

/** Dev-only LOUD warning (silenced in production builds, like React's own dev warnings). */
function devWarn(message: string): void {
  // Exact literal form required — Vite/esbuild define substitution matches only `process.env.NODE_ENV`, not with optional chain.
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return
  console.warn(`[@fams/v5-kit] ${message}`)
}

export interface ResolveTenantOptions {
  /** The tenant's licensed modules (from `ModulesSource`). */
  licensed: LicensedModule[]
  /** `code` → React implementation. */
  implementations: ModuleImplementationMap
  /** Tenant config (its `tenant` id prefixes composer blueprint queryKeys). */
  tenant: TenantRuntimeConfig
  /** Blueprint resolver — required only for low-code (composerModule) implementations. */
  blueprintSource?: BlueprintSource
  /** Composer renderers / data-adapter factory for the low-code path. */
  composer?: ComposerConfig
}

/**
 * Turn the tenant's licensed-module list into the skeleton module contract.
 *
 * DECISION #23 (licensed-only registration): iteration is driven by the
 * LICENSED array, and `implementations[code]` is read ONLY for a licensed code.
 * An unlicensed implementation in the map is never referenced — its lazy
 * `routes` loader is never touched, so its chunk is never requested. (The unit
 * test asserts this with a spy on an unlicensed loader.)
 *
 * A licensed module with NO implementation is a LOUD dev warning and is SKIPPED
 * — the opposite of v5's silent route skip when a manifest entry was missing.
 */
export function resolveTenantModules(opts: ResolveTenantOptions): ResolvedTenant {
  const { licensed, implementations, tenant, blueprintSource, composer } = opts
  const modules: FamsModule[] = []
  const skipped: LicensedModule[] = []

  for (const licensedModule of licensed) {
    const impl = implementations[licensedModule.code]
    if (!impl) {
      devWarn(
        `Licensed module "${licensedModule.code}" (${licensedModule.name}) has no implementation ` +
          `in the implementations map — route SKIPPED. Register it under implementations["${licensedModule.code}"].`,
      )
      skipped.push(licensedModule)
      continue
    }

    const built = buildModule(licensedModule, impl, { tenant, blueprintSource, composer })
    if (!built) {
      skipped.push(licensedModule)
      continue
    }
    modules.push(built)
  }

  return { modules, skipped }
}

function buildModule(
  licensedModule: LicensedModule,
  impl: ModuleImplementation,
  ctx: {
    tenant: TenantRuntimeConfig
    blueprintSource?: BlueprintSource
    composer?: ComposerConfig
  },
): FamsModule | undefined {
  const path = impl.navEntry?.path ?? licensedModule.menu.path
  const navEntry = {
    label: licensedModule.name,
    path,
    ...impl.navEntry,
  }

  // Low-code (composer) path.
  if (impl.composerModule) {
    if (!ctx.blueprintSource) {
      devWarn(
        `Module "${licensedModule.code}" declares a composerModule but no ` +
          `blueprintSource was provided to bootstrapTenant — route SKIPPED.`,
      )
      return undefined
    }
    return {
      id: licensedModule.code,
      navEntry,
      routes: makeComposerRouteLoader({
        path,
        blueprintRef: impl.composerModule.blueprintRef,
        tenant: ctx.tenant.tenant,
        blueprintSource: ctx.blueprintSource,
        composer: ctx.composer,
        pendingShape: pendingShapeOf(licensedModule.meta),
      }),
      requiredPrivileges: impl.requiredPrivileges,
    }
  }

  // Bespoke path.
  if (impl.routes) {
    return {
      id: licensedModule.code,
      navEntry,
      routes: impl.routes,
      requiredPrivileges: impl.requiredPrivileges,
    }
  }

  devWarn(
    `Implementation for "${licensedModule.code}" declares neither ` +
      `\`routes\` (bespoke) nor \`composerModule\` (low-code) — route SKIPPED.`,
  )
  return undefined
}
