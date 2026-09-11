import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ListRow } from './ListRow'

describe('ListRow', () => {
  it('renders title and subtitle', () => {
    render(<ListRow title="Truck 01-80" subtitle="Lot 1" />)
    expect(screen.getByText('Truck 01-80')).toBeInTheDocument()
    expect(screen.getByText('Lot 1')).toBeInTheDocument()
  })

  it('renders leading and trailing slots', () => {
    render(
      <ListRow
        title="Truck 01-80"
        leading={<span data-testid="leading">L</span>}
        trailing={<span data-testid="trailing">T</span>}
      />,
    )
    expect(screen.getByTestId('leading')).toBeInTheDocument()
    expect(screen.getByTestId('trailing')).toBeInTheDocument()
  })

  it('applies the unread and selected state classes (deprecated isUnread/isSelected aliases)', () => {
    render(<ListRow title="Unread row" isUnread isSelected data-testid="row" />)
    const row = screen.getByTestId('row')
    expect(row).toHaveAttribute('data-selected', 'true')
    expect(screen.getByText('Unread row')).toHaveClass('font-semibold')
  })

  it('applies the unread and selected state classes via the canonical unread/selected props', () => {
    render(<ListRow title="Unread row" unread selected data-testid="row" />)
    const row = screen.getByTestId('row')
    expect(row).toHaveAttribute('data-selected', 'true')
    expect(screen.getByText('Unread row')).toHaveClass('font-semibold')
  })

  it('prefers the canonical unread/selected props over the deprecated aliases when both are given', () => {
    render(<ListRow title="Row" unread={false} isUnread selected={false} isSelected data-testid="row" />)
    const row = screen.getByTestId('row')
    expect(row).not.toHaveAttribute('data-selected')
    expect(screen.getByText('Row')).toHaveClass('font-medium')
  })

  it('forwards the ref to the underlying div', () => {
    const ref = createRef<HTMLDivElement>()
    render(<ListRow title="Truck 01-80" ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('has no focus-visible ring classes when not interactive', () => {
    render(<ListRow title="Static row" data-testid="row" />)
    const row = screen.getByTestId('row')
    expect(row).not.toHaveAttribute('role')
    expect(row.className).not.toContain('focus-visible:ring')
  })

  it('applies the focus-visible ring treatment when onClick is present', () => {
    const onClick = vi.fn()
    render(<ListRow title="Clickable row" onClick={onClick} data-testid="row" />)
    const row = screen.getByTestId('row')
    expect(row).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-ring')

    fireEvent.click(row)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies the focus-visible ring treatment when role="button" is set (e.g. CriticalEventsList usage)', () => {
    render(<ListRow title="Keyboard-focusable row" role="button" tabIndex={0} data-testid="row" />)
    const row = screen.getByRole('button')
    expect(row).toHaveAttribute('tabindex', '0')
    expect(row).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-ring')
  })

  it('does not change non-interactive row appearance otherwise', () => {
    render(<ListRow title="Row A" data-testid="a" />)
    render(<ListRow title="Row B" isSelected data-testid="b" />)
    expect(screen.getByTestId('a')).toHaveClass('hover:bg-muted/40')
    expect(screen.getByTestId('b')).toHaveClass('bg-secondary/40')
  })

  it('renders metadata columns as label-over-value between the title block and trailing', () => {
    const { container } = render(
      <ListRow
        title="Harsh braking"
        meta={[
          { id: 'asset', label: 'Asset', value: 'TME-298' },
          { id: 'speed', label: 'Speed', value: '82 km/h' },
        ]}
        trailing="09:41"
      />,
    )
    const meta = container.querySelector('[data-slot="list-row-meta"]')
    expect(meta).toHaveTextContent('Asset')
    expect(meta).toHaveTextContent('TME-298')
    expect(meta).toHaveTextContent('82 km/h')
    // Logical separator, so it mirrors under RTL. It is drawn only by the
    // columnar template — the stacked one has no vertical rule to mirror.
    expect(meta?.className).toContain('@2xl/list-row:border-s')
    expect(meta?.className).not.toContain('border-e')
  })

  it('floors the title block in the columnar template only', () => {
    const { container, rerender } = render(
      <ListRow
        title="Zone Out Violation"
        meta={[{ label: 'Vehicle', value: 'DXB-B-1007' }]}
        data-testid="row"
      />,
    )
    // 12rem is the title block's preferred width when meta columns share the
    // ROW — never in the stacked template, where the block owns the full width.
    expect(container.innerHTML).toContain('@2xl/list-row:basis-48')
    // The row is its own query container, so the template follows the width the
    // row actually got rather than the viewport.
    expect(screen.getByTestId('row').className).toContain('@container/list-row')

    // Without meta the original single-line row is unchanged.
    rerender(<ListRow title="Zone Out Violation" data-testid="row" />)
    expect(container.innerHTML).not.toContain('basis-48')
    expect(screen.getByTestId('row').className).not.toContain('@container/list-row')
  })

  it('uses ONE row template regardless of content length, and never wraps the row itself', () => {
    // Round-2 visual QA #9: the row was `flex-wrap`, so rows 1–2 (long titles)
    // pushed the meta block onto a second line while rows 3–4 kept it inline
    // and orphaned the timestamp — same data shape, two layouts.
    const meta = [
      { id: 'vehicle', label: 'Vehicle', value: 'DXB-B-1007' },
      { id: 'driver', label: 'Driver', value: 'Omar Daher' },
    ]
    const { container } = render(
      <>
        <ListRow title="Zone Out" meta={meta} trailing="09:41" data-testid="short" />
        <ListRow
          title="Overspeeding on Sheikh Zayed Road heading north past exit 43"
          meta={meta}
          trailing="09:44"
          data-testid="long"
        />
      </>,
    )
    const short = screen.getByTestId('short')
    const long = screen.getByTestId('long')
    expect(short.className).toBe(long.className)
    expect(short.className).not.toContain('flex-wrap')
    // Round-3: the meta block's OWN `flex-wrap` was the surviving half of the
    // same defect — a long value wrapped one row's columns and not the next's
    // (measured heights 150/150/107/107/107/149). Neither template wraps now:
    // the wide one is a fixed column run, the narrow one is one line per
    // column, so the line count is `meta.length` on every row of a list.
    const metaBlocks = container.querySelectorAll('[data-slot="list-row-meta"]')
    expect(metaBlocks).toHaveLength(2)
    for (const block of metaBlocks) {
      expect(block.className).not.toContain('flex-wrap')
      expect(block.className).toContain('flex-col')
      expect(block.className).toContain('@2xl/list-row:flex-row')
    }
    expect(metaBlocks[0]?.className).toBe(metaBlocks[1]?.className)
  })

  it('gives a narrow row the stacked template and a wide row the columnar one', () => {
    // Both templates come from ONE markup tree: `contents` at >=42rem dissolves
    // the stacking wrapper so the title block, meta and trailing become direct
    // children of the row again.
    const { container } = render(
      <ListRow
        title="Fuel Refueling"
        subtitle="Ras Bufontas, Doha"
        meta={[{ id: 'v', label: 'Vehicle', value: 'DXB-B-1007' }]}
        trailing="20/07/2026 20:30"
      />,
    )
    const wrapper = container.querySelector('[data-slot="list-row-meta"]')?.parentElement
    expect(wrapper?.className).toContain('flex-col')
    expect(wrapper?.className).toContain('@2xl/list-row:contents')
    // Nothing in the stacked template truncates: the ~400px map rail read
    // "Fuel Re..." / "VE..." / "Al Dafra..." when the columns were unconditional.
    const label = container.querySelector('[data-slot="list-row-meta"] span')
    expect(label?.className).toContain('@2xl/list-row:truncate')
    expect(label?.className.split(' ')).not.toContain('truncate')
  })

  it('renders titleBadge on its own line inside the title block', () => {
    const { container } = render(
      <ListRow title="Overspeeding" titleBadge={<span>CRITICAL</span>} subtitle="Al Quoz" />,
    )
    const badge = container.querySelector('[data-slot="list-row-title-badge"]')
    expect(badge).toHaveTextContent('CRITICAL')
    // Inside the title block (which owns `min-w-0`), not a sibling of the row.
    expect(badge?.parentElement).toContain(screen.getByText('Overspeeding'))
  })

  it('renders no metadata block when meta is omitted or empty', () => {
    const { container, rerender } = render(<ListRow title="Row" />)
    expect(container.querySelector('[data-slot="list-row-meta"]')).toBeNull()
    rerender(<ListRow title="Row" meta={[]} />)
    expect(container.querySelector('[data-slot="list-row-meta"]')).toBeNull()
  })
})
