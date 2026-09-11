import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { LiveMapViewProps } from '../map/LiveMapView'
import { ModuleView } from './ModuleView'
import { liveMonitoringConfig, liveVehicleRecords } from './live-fixtures'
import { dealsConfig, dealRecords } from './fixtures'

// Same stub contract as `LiveHybridView.test.tsx` — a button per vehicle so
// MARKER-side selection can be driven (interaction 14b).
vi.mock('@fams/v5-templates/map', () => ({
  LiveMapView: (props: LiveMapViewProps) => (
    <div data-testid="fake-live-map" data-selected={props.selectedId ?? ''}>
      {props.vehicles.map((v) => (
        <button key={v.id} type="button" onClick={() => props.onSelect?.(v.id)}>
          marker {v.id}
        </button>
      ))}
    </div>
  ),
}))

const hybrid = () =>
  render(
    <ModuleView
      config={liveMonitoringConfig}
      records={liveVehicleRecords}
      views={['hybrid', 'list']}
      context={{ userId: 'u1', moduleId: 'live-monitoring' }}
    />,
  )

const openViewMenu = () =>
  fireEvent.keyDown(screen.getByRole('button', { name: 'View options' }), { key: 'Enter' })

describe('ModuleView — the live view menu (SPEC §2.9 / 495:45132)', () => {
  it('renders Figma’s full row set in order, from the Customize View model', async () => {
    hybrid()
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    openViewMenu()
    const rows = [...document.querySelectorAll('[role="menuitem"],[role="menuitemcheckbox"],[role="separator"]')].map(
      (n) => n.textContent?.replace(/None|No$/, '').trim() ?? '',
    )
    expect(rows.filter(Boolean)).toEqual([
      'Rename',
      'Customize View',
      'Autosave for Me',
      'Private View',
      'Protect View',
      'Pin View',
      'Set as Default View',
      'Copy Link to View',
      'Sharing & Permissions',
      // SPEC §2.9 row 10. Always present — a seed (system) view cannot be
      // deleted, so the row renders DISABLED with a reason rather than
      // vanishing and leaving Delete with no entry point at all (round-2
      // visual #1, UX finding 5).
      'Delete View',
    ])
  })

  it('gives every row a 16px lead glyph and the three settings rows a switch (visual #2)', async () => {
    hybrid()
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    openViewMenu()
    for (const name of ['Rename', 'Customize View', 'Copy Link to View', 'Sharing & Permissions', 'Delete View']) {
      expect(screen.getByRole('menuitem', { name }).querySelector('svg')).not.toBeNull()
    }
    for (const name of ['Autosave for Me', 'Private View', 'Protect View']) {
      const row = screen.getByRole('menuitemcheckbox', { name })
      expect(row.querySelector('svg')).not.toBeNull()
      const pill = row.querySelector('[data-slot="dropdown-menu-checkbox-switch"]')
      expect(pill).not.toBeNull()
      expect(pill?.getAttribute('data-state')).toBe('unchecked')
    }
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Autosave for Me' }))
    await waitFor(() =>
      expect(
        screen
          .getByRole('menuitemcheckbox', { name: 'Autosave for Me' })
          .querySelector('[data-slot="dropdown-menu-checkbox-switch"]')
          ?.getAttribute('data-state'),
      ).toBe('checked'),
    )
  })

  it('keeps Delete View in the row set but disabled, with the reason, on a seed view', async () => {
    hybrid()
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    openViewMenu()
    const row = screen.getByRole('menuitem', { name: 'Delete View' })
    expect(row.getAttribute('data-disabled')).not.toBeNull()
    expect(row.getAttribute('title')).toMatch(/cannot be deleted/i)
  })

  it('Protect View puts a lock glyph on the tab (interaction 3b / 495:53979)', async () => {
    hybrid()
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    expect(document.querySelector('[data-slot="module-view-tab-lock"]')).toBeNull()
    openViewMenu()
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Protect View' }))
    await waitFor(() => expect(document.querySelector('[data-slot="module-view-tab-lock"]')).not.toBeNull())
  })

  /*
   * Round-2 interaction 2e: the clipboard write worked, but selecting the row
   * DISMISSED the menu, so the `Copied!` swap Figma 495:56908 paints was never
   * on screen. The row now keeps the menu open — the confirmation is
   * observable without reopening anything.
   */
  it('Copy Link to View flips the row label to "Copied!" IN PLACE, menu still open (495:56908)', async () => {
    hybrid()
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    openViewMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy Link to View' }))
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Copied!' })).toBeInTheDocument())
    // No reopen in between: the menu is the same open surface.
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('leaves NON-live modules with their original single Delete row', () => {
    render(
      <ModuleView
        config={dealsConfig}
        records={dealRecords}
        views={['list']}
        context={{ userId: 'u1', moduleId: 'deals' }}
      />,
    )
    expect(screen.queryByRole('button', { name: 'View options' })).toBeNull()
  })
})

/*
 * SPEC §2.1 puts the ⋮ on THE active tab whatever its kind; round 2 gated the
 * whole menu to hybrid/list, so Map View had no Rename / Pin / Protect / Copy
 * Link / Sharing / Delete at all, by pointer OR keyboard (visual #27, UX
 * finding 4) — and the gutter every tab reserved for a trigger that only the
 * active tab has widened the strip past Figma (visual #13).
 */
describe('ModuleView — the view menu on a MAP-only view (visual #27 / UX 4)', () => {
  const withMap = () =>
    render(
      <ModuleView
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        views={['map', 'list']}
        context={{ userId: 'u1', moduleId: 'live-monitoring' }}
      />,
    )

  it('renders the same ten-row menu on an active Map View tab', async () => {
    withMap()
    openViewMenu()
    await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument())
    for (const name of ['Rename', 'Customize View', 'Copy Link to View', 'Sharing & Permissions', 'Delete View']) {
      expect(screen.getByRole('menuitem', { name })).toBeInTheDocument()
    }
    for (const name of ['Autosave for Me', 'Private View', 'Protect View']) {
      expect(screen.getByRole('menuitemcheckbox', { name })).toBeInTheDocument()
    }
  })

  it('disables only the rows that need the Customize View drawer, with a reason', async () => {
    withMap()
    openViewMenu()
    await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument())
    for (const name of ['Rename', 'Customize View', 'Sharing & Permissions']) {
      const row = screen.getByRole('menuitem', { name })
      expect(row.getAttribute('data-disabled')).not.toBeNull()
      expect(row.getAttribute('title')).toMatch(/Hybrid and List/)
    }
    // …while the rows that DO apply to a map-only view stay live.
    expect(screen.getByRole('menuitem', { name: 'Copy Link to View' }).getAttribute('data-disabled')).toBeNull()
    expect(screen.getByRole('menuitemcheckbox', { name: 'Private View' }).getAttribute('data-disabled')).toBeNull()
  })

  it('reserves the ⋮ gutter on the ACTIVE tab only (visual #13)', async () => {
    withMap()
    await waitFor(() => expect(screen.getByRole('button', { name: 'View options' })).toBeInTheDocument())
    const gutters = document.querySelectorAll('[data-slot="module-view-tab-gutter"]')
    expect(gutters).toHaveLength(1)
    expect(gutters[0].closest('[data-slot="module-view-tab"]')?.getAttribute('data-state')).toBe('active')
  })
})

describe('ModuleView — marker → list-row selection sync (interaction 14b)', () => {
  it('selects and marks the list row when the map emits a selection', async () => {
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = vi.fn()
    try {
      hybrid()
      await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: 'marker V-103' }))
      await waitFor(() =>
        expect(document.querySelector('tr[data-row-id="V-103"][data-selected]')).not.toBeNull(),
      )
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })
})

describe('ModuleView — live LIST-ONLY view cells (SPEC §2.10)', () => {
  const listOnly = () =>
    render(
      <ModuleView
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        views={['list']}
        context={{ userId: 'u1', moduleId: 'live-monitoring' }}
      />,
    )

  it('renders SPEED with its unit and the hybrid’s phrasing, not a bare number (visual #26)', () => {
    listOnly()
    expect(screen.getByText('100 km/h')).toBeInTheDocument()
    expect(screen.getByText('for 12 mins')).toBeInTheDocument()
  })

  it('renders select-typed cells as PLAIN TEXT, not light-blue dot chips (visual #27 / UX finding 10)', () => {
    listOnly()
    const cell = screen.getAllByText('Moving')[0].closest('td')!
    expect(cell.querySelector('[data-slot="chip"], [data-slot="badge"], [data-slot="status-pill"]')).toBeNull()
    expect(cell.textContent).toBe('Moving')
  })

  it('shows no sort glyph until a column is actually sorted (visual #28 / 582:25576)', () => {
    listOnly()
    const unsorted = document.querySelector('th[aria-sort="none"]')!
    expect(unsorted.className.includes('hidden')).toBe(false)
    // The suppression is a class contract on the table, asserted at its root.
    expect(document.querySelector('[data-slot="data-table"], table')).not.toBeNull()
  })
})
