import { useMemo, useState } from 'react'
import { Button } from '@fams/ui-kit'
import {
  ModuleView,
  InMemorySavedViewsAdapter,
  type EntityRecord,
  type ViewState,
} from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'
import { dealsConfig, dealRecords, dealTransitions } from './v5-views-blueprint'

const tabRenderers = {
  PipelineTimeline: () => <p className="text-body-sm">Stage history (phase 3).</p>,
  ActivityFeed: () => <p className="text-body-sm">Activity (phase 3).</p>,
  LinkedItems: () => <p className="text-body-sm">Linked (phase 3).</p>,
  Attachments: () => <p className="text-body-sm">Files (phase 3).</p>,
}

/**
 * ModuleViewDemo — the ClickUp-style module container composing all three view
 * templates (List / Kanban / Hybrid) from one blueprint, with a search +
 * filter toolbar and saved views persisted through an in-memory adapter.
 */
export default function ModuleViewDemo() {
  const [records, setRecords] = useState<EntityRecord[]>(dealRecords)
  const [state, setState] = useState<ViewState | null>(null)
  // Stable adapter instance for the session.
  const adapter = useMemo(() => new InMemorySavedViewsAdapter(), [])

  const canMove = (_id: string, from: string, to: string) => (dealTransitions[from] ?? []).includes(to)

  return (
    <DocPage
      title="ModuleView"
      badge="wip"
      summary="The ClickUp-style module container: a toolbar (search, a single Filter popover housing every blueprint facet, a Sort control over the sortable columns, an Assignee split-dropdown when the blueprint has an Assignee-typed field, a cosmetic display-density toggle, and the trailing create action), a view-tab bar from the blueprint view kinds plus user-saved views, and the active view body (List / Kanban / Hybrid). Saved views persist via an injected SavedViewsAdapter; the serializable ViewState is reported via onStateChange for router wiring."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          One blueprint, three views. Switch the tabs (Kanban / List / Hybrid), search + filter, drag cards, and
          use <Code>+</Code> to save the current view — persisted through the in-memory{' '}
          <Code>SavedViewsAdapter</Code>. The active <Code>ViewState</Code> below is serializable (router-ready).
        </Prose>
        <div className="h-[560px] overflow-hidden rounded-md border border-border p-3">
          <ModuleView
            config={dealsConfig}
            records={records}
            views={['kanban', 'list', 'hybrid']}
            savedViews={adapter}
            context={{ userId: 'demo-user', moduleId: 'crm/deals' }}
            actions={<Button size="sm">New deal</Button>}
            canMove={canMove}
            onMove={(id, _from, to) =>
              setRecords((cur) => cur.map((r) => (r.id === id ? { ...r, status: to } : r)))
            }
            editableCols={['systemcol2', 'systemcol3']}
            onRecordChange={(col, value, record) =>
              setRecords((cur) => cur.map((r) => (r.id === record.id ? { ...r, [col]: value } : r)))
            }
            tabRenderers={tabRenderers}
            onStateChange={setState}
          />
        </div>
        <pre className="overflow-x-auto rounded-sm bg-muted p-3 text-caption text-muted-foreground">
          {JSON.stringify(state ?? { viewId: '(none yet)' }, null, 2)}
        </pre>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'config / records', type: 'EntityConfig / EntityRecord[]', description: 'The module blueprint + its records.' },
            { prop: 'views', type: 'ViewKind[]', description: 'The blueprint view kinds — the seed tab set.' },
            { prop: 'savedViews', type: 'SavedViewsAdapter', description: 'Persistence port for the user’s saved views (in-memory default).' },
            { prop: 'context', type: '{ userId, moduleId }', description: 'Scopes saved-view persistence.' },
            { prop: 'onStateChange', type: '(state: ViewState) => void', description: 'Serializable active view / filters / sort / search (router wiring).' },
            { prop: 'canMove / onMove', type: 'fn / fn', description: 'Kanban move guard + commit passthrough.' },
            { prop: 'editableCols / onRecordChange', type: 'string[] / fn', description: 'List inline-edit passthrough.' },
            { prop: 'actions', type: 'ReactNode', description: 'Rendered as the trailing "create" action in the toolbar row (e.g. a "Create New" button), not the page header.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Inject a SavedViewsAdapter for persistence — the container never fetches or stores itself (Rule 8).',
            'Hold ViewState in the router search params via onStateChange for shareable, restorable views.',
            'Let the container pick the body from the blueprint view kind — List / Kanban / Hybrid.',
          ]}
          donts={[
            'Don’t persist saved views inside the template — that’s the adapter’s job.',
            'Don’t branch the body on business rules here — the view kind decides the template.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'View tabs are the core ModuleViewTabs (Radix Tabs); the delete-view control is a scoped DropdownMenu.',
            'Search is a labeled input; filter facets are checkbox dropdowns.',
            'Each body template carries its own a11y (DataTable / Kanban move-menu / Tabs).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
