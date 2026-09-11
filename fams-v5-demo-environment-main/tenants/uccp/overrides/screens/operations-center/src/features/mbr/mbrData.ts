// Data + geometry for Manual Bin Reassignment, ported from the static prototype
// (app.js "Assign Bins Manually" flow) + the Figma flow (section 2227:70523).
// Dummy data; Doha, Qatar coordinates.

export type LatLng = [number, number]
export type RouteStatus = 'Ongoing' | 'Scheduled'
export type BinCapacity = '2.5 CMB' | '3.2 CMB' | '4.5 CMB' | '7 CMB'
export type BinFrequency = 'Daily' | 'Weekly' | 'Monthly'

export type RemainingBin = {
  id: string
  /** Relative label ("1 day ago"); >7 days uses the absolute form (dev note). */
  last: string
  /** Exact timestamp, shown in the hover tooltip (dev note). */
  exact: string
  capacity: BinCapacity
  frequency: BinFrequency
}

export type NearbyRoute = {
  id: string
  bins: number
  total: number
  status: RouteStatus
  suggest?: boolean
  /** Centre of this route's own service area on the map — every route has a
   *  distinct spot, kept clear of the remaining-bin clusters. */
  routePoint: LatLng
  plan: string
  waste: string
  service: string
  driver: string
  vehicle: string
  helpers: string
  discharge: string
  lot: string
  wasteCollected: string
  startTime: string
  endTime: string
  availableCapacity: string
  distanceToZone: string
}

export type Cluster = {
  center: LatLng
  bins: number
  distance: string
  wastePendVal: string
  wastePendPct: number
  waste: string
  wastePct: number
  wasteOver: boolean
  time: string
  timePct: number
}

export const planDetails = {
  name: 'Al Wakrah Corniche Response Plan',
  driver: 'Yousuf Al-Hajri',
  vehicle: 'LMV-QA14',
  lot: 'Zone-AlWakrah1',
  waste: 'Storm Water',
  service: 'Flood Response',
  binsCollected: '128/170',
  binsLeft: '42 Left',
  wasteCollected: '14,500 L',
  expectedWasteLeft: '2.5 CMB or 1.2 Tons',
}

// Total bins to reassign (drives the "Remaining Bins (n)" count + empty state).
export const TOTAL_REMAINING = 42

export const remainingBins: RemainingBin[] = [
  { id: 'RSN-19', last: '1 day ago', exact: '3 JUL | 09:14', capacity: '2.5 CMB', frequency: 'Daily' },
  { id: 'RSN-20', last: '1 day ago', exact: '3 JUL | 10:02', capacity: '3.2 CMB', frequency: 'Daily' },
  { id: 'RSN-21', last: '20, JUN | 14:42', exact: '20 JUN | 14:42', capacity: '7 CMB', frequency: 'Monthly' },
  { id: 'RSN-22', last: '2 days ago', exact: '2 JUL | 08:37', capacity: '2.5 CMB', frequency: 'Weekly' },
  { id: 'RSN-23', last: '1 day ago', exact: '3 JUL | 11:26', capacity: '4.5 CMB', frequency: 'Daily' },
  { id: 'RSN-24', last: '1 day ago', exact: '3 JUL | 12:05', capacity: '3.2 CMB', frequency: 'Weekly' },
  { id: 'RSN-25', last: '1 day ago', exact: '3 JUL | 13:48', capacity: '2.5 CMB', frequency: 'Daily' },
  { id: 'RSN-26', last: '1 day ago', exact: '3 JUL | 14:19', capacity: '3.2 CMB', frequency: 'Monthly' },
  { id: 'RSN-27', last: '1 day ago', exact: '3 JUL | 15:33', capacity: '2.5 CMB', frequency: 'Daily' },
  { id: 'RSN-28', last: '2 days ago', exact: '2 JUL | 09:51', capacity: '4.5 CMB', frequency: 'Weekly' },
  { id: 'RSN-29', last: '1 day ago', exact: '3 JUL | 16:12', capacity: '3.2 CMB', frequency: 'Daily' },
  { id: 'RSN-30', last: '3 days ago', exact: '1 JUL | 07:45', capacity: '7 CMB', frequency: 'Monthly' },
  { id: 'RSN-31', last: '1 day ago', exact: '3 JUL | 17:28', capacity: '2.5 CMB', frequency: 'Daily' },
  { id: 'RSN-32', last: '13, JUN | 08:20', exact: '13 JUN | 08:20', capacity: '3.2 CMB', frequency: 'Monthly' },
  { id: 'RSN-33', last: '1 day ago', exact: '3 JUL | 18:03', capacity: '2.5 CMB', frequency: 'Daily' },
  { id: 'RSN-34', last: '2 days ago', exact: '2 JUL | 11:40', capacity: '4.5 CMB', frequency: 'Weekly' },
]

export const nearbyRoutes: NearbyRoute[] = [
  { id: 'R#9876236', routePoint: [25.2185, 51.5025], bins: 100, total: 153, status: 'Ongoing', suggest: true, plan: 'Al Rayyan Response Plan', waste: 'Storm Water', service: 'Flood Response', driver: 'Rashid Al-Naimi', vehicle: 'LMV-QA08', helpers: '02', discharge: 'Doha South Discharge Point', lot: 'Zone-North1', wasteCollected: '1.45 Tons', startTime: '20 JAN | 14:00', endTime: '20 JAN | 16:00', availableCapacity: '12 CMB', distanceToZone: '1.2 km' },
  { id: 'R#9876543', routePoint: [25.2110, 51.554], bins: 100, total: 153, status: 'Ongoing', plan: 'Al Wakrah Corniche Response Plan', waste: 'Storm Water', service: 'Flood Response', driver: 'Yousuf Al-Hajri', vehicle: 'LMV-QA08', helpers: '02', discharge: 'Doha South Discharge Point', lot: 'Zone-North1', wasteCollected: '1.45 Tons', startTime: '20 JAN | 14:00', endTime: '20 JAN | 16:00', availableCapacity: '10 CMB', distanceToZone: '0.8 km' },
  { id: 'R#9876544', routePoint: [25.1835, 51.512], bins: 120, total: 200, status: 'Ongoing', plan: 'Lusail Marina Response Plan', waste: 'Storm Water', service: 'Flood Response', driver: 'Khalid Al-Emadi', vehicle: 'LMV-QA03', helpers: '01', discharge: 'Doha South Discharge Point', lot: 'Zone-South1', wasteCollected: '0.92 Tons', startTime: '20 JAN | 15:00', endTime: '20 JAN | 17:00', availableCapacity: '14 CMB', distanceToZone: '2.4 km' },
  { id: 'R#9876545', routePoint: [25.2225, 51.531], bins: 80, total: 120, status: 'Ongoing', plan: 'West Bay Response Plan', waste: 'Storm Water', service: 'Flood Response', driver: 'Bilal Ahmed', vehicle: 'LMV-QA05', helpers: '02', discharge: 'Doha South Discharge Point', lot: 'Zone-North1', wasteCollected: '1.80 Tons', startTime: '20 JAN | 16:00', endTime: '20 JAN | 18:30', availableCapacity: '8 CMB', distanceToZone: '3.1 km' },
  { id: 'R#9876546', routePoint: [25.1800, 51.5485], bins: 180, total: 180, status: 'Scheduled', plan: 'Msheireb Response Plan', waste: 'Storm Water', service: 'Flood Response', driver: 'Naeem Chowdhury', vehicle: 'LMV-QA10', helpers: '02', discharge: 'Doha South Discharge Point', lot: 'Zone-South1', wasteCollected: '2.10 Tons', startTime: '20 JAN | 17:00', endTime: '20 JAN | 19:00', availableCapacity: '16 CMB', distanceToZone: '3.6 km' },
  { id: 'R#9876547', routePoint: [25.2260, 51.488], bins: 250, total: 250, status: 'Scheduled', plan: 'Al Sadd Response Plan', waste: 'Storm Water', service: 'Flood Response', driver: 'Ganesh Reddy', vehicle: 'LMV-QA13', helpers: '03', discharge: 'Doha South Discharge Point', lot: 'Zone-North1', wasteCollected: '2.80 Tons', startTime: '20 JAN | 18:00', endTime: '20 JAN | 20:30', availableCapacity: '20 CMB', distanceToZone: '4.2 km' },
  { id: 'R#9876548', routePoint: [25.1755, 51.4845], bins: 75, total: 75, status: 'Scheduled', plan: 'Doha Corniche Response Plan', waste: 'Storm Water', service: 'Flood Response', driver: 'Fahad Al-Sulaiti', vehicle: 'LMV-QA07', helpers: '01', discharge: 'Doha South Discharge Point', lot: 'Zone-South1', wasteCollected: '0.65 Tons', startTime: '20 JAN | 09:00', endTime: '20 JAN | 11:00', availableCapacity: '9 CMB', distanceToZone: '4.8 km' },
  { id: 'R#9876549', routePoint: [25.2345, 51.567], bins: 130, total: 130, status: 'Scheduled', plan: 'Umm Salal Response Plan', waste: 'Storm Water', service: 'Flood Response', driver: 'Imran Khan', vehicle: 'LMV-QA16', helpers: '02', discharge: 'Doha South Discharge Point', lot: 'Zone-North1', wasteCollected: '1.30 Tons', startTime: '20 JAN | 10:00', endTime: '20 JAN | 12:30', availableCapacity: '11 CMB', distanceToZone: '5.1 km' },
  { id: 'R#9876550', routePoint: [25.1690, 51.562], bins: 160, total: 160, status: 'Scheduled', plan: 'Al Khor Response Plan', waste: 'Storm Water', service: 'Flood Response', driver: 'Muhammad Iqbal', vehicle: 'LMV-QA18', helpers: '02', discharge: 'Doha South Discharge Point', lot: 'Zone-South1', wasteCollected: '1.95 Tons', startTime: '20 JAN | 11:00', endTime: '20 JAN | 13:30', availableCapacity: '15 CMB', distanceToZone: '5.9 km' },
  { id: 'R#9876551', routePoint: [25.2430, 51.518], bins: 90, total: 140, status: 'Ongoing', plan: 'Education City Response Plan', waste: 'Storm Water', service: 'Flood Response', driver: 'Ashraf Hossain', vehicle: 'LMV-QA02', helpers: '02', discharge: 'Doha South Discharge Point', lot: 'Zone-North1', wasteCollected: '1.10 Tons', startTime: '20 JAN | 12:00', endTime: '20 JAN | 14:30', availableCapacity: '13 CMB', distanceToZone: '6.4 km' },
  { id: 'R#9876552', routePoint: [25.1600, 51.526], bins: 110, total: 110, status: 'Scheduled', plan: 'Industrial Area Response Plan', waste: 'Storm Water', service: 'Flood Response', driver: 'Rafiqul Islam', vehicle: 'LMV-QA09', helpers: '01', discharge: 'Doha South Discharge Point', lot: 'Zone-South1', wasteCollected: '1.60 Tons', startTime: '20 JAN | 13:00', endTime: '20 JAN | 15:00', availableCapacity: '18 CMB', distanceToZone: '7.0 km' },
  { id: 'R#9876553', routePoint: [25.2100, 51.467], bins: 60, total: 95, status: 'Ongoing', plan: 'Al Thumama Response Plan', waste: 'Storm Water', service: 'Flood Response', driver: 'Suresh Kumar', vehicle: 'LMV-QA12', helpers: '02', discharge: 'Doha South Discharge Point', lot: 'Zone-North1', wasteCollected: '0.85 Tons', startTime: '20 JAN | 14:30', endTime: '20 JAN | 16:30', availableCapacity: '7 CMB', distanceToZone: '7.8 km' },
]

// Station clusters (Doha) — each becomes one Response Zone when drawn.
// wastePend* = estimate shown before optimizing; the rest fill in after.
export const AB_CLUSTERS: Cluster[] = [
  { center: [25.2060, 51.518], bins: 22, distance: '42 km', wastePendVal: '~2.2/10 CBM', wastePendPct: 22, waste: '~2.2/10 CBM', wastePct: 72, wasteOver: false, time: '~2h30m/3h', timePct: 83 },
  { center: [25.1960, 51.534], bins: 20, distance: '24 km', wastePendVal: '~2.2/12 CBM', wastePendPct: 18, waste: '~2.2/12 CBM', wastePct: 60, wasteOver: false, time: '~2h30m/3h', timePct: 55 },
]

// Which bin-list rows belong to each cluster (highlighted while selected, hidden once optimized).
export const AB_CLUSTER_ROWS: number[][] = [[0, 1, 2, 3, 4, 5, 6, 7], [8, 9, 10, 11, 12, 13, 14, 15]]

export const MAP_CENTER: LatLng = [25.2010, 51.526]

// Where the optimized route ends — the discharge station (POI response-base pin).
export const DISCHARGE_POINT: LatLng = [25.2265, 51.555]

/** Square polygon ring around a center (half-size `d` in degrees). */
export function ring(center: LatLng, d: number): LatLng[] {
  return [
    [center[0] + d, center[1] - d],
    [center[0] + d, center[1] + d],
    [center[0] - d, center[1] + d],
    [center[0] - d, center[1] - d],
  ]
}

/** 20 bin-pin positions (4×5 grid) scattered around a cluster center. */
export function binPinPositions(clusterIdx: number): LatLng[] {
  const c = AB_CLUSTERS[clusterIdx].center
  const out: LatLng[] = []
  for (let r = 0; r < 4; r++) {
    for (let col = 0; col < 5; col++) {
      const lat = c[0] + 0.0055 - r * 0.0026 + ((col * 7) % 3) * 0.0004
      const lng = c[1] - 0.0065 + col * 0.0028 + ((r * 5) % 3) * 0.0004
      out.push([lat, lng])
    }
  }
  return out
}

/** The optimized route: from the assigned route's service area, snake through
 *  the zone's bins row by row (alternating direction), then off to discharge. */
export function optimizedRoute(clusterIdx: number, start: LatLng): LatLng[] {
  const pins = binPinPositions(clusterIdx)
  const snake: LatLng[] = []
  for (let r = 0; r < 4; r++) {
    const row = pins.slice(r * 5, r * 5 + 5)
    snake.push(...(r % 2 ? row.reverse() : row))
  }
  return [start, ...snake, DISCHARGE_POINT]
}

/** Gentle quadratic curve between two points (for the dotted connector). */
export function curve(from: LatLng, to: LatLng): LatLng[] {
  const cp: LatLng = [(from[0] + to[0]) / 2 + 0.003, (from[1] + to[1]) / 2 - 0.006]
  const pts: LatLng[] = []
  for (let t = 0; t <= 1.0001; t += 0.08) {
    const u = 1 - t
    pts.push([
      u * u * from[0] + 2 * u * t * cp[0] + t * t * to[0],
      u * u * from[1] + 2 * u * t * cp[1] + t * t * to[1],
    ])
  }
  return pts
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

/** Centroid of a polygon ring (simple average — fine for small shapes). */
export function centroid(poly: LatLng[]): LatLng {
  const lat = poly.reduce((s, p) => s + p[0], 0) / poly.length
  const lng = poly.reduce((s, p) => s + p[1], 0) / poly.length
  return [lat, lng]
}
