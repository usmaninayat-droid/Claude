import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { render, cleanup, fireEvent, act } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as ChartContainer.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import type { ECharts, TooltipComponentFormatterCallbackParams } from 'echarts'
import { CompareBars, type CompareBarsSeries } from './CompareBars'

expect.extend({ toHaveNoViolations })

/** Narrow shape of what `CompareBars` actually puts on the live option — just
 *  enough to assert against, since ECharts' own `getOption()` return type
 *  widens every component key to `unknown`. */
interface AppliedCompareBarSeries {
  type: string
  itemStyle: { color: string; borderRadius: [number, number, number, number] }
  label: { show: boolean; position: string; formatter: (params: { value: number }) => string }
  stack?: string
}
interface AppliedTooltipFormatter {
  formatter: (params: TooltipComponentFormatterCallbackParams) => string
}
interface AppliedAxis {
  type: string
  data?: Array<string | number>
}
interface AppliedCompareBarsOption {
  series: AppliedCompareBarSeries[]
  tooltip: AppliedTooltipFormatter[]
  xAxis: AppliedAxis[]
  yAxis: AppliedAxis[]
}

function getAppliedOption(instance: ECharts): AppliedCompareBarsOption {
  return instance.getOption() as unknown as AppliedCompareBarsOption
}

// jsdom has no layout engine or canvas 2D context — same stub as
// ChartContainer.test.tsx/BarChart.test.tsx. Every test here uses
// renderer="svg" so ECharts mounts real, inspectable DOM.
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

const CATEGORIES = ['Lot 1', 'Lot 2', 'Lot 3']
const ONE_SERIES: CompareBarsSeries[] = [{ id: 'actual', label: 'Actual', data: [10, 20, 15] }]
const TWO_SERIES: CompareBarsSeries[] = [
  { id: 'target', label: 'Target', data: [12, 18, 20] },
  { id: 'actual', label: 'Actual', data: [10, 20, 15] },
]

describe('CompareBars', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a labeled ChartContainer wrapper', () => {
    const { container } = render(
      <CompareBars categories={CATEGORIES} series={ONE_SERIES} renderer="svg" aria-label="Target vs actual" />,
    )
    const chart = container.querySelector('[data-slot="chart-container-canvas"]')
    expect(chart).toHaveAttribute('role', 'img')
    expect(chart).toHaveAttribute('aria-label', 'Target vs actual')
    expect(container.querySelector('[data-slot="chart-container-canvas"] svg')).toBeInTheDocument()
  })

  it('hides the legend by default for a single series', () => {
    const { container } = render(
      <CompareBars categories={CATEGORIES} series={ONE_SERIES} renderer="svg" aria-label="Chart" />,
    )
    expect(container.querySelector('[data-slot="chart-legend"]')).not.toBeInTheDocument()
  })

  it('shows a legend by default for multiple series, one item per series', () => {
    const { getByText } = render(
      <CompareBars categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" />,
    )
    expect(getByText('Target')).toBeInTheDocument()
    expect(getByText('Actual')).toBeInTheDocument()
  })

  it('respects an explicit legend={false} even with multiple series', () => {
    const { container } = render(
      <CompareBars categories={CATEGORIES} series={TWO_SERIES} legend={false} renderer="svg" aria-label="Chart" />,
    )
    expect(container.querySelector('[data-slot="chart-legend"]')).not.toBeInTheDocument()
  })

  it('respects an explicit legend={true} for a single series', () => {
    const { container } = render(
      <CompareBars categories={CATEGORIES} series={ONE_SERIES} legend renderer="svg" aria-label="Chart" />,
    )
    expect(container.querySelector('[data-slot="chart-legend"]')).toBeInTheDocument()
  })

  it('shows aria-busy and the Skeleton overlay when loading', () => {
    const { container } = render(
      <CompareBars categories={CATEGORIES} series={ONE_SERIES} loading renderer="svg" aria-label="Chart" />,
    )
    expect(container.querySelector('[data-slot="chart-container"]')).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
  })

  it('builds one bar series per input series with token-resolved color and no raw hex leaking through props', () => {
    const onChartReady = vi.fn()
    render(
      <CompareBars categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.series).toHaveLength(2)
    expect(applied.series[0].type).toBe('bar')
    expect(applied.series[0].itemStyle.color).toMatch(/^#/)
  })

  it('always places categories on the y-axis and values on the x-axis (horizontal comparison layout)', () => {
    const onChartReady = vi.fn()
    render(
      <CompareBars categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.yAxis[0].type).toBe('category')
    expect(applied.yAxis[0].data).toEqual(CATEGORIES)
    expect(applied.xAxis[0].type).toBe('value')
  })

  it('rounds the trailing (value-axis) corners of every bar', () => {
    const onChartReady = vi.fn()
    render(
      <CompareBars categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.series[0].itemStyle.borderRadius).toEqual([0, 4, 4, 0])
    expect(applied.series[1].itemStyle.borderRadius).toEqual([0, 4, 4, 0])
  })

  it('leaves series grouped (never stacked) — no stack id on any series', () => {
    const onChartReady = vi.fn()
    render(
      <CompareBars categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.series[0]).not.toHaveProperty('stack')
    expect(applied.series[1]).not.toHaveProperty('stack')
  })

  it('shows a formatted end-of-bar value label per series', () => {
    const onChartReady = vi.fn()
    render(
      <CompareBars categories={CATEGORIES} series={ONE_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.series[0].label.show).toBe(true)
    expect(applied.series[0].label.position).toBe('right')
    expect(applied.series[0].label.formatter({ value: 1234 })).toBe('1,234')
  })

  it('applies a custom valueFormatter to the end-of-bar label and the tooltip', () => {
    const onChartReady = vi.fn()
    render(
      <CompareBars
        categories={CATEGORIES}
        series={ONE_SERIES}
        renderer="svg"
        aria-label="Chart"
        valueFormatter={(v) => `${v} kg`}
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.series[0].label.formatter({ value: 10 })).toBe('10 kg')
    const html = applied.tooltip[0].formatter({ seriesId: 'actual', seriesName: 'actual', name: 'Lot 1', value: 10 } as unknown as TooltipComponentFormatterCallbackParams)
    expect(html).toContain('10 kg')
  })

  it('renders tooltip content through ChartTooltip via the formatter', () => {
    const onChartReady = vi.fn()
    render(
      <CompareBars categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const formatter = getAppliedOption(instance).tooltip[0].formatter
    const html = formatter([
      { seriesId: 'target', seriesName: 'target', name: 'Lot 1', value: 12 },
      { seriesId: 'actual', seriesName: 'actual', name: 'Lot 1', value: 10 },
    ] as unknown as TooltipComponentFormatterCallbackParams)
    expect(html).toContain('data-slot="chart-tooltip"')
    expect(html).toContain('Target')
    expect(html).toContain('Actual')
    expect(html).toContain('Lot 1')
  })

  it('toggling a legend item dispatches legendToggleSelect on the chart instance', () => {
    const onChartReady = vi.fn()
    const { getByRole } = render(
      <CompareBars categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const dispatchSpy = vi.spyOn(instance, 'dispatchAction')
    fireEvent.click(getByRole('button', { name: /Target/ }))
    // ECharts mutates the payload object in place (tags it with an internal
    // query id) while handling the action, so the recorded arg — captured by
    // reference — carries that extra key by assertion time. Assert the
    // contracted fields, not exact object identity.
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'legendToggleSelect', name: 'target' }),
    )
  })

  it('reflects legendselectchanged as hidden/dimmed legend items', () => {
    const onChartReady = vi.fn()
    const { getByRole } = render(
      <CompareBars categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    // Driven directly on the live instance (not via fireEvent, which auto-wraps
    // in `act`) — mirrors an external ECharts-originated change, so the
    // resulting `legendselectchanged` → `setHiddenIds` update needs its own
    // explicit `act` to flush before asserting on the DOM.
    act(() => {
      instance.dispatchAction({ type: 'legendToggleSelect', name: 'target' })
    })
    const button = getByRole('button', { name: /Target/ })
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('merges a consumer className onto the root wrapper', () => {
    const { container } = render(
      <CompareBars categories={CATEGORIES} series={ONE_SERIES} className="ms-2" renderer="svg" aria-label="Chart" />,
    )
    expect(container.querySelector('[data-slot="compare-bars"]')).toHaveClass('ms-2', 'flex', 'flex-col')
  })

  it('has no axe violations (single series)', async () => {
    const { container } = render(
      <CompareBars categories={CATEGORIES} series={ONE_SERIES} renderer="svg" aria-label="Actual per lot" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (two series, with legend)', async () => {
    const { container } = render(
      <CompareBars categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Target vs actual per lot" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations while loading', async () => {
    const { container } = render(
      <CompareBars categories={CATEGORIES} series={ONE_SERIES} loading renderer="svg" aria-label="Actual per lot" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders and has no axe violations under dir="rtl"', async () => {
    const { container } = render(
      <div dir="rtl">
        <CompareBars categories={CATEGORIES} series={TWO_SERIES} renderer="svg" aria-label="Target vs actual per lot" />
      </div>,
    )
    expect(container.querySelector('[data-slot="chart-container"]')).toHaveAttribute('dir', 'rtl')
    expect(await axe(container)).toHaveNoViolations()
  })
})
