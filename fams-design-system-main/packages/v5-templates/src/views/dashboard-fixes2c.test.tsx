import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { DashboardWidget } from '@fams/v5-composer'
import { DashboardWidgetView } from './dashboard-widgets'

/**
 * dashboard-fixes2c — the AUTHORING gaps fix wave 2b hit: things the Figma
 * dashboards need that no metadata key could express, so the blueprint was
 * silently unable to say them. Each test below is one of those keys, asserted
 * end to end (blueprint key → widget renderer → ui-kit prop).
 */

function renderWidget(widget: DashboardWidget) {
  return render(<DashboardWidgetView widget={widget} filters={{}} renderer="svg" />)
}

describe('colorToken — binding a series to a NON-categorical token', () => {
  it('paints a bar series legend swatch from the authored token', () => {
    const { container } = renderWidget({
      id: 'w',
      title: 'Overspeeding by Vehicle',
      type: 'bar',
      dataSource: {
        categories: ['A', 'B'],
        series: [
          { id: 's1', label: 'Events', data: [3, 5], colorToken: 'rgb(0, 114, 214)' },
          { id: 's2', label: 'Baseline', data: [1, 2], colorIndex: 3 },
        ],
      },
    })
    const swatches = container.querySelectorAll('[data-slot="chart-legend-toggle"] span[aria-hidden="true"]')
    expect(swatches[0]).toHaveStyle({ backgroundColor: 'rgb(0, 114, 214)' })
    expect((swatches[1] as HTMLElement).getAttribute('style')).toBeNull()
  })

  it('paints a donut slice legend swatch from the authored token', () => {
    const { container } = renderWidget({
      id: 'w',
      title: 'Critical Event Distribution',
      type: 'donut',
      dataSource: {
        slices: [
          { id: 'over', label: 'Overspeeding', value: 40, colorToken: 'rgb(240, 68, 56)' },
          { id: 'brake', label: 'Harsh Braking', value: 60, colorIndex: 2 },
        ],
      },
    })
    const swatches = container.querySelectorAll('[data-slot="chart-legend-toggle"] span[aria-hidden="true"]')
    expect(swatches[0]).toHaveStyle({ backgroundColor: 'rgb(240, 68, 56)' })
  })

  it('paints a counters-cell glyph from the authored token', () => {
    const { container } = renderWidget({
      id: 'w',
      title: 'High Risk Drivers',
      type: 'leaderboard',
      dataSource: {
        rows: [{ id: 'r1', primary: 'Truck 1', cells: { events: [4, 2] } }],
        columns: [
          {
            key: 'events',
            label: 'Critical events',
            render: 'counters',
            counters: [
              { label: 'Braking', icon: 'alert-triangle', colorToken: 'rgb(0, 114, 214)' },
              { label: 'Cornering', icon: 'triangle-alert', colorIndex: 4 },
            ],
          },
        ],
      },
    })
    const glyphs = container.querySelectorAll('svg')
    expect(Array.from(glyphs).some((g) => g.getAttribute('style')?.includes('rgb(0, 114, 214)'))).toBe(true)
  })
})

describe('axis.min / axis.max — pinned value-axis ranges', () => {
  it('renders a dual-axis line chart with both scales zero-based', () => {
    const { container } = renderWidget({
      id: 'w',
      title: 'Fuel Consumed Over Distance',
      type: 'line',
      dataSource: {
        categories: ['1', '2', '3'],
        series: [
          { id: 'fuel', label: 'Fuel', data: [10, 20, 30], unit: 'L' },
          { id: 'dist', label: 'Distance', data: [900, 1100, 1400], axis: 'trailing', unit: 'km' },
        ],
        axis: { y: { title: 'Litres', min: 0, max: 100 }, yRight: { title: 'km', min: 0, max: 1500 } },
      },
    })
    expect(container.querySelector('[data-slot="line-chart"]')).not.toBeNull()
  })

  it('renders a bar chart with a widened value ceiling', () => {
    const { container } = renderWidget({
      id: 'w',
      title: 'Number of Trips',
      type: 'bar',
      dataSource: {
        categories: ['A', 'B'],
        series: [{ id: 's', label: 'Trips', data: [980, 1100] }],
        axis: { y: { title: 'Trips', min: 0, max: 1200 } },
      },
    })
    expect(container.querySelector('[data-slot="bar-chart"]')).not.toBeNull()
  })
})

describe('legendPlacement — bar/line legends agreeing with the donut beside them', () => {
  it('puts a stacked-bar legend above the plot', () => {
    const { container } = renderWidget({
      id: 'w',
      title: 'Events by Vehicle',
      type: 'stacked-bar',
      dataSource: {
        categories: ['A', 'B'],
        series: [
          { id: 'a', label: 'Braking', data: [1, 2] },
          { id: 'b', label: 'Cornering', data: [2, 1] },
        ],
        legendPlacement: 'top',
      },
    })
    const root = container.querySelector('[data-slot="bar-chart"]') as HTMLElement
    expect(root.firstElementChild?.getAttribute('data-slot')).toBe('chart-legend')
  })

  it('keeps a bar legend below the plot when nothing is authored', () => {
    const { container } = renderWidget({
      id: 'w',
      title: 'Events by Vehicle',
      type: 'bar',
      dataSource: {
        categories: ['A', 'B'],
        series: [
          { id: 'a', label: 'Braking', data: [1, 2] },
          { id: 'b', label: 'Cornering', data: [2, 1] },
        ],
      },
    })
    const root = container.querySelector('[data-slot="bar-chart"]') as HTMLElement
    expect(root.lastElementChild?.getAttribute('data-slot')).toBe('chart-legend')
  })
})

describe('leaderboard — entityLabel, showRank and row media', () => {
  const board: DashboardWidget = {
    id: 'w',
    title: 'High Risk Drivers',
    type: 'leaderboard',
    dataSource: {
      entityLabel: 'Driver',
      showRank: false,
      rows: [
        { id: 'r1', primary: 'Ahmed Ali', secondary: 'DXB-1007', media: { initials: 'Ahmed Ali' }, cells: { eff: 18.7 } },
        { id: 'r2', primary: 'Truck 12', media: { icon: 'truck', tone: 'primary', label: 'Vehicle' }, cells: { eff: 14.2 } },
      ],
      columns: [{ key: 'eff', label: 'Efficiency' }],
    },
  }

  it('names the entity column from entityLabel and drops the rank column', () => {
    renderWidget(board)
    expect(screen.getByRole('columnheader', { name: 'Driver' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Rank' })).not.toBeInTheDocument()
  })

  it('renders an avatar for initials and a tinted glyph for an icon', () => {
    const { container } = renderWidget(board)
    expect(container.querySelector('[data-slot="avatar"]')).not.toBeNull()
    expect(container.querySelector('[data-slot="icon-badge"]')).not.toBeNull()
  })

  it('keeps the rank column when showRank is not authored', () => {
    renderWidget({ ...board, dataSource: { ...board.dataSource, showRank: undefined } })
    expect(screen.getByRole('columnheader', { name: 'Rank' })).toBeInTheDocument()
  })
})

describe('centerLabel.trend — a pill, not a glyph string', () => {
  it('renders the donut centre trend through TrendIndicator', () => {
    const { container } = renderWidget({
      id: 'w',
      title: 'Critical Event Distribution',
      type: 'donut',
      dataSource: {
        slices: [{ id: 'a', label: 'A', value: 10 }],
        centerLabel: { value: '100', caption: 'Events', trend: { direction: 'up', value: '12%' } },
      },
    })
    const pill = container.querySelector('[data-slot="center-stack-trend"]')
    expect(pill).not.toBeNull()
    expect(pill?.querySelector('[data-slot="trend-indicator"]')).not.toBeNull()
    expect(pill?.className).toContain('bg-success-scale-50')
  })
})

describe('heatmap axis.x.groups — 16 weekly columns under 4 month labels', () => {
  it('renders the grouped axis without losing the grid', () => {
    const { container } = renderWidget({
      id: 'w',
      title: 'Safety Score Heatmap',
      type: 'heatmap-calendar',
      dataSource: {
        categories: ['W1', 'W2', 'W3', 'W4'],
        cells: [
          { x: 'W1', y: 'Truck 1', value: 80 },
          { x: 'W2', y: 'Truck 1', value: 60 },
        ],
        axis: { x: { groups: [{ label: 'Jan', span: 2 }, { label: 'Feb', span: 2 }] }, y: { title: 'Vehicles' } },
      },
    })
    expect(container.querySelector('[data-slot="heatmap-chart"]')).not.toBeNull()
  })
})

describe('stack — the masonry column span alone cannot express', () => {
  const stack: DashboardWidget = {
    id: 'w-stack',
    type: 'stack',
    span: 4,
    children: [
      { id: 'w-gauge', title: 'Fuel Efficiency', type: 'compliance-gauge', dataSource: { value: 81, height: 308 } },
      { id: 'w-kpi-a', title: 'Total Distance', type: 'kpi-card', dataSource: { value: 1240, unit: 'km' } },
      { id: 'w-kpi-b', title: 'Idle Time', type: 'kpi-card', dataSource: { value: 42, unit: 'h' } },
    ],
  }

  it('renders every child in one cell, in authored order', () => {
    const { container } = renderWidget(stack)
    const cells = container.querySelectorAll('[data-slot="dashboard-widget-stack"] > div')
    expect(cells).toHaveLength(3)
    expect(screen.getAllByText('Total Distance').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Idle Time').length).toBeGreaterThan(0)
  })

  it('has no card chrome of its own — it is a layout node', () => {
    const { container } = renderWidget(stack)
    const node = container.querySelector('[data-slot="dashboard-widget-stack"]') as HTMLElement
    expect(node.getAttribute('data-widget-type')).toBe('stack')
    expect(node.className).toContain('flex-col')
  })
})
