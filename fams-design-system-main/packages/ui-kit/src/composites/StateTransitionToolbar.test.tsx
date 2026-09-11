import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  StateTransitionToolbar,
  getForwardTransitions,
  type StateTransition,
  type TransitionStage,
} from './StateTransitionToolbar'

const CURRENT_STAGE: TransitionStage = { id: 'pending', label: 'Pending', tone: 'warning' }

const TRANSITIONS: StateTransition[] = [
  { toStageId: 'approved', label: 'Approve', variant: 'primary' },
  { toStageId: 'rejected', label: 'Reject', variant: 'destructive' },
  { toStageId: 'on-hold', label: 'Put on hold', variant: 'outline' },
]

describe('StateTransitionToolbar', () => {
  it('renders the current stage as a badge', () => {
    render(<StateTransitionToolbar currentStage={CURRENT_STAGE} transitions={[]} />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders one button per transition, labelled correctly', () => {
    render(<StateTransitionToolbar currentStage={CURRENT_STAGE} transitions={TRANSITIONS} />)
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Put on hold' })).toBeInTheDocument()
  })

  it('renders nothing but the badge when transitions is empty', () => {
    render(<StateTransitionToolbar currentStage={CURRENT_STAGE} transitions={[]} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('applies destructive treatment to a destructive transition', () => {
    render(<StateTransitionToolbar currentStage={CURRENT_STAGE} transitions={TRANSITIONS} />)
    expect(screen.getByRole('button', { name: 'Reject' })).toHaveClass('bg-destructive')
  })

  it('applies primary treatment to a primary transition', () => {
    render(<StateTransitionToolbar currentStage={CURRENT_STAGE} transitions={TRANSITIONS} />)
    expect(screen.getByRole('button', { name: 'Approve' })).toHaveClass('bg-primary')
  })

  it('defaults an unspecified variant to the outline treatment', () => {
    render(<StateTransitionToolbar currentStage={CURRENT_STAGE} transitions={TRANSITIONS} />)
    expect(screen.getByRole('button', { name: 'Put on hold' })).toHaveClass('border-border')
  })

  it('calls onTransition with the target stage id when a button is clicked', () => {
    const onTransition = vi.fn()
    render(<StateTransitionToolbar currentStage={CURRENT_STAGE} transitions={TRANSITIONS} onTransition={onTransition} />)
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onTransition).toHaveBeenCalledWith('approved')
  })

  it('disables every transition button when disabled is set', () => {
    render(<StateTransitionToolbar currentStage={CURRENT_STAGE} transitions={TRANSITIONS} disabled />)
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Put on hold' })).toBeDisabled()
  })

  it('does not render a collapse control when onCollapse is omitted', () => {
    render(<StateTransitionToolbar currentStage={CURRENT_STAGE} transitions={TRANSITIONS} />)
    expect(screen.queryByRole('button', { name: 'Collapse' })).not.toBeInTheDocument()
  })

  it('renders a labelled collapse control and calls onCollapse when clicked', () => {
    const onCollapse = vi.fn()
    render(<StateTransitionToolbar currentStage={CURRENT_STAGE} transitions={TRANSITIONS} onCollapse={onCollapse} />)
    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }))
    expect(onCollapse).toHaveBeenCalledTimes(1)
  })

  it('forwards the ref to the root element', () => {
    const ref = createRef<HTMLDivElement>()
    render(<StateTransitionToolbar ref={ref} currentStage={CURRENT_STAGE} transitions={[]} />)
    expect(ref.current?.dataset.slot).toBe('state-transition-toolbar')
  })

  it('applies the uppercase letter-spaced toolbar-tag treatment to action buttons', () => {
    render(<StateTransitionToolbar currentStage={CURRENT_STAGE} transitions={TRANSITIONS} />)
    expect(screen.getByRole('button', { name: 'Approve' })).toHaveClass(
      'uppercase',
      'tracking-wide',
      'text-caption',
      'font-semibold',
    )
  })
})

describe('getForwardTransitions', () => {
  const STAGES = [
    { id: 'draft', label: 'Draft' },
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'closed', label: 'Closed' },
  ]

  it('returns a transition for every stage after the current one, in order', () => {
    expect(getForwardTransitions(STAGES, 'pending')).toEqual([
      { toStageId: 'approved', label: 'Approved' },
      { toStageId: 'closed', label: 'Closed' },
    ])
  })

  it('returns an empty array when the current stage is the last one', () => {
    expect(getForwardTransitions(STAGES, 'closed')).toEqual([])
  })

  it('returns an empty array when the current stage id is not found', () => {
    expect(getForwardTransitions(STAGES, 'unknown')).toEqual([])
  })

  it('returns all stages when the current stage is first', () => {
    expect(getForwardTransitions(STAGES, 'draft')).toEqual([
      { toStageId: 'pending', label: 'Pending' },
      { toStageId: 'approved', label: 'Approved' },
      { toStageId: 'closed', label: 'Closed' },
    ])
  })
})
