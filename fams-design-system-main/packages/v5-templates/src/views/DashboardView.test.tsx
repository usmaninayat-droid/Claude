import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

import { DashboardView, DashboardModuleSurface } from './DashboardView'
import { dashboardConfigFixture, dashboardWidgetFixtures } from './dashboard-fixtures'
import type { ModuleRenderContext } from '@fams/v5-composer'

vi.mock('@fams/v5-templates/map', () => ({
  MapPanel: ({ 'aria-label': label }: { 'aria-label': string }) => <div role="region" aria-label={label} />,
}))

const renderView = (config = dashboardConfigFixture, props = {}) =>
  render(<DashboardView config={config} renderer="svg" {...props} />)

describe('DashboardView — layout', () => {
  it('renders through the ui-kit DashboardLayout shell (not a second dashboard skeleton)', () => {
    const { container } = renderView()
    expect(container.querySelector('[data-slot="dashboard-layout"]')).not.toBeNull()
    expect(container.querySelector('[data-dashboard-view]')).not.toBeNull()
  })

  it('lays the KPI region out with ONE auto-fit rule, never an authored row split (V7)', () => {
    const { container } = renderView()
    const region = container.querySelector('[data-slot="dashboard-kpi-region"]')
    expect(region).not.toBeNull()
    expect(region?.className).toContain('auto-fit')
    expect(region?.className).toContain('minmax(13.75rem,1fr)')
    expect(region?.className).toContain('gap-6')
  })

  it('widens the KPI auto-fit floor to 16.25rem when a tile carries a value suffix (V7)', () => {
    const { container } = renderView({
      ...dashboardConfigFixture,
      kpiStrip: [
        { id: 'k', label: 'Days of fuel left', type: 'stat', valueSuffix: 'until critical', dataSource: { value: 4 } },
      ],
    })
    expect(container.querySelector('[data-slot="dashboard-kpi-region"]')?.className).toContain('minmax(16.25rem,1fr)')
  })

  it('sets both the row and column gap of the widget grid to 24px (V8)', () => {
    const { container } = renderView()
    expect(container.querySelector('[data-dashboard-view]')?.className).toContain(
      '[&_[data-testid="dashboard-chart-grid"]]:gap-6',
    )
  })

  it('gives every widget its own lg:col-span-* wrapper matching its authored span', () => {
    const { container } = renderView()
    const grid = container.querySelector('[data-testid="dashboard-chart-grid"]')
    const spans = [...(grid?.children ?? [])].map((child) => child.className)
    expect(spans).toEqual(['lg:col-span-6', 'lg:col-span-4', 'lg:col-span-4', 'lg:col-span-4'])
  })

  it('clamps an out-of-range or missing span into the 12-column grid', () => {
    const { container } = renderView({
      ...dashboardConfigFixture,
      widgetGrid: [
        { ...dashboardWidgetFixtures.bar, id: 'a', span: 99 },
        { ...dashboardWidgetFixtures.bar, id: 'b', span: undefined },
      ],
    })
    const grid = container.querySelector('[data-testid="dashboard-chart-grid"]')
    expect([...(grid?.children ?? [])].map((c) => c.className)).toEqual(['lg:col-span-12', 'lg:col-span-6'])
  })

  it('renders an explicit empty state for a dashboard with no widgets', () => {
    renderView({ ...dashboardConfigFixture, widgetGrid: [] })
    expect(screen.getByText('No widgets')).toBeInTheDocument()
  })
})

describe('DashboardView — KPI region', () => {
  it('renders one tile per kpiStrip entry, with its value and badge', () => {
    const { container } = renderView()
    const region = container.querySelector('[data-slot="dashboard-kpi-region"]') as HTMLElement
    expect(within(region).getByText('Total Assets')).toBeInTheDocument()
    expect(within(region).getByText('156')).toBeInTheDocument()
    expect(within(region).getByText('Real Time')).toBeInTheDocument()
  })

  it('omits the KPI region entirely when the dashboard has no kpiStrip', () => {
    const { container } = renderView({ ...dashboardConfigFixture, kpiStrip: undefined })
    expect(container.querySelector('[data-slot="dashboard-kpi-region"]')).toBeNull()
  })
})

describe('DashboardView — filter pills', () => {
  it('renders one pill per filterPills entry, seeded from its defaultValue', () => {
    const { container } = renderView()
    expect(screen.getByRole('button', { name: /Time Frame: Last 7 days/ })).toBeInTheDocument()
    // A collection pill is a searchable combobox on EVERY screen, whatever its
    // option count — the shape rule is the pill's `type`, never a threshold.
    expect(container.querySelector('[data-pill-id="pill-vehicle"]')?.getAttribute('role')).toBe('combobox')
  })

  it('updates the pill label and reports the new filter state on selection', async () => {
    const onFiltersChange = vi.fn()
    const { container } = renderView(dashboardConfigFixture, { onFiltersChange })

    fireEvent.click(container.querySelector('[data-pill-id="pill-vehicle"]') as HTMLElement)
    fireEvent.click(await screen.findByRole('option', { name: 'DXB-B-1007' }))

    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ 'pill-vehicle': 'veh-1' }))
  })

  it('gives every pill a >=44px hit area (V11)', () => {
    const { container } = renderView()
    for (const pill of container.querySelectorAll('[data-slot="dashboard-filter-pill"]')) {
      expect(pill.className).toContain('h-11')
    }
    expect(container.querySelectorAll('[data-slot="dashboard-filter-pill"]').length).toBe(2)
  })

  it('does NOT render a pill no datum on the page can be filtered by (V11 — nothing inert)', () => {
    const { container } = renderView({
      ...dashboardConfigFixture,
      filterPills: [
        ...(dashboardConfigFixture.filterPills ?? []),
        { id: 'pill-depot', label: 'Depot', type: 'single-select', dimension: 'depot', options: [{ value: 'd1', label: 'Depot 1' }] },
      ],
    })
    expect(container.querySelector('[data-pill-id="pill-depot"]')).toBeNull()
    expect(container.querySelector('[data-pill-id="pill-vehicle"]')).not.toBeNull()
  })

  it('injects an unscoped option so a chosen scope can always be undone', async () => {
    const onFiltersChange = vi.fn()
    const { container } = renderView(dashboardConfigFixture, { onFiltersChange })
    fireEvent.click(container.querySelector('[data-pill-id="pill-vehicle"]') as HTMLElement)
    fireEvent.click(await screen.findByRole('option', { name: 'DXB-B-1007' }))
    fireEvent.click(container.querySelector('[data-pill-id="pill-vehicle"]') as HTMLElement)
    fireEvent.click(await screen.findByRole('option', { name: 'All vehicle' }))
    expect(onFiltersChange).toHaveBeenLastCalledWith(expect.objectContaining({ 'pill-vehicle': undefined }))
  })

  it('renders no toolbar at all when there are no pills and no actions (V11 — nothing inert)', () => {
    const { container } = renderView({ ...dashboardConfigFixture, filterPills: undefined })
    expect(container.querySelector('[data-slot="dashboard-toolbar"]')).toBeNull()
  })

  it('renders caller-supplied actions on the inline-end side of the toolbar', () => {
    renderView(dashboardConfigFixture, { actions: <button type="button">Export</button> })
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
  })
})

describe('DashboardModuleSurface — the composer adapter', () => {
  const ctx = (config: unknown): ModuleRenderContext =>
    ({
      module: { id: 'telematics-dashboard', type: 'dashboard', label: 'Telematics', config },
      data: { list: () => [], get: () => undefined },
      typeDef: { label: 'Dashboard', defaultViews: [], tabKind: 'instance', templateRefs: { grid: 'DashboardGrid' } },
      templateRef: 'DashboardGrid',
    }) as unknown as ModuleRenderContext

  it('renders the dashboard from the module node’s inline config', () => {
    const { container } = render(<DashboardModuleSurface ctx={ctx(dashboardConfigFixture)} renderer="svg" />)
    expect(container.querySelector('[data-dashboard-view]')).not.toBeNull()
  })

  it('degrades to a marked empty state for a path-string or missing config', () => {
    render(<DashboardModuleSurface ctx={ctx('./telematics.json')} />)
    expect(screen.getByText(/no inline dashboard config/i)).toBeInTheDocument()
  })
})
