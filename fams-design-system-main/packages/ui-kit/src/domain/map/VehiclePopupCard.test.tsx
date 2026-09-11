import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as a11y.axe.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { VehiclePopupCard, type VehiclePopupField } from './VehiclePopupCard'

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

const FIELDS: VehiclePopupField[] = [
  { icon: <svg aria-hidden="true" />, label: 'Fuel', value: '64%' },
  { icon: <svg aria-hidden="true" />, label: 'Odometer', value: '128,340 km', onCopy: () => {} },
]

/**
 * The Figma card's Overview body, field-for-field (495:4143 / SPEC P0-2), in
 * row-major order across the three columns. "Last Record Recieved" reproduces
 * Figma's misspelling in text node 495:4264 verbatim.
 */
const LIVE_FIELD_LABELS = [
  'Driver',
  'Contact',
  'Vehicle Speed',
  'Coordinates',
  'Last Record Recieved',
  'Odometer',
  'SOS',
  'Temperature',
  'Altitude',
  'Vehicle Color',
] as const
const LIVE_VALUES: Record<(typeof LIVE_FIELD_LABELS)[number], string> = {
  Driver: 'Jhon Doe',
  Contact: '+1 000 000 0110',
  'Vehicle Speed': '0 km/h',
  Coordinates: '30.037 , 72.324',
  'Last Record Recieved': '23 Mins ago',
  Odometer: '0',
  SOS: '--',
  Temperature: '20°C',
  Altitude: '0',
  'Vehicle Color': 'Black',
}
const LIVE_FIELDS: VehiclePopupField[] = LIVE_FIELD_LABELS.map((label) => ({
  icon: <svg aria-hidden="true" />,
  label,
  value: LIVE_VALUES[label],
  ...(label === 'Coordinates' ? { onCopy: () => {} } : {}),
}))

describe('VehiclePopupCard', () => {
  it('renders the header identity fields', () => {
    render(
      <VehiclePopupCard
        model="Hilux 2023"
        plate="AUH-12345"
        driver="Ali Hassan"
        location="Al Rayyan Rd, Doha"
        status="Moving"
        fields={[]}
      />,
    )
    expect(screen.getByText('Hilux 2023')).toBeInTheDocument()
    expect(screen.getByText('AUH-12345')).toBeInTheDocument()
    // The driver moved to the Workforce tab (board 16:22182) — not in the header.
    expect(screen.queryByText('Ali Hassan')).not.toBeInTheDocument()
    expect(screen.getByText('Al Rayyan Rd, Doha')).toBeInTheDocument()
    expect(screen.getByText('Moving')).toBeInTheDocument()
  })

  it('is a dialog labelled by the vehicle title (UX D30)', () => {
    render(
      <VehiclePopupCard model="Hilux 2023" plate="A" driver="B" location="C" status="Moving" fields={[]} />,
    )
    expect(screen.getByRole('dialog', { name: 'Hilux 2023' })).toBeInTheDocument()
  })

  it('moves focus into the card when focusOnMount is set', () => {
    render(
      <VehiclePopupCard focusOnMount model="Hilux" plate="A" driver="B" location="C" status="Idle" fields={[]} />,
    )
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
  })

  it('closes on Escape when onClose is wired (UX D27)', () => {
    const onClose = vi.fn()
    render(
      <VehiclePopupCard model="Hilux" plate="A" driver="B" location="C" status="Idle" fields={[]} onClose={onClose} />,
    )
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on an outside pointer-down only when closeOnOutsideClick is set (UX D27)', () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <VehiclePopupCard model="Hilux" plate="A" driver="B" location="C" status="Idle" fields={[]} onClose={onClose} />,
    )
    fireEvent.pointerDown(document.body)
    expect(onClose).not.toHaveBeenCalled()

    rerender(
      <VehiclePopupCard
        closeOnOutsideClick
        model="Hilux"
        plate="A"
        driver="B"
        location="C"
        status="Idle"
        fields={[]}
        onClose={onClose}
      />,
    )
    // A press inside the card is not an outside click.
    fireEvent.pointerDown(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.pointerDown(document.body)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders exactly ONE status mark — the tile badge, not a second status-line glyph (495:4223)', () => {
    const { container } = render(
      <VehiclePopupCard
        model="Hilux"
        plate="A"
        driver="B"
        location="C"
        status="Stopped"
        statusTone="error"
        statusSince="since 2 minutes"
        fields={[]}
      />,
    )
    // Figma's status row is two text nodes; the red mark before the word is the
    // tile's 16×16 badge (aria-hidden), which must appear once.
    const badges = container.querySelectorAll('.bg-destructive.rounded-full')
    expect(badges).toHaveLength(1)
    expect(badges[0].getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByText('Stopped').className).toContain('text-destructive')
  })

  it('renders all TEN Figma body cells inside the fixed card, none clipped away (P0-2)', () => {
    const { container } = render(
      <VehiclePopupCard
        model="Mitsubishi X6734"
        plate="GFU47893"
        driver="Jhon Doe"
        location="Hamad International Airport"
        status="Stopped"
        statusTone="error"
        statusSince="since 2 minutes"
        fields={LIVE_FIELDS}
        tabs={['Overview', 'Critical Events', 'Trips', 'Devices']}
        activeTab="Overview"
      />,
    )
    for (const label of LIVE_FIELD_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    // 4 rows at Figma's ~62px pitch (a 39px cell + a 24px gap — round-5 visual
    // V3 corrected the gap from 28px, which put the pitch at 67 and the fourth
    // row 16px low) must fit the body, so the header is pinned to Figma's
    // 110px rather than growing with its content.
    // Header is pinned to Figma's 110px with INLINE geometry, not an
    // arbitrary-value height class a consumer's Tailwind build could drop
    // (round-1 visual finding #29).
    expect(
      container.querySelector<HTMLElement>('[data-slot="vehicle-popup-header"]')?.style.height,
    ).toBe('110px')
    const grid = container.querySelector('[data-slot="vehicle-popup-fields"]')
    expect(grid?.className).toContain('gap-y-6')
    expect(grid?.children).toHaveLength(10)
  })

  it('keeps the meta row on ONE line — plate + address only — and ellipsizes the address at its 255px cap (D2)', () => {
    const { container } = render(
      <VehiclePopupCard
        model="Mitsubishi X6734"
        plate="GFU47893"
        driver="Jhon Doe"
        location="Hamad International Airport"
        status="Stopped"
        fields={[]}
      />,
    )
    const row = container.querySelector('[data-slot="vehicle-popup-meta"]') as HTMLElement
    expect(row.className).toContain('flex-nowrap')
    expect(row.className).not.toContain('flex-wrap')
    // Board 16:21393 carries TWO items: the plate holds its width, the address
    // shrinks and truncates. The driver moved to the Workforce tab.
    const plate = screen.getByText('GFU47893').parentElement as HTMLElement
    const loc = screen.getByText('Hamad International Airport')
    expect(plate.className).toContain('shrink-0')
    expect(screen.queryByText('Jhon Doe')).not.toBeInTheDocument()
    expect((loc.parentElement as HTMLElement).className).toContain('min-w-0')
    expect((loc.parentElement as HTMLElement).style.maxWidth).toBe('255px')
    expect(loc.className).toContain('truncate')
  })

  it('pins the status badge to the tile’s bottom-END with inline logical insets (D3)', () => {
    const { container } = render(
      <VehiclePopupCard model="Hilux" plate="A" driver="B" location="C" status="Idle" fields={[]} />,
    )
    const badge = container.querySelector<HTMLElement>('[data-slot="vehicle-popup-status-badge"]')
    expect(badge).not.toBeNull()
    // Inline logical properties, so a consumer Tailwind build that never emits
    // `-end-1` cannot drop the badge back to the tile's bottom-START corner.
    expect(badge?.style.insetInlineEnd).toBe('-4px')
    expect(badge?.style.insetBlockEnd).toBe('-4px')
    expect(badge?.className).not.toContain('-end-1')
  })

  it('renders a PROGRESS field as a bar + percentage, not a text value (16:21739)', () => {
    const { container } = render(
      <VehiclePopupCard
        model="Hilux"
        plate="A"
        location="C"
        status="Idle"
        fields={[
          { icon: <span />, label: 'Fill Level', value: '93%', percent: 93 },
          { icon: <span />, label: 'Fuel Level', value: '12%', percent: 12, percentTone: 'error' },
        ]}
      />,
    )
    const bars = container.querySelectorAll('[data-slot="vehicle-popup-fields"] span[aria-hidden="true"]')
    expect(bars.length).toBe(2)
    expect((bars[0] as HTMLElement).style.width).toBe('93%')
    expect((bars[0] as HTMLElement).className).toContain('bg-success')
    expect((bars[1] as HTMLElement).style.width).toBe('12%')
    expect((bars[1] as HTMLElement).className).toContain('bg-destructive')
    // The reading stays text — the bar is decorative.
    expect(screen.getByText('93%')).toBeInTheDocument()
  })

  it('clamps an out-of-range progress value instead of overflowing the track', () => {
    const { container } = render(
      <VehiclePopupCard
        model="Hilux"
        plate="A"
        location="C"
        status="Idle"
        fields={[{ icon: <span />, label: 'Fill Level', value: '140%', percent: 140 }]}
      />,
    )
    const bar = container.querySelector('[data-slot="vehicle-popup-fields"] span[aria-hidden="true"]') as HTMLElement
    expect(bar.style.width).toBe('100%')
  })

  it('renders a TAGS field as a tinted chip row (16:22771)', () => {
    render(
      <VehiclePopupCard
        model="Hilux"
        plate="A"
        location="C"
        status="Idle"
        fields={[
          {
            icon: <span />,
            label: 'Tags',
            value: 'Night Shift, Hazmat',
            chips: [
              { label: 'Night Shift', tone: 'success' },
              { label: 'Hazmat', tone: 'warning' },
            ],
          },
        ]}
      />,
    )
    expect(screen.getByText('Night Shift').className).toContain('bg-success-scale-100')
    expect(screen.getByText('Hazmat').className).toContain('bg-warning-scale-50')
  })

  it('lays the body grid on the board’s three EQUAL columns (16:20661)', () => {
    const { container } = render(
      <VehiclePopupCard model="Hilux" plate="A" driver="B" location="C" status="Idle" fields={FIELDS} />,
    )
    const grid = container.querySelector('[data-slot="vehicle-popup-fields"]')
    // `grid-cols-3` = `repeat(3, minmax(0, 1fr))` — three EQUAL columns, one
    // fixed gutter (`gap-x-4` = 16px) — not the old unequal 203/195/128
    // per-column template.
    expect(grid?.className).toContain('grid-cols-3')
    expect(grid?.className).toContain('gap-x-4')
  })

  /**
   * A20: the progress-bar cells (Fill Level, Fuel Level) used to stretch
   * their grid row and, because every cell was `items-center`, shift the
   * label/value baselines of the row's OTHER (text) cells — "Fill Level"
   * sat higher than "Odometer" in the same row. Every cell now starts at the
   * row's block-start (`items-start`) and the value row is pinned to a fixed
   * 20px height (`h-5`) whether it holds text, a progress bar, or chips, so
   * the rhythm is identical regardless of value type.
   */
  it('aligns every cell to the row’s block-start with an identical value-row height, regardless of value type (A20)', () => {
    const { container } = render(
      <VehiclePopupCard
        model="Hilux"
        plate="A"
        location="C"
        status="Idle"
        fields={[
          { icon: <span />, label: 'Fill Level', value: '93%', percent: 93 },
          { icon: <span />, label: 'Odometer', value: '128,340 km' },
          {
            icon: <span />,
            label: 'Tags',
            value: 'Night Shift',
            chips: [{ label: 'Night Shift', tone: 'success' }],
          },
        ]}
      />,
    )
    const grid = container.querySelector('[data-slot="vehicle-popup-fields"]') as HTMLElement
    const cells = Array.from(grid.children) as HTMLElement[]
    expect(cells).toHaveLength(3)
    for (const cell of cells) {
      // Top-aligned, not centered — see comment above.
      expect(cell.className).toContain('items-start')
      expect(cell.className).not.toContain('items-center')
    }
    // The progress cell's value row and the plain-text cell's value row both
    // carry the same fixed block size, so neither can push its label out of
    // line with the other cells in its row.
    const progressValueRow = screen.getByText('93%').parentElement as HTMLElement
    const textValueRow = screen.getByText('128,340 km').parentElement as HTMLElement
    expect(progressValueRow.className).toContain('h-5')
    expect(textValueRow.className).toContain('h-5')
  })

  it('caps the card at 448px with an internally scrolling body (QA A14)', () => {
    const { container } = render(
      <VehiclePopupCard model="Hilux" plate="A" driver="B" location="C" status="Idle" fields={FIELDS} />,
    )
    // 448px CEILING, inline (not `h-[28rem]` — see finding #29); a tab with
    // that much content fills it and the body region scrolls inside it, while
    // a short tab (Workforce, the shortest of the five Figma variants) hugs
    // its own content instead of painting an empty band above the tab strip.
    // It was a FIXED height until QA A14, which is what produced that band.
    const box = container.querySelector<HTMLElement>('[data-slot="vehicle-popup-card"] > div')
    expect(box?.style.maxHeight).toBe('448px')
    expect(box?.style.height).toBe('')
    // The Figma card is shadow-only — no 1px border (finding #29).
    expect(box?.className).not.toContain('border-border')
    expect(container.querySelector('.overflow-y-auto')).not.toBeNull()
  })

  it('shows the trailing status-since detail only when provided', () => {
    const { rerender } = render(
      <VehiclePopupCard model="Hilux" plate="A" driver="B" location="C" status="Idle" fields={[]} />,
    )
    expect(screen.queryByText('since 2 minutes')).not.toBeInTheDocument()

    rerender(
      <VehiclePopupCard
        model="Hilux"
        plate="A"
        driver="B"
        location="C"
        status="Idle"
        statusSince="since 2 minutes"
        fields={[]}
      />,
    )
    expect(screen.getByText('since 2 minutes')).toBeInTheDocument()
  })

  it('renders the 3D vehicle art on the tile and IGNORES the deprecated thumbnail (P0-1)', () => {
    const { container } = render(
      <VehiclePopupCard
        model="Hilux"
        plate="A"
        driver="B"
        location="C"
        status="Idle"
        fields={[]}
        thumbnail={<img data-testid="legacy-photo" src="x.jpg" alt="" />}
      />,
    )
    // The deprecated thumbnail (a photo) is accepted but never rendered.
    expect(screen.queryByTestId('legacy-photo')).not.toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    // The 3D art is an inline SVG with the vi3d- gradient defs.
    expect(container.querySelector('svg linearGradient[id^="vi3d-"]')).not.toBeNull()
  })

  it('renders every field with its label and value, paired in one accessible name (UX D29)', () => {
    render(
      <VehiclePopupCard model="Hilux" plate="A" driver="B" location="C" status="Idle" fields={FIELDS} />,
    )
    expect(screen.getByText('Fuel')).toBeInTheDocument()
    expect(screen.getByText('64%')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Fuel: 64%' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Odometer: 128,340 km' })).toBeInTheDocument()
  })

  it('only shows a copy button for fields that provide onCopy, and announces the copy politely', () => {
    const onCopy = vi.fn()
    const fields: VehiclePopupField[] = [
      { icon: <svg aria-hidden="true" />, label: 'Fuel', value: '64%' },
      { icon: <svg aria-hidden="true" />, label: 'Coordinates', value: '30.037 , 72.324', onCopy },
    ]
    render(<VehiclePopupCard model="Hilux" plate="A" driver="B" location="C" status="Idle" fields={fields} />)

    expect(screen.queryByRole('button', { name: 'Copy Fuel' })).not.toBeInTheDocument()
    const copyButton = screen.getByRole('button', { name: 'Copy Coordinates' })
    fireEvent.click(copyButton)
    expect(onCopy).toHaveBeenCalledTimes(1)
    // Live-region announcement (UX D30).
    expect(screen.getByText('Coordinates copied')).toBeInTheDocument()
  })

  it('omits the segmented tab strip when no tabs are given', () => {
    render(<VehiclePopupCard model="Hilux" plate="A" driver="B" location="C" status="Idle" fields={[]} />)
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('renders tabs on a grey track, marks the active white pill, and calls onTabChange', () => {
    const onTabChange = vi.fn()
    render(
      <VehiclePopupCard
        model="Hilux"
        plate="A"
        driver="B"
        location="C"
        status="Idle"
        fields={[]}
        tabs={['Overview', 'History']}
        activeTab="Overview"
        onTabChange={onTabChange}
      />,
    )
    // The grey track is the painted BAR; the tablist inside it holds only
    // `tab` children (axe `aria-required-children`).
    const track = document.querySelector('[data-slot="vehicle-popup-tabbar"]') as HTMLElement
    expect(track.className).toContain('bg-gray-100')
    expect(screen.getByRole('tablist', { name: 'Vehicle details' })).toBeInTheDocument()
    const overviewTab = screen.getByRole('tab', { name: 'Overview' })
    const historyTab = screen.getByRole('tab', { name: 'History' })
    expect(overviewTab.className).toContain('text-primary')
    expect(overviewTab.className).toContain('bg-card')
    expect(historyTab.className).not.toContain('text-primary')

    historyTab.click()
    expect(onTabChange).toHaveBeenCalledWith('History')
  })

  it('renders the active object-tab content in place of the fields grid', () => {
    const { rerender } = render(
      <VehiclePopupCard
        model="Hilux"
        plate="A"
        driver="B"
        location="C"
        status="Idle"
        fields={FIELDS}
        tabs={['Overview', { id: 'trips', label: 'Trips', content: <p data-testid="trips-body">trip rows</p> }]}
        activeTab="Overview"
      />,
    )
    // String tab (Overview) keeps the fields grid; the object tab's body is absent.
    expect(screen.getByText('Fuel')).toBeInTheDocument()
    expect(screen.queryByTestId('trips-body')).not.toBeInTheDocument()

    rerender(
      <VehiclePopupCard
        model="Hilux"
        plate="A"
        driver="B"
        location="C"
        status="Idle"
        fields={FIELDS}
        tabs={['Overview', { id: 'trips', label: 'Trips', content: <p data-testid="trips-body">trip rows</p> }]}
        activeTab="trips"
      />,
    )
    expect(screen.getByTestId('trips-body')).toBeInTheDocument()
    expect(screen.queryByText('Fuel')).not.toBeInTheDocument()
  })

  it('reports an object tab by its id and marks it aria-selected when active', () => {
    const onTabChange = vi.fn()
    render(
      <VehiclePopupCard
        model="Hilux"
        plate="A"
        driver="B"
        location="C"
        status="Idle"
        fields={[]}
        tabs={[{ id: 'events', label: 'Critical Events', content: <p>events</p> }]}
        activeTab="events"
        onTabChange={onTabChange}
      />,
    )
    const tab = screen.getByRole('tab', { name: 'Critical Events' })
    expect(tab).toHaveAttribute('aria-selected', 'true')
    // WAI-ARIA tabs wiring: tab in a tablist, controlling the body tabpanel.
    expect(screen.getByRole('tablist', { name: 'Vehicle details' })).toContainElement(tab)
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', tab.id)
    tab.click()
    expect(onTabChange).toHaveBeenCalledWith('events')
  })

  it('roves the tablist with Left/Right arrows without selecting (WAI-ARIA tabs, UX D30)', () => {
    const onTabChange = vi.fn()
    // FOUR tabs against a 3-segment bar: three pin, the rest goes to the ⋯
    // menu, and the bar never grows (the scalable-tab model).
    const tabs = ['Overview', 'Critical Events', 'Trips', 'Devices']
    render(
      <VehiclePopupCard
        model="Hilux"
        plate="A"
        location="C"
        status="Idle"
        fields={[]}
        tabs={tabs}
        activeTab="Overview"
        onTabChange={onTabChange}
      />,
    )
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Overview',
      'Critical Events',
      'Trips',
    ])
    expect(screen.getByRole('button', { name: 'More tabs' })).toBeInTheDocument()

    const overview = screen.getByRole('tab', { name: 'Overview' })
    expect(overview).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Trips' })).toHaveAttribute('tabindex', '-1')

    // Arrows MOVE focus; Enter commits (APG manual activation) — arrowing
    // through tabs no longer swaps the body under the user on every keypress.
    fireEvent.keyDown(overview, { key: 'ArrowRight' })
    expect(onTabChange).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Critical Events' }))
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' })
    expect(onTabChange).toHaveBeenLastCalledWith('Critical Events')
  })

  it('gives the copy affordance a ≥24px hit area without disturbing the value row (UX-7)', () => {
    render(
      <VehiclePopupCard
        model="Hilux"
        plate="A"
        driver="B"
        location="C"
        status="Idle"
        fields={[{ icon: <svg aria-hidden="true" />, label: 'Coordinates', value: '30.037 , 72.324', onCopy: () => {} }]}
      />,
    )
    const button = screen.getByRole('button', { name: 'Copy Coordinates' })
    expect(button.className).toContain('size-6')
    expect(button.className).toContain('-m-1.5')
  })

  it('calls onLocate, onExpand, and onClose from their respective header actions', () => {
    const onLocate = vi.fn()
    const onExpand = vi.fn()
    const onClose = vi.fn()
    render(
      <VehiclePopupCard
        model="Hilux"
        plate="A"
        driver="B"
        location="C"
        status="Idle"
        fields={[]}
        onLocate={onLocate}
        onExpand={onExpand}
        onClose={onClose}
      />,
    )
    screen.getByRole('button', { name: 'Center on vehicle' }).click()
    screen.getByRole('button', { name: 'Expand details' }).click()
    screen.getByRole('button', { name: 'Close' }).click()

    expect(onLocate).toHaveBeenCalledTimes(1)
    expect(onExpand).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  /**
   * A21: the "Center on vehicle" action carried a hardcoded `text-primary`
   * unconditionally, so it always rendered tinted/"pressed" next to its two
   * plain-muted siblings — misread as a stuck focus ring. At rest, with no
   * `locating` prop, all three header actions must share the exact same
   * muted tone and carry no border/background; only `locating` (an explicit,
   * default-off toggle for "map is following this vehicle") may tint it
   * primary — never a mouse click or the card's own programmatic
   * `focusOnMount`.
   */
  it('renders all three header actions in the same muted tone at rest, and tints locate primary only when told to (A21)', () => {
    const { rerender } = render(
      <VehiclePopupCard model="Hilux" plate="A" location="C" status="Idle" fields={[]} />,
    )
    const locate = screen.getByRole('button', { name: 'Center on vehicle' })
    const expand = screen.getByRole('button', { name: 'Expand details' })
    const close = screen.getByRole('button', { name: 'Close' })
    for (const button of [locate, expand, close]) {
      expect(button.className).not.toContain('text-primary')
      expect(button.className).toContain('text-muted-foreground')
      expect(button.className).toContain('border-0')
      expect(button.className).toContain('bg-transparent')
    }
    expect(locate).toHaveAttribute('aria-pressed', 'false')

    rerender(
      <VehiclePopupCard locating model="Hilux" plate="A" location="C" status="Idle" fields={[]} />,
    )
    const locateActive = screen.getByRole('button', { name: 'Center on vehicle' })
    expect(locateActive.className).toContain('text-primary')
    expect(locateActive).toHaveAttribute('aria-pressed', 'true')
    // The other two never react to `locating`.
    expect(screen.getByRole('button', { name: 'Expand details' }).className).not.toContain('text-primary')
  })

  it('renders the bottom pointer triangle only when opted in', () => {
    const { container, rerender } = render(
      <VehiclePopupCard model="Hilux" plate="A" driver="B" location="C" status="Idle" fields={[]} />,
    )
    expect(container.querySelector('[data-slot="vehicle-popup-pointer"]')).toBeNull()

    rerender(
      <VehiclePopupCard pointer model="Hilux" plate="A" driver="B" location="C" status="Idle" fields={[]} />,
    )
    expect(container.querySelector('[data-slot="vehicle-popup-pointer"]')).not.toBeNull()
  })

  it('forwards the ref to the root element', () => {
    let node: HTMLDivElement | null = null
    render(
      <VehiclePopupCard
        ref={(el) => {
          node = el
        }}
        model="Hilux"
        plate="A"
        driver="B"
        location="C"
        status="Idle"
        fields={[]}
      />,
    )
    expect(node).toBeInstanceOf(HTMLDivElement)
  })

  /** Round-4 UX finding 2: a body that scrolls must SAY it scrolls. */
  describe('overflow scroll cue', () => {
    const renderCard = () =>
      render(
        <VehiclePopupCard
          model="Hilux 2023"
          plate="AUH-12345"
          driver="Ali Hassan"
          location="Al Rayyan Rd, Doha"
          status="Moving"
          fields={FIELDS}
        />,
      )
    const stub = (el: Element, scrollHeight: number, clientHeight: number) => {
      Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
      Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true })
    }

    it('shows no cue when the body fits', () => {
      renderCard()
      expect(document.querySelector('[data-slot="vehicle-popup-card-scroll-cue"]')).toBeNull()
    })

    it('shows the cue once the body overflows, and hides it at the end of the scroll', () => {
      renderCard()
      const body = document.querySelector('[data-slot="vehicle-popup-card-body"]') as HTMLElement
      stub(body, 164, 96)
      fireEvent.scroll(body)
      expect(document.querySelector('[data-slot="vehicle-popup-card-scroll-cue"]')).not.toBeNull()
      body.scrollTop = 68
      fireEvent.scroll(body)
      expect(document.querySelector('[data-slot="vehicle-popup-card-scroll-cue"]')).toBeNull()
    })

    /**
     * Round-5 UX finding: WCAG 2.1.1 — the body must be Tab-reachable exactly
     * when it OVERFLOWS. Round-6 a11y follow-up: it must STAY Tab-reachable at
     * scroll-end. Gating `tabIndex`/`role`/`aria-label` on the *cue* ("there is
     * more below") stripped the role and name off the element while it was
     * still focused once the user hit the bottom, so tabbing away left no way
     * back in to scroll up. Only the visual cue is cue-gated.
     */
    it('is not a Tab stop when nothing overflows, and becomes one once the body overflows', () => {
      renderCard()
      const body = document.querySelector('[data-slot="vehicle-popup-card-body"]') as HTMLElement
      expect(body.getAttribute('tabindex')).toBe('-1')
      expect(body.hasAttribute('aria-label')).toBe(false)
      expect(body.hasAttribute('role')).toBe(false)

      stub(body, 164, 96)
      fireEvent.scroll(body)
      expect(body.getAttribute('tabindex')).toBe('0')
      expect(body.getAttribute('role')).toBe('region')
      expect(body.getAttribute('aria-label')).toBeTruthy()
    })

    it('KEEPS the Tab stop, role and name at the end of the scroll (cue gone, access intact)', () => {
      renderCard()
      const body = document.querySelector('[data-slot="vehicle-popup-card-body"]') as HTMLElement
      stub(body, 164, 96)
      fireEvent.scroll(body)
      expect(body.getAttribute('tabindex')).toBe('0')

      body.scrollTop = 68
      fireEvent.scroll(body)
      // The visual cue is gone — there is genuinely nothing more below.
      expect(document.querySelector('[data-slot="vehicle-popup-card-scroll-cue"]')).toBeNull()
      // ...but the region is still a focusable, named Tab stop so a keyboard
      // user can come back and scroll UP.
      expect(body.getAttribute('tabindex')).toBe('0')
      expect(body.getAttribute('role')).toBe('region')
      expect(body.getAttribute('aria-label')).toBeTruthy()
    })

    it('keeps the footer CTA row a SIBLING of the scrolling body, never inside it', () => {
      render(
        <VehiclePopupCard
          model="Hilux 2023"
          plate="AUH-12345"
          driver="Ali Hassan"
          location="Al Rayyan Rd, Doha"
          status="Moving"
          fields={FIELDS}
          footer={<button type="button">Call Driver</button>}
        />,
      )
      const body = document.querySelector('[data-slot="vehicle-popup-card-body"]')
      const footer = document.querySelector('[data-slot="vehicle-popup-card-footer"]')
      expect(footer).not.toBeNull()
      expect(body?.contains(footer as Node)).toBe(false)
      expect(footer?.className).toContain('flex-none')
    })
  })

  it('has no axe violations', async () => {
    render(
      <VehiclePopupCard
        model="Hilux 2023"
        plate="AUH-12345"
        driver="Ali Hassan"
        location="Al Rayyan Rd, Doha"
        status="Moving"
        statusTone="success"
        fields={FIELDS}
        tabs={['Overview', 'History']}
        activeTab="Overview"
        onTabChange={() => {}}
        onLocate={() => {}}
        onExpand={() => {}}
        onClose={() => {}}
        pointer
      />,
    )
    const results = await axe(document.body)
    expect(results).toHaveNoViolations()
  })
})
