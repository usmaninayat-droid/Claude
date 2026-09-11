import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SIDENAV_RAIL_WIDTH, SideNav, SideNavFooterItem, type SideNavItem } from './SideNav'

const items: SideNavItem[] = [
  { label: 'Bins', to: '/bins', active: true, icon: <svg data-testid="bins-icon" /> },
  { label: 'Live Monitoring', to: '/live', icon: <svg data-testid="live-icon" /> },
]

describe('SideNav (icon rail)', () => {
  it('is a slim 51px (live-monitoring SPEC v2 §2.1) icon rail driven by --shell-rail-bg', () => {
    const { container } = render(<SideNav items={items} />)
    const nav = container.querySelector('nav')!
    // 51px, applied INLINE so a consumer's Tailwind build cannot drop it
    // (⚠ was the `w-11` class / 44px — round-1 visual finding #39).
    expect(nav.style.width).toBe('51px')
    // never the legacy expandable widths / collapse state
    expect(nav.className).not.toContain('w-60')
    expect(nav).not.toHaveAttribute('data-collapsed')
    expect(nav.getAttribute('style') ?? '').toContain('--shell-rail-bg')
  })

  it('exposes each item by its accessible name as a link to `to`', () => {
    render(<SideNav items={items} />)
    const bins = screen.getByRole('link', { name: /Bins/ })
    expect(bins).toHaveAttribute('href', '/bins')

    const live = screen.getByRole('link', { name: /Live Monitoring/ })
    expect(live).toHaveAttribute('href', '/live')
  })

  it('marks the active item: aria-current=page + white square (bg-white) + brand icon (text-primary)', () => {
    render(<SideNav items={items} />)
    const active = screen.getByRole('listitem', { current: 'page' })

    const square = active.querySelector('[data-active="true"]') as HTMLElement
    expect(square).not.toBeNull()
    // white rounded square with a brand-colored icon
    expect(square.classList.contains('bg-white')).toBe(true)
    expect(square.classList.contains('rounded-sm')).toBe(true)
    expect(square.classList.contains('text-primary')).toBe(true)
  })

  it('renders inactive items as text-white/70 without aria-current', () => {
    render(<SideNav items={items} />)
    const listitems = screen.getAllByRole('listitem')
    const inactive = listitems.find(
      (li) => li.getAttribute('aria-current') !== 'page',
    )!
    expect(inactive).toBeDefined()
    expect(inactive).not.toHaveAttribute('aria-current', 'page')

    // the inner styled square (rounded-sm, 4px radius). Inactive items omit data-active.
    const square = inactive.querySelector('.rounded-sm')! as HTMLElement
    expect(square).not.toBeNull()
    expect(square).not.toHaveAttribute('data-active')
    expect(square.className).toContain('text-white/70')
    // not the active white square: classList tokens (so hover:bg-white/10 and
    // text-white don't false-positive a substring match).
    expect(square.classList.contains('bg-white')).toBe(false)
    expect(square.classList.contains('text-primary')).toBe(false)
  })

  it('renders the logo slot at the top and the footer slot at the bottom', () => {
    render(
      <SideNav
        items={items}
        logo={<span>Logo</span>}
        footer={<button type="button" aria-label="Settings" />}
      />,
    )
    expect(screen.getByText('Logo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Settings/ })).toBeInTheDocument()
  })

  it('honours a custom renderItem bridge while keeping the accessible name', () => {
    render(
      <SideNav
        items={items}
        renderItem={(item, inner) => (
          <button type="button" data-route={item.to}>
            {inner}
          </button>
        )}
      />,
    )
    expect(screen.getByRole('button', { name: /Bins/ })).toHaveAttribute(
      'data-route',
      '/bins',
    )
  })

  it('gives active and inactive items a border-inline-start accent', () => {
    render(<SideNav items={items} />)
    const listitems = screen.getAllByRole('listitem')
    const active = listitems.find((li) => li.getAttribute('aria-current') === 'page')!
    const inactive = listitems.find((li) => li.getAttribute('aria-current') !== 'page')!

    const activeSquare = active.querySelector('.rounded-sm') as HTMLElement
    const inactiveSquare = inactive.querySelector('.rounded-sm') as HTMLElement

    expect(activeSquare.classList.contains('border-s-2')).toBe(true)
    expect(activeSquare.classList.contains('border-primary/60')).toBe(true)
    expect(inactiveSquare.classList.contains('border-s-2')).toBe(true)
    expect(inactiveSquare.classList.contains('border-primary/40')).toBe(true)
  })

  it('renders preItems above the main items, framed by hairline dividers', () => {
    const { container } = render(
      <SideNav
        items={items}
        preItems={[{ label: 'Inbox', to: '/inbox', notificationDot: true, icon: <svg /> }]}
      />,
    )
    const pre = container.querySelector('[data-slot="sidenav-pre-items"]') as HTMLElement
    expect(pre).not.toBeNull()
    // The pinned entry keeps the full rail-item chrome (link + accessible name + dot).
    expect(screen.getByRole('link', { name: /Inbox/ })).toHaveAttribute('href', '/inbox')
    expect(pre.querySelector('[data-slot="sidenav-item-dot"]')).not.toBeNull()
    // Framed by a hairline divider on each side.
    expect(pre.previousElementSibling?.className).toContain('bg-white/20')
    expect(pre.nextElementSibling?.className).toContain('bg-white/20')
    // Rendered before the main items list in DOM order.
    const mainList = screen.getByRole('link', { name: /Bins/ }).closest('ul')!
    expect(pre.compareDocumentPosition(mainList) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders no pre-items strip (and no extra dividers) when preItems is omitted or empty', () => {
    const { container, rerender } = render(<SideNav items={items} />)
    expect(container.querySelector('[data-slot="sidenav-pre-items"]')).toBeNull()
    rerender(<SideNav items={items} preItems={[]} />)
    expect(container.querySelector('[data-slot="sidenav-pre-items"]')).toBeNull()
  })

  it('renders no notification dot by default, and one when item.notificationDot is true', () => {
    const withDot: SideNavItem[] = [
      { label: 'Inbox', to: '/inbox', notificationDot: true, icon: <svg /> },
    ]
    const { rerender } = render(<SideNav items={items} />)
    expect(document.querySelector('[data-slot="sidenav-item-dot"]')).toBeNull()

    rerender(<SideNav items={withDot} />)
    const dot = document.querySelector('[data-slot="sidenav-item-dot"]')
    expect(dot).not.toBeNull()
    expect(dot).toHaveClass('bg-destructive', 'rounded-full')
  })
})

describe('SideNavFooterItem', () => {
  it('renders a 44x44 target painting a 28x28 circle (V11 — the box grows, the chip does not)', () => {
    render(<SideNavFooterItem label="Settings" icon={<svg data-testid="gear" />} />)
    const button = screen.getByRole('button', { name: 'Settings' })
    expect(button.className).toContain('size-11')
    const chip = button.firstElementChild as HTMLElement
    expect(chip.className).toContain('size-7')
    expect(chip.className).toContain('rounded-full')
  })

  it('toggles between the inactive translucent state and the active white state', () => {
    const { rerender } = render(<SideNavFooterItem label="Settings" />)
    const inactive = screen.getByRole('button', { name: 'Settings' }).firstElementChild as HTMLElement
    expect(inactive.classList.contains('bg-white/20')).toBe(true)
    expect(screen.getByRole('button', { name: 'Settings' })).not.toHaveAttribute('aria-current')

    rerender(<SideNavFooterItem label="Settings" active />)
    const active = screen.getByRole('button', { name: 'Settings' }).firstElementChild as HTMLElement
    expect(active.classList.contains('bg-white')).toBe(true)
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
  })

  it('gives every rail item a 44x44 hit-area box while the glyph stays 28x28', () => {
    render(
      <SideNav
        items={[{ label: 'Telematics', to: '/t', icon: <svg /> }]}
      />,
    )
    const link = screen.getByRole('link', { name: 'Telematics' })
    const ring = link.firstElementChild as HTMLElement
    expect(ring.className).toContain('size-11')
    expect((ring.firstElementChild as HTMLElement).className).toContain('size-7')
  })

  it('forwards native button props such as onClick', () => {
    let clicked = false
    render(<SideNavFooterItem label="Help" onClick={() => (clicked = true)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Help' }))
    expect(clicked).toBe(true)
  })

  it('composes into SideNav footer slot alongside the rail tooltip provider', () => {
    render(
      <SideNav
        items={items}
        footer={<SideNavFooterItem label="Settings" icon={<svg />} />}
      />,
    )
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })
})

/**
 * The inline width is a DEFAULT, not a diktat. `SideNav` is public API FAMS
 * Desk consumes; when the rail went inline it silently began beating any width
 * class a consumer passed, which is a hard-to-diagnose consumer break (Phase 7
 * code review, finding 6).
 */
describe('SideNav — width is overridable', () => {
  it('exports its default so a consumer can reserve the same space', () => {
    expect(SIDENAV_RAIL_WIDTH).toBe(51)
  })

  it('accepts a width prop', () => {
    const { container } = render(<SideNav items={items} width={44} />)
    expect(container.querySelector('nav')!.style.width).toBe('44px')
  })

  it('accepts any CSS length', () => {
    const { container } = render(<SideNav items={items} width="3.5rem" />)
    expect(container.querySelector('nav')!.style.width).toBe('3.5rem')
  })

  it('sets NO inline width with width={null}, handing control to a class', () => {
    const { container } = render(<SideNav items={items} width={null} className="w-20" />)
    const nav = container.querySelector('nav')!
    expect(nav.style.width).toBe('')
    expect(nav.className).toContain('w-20')
  })
})

/**
 * Negative logical insets are a recurring pitfall in this codebase: Tailwind's
 * `-end-*` did not flip under `dir="rtl"`, so the notification dot sat on the
 * wrong corner in every module (Phase 7 code review, finding 8).
 */
describe('SideNav — notification dot inset', () => {
  it('pins the dot with an inline logical inset, not a negative -end class', () => {
    const { container } = render(
      <SideNav items={[{ label: 'Alerts', to: '/alerts', notificationDot: true }]} />,
    )
    const dot = container.querySelector('[data-slot="sidenav-item-dot"]') as HTMLElement
    expect(dot.style.insetInlineEnd).toBe('-0.125rem')
    expect(dot.style.top).toBe('-0.125rem')
    expect(dot.className).not.toContain('-end-')
    expect(dot.className).not.toContain('-top-')
  })
})
