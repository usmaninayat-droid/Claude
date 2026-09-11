import { describe, expect, it } from 'vitest'
import {
  createAssetsSearchProvider,
  createDefaultSearchProviders,
  createPlacesSearchProvider,
  createPoisSearchProvider,
  createShortcutsSearchProvider,
  createZonesSearchProvider,
} from './search-providers'
import type { LiveMapPlace, LivePoiDatum, LiveVehicleDatum, LiveZoneDatum } from '../live-types'

const PLACES: LiveMapPlace[] = [
  { id: 'p1', name: 'North Terminal', position: [55.1, 25.1], category: 'Terminal' },
  { id: 'p2', name: 'South Yard', position: [55.3, 25.3], category: 'Yard' },
]
const ZONES: LiveZoneDatum[] = [
  { id: 'z1', points: [[55.0, 25.0], [55.1, 25.0], [55.1, 25.1]], label: 'AUH EXIT 3', tags: ['Parked Zone', 'North'] },
  { id: 'z2', points: [[55.4, 25.4], [55.5, 25.4], [55.5, 25.5]], label: 'Road Alain' },
]
const POIS: LivePoiDatum[] = [
  { id: 'poi1', name: 'Lusail Fuel Point', position: [51.49, 25.43], color: '#F79009', tags: ['fuel', 'rest-stop'] },
]
const VEHICLES: LiveVehicleDatum[] = [
  { id: 'v1', position: [55.2, 25.2], status: 'moving', plate: '6-9415', name: 'Truck A' },
  { id: 'v2', position: [55.6, 25.6], status: 'idling', plate: 'V 38703' },
]

describe('search-providers — the default MapSearchProvider set (map-features-video-analysis.md §1)', () => {
  it('places provider matches name/category, title + subtitle', async () => {
    const results = await createPlacesSearchProvider(PLACES).search('north')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ kind: 'place', title: 'North Terminal', subtitle: 'Terminal', position: [55.1, 25.1] })
  })

  it('zones provider matches label/tags and falls back to a "Parked Zone" chip when untagged', async () => {
    const tagged = await createZonesSearchProvider(ZONES).search('AUH')
    expect(tagged[0].chips).toEqual(['Parked Zone', 'North'])
    const untagged = await createZonesSearchProvider(ZONES).search('Road Alain')
    expect(untagged[0].chips).toEqual(['Parked Zone'])
  })

  it('assets provider matches plate/name, title is the plate (or name as fallback)', async () => {
    const byPlate = await createAssetsSearchProvider(VEHICLES).search('6-9415')
    expect(byPlate[0]).toMatchObject({ kind: 'asset', title: '6-9415', subtitle: 'Truck A' })
    const byId = await createAssetsSearchProvider(VEHICLES).search('v2')
    expect(byId[0].title).toBe('V 38703')
  })

  it('shortcuts provider matches title/chips and wires onActivate', async () => {
    const onActivate = () => undefined
    const results = await createShortcutsSearchProvider([{ id: 's1', title: 'Fleet Tools', chips: ['Dashboard', 'Assets'], onActivate }]).search(
      'dashboard',
    )
    expect(results).toHaveLength(1)
    expect(results[0].onActivate).toBe(onActivate)
  })

  it('an empty query matches everything (no query yet == show all)', async () => {
    const results = await createPlacesSearchProvider(PLACES).search('')
    expect(results).toHaveLength(2)
  })

  it('createDefaultSearchProviders only includes providers for data actually supplied', () => {
    expect(createDefaultSearchProviders({})).toHaveLength(0)
    expect(createDefaultSearchProviders({ places: PLACES }).map((p) => p.id)).toEqual(['places'])
    expect(createDefaultSearchProviders({ places: PLACES, vehicles: VEHICLES }).map((p) => p.id)).toEqual(['places', 'assets'])
    expect(createDefaultSearchProviders({ places: PLACES, pois: POIS, vehicles: VEHICLES }).map((p) => p.id)).toEqual([
      'places',
      'pois',
      'assets',
    ])
  })

  it('a place prefers its authored address over the grouping category for the subtitle', async () => {
    const withAddress = await createPlacesSearchProvider([
      { id: 'p3', name: 'Lusail', position: [51.4919, 25.4283], category: 'District', address: 'Lusail City, Al Daayen Municipality, Qatar' },
    ]).search('lusail')
    expect(withAddress[0].subtitle).toBe('Lusail City, Al Daayen Municipality, Qatar')
  })

  it('a zone carries its colour swatch, ring and fit-bounds so a selection frames the geofence', async () => {
    const [zone] = await createZonesSearchProvider([
      { id: 'z3', points: [[51.4, 25.4], [51.6, 25.4], [51.6, 25.5], [51.4, 25.5]], label: 'Lusail', color: '#F04438', tags: ['customer-site'] },
    ]).search('lusail')
    expect(zone.swatchColor).toBe('#F04438')
    expect(zone.chips).toEqual(['Customer Site'])
    expect(zone.bounds).toEqual([
      [51.4, 25.4],
      [51.6, 25.5],
    ])
    expect(zone.polygon).toHaveLength(4)
  })

  it('pois provider matches name/tags and renders as its own row kind', async () => {
    const byTag = await createPoisSearchProvider(POIS).search('fuel')
    expect(byTag[0]).toMatchObject({ kind: 'poi', title: 'Lusail Fuel Point', swatchColor: '#F79009' })
    expect(byTag[0].chips).toEqual(['Fuel', 'Rest Stop'])
    expect(await createPoisSearchProvider(POIS).search('lusail')).toHaveLength(1)
  })
})
