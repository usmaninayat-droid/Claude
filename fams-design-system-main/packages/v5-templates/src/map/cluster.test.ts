import { describe, expect, it } from 'vitest'
import { buildClusterIndex, getVisibleClusters, isCluster } from './cluster'
import { sampleMarkers } from './fixtures'

const WORLD_BBOX: [number, number, number, number] = [-180, -85, 180, 85]

describe('cluster.ts — supercluster wrapping', () => {
  it('groups nearby markers into a cluster at a low zoom', () => {
    const index = buildClusterIndex(sampleMarkers, { radius: 200, minPoints: 2 })
    const features = getVisibleClusters(index, WORLD_BBOX, 2)
    const clusters = features.filter(isCluster)
    expect(clusters.length).toBeGreaterThan(0)
    expect(clusters[0].properties.point_count).toBeGreaterThanOrEqual(2)
  })

  it('renders individual points once zoomed in past clustering range', () => {
    const index = buildClusterIndex(sampleMarkers, { radius: 40 })
    const features = getVisibleClusters(index, WORLD_BBOX, 20)
    expect(features.every((f) => !isCluster(f))).toBe(true)
    expect(features).toHaveLength(sampleMarkers.length)
  })

  it('preserves each marker id + color on its unclustered point feature', () => {
    const index = buildClusterIndex(sampleMarkers, { radius: 1 })
    const features = getVisibleClusters(index, WORLD_BBOX, 20)
    const feature = features.find((f) => !isCluster(f) && f.properties.markerId === 'm2')
    expect(feature).toBeDefined()
    expect(!isCluster(feature!) && feature!.properties.color).toBe('#12b76a')
  })

  it('honors a minPoints below the default cluster threshold', () => {
    const soloMarker = [sampleMarkers[0]]
    const index = buildClusterIndex(soloMarker)
    const features = getVisibleClusters(index, WORLD_BBOX, 5)
    expect(features).toHaveLength(1)
    expect(isCluster(features[0])).toBe(false)
  })
})
