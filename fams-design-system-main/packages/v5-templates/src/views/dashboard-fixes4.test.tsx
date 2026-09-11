import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { DashboardWidget } from '@fams/v5-composer'
import { DashboardWidgetView } from './dashboard-widgets'
import { legendColor } from './dashboard-map-widget'

/**
 * dashboard-fixes4 — the round-3 P1s that were metadata reaching the renderer
 * and being dropped on the floor there. Each test is the seam that dropped it.
 */

function renderWidget(widget: DashboardWidget) {
  return render(<DashboardWidgetView widget={widget} filters={{}} renderer="svg" />)
}

describe('map legend colour binding (round-3 P1 #1)', () => {
  it('honours colorToken, in the same precedence every other coloured datum uses', () => {
    // The whole defect: four entries authored ONLY with `colorToken` all fell
    // through to `--color-chart-1`, so the map legend and its markers rendered
    // one hue while the donut and stacked bar beside them carried four.
    expect(legendColor({ id: 'brake', label: 'Harsh Braking', colorToken: 'var(--color-primary)' })).toBe(
      'var(--color-primary)',
    )
    expect(legendColor({ id: 'over', label: 'Overspeeding', colorToken: 'var(--color-error-500)' })).toBe(
      'var(--color-error-500)',
    )
    // A token binding outranks a literal, which outranks the categorical slot.
    expect(
      legendColor({ id: 'a', label: 'A', colorToken: 'var(--color-chart-4)', color: '#F79009', colorIndex: 1 }),
    ).toBe('var(--color-chart-4)')
    expect(legendColor({ id: 'b', label: 'B', color: '#F79009', colorIndex: 1 })).toBe('#F79009')
    expect(legendColor({ id: 'c', label: 'C', colorIndex: 3 })).toBe('var(--color-chart-3)')
    expect(legendColor({ id: 'd', label: 'D' })).toBe('var(--color-chart-1)')
  })

  it('gives four token-authored entries four distinct colours', () => {
    const entries = [
      { id: '1', label: 'Harsh Braking', colorToken: 'var(--color-primary)' },
      { id: '2', label: 'Harsh Cornering', colorToken: 'var(--color-chart-4)' },
      { id: '3', label: 'Harsh Acceleration', colorToken: 'var(--color-chart-1)' },
      { id: '4', label: 'Overspeeding', colorToken: 'var(--color-error-500)' },
    ]
    expect(new Set(entries.map(legendColor)).size).toBe(4)
  })
})

describe('column glyph (round-3 P1 #4)', () => {
  const widget: DashboardWidget = {
    id: 'w',
    title: 'High Risk Drivers',
    type: 'leaderboard',
    dataSource: {
      showRank: false,
      rows: [{ id: 'r1', primary: 'Omar Darwish', cells: { vehicle: 'DXB-B-1007' } }],
      columns: [{ key: 'vehicle', label: 'Assigned Vehicle', icon: 'truck' }],
    },
  }

  it('draws the authored glyph before the cell text', () => {
    const { container } = renderWidget(widget)
    const cell = screen.getByText('DXB-B-1007').closest('span')?.parentElement
    expect(cell?.querySelector('svg')).toBeInTheDocument()
    // Decorative: the code is the content, so the glyph adds nothing to the
    // row's accessible name.
    expect(cell?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(container).toHaveTextContent('DXB-B-1007')
  })

  it('leaves an un-annotated column as plain text', () => {
    const { container } = renderWidget({
      ...widget,
      dataSource: { ...widget.dataSource, columns: [{ key: 'vehicle', label: 'Assigned Vehicle' }] },
    })
    const cell = screen.getByText('DXB-B-1007')
    expect(container.querySelector('td svg')).toBeNull()
    expect(cell).toBeInTheDocument()
  })
})
