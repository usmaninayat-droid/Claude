import { useMemo, useState } from 'react'
import {
  DataTable,
  DetailSheet,
  Stack,
  StatusBreakdownCard,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@fams/ui-kit'
import { Truck } from '@fams/ui-kit/icons'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { cn } from '../../lib/cn'
import { KanbanView } from '../KanbanView'
import { MapView } from '../MapView'
import { hasLiveMap } from '../live-data'
import { ConsoleDrillSheet, type ConsoleDrill } from './ConsoleDrillSheet'
import { ConsoleKpiRow } from './ConsoleKpiRow'
import { ConsoleRecordSummary } from './ConsoleRecordSummary'
import { fleetKpis, unitStateCol } from './fleet-model'
import { cellText, columnLabel, identityCol } from './console-model'
import { consoleQueueColumns } from './console-queue-columns'

/**
 * FleetConsoleView — the `fleet-console` view kind. [tier-2 pattern]
 *
 * A fleet supervisor's three questions, one surface: **what is my fleet doing
 * right now** (the KPI band + the availability breakdown), **which unit is
 * which** (the fleet register table), **where is the work** (the job board by
 * stage, and the live map). The panes are tabs over one record set rather
 * than a split, because each wants the full width — a register row carries
 * plate, driver, assignment and mobility, a stage board wants every lane
 * visible, and a map wants the viewport.
 *
 * Ported BY INTENT from the FAMS Operations Center telematics app's own Fleet
 * Manager Console (`src/ops-center/FleetManagerConsole.tsx`; read-only
 * reference, nothing imported — it composes a vendored DS). Reproduced here:
 * its accent-KPI band whose tiles open a raw-data side sheet, its segmented
 * fleet-availability bar, its live map with clickable markers, and its
 * operational-register table with per-status pills.
 *
 * DELIBERATELY NOT reproduced: that view's ~20 fixed analytics charts (fleet
 * age, fuel by zone, top-10 consumers, theft trend…). Those are per-tenant
 * CONTENT, and this platform already has the surface for them — the
 * `dashboard` module type's blueprint-driven widget grid (`DashboardView`).
 * Hardcoding twenty named business charts into a tier-2 template would put
 * that content in the design system, which rule 11 and the patterns-tier
 * laws both forbid; they belong in a dashboard blueprint beside this
 * module.
 *
 * ## Derivation
 *
 * The KPI row comes from the module's UNIT-STATE axis, not its pipeline
 * stages: `fleetKpis` prefers the blueprint's mobility-flavoured
 * classification column (`uiConfig.map.statusCol` — the column the live map
 * already colours its markers by, so the console and the map agree by
 * construction), falling back to the pipeline's own `statusList` for a module
 * that binds no fleet vocabulary. That is the "units active / idle / in
 * maintenance from a vehicle-typed axis if the blueprint exposes one, else
 * from records" rule, expressed as metadata rather than named states.
 *
 * The register table is the same dense console row every console shares
 * (`console-queue-columns`), with the identity cell's media set to the fleet
 * glyph. The board is `KanbanView` unchanged — the lens composes it rather
 * than re-deriving lanes, so drag guards, pinning and grouping all behave
 * exactly as they do on the module's own kanban tab.
 *
 * State-agnostic (root rule 8) — props in, intent out.
 */
export interface FleetConsoleViewProps {
  config: EntityConfig
  records: EntityRecord[]
  onOpenRecord?: (record: EntityRecord) => void
  /** Guarded stage move for the board (the kanban `onMove` contract). */
  onMove?: (recordId: string, fromStage: string, toStage: string) => void
  /** Per-record move guard, passed straight to the board. */
  canMove?: React.ComponentProps<typeof KanbanView>['canMove']
  /** Row-level action menu for the register table. */
  renderRowActions?: (row: EntityRecord, index: number) => React.ReactNode
  /** Replaces the derived side-sheet body. */
  renderDetail?: (record: EntityRecord) => React.ReactNode
  /** Glyph name for the register's identity cell (default `truck`). */
  unitIcon?: string
  loading?: boolean
  className?: string
}

type FleetPane = 'register' | 'board' | 'map'

/** Positional segment tones for the availability bar — see their usage note. */
const AVAILABILITY_TONES = ['success', 'warning', 'danger', 'info', 'neutral'] as const

export function FleetConsoleView({
  config,
  records,
  onOpenRecord,
  onMove,
  canMove,
  renderRowActions,
  renderDetail,
  unitIcon = 'truck',
  loading,
  className,
}: FleetConsoleViewProps) {
  const [pane, setPane] = useState<FleetPane>('register')
  const [scopeId, setScopeId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drill, setDrill] = useState<ConsoleDrill | null>(null)

  const kpis = useMemo(() => fleetKpis(config, records), [config, records])
  const scoped = useMemo(() => {
    if (!scopeId) return records
    return kpis.find((kpi) => kpi.id === scopeId)?.records ?? records
  }, [kpis, records, scopeId])

  const columns = useMemo(
    () => consoleQueueColumns({ config, identityIcon: unitIcon }),
    [config, unitIcon],
  )
  const selected = selectedId ? records.find((record) => record.id === selectedId) : undefined
  const showMap = hasLiveMap(config)
  const stateCol = unitStateCol(config)

  /**
   * The availability band — the segmented "how much of the fleet is in each
   * state" reading, as stats over one cumulative bar. Same rows as the KPI
   * tiles, a different question: the tiles are counts to act on, this is the
   * proportion of the whole.
   */
  const availability = useMemo(
    () => kpis.filter((kpi) => kpi.id !== 'unit-total').map((kpi) => ({ id: kpi.id, label: kpi.label, count: kpi.value })),
    [kpis],
  )

  return (
    <div data-slot="fleet-console" className={cn('flex h-full min-h-0 flex-col @container', className)}>
      <Stack gap="field" className="shrink-0 border-b border-border bg-card p-section">
        <ConsoleKpiRow
          kpis={kpis}
          activeId={scopeId}
          onSelect={(kpi) => setScopeId((prev) => (prev === kpi.id ? null : kpi.id))}
          onDrill={(kpi) => setDrill({ label: kpi.label, records: kpi.records })}
          loading={loading}
        />
        {availability.length > 1 && (
          <StatusBreakdownCard
            title={stateCol ? `${columnLabel(config, stateCol)} availability` : 'Availability'}
            icon={Truck}
            stats={availability.map((row) => ({ id: row.id, label: row.label, value: row.count }))}
            // Positional segment tones so a multi-state bar reads as
            // distinct segments rather than one grey block. A segmentation
            // aid only, never the sole encoding (V12): each state's number
            // sits above the bar and its legend row repeats label + count.
            rows={availability.map((row, i) => ({ ...row, tone: AVAILABILITY_TONES[i % AVAILABILITY_TONES.length] }))}
            emptyLabel="No data"
          />
        )}
        <Tabs value={pane} onValueChange={(value) => setPane(value as FleetPane)}>
          <TabsList>
            <TabsTrigger value="register">Fleet register</TabsTrigger>
            <TabsTrigger value="board">Jobs by stage</TabsTrigger>
            {showMap && <TabsTrigger value="map">Map</TabsTrigger>}
          </TabsList>
        </Tabs>
      </Stack>

      <div className="flex min-h-0 flex-1 flex-col">
        {pane === 'register' ? (
          <DataTable
            data={scoped}
            columns={columns}
            density="compact"
            hasStickyHeader
            hasRowHoverAffordance
            loading={loading}
            ariaLabel={`${config.name} fleet`}
            rowActions={renderRowActions}
            onRowClick={(row) => setSelectedId(row.id)}
            className="min-h-0 flex-1"
          />
        ) : pane === 'board' ? (
          <KanbanView
            config={config}
            records={scoped}
            canMove={canMove}
            onMove={onMove}
            onCardClick={(id) => setSelectedId(id)}
            className="min-h-0 flex-1"
          />
        ) : (
          // The module's own record map — clickable markers, the legend and
          // its toggles all owned by `MapView` (`showTools`), so the console
          // adds a map pane without re-deriving a single pin.
          <MapView
            config={config}
            records={scoped}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpenRecord={onOpenRecord}
            showTools
            className="min-h-0 flex-1"
          />
        )}
      </div>

      <DetailSheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
        width="md"
        title={selected ? cellText(selected, identityCol(config)) : ''}
        subtitle={selected?.uniqueidentifier ? String(selected.uniqueidentifier) : undefined}
      >
        {selected &&
          (renderDetail?.(selected) ?? (
            <ConsoleRecordSummary config={config} record={selected} onOpenRecord={onOpenRecord} />
          ))}
      </DetailSheet>

      <ConsoleDrillSheet
        config={config}
        drill={drill}
        onClose={() => setDrill(null)}
        onOpenRecord={onOpenRecord}
      />
    </div>
  )
}

FleetConsoleView.displayName = 'FleetConsoleView'
