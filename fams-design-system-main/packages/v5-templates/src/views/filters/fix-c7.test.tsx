import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { FilterFacet } from '@fams/v5-composer'
import { FilterField } from './FilterField'
import { useFilterSession } from './use-filter-session'
import { entityFacet, multiFacet } from './fixtures'

/**
 * FIX WAVE C-7 — the "fix now" findings of the C-6 code review that the three
 * live gates could not see: M3 (the clear `×` swallowing clicks on the tail of
 * the value line) and M4 (a host-returned record id rendered as its own label).
 */

function Harness({
  facet = multiFacet,
  initial,
  onCreateFromSearch,
}: {
  facet?: FilterFacet
  initial?: unknown
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
      onChange={setValue}
    />
  )
}

const fieldTrigger = () => document.querySelector('[data-slot="filter-field-trigger"]') as HTMLElement

const creatableFacet: FilterFacet = {
  ...entityFacet,
  createFromSearch: { enabled: true, entity: 'owner' },
}

describe('M3 — the clear button never overhangs the value line', () => {
  it('reserves trailing padding >= the clear button’s full inline extent', () => {
    render(<Harness initial={['g1', 'g2']} />)
    const clear = screen.getByRole('button', { name: 'Clear Group' })
    // The geometry the invariant is written against: inset + box <= padding.
    expect(clear.className).toContain('end-7') // 28px inset
    expect(clear.className).toContain('size-10') // 40px box — B.11's hit target
    // 2026-09-01 field-states shell: the padding reservation lives on the
    // wrapping InsetField shell, not the bare inner combobox button.
    const shell = document.querySelector('[data-slot="filter-field-shell"]') as HTMLElement
    expect(shell.className).toContain('pe-17') // 68px reservation
    expect(shell.className).not.toContain('pe-12')
  })

  it('keeps the B.11 40px hit target while it does so', () => {
    render(<Harness initial={['g1']} />)
    expect(screen.getByRole('button', { name: 'Clear Group' }).className).toContain('size-10')
  })

  it('uses the semantic muted token, not a palette escape hatch (L3)', () => {
    render(<Harness initial={['g1']} />)
    const clear = screen.getByRole('button', { name: 'Clear Group' })
    expect(clear.className).toContain('text-muted-foreground')
    expect(clear.className).not.toContain('text-gray-400')
  })
})

describe('M4 — a host-created record shows the typed text, not its raw id', () => {
  it('renders the typed label for an id the option list does not know yet', () => {
    render(<Harness facet={creatableFacet} onCreateFromSearch={() => 'rec_9f2c81'} />)
    fireEvent.click(fieldTrigger())
    const search = screen.getByRole('combobox', { name: /^Search / })
    fireEvent.change(search, { target: { value: 'Zeta Testperson' } })
    fireEvent.click(document.querySelector('[data-slot="filter-create"]')!)
    expect(fieldTrigger()).toHaveTextContent('Zeta Testperson')
    expect(fieldTrigger().textContent).not.toContain('rec_9f2c81')
  })

  it('still renders the typed text when the host returns nothing (G.58 unchanged)', () => {
    render(<Harness facet={creatableFacet} onCreateFromSearch={() => undefined} />)
    fireEvent.click(fieldTrigger())
    fireEvent.change(screen.getByRole('combobox', { name: /^Search / }), {
      target: { value: 'Zeta Testperson' },
    })
    fireEvent.click(document.querySelector('[data-slot="filter-create"]')!)
    expect(fieldTrigger()).toHaveTextContent('Zeta Testperson')
  })
})
