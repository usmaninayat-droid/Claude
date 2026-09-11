import { describe, expect, it } from 'vitest'
import type { EntityConfig } from '@fams/v5-composer'
import {
  colorKeyTotals,
  deriveRecordGeometry,
  fanOutCollisions,
  focusOf,
  hasRecordMap,
  pathLengthKm,
  recordMapConfig,
  toMapData,
  visibleOnMap,
} from './record-map-model'
import { parityConfigFixture, parityRecords, recordMapConfigFixture, recordMapRecords } from './fixtures'
import { dealsConfig } from '../fixtures'

describe('record-map-model — the lens switch', () => {
  it('is off for a blueprint with no record-geometry declaration', () => {
    expect(hasRecordMap(dealsConfig)).toBe(false)
  })

  it('is on the moment uiConfig.map.records exists', () => {
    expect(hasRecordMap(recordMapConfigFixture())).toBe(true)
  })
})

describe('record-map-model — colour keyed by CONFIG, never by name', () => {
  it('reads the colour column, its value→colour map and the legend order from uiConfig', () => {
    const meta = recordMapConfig(recordMapConfigFixture())
    expect(meta.colorCol).toBe('systemcol2')
    expect(meta.legendTitle).toBe('Priority')
    expect(meta.entries.map((e) => e.key)).toEqual(['High', 'Medium', 'Low'])
    expect(meta.entries[0].color).toBe('var(--color-destructive)')
  })

  it('paints each record from its own colour-key value', () => {
    const items = deriveRecordGeometry(recordMapConfigFixture(), recordMapRecords())
    const byId = new Map(items.map((i) => [i.id, i]))
    // D-101 Medium, D-103 High, D-102 Low — straight from the seed data.
    expect(byId.get('D-101')?.color).toBe('var(--color-warning)')
    expect(byId.get('D-103')?.color).toBe('var(--color-destructive)')
    expect(byId.get('D-102')?.color).toBe('var(--color-success)')
  })

  it('follows a DIFFERENT column and palette with zero code change (parity)', () => {
    const meta = recordMapConfig(parityConfigFixture())
    expect(meta.colorCol).toBe('systemcol1')
    expect(meta.entries.map((e) => e.key)).toEqual(['NEW', 'EXPANSION', 'RENEWAL'])
    const items = deriveRecordGeometry(parityConfigFixture(), parityRecords())
    expect(items.find((i) => i.id === 'D-101')?.color).toBe('var(--color-primary)')
  })

  it('falls back to the column listValues for a legend with no authored palette', () => {
    const config = recordMapConfigFixture()
    const bare = {
      ...config,
      uiConfig: {
        ...config.uiConfig,
        map: { ...config.uiConfig.map, records: { colorBy: { col: 'systemcol2' } } },
      },
    } as EntityConfig
    expect(recordMapConfig(bare).entries.map((e) => e.key)).toEqual(['High', 'Medium', 'Low'])
  })
})

describe('record-map-model — geometry is PER RECORD, never a mode', () => {
  const items = deriveRecordGeometry(recordMapConfigFixture(), recordMapRecords())
  const byId = new Map(items.map((i) => [i.id, i]))

  it('gives a coordinate-bound record a point and no polygon', () => {
    expect(byId.get('D-101')?.point).toEqual([55.271, 25.204])
    expect(byId.get('D-101')?.polygon).toBeUndefined()
  })

  it('gives a zone-bound record a polygon and no point', () => {
    expect(byId.get('D-102')?.point).toBeUndefined()
    expect(byId.get('D-102')?.polygon).toHaveLength(4)
  })

  it('renders a point record and a polygon record TOGETHER in one map payload', () => {
    const meta = recordMapConfig(recordMapConfigFixture())
    const { markers, zones } = toMapData(items, meta)
    expect(markers.map((m) => m.id)).toContain('D-101')
    expect(zones.map((z) => z.id)).toContain('D-102')
    // D-103 carries both and contributes to both channels simultaneously.
    expect(markers.map((m) => m.id)).toContain('D-103')
    expect(zones.map((z) => z.id)).toContain('D-103')
  })

  it('keeps records with no geometry in the list set (they must not vanish)', () => {
    expect(byId.get('D-105')).toBeDefined()
    expect(byId.get('D-105')?.point).toBeUndefined()
    expect(byId.get('D-105')?.polygon).toBeUndefined()
  })

  it('fans co-located pins onto a deterministic ring instead of one pile', () => {
    const fanned = fanOutCollisions(
      new Map([
        ['a', [55.31, 25.25] as [number, number]],
        ['b', [55.31, 25.25] as [number, number]],
      ]),
    )
    expect(fanned.get('a')).not.toEqual(fanned.get('b'))
    // Deterministic: same input, same output.
    const again = fanOutCollisions(
      new Map([
        ['a', [55.31, 25.25] as [number, number]],
        ['b', [55.31, 25.25] as [number, number]],
      ]),
    )
    expect(again.get('a')).toEqual(fanned.get('a'))
  })

  it('honours the authored fillOpacity/radius', () => {
    const meta = recordMapConfig(parityConfigFixture())
    const { markers, zones } = toMapData(deriveRecordGeometry(parityConfigFixture(), parityRecords()), meta)
    expect(markers[0].radius).toBe(11)
    expect(zones[0].fillOpacity).toBeCloseTo(0.3)
  })

  it('targets the camera at a pin, or at a polygon centroid when there is none', () => {
    expect(focusOf(byId.get('D-101'))).toEqual([55.271, 25.204])
    const centre = focusOf(byId.get('D-102'))
    expect(centre?.[0]).toBeCloseTo(55.27)
    expect(centre?.[1]).toBeCloseTo(25.21)
    expect(focusOf(byId.get('D-105'))).toBeNull()
  })
})

describe('record-map-model — legend filtering', () => {
  const config = recordMapConfigFixture()
  const items = deriveRecordGeometry(config, recordMapRecords()).filter((i) => i.point || i.polygon)
  const keyed = new Set(recordMapConfig(config).entries.map((e) => e.key))

  it('counts TOTALS per value, not filtered counts', () => {
    const totals = colorKeyTotals(deriveRecordGeometry(config, recordMapRecords()))
    expect(totals.get('High')).toBe(2)
    expect(totals.get('Medium')).toBe(3)
    expect(totals.get('Low')).toBe(1)
  })

  it('hides exactly the unchecked value', () => {
    const shown = visibleOnMap(items, {
      visibleKeys: ['Medium', 'Low'],
      keyed,
      hiddenIds: new Set(),
      filterable: true,
    })
    expect(shown.every((i) => i.colorKey !== 'High')).toBe(true)
    expect(shown.length).toBeGreaterThan(0)
  })

  it('allows unchecking ALL — the result is an intentional zero state', () => {
    const shown = visibleOnMap(items, { visibleKeys: [], keyed, hiddenIds: new Set(), filterable: true })
    expect(shown).toHaveLength(0)
  })

  it('filters nothing when the legend is a static key (filterable: false)', () => {
    const shown = visibleOnMap(items, { visibleKeys: [], keyed, hiddenIds: new Set(), filterable: false })
    expect(shown).toHaveLength(items.length)
  })

  it('drops an eye-hidden record from the map only', () => {
    const shown = visibleOnMap(items, {
      visibleKeys: ['High', 'Medium', 'Low'],
      keyed,
      hiddenIds: new Set(['D-101']),
      filterable: true,
    })
    expect(shown.map((i) => i.id)).not.toContain('D-101')
  })
})

describe('record-map-model — measure', () => {
  it('sums a measured path in kilometres', () => {
    expect(pathLengthKm([[55.2, 25.2]])).toBe(0)
    expect(pathLengthKm([
      [55.2, 25.2],
      [55.3, 25.2],
    ])).toBeGreaterThan(9)
  })
})
