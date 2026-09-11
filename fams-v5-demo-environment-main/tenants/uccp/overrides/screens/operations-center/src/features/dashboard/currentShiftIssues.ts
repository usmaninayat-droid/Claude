// "Current Shift Issues" side-sheet data (Figma node 2227:97177).
// Each issue = a route whose assigned tanker/crew failed + a suggested
// replacement, with dispatch actions.
//
// DATA LINKAGE (2026-09-01 cross-module audit — Build Delegate/
// DATA-LINKAGE.md): the two FAILED tankers are the only two tankers actually
// out of rotation — LMV-QA04 (the 1 breakdown) and LMV-QA16 (the 1 inactive,
// waiting parts) per `statusBreakdowns.ts` and `binRepair.ts`. The two
// SUGGESTED tankers are drawn from the 3-strong standby bucket (LMV-QA01/13/
// 18). Route ids and plan titles come from `plan-monitoring.seed.json`, and
// every driver name is that tanker's driver in `live-monitoring.seed.json`.

export type BadgeTone = 'warning' | 'info'
export type SideTone = 'error' | 'info'

export interface VehicleLine {
  plate: string
  model: string
  badge?: { label: string; tone: BadgeTone }
  struck?: boolean
}

export interface DriverLine {
  code: string
  name: string
  badge?: { label: string; tone: BadgeTone }
  struck?: boolean
}

export interface MetaLine {
  count: string
  /** Completion donut % — shown for the currently-assigned (in-progress) route only. */
  pct?: number
  chips: string[]
}

export interface Assignment {
  vehicle: VehicleLine
  driver?: DriverLine
  meta?: MetaLine
  side: { label: string; tone: SideTone }
}

/** Map detail shown when this issue's card is selected. */
export interface IssueMap {
  /** Standby vehicle origin — the green "Dispatch From" pin (hover tooltip). */
  from: [number, number]
  fromLabel: string
  /** Incident site — the red count badge sitting on the grey building. */
  dest: [number, number]
  destCount: string
  /** Grey building footprint polygon at the destination. */
  building: [number, number][]
  /** Dashed dispatch route from `from` to `dest`. */
  route: [number, number][]
}

export interface ShiftIssue {
  id: string
  route: string
  plan: string
  /** Red outline status badge, e.g. "Tanker Unavailable". */
  reason: string
  current: Assignment
  suggested: Assignment
  /** Secondary footer action (differs per card). */
  secondary: 'replace-manually' | 'suggest-nearby'
  map: IssueMap
}

/** Fixed map view framing both dispatch routes — Doha, Qatar. */
export const ISSUES_MAP_CENTER: [number, number] = [25.193, 51.535]
export const ISSUES_MAP_ZOOM = 13

const ASSIGNED: Assignment['side'] = { label: 'Currently Assigned', tone: 'error' }
const SUGGESTED: Assignment['side'] = { label: 'Suggested Replacement', tone: 'info' }

export const shiftIssues: ShiftIssue[] = [
  {
    id: 'FPL-4006',
    route: 'FPL-4006',
    plan: 'Al Khaleej — Tanker Response',
    reason: 'Tanker Unavailable',
    current: {
      vehicle: { plate: 'LMV-QA04', model: 'Tanker (Scania P410)', badge: { label: 'Breakdown', tone: 'warning' }, struck: true },
      side: ASSIGNED,
    },
    suggested: {
      vehicle: { plate: 'LMV-QA13', model: 'Tanker (Volvo FMX 460)', badge: { label: 'Standby', tone: 'info' } },
      side: SUGGESTED,
    },
    secondary: 'replace-manually',
    map: {
      from: [25.208, 51.548],
      fromLabel: 'Dispatch From • 2 km away',
      dest: [25.1875, 51.5245],
      destCount: '24',
      building: [
        [25.1893, 51.5227], [25.1898, 51.5265], [25.1857, 51.5263], [25.1853, 51.5225],
      ],
      route: [
        [25.208, 51.548], [25.204, 51.542], [25.196, 51.531], [25.1875, 51.5245],
      ],
    },
  },
  {
    id: 'FPL-4021',
    route: 'FPL-4021',
    plan: 'Lusail Boulevard — Tanker Response',
    reason: 'Tanker Breakdown',
    current: {
      vehicle: { plate: 'LMV-QA16', model: 'Tanker (Mercedes-Benz Actros 3340)', struck: true },
      driver: { code: 'DRV-QA16', name: 'Bilal Ahmed', struck: true },
      meta: { count: '4/8', pct: 50, chips: ['Flood Response', 'Storm Drain', 'High Priority'] },
      side: ASSIGNED,
    },
    suggested: {
      vehicle: { plate: 'LMV-QA18', model: 'Tanker (Volvo FMX 460)', badge: { label: 'Standby', tone: 'info' } },
      driver: { code: 'DRV-QA18', name: 'Ganesh Reddy', badge: { label: 'Standby', tone: 'info' } },
      meta: { count: '8', chips: ['Flood Response', '2 hours', '1 Crew', 'Doha South Response Base'] },
      side: SUGGESTED,
    },
    secondary: 'suggest-nearby',
    map: {
      from: [25.178, 51.55],
      fromLabel: 'Dispatch From • 3.5 km away',
      dest: [25.198, 51.522],
      destCount: '24',
      building: [
        [25.1998, 51.5202], [25.2003, 51.524], [25.1962, 51.5238], [25.1957, 51.52],
      ],
      route: [
        [25.178, 51.55], [25.184, 51.54], [25.192, 51.53], [25.198, 51.522],
      ],
    },
  },
]
