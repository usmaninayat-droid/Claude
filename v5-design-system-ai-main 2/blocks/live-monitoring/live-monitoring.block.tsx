import type { ModuleConfig } from '@ds/components/app-shell';
import { Activity } from '@ds/icons';

/**
 * Live-monitoring BLOCK — a reusable map + fleet-list surface. A `live-monitoring`
 * module is config: a `ModuleConfig` with `type:'live-monitoring'` + a
 * `MonitoringModuleData` payload; the shell renders the DS `LiveMonitoringView`
 * (no bespoke screen). View tabs (Hybrid · List · Map), status-ring clustering +
 * eye toggle, the All-Filters facet panel, Zones/POIs side sheets and the
 * tracking popup are all built in — this block just supplies data.
 *
 * ADAPT: swap `entities` for the app's real records (id · position · status ·
 * statusLabel · facets · tags · the popup telemetry); set `filterFacets` to the
 * sections you want, `zones`/`pois` for the overlays, and `toDetail` to drill
 * into the entity's detail. Coordinates here are generic (Dubai). See the md.
 */

const STATUS = { reporting: '#12B76A', warning: '#F79009', stopped: '#D92D20' } as const;

export const liveMonitoringBlock: ModuleConfig = {
  id: 'live-monitoring',
  type: 'live-monitoring',
  label: 'Live Monitoring',
  icon: Activity,
  data: {
    center: [25.2048, 55.2708],
    zoom: 12,
    listTitle: 'tracked',
    liveBadge: { label: 'Live tracking' },
    legend: [
      { label: 'Reporting', color: STATUS.reporting },
      { label: 'Idle', color: STATUS.warning },
      { label: 'Stopped', color: STATUS.stopped },
    ],
    // Facet sections for the "All Filters" panel + tags + a saved preset.
    filterFacets: [
      { id: 'mobility', label: 'Mobility Status' },
      { id: 'group', label: 'Group' },
    ],
    filterTags: ['Zone A', 'Zone B'],
    savedFilters: [{ id: 'reporting', label: 'Reporting now', facets: { mobility: ['En route'] } }],
    entities: [
      { id: 'U-01', position: [25.225, 55.262], status: 'reporting', statusLabel: 'En route', assetType: 'car', title: 'Unit A1', subtitle: 'Zone A · en route', metric: '42 km/h', metricSub: '12s ago', mapLabel: 'A1', facets: { mobility: 'En route', group: 'Fleet' }, tags: ['Zone A'], alerts: 0, connections: 2, distanceKm: 46 },
      { id: 'U-02', position: [25.198, 55.281], status: 'warning', statusLabel: 'Idle', assetType: 'car', title: 'Unit A2', subtitle: 'Zone A · idling', metric: 'Idle', metricSub: '8 min ago', mapLabel: 'A2', facets: { mobility: 'Idle', group: 'Fleet' }, tags: ['Zone A'], alerts: 1, connections: 2, distanceKm: 0 },
      { id: 'U-03', position: [25.246, 55.296], status: 'reporting', statusLabel: 'En route', assetType: 'van', title: 'Unit B1', subtitle: 'Zone B · en route', metric: '38 km/h', metricSub: '5s ago', mapLabel: 'B1', facets: { mobility: 'En route', group: 'Logistics' }, tags: ['Zone B'], alerts: 0, connections: 2, distanceKm: 53 },
      { id: 'U-04', position: [25.179, 55.249], status: 'stopped', statusLabel: 'Stopped', assetType: 'van', title: 'Unit B2', subtitle: 'Zone B · parked', metric: 'Stopped', metricSub: '2 h ago', mapLabel: 'B2', facets: { mobility: 'Stopped', group: 'Logistics' }, tags: ['Zone B'], alerts: 0, connections: 0, distanceKm: 0 },
      { id: 'U-05', position: [25.262, 55.244], status: 'reporting', statusLabel: 'En route', assetType: 'car', title: 'Unit A3', subtitle: 'Zone A · en route', metric: '51 km/h', metricSub: '9s ago', mapLabel: 'A3', facets: { mobility: 'En route', group: 'Fleet' }, tags: ['Zone A'], alerts: 0, connections: 2, distanceKm: 61 },
    ],
    zones: [
      { id: 'z-a', name: 'Zone A', parent: 'North', color: '#12b76a', points: [[25.235, 55.255], [25.235, 55.275], [25.215, 55.275], [25.215, 55.255]] },
      { id: 'z-b', name: 'Zone B', parent: 'South', color: '#f79009', points: [[25.255, 55.285], [25.255, 55.305], [25.235, 55.305], [25.235, 55.285]] },
    ],
    pois: [
      { id: 'p-1', name: 'Central Depot', type: 'Depot', position: [25.252, 55.245] },
      { id: 'p-2', name: 'Fuel Station', type: 'Fuel', position: [25.198, 55.288], color: '#0072d6' },
    ],
  },
};
