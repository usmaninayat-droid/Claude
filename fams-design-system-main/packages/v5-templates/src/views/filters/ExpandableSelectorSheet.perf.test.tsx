import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { FilterExpandColumn, FilterFacet } from '@fams/v5-composer'
import {
  ExpandableSelectorSheet,
  type SelectorRow,
} from './ExpandableSelectorSheet'

/**
 * WAVE C5 perf smoke — the 292-row / 12-column stress case named by D-7 (the
 * workforce seed grows 20 → 292) and by UX E.46 ("assert the option-row DOM
 * node count stays under 100 for a 292-item entity list").
 *
 * What this guards is a REGRESSION SHAPE, not a benchmark: if the windowing
 * in `ExpandableSelectorSheet` is ever removed or silently degrades to
 * rendering the whole list (the exact failure mode ui-kit's `DataTable`
 * virtualiser has by design when a viewport measures 0px), the DOM row count
 * jumps from ~15 to 292 and the mount time follows. The time budget is
 * deliberately generous — CI machines are noisy and a tight budget here would
 * be a flake generator, per `docs/TESTING.md`. The DOM-count bound is the
 * assertion that actually has teeth.
 */

const COLUMNS: FilterExpandColumn[] = Array.from({ length: 12 }, (_, i) => ({
  col: `c${i}`,
  label: `Col ${i}`,
  sortable: i < 3,
}))

const FACET: FilterFacet = {
  col: 'owner',
  label: 'Owner',
  type: 'reference',
  kind: 'entity',
  multiple: true,
  expandable: true,
  icon: 'filter',
  expandView: {
    columns: COLUMNS,
    searchable: true,
    sortable: true,
    columnSettings: true,
    selectedToTop: true,
  },
}

const ROWS: SelectorRow[] = Array.from({ length: 292 }, (_, i) => {
  const row: SelectorRow = { id: `r${i}` }
  COLUMNS.forEach((c, j) => {
    row[c.col] = j === 0 ? `Row ${String(i).padStart(3, '0')}` : `${c.col}-${i}`
  })
  return row
})

/** Generous — this is a shape guard, not a benchmark. */
const MOUNT_BUDGET_MS = 4000
/** E.46's bound. */
const MAX_DOM_ROWS = 100

const domRows = () =>
  screen.getAllByRole('row').filter((r) => (r as HTMLElement).dataset.slot === 'sheet-row')

describe('ExpandableSelectorSheet — 292-row perf smoke', () => {
  it('mounts 292 rows × 12 columns within budget with a bounded DOM', () => {
    const started = performance.now()
    render(
      <ExpandableSelectorSheet
        facet={FACET}
        rows={ROWS}
        value={[]}
        open
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    const elapsed = performance.now() - started

    expect(screen.getByText('Showing 292 items')).toBeInTheDocument()
    expect(domRows().length).toBeLessThanOrEqual(MAX_DOM_ROWS)
    expect(domRows().length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(MOUNT_BUDGET_MS)
  })

  it('stays bounded after Select All over all 292 rows', () => {
    render(
      <ExpandableSelectorSheet
        facet={FACET}
        rows={ROWS}
        value={[]}
        open
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Select All' }))
    expect(screen.getByRole('button', { name: 'Unselect All' })).toBeInTheDocument()
    expect(domRows().length).toBeLessThanOrEqual(MAX_DOM_ROWS)
    // Every rendered row reflects the staged selection…
    for (const row of domRows()) expect(row).toHaveAttribute('aria-selected', 'true')
    // …and the whole 292 is staged, not just the window.
    expect(screen.getByRole('checkbox', { name: /Select all 292 shown Owner/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('stays bounded while scrolling and sorting the 292-row list', () => {
    render(
      <ExpandableSelectorSheet
        facet={FACET}
        rows={ROWS}
        value={[]}
        open
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    const scroller = document.querySelector('[data-slot="sheet-table-scroller"]') as HTMLElement
    fireEvent.scroll(scroller, { target: { scrollTop: 8000 } })
    expect(domRows().length).toBeLessThanOrEqual(MAX_DOM_ROWS)

    const header = screen.getByRole('columnheader', { name: /Col 0/ })
    fireEvent.click(header.querySelector('button')!)
    expect(header).toHaveAttribute('aria-sort', 'ascending')
    expect(domRows().length).toBeLessThanOrEqual(MAX_DOM_ROWS)
  })
})
