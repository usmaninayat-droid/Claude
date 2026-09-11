import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as
// ui-kit's VehicleMarker.test.tsx / a11y.axe.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { AppShell, SideNav, TopNav } from '@fams/ui-kit'
import { ModuleViewShell, type ModuleView } from './ModuleViewShell'

expect.extend({ toHaveNoViolations })

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Assertion<T> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

const axe = configureAxe({
  rules: {
    // jsdom has no layout engine — color-contrast can't be evaluated here.
    'color-contrast': { enabled: false },
    // These tests render the component in isolation, not a full page — same
    // exemption as ui-kit's VehicleMarker.test.tsx / MapContainer.test.tsx.
    region: { enabled: false },
  },
})

/**
 * Radix's Tabs.Trigger activates on `mousedown` (via the roving-focus item),
 * not the synthetic `click` event alone — same helper as
 * `ModuleViewTabs.test.tsx` in `@fams/ui-kit`.
 */
function clickTab(element: HTMLElement) {
  fireEvent.mouseDown(element, { button: 0 })
  fireEvent.click(element)
}

const VIEWS: ModuleView[] = [
  { id: 'list', label: 'List View', type: 'list' },
  { id: 'map', label: 'Map View', type: 'map' },
  { id: 'kanban', label: 'Kanban View', type: 'kanban' },
]

describe('ModuleViewShell', () => {
  it('renders every view as a tab and the active view body via renderView', () => {
    const renderView = vi.fn((view: ModuleView) => <div>Body for {view.label}</div>)
    render(
      <ModuleViewShell
        views={VIEWS}
        activeViewId="list"
        onViewChange={() => {}}
        renderView={renderView}
      />,
    )
    expect(screen.getByRole('tab', { name: 'List View' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Map View' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Kanban View' })).toBeInTheDocument()
    expect(screen.getByText('Body for List View')).toBeInTheDocument()
  })

  it('calls renderView with the active view object, not just its id', () => {
    const renderView = vi.fn(() => null)
    render(
      <ModuleViewShell views={VIEWS} activeViewId="map" onViewChange={() => {}} renderView={renderView} />,
    )
    expect(renderView).toHaveBeenCalledWith(VIEWS[1])
  })

  it('fires onViewChange when a tab is clicked — does not switch itself', () => {
    const onViewChange = vi.fn()
    render(
      <ModuleViewShell
        views={VIEWS}
        activeViewId="list"
        onViewChange={onViewChange}
        renderView={(view) => <div>Body: {view.label}</div>}
      />,
    )
    clickTab(screen.getByRole('tab', { name: 'Kanban View' }))
    expect(onViewChange).toHaveBeenCalledWith('kanban')
    // Controlled: activeViewId prop hasn't changed, so List's body still renders.
    expect(screen.getByText('Body: List View')).toBeInTheDocument()
  })

  it('reflects the active view when the caller updates the controlled prop', () => {
    function Controlled() {
      const [activeViewId, setActiveViewId] = useState('list')
      return (
        <ModuleViewShell
          views={VIEWS}
          activeViewId={activeViewId}
          onViewChange={setActiveViewId}
          renderView={(view) => <div>Body: {view.label}</div>}
        />
      )
    }
    render(<Controlled />)
    clickTab(screen.getByRole('tab', { name: 'Map View' }))
    expect(screen.getByRole('tab', { name: 'Map View' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Body: Map View')).toBeInTheDocument()
  })

  it('omits the add-view control by default and fires onCreateView on click', () => {
    const onCreateView = vi.fn()
    const { rerender } = render(
      <ModuleViewShell
        views={VIEWS}
        activeViewId="list"
        onViewChange={() => {}}
        renderView={() => null}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Add view' })).not.toBeInTheDocument()

    rerender(
      <ModuleViewShell
        views={VIEWS}
        activeViewId="list"
        onViewChange={() => {}}
        onCreateView={onCreateView}
        renderView={() => null}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
    expect(onCreateView).toHaveBeenCalledOnce()
  })

  it('omits the delete-view control by default and fires onDeleteView with the active id on selecting it', () => {
    const onDeleteView = vi.fn()
    const { rerender } = render(
      <ModuleViewShell
        views={VIEWS}
        activeViewId="kanban"
        onViewChange={() => {}}
        renderView={() => null}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Delete view' })).not.toBeInTheDocument()

    rerender(
      <ModuleViewShell
        views={VIEWS}
        activeViewId="kanban"
        onViewChange={() => {}}
        onDeleteView={onDeleteView}
        renderView={() => null}
      />,
    )
    // The DropdownMenuTrigger is a Radix trigger, which opens on pointerdown
    // (unavailable in jsdom) or Enter/Space/ArrowDown keydown — same
    // workaround as ui-kit's ViewTabs.test.tsx / DropdownMenu.test.tsx.
    fireEvent.keyDown(screen.getByRole('button', { name: 'Delete view' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete view' }))
    expect(onDeleteView).toHaveBeenCalledWith('kanban')
  })

  it('supports custom create/delete labels for i18n', () => {
    render(
      <ModuleViewShell
        views={VIEWS}
        activeViewId="list"
        onViewChange={() => {}}
        onCreateView={() => {}}
        onDeleteView={() => {}}
        createViewLabel="إضافة عرض"
        deleteViewLabel="حذف العرض"
        renderView={() => null}
      />,
    )
    expect(screen.getByRole('button', { name: 'إضافة عرض' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'حذف العرض' })).toBeInTheDocument()
  })

  it('renders an optional header via PageHeader only when title or actions are given', () => {
    const { rerender } = render(
      <ModuleViewShell views={VIEWS} activeViewId="list" onViewChange={() => {}} renderView={() => null} />,
    )
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()

    rerender(
      <ModuleViewShell
        views={VIEWS}
        activeViewId="list"
        onViewChange={() => {}}
        title="Bin Compliance"
        renderView={() => null}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Bin Compliance' })).toBeInTheDocument()
  })

  it('renders the filters/search slot content without inspecting it', () => {
    render(
      <ModuleViewShell
        views={VIEWS}
        activeViewId="list"
        onViewChange={() => {}}
        search={<input aria-label="Search tickets" />}
        filters={<button type="button">Status: Open</button>}
        renderView={() => null}
      />,
    )
    expect(screen.getByLabelText('Search tickets')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Status: Open' })).toBeInTheDocument()
  })

  it('renders under RTL (dir=rtl) without error', () => {
    const { container } = render(
      <div dir="rtl">
        <ModuleViewShell
          views={VIEWS}
          activeViewId="list"
          onViewChange={() => {}}
          onCreateView={() => {}}
          onDeleteView={() => {}}
          renderView={(view) => <div>{view.label}</div>}
        />
      </div>,
    )
    expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'List View' })).toBeInTheDocument()
  })

  /*
   * Under an `AppShell` the app already renders the one top bar. This shell must
   * fill it rather than render a second one — the stacked-bars defect (a
   * title-only bar above a separate tabs bar) is exactly what these pin.
   */
  describe('hosted inside an AppShell', () => {
    function hosted(title?: string) {
      return render(
        <AppShell sidebar={<SideNav items={[]} />} topNav={<TopNav brand="Tickets" />}>
          <ModuleViewShell
            views={VIEWS}
            activeViewId="list"
            onViewChange={() => {}}
            onCreateView={() => {}}
            onDeleteView={() => {}}
            title={title}
            renderView={(view) => <div>Body: {view.label}</div>}
          />
        </AppShell>,
      )
    }

    it('renders exactly ONE top bar, not a second one below the shell’s', () => {
      hosted()
      expect(document.querySelectorAll('[data-slot="top-nav"]')).toHaveLength(1)
    })

    it('puts its tab strip and its per-tab view menu inside that one bar, next to the app-owned title', () => {
      hosted()
      const bar = document.querySelector('[data-slot="top-nav"]')!
      expect(bar).toHaveTextContent('Tickets')
      expect(bar.querySelector('[data-slot="module-view-tabs"]')).toBeInTheDocument()
      // The `⋮` rides the ACTIVE TAB (figma live-monitoring §2.1/495:45132),
      // not the bar's far-end actions region where it used to sit.
      expect(
        bar
          .querySelector('[data-slot="module-view-tab-actions"]')
          ?.contains(screen.getByRole('button', { name: 'Delete view' })),
      ).toBe(true)
    })

    it('does not render its own title when hosted — the app shell owns it (one h1 per page)', () => {
      hosted('Bin Compliance')
      expect(screen.queryByRole('heading', { name: 'Bin Compliance' })).not.toBeInTheDocument()
    })

    it('still renders the body and the toolbar row it owns', () => {
      hosted()
      expect(screen.getByText('Body: List View')).toBeInTheDocument()
    })

    it('renders its own bar when NOT hosted (standalone / showcase path)', () => {
      render(
        <ModuleViewShell
          views={VIEWS}
          activeViewId="list"
          onViewChange={() => {}}
          title="Bin Compliance"
          renderView={(view) => <div>Body: {view.label}</div>}
        />,
      )
      expect(document.querySelectorAll('[data-slot="top-nav"]')).toHaveLength(1)
      expect(screen.getByRole('heading', { name: 'Bin Compliance' })).toBeInTheDocument()
    })
  })

  it('has no axe violations', async () => {
    render(
      <ModuleViewShell
        views={VIEWS}
        activeViewId="list"
        onViewChange={() => {}}
        onCreateView={() => {}}
        onDeleteView={() => {}}
        title="Bin Compliance"
        renderView={(view) => <div>Body: {view.label}</div>}
      />,
    )
    const results = await axe(document.body)
    expect(results).toHaveNoViolations()
  })

  /*
   * Round-4 finding F4 — the hover `x` was gated on the ACTIVE view's
   * deletability, so with an undeletable view active no tab ever offered one,
   * and with a deletable one active the `x` appeared on tabs that could not be
   * deleted. Deletability belongs to the HOVERED tab.
   */
  describe('per-tab deletability (F4)', () => {
    const hoverTab = (name: string) =>
      fireEvent.pointerOver(screen.getByRole('tab', { name }), { bubbles: true })

    const shell = (canDeleteView?: (id: string) => boolean) =>
      render(
        <ModuleViewShell
          views={VIEWS}
          activeViewId="list"
          onViewChange={() => {}}
          onDeleteView={() => {}}
          canDeleteView={canDeleteView}
          renderView={() => <div />}
        />,
      )

    it('offers the x on a hovered DELETABLE tab even when the active view is not deletable', () => {
      shell((id) => id === 'kanban')
      hoverTab('Kanban View')
      expect(document.querySelector('[data-slot="module-view-tab-close"]')).not.toBeNull()
    })

    it('withholds the x on a hovered UNDELETABLE tab even when the active view is deletable', () => {
      shell((id) => id === 'list')
      hoverTab('Map View')
      expect(document.querySelector('[data-slot="module-view-tab-close"]')).toBeNull()
    })

    it('defaults to every tab deletable, so callers that omit the predicate are unchanged', () => {
      shell()
      hoverTab('Map View')
      expect(document.querySelector('[data-slot="module-view-tab-close"]')).not.toBeNull()
    })
  })
})
