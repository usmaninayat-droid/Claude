import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { LiveMapViewProps } from '../../map/LiveMapView'
import { ModuleView } from '../ModuleView'
import { liveMonitoringConfig, liveVehicleRecords } from '../live-fixtures'

/**
 * Round-4 finding F1 — no view state survived a view-tab switch, so `Save`,
 * `Save View` and `Enable Autosave` all cleared the toast while the edited
 * column set reverted to the blueprint default on the way back. These are the
 * two tests that would have caught it: a save round-trip across an
 * unmount/remount, and two views keeping separate column sets.
 */
vi.mock('@fams/v5-templates/map', () => ({
  LiveMapView: (props: LiveMapViewProps) => <div data-testid="fake-live-map" data-count={props.vehicles.length} />,
}))

const renderModule = () =>
  render(
    <ModuleView
      config={liveMonitoringConfig}
      records={liveVehicleRecords}
      views={['hybrid', 'list']}
      context={{ userId: 'u1', moduleId: 'live-monitoring' }}
    />,
  )

/** Radix tabs need the pointer-down that precedes the click. */
const clickTab = (name: string) => {
  const el = screen.getByRole('tab', { name })
  fireEvent.mouseDown(el, { button: 0 })
  fireEvent.click(el)
}

const panelHeaders = () =>
  [...document.querySelectorAll('[data-slot="live-list-panel"] th')].map((th) => th.textContent?.trim() ?? '')

/** Toggles the Nth Columns-popover switch and returns the resulting headers. */
const toggleColumn = async (index: number) => {
  fireEvent.click(screen.getByLabelText('Customize columns'))
  const popover = await waitFor(() => document.querySelector('[data-slot="live-columns-popover"]')!)
  const switches = popover.querySelectorAll<HTMLElement>('[role="switch"]')
  fireEvent.click(switches[index])
  fireEvent.keyDown(document, { key: 'Escape' })
}

describe('live view state survives a view-tab switch (F1)', () => {
  it('keeps the SAVED column set across an unmount / remount of the hybrid body', async () => {
    renderModule()
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    const before = panelHeaders()

    await toggleColumn(2)
    const edited = panelHeaders()
    expect(edited).not.toEqual(before)

    // `Save` on the unsaved-changes toast — the control whose promise was untrue.
    const toast = await waitFor(() => document.querySelector('[data-slot="unsaved-changes-toast"]')!)
    fireEvent.click([...toast.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Save')!)

    // Hybrid → List → Hybrid unmounts and remounts `LiveHybridView`.
    clickTab('List View')
    await waitFor(() => expect(document.querySelector('[data-slot="live-list-panel"]')).toBeNull())
    clickTab('Hybrid View')
    await waitFor(() => expect(document.querySelector('[data-slot="live-list-panel"]')).not.toBeNull())

    expect(panelHeaders()).toEqual(edited)
    // …and the save really was a save: no toast comes back.
    expect(document.querySelector('[data-slot="unsaved-changes-toast"]')).toBeNull()
  })

  it('keeps each view’s state its own — two views never share one column set', async () => {
    renderModule()
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())

    await toggleColumn(2)
    const hybridEdited = panelHeaders()

    // The list-only view keeps ITS blueprint default while the hybrid is edited.
    clickTab('List View')
    const listHeaders = await waitFor(() => {
      const th = [...document.querySelectorAll('table th')].map((n) => n.textContent?.trim() ?? '')
      expect(th.length).toBeGreaterThan(0)
      return th
    })
    expect(listHeaders).not.toEqual(hybridEdited)

    clickTab('Hybrid View')
    await waitFor(() => expect(document.querySelector('[data-slot="live-list-panel"]')).not.toBeNull())
    expect(panelHeaders()).toEqual(hybridEdited)
  })

  it('keeps the divider width state across the same round trip', async () => {
    renderModule()
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    expect(document.querySelector('[data-slot="live-panel-divider"]')?.getAttribute('data-width-state')).toBe(
      'collapsed',
    )

    fireEvent.click(screen.getByLabelText('Widen vehicle list'))
    expect(document.querySelector('[data-slot="live-panel-divider"]')?.getAttribute('data-width-state')).toBe(
      'expanded',
    )

    clickTab('List View')
    await waitFor(() => expect(document.querySelector('[data-slot="live-panel-divider"]')).toBeNull())
    clickTab('Hybrid View')
    await waitFor(() => expect(document.querySelector('[data-slot="live-panel-divider"]')).not.toBeNull())

    expect(document.querySelector('[data-slot="live-panel-divider"]')?.getAttribute('data-width-state')).toBe(
      'expanded',
    )
  })
})
