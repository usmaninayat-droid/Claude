import { describe, expect, it } from 'vitest'
import { haversineKm, searchHighlightZone, vehiclesWithinRadius } from './highlight-geo'
import type { LiveVehicleDatum } from '../live-types'

describe('highlight-geo — the search-highlight circle + Assets Nearby math', () => {
  it('searchHighlightZone returns a 48-point polygon centered on the position', () => {
    const zone = searchHighlightZone('h1', [55, 25], 10)
    expect(zone).not.toBeNull()
    expect(zone!.points).toHaveLength(48)
    expect(zone!.id).toBe('h1')
  })

  it('searchHighlightZone returns null for a non-positive radius', () => {
    expect(searchHighlightZone('h1', [55, 25], 0)).toBeNull()
    expect(searchHighlightZone('h1', [55, 25], -5)).toBeNull()
  })

  it('a larger radius spans a wider polygon', () => {
    const small = searchHighlightZone('h1', [55, 25], 1)!
    const large = searchHighlightZone('h1', [55, 25], 20)!
    const spread = (points: [number, number][]) => Math.max(...points.map((p) => p[0])) - Math.min(...points.map((p) => p[0]))
    expect(spread(large.points)).toBeGreaterThan(spread(small.points))
  })

  it('haversineKm is ~0 for the same point and grows with distance', () => {
    expect(haversineKm([55, 25], [55, 25])).toBeCloseTo(0, 5)
    // ~1 degree of longitude at the equator is roughly 111km.
    expect(haversineKm([0, 0], [1, 0])).toBeGreaterThan(100)
    expect(haversineKm([0, 0], [1, 0])).toBeLessThan(120)
  })

  it('vehiclesWithinRadius filters by great-circle distance', () => {
    const vehicles: LiveVehicleDatum[] = [
      { id: 'near', position: [55.01, 25.01], status: 'moving' },
      { id: 'far', position: [60, 30], status: 'moving' },
    ]
    const within = vehiclesWithinRadius(vehicles, [55, 25], 5)
    expect(within.map((v) => v.id)).toEqual(['near'])
    expect(vehiclesWithinRadius(vehicles, [55, 25], 5000).map((v) => v.id)).toEqual(['near', 'far'])
  })
})
