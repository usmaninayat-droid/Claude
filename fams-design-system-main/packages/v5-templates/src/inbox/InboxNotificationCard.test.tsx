import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { InboxNotificationCard } from './InboxNotificationCard'
import { inboxNotificationFixtures } from './fixtures'

const [approval, , , mention, readAlert] = inboxNotificationFixtures

describe('InboxNotificationCard', () => {
  it('renders title, snippet, and the chip row (reference / severity / due / module)', () => {
    render(<InboxNotificationCard notification={approval} />)
    expect(screen.getByText('Approval needed: Fleet maintenance')).toBeInTheDocument()
    expect(screen.getByText(/scheduled maintenance requires/)).toBeInTheDocument()
    expect(screen.getByText('TKT-01')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Ticketing')).toBeInTheDocument()
  })

  it('shows the unread dot only for unread items', () => {
    const { container, rerender } = render(<InboxNotificationCard notification={approval} />)
    expect(container.querySelector('[data-slot="notification-unread-dot"]')).not.toBeNull()
    rerender(<InboxNotificationCard notification={readAlert} />)
    expect(container.querySelector('[data-slot="notification-unread-dot"]')).toBeNull()
  })

  it('renders an avatar (not the icon container) for mention items', () => {
    const { container } = render(<InboxNotificationCard notification={mention} />)
    expect(container.querySelector('[data-slot="avatar"]')).not.toBeNull()
    // The non-mention card renders the tinted icon container instead.
    const { container: plain } = render(<InboxNotificationCard notification={approval} />)
    expect(plain.querySelector('[data-slot="avatar"]')).toBeNull()
  })

  it('opens via the stretched title button; Clear is a nested stop that does not open', () => {
    const onOpen = vi.fn()
    const onClear = vi.fn()
    render(<InboxNotificationCard notification={approval} onOpen={onOpen} onClear={onClear} />)
    fireEvent.click(screen.getByRole('button', { name: approval.title }))
    expect(onOpen).toHaveBeenCalledWith(approval)
    fireEvent.click(screen.getByRole('button', { name: /Clear notification/ }))
    expect(onClear).toHaveBeenCalledWith(approval)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('reveals Clear on focus within the card, not hover-only (UX-NOTES §4)', () => {
    render(<InboxNotificationCard notification={approval} onClear={() => {}} />)
    const clear = screen.getByRole('button', { name: /Clear notification/ })
    expect(clear.className).toContain('group-focus-within:opacity-100')
    expect(clear.className).toContain('group-hover:opacity-100')
  })

  it('fades out while clearing', () => {
    const { container } = render(
      <InboxNotificationCard notification={approval} onClear={() => {}} clearing />,
    )
    const card = container.querySelector('[data-slot="notification-card"]') as HTMLElement
    expect(card.className).toContain('opacity-0')
  })
})
