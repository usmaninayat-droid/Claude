import { describe, expect, it } from 'vitest'
import { useEffect } from 'react'
import { render, screen } from '@testing-library/react'
import { AppShell } from './AppShell'
import { TopNav } from './TopNav'
import { SideNav } from './SideNav'
import { TopNavSlotPortal, useTopNavSlots } from './top-nav-slot'

/**
 * These tests pin the contract that keeps the app to ONE top bar. The bug they
 * exist to prevent shipped twice: a page rendering its own `TopNav` under the
 * shell's, giving a title bar stacked above a separate tabs bar where the
 * design has a single bar holding both.
 */

/** A page that fills the host bar when hosted, and renders its own when not. */
function PageWithTabs({ label = 'Tabs' }: { label?: string }) {
  const hosted = useTopNavSlots() !== null
  const tabs = <button type="button">{label}</button>
  if (!hosted) return <TopNav brand="Standalone" tabs={tabs} />
  return (
    <>
      <TopNavSlotPortal region="tabs">{tabs}</TopNavSlotPortal>
      <div>page body</div>
    </>
  )
}

function shell(children: React.ReactNode) {
  return (
    <AppShell sidebar={<SideNav items={[]} />} topNav={<TopNav brand="Tickets" />}>
      {children}
    </AppShell>
  )
}

describe('top-nav slot contract', () => {
  it('renders exactly ONE top bar when a hosted page contributes tabs', () => {
    render(shell(<PageWithTabs />))
    expect(document.querySelectorAll('[data-slot="top-nav"]')).toHaveLength(1)
  })

  it('puts the page tabs inside that one bar, alongside the shell-owned title', () => {
    render(shell(<PageWithTabs label="Kanban View" />))
    const bar = document.querySelector('[data-slot="top-nav"]')!
    expect(bar).toHaveTextContent('Tickets')
    expect(bar.querySelector('[data-slot="top-nav-tabs"]')).toContainElement(
      screen.getByRole('button', { name: 'Kanban View' }),
    )
  })

  it('never renders the page bar as a sibling below the shell bar', () => {
    render(shell(<PageWithTabs />))
    // The standalone fallback's brand must not appear anywhere — if it does,
    // the page decided it was unhosted and rendered a second bar.
    expect(screen.queryByText('Standalone')).not.toBeInTheDocument()
    expect(document.querySelector('main [data-slot="top-nav"]')).toBeNull()
  })

  it('falls back to the page rendering its own bar when there is no host', () => {
    render(<PageWithTabs label="List View" />)
    expect(document.querySelectorAll('[data-slot="top-nav"]')).toHaveLength(1)
    expect(screen.getByText('Standalone')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'List View' })).toBeInTheDocument()
  })

  it('exposes the tabs region even before a page fills it, so the bar can be portalled into', () => {
    render(shell(<div>no tabs here</div>))
    expect(document.querySelector('[data-slot="top-nav-tabs"]')).toBeInTheDocument()
  })

  it('keeps the mobile drawer trigger on the shell bar (the reason the outer bar survives)', () => {
    render(shell(<PageWithTabs />))
    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toBeInTheDocument()
  })

  it('renders page actions into the bar’s actions region', () => {
    function PageWithActions() {
      return <TopNavSlotPortal region="actions">
        <button type="button">Delete view</button>
      </TopNavSlotPortal>
    }
    render(shell(<PageWithActions />))
    const actions = document.querySelector('[data-slot="top-nav-actions"]')
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Delete view' }))
  })
})

describe('TopNav responsive contract', () => {
  it('never hides the tabs region behind a breakpoint', () => {
    render(<TopNav brand="Tickets" tabs={<button type="button">List View</button>} />)
    const region = document.querySelector('[data-slot="top-nav-tabs"]')!
    // A `hidden md:flex` here stranded narrow-viewport users in whichever view
    // was active when the window last exceeded 768px.
    expect(region.className).not.toContain('hidden')
    expect(region.className).not.toContain('md:flex')
  })

  it('lets a long title truncate instead of pushing the tabs off the bar', () => {
    render(<TopNav brand={<h1 className="truncate">A very long module name indeed</h1>} />)
    const title = document.querySelector('[data-slot="top-nav-title"]')!
    expect(title).toHaveClass('min-w-0')
    expect(title.className).not.toContain('shrink-0')
  })
})

describe('AppShell page subtree stability', () => {
  it('mounts its page content exactly once, despite the slot nodes attaching late', () => {
    // The slot nodes attach one commit after mount, so the context value MUST
    // change on the second render. If the provider's component type changes with
    // it (a provider defined inside the host hook, or produced by `bind`), React
    // remounts the whole page subtree: page state is discarded and every page
    // effect runs twice. This asserts the type stays fixed.
    let mounts = 0
    function CountsItsMounts() {
      useEffect(() => {
        mounts += 1
      }, [])
      return <div>page</div>
    }

    render(shell(<CountsItsMounts />))

    expect(mounts).toBe(1)
  })
})

describe('title region — page-scoped title adornment (inbox spec: 20px module icon)', () => {
  it('portals a leading node INSIDE the host bar title group, before the brand text', async () => {
    function PageWithTitleIcon() {
      return (
        <TopNavSlotPortal region="title">
          <svg data-testid="module-glyph" aria-hidden />
        </TopNavSlotPortal>
      )
    }
    render(shell(<PageWithTitleIcon />))
    const lead = await screen.findByTestId('module-glyph')
    const titleGroup = document.querySelector('[data-slot="top-nav-title"]')!
    const leadSlot = document.querySelector('[data-slot="top-nav-title-lead"]')!
    expect(titleGroup.contains(lead)).toBe(true)
    expect(leadSlot.contains(lead)).toBe(true)
    // The adornment is the title group's FIRST child — it precedes the
    // host's own brand content in DOM order.
    expect(titleGroup.firstElementChild).toBe(leadSlot)
    expect(titleGroup).toHaveTextContent('Tickets')
  })
})
