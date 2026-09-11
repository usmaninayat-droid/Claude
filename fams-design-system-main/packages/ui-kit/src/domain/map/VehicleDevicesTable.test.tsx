import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VehicleDevicesTable, type VehicleDeviceRow } from './VehicleDevicesTable'

const DEVICES: VehicleDeviceRow[] = [
  { id: 'd1', name: 'Temp Sensor', imei: '356938035643809', dataRec: '12:32', value: '54°C', valueTone: 'error', trend: true },
  { id: 'd2', name: 'Door Lock', imei: '356938035643810', dataRec: '12:30', value: 'All Secure', valueTone: 'success' },
]

describe('VehicleDevicesTable', () => {
  it('renders the DEVICE NAME / IMEI / DATA REC / VALUE table', () => {
    render(<VehicleDevicesTable devices={DEVICES} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Device Name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'IMEI' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Data Rec' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument()
    expect(screen.getByText('356938035643809')).toBeInTheDocument()
  })

  it('tones alarm values destructive (with trend arrow) and healthy values success', () => {
    render(<VehicleDevicesTable devices={DEVICES} />)
    const alarm = screen.getByText('54°C').closest('[role="cell"]')
    const healthy = screen.getByText('All Secure').closest('[role="cell"]')
    expect(alarm?.className).toContain('text-destructive')
    expect(alarm?.querySelector('svg')).toBeInTheDocument()
    expect(healthy?.className).toContain('text-success')
    expect(healthy?.querySelector('svg')).not.toBeInTheDocument()
  })

  /* Round-1 visual #19 / #43. */
  it('puts a leading device icon in the DEVICE NAME cell', () => {
    render(<VehicleDevicesTable devices={DEVICES} />)
    const cell = screen.getByText('Temp Sensor').closest('[role="cell"]')
    expect(cell?.querySelector('svg')).toBeInTheDocument()
  })

  it('honours a per-row icon override', () => {
    render(
      <VehicleDevicesTable
        devices={[{ ...DEVICES[0], icon: <span data-testid="own-icon" /> }]}
      />,
    )
    expect(screen.getByTestId('own-icon')).toBeInTheDocument()
  })

  it('places the column headers ABOVE the bordered rows card, sharing one column template', () => {
    const { container } = render(<VehicleDevicesTable devices={DEVICES} />)
    const header = screen.getByRole('columnheader', { name: 'Value' }).parentElement!
    const rowsCard = container.querySelector<HTMLElement>('[role="rowgroup"].border')!
    expect(rowsCard).toBeTruthy()
    // The header is NOT inside the bordered card…
    expect(rowsCard.contains(header)).toBe(false)
    // …and carries no grey band of its own.
    expect(header.className).not.toContain('bg-muted')
    // Header + rows share the SAME grid template, so VALUE lands on its
    // Figma x with no per-cell offset (finding #43).
    const row = screen.getByText('54°C').closest('[role="row"]') as HTMLElement
    const template = /grid-cols-\[[^\]]+\]/
    expect(header.className.match(template)?.[0]).toBe(row.className.match(template)?.[0])
  })

  it('shows the empty label when there are no devices', () => {
    render(<VehicleDevicesTable devices={[]} emptyLabel="No devices" />)
    expect(screen.getByText('No devices')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
