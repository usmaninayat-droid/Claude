import { useMemo, useState, type ReactNode } from 'react'
import { CountTabs, HybridView as HybridViewShell, type BadgeVariant } from '@fams/ui-kit'
import type { EntityConfig, EntityRecord, FieldOptionContext, UserContext } from '@fams/v5-composer'
import { EntityProfile } from '../entity-profile/EntityProfile'
import type { ProfileTabRenderer } from '../entity-profile/EntityProfile.types'
import { ALL_STAGE, buildStageTabItems, useStageTabsState } from './stage-tabs'
import { ListView } from './ListView'
import { ViewEmptyState } from './ViewEmptyState'
import { useCompactListConfig } from './use-compact-list-config'

export interface HybridViewProps {
  /** Module config — drives both the list and the default detail panel. */
  config: EntityConfig
  records: EntityRecord[]

  /** Controlled selection; omit for uncontrolled (nothing selected initially). */
  selectedId?: string
  onSelect?: (id: string) => void

  /**
   * `'inline'` (default): selecting a record renders its detail in the
   * trailing pane. `'external'`: selection is DELEGATED — `onSelect` opens the
   * record elsewhere (e.g. `V5ModuleSurface`'s `ProfileStack` drawer, whose
   * record-tab chrome the Figma hybrid screens show) and the inline pane stays
   * on `emptyDetail`, so the page never mounts two `EntityProfile`s (and thus
   * two maps — perf rule 3's one-map-per-page guard) for one selection.
   */
  detailMode?: 'inline' | 'external'

  /**
   * Custom right-panel renderer for the selected record. Omit to use the
   * blueprint-driven `EntityProfile` (2.3).
   */
  renderDetail?: (record: EntityRecord) => ReactNode
  /** `EntityProfile` tab bodies, keyed by blueprint component name (default detail). */
  tabRenderers?: Record<string, ProfileTabRenderer>
  /** Current user — tab visibility gate for the default detail. */
  userContext?: UserContext
  /** Status chip tone for the default detail. */
  statusTone?: BadgeVariant
  /** Injected option data for list inline editors + reference cells. */
  fieldContext?: FieldOptionContext

  /** Cols the list allows inline-editing. */
  editableCols?: string[]
  onRecordChange?: (col: string, value: unknown, record: EntityRecord) => void

  /**
   * The shared hover-revealed `…` card options menu — passed straight through
   * to the left pane's `ListView.rowActions`. Figma Dev Note `33534:32263`
   * (hybrid card) is byte-identical to `33534:32266` (list row), so this is the
   * SAME control the list lens renders, supplied by `ModuleView` from
   * `uiConfig.rowActions`. Omit for no card options menu.
   */
  rowActions?: (record: EntityRecord) => ReactNode

  /**
   * Toolbar stage tabs (SPEC Addendum "Stage tabs" — the SAME lens
   * `MapHybridView`'s record-map hybrid already carries). Uncontrolled
   * (internal state, default `'all'`) unless both this and
   * `onActiveStageChange` are given. Only takes effect when the blueprint
   * sets `uiConfig.hybrid.stageTabs` and `uiConfig.statusList` is non-empty.
   */
  activeStage?: string
  onActiveStageChange?: (stage: string) => void

  listWidthClassName?: string
  listLabel?: string
  detailLabel?: string
  /** Shown in the right panel when no record is selected. */
  emptyDetail?: ReactNode
  className?: string
}

/**
 * HybridView — the list + detail split. [tier-2 pattern]
 *
 * Reuses ui-kit's `HybridView` shell (side-by-side on `md+`, tabbed below):
 * the list on the leading edge is our blueprint-driven `ListView`; the trailing
 * panel shows the selected record's `EntityProfile` (2.3) — or a custom
 * `renderDetail`. Selection is controlled or uncontrolled; state-agnostic
 * throughout (Rule 8).
 *
 * The left list is COMPACT by convention (a record picker, not the primary
 * list surface) — when the blueprint sets `uiConfig.hybrid.listColumns`
 * (an ordered array of `col` keys), only those columns render, via
 * `ListView.visibleCols`. Omit it to keep every derived column (unchanged
 * default behavior).
 *
 * Stage tabs (SPEC Addendum "Stage tabs", `uiConfig.hybrid.stageTabs`) — a
 * `CountTabs` row above the compact list: "All" plus one tab per
 * `uiConfig.statusList` entry, each with a live count. Picking a stage
 * narrows the list to it and, since the active tab already states the
 * stage, suppresses the now-redundant per-row STATUS pill (both return on
 * "All"). Shares its sentinel/count/controlled-state plumbing with
 * `MapHybridView`'s record-map hybrid via `./stage-tabs`.
 */
export function HybridView({
  config,
  records,
  selectedId,
  onSelect,
  renderDetail,
  tabRenderers,
  userContext,
  statusTone,
  fieldContext,
  editableCols,
  onRecordChange,
  rowActions,
  activeStage: activeStageProp,
  onActiveStageChange,
  listWidthClassName = 'md:w-96',
  listLabel = 'List',
  detailLabel = 'Details',
  emptyDetail,
  detailMode = 'inline',
  className,
}: HybridViewProps) {
  const [internalId, setInternalId] = useState<string | undefined>(undefined)
  const activeId = selectedId ?? internalId
  const selected = detailMode === 'external' ? undefined : records.find((r) => r.id === activeId)
  // Compact-left-list column derivation — extracted to
  // `use-compact-list-config.ts` (shared with `LiveHybridView`).
  const { listConfig, listColumns } = useCompactListConfig(config)

  const select = (id: string) => {
    if (selectedId === undefined) setInternalId(id)
    onSelect?.(id)
  }

  /*
   * Stage tabs (`uiConfig.hybrid.stageTabs`) — same shared plumbing
   * `MapHybridView`'s record-map hybrid uses (`./stage-tabs`). `records` is
   * already the caller-narrowed set (Rule 8); stage narrowing folds in ONE
   * more equality on `status`, the same column the STATUS pill already
   * reads.
   */
  const showStageTabs = Boolean(config.uiConfig.hybrid?.stageTabs) && config.uiConfig.statusList.length > 0
  const [activeStage, setActiveStage] = useStageTabsState(activeStageProp, onActiveStageChange)
  const stageNarrowed = showStageTabs && activeStage !== ALL_STAGE
  const stageFilteredRecords = useMemo(
    () => (stageNarrowed ? records.filter((r) => String(r.status ?? '') === activeStage) : records),
    [records, stageNarrowed, activeStage],
  )
  const stageTabItems = useMemo(
    () => (showStageTabs ? buildStageTabItems(records, config.uiConfig.statusList) : []),
    [showStageTabs, records, config],
  )
  const stageTabsNode = showStageTabs ? (
    <div data-slot="hybrid-stage-tabs">
      <CountTabs
        aria-label={`Filter ${config.name} by stage`}
        items={[{ id: ALL_STAGE, label: 'All', count: records.length }, ...stageTabItems]}
        value={activeStage}
        onValueChange={setActiveStage}
      />
    </div>
  ) : null

  const detail: ReactNode = selected ? (
    renderDetail ? (
      renderDetail(selected)
    ) : (
      <EntityProfile
        config={config}
        record={selected}
        statusTone={statusTone}
        tabRenderers={tabRenderers}
        userContext={userContext}
      />
    )
  ) : (
    emptyDetail ?? (
      <ViewEmptyState title="No selection" description="Pick a record from the list to see its details." />
    )
  )

  return (
    <HybridViewShell
      data-slot="hybrid-view"
      className={className}
      listWidthClassName={listWidthClassName}
      listLabel={listLabel}
      mapLabel={detailLabel}
      list={
        <div className="flex h-full min-h-0 flex-col gap-2 p-3">
          {stageTabsNode}
          <ListView
            config={listConfig}
            records={stageFilteredRecords}
            selectedId={activeId}
            onRowClick={(record) => select(record.id)}
            editableCols={editableCols}
            onRecordChange={onRecordChange}
            fieldContext={fieldContext}
            visibleCols={listColumns}
            rowActions={rowActions}
            hideStatusColumn={stageNarrowed}
            className="min-h-0 flex-1"
          />
        </div>
      }
      map={<div className="h-full min-h-0 overflow-auto bg-card">{detail}</div>}
    />
  )
}

HybridView.displayName = 'HybridView'
