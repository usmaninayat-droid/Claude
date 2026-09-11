import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RadioGroup, RadioGroupItem } from './RadioGroup'

function renderGroup(props: Partial<ComponentProps<typeof RadioGroup>> = {}) {
  return render(
    <RadioGroup aria-label="lot" {...props}>
      <RadioGroupItem value="lot-1" aria-label="Lot 1" />
      <RadioGroupItem value="lot-2" aria-label="Lot 2" />
      <RadioGroupItem value="lot-3" aria-label="Lot 3" disabled />
    </RadioGroup>,
  )
}

describe('RadioGroup', () => {
  it('renders a radiogroup with radio items', () => {
    renderGroup()
    expect(screen.getByRole('radiogroup', { name: 'lot' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('reflects the selected value via data-state', () => {
    renderGroup({ defaultValue: 'lot-2' })
    expect(screen.getByRole('radio', { name: 'Lot 2' })).toHaveAttribute(
      'data-state',
      'checked',
    )
    expect(screen.getByRole('radio', { name: 'Lot 1' })).toHaveAttribute(
      'data-state',
      'unchecked',
    )
  })

  it('calls onValueChange when a different item is selected', () => {
    const onValueChange = vi.fn()
    renderGroup({ defaultValue: 'lot-1', onValueChange })
    fireEvent.click(screen.getByRole('radio', { name: 'Lot 2' }))
    expect(onValueChange).toHaveBeenCalledWith('lot-2')
  })

  it('disables an individual item', () => {
    renderGroup()
    expect(screen.getByRole('radio', { name: 'Lot 3' })).toBeDisabled()
  })

  it('disables the whole group', () => {
    renderGroup({ disabled: true })
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled()
    }
  })

  it('applies the checked border-primary state class', () => {
    renderGroup({ defaultValue: 'lot-1' })
    expect(screen.getByRole('radio', { name: 'Lot 1' })).toHaveClass(
      'data-[state=checked]:border-primary',
    )
  })

  it('forwards a ref on the item', () => {
    let node: HTMLButtonElement | null = null
    render(
      <RadioGroup aria-label="lot">
        <RadioGroupItem
          value="lot-1"
          aria-label="Lot 1"
          ref={(el) => {
            node = el
          }}
        />
      </RadioGroup>,
    )
    expect(node).toBeInstanceOf(HTMLButtonElement)
  })
})
