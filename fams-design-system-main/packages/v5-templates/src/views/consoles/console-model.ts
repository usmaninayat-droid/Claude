import type { EntityConfig, EntityRecord } from '@fams/v5-composer'

/**
 * console-model.ts — blueprint→console derivation shared by the three
 * operations-console lenses (`DispatcherCockpitView`, `TriageConsoleView`,
 * `FleetConsoleView`). Pure TS, no React. [tier-2 internal]
 *
 * Everything here is ENGINE vocabulary — stages, counts, column bindings,
 * record age. A console lens is a VIEW option over an existing module type,
 * never a new module type (PLATFORM-MODEL doctrine), and it derives its whole
 * surface from what a module already declares: `uiConfig.statusList` for the
 * stages, `systemcolumns` for the fields, `listcolumns` for their order.
 * Nothing here names an incident, a truck or a route.
 */

/** One pipeline stage, with the records currently sitting in it. */
export interface ConsoleStage {
  key: string
  label: string
  color?: string
  textColor?: string
  records: EntityRecord[]
}

/** A record's stage key (the engine's `status` column). */
export function stageOf(record: EntityRecord): string {
  return String(record.status ?? '')
}

/**
 * The module's stages with their populations, in the blueprint's own order.
 * A module with no `statusList` returns `[]` — every console degrades to its
 * stage-less shape rather than inventing lanes.
 */
export function consoleStages(config: EntityConfig, records: EntityRecord[]): ConsoleStage[] {
  const defs = config.uiConfig.statusList ?? []
  return defs.map((def) => {
    const stage: ConsoleStage = {
      key: def.key,
      label: def.label,
      records: records.filter((record) => stageOf(record) === def.key),
    }
    if (def.color) stage.color = def.color
    if (def.textColor) stage.textColor = def.textColor
    return stage
  })
}

/** A console KPI tile — a label, a count, and the population behind it. */
export interface ConsoleKpi {
  id: string
  label: string
  value: number
  color?: string
  records: EntityRecord[]
}

/**
 * KPI tiles derived from the module's stages — one per stage, in blueprint
 * order, each carrying its own population so a tile can open a scoped sheet.
 *
 * Deliberately NOT a new `uiConfig` block. A module that wants hand-authored
 * cockpit KPIs already has `uiConfig.cockpit.kpis` (the operations-cockpit
 * lens's own contract) and `DispatcherCockpitView` routes to `CockpitView`
 * when that block is present; this is the derivation for every module that
 * does not, so a bare pipeline gets a real KPI row for free.
 */
export function consoleKpis(config: EntityConfig, records: EntityRecord[]): ConsoleKpi[] {
  return consoleStages(config, records).map((stage) => {
    const kpi: ConsoleKpi = {
      id: `stage-${stage.key}`,
      label: stage.label,
      value: stage.records.length,
      records: stage.records,
    }
    if (stage.color) kpi.color = stage.color
    return kpi
  })
}

/** A systemcolumn, narrowed to what the consoles read off it. */
interface ColumnLike {
  col: string
  name?: string
  type?: string
  listValues?: string[]
}

function columns(config: EntityConfig): ColumnLike[] {
  return (config.systemcolumns ?? []) as unknown as ColumnLike[]
}

/** The column definition for a `col` key (undefined when unknown). */
export function columnDef(config: EntityConfig, col: string): ColumnLike | undefined {
  return columns(config).find((c) => c.col === col)
}

/** A column's authored label, falling back to the raw key. */
export function columnLabel(config: EntityConfig, col: string): string {
  return columnDef(config, col)?.name ?? col
}

/**
 * The module's list-column order (`listcolumns` placements), which is the
 * only authored answer to "which fields matter, in which order" — the
 * consoles take their table/queue columns from it rather than guessing at
 * `systemcolumns` order (which is a storage order, not a display one).
 */
export function listColumnKeys(config: EntityConfig): string[] {
  const placements = (config.listcolumns ?? []) as unknown as { col?: string }[]
  const keys = placements.map((p) => p.col).filter((col): col is string => Boolean(col))
  return keys.length ? keys : columns(config).map((c) => c.col)
}

/**
 * The module's IDENTITY column — what names a record in a dense row. The
 * blueprint's first list column, skipping the auto uid (which the consoles
 * render as the row's secondary line, the way every v5 dense row does).
 */
export function identityCol(config: EntityConfig): string {
  const keys = listColumnKeys(config)
  const named = keys.find((col) => {
    const def = columnDef(config, col)
    return def && def.type !== 'Auto' && col !== 'status'
  })
  return named ?? keys[0] ?? 'uniqueidentifier'
}

/**
 * The first SingleSelect column that is NOT the pipeline's own `status` —
 * a module's secondary classification axis (priority, severity, mobility,
 * request type…). The consoles use it for their breakdown row and their
 * fleet KPI split. `undefined` when a module declares none.
 */
export function classificationCol(config: EntityConfig, exclude: string[] = []): string | undefined {
  return columns(config).find(
    (c) => c.type === 'SingleSelect' && c.col !== 'status' && !exclude.includes(c.col) && (c.listValues?.length ?? 0) > 0,
  )?.col
}

/** Distinct values of a column across the records, in first-seen order. */
export function distinctValues(records: EntityRecord[], col: string): string[] {
  const seen: string[] = []
  for (const record of records) {
    const value = record[col]
    if (value == null || value === '') continue
    const text = String(value)
    if (!seen.includes(text)) seen.push(text)
  }
  return seen
}

/** A record's field as display text (`'—'` for absent). */
export function cellText(record: EntityRecord, col: string | undefined): string {
  if (!col) return '—'
  const value = record[col]
  return value == null || value === '' ? '—' : String(value)
}

/**
 * The first date-ish column — the consoles' age axis. `DateTime`/`Date`
 * typed columns win; a module with none has age-free queues (ordering falls
 * back to the record order it was handed).
 */
export function ageCol(config: EntityConfig): string | undefined {
  return columns(config).find((c) => c.type === 'DateTime' || c.type === 'Date')?.col
}

/** Minutes since a record's age column; `undefined` when unmeasurable. */
export function ageMinutes(record: EntityRecord, col: string | undefined): number | undefined {
  if (!col) return undefined
  const parsed = Date.parse(String(record[col] ?? ''))
  if (!Number.isFinite(parsed)) return undefined
  return Math.max(0, Math.round((Date.now() - parsed) / 60_000))
}

/** Compact age reading — `42m` / `3h 10m` / `2d 4h`. */
export function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours < 24) return `${hours}h ${mins}m`
  return `${Math.floor(hours / 24)}d ${hours % 24}h`
}

/** Records sorted oldest-first by the age column (stable when unmeasurable). */
export function byAgeDescending(records: EntityRecord[], col: string | undefined): EntityRecord[] {
  if (!col) return records
  return [...records].sort((a, b) => (ageMinutes(b, col) ?? 0) - (ageMinutes(a, col) ?? 0))
}

/** The stage definition for a key (label + colors), from the blueprint. */
export function stageDef(
  config: EntityConfig,
  key: string,
): { key: string; label: string; color?: string; textColor?: string } | undefined {
  return (config.uiConfig.statusList ?? []).find((s) => s.key === key)
}
