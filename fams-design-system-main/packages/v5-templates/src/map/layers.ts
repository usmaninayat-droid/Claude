import { GeoJsonLayer, HeatmapLayer, PathLayer, ScatterplotLayer, type Layer, type PickingInfo } from 'deck.gl'
import type Supercluster from 'supercluster'
import type { Feature, FeatureCollection, Geometry, Polygon } from 'geojson'
import { colorToRgba, defaultMarkerColor, defaultZoneColor, resolveDataColor } from './color'
import { getVisibleClusters, isCluster, type ClusterFeature } from './cluster'
import { LAYER_ID } from './constants'
import type { LngLat, MapHeatDatum, MapMarkerDatum, MapPathDatum, MapZoneDatum } from './MapPanel.types'

/**
 * layers.ts — props → deck.gl layer instances (GPU only, never DOM markers —
 * perf rule 3). Pure builder functions: given the current props + viewport,
 * return the `Layer[]` for `MapboxOverlay.setProps({ layers })`. Deliberately
 * side-effect-free so they're directly unit-testable (construct a layer,
 * assert its `.props`) without touching WebGL — layer construction only
 * stores props; luma.gl only allocates a GPU device once the overlay
 * actually attaches to a real map, which the tests mock (see
 * `test/map-mocks.ts`).
 */

function closeRing(points: LngLat[]): LngLat[] {
  if (points.length === 0) return points
  const [first] = points
  const last = points[points.length - 1]
  return first[0] === last[0] && first[1] === last[1] ? points : [...points, first]
}

export interface ZoneFeatureProperties {
  zoneId: string
  color: [number, number, number, number]
  fillOpacity: number
  label: string
}

export function zonesToFeatureCollection(zones: MapZoneDatum[]): FeatureCollection<Polygon, ZoneFeatureProperties> {
  return {
    type: 'FeatureCollection',
    features: zones.map((z) => ({
      type: 'Feature',
      properties: {
        zoneId: z.id,
        color: colorToRgba(z.color, defaultZoneColor),
        fillOpacity: z.fillOpacity ?? 0.18,
        label: z.label ?? '',
      },
      geometry: { type: 'Polygon', coordinates: [closeRing(z.points)] },
    })),
  }
}

/** What a zone hover reports: the picked zone plus the pointer position, in
 *  CSS px relative to the map canvas. `null` when the pointer leaves. */
export interface ZoneHoverInfo {
  zoneId: string
  label: string
  x: number
  y: number
}

/**
 * The zones layer — filled + outlined polygons, click routed by `zoneId`, and
 * (round-4 finding F3, SPEC §3.20 / 555:62155) hover routed the same way so
 * the caller can paint a zone-id chip. The layer previously declared neither
 * `onHover` nor a tooltip, so hovering a polygon produced nothing at all.
 */
export function buildZonesLayer(
  zones: MapZoneDatum[],
  onZoneClick?: (zoneId: string) => void,
  onZoneHover?: (info: ZoneHoverInfo | null) => void,
): GeoJsonLayer<ZoneFeatureProperties> | null {
  if (zones.length === 0) return null
  return new GeoJsonLayer<ZoneFeatureProperties>({
    id: LAYER_ID.zonesFill,
    data: zonesToFeatureCollection(zones),
    pickable: Boolean(onZoneClick || onZoneHover),
    stroked: true,
    filled: true,
    getFillColor: (f: Feature<Geometry, ZoneFeatureProperties>) => {
      const [r, g, b] = f.properties.color
      return [r, g, b, Math.round(255 * f.properties.fillOpacity)] as [number, number, number, number]
    },
    getLineColor: (f: Feature<Geometry, ZoneFeatureProperties>) => f.properties.color,
    getLineWidth: 2,
    lineWidthUnits: 'pixels',
    onClick: onZoneClick
      ? (info: PickingInfo<Feature<Polygon, ZoneFeatureProperties>>) => {
          if (info.object) onZoneClick(info.object.properties.zoneId)
        }
      : undefined,
    onHover: onZoneHover
      ? (info: PickingInfo<Feature<Polygon, ZoneFeatureProperties>>) => {
          onZoneHover(
            info.object
              ? {
                  zoneId: info.object.properties.zoneId,
                  label: info.object.properties.label,
                  x: info.x,
                  y: info.y,
                }
              : null,
          )
        }
      : undefined,
  })
}

/** One renderable stroke piece of a `MapPathDatum` (a dashed path becomes many). */
interface PathPiece {
  path: LngLat[]
  color: [number, number, number, number]
  widthPx: number
}

/**
 * Splits an open polyline into on/off dash pieces in geographic space —
 * the dashed-treatment fallback documented on `MapPathDatum.dashed` (the
 * deck.gl umbrella this repo depends on ships no `PathStyleExtension`, so
 * screen-space dashing is unavailable without a new dependency). Dash and
 * gap lengths derive from the line's own total length, so any route scale
 * reads as dashes.
 */
export function dashPolyline(points: LngLat[], pieces = 36): LngLat[][] {
  if (points.length < 2) return []
  const lengths: number[] = []
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0]
    const dy = points[i][1] - points[i - 1][1]
    const len = Math.hypot(dx, dy)
    lengths.push(len)
    total += len
  }
  if (total === 0) return []
  const unit = total / (pieces * 2 - 1) // dash + gap pairs, ending on a dash
  const at = (distance: number): LngLat => {
    let travelled = 0
    for (let i = 0; i < lengths.length; i++) {
      if (travelled + lengths[i] >= distance || i === lengths.length - 1) {
        const t = lengths[i] === 0 ? 0 : Math.min(1, (distance - travelled) / lengths[i])
        const [ax, ay] = points[i]
        const [bx, by] = points[i + 1]
        return [ax + (bx - ax) * t, ay + (by - ay) * t]
      }
      travelled += lengths[i]
    }
    return points[points.length - 1]
  }
  const dashes: LngLat[][] = []
  for (let p = 0; p < pieces; p++) {
    const start = p * 2 * unit
    const end = Math.min(total, start + unit)
    if (end - start <= 0) break
    dashes.push([at(start), at(end)])
  }
  return dashes
}

/** The route-path layer — solid and (segment-approximated) dashed polylines. */
export function buildPathsLayer(paths: MapPathDatum[]): PathLayer<PathPiece> | null {
  if (paths.length === 0) return null
  const data: PathPiece[] = []
  for (const path of paths) {
    const color = colorToRgba(path.color, defaultMarkerColor)
    const widthPx = path.widthPx ?? 4
    if (path.dashed) {
      for (const piece of dashPolyline(path.points)) data.push({ path: piece, color, widthPx })
    } else if (path.points.length >= 2) {
      data.push({ path: path.points, color, widthPx })
    }
  }
  if (data.length === 0) return null
  return new PathLayer<PathPiece>({
    id: LAYER_ID.paths,
    data,
    getPath: (d) => d.path,
    getColor: (d) => d.color,
    getWidth: (d) => d.widthPx,
    widthUnits: 'pixels',
    capRounded: true,
    jointRounded: true,
  })
}

/** The heatmap layer — intensity-weighted point density. */
export function buildHeatLayer(heat: MapHeatDatum[]): HeatmapLayer<MapHeatDatum> | null {
  if (heat.length === 0) return null
  return new HeatmapLayer<MapHeatDatum>({
    id: LAYER_ID.heat,
    data: heat,
    getPosition: (d) => d.position,
    getWeight: (d) => d.weight ?? 0.6,
    radiusPixels: 34,
    opacity: 0.7,
  })
}

export interface MarkerLayersOptions {
  bbox: [number, number, number, number]
  zoom: number
  onMarkerClick?: (markerId: string) => void
  onClusterClick?: (clusterId: number, position: LngLat, expansionZoom: number) => void
}

/** Unclustered markers — one `ScatterplotLayer` keyed by marker id/color, so
 *  every marker gets its own (resolved) data color. */
export function buildFlatMarkerLayer(markers: MapMarkerDatum[], onMarkerClick?: (markerId: string) => void): ScatterplotLayer<MapMarkerDatum> | null {
  if (markers.length === 0) return null
  return new ScatterplotLayer<MapMarkerDatum>({
    id: LAYER_ID.markersPoint,
    data: markers,
    pickable: Boolean(onMarkerClick),
    getPosition: (d) => d.position,
    getFillColor: (d) => colorToRgba(d.color, defaultMarkerColor, d.opacity ?? 1),
    getRadius: (d) => d.radius ?? 6,
    radiusUnits: 'pixels',
    stroked: true,
    getLineColor: (d) => [255, 255, 255, Math.round(255 * (d.opacity ?? 1))],
    lineWidthMinPixels: 2,
    onClick: onMarkerClick
      ? (info: PickingInfo<MapMarkerDatum>) => {
          if (info.object) onMarkerClick(info.object.id)
        }
      : undefined,
  })
}

/** Clustered markers — a pre-built supercluster index (see `useClusterIndex`
 *  in `cluster.ts`, owned by `MapPanel` so this stays a plain, hook-free,
 *  directly-testable function) resolved for the current viewport/zoom into
 *  cluster + unclustered-point features, rendered as a single
 *  `ScatterplotLayer` (cluster radius scales with `point_count`). */
export function buildClusteredMarkerLayer(index: Supercluster, hasMarkers: boolean, options: MarkerLayersOptions): ScatterplotLayer<ClusterFeature> | null {
  if (!hasMarkers) return null
  const features = getVisibleClusters(index, options.bbox, options.zoom)
  return new ScatterplotLayer<ClusterFeature>({
    id: LAYER_ID.markersCluster,
    data: features,
    pickable: true,
    getPosition: (f) => f.geometry.coordinates as LngLat,
    getFillColor: (f) => (isCluster(f) ? colorToRgba(undefined, defaultMarkerColor) : colorToRgba(f.properties.color, defaultMarkerColor)),
    getRadius: (f) => (isCluster(f) ? Math.min(12 + Math.log2(f.properties.point_count) * 4, 28) : 6),
    radiusUnits: 'pixels',
    stroked: true,
    getLineColor: [255, 255, 255, 255],
    lineWidthMinPixels: 2,
    onClick: (info: PickingInfo<ClusterFeature>) => {
      const f = info.object
      if (!f) return
      if (isCluster(f)) {
        const [lng, lat] = f.geometry.coordinates
        options.onClusterClick?.(f.properties.cluster_id, [lng, lat], index.getClusterExpansionZoom(f.properties.cluster_id))
      } else {
        options.onMarkerClick?.(f.properties.markerId)
      }
    },
  })
}

export function resolveZoneDrawColor(color: string | undefined): string {
  return resolveDataColor(color, defaultMarkerColor)
}

export type AnyDeckLayer = Layer
