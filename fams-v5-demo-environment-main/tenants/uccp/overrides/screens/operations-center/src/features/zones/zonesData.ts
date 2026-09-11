// Data + geometry for the Zones Management module (Figma "Zones" 10:31063).
// Dummy data; Doha, Qatar coordinates. Geometry lives here, never in the TSX.

export type LatLng = [number, number]

export type ZoneStatus = 'Active' | 'Inactive' | 'Draft'

/**
 * Zone classification shown as a TAG chip in the Live GIS Map's Zones panel
 * (replaces the old PARENT column, 2026-09-01 user spec). Municipality =
 * standard municipal catchment; Black Spot = flood-prone / storm-runoff spot
 * needing priority response; Assembly Point = a civic gathering/evacuation
 * point.
 */
export type ZoneType = 'Municipality' | 'Black Spot' | 'Assembly Point'

export interface Zone {
  /** Zone code shown in the ZONE column (Figma renders it as `Z-1234`). */
  id: string
  /** Human name — the map label + the search's primary key. */
  name: string
  /** Swatch + polygon colour. Unique per zone (see ZONE_PALETTE). */
  color: string
  /** Polygon ring. */
  points: LatLng[]
  tags: string[]
  location: string
  description: string
  status: ZoneStatus
  zoneType: ZoneType
  bins: number
  routes: number
  /** Last edit, pre-formatted (this prototype has no live clock). */
  updated: string
  /** Optional parent zone ID if this is a child zone. */
  parentId?: string | null
  /** Optional child zones array for tree structure. */
  children?: Zone[]
}

/**
 * One distinct hue per zone. These are literal hex, not tokens, because
 * Leaflet paints polygons through SVG `stroke`/`fill` attributes, which can't
 * resolve CSS vars — the same reason `LiveGisMap` keeps ACTUAL/PLANNED as hex.
 * Hues are spread around the wheel so adjacent zones never read as the same
 * colour, and every one clears 3:1 against the CARTO Voyager basemap.
 */
export const ZONE_PALETTE = [
  '#E8833A', // orange
  '#9C4221', // rust
  '#1D4ED8', // blue
  '#7A3E1D', // brown
  '#A855F7', // violet
  '#D97706', // amber
  '#B45309', // sienna
  '#4F46E5', // indigo
  '#DB2777', // pink
  '#15803D', // green
  '#0891B2', // cyan
  '#65A30D', // lime
  '#DC2626', // red
  '#0D9488', // teal
  '#7C3AED', // purple
  '#4D7C0F', // olive
] as const

/** Map viewport home — central Doha, framing every zone below. */
export const ZONES_MAP_CENTER: LatLng = [25.28540, 51.53100]
export const ZONES_MAP_ZOOM = 12

/* ---------------------------------------------------------------------------
 * Geometry
 * ------------------------------------------------------------------------- */

export function polygonCentroid(poly: LatLng[]): LatLng {
  const lat = poly.reduce((t, p) => t + p[0], 0) / poly.length
  const lng = poly.reduce((t, p) => t + p[1], 0) / poly.length
  return [lat, lng]
}

/** Ray-casting point-in-polygon — powers click-to-select on the map. */
export function pointInPolygon(pt: LatLng, poly: LatLng[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i]
    const [yj, xj] = poly[j]
    const intersects = yi > pt[0] !== yj > pt[0] && pt[1] < ((xj - xi) * (pt[0] - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

/** Shoelace area in km², for the expanded row's "Area" stat. */
export function polygonAreaKm2(poly: LatLng[]): number {
  const kmPerDegLat = 110.574
  const lat0 = polygonCentroid(poly)[0]
  const kmPerDegLng = 111.32 * Math.cos((lat0 * Math.PI) / 180)
  let sum = 0
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const x1 = poly[j][1] * kmPerDegLng, y1 = poly[j][0] * kmPerDegLat
    const x2 = poly[i][1] * kmPerDegLng, y2 = poly[i][0] * kmPerDegLat
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

/* ---------------------------------------------------------------------------
 * The zone catalogue — 16 Doha catchment zones, one palette colour each.
 * ------------------------------------------------------------------------- */

/** Everything about a zone except its geometry, which comes from the tables below. */
type ZoneSeed = Omit<Zone, 'color' | 'points'>

const SEEDS: ZoneSeed[] = [
  {
    id: 'Z-1041', name: 'Al Wakrah Industrial 1',
    tags: ['Industrial', 'Daily', 'Storm Runoff', 'Priority'], location: 'Al Wakrah, Doha',
    description: 'Heavy industrial belt monitored twice daily by response tanker fleet.',
    status: 'Active', zoneType: 'Municipality', bins: 214, routes: 6, updated: '24 JUL | 09:12',
  },
  {
    id: 'Z-1042', name: 'Al Wakrah Industrial 2',
    tags: ['Industrial', 'Daily', 'Rain Gauge'], location: 'Al Wakrah, Doha',
    description: 'Workshops and warehousing east of the coastal wetlands.',
    status: 'Active', zoneType: 'Municipality', bins: 168, routes: 4, updated: '24 JUL | 08:40',
  },
  {
    id: 'Z-1043', name: 'Al Sadd',
    tags: ['Mixed Use', 'Daily', 'Drainage Overflow', 'Night Shift'], location: 'Al Sadd, Doha',
    description: 'Mixed residential and retail strip along Al Sadd Street.',
    status: 'Active', zoneType: 'Municipality', bins: 132, routes: 3, updated: '23 JUL | 17:05',
  },
  {
    id: 'Z-1044', name: 'Umm Salal 1',
    tags: ['Residential', 'Alternate Days'], location: 'Umm Salal, Doha',
    description: 'Low-density villa community with wadi-adjacent drainage.',
    status: 'Active', zoneType: 'Municipality', bins: 96, routes: 2, updated: '23 JUL | 14:22',
  },
  {
    id: 'Z-1045', name: 'Umm Salal 2',
    tags: ['Residential', 'Weekly', 'Wadi Monitor'], location: 'Umm Salal, Doha',
    description: 'Villa clusters and grounds south of the wadi channel.',
    status: 'Inactive', zoneType: 'Municipality', bins: 74, routes: 2, updated: '22 JUL | 11:48',
  },
  {
    id: 'Z-1046', name: 'Lusail Marina District',
    tags: ['Commercial', 'Daily', 'Rain Gauge', 'Priority'], location: 'Lusail, Doha',
    description: 'Waterfront commercial district with dense storm-drain coverage.',
    status: 'Active', zoneType: 'Black Spot', bins: 88, routes: 2, updated: '24 JUL | 07:30',
  },
  {
    id: 'Z-1047', name: 'Doha Port', 
    tags: ['Mixed Use', 'Daily', 'Storm Runoff'], location: 'Doha Port, Doha',
    description: 'Waterfront hotels and port district on the corniche.',
    status: 'Active', zoneType: 'Black Spot', bins: 143, routes: 4, updated: '24 JUL | 06:55',
  },
  {
    id: 'Z-1048', name: 'Msheireb Second',
    tags: ['Government', 'Daily', 'Priority'], location: 'Msheireb, Doha',
    description: 'Government precinct on a fixed pre-dawn monitoring window.',
    status: 'Active', zoneType: 'Assembly Point', bins: 61, routes: 2, updated: '23 JUL | 19:10',
  },
  {
    id: 'Z-1049', name: 'Lusail Waterfront',
    tags: ['Residential', 'Daily', 'Rain Gauge'], location: 'Lusail, Doha',
    description: 'High-rise waterfront towers with rooftop sensor arrays.',
    status: 'Active', zoneType: 'Black Spot', bins: 205, routes: 5, updated: '24 JUL | 10:02',
  },
  {
    id: 'Z-1050', name: 'Industrial Area 1',
    tags: ['Industrial', 'Daily', 'Storm Runoff', 'Night Shift'], location: 'Industrial Area, Doha',
    description: 'Largest industrial catchment; pump exchanges run overnight.',
    status: 'Active', zoneType: 'Black Spot', bins: 268, routes: 7, updated: '24 JUL | 05:44',
  },
  {
    id: 'Z-1051', name: 'West Bay',
    tags: ['Commercial', 'Daily', 'Drainage Overflow', 'Priority'], location: 'West Bay, Doha',
    description: 'Dense office towers with restricted daytime vehicle access.',
    status: 'Active', zoneType: 'Assembly Point', bins: 189, routes: 5, updated: '23 JUL | 21:36',
  },
  {
    id: 'Z-1052', name: 'Education City 2',
    tags: ['Mixed Use', 'Daily'], location: 'Education City, Doha',
    description: 'Hamad Medical district and adjoining low-rise residential blocks.',
    status: 'Active', zoneType: 'Assembly Point', bins: 117, routes: 3, updated: '23 JUL | 16:18',
  },
  {
    id: 'Z-1053', name: 'Education City 1',
    tags: ['Residential', 'Alternate Days', 'Wadi Monitor'], location: 'Education City, Doha',
    description: 'Schools, clubs and mid-rise housing around the campus parks.',
    status: 'Draft', zoneType: 'Municipality', bins: 84, routes: 2, updated: '22 JUL | 13:07',
  },
  {
    id: 'Z-1054', name: 'Al Thumama',
    tags: ['Residential', 'Daily', 'Drainage Overflow'], location: 'Al Thumama, Doha',
    description: 'High-occupancy walk-ups; narrow service lanes throughout.',
    status: 'Active', zoneType: 'Municipality', bins: 176, routes: 4, updated: '24 JUL | 08:01',
  },
  {
    id: 'Z-1055', name: 'Doha Corniche Heritage',
    tags: ['Heritage', 'Daily', 'Priority', 'Night Shift'], location: 'Doha Corniche, Doha',
    description: 'Heritage quarter and souks; foot-patrol monitoring in the lanes.',
    status: 'Active', zoneType: 'Black Spot', bins: 151, routes: 4, updated: '23 JUL | 22:49',
  },
  {
    id: 'Z-1056', name: 'Al Khor Corniche',
    tags: ['Mixed Use', 'Daily', 'Storm Runoff'], location: 'Al Khor, Doha',
    description: 'Corniche hotels, fish market and the northern coastal frontage.',
    status: 'Active', zoneType: 'Municipality', bins: 198, routes: 5, updated: '24 JUL | 09:58',
  },
]

/**
 * Zone boundaries, adapted from a real road-network trace (rebased onto Doha).
 *
 * Not hand-drawn: each ring was produced by snapping the zone's corners to the
 * nearest junction in the OpenStreetMap arterial graph (motorway → tertiary,
 * plus local streets where Bu Kadra and Creek Harbour have no arterial
 * circuit), routing the shortest path along the roads between consecutive
 * corners, then cleaning the result — dual carriageways and slip roads make a
 * routed ring cross itself, so it is closed, opened to shed dead-end spurs,
 * and simplified to ~25 m. Every edge therefore follows a real street.
 *
 * Regenerate rather than edit by hand; the polygons are validated to be simple
 * and mutually non-overlapping.
 */
const CUSTOM_GEOMETRIES: Record<string, LatLng[]> = {
  'Z-1041': [[25.26206, 51.55464], [25.26278, 51.55451], [25.26329, 51.55518],
    [25.26397, 51.56995], [25.26507, 51.57459], [25.26450, 51.57584], [25.26444, 51.58731],
    [25.26375, 51.58806], [25.26030, 51.58754], [25.25973, 51.58679], [25.25997, 51.56466],
    [25.25911, 51.56092], [25.25939, 51.55554], [25.25994, 51.55478]],
  'Z-1042': [[25.25926, 51.58764], [25.26295, 51.58789], [25.26357, 51.58864],
    [25.26305, 51.59399], [25.26165, 51.59552], [25.25946, 51.59526], [25.25171, 51.59275],
    [25.25171, 51.58833], [25.25206, 51.58765]],
  'Z-1043': [[25.26721, 51.53076], [25.26801, 51.53074], [25.27231, 51.53359],
    [25.27275, 51.53424], [25.27263, 51.53494], [25.26346, 51.53739], [25.26006, 51.53959],
    [25.25916, 51.53939], [25.25897, 51.53870], [25.25984, 51.53348], [25.26149, 51.53325]],
  'Z-1044': [[25.23185, 51.52228], [25.23607, 51.52309], [25.23640, 51.52389],
    [25.23552, 51.52516], [25.23559, 51.52662], [25.23627, 51.52675], [25.23741, 51.52530],
    [25.23825, 51.52530], [25.23988, 51.52700], [25.24089, 51.53103], [25.24494, 51.53259],
    [25.24537, 51.53315], [25.24481, 51.54503], [25.23727, 51.54950], [25.23648, 51.54913],
    [25.23355, 51.54287], [25.23287, 51.53780], [25.22800, 51.53206], [25.22700, 51.52876],
    [25.22755, 51.52627], [25.22899, 51.52411]],
  'Z-1045': [[25.24571, 51.55268], [25.24643, 51.55282], [25.24737, 51.55420],
    [25.24663, 51.58677], [25.24579, 51.59024], [25.24507, 51.59071], [25.23915, 51.58898],
    [25.23976, 51.58390], [25.23731, 51.57645], [25.23335, 51.57775], [25.22956, 51.57844],
    [25.22577, 51.58050], [25.22061, 51.57253], [25.22125, 51.57129], [25.24432, 51.55322]],
  'Z-1046': [[25.25943, 51.51237], [25.25974, 51.51173], [25.26039, 51.51159],
    [25.26221, 51.51330], [25.26199, 51.51576], [25.26347, 51.51800], [25.26671, 51.51722],
    [25.26739, 51.51627], [25.26759, 51.51509], [25.26947, 51.51424], [25.27048, 51.51275],
    [25.27131, 51.51294], [25.27218, 51.51465], [25.27205, 51.51563], [25.26908, 51.51801],
    [25.27012, 51.52053], [25.26871, 51.52203], [25.26647, 51.52728], [25.26504, 51.52749],
    [25.26445, 51.52721], [25.26286, 51.52296], [25.26103, 51.52364], [25.26029, 51.52318],
    [25.26031, 51.52213], [25.26144, 51.52145], [25.26173, 51.52016], [25.26144, 51.51967],
    [25.26038, 51.51931], [25.25924, 51.51737]],
  'Z-1047': [[25.29192, 51.54707], [25.29273, 51.54634], [25.29850, 51.54768],
    [25.30311, 51.55014], [25.30387, 51.55467], [25.30538, 51.55733], [25.30265, 51.55976],
    [25.30299, 51.56182], [25.30099, 51.56364], [25.30117, 51.56503], [25.30074, 51.56567],
    [25.29990, 51.56554], [25.29720, 51.56226], [25.29743, 51.56075], [25.29484, 51.55246],
    [25.29189, 51.54851]],
  'Z-1048': [[25.27252, 51.51582], [25.27301, 51.51536], [25.27358, 51.51543],
    [25.27694, 51.51743], [25.27883, 51.51930], [25.28045, 51.51828], [25.28530, 51.51875],
    [25.28602, 51.51672], [25.28652, 51.51629], [25.28992, 51.51688], [25.29044, 51.51731],
    [25.29083, 51.51894], [25.29858, 51.52140], [25.29904, 51.52241], [25.29378, 51.52810],
    [25.28846, 51.53510], [25.28524, 51.53711], [25.28409, 51.53723], [25.27958, 51.53391],
    [25.27714, 51.52667], [25.27516, 51.52354], [25.27078, 51.51919], [25.27076, 51.51836]],
  'Z-1049': [[25.27612, 51.57531], [25.27714, 51.57519], [25.27811, 51.57655],
    [25.28507, 51.58235], [25.28408, 51.58777], [25.28372, 51.58829], [25.28173, 51.58832],
    [25.28103, 51.58905], [25.28038, 51.58912], [25.27995, 51.58868], [25.27949, 51.58679],
    [25.27903, 51.58646], [25.27444, 51.58744], [25.26549, 51.58198], [25.26549, 51.57779],
    [25.26756, 51.57574]],
  'Z-1050': [[25.23629, 51.45707], [25.23732, 51.45685], [25.24141, 51.46077],
    [25.24135, 51.46148], [25.23893, 51.46600], [25.24052, 51.46840], [25.24196, 51.47225],
    [25.23666, 51.47964], [25.23627, 51.48593], [25.23549, 51.48648], [25.23298, 51.48659],
    [25.22087, 51.48609], [25.22051, 51.48514], [25.22178, 51.48314], [25.22153, 51.48090],
    [25.22277, 51.47705], [25.23235, 51.46228], [25.23322, 51.46170]],
  'Z-1051': [[25.26259, 51.48498], [25.26297, 51.48440], [25.26355, 51.48433],
    [25.26674, 51.48697], [25.26824, 51.48647], [25.27115, 51.48799], [25.27315, 51.49100],
    [25.27259, 51.49274], [25.27384, 51.49401], [25.27386, 51.49488], [25.27339, 51.49528],
    [25.27245, 51.49530], [25.26940, 51.49726], [25.26886, 51.50101], [25.26678, 51.50260],
    [25.26962, 51.50661], [25.26961, 51.50733], [25.26907, 51.50786], [25.26840, 51.50774],
    [25.26232, 51.50306], [25.26020, 51.50088], [25.26035, 51.49843], [25.25834, 51.49465],
    [25.25825, 51.49062], [25.25730, 51.48954], [25.25731, 51.48876], [25.25860, 51.48702],
    [25.26189, 51.48771]],
  'Z-1052': [[25.30889, 51.52410], [25.30975, 51.52444], [25.31093, 51.52742],
    [25.31268, 51.52779], [25.31313, 51.52839], [25.31264, 51.52982], [25.31290, 51.53107],
    [25.31208, 51.53190], [25.31115, 51.53430], [25.31257, 51.53593], [25.31228, 51.54181],
    [25.31161, 51.54251], [25.31039, 51.54240], [25.30633, 51.54081], [25.30586, 51.54012],
    [25.30617, 51.53934], [25.30808, 51.53822], [25.30996, 51.53277], [25.30969, 51.52894],
    [25.30860, 51.52832], [25.30814, 51.52698], [25.30684, 51.52616], [25.30656, 51.52559],
    [25.30696, 51.52475]],
  'Z-1053': [[25.31852, 51.53347], [25.31832, 51.53244], [25.31913, 51.53198],
    [25.32877, 51.53503], [25.32943, 51.53591], [25.32886, 51.53689], [25.32438, 51.54090],
    [25.32360, 51.54716], [25.31917, 51.54872], [25.31836, 51.54811], [25.31727, 51.54264],
    [25.31775, 51.54213], [25.32165, 51.54133], [25.32203, 51.54071], [25.32158, 51.53832],
    [25.31922, 51.53595], [25.31935, 51.53437]],
  'Z-1054': [[25.32477, 51.51840], [25.32551, 51.51800], [25.32691, 51.51877],
    [25.32739, 51.52028], [25.33037, 51.52245], [25.32856, 51.52697], [25.33207, 51.52928],
    [25.33241, 51.52999], [25.32991, 51.53502], [25.32298, 51.53302], [25.32246, 51.53247],
    [25.32353, 51.52775], [25.32446, 51.52548], [25.32401, 51.52454], [25.32279, 51.52376],
    [25.32261, 51.52308], [25.32348, 51.52114], [25.32352, 51.51975]],
  'Z-1055': [[25.33185, 51.51025], [25.33263, 51.50981], [25.33527, 51.51068],
    [25.33808, 51.51002], [25.33945, 51.51008], [25.34309, 51.51240], [25.34305, 51.51335],
    [25.34152, 51.51461], [25.34127, 51.51650], [25.34050, 51.51755], [25.34042, 51.52160],
    [25.34087, 51.52492], [25.34051, 51.52561], [25.33974, 51.52564], [25.33646, 51.52346],
    [25.33595, 51.52369], [25.33440, 51.52614], [25.33203, 51.52482], [25.33198, 51.52404],
    [25.33355, 51.52048], [25.32940, 51.51556]],
  'Z-1056': [[25.35238, 51.52732], [25.35311, 51.52762], [25.35467, 51.53018],
    [25.35717, 51.53525], [25.35670, 51.53695], [25.35674, 51.53930], [25.35628, 51.54032],
    [25.35441, 51.54106], [25.34794, 51.54222], [25.34516, 51.54153], [25.34137, 51.53893],
    [25.34127, 51.53787], [25.34496, 51.53250], [25.34572, 51.52916], [25.34907, 51.52795]],
}


/**
 * Child rings, carved out of their parent's road-following ring: the parent
 * eroded by a size-proportional margin and clipped to one end of its own
 * bounding box. Scaling a ring toward its centroid — the previous approach —
 * only guarantees containment for convex shapes, and these parents are
 * concave, so children leaked outside. Every child here is verified to sit
 * exactly inside its parent.
 */
const CHILD_GEOMETRIES: Record<string, LatLng[]> = {
  'Z-1232': [[25.26262, 51.55498], [25.26289, 51.55535], [25.26357, 51.56998],
    [25.26402, 51.57194], [25.26029, 51.57194], [25.26037, 51.56463], [25.25951, 51.56087],
    [25.25978, 51.55571], [25.26015, 51.55521], [25.26212, 51.55507]],
  'Z-24232': [[25.26410, 51.57580], [25.26404, 51.58712], [25.26361, 51.58759],
    [25.26051, 51.58713], [25.26013, 51.58663], [25.26031, 51.57064], [25.26371, 51.57064],
    [25.26464, 51.57454]],
  'Z-1044-A': [[25.23573, 51.52381], [25.23496, 51.52507], [25.23513, 51.52698],
    [25.23544, 51.52722], [25.23644, 51.52735], [25.23767, 51.52593], [25.23803, 51.52593],
    [25.23937, 51.52734], [25.24048, 51.53146], [25.24460, 51.53313], [25.24478, 51.53336],
    [25.24464, 51.53639], [25.23245, 51.53639], [25.22850, 51.53173], [25.22760, 51.52874],
    [25.22808, 51.52654], [25.22938, 51.52458], [25.23196, 51.52294], [25.23567, 51.52365]],
  'Z-1044-B': [[25.23724, 51.54880], [25.23690, 51.54864], [25.23410, 51.54267],
    [25.23338, 51.53753], [25.23157, 51.53536], [25.24469, 51.53536], [25.24425, 51.54464]],
  'Z-1050-1': [[25.24075, 51.46106], [25.23830, 51.46603], [25.23996, 51.46874],
    [25.24124, 51.47214], [25.23609, 51.47933], [25.23566, 51.48554], [25.23530, 51.48580],
    [25.23083, 51.48581], [25.23083, 51.46582], [25.23279, 51.46280], [25.23373, 51.46210],
    [25.23665, 51.45770], [25.23713, 51.45760]],
  'Z-1050-2': [[25.22123, 51.48523], [25.22238, 51.48334], [25.22218, 51.48098],
    [25.22334, 51.47737], [25.23163, 51.46459], [25.23163, 51.48584], [25.22130, 51.48541]],
  'Z-1234': [[25.26332, 51.56999], [25.26370, 51.57167], [25.26086, 51.57167],
    [25.26086, 51.55543], [25.26252, 51.55527], [25.26265, 51.55545]],
  'Z-1235': [[25.26245, 51.55554], [25.26298, 51.56698], [25.26106, 51.56698],
    [25.26106, 51.55563]],
}

const RAW_ZONES: Zone[] = SEEDS.map((seed, i) => ({
  ...seed,
  color: ZONE_PALETTE[i % ZONE_PALETTE.length],
  points: CUSTOM_GEOMETRIES[seed.id],
}))

/** Attach the child zones to their parents, forming the tree the list renders. */
export const ZONES: Zone[] = RAW_ZONES.map((zone) => {
  if (zone.id === 'Z-1041') {
    return {
      ...zone,
      children: [
        {
          id: 'Z-1232',
          name: 'Al Wakrah Sector A',
          color: ZONE_PALETTE[1],
          points: CHILD_GEOMETRIES['Z-1232'],
          tags: ['Tajmee', 'Lot2', 'Priority'],
          location: 'Doha, Al Wakrah Road, Building 12, Apartment 34',
          description: 'Industrial sector A lot with heavy tanker access.',
          status: 'Active',
          zoneType: 'Municipality',
          bins: 84,
          routes: 2,
          updated: '24 JUL | 09:00',
          parentId: 'Z-1041',
          children: [
            {
              id: 'Z-1234',
              name: 'Al Wakrah Sub-Block 1',
              color: ZONE_PALETTE[2],
              points: CHILD_GEOMETRIES['Z-1234'],
              tags: ['Tajmee', 'Lot1'],
              location: 'Al Wakrah Block 1, Doha',
              description: 'Sub-block 1 monitoring point.',
              status: 'Active',
          zoneType: 'Municipality',
              bins: 42,
              routes: 1,
              updated: '24 JUL | 08:30',
              parentId: 'Z-1232',
              children: [
                {
                  id: 'Z-1235',
                  name: 'Al Wakrah Unit 1A',
                  color: ZONE_PALETTE[3],
                  points: CHILD_GEOMETRIES['Z-1235'],
                  tags: ['Lot1'],
                  location: 'Al Wakrah Unit 1A, Doha',
                  description: 'Water-level sensor monitoring unit.',
                  status: 'Active',
          zoneType: 'Municipality',
                  bins: 18,
                  routes: 1,
                  updated: '24 JUL | 08:15',
                  parentId: 'Z-1234',
                },
              ],
            },
          ],
        },
        {
          id: 'Z-24232',
          name: 'Al Wakrah Sector B',
          color: ZONE_PALETTE[4],
          points: CHILD_GEOMETRIES['Z-24232'],
          tags: ['Lot2', 'Storm Runoff'],
          location: 'Doha, Al Wakrah Industrial 1',
          description: 'Warehousing and logistics zone B.',
          status: 'Active',
          zoneType: 'Municipality',
          bins: 62,
          routes: 2,
          updated: '24 JUL | 08:45',
          parentId: 'Z-1041',
        },
      ],
    }
  }

  if (zone.id === 'Z-1044') {
    return {
      ...zone,
      children: [
        {
          id: 'Z-1044-A',
          name: 'Umm Salal Villas Sector',
          color: ZONE_PALETTE[6],
          points: CHILD_GEOMETRIES['Z-1044-A'],
          tags: ['Residential', 'Wadi Monitor'],
          location: 'Umm Salal 1, Doha',
          description: 'Residential villa street clusters.',
          status: 'Active',
          zoneType: 'Municipality',
          bins: 48,
          routes: 1,
          updated: '23 JUL | 14:00',
          parentId: 'Z-1044',
        },
        {
          id: 'Z-1044-B',
          name: 'Umm Salal Sports Hub',
          color: ZONE_PALETTE[7],
          points: CHILD_GEOMETRIES['Z-1044-B'],
          tags: ['Sports', 'Alternate Days'],
          location: 'Umm Salal 1, Doha',
          description: 'Sports complex monitoring zone.',
          status: 'Active',
          zoneType: 'Assembly Point',
          bins: 48,
          routes: 1,
          updated: '23 JUL | 14:10',
          parentId: 'Z-1044',
        },
      ],
    }
  }

  if (zone.id === 'Z-1050') {
    return {
      ...zone,
      children: [
        {
          id: 'Z-1050-1',
          name: 'Industrial Area Art Quarter',
          color: ZONE_PALETTE[8],
          points: CHILD_GEOMETRIES['Z-1050-1'],
          tags: ['Industrial', 'Rain Gauge'],
          location: 'Industrial Area, Doha',
          description: 'Arts district & gallery surroundings.',
          status: 'Active',
          zoneType: 'Black Spot',
          bins: 120,
          routes: 3,
          updated: '24 JUL | 05:30',
          parentId: 'Z-1050',
        },
        {
          id: 'Z-1050-2',
          name: 'Industrial Area Heavy Industrial',
          color: ZONE_PALETTE[9],
          points: CHILD_GEOMETRIES['Z-1050-2'],
          tags: ['Industrial', 'Night Shift'],
          location: 'Industrial Area 1, Doha',
          description: 'Heavy machinery and foundry monitoring point.',
          status: 'Active',
          zoneType: 'Black Spot',
          bins: 148,
          routes: 4,
          updated: '24 JUL | 05:40',
          parentId: 'Z-1050',
        },
      ],
    }
  }

  return zone
})

/** Helper to flatten all root and nested child zones into a single flat array. */
export function flattenZones(zones: Zone[]): Zone[] {
  const result: Zone[] = []
  function traverse(list: Zone[]) {
    for (const z of list) {
      result.push(z)
      if (z.children && z.children.length > 0) {
        traverse(z.children)
      }
    }
  }
  traverse(zones)
  return result
}

/**
 * TAG chip tint classes per zone type, following the app's existing
 * tinted-chip convention (see `ParentZoneField`/tag chips in `ZonesMap.tsx`):
 * a translucent background + matching text + matching border, semantic per
 * type — Municipality reads neutral/blue, Black Spot reads red/orange
 * (hazard), Assembly Point reads green (safe/gather).
 */
export const ZONE_TYPE_TINT: Record<ZoneType, string> = {
  Municipality: 'bg-blue-500/12 text-blue-700 dark:text-blue-400 border-blue-500/20',
  'Black Spot': 'bg-red-500/12 text-red-700 dark:text-red-400 border-red-500/20',
  'Assembly Point': 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
}

/** Every tag in use, for the tag filter popover. */
export const ALL_TAGS = [...new Set(flattenZones(ZONES).flatMap((z) => z.tags))].sort()

/** Next free palette colour, so a newly drawn zone stays unique. */
export function nextZoneColor(taken: string[]): string {
  return ZONE_PALETTE.find((c) => !taken.includes(c)) ?? ZONE_PALETTE[taken.length % ZONE_PALETTE.length]
}

/** Next free zone code, continuing the Z-1041… sequence. */
export function nextZoneId(existing: string[]): string {
  const max = existing.reduce((m, id) => Math.max(m, Number(id.replace(/\D/g, '')) || 0), 1040)
  return `Z-${max + 1}`
}

/** CSV for the toolbar's Export action. */
export function zonesToCsv(zones: Zone[]): string {
  const allFlat = flattenZones(zones)
  const head = ['Zone', 'Name', 'Tags', 'Location', 'Description', 'Status', 'Stations', 'Routes', 'Area (km²)', 'Updated']
  const rows = allFlat.map((z) => [
    z.id, z.name, z.tags.join(' | '), z.location, z.description,
    z.status, String(z.bins), String(z.routes), polygonAreaKm2(z.points).toFixed(2), z.updated,
  ])
  return [head, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
}
