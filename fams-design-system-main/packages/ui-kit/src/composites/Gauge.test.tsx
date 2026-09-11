import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as ChartContainer.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { Gauge, type GaugeSector } from './Gauge'

expect.extend({ toHaveNoViolations })

// jsdom has no layout engine and no canvas 2D context — same stub as
// ChartContainer.test.tsx. Every test here uses the SVG renderer.
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
  clientHeightSpy = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(260)
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

describe('Gauge', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a labeled, non-busy wrapper with an SVG gauge mounted', () => {
    const { container } = render(<Gauge value={81} renderer="svg" aria-label="Fuel level: 81 percent" />)
    const wrapper = container.querySelector('[data-slot="chart-container"]')
    const plot = container.querySelector('[data-slot="chart-container-canvas"]')
    expect(plot).toHaveAttribute('role', 'img')
    expect(plot).toHaveAttribute('aria-label', 'Fuel level: 81 percent')
    expect(wrapper).toHaveAttribute('aria-busy', 'false')
    expect(container.querySelector('[data-slot="chart-container-canvas"] svg')).toBeInTheDocument()
  })

  it('applies the size-driven default height, sm/md/lg', () => {
    const { container, rerender } = render(<Gauge value={50} renderer="svg" aria-label="Reading" />)
    let wrapper = container.querySelector('[data-slot="chart-container"]') as HTMLElement
    expect(wrapper.style.height).toBe('260px')

    rerender(<Gauge value={50} renderer="svg" aria-label="Reading" size="sm" />)
    wrapper = container.querySelector('[data-slot="chart-container"]') as HTMLElement
    expect(wrapper.style.height).toBe('200px')

    rerender(<Gauge value={50} renderer="svg" aria-label="Reading" size="lg" />)
    wrapper = container.querySelector('[data-slot="chart-container"]') as HTMLElement
    expect(wrapper.style.height).toBe('320px')
  })

  it('lets an explicit height prop override the size-driven default', () => {
    const { container } = render(<Gauge value={50} renderer="svg" aria-label="Reading" height={444} />)
    const wrapper = container.querySelector('[data-slot="chart-container"]') as HTMLElement
    expect(wrapper.style.height).toBe('444px')
  })

  it('builds a semi-circle gauge series with the value clamped to [min, max]', () => {
    const onChartReady = vi.fn()
    render(<Gauge value={150} min={0} max={100} renderer="svg" aria-label="Reading" onChartReady={onChartReady} />)
    const instance = onChartReady.mock.calls[0][0]
    const applied = instance.getOption()
    const series = applied.series[0]
    expect(series.type).toBe('gauge')
    expect(series.startAngle).toBe(180)
    expect(series.endAngle).toBe(0)
    expect(series.data[0].value).toBe(100)
  })

  it('clamps a below-range value up to min', () => {
    const onChartReady = vi.fn()
    render(<Gauge value={-20} min={0} max={100} renderer="svg" aria-label="Reading" onChartReady={onChartReady} />)
    const series = onChartReady.mock.calls[0][0].getOption().series[0]
    expect(series.data[0].value).toBe(0)
  })

  it('applies a default four-band sector ramp when sectors is omitted', () => {
    const onChartReady = vi.fn()
    render(<Gauge value={50} renderer="svg" aria-label="Reading" onChartReady={onChartReady} />)
    const series = onChartReady.mock.calls[0][0].getOption().series[0]
    const bands = series.axisLine.lineStyle.color
    expect(bands).toHaveLength(4)
    expect(bands[bands.length - 1][0]).toBe(1)
  })

  it('uses caller-supplied sectors verbatim, converting `to` percent into an ascending fraction', () => {
    const onChartReady = vi.fn()
    render(
      <Gauge
        value={50}
        renderer="svg"
        aria-label="Reading"
        sectors={[
          { to: 50, color: '#123456' },
          { to: 100, color: '#654321' },
        ]}
        onChartReady={onChartReady}
      />,
    )
    const series = onChartReady.mock.calls[0][0].getOption().series[0]
    expect(series.axisLine.lineStyle.color).toEqual([
      [0.5, '#123456'],
      [1, '#654321'],
    ])
  })

  it('resolves a `var(--token)` sector colour to a literal before it reaches the canvas', () => {
    // The all-black-arc defect: ECharts paints on a canvas the CSS cascade
    // never touches, so an authored `var(...)` must be resolved here first.
    document.documentElement.style.setProperty('--test-gauge-band', 'rgb(240, 68, 56)')
    const onChartReady = vi.fn()
    render(
      <Gauge
        value={50}
        renderer="svg"
        aria-label="Reading"
        sectors={[
          { to: 50, color: 'var(--test-gauge-band)' },
          { to: 100, color: 'var(--missing-token, rgb(18, 183, 106))' },
        ]}
        onChartReady={onChartReady}
      />,
    )
    const series = onChartReady.mock.calls[0][0].getOption().series[0]
    expect(series.axisLine.lineStyle.color).toEqual([
      [0.5, 'rgb(240, 68, 56)'],
      [1, 'rgb(18, 183, 106)'],
    ])
    document.documentElement.style.removeProperty('--test-gauge-band')
  })

  it('shows the arc-riding needle marker by default and hides it when showNeedle is false; the hub anchor is never drawn', () => {
    const onChartReady = vi.fn()
    const { rerender } = render(<Gauge value={50} renderer="svg" aria-label="Reading" onChartReady={onChartReady} />)
    // ChartContainer reuses one ECharts instance across option-only updates and does not
    // re-invoke onChartReady — capture the instance once and re-read getOption() after rerender.
    const instance = onChartReady.mock.calls[0][0]
    let series = instance.getOption().series[0]
    expect(series.pointer.show).toBe(true)
    // The marker rides ON the arc rather than sweeping out of the hub, so the
    // gauge's own centre stack stays readable — and there is no hub to anchor.
    expect(series.pointer.offsetCenter).toEqual([0, '-88%'])
    expect(series.anchor.show).toBe(false)

    rerender(<Gauge value={50} renderer="svg" aria-label="Reading" showNeedle={false} onChartReady={onChartReady} />)
    series = instance.getOption().series[0]
    expect(series.pointer.show).toBe(false)
    expect(series.anchor.show).toBe(false)
  })

  it('shows no title when label is omitted, shows one with the given text when provided', () => {
    const onChartReady = vi.fn()
    const { rerender } = render(<Gauge value={50} renderer="svg" aria-label="Reading" onChartReady={onChartReady} />)
    // Same reused-instance pattern: capture once, re-read getOption() after the label rerender.
    const instance = onChartReady.mock.calls[0][0]
    let series = instance.getOption().series[0]
    expect(series.title.show).toBe(false)

    rerender(<Gauge value={50} renderer="svg" aria-label="Reading" label="Fuel level" onChartReady={onChartReady} />)
    series = instance.getOption().series[0]
    expect(series.title.show).toBe(true)
  })

  it('appends the unit suffix via the detail formatter', () => {
    const onChartReady = vi.fn()
    render(<Gauge value={81} unit="%" renderer="svg" aria-label="Reading" onChartReady={onChartReady} />)
    const series = onChartReady.mock.calls[0][0].getOption().series[0]
    expect(series.detail.formatter(81)).toBe('81%')
  })

  it('forwards loading to ChartContainer, keeping the canvas host mounted', () => {
    const { container } = render(<Gauge value={50} renderer="svg" aria-label="Reading" loading />)
    const wrapper = container.querySelector('[data-slot="chart-container"]')
    expect(wrapper).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('[data-slot="chart-container-loading"] [data-slot="skeleton"]')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="chart-container-canvas"]')).toBeInTheDocument()
  })

  it('merges a consumer className and style with its own', () => {
    const { container } = render(
      <Gauge value={50} renderer="svg" aria-label="Reading" className="ms-2" style={{ width: '90%' }} />,
    )
    const wrapper = container.querySelector('[data-slot="gauge"]') as HTMLElement
    expect(wrapper).toHaveClass('ms-2')
    expect(wrapper.style.width).toBe('90%')
  })

  it('resolves dir from the nearest ancestor [dir] attribute (RTL)', () => {
    const { container } = render(
      <div dir="rtl">
        <Gauge value={50} renderer="svg" aria-label="Reading" />
      </div>,
    )
    expect(container.querySelector('[data-slot="chart-container"]')).toHaveAttribute('dir', 'rtl')
  })

  it('has no axe violations', async () => {
    const { container } = render(<Gauge value={81} unit="%" label="Fuel level" renderer="svg" aria-label="Fuel level: 81 percent" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations while loading', async () => {
    const { container } = render(<Gauge value={81} renderer="svg" aria-label="Fuel level" loading />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations under dir="rtl"', async () => {
    const { container } = render(
      <div dir="rtl">
        <Gauge value={81} unit="%" label="Fuel level" renderer="svg" aria-label="Fuel level: 81 percent" />
      </div>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders centerContent over the arc and suppresses the built-in value/label text', () => {
    const onChartReady = vi.fn()
    const { container } = render(
      <Gauge
        value={81}
        label="Score"
        renderer="svg"
        aria-label="Fleet score"
        onChartReady={onChartReady}
        centerContent={
          <>
            <span>81</span>
            <span>pts</span>
          </>
        }
      />,
    )
    const series = onChartReady.mock.calls[0][0].getOption().series[0]
    expect(series.detail.show).toBe(false)
    expect(series.title.show).toBe(false)
    // `getAllByText`: the reading now appears twice by design — once in the
    // centre stack and once in the sr-only data-table twin (verdict V2).
    expect(screen.getAllByText('81').length).toBeGreaterThan(0)
    expect(screen.getByText('pts')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="gauge-center-content"]')).toHaveClass('pointer-events-none')
  })

  it('keeps the built-in value text when no centerContent is given', () => {
    const onChartReady = vi.fn()
    render(<Gauge value={81} renderer="svg" aria-label="Fleet score" onChartReady={onChartReady} />)
    expect(onChartReady.mock.calls[0][0].getOption().series[0].detail.show).toBe(true)
  })

  it('renders a caption below the arc', () => {
    const { container } = render(
      <Gauge value={81} renderer="svg" aria-label="Fleet score" caption="0–33 critical, 34–66 at risk, 67–100 good" />,
    )
    const caption = container.querySelector('[data-slot="gauge-caption"]') as HTMLElement
    expect(caption).toHaveTextContent('0–33 critical, 34–66 at risk, 67–100 good')
    expect(container.querySelector('[data-slot="gauge-plot"]')?.nextElementSibling).toBe(caption)
  })

  it('ships a visually-hidden data-table twin of the reading, its range and its bands', () => {
    render(
      <Gauge
        value={81}
        renderer="svg"
        aria-label="Fleet safety score"
        label="Fleet Safety Score"
        sectors={[
          { to: 40, color: '#f04438' },
          { to: 100, color: '#12b76a' },
        ]}
      />,
    )
    const table = document.querySelector('[data-slot="chart-container-data-table"]') as HTMLElement
    expect(table).toBeInTheDocument()
    expect(table).toHaveTextContent('Fleet Safety Score')
    expect(table).toHaveTextContent('Maximum')
    expect(table).toHaveTextContent('Band 1')
  })

  it('renders no caption element when none is given', () => {
    const { container } = render(<Gauge value={81} renderer="svg" aria-label="Fleet score" />)
    expect(container.querySelector('[data-slot="gauge-caption"]')).not.toBeInTheDocument()
  })

  it('normalises explicit multi-band sectors: sorted, clamped, and extended to the end of the arc', () => {
    const onChartReady = vi.fn()
    const sectors: GaugeSector[] = [
      { to: 75, color: 'green' },
      { to: 40, color: 'red' },
      { to: 60, color: 'orange' },
    ]
    render(<Gauge value={50} sectors={sectors} renderer="svg" aria-label="Reading" onChartReady={onChartReady} />)
    const series = onChartReady.mock.calls[0][0].getOption().series[0]
    expect(series.axisLine.lineStyle.color).toEqual([
      [0.4, 'red'],
      [0.6, 'orange'],
      [0.75, 'green'],
      [1, 'green'],
    ])
  })

  it('drops a non-advancing sector stop rather than letting ECharts swallow the band silently', () => {
    const onChartReady = vi.fn()
    const sectors: GaugeSector[] = [
      { to: 50, color: 'red' },
      { to: 50, color: 'orange' },
      { to: 100, color: 'green' },
    ]
    render(<Gauge value={50} sectors={sectors} renderer="svg" aria-label="Reading" onChartReady={onChartReady} />)
    const series = onChartReady.mock.calls[0][0].getOption().series[0]
    expect(series.axisLine.lineStyle.color).toEqual([
      [0.5, 'red'],
      [1, 'green'],
    ])
  })

  it('has no axe violations with centerContent and a caption', async () => {
    const { container } = render(
      <Gauge
        value={81}
        renderer="svg"
        aria-label="Fleet safety score 81 out of 100 — good"
        centerContent={<span>81 pts</span>}
        caption="0–33 critical, 34–66 at risk, 67–100 good"
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

})
