import type { ModuleType, ResolvedView, ViewKind, ViewSpec, ViewSpecObject } from './composition'

/**
 * Module-type registry — the composer's brain. Ports the PATTERN of Shaheer's
 * React `module-registry.tsx` as a **non-React** map: each module type declares
 * its default views, how its tabs are labelled (view-kinds vs named instances),
 * and the *contract refs* naming the React templates it renders through.
 *
 * The actual template components live in `@fams/v5-templates` (later tasks);
 * this registry references them by name only. An app wires those names to real
 * components via the composer's renderer registry (see `composer.tsx`) — so the
 * composer core stays React-free and the fixed module-type menu is data.
 *
 * Module-type map (from the DS decision log):
 *   entity    → ListView + EntityProfile + CreationSheet
 *   pipeline  → Kanban + stages + TaskDetail
 *   dashboard → DashboardGrid
 *   calendar  → CalendarView (monthly + weekly, `@fams/v5-templates`)
 * The remaining Shaheer types (live-monitoring, reports, settings, forms,
 * zones, pois) are registered as placeholders until their templates land.
 */

/** Template contract refs — names the app resolves to React components. */
export interface ModuleTemplateRefs {
  /** View-kind → template component name (the tabbed view surfaces). */
  views?: Partial<Record<ViewKind, string>>
  /** The record detail / profile surface template. */
  detail?: string
  /** The create-new surface template. */
  create?: string
  /** The instance-grid template (dashboard / reports). */
  grid?: string
}

export interface ModuleTypeDef {
  /** Human label for the module type (docs / fallbacks). */
  label: string
  /** Rail icon name (resolved against the icon set at render time). */
  icon?: string
  /** Default view-kinds offered as tabs (empty for instance modules). */
  defaultViews: ViewKind[]
  /** Are tabs view-kinds, or named instances (dashboard/reports)? */
  tabKind: 'view' | 'instance'
  /** Template contract refs — see `ModuleTemplateRefs`. */
  templateRefs: ModuleTemplateRefs
  /**
   * Registered but not yet wired to real templates. `composeModule` renders a
   * clearly-marked placeholder for placeholder types (and for any wired type
   * whose template ref the app hasn't supplied a renderer for).
   */
  placeholder?: boolean
}

const REGISTRY: Record<string, ModuleTypeDef> = {
  entity: {
    label: 'Entity',
    icon: 'Cube01',
    defaultViews: ['list'],
    tabKind: 'view',
    templateRefs: {
      views: {
        list: 'ListView',
        'grouped-list': 'GroupedListView',
        map: 'MapView',
        hybrid: 'HybridView',
        'dispatcher-cockpit': 'DispatcherCockpitView',
        'triage-console': 'TriageConsoleView',
        'fleet-console': 'FleetConsoleView',
        'workforce-pulse': 'WorkforcePulseView',
      },
      detail: 'EntityProfile',
      create: 'CreationSheet',
    },
  },

  pipeline: {
    label: 'Pipeline',
    icon: 'Columns03',
    defaultViews: ['kanban', 'list'],
    tabKind: 'view',
    templateRefs: {
      views: {
        kanban: 'KanbanView',
        list: 'PipelineListView',
        calendar: 'PipelineCalendarView',
        hybrid: 'PipelineHybridView',
        'dispatcher-cockpit': 'DispatcherCockpitView',
        'triage-console': 'TriageConsoleView',
        'fleet-console': 'FleetConsoleView',
        'workforce-pulse': 'WorkforcePulseView',
      },
      detail: 'TaskDetail',
      create: 'CreationSheet',
    },
  },

  dashboard: {
    label: 'Dashboard',
    icon: 'LayoutGrid01',
    defaultViews: [],
    tabKind: 'instance',
    templateRefs: { grid: 'DashboardGrid' },
  },

  'live-monitoring': {
    label: 'Live Monitoring',
    icon: 'Signal01',
    defaultViews: ['hybrid', 'list', 'map'],
    tabKind: 'view',
    templateRefs: { views: { hybrid: 'LiveMonitoringView' } },
    placeholder: true,
  },

  reports: {
    label: 'Reports',
    icon: 'File02',
    defaultViews: [],
    tabKind: 'instance',
    templateRefs: { grid: 'ReportsHome' },
    placeholder: true,
  },

  // Wired (no longer a placeholder): `@fams/v5-templates` supplies the
  // `InboxView` renderer via its default renderer registry.
  inbox: {
    label: 'Inbox',
    icon: 'Inbox01',
    defaultViews: ['list'],
    tabKind: 'view',
    templateRefs: { views: { list: 'InboxView' } },
  },

  settings: {
    label: 'Settings',
    icon: 'Settings01',
    defaultViews: [],
    tabKind: 'view',
    templateRefs: { grid: 'SettingsView' },
    placeholder: true,
  },

  // Wired (no longer a placeholder): `@fams/v5-templates` supplies the
  // `CalendarView` renderer via its default renderer registry, and its
  // `ModuleView` resolves the `calendar` view kind to the real monthly/weekly
  // grid. The `pipeline` type's `PipelineCalendarView` ref is bound to the
  // same surface.
  calendar: {
    label: 'Calendar',
    icon: 'Calendar',
    defaultViews: ['calendar'],
    tabKind: 'view',
    templateRefs: { views: { calendar: 'CalendarView' } },
  },

  forms: {
    label: 'Forms',
    icon: 'Clipboard',
    defaultViews: [],
    tabKind: 'view',
    templateRefs: { grid: 'FormsView' },
    placeholder: true,
  },

  zones: {
    label: 'Zones',
    icon: 'Map01',
    defaultViews: ['hybrid'],
    tabKind: 'view',
    templateRefs: { views: { hybrid: 'ZonesView' } },
    placeholder: true,
  },

  pois: {
    label: 'POIs',
    icon: 'MarkerPin02',
    defaultViews: ['hybrid'],
    tabKind: 'view',
    templateRefs: { views: { hybrid: 'PoisView' } },
    placeholder: true,
  },
}

/** Look up a module-type definition (undefined for unknown types). */
export function getModuleType(type: ModuleType): ModuleTypeDef | undefined {
  return REGISTRY[type]
}

/** Register or override a module-type definition (apps may extend the menu). */
export function registerModuleType(type: ModuleType, def: Partial<ModuleTypeDef>): void {
  const existing = REGISTRY[type]
  REGISTRY[type] = {
    label: def.label ?? existing?.label ?? type,
    icon: def.icon ?? existing?.icon,
    defaultViews: def.defaultViews ?? existing?.defaultViews ?? [],
    tabKind: def.tabKind ?? existing?.tabKind ?? 'view',
    templateRefs: def.templateRefs ?? existing?.templateRefs ?? {},
    placeholder: def.placeholder ?? existing?.placeholder,
  }
}

/** All module types with their definitions (used by docs / nav). */
export function listModuleTypes(): { type: ModuleType; def: ModuleTypeDef }[] {
  return Object.keys(REGISTRY).map((type) => ({ type, def: REGISTRY[type] }))
}

const VIEW_LABEL: Record<ViewKind, string> = {
  hybrid: 'Hybrid View',
  list: 'List View',
  map: 'Map View',
  kanban: 'Kanban View',
  calendar: 'Calendar View',
  'grouped-list': 'Grouped List',
  grid: 'Grid',
  // Operations-console lenses. These defaults exist so a bare-string
  // blueprint (`views: ["dispatcher-cockpit"]`) still gets a sane tab, but
  // the intended authoring path is the `ViewSpec` object form with the
  // module's own label — the whole reason that form was added.
  'dispatcher-cockpit': 'Dispatcher Cockpit',
  'triage-console': 'Triage Console',
  'fleet-console': 'Fleet Console',
  'workforce-pulse': 'Workforce Pulse',
}

/** Human label for a view-kind (docs / tab labels). */
export function viewLabel(kind: ViewKind): string {
  return VIEW_LABEL[kind] ?? kind
}

/**
 * Context-aware view-kind label. SPEC v2 (run 2026-08-24, live-monitoring
 * §2.1 + frames 495:2998/540:69908) settles the tab strings: single-pane
 * kinds read the PLAIN names — **"Map View" / "List View"** — even beside a
 * `hybrid` sibling (the previous run's "Map Only View"/"List Only View"
 * qualifier was a spec-era misreading of the 495:25723 option cards; the
 * shipped Figma tab bar never says "Only"). The `kinds` parameter is kept
 * for API stability (public barrel export consumed by FAMS Desk et al.) and
 * so a future genuinely context-sensitive label has its seam back without a
 * signature change.
 */
export function viewLabelIn(kind: ViewKind, kinds: readonly ViewKind[]): string {
  void kinds
  return viewLabel(kind)
}

/** The KIND of a view entry, whichever authored form it took. */
export function viewSpecKind(spec: ViewSpec): ViewKind {
  return typeof spec === 'string' ? spec : spec.kind
}

/**
 * Resolve the effective view KINDS for a module (explicit views, or type
 * defaults). Signature and return type are unchanged for every existing
 * caller — `explicit` merely widened to accept the `ViewSpec` object form,
 * which is reduced to its kind here. Callers that need the labels/icons use
 * `resolveModuleViewSpecs` instead.
 */
export function resolveModuleViews(type: ModuleType, explicit?: ViewSpec[]): ViewKind[] {
  if (explicit && explicit.length) return explicit.map(viewSpecKind)
  return getModuleType(type)?.defaultViews ?? []
}

/**
 * Resolve the effective views for a module as fully-normalized entries —
 * kind PLUS the label the tab strip shows (the spec's own `label` when it
 * authored one, else the kind's context-aware `VIEW_LABEL` default) and an
 * optional tab glyph name.
 *
 * This is the seam the object form of `ViewSpec` exists for: the engine keeps
 * branching on `kind` alone, while a module names its own lenses in metadata.
 */
export function resolveModuleViewSpecs(type: ModuleType, explicit?: ViewSpec[]): ResolvedView[] {
  const specs: ViewSpec[] =
    explicit && explicit.length ? explicit : (getModuleType(type)?.defaultViews ?? [])
  const kinds = specs.map(viewSpecKind)
  return specs.map((spec, i) => {
    const kind = kinds[i]
    const obj = typeof spec === 'string' ? undefined : (spec as ViewSpecObject)
    const out: ResolvedView = { kind, label: obj?.label ?? viewLabelIn(kind, kinds) }
    if (obj?.icon) out.icon = obj.icon
    return out
  })
}
