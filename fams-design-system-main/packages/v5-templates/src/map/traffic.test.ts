import { describe, expect, it } from 'vitest'
import {
  TRAFFIC_LEVELS,
  buildTrafficFeatureCollection,
  congestionFor,
  hashSeed,
  isTrafficRoad,
  levelForCongestion,
  trafficLevelFor,
  trafficPalette,
  trafficSegmentKey,
  type TrafficSourceFeature,
} from './traffic'
import {
  findRoadSources,
  firstSymbolLayerId,
  trafficColorExpression,
  trafficLayerSpec,
  trafficWidthExpression,
  TRAFFIC_LAYER_ID,
  TRAFFIC_SOURCE_ID,
} from './traffic-layer'

const road = (id: string | number | undefined, klass: string, coords: [number, number][]): TrafficSourceFeature => ({
  id,
  properties: { class: klass },
  geometry: { type: 'LineString', coordinates: coords },
})

describe('traffic seeding', () => {
  it('hashes deterministically', () => {
    expect(hashSeed('motorway#42')).toBe(hashSeed('motorway#42'))
    expect(hashSeed('motorway#42')).not.toBe(hashSeed('motorway#43'))
  })

  it('congestion stays in [0,1)', () => {
    for (let i = 0; i < 500; i++) {
      const value = congestionFor(`primary#${i}`)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('maps congestion onto the four ordinal levels', () => {
    expect(levelForCongestion(0)).toBe('free')
    expect(levelForCongestion(0.6)).toBe('slow')
    expect(levelForCongestion(0.8)).toBe('heavy')
    expect(levelForCongestion(0.99)).toBe('stopped')
  })

  it('spreads all four levels across a realistic road set', () => {
    const seen = new Set(Array.from({ length: 400 }, (_, i) => trafficLevelFor(`trunk#${i}`)))
    for (const level of TRAFFIC_LEVELS) expect(seen.has(level)).toBe(true)
  })

  it('keys a segment by its feature id when it has one', () => {
    expect(trafficSegmentKey(road(7, 'motorway', [[0, 0], [1, 1]]))).toBe('motorway#7')
  })

  it('falls back to rounded endpoints when the tile carries no id', () => {
    const a = trafficSegmentKey(road(undefined, 'primary', [[51.5, 25.3], [51.6, 25.4]]))
    const b = trafficSegmentKey(road(undefined, 'primary', [[51.5, 25.3], [51.6, 25.4]]))
    expect(a).toBe(b)
    expect(a).toContain('primary@')
  })
})

describe('buildTrafficFeatureCollection', () => {
  it('keeps only major road lines', () => {
    const fc = buildTrafficFeatureCollection([
      road(1, 'motorway', [[0, 0], [1, 1]]),
      road(2, 'residential', [[0, 0], [1, 1]]),
      road(3, 'service', [[0, 0], [1, 1]]),
      road(4, 'secondary', [[2, 2], [3, 3]]),
    ])
    expect(fc.features).toHaveLength(2)
    expect(fc.features.map((f) => f.properties.klass)).toEqual(['motorway', 'secondary'])
  })

  it('rejects non-line geometry', () => {
    expect(isTrafficRoad({ properties: { class: 'motorway' }, geometry: { type: 'Point', coordinates: [0, 0] } })).toBe(false)
  })

  it('is stable across repeated queries — the no-flicker contract', () => {
    const input = [road(11, 'motorway', [[0, 0], [1, 1]]), road(12, 'trunk', [[1, 1], [2, 2]])]
    const first = buildTrafficFeatureCollection(input)
    const second = buildTrafficFeatureCollection([...input].reverse())
    const levelOf = (fc: typeof first, klass: string) => fc.features.find((f) => f.properties.klass === klass)?.properties.level
    expect(levelOf(second, 'motorway')).toBe(levelOf(first, 'motorway'))
    expect(levelOf(second, 'trunk')).toBe(levelOf(first, 'trunk'))
  })

  it('de-duplicates identical tile fragments', () => {
    const fragment = road(21, 'primary', [[0, 0], [1, 1]])
    expect(buildTrafficFeatureCollection([fragment, { ...fragment }]).features).toHaveLength(1)
  })
})

describe('trafficPalette', () => {
  it('resolves one colour per level, all distinct', () => {
    const palette = trafficPalette()
    const values = TRAFFIC_LEVELS.map((level) => palette[level])
    expect(new Set(values).size).toBe(4)
    for (const value of values) expect(value).toMatch(/^#/)
  })
})

describe('the MapLibre layer spec', () => {
  const style = {
    layers: [
      { id: 'background', type: 'background' },
      { id: 'roads', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation' },
      { id: 'road-casing', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation' },
      { id: 'water', type: 'line', source: 'openmaptiles', 'source-layer': 'waterway' },
      { id: 'place-labels', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place' },
    ],
  } as never

  it('finds the road source once, de-duplicated', () => {
    expect(findRoadSources(style)).toEqual([{ source: 'openmaptiles', sourceLayer: 'transportation' }])
  })

  it('inserts before the first symbol layer, so labels and markers stay on top', () => {
    expect(firstSymbolLayerId(style)).toBe('place-labels')
    expect(trafficLayerSpec(firstSymbolLayerId(style)).beforeId).toBe('place-labels')
  })

  it('is a line layer bound to the traffic source', () => {
    const { spec } = trafficLayerSpec()
    expect(spec.id).toBe(TRAFFIC_LAYER_ID)
    expect(spec.type).toBe('line')
    expect(spec.source).toBe(TRAFFIC_SOURCE_ID)
  })

  it('colours by the seeded level, one arm per level', () => {
    const expression = trafficColorExpression()
    expect(expression[0]).toBe('match')
    for (const level of TRAFFIC_LEVELS) expect(expression).toContain(level)
  })

  it('scales width with zoom', () => {
    const expression = trafficWidthExpression()
    expect(expression[0]).toBe('interpolate')
    expect(expression[2]).toEqual(['zoom'])
  })

  it('tolerates a style with no layers at all', () => {
    expect(findRoadSources(undefined)).toEqual([])
    expect(firstSymbolLayerId(undefined)).toBeUndefined()
  })
})
