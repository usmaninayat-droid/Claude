import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { CalendarView } from './CalendarView'
import {
  altCalendarConfig,
  altCalendarRecords,
  calendarConfig,
  calendarRecords,
  CALENDAR_TODAY,
} from './fixtures'

/**
 * The view's density + toolbar-collapse flags are VIEWPORT-derived (UX C.16 /
 * I.54), and jsdom defaults to 1024 — which is a collapsed-legend, 2-chip
 * layout. Pin the 1440 design target for the default suite and widen/narrow
 * explicitly in the tests that are about the responsive rules themselves.
 */
function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true })
  fireEvent(window, new Event('resize'))
}

beforeEach(() => {
  setViewport(1440)
})

/**
 * Radix's `Tabs.Trigger` (the `Monthly | Weekly` switcher's underlying
 * primitive) activates on `mousedown` via its roving-focus item, not on the
 * synthetic `click` — mirror a real pointer interaction, exactly as
 * `ui-kit`'s own `ModuleViewTabs` test does.
 */
function clickTab(element: HTMLElement) {
  fireEvent.mouseDown(element, { button: 0 })
  fireEvent.click(element)
}

/** Radix menus open on `keydown`/`pointerdown`, not a synthetic click. */
function openMenu(trigger: HTMLElement) {
  fireEvent.keyDown(trigger, { key: 'Enter' })
}

function renderView(props: Partial<React.ComponentProps<typeof CalendarView>> = {}) {
  return render(
    <CalendarView
      config={calendarConfig}
      records={calendarRecords}
      // Uncontrolled anchor: it defaults to the injected `today`, which is the
      // design's own 8 Jan 2026, so `‹`/`›` actually move the period.
      today={CALENDAR_TODAY}
      {...props}
    />,
  )
}

describe('CalendarView — monthly grid (SPEC §1.4)', () => {
  it('renders the MON→SUN weekday header and a six-row month grid', () => {
    renderView()
    const grid = screen.getByRole('grid', { name: 'Month grid' })
    const headers = within(grid).getAllByRole('columnheader')
    expect(headers.map((h) => h.textContent)).toEqual(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])
    expect(within(grid).getAllByRole('gridcell')).toHaveLength(42)
    expect(screen.getByText('Jan, 2026')).toBeInTheDocument()
  })

  it('caps chips per cell at the derived cap and offers the rest as "N More"', () => {
    renderView()
    // 8 records on 2026-01-08; the 1440 cap is 3, so 3 chips + "5 More".
    const cell = screen.getByRole('gridcell', { name: /Thursday 8 January 2026, 8 records/ })
    expect(within(cell).getAllByRole('button', { name: /Replace pump seal|Inspect valve|Recalibrate/ }).length).toBe(3)
    expect(within(cell).getByText('5 More')).toBeInTheDocument()
  })

  it('drops the cap to 2 at the 1280 width (UX C.16)', () => {
    setViewport(1280)
    renderView()
    const cell = screen.getByRole('gridcell', { name: /Thursday 8 January 2026, 8 records/ })
    expect(within(cell).getByText('6 More')).toBeInTheDocument()
  })

  it('marks today and dims the out-of-month days', () => {
    renderView()
    const today = screen.getByRole('gridcell', { name: /Thursday 8 January 2026/ })
    expect(within(today).getByText('08')).toHaveAttribute('data-today', 'true')
    const outside = screen.getByRole('gridcell', { name: /Monday 29 December 2025/ })
    expect(outside).toHaveAttribute('data-outside', 'true')
    const inside = screen.getByRole('gridcell', { name: /Thursday 1 January 2026/ })
    expect(inside).not.toHaveAttribute('data-outside')
  })

  it('carries the status on the chip accessible name, never colour alone (UX K.72)', () => {
    renderView()
    expect(screen.getByRole('button', { name: 'Replace pump seal, Escalated' })).toBeInTheDocument()
  })
})

describe('CalendarView — mode switching and period navigation', () => {
  it('switches to Weekly, keeps the period, and changes the label format', () => {
    renderView()
    clickTab(screen.getByRole('tab', { name: 'Weekly' }))
    expect(screen.getByRole('grid', { name: 'Week grid' })).toBeInTheDocument()
    expect(screen.getByText('5 Jan, 2026 – 11 Jan, 2026')).toBeInTheDocument()
    clickTab(screen.getByRole('tab', { name: 'Monthly' }))
    expect(screen.getByText('Jan, 2026')).toBeInTheDocument()
  })

  it('steps a month, including across the year boundary, and renames ‹/› per mode', () => {
    const onAnchorDateChange = vi.fn()
    renderView({ onAnchorDateChange })
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(onAnchorDateChange).toHaveBeenCalledWith('2026-02-01')
    expect(screen.getByText('Feb, 2026')).toBeInTheDocument()
    // Back three months lands in the previous year.
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByText('Dec, 2025')).toBeInTheDocument()
    expect(screen.getByText('Winterise standpipe')).toBeInTheDocument()
  })

  it('steps a week in weekly mode and names the controls accordingly', () => {
    renderView()
    clickTab(screen.getByRole('tab', { name: 'Weekly' }))
    expect(screen.getByRole('button', { name: 'Previous week' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(screen.getByText('12 Jan, 2026 – 18 Jan, 2026')).toBeInTheDocument()
  })

  it('today is only marked while it is in range', () => {
    renderView()
    expect(document.querySelectorAll('[data-today="true"]')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(document.querySelector('[data-today]')).toBeNull()
  })

  it('marks today with a dot in the weekly header (SPEC §1.5)', () => {
    renderView()
    clickTab(screen.getByRole('tab', { name: 'Weekly' }))
    const header = within(screen.getByRole('grid', { name: 'Week grid' })).getAllByRole('columnheader')[3]
    expect(header).toHaveTextContent('THU 8')
    expect(header.querySelector('[data-today="true"]')).not.toBeNull()
  })
})

describe('CalendarView — day-overflow popover (UX C.19/C.20/C.21)', () => {
  it('opens with all of the day\'s records, closes on Escape and restores focus', async () => {
    renderView()
    const trigger = screen.getByRole('button', { name: /Show all 8 records on Thursday 8 January 2026/ })
    trigger.focus()
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Records on Thursday 8 January 2026' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getAllByRole('button', { name: /, (Escalated|In Progress|Assigned|Completed)$/ })).toHaveLength(8)
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('closes on the ✕ and on an outside click, restoring focus each time', async () => {
    renderView()
    const trigger = screen.getByRole('button', { name: /Show all 8 records/ })
    trigger.focus()
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Close day details' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(trigger))

    fireEvent.click(trigger)
    // Radix registers its outside-pointer listener on a macrotask, so yield
    // once before simulating the outside press.
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    // jsdom's PointerEvent carries no `pointerType`, so Radix's
    // dismiss-on-outside-pointer path waits for the trailing click.
    fireEvent.pointerDown(document.body)
    fireEvent.click(document.body)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('does not fire the day cell\'s create when "N More" or the panel is clicked', () => {
    const onCreateAtDate = vi.fn()
    renderView({ onCreateAtDate })
    fireEvent.click(screen.getByRole('button', { name: /Show all 8 records/ }))
    expect(onCreateAtDate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('dialog'))
    expect(onCreateAtDate).not.toHaveBeenCalled()
  })

  it('opens a record from inside the popover', () => {
    const onOpenRecord = vi.fn()
    renderView({ onOpenRecord })
    fireEvent.click(screen.getByRole('button', { name: /Show all 8 records/ }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tighten flange bolts, Completed' }))
    expect(onOpenRecord).toHaveBeenCalledWith(expect.objectContaining({ id: 'W-08' }))
  })
})

describe('CalendarView — legend filtering (Dev Note 32273 / UX E.27–E.29)', () => {
  it('renders a labelled fieldset of status checkboxes with per-status totals', () => {
    renderView()
    expect(screen.getByRole('group', { name: 'Filter by status' })).toBeInTheDocument()
    const escalated = screen.getByRole('checkbox', { name: /Escalated/ })
    expect(escalated).toHaveAttribute('aria-checked', 'true')
    expect(escalated).toHaveTextContent('Escalated(3)')
  })

  it('unchecking a status hides its chips and leaves the OTHER totals untouched', () => {
    renderView()
    const before = screen.getByRole('checkbox', { name: /Escalated/ }).textContent
    fireEvent.click(screen.getByRole('checkbox', { name: /In Progress/ }))
    expect(screen.queryByRole('button', { name: /Inspect valve line/ })).toBeNull()
    expect(screen.getByRole('checkbox', { name: /Escalated/ }).textContent).toBe(before)
    expect(screen.getByText('Showing 9 of 12 records')).toBeInTheDocument()
  })

  it('allows unchecking EVERY status, keeps the grid, and clears back', () => {
    renderView()
    for (const label of ['Escalated', 'In Progress', 'Assigned', 'Completed']) {
      fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(label) }))
    }
    expect(screen.getByText('0 of 12 records — all statuses hidden')).toBeInTheDocument()
    // The grid IS the content: it stays, with a filtered hint above it (UX J.59).
    expect(screen.getByRole('grid', { name: 'Month grid' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Replace pump seal/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByRole('button', { name: /Replace pump seal, Escalated/ })).toBeInTheDocument()
  })

  it('collapses into a "Status" popover at the narrow width (UX I.54.4)', () => {
    setViewport(1180)
    renderView()
    expect(screen.queryByRole('group', { name: 'Filter by status' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Status · 4/ }))
    expect(screen.getByRole('group', { name: 'Filter by status' })).toBeInTheDocument()
  })
})

describe('CalendarView — View By, callbacks and states', () => {
  it('re-lays the grid when the View By date field changes', () => {
    const onDateFieldChange = vi.fn()
    renderView({ onDateFieldChange })
    // Created Date is the first option, so Jan 8 holds the eight records.
    expect(screen.getByRole('gridcell', { name: /Thursday 8 January 2026, 8 records/ })).toBeInTheDocument()
    openMenu(screen.getByRole('button', { name: 'View by: Created Date' }))
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Due Date' }))
    expect(onDateFieldChange).toHaveBeenCalledWith('systemcol2')
    expect(screen.getByRole('gridcell', { name: /Thursday 8 January 2026, no records/ })).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: /Friday 9 January 2026, 8 records/ })).toBeInTheDocument()
  })

  it('opens a record from a chip and creates at a clicked day', () => {
    const onOpenRecord = vi.fn()
    const onCreateAtDate = vi.fn()
    renderView({ onOpenRecord, onCreateAtDate })
    fireEvent.click(screen.getByRole('button', { name: 'Survey north bund, Escalated' }))
    expect(onOpenRecord).toHaveBeenCalledWith(expect.objectContaining({ id: 'W-09' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create on Friday 16 January 2026' }))
    // Second argument is the date COLUMN the grid is laid out by, so the caller
    // can prefill the field the user was actually looking at (SPEC row 33).
    expect(onCreateAtDate).toHaveBeenCalledWith('2026-01-16', expect.any(String))
  })

  it('makes the day cell itself keyboard-activatable — the grid has a focusable cell (UX K.69)', () => {
    const onCreateAtDate = vi.fn()
    renderView({ onCreateAtDate })
    const cells = document.querySelectorAll<HTMLElement>('[data-slot="calendar-day-cell"]')
    // Exactly one roving tab stop, and it is a real cell — round 1 had none.
    expect([...cells].filter((c) => c.tabIndex === 0)).toHaveLength(1)
    const first = [...cells].find((c) => c.tabIndex === 0)!
    fireEvent.keyDown(first, { key: 'Enter' })
    expect(onCreateAtDate).toHaveBeenCalledTimes(1)
    // Arrow keys move the tab stop to the next day.
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(first.tabIndex).toBe(-1)
    expect([...cells].filter((c) => c.tabIndex === 0)).toHaveLength(1)
  })

  it('renders no create affordance at all when no create hook is wired', () => {
    renderView()
    expect(screen.queryByRole('button', { name: /^Create on / })).toBeNull()
  })

  it('shows the no-data empty state, the error state and the loading skeleton', () => {
    const onRetry = vi.fn()
    const { rerender } = render(
      <CalendarView config={calendarConfig} records={[]} today={CALENDAR_TODAY} onCreateRecord={() => {}} />,
    )
    expect(screen.getByText('No records yet')).toBeInTheDocument()
    expect(screen.queryByRole('grid')).toBeNull()

    rerender(
      <CalendarView
        config={calendarConfig}
        records={calendarRecords}
        today={CALENDAR_TODAY}
        error="Request timed out"
        onRetry={onRetry}
      />,
    )
    expect(screen.getByText("Couldn't load records")).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalled()

    rerender(<CalendarView config={calendarConfig} records={calendarRecords} today={CALENDAR_TODAY} loading />)
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('shows exactly one message for an empty week and none for empty columns (UX J.60)', () => {
    // A week with records on one day only: six empty columns, zero messages.
    renderView({ mode: 'weekly', anchorDate: '2026-01-08' })
    expect(screen.queryByTestId('view-empty-state')).toBeNull()
    expect(document.querySelectorAll('[data-slot="view-empty-state"]')).toHaveLength(0)
    // A week with nothing at all: exactly one.
    render(
      <CalendarView
        config={calendarConfig}
        records={[]}
        today={CALENDAR_TODAY}
        anchorDate="2026-03-09"
        mode="weekly"
      />,
    )
    expect(document.querySelectorAll('[data-slot="view-empty-state"]')).toHaveLength(1)
  })

  it('renders a DIFFERENT module config with none of the first config\'s vocabulary', () => {
    render(
      <CalendarView
        config={altCalendarConfig}
        records={altCalendarRecords}
        today={CALENDAR_TODAY}
        anchorDate="2026-01-08"
      />,
    )
    expect(screen.getByRole('button', { name: 'View by: Scheduled For' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Awaiting Rectification/ })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /Escalated/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Quarterly bund check, Awaiting Rectification' })).toBeInTheDocument()
  })
})

describe('CalendarView — scroll architecture', () => {
  it('monthly owns exactly one grid scroller with a sticky weekday header', () => {
    const { container } = renderView()
    const body = container.querySelector('[data-slot="calendar-month-body"]')
    expect(body?.className).toContain('overflow-y-auto')
    const headerRow = container.querySelector('[role="row"]')
    expect(headerRow?.className).toContain('sticky')
    expect(container.querySelectorAll('[data-slot="calendar-day-cell"].overflow-y-auto')).toHaveLength(0)
  })

  it('weekly scrolls as ONE body, never seven columns (UX D.22)', () => {
    const { container } = renderView({ mode: 'weekly' })
    const body = container.querySelector('[data-slot="calendar-week-body"]')
    expect(body?.className).toContain('overflow-y-auto')
    const columns = container.querySelectorAll('[data-slot="calendar-week-column"]')
    expect(columns).toHaveLength(7)
    for (const column of columns) expect(column.className).toContain('overflow-y-visible')
  })
})
