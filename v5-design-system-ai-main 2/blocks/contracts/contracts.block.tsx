import * as React from 'react';
import type { ModuleConfig } from '@ds/components/app-shell';
import { ContractManagement } from '@ds/components/contracts';
import type { ContractCardData, ContractStat } from '@ds/components/contracts';
import { FileShield02, Users01, Truck01, Tool01, Trash01, Hash02, Building08, Grid01, File06, FileCheck02, Clock, File02, FileX02 } from '@ds/icons';

/**
 * Contract / Project Management BLOCK — the contracts a service operator runs
 * against (from the Tadweer ref, Figma node 2111-10733). View: a KPI stat row + a
 * grid of contract cards, each with identity chips + resource-fulfillment meters
 * (Workforce/Vehicles/Equipment/Bins) + a lifecycle status.
 *
 * DYNAMIC: contracts + stats are DATA — any project/contract domain adapts by
 * config. Default FAMS brand; status/meter colours are tokens. The 11-step create
 * wizard + the contract detail (compliance gauge + KPI tiles + timeline) + the KPI
 * raw-data sheet land in later passes (T-014).
 */

const chips = (ref: string, lot: string) => [
  { label: `# ${ref}`, icon: Hash02 }, { label: 'BEEAH', icon: Building08 }, { label: lot, icon: Grid01 },
];
const res = (wf: number, veh: number, eq: number, bins: number): ContractCardData['resources'] => [
  { label: 'Workforce', icon: Users01, value: wf, max: 120 },
  { label: 'Vehicles', icon: Truck01, value: veh, max: 120 },
  { label: 'Equipment', icon: Tool01, value: eq, max: 120 },
  { label: 'Bins', icon: Trash01, value: bins, max: 120 },
];

const CONTRACTS: ContractCardData[] = [
  { id: 'c1', name: 'Lot 1 — Abu Dhabi', status: 'ongoing', expiryLabel: 'Expires in 45 days', chips: chips('CRT769012', 'Lot 1'), resources: res(110, 95, 60, 118) },
  { id: 'c2', name: 'Lot 2 — Al Ain', status: 'ongoing', expiryLabel: 'Expires in 12 days', chips: chips('CRT769012', 'Lot 1'), resources: res(80, 40, 100, 120) },
  { id: 'c3', name: 'Lot 3 — Al Dhafra', status: 'ongoing', expiryLabel: 'Expires in 210 days', chips: chips('CRT769012', 'Lot 1'), resources: res(120, 115, 110, 119) },
  { id: 'c7', name: 'Lot 7 — Mussafah', status: 'ongoing', expiryLabel: 'Expires in 30 days', chips: chips('CRT769012', 'Lot 1'), resources: res(88, 72, 65, 100) },
  { id: 'c8', name: 'Lot 8 — Yas Island', status: 'expiring', expiryLabel: 'Expires in 18 days', chips: chips('CRT769012', 'Lot 1'), resources: res(60, 50, 40, 80) },
  { id: 'c9', name: 'Lot 9 — Saadiyat', status: 'ongoing', expiryLabel: 'Expires in 150 days', chips: chips('CRT769012', 'Lot 1'), resources: res(118, 120, 112, 120) },
  { id: 'c4', name: 'Lot 4 — Abu Dhabi City', status: 'expiring', expiryLabel: 'Expires in 8 days', chips: chips('CRT769012', 'Lot 1'), resources: res(70, 55, 45, 90) },
  { id: 'c5', name: 'Lot 5 — Western Region', status: 'draft', chips: chips('CRT769012', 'Lot 1'), resources: res(0, 0, 0, 0) },
];

// Explicit stats to match the design's summary row (not a partition of the cards shown).
const STATS: ContractStat[] = [
  { id: 'total', label: 'Total Contract', value: 10, icon: File06, tone: 'var(--primary)' },
  { id: 'active', label: 'Active', value: 8, icon: FileCheck02, tone: 'var(--status-success)' },
  { id: 'expiring', label: 'Expiring ≤ 120 Days', value: 2, icon: Clock, tone: 'var(--status-warning)' },
  { id: 'drafts', label: 'Drafts', value: 1, icon: File02, tone: 'var(--muted-foreground)' },
  { id: 'expired', label: 'Expired', value: 1, icon: FileX02, tone: 'var(--status-error)' },
];

function ContractManagementView() {
  return <ContractManagement contracts={CONTRACTS} stats={STATS} onCreateContract={() => {}} onOpenContract={() => {}} />;
}

export const contractsBlock: ModuleConfig = {
  id: 'contracts',
  type: 'dashboard',
  label: 'Contract Management',
  icon: FileShield02,
  tabKind: 'instance',
  defaultTabId: 'list',
  tabs: [
    { id: 'list', label: 'List View', icon: FileShield02, render: () => <ContractManagementView /> },
  ],
};
