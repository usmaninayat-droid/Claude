import { useMemo, useState, type ReactNode } from 'react'
import { DataTable, DetailSheet, Stack } from '@fams/ui-kit'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { cn } from '../../lib/cn'
import { MapView } from '../MapView'
import { RecordCountRow } from '../RecordCountRow'
import { DEFAULT_RECORD_NOUN, type RecordNoun } from '../RecordViewStates'
import { CockpitView } from '../cockpit/CockpitView'
import { hasCockpit } from '../cockpit/cockpit-model'
import { hasLiveMap } from '../live-data'
import { ConsoleDrillSheet, type ConsoleDrill } from './ConsoleDrillSheet'
import { ConsoleKpiRow } from './ConsoleKpiRow'
import { ConsoleRecordSummary } from './ConsoleRecordSummary'
import { consoleKpis, identityCol, cellText } from './console-model'
import { consoleQueueColumns } from './console-queue-columns'

/**
 * DispatcherCockpitView — the `dispatcher-cockpit` view kind. [tier-2 pattern]
 *
 * A dispatcher's single surface: what is in flight (the stage KPI row), what
 * needs a decision next (the live queue), where it is (the map), and the
 * assignment panel for the row in hand.
 *
 * ## Two paths, one lens
 *
 * A module that authors the full operations-cockpit contract
 * (`uiConfig.cockpit` + coordinate bindings — `hasCockpit`) renders through
 * `CockpitView`, the spec'd cockpit that already composes exactly this
 * surface (alert strip → filter pills → KPI strip → resizable queue|map
 * split → status-panel band) from that block. Delegating is the whole point:
 * re-implementing it here would be the fork this tier forbids, and the
 * authored KPIs, flows and popup CTAs are strictly richer than anything
 * derivable.
 *
 * Every other module — a bare pipeline with stages and records — gets the
 * DERIVED cockpit below: stage KPI tiles that double as scope filters, the
 * dense console queue (`console-queue-columns`), the record map when the
 * module binds coordinates, and an assignment side sheet on row select. No
 * blueprint additions required; a module that declares nothing beyond
 * `statusList` still gets a working console.
 *
 * State-agnostic (root rule 8): records, callbacks and the selection come in
 * as props; the lens never fetches, never stores, and reports intent out.
 */
export interface DispatcherCockpitViewProps {
  config: EntityConfig
  records: EntityRecord[]
  /** Opens the record's own detail surface (the module's Detail flavor). */
  onOpenRecord?: (record: EntityRecord) => void
  /** Guarded stage move — the same contract the kanban lens uses. */
  onMove?: (recordId: string, fromStage: string, toStage: string) => void
  /** Assignment panel body for the selected record; omit for the derived
   *  field summary. Lets a host mount its own assignment controls without
   *  this template knowing what an assignment is. */
  renderAssignment?: (record: EntityRecord) => ReactNode
  /** Row-level action menu, as every other lens receives it. */
  renderRowActions?: (row: EntityRecord, index: number) => ReactNode
  /** Noun for the count row (e.g. `{ one: 'job', many: 'jobs' }`). */
  recordNoun?: RecordNoun
  /** True when a filter is narrowing `records` (drives the count row). */
  isFiltered?: boolean
  totalCount?: number
  onClearFilters?: () => void
  loading?: boolean
  className?: string
}

export function DispatcherCockpitView({
  config,
  records,
  onOpenRecord,
  onMove,
  renderAssignment,
  renderRowActions,
  recordNoun,
  isFiltered,
  totalCount,
  onClearFilters,
  loading,
  className,
}: DispatcherCockpitViewProps) {
  // The authored cockpit wins wholesale — see the header's "Two paths".
  if (hasCockpit(config)) {
    return (
      <CockpitView
        config={config}
        records={records}
        onOpenRecord={onOpenRecord}
        onMove={onMove}
        loading={loading}
        className={cn('h-full', className)}
      />
    )
  }
  return (
    <DerivedDispatcherCockpit
      config={config}
      records={records}
      onOpenRecord={onOpenRecord}
      renderAssignment={renderAssignment}
      renderRowActions={renderRowActions}
      recordNoun={recordNoun}
      isFiltered={isFiltered}
      totalCount={totalCount}
      onClearFilters={onClearFilters}
      loading={loading}
      className={className}
    />
  )
}

DispatcherCockpitView.displayName = 'DispatcherCockpitView'

type DerivedProps = Omit<DispatcherCockpitViewProps, 'onMove'>

function DerivedDispatcherCockpit({
  config,
  records,
  onOpenRecord,
  renderAssignment,
  renderRowActions,
  recordNoun,
  isFiltered,
  totalCount,
  onClearFilters,
  loading,
  className,
}: DerivedProps) {
  // `isFiltered` is part of the shared lens-state contract every body
  // receives (`ModuleViewBody`'s `lensState`); this lens reads the narrowing
  // off `shown < total` in `RecordCountRow` instead, so the flag is accepted
  // and unused rather than absent from the contract.
  void isFiltered
  const [scopeId, setScopeId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drill, setDrill] = useState<ConsoleDrill | null>(null)

  const kpis = useMemo(() => consoleKpis(config, records), [config, records])
  // A KPI tile is a scope control (its `aria-pressed` says so) — clicking it
  // narrows the queue AND the map to that stage's own population, and
  // clicking it again clears the scope. The tile counts stay whole-set so the
  // row never becomes a set of 0s the moment one is pressed.
  const scoped = useMemo(() => {
    if (!scopeId) return records
    return kpis.find((kpi) => kpi.id === scopeId)?.records ?? records
  }, [kpis, records, scopeId])

  const columns = useMemo(() => consoleQueueColumns({ config }), [config])
  const selected = selectedId ? records.find((record) => record.id === selectedId) : undefined
  const showMap = hasLiveMap(config)

  return (
    <div data-slot="dispatcher-cockpit" className={cn('flex h-full min-h-0 flex-col @container', className)}>
      <Stack gap="field" className="shrink-0 border-b border-border bg-card p-section">
        <ConsoleKpiRow
          kpis={kpis}
          activeId={scopeId}
          onSelect={(kpi) => setScopeId((prev) => (prev === kpi.id ? null : kpi.id))}
          onDrill={(kpi) => setDrill({ label: kpi.label, records: kpi.records })}
          loading={loading}
        />
      </Stack>

      <div className={cn('flex min-h-0 flex-1', showMap ? 'flex-col @4xl:flex-row' : 'flex-col')}>
        <div className={cn('flex min-h-0 flex-col', showMap ? 'flex-1 @4xl:w-1/2' : 'flex-1')}>
          <RecordCountRow
            slot="dispatcher-cockpit"
            shown={scoped.length}
            total={totalCount ?? records.length}
            noun={recordNoun ?? DEFAULT_RECORD_NOUN}
            onClearFilters={
              scopeId
                ? () => {
                    setScopeId(null)
                    onClearFilters?.()
                  }
                : onClearFilters
            }
          />
          <DataTable
            data={scoped}
            columns={columns}
            density="compact"
            hasStickyHeader
            hasRowHoverAffordance
            loading={loading}
            ariaLabel={`${config.name} queue`}
            rowActions={renderRowActions}
            onRowClick={(row) => setSelectedId(row.id)}
            className="min-h-0 flex-1"
          />
        </div>
        {showMap && (
          <div className="min-h-[20rem] flex-1 border-t border-border @4xl:border-t-0 @4xl:border-s">
            <MapView
              config={config}
              records={scoped}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onOpenRecord={onOpenRecord}
              className="h-full"
            />
          </div>
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
          (renderAssignment?.(selected) ?? (
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
