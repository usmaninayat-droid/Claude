import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Stepper, type StepperStep } from './Stepper'

const STEPS: StepperStep[] = [
  { label: 'Basic info', description: 'Name and category' },
  { label: 'Details' },
  { label: 'Review' },
]

describe('Stepper', () => {
  it('renders every step label and description', () => {
    render(<Stepper steps={STEPS} current={0} />)
    expect(screen.getByText('Basic info')).toBeInTheDocument()
    expect(screen.getByText('Name and category')).toBeInTheDocument()
    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()
  })

  it('marks steps before `current` as completed with a check icon, not a number', () => {
    const { container } = render(<Stepper steps={STEPS} current={2} />)
    const markers = container.querySelectorAll('[data-slot="stepper-marker"]')
    expect(markers[0].querySelector('svg')).toBeInTheDocument()
    expect(markers[0]).not.toHaveTextContent('1')
    expect(markers[1].querySelector('svg')).toBeInTheDocument()
  })

  it('renders the step number for current and upcoming steps', () => {
    const { container } = render(<Stepper steps={STEPS} current={1} />)
    const markers = container.querySelectorAll('[data-slot="stepper-marker"]')
    expect(markers[1]).toHaveTextContent('2')
    expect(markers[2]).toHaveTextContent('3')
  })

  it('renders a caller-provided icon in place of the index digit on current/upcoming steps', () => {
    const icon = <svg data-testid="custom-icon" />
    const steps: StepperStep[] = [
      { label: 'Basic info', icon: <svg data-testid="icon-0" /> },
      { label: 'Trigger rule', icon },
      { label: 'Review', icon: <svg data-testid="icon-2" /> },
    ]
    const { container } = render(<Stepper steps={steps} current={1} />)
    const markers = container.querySelectorAll('[data-slot="stepper-marker"]')
    // current step (index 1): icon renders, no digit
    expect(markers[1].querySelector('[data-testid="custom-icon"]')).toBeInTheDocument()
    expect(markers[1]).not.toHaveTextContent('2')
    // upcoming step (index 2): icon renders, no digit
    expect(markers[2].querySelector('[data-testid="icon-2"]')).toBeInTheDocument()
    expect(markers[2]).not.toHaveTextContent('3')
  })

  it('NEVER replaces the completed checkmark with a per-step icon (B3, non-negotiable)', () => {
    const steps: StepperStep[] = [
      { label: 'Basic info', icon: <svg data-testid="icon-0" /> },
      { label: 'Trigger rule', icon: <svg data-testid="icon-1" /> },
    ]
    const { container } = render(<Stepper steps={steps} current={1} />)
    const markers = container.querySelectorAll('[data-slot="stepper-marker"]')
    // step 0 is completed: check icon, NOT its own custom icon
    expect(markers[0].querySelector('[data-testid="icon-0"]')).not.toBeInTheDocument()
    expect(markers[0].querySelector('svg')).toBeInTheDocument()
  })

  it('sets aria-current="step" only on the current step\'s button', () => {
    render(<Stepper steps={STEPS} current={1} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).not.toHaveAttribute('aria-current')
    expect(buttons[1]).toHaveAttribute('aria-current', 'step')
    expect(buttons[2]).not.toHaveAttribute('aria-current')
  })

  it('renders one connector fewer than the number of steps', () => {
    const { container } = render(<Stepper steps={STEPS} current={0} />)
    // one connector between each pair of steps: n-1 for n steps
    const connectors = container.querySelectorAll('[data-slot="stepper-connector"]')
    expect(connectors).toHaveLength(STEPS.length - 1)
  })

  it('defaults to horizontal orientation', () => {
    const { container } = render(<Stepper steps={STEPS} current={0} />)
    const list = container.querySelector('ol')
    expect(list).toHaveClass('w-full')
    expect(list).not.toHaveClass('flex-col')
  })

  it('switches to a vertical column layout when orientation="vertical"', () => {
    const { container } = render(<Stepper steps={STEPS} current={0} orientation="vertical" />)
    const list = container.querySelector('ol')
    expect(list).toHaveClass('flex-col')
  })

  it('uses nav semantics with an accessible label', () => {
    render(<Stepper steps={STEPS} current={0} />)
    expect(screen.getByRole('navigation', { name: 'Progress' })).toBeInTheDocument()
  })

  it('forwards the ref to the nav element', () => {
    const ref = createRef<HTMLElement>()
    render(<Stepper ref={ref} steps={STEPS} current={0} />)
    expect(ref.current?.tagName).toBe('NAV')
  })

  describe('B3 nav-button semantics (numbered variant)', () => {
    it('renders every step as a real button, even with no onStepSelect at all', () => {
      render(<Stepper steps={STEPS} current={1} />)
      expect(screen.getAllByRole('button')).toHaveLength(STEPS.length)
    })

    it('gives every step an accessible name carrying its position, label, and state', () => {
      render(<Stepper steps={STEPS} current={1} />)
      expect(screen.getByRole('button', { name: 'Step 1 of 3, Basic info, completed' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Step 2 of 3, Details, current' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Step 3 of 3, Review' })).toBeInTheDocument()
    })

    it('disables upcoming/unvalidated steps with BOTH disabled and aria-disabled — never silently inert', () => {
      render(<Stepper steps={STEPS} current={1} onStepSelect={() => {}} />)
      const upcoming = screen.getByRole('button', { name: 'Step 3 of 3, Review' })
      expect(upcoming).toBeDisabled()
      expect(upcoming).toHaveAttribute('aria-disabled', 'true')
    })

    it('makes a completed step activatable to go back and calls onStepSelect', () => {
      const onStepSelect = vi.fn()
      render(<Stepper steps={STEPS} current={2} onStepSelect={onStepSelect} />)
      const completed = screen.getByRole('button', { name: 'Step 1 of 3, Basic info, completed' })
      expect(completed).not.toBeDisabled()
      fireEvent.click(completed)
      expect(onStepSelect).toHaveBeenCalledWith(0)
    })

    it('disables every step (informational only) when no onStepSelect is provided', () => {
      render(<Stepper steps={STEPS} current={2} />)
      for (const button of screen.getAllByRole('button')) {
        expect(button).toBeDisabled()
        expect(button).toHaveAttribute('aria-disabled', 'true')
      }
    })
  })

  describe('tabs variant', () => {
    it('renders a text-tab header with the active tab current', () => {
      render(<Stepper variant="tabs" steps={STEPS} current={1} />)
      const nav = screen.getByRole('navigation', { name: 'Progress' })
      expect(nav).toHaveAttribute('data-variant', 'tabs')
      expect(screen.getByRole('button', { name: 'Step 2 of 3, Details, current' })).toHaveAttribute(
        'aria-current',
        'step',
      )
    })

    it('makes visited steps clickable and calls onStepSelect (back only)', () => {
      const onStepSelect = vi.fn()
      render(<Stepper variant="tabs" steps={STEPS} current={2} onStepSelect={onStepSelect} />)
      // A prior step's button is enabled; a future step's is disabled.
      fireEvent.click(screen.getByRole('button', { name: 'Step 1 of 3, Basic info, completed' }))
      expect(onStepSelect).toHaveBeenCalledWith(0)
    })

    it('disables future steps rather than omitting them', () => {
      render(<Stepper variant="tabs" steps={STEPS} current={0} onStepSelect={() => {}} />)
      expect(screen.getByRole('button', { name: 'Step 3 of 3, Review' })).toBeDisabled()
    })
  })
})
