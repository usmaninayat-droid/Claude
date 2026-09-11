import { useMemo, type ReactNode } from 'react'
import type { EntityConfig, EntityRecord, UserContext } from '@fams/v5-composer'
import { BulkActionBar } from './BulkActionBar'
import { ExportMenu } from './ExportMenu'
import { RecordActionsMenu } from './RecordActionsMenu'
import { useBulkSelection, type BulkSelection } from './bulk-selection'
import { exportColumnsFor } from './export-records'
import {
  recordNounFor,
  resolveBulkActions,
  resolveRecordActions,
  selectionResetKey,
} from './module-actions-config'

export interface UseModuleViewActionsOptions {
  config: EntityConfig
  /** The records currently passing search + filters — the FILTERED set, and the only set any of this chrome may act on. */
  filtered: EntityRecord[]
  userContext?: UserContext
  /** The active saved view — a lens switch invalidates the selection (UX note G.47). */
  viewId?: string
  search?: string
  filters?: Record<string, unknown>
  /** Whether the module renders a selection affordance at all (`uiConfig.listSelectable`) — the bulk bar's gate. */
  selectable: boolean
  /** The app's delete seam. Without it neither Delete affordance renders (Rule 8 — the template never mutates). */
  onDeleteRecords?: (recordIds: string[]) => void
}

export interface ModuleViewActions {
  /** The flat selection set, or `undefined` when this module has no selection chrome. */
  selection?: BulkSelection
  /** Row-level `…` menu factory for `ListView.rowActions` (List rows + Hybrid cards). */
  renderRowActions?: (record: EntityRecord) => ReactNode
  /** The same menu for `KanbanView.renderCardActions`. */
  renderCardActions?: (recordId: string, recordLabel: string) => ReactNode
  /** The toolbar's `Export` menu, over the FILTERED records. */
  exportAction?: ReactNode
  /** The sticky bulk bar, or `null` when nothing is selected / the module has no bar. */
  bulkBar: ReactNode
  /**
   * Whether a search or filter is currently narrowing the record set. Computed
   * here (it already was, for the select-all copy) and published so every lens
   * reads the SAME answer — that is what lets each lens tell J.57's cause (b)
   * "nothing matches your filters" apart from cause (a) "no records yet".
   */
  isFiltered: boolean
  /** `uiConfig.recordNoun`, resolved once, for every generated state copy. */
  recordNoun: { one: string; many: string }
}

/** A record's human handle for accessible names and confirm copy — never a hardcoded column. */
function recordLabelOf(record: EntityRecord): string {
  const id = record.uniqueidentifier
  if (typeof id === 'string' && id) return id
  return record.title ?? record.id
}

/**
 * use-module-view-actions — the shared row/bulk/export chrome, in ONE place.
 * [tier-2 internal]
 *
 * Every piece of Figma section `33534:29713`'s generic chrome that A5 adds —
 * the hover-revealed `…` row menu, the multi-select bulk bar, and `Export` as a
 * menu — is assembled here and handed to whichever lens is active. That is the
 * point: `INTERACTIONS.md`'s doctrine section rules that these "are all generic
 * module-view chrome … they belong on the shared view/toolbar composition,
 * gated by config … not as pipeline-specific components", and UX note L.75
 * calls a second, pipelines-only selection idiom "the single highest
 * consistency risk in the family" because the shipped Tickets list already
 * renders a checkbox column. So there is exactly one implementation, `ModuleView`
 * is its only caller, and the already-shipped Tickets list picks up the bulk bar
 * from this same code path the moment its blueprint's `listSelectable` is read.
 *
 * Extracted from `ModuleView` rather than inlined (root rule 12): that file is
 * already at its budget, and this is a self-contained concern.
 *
 * Everything is gated by `uiConfig` + privileges (`module-actions-config.ts`),
 * never by lens or module name, and every action operates on the FILTERED set
 * or a subset of it — so select-all, the bar's count, Delete and Export can
 * never disagree about which records are in play (UX notes G.44/G.45).
 */
export function useModuleViewActions({
  config,
  filtered,
  userContext,
  viewId,
  search,
  filters,
  selectable,
  onDeleteRecords,
}: UseModuleViewActionsOptions): ModuleViewActions {
  const hasDeleteHandler = Boolean(onDeleteRecords)
  const rowActions = resolveRecordActions(config, userContext, hasDeleteHandler)
  const bulkActions = resolveBulkActions(config, userContext, selectable, hasDeleteHandler)

  const visibleIds = useMemo(() => filtered.map((record) => record.id), [filtered])
  // A filter/search/lens change clears the selection (G.45/G.47); a record edit
  // or a re-sort does not — see `selectionResetKey`.
  const resetKey = selectionResetKey(viewId, search, filters)
  const selection = useBulkSelection(visibleIds, resetKey)

  const exportColumns = useMemo(() => exportColumnsFor(config), [config])
  const isFiltered = Boolean(search) || Object.values(filters ?? {}).some((v) => (Array.isArray(v) ? v.length > 0 : v != null && v !== ''))

  const renderRowActions = rowActions
    ? (record: EntityRecord) => {
        const label = recordLabelOf(record)
        return (
          <RecordActionsMenu
            recordId={record.id}
            recordLabel={label}
            canDelete={rowActions.delete}
            canArchive={rowActions.archive}
            persistent={rowActions.alwaysVisible}
            onDelete={onDeleteRecords ? () => onDeleteRecords([record.id]) : undefined}
          />
        )
      }
    : undefined

  const renderCardActions = rowActions
    ? (recordId: string, recordLabel: string) => (
        <RecordActionsMenu
          recordId={recordId}
          recordLabel={recordLabel}
          canDelete={rowActions.delete}
          canArchive={rowActions.archive}
          persistent={rowActions.alwaysVisible}
          onDelete={onDeleteRecords ? () => onDeleteRecords([recordId]) : undefined}
        />
      )
    : undefined

  // The toolbar's Export always exports the FILTERED set, never the raw records
  // — the defect `REFERENCE-MINING.md` §3.5 found in the reference serializer.
  const exportAction = bulkActions?.export ? (
    <ExportMenu columns={exportColumns} records={filtered} label={config.name} />
  ) : undefined

  const selectedRecords = useMemo(() => {
    const chosen = new Set(selection.selectedIds)
    return filtered.filter((record) => chosen.has(record.id))
  }, [filtered, selection.selectedIds])

  const bulkBar = bulkActions ? (
    <BulkActionBar
      count={selection.count}
      isEntireFilteredSet={selection.allVisibleSelected}
      isFiltered={isFiltered}
      filteredCount={filtered.length}
      onSelectAll={selection.selectAll}
      onClear={selection.clear}
      onDelete={
        bulkActions.delete && onDeleteRecords ? () => onDeleteRecords(selection.selectedIds) : undefined
      }
      exportProps={
        bulkActions.export
          ? { columns: exportColumns, records: selectedRecords, label: config.name }
          : undefined
      }
      recordNoun={recordNounFor(config)}
    />
  ) : null

  return {
    selection: bulkActions ? selection : undefined,
    renderRowActions,
    renderCardActions,
    exportAction,
    bulkBar,
    isFiltered,
    recordNoun: recordNounFor(config),
  }
}
