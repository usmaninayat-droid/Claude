import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Calendar } from './Calendar'

describe('Calendar', () => {
  it('renders a grid of day buttons for the given month', () => {
    render(<Calendar mode="single" month={new Date(2026, 5, 1)} />)
    expect(screen.getByRole('grid')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /15/ })).toBeInTheDocument()
  })

  it('calls onSelect with the clicked date in single mode', () => {
    const onSelect = vi.fn()
    render(<Calendar mode="single" month={new Date(2026, 5, 1)} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /June 15th/ }))
    expect(onSelect).toHaveBeenCalled()
  })

  it('marks the selected day', () => {
    render(<Calendar mode="single" selected={new Date(2026, 5, 15)} month={new Date(2026, 5, 1)} />)
    const cell = screen.getByRole('button', { name: /June 15th/ }).closest('td')
    expect(cell).toHaveAttribute('data-selected', 'true')
  })
})
