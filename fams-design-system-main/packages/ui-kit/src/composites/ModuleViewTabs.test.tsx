import { createRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { List, Map as MapIcon } from '../icons'
import { ModuleViewTabs, type ModuleViewTab } from './ModuleViewTabs'

const VIEWS: ModuleViewTab[] = [
  { id: 'hybrid', label: 'Hybrid View' },
  { id: 'list', label: 'List View', icon: List },
  { id: 'map', label: 'Map View', icon: MapIcon },
]

/**
 * Radix's Tabs.Trigger activates on `mousedown` (via the roving-focus item),
 * not on the synthetic `click` event — `fireEvent.click` alone never fires
 * it. Mirror a real pointer interaction: mousedown then click.
 */
function clickTab(element: HTMLElement) {
  fireEvent.mouseDown(element, { button: 0 })
  fireEvent.click(element)
}

describe('ModuleViewTabs', () => {
  it('renders every view label as a tab', () => {
    render(<ModuleViewTabs views={VIEWS} active="hybrid" onSelect={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Hybrid View' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'List View' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Map View' })).toBeInTheDocument()
  })

  it('renders a `disabled` tab as inert — no onSelect on click, and disabled attribute present', () => {
    const onSelect = vi.fn()
    render(
      <ModuleViewTabs
        views={[...VIEWS, { id: 'calendar', label: 'Calendar', disabled: true }]}
        active="list"
        onSelect={onSelect}
      />,
    )
    const calendarTab = screen.getByRole('tab', { name: 'Calendar' })
    expect(calendarTab).toBeDisabled()
    clickTab(calendarTab)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('marks the active view via aria-selected', () => {
    render(<ModuleViewTabs views={VIEWS} active="list" onSelect={() => {}} />)
    expect(screen.getByRole('tab', { name: 'List View' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Hybrid View' })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onSelect with the clicked view id (controlled — does not switch itself)', () => {
    const onSelect = vi.fn()
    render(<ModuleViewTabs views={VIEWS} active="hybrid" onSelect={onSelect} />)
    clickTab(screen.getByRole('tab', { name: 'Map View' }))
    expect(onSelect).toHaveBeenCalledWith('map')
    expect(screen.getByRole('tab', { name: 'Hybrid View' })).toHaveAttribute('aria-selected', 'true')
  })

  it('reflects the active view when the caller updates the controlled prop', () => {
    function Controlled() {
      const [active, setActive] = useState('hybrid')
      return <ModuleViewTabs views={VIEWS} active={active} onSelect={setActive} />
    }
    render(<Controlled />)
    clickTab(screen.getByRole('tab', { name: 'Map View' }))
    expect(screen.getByRole('tab', { name: 'Map View' })).toHaveAttribute('aria-selected', 'true')
  })

  it('renders an optional leading icon per view', () => {
    const { container } = render(<ModuleViewTabs views={VIEWS} active="hybrid" onSelect={() => {}} />)
    const listTab = screen.getByRole('tab', { name: 'List View' })
    expect(listTab.querySelector('svg')).toBeInTheDocument()
    const hybridTab = screen.getByRole('tab', { name: 'Hybrid View' })
    expect(hybridTab.querySelector('svg')).not.toBeInTheDocument()
    expect(container).toBeInTheDocument()
  })

  it('gives the active pill tab a secondary background and accents its icon brand-blue, leaving inactive icons muted', () => {
    render(<ModuleViewTabs views={VIEWS} active="list" onSelect={() => {}} />)
    const activeTab = screen.getByRole('tab', { name: 'List View' })
    expect(activeTab).toHaveClass('data-[state=active]:bg-secondary')
    expect(activeTab.querySelector('svg')).toHaveClass('text-primary')

    const inactiveTab = screen.getByRole('tab', { name: 'Map View' })
    expect(inactiveTab.querySelector('svg')).toHaveClass('text-muted-foreground')
    expect(inactiveTab.querySelector('svg')).not.toHaveClass('text-primary')
  })

  it('omits the add-view button by default and shows it with onAddView, firing the callback on click', () => {
    const onAddView = vi.fn()
    const { rerender } = render(<ModuleViewTabs views={VIEWS} active="hybrid" onSelect={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Add view' })).not.toBeInTheDocument()

    rerender(<ModuleViewTabs views={VIEWS} active="hybrid" onSelect={() => {}} onAddView={onAddView} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
    expect(onAddView).toHaveBeenCalledOnce()
  })

  it('supports a custom add-view label for i18n', () => {
    render(
      <ModuleViewTabs views={VIEWS} active="hybrid" onSelect={() => {}} onAddView={() => {}} addViewLabel="إضافة عرض" />,
    )
    expect(screen.getByRole('button', { name: 'إضافة عرض' })).toBeInTheDocument()
  })

  it('applies the pill variant by default and switches to segment when requested', () => {
    const { rerender } = render(<ModuleViewTabs views={VIEWS} active="hybrid" onSelect={() => {}} />)
    expect(screen.getByRole('tablist')).toHaveClass('rounded-md')

    rerender(<ModuleViewTabs views={VIEWS} active="hybrid" onSelect={() => {}} variant="segment" />)
    expect(screen.getByRole('tablist')).toHaveClass('border')
  })

  it('supports keyboard navigation between tabs (arrow key moves focus and activates)', async () => {
    const onSelect = vi.fn()
    render(<ModuleViewTabs views={VIEWS} active="hybrid" onSelect={onSelect} />)
    const hybridTab = screen.getByRole('tab', { name: 'Hybrid View' })
    hybridTab.focus()
    fireEvent.keyDown(hybridTab, { key: 'ArrowRight' })
    // The roving-focus group moves focus via a queued `setTimeout`, and
    // automatic tab activation fires from the resulting `focus` event —
    // both happen a tick after the keydown, so wait for it.
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('list'))
  })

  it('gives the tab list an accessible name, defaulting to "Module views"', () => {
    render(<ModuleViewTabs views={VIEWS} active="hybrid" onSelect={() => {}} />)
    expect(screen.getByRole('tablist', { name: 'Module views' })).toBeInTheDocument()
  })

  it('lets the caller override the tab list accessible name', () => {
    render(<ModuleViewTabs views={VIEWS} active="hybrid" onSelect={() => {}} aria-label="Smart Planning views" />)
    expect(screen.getByRole('tablist', { name: 'Smart Planning views' })).toBeInTheDocument()
  })

  it('forwards the ref to the root element', () => {
    const ref = createRef<HTMLDivElement>()
    render(<ModuleViewTabs ref={ref} views={VIEWS} active="hybrid" onSelect={() => {}} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  /*
   * The `navbar` variant is the Figma "Top Navbar" anatomy (node 6995:419) —
   * these assertions pin the parts of that spec a screenshot diff can miss and
   * the parts that exist for accessibility rather than for looks.
   */
  describe('navbar variant (Figma node 6995:419)', () => {
    it('tints every view icon brand-blue, active or not', () => {
      render(<ModuleViewTabs variant="navbar" views={VIEWS} active="list" onSelect={() => {}} />)
      // `List` is the active tab's glyph, `MapIcon` an inactive one — Figma
      // pixel-samples `#0072d6` on BOTH, so neither may be muted.
      for (const name of ['List View', 'Map View']) {
        const glyph = screen.getByRole('tab', { name }).querySelector('svg')
        expect(glyph).toHaveClass('text-primary')
        expect(glyph).not.toHaveClass('text-muted-foreground')
      }
    })

    it('keeps the active-only icon tint on the compact variants', () => {
      render(<ModuleViewTabs views={VIEWS} active="list" onSelect={() => {}} />)
      expect(screen.getByRole('tab', { name: 'List View' }).querySelector('svg')).toHaveClass('text-primary')
      expect(screen.getByRole('tab', { name: 'Map View' }).querySelector('svg')).toHaveClass(
        'text-muted-foreground',
      )
    })

    it('gives the active tab a non-colour state cue beyond its fill (WCAG 1.4.1/1.4.11)', () => {
      render(<ModuleViewTabs variant="navbar" views={VIEWS} active="list" onSelect={() => {}} />)
      const active = screen.getByRole('tab', { name: 'List View' })
      const inactive = screen.getByRole('tab', { name: 'Map View' })
      // The inset underline is state-scoped, so both tabs carry the class and
      // only the active one has `data-state="active"` for it to apply to.
      expect(active).toHaveAttribute('data-state', 'active')
      expect(inactive).toHaveAttribute('data-state', 'inactive')
      expect(active.className).toContain('data-[state=active]:shadow-[inset_0_-2px_0_0_var(--color-primary)]')
    })

    it('makes the tab strip itself the horizontal scroll container and never crushes a tab', () => {
      render(<ModuleViewTabs variant="navbar" views={VIEWS} active="list" onSelect={() => {}} />)
      const strip = screen.getByRole('tablist')
      // The strip scrolls (SPEC I6) …
      expect(strip).toHaveClass('overflow-x-auto')
      expect(strip).toHaveClass('min-w-0')
      // … and each tab holds its natural width rather than being squeezed.
      for (const tab of screen.getAllByRole('tab')) {
        expect(tab).toHaveClass('shrink-0')
      }
    })

    it('uses inset focus rings so no indicator clips inside the 48px bar', () => {
      render(
        <ModuleViewTabs variant="navbar" views={VIEWS} active="list" onSelect={() => {}} onAddView={() => {}} />,
      )
      expect(screen.getByRole('tab', { name: 'List View' })).toHaveClass('focus-visible:ring-inset')
      expect(screen.getByRole('button', { name: 'Add view' })).toHaveClass('focus-visible:ring-inset')
    })

    it('gives the bare "+" a real hover/focus tooltip as well as an accessible name', () => {
      render(
        <ModuleViewTabs
          variant="navbar"
          views={VIEWS}
          active="list"
          onSelect={() => {}}
          onAddView={() => {}}
          addViewLabel="Add view"
        />,
      )
      const add = screen.getByRole('button', { name: 'Add view' })
      // A REAL tooltip now, not `title=`: `IconControl` wires a Radix tooltip
      // that opens on keyboard focus too, which `title` never does (UX K.67).
      // The trigger is identified by `aria-describedby`, and the copy appears
      // on focus.
      expect(add).not.toHaveAttribute('title')
      fireEvent.focus(add)
      expect(screen.getAllByText('Add view').length).toBeGreaterThan(0)
      // 48×48 per Figma, which also clears the 44×44 touch-target floor.
      expect(add).toHaveClass('w-12')
    })

    it('renders a disabled view as inert without removing it from the strip', () => {
      const onSelect = vi.fn()
      render(
        <ModuleViewTabs
          variant="navbar"
          views={[...VIEWS, { id: 'calendar', label: 'Calendar', disabled: true }]}
          active="list"
          onSelect={onSelect}
        />,
      )
      const calendar = screen.getByRole('tab', { name: 'Calendar' })
      expect(calendar).toBeDisabled()
      clickTab(calendar)
      expect(onSelect).not.toHaveBeenCalled()
    })
  })
})
