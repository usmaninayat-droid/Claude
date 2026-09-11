import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CountChip, tintFromAccent } from './CountChip'

describe('CountChip', () => {
  it('renders the count', () => {
    render(<CountChip>7</CountChip>)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('applies the ONE neutral treatment always (fix7, P1-1: never status/accent-tinted)', () => {
    render(<CountChip data-testid="chip">2</CountChip>)
    expect(screen.getByTestId('chip')).toHaveClass('bg-gray-100', 'text-gray-700')
    expect(screen.getByTestId('chip')).not.toHaveClass('bg-border')
    expect(screen.getByTestId('chip').style.backgroundColor).toBe('')
  })
})

describe('tintFromAccent', () => {
  it('builds a color-mix() expression against the accent color at spec strength (fix7, P1-C: 3%, matching figma-spec-kanban.md\'s rgba(hex,0.03))', () => {
    expect(tintFromAccent('#9e77ed')).toBe('color-mix(in srgb, #9e77ed 3%, var(--color-card, white))')
  })
})
