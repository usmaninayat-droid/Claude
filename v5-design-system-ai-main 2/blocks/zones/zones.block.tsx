import type { ModuleConfig } from '@ds/components/app-shell';
import { ZonesView } from '@ds/components/zones';
import type { ZoneNode } from '@ds/components/zones';
import { Map01 } from '@ds/icons';

/**
 * Zones BLOCK — manage service zones as a HIERARCHY (zones contain sub-zones),
 * each a coloured polygon on a map. Hybrid View: a zone tree (expand/collapse,
 * colour dots, tags/location/description, per-zone map visibility) beside the DS
 * `MapView` of zone polygons, with Create New Zone + Upload KML. Backed by
 * `ZonesView`. See zones.block.md + kb 02-frames-pipelines/12-zones.md.
 *
 * DYNAMIC: `zones: ZoneNode[]` is a recursive tree — any area hierarchy adapts by
 * config. Brand = FAMS blue; zone colours are data. Create-New-Zone (draw + form)
 * and KML upload are follow-on side sheets.
 */

const C = ['#7A5AF8', '#12B76A', '#F79009', '#0072D6', '#F04438', '#06AED4'];

// Irregular polygons following real geography — no floating squares.
const ZONES: ZoneNode[] = [
  { id: 'z1', name: 'Region North', color: C[0], tags: ['Region', 'Priority'], location: 'North', description: 'Northern operations',
    points: [[25.302, 55.295], [25.305, 55.335], [25.288, 55.348], [25.258, 55.340], [25.236, 55.312], [25.232, 55.282], [25.252, 55.268], [25.282, 55.272]],
    children: [
      { id: 'z1a', name: 'District A', color: C[1], tags: ['District'], location: 'District A', description: 'Dense district',
        points: [[25.290, 55.300], [25.300, 55.322], [25.290, 55.342], [25.272, 55.336], [25.262, 55.320], [25.269, 55.303]] },
      { id: 'z1b', name: 'District B', color: C[2], tags: ['District'], location: 'District B', description: 'Mixed use',
        points: [[25.270, 55.286], [25.263, 55.301], [25.250, 55.306], [25.239, 55.297], [25.238, 55.283], [25.250, 55.276], [25.262, 55.278]],
        children: [{ id: 'z1b1', name: 'Sector 1', color: C[3], tags: ['Sector'], location: 'Sector 1', description: 'Core',
          points: [[25.262, 55.294], [25.259, 55.302], [25.251, 55.303], [25.249, 55.296], [25.254, 55.291]] }] },
    ] },
  { id: 'z2', name: 'Region South', color: C[4], tags: ['Region'], location: 'South', description: 'Southern operations',
    points: [[25.100, 55.128], [25.105, 55.158], [25.030, 55.135], [24.985, 55.090], [25.010, 55.048], [25.055, 55.070]] },
  { id: 'z3', name: 'Downtown', color: C[5], tags: ['District', 'Commercial'], location: 'Downtown', description: 'Central business district',
    points: [[25.206, 55.268], [25.210, 55.282], [25.199, 55.290], [25.187, 55.285], [25.185, 55.271], [25.194, 55.263]] },
];

export const zonesBlock: ModuleConfig = {
  id: 'zones',
  type: 'dashboard',
  label: 'Zones',
  icon: Map01,
  tabKind: 'instance',
  defaultTabId: 'hybrid',
  tabs: [
    { id: 'hybrid', label: 'Hybrid View', icon: Map01, render: () => <ZonesView zones={ZONES} center={[25.18, 55.28]} zoom={11} /> },
    { id: 'list', label: 'List View', icon: Map01, render: () => <ZonesView zones={ZONES} center={[25.18, 55.28]} zoom={11} /> },
    { id: 'map', label: 'Map View', icon: Map01, render: () => <ZonesView zones={ZONES} center={[25.18, 55.28]} zoom={11} /> },
  ],
};
