import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as ChartContainer.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import type { ECharts, TooltipComponentFormatterCallbackParams } from 'echarts'
import chartTheme from '@fams/tokens/theme.echarts.json'
import { HeatmapChart, buildGroupTicks, type HeatmapChartBin, type HeatmapChartCell } from './HeatmapChart'

expect.extend({ toHaveNoViolations })

/** Narrow shape of what `HeatmapChart` actually puts on the live option —
 *  just enough to assert against, since ECharts' own `getOption()` return
 *  type widens every component key to `unknown` (same pattern as
 *  `BarChart.test.tsx`). */
interface AppliedVisualMap {
  type: string
  show: boolean
  min: number
  max: number
  inRange: { color: string[] }
  text: string[]
  pieces?: Array<{ min: number; max: number; label: string; color: string }>
}
interface AppliedAxis {
  type: string
  data?: Array<string | number>
  inverse?: boolean
  name?: string
  nameRotate?: number
}
interface AppliedHeatmapSeries {
  type: string
  data: Array<[number, number, number]>
  label: { show: boolean; formatter: unknown }
}
interface AppliedTooltipFormatter {
  formatter: (params: TooltipComponentFormatterCallbackParams) => string
}
interface AppliedHeatmapOption {
  visualMap: AppliedVisualMap[]
  xAxis: AppliedAxis[]
  yAxis: AppliedAxis[]
  series: AppliedHeatmapSeries[]
  tooltip: AppliedTooltipFormatter[]
}

function getAppliedOption(instance: ECharts): AppliedHeatmapOption {
  return instance.getOption() as unknown as AppliedHeatmapOption
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
  clientHeightSpy = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400)
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

const X_CATEGORIES = ['Mon', 'Tue', 'Wed']
const Y_CATEGORIES = ['Lot 1', 'Lot 2']
const CELLS: HeatmapChartCell[] = [
  { x: 'Mon', y: 'Lot 1', value: 4 },
  { x: 'Tue', y: 'Lot 1', value: 9 },
  { x: 'Wed', y: 'Lot 2', value: 2 },
]
const BINS: HeatmapChartBin[] = [
  { to: 0, color: '#f2f4f7', label: 'No Data', noData: true },
  { to: 5, color: '#fef0c7', label: '0–5' },
  { to: 10, color: '#f04438', label: '6–10' },
]

describe('HeatmapChart', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a labeled ChartContainer wrapper', () => {
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        renderer="svg"
        aria-label="Issues by lot and day"
      />,
    )
    expect(screen.getByRole('img', { name: 'Issues by lot and day' })).toBeInTheDocument()
  })

  it('builds one [xIndex, yIndex, value] triple per cell', () => {
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.series[0].type).toBe('heatmap')
    expect(applied.series[0].data).toEqual([
      [0, 0, 4],
      [1, 0, 9],
      [2, 1, 2],
    ])
  })

  it('drops cells whose x or y has no matching category', () => {
    const onChartReady = vi.fn()
    const sparse: HeatmapChartCell[] = [...CELLS, { x: 'Thu', y: 'Lot 1', value: 99 }]
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={sparse}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.series[0].data).toHaveLength(3)
  })

  it('places xCategories on the x-axis and yCategories (inverse) on the y-axis', () => {
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.xAxis[0].type).toBe('category')
    expect(applied.xAxis[0].data).toEqual(X_CATEGORIES)
    expect(applied.yAxis[0].type).toBe('category')
    expect(applied.yAxis[0].data).toEqual(Y_CATEGORIES)
    expect(applied.yAxis[0].inverse).toBe(true)
  })

  it('defaults min to 0 and max to the highest cell value', () => {
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.visualMap[0].min).toBe(0)
    expect(applied.visualMap[0].max).toBe(9)
  })

  it('renders its empty state — not a bare axis frame — when no cells are given', () => {
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={[]}
        emptyText="No scores for this period."
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    // No axes, no visualMap, no placeholder geometry — the option is blanked
    // and the message takes the plot box (verdict V10).
    expect(applied.visualMap).toEqual([])
    expect(document.querySelector('[data-slot="chart-container-empty"]')).toBeInTheDocument()
  })

  it('respects explicit min/max over the computed defaults', () => {
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        min={1}
        max={100}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.visualMap[0].min).toBe(1)
    expect(applied.visualMap[0].max).toBe(100)
  })

  it('uses the token-sourced sequential ramp by default, never a raw literal outside the token file', () => {
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.visualMap[0].inRange.color).toEqual(chartTheme.heat.sequential)
  })

  it('switches to the token-sourced cool ramp when colorScale="cool"', () => {
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        colorScale="cool"
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.visualMap[0].inRange.color).toEqual(chartTheme.heat.cool)
  })

  it('shows the visualMap color-scale bar by default', () => {
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    expect(getAppliedOption(instance).visualMap[0].show).toBe(true)
  })

  it('hides the visualMap color-scale bar when legend={false} while keeping the mapping active', () => {
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        legend={false}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    expect(applied.visualMap[0].show).toBe(false)
    expect(applied.visualMap[0].inRange.color).toEqual(chartTheme.heat.sequential)
  })

  it('hides on-cell value labels by default', () => {
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    expect(getAppliedOption(instance).series[0].label.show).toBe(false)
  })

  it('shows on-cell value labels when showValues is set', () => {
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        showValues
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    expect(getAppliedOption(instance).series[0].label.show).toBe(true)
  })

  it('renders tooltip content through ChartTooltip with a "row × column" title', () => {
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const formatter = getAppliedOption(instance).tooltip[0].formatter
    const html = formatter({ value: [1, 0, 9] } as unknown as TooltipComponentFormatterCallbackParams)
    expect(html).toContain('data-slot="chart-tooltip"')
    expect(html).toContain('Lot 1 × Tue')
    expect(html).toContain('9')
  })

  it('applies a custom valueFormatter to the tooltip and the visualMap text', () => {
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        valueFormatter={(v) => `${v} pts`}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const instance: ECharts = onChartReady.mock.calls[0][0]
    const applied = getAppliedOption(instance)
    const formatter = applied.tooltip[0].formatter
    const html = formatter({ value: [0, 0, 4] } as unknown as TooltipComponentFormatterCallbackParams)
    expect(html).toContain('4 pts')
    expect(applied.visualMap[0].text).toEqual(['9 pts', '0 pts'])
  })

  it('shows aria-busy and the Skeleton overlay when loading', () => {
    const { container } = render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        loading
        renderer="svg"
        aria-label="Chart"
      />,
    )
    expect(container.querySelector('[data-slot="chart-container"]')).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
  })

  it('merges a consumer className onto the root wrapper', () => {
    const { container } = render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        className="ms-2"
        renderer="svg"
        aria-label="Chart"
      />,
    )
    expect(container.querySelector('[data-slot="heatmap-chart"]')).toHaveClass('ms-2', 'flex', 'flex-col')
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        renderer="svg"
        aria-label="Issues by lot and day"
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations while loading', async () => {
    const { container } = render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        loading
        renderer="svg"
        aria-label="Issues by lot and day"
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders and has no axe violations under dir="rtl"', async () => {
    const { container } = render(
      <div dir="rtl">
        <HeatmapChart
          xCategories={X_CATEGORIES}
          yCategories={Y_CATEGORIES}
          cells={CELLS}
          renderer="svg"
          aria-label="Issues by lot and day"
        />
      </div>,
    )
    expect(container.querySelector('[data-slot="chart-container"]')).toHaveAttribute('dir', 'rtl')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders axis titles, with the row-axis title rotated 90 degrees', () => {
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        xAxisTitle="Day"
        yAxisTitle="Lot"
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const applied = getAppliedOption(onChartReady.mock.calls[0][0])
    expect(applied.xAxis[0].name).toBe('Day')
    expect(applied.yAxis[0].name).toBe('Lot')
    expect(applied.yAxis[0].nameRotate).toBe(90)
  })

  it('switches the continuous ramp for a piecewise scale when bins are given', () => {
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        bins={BINS}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const applied = getAppliedOption(onChartReady.mock.calls[0][0])
    expect(applied.visualMap[0].type).toBe('piecewise')
    const pieces = applied.visualMap[0].pieces ?? []
    // No-data piece first, then each scored bin starting where the last ended.
    expect(pieces.map((piece) => piece.label)).toEqual(['No Data', '0–5', '6–10'])
    expect(pieces[1]).toMatchObject({ min: 0, max: 5 })
    expect(pieces[2]).toMatchObject({ min: 5, max: 10 })
  })

  it('resolves `var(--token)` bin colours to literals before the visualMap is built', () => {
    // The uniform-grey heatmap defect: a piecewise visualMap paints on canvas,
    // where an unresolved `var(...)` degrades to a single flat fill.
    document.documentElement.style.setProperty('--test-heat-low', 'rgb(254, 240, 199)')
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        bins={[
          { to: 5, color: 'var(--test-heat-low)', label: '0–5' },
          { to: 10, color: 'var(--missing-heat, rgb(220, 104, 3))', label: '6–10' },
        ]}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const pieces = getAppliedOption(onChartReady.mock.calls[0][0]).visualMap[0].pieces ?? []
    expect(pieces.map((piece) => piece.color)).toEqual(['rgb(254, 240, 199)', 'rgb(220, 104, 3)'])
    document.documentElement.style.removeProperty('--test-heat-low')
  })

  it('paints unmeasured coordinates with the noData bin AND a glyph, never colour alone', () => {
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        bins={BINS}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    const applied = getAppliedOption(onChartReady.mock.calls[0][0])
    // 3 x 2 grid, 3 measured cells -> 3 filled "no data" cells.
    expect(applied.series[0].data).toHaveLength(6)
    expect(applied.series[0].label.show).toBe(true)
    const formatter = applied.series[0].label.formatter as (params: { value: number[] }) => string
    expect(formatter({ value: [0, 1, -1] })).toBe('·')
    expect(formatter({ value: [0, 0, 4] })).toBe('')
  })

  it('leaves sparse coordinates unpainted when no noData bin is declared', () => {
    const onChartReady = vi.fn()
    render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        bins={BINS.filter((bin) => !bin.noData)}
        renderer="svg"
        aria-label="Chart"
        onChartReady={onChartReady}
      />,
    )
    expect(getAppliedOption(onChartReady.mock.calls[0][0]).series[0].data).toHaveLength(3)
  })

  it('builds a matrix data-table twin that names unmeasured coordinates in text', () => {
    const { container } = render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        bins={BINS}
        yAxisTitle="Lot"
        renderer="svg"
        aria-label="Issues by lot and day"
      />,
    )
    const table = container.querySelector('[data-slot="chart-container-data-table"]') as HTMLElement
    expect(table).toHaveClass('sr-only')
    expect([...table.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual(['Lot', 'Mon', 'Tue', 'Wed'])
    const firstRow = [...table.querySelectorAll('tbody tr')][0]
    expect([...firstRow.children].map((cell) => cell.textContent)).toEqual(['Lot 1', '4', '9', 'No Data'])
  })

  it('has no axe violations with discrete bins and axis titles', async () => {
    const { container } = render(
      <HeatmapChart
        xCategories={X_CATEGORIES}
        yCategories={Y_CATEGORIES}
        cells={CELLS}
        bins={BINS}
        xAxisTitle="Day"
        yAxisTitle="Lot"
        renderer="svg"
        aria-label="Issues by lot and day"
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })


  describe('grouped x-axis (buildGroupTicks)', () => {
    it('places each group label at the centre of its own run of columns', () => {
      expect(buildGroupTicks([{ label: 'Jan', span: 4 }, { label: 'Feb', span: 4 }], 8)).toEqual([
        '', 'Jan', '', '', '', 'Feb', '', '',
      ])
    })

    it('handles unequal runs — the reason it is per-column, not a second 4-entry axis', () => {
      expect(buildGroupTicks([{ label: 'Jan', span: 5 }, { label: 'Feb', span: 3 }], 8)).toEqual([
        '', '', 'Jan', '', '', '', 'Feb', '',
      ])
    })

    it('leaves the tail ungrouped when the runs are shorter than the axis', () => {
      expect(buildGroupTicks([{ label: 'Jan', span: 2 }], 4)).toEqual(['Jan', '', '', ''])
    })

    it('clips a run that overruns the axis rather than growing the array', () => {
      // Clipped to the axis, so the label centres on the VISIBLE run.
      expect(buildGroupTicks([{ label: 'Jan', span: 9 }], 3)).toEqual(['', 'Jan', ''])
    })

    it('renders the group tier without breaking the grid', () => {
      const { container } = render(
        <HeatmapChart
          xCategories={['W1', 'W2', 'W3', 'W4']}
          yCategories={['Truck 1']}
          cells={[{ x: 'W1', y: 'Truck 1', value: 3 }]}
          xGroups={[{ label: 'Jan', span: 2 }, { label: 'Feb', span: 2 }]}
          renderer="svg"
          aria-label="Weekly score by vehicle, grouped by month"
        />,
      )
      expect(container.querySelector('[data-slot="heatmap-chart"]')).not.toBeNull()
    })
  })

})
