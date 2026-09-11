import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AlertTriangle, Check, Minus, X } from '../icons'
import { ChecklistSection, type ChecklistItemData, type ChecklistItemState } from './ChecklistSection'

const ITEMS: ChecklistItemData[] = [
  { id: 'a', label: 'Seatbelt fastened' },
  { id: 'b', label: 'Mirrors adjusted' },
  { id: 'c', label: 'Fuel level checked' },
]

const FOUR_STATES: ChecklistItemState[] = [
  { id: 'pending', label: 'Pending', tone: 'neutral', icon: Minus },
  { id: 'pass', label: 'Pass', tone: 'success', icon: Check },
  { id: 'fail', label: 'Fail', tone: 'danger', icon: X },
  { id: 'na', label: 'N/A', tone: 'neutral', icon: AlertTriangle },
]

describe('ChecklistSection', () => {
  it('renders every item label', () => {
    render(<ChecklistSection items={ITEMS} value={{}} />)
    expect(screen.getByText('Seatbelt fastened')).toBeInTheDocument()
    expect(screen.getByText('Mirrors adjusted')).toBeInTheDocument()
    expect(screen.getByText('Fuel level checked')).toBeInTheDocument()
  })

  it('shows the completion count in the header', () => {
    render(<ChecklistSection items={ITEMS} value={{ a: 'checked' }} />)
    expect(screen.getByText('1/3')).toBeInTheDocument()
  })

  describe('binary mode (default states)', () => {
    it('renders each item as a checkbox, unchecked by default', () => {
      render(<ChecklistSection items={ITEMS} value={{}} />)
      const boxes = screen.getAllByRole('checkbox')
      expect(boxes).toHaveLength(3)
      expect(boxes[0]).toHaveAttribute('aria-checked', 'false')
    })

    it('reflects a checked item from `value`', () => {
      render(<ChecklistSection items={ITEMS} value={{ a: 'checked' }} />)
      const boxes = screen.getAllByRole('checkbox')
      expect(boxes[0]).toHaveAttribute('aria-checked', 'true')
    })

    it('fires onToggle with the next state id when clicked', () => {
      const onToggle = vi.fn()
      render(<ChecklistSection items={ITEMS} value={{}} onToggle={onToggle} />)
      fireEvent.click(screen.getAllByRole('checkbox')[0])
      expect(onToggle).toHaveBeenCalledWith('a', 'checked')
    })

    it('fires onToggle back to the default state when un-checking', () => {
      const onToggle = vi.fn()
      render(<ChecklistSection items={ITEMS} value={{ a: 'checked' }} onToggle={onToggle} />)
      fireEvent.click(screen.getAllByRole('checkbox')[0])
      expect(onToggle).toHaveBeenCalledWith('a', 'unchecked')
    })
  })

  describe('multi-state mode (states prop)', () => {
    it('renders one button per non-default state, per item', () => {
      render(<ChecklistSection items={ITEMS} states={FOUR_STATES} value={{}} />)
      // 3 states (pass/fail/na) x 3 items = 9 buttons
      expect(screen.getAllByRole('button', { name: 'Pass' })).toHaveLength(3)
      expect(screen.getAllByRole('button', { name: 'Fail' })).toHaveLength(3)
      expect(screen.getAllByRole('button', { name: 'N/A' })).toHaveLength(3)
    })

    it('marks the current state button as pressed', () => {
      render(<ChecklistSection items={ITEMS} states={FOUR_STATES} value={{ a: 'pass' }} />)
      const passButtons = screen.getAllByRole('button', { name: 'Pass' })
      expect(passButtons[0]).toHaveAttribute('aria-pressed', 'true')
    })

    it('fires onToggle with the clicked state id', () => {
      const onToggle = vi.fn()
      render(<ChecklistSection items={ITEMS} states={FOUR_STATES} value={{}} onToggle={onToggle} />)
      fireEvent.click(screen.getAllByRole('button', { name: 'Fail' })[1])
      expect(onToggle).toHaveBeenCalledWith('b', 'fail')
    })

    it('fires onToggle back to the default state when clicking the already-active state', () => {
      const onToggle = vi.fn()
      render(
        <ChecklistSection items={ITEMS} states={FOUR_STATES} value={{ c: 'na' }} onToggle={onToggle} />,
      )
      fireEvent.click(screen.getAllByRole('button', { name: 'N/A' })[2])
      expect(onToggle).toHaveBeenCalledWith('c', 'pending')
    })

    it('counts completion as anything other than the first (default) state', () => {
      render(
        <ChecklistSection
          items={ITEMS}
          states={FOUR_STATES}
          value={{ a: 'pass', b: 'fail' }}
        />,
      )
      expect(screen.getByText('2/3')).toBeInTheDocument()
    })
  })

  it('disables all interaction when readOnly', () => {
    const onToggle = vi.fn()
    render(<ChecklistSection items={ITEMS} value={{}} onToggle={onToggle} readOnly />)
    const boxes = screen.getAllByRole('checkbox')
    boxes.forEach((box) => expect(box).toBeDisabled())
    fireEvent.click(boxes[0])
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('disables an individual item marked disabled, without affecting others', () => {
    const onToggle = vi.fn()
    const items: ChecklistItemData[] = [...ITEMS.slice(0, 1), { ...ITEMS[1], disabled: true }]
    render(<ChecklistSection items={items} value={{}} onToggle={onToggle} />)
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes[1]).toBeDisabled()
    expect(boxes[0]).not.toBeDisabled()
  })

  it('renders an empty state when items is empty', () => {
    render(<ChecklistSection items={[]} value={{}} emptyText="Nothing to check" />)
    expect(screen.getByText('Nothing to check')).toBeInTheDocument()
    expect(screen.getByText('0/0')).toBeInTheDocument()
  })

  it('renders the optional title', () => {
    render(<ChecklistSection items={ITEMS} value={{}} title="Pre-trip checklist" />)
    expect(screen.getByText('Pre-trip checklist')).toBeInTheDocument()
  })

  it('renders renderItemExtra content per item', () => {
    render(
      <ChecklistSection
        items={ITEMS}
        value={{ a: 'checked' }}
        renderItemExtra={(item, stateId) => <span>{item.id}:{stateId}</span>}
      />,
    )
    expect(screen.getByText('a:checked')).toBeInTheDocument()
    expect(screen.getByText('b:unchecked')).toBeInTheDocument()
  })

  it('forwards the ref to the root element', () => {
    const ref = createRef<HTMLDivElement>()
    render(<ChecklistSection items={ITEMS} value={{}} ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current).toHaveAttribute('data-slot', 'checklist-section')
  })

  it('merges a consumer className with the variant classes', () => {
    render(<ChecklistSection items={ITEMS} value={{}} className="ms-2" data-testid="section" />)
    expect(screen.getByTestId('section')).toHaveClass('ms-2', 'flex')
  })
})
