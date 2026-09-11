import type { LucideIcon } from 'lucide-react'
import {
  // group icons
  LayoutDashboard, ClipboardList, Boxes, Users, MapPin, Magnet, Handshake,
  // standalone module icons
  Globe, SlidersHorizontal, Ticket, Megaphone, Route, Target, FileText,
  FileCheck2, Building2, Contact, FileSpreadsheet, OctagonAlert,
  // Dashboards children
  Gauge, Activity, RadioTower, ClipboardCheck, Fuel, Cpu, UserRound, PieChart,
  // Plans Management children
  Sparkles, MonitorCheck, Zap, SearchCheck, Droplets, Waves, Droplet, PackageCheck,
  // Assets Management children
  Truck, Wrench, Trash2, Package, ScrollText, Router, CreditCard,
  // Workforces Management children
  UsersRound, CalendarCheck, CalendarClock,
  // Locations Management children
  Map, MapPinned, Building, Recycle,
} from 'lucide-react'

/** A clickable leaf module — either a standalone top-level module or a child inside a group. */
export interface ModuleLeaf {
  id: string
  label: string
  icon: LucideIcon
}

/** A collapsible group of modules — only referenced by the Home page's suite/card grouping. */
export interface ModuleGroup {
  type: 'group'
  id: string
  label: string
  icon: LucideIcon
  items: ModuleLeaf[]
}

/** A standalone top-level module (no children). */
export interface ModuleItem extends ModuleLeaf {
  type: 'item'
}

export type ModuleEntry = ModuleGroup | ModuleItem

/**
 * The full operations catalogue — kept grouped for the Home dashboard's suite
 * cards + category tags (`features/home/homeData.ts`). The unified primary rail
 * (`TadweerNavbar`) renders `FLAT_MODULES` instead, a curated flat list matched
 * to Figma order; both views are backed by the leaf data below. Icons are
 * lucide approximations of the Figma icon set. Labels reproduce the Figma text
 * verbatim, including its typos ("Managment", "Maintainance") so the surfaces
 * match the design source 1:1.
 */
export const MODULE_ENTRIES: ModuleEntry[] = [
  {
    type: 'group',
    id: 'dashboards',
    label: 'Dashboards',
    icon: LayoutDashboard,
    items: [
      { id: 'operational-dashboard', label: 'Operational Dashboard', icon: Gauge },
      { id: 'performance-dashboard', label: 'Performance Dashboard', icon: Activity },
      { id: 'telematics-dashboard', label: 'Telematics Dashboard', icon: RadioTower },
      { id: 'bin-compliance-dashboard', label: 'Station Compliance Dashboard', icon: ClipboardCheck },
      { id: 'fuel-monitoring-dashboard', label: 'Fuel Monitoring Dashboard', icon: Fuel },
      { id: 'hw-monitoring-dashboard', label: 'HW Monitoring Dashboard', icon: Cpu },
      { id: 'driver-behaviour-dashboard', label: 'Driver Behaviour Dashboard', icon: UserRound },
      { id: 'management-dashboard', label: 'Management Dashboard', icon: PieChart },
    ],
  },
  { type: 'item', id: 'live-monitoring', label: 'Live Monitoring', icon: Globe },
  {
    type: 'group',
    id: 'plans-management',
    label: 'Plans Management',
    icon: ClipboardList,
    items: [
      { id: 'smart-planning', label: 'Smart Planning', icon: Sparkles },
      { id: 'plan-monitoring', label: 'Plan Monitoring', icon: MonitorCheck },
      { id: 'adhoc-planning', label: 'Adhoc Planning', icon: Zap },
      { id: 'bin-inspection-plans', label: 'Station Inspection Plans', icon: SearchCheck },
      { id: 'bin-washing-plans', label: 'Sensor Calibration Plans', icon: Droplets },
      { id: 'deep-washing-plans', label: 'Deep Maintenance Plans', icon: Waves },
      { id: 'under-bin-washing-plans', label: 'Under-Station Maintenance Plans', icon: Droplet },
      { id: 'rmcc-collection-plans', label: 'RMCC Response Plans', icon: PackageCheck },
    ],
  },
  { type: 'item', id: 'operations-center', label: 'Operations Center', icon: SlidersHorizontal },
  { type: 'item', id: 'ticketing', label: 'Ticketing', icon: Ticket },
  { type: 'item', id: 'events', label: 'Events', icon: Megaphone },
  { type: 'item', id: 'trips', label: 'Trips', icon: Route },
  {
    type: 'group',
    id: 'assets-management',
    label: 'Assets Management',
    icon: Boxes,
    items: [
      { id: 'fleet-management', label: 'Fleet Management', icon: Truck },
      { id: 'preventive-maintenance', label: 'Preventive Maintainance', icon: Wrench },
      { id: 'bins-management', label: 'Stations Management', icon: Trash2 },
      { id: 'materials-inventory', label: 'Materials Inventory', icon: Package },
      { id: 'bins-work-orders', label: 'Station Work Orders', icon: ScrollText },
      { id: 'devices-management', label: 'Devices Management', icon: Router },
      { id: 'sims-management', label: 'SIMs Management', icon: CreditCard },
    ],
  },
  {
    type: 'group',
    id: 'workforces-management',
    label: 'Workforces Management',
    icon: Users,
    items: [
      { id: 'workforces', label: 'Workforce', icon: UsersRound },
      { id: 'attendance-logs', label: 'Attendance Logs', icon: CalendarCheck },
      { id: 'shift-scheduling', label: 'Shift Scheduling', icon: CalendarClock },
    ],
  },
  {
    type: 'group',
    id: 'locations-management',
    label: 'Locations Management',
    icon: MapPin,
    items: [
      { id: 'zones-management', label: 'Zones Management', icon: Map },
      { id: 'pois-management', label: 'POIs Management', icon: MapPinned },
      { id: 'service-locations-management', label: 'Service Locations Management', icon: Building },
      { id: 'rmcc-management', label: 'RMCC Management', icon: Recycle },
      { id: 'deep-washing-sites-management', label: 'Deep Maintenance Sites Management', icon: Waves },
    ],
  },
  { type: 'item', id: 'incidents', label: 'Requests & Complaints', icon: OctagonAlert },
  { type: 'item', id: 'inspections', label: 'Inspections', icon: ClipboardCheck },
  { type: 'item', id: 'kpi-library', label: 'KPI Library', icon: Target },
  { type: 'item', id: 'contracts', label: 'Contracts', icon: FileText },
  { type: 'item', id: 'service-requests', label: 'Service Requests', icon: FileCheck2 },
  { type: 'item', id: 'companies', label: 'Companies', icon: Building2 },
  { type: 'item', id: 'contacts', label: 'Contacts', icon: Contact },
  { type: 'item', id: 'reports', label: 'Reports', icon: FileSpreadsheet },
]

/**
 * The unified primary rail's flat modules list — Figma "Tadweer — Launch Pad"
 * node `5951:22516` (New Update Navbar). A curated, ORDERED subset of the
 * catalogue above; the new nav doesn't render accordions or every module.
 * Each entry reuses the same id/label/icon as its counterpart in the grouped
 * catalogue, so activation and routing stay aligned with `homeData.ts`.
 */
export const FLAT_MODULES: ModuleLeaf[] = [
  // CCMS-ESP
  { id: 'operational-dashboard', label: 'Operational Dashboard', icon: Gauge },
  { id: 'performance-dashboard', label: 'Performance Dashboard', icon: Activity },
  { id: 'telematics-dashboard', label: 'Telematics Dashboard', icon: RadioTower },
  { id: 'bin-compliance-dashboard', label: 'Station Compliance Dashboard', icon: ClipboardCheck },
  { id: 'fuel-monitoring-dashboard', label: 'Fuel Monitoring Dashboard', icon: Fuel },
  { id: 'hw-monitoring-dashboard', label: 'HW Monitoring Dashboard', icon: Cpu },
  { id: 'driver-behaviour-dashboard', label: 'Driver Behaviour Dashboard', icon: UserRound },
  { id: 'management-dashboard', label: 'Management Dashboard', icon: PieChart },
  { id: 'live-monitoring', label: 'Live Monitoring', icon: Globe },
  { id: 'operations-center', label: 'Operations Center', icon: SlidersHorizontal },
  { id: 'ticketing', label: 'Ticketing', icon: Ticket },
  { id: 'events', label: 'Events', icon: Megaphone },
  { id: 'trips', label: 'Trips', icon: Route },
  { id: 'incidents', label: 'Requests & Complaints', icon: OctagonAlert },
  { id: 'inspections', label: 'Inspections', icon: ClipboardCheck },
  // CCMS-Plans
  { id: 'smart-planning', label: 'Smart Planning', icon: Sparkles },
  { id: 'plan-monitoring', label: 'Plan Monitoring', icon: MonitorCheck },
  { id: 'adhoc-planning', label: 'Adhoc Planning', icon: Zap },
  { id: 'bin-inspection-plans', label: 'Bin Inspection Plans', icon: SearchCheck },
  { id: 'bin-washing-plans', label: 'Bin Washing Plans', icon: Droplets },
  { id: 'deep-washing-plans', label: 'Deep Washing Plans', icon: Waves },
  { id: 'under-bin-washing-plans', label: 'Under Bin Washing Plans', icon: Droplet },
  { id: 'rmcc-collection-plans', label: 'RMCC Collection Plans', icon: PackageCheck },
  // CCMS-Assets
  { id: 'fleet-management', label: 'Fleet Management', icon: Truck },
  { id: 'preventive-maintenance', label: 'Preventive Maintainance', icon: Wrench },
  { id: 'bins-management', label: 'Stations Management', icon: Trash2 },
  { id: 'materials-inventory', label: 'Materials Inventory', icon: Package },
  { id: 'bins-work-orders', label: 'Job Orders', icon: ScrollText },
  { id: 'devices-management', label: 'Devices Management', icon: Router },
  { id: 'sims-management', label: 'SIMs Management', icon: CreditCard },
  // CCMS-Workforce
  { id: 'workforces', label: 'Workforce', icon: UsersRound },
  { id: 'attendance-logs', label: 'Attendance Logs', icon: CalendarCheck },
  { id: 'shift-scheduling', label: 'Shift Scheduling', icon: CalendarClock },
  // CCMS-Locations
  { id: 'zones-management', label: 'Zones Management', icon: Map },
  { id: 'pois-management', label: 'Monitoring Stations Management', icon: MapPinned },
  { id: 'service-locations-management', label: 'Service Locations Management', icon: Building },
  { id: 'rmcc-management', label: 'RMCC Management', icon: Recycle },
  { id: 'deep-washing-sites-management', label: 'Deep Maintenance Sites Management', icon: Waves },
  // CCMS-Admin
  { id: 'kpi-library', label: 'KPI Library', icon: Target },
  { id: 'contracts', label: 'Contracts', icon: FileText },
  { id: 'service-requests', label: 'Service Requests', icon: FileCheck2 },
  { id: 'companies', label: 'Companies', icon: Building2 },
  { id: 'contacts', label: 'Contacts', icon: Contact },
  { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
  // CRM
  { id: 'leads', label: 'Leads', icon: Magnet },
  { id: 'deals', label: 'Deals', icon: Handshake },
  { id: 'crm-contacts', label: 'Contacts', icon: Users },
  { id: 'crm-companies', label: 'Companies', icon: Building2 },
  { id: 'products', label: 'Products', icon: Package },
  // IIMS - PO
  { id: 'iims-operational-dashboard', label: 'Operational Dashboard', icon: Gauge },
  { id: 'iims-performance-dashboard', label: 'Performance Dashboard', icon: Activity },
  { id: 'iims-inspections', label: 'Inspections', icon: ClipboardCheck },
  { id: 'iims-shift-scheduling', label: 'Shift Scheduling', icon: CalendarClock },
  { id: 'iims-incidents', label: 'Incidents', icon: OctagonAlert },
]

/** Fuel Monitoring is the module highlighted on first load — matches Figma's active row. */
export const DEFAULT_ACTIVE_MODULE = 'fuel-monitoring-dashboard'
