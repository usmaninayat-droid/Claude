import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DASHBOARD_WIDGET_RENDERERS, DashboardWidgetView } from './dashboard-widgets'
import { dashboardWidgetFixtures } from './dashboard-fixtures'
import type { DashboardWidgetType } from '@fams/v5-composer'

/**
 * The map widget lazily imports the heavy `./map` entry, which needs real
 * WebGL. Stubbed here with a labelled region so the widget's own chrome
 * (legend fieldset, empty overlay) is still exercised.
 */
vi.mock('@fams/v5-templates/map', () => ({
  MapPanel: ({ 'aria-label': label }: { 'aria-label': string }) => <div role="region" aria-label={label} />,
}))

const ALL_TYPES = Object.keys(dashboardWidgetFixtures) as DashboardWidgetType[]

/**
 * `stack` is a LAYOUT node, not a data widget: it has no `dataSource`, so the
 * four-state contract belongs to each CHILD it renders, not to the stack. It
 * gets its own suite below rather than being force-fitted into the
 * per-type state sweep (where "the error state" would legitimately appear
 * once per child and fail a `getBy*` singular query).
 */
const DATA_TYPES = ALL_TYPES.filter((type) => type !== 'stack')

function renderWidget(type: DashboardWidgetType, overrides: Record<string, unknown> = {}) {
  const widget = dashboardWidgetFixtures[type]
  return render(<DashboardWidgetView widget={widget} filters={{}} renderer="svg" {...overrides} />)
}

describe('dashboard-widgets — the type → component map', () => {
  it('covers every value of the schema widget enum', () => {
    expect(Object.keys(DASHBOARD_WIDGET_RENDERERS).sort()).toEqual(ALL_TYPES.sort())
  })

  it.each(ALL_TYPES)('renders the %s widget with data', async (type) => {
    const { container, unmount } = renderWidget(type)
    // Every widget renders SOMETHING, and never the empty or error state.
    expect(container.firstChild).not.toBeNull()
    expect(screen.queryByText('No data')).not.toBeInTheDocument()
    expect(screen.queryByText('This widget couldn’t load')).not.toBeInTheDocument()
    unmount()
  })

  it('renders an unknown widget type as nothing rather than throwing', () => {
    const { container } = render(
      <DashboardWidgetView
        widget={{ id: 'x', type: 'wormhole' as DashboardWidgetType }}
        filters={{}}
        renderer="svg"
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('dashboard-widgets — the four states (verdict V10)', () => {
  it.each(DATA_TYPES)('%s renders the empty state from dataSource.emptyText', (type) => {
    const widget = dashboardWidgetFixtures[type]
    const { unmount } = render(
      <DashboardWidgetView
        widget={{ ...widget, dataSource: { emptyText: 'Nothing for this range.' } }}
        filters={{}}
        renderer="svg"
      />,
    )
    expect(screen.getByText('Nothing for this range.')).toBeInTheDocument()
    unmount()
  })

  it.each(DATA_TYPES)('%s renders the error state with a retry affordance', (type) => {
    const onRetry = vi.fn()
    const { unmount } = renderWidget(type, { error: 'boom', onRetry })
    expect(screen.getByText('This widget couldn’t load')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    unmount()
  })

  it.each(DATA_TYPES)('%s marks its body busy while loading, keeping the frame', (type) => {
    const { container, unmount } = renderWidget(type, { loading: true })
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    unmount()
  })
})

describe('dashboard-widgets — per-widget behaviour', () => {
  it('the list widget scrolls internally in a labelled, keyboard-reachable region (V5)', () => {
    renderWidget('list')
    const region = screen.getByRole('region', { name: 'Critical Events' })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region.className).toContain('overflow-y-auto')
  })

  it('the heatmap scrolls horizontally inside its own container (V5/V6)', () => {
    renderWidget('heatmap-calendar')
    const region = screen.getByRole('region', { name: /scrollable grid/i })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region.className).toContain('overflow-x-auto')
  })

  it('the map widget renders a titled, toggleable legend and no bare basemap', () => {
    renderWidget('geospatial-heatmap')
    expect(screen.getByRole('region', { name: /Safety Events/ })).toBeInTheDocument()
  })

  it('the map widget renders an explicit empty state when it has no located points', () => {
    const widget = dashboardWidgetFixtures['geospatial-heatmap']
    render(
      <DashboardWidgetView
        widget={{ ...widget, dataSource: { ...widget.dataSource, items: [] } }}
        filters={{}}
        renderer="svg"
      />,
    )
    expect(screen.getAllByText(/No data|No locations/).length).toBeGreaterThan(0)
  })

  it('the kpi-card widget renders its value, and stat-with-target its target', () => {
    const { unmount } = renderWidget('kpi-card')
    expect(screen.getByText('28')).toBeInTheDocument()
    unmount()
    renderWidget('stat-with-target')
    expect(screen.getByText('3500')).toBeInTheDocument()
    expect(screen.getByText(/5000/)).toBeInTheDocument()
  })

  it('the leaderboard widget renders its rows and its metric columns', () => {
    renderWidget('leaderboard')
    expect(screen.getByText('Toyota Hilux')).toBeInTheDocument()
    expect(screen.getByText('Score')).toBeInTheDocument()
  })

  it('the sparkline table renders a real <table> with column headers', () => {
    renderWidget('sparkline-table')
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Total (L)' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: /Hino NPR/ })).toBeInTheDocument()
  })

  it('every chart widget carries a sentence-shaped aria-label (V10)', () => {
    renderWidget('bar')
    expect(
      screen.getByRole('img', { name: 'Number of trips — column chart, daily totals' }),
    ).toBeInTheDocument()
  })
})

describe('dashboard-widgets — the stack layout node', () => {
  it('renders every child widget in one cell, in authored order', () => {
    const { container } = renderWidget('stack')
    const stack = container.querySelector('[data-slot="dashboard-widget-stack"]')
    expect(stack).not.toBeNull()
    // `getAllBy*`: a gauge also names itself in its visually-hidden data-table
    // twin, so the title string legitimately appears more than once.
    expect(screen.getAllByText('Fuel Efficiency').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Total Distance').length).toBeGreaterThan(0)
  })

  it('passes the four-state props down, so state belongs to each child', () => {
    renderWidget('stack', { error: 'boom', onRetry: () => {} })
    // One error frame per child — a stack has no body of its own to fail.
    expect(screen.getAllByText('This widget couldn’t load')).toHaveLength(2)
  })

  it('renders nothing when no children are authored', () => {
    const { container } = render(
      <DashboardWidgetView widget={{ id: 's', type: 'stack' }} filters={{}} renderer="svg" />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
