import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { DashboardWidget } from '@fams/v5-composer'
import { DashboardWidgetView } from './dashboard-widgets'

/**
 * dashboard-fixes2a — the round-1 QA regressions the widget layer had to
 * close: a donut summary that contradicted its own arcs, a map widget with no
 * list rail and no text alternative, a leaderboard whose threshold band was
 * painted but never stated, and a widget-scoped select that did not exist.
 */

vi.mock('@fams/v5-templates/map', () => ({
  MapPanel: ({
    'aria-label': label,
    'aria-describedby': describedBy,
    markers,
  }: {
    'aria-label': string
    'aria-describedby'?: string
    markers?: Array<{ id: string }>
  }) => (
    <div role="region" aria-label={label} aria-describedby={describedBy} data-marker-count={markers?.length ?? 0} />
  ),
}))

function renderWidget(widget: DashboardWidget) {
  return render(<DashboardWidgetView widget={widget} filters={{}} renderer="svg" />)
}

const DONUT: DashboardWidget = {
  id: 'events',
  title: 'Critical Event Distribution',
  type: 'donut',
  dataSource: {
    legendOrientation: 'vertical',
    centerLabel: { value: '100', caption: 'Total Critical Events' },
    emptyText: 'No events for the current filters.',
    slices: [
      { id: 'over', label: 'Over Speeding', value: 43 },
      { id: 'zone', label: 'Zone Out', value: 37 },
      { id: 'idle', label: 'Idling', value: 15 },
      { id: 'off', label: 'Engine Off', value: 5 },
    ],
  },
}

const MAP_WITH_RAIL: DashboardWidget = {
  id: 'fuel-events',
  title: 'Fuel Monitoring Events',
  type: 'geospatial-heatmap',
  dataSource: {
    listRail: { searchPlaceholder: 'Search Events' },
    legend: [{ id: 'theft', label: 'Fuel Theft', colorIndex: 1 }],
    items: [
      {
        id: 'e1',
        title: 'Fuel Theft',
        description: 'Al Reem Island',
        category: 'theft',
        timestamp: '09:41',
        position: [54.4, 24.5],
      },
      {
        id: 'e2',
        title: 'Fuel Refueling',
        description: 'Musaffah',
        category: 'theft',
        timestamp: '11:02',
        position: [54.5, 24.4],
      },
    ],
  },
}

const BOARD: DashboardWidget = {
  id: 'risk',
  title: 'High Risk Drivers',
  type: 'leaderboard',
  dataSource: {
    scopeFilter: {
      id: 'depot',
      label: 'All depots',
      options: [
        { value: 'north', label: 'North depot' },
        { value: 'south', label: 'South depot' },
      ],
    },
    columns: [
      {
        key: 'events',
        label: 'Critical Events',
        render: 'counters',
        counters: [
          { label: 'Harsh Braking', icon: 'alert-triangle', colorIndex: 1 },
          { label: 'Overspeeding', icon: 'gauge', colorIndex: 4 },
        ],
      },
      {
        key: 'plain',
        label: 'Zones',
      },
      {
        key: 'efficiency',
        label: 'Fuel Efficiency',
        render: 'bar',
        thresholds: [
          { from: 0, tone: 'warning', label: 'watch' },
          { from: 30, tone: 'danger', label: 'high risk' },
        ],
      },
    ],
    rows: [
      {
        id: 'd1',
        primary: 'Ahmed Khan',
        score: 44,
        scoreDelta: -12,
        cells: { efficiency: 44, depot: 'north', events: [1, 1], plain: [7, 4] },
      },
      {
        id: 'd2',
        primary: 'Noor Farah',
        score: 19,
        scoreDelta: 3,
        cells: { efficiency: 19, depot: 'south', events: [0, 2], plain: [5, 2] },
      },
    ],
  },
}

describe('donut — the centre summarises the VISIBLE arcs', () => {
  it('recomputes the centre from the visible slices when a legend row is hidden, and restores it', () => {
    renderWidget(DONUT)
    expect(screen.getByText('100')).toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: /Over Speeding/ })
    fireEvent.click(toggle)
    // 100 − 43 = 57. Leaving it at 100 made the summary contradict the plot.
    expect(screen.getByText('57')).toBeInTheDocument()
    expect(screen.queryByText('100')).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(screen.getByText('100')).toBeInTheDocument()
  })
})

describe('map widget — the list rail and the text alternative', () => {
  it('defaults the rail on from the data — listable items need no authored key', () => {
    const { container } = renderWidget({ ...MAP_WITH_RAIL, dataSource: { ...MAP_WITH_RAIL.dataSource, listRail: undefined } })
    expect(container.querySelector('[data-slot="dashboard-map-rail"]')).toBeInTheDocument()
  })

  it('stays map-only for a heat surface and for bare coordinates, and honours an explicit opt-out', () => {
    const bare = renderWidget({
      ...MAP_WITH_RAIL,
      id: 'bare',
      dataSource: {
        ...MAP_WITH_RAIL.dataSource,
        listRail: undefined,
        items: [{ id: 'p1', title: '', position: [54.4, 24.5] }],
      },
    })
    expect(bare.container.querySelector('[data-slot="dashboard-map-rail"]')).not.toBeInTheDocument()
    bare.unmount()

    const heat = renderWidget({
      ...MAP_WITH_RAIL,
      id: 'heat',
      dataSource: { ...MAP_WITH_RAIL.dataSource, listRail: undefined, render: 'heat' },
    })
    expect(heat.container.querySelector('[data-slot="dashboard-map-rail"]')).not.toBeInTheDocument()
    heat.unmount()

    const optedOut = renderWidget({
      ...MAP_WITH_RAIL,
      id: 'opted-out',
      dataSource: { ...MAP_WITH_RAIL.dataSource, listRail: false },
    })
    expect(optedOut.container.querySelector('[data-slot="dashboard-map-rail"]')).not.toBeInTheDocument()
  })

  it('renders a searchable rail whose query filters the list AND the markers', () => {
    const { container } = renderWidget(MAP_WITH_RAIL)
    const rail = container.querySelector('[data-slot="dashboard-map-rail"]') as HTMLElement
    expect(rail).toBeInTheDocument()
    expect(within(rail).getAllByRole('button').length).toBeGreaterThan(0)
    expect(container.querySelector('[data-marker-count="2"]')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Search Events'), { target: { value: 'refuel' } })
    expect(within(rail).queryByText('Fuel Theft')).not.toBeInTheDocument()
    expect(within(rail).getByText('Fuel Refueling')).toBeInTheDocument()
    // The map must not contradict the list beside it.
    expect(container.querySelector('[data-marker-count="1"]')).toBeInTheDocument()
  })

  it('ships a visually-hidden table of the rendered items, linked from the map region', () => {
    const { container } = renderWidget(MAP_WITH_RAIL)
    const table = container.querySelector('[data-slot="dashboard-map-data-table"]') as HTMLElement
    expect(table).toBeInTheDocument()
    expect(table).toHaveClass('sr-only')
    expect(within(table).getByText('Al Reem Island')).toBeInTheDocument()
    const region = container.querySelector('[role="region"][aria-describedby]') as HTMLElement
    expect(region.getAttribute('aria-describedby')).toBe(table.id)
  })
})

describe('leaderboard — the band in words, and a widget-scoped select', () => {
  it('states the threshold band as text beside the value rather than only in the fill colour', () => {
    renderWidget(BOARD)
    expect(screen.getByText('44 — high risk')).toBeInTheDocument()
    expect(screen.getByText('19 — watch')).toBeInTheDocument()
  })

  it('renders a counters cell as labelled icon+count pairs, and never concatenates a plain array cell', () => {
    renderWidget(BOARD)
    // A counters cell keeps its numbers separate and names each category.
    expect(screen.getAllByText('Harsh Braking:').length).toBe(2)
    // A column that did NOT declare itself counters must join, not concatenate:
    // React renders [7, 4] as the digit run "74".
    expect(screen.getByText('7 · 4')).toBeInTheDocument()
    expect(screen.queryByText('74')).not.toBeInTheDocument()
  })

  it('renders the trailing score-delta column with a real header', () => {
    renderWidget(BOARD)
    expect(screen.getByRole('columnheader', { name: 'Score change' })).toBeInTheDocument()
  })

  it('renders the scope select in the widget header and narrows the board to the chosen slice', () => {
    const { container } = renderWidget(BOARD)
    const select = container.querySelector('[data-slot="widget-scope-select"]') as HTMLElement
    expect(select).toBeInTheDocument()
    expect(screen.getByText('Ahmed Khan')).toBeInTheDocument()
    expect(screen.getByText('Noor Farah')).toBeInTheDocument()

    fireEvent.click(select)
    fireEvent.click(screen.getByText('South depot'))
    expect(screen.queryByText('Ahmed Khan')).not.toBeInTheDocument()
    expect(screen.getByText('Noor Farah')).toBeInTheDocument()
  })
})
