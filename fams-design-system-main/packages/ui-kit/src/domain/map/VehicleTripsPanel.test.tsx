import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { VehicleTripsPanel, type VehicleTripDateChip, type VehicleTripRow } from './VehicleTripsPanel'

const TRIPS: VehicleTripRow[] = [
  {
    id: 't1',
    startTime: '15:30',
    endTime: '11:21',
    origin: 'Cluster M, West Bay – Doha',
    destination: 'Lusail Marina – Doha',
    events: 2,
    distance: '30 KM',
    duration: '2h 43m',
  },
]

const DAY_TRIPS: VehicleTripRow[] = [
  {
    id: 't9',
    startTime: '08:05',
    endTime: '09:40',
    origin: 'Depot 4',
    destination: 'Depot 9',
    events: 0,
    distance: '11 KM',
    duration: '1h 35m',
  },
]

const DATES: VehicleTripDateChip[] = [
  { id: 'd10', label: '10 Oct', trips: DAY_TRIPS, summary: { distance: '11 km', trips: 1, duration: '1h35m' } },
  { id: 'today', label: 'Today', today: true },
  { id: 'd15', label: '15 Oct 2024', calendar: true },
]

describe('VehicleTripsPanel', () => {
  it('renders the date chips and reports selection', () => {
    const onDateChange = vi.fn()
    render(<VehicleTripsPanel dates={DATES} trips={TRIPS} onDateChange={onDateChange} />)
    fireEvent.click(screen.getByRole('button', { name: '10 Oct' }))
    expect(onDateChange).toHaveBeenCalledWith('d10')
  })

  /* Round-1 interaction 16a FAIL: chips were real buttons that changed nothing. */
  it('selects a day and swaps the body to that day’s data with NO caller state', () => {
    render(
      <VehicleTripsPanel
        dates={DATES}
        trips={TRIPS}
        summary={{ distance: '43 km', trips: 30, duration: '2h43m' }}
      />,
    )
    // Default selection = the calendar chip → the panel-level fallback data.
    expect(screen.getByText('Cluster M, West Bay – Doha')).toBeInTheDocument()
    expect(screen.getByText('43 km')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '10 Oct' }))

    expect(screen.getByRole('button', { name: '10 Oct' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Depot 4')).toBeInTheDocument()
    expect(screen.queryByText('Cluster M, West Bay – Doha')).not.toBeInTheDocument()
    expect(screen.getByText('11 km')).toBeInTheDocument()
  })

  it('honours a controlled selection over its own state', () => {
    const onDateChange = vi.fn()
    render(
      <VehicleTripsPanel dates={DATES} selectedDateId="today" onDateChange={onDateChange} trips={TRIPS} />,
    )
    fireEvent.click(screen.getByRole('button', { name: '10 Oct' }))
    expect(onDateChange).toHaveBeenCalledWith('d10')
    // Still on the caller's value — no internal move.
    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'true')
  })

  /* Visual #15: `Today` is OUTLINED blue; the calendar chip is the SOLID one. */
  it('renders Today outlined and the calendar chip solid with a clear affordance', () => {
    const onClearDate = vi.fn()
    render(
      <VehicleTripsPanel dates={DATES} selectedDateId="d15" onClearDate={onClearDate} trips={TRIPS} />,
    )
    const today = screen.getByRole('button', { name: 'Today' })
    expect(today.className).toContain('text-primary')
    expect(today.className).toContain('bg-card')

    const calendarChip = screen.getByRole('button', { name: /15 Oct 2024/ })
    expect(calendarChip).toHaveAttribute('aria-pressed', 'true')
    expect(calendarChip.parentElement?.className).toContain('bg-primary')

    fireEvent.click(screen.getByRole('button', { name: 'Clear selected date' }))
    expect(onClearDate).toHaveBeenCalledTimes(1)
  })

  /* Interaction 16d: the calendar chip opens a date picker. */
  it('opens the caller’s date picker from the calendar chip', () => {
    const onOpenDatePicker = vi.fn()
    render(
      <VehicleTripsPanel
        dates={DATES}
        trips={TRIPS}
        onOpenDatePicker={onOpenDatePicker}
        datePicker={<div>picker body</div>}
      />,
    )
    expect(screen.queryByText('picker body')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /15 Oct 2024/ }))
    expect(onOpenDatePicker).toHaveBeenCalledTimes(1)
    expect(screen.getByText('picker body')).toBeInTheDocument()
  })

  it('renders the summary line and the full trip-row anatomy', () => {
    render(
      <VehicleTripsPanel
        dates={DATES}
        selectedDateId="d15"
        trips={TRIPS}
        summary={{ distance: '43 km', trips: 30, duration: '2h43m' }}
      />,
    )
    expect(screen.getByText('43 km')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('2h43m')).toBeInTheDocument()

    const [tripRow] = document.querySelectorAll('[data-slot="vehicle-trip-row"]')
    expect(tripRow).toBeTruthy()
    const scoped = within(tripRow as HTMLElement)
    // start time + origin, end time + greyed destination, metrics line.
    expect(scoped.getByText('15:30')).toBeInTheDocument()
    expect(scoped.getByText('Cluster M, West Bay – Doha')).toBeInTheDocument()
    expect(scoped.getByText('11:21')).toBeInTheDocument()
    expect(scoped.getByText('Lusail Marina – Doha')).toBeInTheDocument()
    expect(scoped.getByText('30 KM')).toBeInTheDocument()
    // Dotted connector between the two dots.
    expect((tripRow as HTMLElement).querySelector('.border-dotted')).toBeTruthy()
  })

  /* Interaction 16b: per-trip row checkboxes exist, toggle and report. */
  it('exposes a per-row trip checkbox that selects the trip', () => {
    const onTripSelectionChange = vi.fn()
    render(
      <VehicleTripsPanel
        dates={DATES}
        selectedDateId="d15"
        trips={TRIPS}
        onTripSelectionChange={onTripSelectionChange}
      />,
    )
    const rowBox = screen.getByRole('checkbox', { name: 'Select trip 15:30 to 11:21' })
    expect(rowBox).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(rowBox)
    expect(onTripSelectionChange).toHaveBeenCalledWith(['t1'])
    expect(screen.getByRole('checkbox', { name: 'Select trip 15:30 to 11:21' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  /* Visual #44: `Show latest trip (up till)` defaults to CHECKED. */
  it('always renders `Show latest trip (up till)`, checked by default', () => {
    const onShowLatestChange = vi.fn()
    render(
      <VehicleTripsPanel dates={DATES} trips={TRIPS} onShowLatestChange={onShowLatestChange} />,
    )
    const latest = screen.getByRole('checkbox', { name: /Show latest trip/ })
    expect(latest).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(latest)
    expect(onShowLatestChange).toHaveBeenCalledWith(false)
  })

  it('shows the empty label when there are no trips', () => {
    render(<VehicleTripsPanel dates={DATES} selectedDateId="d15" trips={[]} emptyLabel="No trips" />)
    expect(screen.getByText('No trips')).toBeInTheDocument()
  })
})

describe('VehicleTripsPanel — controlled selection can be CLEARED (interaction 16d)', () => {
  const DATES = [
    { id: 'd1', label: '10 Oct' },
    { id: 'd2', label: '15 Oct 2024', calendar: true },
  ]

  it('a controlled `selectedDateId={undefined}` selects nothing instead of falling back', () => {
    render(
      <VehicleTripsPanel dates={DATES} selectedDateId={undefined} onClearDate={() => {}} trips={[]} />,
    )
    for (const chip of screen.getAllByRole('button', { pressed: false })) {
      expect(chip).toHaveAttribute('aria-pressed', 'false')
    }
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
  })

  it('still keeps its own selection when the prop is not passed at all', () => {
    render(<VehicleTripsPanel dates={DATES} trips={[]} />)
    // Uncontrolled default = the calendar chip (Figma's solid blue one).
    expect(screen.getByRole('button', { name: /15 Oct 2024/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
