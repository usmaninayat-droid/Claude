import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LiveVehiclePopup } from './LiveVehiclePopup'
import type { LiveVehicleDatum } from './live-types'
import { liveVehiclePopupData } from '../views/live-fixtures'

const VEHICLE: LiveVehicleDatum = {
  id: 'V-1',
  position: [51.531, 25.324],
  status: 'stopped',
  name: 'Mitsubishi X6734',
  plate: 'GFU47893',
  driver: 'Jhon Doe',
  location: 'West Bay – Doha',
  dwell: '37 mins',
  statusSince: 'since 2 minutes',
}

describe('LiveVehiclePopup', () => {
  it('renders the header identity + status line from the vehicle', () => {
    render(<LiveVehiclePopup vehicle={VEHICLE} />)
    expect(screen.getByText('Mitsubishi X6734')).toBeInTheDocument()
    expect(screen.getByText('GFU47893')).toBeInTheDocument()
    expect(screen.getAllByText('Jhon Doe').length).toBeGreaterThan(0)
    expect(screen.getByText('Stopped')).toBeInTheDocument()
    expect(screen.getByText('since 2 minutes')).toBeInTheDocument()
  })

  it('never renders the deprecated photoUrl — the 3D art is the header truth (P0-1)', () => {
    const { container } = render(
      <LiveVehiclePopup vehicle={{ ...VEHICLE, photoUrl: 'https://example.com/car.jpg' }} />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg linearGradient[id^="vi3d-"]')).not.toBeNull()
  })

  /**
   * Reaches a tab whether it is pinned to the bar or lives in the ⋯ menu.
   * The overflow trigger has two faces: a bare "More tabs" button while the
   * selection is pinned, and the SELECTED TAB itself ("…, open tab list")
   * once an overflow tab is active — so the helper opens whichever is there.
   */
  const openTab = (label: string) => {
    const pinned = screen.queryByRole('tab', { name: label })
    if (pinned) {
      fireEvent.click(pinned)
      return
    }
    const trigger =
      screen.queryByRole('button', { name: 'More tabs' }) ??
      screen.getByRole('tab', { name: /, open tab list$/ })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('menuitem', { name: label }))
  }

  it('ALWAYS offers all five tabs — empty data shows in-card empty states (UX D28)', () => {
    render(<LiveVehiclePopup vehicle={VEHICLE} />)
    // Three pinned segments; Trips and Devices live in the ⋯ menu (the card is
    // a fixed 558px box, so the bar never grows).
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Critical Events' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Workforce' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'More tabs' }))
    expect(screen.getByRole('menuitem', { name: 'Trips' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Devices' })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })

    openTab('Critical Events')
    expect(screen.getByText('No critical events')).toBeInTheDocument()
    openTab('Trips')
    expect(screen.getByText('No trips for this date')).toBeInTheDocument()
    openTab('Devices')
    expect(screen.getByText('No devices linked')).toBeInTheDocument()
    openTab('Workforce')
    expect(screen.getByText('No workforce assigned')).toBeInTheDocument()
  })

  it('renders the spec tabs and swaps their bodies', () => {
    render(<LiveVehiclePopup vehicle={VEHICLE} data={liveVehiclePopupData} />)
    // Overview is active by default — fields grid, no events yet.
    expect(screen.getByText('Vehicle Speed')).toBeInTheDocument()
    expect(screen.queryByText('Black Spot')).not.toBeInTheDocument()

    openTab('Critical Events')
    expect(screen.getByText('Black Spot')).toBeInTheDocument()

    openTab('Trips')
    expect(screen.getAllByText('Cluster M, West Bay – Doha').length).toBeGreaterThan(0)
    // Figma 495:8937: the SOLID selected chip is the picked DATE, and `Today`
    // is the outlined one — round 1 had the pair inverted (visual #15).
    expect(screen.getByRole('button', { name: /15 Oct 2024/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Today/ })).toHaveAttribute('aria-pressed', 'false')

    openTab('Devices')
    expect(screen.getByText('356938035643809')).toBeInTheDocument()
  })

  it('copies coordinates in the SPEC P0-2 display format through the injected hook', () => {
    const onCopyCoordinates = vi.fn()
    render(<LiveVehiclePopup vehicle={VEHICLE} onCopyCoordinates={onCopyCoordinates} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy Coordinates' }))
    // 3 decimals, spaced comma — exactly the displayed string.
    expect(onCopyCoordinates).toHaveBeenCalledWith('25.324 , 51.531')
  })

  it('wires close/expand/locate header actions', () => {
    const onClose = vi.fn()
    const onExpand = vi.fn()
    const onLocate = vi.fn()
    render(<LiveVehiclePopup vehicle={VEHICLE} onClose={onClose} onExpand={onExpand} onLocate={onLocate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expand details' }))
    fireEvent.click(screen.getByRole('button', { name: 'Center on vehicle' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onExpand).toHaveBeenCalledTimes(1)
    expect(onLocate).toHaveBeenCalledTimes(1)
  })

  it('is an auto-focused dialog with the anchor pointer by default (on-map card)', () => {
    const { container } = render(<LiveVehiclePopup vehicle={VEHICLE} />)
    const dialog = screen.getByRole('dialog', { name: 'Mitsubishi X6734' })
    expect(document.activeElement).toBe(dialog)
    expect(container.querySelector('[data-slot="vehicle-popup-pointer"]')).not.toBeNull()
  })
})

describe('LiveVehiclePopup — Trips tab wiring (interaction 15a/16a/16b/16d)', () => {
  /* Trips is not one of the three pinned segments — it is reached through the
     bar's ⋯ menu, which is exactly how a user reaches it. */
  const openTrips = () => {
    render(<LiveVehiclePopup vehicle={VEHICLE} data={liveVehiclePopupData} />)
    fireEvent.click(screen.getByRole('button', { name: 'More tabs' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Trips' }))
  }

  it('picking a date chip CHANGES the card body (round-1 P1: it was byte-identical)', () => {
    openTrips()
    const before = screen.getByText('Show latest trip (up till)').closest('[data-slot="vehicle-trips-panel"]')!
    expect(before.textContent).toContain('Cluster M, West Bay – Doha')

    fireEvent.click(screen.getByRole('button', { name: /11 Oct/ }))
    const after = screen.getByText('Show latest trip (up till)').closest('[data-slot="vehicle-trips-panel"]')!
    expect(after.textContent).toContain('Cluster B, Al Rayyan Road')
    expect(document.querySelectorAll('[data-slot="vehicle-trip-row"]')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /11 Oct/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('the per-row trip checkboxes are real selection (16b)', () => {
    openTrips()
    const rowBoxes = screen.getAllByRole('checkbox', { name: /^Select trip/ })
    expect(rowBoxes.length).toBeGreaterThan(0)
    expect(rowBoxes[0]).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(rowBoxes[0])
    expect(screen.getAllByRole('checkbox', { name: /^Select trip/ })[0]).toHaveAttribute('aria-checked', 'true')
  })

  it('the calendar chip opens a date picker and its ✕ clears the day (16d)', () => {
    openTrips()
    fireEvent.click(screen.getByRole('button', { name: /15 Oct 2024/ }))
    expect(screen.getByRole('grid')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear selected date' }))
    // Exact names: the open picker grid also carries a "Today" day button.
    expect(screen.getByRole('button', { name: '15 Oct 2024' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('`Show latest trip (up till)` ships CHECKED (visual #44)', () => {
    openTrips()
    expect(screen.getByRole('checkbox', { name: 'Show latest trip (up till)' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})
