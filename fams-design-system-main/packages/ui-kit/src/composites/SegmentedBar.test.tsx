import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SegmentedBar, type SegmentedBarSegment } from './SegmentedBar'

const SEGMENTS: SegmentedBarSegment[] = [
  { id: 'washed', label: 'Washed', value: 70, colorIndex: 1 },
  { id: 'not-washed', label: 'Not Washed', value: 25, colorIndex: 4 },
  { id: 'untouched', label: 'Untouched', value: 5, colorIndex: 9 },
]

describe('SegmentedBar', () => {
  it('renders one segment per entry, each labelled with its value', () => {
    render(<SegmentedBar segments={SEGMENTS} />)
    expect(screen.getByRole('button', { name: 'Washed: 70' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Not Washed: 25' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Untouched: 5' })).toBeInTheDocument()
  })

  it('applies the colorIndex fill class to each segment', () => {
    render(<SegmentedBar segments={SEGMENTS} />)
    expect(screen.getByRole('button', { name: 'Washed: 70' })).toHaveClass('bg-chart-1')
    expect(screen.getByRole('button', { name: 'Not Washed: 25' })).toHaveClass('bg-chart-4')
    // colorIndex 9 cycles onto the 5-hue categorical palette: (9-1)%5+1 = 4
    expect(screen.getByRole('button', { name: 'Untouched: 5' })).toHaveClass('bg-chart-4')
  })

  it('sizes each segment proportionally to value / total', () => {
    render(<SegmentedBar segments={SEGMENTS} />)
    expect(screen.getByRole('button', { name: 'Washed: 70' })).toHaveStyle({ width: '70%' })
    expect(screen.getByRole('button', { name: 'Not Washed: 25' })).toHaveStyle({ width: '25%' })
    expect(screen.getByRole('button', { name: 'Untouched: 5' })).toHaveStyle({ width: '5%' })
  })

  it('skips segments with a zero value', () => {
    const withZero: SegmentedBarSegment[] = [
      ...SEGMENTS,
      { id: 'empty', label: 'Empty', value: 0, colorIndex: 2 },
    ]
    render(<SegmentedBar segments={withZero} />)
    expect(screen.queryByRole('button', { name: 'Empty: 0' })).not.toBeInTheDocument()
  })

  it('renders no visible label text when showLabels is unset', () => {
    render(<SegmentedBar segments={SEGMENTS} />)
    expect(screen.getByRole('button', { name: 'Washed: 70' })).toHaveTextContent('')
  })

  it('renders an inline label chip on a segment wide enough to hold it', () => {
    render(<SegmentedBar segments={SEGMENTS} showLabels />)
    // "Washed" is 70% — well above the inline-label threshold.
    expect(screen.getByRole('button', { name: 'Washed: 70' })).toHaveTextContent('Washed')
  })

  it('omits the inline label chip on a segment too narrow to hold it', () => {
    render(<SegmentedBar segments={SEGMENTS} showLabels />)
    // "Untouched" is 5% — below the inline-label threshold.
    expect(screen.getByRole('button', { name: 'Untouched: 5' })).toHaveTextContent('')
  })

  it('renders a muted empty track with an accessible label when the total is zero', () => {
    render(<SegmentedBar segments={[]} data-testid="bar" />)
    const bar = screen.getByTestId('bar')
    expect(bar).toHaveAttribute('data-state', 'empty')
    expect(bar).toHaveClass('bg-muted')
    expect(screen.getByRole('img', { name: 'No data' })).toBeInTheDocument()
  })

  it('accepts a custom emptyLabel', () => {
    const allZero: SegmentedBarSegment[] = [{ id: 'a', label: 'A', value: 0, colorIndex: 1 }]
    render(<SegmentedBar segments={allZero} emptyLabel="Nothing recorded" />)
    expect(screen.getByRole('img', { name: 'Nothing recorded' })).toBeInTheDocument()
  })

  it('applies the size variant height', () => {
    render(<SegmentedBar segments={SEGMENTS} size="lg" data-testid="bar" />)
    expect(screen.getByTestId('bar')).toHaveClass('h-4')
  })

  it('uses a custom aria-label on the group', () => {
    render(<SegmentedBar segments={SEGMENTS} aria-label="Bin wash status" />)
    expect(screen.getByRole('group', { name: 'Bin wash status' })).toBeInTheDocument()
  })

  it('forwards the ref to the underlying div', () => {
    const ref = createRef<HTMLDivElement>()
    render(<SegmentedBar segments={SEGMENTS} ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('merges a consumer className with the base classes', () => {
    render(<SegmentedBar segments={SEGMENTS} className="ms-2" data-testid="bar" />)
    expect(screen.getByTestId('bar')).toHaveClass('ms-2', 'flex')
  })
})
