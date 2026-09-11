import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { deriveFilters } from '@fams/v5-composer'
import { liveMonitoringConfig, liveVehicleRecords } from '../live-fixtures'
import {
  buildLiveFilterGroups,
  deriveTagGroups,
  emptyLiveFilterValue,
  type LiveFilterValue,
  type SavedLiveFilter,
} from './live-filter-model'
import { LiveFiltersPopover, liveFilterColumnMajor } from './LiveFiltersPopover'
import { LiveFilterChips } from './LiveFilterChips'

const groups = buildLiveFilterGroups(deriveFilters(liveMonitoringConfig), liveVehicleRecords)
const tagGroups = deriveTagGroups(liveMonitoringConfig, liveVehicleRecords)

function Harness({
  initialSaved = [] as SavedLiveFilter[],
  showPresetActions = false,
}: { initialSaved?: SavedLiveFilter[]; showPresetActions?: boolean }) {
  const [value, setValue] = useState<LiveFilterValue>(emptyLiveFilterValue)
  const [saved, setSaved] = useState<SavedLiveFilter[]>(initialSaved)
  return (
    <LiveFiltersPopover
      groups={groups}
      value={value}
      onChange={setValue}
      tagGroups={tagGroups}
      showPresetActions={showPresetActions}
      saved={saved}
      onSaveFilter={(name) => setSaved((p) => [...p, { id: `sf-${p.length + 1}`, name, value }])}
      onRenameFilter={(id, name) => setSaved((p) => p.map((f) => (f.id === id ? { ...f, name } : f)))}
      onDeleteFilter={(id) => setSaved((p) => p.filter((f) => f.id !== id))}
    />
  )
}

// The popover is uncontrolled here — open it via its trigger.
function openPopover() {
  fireEvent.click(screen.getByRole('button', { name: /All filters/ }))
}

describe('LiveFiltersPopover', () => {
  it('clamps to the space Radix measured and takes the overflow as its OWN body scroll (UX-11, C9)', () => {
    render(<Harness />)
    openPopover()
    const popover = document.querySelector('[data-slot="live-filters-popover"]')!
    // The surface never grows past the available height…
    expect(popover.className).toContain('max-h-[var(--radix-popover-content-available-height)]')
    expect(popover.className).toContain('flex-col')
    // …and the BODY is the scroller, so the last option is always reachable.
    const body = popover.querySelector('[data-slot="live-filters-body"]')!
    expect(body.className).toContain('overflow-y-auto')
    expect(body.className).toContain('min-h-0')
    expect(body.className).toContain('flex-1')
    // The header stays pinned (never scrolls away with the options).
    expect(screen.getByText('All Filters').parentElement?.className).toContain('shrink-0')
  })

  it('ships `Clear all` as the ONLY header action — no preset bookmark, no settings gear', () => {
    render(<Harness />)
    openPopover()
    const header = screen.getByText('All Filters').parentElement!
    const labels = [...header.querySelectorAll('button')].map(
      (b) => b.getAttribute('aria-label') ?? b.textContent?.trim(),
    )
    expect(labels).toEqual(['Clear all'])
  })

  it('restores the preset bookmark + settings gear, in SPEC §2.5 order, behind `showPresetActions`', () => {
    render(<Harness showPresetActions />)
    openPopover()
    const header = screen.getByText('All Filters').parentElement!
    const labels = [...header.querySelectorAll('button')].map(
      (b) => b.getAttribute('aria-label') ?? b.textContent?.trim(),
    )
    expect(labels.indexOf('Clear all')).toBeLessThan(labels.indexOf('Saved filters'))
    expect(labels.indexOf('Saved filters')).toBeLessThan(labels.indexOf('Filter settings'))
  })

  it('opens from the funnel, toggles options, badges the group and the trigger', () => {
    render(<Harness />)
    openPopover()
    expect(screen.getByText('All Filters')).toBeInTheDocument()
    const moving = screen.getByRole('checkbox', { name: /Moving/ })
    fireEvent.click(moving)
    // Trigger badge now shows the active count.
    expect(screen.getByRole('button', { name: 'All filters (1 active)' })).toBeInTheDocument()
    // Group with selections shows its count badge.
    expect(screen.getByText('Mobility Status').parentElement?.textContent).toContain('1')
  })

  it('Clear all resets every selection', () => {
    render(<Harness />)
    openPopover()
    fireEvent.click(screen.getByRole('checkbox', { name: /Petrol/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(screen.getByRole('button', { name: 'All filters' })).toBeInTheDocument()
  })

  it('tags field suggests grouped values and adds a tag chip', () => {
    render(<Harness />)
    openPopover()
    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: 'str' } })
    fireEvent.click(screen.getByRole('button', { name: 'Street' }))
    expect(screen.getByRole('button', { name: 'All filters (1 active)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove tag Street' })).toBeInTheDocument()
  })

  it('saved filters: empty state → save current → apply → rename → delete', () => {
    render(<Harness showPresetActions />)
    openPopover()
    fireEvent.click(screen.getByRole('checkbox', { name: /Moving/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Saved filters' }))
    expect(screen.getByText('No saved filters')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Save Current Filter/ }))
    fireEvent.change(screen.getByLabelText('Filter name'), { target: { value: 'Priority Vehicles' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    // Saved row with its conditions subtitle.
    expect(screen.getByText('Priority Vehicles')).toBeInTheDocument()
    expect(screen.getByText('1 conditions')).toBeInTheDocument()
    // Rename.
    fireEvent.click(screen.getByRole('button', { name: 'Rename Priority Vehicles' }))
    fireEvent.change(screen.getByLabelText('Filter name'), { target: { value: 'Fuel Level Low' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Fuel Level Low')).toBeInTheDocument()
    // Delete.
    fireEvent.click(screen.getByRole('button', { name: 'Delete Fuel Level Low' }))
    expect(screen.queryByText('Fuel Level Low')).not.toBeInTheDocument()
    expect(screen.getByText('No saved filters')).toBeInTheDocument()
  })
})

describe('LiveFilterChips', () => {
  function ChipsHarness() {
    const [value, setValue] = useState<LiveFilterValue>({
      filters: { systemcol11: ['Petrol', 'Hybrid'] },
      tags: ['Street'],
    })
    return <LiveFilterChips groups={groups} value={value} onChange={setValue} />
  }

  it('labels value-group chips with the joined values and edits via the ▾ dropdown', () => {
    render(<ChipsHarness />)
    expect(screen.getByText('Petrol, Hybrid')).toBeInTheDocument()
    // Radix DropdownMenuTrigger opens on pointerdown — keyDown Enter is the
    // package-wide jsdom workaround (see ModuleViewFilters.test.tsx).
    fireEvent.keyDown(screen.getByRole('button', { name: 'Edit Fuel Type filter' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Hybrid' }))
    expect(screen.getByTitle('Fuel Type: Petrol')).toBeInTheDocument()
  })

  it('chip ✕ removes the group / the tag; Hide collapses the rows', () => {
    render(<ChipsHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear Fuel Type filter' }))
    expect(screen.queryByText('Petrol, Hybrid')).not.toBeInTheDocument()
    expect(screen.getByTitle('Tag: Street')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hide applied filters' }))
    expect(screen.queryByTitle('Tag: Street')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show applied filters' }))
    expect(screen.getByTitle('Tag: Street')).toBeInTheDocument()
  })

  it('renders nothing with no active filters', () => {
    const { container } = render(
      <LiveFilterChips groups={groups} value={emptyLiveFilterValue()} onChange={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

/**
 * Round-3 visual #5 / UX #4 — the two-column fill order inside a group and the
 * `Clear all` control's state legibility.
 */
describe('LiveFiltersPopover — round-3 fixes', () => {
  it('fills EVEN-count groups column-major and ODD-count groups row-major (517:8640)', () => {
    // 517:8640 is internally inconsistent: the 4- and 10-option groups read
    // down each column, the two 3-option groups read across. Parity is the
    // only rule that reproduces all four.
    expect(liveFilterColumnMajor(4)).toBe(true)
    expect(liveFilterColumnMajor(10)).toBe(true)
    expect(liveFilterColumnMajor(3)).toBe(false)
    expect(liveFilterColumnMajor(5)).toBe(false)
  })

  it('drops `gridAutoFlow: column` on an odd-count group so it fills across', () => {
    const { container } = render(<Harness />)
    openPopover()
    const grids = Array.from(
      container.ownerDocument.querySelectorAll<HTMLElement>(
        '[data-slot="live-filter-group"] > div.grid',
      ),
    )
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      const options = grid.querySelectorAll('label').length
      expect(grid.style.gridAutoFlow).toBe(options % 2 === 0 ? 'column' : '')
    }
  })

  it('marks `Clear all` inactive with NON-COLOUR cues instead of dimming it away', () => {
    render(<Harness />)
    openPopover()
    const clear = screen.getByRole('button', { name: 'Clear all' })
    // Round 3 measured the native-`disabled` rendering at 2.01:1 with no
    // non-colour cue at all (UX #4).
    expect(clear).toHaveAttribute('aria-disabled', 'true')
    expect(clear).toHaveAttribute('title', 'No filters to clear')
    expect(clear.className).toContain('cursor-not-allowed')
    expect(clear).not.toBeDisabled()
  })

  it('hangs the popover off the funnel INLINE-END so it covers the map, not the list (visual #6)', () => {
    render(<Harness />)
    openPopover()
    const popover = document.querySelector('[data-slot="live-filters-popover"]') as HTMLElement
    expect(popover.dataset.side).toBe('right')
    // SPEC 2.5's 449px popup, set inline so it cannot depend on a consuming
    // app emitting an arbitrary width class.
    expect(popover.style.width).toBe('449px')
  })
})
