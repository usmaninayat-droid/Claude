import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Leaderboard } from './Leaderboard'
import type { LeaderboardColumn, LeaderboardItem } from './Leaderboard.types'

const ITEMS: LeaderboardItem[] = [
  {
    id: 'a',
    primary: 'Alpha unit',
    secondary: 'AAA-111',
    movement: { direction: 'up', value: '1' },
    score: '98 pts',
    cells: { events: 4, score: '98 pts' },
  },
  {
    id: 'b',
    primary: 'Bravo unit',
    secondary: 'BBB-222',
    movement: { direction: 'down', value: '2' },
    score: '90 pts',
    cells: { events: 6, score: '90 pts' },
  },
  {
    id: 'c',
    primary: 'Charlie unit',
    secondary: 'CCC-333',
    score: '88 pts',
    cells: { events: 9, score: '88 pts' },
  },
]

const COLUMNS: LeaderboardColumn[] = [
  { key: 'events', label: 'Events', minWidth: '8rem', align: 'end' },
  { key: 'score', label: 'Score', minWidth: '9rem', isSortable: true },
]

describe('Leaderboard', () => {
  it('renders a ranked row per item with the injected rank and entity columns', () => {
    render(<Leaderboard items={ITEMS} columns={COLUMNS} ariaLabel="Unit ranking" />)
    const table = screen.getByRole('table', { name: 'Unit ranking' })
    expect(table).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Rank' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(ITEMS.length + 1)
    expect(screen.getByText('Alpha unit')).toBeInTheDocument()
    expect(screen.getByText('AAA-111')).toBeInTheDocument()
  })

  it('numbers ranks from the item order when no explicit rank is given', () => {
    render(<Leaderboard items={ITEMS} columns={COLUMNS} />)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('1')
    expect(rows[2]).toHaveTextContent('3')
  })

  it('renders rank movement as a glyph plus text, never colour alone', () => {
    const { container } = render(<Leaderboard items={ITEMS} columns={COLUMNS} />)
    const indicators = container.querySelectorAll('[data-slot="trend-indicator"]')
    expect(indicators.length).toBeGreaterThan(0)
    expect(indicators[0].querySelector('svg')).not.toBeNull()
    expect(indicators[0]).toHaveTextContent('1')
  })

  it('applies each column min-inline-size so columns are never crushed', () => {
    render(<Leaderboard items={ITEMS} columns={COLUMNS} />)
    expect(screen.getByRole('columnheader', { name: 'Events' })).toHaveStyle({
      minInlineSize: '8rem',
    })
  })

  it('renders podium cards only for variant="podium"', () => {
    const { container, rerender } = render(<Leaderboard items={ITEMS} columns={COLUMNS} />)
    expect(container.querySelectorAll('[data-slot="leaderboard-podium-card"]')).toHaveLength(0)
    rerender(<Leaderboard items={ITEMS} columns={COLUMNS} variant="podium" podiumCount={2} />)
    expect(container.querySelectorAll('[data-slot="leaderboard-podium-card"]')).toHaveLength(2)
  })

  it('filters rows as the user searches, and hides the podium while a query is active', () => {
    const { container } = render(
      <Leaderboard items={ITEMS} columns={COLUMNS} variant="podium" searchable searchPlaceholder="Search units" />,
    )
    const search = screen.getByRole('searchbox', { name: 'Search units' })
    fireEvent.change(search, { target: { value: 'bravo' } })
    expect(screen.getByText('Bravo unit')).toBeInTheDocument()
    expect(screen.queryByText('Alpha unit')).not.toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="leaderboard-podium-card"]')).toHaveLength(0)
  })

  it('clears the search on Escape', () => {
    render(<Leaderboard items={ITEMS} columns={COLUMNS} searchable />)
    const search = screen.getByRole('searchbox', { name: 'Search' })
    fireEvent.change(search, { target: { value: 'bravo' } })
    expect(screen.queryByText('Alpha unit')).not.toBeInTheDocument()
    fireEvent.keyDown(search, { key: 'Escape' })
    expect(screen.getByText('Alpha unit')).toBeInTheDocument()
  })

  it('activates a row with the mouse and with the keyboard when onItemClick is given', () => {
    const onItemClick = vi.fn()
    render(<Leaderboard items={ITEMS} columns={COLUMNS} onItemClick={onItemClick} />)
    const row = screen.getAllByRole('row')[1]
    expect(row).toHaveAttribute('tabindex', '0')
    fireEvent.click(row)
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(onItemClick).toHaveBeenCalledTimes(2)
    expect(onItemClick).toHaveBeenCalledWith('a')
  })

  it('activates a podium card with the keyboard', () => {
    const onItemClick = vi.fn()
    const { container } = render(
      <Leaderboard items={ITEMS} columns={COLUMNS} variant="podium" onItemClick={onItemClick} />,
    )
    const card = container.querySelector('[data-slot="leaderboard-podium-card"]')!
    fireEvent.keyDown(card, { key: ' ' })
    expect(onItemClick).toHaveBeenCalledWith('a')
  })

  it('renders the loading and empty states', () => {
    const { rerender } = render(<Leaderboard items={ITEMS} columns={COLUMNS} loading />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    rerender(<Leaderboard items={[]} columns={COLUMNS} emptyState="No units match this filter" />)
    expect(screen.getByText('No units match this filter')).toBeInTheDocument()
  })

  it('exposes the scrolling body as a labelled region', () => {
    render(<Leaderboard items={ITEMS} columns={COLUMNS} ariaLabel="Unit ranking" bodyMaxHeight="20rem" />)
    const region = screen.getByRole('region', { name: 'Unit ranking' })
    expect(region).toHaveAttribute('tabindex', '0')
  })

  it('renders the rank column by default', () => {
    render(<Leaderboard items={ITEMS} columns={COLUMNS} ariaLabel="Board" />)
    expect(screen.getByRole('columnheader', { name: 'Rank' })).toBeInTheDocument()
  })

  it('drops the rank column with showRank={false} and keeps movement visible', () => {
    render(
      <Leaderboard
        items={[{ ...ITEMS[0], movement: { direction: 'up', value: 2 } }]}
        columns={COLUMNS}
        showRank={false}
        entityLabel="Vehicle"
        ariaLabel="Board"
      />,
    )
    expect(screen.queryByRole('columnheader', { name: 'Rank' })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Vehicle' })).toBeInTheDocument()
    // Movement lives on the rank column; with no rank column it re-homes onto
    // the entity block rather than disappearing.
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('paints the podium in the ordinal medal family, never the reserved error tint', () => {
    const { container } = render(
      <Leaderboard items={ITEMS} columns={COLUMNS} variant="podium" podiumCount={3} ariaLabel="Board" />,
    )
    const cards = container.querySelectorAll('[data-slot="leaderboard-podium-card"]')
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      expect(card.className).not.toMatch(/bg-error|border-destructive/)
    }
    expect(cards[0].className).toContain('bg-medal-gold-surface')
  })


  // Round-2 visual QA #5: `rowHeight="lg"` (py-5) measured a ~61px pitch, so
  // only 5 of Figma's 7 rows fitted a 500px card and row 6 was sliced. The
  // pitch is now a deterministic 8 + 32 + 8 = 48px, leaderboard-scoped —
  // `DataTable`'s default density for every other consumer is untouched.
  it('lays the ranked rows out at the 48px Figma pitch', () => {
    const { container } = render(
      <Leaderboard items={ITEMS} columns={COLUMNS} ariaLabel="Board" />,
    )
    const cell = container.querySelector('tbody td') as HTMLElement
    // `rowHeight="md"` → py-2 (0.5rem = 8px each side), NOT py-5.
    expect(cell.className).toContain('py-2')
    expect(cell.className).not.toContain('py-5')
    // …and each injected cell floors its content at 2rem = 32px.
    expect(cell.firstElementChild).toHaveClass('min-h-8')
    const entity = container.querySelectorAll('tbody tr td')[1] as HTMLElement
    expect(entity.firstElementChild).toHaveClass('min-h-8')
  })

  // Verdict V11: no affordance without a behaviour behind it. Same choice
  // `ListRow`/`CriticalEventsList` already make.
  it('renders inert table rows when no onItemClick is supplied', () => {
    const { container } = render(
      <Leaderboard items={ITEMS} columns={COLUMNS} ariaLabel="Board" />,
    )
    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row).not.toHaveAttribute('tabindex')
      expect(row).not.toHaveAttribute('role', 'button')
      expect(row.className).not.toContain('cursor-pointer')
      expect(row.className).not.toContain('hover:bg-muted')
      expect(row.querySelector('button, a, [role="button"]')).toBeNull()
    }
  })

  it('renders inert podium cards when no onItemClick is supplied', () => {
    const { container } = render(
      <Leaderboard items={ITEMS} columns={COLUMNS} variant="podium" ariaLabel="Board" />,
    )
    const cards = container.querySelectorAll('[data-slot="leaderboard-podium-card"]')
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      expect(card).not.toHaveAttribute('tabindex')
      expect(card).not.toHaveAttribute('role')
      expect(card.className).not.toContain('cursor-pointer')
      expect(card.className).not.toContain('hover:')
    }
  })

  it('turns rows and podium cards interactive ONLY when onItemClick is supplied', () => {
    const onItemClick = vi.fn()
    const { container } = render(
      <Leaderboard
        items={ITEMS}
        columns={COLUMNS}
        variant="podium"
        ariaLabel="Board"
        onItemClick={onItemClick}
      />,
    )
    const row = container.querySelector('tbody tr') as HTMLElement
    expect(row).toHaveAttribute('tabindex', '0')
    expect(row.className).toContain('cursor-pointer')
    const card = container.querySelector('[data-slot="leaderboard-podium-card"]') as HTMLElement
    expect(card).toHaveAttribute('role', 'button')
    expect(card).toHaveAttribute('tabindex', '0')
  })

  // The direction word the leaderboard's whole point depends on (QA UX #1):
  // rank 1 "up 1" and rank 2 "down 2" must not flatten to "1 1" / "2 2".
  it('exposes movement direction in the rank cell text', () => {
    const { container } = render(
      <Leaderboard items={ITEMS} columns={COLUMNS} ariaLabel="Board" />,
    )
    const rows = container.querySelectorAll('tbody tr')
    const first = (rows[0].querySelector('td') as HTMLElement).textContent
    const second = (rows[1].querySelector('td') as HTMLElement).textContent
    expect(first).toContain('up')
    expect(second).toContain('down')
    expect(first).not.toBe(second)
  })
})
