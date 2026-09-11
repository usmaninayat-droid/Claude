import type { LatLng, MapMarker } from '../../components/map';
import type { PipelineCardModel, InboxModuleData } from '../../components/app-shell';

/**
 * Trimmed sample data for the two demo apps shown on the Architecture page.
 * Workshop data is adapted from the Truemax mock-data shape; Sales data is a
 * deliberately different domain to prove the same kit composes both.
 */

/* ════════════════════════════════ WORKSHOP ════════════════════════════════ */

export interface Asset {
  id: string;
  name: string;
  category: string;
  plant: string;
  criticality: 'Critical' | 'Medium' | 'Low';
  status: 'Active' | 'Inactive' | 'Under Maintenance';
  hours: number;
  position: LatLng;
}

export const ASSETS: Asset[] = [
  { id: 'EQ-001', name: 'Boom Pump BP-36Z', category: 'Boom Pump', plant: 'Main Plant 1', criticality: 'Critical', status: 'Active', hours: 4120, position: [24.466, 54.366] },
  { id: 'EQ-003', name: 'Batching Plant BP-180', category: 'Batching Plant', plant: 'Main Plant 1', criticality: 'Critical', status: 'Active', hours: 8100, position: [24.452, 54.392] },
  { id: 'EQ-005', name: 'Mixer Truck MT-10A', category: 'Mixer Truck', plant: 'Main Plant 1', criticality: 'Critical', status: 'Active', hours: 6200, position: [24.49, 54.41] },
  { id: 'EQ-008', name: 'Truck Crane TC-50', category: 'Truck-Mounted Crane', plant: 'Main Plant 2', criticality: 'Critical', status: 'Active', hours: 5900, position: [24.43, 54.35] },
  { id: 'EQ-009', name: 'Service Truck ST-05', category: 'Mobile Service Truck', plant: 'Main Plant 1', criticality: 'Medium', status: 'Under Maintenance', hours: 3800, position: [24.475, 54.38] },
  { id: 'EQ-010', name: 'Impact Crusher PF-1315', category: 'PF Impact Crusher', plant: 'Main Plant 2', criticality: 'Critical', status: 'Active', hours: 6800, position: [24.44, 54.40] },
  { id: 'EQ-012', name: 'Sand Maker VSI-8518', category: 'Sand Making Machine', plant: 'Main Plant 2', criticality: 'Medium', status: 'Active', hours: 4400, position: [24.41, 54.37] },
  { id: 'EQ-014', name: 'Belt Conveyer BC-1200', category: 'Belt Conveyer', plant: 'Main Plant 2', criticality: 'Low', status: 'Inactive', hours: 1200, position: [24.46, 54.42] },
];

export const ASSET_CENTER: LatLng = [24.455, 54.385];

export const ASSET_MARKERS: MapMarker[] = ASSETS.map((a) => ({
  id: a.id,
  position: a.position,
  status:
    a.status === 'Under Maintenance' ? 'warning' : a.status === 'Inactive' ? 'stopped' : 'reporting',
  tooltip: a.name,
}));

export interface WorkOrder extends PipelineCardModel {
  asset: string;
}

const AV = {
  Z: { letter: 'Z', color: '#f12cc6' },
  K: { letter: 'K', color: '#0072d6' },
  G: { letter: 'G', color: '#279aff' },
  M: { letter: 'M', color: '#2aaa48' },
  A: { letter: 'A', color: '#ab47bc' },
};

export const WORK_ORDERS: WorkOrder[] = [
  { id: 'WO-100001', stageId: 'new', ticketId: 'WO-100001', title: 'Boom Hydraulic Service — BP-36Z', type: 'PREVENTIVE', priority: 'High', asset: 'Boom Pump BP-36Z', dateLabel: '20 Feb, 2026', isUnassigned: true },
  { id: 'WO-100004', stageId: 'new', ticketId: 'WO-100004', title: 'Excavator Service — ST-05', type: 'PREVENTIVE', priority: 'High', asset: 'Service Truck ST-05', dateLabel: '19 Feb, 2026', isUnassigned: true },
  { id: 'WO-100006', stageId: 'scheduled', ticketId: 'WO-100006', title: 'Mixer Drum Service — MT-10A', type: 'PREVENTIVE', priority: 'High', asset: 'Mixer Truck MT-10A', dateLabel: '19 Feb, 2026', assignedAvatar: AV.Z },
  { id: 'WO-100007', stageId: 'scheduled', ticketId: 'WO-100007', title: 'Hydraulic Hose Replace — Crusher', type: 'CORRECTIVE', priority: 'High', asset: 'Impact Crusher PF-1315', dateLabel: '19 Feb, 2026', assignedAvatar: AV.G },
  { id: 'WO-100011', stageId: 'in-progress', ticketId: 'WO-100011', title: 'Breakdown Repair — Line Pump', type: 'CORRECTIVE', priority: 'High', asset: 'Boom Pump BP-36Z', dateLabel: '17 Feb, 2026', isOverdue: true, downtimeEnabled: true, downtimeStart: '15 Feb, 2026 14:30', assignedAvatar: AV.G },
  { id: 'WO-100013', stageId: 'in-progress', ticketId: 'WO-100013', title: 'Crusher Liner Service', type: 'PREVENTIVE', priority: 'Medium', asset: 'Impact Crusher PF-1315', dateLabel: '19 Feb, 2026', assignedAvatar: AV.M },
  { id: 'WO-100016', stageId: 'inspection', ticketId: 'WO-100016', title: 'Crane Track Adjust — TC-50', type: 'PREVENTIVE', priority: 'Medium', asset: 'Truck Crane TC-50', dateLabel: '13 Feb, 2026', assignedAvatar: AV.A },
  { id: 'WO-100021', stageId: 'closed', ticketId: 'WO-100021', title: 'Piston Replace — Batching Plant', type: 'CORRECTIVE', priority: 'High', asset: 'Batching Plant BP-180', dateLabel: '01 Feb, 2026', assignedAvatar: AV.K },
];

export const WO_STAGES = [
  { id: 'new', label: 'New Requests', color: '#f79009' },
  { id: 'scheduled', label: 'Scheduled', color: '#f12cc6' },
  { id: 'in-progress', label: 'In Progress', color: '#0072d6' },
  { id: 'inspection', label: 'Under Inspection', color: '#ab47bc' },
  { id: 'closed', label: 'Closed', color: '#2aaa48' },
];

export interface Part {
  id: string;
  name: string;
  sku: string;
  category: string;
  onHand: number;
  reorder: number;
}

export const INVENTORY: Part[] = [
  { id: 'P-1001', name: 'Hydraulic Filter HF-200', sku: 'HF-200', category: 'Filters', onHand: 42, reorder: 20 },
  { id: 'P-1002', name: 'ISO 46 Hydraulic Oil (20L)', sku: 'OIL-46', category: 'Fluids', onHand: 8, reorder: 15 },
  { id: 'P-1003', name: 'Mixer Drum Blade Set', sku: 'BLD-300', category: 'Wear Parts', onHand: 3, reorder: 4 },
  { id: 'P-1004', name: 'S-Valve Wear Plate', sku: 'SVP-15', category: 'Wear Parts', onHand: 6, reorder: 5 },
  { id: 'P-1005', name: 'Crusher Jaw Plate', sku: 'JAW-900', category: 'Wear Parts', onHand: 2, reorder: 3 },
  { id: 'P-1006', name: 'Wire Rope 16mm (per m)', sku: 'WR-16', category: 'Rigging', onHand: 120, reorder: 50 },
];

export const WORKSHOP_NOTIFICATIONS: InboxModuleData['notifications'] = [
  { id: 'n1', title: 'WO-100011 is overdue', description: 'Breakdown Repair — Line Pump passed its due date.', source: 'Maintenance', severity: 'error', timestamp: '2h ago', unread: true },
  { id: 'n2', title: 'Low stock: ISO 46 Hydraulic Oil', description: '8 on hand, below reorder point of 15.', source: 'Inventory', severity: 'warning', timestamp: '5h ago', unread: true },
  { id: 'n3', title: 'Preventive WO auto-generated', description: 'Sand Maker VSI-8518 reached its service interval.', source: 'Maintenance', severity: 'info', timestamp: 'Yesterday' },
  { id: 'n4', title: 'Crane load test passed', description: 'TC-50 certified to 12.5 tons.', source: 'Assets', severity: 'success', timestamp: '2 days ago' },
];

/* ════════════════════════════════ SALES ════════════════════════════════ */

export interface Company {
  id: string;
  name: string;
  industry: string;
  owner: string;
  arr: string;
  status: 'Customer' | 'Prospect' | 'Churned';
}

export const COMPANIES: Company[] = [
  { id: 'C-01', name: 'Northwind Traders', industry: 'Logistics', owner: 'Dana Reyes', arr: '$120k', status: 'Customer' },
  { id: 'C-02', name: 'Globex Corp', industry: 'Manufacturing', owner: 'Sam Patel', arr: '$0', status: 'Prospect' },
  { id: 'C-03', name: 'Initech', industry: 'Software', owner: 'Dana Reyes', arr: '$64k', status: 'Customer' },
  { id: 'C-04', name: 'Soylent Inc', industry: 'Food & Bev', owner: 'Mia Chen', arr: '$0', status: 'Prospect' },
  { id: 'C-05', name: 'Hooli', industry: 'Technology', owner: 'Sam Patel', arr: '$210k', status: 'Customer' },
  { id: 'C-06', name: 'Vehement Capital', industry: 'Finance', owner: 'Mia Chen', arr: '$0', status: 'Churned' },
];

export interface Deal extends PipelineCardModel {
  company: string;
}

const SALES_AV = {
  D: { letter: 'D', color: '#16a34a' },
  S: { letter: 'S', color: '#0072d6' },
  M: { letter: 'M', color: '#ab47bc' },
};

export const DEALS: Deal[] = [
  { id: 'D-101', stageId: 'lead', ticketId: 'D-101', title: 'Globex — Platform pilot', type: 'NEW', priority: 'Medium', company: 'Globex Corp', dateLabel: '28 Feb', assignedAvatar: SALES_AV.S },
  { id: 'D-102', stageId: 'lead', ticketId: 'D-102', title: 'Soylent — Annual plan', type: 'NEW', priority: 'Low', company: 'Soylent Inc', dateLabel: '02 Mar', isUnassigned: true },
  { id: 'D-103', stageId: 'qualified', ticketId: 'D-103', title: 'Initech — Seat expansion', type: 'EXPANSION', priority: 'High', company: 'Initech', dateLabel: '24 Feb', assignedAvatar: SALES_AV.D },
  { id: 'D-104', stageId: 'proposal', ticketId: 'D-104', title: 'Hooli — Enterprise rollout', type: 'NEW', priority: 'High', company: 'Hooli', dateLabel: '20 Feb', assignedAvatar: SALES_AV.S },
  { id: 'D-105', stageId: 'proposal', ticketId: 'D-105', title: 'Northwind — Add-on modules', type: 'EXPANSION', priority: 'Medium', company: 'Northwind Traders', dateLabel: '21 Feb', assignedAvatar: SALES_AV.M },
  { id: 'D-106', stageId: 'won', ticketId: 'D-106', title: 'Northwind — Renewal', type: 'RENEWAL', priority: 'Medium', company: 'Northwind Traders', dateLabel: '10 Feb', assignedAvatar: SALES_AV.D },
];

export const DEAL_STAGES = [
  { id: 'lead', label: 'Lead', color: '#94a3b8' },
  { id: 'qualified', label: 'Qualified', color: '#0072d6' },
  { id: 'proposal', label: 'Proposal', color: '#f79009' },
  { id: 'won', label: 'Won', color: '#16a34a' },
  { id: 'lost', label: 'Lost', color: '#f04438' },
];

export const SALES_NOTIFICATIONS: InboxModuleData['notifications'] = [
  { id: 's1', title: 'Deal won: Northwind Renewal', description: '$120k ARR renewed for another year.', source: 'Deals', severity: 'success', timestamp: '1h ago', unread: true },
  { id: 's2', title: 'Hooli proposal viewed', description: 'The Enterprise rollout proposal was opened 3 times today.', source: 'Deals', severity: 'info', timestamp: '3h ago', unread: true },
  { id: 's3', title: 'Vehement Capital churned', description: 'Account marked as churned — schedule a win-back.', source: 'Companies', severity: 'warning', timestamp: 'Yesterday' },
];
