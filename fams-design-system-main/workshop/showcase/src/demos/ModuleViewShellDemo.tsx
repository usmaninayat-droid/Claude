import { useState } from 'react'
import { DataTable, MapPlaceholder, KanbanBoard, KanbanColumn, KanbanCard, type DataTableColumn } from '@fams/ui-kit'
import { ModuleViewShell, type ModuleViewTab } from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

/**
 * ModuleViewShellDemo — standalone showcase for the v5-templates tier's first
 * exemplar. DRAFT — for design-team review, not yet wired into nav.ts or the
 * shared showcase registry (orchestrator serializes that centrally).
 *
 * Demonstrates the whole point of the pattern: `ModuleViewShell` owns the
 * view-tab chrome and body swap; THIS demo — not the shell — owns the
 * "saved views" array as local state and decides what create/delete mean.
 * A real app would back that with a `useModuleView`-style hook instead of
 * `useState`; the shell's contract is identical either way.
 */

interface Ticket {
  id: string
  plate: string
  driver: string
  status: 'Open' | 'In progress' | 'Resolved'
}

const TICKETS: Ticket[] = [
  { id: 't1', plate: 'AUH 45213', driver: 'Rashid Al Mansoori', status: 'Open' },
  { id: 't2', plate: 'AUH 30188', driver: 'Kareem Haddad', status: 'In progress' },
  { id: 't3', plate: 'AUH 77104', driver: 'Omar Farouk', status: 'Resolved' },
]

const TICKET_COLUMNS: DataTableColumn<Ticket>[] = [
  { key: 'plate', label: 'Plate' },
  { key: 'driver', label: 'Driver' },
  { key: 'status', label: 'Status' },
]

const KANBAN_CARDS: Record<Ticket['status'], Ticket[]> = {
  Open: TICKETS.filter((t) => t.status === 'Open'),
  'In progress': TICKETS.filter((t) => t.status === 'In progress'),
  Resolved: TICKETS.filter((t) => t.status === 'Resolved'),
}

const INITIAL_VIEWS: ModuleViewTab[] = [
  { id: 'list', label: 'List View', type: 'list' },
  { id: 'map', label: 'Map View', type: 'map' },
  { id: 'kanban', label: 'By status', type: 'kanban' },
]

/** Body per view — a tiny stand-in for the real feature panel each would render. */
function ViewBody({ view }: { view: ModuleViewTab }) {
  if (view.type === 'list') {
    return (
      <div className="h-full overflow-auto rounded-md border border-border">
        <DataTable data={TICKETS} columns={TICKET_COLUMNS} getRowId={(row) => row.id} />
      </div>
    )
  }
  if (view.type === 'map') {
    return (
      <div className="h-full min-h-64 overflow-hidden rounded-md border border-border">
        <MapPlaceholder label="Ticket locations" />
      </div>
    )
  }
  if (view.type === 'kanban') {
    return (
      <div className="w-full overflow-x-auto rounded-md border border-border bg-muted/20 p-4">
        <KanbanBoard columns={Object.keys(KANBAN_CARDS).map((id) => ({ id }))} className="w-full">
          {Object.entries(KANBAN_CARDS).map(([status, cards]) => (
            <KanbanColumn key={status} id={status} title={status} count={cards.length}>
              {cards.map((card, index) => (
                <KanbanCard key={card.id} id={card.id} index={index} title={`${card.plate} — ${card.driver}`} />
              ))}
            </KanbanColumn>
          ))}
        </KanbanBoard>
      </div>
    )
  }
  // 'hybrid' | 'grid' — not created by this demo's "+" flow, but renderView
  // must stay total over ModuleView.type since a real app's view set can grow.
  return (
    <div className="grid h-full min-h-32 place-items-center rounded-md border border-dashed border-border text-body-sm text-muted-foreground">
      No body wired up for a "{view.type}" view yet.
    </div>
  )
}

let nextViewSeq = 1

export default function ModuleViewShellDemo() {
  const [views, setViews] = useState<ModuleViewTab[]>(INITIAL_VIEWS)
  const [activeViewId, setActiveViewId] = useState('list')
  const [log, setLog] = useState<string[]>([])

  const pushLog = (line: string) => setLog((l) => [line, ...l].slice(0, 4))

  const handleCreateView = () => {
    const id = `custom-${nextViewSeq++}`
    const view: ModuleViewTab = { id, label: `Custom view ${nextViewSeq - 1}`, type: 'list' }
    setViews((v) => [...v, view])
    setActiveViewId(id)
    pushLog(`onCreateView → app appended "${view.label}" and switched to it (no persistence here — just useState)`)
  }

  const handleDeleteView = (id: string) => {
    const deleted = views.find((v) => v.id === id)
    const remaining = views.filter((v) => v.id !== id)
    setViews(remaining)
    if (activeViewId === id) setActiveViewId(remaining[0]?.id ?? '')
    pushLog(`onDeleteView("${id}") → app removed "${deleted?.label}" from its own view list`)
  }

  return (
    <DocPage
      title="ModuleViewShell"
      badge="wip"
      summary="Draft exemplar for design-team review — the v5 saved-view module workhorse. A bar of saved views (List/Map/Kanban/…) plus a swappable body for whichever view is active. Presentational: the shell never fetches or stores — saved-view persistence is the app's job via a useModuleView-style hook."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Switch views with the tabs, add a view with the trailing <Code>+</Code>, delete the
          active view from the <Code>⋮</Code> menu next to it. Every action below is logged from
          the demo's own callback handlers — <Code>ModuleViewShell</Code> itself holds no state
          about which views exist.
        </Prose>
        <div className="h-[480px] w-full overflow-hidden rounded-md border border-border bg-card p-4">
          <ModuleViewShell
            views={views}
            activeViewId={activeViewId}
            onViewChange={(id) => {
              setActiveViewId(id)
              pushLog(`onViewChange("${id}")`)
            }}
            onCreateView={handleCreateView}
            onDeleteView={views.length > 1 ? handleDeleteView : undefined}
            renderView={(view) => <ViewBody view={view} />}
          />
        </div>
        {log.length > 0 ? (
          <DevNote title="Callback log (most recent first)">
            <ul className="flex flex-col gap-1 font-mono text-caption">
              {log.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </DevNote>
        ) : null}
      </DocSection>

      <DocSection id="boundary" title="The DS/app boundary this exemplar demonstrates">
        <Prose>
          <Code>ModuleViewShell</Code> owns the view-TAB chrome (via core's{' '}
          <Code>ModuleViewTabs</Code>) and the active-view body swap. It never fetches or stores.
          The saved-view definitions — which filters, which columns, which search are attached to
          "Custom view 1" — and their server persistence are the consuming app's concern, typically
          a <Code>useModuleView(moduleId)</Code> hook that returns <Code>views</Code> and wraps{' '}
          <Code>onCreateView</Code>/<Code>onDeleteView</Code> with real API calls. This demo fakes
          that hook with a plain <Code>useState</Code> — swap it for the real thing and the shell's
          contract doesn't change.
        </Prose>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'views',
              type: 'ModuleView[]',
              required: true,
              description: "The module's saved views. Each is { id, label, type }; type picks the tab icon.",
            },
            {
              prop: 'activeViewId',
              type: 'string',
              required: true,
              description: 'Controlled active view id.',
            },
            {
              prop: 'onViewChange',
              type: '(id: string) => void',
              required: true,
              description: 'Fires with the newly-selected view id. The shell does not switch itself.',
            },
            {
              prop: 'onCreateView',
              type: '() => void',
              description:
                'Presence adds the "+" control. The shell creates nothing — the app opens its own new-view flow.',
            },
            {
              prop: 'onDeleteView',
              type: '(id: string) => void',
              description:
                'Presence adds a delete control scoped to the active view. The shell deletes nothing — the app removes it server-side and from `views`.',
            },
            {
              prop: 'renderView',
              type: '(view: ModuleView) => ReactNode',
              required: true,
              description: "The body slot — renders whatever the app wants for the active view.",
            },
            {
              prop: 'title / actions',
              type: 'ReactNode',
              description: 'Optional header row, rendered via PageHeader. Omit both for an embedded shell.',
            },
            {
              prop: 'filters / search',
              type: 'ReactNode',
              description: "Slot region for the active view's filter/search chrome — content is entirely the caller's.",
            },
            {
              prop: 'createViewLabel / deleteViewLabel',
              type: 'string',
              default: "'Add view' / 'Delete view'",
              description: 'i18n + accessible labels for the create/delete controls.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Back `views` with a useModuleView-style hook that owns fetch + persistence; pass its data straight through.',
            'Keep renderView bodies swappable — DataTable for list, MapContainer for map, KanbanBoard for kanban — each already state-agnostic.',
            'Use filters/search for the active view\'s own chrome; the shell reserves the row but never inspects the content.',
          ]}
          donts={[
            "Don't have ModuleViewShell call an API to create/delete a view — that belongs in the app's hook.",
            "Don't fork ModuleViewTabs to add per-tab delete — compose an adjacent control instead (see this file's source).",
            'Don\'t encode business rules like "always keep one view" inside the shell — gate onDeleteView from the app if that\'s a real constraint.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The view tab strip inherits ModuleViewTabs\' roving-tabindex keyboard nav (arrow keys move + activate).',
            'The delete control is a labelled icon button (aria-label from deleteViewLabel) opening a Radix DropdownMenu — full keyboard + screen-reader support for free.',
            'RTL-safe: every layout class is logical (gap, justify-end) — no physical-direction utilities.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
