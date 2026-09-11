import { useMemo, useRef, useEffect, useState } from 'react'
import { Search } from '@fams/ui-kit/icons'
import { Input } from '@fams/ui-kit'
import { compileFieldSet, type EntityConfig, type EntityRecord } from '@fams/v5-composer'
import { cn } from '../../lib/cn'
import { MAP_TOOL_DRAWER_WIDTH } from '../../map/constants'
import { RecordMapCard } from '../hybrid/RecordMapCard'
import { deriveRecordGeometry, recordMapConfig, recordLabel, type RecordGeometry } from '../hybrid/record-map-model'
import { LiveFiltersPopover } from './LiveFiltersPopover'
import { useLiveSearchFilters } from './use-live-view-state'
import { RecordViewEmptyState } from '../RecordViewStates'

const INCIDENT_NOUN = { one: 'incident', many: 'incidents' }

/**
 * IncidentsDrawer — the live monitoring map's Incidents panel (SPEC parity
 * with the Zones/POI right drawers: the SAME right-docked, full-height
 * `MAP_TOOL_DRAWER_WIDTH` panel flush to the map pane's inline-end edge, no
 * scrim, Escape dismissal, focus moved in on open / returned on close).
 *
 * Content, top to bottom (unlike Zones/POI's table-of-checkboxes): a search
 * field + filter funnel (the SAME `LiveFiltersPopover` facet machinery the
 * incidents hybrid's own toolbar uses — `useLiveSearchFilters` derives its
 * facets straight off the incidents blueprint, scoped to exactly this
 * record set), then a SCROLLABLE LIST OF CARDS — the incidents hybrid's own
 * `RecordMapCard` (stage chip, reported-by/location/tags/footer as the
 * blueprint already configures it), leading with the eye toggle: eye ON
 * plots that incident's pin on the live map, eye OFF hides it. Search and
 * the filter funnel narrow the card list AND (via `hiddenIds` intersecting
 * with the caller's visible-pin set) the map pins together — see
 * `LiveHybridView`'s wiring.
 */
export interface IncidentsDrawerProps {
  open: boolean
  onClose: () => void
  config: EntityConfig
  records: EntityRecord[]
  /** The map-synced highlight — the SAME id the pin-click path uses. */
  selectedId?: string | null
  onSelect: (id: string) => void
  /** Incidents whose pin the eye toggle has hidden from the map. */
  hiddenIds: Set<string>
  onToggleHidden: (id: string) => void
  /** Card click → open the incident's detail side sheet (the hybrid/related-card opener seam). */
  onOpenRecord?: (record: EntityRecord) => void
  /**
   * Reports the CURRENT search∩filter-narrowed item set — the drawer owns
   * its own search/filter state (same self-contained convention `ZonesDrawer`
   * /`PoiDrawer` follow), so this is how the caller keeps the map's pin set
   * in lockstep with what the card list is showing (search + facet filters
   * narrow both the card list AND the visible pins together).
   */
  onVisibleItemsChange?: (items: RecordGeometry[]) => void
}

export function IncidentsDrawer({
  open,
  onClose,
  config,
  records,
  selectedId,
  onSelect,
  hiddenIds,
  onToggleHidden,
  onOpenRecord,
  onVisibleItemsChange,
}: IncidentsDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement as HTMLElement | null
    panelRef.current?.querySelector<HTMLElement>('input')?.focus()
    return () => restoreRef.current?.focus?.()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-radix-popper-content-wrapper], [role="listbox"]')) return
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const compiled = useMemo(() => compileFieldSet(config), [config])
  const showStageChip = Boolean(config.uiConfig.map?.records?.card?.stageChip)
  const stageChipOf = useMemo(() => {
    if (!showStageChip) return undefined
    const byKey = new Map((config.uiConfig.statusList ?? []).map((s) => [s.key, s] as const))
    return (item: RecordGeometry) => {
      const stage = byKey.get(String(item.record.status ?? ''))
      return stage ? { label: stage.label, color: stage.color } : undefined
    }
  }, [showStageChip, config])

  const live = useLiveSearchFilters(config, records)
  const [tagsOpen, setTagsOpen] = useState(false)

  const items = useMemo(() => deriveRecordGeometry(config, live.filtered), [config, live.filtered])
  useEffect(() => {
    onVisibleItemsChange?.(items)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report on change only
  }, [items])

  if (!open) return null
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Incidents"
      data-slot="incidents-drawer"
      className="absolute inset-y-0 z-20 flex max-w-full flex-col overflow-hidden border-s border-border bg-card shadow-lg"
      style={{ insetInlineEnd: 0, width: MAP_TOOL_DRAWER_WIDTH }}
    >
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={live.search}
            onChange={(e) => live.setSearch(e.target.value)}
            placeholder="Search Incidents"
            aria-label="Search Incidents"
            className="h-8 ps-8"
          />
        </div>
        <LiveFiltersPopover
          open={tagsOpen}
          onOpenChange={setTagsOpen}
          groups={live.groups}
          value={live.filterValue}
          onChange={live.setFilterValue}
          tagGroups={live.tagGroups}
          saved={live.savedFilters}
          onSaveFilter={live.saveFilter}
          onRenameFilter={live.renameFilter}
          onDeleteFilter={live.deleteFilter}
        />
      </div>

      <div data-slot="incidents-drawer-list" className="fams-scroll-region min-h-0 flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <RecordViewEmptyState
            cause="filtered"
            noun={INCIDENT_NOUN}
            onClearFilters={() => {
              live.setFilterValue({ filters: {}, tags: [] })
              live.setSearch('')
            }}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item, index) => (
              <li key={item.id}>
                <RecordMapCard
                  config={config}
                  compiled={compiled}
                  record={item.record}
                  id={item.id}
                  label={item.label || recordLabel(item.record)}
                  index={index}
                  highlighted={selectedId === item.id}
                  onSelect={(id) => {
                    onSelect(id)
                    onOpenRecord?.(item.record)
                  }}
                  stageChip={stageChipOf?.(item) ?? (item.colorKey ? { label: item.colorKey, color: item.color } : undefined)}
                  leading={{
                    hidden: hiddenIds.has(item.id),
                    onToggleHidden,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div data-slot="map-tool-drawer-exit" className="relative flex-none" style={{ height: 40 }}>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'rounded-md border border-border bg-card px-3 text-body-sm text-foreground shadow-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
          )}
          style={{ position: 'absolute', insetInlineStart: 8, top: 4, height: 32, zIndex: 30 }}
        >
          Close Incidents
        </button>
      </div>
    </div>
  )
}

IncidentsDrawer.displayName = 'IncidentsDrawer'

/** `[lng, lat]` incident pins for the live map — the eye-on ∩ search∩filter
 *  set (`hiddenIds` intersects with the drawer's own narrowed `items`). */
export function incidentMapPins(items: RecordGeometry[], hiddenIds: Set<string>) {
  return items
    .filter((item) => item.point && !hiddenIds.has(item.id))
    .map((item) => ({
      id: item.id,
      label: item.label || recordLabel(item.record),
      position: item.point as [number, number],
      color: item.color,
      colorKey: item.colorKey,
    }))
}

export { recordMapConfig as incidentsRecordMapConfig }
