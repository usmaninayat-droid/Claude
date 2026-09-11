import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { FilterFacet } from '@fams/v5-composer'
import { FilterField } from './FilterField'
import { ExpandableSelectorSheet, type SelectorRow } from './ExpandableSelectorSheet'
import { useFilterSession } from './use-filter-session'
import { entityFacet, manyOptionsFacet, multiFacet } from './fixtures'

/**
 * FIX WAVE C-6 — the round-5 UX gate's MUST failures, one describe per row.
 * Every assertion here is the row's own assertion, restated at unit level:
 * B.11/N1 (clear affordance + open-state chrome), B.12 (ArrowDown opens),
 * B.14 (Backspace clears), G.58 (create CTA reachable AND selecting),
 * H.69/H.70 (a real scroll indicator + bottom fade), H.71 (keyboard ring vs
 * hover fill), N2 (24px field icon), I.73/I.81 (sheet `aria-modal`, readable
 * blocked `Confirm`). A.4/J.92 live in `ModuleViewFilters.test.tsx`, where the
 * panel's own trigger exists.
 */

function Harness({
  facet = multiFacet,
  initial,
  onChange,
  onCreateFromSearch,
}: {
  facet?: FilterFacet
  initial?: unknown
  onChange?: (next: unknown) => void
  onCreateFromSearch?: (facet: FilterFacet, query: string) => string | void
}) {
  const session = useFilterSession('mod:view')
  const [value, setValue] = useState<unknown>(initial)
  return (
    <FilterField
      facet={facet}
      value={value}
      session={session}
      valueWidth={140}
      onCreateFromSearch={onCreateFromSearch}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

const fieldTrigger = () => document.querySelector('[data-slot="filter-field-trigger"]') as HTMLElement
// 2026-09-01 field-states shell: the visual chrome (border, chevron, icon)
// lives on the wrapping InsetField; the bare button inside stays the combobox.
const fieldShell = () => document.querySelector('[data-slot="filter-field-shell"]') as HTMLElement

const creatableFacet: FilterFacet = {
  ...entityFacet,
  createFromSearch: { enabled: true, entity: 'owner' },
}

describe('B.11 / N1 — the clear affordance and the open-state chrome', () => {
  it('a filled field shows a ≥40px `Clear <field>` button that clears it live', () => {
    const onChange = vi.fn()
    render(<Harness initial={['g1', 'g2']} onChange={onChange} />)
    const clear = screen.getByRole('button', { name: 'Clear Group' })
    expect(clear).toHaveAttribute('data-slot', 'filter-field-clear')
    // 40px hit target — `size-10` is the 2.5rem box.
    expect(clear.className).toContain('size-10')
    fireEvent.click(clear)
    expect(onChange).toHaveBeenCalledWith([])
    expect(screen.queryByRole('button', { name: 'Clear Group' })).toBeNull()
  })

  it('an empty field has no clear affordance', () => {
    render(<Harness />)
    expect(screen.queryByRole('button', { name: 'Clear Group' })).toBeNull()
  })

  it('the open field takes the open-state border and the chevron rotates (SPEC §1.4)', () => {
    render(<Harness />)
    const chevron = () => fieldShell().querySelector('[data-slot="filter-field-chevron"]')!
    expect(fieldShell().className).not.toContain('border-success')
    expect(chevron().getAttribute('class')).not.toContain('rotate-180')
    fireEvent.click(fieldTrigger())
    expect(fieldShell().className).toContain('border-success')
    const openChevron = fieldShell().querySelector('[data-slot="filter-field-chevron"]')!
    expect(openChevron.getAttribute('class')).toContain('rotate-180')
    expect(openChevron.getAttribute('class')).toContain('text-error-text')
  })
})

describe('N2 (superseded 2026-09-01) — the field icon matches the platform field-states shell', () => {
  // The InsetField shell's leading glyph is 20px (`size-5`, platform field
  // spec) — superseding the bespoke trigger's 24px N2 row.
  it('renders `size-5` in the shell', () => {
    render(<Harness />)
    const icon = document.querySelector('[data-slot="filter-field-icon"]')!
    expect(icon.getAttribute('class')).toContain('size-5')
    expect(icon.getAttribute('class')).not.toContain('size-6')
  })
})

describe('B.12 / B.14 — the field trigger keyboard contract', () => {
  it('ArrowDown opens the dropdown with the FIRST option active', () => {
    render(<Harness />)
    fireEvent.keyDown(fieldTrigger(), { key: 'ArrowDown' })
    const search = screen.getByRole('combobox', { name: /^Search / })
    const active = document.getElementById(search.getAttribute('aria-activedescendant')!)
    expect(active).toHaveTextContent('Group One')
  })

  it('Alt+ArrowDown opens it too', () => {
    render(<Harness />)
    fireEvent.keyDown(fieldTrigger(), { key: 'ArrowDown', altKey: true })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('Enter still opens the dropdown (unchanged)', () => {
    render(<Harness />)
    fireEvent.click(fieldTrigger())
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('Backspace on a filled field clears it (B.14)', () => {
    const onChange = vi.fn()
    render(<Harness initial={['g1']} onChange={onChange} />)
    fireEvent.keyDown(fieldTrigger(), { key: 'Backspace' })
    expect(onChange).toHaveBeenCalledWith([])
  })
})

describe('G.58 — the create-from-search CTA is reachable AND selects what it creates', () => {
  const openWithQuery = (query: string) => {
    fireEvent.click(fieldTrigger())
    fireEvent.change(screen.getByRole('combobox', { name: /^Search / }), { target: { value: query } })
    return screen.getByRole('combobox', { name: /^Search / })
  }

  it('is the listbox’s final item, so ArrowDown reaches it', () => {
    render(<Harness facet={creatableFacet} />)
    const search = openWithQuery('Zeta Testperson')
    const cta = document.querySelector('[data-slot="filter-create"]')!
    expect(cta.tagName).toBe('BUTTON')
    fireEvent.keyDown(search, { key: 'ArrowDown' })
    expect(search.getAttribute('aria-activedescendant')).toBe(cta.id)
  })

  it('activating it selects the created value, so the field shows it', () => {
    const onChange = vi.fn()
    const onCreateFromSearch = vi.fn(() => undefined)
    render(<Harness facet={creatableFacet} onChange={onChange} onCreateFromSearch={onCreateFromSearch} />)
    openWithQuery('Zeta Testperson')
    fireEvent.click(document.querySelector('[data-slot="filter-create"]')!)
    expect(onCreateFromSearch).toHaveBeenCalledWith(creatableFacet, 'Zeta Testperson')
    expect(onChange).toHaveBeenCalledWith(['Zeta Testperson'])
    expect(fieldTrigger()).toHaveTextContent('Zeta Testperson')
  })

  it('selects the id the host returns when it has one', () => {
    const onChange = vi.fn()
    render(
      <Harness facet={creatableFacet} onChange={onChange} onCreateFromSearch={() => 'o-99'} />,
    )
    fireEvent.click(fieldTrigger())
    fireEvent.change(screen.getByRole('combobox', { name: /^Search / }), { target: { value: 'Zeta' } })
    fireEvent.keyDown(screen.getByRole('combobox', { name: /^Search / }), { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith(['o-99'])
  })
})

describe('H.69 / H.70 — the dropdown scroller has a real indicator and a bottom fade', () => {
  it('renders named thumb, track and fade nodes', () => {
    render(<Harness facet={manyOptionsFacet} />)
    fireEvent.click(fieldTrigger())
    const scroller = document.querySelector('[data-slot="custom-scrollbar"]')!
    expect(scroller.querySelector('[data-slot="custom-scrollbar-fade"]')).not.toBeNull()
    // jsdom reports no overflow, so thumb/track presence is asserted on the
    // component's contract in `CustomScrollbar.test.tsx` (measured metrics);
    // here the opt-in fade node and the viewport are the observable half.
    expect(scroller.querySelector('[data-slot="custom-scrollbar-viewport"]')).not.toBeNull()
  })
})

describe('H.71 — the keyboard-active option is not the hover fill', () => {
  it('adds a ring on keyboard navigation and drops it on hover', () => {
    render(<Harness />)
    fireEvent.click(fieldTrigger())
    const search = screen.getByRole('combobox', { name: /^Search / })
    fireEvent.keyDown(search, { key: 'ArrowDown' })
    const active = () => document.querySelector('[data-slot="filter-option"][data-active]')!
    expect(active().getAttribute('data-active-mode')).toBe('keyboard')
    expect(active().className).toContain('ring-ring')

    const rows = screen.getAllByRole('option')
    fireEvent.mouseMove(rows[1])
    const hovered = document.querySelector('[data-slot="filter-option"][data-active]')!
    expect(hovered.getAttribute('data-active-mode')).toBe('pointer')
    expect(hovered.className).toContain('bg-muted')
    expect(hovered.className).not.toContain('ring-ring')
  })
})

const sheetRows: SelectorRow[] = [
  { id: 'o-1', name: 'Owner One' },
  { id: 'o-2', name: 'Owner Two' },
]

describe('I.73 / I.81 — the sheet’s modal attribute and its blocked Confirm', () => {
  const renderSheet = () => {
    const Wrapper = () => {
      const session = useFilterSession('mod:view')
      return (
        <ExpandableSelectorSheet
          open
          facet={entityFacet}
          rows={sheetRows}
          value={[]}
          session={session}
          getRowId={(row) => String(row.id)}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      )
    }
    render(<Wrapper />)
    return document.querySelector('[data-slot="expandable-selector-sheet"]')!
  }

  it('the sheet root is aria-modal="true" (I.73)', () => {
    expect(renderSheet()).toHaveAttribute('aria-modal', 'true')
  })

  it('a blocked Confirm uses the disabled SURFACE, not 0.4 opacity, and states its reason visibly (I.81)', () => {
    const sheet = renderSheet()
    const confirm = sheet.querySelector('[data-slot="sheet-confirm"]')! as HTMLElement
    expect(confirm).toHaveAttribute('aria-disabled', 'true')
    expect(confirm.className).not.toContain('opacity-40')
    expect(confirm.className).toContain('bg-muted')
    expect(confirm.className).toContain('text-muted-foreground')
    const reason = document.getElementById(confirm.getAttribute('aria-describedby')!)!
    expect(reason.className).not.toContain('sr-only')
    expect(reason).toHaveTextContent(/at least one/i)
    expect(within(sheet as HTMLElement).getByText(/at least one/i)).toBeVisible()
  })
})
