import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IdChip } from './IdChip'

describe('IdChip', () => {
  it('renders the id text', () => {
    render(<IdChip>TK-25874</IdChip>)
    expect(screen.getByText('TK-25874')).toBeInTheDocument()
  })

  it('renders a leading hash icon by default', () => {
    const { container } = render(<IdChip>TK-25874</IdChip>)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('omits the icon when icon={null}', () => {
    const { container } = render(<IdChip icon={null}>TK-25874</IdChip>)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders a custom icon override', () => {
    render(<IdChip icon={<span data-testid="custom-icon" />}>TK-25874</IdChip>)
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('applies the neutral gray chip classes (fix7, P1-2: text-gray-600 for AA contrast, 6.06:1)', () => {
    render(<IdChip data-testid="chip">TK-25874</IdChip>)
    expect(screen.getByTestId('chip')).toHaveClass('bg-gray-200', 'text-gray-600')
  })
})
