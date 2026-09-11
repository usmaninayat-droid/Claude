import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { CheckCircle2 } from '../icons'
import { Timeline, type TimelineItem, type TimelineTone } from './Timeline'

const ITEMS: TimelineItem[] = [
  { id: '1', title: 'Contract created', subtitle: 'by Kashish Bindrani', timestamp: '09:12', tone: 'success' },
  { id: '2', title: 'Status updated', tone: 'info' },
  { id: '3', title: 'Contract rejected', subtitle: 'compliance breach', tone: 'danger' },
]

describe('Timeline', () => {
  it('renders as an ordered list with one listitem per entry', () => {
    render(<Timeline items={ITEMS} />)
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('renders every item title', () => {
    render(<Timeline items={ITEMS} />)
    expect(screen.getByText('Contract created')).toBeInTheDocument()
    expect(screen.getByText('Status updated')).toBeInTheDocument()
    expect(screen.getByText('Contract rejected')).toBeInTheDocument()
  })

  it('renders subtitle only when provided', () => {
    render(<Timeline items={ITEMS} />)
    expect(screen.getByText('by Kashish Bindrani')).toBeInTheDocument()
    expect(screen.getByText('compliance breach')).toBeInTheDocument()
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
  })

  it('renders timestamp only when provided', () => {
    render(<Timeline items={ITEMS} />)
    expect(screen.getByText('09:12')).toBeInTheDocument()
  })

  it('renders a connector between items but not after the last one', () => {
    const { container } = render(<Timeline items={ITEMS} />)
    expect(container.querySelectorAll('[data-slot="timeline-connector"]')).toHaveLength(2)
  })

  it('renders a single item with no connector', () => {
    const { container } = render(<Timeline items={[ITEMS[0]]} />)
    expect(container.querySelectorAll('[data-slot="timeline-connector"]')).toHaveLength(0)
  })

  it('renders a custom icon element inside the node', () => {
    render(
      <Timeline
        items={[{ id: '1', title: 'Approved', icon: <CheckCircle2 data-testid="approved-icon" /> }]}
      />,
    )
    expect(screen.getByTestId('approved-icon')).toBeInTheDocument()
  })

  it('resolves each tone to a token-based tint on the node, never a raw color', () => {
    const tones: TimelineTone[] = ['neutral', 'info', 'success', 'warning', 'danger']
    for (const tone of tones) {
      const { container, unmount } = render(<Timeline items={[{ id: '1', title: 'Event', tone }]} />)
      const node = container.querySelector('[data-slot="icon-badge"]')
      expect(node).toBeInTheDocument()
      expect(node?.className).not.toMatch(/#|rgb\(|hsl\(/)
      unmount()
    }
  })

  it('defaults to the neutral tone when omitted', () => {
    const { container } = render(<Timeline items={[{ id: '1', title: 'Event' }]} />)
    const node = container.querySelector('[data-slot="icon-badge"]')
    expect(node).toHaveClass('bg-muted', 'text-muted-foreground')
  })

  it('scopes title/subtitle/timestamp to their own listitem', () => {
    render(<Timeline items={ITEMS} />)
    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByText('Contract created')).toBeInTheDocument()
    expect(within(items[0]).queryByText('Status updated')).not.toBeInTheDocument()
  })

  it('forwards the ref to the root <ol>', () => {
    const ref = createRef<HTMLOListElement>()
    render(<Timeline items={ITEMS} ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLOListElement)
  })

  it('merges a consumer className with the root classes', () => {
    const { container } = render(<Timeline items={ITEMS} className="max-w-md" />)
    expect(container.querySelector('[data-slot="timeline"]')).toHaveClass('max-w-md', 'flex')
  })
})
