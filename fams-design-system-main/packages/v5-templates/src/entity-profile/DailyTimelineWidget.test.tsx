import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { EntityRecord } from '@fams/v5-composer'
import { OverviewWidgets, type OverviewWidget } from './OverviewWidgets'

const record: EntityRecord = {
  id: 'wf-01',
  tabletDailyActivity: [
    {
      date: '2026-09-03',
      weekday: 'Thursday',
      isOff: false,
      plannedMinutes: 840,
      activeMinutes: 456,
      inactiveMinutes: 24,
      usagePct: 95,
    },
    { date: '2026-09-04', weekday: 'Friday', isOff: true, plannedMinutes: 0 },
  ],
}

const widget: OverviewWidget = {
  type: 'dailyTimeline',
  title: 'Daily Activity Timeline',
  rowsField: 'tabletDailyActivity',
  windowStart: '05:00',
  windowEnd: '19:00',
}

/** A geometry custom property (`--dt-at`/`--dt-size`) as a rounded percentage. */
function pctOf(el: HTMLElement, property: string): number {
  return Math.round(Number.parseFloat(el.style.getPropertyValue(property)))
}

function renderWidget(override: Partial<Extract<OverviewWidget, { type: 'dailyTimeline' }>> = {}) {
  return render(<OverviewWidgets widgets={[{ ...widget, ...override } as OverviewWidget]} record={record} />)
}

describe('dailyTimeline widget', () => {
  it('renders one table row per day with the weekday + date stub', () => {
    renderWidget()
    expect(screen.getByRole('table', { name: 'Daily Activity Timeline' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: /2026-09-03/ })).toBeInTheDocument()
    expect(screen.getByText('Thursday')).toBeInTheDocument()
    expect(screen.getByText('Friday')).toBeInTheDocument()
    // header row + 2 day rows
    expect(screen.getAllByRole('row')).toHaveLength(3)
  })

  it('states the day in words (never colour-only) and derives the durations', () => {
    renderWidget()
    expect(screen.getByText('7h 36m')).toBeInTheDocument()
    expect(screen.getByText('24m')).toBeInTheDocument()
    expect(screen.getByText('95%')).toBeInTheDocument()
    // The track cell carries a per-row text alternative for the bars.
    expect(
      screen.getByText('Thursday 2026-09-03: Active 7h 36m, Inactive 24m, 95%'),
    ).toBeInTheDocument()
  })

  it('renders an off day as a muted "no planned shift" track', () => {
    renderWidget()
    expect(screen.getByText('Friday 2026-09-04: No planned shift')).toBeInTheDocument()
    // Off days get no bars at all.
    const rows = screen.getAllByRole('row')
    expect(rows[2].querySelectorAll('.bg-primary')).toHaveLength(0)
    expect(rows[1].querySelectorAll('.bg-primary')).toHaveLength(1)
  })

  it('lays proportional active/inactive blocks over the window when no segments[] exist', () => {
    const { container } = renderWidget()
    // Scoped to the table: the card's legend carries the same fill classes.
    const active = container.querySelector('table .bg-primary') as HTMLElement
    const inactive = container.querySelector('table .bg-warning-scale-500') as HTMLElement
    // 456 of an 840-minute window, from the window start; then 24 minutes after.
    expect(pctOf(active, '--dt-at')).toBe(0)
    expect(pctOf(active, '--dt-size')).toBe(54)
    expect(pctOf(inactive, '--dt-at')).toBe(54)
  })

  it('prefers segments[] when the row carries them', () => {
    render(
      <OverviewWidgets
        widgets={[widget]}
        record={{
          id: 'wf-02',
          tabletDailyActivity: [
            {
              date: '2026-09-03',
              weekday: 'Thursday',
              activeMinutes: 60,
              inactiveMinutes: 0,
              segments: [
                { state: 'active', start: '05:00', end: '12:00' },
                { state: 'inactive', start: '12:00', end: '19:00' },
              ],
            },
          ],
        }}
      />,
    )
    const blocks = document.querySelectorAll('table .absolute.inset-y-0')
    expect(blocks).toHaveLength(2)
    expect(pctOf(blocks[1] as HTMLElement, '--dt-at')).toBe(50)
  })

  it('renders axis ticks across the configured window', () => {
    renderWidget({ tickStepHours: 7 })
    expect(screen.getByText('05:00')).toBeInTheDocument()
    expect(screen.getByText('12:00')).toBeInTheDocument()
    expect(screen.getByText('19:00')).toBeInTheDocument()
  })

  it('falls back to an empty message when the field is absent', () => {
    render(<OverviewWidgets widgets={[widget]} record={{ id: 'wf-03' }} />)
    expect(screen.getByText('No activity recorded for this period.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
