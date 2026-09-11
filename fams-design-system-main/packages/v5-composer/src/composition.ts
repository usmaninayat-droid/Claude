import { InMemoryDataStore } from './store'
import type { ListQuery } from './store'
import type { EntityRecord, PipelineRules, UserContext } from './types'
import { allowedTransitions, isTaskVisible } from './rules'

/**
 * Dynamic composition core — the heart of the v5 low-code platform. Ported from
 * Shaheer's `src/runtime/composition.ts`; the user-facing "recipe" vocabulary
 * is renamed to **blueprint** (locked: a blueprint is what the composer reads).
 *
 * An **app** is a `Blueprint`: a tenant brand + an ordered list of `ModuleSpec`s.
 * Each module names a **type** (the fixed menu, extensible) and a **data source**
 * (an entity `code` + optional rules), NOT static data. The runtime resolves
 * data live from the injected data store, applies RBAC + transition rules, and
 * persists via the store — so any app/use-case is composed from config.
 *
 * React-free (pure TS, verifiable). The React templates plug on top via the
 * module-type registry and consume `AppRuntime` through the composer entry.
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
  | 'zones'
  | 'pois'
  | (string & {})

export type ViewKind =
  | 'list'
  | 'kanban'
  | 'hybrid'
  | 'map'
  | 'calendar'
  | 'grouped-list'
  | 'grid'
  /**
   * Operations-console lenses (2026-09-08). Each is a VIEW KIND over an
   * existing module type (entity / pipeline / live-monitoring) — never a new
   * module type, per PLATFORM-MODEL doctrine. Their bodies live in
   * `@fams/v5-templates` (`views/consoles/*`) and are resolved by
   * `ModuleViewBody`'s kind switch, exactly like `kanban` / `calendar`.
   */
  | 'dispatcher-cockpit'
  | 'triage-console'
  | 'fleet-console'
  | 'workforce-pulse'

/**
 * A view entry as a blueprint may author it — the bare KIND string (its label
 * comes from `VIEW_LABEL`, unchanged behaviour for every existing blueprint),
 * or an object carrying a per-module LABEL and tab ICON override.
 *
 * The object form exists because a module can legitimately name its own lens:
 * the core `operations-center` pipeline offers three console lenses that read
 * as "Dispatcher Cockpit" / "Triage Console" / "Fleet Manager Console" on the
 * tab strip, and those strings are module metadata, not engine vocabulary. The
 * engine still only ever branches on `kind`.
 */
export interface ViewSpecObject {
  kind: ViewKind
  /** Tab label override. Omit → the kind's `VIEW_LABEL` default. */
  label?: string
  /** Tab glyph name, resolved against the icon set at render time. */
  icon?: string
}

/** A blueprint-authored view entry: a bare kind, or a labelled/iconed object. */
export type ViewSpec = ViewKind | ViewSpecObject

/** A view entry after normalization — always a kind PLUS a resolved label. */
export interface ResolvedView {
  kind: ViewKind
  label: string
  icon?: string
}

/** Binds a module to its data — an entity `code` in the store + optional rules. */
export interface DataSourceBinding {
  /** Entity code registered in the store (e.g. "crm/deals"). */
  code: string
  /** Key into the blueprint's rules registry (pipelines). */
  rulesRef?: string
}

export interface CreateSpec {
  /** Form field ids → systemcol/title/status mapping target. */
  fields?: { id: string; label: string; type?: string; required?: boolean }[]
  /**
   * Group the fields into a stepped (multi-step) create form. Each step lists
   * the field ids it shows, in order. Omit for a single-step form.
   */
  steps?: { id: string; title: string; fields: string[] }[]
  /** Map raw form values → an EAV record patch. */
  map?: (values: Record<string, string>) => Partial<EntityRecord>
}

export interface ModuleSpec {
  id: string
  type: ModuleType
  label: string
  /** Rail icon name (resolved against the icon set at render time). */
  icon?: string
  /** Views to expose as tabs; defaults come from the module-type registry.
   *  Accepts bare kinds or `{ kind, label?, icon? }` objects (see `ViewSpec`). */
  views?: ViewSpec[]
  /** Where the module's data comes from. Omitted for instance modules. */
  dataSource?: DataSourceBinding
  /**
   * Per-type module config. entity/pipeline modules register theirs in the
   * store (EntityConfig); the other types carry an inline JSON config here,
   * interpreted by the app-level module mapping.
   */
  config?: unknown
  /** Optional Create-New surface. */
  create?: CreateSpec
}

export interface TenantBrand {
  name: string
  /** Per-tenant CSS-var overrides applied on the shell root (local theming). */
  theme?: Record<string, string>
  /** Logo asset id / src. */
  logo?: string
}

/** A complete app/use-case — composed entirely from config. */
export interface Blueprint {
  id: string
  tenant: string
  brand: TenantBrand
  modules: ModuleSpec[]
  user?: UserContext
}

/* ── Runtime ────────────────────────────────────────────────────────────────── */

export interface AppRuntimeOptions {
  blueprint: Blueprint
  store: InMemoryDataStore
  /** Pipeline rules by `rulesRef`. */
  rules?: Record<string, PipelineRules>
  /** Current user resolver (RBAC + transitions). Defaults to blueprint.user. */
  getUser?: () => UserContext
}

export interface ModuleHandle {
  spec: ModuleSpec
  /** RBAC-filtered list (applies task_rules when the module has pipeline rules). */
  list: (query?: ListQuery) => EntityRecord[]
  get: (id: string) => EntityRecord | undefined
  create: (input: Partial<EntityRecord>) => EntityRecord
  /** Valid next stages for a record, given the current user's permissions. */
  transitions: (id: string) => string[]
  /** Rule-enforced stage move; throws if the transition isn't permitted. */
  move: (id: string, toStage: string) => EntityRecord
  /** Patch arbitrary fields on a record (e.g. owner/assignee), persisted. */
  update: (id: string, patch: Partial<EntityRecord>) => EntityRecord | undefined
  /** Delete a record (the store's SOFT delete — it never drops the row). */
  remove: (id: string) => boolean
}

/**
 * Bind a blueprint to the data store and expose per-module operations that
 * respect RBAC + transition rules and persist. This is the seam every
 * renderer/adapter sits on; swap the store's persistence for a real backend
 * with no change here.
 */
export function createAppRuntime(opts: AppRuntimeOptions) {
  const { blueprint, store } = opts
  const rulesMap = opts.rules ?? {}
  const getUser = opts.getUser ?? (() => blueprint.user ?? { id: 'anon', roles: [] })

  const rulesFor = (spec: ModuleSpec): PipelineRules | undefined =>
    spec.dataSource?.rulesRef ? rulesMap[spec.dataSource.rulesRef] : undefined

  const handle = (spec: ModuleSpec): ModuleHandle => {
    const code = spec.dataSource?.code
    if (!code) throw new Error(`Module "${spec.id}" has no dataSource.code`)
    const rules = rulesFor(spec)

    return {
      spec,
      list: (query) => {
        const rows = store.list(code, query).records
        if (!rules) return rows
        const user = getUser()
        return rows.filter((r) => isTaskVisible(rules, user, r))
      },
      get: (id) => store.read(code, id),
      create: (input) => store.create(code, input),
      transitions: (id) => {
        const rec = store.read(code, id)
        if (!rec || !rules) return []
        return allowedTransitions(rules, getUser(), rec)
      },
      move: (id, toStage) => {
        const rec = store.read(code, id)
        if (!rec) throw new Error(`${code}: record ${id} not found`)
        if (rules && !allowedTransitions(rules, getUser(), rec).includes(toStage)) {
          throw new Error(
            `Transition ${rec.status} → ${toStage} not permitted for [${getUser().roles.join(', ')}]`,
          )
        }
        return store.update(code, id, { status: toStage })!
      },
      update: (id, patch) => store.update(code, id, patch),
      remove: (id) => store.remove(code, id),
    }
  }

  // Only data-bound modules get handles; instance/config-only modules
  // (dashboard, reports, settings, calendar…) have no store binding.
  const handles = new Map(
    blueprint.modules.filter((m) => m.dataSource?.code).map((m) => [m.id, handle(m)] as const),
  )

  return {
    blueprint,
    store,
    /** Every DATA-BOUND module handle, in blueprint order. */
    modules: blueprint.modules.filter((m) => handles.has(m.id)).map((m) => handles.get(m.id)!),
    /** Look up one module's handle by id (throws for unbound modules). */
    module: (id: string): ModuleHandle => {
      const h = handles.get(id)
      if (!h) throw new Error(`No data-bound module "${id}" in app "${blueprint.id}"`)
      return h
    },
  }
}

export type AppRuntime = ReturnType<typeof createAppRuntime>
