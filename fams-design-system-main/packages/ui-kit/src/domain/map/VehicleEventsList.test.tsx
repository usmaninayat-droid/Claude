import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VehicleEventsList, type VehicleEventItem } from './VehicleEventsList'

const EVENTS: VehicleEventItem[] = [
  {
    id: 'e1',
    name: 'Black Spot',
    subtype: 'Camera obstructed',
    location: 'West Bay – Doha',
    time: '07 Oct, 24 | 02:49 PM',
    severity: 'critical',
  },
  {
    id: 'e2',
    name: 'Harsh Braking',
    location: 'Al Rayyan Rd',
    time: '07 Oct, 24 | 01:12 PM',
    severity: 'warning',
    severityLabel: 'WARN',
  },
]

describe('VehicleEventsList', () => {
  it('renders one row per event with name, subtype, location and time', () => {
    render(<VehicleEventsList events={EVENTS} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Black Spot')).toBeInTheDocument()
    expect(screen.getByText('Camera obstructed')).toBeInTheDocument()
    expect(screen.getByText('West Bay – Doha')).toBeInTheDocument()
    expect(screen.getByText('07 Oct, 24 | 02:49 PM')).toBeInTheDocument()
  })

  it('renders the severity badge, defaulting the label to the severity word', () => {
    render(<VehicleEventsList events={EVENTS} />)
    expect(screen.getByText('critical')).toBeInTheDocument()
    // Explicit label override wins.
    expect(screen.getByText('WARN')).toBeInTheDocument()
    expect(screen.queryByText('warning')).not.toBeInTheDocument()
  })

  it('defaults an unspecified severity to critical', () => {
    render(<VehicleEventsList events={[{ id: 'e', name: 'X', location: 'L', time: 'T' }]} />)
    expect(screen.getByText('critical')).toBeInTheDocument()
  })

  /* Round-1 visual #17 / #18 / #42. */
  it('renders each row as a bordered radius-6 box with a vertical rule after the name block', () => {
    const { container } = render(<VehicleEventsList events={EVENTS} />)
    const [row] = container.querySelectorAll<HTMLElement>('[data-slot="vehicle-event-row"]')
    expect(row).toBeTruthy()
    expect(row.className).toContain('border-border')
    expect(row.style.borderRadius).toBe('6px')
    // The 1px rule between the event-name block and Location.
    expect(row.querySelector('.w-px.self-stretch')).toBeTruthy()
    // Rows are separate boxes, not hairline-divided list items.
    expect(container.querySelector('.divide-y')).toBeNull()
  })

  it('draws CRITICAL as a 90×22.5 radius-4 rectangle filled error-600, not a pill', () => {
    const { container } = render(<VehicleEventsList events={EVENTS} />)
    const badge = container.querySelector<HTMLElement>('[data-slot="vehicle-event-severity"]')
    expect(badge).toBeTruthy()
    expect(badge!.style.width).toBe('90px')
    expect(badge!.style.height).toBe('22.5px')
    expect(badge!.style.borderRadius).toBe('4px')
    expect(badge!.className).not.toContain('rounded-full')
    // #D92D20 = error-600, NOT error-500/destructive (finding #42).
    expect(badge!.className).toContain('bg-error-600')
  })

  it('shows the empty label when there are no events', () => {
    render(<VehicleEventsList events={[]} emptyLabel="Nothing yet" />)
    expect(screen.getByText('Nothing yet')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})

/**
 * Round-3 visual #15 — the card body clipped the 4th row: content-sized 58px
 * rows on a 66px pitch inside a 224px scroller, where 495:5977 fits all four.
 */
describe('VehicleEventsList — row pitch (round-3 visual #15)', () => {
  const FOUR: VehicleEventItem[] = Array.from({ length: 4 }, (_, i) => ({
    id: `EV-${i}`,
    name: 'Black Spot',
    subtype: 'Black Spot',
    location: 'Msheireb Doha',
    time: '07 Oct, 24 | 02:49 PM',
    severity: 'critical' as const,
  }))

  it('fixes the row box at 52px and raises the scroller so all FOUR rows fit', () => {
    const { container } = render(<VehicleEventsList events={FOUR} />)
    const rows = container.querySelectorAll<HTMLElement>('[data-slot="vehicle-event-row"]')
    expect(rows).toHaveLength(4)
    for (const row of rows) expect(row.style.height).toBe('52px')
    const list = container.querySelector<HTMLElement>('[data-slot="vehicle-events-list"]')!
    // 4 x 52 + 3 x 8 (gap-2) = 232, so the ceiling must clear 232.
    expect(Number.parseInt(list.style.maxHeight, 10)).toBeGreaterThanOrEqual(232)
    expect(list.className).not.toContain('max-h-56')
  })
})
