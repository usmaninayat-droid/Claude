import {
  TableCell,
  VehicleIcon3D,
  type DataTableColumn,
  type DataTableGroupBy,
  type VehicleStatusTone,
} from '@fams/ui-kit'
import { AlertTriangle, Gauge, MapPin, Route } from '@fams/ui-kit/icons'

/**
 * data-table-fleet.tsx — the ONE realistic fleet dataset + column sets every
 * table on the Data Table demo page renders.
 *
 * WHY: the page used to show five rows of `plate / driver / lot / fuel %`
 * plain-text placeholder columns, which looked nothing like the list a
 * designer actually opens in the demo environment. It now mirrors the real
 * product surfaces, cell for cell:
 *
 *  - `LIVE_LIST_COLUMNS` — Live Monitoring ▸ **List View** (NAME · ID · TYPE ·
 *    LOCATION): a 39×29 `VehicleIcon3D` thumb with its 15px status-dot badge
 *    overlapping the bottom-start corner, then the vehicle name; a fixed-id
 *    plate; the type; and the location behind a map-pin glyph. 48px rows,
 *    40px uppercase header, bottom-only row dividers — all `DataTable`
 *    defaults, nothing overridden here.
 *  - `PANE_COLUMNS` — the **Hybrid View**'s ~440px list pane (VEHICLE ·
 *    ACTIVITY OVERVIEW · SPEED) at `density="compact"`.
 *  - `FLEET_COLUMNS` — the same rows widened with the STATUS pill / BRAND /
 *    ODOMETER / TAGS columns the Vehicles (asset) list shows, for the
 *    sorting / selection / pagination / state sections.
 *
 * Every cell goes through `ui-kit`'s own `TableCell` kinds — `entity`,
 * `icon-value`, `metrics`, `badge`, `text` — so what a designer sees here is
 * reproducible from the core package alone. (Those three first kinds were
 * moved down INTO `ui-kit` for exactly this reason on 2026-09-07; before
 * that the look existed only in `@fams/v5-templates`/`@fams/v5-composer`
 * and could not be built from `DataTable` + `TableCell`.)
 *
 * Realistic demo DATA is deliberate and allowed in the showcase — the
 * no-business-vocabulary rule governs component PROPS, not demo fixtures.
 */

export type FleetStatus = 'moving' | 'idling' | 'stopped' | 'offline'

export interface FleetRow {
  id: string
  name: string
  plate: string
  type: string
  location: string
  depot: string
  status: FleetStatus
  /** Critical events today — `undefined` renders the metric's en-dash. */
  events?: number
  trips: number
  speed: number
  /** Relative time the SPEED cell trails with, e.g. `12 secs` / `since 20 mins`. */
  since: string
  brand: string
  odometer: number
  tags: string[]
  driver: string
}

/** Mobility status → the closed `VehicleIcon3D` badge tone. */
const STATUS_TONE: Record<FleetStatus, VehicleStatusTone> = {
  moving: 'success',
  idling: 'warning',
  stopped: 'error',
  offline: 'muted',
}

const STATUS_LABEL: Record<FleetStatus, string> = {
  moving: 'Moving',
  idling: 'Idling',
  stopped: 'Stopped',
  offline: 'Non-Reporting',
}

const STATUS_BADGE: Record<FleetStatus, 'success' | 'warning' | 'destructive' | 'muted'> = {
  moving: 'success',
  idling: 'warning',
  stopped: 'destructive',
  offline: 'muted',
}

const LOCATIONS = [
  'Hamad International Airport, Qatar',
  'Al Wakrah, Qatar',
  'Al Rayyan, Qatar',
  'Lusail, Qatar',
  'Umm Salal, Qatar',
  'Al Khor, Qatar',
  'Industrial Area, Qatar',
  'Doha Corniche, Doha',
  'West Bay, Qatar',
  'Mesaieed, Qatar',
  'Al Shamal, Qatar',
  'Education City, Qatar',
  'Msheireb, Qatar',
  'Al Sadd, Qatar',
  'Duhail, Qatar',
]
const PLATES = [
  '849 993', '311 078', '725 931', '692 241', '916 794', '572 177', '497 526', '632 646',
  '983 993', '298 277', '786 296', '850 509', '933 479', '733 661', '663 471', '362 965',
  '401 118', '558 204', '117 640', '905 332', '284 917', '671 505', '448 273', '739 812',
  '520 664', '188 095', '974 236', '356 741', '812 459', '243 880',
]
const TYPES = ['Tanker', 'Truck', 'Pickup', 'Sweeper', 'Van']
const BRANDS = ['Hino', 'MAN', 'Nissan', 'Ford', 'Toyota']
const DRIVERS = [
  'Rashid Al Mansoori', 'Kareem Haddad', 'Omar Farouk', 'Yusuf Iqbal', 'Bilal Chaudhry',
  'Salim Nasser', 'Ahmed Al Kuwari', 'Hamad Al Attiyah',
]
const DEPOTS = ['Doha Depot', 'Al Wakrah Depot', 'Industrial Area Depot']
const STATUSES: FleetStatus[] = ['stopped', 'moving', 'idling', 'stopped', 'idling', 'moving']
const SINCE_MOVING = ['Just Now', '12 secs', '29 secs', '1 min', '3 mins']
const SINCE_STILL = ['since 20 mins', 'for 12 mins', 'since 3 hrs', 'for 20 secs', 'since 1 hr 35 mins']

/**
 * 30 rows, generated from the fixture tables above rather than typed out —
 * the page needs enough rows for pagination/virtualization to be real, and a
 * hand-written 30-row literal would be 200 lines of noise with no extra
 * information in it. Deterministic: no `Math.random`, so screenshots and
 * visual diffs are stable.
 */
export const FLEET_ROWS: FleetRow[] = Array.from({ length: 30 }, (_, i) => {
  const status = STATUSES[i % STATUSES.length]
  const moving = status === 'moving'
  const type = TYPES[i % TYPES.length]
  return {
    id: `VEH-${String(i + 1).padStart(2, '0')}`,
    name: `${type} ${String(i + 1).padStart(2, '0')}`,
    plate: PLATES[i],
    type,
    location: LOCATIONS[i % LOCATIONS.length],
    depot: DEPOTS[i % DEPOTS.length],
    status,
    events: i % 4 === 3 ? undefined : (i % 4) + 1,
    trips: (i % 8) + 1,
    speed: moving ? 28 + ((i * 13) % 52) : 0,
    since: moving ? SINCE_MOVING[i % SINCE_MOVING.length] : SINCE_STILL[i % SINCE_STILL.length],
    brand: BRANDS[i % BRANDS.length],
    odometer: 21_024 + i * 5_617,
    tags: type === 'Tanker' ? ['hazmat'] : [],
    driver: DRIVERS[i % DRIVERS.length],
  }
})

/** The 39×29 list thumb + its status-dot badge — the row's identity media. */
export function fleetThumb(row: FleetRow) {
  return <VehicleIcon3D size="sm" art="tanker" tone={STATUS_TONE[row.status]} badge="start" />
}

/* ------------------------------------------------------------------ *
 * Live Monitoring ▸ List View — NAME · ID · TYPE · LOCATION
 * ------------------------------------------------------------------ */

export const LIVE_LIST_COLUMNS: DataTableColumn<FleetRow>[] = [
  {
    key: 'name',
    label: 'Name',
    isSortable: true,
    contentType: 'variable-id',
    minWidth: '13rem',
    render: (row) => <TableCell kind="entity" media={fleetThumb(row)} label={row.name} />,
  },
  {
    key: 'plate',
    label: 'ID',
    isSortable: true,
    contentType: 'fixed-id',
    render: (row) => <TableCell kind="text" value={row.plate} />,
  },
  {
    key: 'type',
    label: 'Type',
    isSortable: true,
    contentType: 'fixed-content',
    render: (row) => <TableCell kind="text" value={row.type} />,
  },
  {
    key: 'location',
    label: 'Location',
    contentType: 'descriptive',
    render: (row) => (
      <TableCell kind="icon-value" icon={<MapPin />} iconLabel="Address" value={row.location} />
    ),
  },
]

/* ------------------------------------------------------------------ *
 * Hybrid View ▸ ~440px list pane — VEHICLE · ACTIVITY OVERVIEW · SPEED
 * ------------------------------------------------------------------ */

/** SPEED reads `74 km/h · 12 secs` — the reading, then a muted relative time. */
function speedValue(row: FleetRow) {
  return row.speed > 0 ? (
    <>
      {row.speed} km/h <span className="text-muted-foreground">· {row.since}</span>
    </>
  ) : (
    <span className="text-muted-foreground">{row.since}</span>
  )
}

export const PANE_COLUMNS: DataTableColumn<FleetRow>[] = [
  {
    key: 'plate',
    label: 'Vehicle',
    contentType: 'variable-id',
    minWidth: '7.4375rem',
    render: (row) => <TableCell kind="entity" media={fleetThumb(row)} label={row.plate} />,
  },
  {
    key: 'activity',
    label: 'Activity overview',
    contentType: 'fixed-content',
    minWidth: '9.25rem',
    render: (row) => (
      <TableCell
        kind="metrics"
        metrics={[
          { id: 'events', icon: <AlertTriangle />, value: row.events, label: 'Critical events', tone: 'danger' },
          { id: 'trips', icon: <Route />, value: row.trips, label: 'Trips today' },
          { id: 'speed', icon: <Gauge />, value: `${row.speed} km/h`, label: 'Current speed' },
        ]}
      />
    ),
  },
  {
    key: 'speed',
    label: 'Speed',
    contentType: 'fixed-content',
    minWidth: '8.75rem',
    render: (row) => <TableCell kind="text" value={speedValue(row)} />,
  },
]

/* ------------------------------------------------------------------ *
 * The wider Vehicles (asset) list shape — status pill, brand, odometer, tags
 * ------------------------------------------------------------------ */

export const FLEET_COLUMNS: DataTableColumn<FleetRow>[] = [
  ...LIVE_LIST_COLUMNS,
  {
    key: 'status',
    label: 'Status',
    isSortable: true,
    group: 'Telematics',
    contentType: 'fixed-content',
    render: (row) => (
      <TableCell kind="badge" label={STATUS_LABEL[row.status]} variant={STATUS_BADGE[row.status]} uppercase />
    ),
  },
  {
    key: 'brand',
    label: 'Brand',
    isSortable: true,
    group: 'Details',
    contentType: 'fixed-content',
    render: (row) => <TableCell kind="text" value={row.brand} />,
  },
  {
    key: 'odometer',
    label: 'Odometer',
    isSortable: true,
    align: 'end',
    group: 'Details',
    contentType: 'fixed-content',
    render: (row) => (
      <TableCell
        align="end"
        kind="text"
        value={
          <>
            {row.odometer.toLocaleString()} <span className="text-muted-foreground">km</span>
          </>
        }
      />
    ),
  },
  {
    key: 'tags',
    label: 'Tags',
    group: 'Details',
    contentType: 'fixed-content',
    render: (row) =>
      row.tags.length ? (
        <TableCell
          kind="badges"
          size="xs"
          badges={row.tags.map((tag) => ({ id: tag, label: tag, variant: 'muted' }))}
        />
      ) : (
        <TableCell kind="empty" />
      ),
  },
]

/** The default visible/ordered keys for `FLEET_COLUMNS`. */
export const FLEET_COLUMN_ORDER = FLEET_COLUMNS.map((c) => c.key)

/** Groups the fleet by home depot — a real, meaningful partition key. */
export const FLEET_GROUP_BY: DataTableGroupBy<FleetRow> = {
  getGroupKey: (row) => row.depot,
}

/**
 * The narrow "list beside a map" stacked layout reads the same rows through
 * plain columns — `layout="stacked"` folds every non-identifier column onto
 * its own `label value` line, so a rich `render` would be redundant there.
 */
export const STACKED_COLUMNS: DataTableColumn<FleetRow>[] = [
  { key: 'plate', label: 'Plate' },
  { key: 'name', label: 'Vehicle' },
  { key: 'type', label: 'Type' },
  { key: 'depot', label: 'Depot' },
]

/* ------------------------------------------------------------------ *
 * The same rows through the four `contentType` truncation rules
 * ------------------------------------------------------------------ */

export const CONTENT_TYPE_COLUMNS: DataTableColumn<FleetRow>[] = [
  { key: 'plate', label: 'Plate', contentType: 'fixed-id' },
  {
    key: 'driver',
    label: 'Driver / Vehicle',
    contentType: 'variable-id',
    render: (row) => (
      <TableCell kind="text" value={`${row.driver} in ${row.name} ${row.plate}`} />
    ),
  },
  { key: 'location', label: 'Address', contentType: 'descriptive' },
  {
    key: 'speed',
    label: 'Speed (km/h)',
    contentType: 'fixed-content',
    align: 'end',
    render: (row) => <TableCell align="end" kind="text" value={row.speed} />,
  },
]

/**
 * The hybrid pane's column set with NO `contentType` on any column — the
 * shape that exposed the 2026-09-07 identity-column auto-hide bug, kept as
 * the regression demo. Raw `row[key]` cells on purpose: this section is
 * about width behaviour, not cell anatomy.
 */
export const UNCLASSIFIED_COLUMNS: DataTableColumn<FleetRow>[] = [
  { key: 'name', label: 'Name' },
  { key: 'plate', label: 'ID' },
  { key: 'type', label: 'Type' },
  { key: 'location', label: 'Location' },
]
