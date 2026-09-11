import { describe, expect, it, vi, beforeAll, beforeEach, afterAll, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as a11y.axe.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import type { EChartsOption } from 'echarts'
import { ChartContainer } from './ChartContainer'

expect.extend({ toHaveNoViolations })

// jsdom has no layout engine (every element's clientWidth/clientHeight is 0)
// and no canvas 2D context (`HTMLCanvasElement.getContext` is "not
// implemented" without the native `canvas` package). ECharts/zrender need
// both — a real size to paint into, and a 2D context for text-measurement
// even under the SVG renderer. Stub both for this file only; production code
// never reads them directly, it only ever asks ECharts to read them at
// init/resize time.
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

// jsdom has no canvas 2D context (`HTMLCanvasElement.getContext('2d')` is
// `null` unless the native `canvas` package is installed), so every test
// below uses the SVG renderer — a fully supported, non-canvas ECharts
// renderer that works against plain DOM elements.
const OPTION: EChartsOption = {
  xAxis: { type: 'category', data: ['Mon', 'Tue'] },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: [10, 20] }],
}

describe('ChartContainer', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a labeled, non-busy wrapper and an inner canvas host', () => {
    const { container } = render(
      <ChartContainer option={OPTION} renderer="svg" aria-label="Trips per day" />,
    )
    const wrapper = container.querySelector('[data-slot="chart-container"]')
    const plot = container.querySelector('[data-slot="chart-container-canvas"]')
    expect(plot).toHaveAttribute('role', 'img')
    expect(plot).toHaveAttribute('aria-label', 'Trips per day')
    expect(wrapper).toHaveAttribute('aria-busy', 'false')
    expect(container.querySelector('[data-slot="chart-container-canvas"]')).toBeInTheDocument()
    // ECharts SVG renderer mounts real DOM (an <svg>) into the host on init.
    expect(container.querySelector('[data-slot="chart-container-canvas"] svg')).toBeInTheDocument()
  })

  it('applies the numeric height as an inline pixel height, default 320', () => {
    const { container, rerender } = render(<ChartContainer option={OPTION} renderer="svg" aria-label="Chart" />)
    const wrapper = container.querySelector('[data-slot="chart-container"]') as HTMLElement
    expect(wrapper.style.height).toBe('320px')

    rerender(<ChartContainer option={OPTION} renderer="svg" aria-label="Chart" height={480} />)
    expect(wrapper.style.height).toBe('480px')
  })

  it('applies a string height verbatim', () => {
    const { container } = render(
      <ChartContainer option={OPTION} renderer="svg" aria-label="Chart" height="50%" />,
    )
    const wrapper = container.querySelector('[data-slot="chart-container"]') as HTMLElement
    expect(wrapper.style.height).toBe('50%')
  })

  it('shows the token-styled Skeleton overlay and aria-busy when loading, keeping the canvas host mounted', () => {
    const { container } = render(
      <ChartContainer option={OPTION} renderer="svg" aria-label="Chart" loading />,
    )
    const wrapper = container.querySelector('[data-slot="chart-container"]')
    expect(wrapper).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('[data-slot="chart-container-loading"] [data-slot="skeleton"]')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="chart-container-canvas"]')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="chart-container-canvas"]')).toHaveClass('opacity-40')
  })

  it('renders no loading overlay when loading is false (default)', () => {
    const { container } = render(<ChartContainer option={OPTION} renderer="svg" aria-label="Chart" />)
    expect(container.querySelector('[data-slot="chart-container-loading"]')).not.toBeInTheDocument()
  })

  it('resolves dir from the nearest ancestor [dir] attribute (RTL)', () => {
    const { container } = render(
      <div dir="rtl">
        <ChartContainer option={OPTION} renderer="svg" aria-label="Chart" />
      </div>,
    )
    expect(container.querySelector('[data-slot="chart-container"]')).toHaveAttribute('dir', 'rtl')
  })

  it('defaults to ltr with no ancestor [dir]', () => {
    const { container } = render(<ChartContainer option={OPTION} renderer="svg" aria-label="Chart" />)
    expect(container.querySelector('[data-slot="chart-container"]')).toHaveAttribute('dir', 'ltr')
  })

  it('lets an explicit dir prop win over the ambient ancestor direction', () => {
    const { container } = render(
      <div dir="rtl">
        <ChartContainer option={OPTION} renderer="svg" aria-label="Chart" dir="ltr" />
      </div>,
    )
    expect(container.querySelector('[data-slot="chart-container"]')).toHaveAttribute('dir', 'ltr')
  })

  it('merges a consumer className and style with its own', () => {
    const { container } = render(
      <ChartContainer
        option={OPTION}
        renderer="svg"
        aria-label="Chart"
        className="ms-2"
        style={{ width: '90%' }}
      />,
    )
    const wrapper = container.querySelector('[data-slot="chart-container"]') as HTMLElement
    expect(wrapper).toHaveClass('ms-2', 'relative', 'w-full')
    expect(wrapper.style.width).toBe('90%')
    expect(wrapper.style.height).toBe('320px')
  })

  it('leaves ECharts animation enabled when prefers-reduced-motion is not active', () => {
    const onChartReady = vi.fn()
    render(<ChartContainer option={OPTION} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />)
    const instance = onChartReady.mock.calls[0][0]
    const applied = instance.getOption()
    expect(applied.animation).not.toBe(false)
  })

  it('adds tooltip.appendToBody/confine defaults only when the caller already configured a tooltip', () => {
    const onChartReadyNoTooltip = vi.fn()
    render(<ChartContainer option={OPTION} renderer="svg" aria-label="Chart" onChartReady={onChartReadyNoTooltip} />)
    expect(onChartReadyNoTooltip.mock.calls[0][0].getOption().tooltip).toEqual([])

    const onChartReadyWithTooltip = vi.fn()
    render(
      <ChartContainer
        option={{ ...OPTION, tooltip: { trigger: 'axis' } }}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReadyWithTooltip}
      />,
    )
    const tooltip = onChartReadyWithTooltip.mock.calls[0][0].getOption().tooltip
    expect(tooltip[0]).toMatchObject({ trigger: 'axis', appendToBody: true, confine: true })
  })

  it('invokes onChartReady once with the live ECharts instance', () => {
    const onChartReady = vi.fn()
    render(<ChartContainer option={OPTION} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />)
    expect(onChartReady).toHaveBeenCalledTimes(1)
    const instance = onChartReady.mock.calls[0][0]
    expect(typeof instance.setOption).toBe('function')
    expect(typeof instance.dispose).toBe('function')
  })

  it('disposes the ECharts instance on unmount', () => {
    const onChartReady = vi.fn()
    const { unmount } = render(
      <ChartContainer option={OPTION} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )
    const instance = onChartReady.mock.calls[0][0]
    const disposeSpy = vi.spyOn(instance, 'dispose')
    unmount()
    expect(disposeSpy).toHaveBeenCalledTimes(1)
  })

  it('has no axe violations', async () => {
    const { container } = render(<ChartContainer option={OPTION} renderer="svg" aria-label="Trips per day" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations while loading', async () => {
    const { container } = render(<ChartContainer option={OPTION} renderer="svg" aria-label="Trips per day" loading />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations under dir="rtl"', async () => {
    const { container } = render(
      <div dir="rtl">
        <ChartContainer option={OPTION} renderer="svg" aria-label="Trips per day" />
      </div>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('ChartContainer — prefers-reduced-motion', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    // jsdom has no matchMedia implementation at all; stub it per-test.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    cleanup()
  })

  it('disables ECharts animation when prefers-reduced-motion is active', () => {
    const onChartReady = vi.fn()
    render(<ChartContainer option={OPTION} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />)
    const instance = onChartReady.mock.calls[0][0]
    const applied = instance.getOption()
    expect(applied.animation).toBe(false)
  })

  it('renders a keyboard-reachable, visually-hidden data-table twin linked from the plot', () => {
    const { container } = render(
      <ChartContainer
        option={OPTION}
        renderer="svg"
        aria-label="Trips per day"
        dataTable={{ caption: 'Trips per day', columns: ['Day', 'Trips'], rows: [['Mon', 10], ['Tue', 20]] }}
      />,
    )
    const table = container.querySelector('[data-slot="chart-container-data-table"]') as HTMLTableElement
    expect(table).toHaveClass('sr-only')
    expect(table).toHaveAttribute('tabindex', '0')
    expect(table.querySelector('caption')?.textContent).toBe('Trips per day')
    expect([...table.querySelectorAll('thead th')].map((th) => th.getAttribute('scope'))).toEqual(['col', 'col'])
    // Cell 0 of every row is the row header, so a row is self-describing.
    expect(table.querySelector('tbody th')?.getAttribute('scope')).toBe('row')
    const plot = container.querySelector('[data-slot="chart-container-canvas"]') as HTMLElement
    expect(plot.getAttribute('aria-describedby')).toBe(table.id)
  })

  it('clips the data-table twin so it can never widen the page (round-4 P0 regression)', () => {
    // `sr-only`'s `width: 1px` does NOT shrink a `<table>` — auto table layout
    // treats it as a minimum — and the twin is `position: absolute`, so it
    // escapes any ancestor that is not a containing block and leaks into the
    // document's scrollable overflow. The wrapper is `sr-only` too: absolute
    // (⇒ containing block) AND overflow-hidden (⇒ the clip).
    const { container } = render(
      <ChartContainer
        option={OPTION}
        renderer="svg"
        aria-label="Trips per day"
        dataTable={{ caption: 'Trips per day', columns: ['Day', 'Trips'], rows: [['Mon', 10]] }}
      />,
    )
    const table = container.querySelector('[data-slot="chart-container-data-table"]') as HTMLTableElement
    const clip = table.parentElement as HTMLElement
    expect(clip.getAttribute('data-slot')).toBe('chart-container-data-table-clip')
    expect(clip).toHaveClass('sr-only')
    expect(clip).toHaveClass('overflow-hidden')
    // The twin itself is unchanged: hidden, tabbable, still carrying rows.
    expect(table).toHaveAttribute('tabindex', '0')
    expect(table.querySelectorAll('tbody tr')).toHaveLength(1)
  })

  it('renders the table OUTSIDE the role="img" element, so assistive tech is not told to ignore it', () => {
    const { container } = render(
      <ChartContainer
        option={OPTION}
        renderer="svg"
        aria-label="Trips per day"
        dataTable={{ caption: 'Trips per day', columns: ['Day', 'Trips'], rows: [['Mon', 10]] }}
      />,
    )
    const plot = container.querySelector('[role="img"]') as HTMLElement
    expect(plot.querySelector('[data-slot="chart-container-data-table"]')).toBeNull()
  })

  it('renders no table and no aria-describedby when dataTable is omitted', () => {
    const { container } = render(<ChartContainer option={OPTION} renderer="svg" aria-label="Trips per day" />)
    expect(container.querySelector('[data-slot="chart-container-data-table"]')).toBeNull()
    expect(
      container.querySelector('[data-slot="chart-container-canvas"]')?.getAttribute('aria-describedby'),
    ).toBeNull()
  })

  it('has no axe violations with a data-table twin', async () => {
    const { container } = render(
      <ChartContainer
        option={OPTION}
        renderer="svg"
        aria-label="Trips per day"
        dataTable={{ caption: 'Trips per day', columns: ['Day', 'Trips'], rows: [['Mon', 10], ['Tue', 20]] }}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

})
