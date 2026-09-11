import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { FiltersSheet, type FiltersSheetSection, type FiltersSheetValue } from './FiltersSheet'

const SECTIONS: FiltersSheetSection[] = [
  {
    key: 'schedule',
    label: 'Schedule',
    fields: [
      { key: 'shift', label: 'Select Shift', type: 'select', options: [
        { value: 'morning', label: 'Morning' },
        { value: 'evening', label: 'Evening' },
      ] },
    ],
  },
  {
    key: 'tags',
    label: 'Tags',
    fields: [
      { key: 'tag', label: 'Select Tag', type: 'combobox', multiple: true, options: [
        { value: 'inspections', label: 'Inspections' },
        { value: 'stringer', label: 'Stringer' },
      ] },
    ],
  },
  {
    key: 'waste-types',
    label: 'Waste Types',
    fields: [
      { key: 'wasteTypes', label: 'Waste Types', type: 'checkbox-group', options: [
        { value: 'recyclables', label: 'Recyclables', count: 102 },
        { value: 'general', label: 'General', count: 102 },
      ] },
    ],
  },
]

function ControlledFiltersSheet(props: Partial<React.ComponentProps<typeof FiltersSheet>> = {}) {
  const [open, setOpen] = useState(true)
  const [value, setValue] = useState<FiltersSheetValue>({})
  return (
    <FiltersSheet
      open={open}
      onOpenChange={setOpen}
      sections={SECTIONS}
      value={value}
      onChange={setValue}
      {...props}
    />
  )
}

describe('FiltersSheet', () => {
  it('renders the title and every section as an accordion trigger', () => {
    render(<ControlledFiltersSheet />)
    expect(screen.getByText('All Filters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Schedule' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tags' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Waste Types' })).toBeInTheDocument()
  })

  it('sections are open by default and their fields are visible', () => {
    render(<ControlledFiltersSheet />)
    expect(screen.getByLabelText('Recyclables')).toBeInTheDocument()
    expect(screen.getByLabelText('General')).toBeInTheDocument()
  })

  it('collapses a section on trigger click', () => {
    render(<ControlledFiltersSheet />)
    const trigger = screen.getByRole('button', { name: 'Waste Types' })
    expect(trigger).toHaveAttribute('data-state', 'open')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('data-state', 'closed')
  })

  it('checking a checkbox-group option updates value via onChange', () => {
    function Harness() {
      const [value, setValue] = useState<FiltersSheetValue>({})
      return (
        <>
          <FiltersSheet open onOpenChange={() => {}} sections={SECTIONS} value={value} onChange={setValue} />
          <div data-testid="value">{JSON.stringify(value)}</div>
        </>
      )
    }
    render(<Harness />)
    fireEvent.click(screen.getByLabelText('Recyclables'))
    expect(screen.getByTestId('value')).toHaveTextContent('"wasteTypes":["recyclables"]')
  })

  it('shows the active-count badge when activeCount is set', () => {
    render(<ControlledFiltersSheet activeCount={4} />)
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('renders no footer when neither onApply nor onClear is provided', () => {
    render(<ControlledFiltersSheet />)
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument()
  })

  it('calls onApply with the current value when Apply is clicked', () => {
    const onApply = vi.fn()
    function Harness() {
      const [value, setValue] = useState<FiltersSheetValue>({ shift: 'morning' })
      return <FiltersSheet open onOpenChange={() => {}} sections={SECTIONS} value={value} onChange={setValue} onApply={onApply} />
    }
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onApply).toHaveBeenCalledWith({ shift: 'morning' })
  })

  it('calls onClear and empties the value when Clear all is clicked', () => {
    const onClear = vi.fn()
    function Harness() {
      const [value, setValue] = useState<FiltersSheetValue>({ shift: 'morning' })
      return (
        <>
          <FiltersSheet open onOpenChange={() => {}} sections={SECTIONS} value={value} onChange={setValue} onClear={onClear} />
          <div data-testid="value">{JSON.stringify(value)}</div>
        </>
      )
    }
    render(<Harness />)
    fireEvent.click(screen.getByText('Clear all'))
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('value')).toHaveTextContent('{}')
  })

  it('closes via the header close button', () => {
    const onOpenChange = vi.fn()
    render(
      <FiltersSheet open onOpenChange={onOpenChange} sections={SECTIONS} value={{}} onChange={() => {}} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not render when open is false', () => {
    render(<FiltersSheet open={false} onOpenChange={() => {}} sections={SECTIONS} value={{}} onChange={() => {}} />)
    expect(screen.queryByText('All Filters')).not.toBeInTheDocument()
  })

  it('supports a custom title', () => {
    render(<ControlledFiltersSheet title="Plan Monitoring Filters" />)
    expect(screen.getByText('Plan Monitoring Filters')).toBeInTheDocument()
  })
})
