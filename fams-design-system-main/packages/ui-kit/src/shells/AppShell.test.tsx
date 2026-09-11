import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { AppShell } from './AppShell'
import { SideNav } from './SideNav'
import { TopNav } from './TopNav'
import { Toaster, toast } from '../primitives/Toast'

const items = [
  { label: 'Bins', to: '/bins', active: true },
  { label: 'Live', to: '/live' },
]

function renderShell() {
  return render(
    <AppShell
      sidebar={<SideNav items={items} />}
      topNav={<TopNav brand={<span>Bins Module</span>} />}
    >
      <div data-testid="content">page content</div>
    </AppShell>,
  )
}

describe('AppShell', () => {
  it('renders the icon rail with its items', () => {
    renderShell()
    // The rail items surface by accessible name (desktop rail is always in the
    // DOM, just CSS-hidden below md — so it is queryable here).
    expect(screen.getByRole('link', { name: /Live/ })).toHaveAttribute(
      'href',
      '/live',
    )
    const nav = document.querySelector('nav')!
    // 51px inline rail (live-monitoring SPEC v2 §2.1, visual #39).
    expect(nav.style.width).toBe('51px')
    // legacy collapse model is gone
    expect(nav).not.toHaveAttribute('data-collapsed')
  })

  it('renders the top bar (brand + injected mobile hamburger)', () => {
    renderShell()
    expect(screen.getByText('Bins Module')).toBeInTheDocument()
    // AppShell clones the TopNav with onMenuClick → the hamburger appears.
    expect(
      screen.getByRole('button', { name: /Open navigation menu/i }),
    ).toBeInTheDocument()
  })

  it('renders children inside a scrollable main', () => {
    const { container } = renderShell()
    const main = container.querySelector('main')!
    expect(main.className).toContain('overflow-auto')
    expect(main).toContainElement(screen.getByTestId('content'))
  })

  it('hides the desktop rail wrapper below md (hidden md:flex)', () => {
    const { container } = renderShell()
    // The desktop sidebar wrapper is the first child of the shell root.
    const desktopWrap = container.firstElementChild!.firstElementChild as HTMLElement
    expect(desktopWrap.className).toContain('hidden')
    expect(desktopWrap.className).toContain('md:flex')
  })

  it('opens the mobile drawer when the hamburger is clicked', () => {
    renderShell()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(
      screen.getByRole('button', { name: /Open navigation menu/i }),
    )
    // Radix Dialog content is exposed as a dialog once open, and carries its own
    // copy of the rail items (the desktop rail is aria-hidden by the focus trap
    // while the drawer is open).
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /Bins/ })).toHaveAttribute(
      'href',
      '/bins',
    )
  })

  it('does not render a desktop collapse toggle anymore', () => {
    renderShell()
    expect(
      screen.queryByRole('button', { name: /Collapse sidebar/i }),
    ).toBeNull()
  })
})

/**
 * The shell owns the app's toast sink (round-2 interaction 19d): every app
 * built on `AppShell` gets one for free, and an app that brings its own keeps
 * winning.
 */
describe('AppShell — toast sink', () => {
  it('mounts a toaster by default, so toast() from anywhere in the app is visible', async () => {
    renderShell()
    act(() => {
      toast('Saved')
    })
    expect(await screen.findByText('Saved')).toBeInTheDocument()
  })

  it('does not double up when the app renders its own toaster', async () => {
    render(
      <AppShell sidebar={<SideNav items={items} />} topNav={<TopNav brand={<span>B</span>} />}>
        <Toaster />
      </AppShell>,
    )
    act(() => {
      toast('Once only')
    })
    expect(await screen.findAllByText('Once only')).toHaveLength(1)
  })

  it('parks the sink at the top-END, where it cannot cover bottom-end page chrome', async () => {
    renderShell()
    act(() => {
      toast('Placed')
    })
    await screen.findByText('Placed')
    // Round-3 visual + UX: the old bottom-end default landed squarely on the
    // map's zoom-out and fullscreen buttons. The shell mounts this for EVERY
    // module, so the default has to be collision-proof.
    expect(document.querySelector('[data-sonner-toaster]')).toHaveAttribute('data-y-position', 'top')
  })

  it('forwards toaster={{ … }} to the host so a consumer can place it elsewhere', async () => {
    render(
      <AppShell
        sidebar={<SideNav items={items} />}
        topNav={<TopNav brand={<span>B</span>} />}
        toaster={{ position: 'bottom-left' }}
      >
        <div />
      </AppShell>,
    )
    act(() => {
      toast('Moved')
    })
    await screen.findByText('Moved')
    expect(document.querySelector('[data-sonner-toaster]')).toHaveAttribute('data-y-position', 'bottom')
  })

  it('can be opted out of with toaster={false}', async () => {
    render(
      <AppShell sidebar={<SideNav items={items} />} topNav={<TopNav brand={<span>B</span>} />} toaster={false}>
        <div />
      </AppShell>,
    )
    act(() => {
      toast('Nowhere to land')
    })
    expect(screen.queryByText('Nowhere to land')).not.toBeInTheDocument()
  })
})
