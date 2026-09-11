import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClusterBadge, clusterBadgeTier, formatClusterCount } from './ClusterBadge'

describe('clusterBadgeTier — the 99/999/9,999/99,999 size ladder', () => {
  it.each([
    [1, 32],
    [99, 32],
    [100, 40],
    [999, 40],
    [1000, 48],
    [9999, 48],
    [10000, 56],
    [99999, 56],
    [250000, 56],
  ] as const)('count %i → %ipx tier', (count, size) => {
    expect(clusterBadgeTier(count)).toBe(size)
  })
})

describe('formatClusterCount', () => {
  it('comma-groups from 1,000 up and leaves small counts plain', () => {
    expect(formatClusterCount(99)).toBe('99')
    expect(formatClusterCount(999)).toBe('999')
    expect(formatClusterCount(1000)).toBe('1,000')
    expect(formatClusterCount(10000)).toBe('10,000')
  })
})

describe('ClusterBadge', () => {
  it('renders the formatted count with an accessible cluster label', () => {
    render(<ClusterBadge count={10000} />)
    const badge = screen.getByRole('img', { name: 'Cluster of 10,000' })
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('10,000')
  })

  it('sizes itself by tier (56px outer / 42px inner for a 10k cluster)', () => {
    render(<ClusterBadge count={10000} data-testid="badge" />)
    const badge = screen.getByTestId('badge')
    expect(badge.style.width).toBe('56px')
    const coin = badge.querySelector<HTMLElement>('span > span, span span')
    expect(coin?.style.width).toBe('42px')
  })

  it('honours an explicit size override', () => {
    render(<ClusterBadge count={4} size={48} data-testid="badge" />)
    expect(screen.getByTestId('badge').style.width).toBe('48px')
  })

  /* Round-1 visual #34: EXACTLY three arcs, separated by gaps, and never a
     fourth grey non-reporting arc. */
  it('draws exactly three gapped arcs — moving / idling / stopped — and no non-reporting arc', () => {
    render(
      <ClusterBadge
        count={100}
        data-testid="badge"
        segments={[
          { tone: 'success', count: 50 },
          { tone: 'warning', count: 25 },
          { tone: 'error', count: 25 },
          { tone: 'muted', count: 20 },
        ]}
      />,
    )
    const badge = screen.getByTestId('badge')
    const arcs = badge.querySelectorAll('circle[data-tone]')
    expect(arcs).toHaveLength(3)
    expect([...arcs].map((a) => a.getAttribute('data-tone'))).toEqual([
      'success',
      'warning',
      'error',
    ])
    // Non-reporting members never take a share of the ring.
    expect(badge.querySelector('circle[data-tone="muted"]')).toBeNull()
    // Every arc is shortened by the 2-unit gap, so consecutive arcs never touch.
    expect(arcs[0]).toHaveAttribute('stroke-dasharray', '48 52')
    expect(arcs[1]).toHaveAttribute('stroke-dasharray', '23 77')
    expect(arcs[1]).toHaveAttribute('stroke-dashoffset', '-51')
    expect(arcs[2]).toHaveAttribute('stroke-dashoffset', '-76')
    // No grey track behind the gaps either — that WAS the fourth segment.
    expect(badge.querySelectorAll('circle')).toHaveLength(3)
  })

  /* The ring drops the non-reporting arc but the COUNT must stay reachable. */
  it('keeps the full status mix — non-reporting included — in the accessible name', () => {
    render(
      <ClusterBadge
        count={120}
        segments={[
          { tone: 'success', count: 50, label: 'moving' },
          { tone: 'warning', count: 25, label: 'idling' },
          { tone: 'error', count: 25, label: 'stopped' },
          { tone: 'muted', count: 20, label: 'non-reporting' },
        ]}
      />,
    )
    expect(
      screen.getByRole('img', {
        name: 'Cluster of 120: 50 moving, 25 idling, 25 stopped, 20 non-reporting',
      }),
    ).toBeInTheDocument()
  })

  it('leaves the name as the bare count when no segment carries a label', () => {
    // The map layer usually spells the mix out on its own click target; the
    // badge does not double it up unless asked.
    render(
      <ClusterBadge
        count={3}
        segments={[
          { tone: 'success', count: 2 },
          { tone: 'muted', count: 1 },
        ]}
      />,
    )
    expect(screen.getByRole('img', { name: 'Cluster of 3' })).toBeInTheDocument()
  })

  it('strokes the donut with the cluster status palette — orange is warning-500 (SPEC §1)', () => {
    render(
      <ClusterBadge
        count={30}
        data-testid="badge"
        segments={[
          { tone: 'success', count: 10 },
          { tone: 'warning', count: 10 },
          { tone: 'error', count: 10 },
        ]}
      />,
    )
    const arcs = screen.getByTestId('badge').querySelectorAll('circle[data-tone]')
    expect(arcs[0]).toHaveAttribute('stroke', 'var(--color-success)')
    // The cluster ring's orange is warning-500 (--color-warning), deliberately
    // NOT the single marker's idle ring (warning-600) — don't "unify" them.
    expect(arcs[1]).toHaveAttribute('stroke', 'var(--color-warning)')
    expect(arcs[2]).toHaveAttribute('stroke', 'var(--color-destructive)')
  })

  it('keeps the dark count coin sized to the tier and the count comma-formatted', () => {
    render(<ClusterBadge count={9999} data-testid="badge" />)
    const badge = screen.getByTestId('badge')
    expect(badge.style.width).toBe('48px')
    expect(badge).toHaveTextContent('9,999')
    const coin = badge.querySelector<HTMLElement>('span.bg-foreground')
    expect(coin?.style.width).toBe('36px')
    expect(coin?.className).toContain('text-background')
  })

  it('renders only the base ring when no segments are given', () => {
    render(<ClusterBadge count={12} data-testid="badge" />)
    const badge = screen.getByTestId('badge')
    expect(badge.querySelectorAll('circle[data-tone]')).toHaveLength(0)
    expect(badge.querySelectorAll('circle')).toHaveLength(1)
  })
})
