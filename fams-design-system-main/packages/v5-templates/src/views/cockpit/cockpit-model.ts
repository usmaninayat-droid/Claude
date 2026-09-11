import type { EntityConfig, EntityRecord, UiConfig } from '@fams/v5-composer'
// TYPE-ONLY map-entry import — erased at build time (lazy-weight rule).
import type { MapPathDatum } from '../../map/MapPanel.types'

/**
 * cockpit-model.ts — blueprint→cockpit derivation for `CockpitView` (the
 * operations-cockpit hybrid lens). Pure TS, no React: reads the module's
 * `uiConfig.cockpit` block (see `@fams/v5-composer`'s `UiConfig.cockpit`)
 * plus the records already in hand and returns the plain view-model the
 * template renders — KPI cards, queue-card fields, status panels, and the
 * selected record's route-path pair. Everything here is generic engine
 * vocabulary (statuses, counts, column bindings) — the cockpit is a VIEW
 * option on an existing module type, never a new module type
 * (PLATFORM-MODEL doctrine).
 */

export type CockpitConfig = NonNullable<UiConfig['cockpit']>
export type CockpitTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
export type CockpitBannerTone = 'warning' | 'danger' | 'info'

/** True when the module's blueprint opts its hybrid view into the cockpit
 *  lens: a `uiConfig.cockpit` block AND coordinate bindings (the map pane
 *  is half the surface — without `uiConfig.map.latCol/lngCol` the hybrid
 *  kind falls back to the standard live hybrid / list+detail split). */
export function hasCockpit(config: EntityConfig): boolean {
  const map = config.uiConfig.map
  return Boolean(config.uiConfig.cockpit && map?.latCol && map?.lngCol)
}

export interface CockpitKpiModel {
  id: string
  label: string
  value: string
  accent?: CockpitTone
  badge?: { label: string; tone?: 'up' | 'down' | 'success' | 'warning' | 'link' | 'neutral' }
  /** Column keys for this KPI's detail-table sheet; undefined → passive card. */
  detailColumns?: string[]
  /** `'issues'` routes the click to the attention-items sheet. */
  opens?: 'detail' | 'issues'
  /** The KPI's own record population (detail sheets show THESE rows, never
   *  all records — UX/visual round-1 fail). `undefined` → all records. */
  countStatus?: string
}

/** The records a KPI's detail sheet shows — its own population. */
export function kpiPopulation(kpi: CockpitKpiModel, records: EntityRecord[]): EntityRecord[] {
  if (!kpi.countStatus) return records
  return records.filter((r) => String(r.status ?? '') === kpi.countStatus)
}

export interface CockpitFilterModel {
  id: string
  label: string
  col?: string
  options: string[]
  placeholder: boolean
}

/** Filter pills: explicit options win; otherwise the col's distinct values. */
export function deriveCockpitFilters(config: EntityConfig, records: EntityRecord[]): CockpitFilterModel[] {
  const filters = config.uiConfig.cockpit?.filters
  if (!filters) return []
  return filters.map((f) => {
    let options = f.options ?? []
    if (!options.length && f.col) {
      const seen = new Set<string>()
      for (const record of records) {
        const value = text(record, f.col)
        if (value) seen.add(value)
      }
      options = [...seen].sort()
    }
    return { id: f.id, label: f.label, col: f.col, options, placeholder: f.placeholder ?? false }
  })
}

/** Apply the active pill selections (col-bound only) to the record set. */
export function applyCockpitFilters(
  records: EntityRecord[],
  filters: CockpitFilterModel[],
  selections: Record<string, string | undefined>,
): EntityRecord[] {
  const active = filters.filter((f) => f.col && selections[f.id])
  if (!active.length) return records
  return records.filter((record) =>
    active.every((f) => text(record, f.col) === selections[f.id]),
  )
}

export interface CockpitQueueItemModel {
  id: string
  title: string
  subtitle?: string
  status?: { label: string; color?: string }
  progressPct?: number
  progressLabel?: string
  plannedLabel?: string
  actualLabel?: string
  /** Explicit deviation reading (e.g. "Running 26 min late"). */
  deltaLabel?: string
  /** Person name for the card's leading avatar. */
  avatarName?: string
  /** Status accent-bar color (from the blueprint's own statusList). */
  accentColor?: string
  meta: string[]
  banner?: { tone: CockpitBannerTone; text: string }
  /** Lower-cased haystack for the queue search box. */
  searchText: string
  record: EntityRecord
}

export interface CockpitPanelModel {
  id: string
  title: string
  icon?: 'group' | 'people' | 'chart'
  filter?: { label: string; options?: string[] }
  stats?: { id?: string; label: string; value: string | number }[]
  rows: { id: string; label: string; count: number; tone?: CockpitTone }[]
  emptyLabel?: string
}

function text(record: EntityRecord, col: string | undefined): string | undefined {
  if (!col) return undefined
  const value = record[col]
  return value == null || value === '' ? undefined : String(value)
}

function num(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

const BANNER_TONES: ReadonlySet<string> = new Set(['warning', 'danger', 'info'])

/** KPI strip cards: static `value` wins; `countStatus` counts `record.status`. */
export function deriveCockpitKpis(config: EntityConfig, records: EntityRecord[]): CockpitKpiModel[] {
  const cockpit = config.uiConfig.cockpit
  if (!cockpit?.kpis) return []
  return cockpit.kpis.map((kpi) => {
    const value =
      kpi.value !== undefined
        ? String(kpi.value)
        : kpi.countStatus !== undefined
          ? String(records.filter((r) => String(r.status ?? '') === kpi.countStatus).length)
          : '0'
    return {
      id: kpi.id,
      label: kpi.label,
      value,
      accent: kpi.accent,
      badge: kpi.badge,
      detailColumns: kpi.detailColumns,
      opens: kpi.opens,
      countStatus: kpi.countStatus,
    }
  })
}

/** Status pill data for a record — label + blueprint color from `statusList`. */
export function cockpitStatusOf(config: EntityConfig, record: EntityRecord): { label: string; color?: string } | undefined {
  const key = record.status
  if (key == null || key === '') return undefined
  const def = config.uiConfig.statusList?.find((s) => s.key === String(key))
  return { label: def?.label ?? String(key), color: def?.color }
}

/** Records → queue-card models per `uiConfig.cockpit.queue`'s bindings. */
export function deriveCockpitQueue(config: EntityConfig, records: EntityRecord[]): CockpitQueueItemModel[] {
  const queue = config.uiConfig.cockpit?.queue ?? {}
  return records.map((record) => {
    const title = text(record, queue.titleCol) ?? (typeof record.title === 'string' ? record.title : record.id)
    const subtitle = text(record, queue.subtitleCol)
    const bannerText = text(record, queue.bannerCol)
    const bannerToneRaw = text(record, queue.bannerToneCol)
    const meta = (queue.metaCols ?? []).map((col) => text(record, col)).filter((v): v is string => Boolean(v))
    const haystackCols = [queue.titleCol, queue.subtitleCol, ...(queue.searchCols ?? []), ...(queue.metaCols ?? [])]
    const searchText = [title, subtitle, ...haystackCols.map((col) => text(record, col))]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const status = cockpitStatusOf(config, record)
    const progressPct = queue.progressCol ? num(record[queue.progressCol]) : undefined
    const progressText = text(record, queue.progressLabelCol)
    return {
      id: record.id,
      title,
      subtitle,
      status,
      progressPct,
      // The % number always renders in text beside the bar (UX MUST F.29);
      // a richer bound label prefixes it rather than replacing it.
      progressLabel:
        progressPct !== undefined
          ? progressText
            ? `${progressText} · ${Math.round(progressPct)}%`
            : `${Math.round(progressPct)}%`
          : progressText,
      plannedLabel: text(record, queue.plannedCol),
      actualLabel: text(record, queue.actualCol),
      deltaLabel: text(record, queue.deltaCol),
      avatarName: text(record, queue.avatarCol),
      accentColor: status?.color,
      meta,
      banner: bannerText
        ? { tone: (BANNER_TONES.has(bannerToneRaw ?? '') ? bannerToneRaw : 'warning') as CockpitBannerTone, text: bannerText }
        : undefined,
      searchText,
      record,
    }
  })
}

/** Bottom band panels: static `rows` win; `countByCol` derives the value distribution. */
export function deriveCockpitPanels(config: EntityConfig, records: EntityRecord[]): CockpitPanelModel[] {
  const cockpit = config.uiConfig.cockpit
  if (!cockpit?.panels) return []
  return cockpit.panels.map((panel) => {
    let rows: CockpitPanelModel['rows']
    if (panel.rows?.length) {
      rows = panel.rows.map((row, index) => ({ id: row.id ?? `${panel.id}-${index}`, label: row.label, count: row.count, tone: row.tone }))
    } else if (panel.countByCol) {
      const counts = new Map<string, number>()
      for (const record of records) {
        const value = text(record, panel.countByCol)
        if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
      }
      rows = [...counts.entries()].map(([label, count]) => ({
        id: `${panel.id}-${label}`,
        label,
        count,
        tone: panel.toneMap?.[label],
      }))
    } else {
      rows = []
    }
    return { id: panel.id, title: panel.title, icon: panel.icon, filter: panel.filter, stats: panel.stats, rows, emptyLabel: panel.emptyLabel }
  })
}

/** Coerce a column value into a `[lng, lat][]` polyline (or undefined). */
function polyline(value: unknown): [number, number][] | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined
  const points: [number, number][] = []
  for (const point of value) {
    if (!Array.isArray(point) || point.length < 2) return undefined
    const lng = num(point[0])
    const lat = num(point[1])
    if (lng === undefined || lat === undefined) return undefined
    points.push([lng, lat])
  }
  return points
}

/**
 * The selected record's route-path pair per `uiConfig.cockpit.routes`:
 * actual solid, planned dashed (shape, never color alone — UX MUST 35).
 * Colors stay `var(--token)` strings; the map layer resolves them.
 */
export function deriveCockpitPaths(config: EntityConfig, record: EntityRecord | undefined): MapPathDatum[] {
  const routes = config.uiConfig.cockpit?.routes
  if (!routes || !record) return []
  const paths: MapPathDatum[] = []
  const planned = routes.plannedCol ? polyline(record[routes.plannedCol]) : undefined
  const actual = routes.actualCol ? polyline(record[routes.actualCol]) : undefined
  if (planned) {
    paths.push({ id: `${record.id}-planned`, points: planned, color: 'var(--color-info)', dashed: true, widthPx: 3, label: 'Planned route' })
  }
  if (actual) {
    paths.push({ id: `${record.id}-actual`, points: actual, color: 'var(--color-primary)', widthPx: 4, label: 'Actual route' })
  }
  return paths
}
