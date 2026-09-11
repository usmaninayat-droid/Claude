import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToggleFieldGroup } from './ToggleFieldGroup'

describe('ToggleFieldGroup', () => {
  it('renders the label and a switch by default, labelled via aria-labelledby', () => {
    render(
      <ToggleFieldGroup checked={false} onCheckedChange={() => {}} label="Odometer Interval" />,
    )
    expect(screen.getByRole('switch', { name: 'Odometer Interval' })).toBeInTheDocument()
  })

  it('renders children only while checked', () => {
    const { rerender } = render(
      <ToggleFieldGroup checked={false} onCheckedChange={() => {}} label="Panel">
        <input aria-label="Distance" />
      </ToggleFieldGroup>,
    )
    expect(screen.queryByLabelText('Distance')).not.toBeInTheDocument()

    rerender(
      <ToggleFieldGroup checked onCheckedChange={() => {}} label="Panel">
        <input aria-label="Distance" />
      </ToggleFieldGroup>,
    )
    expect(screen.getByLabelText('Distance')).toBeInTheDocument()
  })

  it('shows a one-line summary while OFF, and hides it while ON', () => {
    const { rerender } = render(
      <ToggleFieldGroup checked={false} onCheckedChange={() => {}} label="Panel" summary="10,000 km · 500 km before due">
        <input aria-label="Distance" />
      </ToggleFieldGroup>,
    )
    expect(screen.getByText('10,000 km · 500 km before due')).toBeInTheDocument()

    rerender(
      <ToggleFieldGroup checked onCheckedChange={() => {}} label="Panel" summary="10,000 km · 500 km before due">
        <input aria-label="Distance" />
      </ToggleFieldGroup>,
    )
    expect(screen.queryByText('10,000 km · 500 km before due')).not.toBeInTheDocument()
  })

  it('renders no summary line at all when OFF and summary is omitted', () => {
    const { container } = render(<ToggleFieldGroup checked={false} onCheckedChange={() => {}} label="Panel" />)
    expect(container.querySelector('[data-slot="toggle-field-group-summary"]')).not.toBeInTheDocument()
  })

  it('renders trailingLabel only while ON, alongside children', () => {
    render(
      <ToggleFieldGroup checked onCheckedChange={() => {}} label="Panel" trailingLabel="Before Due">
        <input aria-label="Distance" />
      </ToggleFieldGroup>,
    )
    expect(screen.getByText('Before Due')).toBeInTheDocument()
  })

  it('fires onCheckedChange with the next value', () => {
    const onCheckedChange = vi.fn()
    render(<ToggleFieldGroup checked={false} onCheckedChange={onCheckedChange} label="Panel" />)
    fireEvent.click(screen.getByRole('switch', { name: 'Panel' }))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('announces the reveal/hide transition via aria-live on the content region', () => {
    const { container } = render(<ToggleFieldGroup checked={false} onCheckedChange={() => {}} label="Panel" />)
    expect(container.querySelector('[data-slot="toggle-field-group-content"]')).toHaveAttribute(
      'aria-live',
      'polite',
    )
  })

  it('controlKind="checkbox" renders a labelled checkbox instead of a switch', () => {
    render(
      <ToggleFieldGroup checked={false} onCheckedChange={() => {}} label="Send via SMS" controlKind="checkbox" />,
    )
    expect(screen.getByRole('checkbox', { name: 'Send via SMS' })).toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('disabled propagates to the gate control', () => {
    render(<ToggleFieldGroup checked={false} onCheckedChange={() => {}} label="Panel" disabled />)
    expect(screen.getByRole('switch')).toBeDisabled()
  })

  /**
   * B3 UX ruling: toggling a panel OFF then back ON must RETAIN whatever was
   * staged — discarding user input on a toggle is destructive and
   * unexpected. `ToggleFieldGroup` holds no field values itself (Rule 8), so
   * this is proven with a small controlled harness that owns BOTH the gate
   * state and the staged value independently — exactly the shape a real
   * consumer (an rhf-bound field) has. Unmounting/remounting `children` on
   * toggle must never touch the harness's own value state.
   */
  it('retains a consumer-owned staged value across an OFF -> ON round trip', () => {
    function Harness() {
      const [checked, setChecked] = useState(true)
      const [value, setValue] = useState('9,500')
      return (
        <ToggleFieldGroup checked={checked} onCheckedChange={setChecked} label="Engine Hours">
          <input aria-label="Send Reminder" value={value} onChange={(e) => setValue(e.target.value)} />
        </ToggleFieldGroup>
      )
    }
    render(<Harness />)
    expect(screen.getByLabelText('Send Reminder')).toHaveValue('9,500')

    fireEvent.click(screen.getByRole('switch', { name: 'Engine Hours' })) // OFF — children unmount
    expect(screen.queryByLabelText('Send Reminder')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('switch', { name: 'Engine Hours' })) // back ON
    expect(screen.getByLabelText('Send Reminder')).toHaveValue('9,500') // retained, not reset
  })
})
