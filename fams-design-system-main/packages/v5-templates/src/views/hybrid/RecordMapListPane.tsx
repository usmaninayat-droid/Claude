import { Fragment, useEffect, useRef, type ReactNode } from 'react'
import { Switch, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@fams/ui-kit'
import type { CompiledFieldSet, EntityConfig, EntityRecord } from '@fams/v5-composer'
import { cn } from '../../lib/cn'
import { RecordMapCard } from './RecordMapCard'
import {
  DEFAULT_RECORD_NOUN,
  RecordViewEmptyState,
  resolveEmptyCause,
  type RecordLensStateProps,
} from '../RecordViewStates'
import type { RecordGeometry } from './record-map-model'

export interface RecordMapListPaneProps extends RecordLensStateProps {
  config: EntityConfig
  compiled: CompiledFieldSet | null
  items: RecordGeometry[]
  /** The map-synced highlight — the SAME id the record-open path uses. */
  selectedId?: string | null
  onSelect: (id: string) => void
  /** Records whose geometry the eye toggle has hidden from the map. */
  hiddenIds: Set<string>
  onToggleHidden: (id: string) => void
  /**
   * Per-card pipeline-stage chip (`uiConfig.map.records.card.stageChip`) —
   * resolves an item to its stage's `{label, color}` (`uiConfig.statusList`),
   * or `undefined` for no chip on that card. Omit entirely to render no
   * chip at all (unchanged default).
   */
  stageChipOf?: (item: RecordGeometry) => { label: string; color?: string } | undefined
  /** A5's flat multi-select set — unrelated to `selectedId`, and coexisting with it. */
  selectedIds?: readonly string[]
  onSelectedIdsChange?: (ids: string[]) => void
  /** A5's shared hover-revealed `…` menu, per record. */
  renderActions?: (record: EntityRecord) => ReactNode
  emptyState?: ReactNode
  /**
   * The in-panel toolbar (SPEC §1.1) — a `RecordMapListToolbar`, or `null`
   * when the caller enabled zero controls. Rendered ABOVE the scrollable
   * card region and never scrolls with it (AC-4.1/AC-4.2: the two toolbar
   * rows stay fixed while the card list scrolls independently), and renders
   * in BOTH the populated and the empty-state layout — a filter/search that
   * narrowed the list to zero records must still show the controls that can
   * un-narrow it.
   */
  toolbar?: ReactNode
  /**
   * Stage tabs (SPEC Addendum "Stage tabs") — a `CountTabs` strip ("All /
   * Triage / Acknowledged / …"), rendered ABOVE `toolbar` (topmost, same
   * fixed/never-scrolls contract). Purely a slot: this pane attaches no
   * meaning to "which stage is active" — the CALLER (`MapHybridView`)
   * already knows that, and it's the same caller that decides whether to
   * pass `stageChipOf`/`groupLabelOf` at all for the active selection. Omit
   * to render no stage-tab row (unchanged default).
   */
  stageTabs?: ReactNode
  /**
   * Group By (SPEC Addendum AC-6.1..6.4): the active grouping's label for an
   * item. When supplied, `items` are expected PRE-ORDERED by group (the lens
   * owns the ordering — status groups in stage order, everything else by
   * value) and this pane inserts a section header row wherever the label
   * changes between consecutive cards. Omit for the flat list (unchanged
   * default).
   */
  groupLabelOf?: (item: RecordGeometry) => string
  /**
   * "Sync With Map" (Live-Monitoring parity, SPEC §3.22's list-meta-row
   * toggle carried onto the record-map hybrid): while ON the card list is
   * scoped to the map camera's viewport. Same wrapped-Switch markup —
   * including the OFF-state tooltip (UX-NOTES #3) — as `LiveListPanel`'s
   * `live-list-sync` row, never a second idiom. Omit `onSyncWithMapChange`
   * to render no row at all (unchanged default for every other module).
   */
  syncWithMap?: boolean
  onSyncWithMapChange?: (checked: boolean) => void
}

/**
 * RecordMapListPane — the hybrid lens's leading list pane. [tier-2 internal]
 *
 * SPEC §1.3's card is "the same card shell as kanban minus the thumbnail", so
 * it IS the kanban card: `KanbanCardView` in `displayMode="data"`, fed by the
 * same `deriveCard` the board uses. One card shell across lenses is UX note
 * D.53's explicit ruling, and it means the id pill, stage chip, priority chip,
 * meta rows, avatar stack and due date are all blueprint config here too —
 * nothing about them is re-authored for this lens.
 *
 * The two lens-specific affordances:
 *  - the leading **eye toggle** (SPEC §1.3, row 20) — shows/hides THAT
 *    record's pin or polygon. 24px visual box inside a 40×40 hit area (UX
 *    K.65), `aria-pressed` carrying state and an accessible name that states
 *    the ACTION (UX K.67).
 *  - the `…` overflow menu, which is A5's shared `renderRowActions` slot
 *    passed straight through — never a second menu (UX L.75).
 *
 * The pane scrolls internally (`overflow-y-auto`) so the map never moves with
 * it (SPEC row 22), and a selection arriving from the MAP scrolls the matching
 * card into view — the pin→list half of the two-way sync (Dev Note 32270).
 */
export function RecordMapListPane({
  config,
  compiled,
  items,
  selectedId,
  onSelect,
  hiddenIds,
  onToggleHidden,
  stageChipOf,
  selectedIds,
  onSelectedIdsChange,
  renderActions,
  emptyState,
  recordNoun = DEFAULT_RECORD_NOUN,
  isFiltered = false,
  onClearFilters,
  error,
  onRetry,
  onCreateRecord,
  toolbar,
  stageTabs,
  groupLabelOf,
  syncWithMap,
  onSyncWithMapChange,
}: RecordMapListPaneProps) {
  const paneRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef(new Map<string, HTMLLIElement>())

  // Pin/zone click → scroll the matching card into view + highlight it. Driven
  // off the ONE `selectedId`, so a list-side selection re-runs the same
  // harmless `block: 'nearest'` scroll instead of needing its own channel.
  useEffect(() => {
    if (!selectedId) return
    cardRefs.current.get(selectedId)?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  const selected = new Set(selectedIds ?? [])

  return (
    <div data-slot="record-map-list" className="flex h-full min-h-0 flex-col">
      {stageTabs ? (
        <div data-slot="record-map-list-stage-tabs-slot" className="shrink-0 p-3 pb-0">
          {stageTabs}
        </div>
      ) : null}
      {toolbar ? (
        <div data-slot="record-map-list-toolbar-slot" className={cn('shrink-0 p-3 pb-0', stageTabs && 'pt-2')}>
          {toolbar}
        </div>
      ) : null}
      {onSyncWithMapChange ? (
        <div data-slot="record-map-list-sync" className="flex shrink-0 items-center justify-end gap-1.5 px-3 pt-2">
          <span id="record-map-list-sync-label" className="whitespace-nowrap text-caption font-semibold text-gray-400">
            Sync With Map
          </span>
          {syncWithMap ? (
            <Switch
              size="md"
              checked={syncWithMap}
              onCheckedChange={onSyncWithMapChange}
              aria-labelledby="record-map-list-sync-label"
            />
          ) : (
            <TooltipProvider delayDuration={120}>
              <Tooltip>
                {/* QA A4 — wrapped, never `asChild`-merged (see LiveListPanel's
                    identical row for why the trigger must not clone the Switch). */}
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Switch
                      size="md"
                      checked={syncWithMap ?? false}
                      onCheckedChange={onSyncWithMapChange}
                      aria-labelledby="record-map-list-sync-label"
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">Moving the map won&apos;t narrow the list. Turn on to sync.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      ) : null}
      {items.length === 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {/* UX J.57: the pane used to show ONE copy with no action for all
              three causes. Same shared three-cause surface every lens now uses. */}
          {emptyState ?? (
            <RecordViewEmptyState
              cause={resolveEmptyCause(error, isFiltered)}
              noun={recordNoun}
              error={error}
              onRetry={onRetry}
              onClearFilters={onClearFilters}
              onCreateRecord={onCreateRecord}
            />
          )}
        </div>
      ) : (
        <div ref={paneRef} className="min-h-0 flex-1 overflow-y-auto p-3">
          <ul className="flex flex-col gap-3">
            {items.map((item, index) => {
              const hidden = hiddenIds.has(item.id)
              // Group By section headers (SPEC Addendum AC-6.1): items arrive
              // pre-ordered by group, so a header renders exactly where the
              // label changes — no second grouping pass in this pane.
              const groupLabel = groupLabelOf?.(item)
              const previousLabel = index > 0 ? groupLabelOf?.(items[index - 1]) : undefined
              const header =
                groupLabel !== undefined && groupLabel !== previousLabel ? (
                  <li
                    data-slot="record-map-group-header"
                    className="pt-1 text-caption font-semibold uppercase tracking-wide text-muted-foreground first:pt-0"
                  >
                    {groupLabel}
                  </li>
                ) : null
              return (
                <Fragment key={item.id}>
                {header}
                <li
                  ref={(node) => {
                    if (node) cardRefs.current.set(item.id, node)
                    else cardRefs.current.delete(item.id)
                  }}
                >
                  <RecordMapCard
                    config={config}
                    compiled={compiled}
                    record={item.record}
                    id={item.id}
                    label={item.label}
                    index={index}
                    highlighted={selectedId === item.id}
                    onSelect={onSelect}
                    stageChip={stageChipOf?.(item)}
                    actions={renderActions?.(item.record)}
                    leading={{
                      hidden,
                      onToggleHidden,
                      selected: onSelectedIdsChange ? selected.has(item.id) : undefined,
                      onSelectedChange: onSelectedIdsChange
                        ? (id, next) =>
                            onSelectedIdsChange(
                              next ? [...selected, id] : [...selected].filter((existing) => existing !== id),
                            )
                        : undefined,
                    }}
                  />
                </li>
                </Fragment>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

RecordMapListPane.displayName = 'RecordMapListPane'
