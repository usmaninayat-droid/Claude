import type { EntityConfig, EntityRecord } from '@fams/v5-composer'

/**
 * Calendar test fixtures. Two DIFFERENT module configs over the same component,
 * because the whole point of this view is that stage/status names, colours and
 * date fields are DATA (UX L.78 / Dev Note frame `33534:32278`): the second
 * config must render identically-shaped output with none of the first's words.
 *
 * `January 2026` is the design's own month, so the fixtures line up with the
 * reference renders. `statusList[].color` is a raw runtime colour STRING in the
 * blueprint contract; these fixtures fill it with `var(--color-…)` token
 * references — valid CSS for the inline style the chip applies, and a
 * demonstration that a blueprint can bind a status to a semantic token instead
 * of a one-off hue. The Figma hues map to the nearest shipped status tokens:
 * red→`destructive`, blue→`info`, amber→`warning`, green→`success` (SPEC §1.7:
 * nearest existing token, never a new one).
 */

const status = (key: string, label: string, color: string) => ({ id: `sts_${key}`, key, label, color })

/** Config A — four statuses matching the reference frames, three date fields. */
export const calendarConfig: EntityConfig = {
  code: 'ops/work-items',
  name: 'Work Items',
  systemcolumns: [
    { col: 'uniqueidentifier', name: 'Item ID', type: 'Auto' },
    { col: 'title', name: 'Item', type: 'SmallText' },
    { col: 'status', name: 'Status', type: 'SingleSelect' },
    { col: 'systemcol1', name: 'Created Date', type: 'Date' },
    { col: 'systemcol2', name: 'Due Date', type: 'Date' },
    { col: 'systemcol3', name: 'Updated Date', type: 'DateTime' },
    { col: 'systemcol4', name: 'Owner', type: 'Assignee' },
  ],
  listcolumns: [{ col: 'title' }, { col: 'status' }],
  uiConfig: {
    statusList: [
      status('escalated', 'Escalated', 'var(--color-destructive)'),
      status('in_progress', 'In Progress', 'var(--color-info)'),
      status('assigned', 'Assigned', 'var(--color-warning)'),
      status('completed', 'Completed', 'var(--color-success)'),
    ],
  },
}

/**
 * Config B — a second module with entirely different status keys/labels and a
 * single date field, to prove nothing is hardcoded to config A.
 */
export const altCalendarConfig: EntityConfig = {
  code: 'ops/inspections',
  name: 'Inspections',
  systemcolumns: [
    { col: 'title', name: 'Inspection', type: 'SmallText' },
    { col: 'status', name: 'Stage', type: 'SingleSelect' },
    { col: 'systemcol9', name: 'Scheduled For', type: 'Date' },
  ],
  listcolumns: [{ col: 'title' }],
  uiConfig: {
    statusList: [
      status('awaiting', 'Awaiting Rectification', 'var(--color-muted-foreground)'),
      status('submitted', 'Rectification Submitted', 'var(--color-primary)'),
    ],
  },
}

/** A day inside the design's reference month, used as the injected "today". */
export const CALENDAR_TODAY = new Date(2026, 0, 8)

function record(
  id: string,
  title: string,
  statusKey: string,
  created: string,
  due = created,
  updated = `${created}T09:30:00`,
): EntityRecord {
  return {
    id,
    uniqueidentifier: id,
    title,
    status: statusKey,
    systemcol1: created,
    systemcol2: due,
    systemcol3: updated,
    systemcol4: 'u_owner',
  }
}

/**
 * Records for config A. Deliberately shaped for the gates:
 * - `2026-01-08` (today) carries EIGHT records → chip cap + `N More` + popover.
 * - `2026-01-20` carries one per status → legend filtering.
 * - `2026-02-03` sits in the NEXT month → month stepping has somewhere to go.
 * - `2025-12-30` sits in the previous YEAR → the year-boundary step.
 * - Every record's `Due Date` is a day later than its `Created Date`, so
 *   switching `View By` visibly re-lays the grid.
 */
export const calendarRecords: EntityRecord[] = [
  record('W-01', 'Replace pump seal', 'escalated', '2026-01-08', '2026-01-09'),
  record('W-02', 'Inspect valve line', 'in_progress', '2026-01-08', '2026-01-09'),
  record('W-03', 'Recalibrate sensor', 'assigned', '2026-01-08', '2026-01-09'),
  record('W-04', 'Clear blocked drain', 'completed', '2026-01-08', '2026-01-09'),
  record('W-05', 'Service compressor', 'escalated', '2026-01-08', '2026-01-09'),
  record('W-06', 'Repaint access hatch', 'in_progress', '2026-01-08', '2026-01-09'),
  record('W-07', 'Replace filter bank', 'assigned', '2026-01-08', '2026-01-09'),
  record('W-08', 'Tighten flange bolts', 'completed', '2026-01-08', '2026-01-09'),
  record('W-09', 'Survey north bund', 'escalated', '2026-01-20', '2026-01-21'),
  record('W-10', 'Reseal inspection pit', 'in_progress', '2026-01-20', '2026-01-21'),
  record('W-11', 'Swap flow meter', 'assigned', '2026-01-20', '2026-01-21'),
  record('W-12', 'Close out permit', 'completed', '2026-01-20', '2026-01-21'),
  record('W-13', 'Rebuild gearbox', 'assigned', '2026-02-03', '2026-02-04'),
  record('W-14', 'Winterise standpipe', 'completed', '2025-12-30', '2025-12-31'),
]

/** Records for config B, on its own single date column. */
export const altCalendarRecords: EntityRecord[] = [
  { id: 'I-01', title: 'Quarterly bund check', status: 'awaiting', systemcol9: '2026-01-08' },
  { id: 'I-02', title: 'Annual pressure test', status: 'submitted', systemcol9: '2026-01-15' },
]
