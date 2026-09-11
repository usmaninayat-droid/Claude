import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import type { LiveMapViewProps } from '../../map/LiveMapView'
import { DispatcherCockpitView } from './DispatcherCockpitView'
import { cockpitConfig, cockpitRecords } from '../cockpit/cockpit-fixtures'

/**
 * DispatcherCockpitView.test.tsx — the `dispatcher-cockpit` view kind's own
 * test, covering the DERIVED cockpit body (bare pipeline, no `uiConfig.cockpit`
 * block) plus the delegation switch to `CockpitView` for a module that DOES
 * author one (`hasCockpit`). Same house style as `cockpit/CockpitView.test.tsx`.
 */

// The heavy map entry, stubbed the same way `CockpitView.test.tsx` and
// `MapView.test.tsx` do — only exercised by the `hasCockpit` delegation test
// below (`cockpitConfig` binds `uiConfig.map.latCol/lngCol`); the derived
// fixture below binds no map at all, so it never reaches this mock.
vi.mock('@fams/v5-templates/map', () => ({
  LiveMapView: (props: LiveMapViewProps) => (
    <div data-testid="fake-live-map" data-selected={props.selectedId ?? ''}>
      {props.vehicles.map((v) => (
        <button key={v.id} type="button" onClick={() => props.onSelect?.(v.id)}>
          marker {v.id}
        </button>
      ))}
    </div>
  ),
}))

/**
 * A bare pipeline blueprint — `statusList` with 3 stages, an identity
 * (SmallText), a classification axis (SingleSelect, not `status`) and a
 * DateTime age column, per the task brief. No `uiConfig.cockpit` and no
 * `uiConfig.map` — this is the module every derived console lens exists for.
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

describe('DispatcherCockpitView — derived cockpit (no uiConfig.cockpit)', () => {
  it('renders one stage KPI tile per statusList entry, with correct counts', () => {
    render(<DispatcherCockpitView config={pipelineConfig} records={pipelineRecords} />)
    expect(document.querySelector('[data-slot="dispatcher-cockpit"]')).toBeInTheDocument()
    expect(tile('stage-new')?.textContent).toContain('New')
    expect(tile('stage-new')?.textContent).toContain('2')
    expect(tile('stage-in_progress')?.textContent).toContain('In Progress')
    expect(tile('stage-in_progress')?.textContent).toContain('2')
    expect(tile('stage-resolved')?.textContent).toContain('Resolved')
    expect(tile('stage-resolved')?.textContent).toContain('1')
  })

  it('a queue row click opens the DetailSheet for that record', async () => {
    render(<DispatcherCockpitView config={pipelineConfig} records={pipelineRecords} />)
    fireEvent.click(screen.getByText('Leaking valve'))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Leaking valve')
    expect(dialog).toHaveTextContent('TRQ-1001')
    // The derived summary body (ConsoleRecordSummary) lists the blueprint's
    // own fields, e.g. Priority.
    expect(dialog).toHaveTextContent('Critical')
  })

  it('a KPI tile scopes the queue — aria-pressed toggles and the table narrows', () => {
    render(<DispatcherCockpitView config={pipelineConfig} records={pipelineRecords} />)
    const newTile = tile('stage-new')!
    expect(newTile).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(newTile)
    expect(newTile).toHaveAttribute('aria-pressed', 'true')
    // Only the two `new`-stage records remain visible…
    expect(screen.getByText('Leaking valve')).toBeInTheDocument()
    expect(screen.getByText('Broken pump')).toBeInTheDocument()
    // …and the `resolved`/`in_progress` rows are narrowed out.
    expect(screen.queryByText('Filter replaced')).not.toBeInTheDocument()
    expect(screen.queryByText('Valve inspection')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 2 of 5 records')).toBeInTheDocument()

    // Clicking the same tile again clears the scope.
    fireEvent.click(newTile)
    expect(newTile).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Filter replaced')).toBeInTheDocument()
  })

  it('loading paints the KPI skeletons and a busy table, no live tiles', () => {
    const { container } = render(
      <DispatcherCockpitView config={pipelineConfig} records={pipelineRecords} loading />,
    )
    expect(container.querySelectorAll('[data-slot="console-kpis"] [data-slot="skeleton"]')).toHaveLength(4)
    expect(container.querySelector('[data-kpi-id]')).not.toBeInTheDocument()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })
})

describe('DispatcherCockpitView — delegation switch (hasCockpit)', () => {
  it('renders the authored CockpitView surface when the blueprint declares uiConfig.cockpit + map coordinates', async () => {
    render(<DispatcherCockpitView config={cockpitConfig} records={cockpitRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    // CockpitView-only chrome: the alert strip and KPI strip it authors.
    expect(document.querySelector('[data-slot="cockpit-alert"]')).toBeInTheDocument()
    expect(screen.getByText('Fulfillment Rate')).toBeInTheDocument()
    // The derived surface never mounts alongside the authored one.
    expect(document.querySelector('[data-slot="dispatcher-cockpit"]')).not.toBeInTheDocument()
  })

  it('renders the derived cockpit for a module missing either half of hasCockpit', () => {
    // cockpit block present, but no map coordinate binding.
    const noMap: EntityConfig = {
      ...cockpitConfig,
      uiConfig: { ...cockpitConfig.uiConfig, map: undefined },
    }
    render(<DispatcherCockpitView config={noMap} records={cockpitRecords} />)
    expect(document.querySelector('[data-slot="dispatcher-cockpit"]')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="cockpit-alert"]')).not.toBeInTheDocument()
  })
})
