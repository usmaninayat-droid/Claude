import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { EntityRecord } from '@fams/v5-composer'
import { liveMonitoringConfig, liveVehicleRecords } from '../live-fixtures'
import { LiveListPanel, liveSpeedCellText } from './LiveListPanel'
import { LiveFiltersPopover } from './LiveFiltersPopover'
import { LiveFilterChips } from './LiveFilterChips'
import { LiveColumnsPopover } from './LiveColumnsPopover'
import { CustomizeViewDrawer, defaultCustomizeViewState } from './CustomizeViewDrawer'
import { buildLiveFilterGroups, emptyLiveFilterValue, type LiveFilterValue } from './live-filter-model'
import {
  defaultLiveListColumns,
  liveFieldIconName,
  liveListColumnCatalog,
  LIVE_LIST_WIDTH_STATES,
} from './live-list-model'
import { deriveFilters, FIELD_ICON_NAMES } from '@fams/v5-composer'

/**
 * Round-1 fix wave (lane C). One test per behavioural fix, named by the gate
 * finding it closes so a regression points straight back at the frame.
 */

const catalog = liveListColumnCatalog(liveMonitoringConfig)
const columns = defaultLiveListColumns(liveMonitoringConfig, 'collapsed')
const groups = buildLiveFilterGroups(deriveFilters(liveMonitoringConfig), liveVehicleRecords)

describe('SPEED cell formatting (visual #13 / #14 / #26)', () => {
  const bindings = { speedCol: 'speed', statusCol: 'status', dwellCol: 'dwell' }
  const rec = (extra: Partial<EntityRecord>): EntityRecord => ({ id: 'r', ...extra }) as EntityRecord

  it('moving → "<speed> km/h · <dwell>"', () => {
    expect(liveSpeedCellText(rec({ status: 'Moving', speed: 48, dwell: 'Just Now' }), bindings)).toBe(
      '48 km/h · Just Now',
    )
  })

  it('idling → "for <dwell>", stopped/non-reporting → "since <dwell>"', () => {
    expect(liveSpeedCellText(rec({ status: 'Idling', speed: 0, dwell: '5 mins' }), bindings)).toBe('for 5 mins')
    expect(liveSpeedCellText(rec({ status: 'Stopped', speed: 0, dwell: '1 hr 35 mins' }), bindings)).toBe(
      'since 1 hr 35 mins',
    )
    expect(liveSpeedCellText(rec({ status: 'Non-Reporting', dwell: '6 hr' }), bindings)).toBe('since 6 hr')
  })

  it('never double-prefixes a dwell the blueprint already phrased', () => {
    expect(liveSpeedCellText(rec({ status: 'Stopped', dwell: 'since 2 hr' }), bindings)).toBe('since 2 hr')
  })

  it('the EXPANDED column is pure speed — "48 km/h" or "-" (visual #13)', () => {
    expect(liveSpeedCellText(rec({ status: 'Moving', speed: 48, dwell: 'Just Now' }), bindings, 'speed')).toBe('48 km/h')
    expect(liveSpeedCellText(rec({ status: 'Stopped', speed: 0, dwell: '5 mins' }), bindings, 'speed')).toBe('-')
  })

  it('no data → "-"', () => {
    expect(liveSpeedCellText(rec({ status: 'Non-Reporting' }), bindings)).toBe('-')
  })
})

describe('LiveListPanel — pencil, selection sync, focus return', () => {
  function Panel(props: { selectedId?: string | null; onSelect?: (id: string | null) => void }) {
    const [cols, setCols] = useState(columns)
    return (
      <LiveListPanel
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        totalCount={liveVehicleRecords.length}
        search=""
        onSearchChange={() => {}}
        columns={cols}
        onColumnsChange={setCols}
        catalog={catalog}
        widthState="collapsed"
        {...props}
      />
    )
  }

  it('renders the Columns pencil even when rows are present (UX finding 1 / visual #12)', () => {
    render(<Panel />)
    expect(document.querySelectorAll('[data-slot="live-list-panel"] tbody tr').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Customize columns' })).toBeInTheDocument()
  })

  it('paints the panel white, not the page grey (visual #11)', () => {
    render(<Panel />)
    expect(document.querySelector('[data-slot="live-list-panel"]')?.className).toContain('bg-card')
  })

  it('scrolls the selected row into view when the MAP emits a selection (interaction 14b)', () => {
    const scrollIntoView = vi.fn()
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoView
    try {
      const { rerender } = render(<Panel selectedId={null} onSelect={() => {}} />)
      rerender(<Panel selectedId="V-103" onSelect={() => {}} />)
      expect(scrollIntoView).toHaveBeenCalled()
      expect(document.querySelector('tr[data-row-id="V-103"][data-selected]')).not.toBeNull()
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('returns focus to the originating row when the selection clears (interaction E12 / UX-13)', () => {
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = vi.fn()
    try {
      const onSelect = vi.fn()
      const { rerender } = render(<Panel selectedId={null} onSelect={onSelect} />)
      const row = document.querySelector<HTMLElement>('tr[data-row-id="V-101"]')!
      row.focus()
      fireEvent.click(row)
      rerender(<Panel selectedId="V-101" onSelect={onSelect} />)
      // The card takes focus away, then closes (selection clears).
      const card = document.createElement('div')
      card.setAttribute('role', 'dialog')
      card.tabIndex = -1
      document.body.appendChild(card)
      card.focus()
      expect(document.activeElement).toBe(card)
      rerender(<Panel selectedId={null} onSelect={onSelect} />)
      expect(document.activeElement).toBe(row)
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })
})

describe('All Filters popover (visual #3 / #4 / #46, interaction 6c)', () => {
  function Filters({ value = emptyLiveFilterValue() }: { value?: LiveFilterValue }) {
    const [v, setV] = useState(value)
    return <LiveFiltersPopover open onOpenChange={() => {}} groups={groups} value={v} onChange={setV} />
  }

  it('renders each GROUP as an internally two-column option grid, one group per row', () => {
    render(<Filters />)
    const group = document.querySelector('[data-slot="live-filter-group"]')!
    const grid = group.querySelector<HTMLElement>('.grid')!
    // Two columns, and the fill order is COLUMN-major (round-2 visual #5):
    // SPEC §2.5 reads `Moving, Idling │ Stopped, Non-Reporting`, not across.
    // Inline, so a Tailwind build that never emits the arbitrary row template
    // cannot silently collapse the group into one ten-column row.
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))')
    expect(grid.style.gridAutoFlow).toBe('column')
    const options = group.querySelectorAll('label').length
    expect(grid.style.gridTemplateRows).toBe(`repeat(${Math.ceil(options / 2)}, minmax(0, auto))`)
  })

  it('titles the groups in grey-400, not grey-900 (round-2 visual #11 regression)', () => {
    render(<Filters />)
    const legend = document.querySelector('[data-slot="live-filter-group"] legend')!
    expect(legend.className).toContain('text-gray-400')
    expect(legend.className).not.toContain('text-foreground')
  })

  it('WRAPS long option labels instead of truncating them (round-2 visual #12 / UX 3)', () => {
    render(<Filters />)
    const label = document.querySelector('[data-slot="live-filter-group"] label')!
    expect(label.querySelector('.truncate')).toBeNull()
    // …and the full string is still reachable as a tooltip either way.
    expect(label.getAttribute('title')).toBeTruthy()
  })

  it('keeps group titles in Title Case, never uppercased by CSS (visual #4)', () => {
    render(<Filters />)
    const legend = document.querySelector('[data-slot="live-filter-group"] legend')!
    expect(legend.className).not.toContain('uppercase')
  })

  it('moves a group with a selection to the TOP of the popover (interaction 6c / 518:110398)', () => {
    const last = groups[groups.length - 1]
    render(<Filters value={{ filters: { [last.col]: [last.options[0].value] }, tags: [] }} />)
    const legends = [...document.querySelectorAll('[data-slot="live-filter-group"] legend')]
    expect(legends[0].textContent).toContain(last.label)
  })
})

describe('Applied-filter chips (interaction 10b)', () => {
  it('a chip’s ▾ opens an INLINE value checklist and the label is the joined values', () => {
    const group = groups[0]
    const value: LiveFilterValue = { filters: { [group.col]: [group.options[0].value] }, tags: [] }
    render(<LiveFilterChips groups={groups} value={value} onChange={() => {}} />)
    const chip = document.querySelector('[data-slot="live-filter-chip"]')!
    expect(chip.textContent).toContain(group.options[0].value)
    // Radix opens its menu from keyboard activation as well as pointerdown;
    // jsdom has no PointerEvent, so the keyboard path is the stable one.
    fireEvent.keyDown(within(chip as HTMLElement).getByRole('button', { name: `Edit ${group.label} filter` }), {
      key: 'Enter',
    })
    expect(screen.getAllByRole('menuitemcheckbox').length).toBe(group.options.length)
    // NOT the full All Filters surface.
    expect(document.querySelector('[data-slot="live-filters-popover"]')).toBeNull()
  })
})

describe('Columns popover (visual #6 / #7, UX findings 15)', () => {
  it('anchors past the list panel’s inline end — over the map, not over the list', () => {
    render(
      <LiveColumnsPopover open onOpenChange={() => {}} catalog={catalog} value={columns} onChange={() => {}} />,
    )
    const panel = document.querySelector('[data-slot="live-columns-popover"]')!
    expect(panel.className).toContain('start-full')
    expect(panel.className).toContain('w-[18.125rem]')
  })

  it('renders a bottom fade cueing more content (UX finding 15)', () => {
    render(
      <LiveColumnsPopover open onOpenChange={() => {}} catalog={catalog} value={columns} onChange={() => {}} />,
    )
    expect(document.querySelector('[data-slot="live-columns-fade"]')).not.toBeNull()
  })

  it('gives every catalog row a lead glyph from the composer vocabulary (visual #6)', () => {
    expect(catalog.every((item) => item.icon)).toBe(true)
    expect(liveFieldIconName('Odometer')).toBe('speedometer-02')
    expect(liveFieldIconName('Fuel Type')).toBe('fuel')
    expect(liveFieldIconName('Registration Date')).toBe('clock')
  })

  /* Round-4 visual N3: six of the twelve visible rows fell through to the
     generic tag glyph where 495:19004 draws a semantic mark per field. The
     fix is in the DERIVATION (there is no `SystemColumn.icon` key — ratified),
     so the assertion is on the derivation. */
  it('derives 495:19004’s semantic column marks, not the generic tag (visual N3)', () => {
    expect(liveFieldIconName('Vehicle')).toBe('car')
    expect(liveFieldIconName('Health')).toBe('heart')
    expect(liveFieldIconName('Plate')).toBe('credit-card')
    expect(liveFieldIconName('Make')).toBe('brush')
    expect(liveFieldIconName('Model')).toBe('speedometer-02')
    expect(liveFieldIconName('IMEI')).toBe('hash')
    expect(liveFieldIconName('VIN')).toBe('hash')
    expect(liveFieldIconName('Vehicle Type')).toBe('truck')
    expect(liveFieldIconName('Vehicle Status')).toBe('check-square')
    // Unchanged by the new rules, and ratified where they differ from N3's
    // reading: Speed keeps its gauge, Last Record Received its clock, and
    // Vehicle Color keeps `colors` (visual #32).
    expect(liveFieldIconName('Speed')).toBe('speedometer-04')
    expect(liveFieldIconName('Last Record Recieved')).toBe('clock')
    expect(liveFieldIconName('Vehicle Color')).toBe('colors')
    // Every derived name must exist in the shared vocabulary, or the row
    // silently loses its glyph.
    for (const name of ['car', 'heart', 'credit-card', 'brush', 'hash', 'truck', 'check-square']) {
      expect(FIELD_ICON_NAMES).toContain(name)
    }
  })
})

describe('Customize View drawer (interaction 3h, UX finding 7)', () => {
  it('carries the SPEC §2.7 view-name input', () => {
    render(
      <CustomizeViewDrawer
        open
        onClose={() => {}}
        variant="hybrid"
        state={defaultCustomizeViewState('')}
        onStateChange={() => {}}
        columns={columns}
        onColumnsChange={() => {}}
        catalog={catalog}
      />,
    )
    expect(document.querySelector('input[placeholder="Enter view name"]')).not.toBeNull()
  })

  it('offers "Hide list" as a List View State value — the ✕ grabber’s equivalent control', () => {
    expect(LIVE_LIST_WIDTH_STATES.map((option) => option.value)).toContain('hidden')
  })

  /*
   * SPEC §2.7 / 495:26635: every row carries a 16px grey LEAD glyph, and the
   * drawer ends in a separated footer group (round-2 visual #3).
   */
  it('gives every row a 16px lead glyph and keeps the footer group', () => {
    render(
      <CustomizeViewDrawer
        open
        onClose={() => {}}
        variant="hybrid"
        state={defaultCustomizeViewState('My view')}
        onStateChange={() => {}}
        columns={columns}
        onColumnsChange={() => {}}
        catalog={catalog}
        onShare={() => {}}
        onDelete={() => {}}
      />,
    )
    const gutters = [...document.querySelectorAll('[data-slot="customize-view-row-icon"]')]
    expect(gutters.length).toBeGreaterThanOrEqual(15)
    // Every gutter actually holds a glyph — a reserved-but-empty gutter would
    // pass a naive count.
    expect(gutters.every((g) => g.querySelector('svg') !== null)).toBe(true)
    for (const label of ['Copy Link to View', 'Sharing & Permissions', 'Delete View']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument()
    }
    // …and the footer rows carry the glyph ONLY on the lead edge (it used to
    // render on both once the gutter landed).
    const deleteRow = screen.getByRole('button', { name: /Delete View/ })
    expect(deleteRow.querySelectorAll('svg')).toHaveLength(1)
  })
})
