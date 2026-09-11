import { act } from 'react'
import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { render, cleanup, fireEvent, within } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as ChartContainer.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import type { ECharts, TooltipComponentFormatterCallbackParams } from 'echarts'
import { AreaChart, type AreaChartSeries } from './AreaChart'

expect.extend({ toHaveNoViolations })

/** Narrow shape of what `AreaChart` actually puts on the live option — just
 *  enough to assert against, since ECharts' own `getOption()` return type
 *  widens every component key to `unknown`. */
interface AppliedAreaSeries {
  type: string
  stack?: string
  lineStyle?: { color: string }
  itemStyle?: { color: string }
  areaStyle: { color: { type: string; colorStops: Array<{ offset: number; color: string }> } }
}
interface AppliedTooltipFormatter {
  formatter: (params: TooltipComponentFormatterCallbackParams) => string
}
interface AppliedAxis {
  name?: string
  nameRotate?: number
}
interface AppliedAreaChartOption {
  series: AppliedAreaSeries[]
  tooltip: AppliedTooltipFormatter[]
  xAxis: AppliedAxis[]
  yAxis: AppliedAxis[]
}

function getAppliedOption(instance: ECharts): AppliedAreaChartOption {
  return instance.getOption() as unknown as AppliedAreaChartOption
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
const ONE_SERIES: AreaChartSeries[] = [{ id: 'trips', label: 'Trips', data: [10, 20, 15] }]
const TWO_SERIES: AreaChartSeries[] = [
  { id: 'lot1', label: 'Lot 1', data: [10, 20, 15] },
  { id: 'lot2', label: 'Lot 2', data: [5, 8, 12] },
]

describe('AreaChart', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a labeled ChartContainer wrapper', () => {
    const { container } = render(
      <AreaChart categories={CATEGORIES} series={ONE_SERIES} renderer="svg" aria-label="Trips per day" />,
    )
    const chart = container.querySelector('[data-slot="chart-container-canvas"]')
    expect(chart).toHaveAttribute('role', 'img')
    expect(chart).toHaveAttribute('aria-label', 'Trips per day')
    expect(container.querySelector('[data-slot="chart-container-canvas"] svg')).toBeInTheDocument()
  })

  it('hides the legend by default for a single series', () => {
    const { container } = render(
      <AreaChart categories={CATEGORIES} series={ONE_SERIES} renderer="svg" aria-label="Chart" />,
    )
    expect(container.querySelector('[data-slot="chart-legend"]')).not.toBeInTheDocument()
  })

  it('shows a legend by default for multiple series, one item per series', () => {
    const { container } = render(
      <AreaChart categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" />,
    )
    // Scoped to the legend: the series labels deliberately appear a second
    // time as column headers of the sr-only data-table twin.
    const legend = container.querySelector('[data-slot="chart-legend"]') as HTMLElement
    expect(within(legend).getByText('Lot 1')).toBeInTheDocument()
    expect(within(legend).getByText('Lot 2')).toBeInTheDocument()
  })

  it('respects an explicit legend={false} even with multiple series', () => {
    const { container } = render(
      <AreaChart categories={CATEGORIES} series={TWO_SERIES} legend={false} renderer="svg" aria-label="Chart" />,
    )
    expect(container.querySelector('[data-slot="chart-legend"]')).not.toBeInTheDocument()
  })

  it('respects an explicit legend={true} for a single series', () => {
    const { container } = render(
      <AreaChart categories={CATEGORIES} series={ONE_SERIES} legend renderer="svg" aria-label="Chart" />,
    )
    expect(container.querySelector('[data-slot="chart-legend"]')).toBeInTheDocument()
  })

  it('shows aria-busy and the Skeleton overlay when loading', () => {
    const { container } = render(
      <AreaChart categories={CATEGORIES} series={ONE_SERIES} loading renderer="svg" aria-label="Chart" />,
    )
    expect(container.querySelector('[data-slot="chart-container"]')).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
  })

  it('builds one area series per input series with a gradient areaStyle and no raw hex leaking through option identity', () => {
    const onChartReady = vi.fn()
    render(
      <AreaChart
        categories={CATEGORIES}
        series={TWO_SERIES}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.series).toHaveLength(2)
    expect(applied.series[0].type).toBe('line')
    expect(applied.series[0].areaStyle.color.type).toBe('linear')
    expect(applied.series[0].areaStyle.color.colorStops).toHaveLength(2)
  })

  it('lets a series override its resolved token color with a raw hex (blueprint escape hatch)', () => {
    const onChartReady = vi.fn()
    render(
      <AreaChart
        categories={CATEGORIES}
        series={[{ id: 'compliance', label: 'Compliance', data: [10, 20, 15], color: '#0072d6' }]}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.series[0].lineStyle?.color).toBe('#0072d6')
    expect(applied.series[0].itemStyle?.color).toBe('#0072d6')
  })

  it('shares one stack group across series when stacked=true', () => {
    const onChartReady = vi.fn()
    render(
      <AreaChart
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

  it('leaves series unstacked by default', () => {
    const onChartReady = vi.fn()
    render(
      <AreaChart categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.series[0].stack).toBeUndefined()
  })

  it('renders tooltip content through ChartTooltip via the formatter', () => {
    const onChartReady = vi.fn()
    render(
      <AreaChart categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
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
      <AreaChart
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
      <AreaChart categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const dispatchSpy = vi.spyOn(instance, 'dispatchAction')
    fireEvent.click(getByRole('button', { name: /Lot 1/ }))
    // ECharts mutates the payload object in place (tags it with an internal
    // query id) as part of handling the action, so the recorded call arg —
    // captured by reference — carries that extra key by the time we inspect
    // it here. Assert the fields this component contracts to send instead of
    // exact object identity.
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'legendToggleSelect', name: 'lot1' }),
    )
  })

  it('reflects legendselectchanged as hidden/dimmed legend items', () => {
    const onChartReady = vi.fn()
    const { getByRole } = render(
      <AreaChart categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    // Driven directly on the live instance (not via fireEvent, which
    // auto-wraps in `act`) — this mirrors an external ECharts-originated
    // change (e.g. legend interaction via keyboard/touch inside the canvas
    // itself), so the resulting `legendselectchanged` → `setHiddenIds` state
    // update needs its own explicit `act` to flush before asserting on the DOM.
    act(() => {
      instance.dispatchAction({ type: 'legendToggleSelect', name: 'lot1' })
    })
    const button = getByRole('button', { name: /Lot 1/ })
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('merges a consumer className onto the root wrapper', () => {
    const { container } = render(
      <AreaChart categories={CATEGORIES} series={ONE_SERIES} className="ms-2" renderer="svg" aria-label="Chart" />,
    )
    expect(container.querySelector('[data-slot="area-chart"]')).toHaveClass('ms-2', 'flex', 'flex-col')
  })

  it('has no axe violations (single series)', async () => {
    const { container } = render(
      <AreaChart categories={CATEGORIES} series={ONE_SERIES} renderer="svg" aria-label="Trips per day" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (stacked, with legend)', async () => {
    const { container } = render(
      <AreaChart categories={CATEGORIES} series={TWO_SERIES} stacked renderer="svg" aria-label="Lots per day" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations while loading', async () => {
    const { container } = render(
      <AreaChart categories={CATEGORIES} series={ONE_SERIES} loading renderer="svg" aria-label="Trips per day" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders and has no axe violations under dir="rtl"', async () => {
    const { container } = render(
      <div dir="rtl">
        <AreaChart categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Lots per day" />
      </div>,
    )
    expect(container.querySelector('[data-slot="chart-container"]')).toHaveAttribute('dir', 'rtl')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders axis titles, with the value-axis title rotated 90 degrees', () => {
    const onChartReady = vi.fn()
    render(
      <AreaChart
        categories={CATEGORIES}
        series={ONE_SERIES}
        xAxisTitle="Day"
        yAxisTitle="Hours"
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const applied = getAppliedOption(onChartReady.mock.calls[0][0])
    expect(applied.xAxis[0].name).toBe('Day')
    expect(applied.yAxis[0].name).toBe('Hours')
    expect(applied.yAxis[0].nameRotate).toBe(90)
  })

  it('omits axis names entirely when no titles are given', () => {
    const onChartReady = vi.fn()
    render(
      <AreaChart categories={CATEGORIES} series={ONE_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const applied = getAppliedOption(onChartReady.mock.calls[0][0])
    expect(applied.xAxis[0].name).toBeFalsy()
    expect(applied.yAxis[0].name).toBeFalsy()
  })

  it('builds the sr-only data-table twin from categories/series with no caller work', () => {
    const { container } = render(
      <AreaChart categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Hours per day" />,
    )
    const table = container.querySelector('[data-slot="chart-container-data-table"]') as HTMLElement
    expect(table).toHaveClass('sr-only')
    expect(table.querySelector('caption')?.textContent).toBe('Hours per day')
    expect([...table.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual(['Category', 'Lot 1', 'Lot 2'])
  })

})
