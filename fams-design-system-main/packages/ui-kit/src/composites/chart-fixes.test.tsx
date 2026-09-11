import { describe, expect, it, afterEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import type { ECharts } from 'echarts'
import { BarChart } from './BarChart'
import { DonutChart } from './DonutChart'
import { axisTitleOptions, chartGrid, measureLabelBand } from './chart-axis'
import { mirroredAxisOptions, resolveChartDirection } from './chart-direction'

/**
 * chart-fixes — the round-1 QA regressions the chart layer had to close:
 * bug B (a rotated axis title painted on top of its own tick labels), the
 * missing empty state, RTL plot mirroring, and the bar-width cap.
 *
 * Each `it` names the DEFECT, not the option key, so a future reader can tell
 * what would break if the assertion is deleted.
 */

afterEach(cleanup)

interface AppliedAxis {
  name?: string
  nameGap?: number
  nameRotate?: number
  inverse?: boolean
  position?: string
  data?: Array<string | number>
}
interface AppliedGrid {
  left: number
  right: number
  containLabel: boolean
}
interface AppliedSeries {
  barMaxWidth?: number
  itemStyle?: { borderWidth?: number; borderColor?: string }
  label?: { show?: boolean; position?: string }
}

function applied(instance: ECharts) {
  return instance.getOption() as unknown as {
    xAxis: AppliedAxis[]
    yAxis: AppliedAxis[]
    grid: AppliedGrid[]
    series: AppliedSeries[]
  }
}

const PLATES = ['DXB-E-1028', 'DXB-B-1007', 'DXB-H-1049']

describe('bug B — a rotated axis title must never paint over its own tick labels', () => {
  it('pushes the y-axis title past the widest measured label rather than using a fixed gap', () => {
    const wide = axisTitleOptions('Vehicle', 'y', { labels: PLATES })
    const bare = axisTitleOptions('Vehicle', 'y', { labels: [] })
    // The plate labels are far wider than the old fixed 44px gap, which is
    // exactly why the title landed inside them.
    expect(measureLabelBand(PLATES)).toBeGreaterThan(0)
    expect(wide.nameGap).toBeGreaterThan(bare.nameGap ?? 0)
    expect(wide.nameGap).toBeGreaterThan(measureLabelBand(PLATES))
  })

  it('reserves only the TITLE band plus its clearance in the grid inset, leaving containLabel to add the labels', () => {
    // The inset is now derived from the SAME label measurement as `nameGap`
    // (round-2 QA #11/#4 — a fixed 44px gap floor pushed a short-tick value
    // axis' title off-canvas). Reserving the full title+label band here is
    // what double-counted the labels in bug B; reserving the band + the
    // clearance is what keeps the title inside the gutter for any band width.
    const titled = chartGrid({ yAxisTitle: 'Vehicle', yLabels: PLATES })
    const untitled = chartGrid({})
    expect(titled.containLabel).toBe(true)
    expect(titled.left).toBeGreaterThan(untitled.left)
    expect(titled.left).toBeLessThan(40)
    // …and it does not grow with the labels — `containLabel` adds those.
    expect(chartGrid({ yAxisTitle: 'Vehicle', yLabels: ['0', '10'] }).left).toBe(titled.left)
  })

  it('applies the measured gap to a real horizontal bar chart', () => {
    const onChartReady = vi.fn()
    render(
      <BarChart
        categories={PLATES}
        series={[{ label: 'Events', data: [12, 8, 4] }]}
        orientation="horizontal"
        yAxisTitle="Vehicle"
        renderer="svg"
        aria-label="Overspeeding by vehicle"
        onChartReady={onChartReady}
      />,
    )
    const option = applied(onChartReady.mock.calls[0][0] as ECharts)
    expect(option.yAxis[0].name).toBe('Vehicle')
    expect(option.yAxis[0].nameGap).toBeGreaterThan(44)
  })
})

describe('RTL — an ECharts plot must mirror, not just its DOM chrome', () => {
  it('reverses the category axis and moves the value axis to the mirrored edge', () => {
    const rtl = mirroredAxisOptions('rtl')
    expect(rtl.categoryInverse).toBe(true)
    expect(rtl.valueAxisPosition).toBe('right')
    // A 90° title on a right-hand axis reads upside-down.
    expect(rtl.nameRotate).toBe(-90)
    const ltr = mirroredAxisOptions('ltr')
    expect(ltr.categoryInverse).toBe(false)
    expect(ltr.valueAxisPosition).toBeUndefined()
  })

  it('mirrors the grid insets so the titled edge follows the axis', () => {
    const ltr = chartGrid({ yAxisTitle: 'Vehicle' })
    const rtl = chartGrid({ yAxisTitle: 'Vehicle', rtl: true })
    expect(rtl.right).toBe(ltr.left)
    expect(rtl.left).toBe(ltr.right)
  })

  it('resolves the ambient direction from the document when no ancestor declares one', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    expect(resolveChartDirection(document.body)).toBe('rtl')
    document.documentElement.removeAttribute('dir')
    expect(resolveChartDirection(document.body)).toBe('ltr')
  })

  it('mirrors a live bar chart', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    const onChartReady = vi.fn()
    render(
      <BarChart
        categories={['Mon', 'Tue', 'Wed']}
        series={[{ label: 'Trips', data: [1, 2, 3] }]}
        renderer="svg"
        aria-label="Trips"
        onChartReady={onChartReady}
      />,
    )
    const option = applied(onChartReady.mock.calls[0][0] as ECharts)
    expect(option.xAxis[0].inverse).toBe(true)
    expect(option.yAxis[0].position).toBe('right')
    document.documentElement.removeAttribute('dir')
  })
})

describe('empty state — hiding every series must not paint placeholder geometry', () => {
  it('blanks the option and renders the message when the last series is toggled off', () => {
    render(
      <BarChart
        categories={['Mon', 'Tue']}
        series={[{ id: 'a', label: 'Trips', data: [1, 2] }]}
        legend
        emptyText="No trips in this period."
        renderer="svg"
        aria-label="Trips"
      />,
    )
    expect(document.querySelector('[data-slot="chart-container-empty"]')).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { pressed: true })[0])
    expect(screen.getByText('No trips in this period.')).toBeInTheDocument()
  })

  it('lets the last hidden series be restored — the blanked option has no legend model to dispatch to', () => {
    render(
      <BarChart
        categories={['Mon', 'Tue']}
        series={[{ id: 'a', label: 'Trips', data: [1, 2] }]}
        legend
        emptyText="No trips in this period."
        renderer="svg"
        aria-label="Trips"
      />,
    )
    const toggle = screen.getAllByRole('button')[0]
    fireEvent.click(toggle)
    expect(screen.getByText('No trips in this period.')).toBeInTheDocument()
    fireEvent.click(toggle)
    expect(screen.queryByText('No trips in this period.')).not.toBeInTheDocument()
  })

  it('replaces the donut placeholder disc with the message when every slice is hidden', () => {
    render(
      <DonutChart
        data={[
          { id: 'a', label: 'A', value: 3 },
          { id: 'b', label: 'B', value: 4 },
        ]}
        hiddenIds={['a', 'b']}
        centerLabel={<span>7</span>}
        emptyText="No events."
        renderer="svg"
        aria-label="Events"
      />,
    )
    expect(screen.getByText('No events.')).toBeInTheDocument()
    // The stale centre summary must go with the arcs it summarised.
    expect(screen.queryByText('7')).not.toBeInTheDocument()
  })
})

describe('bar form — a sparse series must not paint slabs', () => {
  it('caps the bar width and paints a surface gap between stacked segments', () => {
    const onChartReady = vi.fn()
    render(
      <BarChart
        categories={['Mon', 'Tue']}
        series={[
          { id: 'a', label: 'A', data: [1, 2] },
          { id: 'b', label: 'B', data: [3, 4] },
        ]}
        stacked
        showValues
        renderer="svg"
        aria-label="Events"
        onChartReady={onChartReady}
      />,
    )
    const option = applied(onChartReady.mock.calls[0][0] as ECharts)
    expect(option.series[0].barMaxWidth).toBe(40)
    // 1px per side of a boundary = the 2px break the CVD floor band requires.
    expect(option.series[0].itemStyle?.borderWidth).toBe(1)
    expect(option.series[0].label?.show).toBe(true)
    expect(option.series[0].label?.position).toBe('top')
  })
})
