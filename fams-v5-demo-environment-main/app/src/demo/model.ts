import { http, HttpResponse } from 'msw'
import type { RequestHandler } from 'msw'
import type { EndpointContract, EntitySchema, FieldDef, RefDef, RelationalStore, SeedSet, PersonaDef } from '@fams/demo-kit'
import type { LicensedModule } from '@fams/v5-kit'
import { resolveModuleViews } from '@fams/v5-composer'
import type { ModuleBlueprint } from '@fams/v5-composer'
import type { DemoUser, ResolvedConfig, TenantManifest } from './content'
import { isEntityConfig, moduleLabel, moduleLayout } from './content'

/**
 * The v5 adaptation layer — this is where v5 product vocabulary lives (the
 * demo-kit tier is deliberately generic, so the bridge lives in the app). It
 * turns committed `resolved/` blueprints + seeds into: demo-kit entity schemas,
 * a demo-kit SeedSet, the v5-shaped MSW endpoint contract, a role → privilege
 * map, and the `ModuleBlueprint` node the composer renders.
 */

/** role → privileges. The dispatcher is deliberately narrower than the admin so
 *  the persona switch shows real differences: no `ticketing.create` (no New on
 *  the board), no `asset.create`, and no `settings.view` (the admin module is
 *  hidden from the rail). The dispatcher CAN create workforce (the coherence
 *  walkthrough runs as either persona). */
/** The admin privilege list, factored out so `u_superadmin` can be DERIVED from
 *  it (spread, not hand-retyped) — the admin role is already, by design, the
 *  maximal wired privilege set for every module (every module's `.view` plus
 *  create/update/delete wherever the module actually has them). Hand-typing a
 *  second copy from memory is exactly the class of bug that already caused a
 *  P0 in this run (a licensed-but-missing privilege silently drops a module
 *  from the bootstrap payload — see the `preventive-maintenance.view` note
 *  below), so `superadmin` below is a spread of this array, never a literal. */
const ADMIN_PRIVILEGES = [
  'asset.view', 'asset.create', 'asset.update',
  'workforce.view', 'workforce.create', 'workforce.update',
  'ticketing.view', 'ticketing.create', 'ticketing.update', 'ticketing.delete',
  'pipelines.view', 'pipelines.create', 'pipelines.update', 'pipelines.delete',
  // Preventive Maintenance is a tenant-native entity module and is gated the
  // same way as its sibling record-owning modules — without `.view` here,
  // `buildBootstrapModules` drops it from the payload entirely, so the
  // launchpad has no tile AND the SPA registers no route for it (D-3 P0).
  'preventive-maintenance.view', 'preventive-maintenance.create',
  'preventive-maintenance.update', 'preventive-maintenance.delete',
  // Job Orders — the corrective-maintenance pipeline Preventive Maintenance
  // feeds via the blueprint-declared record automation. Same gotcha as the
  // note above: without `.view` here `buildBootstrapModules` drops the module
  // from the bootstrap payload entirely (no launchpad tile, no registered
  // route), even though tenants/fams/tenant.json licenses it. `.create` is
  // load-bearing for the CreationSheet wizard's own "New" button — the
  // composer data adapter only exposes `create` when the persona holds it.
  // (Comment-only correction, fix7/Task 3: this previously claimed "the PM
  // automation creates the job order through that same adapter seam" — false.
  // Phase 7 and fix7's own audit trail wiring (`composer-data.ts`'s
  // `evalRecordAutomations` loop) confirmed the automation writes
  // `buffers`/`api` DIRECTLY, never through the privilege-gated
  // `adapter.create`, so it fires regardless of whether the acting persona
  // holds `job-orders.create` — harmless in this demo, but this grant is not
  // why the automation works.)
  'job-orders.view', 'job-orders.create', 'job-orders.update', 'job-orders.delete',
  'telematics-dashboard.view', 'fuel-monitoring.view', 'vehicle-behaviour.view',
  'live-monitoring.view',
  // UCCP app (flood-response showcase): Incidents pipeline + the Weather
  // Stations entity (`rain-sensors` module id, kept for URL/id stability —
  // see tenants/uccp/modules/rain-sensors/blueprint.json's `name`). Without
  // these two `.view` grants `buildBootstrapModules` drops both modules from
  // the bootstrap payload entirely — the same class of bug flagged by the
  // `preventive-maintenance.view` note above (rail shows only Live
  // Monitoring, no route registers for either module).
  'incidents.view', 'incidents.create', 'incidents.update', 'incidents.delete',
  // Smart Planning (flood-response pre-position plans) — same gotcha as the
  // note above: without `.view` here `buildBootstrapModules` drops the module
  // from the bootstrap payload entirely (rail shows no entry, no route
  // registers), even though it is fully licensed in tenants/uccp/tenant.json.
  'smart-planning.view', 'smart-planning.create', 'smart-planning.update', 'smart-planning.delete',
  // Plan Monitoring (the operational, daily-execution twin of Smart Planning)
  // — same gotcha as the notes above: without `.view` here
  // `buildBootstrapModules` drops the module from the bootstrap payload
  // entirely, even though it is fully licensed in tenants/uccp/tenant.json.
  'plan-monitoring.view', 'plan-monitoring.create', 'plan-monitoring.update', 'plan-monitoring.delete',
  'rain-sensors.view',
  'operations-center.view', 'operations-center.create', 'operations-center.update',
  // Command Center (FM-6233) — the full-screen flood-response dashboard;
  // same gotcha as the notes above: without `.view` here the bespoke entry
  // never surfaces in the bootstrap payload.
  'command-center.view',
  // Inspector Shifts (Planning + Compliance Monitoring) port — same gotcha as
  // the notes above: without `.view` here `makeImplementations`'s bespoke
  // entry never actually surfaces (the rail entry is licensed via
  // tenant.json's applications[0].modules, but the privilege gate is what
  // decides whether the persona's bootstrap payload includes it).
  'inspector-shifts.view', 'inspector-shifts.create', 'inspector-shifts.update',
  // Inspector app (2026-09-03 merge) — same gotcha as the notes above:
  // without `.view` here `buildBootstrapModules`'s escape-valve entry never
  // surfaces (the rail entry is licensed via tenant.json's `applications[]`,
  // but the privilege gate decides whether the persona's bootstrap payload
  // includes it).
  'inspector-app.view',
  // inbox.update guards the clear/mark-read writes (the composer adapter
  // gates `update` on `<moduleId>.update`).
  'inbox.view', 'inbox.update',
  // Shift Rostering (iwmp tenant-native) — same gotcha as the notes above:
  // without `.view` here `buildBootstrapModules` drops the module from the
  // bootstrap payload, so the launchpad has no tile and no route registers,
  // even though tenants/iwmp/tenant.json licenses it.
  'shift-rostering.view', 'shift-rostering.create', 'shift-rostering.update', 'shift-rostering.delete',
  // Training Management (iwmp tenant-native entity module: the training
  // register the roster's eligibility rules read from). Same gotcha again —
  // licensed in tenant.json but dropped from bootstrap without `.view` here.
  'training.view', 'training.create', 'training.update', 'training.delete',
  // Attendance (iwmp tenant-native entity module: the biometric attendance
  // reconciliation register, RST-ATT). Same gotcha as the notes above —
  // licensed in tenant.json but dropped from bootstrap without `.view` here.
  'attendance.view', 'attendance.create', 'attendance.update', 'attendance.delete',
  // Deployment Dashboard (iwmp tenant-native `kind: 'dashboard'` module — the
  // manpower deployment-insight board, RST-DSH). Same gotcha as the notes
  // above: a dashboard is licensed in tenant.json but still privilege-gated,
  // so without `.view` here `buildBootstrapModules` drops it from the
  // bootstrap payload (no launchpad tile, no route registers).
  'deployment-dashboard.view',
  // Project Management (iwmp tenant-native entity module, IWMP-BRD-PMM-V02) —
  // the governed operational project master (municipal LOTs, commercial
  // contracts, one-off jobs). Same gotcha as the notes above: licensed in
  // tenant.json but dropped from bootstrap without `.view` here.
  'project-management.view', 'project-management.create', 'project-management.update', 'project-management.delete',
  // Contract Management (iwmp tenant-native, Figma: Tadweer June Release) — the
  // bespoke card-grid list + creation wizard. Same `.view` gotcha as above:
  // licensed in tenant.json but dropped from bootstrap without `.view` here.
  'contract-management.view', 'contract-management.create', 'contract-management.update', 'contract-management.delete',
  'settings.view',
  // CRM app (showcase wave 2): pipelines Leads/Deals + entities Contact
  // Person/Company/Product-Service, composed alongside the reused Workforce
  // entity module.
  'leads.view', 'leads.create', 'leads.update', 'leads.delete',
  'deals.view', 'deals.create', 'deals.update', 'deals.delete',
  'contact-person.view', 'contact-person.create', 'contact-person.update', 'contact-person.delete',
  'company.view', 'company.create', 'company.update', 'company.delete',
  'product-service.view', 'product-service.create', 'product-service.update', 'product-service.delete',
]

export type RoleMap = Record<string, string[]>
export const ROLE_PRIVILEGES: RoleMap = {
  admin: ADMIN_PRIVILEGES,
  dispatcher: [
    'asset.view',
    'workforce.view', 'workforce.create',
    'ticketing.view',
    'pipelines.view',
    // The dispatcher reads the maintenance register but does not author it —
    // same narrower shape as `asset`/`ticketing` above.
    'preventive-maintenance.view',
    // Reads the job-order board and can raise one, but does not administer it
    // — the same narrower shape as `preventive-maintenance` above.
    'job-orders.view', 'job-orders.create',
    'telematics-dashboard.view', 'fuel-monitoring.view', 'vehicle-behaviour.view',
    'live-monitoring.view',
    'operations-center.view', 'operations-center.update',
    'command-center.view',
    'inspector-shifts.view', 'inspector-shifts.update',
    'inbox.view', 'inbox.update',
    'shift-rostering.view', 'shift-rostering.update',
    // Reads the training register (roster eligibility) but does not author it.
    'training.view',
    // Reads the attendance reconciliation register + can act on it (reliever
    // dispatch on absentees, ATT-03), but does not administer the module.
    'attendance.view', 'attendance.update',
    // Reads the project master to understand ownership boundaries for
    // route/asset/workforce allocation (PMM Section 21 RBAC), but does not
    // create or amend the project structure itself.
    'project-management.view',
    'contract-management.view',
  ],
  // Field Inspector (2026-09-03 merge): scoped to the dedicated "Inspector"
  // application only — it holds no privilege for any other uccp module, so
  // `buildBootstrapModules` returns just the `inspector-app` entry and the
  // rail shows nothing else, matching the persona's real-world scope (an
  // inspector never touches Live Monitoring, Incidents, dispatch, etc. in
  // their own role).
  inspector: ['inspector-app.view'],
  // u_superadmin: one login that previews EVERYTHING this run has built.
  // Deliberately a spread of ADMIN_PRIVILEGES (never hand-retyped) so it can
  // never fall behind as new modules/actions are added — it always equals
  // the full wired privilege surface.
  superadmin: [...ADMIN_PRIVILEGES],
}

/** Union of privileges a persona's roles grant (used by the bootstrap handler). */
export function privilegesFor(users: DemoUser[], roles: RoleMap, personaId: string | null): string[] {
  const u = users.find((x) => x.id === personaId)
  if (!u) return []
  const set = new Set<string>()
  for (const r of u.roles) for (const p of roles[r] ?? []) set.add(p)
  return [...set]
}

/** DemoUsers → demo-kit personas (userType left default = 'user': gated by privilege, no bypass). */
export function toPersonas(users: DemoUser[]): PersonaDef[] {
  return users.map((u) => ({ id: u.id, name: u.persona ? `${u.name} (${u.persona})` : u.name, roles: u.roles }))
}

/**
 * Register a demo-kit entity schema per resolved config. Fields come from the
 * systemcolumns; SingleReference/MultiReference columns whose `entityType` is a
 * registered module code become STORE REFERENCES — that's what gives the store
 * bidirectional integrity + `getReferrers` (decision #19), so a workforce row
 * linked to a vehicle surfaces on that vehicle's Assignments tab. A blueprint
 * `default` (e.g. the ticketing status' `"new"`) propagates to the field default
 * so a created record lands in the first stage (the pipeline-create fix).
 */
export function buildEntitySchemas(configs: ResolvedConfig[]): EntitySchema[] {
  // Non-entity modules (dashboards, and any future kind) declare no storage —
  // they have neither `code` nor `systemcolumns`, so they never become a schema.
  const entityConfigs = configs.filter(isEntityConfig)
  const registered = new Set(entityConfigs.map((c) => c.code))
  return entityConfigs.map((config) => {
    const refByCol = new Map<string, RefDef>()
    for (const c of config.systemcolumns) {
      const isRef = c.type === 'SingleReference' || c.type === 'MultiReference'
      if (isRef && c.entityType && registered.has(c.entityType)) {
        refByCol.set(c.col, {
          name: c.col,
          target: c.entityType,
          cardinality: c.type === 'MultiReference' ? 'many' : 'one',
          inverse: `inv_${config.code}_${c.col}`.replace(/[^a-z0-9_]/gi, '_'),
        })
      }
    }
    const cols = new Set<string>(['uniqueidentifier', 'title', 'status'])
    for (const c of config.systemcolumns) cols.add(c.col)
    const fields: FieldDef[] = []
    for (const name of cols) {
      if (refByCol.has(name)) continue
      const def = config.systemcolumns.find((c) => c.col === name)
      const field: FieldDef = { name, type: 'string' }
      if (def && def.default !== undefined) field.default = def.default
      fields.push(field)
    }
    return { type: config.code, fields, references: [...refByCol.values()] }
  })
}

/** Build the demo-kit SeedSet: entity rows keyed by code + personas + role map. */
export function buildSeedSet(
  configs: ResolvedConfig[],
  seedRowsFor: (code: string) => Record<string, unknown>[],
  users: DemoUser[],
): SeedSet {
  const entities: SeedSet['entities'] = {}
  // Seed JSON rows all carry an `id` (validated by `demo check`); the on-disk
  // type is loose, so assert to the store's EntityRecord shape here. Non-entity
  // modules own no records — a dashboard's data lives in its widget dataSources.
  for (const config of configs.filter(isEntityConfig)) {
    entities[config.code] = seedRowsFor(config.code) as SeedSet['entities'][string]
  }
  return { entities, users: toPersonas(users), roles: ROLE_PRIVILEGES }
}

/** Wrap a resolved entity-module config as the single `ModuleBlueprint` node the
 *  composer's low-code path renders (its `config` is the runtime EntityConfig).
 *  Views are derived from the module `type` via the composer's module-registry
 *  defaults (`resolveModuleViews`) — entity -> `['list']`, pipeline ->
 *  `['kanban','list']` (kanban first, matching the pipeline module-type def in
 *  `@fams/v5-composer`'s `module-registry.ts`) — UNLESS the blueprint itself
 *  carries an explicit top-level `views` list (e.g. `["list","hybrid"]`),
 *  which wins over the kind-based default (`resolveModuleViews`'s `explicit`
 *  param, threaded through from `config.views`). */
export function toModuleNode(moduleId: string, config: ResolvedConfig): ModuleBlueprint {
  const type = (config.kind ?? 'entity') as ModuleBlueprint['type']
  const entity = isEntityConfig(config) ? config : undefined
  return {
    id: moduleId,
    type,
    label: moduleLabel(config, moduleId),
    // `views` is the view-KIND list (list/kanban/…). A non-entity module has
    // none — a dashboard's own top-level `views` are saved views, a different
    // vocabulary, and its template ref comes from the module type's `grid`.
    views: entity ? resolveModuleViews(type, entity.views) : resolveModuleViews(type),
    // Only a record-owning module binds to an entity `code`.
    dataSource: entity ? { code: entity.code } : undefined,
    config,
  }
}

/** v5-shaped licensed-module list for `GET /api/bootstrap`, gated by persona. */
export function buildBootstrapModules(
  manifest: TenantManifest,
  configs: Record<string, ResolvedConfig>,
  privileges: string[],
): LicensedModule[] {
  const out: LicensedModule[] = []
  for (const moduleId of manifest.modules) {
    if (!privileges.includes(`${moduleId}.view`)) continue
    const cfg = configs[moduleId]
    out.push({
      code: moduleId,
      name: cfg ? moduleLabel(cfg, moduleId) : moduleId,
      basemodule: 'crm',
      // `layout` is the module's own kind (entity | pipeline | dashboard | …),
      // never a hardcoded 'entity'. requiresAuth mirrors the real v5
      // LicensedModule shape; informational only here (the demo gates on
      // persona privileges above, not on this flag).
      meta: { layout: moduleLayout(cfg), requiresAuth: true },
      menu: { path: `/${moduleId}`, component: 'ComposerModule' },
    })
  }
  // Builtin admin module — NOT in the manifest, visible only with settings.view.
  if (privileges.includes('settings.view')) {
    out.push({ code: 'settings', name: 'Settings', meta: {}, menu: { path: '/settings', component: 'SettingsPage' } })
  }
  // Builtin bespoke screen (Phase A dispatcher-cockpit port,
  // plan/run-2026-08-31-dispatcher-cockpit/PLAN.md) — NOT in the manifest,
  // same "escape valve" pattern as `settings` above: a hand-built React
  // screen under tenants/uccp/overrides/screens/, not a blueprint module.
  // Scoped to the uccp tenant only (not every tenant's admin gets this).
  // Gated by `operations-center.view` (2026-09-03 fix): both pre-existing
  // uccp personas (admin, dispatcher) already carry this privilege, so this
  // is a no-op for them — but without the check, the Inspector persona
  // (added by the Inspector app merge, privileges scoped to `inspector-app`
  // only) would also get an Operations Center entry it has no privilege for,
  // which both violates its narrower real-world scope AND — because this
  // push ran before the `inspector-app` one below — became the bootstrap
  // array's FIRST entry, so `landingModule: "first"` routed a freshly logged
  // in inspector straight to Operations Center instead of their own app.
  if (manifest.id === 'uccp' && privileges.includes('operations-center.view')) {
    out.push({
      code: 'operations-center',
      name: 'Operations Center',
      meta: {},
      menu: { path: '/operations-center', component: 'OperationsCenterPage' },
    })
  }
  // Command Center (FM-6233) — same escape-valve pattern as operations-center
  // above: a bespoke NATIVE full-screen dashboard, NOT in `manifest.modules`,
  // scoped to the uccp tenant and gated by `command-center.view`.
  if (manifest.id === 'uccp' && privileges.includes('command-center.view')) {
    out.push({
      code: 'command-center',
      name: 'Command Center',
      meta: {},
      menu: { path: '/command-center', component: 'CommandCenterPage' },
    })
  }
  // Inspector Shifts port (2026-08-31) — same escape-valve pattern as
  // operations-center above: a bespoke override screen, NOT in
  // `manifest.modules` (that array only drives the blueprint-composer loop),
  // so it needs its own explicit bootstrap entry here, gated by the same
  // privilege the rail check uses (`inspector-shifts.view`).
  if (manifest.id === 'uccp' && privileges.includes('inspector-shifts.view')) {
    out.push({
      code: 'inspector-shifts',
      name: 'Inspector Shifts',
      meta: {},
      menu: { path: '/inspector-shifts', component: 'InspectorShiftsPage' },
    })
  }
  // Inspector app port (2026-09-03): same escape-valve pattern as
  // inspector-shifts above — a bespoke override screen, NOT in
  // `manifest.modules`, gated by the same privilege the rail check uses
  // (`inspector-app.view`).
  if (manifest.id === 'uccp' && privileges.includes('inspector-app.view')) {
    out.push({
      code: 'inspector-app',
      name: 'Inspector',
      meta: {},
      menu: { path: '/inspector-app', component: 'InspectorAppPage' },
    })
  }
  return out
}

/* ── MSW handlers (the v5-shaped API contract) ──────────────────────────────── */

interface BootstrapCtx {
  manifest: TenantManifest
  configs: Record<string, ResolvedConfig>
  users: DemoUser[]
}

/** `GET /api/bootstrap?persona=<id>` → the persona's licensed modules (v5 shape). */
export function makeBootstrapHandler(baseUrl: string, ctx: BootstrapCtx): RequestHandler {
  return http.get(`${baseUrl}/api/bootstrap`, ({ request }) => {
    const persona = new URL(request.url).searchParams.get('persona')
    const privileges = privilegesFor(ctx.users, ROLE_PRIVILEGES, persona)
    return HttpResponse.json(buildBootstrapModules(ctx.manifest, ctx.configs, privileges))
  })
}

interface EntityBody {
  code: string
  id?: string
  values?: Record<string, unknown>
  filters?: Record<string, unknown>
  search?: string
  sort?: { col: string; dir: 'asc' | 'desc' }
  offset?: number
  limit?: number
}

/** The v5-shaped entity CRUD contract, backed by the demo-kit store. `code` is
 *  in the BODY (v5 style: `entity_list_by_code`), so these are custom ops.
 *  `uidPrefixByCode` mints a human-readable `uniqueidentifier` on create (v5's
 *  `uidPrefix` behavior — the demo-kit store is generic and doesn't do this). */
export function buildEntityContract(uidPrefixByCode: Record<string, string> = {}): EndpointContract[] {
  const parse = async (request: Request): Promise<EntityBody> => (await request.json()) as EntityBody
  const mintUid = (store: RelationalStore, code: string, values: Record<string, unknown>): Record<string, unknown> => {
    const prefix = uidPrefixByCode[code]
    if (!prefix || values.uniqueidentifier) return values
    const n = store.list(code).total + 1
    return { ...values, uniqueidentifier: `${prefix}-${String(n).padStart(2, '0')}` }
  }

  return [
    {
      method: 'post',
      path: '/api/entity/entity_list_by_code',
      op: {
        kind: 'custom',
        resolve: async ({ request, store }) => {
          const body = await parse(request)
          const where = body.filters as Record<string, never> | undefined
          const result = (store as RelationalStore).list(body.code, {
            where,
            sort: body.sort ? { field: body.sort.col, dir: body.sort.dir } : undefined,
            offset: body.offset,
            limit: body.limit,
          })
          return HttpResponse.json({ data: result.records, total: result.total })
        },
      },
    },
    {
      method: 'post',
      path: '/api/entity/entity_profile',
      op: {
        kind: 'custom',
        resolve: async ({ request, store }) => {
          const body = await parse(request)
          const rec = (store as RelationalStore).read(body.code, body.id ?? '')
          return rec ? HttpResponse.json(rec) : new HttpResponse(null, { status: 404 })
        },
      },
    },
    {
      method: 'post',
      path: '/api/entity/entity_create',
      op: {
        kind: 'custom',
        resolve: async ({ request, store }) => {
          const body = await parse(request)
          const rs = store as RelationalStore
          const rec = rs.create(body.code, mintUid(rs, body.code, body.values ?? {}))
          return HttpResponse.json(rec, { status: 201 })
        },
      },
    },
    {
      method: 'post',
      path: '/api/entity/entity_update',
      op: {
        kind: 'custom',
        resolve: async ({ request, store }) => {
          const body = await parse(request)
          const rec = (store as RelationalStore).update(body.code, body.id ?? '', body.values ?? {})
          return rec ? HttpResponse.json(rec) : new HttpResponse(null, { status: 404 })
        },
      },
    },
    {
      method: 'post',
      path: '/api/entity/entity_delete',
      op: {
        kind: 'custom',
        resolve: async ({ request, store }) => {
          const body = await parse(request)
          const ok = (store as RelationalStore).remove(body.code, body.id ?? '')
          return new HttpResponse(null, { status: ok ? 204 : 404 })
        },
      },
    },
  ]
}
