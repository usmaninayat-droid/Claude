import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import type { FieldDescriptor } from '@fams/v5-composer'
import { OnwaniLocationPickerWidget } from './OnwaniLocationPickerWidget'

const descriptor = {
  col: 'loc_pin',
  label: 'Location',
  type: 'SmallText',
  component: {
    name: 'OnwaniLocationPicker',
    props: { onwaniCol: 'onwani', municipalityCol: 'municipality' },
  },
} as unknown as FieldDescriptor

/** Renders the widget inside a real react-hook-form control (no FormProvider —
 *  the widget reads the passed `control` directly, same as production). */
function Harness({ onChange = vi.fn() }: { onChange?: (v: unknown) => void }) {
  const { control, watch } = useForm({
    defaultValues: { loc_pin: '', onwani: '', municipality: 'Doha', area: '' },
  })
  const locPin = watch('loc_pin')
  return (
    <OnwaniLocationPickerWidget
      descriptor={descriptor}
      value={locPin}
      onChange={onChange}
      control={control}
    />
  )
}

describe('OnwaniLocationPickerWidget', () => {
  it('defaults to Onwani mode with the three-part Zone/Street/Bldg entry', () => {
    render(<Harness />)
    expect(screen.getByLabelText('Zone')).toBeInTheDocument()
    expect(screen.getByLabelText('Street')).toBeInTheDocument()
    expect(screen.getByLabelText('Bldg. No')).toBeInTheDocument()
    // The Location text input is NOT shown in Onwani mode (mutual exclusivity).
    expect(screen.queryByLabelText('Location')).not.toBeInTheDocument()
  })

  it('switching to "Add Location" swaps the Onwani parts for the Location TEXT input', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('radio', { name: 'Add Location' }))
    expect(screen.getByLabelText('Location')).toBeInTheDocument()
    expect(screen.queryByLabelText('Zone')).not.toBeInTheDocument()
  })

  it('commits typed place TEXT (not coordinates) on Enter, and again on blur', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Add Location' }))
    const input = screen.getByLabelText('Location') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'West Bay, Doha' } })
    // Typing alone must NOT commit — only the buffered draft moves.
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('West Bay, Doha')

    onChange.mockClear()
    fireEvent.change(input, { target: { value: 'Lusail Marina' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith('Lusail Marina')
  })

  it('places the Municipality (Zone) and Area selectors on the map toolbar, not above the mode toggle', () => {
    render(<Harness />)
    const toolbar = document.querySelector('[data-slot="onwani-map-toolbar"]') as HTMLElement
    expect(toolbar).toBeInTheDocument()
    // Both scope selectors live INSIDE the map toolbar row, beside the search.
    expect(toolbar.querySelector('[data-slot="onwani-map-municipality"]')).toBeInTheDocument()
    expect(toolbar.querySelector('[data-slot="onwani-map-area"]')).toBeInTheDocument()
    expect(toolbar.querySelector('input[aria-label="Search location"]')).toBeInTheDocument()
    // The zone select shows the form's current municipality.
    expect(screen.getByRole('combobox', { name: 'Municipality (Zone)' })).toHaveTextContent('Doha')
    // Nothing municipality/area-related renders before the mode toggle.
    const radios = screen.getByRole('radiogroup', { name: 'Location entry method' })
    expect(radios.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('seeds the Onwani parts from an already-composed sibling value (edit surface)', () => {
    function SeededHarness() {
      const { control, watch } = useForm({
        defaultValues: { loc_pin: '', onwani: 'Zone 90, Street 200, Bldg 4', municipality: 'Doha', area: '' },
      })
      return (
        <OnwaniLocationPickerWidget
          descriptor={descriptor}
          value={watch('loc_pin')}
          onChange={vi.fn()}
          control={control}
        />
      )
    }
    render(<SeededHarness />)
    expect((screen.getByLabelText('Zone') as HTMLInputElement).value).toBe('90')
    expect((screen.getByLabelText('Street') as HTMLInputElement).value).toBe('200')
    expect((screen.getByLabelText('Bldg. No') as HTMLInputElement).value).toBe('4')
  })

  it('only accepts numeric input for the Onwani parts', () => {
    render(<Harness />)
    const zone = screen.getByLabelText('Zone') as HTMLInputElement
    fireEvent.change(zone, { target: { value: '1a2b' } })
    expect(zone.value).toBe('12')
  })
})
