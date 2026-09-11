import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LiveWorkforcePopup } from './LiveWorkforcePopup'
import type { LiveWorkforceDatum } from './live-types'

/**
 * LiveWorkforcePopup — the tabbed workforce marker popup (2026-08-31
 * workforce-popup task): same VehiclePopupCard pattern as the vehicle popup,
 * tabs Overview | Critical Events | Shifts, three live statuses (In Transit /
 * Clocked In / grey Not Clocked In), and the Shifts tab's two row variants.
 */

const member = (over: Partial<LiveWorkforceDatum> = {}): LiveWorkforceDatum => ({
  id: 'WF-1',
  position: [51.52, 25.28],
  status: 'clocked-in',
  name: 'Ahmed Khalil',
  employeeId: 'EMP-QA-101',
  designation: 'Tanker Driver',
  locationLabel: 'Msheireb Downtown, Doha, Qatar',
  statusSince: 'since 4 minutes',
  ...over,
})

describe('LiveWorkforcePopup', () => {
  it('renders the tabbed card with Overview | Critical Events | Shifts and the member header', () => {
    render(<LiveWorkforcePopup member={member()} />)
    const dialog = screen.getByRole('dialog', { name: 'Ahmed Khalil' })
    expect(dialog).toBeInTheDocument()
    for (const label of ['Overview', 'Critical Events', 'Shifts']) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument()
    }
    // Header: designation meta + status line.
    expect(screen.getByText('Tanker Driver')).toBeInTheDocument()
    expect(screen.getByText('Clocked In')).toBeInTheDocument()
    expect(screen.getByText('since 4 minutes')).toBeInTheDocument()
  })

  it.each([
    ['in-transit', 'In Transit'],
    ['clocked-in', 'Clocked In'],
    ['not-clocked-in', 'Not Clocked In'],
  ] as const)('reflects the %s status on the status line', (status, label) => {
    render(<LiveWorkforcePopup member={member({ status })} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('Shifts tab renders BOTH row variants: trip rows (A→B + distance) and stay rows (location + total time)', () => {
    render(
      <LiveWorkforcePopup
        member={member()}
        data={{
          trips: [
            {
              id: 't1',
              startTime: '05:10',
              endTime: '07:20',
              origin: 'Al Rayyan Depot, Qatar',
              destination: 'Umm Salal, Qatar',
              events: 1,
              distance: '12 KM',
              duration: '2h 10m',
            },
            {
              id: 's1',
              kind: 'stay',
              startTime: '06:00',
              endTime: '13:30',
              origin: 'Souq Waqif, Doha, Qatar',
              events: 0,
              distance: '0 KM',
              duration: '7h 30m',
            },
          ],
        }}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Shifts' }))
    // Moving variant: start/end locations + Distance metric.
    expect(screen.getByText('Al Rayyan Depot, Qatar')).toBeInTheDocument()
    expect(screen.getByText('Umm Salal, Qatar')).toBeInTheDocument()
    expect(screen.getByText('12 KM')).toBeInTheDocument()
    // Static variant: single location, clock-in/out times, Total Time —
    // and NO Distance/Events metrics of its own.
    expect(screen.getByText('Souq Waqif, Doha, Qatar')).toBeInTheDocument()
    expect(screen.getByText('06:00')).toBeInTheDocument()
    expect(screen.getByText('13:30')).toBeInTheDocument()
    expect(screen.getByText('Total Time:')).toBeInTheDocument()
    expect(screen.getByText('7h 30m')).toBeInTheDocument()
    // The Shifts vocabulary replaces the vehicle checkbox label.
    expect(screen.getByText('Show latest shift (up till)')).toBeInTheDocument()
  })

  it('Critical Events tab reuses the vehicle events-list pattern with workforce events', () => {
    render(
      <LiveWorkforcePopup
        member={member()}
        data={{
          events: [
            {
              id: 'e1',
              name: 'Clock In',
              subtype: 'Shift Started',
              location: 'Doha Corniche, Qatar',
              time: '31 Aug, 26 | 06:15 AM',
              severity: 'info',
            },
          ],
        }}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Critical Events' }))
    expect(screen.getByText('Clock In')).toBeInTheDocument()
    expect(screen.getByText('Doha Corniche, Qatar')).toBeInTheDocument()
  })
})
