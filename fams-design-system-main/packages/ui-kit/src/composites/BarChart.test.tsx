import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { render, cleanup, fireEvent, act, within } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as ChartContainer.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import type { ECharts, TooltipComponentFormatterCallbackParams } from 'echarts'
import { BarChart, type BarChartSeries } from './BarChart'

expect.extend({ toHaveNoViolations })

/** Narrow shape of what `BarChart` actually puts on the live option — just
 *  enough to assert against, since ECharts' own `getOption()` return type
 *  widens every component key to `unknown`. */
interface AppliedBarSeries {
  type: string
  stack?: string
  showBackground?: boolean
  backgroundStyle?: { color: string }
  itemStyle: { color: string; borderRadius: [number, number, number, number] }
}
interface AppliedTooltipFormatter {
  formatter: (params: TooltipComponentFormatterCallbackParams) => string
}
interface AppliedAxis {
  type: string
  data?: Array<string | number>
  name?: string
  nameRotate?: number
}
interface AppliedBarChartOption {
  series: AppliedBarSeries[]
  tooltip: AppliedTooltipFormatter[]
  xAxis: AppliedAxis[]
  yAxis: AppliedAxis[]
}

function getAppliedOption(instance: ECharts): AppliedBarChartOption {
  return instance.getOption() as unknown as AppliedBarChartOption
}

// jsdom has no layout engine or canvas 2D context — same stub as
// ChartContainer.test.tsx. Every test here uses renderer="svg" so ECharts
// mounts real, inspectable DOM.
let clientWidthSpy: ReturnType<typeof vi.spyOn>
let clientHeightSpy: ReturnType<typeof vi.spyOn>
let getContextSpy: ReturnType<typeof vi.spyOn>

const NOOP_2D_CONTEXT = {
  measureText: () => ({ width: 0 }),
  fillRect: () => {},
  clearRect: () => {},
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  stroke: () => {},
  fill: () => {},
  clip: () => {},
  rect: () => {},
  arc: () => {},
  translate: () => {},
  scale: () => {},
  rotate: () => {},
  transform: () => {},
  setTransform: () => {},
  drawImage: () => {},
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createRadialGradient: () => ({ addColorStop: () => {} }),
} as unknown as CanvasRenderingContext2D

beforeAll(() => {
  clientWidthSpy = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600)
  clientHeightSpy = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
  getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(NOOP_2D_CONTEXT) as unknown as ReturnType<typeof vi.spyOn>
})

afterAll(() => {
  clientWidthSpy.mockRestore()
  clientHeightSpy.mockRestore()
  getContextSpy.mockRestore()
})

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Assertion<T> extends AxeMatchers {}
}

const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
  },
})

const CATEGORIES = ['Mon', 'Tue', 'Wed']
const ONE_SERIES: BarChartSeries[] = [{ id: 'trips', label: 'Trips', data: [10, 20, 15] }]
const TWO_SERIES: BarChartSeries[] = [
  { id: 'lot1', label: 'Lot 1', data: [10, 20, 15] },
  { id: 'lot2', label: 'Lot 2', data: [5, 8, 12] },
]

describe('BarChart', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a labeled ChartContainer wrapper', () => {
    const { container } = render(
      <BarChart categories={CATEGORIES} series={ONE_SERIES} renderer="svg" aria-label="Trips per day" />,
    )
    const chart = container.querySelector('[data-slot="chart-container-canvas"]')
    expect(chart).toHaveAttribute('role', 'img')
    expect(chart).toHaveAttribute('aria-label', 'Trips per day')
    expect(container.querySelector('[data-slot="chart-container-canvas"] svg')).toBeInTheDocument()
  })

  it('hides the legend by default for a single series', () => {
    const { container } = render(
      <BarChart categories={CATEGORIES} series={ONE_SERIES} renderer="svg" aria-label="Chart" />,
    )
    expect(container.querySelector('[data-slot="chart-legend"]')).not.toBeInTheDocument()
  })

  it('shows a legend by default for multiple series, one item per series', () => {
    const { container } = render(
      <BarChart categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" />,
    )
    // Scoped to the legend: the series labels deliberately appear a second
    // time as column headers of the sr-only data-table twin.
    const legend = container.querySelector('[data-slot="chart-legend"]') as HTMLElement
    expect(within(legend).getByText('Lot 1')).toBeInTheDocument()
    expect(within(legend).getByText('Lot 2')).toBeInTheDocument()
  })

  it('respects an explicit legend={false} even with multiple series', () => {
    const { container } = render(
      <BarChart categories={CATEGORIES} series={TWO_SERIES} legend={false} renderer="svg" aria-label="Chart" />,
    )
    expect(container.querySelector('[data-slot="chart-legend"]')).not.toBeInTheDocument()
  })

  it('respects an explicit legend={true} for a single series', () => {
    const { container } = render(
      <BarChart categories={CATEGORIES} series={ONE_SERIES} legend renderer="svg" aria-label="Chart" />,
    )
    expect(container.querySelector('[data-slot="chart-legend"]')).toBeInTheDocument()
  })

  it('shows aria-busy and the Skeleton overlay when loading', () => {
    const { container } = render(
      <BarChart categories={CATEGORIES} series={ONE_SERIES} loading renderer="svg" aria-label="Chart" />,
    )
    expect(container.querySelector('[data-slot="chart-container"]')).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
  })

  it('builds one bar series per input series with token-resolved color and no raw hex leaking through props', () => {
    const onChartReady = vi.fn()
    render(
      <BarChart categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.series).toHaveLength(2)
    expect(applied.series[0].type).toBe('bar')
    expect(applied.series[0].itemStyle.color).toMatch(/^#/)
  })

  it('defaults to vertical orientation: categories on the x-axis, values on the y-axis', () => {
    const onChartReady = vi.fn()
    render(
      <BarChart categories={CATEGORIES} series={ONE_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.xAxis[0].type).toBe('category')
    expect(applied.xAxis[0].data).toEqual(CATEGORIES)
    expect(applied.yAxis[0].type).toBe('value')
  })

  it('swaps axis roles for orientation="horizontal": categories on the y-axis, values on the x-axis', () => {
    const onChartReady = vi.fn()
    render(
      <BarChart
        categories={CATEGORIES}
        series={ONE_SERIES}
        orientation="horizontal"
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.yAxis[0].type).toBe('category')
    expect(applied.yAxis[0].data).toEqual(CATEGORIES)
    expect(applied.xAxis[0].type).toBe('value')
  })

  it('rounds the top corners for vertical bars', () => {
    const onChartReady = vi.fn()
    render(
      <BarChart categories={CATEGORIES} series={ONE_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.series[0].itemStyle.borderRadius).toEqual([4, 4, 0, 0])
  })

  it('rounds the trailing (value-axis) corners for horizontal bars', () => {
    const onChartReady = vi.fn()
    render(
      <BarChart
        categories={CATEGORIES}
        series={ONE_SERIES}
        orientation="horizontal"
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.series[0].itemStyle.borderRadius).toEqual([0, 4, 4, 0])
  })

  it('leaves series unstacked (grouped, side-by-side) by default', () => {
    const onChartReady = vi.fn()
    render(
      <BarChart categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.series[0].stack).toBeUndefined()
    expect(applied.series[1].stack).toBeUndefined()
  })

  it('shares one stack group across series when stacked=true', () => {
    const onChartReady = vi.fn()
    render(
      <BarChart
        categories={CATEGORIES}
        series={TWO_SERIES}
        stacked
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.series[0].stack).toBe(applied.series[1].stack)
    expect(applied.series[0].stack).toBeTruthy()
  })

  it('honors a per-series stackId even when stacked=false, grouping only the matching series', () => {
    const onChartReady = vi.fn()
    const mixedSeries: BarChartSeries[] = [
      { id: 'a', label: 'A', data: [1, 2, 3], stackId: 'grp' },
      { id: 'b', label: 'B', data: [4, 5, 6], stackId: 'grp' },
      { id: 'c', label: 'C', data: [7, 8, 9] },
    ]
    render(
      <BarChart categories={CATEGORIES} series={mixedSeries} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.series[0].stack).toBe('grp')
    expect(applied.series[1].stack).toBe('grp')
    expect(applied.series[2].stack).toBeUndefined()
  })

  it('renders tooltip content through ChartTooltip via the formatter', () => {
    const onChartReady = vi.fn()
    render(
      <BarChart categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const formatter = getAppliedOption(instance).tooltip[0].formatter
    const html = formatter([
      { seriesId: 'lot1', seriesName: 'lot1', name: 'Mon', value: 10 },
      { seriesId: 'lot2', seriesName: 'lot2', name: 'Mon', value: 5 },
    ] as unknown as TooltipComponentFormatterCallbackParams)
    expect(html).toContain('data-slot="chart-tooltip"')
    expect(html).toContain('Lot 1')
    expect(html).toContain('Lot 2')
    expect(html).toContain('Mon')
  })

  it('applies a custom valueFormatter to tooltip values', () => {
    const onChartReady = vi.fn()
    render(
      <BarChart
        categories={CATEGORIES}
        series={ONE_SERIES}
        renderer="svg"
        aria-label="Chart"
        valueFormatter={(v) => `${v} km`}
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const formatter = getAppliedOption(instance).tooltip[0].formatter
    const html = formatter({ seriesId: 'trips', seriesName: 'trips', name: 'Mon', value: 10 } as unknown as TooltipComponentFormatterCallbackParams)
    expect(html).toContain('10 km')
  })

  it('toggling a legend item dispatches legendToggleSelect on the chart instance', () => {
    const onChartReady = vi.fn()
    const { getByRole } = render(
      <BarChart categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const dispatchSpy = vi.spyOn(instance, 'dispatchAction')
    fireEvent.click(getByRole('button', { name: /Lot 1/ }))
    // ECharts mutates the payload object in place (tags it with an internal
    // query id) while handling the action, so the recorded arg — captured by
    // reference — carries that extra key by assertion time. Assert the
    // contracted fields, not exact object identity.
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'legendToggleSelect', name: 'lot1' }),
    )
  })

  it('reflects legendselectchanged as hidden/dimmed legend items', () => {
    const onChartReady = vi.fn()
    const { getByRole } = render(
      <BarChart categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    // Driven directly on the live instance (not via fireEvent, which auto-wraps
    // in `act`) — mirrors an external ECharts-originated change, so the
    // resulting `legendselectchanged` → `setHiddenIds` update needs its own
    // explicit `act` to flush before asserting on the DOM.
    act(() => {
      instance.dispatchAction({ type: 'legendToggleSelect', name: 'lot1' })
    })
    const button = getByRole('button', { name: /Lot 1/ })
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('merges a consumer className onto the root wrapper', () => {
    const { container } = render(
      <BarChart categories={CATEGORIES} series={ONE_SERIES} className="ms-2" renderer="svg" aria-label="Chart" />,
    )
    expect(container.querySelector('[data-slot="bar-chart"]')).toHaveClass('ms-2', 'flex', 'flex-col')
  })

  it('has no axe violations (single series)', async () => {
    const { container } = render(
      <BarChart categories={CATEGORIES} series={ONE_SERIES} renderer="svg" aria-label="Trips per day" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (stacked, with legend)', async () => {
    const { container } = render(
      <BarChart categories={CATEGORIES} series={TWO_SERIES} stacked renderer="svg" aria-label="Lots per day" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (horizontal orientation)', async () => {
    const { container } = render(
      <BarChart categories={CATEGORIES} series={TWO_SERIES} orientation="horizontal" renderer="svg" aria-label="Lots per day" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations while loading', async () => {
    const { container } = render(
      <BarChart categories={CATEGORIES} series={ONE_SERIES} loading renderer="svg" aria-label="Trips per day" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders and has no axe violations under dir="rtl"', async () => {
    const { container } = render(
      <div dir="rtl">
        <BarChart categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Lots per day" />
      </div>,
    )
    expect(container.querySelector('[data-slot="chart-container"]')).toHaveAttribute('dir', 'rtl')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders xAxisTitle/yAxisTitle as ECharts axis names, with the value-axis title rotated 90 degrees', () => {
    const onChartReady = vi.fn()
    render(
      <BarChart
        categories={CATEGORIES}
        series={ONE_SERIES}
        xAxisTitle="Day"
        yAxisTitle="Trips"
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const applied = getAppliedOption(onChartReady.mock.calls[0][0])
    expect(applied.xAxis[0].name).toBe('Day')
    expect(applied.yAxis[0].name).toBe('Trips')
    expect(applied.yAxis[0].nameRotate).toBe(90)
  })

  it('omits axis names entirely when no titles are given', () => {
    const onChartReady = vi.fn()
    render(
      <BarChart categories={CATEGORIES} series={ONE_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const applied = getAppliedOption(onChartReady.mock.calls[0][0])
    expect(applied.xAxis[0].name).toBeFalsy()
    expect(applied.yAxis[0].name).toBeFalsy()
  })

  it('paints a token-derived background track on every series when showTrack is set', () => {
    const onChartReady = vi.fn()
    render(
      <BarChart
        categories={CATEGORIES}
        series={TWO_SERIES}
        showTrack
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const applied = getAppliedOption(onChartReady.mock.calls[0][0])
    expect(applied.series[0].showBackground).toBe(true)
    expect(applied.series[1].showBackground).toBe(true)
    expect(applied.series[0].backgroundStyle?.color).toBeTruthy()
  })

  it('leaves the background track off by default', () => {
    const onChartReady = vi.fn()
    render(
      <BarChart categories={CATEGORIES} series={ONE_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    expect(getAppliedOption(onChartReady.mock.calls[0][0]).series[0].showBackground).toBe(false)
  })

  it('builds the sr-only data-table twin from categories/series with no caller work', () => {
    const { container } = render(
      <BarChart categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Trips per day" />,
    )
    const table = container.querySelector('[data-slot="chart-container-data-table"]') as HTMLElement
    expect(table).toBeInTheDocument()
    expect(table).toHaveClass('sr-only')
    expect(table).toHaveAttribute('tabindex', '0')
    expect(table.querySelector('caption')?.textContent).toBe('Trips per day')
    const headers = [...table.querySelectorAll('thead th')].map((th) => th.textContent)
    expect(headers).toEqual(['Category', 'Lot 1', 'Lot 2'])
    const firstRow = [...table.querySelectorAll('tbody tr')][0]
    expect([...firstRow.children].map((cell) => cell.textContent)).toEqual(['Mon', '10', '5'])
  })

  it('points the plot at the data-table twin via aria-describedby', () => {
    const { container } = render(
      <BarChart categories={CATEGORIES} series={ONE_SERIES} renderer="svg" aria-label="Chart" />,
    )
    const plot = container.querySelector('[data-slot="chart-container-canvas"]') as HTMLElement
    const table = container.querySelector('[data-slot="chart-container-data-table"]') as HTMLElement
    expect(plot.getAttribute('aria-describedby')).toBe(table.id)
  })

  it('warns in DEV when one chart resolves both CVD-unsafe palette slots 4 and 5', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <BarChart
        categories={CATEGORIES}
        series={[
          { id: 'a', label: 'A', data: [1, 2, 3], colorIndex: 4 },
          { id: 'b', label: 'B', data: [3, 2, 1], colorIndex: 5 },
        ]}
        renderer="svg"
        aria-label="Chart"
      />,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('slots 4 and 5'))
    warn.mockRestore()
  })

  it('does not warn for a safe 4-slot categorical palette', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <BarChart
        categories={CATEGORIES}
        series={[
          { id: 'a', label: 'A', data: [1, 2, 3], colorIndex: 1 },
          { id: 'b', label: 'B', data: [3, 2, 1], colorIndex: 4 },
        ]}
        renderer="svg"
        aria-label="Chart"
      />,
    )
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })


  it('resolves series[].color and hands it to the legend swatch (non-categorical binding)', () => {
    const { container } = render(
      <BarChart
        categories={CATEGORIES}
        series={[
          { id: 'a', label: 'A', data: [1, 2, 3], color: '#0072d6' },
          { id: 'b', label: 'B', data: [3, 2, 1], colorIndex: 3 },
        ]}
        renderer="svg"
        aria-label="Chart"
      />,
    )
    const swatches = container.querySelectorAll('[data-slot="chart-legend-toggle"] span[aria-hidden="true"]')
    expect(swatches[0]).toHaveStyle({ backgroundColor: '#0072d6' })
    // The un-overridden series keeps the categorical palette.
    expect((swatches[1] as HTMLElement).getAttribute('style')).toBeNull()
  })

  it('places the legend above the plot when legendPlacement="top"', () => {
    const { container } = render(
      <BarChart
        categories={CATEGORIES}
        series={[
          { id: 'a', label: 'A', data: [1, 2, 3] },
          { id: 'b', label: 'B', data: [3, 2, 1] },
        ]}
        legendPlacement="top"
        renderer="svg"
        aria-label="Chart"
      />,
    )
    const root = container.querySelector('[data-slot="bar-chart"]') as HTMLElement
    expect(root.firstElementChild?.getAttribute('data-slot')).toBe('chart-legend')
  })

  it('keeps the legend below the plot by default', () => {
    const { container } = render(
      <BarChart
        categories={CATEGORIES}
        series={[
          { id: 'a', label: 'A', data: [1, 2, 3] },
          { id: 'b', label: 'B', data: [3, 2, 1] },
        ]}
        renderer="svg"
        aria-label="Chart"
      />,
    )
    const root = container.querySelector('[data-slot="bar-chart"]') as HTMLElement
    expect(root.lastElementChild?.getAttribute('data-slot')).toBe('chart-legend')
  })

  it('accepts pinned value-axis bounds without disturbing the render', () => {
    const { container } = render(
      <BarChart
        categories={CATEGORIES}
        series={[{ id: 'a', label: 'A', data: [1, 2, 3] }]}
        valueAxisMin={0}
        valueAxisMax={1200}
        renderer="svg"
        aria-label="Chart"
      />,
    )
    expect(container.querySelector('[data-slot="bar-chart"]')).not.toBeNull()
  })

})
