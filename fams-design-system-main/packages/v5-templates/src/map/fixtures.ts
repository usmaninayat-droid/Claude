import { resolveToken } from './color'
import type { MapHeatDatum, MapMarkerDatum, MapZoneDatum } from './MapPanel.types'

/** Sample data shared by `MapPanel` tests + the workshop demo. One marker
 *  carries an explicit color to exercise the data-driven (business-supplied)
 *  color path — resolved via `resolveToken` (the `--color-success` token,
 *  same value `core.tokens.json` pins) rather than a bare hex literal, so
 *  this file (real source, not excluded from `lint:tokens`) stays
 *  hex-literal-free like every other file in `map/`. */
export const sampleMarkers: MapMarkerDatum[] = [
  { id: 'm1', position: [51.53, 25.29], label: 'Truck QAD-4021' },
  { id: 'm2', position: [51.54, 25.33], color: resolveToken('--color-success', '#12b76a'), label: 'Site 3' },
  { id: 'm3', position: [55.3, 25.19], label: 'Depot' },
  { id: 'm4', position: [51.531, 25.321] },
  { id: 'm5', position: [51.529, 25.319] },
]

export const sampleZones: MapZoneDatum[] = [
  {
    id: 'z1',
    points: [
      [55.2, 25.1],
      [55.32, 25.1],
      [55.32, 25.22],
      [55.2, 25.22],
    ],
    label: 'Zone A',
  },
]

export const sampleHeat: MapHeatDatum[] = [
  { position: [51.53, 25.29], weight: 0.8 },
  { position: [51.54, 25.33], weight: 0.4 },
]
