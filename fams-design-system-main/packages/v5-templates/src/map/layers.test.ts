import { describe, expect, it, vi } from 'vitest'
import { buildClusterIndex, getVisibleClusters, isCluster } from './cluster'
import { buildClusteredMarkerLayer, buildFlatMarkerLayer, buildHeatLayer, buildPathsLayer, buildZonesLayer, dashPolyline, zonesToFeatureCollection } from './layers'
import { sampleHeat, sampleMarkers, sampleZones } from './fixtures'

/**
 * layers.test.ts — props → deck.gl layer-config mapping (requirement 6:
 * "markers→cluster config, zones→geojson layer"). Real deck.gl `Layer`
 * classes are constructed (no WebGL needed for that — see `test/map-mocks.ts`'s
 * header) and asserted on via `.props`, so these tests catch a real
 * accessor-wiring regression, not just a call-was-made stub.
 */

const WORLD_BBOX: [number, number, number, number] = [-180, -85, 180, 85]

describe('layers.ts — zones', () => {
  it('closes an open ring and resolves each zone color to an opaque RGBA', () => {
    const fc = zonesToFeatureCollection(sampleZones)
    const [feature] = fc.features
    const ring = feature.geometry.coordinates[0]
    expect(ring[0]).toEqual(ring[ring.length - 1]) // ring closed
    expect(feature.properties.color).toHaveLength(4)
    expect(feature.properties.color.every((c) => c >= 0 && c <= 255)).toBe(true)
  })

  it('builds a GeoJsonLayer whose fill accessor reads the resolved zone color + opacity', () => {
    const layer = buildZonesLayer(sampleZones)!
    expect(layer.id).toBe('fams-map-zones-fill')
    const [feature] = zonesToFeatureCollection(sampleZones).features
    const fill = (layer.props.getFillColor as any)(feature)
    expect(fill.slice(0, 3)).toEqual(feature.properties.color.slice(0, 3))
    expect(fill[3]).toBe(Math.round(255 * feature.properties.fillOpacity))
  })

  it('routes onClick to the zone id, not raw deck.gl picking info', () => {
    const onZoneClick = vi.fn()
    const layer = buildZonesLayer(sampleZones, onZoneClick)!
    const [feature] = zonesToFeatureCollection(sampleZones).features
    layer.props.onClick!({ object: feature } as never, {} as never)
    expect(onZoneClick).toHaveBeenCalledWith('z1')
  })

  /* Round-4 finding F3 — SPEC §3.20 / 555:62155: hovering a zone polygon
     produced nothing at all, because the layer declared neither `onHover` nor
     a tooltip and was `pickable` only for click. */
  it('routes zone HOVER out with the picked id, label and pointer position', () => {
    const onZoneHover = vi.fn()
    const layer = buildZonesLayer(sampleZones, undefined, onZoneHover)!
    expect(layer.props.pickable).toBe(true)
    const [feature] = zonesToFeatureCollection(sampleZones).features
    layer.props.onHover!({ object: feature, x: 120, y: 80 } as never, {} as never)
    expect(onZoneHover).toHaveBeenCalledWith({ zoneId: 'z1', label: expect.any(String), x: 120, y: 80 })
    // Leaving the polygon clears it.
    layer.props.onHover!({ object: null, x: 0, y: 0 } as never, {} as never)
    expect(onZoneHover).toHaveBeenLastCalledWith(null)
  })

  it('returns null for an empty zone list (no layer, not an empty-data layer)', () => {
    expect(buildZonesLayer([])).toBeNull()
  })
})

describe('layers.ts — heat', () => {
  it('builds a HeatmapLayer with a weight accessor defaulting missing weights to 0.6', () => {
    const layer = buildHeatLayer(sampleHeat)!
    expect(layer.id).toBe('fams-map-heat')
    expect((layer.props.getWeight as (d: (typeof sampleHeat)[0]) => number)({ position: [0, 0] })).toBe(0.6)
    expect((layer.props.getWeight as (d: (typeof sampleHeat)[0]) => number)(sampleHeat[0])).toBe(0.8)
  })

  it('returns null for empty heat data', () => {
    expect(buildHeatLayer([])).toBeNull()
  })
})

describe('layers.ts — flat (unclustered) markers', () => {
  it('maps each marker to its own resolved fill color and radius', () => {
    const layer = buildFlatMarkerLayer(sampleMarkers)!
    const getFillColor = layer.props.getFillColor as any
    const getRadius = layer.props.getRadius as any
    expect(getFillColor(sampleMarkers[1]).slice(0, 3)).toEqual([0x12, 0xb7, 0x6a])
    expect(getRadius(sampleMarkers[0])).toBe(6) // default
  })

  it('routes onClick to the marker id', () => {
    const onMarkerClick = vi.fn()
    const layer = buildFlatMarkerLayer(sampleMarkers, onMarkerClick)!
    layer.props.onClick!({ object: sampleMarkers[0] } as never, {} as never)
    expect(onMarkerClick).toHaveBeenCalledWith('m1')
  })

  it('returns null for an empty marker list', () => {
    expect(buildFlatMarkerLayer([])).toBeNull()
  })
})

describe('layers.ts — clustered markers', () => {
  it('routes a cluster click to onClusterClick with its expansion zoom', () => {
    const index = buildClusterIndex(sampleMarkers, { radius: 200, minPoints: 2 })
    const onClusterClick = vi.fn()
    const layer = buildClusteredMarkerLayer(index, true, { bbox: WORLD_BBOX, zoom: 1, onClusterClick })!
    const features = getVisibleClusters(index, WORLD_BBOX, 1)
    const cluster = features.find(isCluster)!
    layer.props.onClick!({ object: cluster } as never, {} as never)
    expect(onClusterClick).toHaveBeenCalledTimes(1)
    const [clusterId, position, expansionZoom] = onClusterClick.mock.calls[0]
    expect(clusterId).toBe(cluster.properties.cluster_id)
    expect(position).toEqual(cluster.geometry.coordinates)
    expect(typeof expansionZoom).toBe('number')
  })

  it('routes an unclustered point click to onMarkerClick by markerId', () => {
    const index = buildClusterIndex(sampleMarkers, { radius: 1 })
    const onMarkerClick = vi.fn()
    const layer = buildClusteredMarkerLayer(index, true, { bbox: WORLD_BBOX, zoom: 20, onMarkerClick })!
    const features = getVisibleClusters(index, WORLD_BBOX, 20)
    const point = features.find((f) => !isCluster(f))!
    layer.props.onClick!({ object: point } as never, {} as never)
    expect(onMarkerClick).toHaveBeenCalledWith((point.properties as { markerId: string }).markerId)
  })

  it('returns null when there are no markers', () => {
    const index = buildClusterIndex([])
    expect(buildClusteredMarkerLayer(index, false, { bbox: WORLD_BBOX, zoom: 5 })).toBeNull()
  })
})

describe('layers.ts — paths', () => {
  const line: [number, number][] = [
    [55.2, 25.1],
    [55.3, 25.1],
    [55.3, 25.2],
  ]

  it('splits a dashed polyline into alternating on/off pieces along the line', () => {
    const dashes = dashPolyline(line, 10)
    expect(dashes).toHaveLength(10)
    // Pieces start at the line start and end at the line end (ends on a dash).
    expect(dashes[0][0]).toEqual(line[0])
    const [lastStart, lastEnd] = dashes[dashes.length - 1]
    expect(lastEnd[0]).toBeCloseTo(line[2][0], 6)
    expect(lastEnd[1]).toBeCloseTo(line[2][1], 6)
    expect(lastStart).not.toEqual(lastEnd)
  })

  it('builds one PathLayer mixing solid strokes and dash pieces, colors resolved to RGBA', () => {
    const layer = buildPathsLayer([
      { id: 'actual', points: line, widthPx: 4 },
      { id: 'planned', points: line, dashed: true, widthPx: 3 },
    ])!
    expect(layer.id).toBe('fams-map-paths')
    const data = layer.props.data as { path: [number, number][]; color: number[]; widthPx: number }[]
    expect(data.length).toBeGreaterThan(2) // 1 solid + many dash pieces
    expect(data[0].path).toEqual(line)
    expect(data[0].color).toHaveLength(4)
    expect((layer.props.getWidth as (d: unknown) => number)(data[0])).toBe(4)
  })

  it('returns null for no paths / degenerate (sub-2-point) paths', () => {
    expect(buildPathsLayer([])).toBeNull()
    expect(buildPathsLayer([{ id: 'p', points: [[55.2, 25.1]] }])).toBeNull()
    expect(dashPolyline([[55.2, 25.1]])).toEqual([])
  })
})
