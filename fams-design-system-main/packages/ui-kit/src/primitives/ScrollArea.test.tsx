import { createRef, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'
import { ScrollArea, ScrollBar } from './ScrollArea'

// ScrollBar reads Radix's ScrollArea context, so standalone ScrollBar
// assertions need a bare Root ancestor (not our composed ScrollArea, which
// already renders its own pair of scrollbars).
function withScrollAreaContext(children: ReactNode) {
  return <ScrollAreaPrimitive.Root type="always">{children}</ScrollAreaPrimitive.Root>
}

describe('ScrollArea', () => {
  it('renders its children inside the scrollable viewport', () => {
    render(
      <ScrollArea>
        <div>Row content</div>
      </ScrollArea>,
    )
    expect(screen.getByText('Row content')).toBeInTheDocument()
  })

  it('forwards the ref to the root element', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <ScrollArea ref={ref}>
        <div>content</div>
      </ScrollArea>,
    )
    expect(ref.current).not.toBeNull()
    expect(ref.current).toHaveAttribute('data-slot', 'scroll-area')
  })

  it('merges a custom className onto the root', () => {
    const { container } = render(
      <ScrollArea className="h-64">
        <div>content</div>
      </ScrollArea>,
    )
    expect(container.querySelector('[data-slot="scroll-area"]')).toHaveClass('h-64', 'relative', 'overflow-hidden')
  })

  it('always renders both a vertical and a horizontal scrollbar so either overflow axis works', () => {
    // type="always" bypasses Radix's overflow-based Presence gating so the
    // scrollbar track mounts deterministically under jsdom (no real layout).
    const { container } = render(
      <ScrollArea type="always">
        <div>content</div>
      </ScrollArea>,
    )
    const bars = container.querySelectorAll('[data-slot="scroll-area-scrollbar"]')
    const orientations = Array.from(bars).map((el) => el.getAttribute('data-orientation'))
    expect(orientations).toContain('vertical')
    expect(orientations).toContain('horizontal')
  })

  it('applies the vertical sizing class to the vertical scrollbar', () => {
    render(withScrollAreaContext(<ScrollBar orientation="vertical" data-testid="bar" />))
    expect(screen.getByTestId('bar')).toHaveClass('h-full', 'w-2.5')
  })

  it('applies the horizontal sizing class to the horizontal scrollbar', () => {
    render(withScrollAreaContext(<ScrollBar orientation="horizontal" data-testid="bar" />))
    expect(screen.getByTestId('bar')).toHaveClass('h-2.5', 'w-full', 'flex-col')
  })

  it('defaults ScrollBar to vertical orientation', () => {
    render(withScrollAreaContext(<ScrollBar data-testid="bar" />))
    expect(screen.getByTestId('bar')).toHaveAttribute('data-orientation', 'vertical')
  })

  it('merges a custom className onto ScrollBar', () => {
    render(withScrollAreaContext(<ScrollBar data-testid="bar" className="opacity-50" />))
    expect(screen.getByTestId('bar')).toHaveClass('opacity-50')
  })
})
