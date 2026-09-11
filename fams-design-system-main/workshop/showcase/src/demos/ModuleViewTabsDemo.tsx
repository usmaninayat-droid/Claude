import { useState } from 'react'
import { LayoutGrid, List, Map as MapIcon, KanbanSquare } from '@fams/ui-kit/icons'
import { ModuleViewTabs, type ModuleViewTab } from '../../../../packages/ui-kit/src/composites/ModuleViewTabs'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * Standalone showcase demo for ModuleViewTabs — not wired into nav.ts or any
 * shared showcase page yet (orchestrator serializes that). Belongs under the
 * "Navigation" section, next to Tabs/Breadcrumbs — it's what plugs into
 * TopNav's `tabs` slot for a module's Hybrid/List/Map/Kanban view switcher.
 */

const VIEWS: ModuleViewTab[] = [
  { id: 'hybrid', label: 'Hybrid View', icon: LayoutGrid },
  { id: 'list', label: 'List View', icon: List },
  { id: 'map', label: 'Map View', icon: MapIcon },
  { id: 'kanban', label: 'Kanban View', icon: KanbanSquare },
]

const VARIANTS = ['pill', 'segment'] as const

type ModuleViewTabsControls = {
  variant: (typeof VARIANTS)[number]
  showAddView: boolean
}

function PlaygroundExample({
  variant,
  addable,
}: {
  variant: (typeof VARIANTS)[number]
  addable: boolean
}) {
  const [active, setActive] = useState('hybrid')
  const [count, setCount] = useState(0)
  return (
    <div className="flex flex-col items-center gap-2">
      <ModuleViewTabs
        views={VIEWS}
        active={active}
        onSelect={setActive}
        variant={variant}
        onAddView={addable ? () => setCount((n) => n + 1) : undefined}
      />
      {addable && <p className="text-body-xs text-muted-foreground">Add clicked: {count}</p>}
    </div>
  )
}

export default function ModuleViewTabsDemo() {
  const [pillActive, setPillActive] = useState('hybrid')
  const [segmentActive, setSegmentActive] = useState('list')

  return (
    <DocPage
      title="ModuleViewTabs"
      badge="stable"
      summary="Compact switcher for a module's views — plugs into TopNav's `tabs` slot. Controlled (active + onSelect), state-agnostic: it only switches which id is active, the app renders the matching view. Retires v5's ViewTabs.vue kind-switch behaviour and the ZonesFilterPanel flat/tree toggle pattern."
    >
      <DocSection id="playground" title="Playground">
        <Playground<ModuleViewTabsControls>
          controls={[
            { name: 'variant', type: 'select', default: 'pill', options: VARIANTS },
            { name: 'showAddView', type: 'boolean', default: false },
          ]}
        >
          {(v) => <PlaygroundExample variant={v.variant} addable={v.showAddView} />}
        </Playground>
      </DocSection>

      <DocSection id="variants" title="Variants">
        <Prose>
          <Code>pill</Code> is the compact rounded toolbar look (default); <Code>segment</Code> is
          bordered, full-height — the primary module top-bar look.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'pill',
              node: <ModuleViewTabs views={VIEWS} active={pillActive} onSelect={setPillActive} />,
            },
            {
              label: 'segment',
              node: (
                <ModuleViewTabs
                  views={VIEWS}
                  active={segmentActive}
                  onSelect={setSegmentActive}
                  variant="segment"
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'views',
              type: 'ModuleViewTab[]',
              required: true,
              description:
                "The module's available views — order is render order. Each entry has an id, label, and optional icon.",
            },
            {
              prop: 'active',
              type: 'string',
              required: true,
              description: 'Controlled active view id.',
            },
            {
              prop: 'onSelect',
              type: '(id: string) => void',
              required: true,
              description:
                'Fires with the newly-activated view id on click or roving-tabindex arrow nav.',
            },
            {
              prop: 'variant',
              type: "'pill' | 'segment'",
              default: "'pill'",
              description:
                'pill is compact/rounded; segment is bordered full-height for the primary module top-bar.',
            },
            {
              prop: 'onAddView',
              type: '() => void',
              description: 'Renders a trailing + affordance for adding a new view. Omit to hide it entirely.',
            },
            {
              prop: 'addViewLabel',
              type: 'string',
              default: "'Add view'",
              description: 'Accessible label for the add-view button.',
            },
            {
              prop: '…props',
              type: 'ComponentPropsWithoutRef<typeof Tabs.Root>',
              description:
                'Native Radix Tabs.Root attributes pass through (value/defaultValue/onValueChange/onSelect excluded — this component owns them).',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use it inside TopNav’s tabs slot to switch a module between Hybrid/List/Map/Kanban.',
            'Use segment for the primary module top-bar; pill for a compact secondary toolbar.',
            'Give every view a stable id — it becomes the Radix tab value.',
            'Only wire onAddView when the module actually supports creating new views.',
          ]}
          donts={[
            'Don’t use it as a page router — it switches an id, the app renders the matching view.',
            'Don’t attach a per-tab menu (rename/close/save) — this component covers only the plain kind-switch.',
            'Don’t mix icon and no-icon tabs inconsistently within the same bar.',
            'Don’t manage active state outside a single source of truth — it is fully controlled.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Built on Radix Tabs — roving tabindex, arrow keys move focus and activate the tab.',
            'The tab list carries an aria-label ("Module views" by default, override via aria-label).',
            'The add-view button always needs addViewLabel — it is icon-only and otherwise unreadable to assistive tech.',
            'Layout uses logical properties (border-e, ps-/pe-), so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
