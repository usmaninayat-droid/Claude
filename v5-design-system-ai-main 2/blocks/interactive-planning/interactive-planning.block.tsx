import * as React from 'react';
import type { ModuleConfig } from '@ds/components/app-shell';
import { InteractivePlanning } from '@ds/components/planning';
import type { PlanRow, PlanZone, PlanBin } from '@ds/components/planning';
import { Map01 } from '@ds/icons';

/**
 * Interactive Planning BLOCK — a Smart-City service-planning surface (Tadweer
 * "Interactive Planning" module). The home **Hybrid View**: a plan table (service
 * type · waste type · vehicle · status, per-row map visibility) beside a coverage
 * map (zone polygons + planned/unplanned bins). Backed by the DS
 * `InteractivePlanning` component — no bespoke screen.
 *
 * DYNAMIC: `plans` / `zones` / `bins` / `statusStyles` / `wasteStyles` / `labels`
 * are all data, so any planned service (bin collection, street sweeping, tankering,
 * grounds upkeep) adapts by config. Brand = FAMS blue chrome; green/amber/red are
 * genuine status (plan status, planned vs unplanned bins, waste type).
 *
 * Follow-ons (in the module spec, build next): the **Create New Plan** wizard
 * (Basic Setup → Planning Mode map → Summary) and the Planning-Mode draw/route
 * tools. See interactive-planning.block.md + kb 02-frames-pipelines/09-*.
 */

const PLATES = ['V 9876', 'R 5432', 'B 8765', 'N 2345', 'C 6543', 'X 7890', 'M 3456', 'L 0987', 'P 4321', 'Q 1010', 'W 2020', 'S 3030', 'D 4040', 'F 5050', 'G 6060'];
const WASTE = ['General', 'Recyclable', 'General', 'Recyclable', 'General', 'Recyclable', 'Recyclable', 'General', 'Recyclable', 'General', 'Recyclable', 'General', 'Recyclable', 'Recyclable', 'Non Recyclable'];
const PLANS: PlanRow[] = PLATES.map((plate, i) => ({
  id: `plan-${i}`, serviceType: 'Bin Collection', wasteType: WASTE[i], vehicle: plate,
  status: i < 10 ? 'DRAFTED' : 'APPROVED', visible: i < 4,
}));

const ZONES: PlanZone[] = [
  { id: 'z1', name: 'Khalifa City', points: [[24.44, 54.57], [24.44, 54.63], [24.40, 54.63], [24.40, 54.57]] },
  { id: 'z2', name: 'Musaffah', points: [[24.36, 54.48], [24.36, 54.53], [24.32, 54.53], [24.32, 54.48]] },
  { id: 'z3', name: 'Mohamed Bin Zayed City', points: [[24.42, 54.55], [24.43, 54.60], [24.38, 54.61], [24.38, 54.55]] },
];
const BINS: PlanBin[] = Array.from({ length: 60 }, (_, i) => ({
  id: `bin-${i}`, position: [24.32 + (i % 8) * 0.018, 54.48 + Math.floor(i / 8) * 0.021] as [number, number], planned: i % 3 !== 0,
}));

function HybridView() {
  const [plans, setPlans] = React.useState<PlanRow[]>(PLANS);
  return (
    <InteractivePlanning
      plans={plans} zones={ZONES} bins={BINS} center={[24.42, 54.55]} zoom={11}
      onToggleVisible={(id, v) => setPlans((cur) => cur.map((p) => (p.id === id ? { ...p, visible: v } : p)))}
    />
  );
}

export const interactivePlanningBlock: ModuleConfig = {
  id: 'interactive-planning',
  type: 'dashboard',
  label: 'Interactive Planning',
  icon: Map01,
  tabKind: 'instance',
  defaultTabId: 'planning',
  tabs: [
    { id: 'planning', label: 'Interactive Planning', icon: Map01, render: () => <HybridView /> },
    { id: 'hybrid', label: 'Hybrid View', icon: Map01, render: () => <HybridView /> },
  ],
};
