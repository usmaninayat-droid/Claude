import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen, cleanup, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DemoConsole, type DemoConsoleProps } from './DemoConsole'

function makeProps(overrides: Partial<DemoConsoleProps> = {}): DemoConsoleProps {
  return {
    tenants: [
      { id: 'acme', label: 'Acme Corp' },
      { id: 'beta', label: 'Beta Industries' },
    ],
    currentTenantId: 'acme',
    onSelectTenant: vi.fn(),
    personas: [
      { id: 'u_admin', label: 'Avery (Admin)', roles: ['admin'] },
      { id: 'u_disp', label: 'Dana (Dispatcher)', roles: ['dispatcher'] },
    ],
    currentPersonaId: 'u_admin',
    onSelectPersona: vi.fn(),
    modules: [{ id: 'companies', label: 'Companies' }],
    onNavigateModule: vi.fn(),
    onResetSeeds: vi.fn(),
    getShareLink: vi.fn(() => 'https://demo.test/?tenant=acme&persona=u_admin'),
    ...overrides,
  }
}

beforeEach(() => cleanup())

/**
 * jsdom's `fireEvent.pointerMove` does not carry `clientY`, and the hot zone is
 * a pure coordinate test — so the move is dispatched as a real `MouseEvent`
 * under the `pointermove` type, which is what a browser delivers.
 */
function movePointerTo(clientY: number) {
  act(() => {
    window.dispatchEvent(new MouseEvent('pointermove', { clientY, bubbles: true }))
  })
}

describe('DemoConsole — hover reveal', () => {
  it('reveals the handle on pointer enter and hides on leave', () => {
    const { container } = render(<DemoConsole {...makeProps()} />)
    const rail = container.querySelector('[data-demo-console-rail]')!
    const handle = container.querySelector('[data-demo-console-handle]')!

    expect(handle.getAttribute('data-revealed')).toBe('false')
    expect((handle as HTMLElement).style.opacity).toBe('0')

    fireEvent.pointerEnter(rail)
    expect(handle.getAttribute('data-revealed')).toBe('true')
    expect((handle as HTMLElement).style.opacity).toBe('1')

    fireEvent.pointerLeave(rail)
    expect(handle.getAttribute('data-revealed')).toBe('false')
  })

  it('reveals from a window pointermove near the top edge, not from a hit-test', () => {
    const { container } = render(<DemoConsole {...makeProps()} />)
    const handle = container.querySelector('[data-demo-console-handle]')!

    movePointerTo(400)
    expect(handle.getAttribute('data-revealed')).toBe('false')

    movePointerTo(4)
    expect(handle.getAttribute('data-revealed')).toBe('true')

    movePointerTo(400)
    expect(handle.getAttribute('data-revealed')).toBe('false')
  })

  it('never swallows a click meant for the page underneath', () => {
    // Regression: a QA gate's "click outside to dismiss" at (5, 5) hit the
    // rail's invisible, `aria-hidden`, `opacity: 0` handle and opened the
    // console's full-screen scrim instead — which then covered the control the
    // gate tried to click next, and read as an unrelated "popover can never be
    // reopened" P0. An invisible control must not be clickable.
    const { container } = render(<DemoConsole {...makeProps()} />)
    const rail = container.querySelector('[data-demo-console-rail]') as HTMLElement
    const hotzone = container.querySelector('[data-demo-console-hotzone]') as HTMLElement
    const handle = container.querySelector('[data-demo-console-handle]') as HTMLElement

    expect(rail.className).toContain('pointer-events-none')
    expect(hotzone.className).not.toContain('pointer-events-auto')
    expect(handle.getAttribute('data-revealed')).toBe('false')
    expect(handle.className).toContain('pointer-events-none')

    // Once actually visible it becomes a real target again.
    movePointerTo(2)
    expect(handle.className).toContain('pointer-events-auto')
  })

  it('opens the console when the revealed handle is clicked', () => {
    const { container } = render(<DemoConsole {...makeProps()} />)
    fireEvent.click(container.querySelector('[data-demo-console-handle]')!)
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})

describe('DemoConsole — keyboard path', () => {
  it('opens via the visually-hidden trigger (no pointer needed)', () => {
    render(<DemoConsole {...makeProps()} title="Demo console" />)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /open demo console/i }))
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('closes on Escape', () => {
    render(<DemoConsole {...makeProps()} defaultOpen />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('DemoConsole — control callbacks', () => {
  it('fires tenant / persona / module callbacks', () => {
    const props = makeProps()
    render(<DemoConsole {...props} defaultOpen />)

    fireEvent.click(screen.getByRole('radio', { name: /beta industries/i }))
    expect(props.onSelectTenant).toHaveBeenCalledWith('beta')

    fireEvent.click(screen.getByRole('radio', { name: /dana \(dispatcher\)/i }))
    expect(props.onSelectPersona).toHaveBeenCalledWith('u_disp')

    fireEvent.click(screen.getByRole('button', { name: /^companies$/i }))
    expect(props.onNavigateModule).toHaveBeenCalledWith('companies')
    // Navigating closes the console.
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('reset requires a confirm click before calling back', () => {
    const props = makeProps()
    render(<DemoConsole {...props} defaultOpen />)
    const resetBtn = screen.getByRole('button', { name: /reset seed data/i })
    fireEvent.click(resetBtn)
    expect(props.onResetSeeds).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /confirm reset/i }))
    expect(props.onResetSeeds).toHaveBeenCalledTimes(1)
  })

  it('copies the share link and shows feedback', async () => {
    const props = makeProps()
    render(<DemoConsole {...props} defaultOpen />)
    fireEvent.click(screen.getByRole('button', { name: /copy share link/i }))
    expect(props.getShareLink).toHaveBeenCalled()
    expect(await screen.findByRole('status')).toBeTruthy()
  })
})

describe('DemoConsole — focus trap + restore (real Base UI dialog, decision #7)', () => {
  it('moves focus inside the dialog on open and traps it there while tabbing forward', async () => {
    const user = userEvent.setup()
    render(<DemoConsole {...makeProps()} />)

    const opener = screen.getByRole('button', { name: /open demo console/i })
    opener.focus()
    await user.click(opener)

    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

    // Tab through more times than there are focusable elements inside the
    // console; if focus ever escaped the trap it would land back on the
    // always-present, outside-the-dialog hidden opener button. The focus
    // guards Base UI renders around the popup redirect focus back inside on
    // an animation frame (see `enqueueFocus`), so each step is awaited via
    // `waitFor` rather than asserted immediately after `user.tab()`.
    for (let i = 0; i < 20; i += 1) {
      await user.tab()
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
      expect(document.activeElement).not.toBe(opener)
    }
  })

  it('traps focus while tabbing backward (Shift+Tab) too', async () => {
    const user = userEvent.setup()
    render(<DemoConsole {...makeProps()} defaultOpen />)

    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

    for (let i = 0; i < 20; i += 1) {
      await user.tab({ shift: true })
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    }
  })

  it('restores focus to the element focused before opening, once the console closes', async () => {
    const user = userEvent.setup()
    render(<DemoConsole {...makeProps()} />)

    const opener = screen.getByRole('button', { name: /open demo console/i })
    opener.focus()
    expect(document.activeElement).toBe(opener)

    await user.click(opener)
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(document.activeElement).not.toBe(opener))
    expect(dialog.contains(document.activeElement)).toBe(true)

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('restores focus after closing via the header close button', async () => {
    const user = userEvent.setup()
    render(<DemoConsole {...makeProps()} />)

    const opener = screen.getByRole('button', { name: /open demo console/i })
    opener.focus()
    await user.click(opener)
    await screen.findByRole('dialog')
    await waitFor(() => expect(document.activeElement).not.toBe(opener))

    fireEvent.click(screen.getByRole('button', { name: /close demo console/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('restores focus after closing via an outside (scrim) press', async () => {
    const user = userEvent.setup()
    render(<DemoConsole {...makeProps()} />)

    const opener = screen.getByRole('button', { name: /open demo console/i })
    opener.focus()
    await user.click(opener)
    await screen.findByRole('dialog')
    await waitFor(() => expect(document.activeElement).not.toBe(opener))

    // The scrim is portaled to `document.body`, not inside RTL's `container`.
    const scrim = document.querySelector('[data-demo-console-scrim]')!
    fireEvent.click(scrim)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })
})
