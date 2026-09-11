import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PhoneInput, isoToFlagEmoji, DEFAULT_PHONE_COUNTRIES } from './PhoneInput'

describe('isoToFlagEmoji', () => {
  it('derives a regional-indicator flag emoji from an ISO alpha-2 code', () => {
    expect(isoToFlagEmoji('AE')).toBe('🇦🇪')
    expect(isoToFlagEmoji('us')).toBe('🇺🇸')
  })
})

describe('PhoneInput', () => {
  it('splits a combined value into the matching country dial code + national number', () => {
    render(<PhoneInput value="+971504200000" onChange={() => {}} ariaLabel="Phone number" />)
    expect(screen.getByText('+971')).toBeInTheDocument()
    expect(screen.getByDisplayValue('504200000')).toBeInTheDocument()
  })

  it('falls back to the default country when the value has no recognized dial code', () => {
    render(<PhoneInput value="" onChange={() => {}} defaultCountry="AE" ariaLabel="Phone number" />)
    expect(screen.getByText('+971')).toBeInTheDocument()
  })

  it('emits a combined value when the number changes', () => {
    const onChange = vi.fn()
    render(<PhoneInput value="+971" onChange={onChange} ariaLabel="Phone number" />)
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '5042' } })
    expect(onChange).toHaveBeenCalledWith('+9715042')
  })

  it('opens the country popover and switching country preserves the typed number', () => {
    const onChange = vi.fn()
    render(<PhoneInput value="+971504200000" onChange={onChange} ariaLabel="Phone number" countries={DEFAULT_PHONE_COUNTRIES} />)
    fireEvent.click(screen.getByRole('button', { name: 'Phone number country code' }))
    fireEvent.click(screen.getByRole('option', { name: /United States/ }))
    expect(onChange).toHaveBeenCalledWith('+1504200000')
  })
})
