import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModuleView } from './ModuleView'
import { dealsConfig, dealRecords } from './fixtures'
import { calendarConfig, calendarRecords, CALENDAR_TODAY } from './calendar/fixtures'

/**
 * FIX WAVE C-4 / P0-2 — EVERY lens renders the SAME filtered record set.
 *
 * The toolbar (search + filter facets + sort) sits above the lens body and is
 * shared by every lens, but its state used to be stored per view TAB: a
 * filtered List switched to Kanban activated the Kanban tab's own empty state
 * and the board painted every record, while switching back to List restored
 * the filter. `use-saved-view-tabs.ts` now holds the QUERY part of the view
 * state once per module (the display part — grouping/density — stays per lens).
 */
const ctx = { userId: 'u1', moduleId: 'deals' }

// base-ui tabs activate on mouseDown, not the synthetic click alone.
function clickTab(name: string) {
  const el = screen.getByRole('tab', { name })
  fireEvent.mouseDown(el, { button: 0 })
  fireEvent.click(el)
}
const cardCount = () => document.querySelectorAll('[data-slot="kanban-card"]').length
const bodyRowCount = () => Math.max(screen.getAllByRole('row').length - 1, 0)
const search = (value: string) =>
  fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value } })

describe('P0-2 — a lens switch keeps the active query', () => {
  it('kanban paints the FILTERED records when switched to from a filtered list', () => {
    render(
      <ModuleView config={dealsConfig} records={dealRecords} views={['list', 'kanban']} context={ctx} />,
    )
    const total = dealRecords.length
    const term = String(dealRecords[0].title).split(' ')[0]

    search(term)
    const filtered = bodyRowCount()
    expect(filtered).toBeGreaterThan(0)
    expect(filtered).toBeLessThan(total)

    clickTab('Kanban View')
    expect(cardCount()).toBe(filtered)

    // …and back: the same filtered list, not a reset one.
    clickTab('List View')
    expect(bodyRowCount()).toBe(filtered)
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue(term)
  })

  it('an unfiltered board still paints every record (no over-filtering)', () => {
    render(
      <ModuleView config={dealsConfig} records={dealRecords} views={['list', 'kanban']} context={ctx} />,
    )
    clickTab('Kanban View')
    expect(cardCount()).toBe(dealRecords.length)
  })

  it('lane counts update when the query is applied while ALREADY in kanban', () => {
    render(
      <ModuleView config={dealsConfig} records={dealRecords} views={['kanban', 'list']} context={ctx} />,
    )
    expect(cardCount()).toBe(dealRecords.length)
    search(String(dealRecords[0].title).split(' ')[0])
    const filtered = cardCount()
    expect(filtered).toBeGreaterThan(0)
    expect(filtered).toBeLessThan(dealRecords.length)
    // …and a lens switch from the KANBAN side carries it too.
    clickTab('List View')
    expect(bodyRowCount()).toBe(filtered)
  })

  it('Clear all restores every record on every lens', () => {
    render(
      <ModuleView config={dealsConfig} records={dealRecords} views={['list', 'kanban']} context={ctx} />,
    )
    search(String(dealRecords[0].title).split(' ')[0])
    search('')
    expect(bodyRowCount()).toBe(dealRecords.length)
    clickTab('Kanban View')
    expect(cardCount()).toBe(dealRecords.length)
  })

  it('the calendar lens shows the FILTERED count row after a switch (E.30)', () => {
    vi.setSystemTime(CALENDAR_TODAY)
    render(
      <ModuleView
        config={calendarConfig}
        records={calendarRecords}
        views={['list', 'calendar']}
        context={{ userId: 'u1', moduleId: 'work-items' }}
      />,
    )
    const total = calendarRecords.length
    search(String(calendarRecords[0].title).split(' ')[0])
    const filtered = bodyRowCount()
    expect(filtered).toBeGreaterThan(0)
    expect(filtered).toBeLessThan(total)
    clickTab('Calendar View')
    // The calendar renders exactly the FILTERED event set — this pins that
    // the lens switch carried the query. (Not asserted via the E.30 count
    // row's text: that row's own "total" for this lens is ALREADY the
    // search-narrowed count — periodEvents is derived from the records this
    // lens was handed, i.e. post-search — so once nothing further narrows it
    // via the legend, shown === total and, per UX ruling A4, the row
    // correctly renders empty rather than a tautological "Showing N of N".)
    expect(document.querySelectorAll('[data-slot="calendar-event-chip"]')).toHaveLength(filtered)
    vi.useRealTimers()
  })
})
