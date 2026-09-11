import {
  Tag, UserCog, AppWindow, ListChecks, Workflow, AlertTriangle, Blocks, Bell,
  PieChart, Palette, CreditCard, Users, Building2, Building, User, BellRing, Cpu,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface SettingsNavItemDef {
  id: string
  label: string
  icon: LucideIcon
}

export interface SettingsNavSectionDef {
  label: string
  items: SettingsNavItemDef[]
}

// Matches the Figma "Secondary-nav" (file W2z46FvC6aOdzOHDc3rqD5, node 5399:44823) —
// only 'notifications-configuration' is wired to real content; the rest render ComingSoonPanel.
export const SETTINGS_SECTIONS: SettingsNavSectionDef[] = [
  {
    label: 'Platform Settings',
    items: [
      { id: 'tags-categories', label: 'Tags & Categories', icon: Tag },
      { id: 'roles-management', label: 'Roles Management', icon: UserCog },
      { id: 'application-management', label: 'Application Management', icon: AppWindow },
      { id: 'task-type-management', label: 'Task Type Management', icon: ListChecks },
      { id: 'pipeline-configuration', label: 'Pipeline Configuration', icon: Workflow },
      { id: 'event-configuration', label: 'Event Configuration', icon: AlertTriangle },
      { id: 'module-management', label: 'Module Management', icon: Blocks },
      { id: 'notifications-configuration', label: 'Notifications Configuration', icon: Bell },
      { id: 'notifications-configuration-2', label: 'Notification Configuration 2', icon: Bell },
      { id: 'device-config', label: 'Telematics Features Config', icon: Cpu },
      { id: 'widget-management', label: 'Widget Management', icon: PieChart },
      { id: 'appearance', label: 'Appearance', icon: Palette },
      { id: 'billing-license', label: 'Billing & License', icon: CreditCard },
    ],
  },
  {
    label: 'Organization Settings',
    items: [
      { id: 'user-accounts', label: 'User Accounts', icon: Users },
      { id: 'organization-settings', label: 'Organization Settings', icon: Building2 },
      { id: 'sub-organization', label: 'Sub-Organization', icon: Building },
    ],
  },
  {
    label: 'My Settings',
    items: [
      { id: 'user-profile', label: 'User Profile', icon: User },
      { id: 'my-notification-preferences', label: 'My Notification Preferences', icon: BellRing },
    ],
  },
]
