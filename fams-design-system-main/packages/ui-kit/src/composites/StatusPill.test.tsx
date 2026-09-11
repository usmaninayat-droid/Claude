import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusPill } from './StatusPill'

describe('StatusPill', () => {
  it('renders children with white text on a solid variant fill', () => {
    render(<StatusPill variant="closed">Closed</StatusPill>)
    const pill = screen.getByText('Closed')
    expect(pill).toHaveClass('bg-success-scale-500', 'text-white')
  })

  it('renders every named stage variant with its own bg class', () => {
    const cases: Array<[Parameters<typeof StatusPill>[0]['variant'], string]> = [
      ['newRequest', 'bg-accent-family-lavender-normal'],
      ['scheduled', 'bg-accent-family-bronze-normal'],
      ['inProgress', 'bg-warning-scale-500'],
      ['resolved', 'bg-info-scale-500'],
      ['overdue', 'bg-error-500'],
      ['closed', 'bg-success-scale-500'],
      ['rejected', 'bg-accent-family-pink-normal'],
    ]
    for (const [variant, cls] of cases) {
      const { unmount } = render(<StatusPill variant={variant}>{variant}</StatusPill>)
      expect(screen.getByText(variant!)).toHaveClass(cls)
      unmount()
    }
  })

  it('a raw color override wins over the variant background, via inline style', () => {
    render(
      <StatusPill variant="resolved" color="#047cd5">
        Resolved
      </StatusPill>,
    )
    const pill = screen.getByText('Resolved')
    expect(pill).toHaveStyle({ backgroundColor: '#047cd5' })
  })

  it('renders a leading icon slot', () => {
    render(
      <StatusPill variant="inProgress" icon={<span data-testid="icon" />}>
        Reopened
      </StatusPill>,
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders with no variant when only a raw color is supplied', () => {
    render(<StatusPill color="#123456">Custom Stage</StatusPill>)
    expect(screen.getByText('Custom Stage')).toHaveStyle({ backgroundColor: '#123456' })
  })

  it('stays single-line and content-sized for a long label (round-1 QA #C9: "NEW REQUESTS" wrapped)', () => {
    render(<StatusPill variant="newRequest">New Requests</StatusPill>)
    expect(screen.getByText('New Requests')).toHaveClass('whitespace-nowrap', 'shrink-0')
  })
})

describe('StatusPill — WCAG-safe tint appearance', () => {
  it('renders a tinted surface with a darkened same-hue foreground (UX MUST L.58)', () => {
    // Solid white-on-fill measured as low as 2.35:1 on the warning fill in
    // round 1; `appearance="tint"` swaps to the tint-bg + emphasis-fg pattern.
    render(
      <StatusPill appearance="tint" color="#F79009">
        Delayed
      </StatusPill>,
    )
    const pill = document.querySelector<HTMLElement>('[data-slot="status-pill"]')!
    expect(pill).toHaveAttribute('data-appearance', 'tint')
    expect(pill.style.backgroundColor).toContain('color-mix')
    expect(pill.style.color).toContain('color-mix')
  })

  it('stays on the solid treatment by default', () => {
    render(<StatusPill color="#F79009">Delayed</StatusPill>)
    const pill = document.querySelector<HTMLElement>('[data-slot="status-pill"]')!
    expect(pill).toHaveAttribute('data-appearance', 'solid')
    expect(pill.style.color).toBe('')
  })
})
