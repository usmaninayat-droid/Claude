import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CriticalEventsList, type CriticalEventsListItem } from './CriticalEventsList'

const ITEMS: CriticalEventsListItem[] = [
  {
    id: '1',
    title: 'GPS signal lost',
    description: 'Vehicle QAD-2201 — Al Rayyan Rd',
    severity: 'error',
    timestamp: '09:41',
  },
  { id: '2', title: 'Route deviation', severity: 'warning', timestamp: '09:12' },
  { id: '3', title: 'Shift started', description: 'Driver checked in', severity: 'info' },
]

describe('CriticalEventsList', () => {
  it('renders one row per event with title, description, and timestamp', () => {
    render(<CriticalEventsList items={ITEMS} />)
    expect(screen.getByText('GPS signal lost')).toBeInTheDocument()
    expect(screen.getByText('Vehicle QAD-2201 — Al Rayyan Rd')).toBeInTheDocument()
    expect(screen.getByText('09:41')).toBeInTheDocument()
    expect(screen.getByText('Route deviation')).toBeInTheDocument()
    expect(screen.getByText('Shift started')).toBeInTheDocument()
  })

  it('renders a tinted IconBadge per row, never a raw color', () => {
    const { container } = render(<CriticalEventsList items={ITEMS} />)
    const badges = container.querySelectorAll('[data-slot="icon-badge"]')
    expect(badges).toHaveLength(3)
    badges.forEach((badge) => {
      expect(badge.className).not.toMatch(/#|rgb\(|hsl\(/)
    })
  })

  // Round-2 visual QA #10 / verdict V12: severity was carried by the icon tint
  // alone — colour as the only encoding, and nothing at all for a screen reader.
  it('renders a severity chip stating the severity in words on every row', () => {
    render(<CriticalEventsList items={ITEMS} />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('Warning')).toBeInTheDocument()
    expect(screen.getByText('Info')).toBeInTheDocument()
  })

  it('puts the severity chip inside the row title block, above the description', () => {
    const { container } = render(<CriticalEventsList items={[ITEMS[0]]} />)
    const chip = screen.getByText('Critical').closest('[data-slot="badge"]')
    expect(chip).toBeInTheDocument()
    expect(container.querySelector('[data-slot="list-row-title-badge"]')).toContainElement(
      chip as HTMLElement,
    )
  })

  it('lets a row override the severity word', () => {
    render(
      <CriticalEventsList items={[{ ...ITEMS[0], severityLabel: 'SLA breach' }]} />,
    )
    expect(screen.getByText('SLA breach')).toBeInTheDocument()
    expect(screen.queryByText('Critical')).not.toBeInTheDocument()
  })

  it('renders the StatusView default when items is empty', () => {
    render(<CriticalEventsList items={[]} />)
    expect(screen.getByText('No critical events')).toBeInTheDocument()
  })

  it('lets the caller override the empty state', () => {
    render(<CriticalEventsList items={[]} emptyState={<p>All clear</p>} />)
    expect(screen.getByText('All clear')).toBeInTheDocument()
    expect(screen.queryByText('No critical events')).not.toBeInTheDocument()
  })

  it('is non-interactive (no button roles) when onItemClick is omitted', () => {
    render(<CriticalEventsList items={ITEMS} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('calls onItemClick with the item id when a row is clicked', () => {
    const onItemClick = vi.fn()
    render(<CriticalEventsList items={ITEMS} onItemClick={onItemClick} />)
    fireEvent.click(screen.getByText('GPS signal lost'))
    expect(onItemClick).toHaveBeenCalledWith('1')
  })

  it('marks every row as a keyboard-operable button when onItemClick is provided', () => {
    render(<CriticalEventsList items={ITEMS} onItemClick={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('triggers onItemClick on Enter and Space when clickable', () => {
    const onItemClick = vi.fn()
    render(<CriticalEventsList items={ITEMS} onItemClick={onItemClick} />)
    const rows = screen.getAllByRole('button')
    fireEvent.keyDown(rows[0], { key: 'Enter' })
    fireEvent.keyDown(rows[1], { key: ' ' })
    expect(onItemClick).toHaveBeenNthCalledWith(1, '1')
    expect(onItemClick).toHaveBeenNthCalledWith(2, '2')
  })

  it('forwards the ref to the root element', () => {
    const ref = createRef<HTMLDivElement>()
    render(<CriticalEventsList items={ITEMS} ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('merges a consumer className with the root classes', () => {
    const { container } = render(<CriticalEventsList items={ITEMS} className="max-w-md" />)
    expect(container.querySelector('[data-slot="critical-events-list"]')).toHaveClass(
      'max-w-md',
      'rounded-md',
    )
  })

  it('passes an item\'s metadata columns through to its row', () => {
    const { container } = render(
      <CriticalEventsList
        items={[
          {
            id: 'e1',
            title: 'Overspeeding',
            severity: 'warning',
            meta: [{ label: 'Asset', value: 'TME-298' }],
            timestamp: '09:41',
          },
        ]}
      />,
    )
    const meta = container.querySelector('[data-slot="list-row-meta"]')
    expect(meta).toHaveTextContent('Asset')
    expect(meta).toHaveTextContent('TME-298')
  })
})
