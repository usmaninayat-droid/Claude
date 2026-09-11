import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { cellText, columnLabel, distinctValues } from './console-model'

/**
 * workforce-model — `WorkforcePulseView`'s people derivations. [tier-2 internal]
 *
 * A workforce console counts PEOPLE and where they are, which is a different
 * question from the job stage a record sits in. The people set is resolved in
 * one of two ways, in this order:
 *
 *  1. A **workforce-typed linked entity** the blueprint exposes — a
 *     `systemcolumns` entry whose `entityType` is a `workforce/*` code. When
 *     the host also hands the linked records in (`peopleRecords`), those ARE
 *     the roster and every count is a headcount.
 *  2. Otherwise the module's own records, keyed by the person-bearing column
 *     the blueprint names (see `personCol`'s three declared tiers). One row
 *     per assignment, deduplicated by person, which is the honest reading
 *     when no roster is available.
 *
 * Every binding is read from what the blueprint DECLARES — an `entityType`, a
 * field type, or an existing `uiConfig.map` binding. Nothing here matches on
 * a column's NAME, so the derivations carry no domain vocabulary of their own.
 */

interface ColumnLike {
  col: string
  name?: string
  type?: string
  entityType?: string
  listValues?: string[]
}

function columns(config: EntityConfig): ColumnLike[] {
  return (config.systemcolumns ?? []) as unknown as ColumnLike[]
}

/**
 * The column linking a record to a person, resolved from what the blueprint
 * DECLARES — never from a column's name. Three tiers, in order:
 *
 *  1. A `workforce/*` `entityType` binding — an explicit relationship.
 *  2. A `Person`/`People`-typed column.
 *  3. `uiConfig.map.driverCol` — the column the live map already labels its
 *     vehicle popups with. It is an authored person binding that predates
 *     this lens, so reading it means a fleet-flavoured module gets a real
 *     roster with no blueprint change and no guessing; the same "the map
 *     already knows" argument `presenceCol` makes for `statusCol`.
 *
 * `undefined` when a module names no person at all — the pulse then degrades
 * to its record-only shape rather than inventing one.
 */
export function personCol(config: EntityConfig): string | undefined {
  const cols = columns(config)
  const linked = cols.find((c) => typeof c.entityType === 'string' && c.entityType.startsWith('workforce/'))
  if (linked) return linked.col
  const typed = cols.find((c) => c.type === 'Person' || c.type === 'People')
  if (typed) return typed.col
  const driver = config.uiConfig.map?.driverCol
  return typeof driver === 'string' && driver.length ? driver : undefined
}

/** The `workforce/*` entity code this module links to, if any. */
export function workforceEntityCode(config: EntityConfig): string | undefined {
  return columns(config).find(
    (c) => typeof c.entityType === 'string' && c.entityType.startsWith('workforce/'),
  )?.entityType
}

/**
 * The column carrying a person's PRESENCE state — the axis the pulse's
 * headline breakdown reads. Prefers the blueprint's map status column (the
 * same column the live map already colours by, so the two agree), then any
 * other non-`status` SingleSelect that is not the module's stage axis.
 */
export function presenceCol(config: EntityConfig): string | undefined {
  const mapStatus = config.uiConfig.map?.statusCol
  if (typeof mapStatus === 'string' && mapStatus.length) return mapStatus
  return columns(config).find((c) => c.type === 'SingleSelect' && c.col !== 'status')?.col
}

/**
 * The SingleSelect columns the pulse turns into breakdown panels — the
 * module's own classification axes (shift, zone, depot, channel…). Capped at
 * FOUR, which is the 2×2 band the panels lay out into; a module declaring
 * more shows its first four rather than a ragged fifth. `status` is excluded:
 * the stage axis is what the other three consoles are for.
 */
export function breakdownCols(config: EntityConfig, budget = 4): string[] {
  return columns(config)
    .filter((c) => c.type === 'SingleSelect' && c.col !== 'status')
    .map((c) => c.col)
    .slice(0, budget)
}

/**
 * The column the coverage chart groups by — a location-ish grouping axis.
 *
 * Chosen by SHAPE, not by name: the first column whose values REPEAT across
 * records (at least two distinct values, fewer than one per record). A
 * per-record-unique column (an identity, a plate, a timestamp) would paint a
 * meaningless 1-high bar per record; a site / depot / plan column is exactly
 * the shape that survives this test.
 *
 * Two ordering rules matter. `SmallText` is tried before `SingleSelect`,
 * because a free-text grouping column IS the site/zone kind and a
 * SingleSelect is more often a state axis. And the module's own `status`
 * column is excluded outright — counts per pipeline stage are what the other
 * three consoles are for, and repeating them here would make the pulse a
 * fourth view of the same fact.
 */
export function coverageCol(config: EntityConfig, records: EntityRecord[]): string | undefined {
  if (records.length < 2) return undefined
  const repeats = (col: ColumnLike): boolean => {
    const values = distinctValues(records, col.col)
    return values.length >= 2 && values.length < records.length
  }
  const cols = columns(config).filter((c) => c.col !== 'status')
  return (
    cols.find((c) => c.type === 'SmallText' && repeats(c))?.col ??
    cols.find((c) => c.type === 'SingleSelect' && repeats(c))?.col
  )
}

/** One person in the pulse's roster. */
export interface PulsePerson {
  id: string
  name: string
  /** The records this person is on (one when a roster was handed in). */
  records: EntityRecord[]
}

/**
 * The roster: the handed-in people records when the host wired the linked
 * workforce entity, else this module's records deduplicated by person.
 */
export function pulseRoster(
  config: EntityConfig,
  records: EntityRecord[],
  peopleRecords?: EntityRecord[],
  peopleConfig?: EntityConfig,
): PulsePerson[] {
  if (peopleRecords?.length && peopleConfig) {
    const nameCol = columns(peopleConfig).find((c) => c.type === 'SmallText')?.col
    return peopleRecords.map((record) => ({
      id: record.id,
      name: nameCol ? cellText(record, nameCol) : String(record.uniqueidentifier ?? record.id),
      records: [record],
    }))
  }
  const col = personCol(config)
  if (!col) return []
  const byName = new Map<string, PulsePerson>()
  for (const record of records) {
    const name = cellText(record, col)
    if (name === '—') continue
    const existing = byName.get(name)
    if (existing) existing.records.push(record)
    else byName.set(name, { id: name, name, records: [record] })
  }
  return [...byName.values()]
}

/** A breakdown panel's model: a title plus counted rows over one column. */
export interface PulseBreakdown {
  id: string
  title: string
  rows: { id: string; label: string; count: number }[]
}

/** One breakdown per column in `cols`, counted across `records`. */
export function pulseBreakdowns(
  config: EntityConfig,
  records: EntityRecord[],
  cols: string[],
): PulseBreakdown[] {
  return cols
    .map((col) => ({
      id: col,
      title: columnLabel(config, col),
      rows: distinctValues(records, col).map((value) => ({
        id: value,
        label: value,
        count: records.filter((record) => String(record[col] ?? '') === value).length,
      })),
    }))
    .filter((panel) => panel.rows.length > 0)
}

/** Headcount per coverage-column value, ready for the bar chart. */
export function pulseCoverage(
  records: EntityRecord[],
  col: string | undefined,
): { categories: string[]; counts: number[] } {
  if (!col) return { categories: [], counts: [] }
  const categories = distinctValues(records, col)
  return {
    categories,
    counts: categories.map(
      (value) => records.filter((record) => String(record[col] ?? '') === value).length,
    ),
  }
}
