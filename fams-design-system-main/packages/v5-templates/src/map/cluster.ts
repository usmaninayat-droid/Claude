import Supercluster from 'supercluster'
import { useMemo } from 'react'
import { DEFAULT_CLUSTER_MAX_ZOOM, DEFAULT_CLUSTER_MIN_POINTS, DEFAULT_CLUSTER_RADIUS } from './constants'
import type { MapMarkerDatum } from './MapPanel.types'

/**
 * cluster.ts — supercluster wrapping for `MapPanel`'s marker layer.
 *
 * supercluster builds a static spatial index over the full marker set once
 * (`load`), then answers "which clusters/points are visible in this
 * viewport at this zoom" cheaply on every camera move (`getClusters`) — the
 * standard pattern for feeding a GPU point layer (deck.gl here) thousands of
 * markers without re-clustering from scratch on every frame. Kept
 * MapLibre/deck.gl-agnostic on purpose: this file only knows GeoJSON points
 * in, cluster/point features out.
 */

export interface ClusterOptions {
  /** Clustering radius in pixels at the given zoom. Default 60. */
  radius?: number
  /** Zoom level past which points are never merged into a cluster. Default 16. */
  maxZoom?: number
  /** Minimum points to form a cluster (below this, points render individually). Default 2. */
  minPoints?: number
}

export type ClusterFeature = Supercluster.ClusterFeature<{ markerId: string; color?: string }> | Supercluster.PointFeature<{ markerId: string; color?: string }>

function toPointFeature(marker: MapMarkerDatum): Supercluster.PointFeature<{ markerId: string; color?: string }> {
  return {
    type: 'Feature',
    properties: { markerId: marker.id, color: marker.color },
    geometry: { type: 'Point', coordinates: marker.position },
  }
}

/** Builds a fresh supercluster index over `markers`. Pure — callers own
 *  memoizing this against marker-identity changes (see `useClusterIndex`). */
export function buildClusterIndex(markers: MapMarkerDatum[], options?: ClusterOptions): Supercluster {
  const index = new Supercluster({
    radius: options?.radius ?? DEFAULT_CLUSTER_RADIUS,
    maxZoom: options?.maxZoom ?? DEFAULT_CLUSTER_MAX_ZOOM,
    minPoints: options?.minPoints ?? DEFAULT_CLUSTER_MIN_POINTS,
  })
  index.load(markers.map(toPointFeature))
  return index
}

/** Memoized supercluster index — rebuilds only when the marker set actually
 *  changes (by reference-stable id/position/color triples, not object
 *  identity, so a consumer re-mapping the same records each render doesn't
 *  thrash the index). */
export function useClusterIndex(markers: MapMarkerDatum[], options?: ClusterOptions): Supercluster {
  const key = JSON.stringify(markers.map((m) => [m.id, m.position[0], m.position[1], m.color]))
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the intentional dep, see comment above
  return useMemo(() => buildClusterIndex(markers, options), [key, options?.radius, options?.maxZoom, options?.minPoints])
}

/** Points + clusters visible in `bbox` (`[west, south, east, north]`) at
 *  `zoom` — the direct feed for the marker deck.gl layers. */
export function getVisibleClusters(index: Supercluster, bbox: [number, number, number, number], zoom: number): ClusterFeature[] {
  return index.getClusters(bbox, Math.round(zoom)) as ClusterFeature[]
}

export function isCluster(feature: ClusterFeature): feature is Supercluster.ClusterFeature<{ markerId: string; color?: string }> {
  return 'cluster' in feature.properties && Boolean(feature.properties.cluster)
}
