import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import type { FilterExpandColumn, FilterFacet } from '@fams/v5-composer'
import {
  ExpandableSelectorSheet,
  COLUMN_MIN_WIDTH,
  cellText,
  columnMinWidth,
  orderSelectedToTop,
  rowWindow,
  visibleColumns,
  type SelectorRow,
} from './ExpandableSelectorSheet'
import { SelectedToTopToggle } from './SelectedToTopToggle'
import { useFilterSession } from './use-filter-session'

/**
 * WAVE C5 — `ExpandableSelectorSheet`.
 *
 * Fixtures here are deliberately vocabulary-free (J.87), matching
 * `fixtures.ts`: an `Owner` facet over `Record<string, unknown>` rows whose
 * columns are named `c0…c11`. If a product noun ever appears in this file the
 * sheet has stopped being metadata-driven.
 */

/* ── fixtures ──────────────────────────────────────────────────────────── */

/** 12 columns — the E.43 h-scroll stress case (12 × 96px ≫ 722px). */
const wideColumns: FilterExpandColumn[] = Array.from({ length: 12 }, (_, i) => ({
  col: `c${i}`,
  label: `Col ${i}`,
  sortable: i < 3,
}))

function facetOf(overrides: Partial<FilterFacet> = {}, columns = wideColumns): FilterFacet {
  return {
    col: 'owner',
    label: 'Owner',
    type: 'reference',
    kind: 'entity',
    multiple: true,
    expandable: true,
    icon: 'filter',
    expandView: {
      columns,
      searchable: true,
      sortable: true,
      columnSettings: true,
      selectedToTop: true,
    },
    ...overrides,
  }
}

function makeRows(count: number): SelectorRow[] {
  return Array.from({ length: count }, (_, i) => {
    const row: SelectorRow = { id: `r${i}` }
    wideColumns.forEach((c, j) => {
      row[c.col] = j === 0 ? `Row ${String(i).padStart(3, '0')}` : `${c.col}-${i}`
    })
    return row
  })
}

const smallRows = makeRows(6)
const bigRows = makeRows(292)

interface HarnessProps {
  facet?: FilterFacet
  rows?: SelectorRow[]
  loadRows?: () => Promise<SelectorRow[]>
  initial?: string[]
  onConfirm?: (next: string[]) => void
  withSession?: boolean
}

/**
 * Host harness. `value` is host state, so "tick → cancel leaves the value
 * untouched" is observable exactly as a real host would see it.
 */
function Harness({
  facet = facetOf(),
  rows = smallRows,
  loadRows,
  initial = [],
  onConfirm,
  withSession = false,
}: HarnessProps) {
  const [open, setOpen] = useState(true)
  const [value, setValue] = useState<string[]>(initial)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const session = withSession ? useFilterSession('mod:view') : undefined
  return (
    <div>
      <button type="button" ref={triggerRef} data-testid="expand-trigger">
        Expand
      </button>
      <span data-testid="applied">{value.join(',')}</span>
      <ExpandableSelectorSheet
        facet={facet}
        rows={loadRows ? undefined : rows}
        loadRows={loadRows}
        value={value}
        open={open}
        session={session}
        triggerRef={triggerRef}
        onConfirm={(next) => {
          onConfirm?.(next)
          setValue(next)
          setOpen(false)
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  )
}

const confirm = () => screen.getByRole('button', { name: 'Confirm' })

/**
 * Tab order, measured. jsdom has no native Tab and the package carries no
 * `user-event`, so the tab sequence is enumerated the way the browser does
 * it: every tabbable element inside the sheet, in DOM order (nothing here
 * uses a positive `tabIndex`, so DOM order IS tab order). Roving rows appear
 * once — `tabIndex={-1}` rows are excluded exactly as a browser excludes
 * them.
 */
function tabStops(): HTMLElement[] {
  const sheet = document.querySelector('[data-slot="expandable-selector-sheet"]')!
  const candidates = sheet.querySelectorAll<HTMLElement>(
    'a[href], button, input, select, textarea, [tabindex]',
  )
  return Array.from(candidates).filter((el) => {
    if (el.hasAttribute('disabled')) return false
    const explicit = el.getAttribute('tabindex')
    if (explicit !== null && Number(explicit) < 0) return false
    return true
  })
}

/** Tab presses needed to walk from `from` to `to`. */
function tabDistance(from: HTMLElement, to: HTMLElement): number {
  const stops = tabStops()
  const start = stops.indexOf(from)
  const end = stops.indexOf(to)
  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  return end - start
}
const rowByLabel = (label: string) =>
  screen.getByText(label).closest('tr') as HTMLTableRowElement

/* ── pure helpers ──────────────────────────────────────────────────────── */

describe('ExpandableSelectorSheet — pure helpers', () => {
  it('visibleColumns drops `hidden` columns and keeps metadata order', () => {
    const facet = facetOf({}, [
      { col: 'a', label: 'A' },
      { col: 'b', label: 'B', hidden: true },
      { col: 'c', label: 'C' },
    ])
    expect(visibleColumns(facet).map((c) => c.col)).toEqual(['a', 'c'])
  })

  it('columnMinWidth floors at 96px and lets metadata raise it (E.43)', () => {
    expect(columnMinWidth({ col: 'a', label: 'A' })).toBe(COLUMN_MIN_WIDTH)
    expect(columnMinWidth({ col: 'a', label: 'A', minWidth: 40 })).toBe(COLUMN_MIN_WIDTH)
    expect(columnMinWidth({ col: 'a', label: 'A', minWidth: 220 })).toBe(220)
  })

  it('cellText never assumes a row shape', () => {
    expect(cellText({ a: 'x' }, 'a')).toBe('x')
    expect(cellText({ a: 3 }, 'a')).toBe('3')
    expect(cellText({}, 'a')).toBe('')
    expect(cellText({ a: { deep: 1 } }, 'a')).toBe('')
  })

  it('orderSelectedToTop partitions stably by the confirmed set', () => {
    expect(orderSelectedToTop(['a', 'b', 'c', 'd'], ['c', 'a'])).toEqual(['a', 'c', 'b', 'd'])
    expect(orderSelectedToTop(['a', 'b'], [])).toEqual(['a', 'b'])
  })

  it('rowWindow windows around the scroll position and clamps at both ends', () => {
    expect(rowWindow(292, 0, 560, 56, 5)).toEqual({ start: 0, end: 15 })
    expect(rowWindow(292, 5600, 560, 56, 5)).toEqual({ start: 95, end: 115 })
    expect(rowWindow(292, 999999, 560, 56, 5)).toEqual({ start: 286, end: 292 })
    // An unmeasurable viewport falls back to a realistic window, never "all".
    expect(rowWindow(292, 0, 0, 56, 5).end).toBeLessThan(292)
  })
})

/* ── render per expandView flags ───────────────────────────────────────── */

describe('ExpandableSelectorSheet — rendering per expandView flags', () => {
  it('renders search, sort, pencil and Selected-to-Top when all flags are on', () => {
    render(<Harness />)
    expect(screen.getByRole('searchbox', { name: 'Search Owner' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sort Owner' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show or hide columns' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Selected to Top' })).toBeInTheDocument()
  })

  it('omits every optional affordance when the flags are off', () => {
    const facet = facetOf({
      expandView: { columns: wideColumns },
    })
    render(<Harness facet={facet} />)
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sort Owner' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show or hide columns' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Selected to Top' })).not.toBeInTheDocument()
  })

  it('renders the metadata column set only, `hidden` respected (D-1/J.87)', () => {
    const facet = facetOf({}, [
      { col: 'c0', label: 'Col 0' },
      { col: 'c1', label: 'Col 1', hidden: true },
      { col: 'c2', label: 'Col 2' },
    ])
    render(<Harness facet={facet} />)
    expect(screen.getByRole('columnheader', { name: /Col 0/ })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /Col 1/ })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Col 2/ })).toBeInTheDocument()
  })

  it('title, item count and empty state are derived from metadata (R-29/R-31/R-37)', () => {
    render(<Harness />)
    expect(screen.getByText('Select Owner')).toBeInTheDocument()
    expect(screen.getByText('Showing 6 items')).toBeInTheDocument()
  })

  it('loads rows asynchronously when `loadRows` is supplied', async () => {
    const loadRows = vi.fn().mockResolvedValue(smallRows)
    render(<Harness loadRows={loadRows} />)
    await waitFor(() => expect(screen.getByText('Showing 6 items')).toBeInTheDocument())
    expect(loadRows).toHaveBeenCalledTimes(1)
  })

  it('renders nothing without an `expandView` (metadata is the only source)', () => {
    const facet = facetOf({ expandView: undefined })
    render(<Harness facet={facet} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

/* ── pending vs confirmed (G.63 / D-2 pendingSheet) ────────────────────── */

describe('ExpandableSelectorSheet — deferred commit (G.63)', () => {
  it('a tick does NOT reach the host until Confirm', () => {
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)
    fireEvent.click(rowByLabel('Row 001'))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByTestId('applied')).toHaveTextContent('')
  })

  it('tick → Cancel leaves the confirmed value untouched', () => {
    const onConfirm = vi.fn()
    render(<Harness initial={['r0']} onConfirm={onConfirm} />)
    fireEvent.click(rowByLabel('Row 001'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByTestId('applied')).toHaveTextContent('r0')
  })

  it('tick → Confirm calls onConfirm with the next selection', () => {
    const onConfirm = vi.fn()
    render(<Harness initial={['r0']} onConfirm={onConfirm} />)
    fireEvent.click(rowByLabel('Row 001'))
    fireEvent.click(confirm())
    expect(onConfirm).toHaveBeenCalledWith(['r0', 'r1'])
    expect(screen.getByTestId('applied')).toHaveTextContent('r0,r1')
  })

  it('unticking a confirmed row stages a removal and commits it on Confirm', () => {
    const onConfirm = vi.fn()
    render(<Harness initial={['r0', 'r1']} onConfirm={onConfirm} />)
    fireEvent.click(rowByLabel('Row 000'))
    expect(screen.getByTestId('applied')).toHaveTextContent('r0,r1')
    fireEvent.click(confirm())
    expect(onConfirm).toHaveBeenCalledWith(['r1'])
  })

  it('Select All acts on the currently displayed rows, and toggles to Unselect All (R-13)', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Select All' }))
    expect(screen.getByRole('button', { name: 'Unselect All' })).toBeInTheDocument()
    expect(screen.getAllByRole('row', { selected: true })).toHaveLength(6)
  })

  it('the header select-all checkbox reports `mixed` when only some rows are ticked (D.28)', () => {
    render(<Harness />)
    fireEvent.click(rowByLabel('Row 001'))
    const box = screen.getByRole('checkbox', { name: /Select all 6 shown Owner/ })
    expect(box).toHaveAttribute('aria-checked', 'mixed')
  })

  it('mirrors the pending set into the session and clears it on Confirm (D-2)', () => {
    render(<Harness withSession initial={['r0']} />)
    fireEvent.click(rowByLabel('Row 001'))
    fireEvent.click(confirm())
    expect(screen.getByTestId('applied')).toHaveTextContent('r0,r1')
  })
})

/* ── Confirm gating (D.30 / R-35) ──────────────────────────────────────── */

describe('ExpandableSelectorSheet — Confirm gating (D.30)', () => {
  it('is `aria-disabled` with a stated reason when nothing is selected', () => {
    render(<Harness />)
    const button = confirm()
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).not.toHaveAttribute('disabled')
    const reasonId = button.getAttribute('aria-describedby')!
    expect(document.getElementById(reasonId)?.textContent).toMatch(/select at least one owner/i)
  })

  it('is `aria-disabled` with a different reason when nothing CHANGED', () => {
    render(<Harness initial={['r0']} />)
    const button = confirm()
    expect(button).toHaveAttribute('aria-disabled', 'true')
    const reasonId = button.getAttribute('aria-describedby')!
    expect(document.getElementById(reasonId)?.textContent).toMatch(/no changes/i)
  })

  it('stays focusable while blocked and does not commit when activated', () => {
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)
    const button = confirm()
    button.focus()
    expect(document.activeElement).toBe(button)
    fireEvent.click(button)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('drops `aria-disabled` once the pending set differs from the confirmed one', () => {
    render(<Harness initial={['r0']} />)
    fireEvent.click(rowByLabel('Row 001'))
    expect(confirm()).not.toHaveAttribute('aria-disabled')
  })
})

/* ── keyboard: Tab budget + roving rows (D.29) ─────────────────────────── */

describe('ExpandableSelectorSheet — keyboard (D.29/D.26)', () => {
  it('focus lands on the search input on open (D.26)', async () => {
    render(<Harness />)
    await waitFor(() =>
      expect(document.activeElement).toBe(document.querySelector('[data-slot="sheet-search"]')),
    )
  })

  it('reaches Confirm in ≤15 Tabs from the search input with 292 rows (D.29)', () => {
    render(<Harness rows={bigRows} />)
    const search = screen.getByRole('searchbox', { name: 'Search Owner' })
    const presses = tabDistance(search, confirm())
    expect(presses).toBeLessThanOrEqual(15)
    // Recorded so a regression is legible in the diff, not just a threshold.
    // 7 since FIX WAVE C-5 added R-30/DN-23's filter icon button to the
    // toolbar (was 6) — one more toolbar tab stop, still far inside D.29's 15.
    expect(presses).toBe(7)
  })

  it('the ≤15 budget is independent of row count (6 rows vs 292)', () => {
    const { unmount } = render(<Harness rows={smallRows} />)
    const small = tabDistance(screen.getByRole('searchbox', { name: 'Search Owner' }), confirm())
    unmount()
    render(<Harness rows={bigRows} />)
    const big = tabDistance(screen.getByRole('searchbox', { name: 'Search Owner' }), confirm())
    expect(big).toBe(small)
  })

  it('the table body is ONE tab stop — rows use roving tabIndex, not 292 of them', () => {
    render(<Harness rows={bigRows} />)
    const rows = screen.getAllByRole('row').filter((r) => r.dataset.slot === 'sheet-row')
    expect(rows.filter((r) => r.tabIndex === 0)).toHaveLength(1)
    expect(rows.length).toBeGreaterThan(1)
  })

  it('ArrowDown moves the roving stop and Space toggles the focused row', () => {
    render(<Harness />)
    const first = rowByLabel('Row 000')
    first.focus()
    fireEvent.keyDown(first, { key: ' ' })
    expect(first).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(first, { key: 'ArrowDown' })
    const rows = screen.getAllByRole('row').filter((r) => r.dataset.slot === 'sheet-row')
    expect(rows[1]).toHaveAttribute('tabindex', '0')
    expect(rows[0]).toHaveAttribute('tabindex', '-1')
  })
})

/* ── Selected to Top (R-32 / D.31) ─────────────────────────────────────── */

describe('ExpandableSelectorSheet — Selected to Top (R-32)', () => {
  const labelsInOrder = () =>
    screen
      .getAllByRole('row')
      .filter((r) => r.dataset.slot === 'sheet-row')
      .map((r) => r.querySelectorAll('td')[1]?.textContent)

  it('moves confirmed rows to the top and flips its label to `Original order`', () => {
    render(<Harness initial={['r3']} />)
    // Default is OFF here because the fixture starts unpressed on mount only
    // when `selectedToTop` metadata is on; activate it explicitly.
    const toggle = screen.getByRole('button', { name: 'Selected to Top' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    expect(labelsInOrder()[0]).toBe('Row 003')
    const flipped = screen.getByRole('button', { name: 'Original order' })
    expect(flipped).toHaveAttribute('aria-pressed', 'true')
  })

  it('restores the original order when toggled back (DN-22)', () => {
    render(<Harness initial={['r3']} />)
    fireEvent.click(screen.getByRole('button', { name: 'Selected to Top' }))
    fireEvent.click(screen.getByRole('button', { name: 'Original order' }))
    expect(labelsInOrder()[0]).toBe('Row 000')
  })

  it('reorders by the CONFIRMED value, not by pending ticks (R-18 no-bounce)', () => {
    render(<Harness initial={['r3']} />)
    fireEvent.click(screen.getByRole('button', { name: 'Selected to Top' }))
    // Ticking r5 must not relocate it under the pointer.
    fireEvent.click(rowByLabel('Row 005'))
    expect(labelsInOrder()[0]).toBe('Row 003')
    expect(labelsInOrder()).not.toContain(undefined)
    expect(labelsInOrder()[1]).toBe('Row 000')
  })

  it('SelectedToTopToggle is a plain two-state button', () => {
    const onPressedChange = vi.fn()
    render(<SelectedToTopToggle pressed={false} onPressedChange={onPressedChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Selected to Top' }))
    expect(onPressedChange).toHaveBeenCalledWith(true)
  })
})

/* ── columns, h-scroll (E.43) ──────────────────────────────────────────── */

describe('ExpandableSelectorSheet — columns and h-scroll (E.43)', () => {
  it('floors every header cell at 96px', () => {
    render(<Harness />)
    const headers = screen.getAllByRole('columnheader').slice(1)
    expect(headers).toHaveLength(12)
    for (const th of headers) {
      expect(Number.parseInt((th as HTMLElement).style.minWidth, 10)).toBeGreaterThanOrEqual(
        COLUMN_MIN_WIDTH,
      )
    }
  })

  it('the table demands more width than the sheet, so the TABLE CONTAINER scrolls', () => {
    render(<Harness />)
    const table = document.querySelector('[data-slot="sheet-table"]') as HTMLElement
    const total = Number(table.dataset.totalMinWidth)
    // 12 × 96 + the 48px selection column ≫ the 722px sheet.
    expect(total).toBeGreaterThan(722)

    const scroller = document.querySelector('[data-slot="sheet-table-scroller"]') as HTMLElement
    // jsdom has no layout, so the scroll geometry is asserted against the
    // widths the component actually declares (E.43's `scrollWidth >
    // clientWidth`), with the container's own overflow proving it is the
    // scroller rather than the sheet or the document.
    Object.defineProperty(scroller, 'scrollWidth', { value: total, configurable: true })
    Object.defineProperty(scroller, 'clientWidth', { value: 674, configurable: true })
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
    expect(scroller.className).toContain('overflow-x-auto')

    const sheet = document.querySelector('[data-slot="expandable-selector-sheet"]') as HTMLElement
    expect(sheet.className).not.toContain('overflow-x-auto')
  })

  it('honours a metadata minWidth above the floor', () => {
    const facet = facetOf({}, [{ col: 'c0', label: 'Col 0', minWidth: 240 }])
    render(<Harness facet={facet} />)
    const th = screen.getAllByRole('columnheader')[1] as HTMLElement
    expect(th.style.minWidth).toBe('240px')
  })

  it('a sortable header exposes aria-sort and flips it on activation (D.27)', () => {
    render(<Harness />)
    const th = screen.getByRole('columnheader', { name: /Col 0/ })
    expect(th).toHaveAttribute('aria-sort', 'none')
    fireEvent.click(within(th).getByRole('button'))
    expect(th).toHaveAttribute('aria-sort', 'ascending')
    fireEvent.click(within(th).getByRole('button'))
    expect(th).toHaveAttribute('aria-sort', 'descending')
  })
})

/* ── search ────────────────────────────────────────────────────────────── */

describe('ExpandableSelectorSheet — search (R-29)', () => {
  it('filters rows across every rendered column and updates the count', () => {
    render(<Harness />)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search Owner' }), {
      target: { value: 'Row 003' },
    })
    expect(screen.getByText('Showing 1 items')).toBeInTheDocument()
  })

  it('shows the empty state when the query matches nothing (R-37)', () => {
    render(<Harness />)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search Owner' }), {
      target: { value: 'nothing-matches' },
    })
    expect(screen.getByText('No results found!')).toBeInTheDocument()
  })
})

/* ── virtualisation (E.46) ─────────────────────────────────────────────── */

describe('ExpandableSelectorSheet — virtualisation (E.46)', () => {
  const renderedRowCount = () =>
    screen.getAllByRole('row').filter((r) => r.dataset.slot === 'sheet-row').length

  it('renders far fewer DOM rows than rows.length at 292', () => {
    render(<Harness rows={bigRows} />)
    const count = renderedRowCount()
    expect(count).toBeLessThan(bigRows.length)
    expect(count).toBeLessThan(100)
    expect(count).toBeGreaterThan(0)
  })

  it('renders every row below the threshold', () => {
    render(<Harness rows={smallRows} />)
    expect(renderedRowCount()).toBe(6)
  })

  it('windows to the scroll position', () => {
    render(<Harness rows={bigRows} />)
    const scroller = document.querySelector('[data-slot="sheet-table-scroller"]') as HTMLElement
    fireEvent.scroll(scroller, { target: { scrollTop: 5600 } })
    expect(screen.queryByText('Row 000')).not.toBeInTheDocument()
    expect(screen.getByText('Row 100')).toBeInTheDocument()
  })
})

/* ── focus restore on all three close paths (A.9/D-3) ──────────────────── */

describe('ExpandableSelectorSheet — close paths restore focus (A.9)', () => {
  const trigger = () => screen.getByTestId('expand-trigger')

  it('Cancel discards and restores focus to the opener', async () => {
    render(<Harness initial={['r0']} />)
    fireEvent.click(rowByLabel('Row 001'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(document.activeElement).toBe(trigger()))
    expect(screen.getByTestId('applied')).toHaveTextContent('r0')
  })

  it('the minimise glyph discards and restores focus (A.9 SHOULD)', async () => {
    render(<Harness initial={['r0']} />)
    fireEvent.click(rowByLabel('Row 001'))
    fireEvent.click(screen.getByRole('button', { name: /Minimise Owner selector/ }))
    await waitFor(() => expect(document.activeElement).toBe(trigger()))
    expect(screen.getByTestId('applied')).toHaveTextContent('r0')
  })

  it('Escape discards and restores focus (D-3)', async () => {
    render(<Harness initial={['r0']} />)
    fireEvent.click(rowByLabel('Row 001'))
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(document.activeElement).toBe(trigger()))
    expect(screen.getByTestId('applied')).toHaveTextContent('r0')
  })
})

/* ── single select (R-24/R-26) ─────────────────────────────────────────── */

describe('ExpandableSelectorSheet — single select (R-26)', () => {
  it('commits immediately on pick and shows no Confirm footer', () => {
    const onConfirm = vi.fn()
    const facet = facetOf({ multiple: false })
    render(<Harness facet={facet} onConfirm={onConfirm} />)
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
    fireEvent.click(rowByLabel('Row 002'))
    expect(onConfirm).toHaveBeenCalledWith(['r2'])
  })

  it('draws radios rather than checkboxes (R-24/DN-16)', () => {
    const facet = facetOf({ multiple: false })
    render(<Harness facet={facet} />)
    expect(document.querySelectorAll('[data-slot="row-radio"]').length).toBe(6)
    expect(document.querySelectorAll('[data-slot="row-checkbox"]').length).toBe(0)
  })
})
