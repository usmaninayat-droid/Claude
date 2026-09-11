import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { LiveMapViewProps } from '../../map/LiveMapView'
import { getComponentRenderer } from '@fams/v5-composer'
import { Toaster } from '@fams/ui-kit'
import { CockpitView } from './CockpitView'
import { CockpitSplit } from './CockpitSplit'
import { cockpitConfig, cockpitRecords } from './cockpit-fixtures'

// Stub the heavy map entry (same mechanism as MapView.test.tsx) — the fake
// records paths + selection so route drawing and pin-side selection can be
// asserted without maplibre.
const lastProps = vi.hoisted(() => ({ current: null as LiveMapViewProps | null }))
vi.mock('@fams/v5-templates/map', () => ({
  LiveMapView: (props: LiveMapViewProps) => {
    lastProps.current = props
    return (
      <div data-testid="fake-live-map" data-selected={props.selectedId ?? ''} data-paths={JSON.stringify(props.paths ?? [])}>
        {props.vehicles.map((v) => (
          <button key={v.id} type="button" onClick={() => props.onSelect?.(v.id)}>
            marker {v.id}
          </button>
        ))}
      </div>
    )
  },
}))

describe('CockpitView', () => {
  it('renders alert strip, derived KPI strip, queue cards, and status panels', async () => {
    render(<CockpitView config={cockpitConfig} records={cockpitRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    // The leading count is bolded in place, so the message is split across
    // elements — assert on the alert strip's whole text (visual P1).
    const alert = document.querySelector('[data-slot="cockpit-alert"]')!
    expect(alert).toHaveTextContent('3 routes for the next shift are at risk of failing')
    expect(alert.querySelector('strong')).toHaveTextContent('3')
    expect(screen.getByText('2h 14m to shift start')).toBeInTheDocument()
    // countStatus KPI derives its value from the records (1 ongoing job).
    expect(screen.getByText('Fulfillment Rate')).toBeInTheDocument()
    expect(screen.getByText('96%')).toBeInTheDocument()
    // Queue cards + count row.
    expect(screen.getByText('Total 5 items')).toBeInTheDocument()
    expect(screen.getByText('Harbor Loop')).toBeInTheDocument()
    // Bottom band panels.
    expect(screen.getByText('Fleet Availability')).toBeInTheDocument()
    expect(screen.getByText('Workforce Readiness')).toBeInTheDocument()
  })

  /* ── Loading skeletons — UX MUSTs D.17 / F.27(c) ───────────────────────── */

  it('paints KPI / queue / panel skeletons at LOADED dimensions while loading', () => {
    const { container } = render(<CockpitView config={cockpitConfig} records={[]} loading />)
    const kpis = container.querySelectorAll('[data-slot="cockpit-kpi-skeleton"]')
    // Six, even with no records to derive a KPI strip from.
    expect(kpis).toHaveLength(6)
    // 94px — the measured height of a loaded KpiMetricCard, so the swap to
    // real cards shifts nothing (the CLS half of D.17).
    kpis.forEach((n) => expect(n.className).toContain('h-[5.875rem]'))

    const queue = container.querySelectorAll('[data-slot="cockpit-queue-skeleton"]')
    expect(queue.length).toBeGreaterThanOrEqual(4)
    expect(queue.length).toBeLessThanOrEqual(6)
    // 151px — the measured height of a loaded RouteJobCard.
    queue.forEach((n) => expect(n.className).toContain('h-[9.4375rem]'))

    expect(container.querySelectorAll('[data-slot="cockpit-panel-skeleton"]')).toHaveLength(2)
  })

  it('does not mount the map while loading (the skeleton must beat MapLibre)', () => {
    const { container } = render(<CockpitView config={cockpitConfig} records={[]} loading />)
    expect(container.querySelector('[data-slot="cockpit-map-skeleton"]')).not.toBeNull()
    expect(screen.queryByTestId('fake-live-map')).toBeNull()
  })

  /* ── Popup footer CTAs — UX MUST H.40(a) ──────────────────────────────── */

  it('renders popup footer CTAs at 36px, not the 32px `sm` default', async () => {
    render(<CockpitView config={cockpitConfig} records={cockpitRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    const footer = lastProps.current?.popupFooter?.(
      { id: cockpitRecords[0].id, record: cockpitRecords[0] } as never,
    )
    expect(footer).toBeTruthy()
    const { container } = render(<>{footer}</>)
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0)
    buttons.forEach((b) => expect(b.className).toContain('h-9'))
  })

  it('search filters the queue live and offers a clear affordance at zero matches', async () => {
    render(<CockpitView config={cockpitConfig} records={cockpitRecords} />)
    const search = screen.getByRole('textbox', { name: /Search/ })
    fireEvent.change(search, { target: { value: 'harbor' } })
    // Singular grammar (UX F.26 nit): "1 item", never "1 items".
    expect(screen.getByText('Total 1 item out of 5')).toBeInTheDocument()
    fireEvent.change(search, { target: { value: 'zzz-no-match' } })
    expect(screen.getByText(/No matches for/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getByText('Total 5 items')).toBeInTheDocument()
  })

  it('selecting a queue card draws the planned (dashed) + actual route pair on the map', async () => {
    render(<CockpitView config={cockpitConfig} records={cockpitRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Downtown Service Plan'))
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toHaveAttribute('data-selected', 'jb-1'))
    const paths = JSON.parse(screen.getByTestId('fake-live-map').getAttribute('data-paths') ?? '[]') as { id: string; dashed?: boolean }[]
    expect(paths).toHaveLength(2)
    expect(paths.some((p) => p.dashed)).toBe(true)
  })

  it('map-pin selection syncs back into the queue (exclusive selection)', async () => {
    render(<CockpitView config={cockpitConfig} records={cockpitRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'marker jb-3' }))
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toHaveAttribute('data-selected', 'jb-3'))
  })

  it('a KPI with detailColumns opens the raw-data detail sheet on click and Enter', async () => {
    render(<CockpitView config={cockpitConfig} records={cockpitRecords} />)
    const card = document.querySelector<HTMLElement>('[data-kpi-id="kpi-delayed"]')!
    expect(card).toHaveAttribute('role', 'button')
    fireEvent.click(card)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    // Sheet title + a table over the records.
    expect(screen.getAllByText('Delayed').length).toBeGreaterThan(1)
  })

  it('rendering the view registers the cockpit component names for blueprints', () => {
    render(<CockpitView config={cockpitConfig} records={cockpitRecords} />)
    expect(getComponentRenderer('KpiMetricCard')).toBeDefined()
    expect(getComponentRenderer('RouteJobCard')).toBeDefined()
    expect(getComponentRenderer('StatusBreakdownCard')).toBeDefined()
  })

  it('renders the config-driven filter pills + icon actions, and a pill selection scopes the queue', () => {
    render(<CockpitView config={cockpitConfig} records={cockpitRecords} />)
    // SPEC §2 #2–4: one pill per configured filter, placeholder pills muted.
    const pills = document.querySelectorAll('[data-slot="cockpit-filter-pill"]')
    expect(pills).toHaveLength(3)
    // SPEC §2 #5–7: the three icon actions, Export primary-tinted.
    expect(screen.getByRole('button', { name: 'Broadcast' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quick Actions' })).toBeInTheDocument()
    const filtersRow = document.querySelector('[data-slot="cockpit-filters"]')!
    expect(filtersRow.querySelector('[data-action-id="act-export"]')).toBeInTheDocument()

    fireEvent.keyDown(screen.getByRole('button', { name: /Shift/ }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Evening' }))
    expect(screen.getByText('Total 1 item')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear Shift filter' }))
    expect(screen.getByText('Total 5 items')).toBeInTheDocument()
  })

  it('queue toolbar exposes Filter + Export icon buttons and the status filter narrows the list', async () => {
    render(<CockpitView config={cockpitConfig} records={cockpitRecords} />)
    expect(document.querySelector('[data-slot="cockpit-queue-export"]')).toBeInTheDocument()
    const filter = document.querySelector<HTMLElement>('[data-slot="cockpit-queue-filter"]')!
    fireEvent.keyDown(filter, { key: 'Enter' })
    const option = await screen.findByRole('menuitemcheckbox', { name: 'Delayed' })
    fireEvent.click(option)
    await waitFor(() => expect(screen.getByText('Total 1 item out of 5')).toBeInTheDocument())
  })

  it('the popup CTA footer is status-driven and opens the matching flow sheet', async () => {
    render(<CockpitView config={cockpitConfig} records={cockpitRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    const footer = lastProps.current!.popupFooter!
    // A normal record gets Report + Call; an attention record gets Call + Replace.
    render(<div>{footer({ id: 'jb-1', record: cockpitRecords[0] } as never)}</div>)
    expect(screen.getByRole('button', { name: /Report Breakdown/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Call Assignee/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Report Breakdown/ }))
    await waitFor(() => expect(screen.getByText('Breakdown Type *')).toBeInTheDocument())
  })

  /** Round-4 UX finding 1: the success toast must be conditional on the write. */
  describe('contact Copy feedback', () => {
    const openCopy = async () => {
      render(<CockpitView config={cockpitConfig} records={cockpitRecords} />)
      await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
      const target = { id: 'jb-1', record: cockpitRecords[0] } as never
      // The toast outlet now lives at the APP ROOT (`V5AppShell`), not in the
      // view template (P0-2) — these tests mount their own, exactly as the real
      // app shell does, to assert the toast content.
      const { rerender } = render(
        <>
          <Toaster />
          <div>{lastProps.current!.popupFooter!(target)}</div>
        </>,
      )
      fireEvent.click(screen.getByRole('button', { name: /Call Assignee/ }))
      // The tooltip's open state lives in CockpitView, which re-renders and
      // hands back a FRESH `popupFooter` closure — pull it through.
      rerender(
        <>
          <Toaster />
          <div>{lastProps.current!.popupFooter!(target)}</div>
        </>,
      )
      return screen.getByRole('button', { name: 'Copy contact' })
    }
    const setClipboard = (value: unknown) => {
      Object.defineProperty(navigator, 'clipboard', { value, configurable: true })
    }

    it('shows "Copied" only when the write actually resolves', async () => {
      setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
      fireEvent.click(await openCopy())
      await waitFor(() => expect(screen.getAllByText('Copied').length).toBeGreaterThan(0))
    })

    it('shows an error toast CARRYING THE NUMBER when the write rejects, and never "Copied"', async () => {
      setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) })
      const copy = await openCopy()
      const contact = copy.parentElement!.textContent!.replace(/\s+$/, '')
      fireEvent.click(copy)
      await waitFor(() =>
        expect(screen.getAllByText(/Could not copy — the number is/).length).toBeGreaterThan(0),
      )
      expect(screen.getByText(/Could not copy — the number is/).textContent).toContain(
        contact.replace(/[^0-9+ ]/g, '').trim(),
      )
      expect(screen.queryByText('Copied')).toBeNull()
    })

    it('announces the copy-failure toast assertively (role="alert")', async () => {
      setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) })
      fireEvent.click(await openCopy())
      await waitFor(() =>
        expect(screen.getAllByText(/Could not copy — the number is/).length).toBeGreaterThan(0),
      )
      const alert = screen.getAllByRole('alert').find((el) => /Could not copy/.test(el.textContent ?? ''))
      expect(alert).toBeTruthy()
    })
  })

  it('the attention KPI opens the issues sheet, and a KPI detail sheet shows only that KPI population', async () => {
    render(<CockpitView config={cockpitConfig} records={cockpitRecords} />)
    fireEvent.click(document.querySelector<HTMLElement>('[data-kpi-id="kpi-action"]')!)
    await waitFor(() => expect(screen.getByText('Current Shift Issues')).toBeInTheDocument())
    // One Action Required record, not all five.
    expect(screen.getByText('1 item')).toBeInTheDocument()
  })

  it('a KPI detail sheet lists only that KPI\u2019s own population, never every record', async () => {
    render(<CockpitView config={cockpitConfig} records={cockpitRecords} />)
    fireEvent.click(document.querySelector<HTMLElement>('[data-kpi-id="kpi-delayed"]')!)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    // One Delayed record out of five, and the count row says so.
    expect(screen.getByText('1 record')).toBeInTheDocument()
  })

  it('the Fulfillment KPI is clickable (no dead affordance) and the bottom cards carry a filter chip', () => {
    render(<CockpitView config={cockpitConfig} records={cockpitRecords} />)
    expect(document.querySelector('[data-kpi-id="kpi-fulfillment"]')).toHaveAttribute('role', 'button')
    expect(document.querySelector('[data-slot="cockpit-panel-filter"]')).toBeInTheDocument()
    // ONE segmented proportion bar per panel, not per-row minis.
    expect(document.querySelectorAll('[data-slot="status-breakdown-card-bar"]').length).toBe(2)
  })

  it('the issues sheet never mounts a second map (MapPanel mount guard, perf rule 3)', async () => {
    render(<CockpitView config={cockpitConfig} records={cockpitRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    fireEvent.click(document.querySelector<HTMLElement>('[data-kpi-id="kpi-action"]')!)
    await waitFor(() => expect(screen.getByText('Current Shift Issues')).toBeInTheDocument())
    expect(screen.getAllByTestId('fake-live-map')).toHaveLength(1)
  })

  it('queue cards carry the progress %, an avatar, the status accent bar and explicit delay text', () => {
    render(<CockpitView config={cockpitConfig} records={cockpitRecords} />)
    expect(screen.getByText('4/12 tasks · 32% · 32%')).toBeInTheDocument()
    expect(screen.getByText('Running 32 min late')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="route-job-card-accent"]').length).toBeGreaterThan(0)
  })
})

describe('CockpitSplit', () => {
  it('exposes a keyboard-operable separator with clamp semantics', () => {
    render(<CockpitSplit list={<div>list</div>} map={<div>map</div>} />)
    const separator = screen.getByRole('separator', { name: 'Resize queue and map panes' })
    expect(separator).toHaveAttribute('aria-valuenow', '40')
    fireEvent.keyDown(separator, { key: 'ArrowRight' })
    expect(separator).toHaveAttribute('aria-valuenow', '45')
    fireEvent.keyDown(separator, { key: 'Home' })
    expect(separator).toHaveAttribute('aria-valuenow', '26')
    fireEvent.keyDown(separator, { key: 'End' })
    expect(separator).toHaveAttribute('aria-valuenow', '70')
    fireEvent.doubleClick(separator)
    expect(separator).toHaveAttribute('aria-valuenow', '40')
  })

  it('close-map and expand-map states both keep a way back (reopen affordances)', () => {
    render(<CockpitSplit list={<div>list</div>} map={<div data-testid="the-map">map</div>} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close map' }))
    expect(screen.queryByTestId('the-map')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show map' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expand map' }))
    expect(screen.getByTestId('the-map')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show list' }))
    expect(screen.getByRole('separator', { name: 'Resize queue and map panes' })).toBeInTheDocument()
  })
})
