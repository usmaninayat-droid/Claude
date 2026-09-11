import { describe, expect, it } from 'vitest'
import { nearestWeatherStation } from './weather-types'
import { haversineKm } from './search/highlight-geo'
import { sampleWeatherStations } from './weather-fixtures'

describe('haversineKm', () => {
  it('is zero for identical points and symmetric', () => {
    expect(haversineKm([51.5, 25.3], [51.5, 25.3])).toBe(0)
    expect(haversineKm([51.5, 25.3], [51.2, 25.0])).toBeCloseTo(haversineKm([51.2, 25.0], [51.5, 25.3]), 10)
  })

  it('matches a known Qatar-scale distance (Doha → Al Khor ≈ 47 km)', () => {
    const d = haversineKm([51.531, 25.285], [51.498, 25.68])
    expect(d).toBeGreaterThan(40)
    expect(d).toBeLessThan(50)
  })
})

describe('nearestWeatherStation', () => {
  it('returns null for an empty station set', () => {
    expect(nearestWeatherStation([51.5, 25.3], [])).toBeNull()
  })

  it('picks the geometrically nearest station with its distance', () => {
    const hit = nearestWeatherStation([51.48, 25.38], sampleWeatherStations)
    expect(hit?.station.id).toBe('qu')
    expect(hit?.distanceKm).toBeLessThan(1)
  })
})
