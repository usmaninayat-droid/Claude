import {
  RelationalStore,
  SessionStoragePersistence,
  createPersonaAuth,
  loadSeeds,
  buildHandlers,
  type Persistence,
  type PersonaAuth,
} from '@fams/demo-kit'
import type { RequestHandler } from 'msw'
import { bootstrapTenant, createRailIndicators, type RailIndicatorController, type V5App } from '@fams/v5-kit'
import { createV5TemplateRenderers } from '@fams/v5-templates'
import type { EntityConfig, EntityRecord, PipelineRules, UserContext } from '@fams/v5-composer'
import { getManifest, getModuleRules, getModuleSeed, getResolvedConfig, getUsers, isEntityConfig, type EntityResolvedConfig, type ResolvedConfig, type TenantManifest, type DemoUser } from './demo/content'
import { buildEntityContract, buildEntitySchemas, buildSeedSet, makeBootstrapHandler, toModuleNode } from './demo/model'
import { logoutToLogin } from './auth-session'
import { ApiDataAdapter } from './demo/ApiDataAdapter'
import { createComposerDataFactory, type CodeBuffers } from './demo/composer-data'
import { makeProfileTabRenderers, makeTaskTabRenderers, seedRelatedIncidentPins } from './demo/profile-tabs'
import { createIncidentsWrapFieldValue, createIncidentsRecordTypeOf } from './demo/incidents-assignment'
import {
  makeApplications,
  makeBlueprintSource,
  makeBrandingLogo,
  makeBrandingLogoExpanded,
  makeBrandingPoweredBy,
  makeImplementations,
  makeModulesSource,
  makeRailStart,
  makeUserSource,
} from './demo/seams'

/**
 * The demo boot — decision #19's loop made real:
 *   seeds → demo-kit relational store → MSW (v5 API contract) → fetch adapter →
 *   composer/templates render from resolved/ blueprints.
 *
 * Split in two so tests can drive the seams over `msw/node` without a browser
 * worker: `buildDemoRuntime` assembles the store + handlers (no network yet);
 * `bootstrapDemoApp` (called once MSW is intercepting) hydrates the render
 * buffers through the real fetch path and runs `bootstrapTenant`.
 */

export interface DemoRuntime {
  tenant: string
  personaId: string
  baseUrl: string
  manifest: TenantManifest
  moduleIds: string[]
  configsByModule: Record<string, ResolvedConfig>
  configs: ResolvedConfig[]
  /** The record-owning subset of `configs` — the only ones with a `code`. */
  entityConfigs: EntityResolvedConfig[]
  users: DemoUser[]
  store: RelationalStore
  auth: PersonaAuth
  /** MSW handlers (bootstrap + entity CRUD) — pass to a worker or setupServer. */
  handlers: RequestHandler[]
}

export interface BuildRuntimeOptions {
  tenant: string
  personaId?: string | null
  /** '' in the browser (same origin); an absolute origin under msw/node. */
  baseUrl?: string
  /** Persistence for the store (SessionStorage in the browser; Memory in tests). */
  persistence?: Persistence
}

/**
 * A short, stable fingerprint of a tenant's seeded data — a djb2 hash over the
 * canonical JSON of the seed set. Folded into the store's persistence namespace
 * so a seed change reseeds the session store instead of serving a stale cache.
 */
function fingerprintSeeds(seedSet: unknown): string {
  const json = JSON.stringify(seedSet)
  let hash = 5381
  for (let i = 0; i < json.length; i++) hash = ((hash << 5) + hash + json.charCodeAt(i)) | 0
  return (hash >>> 0).toString(36)
}

export function buildDemoRuntime(opts: BuildRuntimeOptions): DemoRuntime {
  const tenant = opts.tenant
  const baseUrl = opts.baseUrl ?? ''
  const manifest = getManifest(tenant)
  const moduleIds = manifest.modules

  const configsByModule: Record<string, ResolvedConfig> = {}
  for (const id of moduleIds) configsByModule[id] = getResolvedConfig(tenant, id)
  const configs = Object.values(configsByModule)
  // Non-entity modules (dashboards, …) declare no storage: no `code`, no
  // `systemcolumns`, no seed rows, nothing to hydrate. Everything record-shaped
  // below iterates this subset, never `configs`.
  const entityConfigs = configs.filter(isEntityConfig)
  const users = getUsers(tenant)

  // code → its module id, so seed rows resolve tenant-override-then-core.
  const moduleForCode = (code: string): string =>
    moduleIds.find((id) => {
      const cfg = configsByModule[id]
      return isEntityConfig(cfg) && cfg.code === code
    }) ?? code
  const seedSet = buildSeedSet(configs, (code) => getModuleSeed(tenant, moduleForCode(code)), users)

  // The persisted store is keyed by a fingerprint of the seed content, so ANY
  // change to a tenant's seeds (a new field, extra rows, a whole new tab's data)
  // invalidates the old cached store and forces a reseed. Without this the
  // session-scoped store held the FIRST seed it ever saw and silently showed
  // stale/empty data after a seed edit (e.g. a freshly added Attendance Log tab
  // rendering "no data" against a pre-attendance cached store).
  const store = new RelationalStore({
    persistence:
      opts.persistence ??
      new SessionStoragePersistence({ namespace: `famsdemo:${tenant}:${fingerprintSeeds(seedSet)}` }),
  })
  for (const schema of buildEntitySchemas(configs)) store.register(schema)
  loadSeeds(store, seedSet)
  // Related-by-area pins for the incident profile's Location map overlay —
  // only runs when the tenant licenses the incidents module (no-op otherwise).
  if (configs.some((cfg) => isEntityConfig(cfg) && cfg.code === 'incidents/incident')) {
    seedRelatedIncidentPins(store)
  }

  const auth = createPersonaAuth(seedSet.users, seedSet.roles)
  const personaId = opts.personaId && users.some((u) => u.id === opts.personaId) ? opts.personaId : users[0]?.id
  if (personaId) auth.login(personaId)

  const uidPrefixByCode: Record<string, string> = {}
  for (const c of entityConfigs) if (c.uidPrefix) uidPrefixByCode[c.code] = c.uidPrefix
  const handlers: RequestHandler[] = [
    makeBootstrapHandler(baseUrl, { manifest, configs: configsByModule, users }),
    ...buildHandlers(buildEntityContract(uidPrefixByCode), store, { baseUrl }),
  ]

  return { tenant, personaId: personaId ?? '', baseUrl, manifest, moduleIds, configsByModule, configs, entityConfigs, users, store, auth, handlers }
}

/**
 * Per-tenant theming is driven by the DS `[data-tenant]` token blocks
 * (`@fams/tokens/tenants.css`), which `applyTenantTheme` selects via
 * `<html data-tenant>` — that is where fams' blue and iwmp's green + sidebar
 * GRADIENT live. We therefore pass NO `runtimeVars` overrides for the pilot
 * tenants (the token block is authoritative, gradient included); the escape
 * hatch stays available for a tenant with no compiled block.
 */
function themeVars(_manifest: TenantManifest): Record<string, string> {
  return {}
}

export interface BootedApp {
  app: V5App
  api: ApiDataAdapter
  buffers: CodeBuffers
  runtime: DemoRuntime
  /**
   * Resolves once the render buffers hold their records. Already resolved on
   * the normal boot path; only the `deferRecordsMs` QA seam makes it wait.
   */
  recordsReady: Promise<void>
}

/**
 * Recompute the pinned-rail indicator dots (WP4: the inbox unread dot) from
 * the hydrated render buffers. A pinned module's dot is on while any of its
 * records is unread (`read` falsy — the inbox surface's well-known key
 * contract, `@fams/v5-templates` `toInboxNotification`). Runs at boot and
 * again after every inbox write (`onInboxChanged`), so clearing the last
 * unread item clears the rail dot in the same frame (UX-NOTES §4).
 */
function refreshRailIndicators(
  runtime: DemoRuntime,
  buffers: CodeBuffers,
  indicators: RailIndicatorController,
): void {
  for (const pin of runtime.manifest.railStart ?? []) {
    const cfg = runtime.configsByModule[pin.module]
    if (!cfg || !isEntityConfig(cfg)) continue
    const rows = buffers[cfg.code] ?? []
    // COUNT, not just on/off: the rail renders the reference's red unread
    // pill ("Inbox 13") whenever the source supplies a positive number.
    indicators.setCount(pin.id, rows.filter((r) => r.read !== true && r.read !== 'true').length)
  }
}

export interface BootstrapDemoAppOptions {
  /**
   * QA SEAM — off by default, and the normal boot path below is byte-for-byte
   * unchanged when it is (`deferRecordsMs` falsy → the original single
   * assignment runs).
   *
   * Why it exists (round-5 UX gate N4): this host awaits `api.listByCode` for
   * EVERY module and fills the synchronous render buffers BEFORE
   * `bootstrapTenant` runs, and `demo/composer-data.ts` reads those buffers
   * synchronously — so `records.length > 0` on the very first render, the
   * list surfaces' `loading` is never true, and no gate can produce evidence
   * that the Figma loading skeleton (495:25945 / 555:39222) renders at all.
   * The design-system guard itself is correct and satisfies UX-2/A4/B13 for
   * any real async host; five rounds simply had no way to exercise it, which
   * is the situation that lets a regression land unnoticed.
   *
   * With a delay set, every buffer starts EMPTY (what a real async host looks
   * like on first paint) and is filled after `deferRecordsMs`. The caller is
   * handed `recordsReady` so it can re-render once the data lands — see
   * `main.tsx`, which wires this to `?slowRecords=1`.
   */
  deferRecordsMs?: number
}

/**
 * Linked-record navigation (PLATFORM-MODEL: "any linked record is reachable
 * from any other"). A `LinkView` reference cell hands the templates seam an
 * `entityType` + record id; the app is the only side that knows which
 * LICENSED module owns that entity code, whether it is a pipeline (→ Task
 * Detail) or an entity (→ Entity Detail), and how to read the row.
 *
 * Metadata-only, exactly like `openInboxRecord`: the module is found by
 * matching a resolved config's own `code`, and the detail flavor comes from
 * that config's `kind` — never a module-name branch. An entityType no tenant
 * licenses (the three known INERT references) resolves to `undefined`, which
 * leaves that cell exactly as inert as it is today.
 *
 * `buffers` (optional — omit to read `runtime.store` directly, the
 * pre-existing behaviour every caller that doesn't pass one keeps, e.g.
 * `linked-records.test.ts`) is the SAME synchronous render buffer
 * `demo/composer-data.ts`'s `DataAdapter` reads and mutates in place. Reading
 * it here, when supplied, matters for a record created/updated THIS SESSION:
 * a write (a user's own create, or a cross-module record-automation's
 * back-reference) lands in `buffers` SYNCHRONOUSLY, but only reaches
 * `runtime.store` via the adapter's fire-and-forget `api.create`/`api.update`
 * — an async round trip through MSW that finishes well after this seam is
 * called from the same render pass, with nothing that re-invokes it once the
 * store catches up (`bootstrapDemoApp` passes `buffers` for exactly this
 * reason — fix7, run-2026-09-05-job-orders: a PM rule's automation wrote a
 * job order + a back-reference into the buffer synchronously, but the
 * `runtime.store`-backed resolver here still couldn't see either one when
 * the reference cell rendered).
 */
export function makeLinkedRecordResolver(runtime: DemoRuntime, buffers?: CodeBuffers) {
  return ({ entityType, recordId }: { entityType: string; recordId: string }) => {
    const moduleId = runtime.moduleIds.find((id) => {
      const cfg = runtime.configsByModule[id]
      return isEntityConfig(cfg) && cfg.code === entityType
    })
    if (!moduleId) return undefined
    const cfg = runtime.configsByModule[moduleId]
    if (!isEntityConfig(cfg)) return undefined
    const record = buffers
      ? (buffers[cfg.code] ?? []).find((r) => r.id === recordId)
      : runtime.store.read(cfg.code, recordId)
    if (!record) return undefined
    return {
      config: cfg as unknown as EntityConfig,
      record: record as EntityRecord,
      moduleType: cfg.kind ?? 'entity',
      moduleLabel: cfg.name ?? moduleId,
    }
  }
}

/**
 * Resolves ANOTHER module's full config + record set by its `code` — the
 * bulk counterpart to `makeLinkedRecordResolver` above (one record). Backs
 * `V5ModuleSurfaceProps.resolveModuleRecords`, used for the Live Monitoring
 * map's Incidents overlay AND (fix7) every module surface's generic
 * reference-display-name map: metadata-only, same module-by-`code` lookup
 * `makeLinkedRecordResolver` uses, plus the full row set — from `buffers`
 * when supplied, for the same staleness reason documented on
 * `makeLinkedRecordResolver` above; from `runtime.store` otherwise (the
 * pre-existing behaviour).
 */
export function makeModuleRecordsResolver(runtime: DemoRuntime, buffers?: CodeBuffers) {
  return (code: string) => {
    const moduleId = runtime.moduleIds.find((id) => {
      const cfg = runtime.configsByModule[id]
      return isEntityConfig(cfg) && cfg.code === code
    })
    if (!moduleId) return undefined
    const cfg = runtime.configsByModule[moduleId]
    if (!isEntityConfig(cfg)) return undefined
    const records = buffers ? (buffers[cfg.code] ?? []) : runtime.store.list(cfg.code).records
    return { config: cfg as unknown as EntityConfig, records: records as EntityRecord[] }
  }
}

/**
 * Hydrate the render buffers through fetch/MSW, then run `bootstrapTenant` with
 * the app seams. MUST be called AFTER MSW is intercepting requests.
 */
export async function bootstrapDemoApp(
  runtime: DemoRuntime,
  options: BootstrapDemoAppOptions = {},
): Promise<BootedApp> {
  const api = new ApiDataAdapter(runtime.baseUrl)

  // Real fetch → MSW → demo-kit store round trip that fills the synchronous
  // render buffers the composer reads.
  const buffers: CodeBuffers = {}
  const deferRecordsMs = options.deferRecordsMs ?? 0
  const deferred: Array<() => void> = []
  await Promise.all(
    runtime.entityConfigs.map(async (config) => {
      const rows = (await api.listByCode(config.code)).data
      if (deferRecordsMs > 0) {
        buffers[config.code] = []
        deferred.push(() => {
          buffers[config.code] = rows
        })
        return
      }
      buffers[config.code] = rows
    }),
  )
  const recordsReady =
    deferRecordsMs > 0
      ? new Promise<void>((resolve) =>
          setTimeout(() => {
            for (const fill of deferred) fill()
            resolve()
          }, deferRecordsMs),
        )
      : Promise.resolve()

  const privileges = runtime.auth.privileges()
  const userContext: UserContext = {
    id: runtime.personaId,
    roles: runtime.auth.current()?.roles ?? [],
    privileges,
  }

  // Pipeline transition rules, keyed by module code (only pipeline modules have
  // them). The composer data adapter evaluates these for transitions/move.
  const rulesByCode: Record<string, PipelineRules> = {}
  for (const id of runtime.moduleIds) {
    const rules = getModuleRules(id, runtime.tenant)
    const cfg = runtime.configsByModule[id]
    if (rules && isEntityConfig(cfg)) rulesByCode[cfg.code] = rules
  }
  const workforceCode = runtime.entityConfigs.find((c) => c.code.startsWith('workforce/'))?.code ?? 'workforce/driver'

  // Pinned-rail indicator dots (inbox unread) — seeded from the hydrated
  // buffers, refreshed after every inbox write via `onInboxChanged`.
  const railIndicators = createRailIndicators()
  refreshRailIndicators(runtime, buffers, railIndicators)

  // Inbox → record deep-link (round-1 QA `card-click-opens-record`): the
  // renderer seams below run AFTER boot, so the app handle is captured here
  // once `bootstrapTenant` resolves. Navigation is metadata-driven end to
  // end — `entityType` comes from the inbox blueprint's `reference` column
  // descriptor (`ticketing/ticket`), mapped to the licensed module whose
  // resolved config carries that code, and the destination surface opens the
  // record via the `?record=` search param (`getEntryRecordId` seam).
  const appHolder: { current: V5App | null } = { current: null }
  const openInboxRecord = ({ entityType, recordId }: { entityType?: string; recordId: string }) => {
    if (!entityType || !appHolder.current) return
    const moduleId = runtime.moduleIds.find((id) => {
      const cfg = runtime.configsByModule[id]
      return isEntityConfig(cfg) && cfg.code === entityType
    })
    if (!moduleId) return
    void appHolder.current.router.navigate({
      to: `/${moduleId}`,
      search: { record: recordId } as never,
    })
  }
  const baseResolveLinkedRecord = makeLinkedRecordResolver(runtime, buffers)
  // Plan Monitoring exception (2026-08-31 coordinator flag): the
  // /plan-monitoring route renders the bespoke full-screen single-plan
  // detail (planning-v2 embed, Figma fTNUZHTxIZxNlBKq3aw2hk) rather than the
  // generic entity profile — so a "Linked Schedule/Plan" LinkView on a
  // ticket routes THERE (`?record=` deep link, same seam as
  // `openInboxRecord`) instead of pushing a generic detail-stack pane.
  // Returning `undefined` after navigating keeps the stack untouched.
  const resolveLinkedRecord: typeof baseResolveLinkedRecord = (target) => {
    if (target.entityType === 'plan-monitoring/daily-plan' && appHolder.current) {
      void appHolder.current.router.navigate({
        to: '/plan-monitoring',
        search: { record: target.recordId } as never,
      })
      return undefined
    }
    return baseResolveLinkedRecord(target)
  }
  const resolveModuleRecords = makeModuleRecordsResolver(runtime, buffers)

  // Requests & Complaints inline-edit field wrapper (2026-08-31 pipeline
  // refinement): allocating a tanker (a ClickUp-style hover-pencil quick-
  // edit on the "Tanker assigned" field, not a header button — see
  // `incidents-assignment.tsx`'s file header for the coordinator
  // correction) auto-creates a `plan-monitoring/daily-plan` task, real
  // (write-through to the same buffer + MSW store every other mutation
  // uses — see `composer-data.ts`'s own `create`), not a metadata-driven
  // side effect (no such vocabulary exists in the rules engine yet).
  // `buffers`/`api` are the SAME instances `createComposerDataFactory`
  // closes over below, so a Plan Monitoring surface mounted afterward
  // lists the new record like any other seeded/created one.
  const incidentsWrapFieldValue = createIncidentsWrapFieldValue({
    listVehicles: () => runtime.store.list('live-monitoring/vehicle').records as EntityRecord[],
    createDailyPlan: (input) => {
      const code = 'plan-monitoring/daily-plan'
      const optimistic = { ...input } as EntityRecord
      ;(buffers[code] ??= []).unshift(optimistic)
      void api.create(code, input as Partial<EntityRecord>).then((saved) => Object.assign(optimistic, saved)).catch(() => {})
      return optimistic
    },
  })

  const getEntryRecordId = (): string | undefined => {
    if (typeof window === 'undefined') return undefined
    return new URLSearchParams(window.location.search).get('record') ?? undefined
  }

  // Triage Console (Operations Center's native second view, 2026-08-31): the
  // SAME `DataAdapter` the `incidents` module's own composer surface reads
  // and writes through — built via `toModuleNode` + `createComposerDataFactory`
  // (the exact machinery `blueprintSource`/`composer.createData` use below),
  // not a bespoke store reach-around. A write here mutates the SAME `buffers`
  // entry the Incidents module's kanban re-lists from, so triaging a record
  // here and then navigating to Incidents shows it moved — one buffer, one
  // source of truth, two surfaces.
  const composerData = createComposerDataFactory({ api, buffers, privileges, userContext, rulesByCode, actorName: runtime.auth.current()?.name })
  const incidentsModuleId = runtime.moduleIds.find((id) => {
    const cfg = runtime.configsByModule[id]
    return isEntityConfig(cfg) && cfg.code === 'incidents/incident'
  })
  const incidentsConfig = incidentsModuleId ? runtime.configsByModule[incidentsModuleId] : undefined
  const incidentsData =
    incidentsModuleId && incidentsConfig
      ? composerData(toModuleNode(incidentsModuleId, incidentsConfig))
      : undefined

  // Command Center (FM-6233): the full-screen dashboard reads the SAME
  // resolved blueprints + MSW store every composer surface reads — the
  // live-monitoring config (map bindings/weather/zones/POIs) with its full
  // mixed record set (18 tankers + 15 workforce), and the incidents config
  // (colorBy metadata) with all 36 INC records. Pure reads; no second store.
  const liveMonitoringModuleId = runtime.moduleIds.find((id) => {
    const cfg = runtime.configsByModule[id]
    return isEntityConfig(cfg) && cfg.code === 'live-monitoring/vehicle'
  })
  const liveMonitoringConfig = liveMonitoringModuleId
    ? runtime.configsByModule[liveMonitoringModuleId]
    : undefined
  const commandCenterDeps = {
    liveConfig:
      liveMonitoringConfig && isEntityConfig(liveMonitoringConfig)
        ? (liveMonitoringConfig as unknown as EntityConfig)
        : undefined,
    listLiveRecords: () => runtime.store.list('live-monitoring/vehicle').records as EntityRecord[],
    incidentsConfig:
      incidentsConfig && isEntityConfig(incidentsConfig)
        ? (incidentsConfig as unknown as EntityConfig)
        : undefined,
    listIncidents: () => runtime.store.list('incidents/incident').records as EntityRecord[],
  }

  const app = await bootstrapTenant({
    modulesSource: makeModulesSource(runtime.baseUrl, runtime.personaId),
    implementations: makeImplementations(runtime.moduleIds, runtime.configsByModule, runtime.tenant, {
      incidentsData,
      incidentsConfig: incidentsConfig && isEntityConfig(incidentsConfig) ? (incidentsConfig as unknown as EntityConfig) : undefined,
      listVehicles: () => runtime.store.list('live-monitoring/vehicle').records as EntityRecord[],
    }, commandCenterDeps, { actor: runtime.users.find((u) => u.id === runtime.personaId)?.name }),
    tenant: {
      tenant: runtime.tenant,
      runtimeVars: themeVars(runtime.manifest),
      // Apps ≠ modules (nav-a SPEC.md) — resolved from tenant.json's
      // `applications`/`branding`, which use string keys since JSON can't
      // carry a ReactNode; `undefined` app grouping falls back to
      // V5AppShell's single-implicit-app behavior.
      applications: makeApplications(runtime.manifest),
      railStart: makeRailStart(runtime.manifest),
      branding: {
        logo: makeBrandingLogo(runtime.manifest),
        // fams' horizontal logo already contains the FAMS wordmark, so the
        // separate text label beside it would be a duplicate (metadata-driven:
        // tenant.json `branding.hideName`).
        hideName: runtime.manifest.branding?.hideName,
        // The expanded rail swaps the compact mark for the tenant's full
        // wordmark; white-label tenants also get the "Powered By" strip.
        logoExpanded: makeBrandingLogoExpanded(runtime.manifest),
        poweredBy: makeBrandingPoweredBy(runtime.manifest),
      },
      // `/` lands on the tenant's configured module (tenant.json
      // `landingModule`) instead of Home when set; Home stays routed + in nav.
      landingModule: runtime.manifest.landingModule,
    },
    railIndicators,
    defaultTheme: 'light',
    user: makeUserSource(runtime.auth, runtime.users),
    // Logout (the shell's WP3 user popover → V5App.logout → this hook):
    // clear the demo-kit persona session, then drop the sessionStorage
    // persona key and reload param-less — landing on the WP2 login gate.
    onLogout: () => {
      runtime.auth.logout()
      logoutToLogin(runtime.tenant)
    },
    blueprintSource: makeBlueprintSource(runtime.configsByModule),
    composer: {
      renderers: createV5TemplateRenderers({
        userContext,
        profileTabRenderers: makeProfileTabRenderers(runtime.store, workforceCode, resolveLinkedRecord),
        taskTabRenderers: makeTaskTabRenderers(runtime.store, resolveLinkedRecord),
        // Resolves an Assignee field's raw stored id (e.g. `u_dispatcher`) to
        // the persona's display name for the toolbar's Assignee dropdown
        // (finding: dropdown showed raw ids) — generic, from the tenant's own
        // seeded user list, not a ticketing-specific lookup.
        resolveAssigneeName: (id) => runtime.users.find((u) => u.id === id)?.name,
        // Resolves a PersonView detail cell's raw SingleReference id (e.g.
        // `WCR-11`) to the referenced record's display title (e.g. "Ali
        // Sheikh") — generic scan over the tenant's own registered entity
        // types, same id→name gap `resolveAssigneeName` closes for users.
        // Reads `buffers` (the same live render buffer `resolveModuleRecords`
        // below reads, not `runtime.store` — see `makeModuleRecordsResolver`'s
        // docblock for why the store lags a same-session write) so a record
        // created/patched this session resolves immediately, not only after
        // its async store round trip finishes with nothing left to re-render.
        resolvePersonName: (id) => {
          for (const cfg of runtime.entityConfigs) {
            const rec = (buffers[cfg.code] ?? []).find((r) => r.id === id)
            if (rec) return String(rec.title ?? id)
          }
          return undefined
        },
        // After any inbox read/clear write, recompute the rail unread dot
        // from the (in-place mutated) buffers.
        onInboxChanged: () => refreshRailIndicators(runtime, buffers, railIndicators),
        // Inbox card click → navigate to the referenced module record; the
        // destination module surface opens it from the `?record=` param.
        onOpenInboxRecord: openInboxRecord,
        getEntryRecordId,
        resolveLinkedRecord,
        resolveModuleRecords,
        wrapFieldValue: incidentsWrapFieldValue,
        recordTypeOf: createIncidentsRecordTypeOf(),
      }),
      createData: createComposerDataFactory({ api, buffers, privileges, userContext, rulesByCode, actorName: runtime.auth.current()?.name }),
    },
    brandLabel: runtime.manifest.name,
  })
  appHolder.current = app

  return { app, api, buffers, runtime, recordsReady }
}
