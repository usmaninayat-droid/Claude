import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { FleetConsoleView } from './FleetConsoleView'

/**
 * FleetConsoleView.test.tsx — the `fleet-console` view kind's own test. Same
 * house style as `cockpit/CockpitView.test.tsx`.
 */

/**
 * A bare pipeline blueprint — `statusList` with 3 stages, an identity
 * (SmallText), a classification axis (SingleSelect, not `status`) and a
 * DateTime age column, per the task brief. No `uiConfig.map.statusCol`, so
 * `fleetKpis` falls back to the shared stage-count tiles
 * (`console-model.test.ts` covers the `unitStateCol` branch directly).
 */
const pipelineConfig: EntityConfig = {
  code: 'ops/triage',
  name: 'Triage Queue',
  uidPrefix: 'TRQ',
  systemcolumns: [
    { col: 'title', name: 'Title', type: 'SmallText', required: true },
    { col: 'status', name: 'Status', type: 'SingleSelect', listValues: ['New', 'In Progress', 'Resolved'] },
    { col: 'systemcol1', name: 'Priority', type: 'SingleSelect', listValues: ['Critical', 'High', 'Medium', 'Low'] },
    { col: 'systemcol2', name: 'Reported', type: 'DateTime' },
    { col: 'systemcol3', name: 'Location', type: 'SmallText' },
  ],
  listcolumns: [
    { col: 'title' },
    { col: 'status' },
    { col: 'systemcol1' },
    { col: 'systemcol2' },
    { col: 'systemcol3' },
  ],
  uiConfig: {
    statusList: [
      { key: 'new', label: 'New', color: 'var(--color-info)' },
      { key: 'in_progress', label: 'In Progress', color: 'var(--color-warning)' },
      { key: 'resolved', label: 'Resolved', color: 'var(--color-success)' },
    ],
  },
}

const minutesAgo = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString()

const pipelineRecords: EntityRecord[] = [
  { id: 'rec-1', uniqueidentifier: 'TRQ-1001', title: 'Leaking valve', status: 'new', systemcol1: 'Critical', systemcol2: minutesAgo(5), systemcol3: 'Zone A' },
  { id: 'rec-2', uniqueidentifier: 'TRQ-1002', title: 'Broken pump', status: 'new', systemcol1: 'High', systemcol2: minutesAgo(180), systemcol3: 'Zone B' },
  { id: 'rec-3', uniqueidentifier: 'TRQ-1003', title: 'Valve inspection', status: 'in_progress', systemcol1: 'Medium', systemcol2: minutesAgo(1440), systemcol3: 'Zone C' },
  { id: 'rec-4', uniqueidentifier: 'TRQ-1004', title: 'Filter replaced', status: 'resolved', systemcol1: 'Low', systemcol2: minutesAgo(2880), systemcol3: 'Zone A' },
  { id: 'rec-5', uniqueidentifier: 'TRQ-1005', title: 'Generator check', status: 'in_progress', systemcol1: 'High', systemcol2: minutesAgo(30), systemcol3: 'Zone D' },
]

const tile = (id: string) => document.querySelector<HTMLElement>(`[data-kpi-id="${id}"]`)

describe('FleetConsoleView', () => {
  it('renders one stage KPI tile per statusList entry, with correct counts (fallback path)', () => {
    render(<FleetConsoleView config={pipelineConfig} records={pipelineRecords} />)
    expect(document.querySelector('[data-slot="fleet-console"]')).toBeInTheDocument()
    expect(tile('stage-new')?.textContent).toContain('New')
    expect(tile('stage-new')?.textContent).toContain('2')
    expect(tile('stage-in_progress')?.textContent).toContain('In Progress')
    expect(tile('stage-in_progress')?.textContent).toContain('2')
    expect(tile('stage-resolved')?.textContent).toContain('Resolved')
    expect(tile('stage-resolved')?.textContent).toContain('1')
    // Default pane is the roster table, not the board.
    expect(screen.getByRole('tab', { name: 'Fleet register' })).toHaveAttribute('aria-selected', 'true')
  })

  it('a roster row click opens the DetailSheet for that record', async () => {
    render(<FleetConsoleView config={pipelineConfig} records={pipelineRecords} />)
    fireEvent.click(screen.getByText('Leaking valve'))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Leaking valve')
    expect(dialog).toHaveTextContent('TRQ-1001')
    expect(dialog).toHaveTextContent('Critical')
  })

  it('a KPI tile scopes the roster — aria-pressed toggles and the table narrows', () => {
    render(<FleetConsoleView config={pipelineConfig} records={pipelineRecords} />)
    const newTile = tile('stage-new')!
    expect(newTile).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(newTile)
    expect(newTile).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Leaking valve')).toBeInTheDocument()
    expect(screen.getByText('Broken pump')).toBeInTheDocument()
    expect(screen.queryByText('Filter replaced')).not.toBeInTheDocument()
    expect(screen.queryByText('Valve inspection')).not.toBeInTheDocument()

    fireEvent.click(newTile)
    expect(newTile).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Filter replaced')).toBeInTheDocument()
  })

  it('loading paints the KPI skeletons and a busy roster table, no live tiles', () => {
    const { container } = render(
      <FleetConsoleView config={pipelineConfig} records={pipelineRecords} loading />,
    )
    expect(container.querySelectorAll('[data-slot="console-kpis"] [data-slot="skeleton"]')).toHaveLength(4)
    expect(container.querySelector('[data-kpi-id]')).not.toBeInTheDocument()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })
})
