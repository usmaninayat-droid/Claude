import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { EntityRecord } from '@fams/v5-composer'
import { OverviewWidgets, type OverviewWidget } from './OverviewWidgets'

// `trendChart` renders `@fams/ui-kit`'s `AreaChart` — a real ECharts canvas
// render, already covered by AreaChart's own test suite + ui-kit's axe
// sweep. This unit's job is data mapping (record[seriesField] → categories/
// series), not re-verifying the chart engine, so `AreaChart` is stubbed to a
// plain marker that exposes exactly the props it received — real DOM in
// jsdom with no ECharts/canvas dependency at all (mirrors how `ListView.
// test.tsx` never re-renders a real `DataTable` internals either).
vi.mock('@fams/ui-kit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@fams/ui-kit')>()
  return {
    ...actual,
    AreaChart: (props: { categories: unknown[]; series: { label: string; data: number[] }[] }) => (
      <div
        data-testid="area-chart-stub"
        data-categories={JSON.stringify(props.categories)}
        data-series={JSON.stringify(props.series)}
      />
    ),
    // `barChart` is stubbed for the same reason as `AreaChart` above — this
    // unit's job is the record → categories/series mapping, not re-verifying
    // ECharts (BarChart has its own suite + the ui-kit axe sweep).
    BarChart: (props: {
      categories: unknown[]
      series: { label: string; data: number[]; color?: string }[]
      yAxisTitle?: string
      legend?: boolean
    }) => (
      <div
        data-testid="bar-chart-stub"
        data-categories={JSON.stringify(props.categories)}
        data-series={JSON.stringify(props.series)}
        data-y-axis-title={props.yAxisTitle ?? ''}
        data-legend={String(props.legend)}
      />
    ),
  }
})

const record: EntityRecord = {
  id: 'cp1',
  title: 'Beige Bluffs',
  planNumber: '# 231454',
  planDate: '22 Jul, 2025 12:00pm',
  bounds: [
    { id: 'z1', points: [[55.27, 25.2], [55.28, 25.21], [55.29, 25.2]], color: '#f79009', label: 'Zone A' },
  ],
  compliance: [
    { month: 'Jan', value: 58 },
    { month: 'Feb', value: 61 },
  ],
  telematicsStatus: 'Reporting',
  telematicsState: 'reporting',
  telematicsSeen: '5 min ago',
  odometer: '1,245',
  tripCount: '18',
  tripsByMonth: [
    { label: 'Jan', value: 700 },
    { label: 'Feb', value: 820 },
  ],
  criticalEvents: [
    { id: 'e1', type: 'overspeeding', label: 'Overspeeding', time: '09:00 AM 13 Jan, 26', address: '1 Al Corniche, Doha' },
    { id: 'e2', type: 'idling', label: 'Idling', time: '10:20 AM 13 Jan, 26', address: '4 Al Sadd, Doha' },
  ],
  liveStatus: 'Stopped',
  liveAddress: 'Al Rayyan, Doha, Qatar',
  livePins: [{ id: 'p1', position: [51.53, 25.28] }],
}

describe('OverviewWidgets', () => {
  it('renders a planBanner widget as an InfoBanner with meta drawn from `metaFields`', () => {
    const widgets: OverviewWidget[] = [
      { type: 'planBanner', title: 'Upcoming Plan', metaFields: ['planNumber', 'planDate'] },
    ]
    render(<OverviewWidgets widgets={widgets} record={record} />)
    expect(screen.getByText('Upcoming Plan')).toBeInTheDocument()
    expect(screen.getByText('# 231454')).toBeInTheDocument()
    expect(screen.getByText('22 Jul, 2025 12:00pm')).toBeInTheDocument()
  })

  it('renders a trendChart widget with categories/series mapped from `seriesField` data', () => {
    const widgets: OverviewWidget[] = [
      { type: 'trendChart', title: 'Compliance Over Time', seriesField: 'compliance', color: 'var(--color-chart-3)' },
    ]
    const { container } = render(<OverviewWidgets widgets={widgets} record={record} />)
    expect(screen.getByText('Compliance Over Time')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="chart-card"]')).toBeInTheDocument()
    const stub = screen.getByTestId('area-chart-stub')
    expect(JSON.parse(stub.getAttribute('data-categories')!)).toEqual(['Jan', 'Feb'])
    const series = JSON.parse(stub.getAttribute('data-series')!)
    expect(series).toEqual([{ id: 'trend', label: 'Compliance Over Time', data: [58, 61], color: 'var(--color-chart-3)' }])
  })

  it('renders a locationMap widget, lazily resolving the map stack, with polygons read from `polygonsField`', async () => {
    const widgets: OverviewWidget[] = [
      { type: 'locationMap', title: 'Collection Point Location', polygonsField: 'bounds' },
    ]
    render(<OverviewWidgets widgets={widgets} record={record} />)
    expect(screen.getByText('Collection Point Location')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Loading map' })).toBeInTheDocument()
    await waitFor(() => expect(document.querySelector('[data-slot="location-map"]')).toBeInTheDocument(), {
      timeout: 15000,
    })
    // Explicit test timeout for the same reason `tab-components.test.ts`
    // documents on its own import test: resolving the LAZY
    // `@fams/v5-templates/map` chunk (maplibre-gl + deck.gl) on a cold module
    // graph regularly outruns Vitest's 5s default, which is a fixture-speed
    // fact about this import, not a behaviour under test.
  }, 30000)

  it('renders nothing for an unknown widget type and nothing at all for an empty list', () => {
    const { container } = render(<OverviewWidgets widgets={[]} record={record} />)
    expect(container.querySelector('[data-slot="overview-widgets"]')?.childElementCount).toBe(0)
  })

  it('renders an alertBanner as the info-tinted InfoBanner variant, meta included', () => {
    render(
      <OverviewWidgets
        widgets={[{ type: 'alertBanner', title: 'There is an upcoming trip.', metaFields: ['planNumber'] }]}
        record={record}
      />,
    )
    expect(screen.getByText('There is an upcoming trip.')).toBeInTheDocument()
    expect(screen.getByText('# 231454')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="info-banner"]')).toHaveAttribute('data-variant', 'insight')
  })

  it('renders a statusCard with the value, its mapped tone, and the labelled meta line', () => {
    render(
      <OverviewWidgets
        widgets={[
          {
            type: 'statusCard',
            icon: 'telematics',
            label: 'Telematics',
            valueField: 'telematicsStatus',
            toneField: 'telematicsState',
            toneMap: { reporting: 'success' },
            metaField: 'telematicsSeen',
            metaLabel: 'Last Received',
          },
        ]}
        record={record}
      />,
    )
    expect(screen.getByText('Telematics')).toBeInTheDocument()
    expect(screen.getByText('Reporting')).toBeInTheDocument()
    expect(screen.getByText(/Last Received/)).toBeInTheDocument()
    expect(document.querySelector('[data-slot="overview-status-card"]')).toHaveAttribute('data-tone', 'success')
  })

  it('renders kpiTiles from the config array, reading each value by field', () => {
    render(
      <OverviewWidgets
        widgets={[
          {
            type: 'kpiTiles',
            columns: 2,
            tiles: [
              { label: 'Odometer', valueField: 'odometer', unit: 'km' },
              { label: 'Trips', valueField: 'tripCount' },
            ],
          },
        ]}
        record={record}
      />,
    )
    expect(screen.getByText('Odometer')).toBeInTheDocument()
    expect(screen.getByText('1,245')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
  })

  it('renders a barChart with one legend-less series bound to the brand token by default', () => {
    render(
      <OverviewWidgets
        widgets={[
          {
            type: 'barChart',
            title: 'Number of Trips',
            seriesField: 'tripsByMonth',
            yAxisTitle: 'Number Of Trips',
          },
        ]}
        record={record}
      />,
    )
    const stub = screen.getByTestId('bar-chart-stub')
    expect(JSON.parse(stub.getAttribute('data-categories')!)).toEqual(['Jan', 'Feb'])
    expect(JSON.parse(stub.getAttribute('data-series')!)).toEqual([
      { id: 'series', label: 'Number Of Trips', data: [700, 820], color: 'var(--color-primary)' },
    ])
    // A single series names itself in the card title — no legend (dataviz check 6).
    expect(stub).toHaveAttribute('data-legend', 'false')
    expect(stub).toHaveAttribute('data-y-axis-title', 'Number Of Trips')
  })

  it('renders eventList rows with tone per type, and fires onEventSelect with the row id', () => {
    const onEventSelect = vi.fn()
    render(
      <OverviewWidgets
        widgets={[
          {
            type: 'eventList',
            title: 'Critical Events',
            itemsField: 'criticalEvents',
            iconMap: { overspeeding: 'gauge', idling: 'clock' },
            toneMap: { overspeeding: 'danger', idling: 'info' },
          },
        ]}
        record={record}
        onEventSelect={onEventSelect}
      />,
    )
    expect(screen.getByText('Critical Events')).toBeInTheDocument()
    expect(screen.getByText('1 Al Corniche, Doha')).toBeInTheDocument()
    const rows = document.querySelectorAll('[data-slot="overview-event-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveAttribute('data-tone', 'danger')
    expect(rows[1]).toHaveAttribute('data-tone', 'info')
    fireEvent.click(screen.getByRole('button', { name: /Overspeeding/ }))
    expect(onEventSelect).toHaveBeenCalledWith('e1', expect.objectContaining({ type: 'eventList' }))
  })

  it('renders eventList rows as non-interactive text when no onEventSelect is wired', () => {
    render(
      <OverviewWidgets
        widgets={[{ type: 'eventList', title: 'Critical Events', itemsField: 'criticalEvents' }]}
        record={record}
      />,
    )
    expect(screen.queryByRole('button', { name: /Overspeeding/ })).not.toBeInTheDocument()
  })

  it('shows the eventList empty state when the field holds nothing', () => {
    render(
      <OverviewWidgets
        widgets={[
          { type: 'eventList', title: 'Critical Events', itemsField: 'missing', emptyText: 'No events yet.' },
        ]}
        record={record}
      />,
    )
    expect(screen.getByText('No events yet.')).toBeInTheDocument()
  })

  it('gives a locationMap its status pill, address card and controls, and fires the map callbacks', () => {
    const onOpenLocation = vi.fn()
    const onZoomIn = vi.fn()
    render(
      <OverviewWidgets
        widgets={[
          {
            type: 'locationMap',
            title: 'Live Location',
            hideHeader: true,
            pinsField: 'livePins',
            statusField: 'liveStatus',
            statusToneMap: { Stopped: 'danger' },
            addressField: 'liveAddress',
          },
        ]}
        record={record}
        onOpenLocation={onOpenLocation}
        onZoomIn={onZoomIn}
      />,
    )
    expect(screen.getByText('Stopped')).toBeInTheDocument()
    expect(screen.getByText('Current Location')).toBeInTheDocument()
    expect(screen.getByText('Al Rayyan, Doha, Qatar')).toBeInTheDocument()
    // Only the wired controls render — zoom-out/fullscreen have no handler here.
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Zoom out' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open location in the main map' }))
    expect(onOpenLocation).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(onZoomIn).toHaveBeenCalledTimes(1)
  })

  it('lays widgets out in two columns once any widget names one, banner above the grid', () => {
    render(
      <OverviewWidgets
        widgets={[
          { type: 'alertBanner', title: 'Upcoming trip', column: 'full' },
          { type: 'statusCard', label: 'Telematics', valueField: 'telematicsStatus', column: 'start' },
          { type: 'eventList', title: 'Critical Events', itemsField: 'criticalEvents', column: 'end' },
        ]}
        record={record}
      />,
    )
    const grid = document.querySelector('[data-slot="overview-widgets-columns"]')
    expect(grid).toBeInTheDocument()
    // The `full` banner precedes the first columned widget, so it sits ABOVE the
    // grid rather than inside a column.
    expect(grid?.contains(screen.getByText('Upcoming trip'))).toBe(false)
    expect(grid?.children).toHaveLength(2)
    expect(grid?.children[0].contains(screen.getByText('Telematics'))).toBe(true)
    expect(grid?.children[1].contains(screen.getByText('Critical Events'))).toBe(true)
  })

  it('renders a single stack (no column grid) when no widget names a column', () => {
    render(
      <OverviewWidgets
        widgets={[{ type: 'alertBanner', title: 'Upcoming trip' }]}
        record={record}
      />,
    )
    expect(document.querySelector('[data-slot="overview-widgets-columns"]')).not.toBeInTheDocument()
  })

  it('tolerates a missing record (no crash, empty meta/data)', () => {
    const widgets: OverviewWidget[] = [
      { type: 'planBanner', title: 'Upcoming Plan', metaFields: ['planNumber'] },
    ]
    render(<OverviewWidgets widgets={widgets} />)
    expect(screen.getByText('Upcoming Plan')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="info-banner-meta"]')).not.toBeInTheDocument()
  })
})
