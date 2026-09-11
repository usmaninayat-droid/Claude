import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PriorityChip } from './PriorityChip'

describe('PriorityChip', () => {
  it('renders the variant name as the default label', () => {
    render(<PriorityChip variant="medium" />)
    expect(screen.getByText('medium')).toBeInTheDocument()
  })

  it('renders custom children over the default label', () => {
    render(<PriorityChip variant="minor">Minor</PriorityChip>)
    expect(screen.getByText('Minor')).toBeInTheDocument()
  })

  it('gives critical the error token classes and high a distinct flame-accent pair', () => {
    // Round-1 design QA (kanban #26): critical and high used to share the
    // same error/red token, making them visually indistinguishable when
    // both appear on the same board — they must now render distinctly.
    const { container: critical } = render(<PriorityChip variant="critical" />)
    const { container: high } = render(<PriorityChip variant="high" />)
    expect(critical.firstElementChild).toHaveClass('bg-error-50', 'text-error-700')
    expect(high.firstElementChild).toHaveClass(
      'bg-accent-family-flame-lightest',
      'text-accent-family-flame-dark',
    )
    expect(high.firstElementChild?.className).not.toBe(critical.firstElementChild?.className)
  })

  it('gives medium the warning tokens and minor the success tokens', () => {
    const { container: medium } = render(<PriorityChip variant="medium" />)
    const { container: minor } = render(<PriorityChip variant="minor" />)
    expect(medium.firstElementChild).toHaveClass('bg-warning-scale-50', 'text-warning-scale-700')
    expect(minor.firstElementChild).toHaveClass('bg-success-scale-50', 'text-success-scale-700')
  })

  // fix7 wave 6, P2 — AA text contrast: each variant's text tone was the
  // Figma-drawn "Normal" ramp step, which measures 2.25-3.46:1 against its
  // own lightest fill (both themes — these ramps carry no dark-mode
  // override). Moved one step darker (`*-700`/`*-dark`) rather than the
  // theme-reactive `*-text` alias, which would have measured WORSE
  // (1.76-2.56:1) in dark mode paired with this chip's theme-invariant
  // pale fill. Pinned here so a future touch can't regress it back to the
  // `-500`/`-normal` step.
  it('never uses the Figma "Normal" ramp step as text — it fails AA against the chip\'s own fill', () => {
    const { container: critical } = render(<PriorityChip variant="critical" />)
    const { container: high } = render(<PriorityChip variant="high" />)
    const { container: medium } = render(<PriorityChip variant="medium" />)
    const { container: minor } = render(<PriorityChip variant="minor" />)
    expect(critical.firstElementChild).not.toHaveClass('text-error-500')
    expect(high.firstElementChild).not.toHaveClass('text-accent-family-flame-normal')
    expect(medium.firstElementChild).not.toHaveClass('text-warning-scale-500')
    expect(minor.firstElementChild).not.toHaveClass('text-success-scale-500')
  })

  it('renders a leading flag icon by default', () => {
    const { container } = render(<PriorityChip variant="critical" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('omits the icon when icon={null}', () => {
    const { container } = render(<PriorityChip variant="critical" icon={null} />)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders a custom icon override', () => {
    render(<PriorityChip variant="critical" icon={<span data-testid="custom-icon" />} />)
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('forwards extra className and props', () => {
    render(<PriorityChip variant="medium" className="extra" data-testid="chip" />)
    expect(screen.getByTestId('chip')).toHaveClass('extra')
  })
})
