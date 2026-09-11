import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PickerList, type PickerListOption } from './PickerList'

const OPTIONS: PickerListOption<string>[] = [
  { value: 'fahad', label: 'Fahad Al-Marri' },
  { value: 'layla', label: 'Layla Hassan' },
  { value: 'karim', label: 'Karim Aziz' },
]

describe('PickerList', () => {
  it('renders plain buttons with no option/listbox roles when selected is omitted', () => {
    render(<PickerList options={OPTIONS} onPick={() => {}} />)
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('renders every option as a listbox option once selected is passed', () => {
    render(<PickerList options={OPTIONS} onPick={() => {}} selected="fahad" ariaLabel="Inspectors" />)
    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.getByRole('listbox', { name: 'Inspectors' })).toBeInTheDocument()
  })

  it('fires onPick with the chosen value', () => {
    const onPick = vi.fn()
    render(<PickerList options={OPTIONS} onPick={onPick} />)
    screen.getByRole('button', { name: 'Layla Hassan' }).click()
    expect(onPick).toHaveBeenCalledWith('layla')
  })

  it('with no selected prop, no checkmark renders', () => {
    render(<PickerList options={OPTIONS} onPick={() => {}} />)
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('marks the option matching `selected` with aria-selected and a checkmark', () => {
    render(<PickerList options={OPTIONS} onPick={() => {}} selected="layla" ariaLabel="Inspectors" />)
    const selectedOption = screen.getByRole('option', { name: 'Layla Hassan' })
    expect(selectedOption).toHaveAttribute('aria-selected', 'true')
    expect(selectedOption.querySelector('svg')).toBeInTheDocument()

    const otherOption = screen.getByRole('option', { name: 'Fahad Al-Marri' })
    expect(otherOption).toHaveAttribute('aria-selected', 'false')
    expect(otherOption.querySelector('svg')).not.toBeInTheDocument()
  })

  it('treats a `selected` value with no matching option as nothing selected', () => {
    render(<PickerList options={OPTIONS} onPick={() => {}} selected="unknown" ariaLabel="Inspectors" />)
    for (const option of screen.getAllByRole('option')) {
      expect(option).toHaveAttribute('aria-selected', 'false')
    }
  })
})
