import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NotificationCard } from './NotificationCard'

describe('NotificationCard', () => {
  it('renders title, description, and timestamp', () => {
    render(
      <NotificationCard
        title="Plan approved"
        description="Lot 1 collection plan approved by Admin."
        timestamp="2h ago"
      />,
    )
    expect(screen.getByText('Plan approved')).toBeInTheDocument()
    expect(screen.getByText('Lot 1 collection plan approved by Admin.')).toBeInTheDocument()
    expect(screen.getByText('2h ago')).toBeInTheDocument()
  })

  it('renders no severity dot when severity is omitted', () => {
    const { container } = render(<NotificationCard title="No severity" />)
    expect(container.querySelector('[data-slot="notification-severity-dot"]')).not.toBeInTheDocument()
  })

  it.each([
    ['info', 'bg-info'],
    ['success', 'bg-success'],
    ['warning', 'bg-warning'],
    ['error', 'bg-destructive'],
  ] as const)('renders the %s severity dot with the matching token class', (severity, expectedClass) => {
    const { container } = render(<NotificationCard title="Severity" severity={severity} />)
    expect(container.querySelector('[data-slot="notification-severity-dot"]')).toHaveClass(expectedClass)
  })

  it('marks unread with a bold title, an unread dot, and an sr-only label', () => {
    const { container } = render(<NotificationCard title="New ticket" unread timestamp="now" />)
    expect(screen.getByText('New ticket')).toHaveClass('font-semibold')
    expect(container.querySelector('[data-slot="notification-unread-dot"]')).toBeInTheDocument()
    expect(screen.getByText('Unread.', { exact: false })).toHaveClass('sr-only')
  })

  it('renders a plain medium-weight title with no unread markers when read', () => {
    const { container } = render(<NotificationCard title="Old ticket" unread={false} />)
    expect(screen.getByText('Old ticket')).toHaveClass('font-medium')
    expect(container.querySelector('[data-slot="notification-unread-dot"]')).not.toBeInTheDocument()
  })

  it('renders no avatar when avatarSrc/avatarName are omitted', () => {
    const { container } = render(<NotificationCard title="No avatar" />)
    expect(container.querySelector('[data-slot="avatar"]')).not.toBeInTheDocument()
  })

  it('renders the leading Avatar when avatarName is provided', () => {
    const { container } = render(<NotificationCard title="With avatar" avatarName="Kashish Bindrani" />)
    expect(container.querySelector('[data-slot="avatar"]')).toBeInTheDocument()
    expect(screen.getByText('K')).toBeInTheDocument()
  })

  it('renders an optional source badge', () => {
    render(<NotificationCard title="From CCMS" source="CCMS" />)
    expect(screen.getByText('CCMS')).toBeInTheDocument()
  })

  it('renders a meta-chip row with tone-mapped Badge variants', () => {
    render(
      <NotificationCard
        title="Ticket update"
        meta={[
          { label: 'FM-882' },
          { label: 'Critical', tone: 'error' },
          { label: 'Today', tone: 'warning' },
        ]}
      />,
    )
    expect(screen.getByText('FM-882')).toHaveClass('bg-muted')
    expect(screen.getByText('Critical')).toHaveClass('border-error-200')
    expect(screen.getByText('Today')).toHaveClass('border-warning-scale-200')
  })

  it('renders no meta row when meta is omitted or empty', () => {
    const { rerender, container } = render(<NotificationCard title="No meta" />)
    expect(container.querySelector('[data-slot="badge"]')).not.toBeInTheDocument()

    rerender(<NotificationCard title="Empty meta" meta={[]} />)
    expect(container.querySelector('[data-slot="badge"]')).not.toBeInTheDocument()
  })

  it('renders an actions slot', () => {
    render(<NotificationCard title="Actionable" actions={<button>Dismiss</button>} />)
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
  })

  it('is not a button and not keyboard-focusable when onClick is omitted', () => {
    render(<NotificationCard title="Static" />)
    const card = screen.getByText('Static').closest('[data-slot="notification-card"]')
    expect(card).not.toHaveAttribute('role')
    expect(card).not.toHaveAttribute('tabindex')
  })

  it('becomes a keyboard-operable button when onClick is provided', () => {
    const onClick = vi.fn()
    render(<NotificationCard title="Open me" onClick={onClick} />)
    const card = screen.getByRole('button')
    expect(card).toHaveAttribute('tabindex', '0')

    fireEvent.click(card)
    expect(onClick).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onClick).toHaveBeenCalledTimes(2)

    fireEvent.keyDown(card, { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(3)

    fireEvent.keyDown(card, { key: 'Tab' })
    expect(onClick).toHaveBeenCalledTimes(3)
  })

  it('forwards the ref to the underlying div', () => {
    const ref = createRef<HTMLDivElement>()
    render(<NotificationCard title="Ref test" ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('merges a consumer className with the variant classes', () => {
    render(<NotificationCard title="Classy" className="ms-2" data-testid="card" />)
    expect(screen.getByTestId('card')).toHaveClass('ms-2', 'rounded-md')
  })
})
