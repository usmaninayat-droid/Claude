import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns'
import { DateRangePicker, DEFAULT_RANGE_PRESETS, type DateRangePickerPreset } from './DateRangePicker'

const JAN_5 = new Date(2026, 0, 5)
const JAN_10 = new Date(2026, 0, 10)

const PRESETS: DateRangePickerPreset[] = [
  { label: 'Today', range: { from: JAN_5, to: JAN_5 } },
  { label: 'Last 7 days', range: { from: new Date(2025, 11, 29), to: JAN_5 } },
]

describe('DateRangePicker', () => {
  it('shows the default placeholder when nothing is selected', () => {
    render(<DateRangePicker onChange={() => {}} />)
    expect(screen.getByText('Select date range')).toBeInTheDocument()
  })

  it('shows a custom placeholder', () => {
    render(<DateRangePicker onChange={() => {}} placeholder="Pick a range" />)
    expect(screen.getByText('Pick a range')).toBeInTheDocument()
  })

  it('formats a committed range value in the trigger', () => {
    render(<DateRangePicker onChange={() => {}} value={{ from: JAN_5, to: JAN_10 }} />)
    expect(screen.getByText('Jan 5, 2026 – Jan 10, 2026')).toBeInTheDocument()
  })

  it('formats a single-day value without a dash', () => {
    render(<DateRangePicker onChange={() => {}} mode="single" value={{ from: JAN_5 }} />)
    expect(screen.getByText('Jan 5, 2026')).toBeInTheDocument()
  })

  it('opens on trigger click and shows the Apply/Cancel footer', () => {
    render(<DateRangePicker onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Select date range/ }))
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('does not open when disabled', () => {
    render(<DateRangePicker onChange={() => {}} disabled />)
    fireEvent.click(screen.getByRole('button', { name: /Select date range/ }))
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument()
  })

  it('renders caller-supplied presets and marks the matching one active', () => {
    render(<DateRangePicker onChange={() => {}} value={{ from: JAN_5, to: JAN_5 }} presets={PRESETS} />)
    fireEvent.click(screen.getByRole('button', { name: /Jan 5, 2026/ }))
    expect(screen.getByRole('option', { name: 'Today' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Last 7 days' })).toHaveAttribute('aria-selected', 'false')
  })

  it('stages a preset without committing until Apply is pressed', () => {
    const onChange = vi.fn()
    render(<DateRangePicker onChange={onChange} presets={PRESETS} />)
    fireEvent.click(screen.getByRole('button', { name: 'Select date range' }))
    fireEvent.click(screen.getByRole('option', { name: 'Today' }))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onChange).toHaveBeenCalledWith({ from: JAN_5, to: JAN_5 })
  })

  it('discards the staged selection on Cancel', () => {
    const onChange = vi.fn()
    render(<DateRangePicker onChange={onChange} presets={PRESETS} />)
    fireEvent.click(screen.getByRole('button', { name: 'Select date range' }))
    fireEvent.click(screen.getByRole('option', { name: 'Today' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText('Select date range')).toBeInTheDocument()
  })

  it('commits a day picked directly on the calendar (single mode)', () => {
    const onChange = vi.fn()
    render(<DateRangePicker onChange={onChange} mode="single" value={{ from: JAN_5 }} />)
    fireEvent.click(screen.getByRole('button', { name: /Jan 5, 2026/ }))
    fireEvent.click(screen.getByRole('button', { name: /January 20th, 2026/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onChange).toHaveBeenCalledWith({ from: new Date(2026, 0, 20) })
  })

  it('shows Start/End time inputs when withTime is set, and reverts them on Cancel', () => {
    const onTimeChange = vi.fn()
    render(
      <DateRangePicker
        onChange={() => {}}
        withTime
        time={{ start: '09:00', end: '17:00' }}
        onTimeChange={onTimeChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Select date range' }))
    const startInput = screen.getByLabelText('Start time') as HTMLInputElement
    expect(startInput.value).toBe('09:00')
    fireEvent.change(startInput, { target: { value: '10:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    fireEvent.click(screen.getByRole('button', { name: 'Select date range' }))
    expect((screen.getByLabelText('Start time') as HTMLInputElement).value).toBe('09:00')
  })

  it('emits the staged time alongside the date range on Apply', () => {
    const onChange = vi.fn()
    const onTimeChange = vi.fn()
    render(
      <DateRangePicker
        onChange={onChange}
        withTime
        time={{ start: '09:00', end: '17:00' }}
        onTimeChange={onTimeChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Select date range' }))
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '18:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onTimeChange).toHaveBeenCalledWith({ start: '09:00', end: '18:00' })
  })

  it('does not show time inputs when withTime is false', () => {
    render(<DateRangePicker onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Select date range' }))
    expect(screen.queryByLabelText('Start time')).not.toBeInTheDocument()
  })

  it('forwards the ref to the trigger button', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<DateRangePicker onChange={() => {}} ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    expect(ref.current).toHaveAttribute('data-slot', 'date-range-picker-trigger')
  })

  it('merges a consumer className onto the trigger', () => {
    render(<DateRangePicker onChange={() => {}} className="ms-2" />)
    expect(screen.getByRole('button', { name: 'Select date range' })).toHaveClass('ms-2')
  })

  describe('triggerVariant="field"', () => {
    it('does not render a field label in the default button variant', () => {
      render(<DateRangePicker onChange={() => {}} />)
      expect(screen.queryByText('Date Range')).not.toBeInTheDocument()
    })

    it('renders a mode-based label above the value by default', () => {
      render(<DateRangePicker onChange={() => {}} triggerVariant="field" value={{ from: JAN_5, to: JAN_10 }} />)
      expect(screen.getByText('Date Range')).toBeInTheDocument()
      expect(screen.getByText('Jan 5, 2026 – Jan 10, 2026')).toBeInTheDocument()
    })

    it('uses "Date" as the default label in single mode', () => {
      render(<DateRangePicker onChange={() => {}} triggerVariant="field" mode="single" value={{ from: JAN_5 }} />)
      expect(screen.getByText('Date')).toBeInTheDocument()
    })

    it('honors a caller-supplied fieldLabel', () => {
      render(<DateRangePicker onChange={() => {}} triggerVariant="field" fieldLabel="Reporting period" />)
      expect(screen.getByText('Reporting period')).toBeInTheDocument()
      expect(screen.queryByText('Date Range')).not.toBeInTheDocument()
    })

    it('still opens the popover and shows Apply/Cancel', () => {
      render(<DateRangePicker onChange={() => {}} triggerVariant="field" presets={PRESETS} />)
      fireEvent.click(screen.getByRole('button', { name: /Select date range/ }))
      expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Today' })).toBeInTheDocument()
    })

    it('forwards the ref to the trigger button in field mode too', () => {
      const ref = createRef<HTMLButtonElement>()
      render(<DateRangePicker onChange={() => {}} triggerVariant="field" ref={ref} />)
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
      expect(ref.current).toHaveAttribute('data-slot', 'date-range-picker-trigger')
    })
  })

  describe('default presets', () => {
    it('renders DEFAULT_RANGE_PRESETS when no presets prop is given', () => {
      render(<DateRangePicker onChange={() => {}} />)
      fireEvent.click(screen.getByRole('button', { name: 'Select date range' }))
      for (const preset of DEFAULT_RANGE_PRESETS) {
        expect(screen.getByRole('option', { name: preset.label })).toBeInTheDocument()
      }
    })

    it('limits the built-in presets to single-day shortcuts in single mode', () => {
      render(<DateRangePicker onChange={() => {}} mode="single" />)
      fireEvent.click(screen.getByRole('button', { name: 'Select date' }))
      expect(screen.getByRole('option', { name: 'Today' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Yesterday' })).toBeInTheDocument()
      expect(screen.queryByRole('option', { name: 'This week' })).not.toBeInTheDocument()
      expect(screen.queryByRole('option', { name: 'This month' })).not.toBeInTheDocument()
    })

    it('uses caller-supplied presets instead of the defaults when provided', () => {
      render(<DateRangePicker onChange={() => {}} presets={PRESETS} />)
      fireEvent.click(screen.getByRole('button', { name: 'Select date range' }))
      expect(screen.getByRole('option', { name: 'Today' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Last 7 days' })).toBeInTheDocument()
      // "This week" only exists in DEFAULT_RANGE_PRESETS — its absence proves
      // the caller's list replaced the defaults rather than merging with them.
      expect(screen.queryByRole('option', { name: 'This week' })).not.toBeInTheDocument()
    })

    it('hides the preset list when presets={[]} is passed explicitly', () => {
      render(<DateRangePicker onChange={() => {}} presets={[]} />)
      fireEvent.click(screen.getByRole('button', { name: 'Select date range' }))
      expect(screen.queryByRole('listbox', { name: 'Presets' })).not.toBeInTheDocument()
    })

    describe('active-preset highlight against a fixed "now"', () => {
      const FIXED_NOW = new Date(2026, 0, 14, 9, 0) // Wed Jan 14, 2026

      beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(FIXED_NOW)
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('marks "Today" active when the committed value is the current day', () => {
        const today = startOfDay(FIXED_NOW)
        render(<DateRangePicker onChange={() => {}} value={{ from: today, to: today }} />)
        fireEvent.click(screen.getByRole('button', { name: /Jan 14, 2026/ }))
        expect(screen.getByRole('option', { name: 'Today' })).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByRole('option', { name: 'Yesterday' })).toHaveAttribute('aria-selected', 'false')
      })

      it('marks "This week" active when the committed value spans the current week', () => {
        const from = startOfWeek(FIXED_NOW, { weekStartsOn: 1 })
        const to = endOfWeek(FIXED_NOW, { weekStartsOn: 1 })
        render(<DateRangePicker onChange={() => {}} value={{ from, to }} />)
        fireEvent.click(screen.getByRole('button', { name: /Jan/ }))
        expect(screen.getByRole('option', { name: 'This week' })).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByRole('option', { name: 'This month' })).toHaveAttribute('aria-selected', 'false')
      })
    })
  })

  describe('DEFAULT_RANGE_PRESETS', () => {
    const FIXED_NOW = new Date(2026, 0, 14, 10, 30) // Wed Jan 14, 2026

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(FIXED_NOW)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    function rangeFor(label: string) {
      const preset = DEFAULT_RANGE_PRESETS.find((p) => p.label === label)
      if (!preset) throw new Error(`no default preset labeled "${label}"`)
      if (typeof preset.range !== 'function') throw new Error(`preset "${label}" is not a thunk`)
      return preset.range()
    }

    it('computes Today as the current calendar day', () => {
      const today = startOfDay(FIXED_NOW)
      expect(rangeFor('Today')).toEqual({ from: today, to: today })
    })

    it('computes Yesterday as one day back', () => {
      const yesterday = subDays(startOfDay(FIXED_NOW), 1)
      expect(rangeFor('Yesterday')).toEqual({ from: yesterday, to: yesterday })
    })

    it('computes This week as the current Mon–Sun span', () => {
      expect(rangeFor('This week')).toEqual({
        from: startOfWeek(FIXED_NOW, { weekStartsOn: 1 }),
        to: endOfWeek(FIXED_NOW, { weekStartsOn: 1 }),
      })
    })

    it('computes Last week as the prior Mon–Sun span', () => {
      const lastWeek = subWeeks(FIXED_NOW, 1)
      expect(rangeFor('Last week')).toEqual({
        from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        to: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      })
    })

    it('computes This month as the current calendar month', () => {
      expect(rangeFor('This month')).toEqual({ from: startOfMonth(FIXED_NOW), to: endOfMonth(FIXED_NOW) })
    })

    it('computes Last month as the prior calendar month', () => {
      const lastMonth = subMonths(FIXED_NOW, 1)
      expect(rangeFor('Last month')).toEqual({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) })
    })

    it('computes This year as the current calendar year', () => {
      expect(rangeFor('This year')).toEqual({ from: startOfYear(FIXED_NOW), to: endOfYear(FIXED_NOW) })
    })

    it('computes Last year as the prior calendar year', () => {
      const lastYear = subYears(FIXED_NOW, 1)
      expect(rangeFor('Last year')).toEqual({ from: startOfYear(lastYear), to: endOfYear(lastYear) })
    })
  })
})
