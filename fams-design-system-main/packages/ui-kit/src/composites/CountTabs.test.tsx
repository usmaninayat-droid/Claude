import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CountTabs, type CountTabItem } from './CountTabs'

const items: CountTabItem[] = [
  { id: 'unread', label: 'Unread', count: 42 },
  { id: 'all', label: 'All', count: '42' },
  { id: 'reminders', label: 'Reminders', count: '05' },
  { id: 'plain', label: 'Plain' },
]

describe('CountTabs', () => {
  it('renders a tablist with one tab per item and the active tab selected', () => {
    render(<CountTabs items={items} value="unread" aria-label="Filters" />)
    expect(screen.getByRole('tablist', { name: 'Filters' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(4)
    expect(screen.getByRole('tab', { name: /Unread/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('renders counts verbatim ("05" stays zero-padded) and no badge without a count', () => {
    render(<CountTabs items={items} value="unread" />)
    const reminders = screen.getByRole('tab', { name: /Reminders/ })
    expect(reminders.querySelector('[data-slot="count-tabs-badge"]')).toHaveTextContent('05')
    const plain = screen.getByRole('tab', { name: 'Plain' })
    expect(plain.querySelector('[data-slot="count-tabs-badge"]')).toBeNull()
  })

  it('tints the active tab badge with the primary treatment, keeps inactive neutral', () => {
    render(<CountTabs items={items} value="unread" />)
    const activeBadge = screen
      .getByRole('tab', { name: /Unread/ })
      .querySelector('[data-slot="count-tabs-badge"]') as HTMLElement
    const inactiveBadge = screen
      .getByRole('tab', { name: /^All/ })
      .querySelector('[data-slot="count-tabs-badge"]') as HTMLElement
    // Both carry the state-scoped active classes; the state attribute selects.
    expect(activeBadge.closest('[data-state]')).toHaveAttribute('data-state', 'active')
    expect(inactiveBadge.closest('[data-state]')).toHaveAttribute('data-state', 'inactive')
    expect(inactiveBadge.className).toContain('bg-border')
  })

  it('fires onValueChange with the clicked tab id', () => {
    const onChange = vi.fn()
    render(<CountTabs items={items} value="unread" onValueChange={onChange} />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Reminders/ }))
    fireEvent.click(screen.getByRole('tab', { name: /Reminders/ }))
    expect(onChange).toHaveBeenCalledWith('reminders')
  })

  it('disables a tab via item.disabled', () => {
    render(
      <CountTabs
        items={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B', disabled: true }]}
        value="a"
      />,
    )
    expect(screen.getByRole('tab', { name: 'B' })).toBeDisabled()
  })

  it('owns its horizontal overflow (the strip scrolls, tabs never wrap)', () => {
    render(<CountTabs items={items} value="unread" />)
    const list = screen.getByRole('tablist')
    expect(list.className).toContain('overflow-x-auto')
    expect(screen.getByRole('tab', { name: /Unread/ }).className).toContain('whitespace-nowrap')
  })
})
