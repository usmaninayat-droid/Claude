import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Textarea } from './Textarea'

describe('Textarea', () => {
  it('renders a textarea', () => {
    render(<Textarea placeholder="notes" />)
    expect(screen.getByPlaceholderText('notes')).toBeInTheDocument()
  })

  it('uses the input-background fill token', () => {
    render(<Textarea placeholder="notes" />)
    expect(screen.getByPlaceholderText('notes')).toHaveClass('bg-input-background')
  })

  it('renders a label and associates it', () => {
    render(<Textarea label="Notes" id="n1" />)
    expect(screen.getByText('Notes')).toHaveAttribute('for', 'n1')
  })

  it('fires onChange while typing', () => {
    const onChange = vi.fn()
    render(<Textarea placeholder="notes" onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText('notes'), {
      target: { value: 'abc' },
    })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('shows error text and error border when error is set', () => {
    render(<Textarea placeholder="notes" error="Required" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('notes')).toHaveClass('border-destructive')
  })

  describe('floatLabel mode (Figma 4808:2847)', () => {
    it('binds the inside label and shows required asterisk', () => {
      render(<Textarea label="Notes" floatLabel required />)
      expect(screen.getByLabelText(/Notes/)).toBeInTheDocument()
      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('ties hint via aria-describedby', () => {
      render(<Textarea label="Notes" floatLabel hint="Help" />)
      const ta = screen.getByLabelText(/Notes/)
      expect(ta.getAttribute('aria-describedby')).toBe(screen.getByText('Help').id)
    })

    it('error renders as alert and sets aria-invalid', () => {
      render(<Textarea label="Notes" floatLabel error="Required" />)
      expect(screen.getByRole('alert')).toHaveTextContent('Required')
      expect(screen.getByLabelText(/Notes/)).toHaveAttribute('aria-invalid', 'true')
    })
  })
})
