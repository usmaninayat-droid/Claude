import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { render, cleanup, screen, within } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as ChartContainer.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { DonutChart, type DonutChartDatum } from './DonutChart'

expect.extend({ toHaveNoViolations })

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

// jsdom has no layout engine and no canvas 2D context — same rationale as
// ChartContainer.test.tsx. Every test below uses the SVG renderer.
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
  clientWidthSpy = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300)
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

const DATA: DonutChartDatum[] = [
  { id: 'lot1', label: 'Lot 1', value: 40 },
  { id: 'lot2', label: 'Lot 2', value: 35 },
  { id: 'lot3', label: 'Lot 3', value: 25 },
]

describe('DonutChart', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a role="img" chart plus a legend item per datum', () => {
    const { container } = render(<DonutChart data={DATA} renderer="svg" aria-label="Fleet by lot" />)
    expect(screen.getByRole('img', { name: 'Fleet by lot' })).toBeInTheDocument()
    // Scoped to the legend: segment labels deliberately appear a second time
    // as row headers of the sr-only data-table twin.
    const legend = container.querySelector('[data-slot="chart-legend"]') as HTMLElement
    expect(within(legend).getByText('Lot 1')).toBeInTheDocument()
    expect(within(legend).getByText('Lot 2')).toBeInTheDocument()
    expect(within(legend).getByText('Lot 3')).toBeInTheDocument()
  })

  it('renders one pie sector per datum via the SVG renderer', () => {
    const { container } = render(<DonutChart data={DATA} renderer="svg" aria-label="Chart" />)
    const svg = container.querySelector('[data-slot="chart-container-canvas"] svg')
    expect(svg?.querySelectorAll('path').length).toBe(DATA.length)
  })

  it('assigns cycling colorIndex swatches (1, 2, 3) matching legend order', () => {
    const { container } = render(<DonutChart data={DATA} renderer="svg" aria-label="Chart" />)
    const swatches = container.querySelectorAll('[data-slot="chart-legend-item"] [aria-hidden="true"]')
    expect(swatches[0]).toHaveClass('bg-chart-1')
    expect(swatches[1]).toHaveClass('bg-chart-2')
    expect(swatches[2]).toHaveClass('bg-chart-3')
  })

  it('respects an explicit colorIndex pin', () => {
    const pinned: DonutChartDatum[] = [{ id: 'a', label: 'A', value: 1, colorIndex: 5 }]
    const { container } = render(<DonutChart data={pinned} renderer="svg" aria-label="Chart" />)
    const swatch = container.querySelector('[data-slot="chart-legend-item"] [aria-hidden="true"]')
    expect(swatch).toHaveClass('bg-chart-5')
  })

  it('omits hidden ids from the rendered pie while keeping them in the legend', () => {
    const { container } = render(
      <DonutChart data={DATA} renderer="svg" aria-label="Chart" hiddenIds={['lot2']} onToggle={vi.fn()} />,
    )
    const svg = container.querySelector('[data-slot="chart-container-canvas"] svg')
    expect(svg?.querySelectorAll('path').length).toBe(DATA.length - 1)
    const legend = container.querySelector('[data-slot="chart-legend"]') as HTMLElement
    expect(within(legend).getByText('Lot 2')).toBeInTheDocument()
  })

  it('renders no legend when legend="none"', () => {
    const { container } = render(<DonutChart data={DATA} renderer="svg" aria-label="Chart" legend="none" />)
    expect(container.querySelector('[data-slot="chart-legend"]')).not.toBeInTheDocument()
  })

  it('stacks the legend to the end (vertical) in "end" layout, row (horizontal) in "bottom"', () => {
    const { container: bottomContainer } = render(
      <DonutChart data={DATA} renderer="svg" aria-label="Chart" legend="bottom" data-testid="donut" />,
    )
    expect(bottomContainer.querySelector('[data-slot="donut-chart"]')).toHaveClass('flex-col')
    cleanup()

    const { container: endContainer } = render(
      <DonutChart data={DATA} renderer="svg" aria-label="Chart" legend="end" />,
    )
    expect(endContainer.querySelector('[data-slot="donut-chart"]')).toHaveClass('flex-row')
    expect(endContainer.querySelector('[data-slot="chart-legend"]')).toHaveClass('flex-col')
  })

  it('renders showCounts value chips in the legend by default (V3: values live in the legend, never inside an arc)', () => {
    const { container } = render(<DonutChart data={DATA} renderer="svg" aria-label="Chart" />)
    const legend = container.querySelector('[data-slot="chart-legend"]') as HTMLElement
    expect(within(legend).getByText('40')).toBeInTheDocument()
  })

  it('drops the legend count chips when showCounts={false}', () => {
    const { container } = render(<DonutChart data={DATA} renderer="svg" aria-label="Chart" showCounts={false} />)
    const legend = container.querySelector('[data-slot="chart-legend"]') as HTMLElement
    expect(within(legend).queryByText('40')).not.toBeInTheDocument()
  })

  it('renders the centerLabel overlay centered over the donut hole, non-interactive', () => {
    render(<DonutChart data={DATA} renderer="svg" aria-label="Chart" centerLabel="120 total" />)
    const overlay = screen.getByText('120 total').closest('[data-slot="donut-chart-center-label"]')
    expect(overlay).toHaveClass('pointer-events-none', 'absolute', 'inset-0')
  })

  it('renders no centerLabel overlay when omitted', () => {
    const { container } = render(<DonutChart data={DATA} renderer="svg" aria-label="Chart" />)
    expect(container.querySelector('[data-slot="donut-chart-center-label"]')).not.toBeInTheDocument()
  })

  it('forwards loading to ChartContainer', () => {
    const { container } = render(<DonutChart data={DATA} renderer="svg" aria-label="Chart" loading />)
    expect(container.querySelector('[data-slot="chart-container"]')).toHaveAttribute('aria-busy', 'true')
  })

  it('calls onToggle with the clicked legend item id', async () => {
    const onToggle = vi.fn()
    const { container } = render(
      <DonutChart data={DATA} renderer="svg" aria-label="Chart" onToggle={onToggle} />,
    )
    const button = container.querySelector('[data-slot="chart-legend-toggle"]') as HTMLButtonElement
    button.click()
    expect(onToggle).toHaveBeenCalledWith('lot1')
  })

  it('resolves dir from the nearest ancestor [dir] attribute (RTL) on the chart plot', () => {
    const { container } = render(
      <div dir="rtl">
        <DonutChart data={DATA} renderer="svg" aria-label="Chart" legend="end" />
      </div>,
    )
    expect(container.querySelector('[data-slot="chart-container"]')).toHaveAttribute('dir', 'rtl')
  })

  it('has no axe violations', async () => {
    const { container } = render(<DonutChart data={DATA} renderer="svg" aria-label="Fleet by lot" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations with a centerLabel and end legend', async () => {
    const { container } = render(
      <DonutChart data={DATA} renderer="svg" aria-label="Fleet by lot" legend="end" centerLabel="100" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations under dir="rtl"', async () => {
    const { container } = render(
      <div dir="rtl">
        <DonutChart data={DATA} renderer="svg" aria-label="Fleet by lot" legend="end" />
      </div>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('draws no on-canvas segment labels by default (V3: white-on-fill never ships)', () => {
    const { container } = render(<DonutChart data={DATA} renderer="svg" aria-label="Chart" />)
    const svg = container.querySelector('[data-slot="chart-container-canvas"] svg') as SVGElement
    expect(svg.querySelectorAll('text')).toHaveLength(0)
  })

  it('puts values OUTSIDE the arc on a leader line when valueLabels="outside"', () => {
    const { container } = render(
      <DonutChart data={DATA} renderer="svg" aria-label="Chart" valueLabels="outside" />,
    )
    const svg = container.querySelector('[data-slot="chart-container-canvas"] svg') as SVGElement
    // jsdom has no text metrics, so ECharts' overlap avoidance drops some
    // labels — assert the mechanism is on, not an exact label count.
    const painted = [...svg.querySelectorAll('text')].map((node) => node.textContent)
    expect(painted.length).toBeGreaterThan(0)
    expect(painted.every((text) => DATA.some((datum) => String(datum.value) === text))).toBe(true)
  })

  it('builds a share data-table twin naming every segment, its value and its percentage', () => {
    const { container } = render(<DonutChart data={DATA} renderer="svg" aria-label="Fleet by lot" />)
    const table = container.querySelector('[data-slot="chart-container-data-table"]') as HTMLElement
    expect(table).toHaveClass('sr-only')
    expect([...table.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual(['Segment', 'Value', 'Share'])
    const firstRow = [...table.querySelectorAll('tbody tr')][0]
    expect([...firstRow.children].map((cell) => cell.textContent)).toEqual(['Lot 1', '40', '40%'])
  })

  it('clamps the centre stack to the hole diameter so a composed stack cannot spill over the arc', () => {
    const { container } = render(
      <DonutChart
        data={DATA}
        renderer="svg"
        aria-label="Chart"
        innerRadius={45}
        centerLabel={
          <>
            <span>120</span>
            <span>events</span>
          </>
        }
      />,
    )
    const stack = container.querySelector('[data-slot="donut-chart-center-stack"]') as HTMLElement
    expect(stack.style.maxInlineSize).toBe('45%')
    expect(stack.style.maxBlockSize).toBe('45%')
  })

  it('warns in DEV when one donut resolves both CVD-unsafe palette slots 4 and 5', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <DonutChart
        data={[
          { id: 'a', label: 'A', value: 1, colorIndex: 4 },
          { id: 'b', label: 'B', value: 2, colorIndex: 5 },
        ]}
        renderer="svg"
        aria-label="Chart"
      />,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('slots 4 and 5'))
    warn.mockRestore()
  })

})
