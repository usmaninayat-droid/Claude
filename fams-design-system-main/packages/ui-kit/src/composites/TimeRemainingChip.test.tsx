import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimeRemainingChip } from './TimeRemainingChip'

describe('TimeRemainingChip', () => {
  it('renders the countdown text', () => {
    render(<TimeRemainingChip>2d 5h left</TimeRemainingChip>)
    expect(screen.getByText('2d 5h left')).toBeInTheDocument()
  })

  it('renders neutral gray text by default (not overdue)', () => {
    render(<TimeRemainingChip data-testid="chip">18h 20m left</TimeRemainingChip>)
    expect(screen.getByTestId('chip')).toHaveClass('text-muted-foreground')
    expect(screen.getByTestId('chip')).toHaveAttribute('data-state', 'normal')
  })

  it('swaps to the flame tint and data-state=overdue when overdue', () => {
    render(
      <TimeRemainingChip overdue data-testid="chip">
        +45m
      </TimeRemainingChip>,
    )
    expect(screen.getByTestId('chip')).toHaveClass('text-accent-family-flame-normal')
    expect(screen.getByTestId('chip')).toHaveAttribute('data-state', 'overdue')
  })

  it('renders a leading clock icon by default', () => {
    const { container } = render(<TimeRemainingChip>2d 5h left</TimeRemainingChip>)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('omits the icon when icon={null} (e.g. a terminal-state dash)', () => {
    const { container } = render(<TimeRemainingChip icon={null}>–</TimeRemainingChip>)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })
})
