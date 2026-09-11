import { describe, expect, it } from 'vitest'
import { buildWeatherField, weatherFieldHash, weatherFieldValue, WEATHER_FIELD_RESOLUTION } from './weather-overlay'
import { WEATHER_FIELD_OVERLAY_IDS, mapFieldBbox, weatherLayerId, weatherLayerSpec, weatherSourceId } from './weather-overlay-layer'

/**
 * weather-overlay.test.ts — the seeded rain/cloud/precipitation fields.
 *
 * The property that matters is DETERMINISM: the same viewport must produce
 * the same wash every time, or the overlay shimmers as the camera settles
 * and no visual baseline can ever be stable.
 */
const QATAR: [number, number, number, number] = [50.7, 24.5, 51.7, 26.2]

describe('weatherFieldHash', () => {
  it('is stable for the same cell', () => {
    expect(weatherFieldHash(1, 3, 4)).toBe(weatherFieldHash(1, 3, 4))
  })

  it('stays inside [0, 1)', () => {
    for (let x = 0; x < 20; x++) {
      const v = weatherFieldHash(0x9e3779b9, x, x * 7)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('separates cells and seeds', () => {
    expect(weatherFieldHash(1, 3, 4)).not.toBe(weatherFieldHash(2, 3, 4))
    expect(weatherFieldHash(1, 3, 4)).not.toBe(weatherFieldHash(1, 4, 3))
  })
})

describe('weatherFieldValue', () => {
  it('clamps into [0, 1]', () => {
    for (let x = 0; x < 30; x++) {
      const v = weatherFieldValue(0x85ebca6b, x, 3)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})

describe('buildWeatherField', () => {
  it('is deterministic for the same bbox', () => {
    expect(buildWeatherField('rain-heatmap', QATAR)).toEqual(buildWeatherField('rain-heatmap', QATAR))
  })

  it('gives each overlay its own field', () => {
    expect(buildWeatherField('rain-heatmap', QATAR)).not.toEqual(buildWeatherField('clouds', QATAR))
  })

  it('emits GeoJSON points inside the bbox with a 0-1 value', () => {
    const field = buildWeatherField('clouds', QATAR)
    expect(field.type).toBe('FeatureCollection')
    expect(field.features.length).toBeGreaterThan(0)
    for (const feature of field.features) {
      const [lng, lat] = feature.geometry.coordinates
      expect(lng).toBeGreaterThanOrEqual(QATAR[0])
      expect(lng).toBeLessThanOrEqual(QATAR[2])
      expect(lat).toBeGreaterThanOrEqual(QATAR[1])
      expect(lat).toBeLessThanOrEqual(QATAR[3])
      expect(feature.properties.value).toBeGreaterThanOrEqual(0.35)
      expect(feature.properties.value).toBeLessThanOrEqual(1)
    }
  })

  it('drops the below-floor cells rather than painting a flat mat', () => {
    const field = buildWeatherField('precipitation', QATAR)
    expect(field.features.length).toBeLessThan(WEATHER_FIELD_RESOLUTION * WEATHER_FIELD_RESOLUTION)
  })
})

describe('weatherLayerSpec', () => {
  it('gives rain a real heatmap layer', () => {
    const { spec } = weatherLayerSpec('rain-heatmap')
    expect(spec.type).toBe('heatmap')
    expect(spec.source).toBe(weatherSourceId('rain-heatmap'))
    expect(spec.id).toBe(weatherLayerId('rain-heatmap'))
  })

  it('paints clouds and precipitation as soft circle washes, not heatmaps', () => {
    for (const overlay of ['clouds', 'precipitation'] as const) {
      const { spec } = weatherLayerSpec(overlay)
      expect(spec.type).toBe('circle')
      expect((spec.paint as Record<string, unknown>)['circle-blur']).toBe(1)
    }
  })

  it('honours the caller-supplied insertion point', () => {
    expect(weatherLayerSpec('clouds', 'label-layer').beforeId).toBe('label-layer')
  })

  it('names a distinct source and layer per overlay', () => {
    const ids = WEATHER_FIELD_OVERLAY_IDS.flatMap((o) => [weatherSourceId(o), weatherLayerId(o)])
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('mapFieldBbox', () => {
  it('reads the camera bounds', () => {
    const map = {
      getBounds: () => ({ getWest: () => 50.7, getSouth: () => 24.5, getEast: () => 51.7, getNorth: () => 26.2 }),
    }
    expect(mapFieldBbox(map as never)).toEqual(QATAR)
  })

  it('returns null against a stub map rather than throwing', () => {
    expect(mapFieldBbox({} as never)).toBeNull()
    expect(mapFieldBbox({ getBounds: () => { throw new Error('no map') } } as never)).toBeNull()
  })
})
