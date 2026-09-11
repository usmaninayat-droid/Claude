// "Nearby Routes for Remaining Bins" sheet data (Figma node 2227:113098).
// Suggested nearby routes the remaining bins can be reassigned to.
//
// Geometry lives HERE, not in the component: every lat/lng the map draws is a
// named field on the route's `map` object (or on NEARBY_MAP for shared points),
// so the component only reads geometry and never contains coordinate literals.
// This is what unblocks the "shrink zone / edit zone" dev notes.

import { binSpread } from './binCluster'

export type LatLng = [number, number]

export interface RouteDetails {
  plan: string
  vehicle: string
  driver: string
  wasteCollected: string
  serviceType: string
  wasteType: string
  lot: string
  actualStart: string
  dischargeStation: string
  plannedEnd: string
}

export interface RouteExtra {
  bins: string
  distance: string
  waste: { label: string; note: string; pct: number }
  time: { label: string; note: string; pct: number }
}

/** Everything the map draws for one nearby route. All coordinates live here so
 *  the component reads geometry rather than embedding literals. */
export interface NearbyRouteMap {
  /** Route line colour (also the badge border + row dot). */
  color: string
  /** Service-area zone fill colour (a DS token where one exists). */
  zoneColor: string
  /** AssetMarker motion state for the standby truck. */
  vehicleState: 'non-moving' | 'idle' | 'stopped'
  /** Standby vehicle marker position. */
  vehiclePt: LatLng
  /** Route service-area polygon. */
  serviceZone: LatLng[]
  /** Centre of the "already assigned" count badge (sits in the service zone). */
  zoneCenter: LatLng
  /** Bins already assigned to this route (the badge number). */
  assignedCount: number
  /** "N km away" label under the service-zone badge. */
  awayLabel: string
  /** Endpoint of the dotted connector shown before optimizing. */
  connectorTo: LatLng
  /** Full optimized route polyline (vehicle → through the bins → depot). */
  optimizedPath: LatLng[]
  /** This route's slice of the split remaining-bins building footprint. */
  buildingZone: LatLng[]
  /** Centre of that slice (where the optimized red count badge sits). */
  buildingCenter: LatLng
}

export interface NearbyRoute {
  id: string
  /** Status dot colour. */
  dot: 'info' | 'warning' | 'purple'
  bins: string
  capacity: string
  distance: string
  status: string
  /** Default bins to assign here (stepper), and whether it starts selected/expanded. */
  defaultQty: number
  defaultChecked?: boolean
  defaultExpanded?: boolean
  extra: RouteExtra
  details: RouteDetails
  /** Map geometry for this route. */
  map: NearbyRouteMap
}

/** Bins still needing a route (drives the assign stepper max). */
export const REMAINING_BINS = 100

const details = (over: Partial<RouteDetails>): RouteDetails => ({
  plan: 'Al Wakrah Corniche Response Plan',
  vehicle: 'LMV-QA08',
  driver: 'Rashid Al-Naimi',
  wasteCollected: '14,500 L',
  serviceType: 'Flood Response',
  wasteType: 'Storm Water',
  lot: 'Zone-AlWakrah1',
  actualStart: '20 JAN | 14:00',
  dischargeStation: 'Doha South Discharge Point',
  plannedEnd: '20 JAN | 16:00',
  ...over,
})

export const nearbyRoutes: NearbyRoute[] = [
  {
    id: 'R#9876543',
    dot: 'info',
    bins: '164/180',
    capacity: '12 CMB',
    distance: '1.2 km',
    status: 'Ongoing',
    defaultQty: 100,
    defaultChecked: true,
    extra: {
      bins: '100',
      distance: '38 km',
      waste: { label: 'Within Limit', note: '~1.8/10 CBM', pct: 18 },
      time: { label: 'Within Shift', note: '~2h10m/3h', pct: 72 },
    },
    details: details({ vehicle: 'LMV-QA02', driver: 'Abdullah Al-Marri' }),
    map: {
      color: '#1570EF',
      zoneColor: 'var(--status-info)',
      vehicleState: 'non-moving',
      vehiclePt: [25.214, 51.519],
      serviceZone: [
        [25.226, 51.511], [25.222, 51.526], [25.208, 51.531], [25.199, 51.522], [25.205, 51.508], [25.217, 51.504],
      ],
      zoneCenter: [25.212, 51.517],
      assignedCount: 180,
      awayLabel: '1.2 km away',
      connectorTo: [25.1915, 51.5335],
      optimizedPath: [
        [25.214, 51.519], [25.209, 51.515], [25.201, 51.508], [25.195, 51.503],
        [25.189, 51.507], [25.183, 51.514], [25.181, 51.522], [25.184, 51.529],
        // Zigzag inside the building footprint (covers the bins)
        [25.1935, 51.5335], [25.1870, 51.5342], [25.1865, 51.536], [25.1930, 51.5355],
        // Continue to depot
        [25.192, 51.536], [25.194, 51.538], [25.194, 51.542], [25.198, 51.548], [25.208, 51.555],
      ],
      buildingZone: [
        [25.1935, 51.5335], [25.194, 51.5362], [25.1865, 51.5365], [25.186, 51.534],
      ],
      buildingCenter: [25.1915, 51.5335],
    },
  },
  {
    id: 'R#9876543',
    dot: 'warning',
    bins: '165/220',
    capacity: '10 CMB',
    distance: '2.2 km',
    status: 'Ongoing',
    defaultQty: 100,
    defaultExpanded: true,
    extra: {
      bins: '100',
      distance: '42 km',
      waste: { label: 'Within Limit', note: '~2.2/10 CBM', pct: 22 },
      time: { label: 'Within Shift', note: '~2h30m/3h', pct: 83 },
    },
    details: details({}),
    map: {
      color: '#F79009',
      zoneColor: 'var(--status-warning)',
      vehicleState: 'idle',
      vehiclePt: [25.175, 51.518],
      serviceZone: [
        [25.1697, 51.5104], [25.1807, 51.5064], [25.1877, 51.5174], [25.1807, 51.5304], [25.1677, 51.5274], [25.1637, 51.5164],
      ],
      zoneCenter: [25.178, 51.512],
      assignedCount: 220,
      awayLabel: '2.2 km away',
      connectorTo: [25.1900, 51.5385],
      optimizedPath: [
        [25.175, 51.518], [25.178, 51.525], [25.182, 51.53],
        // Zigzag inside the building footprint (covers the bins)
        [25.1935, 51.5365], [25.1870, 51.5372], [25.1865, 51.539], [25.1930, 51.5385],
        // Continue to depot
        [25.192, 51.536], [25.194, 51.538], [25.194, 51.542], [25.198, 51.548], [25.208, 51.555],
      ],
      buildingZone: [
        [25.1935, 51.5365], [25.194, 51.5385], [25.1865, 51.539], [25.186, 51.5368],
      ],
      buildingCenter: [25.1900, 51.5385],
    },
  },
  {
    id: 'R#9876543',
    dot: 'purple',
    bins: '120/140',
    capacity: '4 CMB',
    distance: '4.2 km',
    status: 'Ongoing',
    defaultQty: 100,
    extra: {
      bins: '100',
      distance: '55 km',
      waste: { label: 'Within Limit', note: '~1.1/4 CBM', pct: 28 },
      time: { label: 'Within Shift', note: '~1h45m/3h', pct: 58 },
    },
    details: details({ vehicle: 'LMV-QA17', driver: 'Naeem Chowdhury', wasteCollected: '11,000 L' }),
    map: {
      color: '#A259FF',
      zoneColor: '#A259FF',
      vehicleState: 'stopped',
      vehiclePt: [25.205, 51.5],
      serviceZone: [
        [25.215, 51.49], [25.210, 51.505], [25.195, 51.5], [25.198, 51.485], [25.208, 51.482]
      ],
      zoneCenter: [25.203, 51.492],
      assignedCount: 140,
      awayLabel: '4.2 km away',
      connectorTo: [25.1870, 51.5355],
      optimizedPath: [
        [25.205, 51.5], [25.198, 51.505], [25.192, 51.512], [25.186, 51.52],
        // Zigzag inside the building footprint (covers the bins)
        [25.1855, 51.534], [25.1818, 51.5342], [25.1820, 51.5395], [25.1858, 51.539],
        // Continue to depot
        [25.192, 51.536], [25.194, 51.538], [25.194, 51.542], [25.198, 51.548], [25.208, 51.555],
      ],
      buildingZone: [
        [25.1855, 51.534], [25.1860, 51.539], [25.1820, 51.5395], [25.1815, 51.5345]
      ],
      buildingCenter: [25.1870, 51.5355],
    },
  },
]

/** Shared map points: the view, the remaining-bins site (red count on a grey
 *  building), the undivided building footprint, and the discharge depot.
 *  (Per-route geometry lives on each route's `map` field.) */
export const NEARBY_MAP = {
  center: [25.196, 51.534] as LatLng,
  zoom: 13,
  site: [25.1905, 51.5362] as LatLng,
  siteLabel: 'R#9876544 • 100 stations left',
  depot: [25.208, 51.555] as LatLng,
  building: [
    [25.1935, 51.5335], [25.194, 51.5385], [25.1865, 51.539], [25.186, 51.534],
  ] as LatLng[],
}

/**
 * Build a pixel→lat/lng converter from the DS map's `project()` handle. The DS
 * `LeafletMapHandle` exposes `project()` but no `unproject()`, so we invert a
 * local affine approximation around `center` (two unit-degree probes give the
 * lat/lng axes in pixel space; solve the 2×2 for the inverse). Ported from the
 * MBR map — needed for right-click zone editing and click-to-exclude bins.
 */
export function makePxToLatLng(
  project: (ll: LatLng) => { x: number; y: number } | null,
  center: LatLng,
) {
  return (x: number, y: number): LatLng | null => {
    const p0 = project(center)
    const pLat = project([center[0] + 0.01, center[1]])
    const pLng = project([center[0], center[1] + 0.01])
    if (!p0 || !pLat || !pLng) return null
    const aLat = { x: (pLat.x - p0.x) / 0.01, y: (pLat.y - p0.y) / 0.01 }
    const aLng = { x: (pLng.x - p0.x) / 0.01, y: (pLng.y - p0.y) / 0.01 }
    const det = aLat.x * aLng.y - aLng.x * aLat.y
    if (!det) return null
    const dx = x - p0.x, dy = y - p0.y
    return [center[0] + (dx * aLng.y - aLng.x * dy) / det, center[1] + (aLat.x * dy - dx * aLat.y) / det]
  }
}

/* ---------------------------------------------------------------------------
 * Remaining-bins zone geometry (dev notes #3 "reduce number → shrink zone &
 * exclude bins" and the click-to-edit-anchor-points interaction).
 *
 * The remaining-bins zone is ONE editable polygon over the ~100 bin points.
 * A bin is "included" (being collected) iff it sits inside the polygon; the
 * bins outside are excluded/skipped. Both mechanisms mutate the same polygon:
 *   • Stepper reduce → `shrinkToContain` scales the polygon toward its centre
 *     to the smallest quad still holding N bins (farthest bins fall outside).
 *   • Manual edit → drag the vertices freely; the count follows bins-inside.
 * ------------------------------------------------------------------------- */

/** The ~100 remaining bins, as a deterministic spiral around the site. */
export const REMAINING_BIN_PTS: LatLng[] = binSpread(NEARBY_MAP.site)

export function polygonCentroid(poly: LatLng[]): LatLng {
  const lat = poly.reduce((t, p) => t + p[0], 0) / poly.length
  const lng = poly.reduce((t, p) => t + p[1], 0) / poly.length
  return [lat, lng]
}

/** Scale a polygon about a centre point by factor `s`. */
export function scalePolygon(poly: LatLng[], s: number, c: LatLng): LatLng[] {
  return poly.map(([la, ln]) => [c[0] + (la - c[0]) * s, c[1] + (ln - c[1]) * s] as LatLng)
}

/** Ray-casting point-in-polygon (lat/lng space). */
export function pointInPolygon(pt: LatLng, poly: LatLng[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i]
    const [yj, xj] = poly[j]
    if (yi > pt[0] !== yj > pt[0] && pt[1] < ((xj - xi) * (pt[0] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function countInside(pts: LatLng[], poly: LatLng[]): number {
  return pts.reduce((n, p) => n + (pointInPolygon(p, poly) ? 1 : 0), 0)
}

/** Base zone: the Figma building footprint inflated enough to enclose all bins,
 *  so `shrinkToContain` can range from "all 100" down to a tight cluster. */
export const REMAINING_ZONE_BASE: LatLng[] = scalePolygon(
  NEARBY_MAP.building,
  1.3,
  polygonCentroid(NEARBY_MAP.building),
)

/** Smallest scaling of `base` (about its centroid) still containing ~`target`
 *  of `pts`. Keeps the bins nearest the centre; excludes the farthest. */
export function shrinkToContain(base: LatLng[], pts: LatLng[], target: number): LatLng[] {
  const c = polygonCentroid(base)
  const t = Math.max(1, Math.min(target, pts.length))
  let lo = 0.02, hi = 1
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2
    if (countInside(pts, scalePolygon(base, mid, c)) >= t) hi = mid
    else lo = mid
  }
  return scalePolygon(base, hi, c)
}

/** The remaining-bins zone at first open — hugs all 100 bins. */
export const REMAINING_ZONE_INITIAL: LatLng[] = shrinkToContain(
  REMAINING_ZONE_BASE,
  REMAINING_BIN_PTS,
  REMAINING_BIN_PTS.length,
)
