import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { ModuleViewShell, type ModuleViewMenuItem } from './ModuleViewShell'

/**
 * The shell's generic view-menu + tab-decoration model (figma live-monitoring
 * SPEC §2.1/§2.9, 495:45132·48122·51049·53979). Generic on purpose: this is
 * shell behaviour every module gets, not a live-monitoring special case.
 */

const MENU: ModuleViewMenuItem[] = [{ id: 'x', label: 'Customize View', onSelect: () => {} }]

const views = [
  { id: 'a', label: 'Hybrid View', type: 'hybrid' as const },
  { id: 'b', label: 'List View', type: 'list' as const },
]

function Shell({
  viewMenuItems,
  pinned = false,
  locked = false,
  onEditView,
  onDeleteView,
}: {
  viewMenuItems?: ModuleViewMenuItem[]
  pinned?: boolean
  locked?: boolean
  onEditView?: (id: string) => void
  onDeleteView?: (id: string) => void
}) {
  return (
    <ModuleViewShell
      views={[views[0], { ...views[1], pinned, locked }]}
      activeViewId="a"
      onViewChange={() => {}}
      viewMenuItems={viewMenuItems}
      onEditView={onEditView}
      onDeleteView={onDeleteView}
      renderView={(view) => <div>Body {view.id}</div>}
    />
  )
}

describe('ModuleViewShell — the active tab’s ⋮ menu', () => {
  const openMenu = () => fireEvent.keyDown(screen.getByRole('button', { name: 'View options' }), { key: 'Enter' })

  it('anchors the ⋮ on the ACTIVE TAB, not the bar’s far-end actions region', () => {
    render(<Shell viewMenuItems={[{ id: 'x', label: 'Customize View', onSelect: () => {} }]} />)
    const actions = document.querySelector('[data-slot="module-view-tab-actions"]')!
    expect(actions.getAttribute('data-tab-id')).toBe('a')
    expect(actions.contains(screen.getByRole('button', { name: 'View options' }))).toBe(true)
  })

  it('renders items, separators, toggles and submenus from one generic model', () => {
    const onCheckedChange = vi.fn()
    const onValueChange = vi.fn()
    render(
      <Shell
        viewMenuItems={[
          { id: 'rename', label: 'Rename', onSelect: () => {} },
          { kind: 'separator', id: 's1' },
          { kind: 'toggle', id: 'protect', label: 'Protect View', checked: false, onCheckedChange },
          {
            kind: 'submenu',
            id: 'pin',
            label: 'Pin View',
            value: 'off',
            options: [
              { value: 'off', label: 'None' },
              { value: 'for-all', label: 'For All' },
            ],
            onValueChange,
          },
        ]}
      />,
    )
    openMenu()
    expect(screen.getByRole('menuitem', { name: 'Rename' })).toBeInTheDocument()
    expect(screen.getByRole('separator')).toBeInTheDocument()
    expect(screen.getByRole('menuitemcheckbox', { name: 'Protect View' })).toBeInTheDocument()
    // The submenu row carries its current value as a trailing summary ("None ›").
    expect(screen.getByRole('menuitem', { name: 'Pin View' })).toHaveTextContent('None')
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Protect View' }))
    expect(onCheckedChange).toHaveBeenCalledWith(true, 'a')
  })

  /*
   * Round-2 additions, all generic shell behaviour rather than live-monitoring
   * specials: SPEC §2.9's row anatomy (a 16px lead glyph on EVERY row, a
   * switch on the toggle rows), rows that stay in the set but go inert with a
   * reason, and a row that keeps the menu open so an in-place confirmation is
   * actually observable (interaction 2e).
   */
  it('reserves a lead-glyph gutter on every row and renders the supplied icon', () => {
    render(
      <Shell
        viewMenuItems={[
          { id: 'rename', label: 'Rename', icon: <svg data-testid="rename-glyph" />, onSelect: () => {} },
          { kind: 'toggle', id: 'private', label: 'Private View', icon: <svg data-testid="private-glyph" />, checked: true, onCheckedChange: () => {} },
        ]}
      />,
    )
    openMenu()
    expect(screen.getByTestId('rename-glyph')).toBeInTheDocument()
    expect(screen.getByTestId('private-glyph')).toBeInTheDocument()
  })

  it('renders a toggle row as a SWITCH, so an OFF row is not mistaken for a plain item', () => {
    render(
      <Shell
        viewMenuItems={[
          { kind: 'toggle', id: 'private', label: 'Private View', checked: false, onCheckedChange: () => {} },
        ]}
      />,
    )
    openMenu()
    const row = screen.getByRole('menuitemcheckbox', { name: 'Private View' })
    expect(row.querySelector('[data-slot="dropdown-menu-checkbox-switch"]')?.getAttribute('data-state')).toBe(
      'unchecked',
    )
  })

  it('keeps an inapplicable row in the set, inert, carrying its reason', () => {
    const onSelect = vi.fn()
    render(
      <Shell
        viewMenuItems={[
          { id: 'customize', label: 'Customize View', disabled: true, disabledReason: 'Not on this view kind', onSelect },
        ]}
      />,
    )
    openMenu()
    const row = screen.getByRole('menuitem', { name: 'Customize View' })
    expect(row.getAttribute('data-disabled')).not.toBeNull()
    expect(row).toHaveAttribute('title', 'Not on this view kind')
    // The reason must be REACHABLE — a `pointer-events-none` row never shows
    // its own tooltip.
    expect(row).toHaveClass('data-[disabled]:pointer-events-auto')
    fireEvent.click(row)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('keeps the menu OPEN for a row that reports in place (closeOnSelect: false)', () => {
    const onSelect = vi.fn()
    render(
      <Shell viewMenuItems={[{ id: 'copy', label: 'Copy Link to View', closeOnSelect: false, onSelect }]} />,
    )
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy Link to View' }))
    expect(onSelect).toHaveBeenCalledWith('a')
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('does NOT append its fallback Delete row over a caller-supplied row set', () => {
    render(<Shell onDeleteView={() => {}} viewMenuItems={[{ id: 'del', label: 'Delete View', onSelect: () => {} }]} />)
    openMenu()
    expect(screen.getAllByRole('menuitem', { name: /Delete/ })).toHaveLength(1)
  })

  it('still appends Delete for a caller that supplies no menu model at all', () => {
    render(<Shell onDeleteView={() => {}} />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Delete view' }), { key: 'Enter' })
    expect(screen.getByRole('menuitem', { name: 'Delete view' })).toBeInTheDocument()
  })

  it('hangs the menu off the trigger’s START edge, over the map (visual #27)', () => {
    render(<Shell viewMenuItems={MENU} />)
    openMenu()
    expect(screen.getByRole('menu').getAttribute('data-align')).toBe('start')
  })

  it('clamps the menu away from the viewport edge (UX finding 13)', () => {
    render(<Shell viewMenuItems={[{ id: 'x', label: 'Customize View', onSelect: () => {} }]} />)
    openMenu()
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })
})

describe('ModuleViewShell — tab decorations', () => {
  it('renders a lock glyph on a protected view (495:53979)', () => {
    render(<Shell locked onDeleteView={() => {}} />)
    expect(document.querySelector('[data-slot="module-view-tab-lock"]')).not.toBeNull()
  })

  it('renders a pin glyph AND floats a pinned view to the front (495:51049)', () => {
    render(<Shell pinned onDeleteView={() => {}} />)
    expect(document.querySelector('[data-slot="module-view-tab-pin"]')).not.toBeNull()
    const tabs = [...document.querySelectorAll('[data-slot="module-view-tab"]')].map((t) => t.textContent)
    expect(tabs[0]).toContain('List View')
  })

  it('reveals the per-tab pencil + ✕ hover actions on the HOVERED tab (SPEC §2.1)', () => {
    const onEditView = vi.fn()
    render(<Shell onEditView={onEditView} onDeleteView={() => {}} />)
    // Tab 1 is `b` — NOT the active view, so it is the hover pair's owner.
    fireEvent.pointerOver(document.querySelectorAll('[data-slot="module-view-tab"]')[1])
    fireEvent.click(screen.getByRole('button', { name: 'Rename view' }))
    expect(onEditView).toHaveBeenCalledWith('b')
    expect(screen.getByRole('button', { name: 'Remove view' })).toBeInTheDocument()
    // …and it rides the tab actually under the pointer, not the active one.
    const hovered = screen.getByRole('button', { name: 'Rename view' }).closest('[data-slot="module-view-tab-actions"]')
    expect(hovered?.getAttribute('data-tab-id')).toBe('b')
  })

  /*
   * REGRESSION (this run's dead-control defect): the tab controls used to be a
   * SINGLE overlay parked over `hoverTabId ?? activeViewId`, so hovering any
   * other tab moved it — unmounting `View options` entirely and leaving the
   * whole SPEC §2.9 menu unreachable until the pointer left the strip.
   */
  it('keeps the ACTIVE tab’s ⋮ mounted while another tab is hovered', () => {
    render(<Shell onEditView={() => {}} onDeleteView={() => {}} viewMenuItems={MENU} />)
    fireEvent.pointerOver(document.querySelectorAll('[data-slot="module-view-tab"]')[1])
    const menuButton = screen.getByRole('button', { name: 'View options' })
    expect(menuButton).toBeInTheDocument()
    expect(menuButton.closest('[data-slot="module-view-tab-actions"]')?.getAttribute('data-tab-id')).toBe('a')
    // Both targets are expressed at once — one overlay per target.
    expect(screen.getByRole('button', { name: 'Rename view' })).toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="module-view-tab-actions"]')).toHaveLength(2)
  })

  /*
   * Round-2 visual #13: every tab reserved the 20px ⋮ slot, so the strip
   * measured 135/116/123px against Figma's 110/92/98. Only the ACTIVE tab
   * carries a persistent control, so only it reserves room for one.
   */
  it('reserves the ⋮ gutter on the ACTIVE tab only', () => {
    render(<Shell viewMenuItems={MENU} onEditView={() => {}} onDeleteView={() => {}} />)
    const gutters = document.querySelectorAll('[data-slot="module-view-tab-gutter"]')
    expect(gutters).toHaveLength(1)
    expect(gutters[0].closest('[data-slot="module-view-tab"]')?.getAttribute('data-state')).toBe('active')
  })

  it('backs the hovered INACTIVE tab’s action pair with an opaque plate', () => {
    render(<Shell viewMenuItems={MENU} onEditView={() => {}} onDeleteView={() => {}} />)
    fireEvent.pointerOver(document.querySelectorAll('[data-slot="module-view-tab"]')[1])
    const overlay = screen
      .getByRole('button', { name: 'Rename view' })
      .closest('[data-slot="module-view-tab-actions"]')!
    expect(overlay).toHaveClass('bg-card')
  })

  it('shows the ⋮ ALONE when the ACTIVE tab itself is hovered (495:45132)', () => {
    render(<Shell onEditView={() => {}} onDeleteView={() => {}} viewMenuItems={MENU} />)
    fireEvent.pointerOver(document.querySelectorAll('[data-slot="module-view-tab"]')[0])
    expect(screen.getByRole('button', { name: 'View options' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rename view' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove view' })).not.toBeInTheDocument()
  })

  /* KNOWN PITFALL: load-bearing geometry must never ride a Tailwind class the
     consuming app's build may not emit (negative logical insets and arbitrary
     sizes have both silently no-opped this run), and it must be RTL-safe with
     no transform to compensate. */
  it('pins each overlay with INLINE logical geometry and no transform', () => {
    render(<Shell viewMenuItems={MENU} onEditView={() => {}} />)
    const overlay = document.querySelector<HTMLElement>('[data-slot="module-view-tab-actions"]')!
    expect(overlay.style.insetInlineEnd).not.toBe('')
    expect(overlay.style.top).not.toBe('')
    expect(overlay.style.height).not.toBe('')
    expect(overlay.style.transform).toBe('')
  })

  it('moves the ⋮ to the NEW active tab when the view switches', () => {
    function Switching() {
      const [active, setActive] = useState('a')
      return (
        <ModuleViewShell
          views={views}
          activeViewId={active}
          onViewChange={setActive}
          viewMenuItems={MENU}
          onEditView={() => {}}
          onDeleteView={() => {}}
          renderView={(view) => <div>Body {view.id}</div>}
        />
      )
    }
    render(<Switching />)
    expect(
      screen.getByRole('button', { name: 'View options' }).closest('[data-slot="module-view-tab-actions"]')
        ?.getAttribute('data-tab-id'),
    ).toBe('a')
    // Radix's Tabs.Trigger activates on `mousedown`, not the synthetic click.
    const tab = document.querySelectorAll('[data-slot="module-view-tab"]')[1]
    fireEvent.mouseDown(tab, { button: 0 })
    fireEvent.click(tab)
    expect(
      screen.getByRole('button', { name: 'View options' }).closest('[data-slot="module-view-tab-actions"]')
        ?.getAttribute('data-tab-id'),
    ).toBe('b')
  })
})

/**
 * The tab-overlay measurement used to run from a `useLayoutEffect` with NO
 * dependency array — a DOM read + `setState` on EVERY render, held back only
 * by a value-equality bail-out. That is the same shape as the "Maximum update
 * depth exceeded" bug this cycle already spent a wave on; it was safe only
 * because nothing above this component happens to re-render per animation
 * frame (Phase 7 code review, finding 10). It is now keyed on what can
 * actually move a tab, with a `ResizeObserver` covering the layout-only cases.
 */
describe('ModuleViewShell — tab measurement is not per-render', () => {
  it('does not re-measure when an unrelated parent re-render happens', () => {
    const measured: Element[] = []
    const realGetRect = Element.prototype.getBoundingClientRect
    function Host() {
      const [tick, setTick] = useState(0)
      return (
        <div>
          <button type="button" onClick={() => setTick((t) => t + 1)}>
            bump {tick}
          </button>
          <Shell viewMenuItems={MENU} />
        </div>
      )
    }
    render(<Host />)
    // Start counting only AFTER the initial mount measurement.
    const spy = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: Element) {
        measured.push(this)
        return realGetRect.call(this)
      })
    fireEvent.click(screen.getByRole('button', { name: /bump/ }))
    fireEvent.click(screen.getByRole('button', { name: /bump/ }))
    fireEvent.click(screen.getByRole('button', { name: /bump/ }))
    const stripReads = measured.filter(
      (el) => el.getAttribute?.('data-slot') === 'module-view-tab-strip',
    )
    expect(stripReads).toHaveLength(0)
    spy.mockRestore()
  })

  it('observes the strip so a layout-only change still re-measures', () => {
    const observed: Element[] = []
    let fire: (() => void) | undefined
    class FakeResizeObserver {
      constructor(cb: () => void) {
        fire = cb
      }
      observe(el: Element) {
        observed.push(el)
      }
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    render(<Shell viewMenuItems={MENU} />)
    expect(
      observed.some((el) => el.getAttribute?.('data-slot') === 'module-view-tab-strip'),
    ).toBe(true)
    // A font finishing loading or a sibling growing moves a tab with no React
    // render at all — the observer is what catches that by construction.
    expect(typeof fire).toBe('function')
    vi.unstubAllGlobals()
  })
})

