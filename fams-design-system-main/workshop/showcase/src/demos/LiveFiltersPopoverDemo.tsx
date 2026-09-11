import { useState } from 'react'
import {
  LiveFilterChips,
  LiveFiltersPopover,
  applyLiveFilters,
  buildLiveFilterGroups,
  deriveTagGroups,
  emptyLiveFilterValue,
  liveMonitoringConfig,
  liveVehicleRecords,
  type LiveFilterValue,
  type SavedLiveFilter,
} from '@fams/v5-templates'
import { deriveFilters } from '@fams/v5-composer'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

const facets = deriveFilters(liveMonitoringConfig)
const groups = buildLiveFilterGroups(facets, liveVehicleRecords)
const tagGroups = deriveTagGroups(liveMonitoringConfig, liveVehicleRecords)

/** LiveFiltersPopoverDemo — the live-monitoring "All Filters" popover + applied chips (WP7). */
export default function LiveFiltersPopoverDemo() {
  const [value, setValue] = useState<LiveFilterValue>(emptyLiveFilterValue)
  const [saved, setSaved] = useState<SavedLiveFilter[]>([])
  const filtered = applyLiveFilters(liveVehicleRecords, value, liveMonitoringConfig.uiConfig.map?.tagsCol)

  return (
    <DocPage
      title="LiveFiltersPopover"
      badge="wip"
      summary="The live-monitoring All Filters popover (DRAFT) — funnel trigger with red active-count badge, Tags multiselect with grouped suggestions, checkbox groups with per-option counts (selected groups badge + jump to the top), saved-filter bookmarks, Clear all — paired with the LiveFilterChips applied-chip rows (value-editor dropdown per chip, chip ✕, Hide/Show collapse)."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Open the funnel, check options, add a tag, then save the set via the bookmark. Chips render
          below; each value-group chip edits inline via its <Code>▾</Code>. Matching records:{' '}
          <Code>{`${filtered.length} of ${liveVehicleRecords.length}`}</Code>.
        </Prose>
        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          <div>
            <LiveFiltersPopover
              groups={groups}
              value={value}
              onChange={setValue}
              tagGroups={tagGroups}
              saved={saved}
              onSaveFilter={(name) => setSaved((p) => [...p, { id: `sf-${p.length + 1}`, name, value }])}
              onRenameFilter={(id, name) => setSaved((p) => p.map((f) => (f.id === id ? { ...f, name } : f)))}
              onDeleteFilter={(id) => setSaved((p) => p.filter((f) => f.id !== id))}
            />
          </div>
          <LiveFilterChips groups={groups} value={value} onChange={setValue} />
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'groups', type: 'LiveFilterGroup[]', required: true, description: 'Checkbox groups with per-option counts — from buildLiveFilterGroups(deriveFilters(config), records).' },
            { prop: 'value / onChange', type: 'LiveFilterValue', required: true, description: 'Controlled filter state: { filters: Record<col, string[]>, tags: string[] }.' },
            { prop: 'tagGroups', type: 'LiveTagGroup[]', description: 'Tags suggestion vocabulary (deriveTagGroups reads uiConfig.map.tagsCol). Omit to hide the Tags field.' },
            { prop: 'saved / onSaveFilter / onRenameFilter / onDeleteFilter', type: 'SavedLiveFilter[] + callbacks', description: 'Saved-filter bookmark seam — in-memory upstream by default.' },
            { prop: 'open / onOpenChange', type: 'boolean', description: 'Optional controlled popover visibility.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Derive groups/tags from the blueprint (deriveFilters + uiConfig.map.tagsCol) — metadata first.',
            'Apply selections immediately (applyLiveFilters) — the popover has no Apply button by design.',
            'Pair with LiveFilterChips so applied filters stay visible and editable under the search bar.',
          ]}
          donts={[
            'Don’t persist saved filters inside the component — supply the seam (rule 8).',
            'Don’t open it alongside another anchored popover — one at a time app-wide.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Funnel trigger carries the active count in its accessible name; the badge is decorative.',
            'Groups are fieldsets with legends; every option row is a ≥40px labeled checkbox with its count.',
            'Chip ✕ targets are 24px visuals with ≥40px hit areas; chips expose full values via title.',
            'Escape closes the innermost surface first (value editor → popover); focus returns to the trigger.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
