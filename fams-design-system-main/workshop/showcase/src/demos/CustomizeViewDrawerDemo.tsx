import { useState } from 'react'
import { Button } from '@fams/ui-kit'
import {
  CustomizeViewDrawer,
  defaultCustomizeViewState,
  defaultLiveListColumns,
  liveListColumnCatalog,
  liveMonitoringConfig,
  type CustomizeViewState,
} from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

const catalog = liveListColumnCatalog(liveMonitoringConfig)

/** CustomizeViewDrawerDemo — the 384px Customize View drawer, hybrid + list variants (WP7). */
export default function CustomizeViewDrawerDemo() {
  const [variant, setVariant] = useState<'hybrid' | 'list'>('hybrid')
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<CustomizeViewState>(() => defaultCustomizeViewState('Hybrid View'))
  const [columns, setColumns] = useState(() => defaultLiveListColumns(liveMonitoringConfig, 'collapsed'))

  return (
    <DocPage
      title="CustomizeViewDrawer"
      badge="wip"
      summary="The live-monitoring Customize View right drawer (DRAFT, 384px): name input, Fields row drilling into an inline Columns sub-panel, Filter row, List View State dropdown, Autosave/Private/Protect toggles, Pin View + Set as Default dropdowns, hybrid-only map/widget toggles, and footer Copy Link (Copied! swap) / Sharing / Delete. The list variant omits the map/widget rows entirely."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          In the module, the drawer opens from the active view tab’s <Code>⋮</Code> menu. Try both
          variants — <Code>list</Code> drops List View State and every map/widget toggle.
        </Prose>
        <div className="relative h-[36rem] overflow-hidden rounded-md border border-border bg-muted/30">
          <div className="flex items-center gap-2 p-4">
            <Button size="sm" onClick={() => setOpen(true)}>
              Open Customize View
            </Button>
            <Button
              size="sm"
              variant="tertiary"
              onClick={() => setVariant((v) => (v === 'hybrid' ? 'list' : 'hybrid'))}
            >
              Variant: {variant}
            </Button>
          </div>
          <CustomizeViewDrawer
            open={open}
            onClose={() => setOpen(false)}
            variant={variant}
            state={state}
            onStateChange={setState}
            columns={columns}
            onColumnsChange={setColumns}
            catalog={catalog}
            filterCount={0}
            onEditFilters={() => setOpen(false)}
            onCopyLink={() => {}}
            onShare={() => {}}
            onDelete={() => setOpen(false)}
          />
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'open / onClose', type: 'boolean / () => void', required: true, description: 'Controlled visibility; Escape and ✕ both close.' },
            { prop: 'variant', type: "'hybrid' | 'list'", required: true, description: 'list omits List View State and the map/widget toggles (spec §1.10).' },
            { prop: 'state / onStateChange', type: 'CustomizeViewState', required: true, description: 'Every row round-trips through this one controlled object.' },
            { prop: 'columns / onColumnsChange / catalog', type: 'string[] / fn / ColumnCatalogItem[]', required: true, description: 'The Fields sub-panel — same contract as ColumnCustomizer.' },
            { prop: 'filterCount / onEditFilters', type: 'number / () => void', description: 'The Filter row’s count and click-through (e.g. open the All Filters popover).' },
            { prop: 'onCopyLink / onShare / onDelete', type: '() => void', description: 'Footer actions; Copy Link swaps its label to “Copied!” for ~2s.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Open it from the view tab’s ⋮ menu (ModuleViewShell viewMenuItems) — LiveHybridView wires this for the hybrid kind.',
            'Round-trip List View State with the divider grabbers — both write the same three values.',
          ]}
          donts={[
            'Don’t persist the state inside the drawer — the caller owns the saved view (rule 8).',
            'Don’t add a scrim — the view stays live behind this non-modal panel.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'role="dialog" with an accessible name; focus moves in on open and returns on close.',
            'Escape closes the innermost surface first: the Fields sub-panel backs out before the drawer closes.',
            'Every toggle is a real switch with a label; dropdowns are labeled Selects; rows are ≥40px targets.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
