// Information architecture for the FAMS Design System docs platform.
// Doc pages use a 2-segment route id `${group.id}/${item.id}`.
// Component families use `${group.id}/${family.id}` (defaults to the family's
// first member) or `${group.id}/${family.id}/${member.id}` for a specific one.
// The whole tree is always visible in the sidebar — no hidden-until-opened items.

import { COMPONENT_GROUPS } from './registry'

export type NavItem = { id: string; label: string; badge?: 'stable' | 'beta' | 'wip'; memberLabels?: string[] }
export type NavGroup = { id: string; label: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { id: 'introduction', label: 'Introduction' },
      { id: 'installation', label: 'Installation' },
      { id: 'quick-start', label: 'Quick start' },
    ],
  },
  {
    id: 'foundations',
    label: 'Foundations',
    items: [
      { id: 'principles', label: 'Design principles' },
      { id: 'layers', label: 'Layers & boundaries' },
      { id: 'tokens', label: 'Color & tokens' },
      { id: 'typography', label: 'Typography' },
      { id: 'iconography', label: 'Iconography' },
      { id: 'assets', label: 'Asset library', badge: 'wip' },
      { id: 'theming', label: 'Theming & tenants' },
    ],
  },
  {
    id: 'guidelines',
    label: 'Guidelines',
    items: [
      { id: 'content', label: 'Content & voice' },
      { id: 'accessibility', label: 'Accessibility' },
      { id: 'text-truncation', label: 'Text truncation' },
      { id: 'contributing', label: 'Contributing' },
    ],
  },
  // Components — one menu item per FAMILY, grouped by function (from the registry).
  ...COMPONENT_GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    items: g.families.map((f) => ({
      id: f.id,
      label: f.label,
      memberLabels: f.members.map((m) => m.label),
    })),
  })),
  {
    id: 'developers',
    label: 'Developers',
    items: [
      { id: 'consuming', label: 'Consuming the package' },
      { id: 'api-contract', label: 'Component API contract' },
      { id: 'state-performance', label: 'State & performance' },
      { id: 'testing', label: 'Testing & Definition of Done' },
    ],
  },
]

export const DEFAULT_ROUTE = 'overview/introduction'

const DOC_GROUP_IDS = new Set(['overview', 'foundations', 'guidelines', 'developers'])

/** 2-segment doc routes (Overview/Foundations/Guidelines/Developers). */
export const DOC_ROUTES = NAV.filter((g) => DOC_GROUP_IDS.has(g.id)).flatMap((g) => g.items.map((i) => `${g.id}/${i.id}`))

/** 2-segment family routes — resolve to the family's first member. */
export const FAMILY_ROUTES = COMPONENT_GROUPS.flatMap((g) => g.families.map((f) => `${g.id}/${f.id}`))

/** 3-segment member routes — a specific member within a family. */
export const MEMBER_ROUTES = COMPONENT_GROUPS.flatMap((g) =>
  g.families.flatMap((f) => f.members.map((m) => `${g.id}/${f.id}/${m.id}`)),
)

/** All valid route ids — doc pages, family defaults, and specific members. */
export const ROUTES = [...DOC_ROUTES, ...FAMILY_ROUTES, ...MEMBER_ROUTES]

// ── Legacy redirects ────────────────────────────────────────────────────────
// Before the family restructure, every component lived at a flat
// `<oldLayerGroup>/<componentId>` route (primitives/layout/composites/shells/domain).
// Old links (bookmarks, external references, browser history) must keep working —
// map each old route straight to its new `group/family/member` route.

const OLD_LAYER_GROUPS: Record<string, string[]> = {
  primitives: [
    'button', 'accordion', 'alert-dialog', 'avatar', 'badge', 'calendar', 'checkbox', 'dialog',
    'dropdown-menu', 'file-type-icon', 'icon-badge', 'input', 'label', 'popover', 'progress',
    'radial-progress', 'radio-group', 'scroll-area', 'select', 'separator', 'sheet', 'switch',
    'tabs', 'textarea', 'toast', 'tooltip', 'trend-indicator',
  ],
  layout: ['stack', 'form-grid', 'form-section', 'toolbar'],
  composites: [
    'activity-feed', 'alert', 'breadcrumbs', 'card', 'chart-card', 'chart-legend', 'chart-tooltip',
    'checklist-section', 'column-customizer', 'combobox', 'connection-status-card', 'critical-events-list',
    'data-table', 'date-range-picker', 'destructive-action-modal', 'entity-picker-drawer',
    'entity-profile-card', 'filter-panel', 'filter-popup', 'health-strip', 'kanban', 'kpi-tile',
    'list-row', 'live-duration-card', 'logo', 'module-view-tabs', 'no-permission', 'notification-card',
    'people-picker', 'segmented-bar', 'skeleton', 'state-transition-toolbar', 'status-transition-dropdown',
    'status-view', 'stepper', 'table-cell', 'tag-chip-list', 'tag-picker', 'timeline', 'user-menu', 'view-tabs',
  ],
  shells: [
    'app-shell', 'dashboard-layout', 'detail-sheet', 'hybrid-view', 'list-view', 'module-rail',
    'page-header', 'profile-layout', 'record-layout', 'side-nav', 'top-nav',
  ],
  domain: ['map-container', 'map-chip', 'map-controls', 'vehicle-marker', 'vehicle-popup-card'],
}

/** memberId → new `group/family/member` route, derived once from COMPONENT_GROUPS. */
const NEW_ROUTE_OF_MEMBER: Record<string, string> = Object.fromEntries(
  COMPONENT_GROUPS.flatMap((g) =>
    g.families.flatMap((f) => f.members.map((m) => [m.id, `${g.id}/${f.id}/${m.id}`] as const)),
  ),
)

/** old `oldGroup/componentId` → new `group/family/member`. */
export const LEGACY_ROUTES: Record<string, string> = Object.fromEntries(
  Object.entries(OLD_LAYER_GROUPS).flatMap(([oldGroup, ids]) =>
    ids.map((id) => [`${oldGroup}/${id}`, NEW_ROUTE_OF_MEMBER[id]] as const),
  ),
)

export function routeFromHash(): string {
  const raw = window.location.hash.replace(/^#\//, '')
  const resolved = LEGACY_ROUTES[raw] ?? raw
  return ROUTES.includes(resolved) ? resolved : DEFAULT_ROUTE
}

/** Finds the NAV group + item (family, for component routes) for a route id — used for breadcrumbs. */
export function findItem(route: string): { group: NavGroup; item: NavItem } | null {
  const [g, i] = route.split('/')
  const group = NAV.find((x) => x.id === g)
  const item = group?.items.find((x) => x.id === i)
  return group && item ? { group, item } : null
}
