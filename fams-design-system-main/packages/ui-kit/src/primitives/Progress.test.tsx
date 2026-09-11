import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Progress } from './Progress'

describe('Progress', () => {
  it('exposes role=progressbar with aria-valuenow reflecting value', () => {
    render(<Progress value={40} aria-label="upload" />)
    expect(screen.getByRole('progressbar', { name: 'upload' })).toHaveAttribute(
      'aria-valuenow',
      '40',
    )
  })

  it('defaults to 0 when no value is given', () => {
    render(<Progress aria-label="upload" />)
    expect(screen.getByRole('progressbar', { name: 'upload' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    )
  })

  it('clamps the indicator width to 100 for out-of-range values', () => {
    const { container } = render(<Progress value={140} aria-label="upload" />)
    const indicator = container.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toHaveStyle({ width: '100%' })
  })

  it('clamps negative values to 0', () => {
    const { container } = render(<Progress value={-10} aria-label="upload" />)
    const indicator = container.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toHaveStyle({ width: '0%' })
  })

  it('applies the sm size track height', () => {
    render(<Progress value={50} size="sm" aria-label="upload" />)
    expect(screen.getByRole('progressbar', { name: 'upload' })).toHaveClass('h-1.5')
  })

  it('applies the md size track height by default', () => {
    render(<Progress value={50} aria-label="upload" />)
    expect(screen.getByRole('progressbar', { name: 'upload' })).toHaveClass('h-2')
  })

  it('anchors the indicator at the logical start edge for RTL-safety', () => {
    render(<Progress value={50} aria-label="upload" />)
    const bar = screen.getByRole('progressbar', { name: 'upload' })
    const indicator = bar.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toHaveClass('start-0')
  })
})
