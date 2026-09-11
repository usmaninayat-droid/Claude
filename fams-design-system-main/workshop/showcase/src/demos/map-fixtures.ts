import type { MapHeatDatum, MapMarkerDatum, MapZoneDatum } from '@fams/v5-templates/map'

/** Sample fleet data for `MapPanelDemo` — a handful of vehicles/sites around
 *  a single depot, close enough together that toggling "Cluster" visibly
 *  groups them. */
export const sampleMarkers: MapMarkerDatum[] = [
  { id: 'truck-1', position: [55.2708, 25.2048], label: 'Truck AUH-4021' },
  { id: 'truck-2', position: [55.2745, 25.2015], color: '#12b76a', label: 'Truck AUH-4022' },
  { id: 'truck-3', position: [55.2681, 25.2072], color: '#f79009', label: 'Truck AUH-4023' },
  { id: 'site-1', position: [55.2802, 25.1988], label: 'Site 3' },
  { id: 'depot', position: [55.276, 25.2101], label: 'Depot' },
  { id: 'truck-4', position: [55.2721, 25.2033] },
  { id: 'truck-5', position: [55.2698, 25.2059] },
]

export const sampleZones: MapZoneDatum[] = [
  {
    id: 'zone-a',
    points: [
      [55.265, 25.195],
      [55.29, 25.195],
      [55.29, 25.215],
      [55.265, 25.215],
    ],
    label: 'Service Zone A',
  },
]

export const sampleHeat: MapHeatDatum[] = [
  { position: [55.2708, 25.2048], weight: 0.9 },
  { position: [55.2745, 25.2015], weight: 0.5 },
  { position: [55.2802, 25.1988], weight: 0.3 },
]
