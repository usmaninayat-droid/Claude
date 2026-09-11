import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { DashboardFilterPill, DashboardWidget } from '@fams/v5-composer'
import { DashboardView } from './DashboardView'
import { dashboardConfigFixture } from './dashboard-fixtures'
import {
  applyDashboardFilters,
  datumMatches,
  livePills,
  pillDimension,
  toDimensionSelection,
} from './dashboard-filter'

vi.mock('@fams/v5-templates/map', () => ({
  MapPanel: ({ 'aria-label': label }: { 'aria-label': string }) => <div role="region" aria-label={label} />,
}))

/** Radix `DropdownMenuTrigger` opens on pointerdown; keyboard is the jsdom path. */
const openMenu = (trigger: HTMLElement) => fireEvent.keyDown(trigger, { key: 'Enter' })

describe('dashboard-filter — the matching rule', () => {
  it('treats an ABSENT dimension as "not scoped by it", never as excluded', () => {
    expect(datumMatches(undefined, { timeframe: ['today'] })).toBe(true)
    expect(datumMatches({ vehicle: 'veh-1' }, { timeframe: ['today'] })).toBe(true)
  })

  it('keeps a datum whose values intersect the selection and drops one that does not', () => {
    expect(datumMatches({ timeframe: ['today', 'last-7-days'] }, { timeframe: ['today'] })).toBe(true)
    expect(datumMatches({ timeframe: ['last-30-days'] }, { timeframe: ['today'] })).toBe(false)
  })

  it('ANDs across dimensions and ORs within one', () => {
    const dimensions = { timeframe: 'today', vehicle: ['veh-1', 'veh-2'] }
    expect(datumMatches(dimensions, { timeframe: ['today'], vehicle: ['veh-2'] })).toBe(true)
    expect(datumMatches(dimensions, { timeframe: ['today'], vehicle: ['veh-9'] })).toBe(false)
  })

  it('reads a pill’s dimension from `dimension`, falling back to its id', () => {
    expect(pillDimension({ id: 'pill-time', label: 'T', type: 'time-range', dimension: 'timeframe' })).toBe('timeframe')
    expect(pillDimension({ id: 'vehicle', label: 'V', type: 'single-select' })).toBe('vehicle')
  })

  it('maps pill-id-keyed values onto dimension-keyed selection, dropping unset pills', () => {
    const pills: DashboardFilterPill[] = [
      { id: 'pill-time', label: 'Time Frame', type: 'time-range', dimension: 'timeframe' },
      { id: 'pill-vehicle', label: 'Vehicle', type: 'single-select', dimension: 'vehicle' },
    ]
    expect(toDimensionSelection(pills, { 'pill-time': 'today', 'pill-vehicle': undefined })).toEqual({
      timeframe: ['today'],
    })
  })
})

describe('dashboard-filter — projecting a dataSource', () => {
  it('returns the SAME object when nothing is selected (identity, so memoization holds)', () => {
    const source = { series: [{ label: 'a', data: [1], dimensions: { timeframe: 'today' } }] }
    expect(applyDashboardFilters(source, {})).toBe(source)
  })

  it('drops category positions from categories, tickLabels and every series in step', () => {
    const next = applyDashboardFilters(
      {
        categories: ['Mon', 'Tue', 'Wed'],
        categoryDimensions: [
          { timeframe: ['last-30-days'] },
          { timeframe: ['last-7-days', 'last-30-days'] },
          { timeframe: ['today', 'last-7-days', 'last-30-days'] },
        ],
        axis: { x: { tickLabels: ['M', 'T', 'W'] } },
        series: [
          { label: 'a', data: [1, 2, 3] },
          { label: 'b', data: [4, 5, 6] },
        ],
      },
      { timeframe: ['today'] },
    )
    expect(next?.categories).toEqual(['Wed'])
    expect(next?.axis?.x?.tickLabels).toEqual(['W'])
    expect(next?.series?.map((s) => s.data)).toEqual([[3], [6]])
  })

  it('filters slices, rows, items and cells by their own dimensions', () => {
    const next = applyDashboardFilters(
      {
        slices: [
          { label: 'a', value: 1, dimensions: { vehicle: 'veh-1' } },
          { label: 'b', value: 2, dimensions: { vehicle: 'veh-2' } },
        ],
        rows: [{ id: 'r1', primary: 'R1', dimensions: { vehicle: 'veh-2' } }],
        items: [{ id: 'i1', title: 'I1', dimensions: { vehicle: 'veh-1' } }],
        cells: [{ x: 1, y: 1, value: 5, dimensions: { vehicle: 'veh-1' } }],
      },
      { vehicle: ['veh-1'] },
    )
    expect(next?.slices).toHaveLength(1)
    expect(next?.rows).toHaveLength(0)
    expect(next?.items).toHaveLength(1)
    expect(next?.cells).toHaveLength(1)
  })

  it('applies the first matching `variant` over the base source — the scalar case', () => {
    const next = applyDashboardFilters(
      {
        value: 78,
        ariaLabel: 'Fleet score over the last 7 days',
        variants: [
          { when: { timeframe: 'today' }, value: 92, ariaLabel: 'Fleet score today' },
          { when: { timeframe: 'last-30-days' }, value: 61 },
        ],
      },
      { timeframe: ['today'] },
    )
    expect(next?.value).toBe(92)
    expect(next?.ariaLabel).toBe('Fleet score today')
  })

  it('ignores a variant whose dimension is not actively selected', () => {
    const source = { value: 78, variants: [{ when: { timeframe: 'today' }, value: 92 }] }
    expect(applyDashboardFilters(source, { vehicle: ['veh-1'] })?.value).toBe(78)
  })
})

describe('dashboard-filter — V11: a pill that cannot filter anything is not rendered', () => {
  const widgets: DashboardWidget[] = [
    { id: 'w', type: 'bar', dataSource: { series: [{ label: 'a', data: [1], dimensions: { vehicle: 'veh-1' } }] } },
  ]

  it('keeps a pill whose dimension some datum carries', () => {
    const pills: DashboardFilterPill[] = [{ id: 'p', label: 'Vehicle', type: 'single-select', dimension: 'vehicle' }]
    expect(livePills(pills, widgets).map((p) => p.id)).toEqual(['p'])
  })

  it('drops a pill no datum on the page carries', () => {
    const pills: DashboardFilterPill[] = [{ id: 'p', label: 'Depot', type: 'single-select', dimension: 'depot' }]
    expect(livePills(pills, widgets)).toEqual([])
  })

  it('counts a dimension that only a KPI tile’s variants carry', () => {
    const pills: DashboardFilterPill[] = [{ id: 'p', label: 'Time', type: 'time-range', dimension: 'timeframe' }]
    expect(livePills(pills, widgets, [{ value: 1, variants: [{ when: { timeframe: 'today' }, value: 2 }] }])).toHaveLength(1)
  })
})

/**
 * THE P0, measured end to end: choosing an option must change what a widget
 * actually renders — its plot data, its sr-only data-table twin AND its
 * `aria-label` — not just the pill's own label.
 */
describe('DashboardView — a filter pill really filters', () => {
  const dataRows = (container: HTMLElement) => {
    const table = container.querySelector('table')
    return table ? within(table).getAllByRole('row').length - 1 : 0
  }

  it('narrows the plot, the data table and the aria-label on a time-frame selection', async () => {
    const { container } = render(<DashboardView config={dashboardConfigFixture} renderer="svg" />)

    // The fixture's Time Frame pill defaults to "Last 7 days", which already
    // narrows three authored days to two — the filter is live from first paint.
    expect(
      screen.getByRole('img', {
        name: 'Number of trips — column chart, daily totals — filtered to Time Frame: Last 7 days',
      }),
    ).toBeInTheDocument()
    expect(dataRows(container)).toBe(2)

    openMenu(screen.getByRole('button', { name: /Time Frame/ }))
    fireEvent.click(await screen.findByRole('menuitemradio', { name: 'Today' }))

    // aria-label CHANGED and now states the filter it is under.
    expect(
      screen.getByRole('img', { name: 'Number of trips — column chart, daily totals — filtered to Time Frame: Today' }),
    ).toBeInTheDocument()
    // …and the data-table twin lost the two categories that are not "today".
    expect(dataRows(container)).toBe(1)
  })

  it('leaves a widget that carries no timeframe dimension untouched and UNRELABELLED', async () => {
    render(<DashboardView config={dashboardConfigFixture} renderer="svg" />)
    openMenu(screen.getByRole('button', { name: /Time Frame/ }))
    fireEvent.click(await screen.findByRole('menuitemradio', { name: 'Today' }))
    // The donut is annotated by `vehicle`, not `timeframe` — it must not be
    // relabelled "filtered to …" for a pill it does not respond to.
    expect(screen.getByRole('img', { name: 'Critical Event Distribution' })).toBeInTheDocument()
  })
})
