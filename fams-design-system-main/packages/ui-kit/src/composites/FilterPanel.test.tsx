import { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import {
  FilterPanel,
  type FilterGroup,
  type FilterOption,
  type FilterValue,
} from './FilterPanel'

const GROUPS: FilterGroup[] = [
  {
    key: 'mobility',
    label: 'Mobility Status',
    options: [
      { value: 'moving', label: 'Moving', count: 10 },
      { value: 'stopped', label: 'Stopped', count: 4 },
      { value: 'idling', label: 'Idling', count: 2 },
    ],
  },
  {
    key: 'fuelType',
    label: 'Fuel Type',
    options: [
      { value: 'petrol', label: 'Petrol', count: 6 },
      { value: 'diesel', label: 'Diesel', count: 9 },
    ],
  },
]

const TAG_OPTIONS: FilterOption[] = [
  { value: 'lot-1', label: 'Lot 1' },
  { value: 'tajmee', label: "Tajmee'e" },
]

/** Controlled harness so `value` reflects the component's onChange. */
function Harness({
  initial,
  onClear,
}: {
  initial?: FilterValue
  onClear?: () => void
}) {
  const [value, setValue] = useState<FilterValue>(
    initial ?? { tags: [], groups: {} },
  )
  return (
    <>
      <div data-testid="tags">{value.tags.join(',')}</div>
      <div data-testid="groups">{JSON.stringify(value.groups)}</div>
      <FilterPanel
        groups={GROUPS}
        value={value}
        onChange={setValue}
        tagOptions={TAG_OPTIONS}
        onClear={onClear}
      />
    </>
  )
}

const tags = () => screen.getByTestId('tags').textContent
const groupsState = () =>
  JSON.parse(screen.getByTestId('groups').textContent || '{}') as Record<
    string,
    string[]
  >

describe('FilterPanel', () => {
  it('renders all groups with option labels and count badges', () => {
    render(<Harness />)
    expect(
      screen.getByRole('region', { name: 'Mobility Status' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Fuel Type' })).toBeInTheDocument()
    expect(screen.getByText('Moving')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('toggles an option into value.groups (checked → adds)', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Moving' }))
    expect(groupsState()).toEqual({ mobility: ['moving'] })
  })

  it('unchecking the last option in a group removes the group key', () => {
    render(<Harness initial={{ tags: [], groups: { mobility: ['moving'] } }} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Moving' }))
    expect(groupsState()).toEqual({})
  })

  it('within-group OR: multiple checks accumulate under one key', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Moving' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Stopped' }))
    expect(groupsState()).toEqual({ mobility: ['moving', 'stopped'] })
  })

  it('cross-group AND: checks in different groups produce separate keys', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Moving' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Diesel' }))
    expect(groupsState()).toEqual({ mobility: ['moving'], fuelType: ['diesel'] })
  })

  it('clear all resets value and fires onClear', () => {
    let cleared = false
    render(
      <Harness
        initial={{ tags: ['lot-1'], groups: { mobility: ['moving'] } }}
        onClear={() => {
          cleared = true
        }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(tags()).toBe('')
    expect(groupsState()).toEqual({})
    expect(cleared).toBe(true)
  })

  it('adds a tag via Enter and removes it via the chip button', () => {
    render(<Harness />)
    const input = screen.getByRole('combobox', { name: 'Add tag' })
    fireEvent.change(input, { target: { value: 'lot-1' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(tags()).toBe('lot-1')

    // Chip shows the resolved label and removes on click.
    fireEvent.click(screen.getByRole('button', { name: 'Remove Lot 1' }))
    expect(tags()).toBe('')
  })

  it('does not add duplicate tags', () => {
    render(<Harness initial={{ tags: ['lot-1'], groups: {} }} />)
    const input = screen.getByRole('combobox', { name: 'Add tag' })
    fireEvent.change(input, { target: { value: 'lot-1' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(tags()).toBe('lot-1')
  })

  it('renders under RTL (dir=rtl) without error', () => {
    const { container } = render(
      <div dir="rtl">
        <FilterPanel
          groups={GROUPS}
          value={{ tags: [], groups: {} }}
          onChange={() => {}}
          tagOptions={TAG_OPTIONS}
        />
      </div>,
    )
    expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument()
    expect(screen.getByText('All Filters')).toBeInTheDocument()
  })

  it('fires onClose when the close button is clicked', () => {
    let closed = false
    render(
      <FilterPanel
        groups={GROUPS}
        value={{ tags: [], groups: {} }}
        onChange={() => {}}
        onClose={() => {
          closed = true
        }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(closed).toBe(true)
  })

  it('the within-region checkbox is scoped to its group', () => {
    render(<Harness />)
    const mobility = screen.getByRole('region', { name: 'Mobility Status' })
    expect(within(mobility).getByText('Moving')).toBeInTheDocument()
    expect(within(mobility).queryByText('Diesel')).not.toBeInTheDocument()
  })
})
