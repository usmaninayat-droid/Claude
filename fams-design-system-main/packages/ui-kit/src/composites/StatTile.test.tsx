import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Truck } from '../icons'
import { StatTile } from './StatTile'

describe('StatTile', () => {
  it('renders the value first and the label under it', () => {
    const { container } = render(<StatTile label="Scheduled Routes" value="292" />)
    const value = container.querySelector('[data-slot="stat-tile-value"]')
    const label = container.querySelector('[data-slot="stat-tile-label"]')
    expect(value).toHaveTextContent('292')
    expect(label).toHaveTextContent('Scheduled Routes')
    expect(value!.compareDocumentPosition(label!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('paints a grey inline-start accent by default and a status tone on request', () => {
    const { container, rerender } = render(<StatTile label="Ongoing Routes" value="149" />)
    const accent = () => container.querySelector('[data-slot="stat-tile-accent"]')
    expect(accent()).toHaveClass('bg-gray-300', 'start-0')
    expect(container.querySelector('[data-slot="stat-tile"]')).toHaveAttribute('data-tone', 'neutral')
    rerender(<StatTile label="Delayed Routes" value="24" tone="warning" />)
    expect(accent()).toHaveClass('bg-warning')
  })

  it('renders a same-row trend coloured by direction', () => {
    render(<StatTile label="Scheduled Routes" value="292" trend={{ value: '+12', note: 'vs Yest.' }} />)
    expect(screen.getByText('+12')).toHaveClass('text-success')
    expect(screen.getByText('vs Yest.')).toBeInTheDocument()
  })

  it('renders a denominator after the value and suppresses the trend when both are given', () => {
    const { container } = render(<StatTile label="Dispatched Routes" value="270" target="292" trend={{ value: '+1' }} />)
    expect(container.querySelector('[data-slot="stat-tile-target"]')).toHaveTextContent('/292')
    expect(container.querySelector('[data-slot="stat-tile-trend"]')).not.toBeInTheDocument()
  })

  it('renders an optional icon and caption, and omits both by default', () => {
    const { container, rerender } = render(<StatTile label="A" value="1" icon={Truck} caption="note" />)
    expect(container.querySelector('[data-slot="stat-tile-icon"]')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="stat-tile-caption"]')).toHaveTextContent('note')
    rerender(<StatTile label="A" value="1" />)
    expect(container.querySelector('[data-slot="stat-tile-icon"]')).not.toBeInTheDocument()
    expect(container.querySelector('[data-slot="stat-tile-caption"]')).not.toBeInTheDocument()
  })
})
