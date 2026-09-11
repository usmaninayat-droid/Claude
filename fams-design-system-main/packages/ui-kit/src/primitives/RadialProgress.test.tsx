import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RadialProgress } from './RadialProgress'

function arcCircle(container: HTMLElement) {
  // second <circle> is the progress arc; the first is the track.
  return container.querySelectorAll('circle')[1]
}

describe('RadialProgress', () => {
  it('exposes role=progressbar with aria-valuenow reflecting value', () => {
    render(<RadialProgress value={65} />)
    const el = screen.getByRole('progressbar')
    expect(el).toHaveAttribute('aria-valuenow', '65')
    expect(el).toHaveAttribute('aria-valuemin', '0')
    expect(el).toHaveAttribute('aria-valuemax', '100')
  })

  it('renders the rounded percentage as the center label by default', () => {
    render(<RadialProgress value={42.6} />)
    expect(screen.getByText('43%')).toBeInTheDocument()
  })

  it('hides the label when hideLabel is set', () => {
    render(<RadialProgress value={50} hideLabel />)
    expect(screen.queryByText('50%')).not.toBeInTheDocument()
  })

  it('clamps out-of-range values', () => {
    render(<RadialProgress value={150} />)
    const el = screen.getByRole('progressbar')
    expect(el).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('applies an explicit tone over the auto-resolved threshold color', () => {
    const { container } = render(<RadialProgress value={10} tone="success" />)
    expect(arcCircle(container)).toHaveClass('text-success')
  })

  it('auto-resolves tone from value when tone is omitted', () => {
    const low = render(<RadialProgress value={20} />)
    expect(arcCircle(low.container)).toHaveClass('text-destructive')

    const mid = render(<RadialProgress value={55} />)
    expect(arcCircle(mid.container)).toHaveClass('text-warning')

    const high = render(<RadialProgress value={90} />)
    expect(arcCircle(high.container)).toHaveClass('text-success')
  })

  it('merges a custom className onto the root', () => {
    render(<RadialProgress value={30} className="my-custom" />)
    expect(screen.getByRole('progressbar')).toHaveClass('my-custom')
  })
})
