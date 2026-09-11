import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, act, within } from '@testing-library/react'
import { InboxView } from './InboxView'
import { INBOX_FIXTURE_NOW, inboxNotificationFixtures } from './fixtures'

function renderView(overrides: Partial<React.ComponentProps<typeof InboxView>> = {}) {
  return render(
    <InboxView
      notifications={inboxNotificationFixtures}
      now={INBOX_FIXTURE_NOW}
      onOpen={() => {}}
      onClear={() => {}}
      onClearAll={() => {}}
      {...overrides}
    />,
  )
}

describe('InboxView', () => {
  it('renders the six count tabs with zero-padded per-tab totals', () => {
    renderView()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual([
      'Unread04',
      'All06',
      'Reminders01',
      'Assigned to me01',
      '@Mentions01',
      'Critical01',
    ])
  })

  it('defaults to Unread and filters the feed by tab', () => {
    renderView()
    expect(screen.getByRole('tab', { name: /Unread/ })).toHaveAttribute('aria-selected', 'true')
    // The two read fixtures are absent from Unread…
    expect(screen.queryByText('Telematics alert: Vehicle AJ-1189 exceeded speed limit')).toBeNull()
    // …and appear after switching to All.
    fireEvent.mouseDown(screen.getByRole('tab', { name: /^All/ }))
    fireEvent.click(screen.getByRole('tab', { name: /^All/ }))
    expect(screen.getByText('Telematics alert: Vehicle AJ-1189 exceeded speed limit')).toBeInTheDocument()
  })

  it('groups the feed under sticky date headers (Today / Yesterday / explicit date)', () => {
    renderView()
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Yesterday' })).toBeInTheDocument()
    // ntf-6 (12 APR) is read → only visible on All.
    fireEvent.mouseDown(screen.getByRole('tab', { name: /^All/ }))
    fireEvent.click(screen.getByRole('tab', { name: /^All/ }))
    expect(screen.getByRole('heading', { name: '12 APR 2026' })).toBeInTheDocument()
  })

  it('search filters title + snippet and shows the inline no-results state', () => {
    renderView()
    const search = screen.getByRole('searchbox', { name: 'Search inbox' })
    fireEvent.change(search, { target: { value: 'compliance' } })
    expect(screen.getByText('Weekly compliance report generated')).toBeInTheDocument()
    expect(screen.queryByText('Approval needed: Fleet maintenance')).toBeNull()
    fireEvent.change(search, { target: { value: 'zzz-no-match' } })
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('shows the inbox-zero empty state when a tab has no items', () => {
    renderView({ notifications: [] })
    expect(screen.getByText("You're all caught up")).toBeInTheDocument()
  })

  it('Clear All asks for confirmation, then reports the tab’s items', () => {
    const onClearAll = vi.fn()
    renderView({ onClearAll })
    fireEvent.click(screen.getByRole('button', { name: 'Clear All' }))
    expect(onClearAll).not.toHaveBeenCalled()
    // Confirm inside the destructive modal (the page behind it is aria-hidden,
    // so the only visible "Clear All" button is the modal's confirm).
    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear All' }))
    expect(onClearAll).toHaveBeenCalledTimes(1)
    const [visible, tab] = onClearAll.mock.calls[0]
    expect(tab).toBe('unread')
    expect(visible).toHaveLength(4)
  })

  it('per-item Clear animates out, then reports the clear', () => {
    vi.useFakeTimers()
    try {
      const onClear = vi.fn()
      renderView({ onClear })
      const clear = screen.getAllByRole('button', { name: /Clear notification/ })[0]
      fireEvent.click(clear)
      expect(onClear).not.toHaveBeenCalled()
      act(() => {
        vi.runAllTimers()
      })
      expect(onClear).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders its own toolbar (icon + title) when standalone', () => {
    renderView({ title: 'Inbox' })
    expect(screen.getByText('Inbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
  })
})
