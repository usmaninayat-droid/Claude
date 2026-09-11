import { InMemoryDataStore } from './store'
import type { Persistence } from './store'
import type { EntityConfig, EntityRecord, PipelineRules, UserContext } from './types'
import { createAppRuntime } from './composition'
import type { AppRuntime, Blueprint, ModuleSpec } from './composition'

/**
 * Blueprint bundle → live runtime. Ported from Shaheer's
 * `src/runtime/recipe-loader.ts` with the recipe → blueprint rename.
 *
 * A blueprint on disk is JSON (`blueprints/<app>/<app>.blueprint.json`) whose
 * `config` / `rules` / `seeds` entries point at sibling JSON files. The app
 * statically imports those files and hands them here as a `BlueprintBundle`;
 * this loader registers entity configs, seeds the store ON FIRST LOAD ONLY
 * (persisted edits survive reloads when a persistence adapter is supplied), and
 * binds the runtime. Pure TS — no React.
 *
 * Persistence is INJECTED and OPTIONAL. When `opts.persistence` is absent the
 * store is purely in-memory — the original defaulted to a browser
 * `LocalStoragePersistence`, which is removed here (never touches
 * `window.localStorage`). Phase 3's demo-kit provides persistent adapters
 * behind the same `Persistence` interface.
 */

/** The blueprint JSON shape (module `config` is a path, resolved by the bundle). */
export interface BlueprintJson {
  id: string
  tenant: string
  brand: Blueprint['brand']
  user?: UserContext
  modules: (ModuleSpec & { config?: string | object })[]
  rules?: Record<string, string>
  seeds?: Record<string, string>
}

/** A module config JSON file — an EntityConfig plus schema/kind annotations. */
export type ModuleConfigJson = EntityConfig & { $schema?: string; kind?: string }

export interface BlueprintBundle {
  blueprint: BlueprintJson
  /** Entity code → module config (the imported *.module.json files). */
  configs: Record<string, ModuleConfigJson>
  /** rulesRef → pipeline rules (the imported *.rules.json files). */
  rules?: Record<string, PipelineRules>
  /** Entity code → seed records (the imported *.seed.json files). */
  seeds?: Record<string, EntityRecord[]>
}

export interface InstantiatedBlueprint {
  blueprint: Blueprint
  store: InMemoryDataStore
  runtime: AppRuntime
}

/** Strip JSON annotations ($schema / kind) down to the registered EntityConfig. */
export function toEntityConfig(json: ModuleConfigJson): EntityConfig {
  const config: ModuleConfigJson = { ...json }
  delete config.$schema
  delete config.kind
  return config
}

export interface InstantiateOptions {
  /**
   * Persistence adapter. OMIT for a pure in-memory store (the default — never
   * `window.localStorage`). Phase 3's demo-kit supplies persistent adapters.
   */
  persistence?: Persistence
  /** Current-user resolver (RBAC). Defaults to the blueprint's `user`. */
  getUser?: () => UserContext
}

export function instantiateBlueprint(
  bundle: BlueprintBundle,
  opts: InstantiateOptions = {},
): InstantiatedBlueprint {
  const { blueprint: json } = bundle
  // No browser default: when no persistence adapter is injected, the store is
  // purely in-memory.
  const persistence = opts.persistence
  const store = new InMemoryDataStore(persistence)
  const alreadyPersisted = persistence?.load() != null

  for (const config of Object.values(bundle.configs)) {
    store.registerConfig(toEntityConfig(config))
  }
  // Entity/pipeline modules may also carry their EntityConfig INLINE.
  for (const m of json.modules) {
    if ((m.type === 'entity' || m.type === 'pipeline') && m.config && typeof m.config === 'object') {
      store.registerConfig(toEntityConfig(m.config as ModuleConfigJson))
    }
  }
  if (!alreadyPersisted) {
    for (const [code, records] of Object.entries(bundle.seeds ?? {})) {
      store.seed(code, records)
    }
  }

  // The runtime keeps inline (object) configs on the spec; path strings are
  // bundle-resolution detail and are dropped.
  const blueprint: Blueprint = {
    id: json.id,
    tenant: json.tenant,
    brand: json.brand,
    user: json.user,
    modules: json.modules.map(({ config, ...spec }) => ({
      ...spec,
      config: typeof config === 'object' && config !== null ? config : undefined,
    })),
  }

  const runtime = createAppRuntime({
    blueprint,
    store,
    rules: bundle.rules,
    getUser: opts.getUser,
  })

  return { blueprint, store, runtime }
}
