import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from './Select'

function renderSelect() {
  return render(
    <Select>
      <SelectTrigger aria-label="lot">
        <SelectValue placeholder="Select a lot…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="lot-1">Lot 1</SelectItem>
        <SelectItem value="lot-2">Lot 2</SelectItem>
      </SelectContent>
    </Select>,
  )
}

describe('Select', () => {
  it('renders a combobox trigger', () => {
    renderSelect()
    expect(screen.getByRole('combobox', { name: 'lot' })).toBeInTheDocument()
  })

  it('shows the placeholder when nothing is selected', () => {
    renderSelect()
    expect(screen.getByText('Select a lot…')).toBeInTheDocument()
  })

  it('styles the trigger with the input-background fill token', () => {
    renderSelect()
    expect(screen.getByRole('combobox', { name: 'lot' })).toHaveClass(
      'bg-input-background',
    )
  })

  it('positions the item checkmark with a logical (RTL-safe) inset, not a physical one', () => {
    render(
      <Select defaultOpen value="lot-1">
        <SelectTrigger aria-label="lot">
          <SelectValue placeholder="Select a lot…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="lot-1">Lot 1</SelectItem>
        </SelectContent>
      </Select>,
    )
    const indicatorWrapper = screen.getByRole('option', { name: 'Lot 1' })
      .lastElementChild
    expect(indicatorWrapper).toHaveClass('end-2')
    expect(indicatorWrapper?.className).not.toMatch(/(?:^|\s)(left|right)-\d/)
  })

  describe('float-label mode (Figma 4834:5550)', () => {
    it('renders label, required asterisk and hint', () => {
      render(
        <Select>
          <SelectTrigger label="Input Label Text" required hint="This is a hint text to help user.">
            <SelectValue placeholder="2 Items Selected" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">A</SelectItem>
          </SelectContent>
        </Select>,
      )
      expect(screen.getByText('Input Label Text')).toBeInTheDocument()
      expect(screen.getByText('*')).toBeInTheDocument()
      expect(screen.getByText('This is a hint text to help user.')).toBeInTheDocument()
    })

    it('hasError styles the hint as an alert', () => {
      render(
        <Select>
          <SelectTrigger label="L" hint="Bad" hasError>
            <SelectValue placeholder="p" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">A</SelectItem>
          </SelectContent>
        </Select>,
      )
      expect(screen.getByRole('alert')).toHaveTextContent('Bad')
    })
  })
  describe('value-slot truncation scoping', () => {
    it('tags SelectValue with data-slot and truncates only that slot', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">A</SelectItem>
          </SelectContent>
        </Select>,
      )
      const trigger = screen.getByRole('combobox')
      expect(trigger.querySelector('[data-slot="select-value"]')).not.toBeNull()
      // The truncation is scoped to the value slot, never any direct-child span.
      expect(trigger.className).toContain('[&>[data-slot=select-value]]:line-clamp-1')
      expect(trigger.className).not.toContain('[&>span]:line-clamp-1')
    })

    it('leaves a custom icon+label wrapper alone (the -webkit-box regression)', () => {
      render(
        <Select>
          <SelectTrigger>
            <span data-testid="custom" className="flex items-center gap-2">
              <svg aria-hidden />
              <span>Criticality</span>
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">A</SelectItem>
          </SelectContent>
        </Select>,
      )
      const custom = screen.getByTestId('custom')
      expect(custom).toHaveClass('flex')
      expect(custom).not.toHaveAttribute('data-slot', 'select-value')
      // No selector in the trigger can reach an arbitrary child span any more.
      expect(screen.getByRole('combobox').className).not.toMatch(/\[&>span\]/)
    })
  })
})
