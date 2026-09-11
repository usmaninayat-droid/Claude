import { EntityStore } from '../sim/engine/entity-store';
import type { EntityRecord, PipelineRules, UserContext } from '../sim/engine/types';
import { allowedTransitions, isTaskVisible } from '../sim/engine/rules';
import type { ListQuery } from '../sim/engine/entity-store';

/**
 * Dynamic composition core — the heart of the rebuilt V5 platform.
 *
 * An **app** is a `Recipe`: a tenant brand + an ordered list of `ModuleSpec`s.
 * Each module names a **type** (the fixed menu, extensible) and a **data
 * source** (a sim entity `code` + optional rules), NOT static data. The runtime
 * resolves data live from the sim engine, applies RBAC + transition rules, and
 * persists — so any app/use-case is composed from config, with existing or new
 * modules, and behaves faithfully with no backend.
 *
 * This file is React-free (pure TS, verifiable). The React renderers
 * (in `src/components/app-shell`) plug on top via the
 * module-type registry and consume `AppRuntime` through the bridge.
 */

/* ── Vocabulary ─────────────────────────────────────────────────────────────── */

/** The fixed menu of module types — `(string & {})` keeps it open for new types. */
export type ModuleType =
  | 'entity'
  | 'pipeline'
  | 'dashboard'
  | 'live-monitoring'
  | 'reports'
  | 'inbox'
  | 'settings'
  | 'calendar'
  | 'forms'
  | (string & {});

export type ViewKind = 'list' | 'kanban' | 'hybrid' | 'map' | 'calendar' | 'grouped-list';

/** Binds a module to its data — an entity `code` in the sim store + optional rules. */
export interface DataSourceBinding {
  /** Entity code registered in the sim store (e.g. "crm/deals"). */
  code: string;
  /** Key into the recipe's rules registry (pipelines). */
  rulesRef?: string;
}

export interface CreateSpec {
  /** Form field ids → systemcol/title/status mapping target. */
  fields?: { id: string; label: string; type?: string; required?: boolean }[];
  /**
   * Group the fields into a stepped (multi-step) create form. Each step lists the
   * field ids it shows, in order. Omit for a single-step form.
   */
  steps?: { id: string; title: string; fields: string[] }[];
  /** Map raw form values → an EAV record patch. */
  map?: (values: Record<string, string>) => Partial<EntityRecord>;
}

export interface ModuleSpec {
  id: string;
  type: ModuleType;
  label: string;
  /** Rail icon name (resolved against the icon set at render time). */
  icon?: string;
  /** Views to expose as tabs; defaults come from the module-type registry. */
  views?: ViewKind[];
  /** Where the module's data comes from. Omitted for instance modules (dashboard/reports). */
  dataSource?: DataSourceBinding;
  /**
   * Per-type module config. entity/pipeline modules register theirs in the
   * store (EntityConfig); the other types (dashboard, reports, inbox,
   * live-monitoring, settings, calendar, forms) carry an inline JSON config
   * here, interpreted by the shell's runtime-app mapping.
   */
  config?: unknown;
  /** Optional Create-New surface. */
  create?: CreateSpec;
}

export interface TenantBrand {
  name: string;
  /** Per-tenant CSS-var overrides applied on the shell root (local theming). */
  theme?: Record<string, string>;
  /** Logo asset id / src. */
  logo?: string;
}

/** A complete app/use-case — composed entirely from config. */
export interface Recipe {
  id: string;
  tenant: string;
  brand: TenantBrand;
  modules: ModuleSpec[];
  user?: UserContext;
}

/* ── Runtime ────────────────────────────────────────────────────────────────── */

export interface AppRuntimeOptions {
  recipe: Recipe;
  store: EntityStore;
  /** Pipeline rules by `rulesRef`. */
  rules?: Record<string, PipelineRules>;
  /** Current user resolver (RBAC + transitions). Defaults to recipe.user. */
  getUser?: () => UserContext;
}

export interface ModuleHandle {
  spec: ModuleSpec;
  /** RBAC-filtered list (applies task_rules when the module has pipeline rules). */
  list: (query?: ListQuery) => EntityRecord[];
  get: (id: string) => EntityRecord | undefined;
  create: (input: Partial<EntityRecord>) => EntityRecord;
  /** Valid next stages for a record, given the current user's permissions. */
  transitions: (id: string) => string[];
  /** Rule-enforced stage move; throws if the transition isn't permitted. */
  move: (id: string, toStage: string) => EntityRecord;
  /** Patch arbitrary fields on a record (e.g. owner/assignee), persisted. */
  update: (id: string, patch: Partial<EntityRecord>) => EntityRecord | undefined;
}

/**
 * Bind a recipe to the sim store and expose per-module operations that respect
 * RBAC + transition rules and persist. This is the seam every renderer/bridge
 * sits on; swap the store's adapter for a real backend with no change here.
 */
export function createAppRuntime(opts: AppRuntimeOptions) {
  const { recipe, store } = opts;
  const rulesMap = opts.rules ?? {};
  const getUser = opts.getUser ?? (() => recipe.user ?? { id: 'anon', roles: [] });

  const rulesFor = (spec: ModuleSpec): PipelineRules | undefined =>
    spec.dataSource?.rulesRef ? rulesMap[spec.dataSource.rulesRef] : undefined;

  const handle = (spec: ModuleSpec): ModuleHandle => {
    const code = spec.dataSource?.code;
    if (!code) throw new Error(`Module "${spec.id}" has no dataSource.code`);
    const rules = rulesFor(spec);

    return {
      spec,
      list: (query) => {
        const rows = store.list(code, query).records;
        if (!rules) return rows;
        const user = getUser();
        return rows.filter((r) => isTaskVisible(rules, user, r));
      },
      get: (id) => store.read(code, id),
      create: (input) => store.create(code, input),
      transitions: (id) => {
        const rec = store.read(code, id);
        if (!rec || !rules) return [];
        return allowedTransitions(rules, getUser(), rec);
      },
      move: (id, toStage) => {
        const rec = store.read(code, id);
        if (!rec) throw new Error(`${code}: record ${id} not found`);
        if (rules && !allowedTransitions(rules, getUser(), rec).includes(toStage)) {
          throw new Error(
            `Transition ${rec.status} → ${toStage} not permitted for [${getUser().roles.join(', ')}]`,
          );
        }
        return store.update(code, id, { status: toStage })!;
      },
      update: (id, patch) => store.update(code, id, patch),
    };
  };

  // Only data-bound modules get handles; instance/config-only modules
  // (dashboard, reports, settings, calendar…) have no store binding.
  const handles = new Map(
    recipe.modules.filter((m) => m.dataSource?.code).map((m) => [m.id, handle(m)] as const),
  );

  return {
    recipe,
    store,
    /** Every DATA-BOUND module handle, in recipe order. */
    modules: recipe.modules.filter((m) => handles.has(m.id)).map((m) => handles.get(m.id)!),
    /** Look up one module's handle by id (throws for unbound modules). */
    module: (id: string): ModuleHandle => {
      const h = handles.get(id);
      if (!h) throw new Error(`No data-bound module "${id}" in app "${recipe.id}"`);
      return h;
    },
  };
}

export type AppRuntime = ReturnType<typeof createAppRuntime>;
