import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { FilterFacet } from '@fams/v5-composer'
import { FilterField, triggerLabelLine } from './FilterField'
import { useFilterSession } from './use-filter-session'
import {
  dateFacet,
  entityFacet,
  manyOptionsFacet,
  multiFacet,
  singleFacet,
  statusFacet,
  tagsFacet,
} from './fixtures'

function Harness({
  facet,
  initial,
  onChange,
  onExpand,
  openedBefore = false,
}: {
  facet: FilterFacet
  initial?: unknown
  onChange?: (next: unknown) => void
  onExpand?: (facet: FilterFacet) => void
  openedBefore?: boolean
}) {
  const session = useFilterSession('mod:view')
  const [value, setValue] = useState<unknown>(initial)
  if (openedBefore && !session.hasOpenedBefore(facet.col)) session.markOpened(facet.col)
  return (
    <FilterField
      facet={facet}
      value={value}
      session={session}
      onExpand={onExpand}
      valueWidth={140}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

const trigger = () => screen.getByRole('combobox', { name: /.*/ })
const openDropdown = () => fireEvent.click(screen.getAllByRole('combobox')[0])
const search = () => screen.getByRole('combobox', { name: /^Search / })

describe('triggerLabelLine', () => {
  it('is the bare field name with nothing selected, and pluralises the count otherwise', () => {
    expect(triggerLabelLine(multiFacet, 0)).toBe('Group')
    expect(triggerLabelLine(multiFacet, 1)).toBe('1 Group Selected')
    expect(triggerLabelLine(multiFacet, 3)).toBe('3 Groups Selected')
  })
})

describe('FilterField — body per kind', () => {
  it('multi-select renders the option listbox with aria-multiselectable', () => {
    render(<Harness facet={multiFacet} />)
    openDropdown()
    const listbox = screen.getByRole('listbox')
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true')
    expect(within(listbox).getAllByRole('option')).toHaveLength(5)
  })

  it('single-select renders a listbox without aria-multiselectable', () => {
    render(<Harness facet={singleFacet} />)
    openDropdown()
    expect(screen.getByRole('listbox')).not.toHaveAttribute('aria-multiselectable')
  })

  it('status renders a StatusDot per coloured row and the count pill', () => {
    const { baseElement } = render(<Harness facet={statusFacet} />)
    openDropdown()
    expect(baseElement.querySelectorAll('[data-status-dot]')).toHaveLength(2)
    expect(baseElement.querySelectorAll('[data-slot="filter-option-count"]')).toHaveLength(2)
  })

  it('tags renders the chip groups, not the option listbox', () => {
    render(<Harness facet={tagsFacet} />)
    openDropdown()
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByRole('button', { name: /Label One/ })).toBeInTheDocument()
  })

  it('entity renders the expand affordance and calls onExpand (C5 supplies the sheet)', () => {
    const onExpand = vi.fn()
    render(<Harness facet={entityFacet} onExpand={onExpand} />)
    openDropdown()
    fireEvent.click(screen.getByRole('button', { name: 'Open expanded Owner selection' }))
    expect(onExpand).toHaveBeenCalledWith(entityFacet)
  })

  it('date reuses the date range control instead of a second layer', () => {
    const { baseElement } = render(<Harness facet={dateFacet} />)
    expect(baseElement.querySelector('[data-slot="filter-field"][data-kind="date"]')).not.toBeNull()
    expect(baseElement.querySelector('[data-slot="filter-field-trigger"]')).toBeNull()
  })
})

describe('FilterField — trigger summary', () => {
  it('renders the +N inside the trigger and never a page-level chip row (E.41/J.95)', () => {
    const { baseElement } = render(
      <Harness facet={manyOptionsFacet} initial={manyOptionsFacet.optionDefs!.map((o) => o.value)} />,
    )
    const fieldTrigger = baseElement.querySelector('[data-slot="filter-field-trigger"]')!
    const overflow = fieldTrigger.querySelector('[data-slot="filter-field-overflow"]')!
    expect(overflow).not.toBeNull()
    // 2026-09-01 field-states shell: the summary line is the InsetField's own
    // floated caption (its <label>), a sibling of the bare trigger button.
    const shell = baseElement.querySelector('[data-slot="filter-field-shell"]')!
    expect(shell.querySelector('label')!.textContent).toBe('20 Buckets Selected')
    const hidden = Number(overflow.textContent!.replace('+', ''))
    const shown = fieldTrigger.querySelector('[data-slot="filter-field-value"] span')!.textContent!.split(', ').length
    expect(hidden).toBe(20 - shown)
  })

  it('renders no +N when everything fits', () => {
    const { baseElement } = render(<Harness facet={multiFacet} initial={['g1']} />)
    expect(baseElement.querySelector('[data-slot="filter-field-overflow"]')).toBeNull()
  })
})

describe('FilterField — live apply (G.63)', () => {
  it('a toggle calls onChange immediately and no Apply button exists', () => {
    const onChange = vi.fn()
    render(<Harness facet={multiFacet} onChange={onChange} />)
    openDropdown()
    fireEvent.click(screen.getByRole('option', { name: /Group Two/ }))
    expect(onChange).toHaveBeenCalledWith(['g2'])
    expect(screen.queryByRole('button', { name: /^(Apply|Done|Confirm)$/ })).toBeNull()
  })

  it('single-select selects and closes', () => {
    const onChange = vi.fn()
    render(<Harness facet={singleFacet} onChange={onChange} />)
    openDropdown()
    fireEvent.click(screen.getByRole('option', { name: /Mode Two/ }))
    expect(onChange).toHaveBeenCalledWith('m2')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('Enter on the active option toggles; Space types a space while a query is open (C.19)', () => {
    const onChange = vi.fn()
    render(<Harness facet={multiFacet} onChange={onChange} />)
    openDropdown()
    fireEvent.keyDown(search(), { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith(['g1'])
    fireEvent.change(search(), { target: { value: 'Group' } })
    onChange.mockClear()
    fireEvent.keyDown(search(), { key: ' ' })
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('FilterField — meta actions (C.23)', () => {
  it('names each action per section and applies immediately', () => {
    const onChange = vi.fn()
    render(<Harness facet={multiFacet} onChange={onChange} />)
    openDropdown()
    fireEvent.click(screen.getByRole('button', { name: 'Select all available Groups' }))
    expect(onChange).toHaveBeenLastCalledWith(['g1', 'g2', 'g3', 'g4', 'g5'])
    fireEvent.click(screen.getByRole('button', { name: /^Unselect all 5 selected Groups$/ }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('single-select shows no meta actions', () => {
    render(<Harness facet={singleFacet} />)
    openDropdown()
    expect(screen.queryByRole('button', { name: /Select all available/ })).toBeNull()
  })
})

describe('FilterField — sections (F.47/F.48/F.50/F.52)', () => {
  it('the first-ever open is a flat list; once opened before the split appears', () => {
    render(<Harness facet={multiFacet} initial={['g2']} />)
    openDropdown()
    expect(screen.queryByRole('group', { name: /^Selected/ })).toBeNull()
    fireEvent.keyDown(document.body, { key: 'Escape' })

    render(<Harness facet={multiFacet} initial={['g2']} openedBefore />)
    fireEvent.click(screen.getAllByRole('combobox')[0])
    expect(screen.getByRole('group', { name: 'Selected (1)' })).toBeInTheDocument()
  })

  it('unticking a row keeps it in place and updates the live count only (F.47/F.48)', () => {
    render(<Harness facet={multiFacet} initial={['g2', 'g3']} openedBefore />)
    openDropdown()
    const selectedGroup = screen.getByRole('group', { name: 'Selected (2)' })
    const rows = within(selectedGroup).getAllByRole('option')
    expect(rows).toHaveLength(2)
    fireEvent.click(rows[0])
    const after = screen.getByRole('group', { name: 'Selected (1)' })
    expect(within(after).getAllByRole('option')).toHaveLength(2)
    expect(within(after).getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'false')
  })

  it('renders exactly one divider with a split and none without', () => {
    const { baseElement, unmount } = render(<Harness facet={multiFacet} initial={['g2']} openedBefore />)
    openDropdown()
    expect(baseElement.querySelectorAll('[data-slot="filter-section-divider"]')).toHaveLength(1)
    unmount()

    const second = render(<Harness facet={multiFacet} openedBefore />)
    fireEvent.click(screen.getAllByRole('combobox')[0])
    expect(second.baseElement.querySelectorAll('[data-slot="filter-section-divider"]')).toHaveLength(0)
  })
})

describe('FilterField — Escape scope (D-3/C.25)', () => {
  it('the first Escape clears a non-empty query and keeps the dropdown open', () => {
    render(<Harness facet={multiFacet} />)
    openDropdown()
    fireEvent.change(search(), { target: { value: 'Two' } })
    expect(screen.getAllByRole('option')).toHaveLength(1)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(search()).toHaveValue('')
  })

  it('Escape on an empty query closes the dropdown and restores focus to the trigger', () => {
    render(<Harness facet={multiFacet} />)
    openDropdown()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('a dropdown Escape never reaches the host panel', () => {
    const onPanelEscape = vi.fn()
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div
        onKeyDown={(e) => {
          if (e.key === 'Escape') onPanelEscape()
        }}
      >
        <Harness facet={multiFacet} />
      </div>,
    )
    openDropdown()
    fireEvent.keyDown(search(), { key: 'Escape' })
    expect(onPanelEscape).not.toHaveBeenCalled()
  })
})

describe('FilterField — listbox keyboard (C.17)', () => {
  it('arrows move and wrap the active descendant', () => {
    render(<Harness facet={singleFacet} />)
    openDropdown()
    const input = search()
    const first = input.getAttribute('aria-activedescendant')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const second = input.getAttribute('aria-activedescendant')
    expect(second).not.toBe(first)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).toBe(first)
    fireEvent.keyDown(input, { key: 'End' })
    expect(input.getAttribute('aria-activedescendant')).toBe(second)
  })
})
