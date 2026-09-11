import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardLayout } from './DashboardLayout'

describe('DashboardLayout', () => {
  it('renders the header, KPI row, chart grid, and footer regions when provided', () => {
    render(
      <DashboardLayout
        header={<h1>Fleet overview</h1>}
        kpis={<div data-testid="kpi">42 active</div>}
        footer={<div data-testid="feed">Activity feed</div>}
      >
        <div data-testid="chart-1">Chart 1</div>
      </DashboardLayout>,
    )
    expect(screen.getByRole('heading', { name: 'Fleet overview' })).toBeInTheDocument()
    expect(screen.getByTestId('kpi')).toBeInTheDocument()
    expect(screen.getByTestId('chart-1')).toBeInTheDocument()
    expect(screen.getByTestId('feed')).toBeInTheDocument()
  })

  it('omits the header, KPI row, and footer regions when not provided', () => {
    render(
      <DashboardLayout>
        <div>chart</div>
      </DashboardLayout>,
    )
    expect(screen.queryByTestId('dashboard-header')).toBeNull()
    expect(screen.queryByTestId('dashboard-kpi-row')).toBeNull()
    expect(screen.queryByTestId('dashboard-footer')).toBeNull()
    expect(screen.getByTestId('dashboard-chart-grid')).toBeInTheDocument()
  })

  it('always renders the chart grid as a responsive 12-column grid on lg+', () => {
    render(
      <DashboardLayout>
        <div>chart</div>
      </DashboardLayout>,
    )
    expect(screen.getByTestId('dashboard-chart-grid').className).toContain('lg:grid-cols-12')
  })

  it('does not dictate column spans — children apply their own col-span utility', () => {
    render(
      <DashboardLayout>
        <div data-testid="wide-chart" className="lg:col-span-8">
          Wide chart
        </div>
        <div data-testid="narrow-chart" className="lg:col-span-4">
          Narrow chart
        </div>
      </DashboardLayout>,
    )
    expect(screen.getByTestId('wide-chart').className).toContain('lg:col-span-8')
    expect(screen.getByTestId('narrow-chart').className).toContain('lg:col-span-4')
  })

  it('lays out the KPI row as a grid that wraps responsively', () => {
    render(
      <DashboardLayout kpis={<div>kpi</div>}>
        <div>chart</div>
      </DashboardLayout>,
    )
    const kpiRow = screen.getByTestId('dashboard-kpi-row')
    expect(kpiRow.className).toContain('grid-cols-1')
    expect(kpiRow.className).toContain('sm:grid-cols-2')
    expect(kpiRow.className).toContain('lg:grid-cols-4')
  })

  it('forwards a ref to the root element', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <DashboardLayout ref={ref}>
        <div>chart</div>
      </DashboardLayout>,
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current?.dataset.slot).toBe('dashboard-layout')
  })

  it('merges a caller className onto the root element', () => {
    render(
      <DashboardLayout className="custom-dashboard">
        <div>chart</div>
      </DashboardLayout>,
    )
    expect(screen.getByTestId('dashboard-chart-grid').parentElement?.className).toContain(
      'custom-dashboard',
    )
  })
})
