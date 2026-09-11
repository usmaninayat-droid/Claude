import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Inbox, Shield, Gauge } from '../icons'
import { NavRail } from './NavRail'
import { NavRailRow, NavRailUserRow, NavRailContextProvider } from './NavRailParts'
import { AppSwitcherPanel } from '../composites/AppSwitcherPanel'

const ITEMS = [
  { id: 'dash', label: 'Dashboard', icon: <Gauge aria-hidden />, active: true },
  { id: 'tickets', label: 'Ticketing' },
]

function renderRail(props: Partial<React.ComponentProps<typeof NavRail>> = {}) {
  return render(
    <NavRail
      items={ITEMS}
      topItems={[{ id: 'inbox', label: 'Inbox', icon: <Inbox aria-hidden />, notificationDot: true }]}
      switcher={{ label: 'CCMS', icon: <Shield aria-hidden />, panel: <p>panel content</p> }}
      logo={<svg aria-hidden />}
      {...props}
    />,
  )
}

describe('NavRail', () => {
  it('renders module + top rows, active state, and the unread dot', () => {
    const { container } = renderRail({ defaultMode: 'expanded' })
    const active = screen.getByRole('button', { name: 'Dashboard' })
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Ticketing' })).toBeInTheDocument()
    expect(container.querySelector('[data-slot="navrail-row-dot"]')).toBeInTheDocument()
    // Expanded → labels visible as text.
    expect(screen.getByText('Ticketing')).toBeInTheDocument()
  })

  it('collapsed mode hides labels (icon-only rows)', () => {
    renderRail({ defaultMode: 'collapsed' })
    expect(screen.queryByText('Ticketing')).not.toBeInTheDocument()
    // Accessible name preserved on the button.
    expect(screen.getByRole('button', { name: 'Ticketing' })).toBeInTheDocument()
  })

  it('fires onItemSelect / onTopItemSelect / onLogoClick', () => {
    const onItemSelect = vi.fn()
    const onTopItemSelect = vi.fn()
    const onLogoClick = vi.fn()
    renderRail({ defaultMode: 'expanded', onItemSelect, onTopItemSelect, onLogoClick })
    fireEvent.click(screen.getByRole('button', { name: 'Ticketing' }))
    expect(onItemSelect).toHaveBeenCalledWith('tickets')
    fireEvent.click(screen.getByRole('button', { name: 'Inbox' }))
    expect(onTopItemSelect).toHaveBeenCalledWith('inbox')
    fireEvent.click(screen.getByRole('button', { name: 'Home' }))
    expect(onLogoClick).toHaveBeenCalled()
  })

  it('switcher row opens its panel', () => {
    renderRail({ defaultMode: 'expanded' })
    fireEvent.click(screen.getByRole('button', { name: /Switch application/ }))
    expect(screen.getByText('panel content')).toBeInTheDocument()
  })

  it('logo-row toggle collapses an expanded rail and reports the mode', () => {
    const onModeChange = vi.fn()
    renderRail({ defaultMode: 'expanded', onModeChange })
    const close = screen.getByRole('button', { name: 'Close Sidebar' })
    expect(close).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(close)
    expect(onModeChange).toHaveBeenCalledWith('collapsed')
    expect(screen.queryByText('Ticketing')).not.toBeInTheDocument()
  })

  it('carries neither the edge grip nor the sidebar-mode menu (reference parity)', () => {
    renderRail({ defaultMode: 'expanded' })
    expect(screen.queryByRole('button', { name: 'Sidebar Controls' })).toBeNull()
    expect(screen.queryAllByRole('menuitemradio')).toHaveLength(0)
  })

  it('collapsed logo IS the expand control and exposes aria-expanded', () => {
    renderRail({ defaultMode: 'collapsed' })
    const open = screen.getByRole('button', { name: 'Open Sidebar' })
    expect(open).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(open)
    expect(screen.getByRole('button', { name: 'Close Sidebar' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Ticketing')).toBeInTheDocument()
  })

  it('badgeCount renders the unread count pill instead of the dot', () => {
    const { container } = renderRail({ defaultMode: 'expanded', topItems: [{ id: 'inbox', label: 'Inbox', badgeCount: 13 }] })
    expect(container.querySelector('[data-slot="navrail-row-badge"]')?.textContent).toBe('13')
    expect(container.querySelector('[data-slot="navrail-row-dot"]')).toBeNull()
  })

  it('badgeCount collapses to a bare dot, keeping the count in the name and tooltip', () => {
    const { container } = renderRail({ topItems: [{ id: 'inbox', label: 'Inbox', badgeCount: 13 }] })
    expect(container.querySelector('[data-slot="navrail-row-badge"]')).toBeNull()
    expect(container.querySelector('[data-slot="navrail-row-dot"]')).not.toBeNull()
    // Digits don't read inside a 30px square, so the number lives in the
    // accessible name instead.
    expect(screen.getByRole('button', { name: 'Inbox, 13 unread' })).toBeInTheDocument()
  })

  it('badgeCount over 99 renders as 99+', () => {
    const { container } = renderRail({
      defaultMode: 'expanded',
      topItems: [{ id: 'inbox', label: 'Inbox', badgeCount: 214 }],
    })
    expect(container.querySelector('[data-slot="navrail-row-badge"]')?.textContent).toBe('99+')
    expect(screen.getByRole('button', { name: 'Inbox, 99+ unread' })).toBeInTheDocument()
  })

  it('the application row paints the 25% scope fill, one step below the active module', () => {
    const { container } = renderRail({
      defaultMode: 'expanded',
      items: [{ id: 'tickets', label: 'Ticketing', active: true }],
    })
    const switcherRow = screen.getByRole('button', { name: /Switch application/ })
    expect(switcherRow).toHaveClass('bg-white/25')
    expect(switcherRow).toHaveAttribute('data-active', 'true')
    // The active MODULE keeps the solid-white chip, so the two never compete.
    expect(container.querySelector('[data-active][aria-current="page"]')).toHaveClass('bg-white')
  })

  it('switcher.active=false drops the scope fill (cross-application pages like the inbox)', () => {
    renderRail({
      defaultMode: 'expanded',
      switcher: { label: 'CCMS', icon: <Shield aria-hidden />, panel: <p>panel content</p>, active: false },
    })
    const switcherRow = screen.getByRole('button', { name: /Switch application/ })
    expect(switcherRow).not.toHaveClass('bg-white/25')
    expect(switcherRow).not.toHaveAttribute('data-active')
  })

  it('switcher "page" mode calls onGoHome instead of opening the popover', () => {
    const onGoHome = vi.fn()
    renderRail({
      defaultMode: 'expanded',
      switcher: { label: 'CCMS', icon: <Shield aria-hidden />, panel: <p>panel content</p>, mode: 'page', onGoHome },
    })
    fireEvent.click(screen.getByRole('button', { name: /Switch application/ }))
    expect(onGoHome).toHaveBeenCalled()
    expect(screen.queryByText('panel content')).not.toBeInTheDocument()
  })

  it('switcher popover can be controlled externally via switcher.open', () => {
    const onOpenChange = vi.fn()
    const { rerender } = renderRail({
      defaultMode: 'expanded',
      switcher: { label: 'CCMS', icon: <Shield aria-hidden />, panel: <p>panel content</p>, open: false, onOpenChange },
    })
    expect(screen.queryByText('panel content')).not.toBeInTheDocument()
    rerender(
      <NavRail
        items={ITEMS}
        defaultMode="expanded"
        switcher={{ label: 'CCMS', icon: <Shield aria-hidden />, panel: <p>panel content</p>, open: true, onOpenChange }}
      />,
    )
    expect(screen.getByText('panel content')).toBeInTheDocument()
  })

  it('footer gets the scroll shadow only while the module list overflows and is not at the bottom', () => {
    const { container } = renderRail({
      defaultMode: 'expanded',
      footer: <button type="button">Settings</button>,
    })
    const scrollEl = container.querySelector('[data-slot="custom-scrollbar-viewport"]') as HTMLElement
    // jsdom reports 0 for scrollHeight/clientHeight — force an overflowing,
    // not-at-bottom state to exercise the listener path.
    Object.defineProperty(scrollEl, 'scrollHeight', { value: 400, configurable: true })
    Object.defineProperty(scrollEl, 'clientHeight', { value: 100, configurable: true })
    Object.defineProperty(scrollEl, 'scrollTop', { value: 0, configurable: true })
    fireEvent.scroll(scrollEl)
    const foot = container.querySelector('[data-slot="navrail-footer"]')
    expect(foot?.className).toContain('shadow-elevation')
  })

  it('poweredBy renders the rail-footer attribution strip only when supplied', () => {
    const { container, rerender } = render(<NavRail items={[]} />)
    expect(container.querySelector('[data-slot="navrail-poweredby"]')).toBeNull()
    rerender(<NavRail items={[]} poweredBy={<span>FAMS</span>} />)
    expect(container.querySelector('[data-slot="navrail-poweredby"]')).not.toBeNull()
  })
})

describe('NavRail parts', () => {
  it('NavRailRow footer tone + trailing render inside an expanded context', () => {
    render(
      <NavRailContextProvider value={{ expanded: true }}>
        <NavRailRow label="Settings" tone="footer" trailing={<span data-testid="chev" />} />
      </NavRailContextProvider>,
    )
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByTestId('chev')).toBeInTheDocument()
  })

  it('NavRailUserRow shows name/email expanded and initial fallback avatar', () => {
    render(
      <NavRailContextProvider value={{ expanded: true }}>
        <NavRailUserRow name="Admin User" email="a@b.co" />
      </NavRailContextProvider>,
    )
    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText('a@b.co')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('fallback avatar disc is solid white/text-primary, not a translucent wash (fix7, P1-3: was #338ede, 3.45:1)', () => {
    render(
      <NavRailContextProvider value={{ expanded: true }}>
        <NavRailUserRow name="Admin User" email="a@b.co" />
      </NavRailContextProvider>,
    )
    const initial = screen.getByText('A')
    expect(initial).toHaveClass('bg-white', 'text-primary')
    expect(initial).not.toHaveClass('bg-white/20', 'text-white')
  })
})

describe('AppSwitcherPanel', () => {
  it('renders tiles, marks the active app, and fires onSelect/onGoHome', () => {
    const onSelect = vi.fn()
    const onGoHome = vi.fn()
    render(
      <AppSwitcherPanel
        apps={[
          { id: 'a', label: 'Alpha', icon: <Shield aria-hidden />, active: true },
          { id: 'b', label: 'Beta' },
        ]}
        onSelect={onSelect}
        onGoHome={onGoHome}
      />,
    )
    expect(screen.getByText('Switch Application')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('aria-current', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Beta' }))
    expect(onSelect).toHaveBeenCalledWith('b')
    fireEvent.click(screen.getByRole('button', { name: 'Expand to Launch Pad' }))
    expect(onGoHome).toHaveBeenCalled()
  })
})
