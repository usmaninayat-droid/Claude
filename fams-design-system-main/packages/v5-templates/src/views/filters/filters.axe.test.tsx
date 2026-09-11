/**
 * FAMILY C filter-panel axe sweep (WAVE C4), mirroring `src/a11y.axe.test.tsx`
 * — see its header for why `color-contrast`/`region` are disabled under jsdom
 * and why the matcher is wired from `vitest-axe/dist/matchers.js`. Both
 * overlays are axed OPEN, and `document.body` is the target for the dropdown
 * so the PORTALLED content (E.38) is actually covered.
 */
import { useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import type { FilterExpandColumn, FilterFacet } from '@fams/v5-composer'
import { FilterPanelV2 } from './FilterPanelV2'
import { ExpandableSelectorSheet, type SelectorRow } from './ExpandableSelectorSheet'
import { useFilterSession } from './use-filter-session'
import { panelFacets, statusFacet } from './fixtures'

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion extends AxeMatchers {}
}

expect.extend({ toHaveNoViolations })

const axe = configureAxe({ rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })

function Fixture({ initial = {} }: { initial?: Record<string, unknown> }) {
  const session = useFilterSession('mod:view')
  const [value, setValue] = useState<Record<string, unknown>>(initial)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  return (
    <div>
      <button type="button" ref={triggerRef} aria-haspopup="dialog" aria-expanded aria-label="Filters, 1 applied">
        Filters
      </button>
      <FilterPanelV2
        facets={panelFacets}
        value={value}
        session={session}
        open
        announceDelayMs={0}
        triggerRef={triggerRef}
        onChange={(col, next) => setValue((v) => ({ ...v, [col]: next }))}
        onClearAll={() => setValue({})}
        onExpand={() => {}}
      />
    </div>
  )
}

/* ── WAVE C5 — the side sheet (the fourth focus layer) ─────────────────── */

const sheetColumns: FilterExpandColumn[] = Array.from({ length: 12 }, (_, i) => ({
  col: `c${i}`,
  label: `Col ${i}`,
  sortable: i < 3,
}))

const sheetFacet: FilterFacet = {
  col: 'owner',
  label: 'Owner',
  type: 'reference',
  kind: 'entity',
  multiple: true,
  expandable: true,
  icon: 'filter',
  expandView: {
    columns: sheetColumns,
    searchable: true,
    sortable: true,
    columnSettings: true,
    selectedToTop: true,
  },
}

/** 292 rows — the sheet is axed at its STRESS size, windowing and all. */
const sheetRows: SelectorRow[] = Array.from({ length: 292 }, (_, i) => {
  const row: SelectorRow = { id: `r${i}` }
  sheetColumns.forEach((c, j) => {
    row[c.col] = j === 0 ? `Row ${String(i).padStart(3, '0')}` : `${c.col}-${i}`
  })
  return row
})

function SheetFixture({ initial = [] as string[] }) {
  const [value, setValue] = useState<string[]>(initial)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  return (
    <div>
      <button type="button" ref={triggerRef} aria-label="Expand Owner selector">
        Expand
      </button>
      <ExpandableSelectorSheet
        facet={sheetFacet}
        rows={sheetRows}
        value={value}
        open
        triggerRef={triggerRef}
        onConfirm={setValue}
        onCancel={() => {}}
      />
    </div>
  )
}

describe('FAMILY C filters — axe', () => {
  it('FilterPanelV2 (open, no filters applied) has no violations', async () => {
    const { container } = render(<Fixture />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('FilterPanelV2 (open, filters applied) has no violations', async () => {
    const { container } = render(<Fixture initial={{ group: ['g1', 'g2'], state: ['s1'] }} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('a portalled field dropdown (open, split sections) has no violations', async () => {
    const { baseElement } = render(<Fixture initial={{ state: ['s1'] }} />)
    const field = within(screen.getByRole('dialog')).getByRole('combobox', { name: new RegExp(statusFacet.label) })
    // open → close (F.50 sets `openedBefore`) → open again, so the sweep
    // covers the Selected/Available split, not just the flat first open.
    fireEvent.click(field)
    fireEvent.click(field)
    fireEvent.click(field)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Selected (1)' })).toBeInTheDocument()
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it('the ExpandableSelectorSheet (open, 292 rows, nothing selected) has no violations', async () => {
    const { baseElement } = render(<SheetFixture />)
    // The sheet is PORTALLED, so `baseElement` is the only target that covers it.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it('the ExpandableSelectorSheet (rows staged, Selected to Top on) has no violations', async () => {
    const { baseElement } = render(<SheetFixture initial={['r3']} />)
    fireEvent.click(screen.getByRole('button', { name: 'Selected to Top' }))
    fireEvent.click(screen.getByText('Row 005').closest('tr')!)
    // The blocked `Confirm` is `aria-disabled` + `aria-describedby`, never
    // `disabled` (D.30) — axe must be happy with that shape too.
    expect(screen.getByRole('button', { name: 'Confirm' })).not.toHaveAttribute('aria-disabled')
    expect(await axe(baseElement)).toHaveNoViolations()
  })
})
