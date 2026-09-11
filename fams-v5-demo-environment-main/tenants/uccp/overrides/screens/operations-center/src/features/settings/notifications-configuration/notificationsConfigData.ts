export type Channel = 'toast' | 'push' | 'email' | 'sms' | 'inbox' | 'whatsapp'

/**
 * Channel columns, in the order the product asked for: Inbox · In-App · Push ·
 * Email · WhatsApp · SMS. Labels are title case here and uppercased by the
 * column header — the raw label is still what tooltips and aria-labels read.
 */
export const CHANNELS: { id: Channel; label: string }[] = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'toast', label: 'In-App' },
  { id: 'push', label: 'Push' },
  { id: 'email', label: 'Email' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'sms', label: 'SMS' },
]

/** The same list without Push — Notification Configuration (page 1) and the
 *  personal preferences page don't offer it. */
export const CHANNELS_NO_PUSH: { id: Channel; label: string }[] =
  CHANNELS.filter((c) => c.id !== 'push')

export type Criticality = 'critical' | 'medium' | 'normal'

export const CRITICALITY_LEVELS: { id: Criticality; label: string }[] = [
  { id: 'critical', label: 'Critical' },
  { id: 'medium', label: 'Medium' },
  { id: 'normal', label: 'Normal' },
]

// Token-only color coding (error/warning/info/gray ramps — none of these are brand colors,
// so they read the same under any tenant theme, not just Tadweer green).
export const CRITICALITY_COLOR: Record<Criticality, { dot: string; text: string }> = {
  critical: { dot: 'bg-error-500', text: 'text-error-600' },
  medium: { dot: 'bg-warning-500', text: 'text-warning-600' },
  normal: { dot: 'bg-[color:var(--status-info)]', text: 'text-[color:var(--status-info)]' },
}

// No existing role/permission list elsewhere in the codebase to match — named to fit
// the dispatch-platform domain this config screen governs. 10 roles, matching the
// "10+ user roles" scale this screen needs to handle.
export const ROLES = [
  'Dispatcher',
  'Fleet Manager',
  'Driver',
  'Maintenance Technician',
  'Compliance Officer',
  'Warehouse Supervisor',
  'Route Planner',
  'Customer Support',
  'Finance Officer',
  'Admin',
  'Project Officer',
] as const
export type Role = (typeof ROLES)[number]

export type RoleChannelMap = Record<Role, Record<Channel, boolean | 'indeterminate'>>

export interface NotificationType {
  id: string
  name: string
  /** Owning module — informational only; trigger/business logic stays there (R1). */
  module: string
  description: string
  platformEnabled: boolean
  /** Platform-wide lock (no per-role granularity). */
  mandatory: boolean
  criticality: Criticality
  roleChannels: RoleChannelMap
  /** Opt-out of Notification Batching for this type specifically (set from its own
   * RoleChannelSheet) — always delivers individually even if its module batches. Independent of
   * `mandatory`: being locked-on doesn't itself exempt a type from batching, since batching only
   * delays delivery/summarizes it, it doesn't drop it. */
  batchingExempt: boolean
}

function rc(on: Partial<Record<Role, Channel[]>>): RoleChannelMap {
  const map = {} as RoleChannelMap
  for (const role of ROLES) {
    const enabled = new Set(on[role] ?? [])
    map[role] = {
      toast: enabled.has('toast'),
      push: enabled.has('push'),
      email: enabled.has('email'),
      sms: enabled.has('sms'),
      whatsapp: enabled.has('whatsapp'),
      inbox: true, // Seed all as enabled by default for Inbox
    }
  }
  return map
}

interface Draft {
  name: string
  module: string
  description: string
  platformEnabled?: boolean
  mandatory?: boolean
  /** Defaults to 'critical' when mandatory, else 'medium' — override below where it should differ. */
  criticality?: Criticality
  /** Opt out of Notification Batching for this type — set from its own RoleChannelSheet, not
   * implied by `mandatory` (see NotificationType doc comment). */
  batchingExempt?: boolean
  roles: Partial<Record<Role, Channel[]>>
}

const DRAFTS: Draft[] = [
  // Dispatching
  { name: 'Route Delayed', module: 'Dispatching', description: 'A route falls behind its planned schedule beyond the configured threshold.', criticality: 'medium', roles: { Dispatcher: ['toast', 'push'], 'Fleet Manager': ['toast'], Admin: ['toast'] } },
  { name: 'Vehicle Breakdown / Failure', module: 'Dispatching', description: 'A vehicle reports a breakdown or critical fault mid-route.', mandatory: true, batchingExempt: true, roles: { Dispatcher: ['toast', 'push', 'sms'], 'Fleet Manager': ['toast', 'push', 'sms', 'email'], Driver: ['push'], Admin: ['toast', 'push', 'sms'] } },
  { name: 'Dispatch Plan Published', module: 'Dispatching', description: 'A new shift dispatch plan is published and ready for review.', criticality: 'normal', roles: { Dispatcher: ['toast'], 'Route Planner': ['toast', 'email'] } },
  // Fleet
  { name: 'Vehicle Maintenance Due', module: 'Fleet', description: 'A vehicle is approaching its scheduled preventive-maintenance interval.', roles: { 'Fleet Manager': ['toast', 'email'], 'Maintenance Technician': ['toast', 'email'] } },
  { name: 'Vehicle Speed Violation', module: 'Fleet', description: 'Telematics detects a vehicle exceeding the posted speed limit.', roles: { 'Fleet Manager': ['toast'] } },
  { name: 'Vehicle Odometer Sync Failed', module: 'Fleet', description: 'A vehicle’s telematics unit failed to report odometer readings.', criticality: 'normal', roles: { 'Fleet Manager': ['email'] } },
  // Maintenance
  { name: 'Work Order Created', module: 'Maintenance', description: 'A new maintenance work order is created for a vehicle or asset.', criticality: 'normal', roles: { 'Maintenance Technician': ['toast', 'push'], 'Fleet Manager': ['toast'] } },
  { name: 'Work Order Overdue', module: 'Maintenance', description: 'An open work order has passed its target completion date.', criticality: 'medium', roles: { 'Maintenance Technician': ['toast', 'email'], 'Fleet Manager': ['email'] } },
  // Compliance
  { name: 'Compliance Report Ready', module: 'Compliance', description: 'A scheduled compliance report has finished generating.', criticality: 'normal', roles: { 'Compliance Officer': ['toast', 'email'], Admin: ['email'] } },
  { name: 'Audit Finding Logged', module: 'Compliance', description: 'A new finding is logged against an active compliance audit.', criticality: 'medium', roles: { 'Compliance Officer': ['toast', 'push', 'email'] } },
  // Workforce
  { name: 'Task Assigned to You', module: 'Workforce', description: 'A pipeline task or record is assigned directly to a user.', roles: { Dispatcher: ['toast', 'push'], 'Fleet Manager': ['toast', 'push'], Driver: ['push'], 'Customer Support': ['toast'], Admin: ['toast', 'push'] } },
  { name: 'Mentioned in Comment', module: 'Workforce', description: 'A user is @mentioned in a pipeline comment thread.', criticality: 'normal', roles: {} },
  { name: 'Shift Swap Requested', module: 'Workforce', description: 'A driver requests to swap an assigned shift with a colleague.', criticality: 'normal', roles: { Dispatcher: ['toast'], Driver: ['push'] } },
  // Routes
  { name: 'Route Optimization Complete', module: 'Routes', description: 'The route optimizer finishes recalculating a plan.', criticality: 'normal', roles: { 'Route Planner': ['toast'], Dispatcher: ['toast'] } },
  { name: 'Route Plan Changed', module: 'Routes', description: 'An assigned route plan is edited after publication.', roles: { Driver: ['push'], Dispatcher: ['toast'] } },
  // Response
  { name: 'Station Threshold Exceeded', module: 'Response', description: 'A weather station sensor reports a reading above the flood-alert threshold.', roles: { Dispatcher: ['toast', 'push'], 'Route Planner': ['toast'] } },
  { name: 'Response Missed', module: 'Response', description: 'A scheduled incident response is not completed within its window.', mandatory: true, roles: { Dispatcher: ['toast', 'push'], 'Fleet Manager': ['toast'], 'Customer Support': ['toast', 'email'] } },
  // Complaints
  { name: 'New Complaint Filed', module: 'Complaints', description: 'A customer files a new service complaint.', roles: { 'Customer Support': ['toast', 'push', 'email'] } },
  { name: 'Complaint Escalated', module: 'Complaints', description: 'A complaint breaches its SLA and escalates to management.', mandatory: true, roles: { 'Customer Support': ['toast', 'push'], Admin: ['toast', 'push', 'email'] } },
  // Reports
  { name: 'Weekly Digest Summary', module: 'Reports', description: 'A rollup summary of the week’s operations and exceptions.', criticality: 'normal', roles: { Admin: ['email'] } },
  { name: 'Custom Report Ready', module: 'Reports', description: 'An on-demand custom report finishes generating.', criticality: 'normal', roles: { Admin: ['toast', 'email'], 'Finance Officer': ['email'] } },
  // Zones
  { name: 'Zone Boundary Updated', module: 'Zones', description: 'A catchment zone’s service boundary is redrawn.', criticality: 'normal', roles: { 'Route Planner': ['toast'], Dispatcher: ['toast'] } },
  { name: 'Zone Capacity Exceeded', module: 'Zones', description: 'Aggregate incident load in a zone exceeds tanker fleet capacity.', roles: { 'Route Planner': ['toast', 'email'], 'Fleet Manager': ['email'] } },
  // Telematics
  { name: 'Device Offline', module: 'Telematics', description: 'A vehicle’s telematics device stops reporting for over 30 minutes.', roles: { 'Fleet Manager': ['toast', 'email'] } },
  { name: 'Harsh Braking Detected', module: 'Telematics', description: 'Telematics flags a harsh-braking event for a vehicle.', roles: { 'Fleet Manager': ['toast'] } },
  // Audit
  { name: 'Suspicious Login Detected', module: 'Audit', description: 'A login attempt is flagged as anomalous by security monitoring.', mandatory: true, batchingExempt: true, roles: { Admin: ['toast', 'push', 'email', 'sms'] } },
  { name: 'Permission Changed', module: 'Audit', description: 'A user’s role or permission set is modified.', roles: { Admin: ['toast', 'email'] } },
  // Inventory
  { name: 'Spare Part Low Stock', module: 'Inventory', description: 'A spare-parts SKU falls below its reorder threshold.', roles: { 'Maintenance Technician': ['toast'], 'Warehouse Supervisor': ['toast', 'email'] } },
  { name: 'Inventory Reconciliation Complete', module: 'Inventory', description: 'A scheduled inventory count finishes reconciling.', criticality: 'normal', roles: { 'Warehouse Supervisor': ['email'] } },
  // Contracts
  { name: 'Contract Expiring Soon', module: 'Contracts', description: 'A client or vendor contract approaches its renewal date.', roles: { Admin: ['toast', 'email'], 'Finance Officer': ['email'] } },
  // Quality Assurance
  { name: 'QA Inspection Failed', module: 'Quality Assurance', description: 'A scheduled quality inspection records a failing result.', criticality: 'medium', roles: { 'Compliance Officer': ['toast', 'email'], 'Fleet Manager': ['toast'] } },
  // Assets
  { name: 'Asset Transferred', module: 'Assets', description: 'A tracked asset is reassigned between depots or teams.', criticality: 'normal', roles: { 'Warehouse Supervisor': ['toast'] } },
  // Events
  { name: 'Fuel Theft', module: 'Events', description: 'Telematics detects a sudden drop in vehicle fuel level outside of a refueling event.', criticality: 'critical', roles: { 'Fleet Manager': ['toast', 'push', 'sms', 'email'], Dispatcher: ['toast', 'push'], Admin: ['toast', 'push', 'email'] } },
  { name: 'Tracker Tampered', module: 'Events', description: 'Vehicle GPS tracking device or power supply shows signs of disconnection or tampering.', criticality: 'critical', roles: { 'Fleet Manager': ['toast', 'push', 'sms'], Admin: ['toast', 'push', 'email'], 'Maintenance Technician': ['toast', 'email'] } },
  { name: 'Engine Overheated', module: 'Events', description: 'Engine coolant temperature exceeds safe operating thresholds.', criticality: 'critical', roles: { Driver: ['push'], 'Fleet Manager': ['toast', 'email'], 'Maintenance Technician': ['toast', 'push', 'email'] } },
  { name: 'Overspeeding', module: 'Events', description: 'Vehicle speed exceeds the maximum safety speed limit configured for the route.', criticality: 'critical', roles: { Driver: ['push'], 'Fleet Manager': ['toast', 'push'], Dispatcher: ['toast'] } },
  { name: 'Hotspot Used', module: 'Events', description: 'Vehicle onboard Wi-Fi hotspot is accessed or exceeds data usage limits.', criticality: 'medium', roles: { Driver: ['push'], 'Fleet Manager': ['email'] } },
  { name: 'ETA Missed', module: 'Events', description: 'Estimated Time of Arrival at destination or waypoint is missed by more than the configured buffer.', criticality: 'medium', roles: { Dispatcher: ['toast', 'push'], 'Route Planner': ['toast', 'email'] } },
  { name: 'RTDT Excess', module: 'Events', description: 'Real-time driving time (RTDT) exceeds safety threshold or scheduled shift duration.', criticality: 'medium', roles: { Dispatcher: ['toast', 'push'], Driver: ['push'], 'Compliance Officer': ['toast', 'email'] } },
  { name: 'Fuel Empty', module: 'Events', description: 'Fuel gauge level drops below the reserve threshold (low fuel alert).', criticality: 'medium', roles: { Driver: ['push'], 'Fleet Manager': ['toast'], 'Maintenance Technician': ['toast'] } },
]

export const NOTIFICATION_TYPES: NotificationType[] = DRAFTS.map((d, i) => ({
  id: `nt-${i + 1}`,
  name: d.name,
  module: d.module,
  description: d.description,
  platformEnabled: d.platformEnabled ?? true,
  mandatory: d.mandatory ?? false,
  criticality: d.criticality ?? (d.mandatory ? 'critical' : 'medium'),
  batchingExempt: d.batchingExempt ?? false,
  roleChannels: rc(d.roles),
}))

const rawModules = Array.from(new Set(NOTIFICATION_TYPES.map((t) => t.module)))
export const MODULES: string[] = rawModules.includes('Events')
  ? [rawModules[0], 'Events', ...rawModules.filter(m => m !== rawModules[0] && m !== 'Events')]
  : rawModules

// --- Notification Batching (queue high-frequency notifications, deliver one
// summarized digest after a fixed window) — global default + optional
// per-module override, per the chosen "global + module override" granularity. ---

export interface BatchingConfig {
  enabled: boolean
  /** Fire a digest once a module/type reaches this many queued notifications. */
  thresholdCount: number
  /** ...or once this many minutes pass since the first queued notification, whichever comes first. */
  windowMinutes: number
}

export const DEFAULT_BATCHING: BatchingConfig = { enabled: true, thresholdCount: 40, windowMinutes: 5 }

/** Plain-language "if X or more within Y minutes → 1 summary" sentence, shared by the global
 * BatchingSettingsCard and each module's override popover so the numbers always read as a
 * concrete scenario instead of bare digits (users couldn't parse "40/5m" on its own). */
export function batchingSentence(config: BatchingConfig) {
  return `${config.thresholdCount} or more notifications within ${config.windowMinutes} min → delivered as 1 summary`
}

export type ModuleBatchingMode = 'inherit' | 'custom' | 'off'

export interface ModuleBatchingOverride {
  mode: ModuleBatchingMode
  /** Only meaningful (and preserved across mode switches) when mode === 'custom'. */
  custom: BatchingConfig
}

/** The effective config a module actually runs with, given the platform default. */
export function resolveBatchingConfig(global: BatchingConfig, override: ModuleBatchingOverride): BatchingConfig {
  if (override.mode === 'off') return { enabled: false, thresholdCount: global.thresholdCount, windowMinutes: global.windowMinutes }
  if (override.mode === 'custom') return override.custom
  return global
}

// Events is the noisy telemetry module (10+ notifications/min) that motivated this feature —
// seeded with a tighter custom window so it's visibly overriding the platform default.
export const MODULE_BATCHING_OVERRIDES: Record<string, ModuleBatchingOverride> = Object.fromEntries(
  MODULES.map((m) => [
    m,
    m === 'Events'
      ? { mode: 'custom', custom: { enabled: true, thresholdCount: 5, windowMinutes: 2 } }
      : { mode: 'inherit', custom: DEFAULT_BATCHING },
  ])
)

export const BATCHING_SUPPORTED_MODULES = ['Events', 'Dispatching', 'Compliance']

export function applyRoleChannelRules(
  roleChannels: RoleChannelMap,
  role: Role,
  channel: Channel,
  value: boolean
): RoleChannelMap {
  const next = { ...roleChannels }
  const roleMap = { ...next[role] }
  roleMap[channel] = value

  if (channel === 'toast' && value === true) {
    roleMap['inbox'] = true
  }
  if (channel === 'inbox' && value === false) {
    roleMap['toast'] = false
  }

  next[role] = roleMap
  return next
}
