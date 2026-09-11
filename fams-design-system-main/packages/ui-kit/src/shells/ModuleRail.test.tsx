import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MODULE_RAIL_COMPACT_WIDTH, ModuleRail, type ModuleRailItem, type ModuleRailSection } from './ModuleRail'

const items: ModuleRailItem[] = [
  { label: 'Overview', to: '/overview', active: true, icon: <svg data-testid="overview-icon" /> },
  { label: 'Reports', to: '/reports', icon: <svg data-testid="reports-icon" /> },
]

const sections: ModuleRailSection[] = [
  {
    label: 'Platform Settings',
    items: [
      { label: 'Users', to: '/settings/users', active: true },
      { label: 'Roles', to: '/settings/roles' },
    ],
  },
  {
    label: 'My Settings',
    items: [{ label: 'Profile', to: '/settings/profile' }],
  },
]

describe('ModuleRail', () => {
  it('renders a compact icon-only rail by default with tooltip-only labels', () => {
    render(<ModuleRail items={items} />)
    const nav = screen.getByRole('navigation', { name: 'Module' })
    // 67px inline (⚠ was the `w-15` class / 60px — round-1 visual #39).
    expect(nav.style.width).toBe('67px')
    expect(screen.getByRole('link', { name: /Overview/ })).toHaveAttribute('href', '/overview')
  })

  it('renders the expanded flat item list unchanged when no sections are given', () => {
    render(<ModuleRail items={items} compact={false} title="Live Monitoring" />)
    expect(screen.getByText('Live Monitoring')).toBeInTheDocument()
    const overview = screen.getByRole('link', { name: 'Overview' })
    expect(overview).toHaveAttribute('href', '/overview')
    // no section grouping wrapper present
    expect(document.querySelector('[data-slot="module-rail-sections"]')).toBeNull()
  })

  it('marks the active flat item with aria-current + bg-primary treatment', () => {
    render(<ModuleRail items={items} compact={false} />)
    const active = screen.getByRole('listitem', { current: 'page' })
    const square = active.querySelector('[data-active="true"]') as HTMLElement
    expect(square).not.toBeNull()
    expect(square.classList.contains('bg-primary')).toBe(true)
  })

  it("an active item's badge is solid white/text-primary, not a translucent wash (fix7, P1-3: was #338ede, 3.45:1)", () => {
    render(
      <ModuleRail
        items={[{ label: 'Overview', to: '/overview', active: true, badge: 3 }]}
        compact={false}
      />,
    )
    const badge = screen.getByText('3')
    expect(badge).toHaveClass('bg-white', 'text-primary')
    expect(badge).not.toHaveClass('bg-white/20', 'text-primary-foreground')
  })

  it('renders grouped sections in expanded mode with their headers', () => {
    render(<ModuleRail sections={sections} compact={false} />)
    expect(screen.getByText('Platform Settings')).toBeInTheDocument()
    expect(screen.getByText('My Settings')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/settings/users')
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/settings/profile')
    expect(document.querySelector('[data-slot="module-rail-sections"]')).not.toBeNull()
  })

  it('marks the active item inside a section the same way as the flat list', () => {
    render(<ModuleRail sections={sections} compact={false} />)
    const active = screen.getByRole('listitem', { current: 'page' })
    const square = active.querySelector('[data-active="true"]') as HTMLElement
    expect(square.classList.contains('bg-primary')).toBe(true)
    expect(square.textContent).toContain('Users')
  })

  it('falls back to the flat items list in compact mode even if sections are passed', () => {
    render(<ModuleRail items={items} sections={sections} compact />)
    expect(screen.queryByText('Platform Settings')).toBeNull()
    expect(screen.getByRole('link', { name: /Overview/ })).toBeInTheDocument()
  })

  it('falls back to the flat items list in stacked mode even if sections are passed', () => {
    render(<ModuleRail items={items} sections={sections} stacked />)
    expect(screen.queryByText('Platform Settings')).toBeNull()
    expect(screen.getByRole('link', { name: /Overview/ })).toBeInTheDocument()
  })

  it('renders stacked icon-over-label tiles', () => {
    const { container } = render(<ModuleRail items={items} stacked />)
    const nav = container.querySelector('nav')!
    expect(nav.className).toContain('w-[72px]')
  })

  it('honours a custom renderItem bridge in the flat list', () => {
    render(
      <ModuleRail
        items={items}
        compact={false}
        renderItem={(item, inner) => (
          <button type="button" data-route={item.to}>
            {inner}
          </button>
        )}
      />,
    )
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute(
      'data-route',
      '/overview',
    )
  })

  it('honours a custom renderItem bridge inside sections', () => {
    render(
      <ModuleRail
        sections={sections}
        compact={false}
        renderItem={(item, inner) => (
          <button type="button" data-route={item.to}>
            {inner}
          </button>
        )}
      />,
    )
    expect(screen.getByRole('button', { name: 'Users' })).toHaveAttribute(
      'data-route',
      '/settings/users',
    )
  })
})

/**
 * Same contract as `SideNav`: the inline compact width is a default a consumer
 * can still override (Phase 7 code review, finding 6).
 */
describe('ModuleRail — width is overridable', () => {
  it('exports its default so a consumer can reserve the same space', () => {
    expect(MODULE_RAIL_COMPACT_WIDTH).toBe(67)
  })

  it('applies the default inline in compact mode', () => {
    const { container } = render(<ModuleRail items={items} />)
    expect(container.querySelector('nav')!.style.width).toBe('67px')
  })

  it('accepts a width prop', () => {
    const { container } = render(<ModuleRail items={items} width={60} />)
    expect(container.querySelector('nav')!.style.width).toBe('60px')
  })

  it('sets NO inline width with width={null}, handing control to a class', () => {
    const { container } = render(<ModuleRail items={items} width={null} className="w-16" />)
    const nav = container.querySelector('nav')!
    expect(nav.style.width).toBe('')
    expect(nav.className).toContain('w-16')
  })

  it('never applies it in expanded mode, which keeps its token step', () => {
    const { container } = render(<ModuleRail items={items} compact={false} />)
    const nav = container.querySelector('nav')!
    expect(nav.style.width).toBe('')
    expect(nav.className).toContain('w-56')
  })
})
