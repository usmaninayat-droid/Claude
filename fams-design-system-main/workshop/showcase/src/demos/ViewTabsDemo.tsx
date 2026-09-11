import { useState } from 'react'
import { ViewTabs, type ViewTab } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const INITIAL_TABS: ViewTab[] = [
  { id: 'all', label: 'All bins' },
  { id: 'overdue', label: 'Overdue', dirty: true },
  { id: 'lot1', label: 'Lot 1' },
]

type ViewTabsControls = {
  showAdd: boolean
  showClose: boolean
  showRename: boolean
}

function InteractiveViewTabs({ showAdd, showClose, showRename }: ViewTabsControls) {
  const [tabs, setTabs] = useState(INITIAL_TABS)
  const [activeId, setActiveId] = useState(INITIAL_TABS[1].id)

  const handleClose = (id: string) => {
    setTabs((prev) => prev.filter((tab) => tab.id !== id))
    if (id === activeId) {
      const remaining = tabs.filter((tab) => tab.id !== id)
      if (remaining[0]) setActiveId(remaining[0].id)
    }
  }

  const handleAdd = () => {
    const id = `view-${Date.now()}`
    setTabs((prev) => [...prev, { id, label: 'New view' }])
    setActiveId(id)
  }

  const handleRename = (id: string, label: string) => {
    setTabs((prev) => prev.map((tab) => (tab.id === id ? { ...tab, label } : tab)))
  }

  const clearDirty = (id: string) => {
    setTabs((prev) => prev.map((tab) => (tab.id === id ? { ...tab, dirty: false } : tab)))
  }

  return (
    <div className="w-full max-w-xl">
      <ViewTabs
        tabs={tabs}
        activeId={activeId}
        onSelect={setActiveId}
        onAdd={showAdd ? handleAdd : undefined}
        onClose={showClose ? handleClose : undefined}
        onRename={showRename ? handleRename : undefined}
        onRevert={() => clearDirty(activeId)}
        onSaveAsNew={() => clearDirty(activeId)}
        onSave={() => clearDirty(activeId)}
      />
    </div>
  )
}

/**
 * ViewTabsDemo — browser-style tabs over a caller's list of saved views
 * (filter presets, dashboard views): select, per-tab rename, close, add. The
 * active tab's dirty flag surfaces a Modified strip with Revert / Save as
 * new / Save. Retires the v5 codebase's shared/components/tabs/ViewTabs.vue
 * + ModuleViewLayout.vue.
 */
export default function ViewTabsDemo() {
  return (
    <DocPage
      title="ViewTabs"
      badge="stable"
      summary="Browser-style tabs over a caller's list of saved views (filter presets, dashboard views) — select, per-tab rename, close, and add. The active tab's dirty flag surfaces a Modified strip with Revert / Save as new / Save. Retires the v5 codebase's shared/components/tabs/ViewTabs.vue + ModuleViewLayout.vue."
    >
      <DocSection id="playground" title="Playground">
        <Playground<ViewTabsControls>
          controls={[
            { name: 'showAdd', type: 'boolean', default: true },
            { name: 'showClose', type: 'boolean', default: true },
            { name: 'showRename', type: 'boolean', default: true },
          ]}
        >
          {(v) => <InteractiveViewTabs showAdd={v.showAdd} showClose={v.showClose} showRename={v.showRename} />}
        </Playground>
        <Prose>
          The "Overdue" tab starts active and dirty, showing the Modified strip — rename via the
          per-tab menu, close via ×, add via +. Each control toggles the matching callback's
          presence: <Code>onAdd</Code>/<Code>onClose</Code>/<Code>onRename</Code> are only wired
          when their affordance should exist.
        </Prose>
      </DocSection>

      <DocSection id="read-only" title="Read-only strip">
        <Prose>Omitting onRename/onClose/onAdd renders a plain select-only strip.</Prose>
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'Select-only',
              node: (
                <div className="w-full max-w-md">
                  <ViewTabs tabs={INITIAL_TABS.map((t) => ({ ...t, dirty: false }))} activeId="all" onSelect={() => {}} />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'tabs', type: 'ViewTab[]', required: true, description: 'Saved views — { id, label, dirty? }.' },
            { prop: 'activeId', type: 'string', required: true, description: 'Currently selected tab id.' },
            { prop: 'onSelect', type: '(id: string) => void', required: true, description: 'Fires when a tab is clicked or reached via arrow keys.' },
            { prop: 'onAdd', type: '() => void', description: 'Presence adds the "+" control at the end of the strip.' },
            { prop: 'onClose', type: '(id: string) => void', description: 'Presence adds a close (×) control to every tab.' },
            { prop: 'onRename', type: '(id: string, label: string) => void', description: 'Presence adds a "Rename" menu to every tab.' },
            { prop: 'onRevert', type: '() => void', description: 'Modified strip "Revert" action for the active (dirty) tab.' },
            { prop: 'onSaveAsNew', type: '() => void', description: 'Modified strip "Save as new" action for the active (dirty) tab.' },
            { prop: 'onSave', type: '() => void', description: 'Modified strip "Save" action for the active (dirty) tab.' },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'>",
              description: 'className and any other div attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Wire onAdd/onClose/onRename only where that affordance is genuinely supported.',
            'Clear a tab\'s dirty flag immediately after Revert/Save/Save as new resolves.',
            'Keep tab labels short — this is a tab strip, not a breadcrumb.',
            'Persist the active view id per module so a refresh restores the same tab.',
          ]}
          donts={[
            "Don't set dirty on more than one tab at a time; the Modified strip reflects only the active tab.",
            "Don't omit onSelect — it is the one required callback, even for a read-only strip.",
            "Don't use ViewTabs for primary page navigation — it is scoped to saved-view switching within a module.",
            "Don't rename a tab to an empty string; the component ignores empty commits.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Tab strip uses role="tablist" with each tab as role="tab" and aria-selected, plus roving tabIndex.',
            'ArrowLeft/ArrowRight move selection and focus between tabs; Enter/Space select the focused tab.',
            'Rename and close controls are independently focusable buttons nested in the tab (a tab is a div, not a button, so it can legally host them).',
            'The add (+) control, per-tab menu, and close (×) stay on their logical side under RTL (switch the header language) — ms-/pe- only, no ml-/mr-.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
