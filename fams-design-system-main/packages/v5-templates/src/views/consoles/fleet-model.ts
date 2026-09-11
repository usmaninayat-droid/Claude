import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { columnLabel, consoleKpis, distinctValues, type ConsoleKpi } from './console-model'

/**
 * fleet-model — `FleetConsoleView`'s unit-state derivation. [tier-2 internal]
 *
 * A fleet console counts UNITS BY STATE (active / idle / in maintenance),
 * which is a different axis from the pipeline STAGE a job sits in. This
 * resolves which column carries that axis, entirely from metadata.
 */

/**
 * The column carrying a module's unit state. `uiConfig.map.statusCol` is the
 * authored answer wherever it exists — it is already the column the live map
 * colours its vehicle markers by, so the console's KPI split and the map's
 * legend cannot disagree. `undefined` when the module binds no map status.
 */
export function unitStateCol(config: EntityConfig): string | undefined {
  const col = config.uiConfig.map?.statusCol
  return typeof col === 'string' && col.length ? col : undefined
}

/**
 * Fleet KPI tiles: one per distinct unit state when the module declares that
 * axis, else the shared stage-count tiles (`consoleKpis`) so a stage-only
 * pipeline still gets a real KPI row.
 *
 * Tile order follows the state column's declared `listValues` when it has
 * them (the blueprint's own ordering — "Active" before "Idle" before "In
 * Maintenance" is an authoring decision, not something to sort), falling back
 * to first-seen order across the records.
 */
export function fleetKpis(config: EntityConfig, records: EntityRecord[]): ConsoleKpi[] {
  const col = unitStateCol(config)
  if (!col) return consoleKpis(config, records)

  const declared = (config.systemcolumns ?? []).find(
    (c) => (c as unknown as { col?: string }).col === col,
  ) as unknown as { listValues?: string[] } | undefined
  const seen = distinctValues(records, col)
  const order = declared?.listValues?.length
    ? // Declared order first, then any value the records carry that the
      // blueprint never declared (real data outruns its own enum often
      // enough that dropping those rows from the KPI row would under-count
      // the fleet).
      [...declared.listValues.filter((v) => seen.includes(v)), ...seen.filter((v) => !declared.listValues?.includes(v))]
    : seen

  if (!order.length) return consoleKpis(config, records)

  const label = columnLabel(config, col)
  return order.map((value) => {
    const own = records.filter((record) => String(record[col] ?? '') === value)
    return {
      id: `unit-${value}`,
      label: value,
      value: own.length,
      records: own,
      // No per-state colour: the state column is a plain SingleSelect with no
      // colour vocabulary of its own (unlike `statusList`), and inventing one
      // here would be a second, conflicting colour language for the same
      // module. The tiles use the primary rail.
    } satisfies ConsoleKpi
  }).concat(
    // A trailing whole-fleet tile so the row always answers "how many units
    // in total", which no per-state tile does.
    [{ id: 'unit-total', label: `Total ${label.toLowerCase()}`, value: records.length, records }],
  )
}
