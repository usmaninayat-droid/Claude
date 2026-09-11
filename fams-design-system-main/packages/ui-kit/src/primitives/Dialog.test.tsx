import { StrictMode, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './Dialog'

function Fixture() {
  return (
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm</DialogTitle>
          <DialogDescription>Are you sure?</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

describe('Dialog', () => {
  it('is closed until the trigger is clicked', () => {
    render(<Fixture />)
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument()
  })

  it('opens on trigger click and shows title/description', () => {
    render(<Fixture />)
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('closes on the close button', () => {
    render(<Fixture />)
    fireEvent.click(screen.getByText('Open'))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('marks the content aria-modal', () => {
    render(<Fixture />)
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('gives the built-in close button a 40x40 hit area (icon-button standard)', () => {
    render(<Fixture />)
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByRole('button', { name: 'Close' })).toHaveClass('size-10')
  })

  // Programmatically opened dialog (controlled `open`, no DialogTrigger) —
  // the login forgot-password pattern. Focus must return to the opener on
  // every close path, including under StrictMode's double-invoked effects
  // (which break Radix's own FocusScope restore).
  function ControlledFixture() {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Opener
        </button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Programmatic</DialogTitle>
              <DialogDescription>No trigger in the tree.</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  it('returns focus to the programmatic opener on Escape (StrictMode)', async () => {
    render(
      <StrictMode>
        <ControlledFixture />
      </StrictMode>,
    )
    const opener = screen.getByRole('button', { name: 'Opener' })
    opener.focus()
    fireEvent.click(opener)
    const dialog = await screen.findByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)
    fireEvent.keyDown(document.activeElement ?? dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(opener).toHaveFocus())
  })

  it('returns focus to the programmatic opener when closed via the X button (StrictMode)', async () => {
    render(
      <StrictMode>
        <ControlledFixture />
      </StrictMode>,
    )
    const opener = screen.getByRole('button', { name: 'Opener' })
    opener.focus()
    fireEvent.click(opener)
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(opener).toHaveFocus())
  })

  it('returns focus to the programmatic opener on scrim (outside pointerdown) close (StrictMode)', async () => {
    render(
      <StrictMode>
        <ControlledFixture />
      </StrictMode>,
    )
    const opener = screen.getByRole('button', { name: 'Opener' })
    opener.focus()
    fireEvent.click(opener)
    await screen.findByRole('dialog')
    // Radix arms its outside-pointerdown document listener on a 0ms timer
    // (so the opening click can't self-dismiss) — let it arm.
    await new Promise((r) => setTimeout(r, 0))
    const overlay = document.querySelector('[data-slot="dialog-overlay"]') as HTMLElement
    expect(overlay).not.toBeNull()
    // fireEvent returns false when the handler called preventDefault() on the
    // original pointerdown — the overlay must cancel the browser's
    // focus-on-mousedown default at the source (fix4).
    const browserDefaultNotPrevented = fireEvent.pointerDown(overlay, { button: 0, pointerType: 'mouse' })
    expect(browserDefaultNotPrevented).toBe(false)
    // Radix defers left-button outside dismissal to the `click` event
    // (deferPointerDownOutside) — complete the press.
    fireEvent.click(overlay, { button: 0 })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(opener).toHaveFocus())
  })

  it('restores the opener even when focus already fell to <body> before a scrim close (StrictMode)', async () => {
    // Browser-realistic scrim close (round-4 live forensics): the pointerdown's
    // focus-on-mousedown default drops focus to <body> BEFORE Radix's deferred
    // dismissal runs, and the dismissal re-render re-attaches the content ref
    // while <body> has focus. The capture must survive (never be nulled by a
    // body-focus re-attach) and one of the restore layers must return focus.
    render(
      <StrictMode>
        <ControlledFixture />
      </StrictMode>,
    )
    const opener = screen.getByRole('button', { name: 'Opener' })
    opener.focus()
    fireEvent.click(opener)
    await screen.findByRole('dialog')
    await new Promise((r) => setTimeout(r, 0))
    const overlay = document.querySelector('[data-slot="dialog-overlay"]') as HTMLElement
    fireEvent.pointerDown(overlay, { button: 0, pointerType: 'mouse' })
    // Simulate the browser default jsdom lacks: focus falls to <body> between
    // the pointerdown and the (deferred) dismissal.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    expect(document.activeElement).toBe(document.body)
    fireEvent.click(overlay, { button: 0 })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(opener).toHaveFocus())
  })

  it('stands down every restore layer when the consumer opts out via onCloseAutoFocus preventDefault', async () => {
    function OptOutFixture() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Opener
          </button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Opted out</DialogTitle>
                <DialogDescription>Consumer owns close focus.</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </>
      )
    }
    render(
      <StrictMode>
        <OptOutFixture />
      </StrictMode>,
    )
    const opener = screen.getByRole('button', { name: 'Opener' })
    opener.focus()
    fireEvent.click(opener)
    const dialog = await screen.findByRole('dialog')
    fireEvent.keyDown(document.activeElement ?? dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // Give both the rAF re-assert and the unmount-fallback timeout a chance to
    // (wrongly) fire — neither may move focus back to the opener.
    await new Promise((r) => setTimeout(r, 50))
    expect(opener).not.toHaveFocus()
  })

  it('returns focus to the trigger on close in the triggered pattern', async () => {
    render(<Fixture />)
    const trigger = screen.getByText('Open')
    trigger.focus()
    fireEvent.click(trigger)
    await screen.findByRole('dialog')
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})
