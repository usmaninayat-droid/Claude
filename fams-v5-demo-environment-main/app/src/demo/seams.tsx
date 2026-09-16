import type { ReactNode } from 'react'
import { Icon, getIcon } from '@fams/ui-kit/icons'
import type { PersonaAuth } from '@fams/demo-kit'
import type {
  AppDefinition,
  BlueprintSource,
  LicensedModule,
  ModulesSource,
  ModuleImplementationMap,
  RailStartEntry,
  UserSource,
} from '@fams/v5-kit'
import type { EntityConfig } from '@fams/v5-composer'
import type { DataAdapter } from '@fams/v5-composer'
import type { DemoUser, ResolvedConfig, TenantManifest } from './content'
import { moduleIconName } from './content'
import { toModuleNode } from './model'
import { makeSettingsRoute } from './settings-module'
import { makeOperationsCenterRoute } from './operations-center-module'
import { makeSmartPlanningV2Route, makePlanMonitoringV2Route } from './planning-v2-module'
import { makeInspectorShiftsRoute } from './inspector-shifts-module'
import { makeInspectorAppRoute } from './inspector-app-module'
import { makeShiftRosteringRoute, type ShiftRosteringDeps } from './shift-rostering-module'
import { makeContractManagementRoute } from './contract-management-module'
import { makeCommandCenterRoute } from './command-center-module'
import type { CommandCenterDeps } from './command-center-view'

/**
 * Nav-rail glyphs per module id (findings B2/minors: the primary rail and the
 * module-icon rail both render `navEntry.icon`; this demo previously left it
 * unset, so both rails fell back to bare boxes/letters).
 *
 * These are now the CANONICAL FAMS V5 icon library's own marks, addressed by
 * their library filename through the design system's generic `<Icon name>` —
 * the earlier hand-picked substitutions existed only because the previous icon
 * dependency had no `car-01`/`pin-01` equivalent, and the library does.
 */
const MODULE_ICONS: Record<string, ReactNode> = {
  asset: <Icon name="car-01" />,
  workforce: <Icon name="users-01" />,
  ticketing: <Icon name="pin-01" />,
  // Inspector Shifts (Planning + Compliance Monitoring) — distinct from the
  // existing module rail glyphs above; an inspector/authority mark rather
  // than a generic people/pin icon.
  'inspector-shifts': <Icon name="shield-tick" />,
  // Inspector app (2026-09-03 merge) — the field-inspector tablet+mobile
  // rebuild (dashboard, requests & complaints, plan monitoring). Distinct
  // from `inspector-shifts`'s glyph above (an unrelated, older screen).
  'inspector-app': <Icon name="clipboard-check" />,
  // Contract Management (Figma: Tadweer June Release) — a document/contract mark.
  'contract-management': <Icon name="briefcase-01" />,
}

/** Last-resort rail glyph for a module that names no icon and has no entry
 *  above — a bare box in the rail reads as a bug, so every module gets one. */
const FALLBACK_MODULE_ICON: ReactNode = <Icon name="layout-grid-01" />

const SETTINGS_ICON: ReactNode = <Icon name="settings-01" />

/** Phase A dispatcher-cockpit port (plan/run-2026-08-31-dispatcher-cockpit) —
 *  rail glyph for the bespoke "Operations Center" override screen. */
const OPERATIONS_CENTER_ICON: ReactNode = <Icon name="layout-grid-01" />

/** Command Center (FM-6233) — the full-screen flood-response geospatial
 *  dashboard's rail glyph. */
const COMMAND_CENTER_ICON: ReactNode = <Icon name="target-04" />

/**
 * Resolve one module's rail glyph: a blueprint `uiConfig.icon` (a canonical
 * icon-library name, e.g. `"map-pin"` — see `tenants/<t>/modules/<m>/
 * blueprint.json`) wins when the design system's registry recognizes it,
 * otherwise falls back to the hand-picked `MODULE_ICONS[id]` above. `getIcon`
 * is the registry's own lookup, so an unauthored or misspelt name degrades
 * to the fallback here rather than rendering an empty icon slot.
 */
function resolveModuleIcon(id: string, uiIcon: string | undefined): ReactNode {
  if (uiIcon && getIcon(uiIcon)) return <Icon name={uiIcon} />
  return MODULE_ICONS[id] ?? FALLBACK_MODULE_ICON
}

/**
 * Outer-rail APPLICATION glyphs, keyed by `tenant.json`'s `applications[].icon`
 * string (JSON can't carry a ReactNode, so tenant.json names a key here
 * instead — same pattern as `MODULE_ICONS` above).
 */
const APP_ICONS: Record<string, ReactNode> = {
  telematics: <Icon name="signal-01" />,
  iwmp: <Icon name="bin-collection" />,
}

/**
 * Tenant logo assets for `SideNav`'s logo slot, keyed by `tenant.json`'s
 * `branding.logo` string. The FAMS mark is the real horizontal lockup
 * (`app/public/branding/fams-logo-horizontal.svg`, 86×28 viewBox — gradient
 * icon + "FAMS" wordmark side by side) exported from Figma for the shell
 * header; it's wider than tall, so it's sized by height (`h-7 w-auto
 * object-contain`) rather than the old fixed square slot to avoid distortion.
 * The stacked/vertical mark (`fams-logo.svg`, icon above "FAMS BY FALKENHERZ")
 * stays reserved for the login screen (`tenant.json`'s `login.logo`) — do not
 * point the shell header back at it. The Tadweer mark (`tadweer-logo.png`) is
 * likewise a real asset — cropped + made-transparent (ImageMagick) from
 * `plan/overnight-2026-08-13/specs/kanban/figma.png`'s rail (the generic
 * `Logo` wordmark fallback was clipping to "Ta" in the fixed 28px slot,
 * round-2 design QA #11). `object-contain` fits it inside that slot without
 * distortion regardless of the source crop's own aspect. A tenant with no
 * entry here gets no override, and `V5AppShell` falls back to the generic
 * `Logo` wordmark composite instead.
 */
/**
 * COLLAPSED rail mark — the 28px brand glyph. White-on-brand: the rail is a
 * saturated tenant colour, so these are the designer's white rail variants,
 * not the full-colour marketing logos (which live on the login screen).
 */
const BRAND_LOGOS: Record<string, ReactNode> = {
  fams: <img src="/branding/fams-rail-mark.svg" alt="" aria-hidden className="size-7 object-contain" />,
  iwmp: <img src="/branding/tadweer-rail-mark.svg" alt="" aria-hidden className="size-7 object-contain" />,
  'qatar-mme': (
    <img src="/branding/qatar-mme-rail-mark.svg" alt="" aria-hidden className="size-7 object-contain" />
  ),
}

/** EXPANDED rail wordmark — shown in place of the mark once the rail opens. */
const BRAND_LOGOS_EXPANDED: Record<string, ReactNode> = {
  fams: <img src="/branding/fams-rail-wordmark.svg" alt="" aria-hidden className="h-5 w-auto object-contain" />,
  iwmp: (
    <span className="flex items-center gap-2">
      <img src="/branding/tadweer-rail-mark.svg" alt="" aria-hidden className="size-7 object-contain" />
      <img src="/branding/tadweer-rail-wordmark.svg" alt="" aria-hidden className="h-5 w-auto object-contain" />
    </span>
  ),
}

/** The "Powered By" attribution wordmark for white-label tenants. */
const POWERED_BY_WORDMARK = (
  <img src="/branding/fams-poweredby-wordmark.svg" alt="Powered by FAMS" className="h-3 w-auto object-contain" />
)

/**
 * Resolve `tenant.json`'s raw `applications[]` (string icon keys) into
 * `@fams/v5-kit`'s `AppDefinition[]` (real icon nodes). Returns `undefined`
 * when the tenant hasn't configured any — `bootstrapTenant`/`V5AppShell`
 * then fall back to a single implicit app spanning every module.
 */
export function makeApplications(manifest: TenantManifest): AppDefinition[] | undefined {
  if (!manifest.applications || manifest.applications.length === 0) return undefined
  return manifest.applications.map((app) => ({
    id: app.id,
    name: app.name,
    icon: app.icon ? APP_ICONS[app.icon] : undefined,
    modules: app.modules,
    hideSwitcher: app.hideSwitcher,
  }))
}

/** Resolve `tenant.json`'s `branding.logo` key into a real logo node, if any. */
export function makeBrandingLogo(manifest: TenantManifest): ReactNode | undefined {
  const key = manifest.branding?.logo
  return key ? BRAND_LOGOS[key] : undefined
}

/** Resolve the EXPANDED-rail wordmark for `branding.logo`'s tenant, if any. */
export function makeBrandingLogoExpanded(manifest: TenantManifest): ReactNode | undefined {
  const key = manifest.branding?.logo
  return key ? BRAND_LOGOS_EXPANDED[key] : undefined
}

/**
 * The rail-footer attribution strip. Metadata-driven: a tenant opts in with
 * `branding.poweredBy` in its manifest — no tenant is named here.
 */
export function makeBrandingPoweredBy(manifest: TenantManifest): ReactNode | undefined {
  return manifest.branding?.poweredBy ? POWERED_BY_WORDMARK : undefined
}

/**
 * Resolve `tenant.json`'s raw `railStart[]` (pinned outer-rail entries, e.g.
 * the inbox with its unread dot) into `@fams/v5-kit`'s `RailStartEntry[]`.
 * Pure pass-through today — label/icon default to the pinned module's own
 * nav entry inside `V5AppShell`, so the manifest stays wiring, not a second
 * nav definition. Returns `undefined` when the tenant pins nothing.
 */
export function makeRailStart(manifest: TenantManifest): RailStartEntry[] | undefined {
  if (!manifest.railStart || manifest.railStart.length === 0) return undefined
  return manifest.railStart.map((pin) => ({ id: pin.id, module: pin.module, label: pin.label }))
}

/**
 * The app-implemented v5-kit boot seams. Each is injectable (real API later);
 * here they read committed content + the demo-kit persona shim + MSW.
 */

/** Licensed modules for the current persona — fetched from MSW `/api/bootstrap`. */
export function makeModulesSource(baseUrl: string, personaId: string | null): ModulesSource {
  return {
    async getLicensedModules(): Promise<LicensedModule[]> {
      const res = await fetch(`${baseUrl}/api/bootstrap?persona=${encodeURIComponent(personaId ?? '')}`)
      if (!res.ok) throw new Error(`[demo] bootstrap → ${res.status}`)
      return (await res.json()) as LicensedModule[]
    },
  }
}

/**
 * Current user's privilege facts + display identity, from the demo-kit
 * persona auth shim. `users` is the tenant's seeded persona list
 * (`tenants/<t>/seeds/users.json`) — the demo-kit `Persona` type carries no
 * `email`, so the seed row supplies the identity the shell's user popover
 * shows (WP3). Optional so existing call sites stay valid (no identity →
 * v5-kit keeps its decorative user item).
 */
export function makeUserSource(auth: PersonaAuth, users: DemoUser[] = []): UserSource {
  return {
    getUser: async () => {
      const current = auth.current()
      const seed = current ? users.find((u) => u.id === current.id) : undefined
      return {
        privileges: auth.privileges(),
        userType: auth.userType(),
        identity: seed
          ? { name: seed.name, email: seed.email }
          : current
            ? { name: current.name }
            : undefined,
      }
    },
  }
}

/**
 * Resolve a module's blueprint. `blueprintRef` is the module id (e.g.
 * "companies"); we return the committed resolved config wrapped as the single
 * `ModuleBlueprint` node the composer renders.
 */
export function makeBlueprintSource(configsByModule: Record<string, ResolvedConfig>): BlueprintSource {
  return {
    getBlueprint: async (blueprintRef: string) => {
      const config = configsByModule[blueprintRef]
      if (!config) throw new Error(`[demo] no resolved blueprint for module "${blueprintRef}"`)
      return toModuleNode(blueprintRef, config)
    },
  }
}

/**
 * `code` → React implementation. Product (companies…) modules take the low-code
 * composer path (blueprintRef = the module id); the builtin `settings` module
 * is bespoke. Unlicensed/ungated codes are simply never returned by the
 * ModulesSource, so their entries here are never referenced (decision #23).
 *
 * `configsByModule` is OPTIONAL (defaults to `{}`) so existing call sites that
 * don't need a per-module `uiConfig.icon` override keep working unchanged —
 * every id then just falls back to `MODULE_ICONS[id]` as before.
 */
export function makeImplementations(
  moduleIds: string[],
  configsByModule: Record<string, ResolvedConfig> = {},
  tenant?: string,
  operationsCenterDeps?: { incidentsData?: DataAdapter; incidentsConfig?: EntityConfig; listVehicles?: () => import('@fams/v5-composer').EntityRecord[] },
  commandCenterDeps?: CommandCenterDeps,
  shiftRosteringDeps?: ShiftRosteringDeps,
): ModuleImplementationMap {
  const map: ModuleImplementationMap = {
    settings: {
      routes: makeSettingsRoute('/settings'),
      navEntry: { path: '/settings', label: 'Settings', icon: SETTINGS_ICON },
      requiredPrivileges: ['settings.view'],
    },
    // Phase A dispatcher-cockpit port — bespoke override screen, not a
    // blueprint module (see demo/operations-center-module.tsx). Granted to
    // the uccp tenant only via demo/model.ts's buildBootstrapModules; no
    // extra privilege gate beyond that tenant scoping. 2026-08-31: now TWO
    // views behind one `ModuleViewShell` (Dispatcher Cockpit iframe + the
    // native Triage Console) — `incidentsData`/`incidentsConfig` feed the
    // console the SAME `incidents/incident` DataAdapter the Incidents
    // module itself reads/writes.
    'operations-center': {
      routes: makeOperationsCenterRoute('/operations-center', operationsCenterDeps ?? {}),
      navEntry: { path: '/operations-center', label: 'Operations Center', icon: OPERATIONS_CENTER_ICON },
      requiredPrivileges: [],
    },
    // Command Center (FM-6233, 2026-09-01): builtin bespoke NATIVE module —
    // the full-screen flood-response geospatial dashboard. `fullScreen: true`
    // on the nav entry (skeleton-kit NavEntry v1.2) makes V5AppShell suppress
    // the rail/top bar on its route; the surface renders its own dark chrome
    // with the back arrow into the V5 app. Granted to the uccp tenant only
    // via demo/model.ts's buildBootstrapModules.
    'command-center': {
      routes: makeCommandCenterRoute('/command-center', commandCenterDeps ?? {}),
      navEntry: {
        path: '/command-center',
        label: 'Command Center',
        icon: COMMAND_CENTER_ICON,
        fullScreen: true,
      },
      requiredPrivileges: ['command-center.view'],
    },
    // Inspector Shifts port (2026-08-31): bespoke iframe-isolated module,
    // same shape as operations-center above — not a blueprint composer
    // module (no `moduleIds` loop entry), gated by tenant.json's
    // applications[0].modules + ADMIN_PRIVILEGES/model.ts (rail gate), taken
    // as-is from FAMS-V5-IIMS-DEMO-main's inspector-shifts.tsx.
    'inspector-shifts': {
      routes: makeInspectorShiftsRoute('/inspector-shifts'),
      navEntry: { path: '/inspector-shifts', label: 'Inspector Shifts', icon: MODULE_ICONS['inspector-shifts'] },
      requiredPrivileges: ['inspector-shifts.view'],
    },
    // Inspector app port (2026-09-03): bespoke iframe-isolated module, same
    // shape as inspector-shifts/operations-center above — the standalone
    // "QATAR MME Inspector App" V5 tablet+mobile rebuild, taken as-is (its
    // React 18.3.1 pin + fully vendored @ds tree run their own Vite dev
    // server, isolated from this host's React 19). `fullScreen: true`
    // (skeleton-kit NavEntry v1.2, same seam `command-center` uses) makes
    // `V5AppShell` suppress the rail + top bar — and with them, the app
    // switcher — for this route entirely: a deliberate, locked product
    // decision, not an oversight. The Inspector app is the UCCP tenant's
    // dedicated single-purpose application (tenant.json's applications[])
    // with its OWN set of modules (Dashboard / Requests & Complaints / Plan
    // Monitoring), navigated via the vendored bundle's own internal rail
    // (tablet `InspectorRail`) / bottom nav (phone) — an inspector never
    // navigates across FAMS apps, so the canonical shell never offers a way
    // to. Registered as ONE platform module with no `ModuleViewShell`
    // view-tab strip (same minimal shape as settings-module.tsx) rather than
    // three separate modules — splitting it would duplicate navigation the
    // vendored bundle's own locked-design rail already renders.
    'inspector-app': {
      routes: makeInspectorAppRoute('/inspector-app'),
      navEntry: {
        path: '/inspector-app',
        label: 'Inspector',
        icon: MODULE_ICONS['inspector-app'],
        fullScreen: true,
      },
      requiredPrivileges: ['inspector-app.view'],
    },
  }
  for (const id of moduleIds) {
    map[id] = {
      composerModule: { blueprintRef: id },
      navEntry: { path: `/${id}`, icon: resolveModuleIcon(id, moduleIconName(configsByModule[id])) },
      requiredPrivileges: [`${id}.view`],
    }
  }
  // Planning modules v2 port (COORDINATION.md claim, 2026-08-31): for the
  // uccp tenant, replace the blueprint-composed body of `smart-planning`/
  // `plan-monitoring` with the bespoke iframe-isolated port from
  // planning-v2-module.tsx — taken as-is from fms-main 2's src/ds/components/
  // planning/. Module id, route path, nav entry, and required privileges are
  // unchanged so the rail entry keeps working exactly as before; only
  // `routes`/`composerModule` swap.
  if (tenant === 'uccp') {
    if (map['smart-planning']) {
      const { composerModule: _drop, ...rest } = map['smart-planning']
      map['smart-planning'] = { ...rest, routes: makeSmartPlanningV2Route('/smart-planning') }
    }
    if (map['plan-monitoring']) {
      const { composerModule: _drop, ...rest } = map['plan-monitoring']
      map['plan-monitoring'] = { ...rest, routes: makePlanMonitoringV2Route('/plan-monitoring') }
    }
  }
  // IWMP Manpower Rostering (IWMP-SCOPE-ROSTER-V01): for the iwmp tenant,
  // replace the blueprint-composed body of `shift-rostering` (a generic
  // list + calendar) with the iframe-isolated roster board from
  // tenants/iwmp/overrides/screens/shift-rostering. Same swap as the uccp
  // planning modules above — module id, route path, nav entry, tile and
  // privileges are unchanged; only `routes`/`composerModule` change.
  if (tenant === 'iwmp' && map['shift-rostering']) {
    const { composerModule: _drop, ...rest } = map['shift-rostering']
    map['shift-rostering'] = { ...rest, routes: makeShiftRosteringRoute('/shift-rostering', shiftRosteringDeps ?? {}) }
  }
  // IWMP Contract Management (Figma: Tadweer June Release) — bespoke card-grid
  // list + full-screen creation wizard, iframe-isolated from
  // app/public/screens/contract-management. Same swap as shift-rostering:
  // module id, route path, nav entry and privileges unchanged, only the body.
  if (tenant === 'iwmp' && map['contract-management']) {
    const { composerModule: _drop, ...rest } = map['contract-management']
    map['contract-management'] = { ...rest, routes: makeContractManagementRoute('/contract-management', {}) }
  }
  return map
}
