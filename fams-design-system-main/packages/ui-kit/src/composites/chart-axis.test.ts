import { describe, expect, it } from 'vitest'
import {
  axisTitleOptions,
  chartGrid,
  measureLabelBand,
  rotatedTitleOffset,
  yAxisTitleMetrics,
} from './chart-axis'

/**
 * The invariant every case below asserts:
 *
 *   titleX = grid.left + labelBand − nameGap   (with `containLabel: true`)
 *
 * must land INSIDE the card — i.e. `titleX > 0`, with real clearance, for any
 * tick-label width. Round-2 visual QA #11 (Telematics "Overspeeding Over Time")
 * and #4 (Fuel "Refueling Over Time") were both `titleX < 0`: a vertical
 * chart's value ticks are short ("10"), and the old fixed 44px `nameGap` floor
 * pushed the rotated title off-canvas, where ECharts painted it as a single
 * stray glyph.
 */
describe('chart-axis — rotated y-axis title gutter', () => {
  const SHORT_TICKS = ['0', '10'] // a vertical chart's value axis
  const LONG_TICKS = ['DXB-E-1028', 'DXB-B-1007'] // a horizontal bar chart's categories

  it('reserves a grid inset that puts the rotated title inside the card for SHORT ticks', () => {
    const grid = chartGrid({ yAxisTitle: 'Overspeed Events', yLabels: SHORT_TICKS })
    const metrics = yAxisTitleMetrics(SHORT_TICKS)
    expect(grid.left).toBe(metrics.inset)
    expect(rotatedTitleOffset(metrics, grid.left)).toBeGreaterThan(0)
  })

  it('reserves a grid inset that puts the rotated title inside the card for LONG ticks (bug B, not regressed)', () => {
    const grid = chartGrid({ yAxisTitle: 'Vehicle', yLabels: LONG_TICKS })
    const metrics = yAxisTitleMetrics(LONG_TICKS)
    expect(rotatedTitleOffset(metrics, grid.left)).toBeGreaterThan(0)
  })

  it('lands the title at the SAME distance from the card edge whatever the label width', () => {
    // This is the property the old `Math.max(44, band + 12)` floor broke: the
    // gap stopped tracking the band once the band was narrow.
    const short = yAxisTitleMetrics(SHORT_TICKS)
    const long = yAxisTitleMetrics(LONG_TICKS)
    expect(rotatedTitleOffset(short)).toBe(rotatedTitleOffset(long))
  })

  it('grows the gap with the measured label band, never with a fixed floor', () => {
    const short = yAxisTitleMetrics(SHORT_TICKS)
    const long = yAxisTitleMetrics(LONG_TICKS)
    expect(measureLabelBand(LONG_TICKS)).toBeGreaterThan(measureLabelBand(SHORT_TICKS))
    expect(long.nameGap).toBeGreaterThan(short.nameGap)
    // The old behaviour: a 44px floor regardless of a ~13px band.
    expect(short.nameGap).toBeLessThan(44)
  })

  it('keeps axisTitleOptions and chartGrid on the same measurement', () => {
    const title = axisTitleOptions('Refueling Events', 'y', { labels: SHORT_TICKS })
    const grid = chartGrid({ yAxisTitle: 'Refueling Events', yLabels: SHORT_TICKS })
    expect(title.nameGap).toBe(yAxisTitleMetrics(SHORT_TICKS).nameGap)
    expect(grid.left! + measureLabelBand(SHORT_TICKS) - title.nameGap!).toBeGreaterThan(0)
  })

  it('mirrors the reserved gutter to the trailing edge under RTL', () => {
    const ltr = chartGrid({ yAxisTitle: 'Events', yLabels: SHORT_TICKS })
    const rtl = chartGrid({ yAxisTitle: 'Events', yLabels: SHORT_TICKS, rtl: true })
    expect(rtl.right).toBe(ltr.left)
  })

  it('reserves the dual-axis trailing gutter from the trailing axis labels', () => {
    const grid = chartGrid({
      yAxisTitle: 'Fuel (L)',
      yAxisTitleTrailing: 'Distance (km)',
      yLabels: SHORT_TICKS,
      yLabelsTrailing: LONG_TICKS,
    })
    expect(grid.right).toBe(yAxisTitleMetrics(LONG_TICKS).inset)
  })

  it('leaves an untitled y edge on the base inset', () => {
    const grid = chartGrid({ yLabels: LONG_TICKS })
    expect(grid.left).toBe(16)
    expect(grid.right).toBe(16)
  })

  it('falls back to the fixed gap when there is nothing to measure', () => {
    const metrics = yAxisTitleMetrics([])
    expect(metrics.labelBand).toBe(0)
    expect(metrics.nameGap).toBe(44)
    expect(rotatedTitleOffset(metrics)).toBeGreaterThan(0)
  })
})
