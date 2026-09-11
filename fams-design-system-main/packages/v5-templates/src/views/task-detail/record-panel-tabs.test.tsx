import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { TaskDetailPanel } from '../TaskDetailPanel'
import { RecordListTab } from './RecordListTab'

/**
 * The regression guards for the round-2 "Task Detail is missing Linked and
 * Attachments" finding — and, more importantly, for WHY it was missing.
 *
 * The tabs were declared config-driven, but two seams were open: the config
 * layer dropped each tab's `component.props` on the floor, and the panel only
 * ever consulted the app-injected `tabRenderers` map, never the named tab
 * registry. Between them, a blueprint could name a generic tab component and
 * still get a dead pane — so the only tabs that could ever exist were ones an
 * app had hand-written, which is exactly the two that shipped.
 *
 * Everything below asserts RENDERED OUTPUT for a blueprint-shaped tab list,
 * never that a prop was passed.
 */

const config = { name: 'Pipeline Management', code: 'pipelines' } as unknown as EntityConfig

function panel(tabs: Parameters<typeof TaskDetailPanel>[0]['tabs'], record: EntityRecord) {
  return render(
    <TaskDetailPanel
      tabs={tabs}
      activeTab={tabs[0]?.key ?? ''}
      onActiveTabChange={() => {}}
      config={config}
      record={record}
    />,
  )
}

describe('record right-panel tabs — generic, config-driven (PLATFORM-MODEL Task Detail)', () => {
  it('renders a named generic tab from the registry, with the field its blueprint props name', () => {
    panel(
      [
        {
          key: 'attachments',
          title: 'Attachments',
          component: 'RecordList',
          componentProps: { field: 'attachments', variant: 'file' },
        },
      ],
      { attachments: [{ id: 'a1', name: 'site-report.pdf', mimeType: 'application/pdf' }] } as unknown as EntityRecord,
    )
    // The row is real content resolved from the record — not the "contract
    // slot" placeholder a dead tab used to show.
    expect(screen.getByText('site-report.pdf')).toBeInTheDocument()
    expect(screen.queryByText(/contract slot/i)).not.toBeInTheDocument()
  })

  it('renders a REAL empty state, never a dead tab, when the field has no data yet', () => {
    panel(
      [
        {
          key: 'linked',
          title: 'Linked',
          component: 'RecordList',
          componentProps: {
            field: 'linked',
            emptyTitle: 'No linked records',
            emptyDescription: 'Records linked to this task will appear here.',
          },
        },
      ],
      {} as unknown as EntityRecord,
    )
    expect(screen.getByText('No linked records')).toBeInTheDocument()
    expect(screen.getByText('Records linked to this task will appear here.')).toBeInTheDocument()
  })

  it('renders every declared tab as a real tab in one tablist', () => {
    const tabs = [
      { key: 'timeline', title: 'Timeline', component: 'AppTimeline' },
      { key: 'activity', title: 'Activity', component: 'AppActivity' },
      { key: 'linked', title: 'Linked', component: 'RecordList', componentProps: { field: 'linked' } },
      {
        key: 'attachments',
        title: 'Attachments',
        component: 'RecordList',
        componentProps: { field: 'attachments' },
      },
    ]
    panel(tabs, {} as EntityRecord)
    expect(screen.getAllByRole('tablist')).toHaveLength(1)
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Timeline',
      'Activity',
      'Linked',
      'Attachments',
    ])
  })

  it('still lets an app-injected bespoke renderer serve a tab the registry does not know', () => {
    render(
      <TaskDetailPanel
        tabs={[{ key: 'timeline', title: 'Timeline', component: 'AppTimeline' }]}
        activeTab="timeline"
        onActiveTabChange={() => {}}
        config={config}
        record={{} as EntityRecord}
        tabRenderers={{ AppTimeline: () => <p>bespoke timeline</p> }}
      />,
    )
    expect(screen.getByText('bespoke timeline')).toBeInTheDocument()
  })
})

describe('RecordListTab — one generic renderer, no module vocabulary', () => {
  it('reads whatever field it is pointed at, so it is not an "attachments" component', () => {
    render(<RecordListTab field="widgets" record={{ widgets: [{ label: 'Zone A' }] } as unknown as EntityRecord} />)
    expect(screen.getByText('Zone A')).toBeInTheDocument()
  })

  it('renders a row as a link only when the data carries an href', () => {
    render(
      <RecordListTab
        field="linked"
        record={{ linked: [{ label: 'IMS-1', href: '/r/1' }, { label: 'IMS-2' }] } as unknown as EntityRecord}
      />,
    )
    expect(screen.getByRole('link', { name: 'IMS-1' })).toHaveAttribute('href', '/r/1')
    expect(screen.queryByRole('link', { name: 'IMS-2' })).not.toBeInTheDocument()
  })

  it('treats a missing or non-array field as empty rather than crashing', () => {
    render(<RecordListTab field="nope" record={{ nope: 'not an array' } as unknown as EntityRecord} />)
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
  })
})
