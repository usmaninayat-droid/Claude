import { describe, expect, it, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import type { DashboardColumn, DashboardWidget } from '@fams/v5-composer'
import { barTone } from './dashboard-data-widgets'
import { fitViewState } from './dashboard-map-widget'
import { formatKpiValue } from './dashboard-format'
import { resolveWidgetIcon } from './dashboard-widget-shell'
import { DashboardWidgetView } from './dashboard-widgets'

/**
 * Regression cover for the fix-wave-1 defects that are pure metadata→props
 * translation: the map viewport, the KPI number format, the bar-cell tone
 * ramp, the donut legend placement, and the previously-silent unknown icon.
 */

const DOHA: Array<[number, number]> = [
  [54.3773, 24.4539],
  [54.498, 24.351],
  [54.68, 24.79],
  [54.335, 24.475],
]

describe('fitViewState — a dashboard map opens on its own data, not the world', () => {
  it('centres on the bounding box of the positions and zooms in past the world view', () => {
    const view = fitViewState(DOHA, {})
    expect(view).toBeDefined()
    expect(view!.longitude).toBeCloseTo((54.335 + 54.68) / 2, 3)
    expect(view!.latitude).toBeCloseTo((24.351 + 24.79) / 2, 3)
    // MapPanel's own default is zoom 1.5 (the whole planet) — the defect.
    expect(view!.zoom).toBeGreaterThan(6)
    expect(view!.zoom).toBeLessThanOrEqual(13)
  })

  it('clamps a single point to street level rather than infinite zoom', () => {
    const view = fitViewState([[54.3773, 24.4539]], {})
    expect(view!.zoom).toBe(13)
    expect(view!.longitude).toBe(54.3773)
  })

  it('lets the blueprint pin the camera with center and zoom', () => {
    const view = fitViewState(DOHA, { center: [51.53, 25.29], zoom: 8 })
    expect(view).toEqual({ longitude: 51.53, latitude: 25.29, zoom: 8 })
  })

  it('honours an authored centre even with no positioned items, and otherwise defers to MapPanel', () => {
    expect(fitViewState([], { center: [54.4, 24.5] })).toMatchObject({ longitude: 54.4, latitude: 24.5 })
    expect(fitViewState([], {})).toBeUndefined()
  })
})

describe('formatKpiValue — kpiStrip[].format is finally read', () => {
  it('separates thousands for integers', () => {
    expect(formatKpiValue(3234, 'integer')).toBe('3,234')
    expect(formatKpiValue(12480, 'integer')).toBe('12,480')
  })

  it('applies fixed decimals', () => {
    expect(formatKpiValue(6.234, 'decimal')).toBe('6.2')
    expect(formatKpiValue(1.2, 'decimal:2')).toBe('1.20')
  })

  it('formats percentages and currencies', () => {
    expect(formatKpiValue(81, 'percent')).toBe('81%')
    expect(formatKpiValue(5214, 'currency-AED')).toContain('5,214')
  })

  it('leaves an already-formatted string, an unknown hint, and a missing value alone', () => {
    expect(formatKpiValue('7:45 hrs', 'integer')).toBe('7:45 hrs')
    expect(formatKpiValue(3234, 'tons')).toBe('3234')
    expect(formatKpiValue(3234, undefined)).toBe('3234')
    expect(formatKpiValue(undefined, 'integer')).toBe('—')
  })
})

describe('barTone — generic threshold ramp for a render:"bar" cell', () => {
  const column: DashboardColumn = {
    key: 'metric',
    label: 'Metric',
    render: 'bar',
    thresholds: [
      { from: 0, tone: 'danger' },
      { from: 60, tone: 'warning' },
      { from: 85, tone: 'success' },
    ],
  }

  it('picks the highest band the value clears', () => {
    expect(barTone(20, column)).toBe('danger')
    expect(barTone(60, column)).toBe('warning')
    expect(barTone(99, column)).toBe('success')
  })

  it('falls back to the column tone, then primary, when no band matches', () => {
    expect(barTone(50, { key: 'm', label: 'M', tone: 'success' })).toBe('success')
    expect(barTone(50, { key: 'm', label: 'M' })).toBe('primary')
    expect(barTone(-5, column)).toBe('primary')
  })
})

describe('resolveWidgetIcon — an unknown name is no longer silent', () => {
  afterEach(() => vi.restoreAllMocks())

  it('resolves the names the dashboards use, including the ones that were missing', () => {
    for (const name of ['shield-alert', 'triangle-alert', 'circle-stop', 'credit-card', 'route', 'leaf', 'trophy']) {
      expect(resolveWidgetIcon(name), name).toBeDefined()
    }
  })

  it('warns once in DEV for an unknown name and still renders no icon', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveWidgetIcon('not-a-real-icon')).toBeUndefined()
    expect(resolveWidgetIcon('not-a-real-icon')).toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('not-a-real-icon')
  })

  it('returns undefined for an omitted name without warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveWidgetIcon(undefined)).toBeUndefined()
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('DonutWidget — legendOrientation places the legend', () => {
  const donut = (legendOrientation?: 'horizontal' | 'vertical'): DashboardWidget => ({
    id: 'w-donut',
    title: 'Critical Event Distribution',
    type: 'donut',
    dataSource: {
      legendOrientation,
      slices: [
        { id: 'a', label: 'Over Speeding', value: 43 },
        { id: 'b', label: 'Idling', value: 15 },
      ],
    },
  })

  it('keeps the legend in the card legend row by default', () => {
    const { container } = render(<DashboardWidgetView widget={donut()} filters={{}} renderer="svg" />)
    const legendRow = container.querySelector('[data-slot="chart-card-legend"]')
    expect(legendRow).toBeInTheDocument()
    expect(legendRow).toHaveTextContent('Over Speeding')
  })

  it('moves the legend beside the chart when vertical', () => {
    const { container } = render(<DashboardWidgetView widget={donut('vertical')} filters={{}} renderer="svg" />)
    expect(container.querySelector('[data-slot="chart-card-legend"]')).toBeNull()
    // Still rendered — inside the body, beside the plot.
    const inBody = container.querySelector('[data-slot="chart-card-body"] [data-slot="chart-legend"]')
    expect(inBody).toBeInTheDocument()
    expect(inBody).toHaveTextContent('Over Speeding')
  })
})
