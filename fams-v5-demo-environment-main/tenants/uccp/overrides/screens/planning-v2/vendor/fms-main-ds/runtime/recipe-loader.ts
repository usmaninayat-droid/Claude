import { EntityStore } from '../sim/engine/entity-store';
import type { Persistence } from '../sim/engine/entity-store';
import { LocalStoragePersistence } from '../sim/persistence/local-storage';
import type { EntityConfig, EntityRecord, PipelineRules, UserContext } from '../sim/engine/types';
import { createAppRuntime } from './composition';
import type { AppRuntime, Recipe, ModuleSpec } from './composition';

/**
 * B3 — recipe bundle → live runtime.
 *
 * A recipe on disk is JSON (`recipes/<app>/<app>.recipe.json`) whose `config` /
 * `rules` / `seeds` entries point at sibling JSON files. The app statically
 * imports those files and hands them here as a `RecipeBundle`; this loader
 * registers entity configs, seeds the store ON FIRST LOAD ONLY (persisted
 * edits survive reloads), and binds the runtime. Pure TS — no React.
 */

/** The recipe JSON shape (module `config` is a path, resolved by the bundle). */
export interface RecipeJson {
  id: string;
  tenant: string;
  brand: Recipe['brand'];
  user?: UserContext;
  modules: (ModuleSpec & { config?: string | object })[];
  rules?: Record<string, string>;
  seeds?: Record<string, string>;
}

/** A module config JSON file — an EntityConfig plus schema/kind annotations. */
export type ModuleConfigJson = EntityConfig & { $schema?: string; kind?: string };

export interface RecipeBundle {
  recipe: RecipeJson;
  /** Entity code → module config (the imported *.module.json files). */
  configs: Record<string, ModuleConfigJson>;
  /** rulesRef → pipeline rules (the imported *.rules.json files). */
  rules?: Record<string, PipelineRules>;
  /** Entity code → seed records (the imported *.seed.json files). */
  seeds?: Record<string, EntityRecord[]>;
}

export interface InstantiatedRecipe {
  recipe: Recipe;
  store: EntityStore;
  runtime: AppRuntime;
}

/** Strip JSON annotations down to the registered EntityConfig. */
export function toEntityConfig(json: ModuleConfigJson): EntityConfig {
  const { $schema: _schema, kind: _kind, ...config } = json;
  return config;
}

export interface InstantiateOptions {
  /** Defaults to localStorage persistence keyed by the recipe tenant. */
  persistence?: Persistence;
  /** Current-user resolver (RBAC). Defaults to the recipe's `user`. */
  getUser?: () => UserContext;
}

export function instantiateRecipe(
  bundle: RecipeBundle,
  opts: InstantiateOptions = {},
): InstantiatedRecipe {
  const { recipe: json } = bundle;
  const persistence =
    opts.persistence ?? new LocalStoragePersistence({ tenant: json.tenant });
  const store = new EntityStore(persistence);
  const alreadyPersisted = persistence.load() != null;

  for (const config of Object.values(bundle.configs)) {
    store.registerConfig(toEntityConfig(config));
  }
  // Entity/pipeline modules may also carry their EntityConfig INLINE.
  for (const m of json.modules) {
    if ((m.type === 'entity' || m.type === 'pipeline') && m.config && typeof m.config === 'object') {
      store.registerConfig(toEntityConfig(m.config as ModuleConfigJson));
    }
  }
  if (!alreadyPersisted) {
    for (const [code, records] of Object.entries(bundle.seeds ?? {})) {
      store.seed(code, records);
    }
  }

  // The runtime keeps inline (object) configs on the spec; path strings are
  // bundle-resolution detail and are dropped.
  const recipe: Recipe = {
    id: json.id,
    tenant: json.tenant,
    brand: json.brand,
    user: json.user,
    modules: json.modules.map(({ config, ...spec }) => ({
      ...spec,
      config: typeof config === 'object' && config !== null ? config : undefined,
    })),
  };

  const runtime = createAppRuntime({
    recipe,
    store,
    rules: bundle.rules,
    getUser: opts.getUser,
  });

  return { recipe, store, runtime };
}
