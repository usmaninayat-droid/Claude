import {
  CHANNELS, CRITICALITY_LEVELS, CRITICALITY_COLOR, ROLES, MODULES, NOTIFICATION_TYPES,
  applyRoleChannelRules,
} from '../notifications-configuration/notificationsConfigData'
import type {
  Channel, Criticality, Role, NotificationType,
} from '../notifications-configuration/notificationsConfigData'

export {
  CHANNELS, CRITICALITY_LEVELS, CRITICALITY_COLOR, ROLES, MODULES, NOTIFICATION_TYPES,
}
export type { Channel, Criticality, Role, NotificationType }

export interface NotificationProfile {
  id: string
  name: string
  roles: Role[]
}

export const DEFAULT_PROFILES: NotificationProfile[] = [
  {
    id: 'prof-1',
    name: 'Frontline Staff',
    roles: ['Driver', 'Maintenance Technician'],
  },
  {
    id: 'prof-2',
    name: 'Operations & Planning',
    roles: ['Dispatcher', 'Fleet Manager', 'Route Planner', 'Warehouse Supervisor'],
  },
  {
    id: 'prof-3',
    name: 'Admin & Compliance',
    roles: ['Admin', 'Compliance Officer', 'Customer Support', 'Finance Officer'],
  },
]

/**
 * System module permission map defining which roles have access to each module.
 * Roles outside this list for a module will not be affected by notification settings for that module.
 */
export const MODULE_ROLE_ACCESS: Record<string, Role[]> = {
  Dispatching: ['Dispatcher', 'Fleet Manager', 'Route Planner', 'Driver', 'Admin', 'Project Officer'],
  Events: ['Dispatcher', 'Fleet Manager', 'Compliance Officer', 'Driver', 'Admin', 'Project Officer'],
  Fleet: ['Fleet Manager', 'Maintenance Technician', 'Admin'],
  Maintenance: ['Maintenance Technician', 'Fleet Manager', 'Admin'],
  Compliance: ['Compliance Officer', 'Admin'],
  Workforce: ['Dispatcher', 'Fleet Manager', 'Warehouse Supervisor', 'Admin', 'Project Officer'],
  Routes: ['Route Planner', 'Dispatcher', 'Driver', 'Admin'],
  Response: ['Dispatcher', 'Warehouse Supervisor', 'Driver', 'Admin'],
  Complaints: ['Customer Support', 'Dispatcher', 'Admin'],
  Reports: ['Admin', 'Finance Officer', 'Compliance Officer', 'Fleet Manager'],
  Zones: ['Route Planner', 'Dispatcher', 'Admin'],
  Telematics: ['Fleet Manager', 'Dispatcher', 'Admin'],
  Audit: ['Admin', 'Compliance Officer', 'Finance Officer'],
  Inventory: ['Warehouse Supervisor', 'Maintenance Technician', 'Admin'],
  Contracts: ['Finance Officer', 'Admin'],
  'Quality Assurance': ['Compliance Officer', 'Admin'],
  Assets: ['Fleet Manager', 'Maintenance Technician', 'Warehouse Supervisor', 'Admin'],
}

export interface ProfileModuleAccessResult {
  status: 'full' | 'partial' | 'none'
  accessibleRoles: Role[]
  inaccessibleRoles: Role[]
}

/**
 * System channel permission map defining which notification channels are supported by each role.
 */
export const ROLE_CHANNEL_ACCESS: Record<Role, Channel[]> = {
  Dispatcher: ['toast', 'push', 'email', 'sms', 'whatsapp', 'inbox'],
  'Fleet Manager': ['toast', 'push', 'email', 'sms', 'whatsapp', 'inbox'],
  Admin: ['toast', 'push', 'email', 'sms', 'whatsapp', 'inbox'],
  Driver: ['toast', 'push', 'whatsapp', 'inbox'],
  'Maintenance Technician': ['toast', 'push', 'email', 'whatsapp', 'inbox'],
  'Compliance Officer': ['toast', 'push', 'email', 'inbox'],
  'Warehouse Supervisor': ['toast', 'push', 'email', 'whatsapp', 'inbox'],
  'Route Planner': ['toast', 'email', 'inbox'],
  'Customer Support': ['toast', 'push', 'email', 'whatsapp', 'inbox'],
  'Finance Officer': ['toast', 'email', 'inbox'],
  'Project Officer': ['toast', 'push', 'email', 'inbox'],
}

export interface ProfileChannelAccessResult {
  status: 'full' | 'partial' | 'none'
  accessibleRoles: Role[]
  inaccessibleRoles: Role[]
}

/**
 * Evaluates whether the roles within a notification profile have system access to a specific channel.
 */
export function getProfileChannelAccess(
  profile: NotificationProfile | undefined,
  channel: Channel
): ProfileChannelAccessResult {
  if (!profile || profile.roles.length === 0) {
    return { status: 'full', accessibleRoles: [], inaccessibleRoles: [] }
  }
  const accessibleRoles = profile.roles.filter((r) => ROLE_CHANNEL_ACCESS[r]?.includes(channel))
  const inaccessibleRoles = profile.roles.filter((r) => !ROLE_CHANNEL_ACCESS[r]?.includes(channel))

  let status: 'full' | 'partial' | 'none' = 'full'
  if (accessibleRoles.length === 0) {
    status = 'none'
  } else if (inaccessibleRoles.length > 0) {
    status = 'partial'
  }

  return { status, accessibleRoles, inaccessibleRoles }
}

/**
 * Evaluates whether the roles within a notification profile have system access to a specific module.
 */
export function getProfileModuleAccess(
  profile: NotificationProfile | undefined,
  moduleName: string
): ProfileModuleAccessResult {
  if (!profile || profile.roles.length === 0) {
    return { status: 'full', accessibleRoles: [], inaccessibleRoles: [] }
  }
  const allowedRoles = MODULE_ROLE_ACCESS[moduleName] || ROLES
  const accessibleRoles = profile.roles.filter((r) => allowedRoles.includes(r))
  const inaccessibleRoles = profile.roles.filter((r) => !allowedRoles.includes(r))

  let status: 'full' | 'partial' | 'none' = 'full'
  if (accessibleRoles.length === 0) {
    status = 'none'
  } else if (inaccessibleRoles.length > 0) {
    status = 'partial'
  }

  return { status, accessibleRoles, inaccessibleRoles }
}

/**
 * Gets the consolidated channel state for a given profile.
 * All roles within a profile share identical configuration in Page 2.
 */
export function getProfileChannelState(
  type: NotificationType,
  profile: NotificationProfile,
  channel: Channel
): boolean {
  if (type.mandatory) return true
  if (!profile || profile.roles.length === 0) return false
  const firstRole = profile.roles[0]
  if (firstRole && type.roleChannels[firstRole]) {
    return type.roleChannels[firstRole][channel] === true
  }
  return profile.roles.some((role) => type.roleChannels[role]?.[channel] === true)
}

/**
 * Updates a notification type's channels for all roles associated with a profile.
 */
export function updateProfileChannelState(
  type: NotificationType,
  profile: NotificationProfile,
  channel: Channel,
  value: boolean
): NotificationType {
  let updatedRoleChannels = { ...type.roleChannels }
  for (const role of profile.roles) {
    updatedRoleChannels = applyRoleChannelRules(updatedRoleChannels, role, channel, value)
  }
  return {
    ...type,
    roleChannels: updatedRoleChannels,
  }
}
