import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, waitFor } from '@testing-library/react'
import type { EChartsOption } from 'echarts'

/**
 * PD-363 cold-path coverage.
 *
 * Every other ChartContainer test in this package runs against a WARM
 * `echarts-engine` cache — `vitest.setup.echarts.ts` calls `preloadEcharts()`
 * before this file's tests even start, which is exactly what keeps the rest
 * of the suite's synchronous `onChartReady`-right-after-`render()` assertions
 * passing unmodified after this fix.
 *
 * This file deliberately defeats that warm-up to exercise the COLD path:
 * `vi.resetModules()` forces a fresh evaluation of `./echarts-engine` (and,
 * transitively, `./ChartContainer`, which statically imports it) so the
 * freshly re-imported module's cache starts `null`, same as it would for the
 * very first chart mounted in a real app. `react`/`react-dom`/`echarts`
 * themselves are plain node_modules packages resolved outside Vite's
 * transformable module graph, so resetting the module registry does not
 * duplicate — or otherwise disturb — those; only our own TS/TSX source gets
 * re-evaluated, which is exactly the state we want to control.
 */

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

beforeEach(() => {
  clientWidthSpy = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600)
  clientHeightSpy = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
  getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(NOOP_2D_CONTEXT) as unknown as ReturnType<typeof vi.spyOn>
})

afterEach(() => {
  clientWidthSpy.mockRestore()
  clientHeightSpy.mockRestore()
  getContextSpy.mockRestore()
  cleanup()
})

const OPTION: EChartsOption = {
  xAxis: { type: 'category', data: ['Mon', 'Tue'] },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: [10, 20] }],
}

describe('ChartContainer — cold echarts-engine cache', () => {
  it('has a null cache immediately after a fresh module evaluation (sanity check for the rest of this file)', async () => {
    vi.resetModules()
    const engine = await import('./echarts-engine')
    expect(engine.getLoadedEcharts()).toBeNull()
  })

  it('mounts and initialises once the engine resolves, calling onChartReady exactly once', async () => {
    vi.resetModules()
    const engine = await import('./echarts-engine')
    const { ChartContainer } = await import('./ChartContainer')
    expect(engine.getLoadedEcharts()).toBeNull()

    const onChartReady = vi.fn()
    render(<ChartContainer option={OPTION} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />)

    // Cold path: init is NOT synchronous — unlike every warm-cache test in
    // ChartContainer.test.tsx, nothing has happened yet right after render().
    expect(onChartReady).not.toHaveBeenCalled()

    await waitFor(() => expect(onChartReady).toHaveBeenCalledTimes(1))
    expect(onChartReady).toHaveBeenCalledTimes(1)
    expect(engine.getLoadedEcharts()).not.toBeNull()
  })

  it('unmounting before the engine resolves does not throw and never initialises the torn-down host', async () => {
    vi.resetModules()
    const { ChartContainer } = await import('./ChartContainer')

    const onChartReady = vi.fn()
    const { unmount } = render(
      <ChartContainer option={OPTION} renderer="svg" aria-label="Chart" onChartReady={onChartReady} />,
    )

    expect(() => unmount()).not.toThrow()

    // Let the in-flight loadEcharts() promise settle; `cancelled` inside the
    // effect must suppress the resulting `start()` call entirely.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(onChartReady).not.toHaveBeenCalled()
  })

  it('memoizes loadEcharts — concurrent calls share one promise and one resolved module', async () => {
    vi.resetModules()
    const engine = await import('./echarts-engine')

    const first = engine.loadEcharts()
    const second = engine.loadEcharts()
    // Never starts two loads: both callers get the exact same in-flight promise.
    expect(first).toBe(second)

    const [firstModule, secondModule] = await Promise.all([first, second])
    expect(firstModule).toBe(secondModule)
    expect(engine.getLoadedEcharts()).toBe(firstModule)
  })

  it('two concurrent cold ChartContainer mounts share the same load and each fire onChartReady exactly once', async () => {
    vi.resetModules()
    const { ChartContainer } = await import('./ChartContainer')

    const onChartReadyA = vi.fn()
    const onChartReadyB = vi.fn()
    render(<ChartContainer option={OPTION} renderer="svg" aria-label="Chart A" onChartReady={onChartReadyA} />)
    render(<ChartContainer option={OPTION} renderer="svg" aria-label="Chart B" onChartReady={onChartReadyB} />)

    await waitFor(() => {
      expect(onChartReadyA).toHaveBeenCalledTimes(1)
      expect(onChartReadyB).toHaveBeenCalledTimes(1)
    })
  })
})
