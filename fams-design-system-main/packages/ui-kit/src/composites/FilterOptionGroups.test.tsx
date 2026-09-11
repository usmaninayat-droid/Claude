import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterOptionGroups, FILTER_CHIP_GEOMETRY, type FilterOptionGroupOption } from './FilterOptionGroups'
import { TagChipList } from './TagChipList'

const FLAT_OPTIONS: FilterOptionGroupOption[] = [
  { value: 'v1', label: 'Vehicle 01' },
  { value: 'v2', label: 'Vehicle 02' },
  { value: 'v3', label: 'Vehicle 03' },
]

const TAG_OPTIONS: FilterOptionGroupOption[] = [
  { value: 'stringer', label: 'Stringer', category: 'My Private Tags' },
  { value: 'inspections-private', label: 'Inspections', category: 'My Private Tags' },
  { value: 'inspections-general', label: 'Inspections', category: 'General Tags' },
  { value: 'inspectors', label: 'Inspectors', category: 'General Tags' },
  { value: 'contract-1', label: 'Contract 1', category: 'Contract' },
  { value: 'contract-2', label: 'Contract 2', category: 'Contract' },
  { value: 'zone-1', label: 'Zone 1', category: 'Geozones' },
]

describe('FilterOptionGroups — flat, uncategorised', () => {
  it('renders every chip with no category caption/role=group', () => {
    render(<FilterOptionGroups options={FLAT_OPTIONS} value={[]} onChange={() => {}} />)
    expect(screen.getByText('Vehicle 01')).toBeInTheDocument()
    expect(screen.getByText('Vehicle 02')).toBeInTheDocument()
    expect(screen.getByText('Vehicle 03')).toBeInTheDocument()
    expect(screen.queryAllByRole('group')).toHaveLength(0)
  })

  it('toggles a chip on click and reports the new value', () => {
    const onChange = vi.fn()
    render(<FilterOptionGroups options={FLAT_OPTIONS} value={['v1']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Vehicle 02/ }))
    expect(onChange).toHaveBeenCalledWith(['v1', 'v2'])
    fireEvent.click(screen.getByRole('button', { name: 'Vehicle 01' }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})

describe('FilterOptionGroups — categorised (R-22)', () => {
  it('groups chips by category, each a labelled role="group", in first-appearance order', () => {
    render(<FilterOptionGroups options={TAG_OPTIONS} value={[]} onChange={() => {}} />)
    const groups = screen.getAllByRole('group')
    // 4 distinct categories in TAG_OPTIONS: My Private Tags, General Tags, Contract, Geozones.
    expect(groups).toHaveLength(4)
    const captions = groups.map((g) => g.getAttribute('aria-labelledby'))
    for (const id of captions) {
      expect(id).toBeTruthy()
      expect(document.getElementById(id!)).toHaveTextContent(/./)
    }
    expect(screen.getByText('My Private Tags')).toBeInTheDocument()
    expect(screen.getByText('General Tags')).toBeInTheDocument()
    expect(screen.getByText('Contract')).toBeInTheDocument()
    expect(screen.getByText('Geozones')).toBeInTheDocument()
  })

  it('assigns category colour by index of first appearance, stable across renders', () => {
    const { rerender } = render(<FilterOptionGroups options={TAG_OPTIONS} value={[]} onChange={() => {}} />)
    const chipStyle = (name: string, index = 0) =>
      (screen.getAllByRole('button', { name }) as HTMLButtonElement[])[index].style.backgroundColor

    const privateColor = chipStyle('Stringer')
    const generalColor = chipStyle('Inspectors')
    const contractColor = chipStyle('Contract 1')
    const geozoneColor = chipStyle('Zone 1')
    // Four distinct categories in first-appearance order get four distinct colours.
    expect(new Set([privateColor, generalColor, contractColor, geozoneColor]).size).toBe(4)
    // Both chips labelled "Inspections" share their OWN category's colour, not each other's:
    // the first (My Private Tags) matches Stringer, the second (General Tags) matches Inspectors.
    expect(chipStyle('Inspections', 0)).toBe(privateColor)
    expect(chipStyle('Inspections', 1)).toBe(generalColor)

    rerender(<FilterOptionGroups options={TAG_OPTIONS} value={['stringer']} onChange={() => {}} />)
    expect(chipStyle('Stringer')).toBe(privateColor)
  })

  it('renders a trailing check mark on selected chips only (I.79)', () => {
    render(<FilterOptionGroups options={TAG_OPTIONS} value={['stringer', 'contract-1']} onChange={() => {}} />)
    const selectedChips = document.querySelectorAll('[data-selected="true"]')
    expect(selectedChips).toHaveLength(2)
    for (const chip of selectedChips) {
      expect(chip.querySelector('[data-check]')).toBeTruthy()
    }
    const unselected = screen.getByRole('button', { name: 'Zone 1' })
    expect(unselected.querySelector('[data-check]')).toBeNull()
    expect(unselected).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Stringer' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('FilterOptionGroups — selected/available split (F.47–F.54)', () => {
  it('splits by the selectedIds snapshot and keeps an unticked chip in Selected, in frozen order', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <FilterOptionGroups
        options={TAG_OPTIONS}
        value={['stringer', 'contract-1']}
        onChange={onChange}
        sections="selected-available"
        selectedIds={['stringer', 'contract-1']}
        frozenOrder={TAG_OPTIONS.map((o) => o.value)}
      />,
    )
    expect(screen.getByText('Selected (2)')).toBeInTheDocument()
    const selectedSection = document.querySelector('[data-section="selected"]')!
    const availableSection = document.querySelector('[data-section="available"]')!
    expect(selectedSection.textContent).toContain('Stringer')
    expect(selectedSection.textContent).toContain('Contract 1')
    expect(availableSection.textContent).not.toContain('Stringer')

    const orderBefore = Array.from(selectedSection.querySelectorAll('[data-slot="filter-chip"]')).map(
      (el) => el.textContent,
    )

    // Untick "Stringer" — membership is frozen by `selectedIds`, so it MUST
    // stay in the Selected section, unticked, in the same position (F.47).
    fireEvent.click(screen.getByRole('button', { name: 'Stringer' }))
    expect(onChange).toHaveBeenCalledWith(['contract-1'])

    rerender(
      <FilterOptionGroups
        options={TAG_OPTIONS}
        value={['contract-1']}
        onChange={onChange}
        sections="selected-available"
        selectedIds={['stringer', 'contract-1']}
        frozenOrder={TAG_OPTIONS.map((o) => o.value)}
      />,
    )
    const selectedSectionAfter = document.querySelector('[data-section="selected"]')!
    const orderAfter = Array.from(selectedSectionAfter.querySelectorAll('[data-slot="filter-chip"]')).map(
      (el) => el.textContent,
    )
    expect(orderAfter).toEqual(orderBefore)
    expect(selectedSectionAfter.textContent).toContain('Stringer')
    expect(screen.getByRole('button', { name: 'Stringer' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('does not render a Selected section (or its caption) when nothing is selected', () => {
    render(
      <FilterOptionGroups
        options={TAG_OPTIONS}
        value={[]}
        onChange={() => {}}
        sections="selected-available"
        selectedIds={[]}
      />,
    )
    expect(document.querySelector('[data-section="selected"]')).toBeNull()
    expect(document.querySelector('[data-slot="filter-option-groups-divider"]')).toBeNull()
    expect(screen.getByText(/Available \(7\)/)).toBeInTheDocument()
  })

  it('does not render an empty category group inside Selected', () => {
    render(
      <FilterOptionGroups
        options={TAG_OPTIONS}
        value={['stringer']}
        onChange={() => {}}
        sections="selected-available"
        selectedIds={['stringer']}
      />,
    )
    // Only "My Private Tags" has a selected member — Selected must show ONE group.
    const selectedSection = document.querySelector('[data-section="selected"]')!
    expect(selectedSection.querySelectorAll('[role="group"]')).toHaveLength(1)
    expect(selectedSection.textContent).toContain('My Private Tags')
    expect(selectedSection.textContent).not.toContain('Geozones')
  })
})

describe('FilterOptionGroups — keyboard roving tabindex', () => {
  it('roves focus with ArrowRight/ArrowLeft, wraps, and toggles with Space/Enter', () => {
    render(<FilterOptionGroups options={FLAT_OPTIONS} value={[]} onChange={() => {}} />)
    const chips = screen.getAllByRole('button')
    expect(chips[0]).toHaveAttribute('tabindex', '0')
    expect(chips[1]).toHaveAttribute('tabindex', '-1')
    expect(chips[2]).toHaveAttribute('tabindex', '-1')

    chips[0].focus()
    fireEvent.keyDown(chips[0], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(chips[1])
    expect(chips[1]).toHaveAttribute('tabindex', '0')
    expect(chips[0]).toHaveAttribute('tabindex', '-1')

    fireEvent.keyDown(chips[1], { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(chips[0])

    // Wraps at the start.
    fireEvent.keyDown(chips[0], { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(chips[2])

    fireEvent.keyDown(chips[2], { key: 'End' })
    expect(document.activeElement).toBe(chips[2])
    fireEvent.keyDown(chips[2], { key: 'Home' })
    expect(document.activeElement).toBe(chips[0])
  })

  it('toggles the focused chip on Space and Enter', () => {
    const onChange = vi.fn()
    render(<FilterOptionGroups options={FLAT_OPTIONS} value={[]} onChange={onChange} />)
    const chips = screen.getAllByRole('button')
    fireEvent.keyDown(chips[0], { key: ' ' })
    expect(onChange).toHaveBeenCalledWith(['v1'])
    fireEvent.keyDown(chips[1], { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith(['v2'])
  })
})

describe('FilterOptionGroups — chip geometry (FIX WAVE C-5 / V11)', () => {
  /*
   * C-3 asserted BYTE-EQUALITY with `TagChipList`'s md chip. FIX WAVE C-5
   * overrides that for the RADIUS only: Figma's filter chips are radius-4
   * rounded rectangles, `TagChipList`'s are radius-999 capsules, and that
   * difference is by design (see `FILTER_CHIP_GEOMETRY`'s own note). So the
   * assertion is now the INTENDED geometry: the size classes are still shared
   * with `TagChipList`, the radius is deliberately not.
   */
  it('shares TagChipList’s md SIZE classes', () => {
    render(
      <TagChipList tags={[{ value: 'a', label: 'A', color: '#12b76a' }]} variant="solid" size="md" />,
    )
    const tagChip = document.querySelector('[data-slot="tag-chip"]')!
    render(<FilterOptionGroups options={[{ value: 'a', label: 'A' }]} value={[]} onChange={() => {}} />)
    const filterChip = document.querySelector('[data-slot="filter-chip"]')!

    for (const cls of ['h-6', 'px-2.5', 'text-xs', 'font-medium', 'items-center', 'gap-1.5']) {
      expect(FILTER_CHIP_GEOMETRY.split(' ')).toContain(cls)
      expect(tagChip.className.split(' ')).toContain(cls)
      expect(filterChip.className.split(' ')).toContain(cls)
    }
  })

  it('is radius-4 (rounded-sm), NOT TagChipList’s pill — Figma diverges here by design', () => {
    render(<FilterOptionGroups options={[{ value: 'a', label: 'A' }]} value={[]} onChange={() => {}} />)
    const filterChip = document.querySelector('[data-slot="filter-chip"]')!
    expect(FILTER_CHIP_GEOMETRY).toContain('rounded-sm')
    expect(FILTER_CHIP_GEOMETRY).not.toContain('rounded-full')
    expect(filterChip.className.split(' ')).toContain('rounded-sm')
    expect(filterChip.className.split(' ')).not.toContain('rounded-full')

    render(
      <TagChipList tags={[{ value: 'a', label: 'A', color: '#12b76a' }]} variant="solid" size="md" />,
    )
    // The tag chip is unchanged — this override is scoped to filter chips.
    expect(document.querySelector('[data-slot="tag-chip"]')!.className.split(' ')).toContain('rounded-full')
  })
})

/*
 * FIX WAVE C-6 — H.67: the chip's POINTER TARGET is 40px tall while the chip
 * still PAINTS 24px. The slop is a `::before` overlay, so this asserts the hit
 * box's declaration (jsdom has no layout and paints no pseudo-elements), plus
 * the fact that the drawn geometry is untouched.
 */
describe('FilterOptionGroups — H.67 chip hit target', () => {
  it('gives every chip a 40px hit area without growing the drawn 24px chip', () => {
    render(<FilterOptionGroups options={FLAT_OPTIONS} value={[]} onChange={() => {}} />)
    for (const chip of document.querySelectorAll('[data-slot="filter-chip"]')) {
      const classes = chip.className.split(' ')
      // The hit box: a centred 40px (`h-10`) inset overlay on the chip itself.
      expect(classes).toContain('relative')
      expect(classes).toContain('before:h-10')
      expect(classes).toContain('before:absolute')
      expect(classes).toContain('before:inset-x-0')
      expect(classes).toContain('before:-translate-y-1/2')
      // The paint: still the 24px chip.
      expect(classes).toContain('h-6')
      expect(classes).not.toContain('min-h-10')
      expect(classes).not.toContain('py-2')
    }
  })

  it('spaces stacked chip rows so two 40px hit areas meet rather than overlap', () => {
    render(<FilterOptionGroups options={FLAT_OPTIONS} value={[]} onChange={() => {}} />)
    const row = document.querySelector('[data-slot="filter-chip"]')!.parentElement!
    expect(row.className).toContain('gap-y-4')
  })
})
