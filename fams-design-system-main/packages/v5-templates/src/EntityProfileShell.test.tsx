import { useState, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as
// packages/ui-kit/src/a11y.axe.test.tsx and PeoplePicker.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { EntityProfileShell } from './EntityProfileShell'
import type { EntityProfileRecord } from './EntityProfileShell.types'

expect.extend({ toHaveNoViolations })

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Assertion<T> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
  },
})

const RECORDS: EntityProfileRecord[] = [
  {
    id: 'vehicle-1',
    title: 'Truck AUH-4021',
    subtitle: 'Lot 1 · Lavajet',
    status: { label: 'On route', tone: 'success' },
    tabs: [
      { id: 'overview', label: 'Overview', content: <p>Odometer 84,210 km</p> },
      { id: 'trips', label: 'Trips', content: <p>12 trips today</p> },
    ],
  },
  {
    id: 'driver-1',
    title: 'Sara Ahmed',
    subtitle: 'Driver · Northern district',
    status: { label: 'On break', tone: 'warning' },
    tabs: [
      { id: 'overview', label: 'Overview', content: <p>Shift 06:00–14:00</p> },
      { id: 'events', label: 'Events', content: <p>No events</p> },
    ],
  },
]

function Fixture({
  onActivateRecord,
  onCloseRecord,
  onTabChange,
  initialActiveRecordId = 'vehicle-1',
  dir,
}: {
  onActivateRecord?: (id: string) => void
  onCloseRecord?: (id: string) => void
  onTabChange?: (id: string) => void
  initialActiveRecordId?: string
  dir?: 'rtl'
}) {
  const [open, setOpen] = useState(true)
  const [activeRecordId, setActiveRecordId] = useState(initialActiveRecordId)

  const shell = (
    <EntityProfileShell
      open={open}
      onOpenChange={setOpen}
      records={RECORDS}
      activeRecordId={activeRecordId}
      onActivateRecord={(id) => {
        setActiveRecordId(id)
        onActivateRecord?.(id)
      }}
      onCloseRecord={(id) => onCloseRecord?.(id)}
      onTabChange={onTabChange}
    />
  )

  return dir ? <div dir={dir}>{shell as ReactNode}</div> : shell
}

/**
 * Radix's Tabs.Trigger (used for the per-record SECTION tabs) activates on
 * `mousedown` via the roving-focus item, not the synthetic `click` event —
 * mirror a real pointer interaction. Same helper as
 * packages/ui-kit/src/composites/ModuleViewTabs.test.tsx. The hand-rolled
 * PINNED-record tabs activate on plain `click`, so they don't need this.
 */
function clickSectionTab(element: HTMLElement) {
  fireEvent.mouseDown(element, { button: 0 })
  fireEvent.click(element)
}

describe('EntityProfileShell', () => {
  it('renders the active record header and its section tabs', () => {
    render(<Fixture />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // The title appears twice — as the pinned-record tab AND the header — so
    // scope the header assertion to the heading (SheetTitle renders one).
    expect(screen.getByRole('heading', { name: 'Truck AUH-4021' })).toBeInTheDocument()
    expect(screen.getByText('Lot 1 · Lavajet')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Trips' })).toBeInTheDocument()
    expect(screen.getByText('Odometer 84,210 km')).toBeInTheDocument()
  })

  it('shows every open record as a pinned tab', () => {
    render(<Fixture />)
    expect(screen.getByRole('tab', { name: /Truck AUH-4021/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Sara Ahmed/ })).toBeInTheDocument()
  })

  it('fires onActivateRecord when a non-active pinned tab is clicked', () => {
    const onActivateRecord = vi.fn()
    render(<Fixture onActivateRecord={onActivateRecord} />)
    fireEvent.click(screen.getByRole('tab', { name: /Sara Ahmed/ }))
    expect(onActivateRecord).toHaveBeenCalledWith('driver-1')
  })

  it('switches the visible record header/body once the caller updates activeRecordId', () => {
    render(<Fixture />)
    fireEvent.click(screen.getByRole('tab', { name: /Sara Ahmed/ }))
    expect(screen.getByText('Shift 06:00–14:00')).toBeInTheDocument()
    expect(screen.queryByText('Odometer 84,210 km')).not.toBeInTheDocument()
  })

  it('activates a pinned tab via the Enter key (manual activation model)', () => {
    const onActivateRecord = vi.fn()
    render(<Fixture onActivateRecord={onActivateRecord} />)
    const driverTab = screen.getByRole('tab', { name: /Sara Ahmed/ })
    driverTab.focus()
    fireEvent.keyDown(driverTab, { key: 'Enter' })
    expect(onActivateRecord).toHaveBeenCalledWith('driver-1')
  })

  it('fires onCloseRecord when the decorative ✕ region is clicked, without activating the record', () => {
    const onCloseRecord = vi.fn()
    const onActivateRecord = vi.fn()
    render(<Fixture onCloseRecord={onCloseRecord} onActivateRecord={onActivateRecord} />)
    // The ✕ is an aria-hidden decorative span (not a button — a tablist may
    // own only role="tab" children). Reach it by its data-slot; clicking it
    // dispatches close, not activate, via the tab's click hit-test.
    const closeGlyph = screen
      .getByRole('tab', { name: /Sara Ahmed/ })
      .querySelector('[data-slot="entity-profile-shell-pinned-tab-close"]')
    expect(closeGlyph).not.toBeNull()
    fireEvent.click(closeGlyph as Element)
    expect(onCloseRecord).toHaveBeenCalledWith('driver-1')
    expect(onActivateRecord).not.toHaveBeenCalled()
  })

  it('fires onCloseRecord via the Delete key on the focused pinned tab', () => {
    const onCloseRecord = vi.fn()
    render(<Fixture onCloseRecord={onCloseRecord} />)
    const driverTab = screen.getByRole('tab', { name: /Sara Ahmed/ })
    driverTab.focus()
    fireEvent.keyDown(driverTab, { key: 'Delete' })
    expect(onCloseRecord).toHaveBeenCalledWith('driver-1')
  })

  it('switches a section tab within the active record and reports it via onTabChange', () => {
    const onTabChange = vi.fn()
    render(<Fixture onTabChange={onTabChange} />)
    clickSectionTab(screen.getByRole('tab', { name: 'Trips' }))
    expect(onTabChange).toHaveBeenCalledWith('trips')
    expect(screen.getByText('12 trips today')).toBeInTheDocument()
  })

  it('remembers each record’s last-viewed section tab across record switches (uncontrolled default)', () => {
    render(<Fixture />)
    clickSectionTab(screen.getByRole('tab', { name: 'Trips' }))
    expect(screen.getByText('12 trips today')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Sara Ahmed/ }))
    expect(screen.getByText('Shift 06:00–14:00')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Truck AUH-4021/ }))
    expect(screen.getByText('12 trips today')).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    render(<Fixture />)
    const results = await axe(document.body)
    expect(results).toHaveNoViolations()
  })

  it('renders under RTL (dir=rtl) without error', () => {
    const { container } = render(<Fixture dir="rtl" />)
    expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Truck AUH-4021' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Sara Ahmed/ })).toBeInTheDocument()
  })
})
