import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EntityPickerDrawer, LinkedEntityChip, type EntityPickerItem } from './EntityPickerDrawer'

const ITEMS: EntityPickerItem[] = [
  { id: 'c1', label: 'Acme Corp', secondary: 'acme@example.com', tags: ['Company'] },
  { id: 'c2', label: 'Bilal Traders', secondary: 'bilal@example.com', tags: ['Company'] },
  { id: 'c3', label: 'Cedar Logistics', secondary: 'cedar@example.com' },
]

function Fixture({
  initialValue = [],
  multiple,
  items = ITEMS,
  onChange,
}: {
  initialValue?: string[]
  multiple?: boolean
  items?: EntityPickerItem[]
  onChange?: (value: string[]) => void
}) {
  const [open, setOpen] = useState(true)
  const [value, setValue] = useState<string[]>(initialValue)
  return (
    <EntityPickerDrawer
      open={open}
      onOpenChange={setOpen}
      items={items}
      value={value}
      multiple={multiple}
      entityLabel="contact"
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

describe('EntityPickerDrawer', () => {
  it('lists every given item when open', () => {
    render(<Fixture />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Bilal Traders')).toBeInTheDocument()
    expect(screen.getByText('Cedar Logistics')).toBeInTheDocument()
  })

  it('shows the empty state when there are zero items', () => {
    render(<Fixture items={[]} />)
    expect(screen.getByText('Nothing available to link yet.')).toBeInTheDocument()
  })

  it('shows the no-match state when the search matches nothing', () => {
    render(<Fixture />)
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'zzz' } })
    expect(screen.getByText('No contacts match “zzz”.')).toBeInTheDocument()
  })

  it('filters locally by label, secondary, and tags', () => {
    render(<Fixture />)
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'bilal' } })
    expect(screen.getByText('Bilal Traders')).toBeInTheDocument()
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument()
  })

  it('disables Confirm until at least one row is selected', () => {
    render(<Fixture />)
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
  })

  it('supports multi-select and pluralizes the confirm label', () => {
    render(<Fixture multiple />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Acme Corp' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Bilal Traders' }))
    expect(screen.getByRole('button', { name: 'Add 2 contacts' })).toBeEnabled()
  })

  it('keeps only the latest pick in single-select mode', () => {
    render(<Fixture multiple={false} />)
    fireEvent.click(screen.getByRole('radio', { name: /Acme Corp/ }))
    fireEvent.click(screen.getByRole('radio', { name: /Bilal Traders/ }))
    expect(screen.getByRole('button', { name: 'Add 1 contact' })).toBeEnabled()
  })

  it('reports the staged selection via onChange only on confirm, and closes', () => {
    const onChange = vi.fn()
    render(<Fixture onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Acme Corp' }))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 contact' }))
    expect(onChange).toHaveBeenCalledWith(['c1'])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('discards staged changes on cancel without calling onChange', () => {
    const onChange = vi.fn()
    render(<Fixture onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Acme Corp' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('seeds the draft from pre-selected ids on open', () => {
    render(<Fixture initialValue={['c2']} multiple />)
    expect(screen.getByRole('checkbox', { name: 'Select Bilal Traders' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Add 1 contact' })).toBeEnabled()
  })
})

describe('LinkedEntityChip', () => {
  it('renders the label', () => {
    render(<LinkedEntityChip label="Acme Corp" />)
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('renders no remove affordance when onRemove is omitted', () => {
    render(<LinkedEntityChip label="Acme Corp" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onRemove via a labelled, keyboard-reachable button', () => {
    const onRemove = vi.fn()
    render(<LinkedEntityChip label="Acme Corp" onRemove={onRemove} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Acme Corp' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
