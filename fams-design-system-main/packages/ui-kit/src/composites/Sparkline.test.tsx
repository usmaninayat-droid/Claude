import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as ChartContainer.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import type { ECharts } from 'echarts'
import { Sparkline } from './Sparkline'

expect.extend({ toHaveNoViolations })

/** Narrow shape of what `Sparkline` actually puts on the live option — just
 *  enough to assert against, since ECharts' own `getOption()` return type
 *  widens every component key to `unknown`. */
interface AppliedSparklineSeries {
  type: string
  data: number[]
  smooth: boolean
  symbol: string
  lineStyle: { color: string; width: number }
  areaStyle?: { color: { type: string; colorStops: Array<{ offset: number; color: string }> } }
}
interface AppliedAxis {
  show: boolean
  min?: string
  max?: string
}
interface AppliedSparklineOption {
  series: AppliedSparklineSeries[]
  xAxis: AppliedAxis[]
  yAxis: AppliedAxis[]
  tooltip: Array<{ show: boolean }>
}

function getAppliedOption(instance: ECharts): AppliedSparklineOption {
  return instance.getOption() as unknown as AppliedSparklineOption
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
  clientWidthSpy = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(80)
  clientHeightSpy = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(32)
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

const DATA = [4, 8, 6, 9, 7, 12, 10]

describe('Sparkline', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a labeled, non-busy wrapper with an SVG line mounted', () => {
    const { container } = render(<Sparkline data={DATA} renderer="svg" aria-label="Trips, last 7 days, trending up" />)
    const wrapper = container.querySelector('[data-slot="chart-container"]')
    const plot = container.querySelector('[data-slot="chart-container-canvas"]')
    expect(plot).toHaveAttribute('role', 'img')
    expect(plot).toHaveAttribute('aria-label', 'Trips, last 7 days, trending up')
    expect(wrapper).toHaveAttribute('aria-busy', 'false')
    expect(container.querySelector('[data-slot="chart-container-canvas"] svg')).toBeInTheDocument()
  })

  it('defaults to a 32px height', () => {
    const { container } = render(<Sparkline data={DATA} renderer="svg" aria-label="Trend" />)
    const wrapper = container.querySelector('[data-slot="chart-container"]') as HTMLElement
    expect(wrapper.style.height).toBe('32px')
  })

  it('lets an explicit height prop override the default', () => {
    const { container } = render(<Sparkline data={DATA} renderer="svg" aria-label="Trend" height={40} />)
    const wrapper = container.querySelector('[data-slot="chart-container"]') as HTMLElement
    expect(wrapper.style.height).toBe('40px')
  })

  it('builds a single unfilled line series by default, with no axes/legend/tooltip chrome', () => {
    const onChartReady = vi.fn()
    render(<Sparkline data={DATA} renderer="svg" aria-label="Trend" onChartReady={onChartReady} />)
    const instance = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.series).toHaveLength(1)
    expect(applied.series[0].type).toBe('line')
    expect(applied.series[0].data).toEqual(DATA)
    expect(applied.series[0].symbol).toBe('none')
    expect(applied.series[0].areaStyle).toBeUndefined()
    expect(applied.xAxis[0].show).toBe(false)
    expect(applied.yAxis[0].show).toBe(false)
    expect(applied.tooltip[0].show).toBe(false)
  })

  it('scales the value axis to the data range rather than a 0-based default', () => {
    const onChartReady = vi.fn()
    render(<Sparkline data={DATA} renderer="svg" aria-label="Trend" onChartReady={onChartReady} />)
    const applied = getAppliedOption(onChartReady.mock.calls[0][0])
    expect(applied.yAxis[0].min).toBe('dataMin')
    expect(applied.yAxis[0].max).toBe('dataMax')
  })

  it('smooths the line by default', () => {
    const onChartReady = vi.fn()
    render(<Sparkline data={DATA} renderer="svg" aria-label="Trend" onChartReady={onChartReady} />)
    const applied = getAppliedOption(onChartReady.mock.calls[0][0])
    expect(applied.series[0].smooth).toBe(true)
  })

  it('disables smoothing when smooth={false}', () => {
    const onChartReady = vi.fn()
    render(<Sparkline data={DATA} smooth={false} renderer="svg" aria-label="Trend" onChartReady={onChartReady} />)
    const applied = getAppliedOption(onChartReady.mock.calls[0][0])
    expect(applied.series[0].smooth).toBe(false)
  })

  it('adds a gradient areaStyle when variant="area", fading from the resolved color to transparent', () => {
    const onChartReady = vi.fn()
    render(<Sparkline data={DATA} variant="area" renderer="svg" aria-label="Trend" onChartReady={onChartReady} />)
    const applied = getAppliedOption(onChartReady.mock.calls[0][0])
    const areaStyle = applied.series[0].areaStyle
    expect(areaStyle).toBeDefined()
    expect(areaStyle?.color.colorStops[0].color).toMatch(/^rgba\(/)
    expect(areaStyle?.color.colorStops[1].color).toMatch(/^rgba\(.*, 0\)$/)
  })

  it('resolves color from --color-chart-1..5 via colorIndex, never a literal hex passed through props', () => {
    const onChartReady = vi.fn()
    render(<Sparkline data={DATA} colorIndex={3} renderer="svg" aria-label="Trend" onChartReady={onChartReady} />)
    const applied = getAppliedOption(onChartReady.mock.calls[0][0])
    expect(applied.series[0].lineStyle.color).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('defaults to colorIndex 1 when omitted', () => {
    const onChartReady1 = vi.fn()
    const onChartReady2 = vi.fn()
    render(<Sparkline data={DATA} renderer="svg" aria-label="Trend" onChartReady={onChartReady1} />)
    render(<Sparkline data={DATA} colorIndex={1} renderer="svg" aria-label="Trend" onChartReady={onChartReady2} />)
    const applied1 = getAppliedOption(onChartReady1.mock.calls[0][0])
    const applied2 = getAppliedOption(onChartReady2.mock.calls[0][0])
    expect(applied1.series[0].lineStyle.color).toBe(applied2.series[0].lineStyle.color)
  })

  it('shows aria-busy and the Skeleton overlay when loading', () => {
    const { container } = render(<Sparkline data={DATA} loading renderer="svg" aria-label="Trend" />)
    const wrapper = container.querySelector('[data-slot="chart-container"]')
    expect(wrapper).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('[data-slot="chart-container-loading"] [data-slot="skeleton"]')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="chart-container-canvas"]')).toBeInTheDocument()
  })

  it('merges a consumer className and style with its own', () => {
    const { container } = render(
      <Sparkline data={DATA} renderer="svg" aria-label="Trend" className="ms-2" style={{ width: '80px' }} />,
    )
    const wrapper = container.querySelector('[data-slot="chart-container"]') as HTMLElement
    expect(wrapper).toHaveClass('ms-2')
    expect(wrapper.style.width).toBe('80px')
  })

  it('resolves dir from the nearest ancestor [dir] attribute (RTL)', () => {
    const { container } = render(
      <div dir="rtl">
        <Sparkline data={DATA} renderer="svg" aria-label="Trend" />
      </div>,
    )
    expect(container.querySelector('[data-slot="chart-container"]')).toHaveAttribute('dir', 'rtl')
  })

  it('has no axe violations (line variant)', async () => {
    const { container } = render(<Sparkline data={DATA} renderer="svg" aria-label="Trips, last 7 days, trending up" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations (area variant)', async () => {
    const { container } = render(<Sparkline data={DATA} variant="area" renderer="svg" aria-label="Trips, last 7 days, trending up" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations while loading', async () => {
    const { container } = render(<Sparkline data={DATA} loading renderer="svg" aria-label="Trend" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations under dir="rtl"', async () => {
    const { container } = render(
      <div dir="rtl">
        <Sparkline data={DATA} renderer="svg" aria-label="Trend" />
      </div>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
