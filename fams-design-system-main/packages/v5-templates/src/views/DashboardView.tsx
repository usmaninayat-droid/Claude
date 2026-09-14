import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ChevronDown } from '@fams/ui-kit/icons'
import {
  Button,
  Combobox,
  DashboardLayout,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  KpiTile,
  StatusView,
} from '@fams/ui-kit'
import type {
  DashboardFilterPill,
  DashboardKpiTile,
  DashboardModuleConfigBlueprint,
  ModuleRenderContext,
} from '@fams/v5-composer'
import { cn } from '../lib/cn'
import {
  applyDashboardFilters,
  livePills,
  pillOptions,
  PILL_ALL_VALUE,
  toDimensionSelection,
  widgetFilterSummary,
  type DashboardDimensionSelection,
  type DashboardFilterValues,
} from './dashboard-filter'
import { formatKpiValue } from './dashboard-format'
import { DashboardWidgetView } from './dashboard-widgets'
import { resolveWidgetIcon, widgetSpanClass } from './dashboard-widget-shell'

/**
 * DashboardView — the renderer for the `DashboardGrid` template contract ref
 * (the `dashboard` module type's `templateRefs.grid`). [tier-2 pattern]
 *
 * DELIBERATELY NOT `V5ModuleSurface`: that surface is entity/pipeline-shaped
 * (view tabs, a detail stack, a creation sheet, a data adapter it lists
 * records from). A dashboard has none of those — it is a header toolbar, a KPI
 * region and a widget grid, all read from the module config. Routing it
 * through `V5ModuleSurface` would have meant teaching that file a second,
 * incompatible shape (inventory risk R7).
 *
 * It composes the EXISTING `@fams/ui-kit` `DashboardLayout` shell rather than
 * introducing a second dashboard skeleton (risk R1) — `header` / `kpis` /
 * 12-column `children` / `footer`, with each widget owning its own
 * `lg:col-span-*` wrapper exactly as that shell documents.
 *
 * Two layout rules from the Phase 3 UX pass are enforced here, not left to
 * blueprint authors:
 *  - **V7** — the KPI region is ONE auto-fit rule
 *    (`repeat(auto-fit, minmax(13.75rem, 1fr))`, widening to `16.25rem` when
 *    any tile carries a value suffix), never an authored row split. Rows and
 *    columns are emergent at every width.
 *  - **V8** — the widget grid's row AND column gap are both `gap-6` (24px).
 *    `DashboardLayout`'s own default is `gap-4`; this view overrides that one
 *    utility on the shell's grid rather than nesting a second grid inside it,
 *    so `[data-testid="dashboard-chart-grid"]` stays the real widget grid.
 *
 * State-agnostic apart from the one thing a presenter must own: filter-pill
 * selection is local UI state (rule 8 — there is no store here). Its values are
 * passed down to every widget AND used as the widget subtree's key, so a filter
 * change re-renders each widget through its loading path with no layout shift.
 * Actually FILTERING the data is the consuming app's job — this view renders
 * the `dataSource` it was given.
 */
export interface DashboardViewProps {
  /** The dashboard module config (`DashboardModuleConfig.schema.json`). */
  config: DashboardModuleConfigBlueprint
  /** ECharts renderer forwarded to every chart widget. `'svg'` under jsdom. */
  renderer?: 'canvas' | 'svg'
  /** Extra header content on the inline-end side (module actions). Omit for none — an unwired control must be ABSENT from the DOM, never inert (verdict V11). */
  actions?: ReactNode
  /** Fires whenever a filter pill changes, so the app can refetch/refilter. */
  onFiltersChange?: (filters: DashboardFilterValues) => void
  className?: string
}

const GRID_GAP = '[&_[data-testid="dashboard-chart-grid"]]:gap-6 [&_[data-testid="dashboard-kpi-row"]]:gap-6'

/** Initial pill values — every pill's authored `defaultValue`. */
function initialFilters(pills: DashboardFilterPill[]): DashboardFilterValues {
  return Object.fromEntries(pills.map((pill) => [pill.id, pill.defaultValue]))
}

/** The label a pill shows: the chosen option's label, else the pill's own. */
function pillLabel(
  pill: DashboardFilterPill,
  value: string | string[] | undefined,
  options: { value: string; label: string }[],
): string {
  if (value === undefined || (Array.isArray(value) && value.length === 0)) return pill.label
  if (Array.isArray(value)) {
    const labels = value.map((v) => options.find((o) => o.value === v)?.label ?? v)
    return labels.length === 1 ? `${pill.label}: ${labels[0]}` : `${pill.label}: ${labels.length} selected`
  }
  return `${pill.label}: ${options.find((o) => o.value === value)?.label ?? value}`
}

/**
 * WHICH SHAPE A PILL TAKES — one rule, no option-count threshold.
 *
 * A `time-range` pill is a short, closed set of PRESETS: a radio list is faster
 * and a search field over three rows is noise. Every other single-select pill
 * names a COLLECTION (vehicles, drivers, sites) and gets the searchable
 * combobox, whatever its length today — a count-based threshold made the same
 * conceptual control render as a menu on one screen and a combobox on another
 * purely because one blueprint listed five vehicles and another listed nine,
 * which is exactly the inconsistency round 2 measured between Fuel and Vehicle
 * Behaviour.
 */
function isSearchablePill(pill: DashboardFilterPill): boolean {
  return pill.type !== 'time-range' && pill.type !== 'multi-select'
}

/** Pill chrome shared by both shapes, so the two never drift on hit area.
 *  Bordered `bg-card` (the `tertiary` Button look) so the dashboard filter
 *  pills read as the same control the list-view filter bars use, not a
 *  separate dark chip. */
const PILL_TRIGGER =
  'h-11 w-auto min-w-40 max-w-72 gap-2 rounded-sm border border-border bg-card px-4 text-body-sm font-medium text-foreground hover:bg-muted'

function FilterPill({
  pill,
  value,
  onChange,
}: {
  pill: DashboardFilterPill
  value: string | string[] | undefined
  onChange: (next: string | string[] | undefined) => void
}) {
  // Every collection pill carries an injected UNSCOPED option, first and
  // default — see `PILL_ALL_VALUE`. A time-range pill does not need one: its
  // widest preset already IS the unscoped view.
  const authored = pillOptions(pill)
  const options =
    pill.type === 'time-range' || pill.type === 'multi-select' || authored.length === 0
      ? authored
      : [{ value: PILL_ALL_VALUE, label: pill.allLabel ?? `All ${pill.label.toLowerCase()}` }, ...authored]
  const multi = pill.type === 'multi-select'
  const selected = Array.isArray(value) ? value : value === undefined ? [] : [value]

  if (options.length === 0) return null

  // A collection pill is a searchable combobox — same pill chrome, same
  // `data-slot`, but typing filters the list (SPEC §8: "a searchable
  // single-select … typing filters").
  if (isSearchablePill(pill)) {
    return (
      <Combobox
        options={options}
        value={typeof value === 'string' ? value : PILL_ALL_VALUE}
        onChange={(next) => onChange(typeof next === 'string' && next !== PILL_ALL_VALUE ? next : undefined)}
        placeholder={pill.label}
        size="lg"
        ariaLabel={pillLabel(pill, value, options)}
        triggerProps={{
          'data-slot': 'dashboard-filter-pill',
          'data-pill-id': pill.id,
          className: PILL_TRIGGER,
        }}
      />
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="tertiary"
          data-slot="dashboard-filter-pill"
          data-pill-id={pill.id}
          className="h-11 gap-2"
          aria-label={pillLabel(pill, value, options)}
        >
          {pillLabel(pill, value, options)}
          <ChevronDown className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {multi ? (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selected.includes(option.value)}
              onCheckedChange={() =>
                onChange(
                  selected.includes(option.value)
                    ? selected.filter((v) => v !== option.value)
                    : [...selected, option.value],
                )
              }
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))
        ) : (
          <DropdownMenuRadioGroup
            value={typeof value === 'string' ? value : PILL_ALL_VALUE}
            onValueChange={(next) => onChange(next === PILL_ALL_VALUE ? undefined : next)}
          >
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function KpiRegion({ tiles, selection }: { tiles: DashboardKpiTile[]; selection: DashboardDimensionSelection }) {
  // V7: ONE auto-fit rule. `16.25rem` (260px) when any tile carries a value
  // suffix, which needs a second line rather than a truncation.
  const wide = tiles.some((tile) => tile.valueSuffix ?? tile.dataSource?.valueSuffix)
  return (
    <div
      data-slot="dashboard-kpi-region"
      className={cn(
        'col-span-full grid gap-6',
        wide
          ? '[grid-template-columns:repeat(auto-fit,minmax(16.25rem,1fr))]'
          : '[grid-template-columns:repeat(auto-fit,minmax(13.75rem,1fr))]',
      )}
    >
      {tiles.map((tile) => {
        // A KPI's datum IS the tile, so it filters through `variants` rather
        // than by dropping rows — same selection, the shape a scalar needs.
        const source = applyDashboardFilters(tile.dataSource, selection) ?? {}
        return (
          <KpiTile
            key={tile.id}
            data-slot="dashboard-kpi-tile"
            data-widget-id={tile.id}
            layout="stat"
            label={tile.label}
            value={formatKpiValue(source.value, tile.format)}
            unit={tile.unit ?? source.unit}
            valueSuffix={tile.valueSuffix ?? source.valueSuffix}
            target={tile.type === 'stat-with-target' && source.target !== undefined ? formatKpiValue(source.target, tile.format) : undefined}
            targetLabel={source.targetLabel}
            badge={tile.badge ?? source.badge}
            icon={resolveWidgetIcon(tile.icon ?? source.icon)}
            tone={tile.tone ?? source.tone}
            trend={source.trend}
          />
        )
      })}
    </div>
  )
}

export function DashboardView({ config, renderer, actions, onFiltersChange, className }: DashboardViewProps) {
  const widgets = useMemo(() => config.widgetGrid ?? [], [config.widgetGrid])
  const kpiTiles = useMemo(() => config.kpiStrip ?? [], [config.kpiStrip])

  /**
   * V11 in its sharpest form: only the pills that can actually change something
   * are rendered. A pill whose dimension no datum on this page carries opens,
   * searches and commits a label while changing nothing — worse than no pill,
   * because it teaches the reader the board is filtered when it is not.
   */
  const pills = useMemo(
    () => livePills(config.filterPills ?? [], widgets, kpiTiles.map((tile) => tile.dataSource)),
    [config.filterPills, widgets, kpiTiles],
  )
  const [filters, setFilters] = useState<DashboardFilterValues>(() => initialFilters(pills))

  const setFilter = useCallback(
    (id: string, next: string | string[] | undefined) => {
      setFilters((current) => {
        const merged = { ...current, [id]: next }
        onFiltersChange?.(merged)
        return merged
      })
    },
    [onFiltersChange],
  )

  // WIDGETS ARE NO LONGER RE-KEYED ON A FILTER CHANGE. Re-keying was a stand-in
  // from when filtering was not implemented: it forced every widget to remount
  // so *something* visibly happened. Now that `selection` really projects each
  // `dataSource`, a remount is both unnecessary (the data prop changes, so the
  // chart re-renders and re-animates on its own) and actively harmful — a
  // remounted `MapPanel` renders while the outgoing instance still holds the
  // one-map-per-page slot, which is exactly the `[MapPanel] Another map is
  // already mounted` warning round 2 measured on the FIRST filter selection
  // inside a single route.
  const selection = useMemo(() => toDimensionSelection(pills, filters), [pills, filters])

  const header =
    pills.length > 0 || actions ? (
      <div data-slot="dashboard-toolbar" className="flex w-full flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {pills.map((pill) => (
            <FilterPill key={pill.id} pill={pill} value={filters[pill.id]} onChange={(next) => setFilter(pill.id, next)} />
          ))}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    ) : undefined

  return (
    <DashboardLayout
      data-dashboard-view=""
      data-dashboard-id={config.id}
      className={cn(GRID_GAP, className)}
      header={header}
      kpis={kpiTiles.length > 0 ? <KpiRegion tiles={kpiTiles} selection={selection} /> : undefined}
    >
      {widgets.length === 0 ? (
        <div className="lg:col-span-12">
          <StatusView kind="empty" title="No widgets" description="This dashboard has no widgets configured yet." />
        </div>
      ) : (
        widgets.map((widget) => (
          <div key={widget.id} className={widgetSpanClass(widget.span)}>
            <DashboardWidgetView
              widget={widget}
              filters={filters}
              selection={selection}
              // The clause names only the pills THIS widget responds to. The
              // page's filter state is not the widget's: a chart that ignores
              // the Driver pill must not announce itself as filtered by it.
              filterSummary={widgetFilterSummary(widget, pills, filters, selection)}
              renderer={renderer}
            />
          </div>
        ))
      )}
    </DashboardLayout>
  )
}

DashboardView.displayName = 'DashboardView'

/**
 * The composer-facing adapter: pulls the dashboard config off the module node
 * and renders `DashboardView`. A `config` that is a PATH STRING (resolved by
 * the bundle loader) or missing renders a clearly-marked empty state rather
 * than throwing.
 */
export interface DashboardModuleSurfaceProps {
  ctx: ModuleRenderContext
  renderer?: 'canvas' | 'svg'
  actions?: ReactNode
}

export function DashboardModuleSurface({ ctx, renderer, actions }: DashboardModuleSurfaceProps) {
  const config = ctx.module.config
  if (!config || typeof config === 'string' || !('widgetGrid' in config)) {
    return (
      <StatusView
        kind="empty"
        title={ctx.module.label}
        description="This dashboard module has no inline dashboard config (expected a `widgetGrid`)."
      />
    )
  }
  return <DashboardView config={config as DashboardModuleConfigBlueprint} renderer={renderer} actions={actions} />
}

DashboardModuleSurface.displayName = 'DashboardModuleSurface'
