import type { DashboardModuleConfigBlueprint, EntityModuleConfigBlueprint, InboxModuleConfigBlueprint, PipelineRules } from '@fams/v5-composer'

/**
 * Committed demo content, loaded from the repo via Vite glob imports. This is
 * the ONLY module that knows the on-disk layout of fams-v5-demo-environment:
 *   - `resolved/<t>/<m>.blueprint.json`  — the generated blueprint the app renders
 *   - `tenants/<t>/tenant.json`          — the licensed-module manifest + theme
 *   - `tenants/<t>/seeds/users.json`     — personas
 *   - `tenants|core/.../seeds/<m>.seed.json` — entity seed rows (tenant overrides core)
 *
 * `resolved/` is committed (decision #17), so a static glob import is correct and
 * cheaper than fetching from a public dir — the app renders exactly what
 * `pnpm demo resolve` produced.
 */

/**
 * One application in the tenant's outer nav rail manifest (raw, on-disk
 * shape — `icon`/`logo` are string KEYS here, resolved to real ReactNode
 * icons/assets by `demo/seams.tsx`'s `makeApplications`/`makeBrandingLogo`,
 * since JSON can't carry a ReactNode). See `@fams/v5-kit`'s `AppDefinition`
 * for the resolved shape `bootstrapTenant` actually consumes.
 */
export interface TenantApplicationManifest {
  id: string
  name: string
  /** Icon key — looked up in `demo/seams.tsx`'s `APP_ICONS` map. */
  icon?: string
  /** Module ids (matching `tenant.json`'s own `modules[]`) this app groups. */
  modules: string[]
  /** Suppress the cross-app switcher row while this application is active
   *  (`@fams/v5-kit`'s `AppDefinition.hideSwitcher`) — for an app whose
   *  persona never navigates to another application. */
  hideSwitcher?: boolean
}

export interface TenantManifest {
  id: string
  name: string
  fontFamily?: string
  modules: string[]
  /** Application grouping for the outer nav rail (apps ≠ modules). Omit for
   *  a tenant that hasn't opted in — the outer rail then falls back to one
   *  implicit app spanning every module (see `@fams/v5-kit`'s `V5AppShell`). */
  applications?: TenantApplicationManifest[]
  /** Pinned outer-rail entries above the app icons (raw shape of `@fams/v5-kit`'s
   *  `RailStartEntry` — each pins one licensed module, e.g. the inbox). The
   *  entry `id` is also the rail-indicator key (the unread dot). */
  railStart?: { id: string; module: string; label?: string }[]
  /** Tenant branding. `logo` is a key into `demo/seams.tsx`'s `BRAND_LOGOS` map;
   *  `hideName` suppresses the tenant-name text beside that logo for a logo
   *  asset that already carries the wordmark. */
  branding?: { logo?: string; hideName?: boolean; poweredBy?: boolean }
  /** Where `/` lands: a module id, or the literal `"first"` (the first entry of
   *  `modules`). Omit → the Home launch pad, unchanged. See the TenantConfig
   *  schema's `landingModule`. */
  landingModule?: string
  /** Login-screen branding for the tenant-variable brand pane (see the
   *  TenantConfig schema's `login` section) — content only; the pane's
   *  structure is layout-fixed in `@fams/v5-templates`' `LoginPage`. */
  login?: {
    quote?: string
    subtext?: string
    /** CSS background for the brand pane; omit → tenant primary token. */
    background?: string
    /** Auth-pane supporting line under the "Welcome" heading. */
    supportingText?: string
    /** Real logo asset URL for the auth pane's 148x48 logo slot; omit → text wordmark. */
    logo?: string
    /** Flattened brand-pane artwork asset URL; omit → the DS generic illustration.
     *  The literal `"none"` opts out of imagery entirely — a plain brand-color/
     *  gradient pane with no illustration (e.g. UCCP's Figma spec). */
    illustration?: string | 'none'
    /** Auth-pane footer. Omit → the DS default "visit our website" line.
     *  `"powered-by"` renders a centered "Powered by" label + `logoSrc`
     *  wordmark instead (e.g. UCCP's Figma spec). */
    footer?: { kind: 'powered-by'; logoSrc: string; label?: string }
  }
}

export interface DemoUser {
  id: string
  name: string
  email?: string
  roles: string[]
  persona?: string
  /** Optional per-persona password override. When present, login must match
   *  this exact value (still rejecting the literal "wrong"); personas
   *  without it keep the default demo semantics (any password but "wrong"). */
  password?: string
}

/** A module config that OWNS RECORDS — it declares storage (`code` +
 *  `systemcolumns`) and therefore participates in the entity store, the seed
 *  set and the entity CRUD contract. The inbox is entity-shaped by design
 *  (its notifications are seeded, reference-checked records) — only its
 *  `kind` differs, selecting the `InboxView` surface instead of a list. */
export type EntityResolvedConfig = EntityModuleConfigBlueprint | InboxModuleConfigBlueprint

/**
 * Any resolved module config the app can render. The union is open by KIND, not
 * by module id: an entity-shaped kind (`entity`, `pipeline`) carries storage;
 * every other kind (today `dashboard`, tomorrow `reports`/`live-monitoring`)
 * carries only its own inline config and must be skipped by the record-shaped
 * plumbing (`buildEntitySchemas`/`buildSeedSet`/the hydration loop).
 */
export type ResolvedConfig = EntityResolvedConfig | DashboardModuleConfigBlueprint

/** Module kinds that own records. Everything else is a non-entity module. */
const ENTITY_KINDS = new Set(['entity', 'pipeline', 'inbox'])

/** Narrow a resolved config to the record-owning shape. Guards on the module
 *  KIND (`kind` defaults to `entity` for legacy blueprints), never on a module
 *  id — any future non-entity kind is skipped for free. */
export function isEntityConfig(config: ResolvedConfig): config is EntityResolvedConfig {
  return ENTITY_KINDS.has(config.kind ?? 'entity')
}

/** `LicensedModule.meta.layout` for a config — its kind, not a hardcoded 'entity'. */
export function moduleLayout(config: ResolvedConfig | undefined): string {
  return config?.kind ?? 'entity'
}

/** The rail glyph a config names: a dashboard's top-level `icon`, or an entity's
 *  `uiConfig.icon`. Both are canonical FAMS V5 icon-library names. */
export function moduleIconName(config: ResolvedConfig | undefined): string | undefined {
  if (!config) return undefined
  return isEntityConfig(config) ? config.uiConfig?.icon : config.icon
}

/** The human label for a config — an entity's `name`, a dashboard's `displayName`. */
export function moduleLabel(config: ResolvedConfig, fallback: string): string {
  if (isEntityConfig(config)) return config.name ?? fallback
  return config.displayName?.singular ?? fallback
}

type JsonModule = { default: unknown }
const val = <T>(m: JsonModule): T => m.default as T

const manifestGlob = import.meta.glob<JsonModule>('../../../tenants/*/tenant.json', { eager: true })
const blueprintGlob = import.meta.glob<JsonModule>('../../../resolved/*/*.blueprint.json', { eager: true })
const usersGlob = import.meta.glob<JsonModule>('../../../tenants/*/seeds/users.json', { eager: true })
const tenantSeedGlob = import.meta.glob<JsonModule>('../../../tenants/*/seeds/*.seed.json', { eager: true })
const coreSeedGlob = import.meta.glob<JsonModule>('../../../core/modules/*/seeds/*.seed.json', { eager: true })
const rulesGlob = import.meta.glob<JsonModule>('../../../core/modules/*/rules.json', { eager: true })
const tenantRulesGlob = import.meta.glob<JsonModule>('../../../tenants/*/modules/*/rules.json', { eager: true })

const seg = (path: string, marker: string, offset: number): string => {
  const parts = path.split('/')
  return parts[parts.indexOf(marker) + offset]
}
const base = (path: string, suffix: string): string => {
  const file = path.split('/').pop() ?? ''
  return file.endsWith(suffix) ? file.slice(0, -suffix.length) : file
}

const findEntry = <T>(glob: Record<string, JsonModule>, predicate: (path: string) => boolean): T | undefined => {
  const key = Object.keys(glob).find(predicate)
  return key ? val<T>(glob[key]) : undefined
}

/** All tenants with a manifest, sorted by id. */
export function listTenants(): { id: string; name: string }[] {
  return Object.entries(manifestGlob)
    .map(([, m]) => val<TenantManifest>(m))
    .map((t) => ({ id: t.id, name: t.name }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

export function getManifest(tenant: string): TenantManifest {
  const m = findEntry<TenantManifest>(manifestGlob, (p) => seg(p, 'tenants', 1) === tenant)
  if (!m) throw new Error(`[demo] no tenant.json for "${tenant}"`)
  return m
}

export function getResolvedConfig(tenant: string, module: string): ResolvedConfig {
  const c = findEntry<ResolvedConfig>(
    blueprintGlob,
    (p) => seg(p, 'resolved', 1) === tenant && base(p, '.blueprint.json') === module,
  )
  if (!c) throw new Error(`[demo] no resolved blueprint for ${tenant}/${module}`)
  return c
}

export function getUsers(tenant: string): DemoUser[] {
  const u = findEntry<DemoUser[]>(usersGlob, (p) => seg(p, 'tenants', 1) === tenant)
  return u ?? []
}

/** A pipeline module's transition rules. Shared modules keep rules in
 *  `core/modules/<m>/rules.json` (there is no rules-delta op there; tenants
 *  vary the lanes via statusList deltas, not the rule graph). A tenant-native
 *  module (incubated entirely under `tenants/<t>/modules/<m>/`, e.g. UCCP's
 *  `incidents`) has no core entry at all, so its own
 *  `tenants/<t>/modules/<m>/rules.json` — when present — is checked first. */
export function getModuleRules(module: string, tenant?: string): PipelineRules | undefined {
  if (tenant) {
    const tenantRules = findEntry<PipelineRules>(
      tenantRulesGlob,
      (p) => seg(p, 'tenants', 1) === tenant && seg(p, 'modules', 1) === module,
    )
    if (tenantRules) return tenantRules
  }
  return findEntry<PipelineRules>(rulesGlob, (p) => seg(p, 'modules', 1) === module)
}

/** Seed rows for a module: the tenant's own seed if present, else the core seed. */
export function getModuleSeed(tenant: string, module: string): Record<string, unknown>[] {
  const tenantSeed = findEntry<Record<string, unknown>[]>(
    tenantSeedGlob,
    (p) => seg(p, 'tenants', 1) === tenant && base(p, '.seed.json') === module,
  )
  if (tenantSeed) return tenantSeed
  const coreSeed = findEntry<Record<string, unknown>[]>(
    coreSeedGlob,
    (p) => seg(p, 'modules', 1) === module && base(p, '.seed.json') === module,
  )
  return coreSeed ?? []
}
