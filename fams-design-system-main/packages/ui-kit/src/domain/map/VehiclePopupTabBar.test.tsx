import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { VehiclePopupTabBar } from './VehiclePopupTabBar'

/**
 * VehiclePopupTabBar — the scalable N-pinned + adaptive-slot bar ported from
 * the designer's "FAMS popup · scalable tabs" prototype. The card is a fixed
 * 558px box, so these cases pin the invariant the prototype exists for: the
 * bar never grows past its pinned segments + ONE slot, and the current
 * selection is always visible on it.
 */
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'events', label: 'Critical Events' },
  { id: 'workforce', label: 'Workforce' },
  { id: 'trips', label: 'Trips' },
  { id: 'devices', label: 'Devices' },
]

function setup(activeKey = 'overview', props: Partial<React.ComponentProps<typeof VehiclePopupTabBar>> = {}) {
  const onTabChange = vi.fn()
  const view = render(
    <VehiclePopupTabBar
      tabs={TABS}
      activeKey={activeKey}
      onTabChange={onTabChange}
      visibleTabs={['overview', 'events', 'workforce']}
      tabDomId={(k) => `tab-${k}`}
      panelId="panel"
      {...props}
    />,
  )
  return { onTabChange, ...view }
}

/** The tablist holds only `tab` children; the compact ⋯ is its SIBLING inside
 *  the painted bar (axe: `aria-required-children`). */
const bar = () => screen.getByRole('tablist')
const barBox = () => document.querySelector('[data-slot="vehicle-popup-tabbar"]') as HTMLElement

describe('VehiclePopupTabBar — the visible split', () => {
  it('shows exactly the three named tabs plus the ⋯ slot; the rest go to the menu', () => {
    setup()
    const segments = within(bar()).getAllByRole('tab')
    expect(segments.map((s) => s.textContent)).toEqual(['Overview', 'Critical Events', 'Workforce'])
    expect(within(barBox()).getByRole('button', { name: 'More tabs' })).toBeInTheDocument()
    expect(within(barBox()).queryByText('Trips')).not.toBeInTheDocument()
  })

  it('defaults to the first `maxVisibleTabs` tabs when none are named', () => {
    setup('overview', { visibleTabs: undefined })
    expect(within(bar()).getAllByRole('tab').map((s) => s.textContent)).toEqual([
      'Overview',
      'Critical Events',
      'Workforce',
    ])
  })

  it('honours a different `maxVisibleTabs`', () => {
    setup('overview', { visibleTabs: undefined, maxVisibleTabs: 2 })
    expect(within(bar()).getAllByRole('tab')).toHaveLength(2)
  })

  it('selects a pinned segment on click', () => {
    const { onTabChange } = setup()
    fireEvent.click(screen.getByRole('tab', { name: 'Critical Events' }))
    expect(onTabChange).toHaveBeenCalledWith('events')
  })
})

describe('VehiclePopupTabBar — the ⋯ overflow menu', () => {
  it('opens on click, lists every tab in Pinned + More groups, and reports expansion', () => {
    setup()
    const dots = screen.getByRole('button', { name: 'More tabs' })
    expect(dots).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(dots)
    expect(dots).toHaveAttribute('aria-expanded', 'true')
    const menu = screen.getByRole('menu', { name: 'All tabs' })
    expect(within(menu).getByText('Pinned')).toBeInTheDocument()
    expect(within(menu).getByText('More')).toBeInTheDocument()
    expect(within(menu).getAllByRole('menuitem').map((r) => r.getAttribute('aria-label'))).toEqual([
      'Overview',
      'Critical Events',
      'Workforce',
      'Trips',
      'Devices',
    ])
    expect(within(menu).getByText(/Pin up to 3/)).toBeInTheDocument()
  })

  it('selecting an overflow tab reports it and closes the menu', () => {
    const { onTabChange } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'More tabs' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Trips' }))
    expect(onTabChange).toHaveBeenCalledWith('trips')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('the adaptive slot BECOMES the selected overflow tab, so the bar never lies about the body', () => {
    setup('trips')
    // Still three pinned segments — plus the slot, now carrying `Trips`.
    const slot = screen.getByRole('tab', { name: 'Trips, open tab list' })
    expect(slot).toHaveAttribute('aria-selected', 'true')
    expect(slot).toHaveAttribute('aria-haspopup', 'menu')
    // The bare ⋯ button is gone while the slot carries a selection.
    expect(screen.queryByRole('button', { name: 'More tabs' })).not.toBeInTheDocument()
    expect(within(bar()).getAllByRole('tab').map((s) => s.textContent?.trim())).toEqual([
      'Overview',
      'Critical Events',
      'Workforce',
      'Trips',
    ])
  })

  it('pinning an overflow tab moves it onto the bar, capped at maxVisibleTabs', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'More tabs' }))
    // The cap is reached, so pinning a fourth is refused and says why.
    const locked = screen.getAllByRole('button', { name: 'Unpin one tab first (3 max)' })
    expect(locked).toHaveLength(2)
    expect(locked[0]).toHaveAttribute('aria-disabled', 'true')
    // Unpin one, then the other becomes pinnable.
    fireEvent.click(screen.getByRole('button', { name: 'Unpin Workforce' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pin Trips to the bar' }))
    expect(within(bar()).getAllByRole('tab').map((s) => s.textContent)).toEqual([
      'Overview',
      'Critical Events',
      'Trips',
    ])
  })

  it('closes on Escape, hands focus back to the trigger, and does NOT let the key reach the card', () => {
    const onCardEscape = vi.fn()
    render(
      /*
       * A stand-in for the card's own dialog Escape handler: one gesture must
       * close ONE layer, so the menu's Escape must not also dismiss the popup.
       *
       * It carries `role="dialog"` + a name + `tabIndex={-1}` because that is
       * what `VehiclePopupCard` actually renders — the element this fixture
       * stands in for is a real, focusable, named dialog, not a bare `div`.
       * Modelling it faithfully is also what clears
       * `jsx-a11y/no-static-element-interactions`: a keydown handler on a
       * roleless element is exactly the smell that rule exists to catch, and
       * the honest fix is the role, not a suppression.
       *
       * The remaining suppression is the SAME one `VehiclePopupCard` itself
       * carries on the same line of markup: Escape-to-close on the dialog
       * container is the WAI-ARIA APG dialog pattern, and the handler ADDS
       * keyboard support rather than removing any.
       */
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
      <div
        role="dialog"
        aria-label="Vehicle"
        tabIndex={-1}
        onKeyDown={(e) => e.key === 'Escape' && onCardEscape()}
      >
        <VehiclePopupTabBar
          tabs={TABS}
          activeKey="overview"
          visibleTabs={['overview', 'events', 'workforce']}
          tabDomId={(k) => `t2-${k}`}
          panelId="panel2"
        />
      </div>,
    )
    const dots = screen.getByRole('button', { name: 'More tabs' })
    fireEvent.click(dots)
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(dots)
    expect(onCardEscape).not.toHaveBeenCalled()
  })

  it('closes on an outside pointer-down', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'More tabs' }))
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('Up/Down move between rows and Enter selects', () => {
    const { onTabChange } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'More tabs' }))
    const menu = screen.getByRole('menu')
    const rows = within(menu).getAllByRole('menuitem')
    rows[0].focus()
    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(rows[1])
    fireEvent.keyDown(rows[1], { key: 'Enter' })
    expect(onTabChange).toHaveBeenCalledWith('events')
  })
})

describe('VehiclePopupTabBar — keyboard on the bar', () => {
  it('Left/Right rove across the segments and the slot without changing the selection', () => {
    const { onTabChange } = setup()
    const first = screen.getByRole('tab', { name: 'Overview' })
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Critical Events' }))
    // Roving focus alone must not select — Enter does that (APG manual tabs).
    expect(onTabChange).not.toHaveBeenCalled()
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' })
    expect(onTabChange).toHaveBeenCalledWith('events')
  })

  it('End lands on the ⋯ slot and Enter opens the menu from the keyboard', () => {
    setup()
    const first = screen.getByRole('tab', { name: 'Overview' })
    first.focus()
    fireEvent.keyDown(first, { key: 'End' })
    const dots = screen.getByRole('button', { name: 'More tabs' })
    expect(document.activeElement).toBe(dots)
    fireEvent.keyDown(dots, { key: 'Enter' })
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('gives every label a title tooltip, since a segment can truncate', () => {
    setup()
    expect(screen.getByRole('tab', { name: 'Critical Events' })).toHaveAttribute('title', 'Critical Events')
    expect(screen.getByRole('button', { name: 'More tabs' })).toHaveAttribute('title', 'More tabs')
  })
})
