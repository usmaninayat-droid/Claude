import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Truck } from '../icons'
import { StatTile } from './StatTile'

describe('StatTile', () => {
  it('renders label, value and caption', () => {
    render(<StatTile label="Total Manpower" value="788" caption="Employee master · all statuses" tone="info" />)
    expect(screen.getByText('Total Manpower')).toBeInTheDocument()
    expect(screen.getByText('788')).toBeInTheDocument()
    expect(screen.getByText('Employee master · all statuses')).toBeInTheDocument()
  })

  it('paints the accent bar from the tone', () => {
    const { container } = render(<StatTile label="Drivers" value="294" tone="success" />)
    const bar = container.querySelector('[aria-hidden].h-\\[3px\\]')
    expect(bar).toHaveClass('bg-success')
    expect(container.querySelector('[data-slot="stat-tile"]')).toHaveAttribute('data-tone', 'success')
  })

  it('renders a tone-tinted icon chip only when an icon is given', () => {
    const { container, rerender } = render(<StatTile label="Drivers" value="294" tone="lavender" icon={Truck} />)
    const chip = container.querySelector('[data-slot="stat-tile-icon"]')
    expect(chip).toHaveClass('text-accent-family-lavender-normal')
    rerender(<StatTile label="Weekly Off" value="105" tone="neutral" />)
    expect(container.querySelector('[data-slot="stat-tile-icon"]')).not.toBeInTheDocument()
  })

  it('defaults to the neutral tone', () => {
    const { container } = render(<StatTile label="Total Head Count" value="764" />)
    expect(container.querySelector('[data-slot="stat-tile"]')).toHaveAttribute('data-tone', 'neutral')
    expect(container.querySelector('[aria-hidden].h-\\[3px\\]')).toHaveClass('bg-gray-300')
  })

  it('omits the caption node when none is given', () => {
    const { container } = render(<StatTile label="A" value="1" />)
    expect(container.querySelector('[data-slot="stat-tile-caption"]')).not.toBeInTheDocument()
  })
})
