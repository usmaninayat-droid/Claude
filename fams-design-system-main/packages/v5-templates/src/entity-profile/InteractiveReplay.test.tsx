import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { EntityRecord } from '@fams/v5-composer'
import { InteractiveReplay } from './InteractiveReplay'
import type { InteractiveReplaySeries } from './InteractiveReplay.types'

// The replay map lazily imports the heavy `@fams/v5-templates/map` entry
// (real WebGL) — stubbed to a plain marker exposing exactly the props it
// received, the same pattern `a11y.axe.test.tsx` and `RecordMapSlot`'s own
// consumers use elsewhere.
vi.mock('@fams/v5-templates/map', () => ({
  MapPanel: (props: { markers: { id: string }[]; paths?: { id: string }[]; 'aria-label': string }) => (
    <div
      role="region"
      aria-label={props['aria-label']}
      data-testid="map-stub"
      data-markers={JSON.stringify(props.markers)}
      data-paths={JSON.stringify(props.paths ?? [])}
    />
  ),
}))

const series: InteractiveReplaySeries[] = [
  { key: 'temperature', label: 'Temperature', colorIndex: 1 },
  { key: 'speed', label: 'Speed', colorIndex: 2 },
]

const record: EntityRecord = {
  id: 'r1',
  title: 'x',
  stats: [{ icon: 'route', label: 'Number of Events', value: 4 }],
  timeline: [
    { time: '08:00', temperature: 20, speed: 40, lat: 25.1, lng: 51.1, address: 'Doha' },
    { time: '08:05', temperature: 22, speed: 60, lat: 25.2, lng: 51.2, address: 'Al Wakrah' },
    { time: '08:10', temperature: 25, speed: 30, lat: 25.3, lng: 51.3, address: 'Al Rayyan' },
  ],
  bands: [{ type: 'overspeeding', label: 'Overspeeding', startIndex: 0, endIndex: 1, tone: 'danger' }],
  route: [
    [51.1, 25.1],
    [51.2, 25.2],
    [51.3, 25.3],
  ],
  pins: [{ id: 'e1', position: [51.15, 25.15], color: 'var(--color-destructive)' }],
}

function renderReplay(overrides: Partial<Parameters<typeof InteractiveReplay>[0]> = {}) {
  return render(
    <InteractiveReplay
      record={record}
      statsField="stats"
      timelineField="timeline"
      series={series}
      bandsField="bands"
      routeField="route"
      pinsField="pins"
      chartRenderer="svg"
      {...overrides}
    />,
  )
}

describe('InteractiveReplay', () => {
  it('renders stats, the map, and the chart from field-key indirection', async () => {
    renderReplay()
    expect(screen.getByText('Number of Events')).toBeInTheDocument()
    // The map is a lazy `React.lazy` import (real `RecordMapSlot`/`MapPanel`
    // door) — it resolves via Suspense, so the region only appears once that
    // microtask settles.
    expect(await screen.findByRole('region', { name: 'Replay route map' })).toBeInTheDocument()
    const map = screen.getByTestId('map-stub')
    expect(JSON.parse(map.dataset.markers ?? '[]')).toHaveLength(1)
    expect(JSON.parse(map.dataset.paths ?? '[]')).toHaveLength(1)
    expect(screen.getByText('Overspeeding')).toBeInTheDocument()
  })

  it('renders the designed empty state when the timeline is empty', () => {
    renderReplay({ record: { ...record, timeline: [] } })
    expect(screen.getByText('No Data in View')).toBeInTheDocument()
    expect(screen.queryByTestId('map-stub')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('toggles the Play/Pause button', () => {
    vi.stubGlobal('requestAnimationFrame', () => 0)
    renderReplay()
    const playButton = screen.getByRole('button', { name: 'Play' })
    fireEvent.click(playButton)
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('the legend is a real checkbox list that hides a series from the chart, folding band types into the same row', () => {
    renderReplay()
    const legend = document.querySelector('[data-slot="replay-legend"]')
    expect(legend).not.toBeNull()
    // 2 series + 1 unique band type ("overspeeding") — one row, per the
    // frame (Temperature/Speed/Average alongside Overspeeding/Idling).
    const checkboxes = legend!.querySelectorAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(3)
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true)
    fireEvent.click(checkboxes[0])
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(false)
    expect(within(legend as HTMLElement).getByText('Overspeeding')).toBeInTheDocument()
  })

  it('the 0.5x/1x/2x/5x speed toggle reflects the active speed', () => {
    renderReplay()
    const half = screen.getByRole('button', { name: '0.5x' })
    const one = screen.getByRole('button', { name: '1x' })
    const two = screen.getByRole('button', { name: '2x' })
    const five = screen.getByRole('button', { name: '5x' })
    expect(one).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(two)
    expect(two).toHaveAttribute('aria-pressed', 'true')
    expect(one).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(five)
    expect(five).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(half)
    expect(half).toHaveAttribute('aria-pressed', 'true')
  })

  it('the status bar stays mounted at the resting cursor and updates on scrub hover/focus', () => {
    renderReplay()
    // Resting at point 0 (no play/hover yet) — the bar is already showing,
    // not appearing only on hover (v2 parity).
    let bar = document.querySelector('[data-slot="replay-status-bar"]') as HTMLElement
    expect(bar).not.toBeNull()
    expect(within(bar).getByText('08:00')).toBeInTheDocument()
    expect(within(bar).getByText('Doha')).toBeInTheDocument()

    const scrub = document.querySelector('[data-slot="replay-scrub"]')!
    const points = scrub.querySelectorAll('button')
    fireEvent.mouseEnter(points[1])
    bar = document.querySelector('[data-slot="replay-status-bar"]') as HTMLElement
    expect(within(bar).getByText('08:05')).toBeInTheDocument()
    expect(within(bar).getByText('Al Wakrah')).toBeInTheDocument()

    fireEvent.mouseLeave(points[1])
    // Reverts to the resting cursor rather than disappearing.
    bar = document.querySelector('[data-slot="replay-status-bar"]') as HTMLElement
    expect(within(bar).getByText('08:00')).toBeInTheDocument()
  })

  it('the Restart button rewinds the playhead to point 0', () => {
    vi.stubGlobal('requestAnimationFrame', () => 0)
    renderReplay()
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Restart replay' }))
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    const bar = document.querySelector('[data-slot="replay-status-bar"]') as HTMLElement
    expect(within(bar).getByText('08:00')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('switches between the area and bar chart type', () => {
    renderReplay()
    const toggle = screen.getByRole('button', { name: 'Switch to bar chart' })
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Switch to area chart' })).toBeInTheDocument()
  })
})
