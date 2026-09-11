// Tanker Fault & Repair table data. Ported from the prototype (app.js).

export type Severity = 'critical' | 'medium' | 'minor'

/** DS Badge variants (kept in sync with the design-system Badge). */
export type BadgeVariant =
  | 'default' | 'secondary' | 'outline' | 'muted'
  | 'success' | 'warning' | 'info' | 'destructive'

export interface Technician {
  initial: string
  name: string
  tone: 'success' | 'error'
}

export interface StatusTag {
  label: string
  variant?: BadgeVariant
  /** CSS color override (for statuses with no semantic variant, e.g. pink). */
  color?: string
}

export interface RepairRow {
  wo: string
  inspection: string
  bin: string
  issue: string
  area: string
  severity: Severity
  tech: Technician | null
  date: string
  status: StatusTag
}

const STATUS: Record<string, StatusTag> = {
  new: { label: 'New', variant: 'destructive' },
  waiting: { label: 'Waiting Parts', color: 'var(--chart-accent-pink)' },
  assigned: { label: 'Assigned', variant: 'info' },
  scheduled: { label: 'Scheduled', variant: 'success' },
  progress: { label: 'In Progress', variant: 'warning' },
  completed: { label: 'Completed', variant: 'muted' },
}

const green = (initial: string, name: string): Technician => ({ initial, name, tone: 'success' })
const red = (initial: string, name: string): Technician => ({ initial, name, tone: 'error' })

/**
 * 4 open work orders are listed below; 2 more were closed earlier in the event
 * window (6 raised in total). WO-98765 has passed its 48h target → 1 overdue.
 */
export const repairStats = [
  { value: '4', total: '6', label: 'Open Tasks', accent: 'success' as const },
  { value: '2', label: 'Completed' },
  { value: '1', label: 'Overdue Tasks', accent: 'warning' as const },
]

/**
 * Open tanker work orders raised during the current rain event.
 *
 * The prototype repeated ONE row's data across the table — the same tanker
 * (LMV-QA07), the same maintenance plan and 2024 dates carried over from the
 * original dispatcher app. Rebased 2026-09-01: distinct tankers drawn from the
 * 18-strong fleet (`LMV-QA01`…`LMV-QA18`, the ids used by `routes.ts` and the
 * Live GIS Map), per-row maintenance plans named for the tanker's own depot
 * bay, and dates inside the last two weeks of the event window.
 *
 * FLEET LINKAGE (2026-09-01 cross-module audit): the two tankers actually OUT
 * of rotation carry the two blocking rows and match `statusBreakdowns.ts` —
 * LMV-QA04 is the 1 breakdown (critical, unassigned) and LMV-QA16 the 1
 * inactive tanker (waiting parts; LM reports it Non-Reporting). The other two
 * rows are non-blocking: LMV-QA07 and LMV-QA15 are both on route today.
 * `area` uses the 5-value municipality vocabulary shared with the incidents
 * and plan-monitoring seeds.
 */
export const binRepair: RepairRow[] = [
  {
    wo: 'WO-98765',
    inspection: 'Tanker Maintenance Plan · Sector A · Doha Depot Bay 3',
    bin: 'LMV-QA04',
    issue: 'Pump Unit',
    area: 'Al Wakrah',
    severity: 'critical',
    tech: null,
    date: '31 Aug, 2026',
    status: STATUS.new,
  },
  {
    wo: 'WO-54321',
    inspection: 'Tanker Maintenance Plan · Sector C · Doha Depot Bay 1',
    bin: 'LMV-QA16',
    issue: 'Chassis/Structure',
    area: 'Doha',
    severity: 'minor',
    tech: null,
    date: '29 Aug, 2026',
    status: STATUS.waiting,
  },
  {
    wo: 'WO-24680',
    inspection: 'Tanker Maintenance Plan · Sector B · Umm Salal Depot Bay 2',
    bin: 'LMV-QA07',
    issue: 'Tires',
    area: 'Umm Salal',
    severity: 'medium',
    tech: green('V', 'Vikram Singh'),
    date: '26 Aug, 2026',
    status: STATUS.assigned,
  },
  {
    wo: 'WO-13579',
    inspection: 'Tanker Maintenance Plan · Sector D · Al Daayen Depot Bay 4',
    bin: 'LMV-QA15',
    issue: 'Hose Leak',
    area: 'Al Daayen',
    severity: 'minor',
    tech: red('A', 'Aamir Shah'),
    date: '21 Aug, 2026',
    status: STATUS.scheduled,
  },
]
