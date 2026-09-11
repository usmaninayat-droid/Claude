import type { LucideIcon } from 'lucide-react'
import {
  Magnet, Handshake, Users, Building2, Package,
  Gauge, Activity, ClipboardCheck, CalendarClock, OctagonAlert,
  ShieldCheck, ClipboardList, Boxes, MapPin, FileText, FileSearch2,
} from 'lucide-react'
import { MODULE_ENTRIES, FLAT_MODULES, type ModuleGroup, type ModuleItem, type ModuleLeaf } from '../../layout/moduleNavData'
import type { AppPage } from '../../layout/AppLayout'

/**
 * Data for the Home landing page (Figma "FAMS Landing" `5442:2635`). The page is
 * an app/module **finder**: product SUITES (CCMS-ESP, CRM), each a folder-tab
 * panel of module CARDS. Every card carries a coloured category BADGE.
 *
 * Grounded in the real app: **CCMS-ESP** reuses the real operations module rail
 * (`MODULE_ENTRIES`), each leaf badged by its group (standalone items → General).
 * **CRM** is illustrative (Leads/Deals/Contacts/Companies/Products) — it's in the
 * Figma but not built here. Every card navigates: the three built modules open
 * their own surface, everything else opens the shared module placeholder.
 * All badge colours are DS tokens (no raw hex).
 */

/**
 * The card's tag IS its owning group's TITLE. Colours are assigned per group by
 * the group's order in the rail (below) — never by a hardcoded label/id that
 * could drift out of sync with the rail data.
 */
const GROUP_PALETTE = [
  'var(--chart-accent-purple)', // 1st group (Dashboards)          #9E77ED
  'var(--warning-700)', //          2nd group (Plans Management)     #B54708
  'var(--badge-info-dark)', //      3rd group (Assets Management)    #00478A
  'var(--chart-accent-teal)', //    4th group (Workforces)           #14B8A6
  'var(--status-info)', //          5th group (Locations Management) #0072D6
]

export interface HomeCard {
  id: string
  label: string
  desc: string
  icon: LucideIcon
  /** The owning group's TITLE, shown as the tag — or `null` for an ungrouped module (no tag). */
  tag: string | null
  /** DS colour token for the tag (unused when `tag` is null). */
  tagColor: string
  /** Navigation target. `'module'` is the shared placeholder surface used by
   *  every module that hasn't been built yet. */
  page: AppPage | null
}

export interface HomeSuite {
  id: string
  label: string
  /** DS accent used everywhere the app surfaces its identity: the switcher tile,
   *  the home section header, the module tile icon chip, and the rail's app row.
   *  Kept in sync with the "Tadweer — Launch Pad" node `6843:15423` colour set. */
  color: string
  /** The app's mark, drawn in the switcher tile, the section header chip, and
   *  the primary rail's application row. */
  icon: LucideIcon
  cards: HomeCard[]
}

/** Two-line descriptions per module (replaces the Figma's Lorem ipsum) — deliberately long
 * enough to consistently wrap to 2 lines in the Home dashboard's `ModuleTile` card, so every
 * card in a grid row lands at the same height regardless of which module it is. */
const DESC: Record<string, string> = {
  'operational-dashboard': 'Live operational overview of the current shift, covering active response routes, tanker status and pending exceptions.',
  'performance-dashboard': 'KPIs and performance trends at a glance, tracked across response routes, tanker fleet and crew over time.',
  'telematics-dashboard': 'Tanker telematics, live location and sensor data streamed from every connected vehicle.',
  'bin-compliance-dashboard': 'Station reporting compliance and exceptions, flagged against your service level agreements.',
  'fuel-monitoring-dashboard': 'Fuel consumption and efficiency tracking across every tanker in the active fleet.',
  'hw-monitoring-dashboard': 'Device and hardware health monitoring for every connected sensor and gateway.',
  'driver-behaviour-dashboard': 'Driver safety scores and behaviour events, tracked from telematics and trip history.',
  'management-dashboard': 'Executive rollup across all operations, response routes, tanker fleet and crew performance.',
  'smart-planning': 'AI-optimized response route planning that adapts to incident severity and capacity in real time.',
  'plan-monitoring': 'Track plan execution against schedule and flag delays before they become incidents.',
  'adhoc-planning': 'Create one-off response plans on demand for incidents outside the regular monitoring schedule.',
  'bin-inspection-plans': 'Schedule and manage weather-station inspections across every zone and response route.',
  'bin-washing-plans': 'Plan routine sensor calibration cycles to keep every monitoring station accurate and compliant.',
  'deep-washing-plans': 'Plan deep-maintenance operations for stations that need a more thorough servicing cycle.',
  'under-bin-washing-plans': 'Plan under-station maintenance routines to keep monitoring stations free of debris.',
  'rmcc-collection-plans': 'Plan RMCC response routes across every registered catchment zone and response base.',
  'fleet-management': 'Manage tankers, capacity and status across your entire active fleet.',
  'preventive-maintenance': 'Schedule preventive tanker maintenance to reduce breakdowns and downtime.',
  'bins-management': 'Register, locate and manage every weather station across your entire service area.',
  'materials-inventory': 'Track materials and consumables stock levels across every response base and warehouse.',
  'bins-work-orders': 'Raise and track station work orders from initial request through to final resolution.',
  'devices-management': 'Manage IoT devices deployed across your assets, tankers and monitoring stations.',
  'sims-management': 'Manage SIM cards and connectivity for every device across the operational network.',
  'workforces': 'Manage drivers, crews and staff across every shift, response route and response base.',
  'attendance-logs': 'Track attendance and shift check-ins across your entire workforce and response bases.',
  'shift-scheduling': 'Build and assign work shifts across drivers, crews and response bases for every day.',
  'zones-management': 'Define and manage catchment zones used for planning, dispatch and reporting.',
  'pois-management': 'Manage points of interest on the map, from response bases to discharge and staging sites.',
  'service-locations-management': 'Manage critical-facility locations across every contract, response route and zone.',
  'rmcc-management': 'Manage RMCC sites and capacity across every registered facility and region.',
  'deep-washing-sites-management': 'Manage deep-maintenance site locations used by planning and operations teams.',
  'live-monitoring': 'Real-time map of the active tanker fleet, updated live as every response route progresses.',
  'operations-center': 'Command center for daily flood-response dispatch, alerts and route coordination across shifts.',
  'ticketing': 'Raise, assign and resolve tickets raised across every operational module.',
  'events': 'Operational events and telemetry alerts streamed live from the field.',
  'trips': 'Review completed and active trips across the entire operational fleet.',
  'incidents': 'Log and resolve flood requests and complaints as soon as they are reported through any channel.',
  'inspections': 'Conduct and review field inspections across every site and response route.',
  'kpi-library': 'Browse the catalog of KPIs tracked across every module on the platform.',
  'contracts': 'Manage client contracts and SLAs across every active account and region.',
  'service-requests': 'Track inbound service requests from submission through to final resolution.',
  'companies': 'Manage partner and client organizations across every active contract and site.',
  'contacts': 'Directory of operational contacts across every site, team and department.',
  'reports': 'Generate and export reports across every module, metric and reporting period.',
}

/** Rail-order index → tag colour for a group (unchanged mapping). */
const GROUP_ORDER = [
  'dashboards', 'plans-management', 'assets-management', 'workforces-management', 'locations-management',
]
const groupColor = (groupId: string) => GROUP_PALETTE[GROUP_ORDER.indexOf(groupId) % GROUP_PALETTE.length]

const findGroup = (id: string) =>
  MODULE_ENTRIES.find((e): e is ModuleGroup => e.type === 'group' && e.id === id)!
const findItem = (id: string) =>
  MODULE_ENTRIES.find((e): e is ModuleItem => e.type === 'item' && e.id === id)!

/**
 * Modules with a real surface of their own. Everything else — in every app —
 * routes to the shared module placeholder (`page: 'module'`), which shows the
 * same "coming soon" empty state the unbuilt settings modules use.
 */
const MODULE_PAGE: Record<string, AppPage> = {
  'zones-management': 'zones',
  'live-monitoring': 'live-monitoring',
  'operations-center': 'dashboard',
}

const leafCard = (leaf: ModuleLeaf, tag: string | null, tagColor: string): HomeCard => ({
  id: leaf.id, label: leaf.label, icon: leaf.icon, tag, tagColor,
  desc: DESC[leaf.id] ?? 'Open this module.', page: MODULE_PAGE[leaf.id] ?? 'module',
})
/** Every card of a group, tagged with the group's title + colour. */
const groupCards = (groupId: string): HomeCard[] => {
  const g = findGroup(groupId)
  return g.items.map((it) => leafCard(it, g.label, groupColor(groupId)))
}
/** Standalone items as untagged cards, in the given order. */
const itemCards = (...ids: string[]): HomeCard[] => ids.map((id) => leafCard(findItem(id), null, ''))

/**
 * The 44 real operations modules split across product APPS (per the multi-app design):
 * CCMS-ESP keeps the core ops (Dashboards + monitoring, 15 modules); each remaining
 * module group becomes its own app, plus a CCMS-Admin app for the standalone records
 * modules. The tag is the module's group title.
 */
export const HOME_SUITES: HomeSuite[] = [
  {
    id: 'ccms-esp',
    label: 'CCMS-ESP',
    color: '#f63d68', // Accent/Rose
    icon: ShieldCheck,
    cards: [
      ...groupCards('dashboards'),
      ...itemCards('live-monitoring', 'operations-center', 'ticketing', 'events', 'trips', 'incidents', 'inspections'),
    ],
  },
  {
    id: 'ccms-plans',
    label: 'CCMS-Plans',
    color: '#ff6a1a', // Accent/Flame
    icon: ClipboardList,
    cards: groupCards('plans-management'),
  },
  {
    id: 'ccms-assets',
    label: 'CCMS-Assets',
    color: '#06b6d4', // Accent/Cyan
    icon: Boxes,
    cards: groupCards('assets-management'),
  },
  {
    id: 'ccms-workforce',
    label: 'CCMS-Workforce',
    color: '#12b76a', // Accent/Success
    icon: Users,
    cards: groupCards('workforces-management'),
  },
  {
    id: 'ccms-locations',
    label: 'CCMS-Locations',
    color: '#14b8a6', // Accent/AquaGreen
    icon: MapPin,
    cards: groupCards('locations-management'),
  },
  {
    id: 'ccms-admin',
    label: 'CCMS-Admin',
    color: '#4e5ba6', // Accent/GrayBlue
    icon: FileText,
    cards: itemCards('kpi-library', 'contracts', 'service-requests', 'companies', 'contacts', 'reports'),
  },
  {
    id: 'crm',
    label: 'CRM',
    color: '#9e77ed', // Accent/Lavender
    icon: Handshake,
    cards: [
      { id: 'leads', label: 'Leads', icon: Magnet, tag: 'Pipeline', tagColor: 'var(--warning-500)', desc: 'Capture, qualify and route inbound leads.', page: 'module' },
      { id: 'deals', label: 'Deals', icon: Handshake, tag: 'Pipeline', tagColor: 'var(--warning-500)', desc: 'Track opportunities through the pipeline.', page: 'module' },
      { id: 'crm-contacts', label: 'Contacts', icon: Users, tag: 'Entities', tagColor: 'var(--success-500)', desc: 'Every person you do business with.', page: 'module' },
      { id: 'crm-companies', label: 'Companies', icon: Building2, tag: 'Entities', tagColor: 'var(--success-500)', desc: 'Accounts and organizations you serve.', page: 'module' },
      { id: 'products', label: 'Products', icon: Package, tag: 'Entities', tagColor: 'var(--success-500)', desc: 'Your catalog of services and products.', page: 'module' },
    ],
  },
  {
    // A separate product suite (not built here) whose
    // Dashboards modules carry the Dashboards tag; the rest are ungrouped (no tag).
    id: 'iims-po',
    label: 'IIMS - PO',
    color: '#d946ef', // Accent/Plum
    icon: FileSearch2,
    cards: [
      { id: 'iims-operational-dashboard', label: 'Operational Dashboard', icon: Gauge, tag: 'Dashboards', tagColor: 'var(--chart-accent-purple)', desc: DESC['operational-dashboard'], page: 'module' },
      { id: 'iims-performance-dashboard', label: 'Performance Dashboard', icon: Activity, tag: 'Dashboards', tagColor: 'var(--chart-accent-purple)', desc: DESC['performance-dashboard'], page: 'module' },
      { id: 'iims-inspections', label: 'Inspections', icon: ClipboardCheck, tag: null, tagColor: '', desc: DESC['inspections'], page: 'module' },
      { id: 'iims-shift-scheduling', label: 'Shift Scheduling', icon: CalendarClock, tag: null, tagColor: '', desc: DESC['shift-scheduling'], page: 'module' },
      { id: 'iims-incidents', label: 'Requests & Complaints', icon: OctagonAlert, tag: null, tagColor: '', desc: DESC['incidents'], page: 'module' },
    ],
  },
]

/** Fast module → owning app lookup. Every module carries its parent suite's id
 *  in `ALL_CARDS.suiteId`, but nav data (`FLAT_MODULES`) is untied from the
 *  home catalog — this map bridges them so the rail can filter its rows by the
 *  currently-selected app without duplicating the mapping. */
export const MODULE_APP: Record<string, string> = Object.fromEntries(
  HOME_SUITES.flatMap((s) => s.cards.map((c) => [c.id, s.id])),
)

/** The Launch Pad's first entry — used as the default active app until the user
 *  picks another in the switcher. */
export const DEFAULT_APP_ID = HOME_SUITES[0]?.id ?? 'ccms-esp'

export const TOTAL_MODULES = HOME_SUITES.reduce((n, s) => n + s.cards.length, 0)

/** A card flattened with its owning suite — the corpus for the global ⌘K palette. */
export interface FlatCard extends HomeCard {
  suiteId: string
  suiteLabel: string
}

export const ALL_CARDS: FlatCard[] = HOME_SUITES.flatMap((s) =>
  s.cards.map((c) => ({ ...c, suiteId: s.id, suiteLabel: s.label })),
)

const norm = (s: string) => s.toLowerCase().trim()

/** Match a card against the query (label · group tag · suite label). */
export function cardMatches(card: HomeCard, suiteLabel: string, q: string): boolean {
  const n = norm(q)
  if (!n) return true
  return (
    norm(card.label).includes(n) ||
    (card.tag ? norm(card.tag).includes(n) : false) ||
    norm(suiteLabel).includes(n)
  )
}

/** Label + icon for any module id, wherever it was clicked from: the rail's
 *  curated flat list (its labels win — they carry the newer Figma naming) or
 *  the Launch Pad catalogue, which also knows the owning application. */
export function findModuleMeta(
  id: string,
): { id: string; label: string; icon: LucideIcon; appLabel?: string } | undefined {
  const card = ALL_CARDS.find((c) => c.id === id)
  const leaf = FLAT_MODULES.find((m) => m.id === id)
  if (!card && !leaf) return undefined
  return {
    id,
    label: leaf?.label ?? card!.label,
    icon: leaf?.icon ?? card!.icon,
    appLabel: card?.suiteLabel,
  }
}
