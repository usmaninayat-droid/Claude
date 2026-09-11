import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { DataTable, DetailSheet, Skeleton, type DataTableColumn } from '@fams/ui-kit'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { cn } from '../../lib/cn'
import { MapView } from '../MapView'
import { CockpitAlert } from './CockpitAlert'
import { CockpitKpiStrip } from './CockpitKpiStrip'
import { CockpitPanelBand } from './CockpitPanelBand'
import { useCockpitPopupActions } from './CockpitPopupActions'
import { CockpitQueue } from './CockpitQueue'
import { CockpitSplit, type CockpitSplitState } from './CockpitSplit'
import { CockpitFilters } from './CockpitFilters'
import { CockpitFlows, type CockpitFlowKind } from './CockpitFlows'
import {
  applyCockpitFilters,
  deriveCockpitFilters,
  deriveCockpitKpis,
  deriveCockpitPanels,
  deriveCockpitQueue,
  kpiPopulation,
  type CockpitKpiModel,
} from './cockpit-model'
import {
  useBringSplitIntoView,
  useCockpitMapGeometry,
  useQueueFocusRestore,
  useShellScrollLock,
} from './cockpit-view-hooks'
import { registerCockpitComponents } from './register-cockpit'

// Explicit top-level CALL (never a bare side-effect import — this package is
// `"sideEffects": false`, so an unconsumed import is dropped at build time;
// same trap `creation-sheet/register-widgets.ts` documents): rendering the
// cockpit template guarantees its blueprint-consumable component names
// (`KpiMetricCard` / `RouteJobCard` / `StatusBreakdownCard`) are registered.
registerCockpitComponents()

/**
 * CockpitView — the operations-cockpit HYBRID LENS (target-7 SPEC §1;
 * UX-NOTES MUSTs A–L): alert strip → filters row → KPI strip → resizable
 * queue|map split → status-panel band, all derived from the module's OWN
 * `uiConfig.cockpit` block + records. A view template over existing module
 * types (entity / pipeline / live-monitoring), never a new engine type —
 * `ModuleView` picks it for the `hybrid` kind when `hasCockpit(config)`
 * holds (the same switch pattern as `hasLiveMap` → `LiveHybridView`).
 *
 * Round-1 fixes carried here: config-driven filter pills + icon actions
 * (P0), the status-driven popup CTA footer wired to the four flow sheets
 * (P0, via `CockpitFlows`), KPI detail sheets scoped to the KPI's own
 * population, the Attention KPI routed to the issues sheet, sheet width
 * `min(600px, 100vw-80px)`, background scroll-lock while any sheet is open,
 * loading skeletons for KPI row / queue / bottom band, and the 6-up KPI grid
 * gated to ≥80rem container width (3×2 below — D.14).
 */
export interface CockpitViewProps {
  config: EntityConfig
  records: EntityRecord[]
  /** Controlled selection (queue card ⇄ map pin); omit for uncontrolled. */
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  /** Opens a record's own detail surface (the module's Detail flavor). */
  onOpenRecord?: (record: EntityRecord) => void
  /** Extra filter pills row content (appended after the config pills). */
  filtersSlot?: ReactNode
  /** Extra icon-action buttons at the end of the filters row. */
  actionsSlot?: ReactNode
  /** Icon-button slots in the queue toolbar (after the built-ins). */
  queueToolbarSlot?: ReactNode
  /** A KPI card was activated (fires for passive cards too — e.g. to open
   *  a bespoke sheet instead of the built-in detail table). */
  onKpiOpen?: (kpi: { id: string; label: string }) => void
  /** Guarded status move for the flow sheets (the kanban `onMove` contract). */
  onMove?: (recordId: string, fromStatus: string, toStatus: string) => void
  /** Extra surface slot rendered inside the view (sheets, overlays, toasts). */
  children?: ReactNode
  /** Loading state (skeletons for KPI row, queue, and bottom band). */
  loading?: boolean
  className?: string
}

export function CockpitView({
  config,
  records,
  selectedId,
  onSelect,
  onOpenRecord,
  filtersSlot,
  actionsSlot,
  queueToolbarSlot,
  onKpiOpen,
  onMove,
  children,
  loading = false,
  className,
}: CockpitViewProps) {
  const [internalId, setInternalId] = useState<string | null>(null)
  const activeId = selectedId !== undefined ? selectedId : internalId
  const select = (id: string | null) => {
    if (selectedId === undefined) setInternalId(id)
    onSelect?.(id)
  }

  const cockpit = config.uiConfig.cockpit
  const kpis = useMemo(() => deriveCockpitKpis(config, records), [config, records])
  const panels = useMemo(() => deriveCockpitPanels(config, records), [config, records])

  /* Filter pills — col-bound selections filter the queue + map (SPEC §2 #4). */
  const filterModels = useMemo(() => deriveCockpitFilters(config, records), [config, records])
  const [filterSelections, setFilterSelections] = useState<Record<string, string | undefined>>({})
  const scopedRecords = useMemo(
    () => applyCockpitFilters(records, filterModels, filterSelections),
    [records, filterModels, filterSelections],
  )
  const queueItems = useMemo(() => deriveCockpitQueue(config, scopedRecords), [config, scopedRecords])

  const selectedRecord = useMemo(
    () => (activeId ? records.find((r) => r.id === activeId) : undefined),
    [records, activeId],
  )
  const { paths, focusPosition, routeBounds } = useCockpitMapGeometry(config, selectedRecord)

  const rootRef = useRef<HTMLDivElement>(null)
  useBringSplitIntoView(activeId, rootRef)

  const [splitState, setSplitState] = useState<CockpitSplitState>('split')
  const [openKpi, setOpenKpi] = useState<CockpitKpiModel | null>(null)

  /* Flow sheets (report / issues / assign / replace). */
  const flows = cockpit?.flows
  const [flow, setFlow] = useState<CockpitFlowKind | null>(null)
  const [flowTargetId, setFlowTargetId] = useState<string | null>(null)

  useShellScrollLock(openKpi !== null || flow !== null)

  const lastActiveId = useRef<string | null>(null)
  useQueueFocusRestore(activeId, lastActiveId)

  const moveStatus = useCallback(
    (record: EntityRecord, toStatus: string) => {
      onMove?.(record.id, String(record.status ?? ''), toStatus)
    },
    [onMove],
  )

  const kpiDetailColumns = useMemo<DataTableColumn<EntityRecord>[]>(() => {
    if (!openKpi?.detailColumns) return []
    return openKpi.detailColumns.map((col) => {
      const def = config.systemcolumns?.find((c) => c.col === col)
      return { key: col, label: def?.name ?? col }
    })
  }, [openKpi, config])
  const kpiDetailRows = useMemo(
    () => (openKpi ? kpiPopulation(openKpi, records) : []),
    [openKpi, records],
  )

  const alert = cockpit?.alert

  /* Everything inside a map popup — the status-driven CTA footer, the call
     tooltip and the remote-command overflow menu — lives in
     `CockpitPopupActions`; the view only owns which flow sheet is open. */
  const openFlowFor = useCallback((kind: CockpitFlowKind, recordId: string) => {
    setFlowTargetId(recordId)
    setFlow(kind)
  }, [])
  const popupCommands = cockpit?.popup?.commands
  const { renderPopupFooter, renderPopupOverflow } = useCockpitPopupActions({
    flows,
    contactCol: cockpit?.popup?.contactCol,
    commands: popupCommands,
    onOpenFlow: openFlowFor,
  })

  const statusOptions = useMemo(
    () => (config.uiConfig.statusList ?? []).map((s) => ({ key: s.key, label: s.label })),
    [config],
  )

  return (
    <div ref={rootRef} data-slot="cockpit-view" className={cn('@container/cockpit flex min-h-0 flex-col gap-4', className)}>
      {alert ? <CockpitAlert alert={alert} /> : null}

      {filterModels.length || cockpit?.actions?.length || filtersSlot || actionsSlot ? (
        <div className="flex flex-none flex-wrap items-center gap-2">
          <CockpitFilters
            className="min-w-0 flex-1"
            filters={filterModels}
            selections={filterSelections}
            onSelectionChange={(id, value) => setFilterSelections((prev) => ({ ...prev, [id]: value }))}
            actions={cockpit?.actions}
          />
          {filtersSlot}
          {actionsSlot ? <div className="flex flex-none items-center gap-2">{actionsSlot}</div> : null}
        </div>
      ) : null}

      <CockpitKpiStrip
        kpis={kpis}
        loading={loading}
        issuesFlowAvailable={Boolean(flows?.issues)}
        onOpenIssues={() => setFlow('issues')}
        onOpenDetail={setOpenKpi}
        onKpiOpen={onKpiOpen}
      />

      <CockpitSplit
        className="min-h-[30rem] flex-1"
        state={splitState}
        onStateChange={setSplitState}
        list={
          <CockpitQueue
            items={queueItems}
            selectedId={activeId}
            onSelect={select}
            toolbarSlot={queueToolbarSlot}
            statusOptions={statusOptions}
            exportable
            searchPlaceholder={`Search ${config.name ?? 'queue'}`}
            loading={loading}
          />
        }
        map={
          <div className="h-full min-h-0 overflow-hidden rounded-md border border-border">
            {loading ? (
              // Deliberately NOT the real map while loading: mounting MapLibre
              // is the single heaviest thing on this screen and the skeleton
              // exists precisely to paint before that cost is paid (D.17).
              <Skeleton variant="image" data-slot="cockpit-map-skeleton" className="h-full w-full rounded-none" />
            ) : (
            <MapView
              config={config}
              records={scopedRecords}
              selectedId={activeId}
              onSelect={select}
              onOpenRecord={onOpenRecord}
              renderPopupFooter={flows ? renderPopupFooter : undefined}
              renderPopupOverflow={popupCommands?.length ? renderPopupOverflow : undefined}
              // Popup width cap ~360px in the cockpit (UX MUST H.39).
              popupMaxWidth={cockpit?.popup?.maxWidth ?? '22.5rem'}
              popupClassName="w-[22.5rem]"
              paths={paths}
              // Route bounds beat the single-pin nudge; `focusPosition` stays
              // as the fallback for a selection with no drawn route.
              fitBounds={routeBounds}
              focusPosition={routeBounds ? null : focusPosition}
              className="h-full min-h-0"
            />
            )}
          </div>
        }
      />

      <CockpitPanelBand panels={panels} loading={loading} />

      <DetailSheet
        open={openKpi !== null}
        onOpenChange={(next) => {
          if (!next) setOpenKpi(null)
        }}
        title={openKpi?.label ?? ''}
        // Rows are the KPI's OWN population, and the count says so.
        subtitle={openKpi ? `${kpiDetailRows.length} record${kpiDetailRows.length === 1 ? '' : 's'}` : undefined}
        // Cockpit sheets cap at min(600px, 100vw - 80px) — UX MUST J.47.
        className="sm:max-w-[min(37.5rem,calc(100vw-5rem))]"
      >
        {openKpi?.detailColumns?.length ? (
          <div className="overflow-x-auto">
            <DataTable
              columns={kpiDetailColumns}
              data={kpiDetailRows}
              getRowId={(row) => row.id}
              isCustomizable={false}
            />
          </div>
        ) : null}
      </DetailSheet>

      {flows ? (
        <CockpitFlows
          config={config}
          records={records}
          open={flow}
          onOpenChange={setFlow}
          targetId={flowTargetId}
          onTargetChange={setFlowTargetId}
          onMoveStatus={onMove ? moveStatus : undefined}
        />
      ) : null}

      {children}
    </div>
  )
}

CockpitView.displayName = 'CockpitView'
