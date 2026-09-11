import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ColorSelector } from './ColorSelector'

const PRESETS = ['#0072d6', '#f04438', '#12b76a']

describe('ColorSelector', () => {
  it('renders label, required asterisk and preset swatches', () => {
    render(<ColorSelector label="Color" required value="#0072d6" onChange={() => {}} presets={PRESETS} />)
    expect(screen.getByText('Color')).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('marks the matching preset selected and fires onChange on click', () => {
    const onChange = vi.fn()
    render(<ColorSelector label="Color" value="#0072d6" onChange={onChange} presets={PRESETS} />)
    const swatches = screen.getAllByRole('radio')
    expect(swatches[0]).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(swatches[1])
    expect(onChange).toHaveBeenCalledWith('#f04438')
  })

  it('toggles to custom mode and shows the hex field', () => {
    render(<ColorSelector label="Color" value="#0072d6" onChange={() => {}} presets={PRESETS} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pick Custom Color' }))
    expect(screen.getByLabelText('Hex color')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Predefined Colors' })).toBeInTheDocument()
  })

  it('hex typing fires onChange with a valid hex', () => {
    const onChange = vi.fn()
    render(<ColorSelector label="Color" value="#0072d6" onChange={onChange} />)
    // no presets → opens directly in custom mode, no toggle link
    expect(screen.queryByRole('button', { name: 'Pick Custom Color' })).not.toBeInTheDocument()
    const hex = screen.getByLabelText('Hex color')
    fireEvent.change(hex, { target: { value: '9e00ff' } })
    expect(onChange).toHaveBeenCalledWith('#9e00ff')
  })

  it('disabled renders inert', () => {
    render(<ColorSelector label="Color" value="#0072d6" onChange={() => {}} presets={PRESETS} disabled />)
    expect(screen.getAllByRole('radio')[0]).toBeDisabled()
  })
})
