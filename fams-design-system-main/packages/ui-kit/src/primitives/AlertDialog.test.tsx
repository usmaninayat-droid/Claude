import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './AlertDialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './DropdownMenu'

function Fixture({ onConfirm = () => {} }: { onConfirm?: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Delete record</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this record?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * The CONTROLLED shape every confirm dialog in the system actually uses — an
 * `open`/`onOpenChange` pair and no `AlertDialogTrigger` inside the Root. This
 * is the shape whose focus restore was broken: with no Trigger to hand back
 * to, Radix's own restore was a no-op and focus fell to `document.body`.
 */
function ControlledFixture() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" data-testid="opener" onClick={() => setOpen(true)}>
        Delete
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete 2 tasks?</AlertDialogTitle>
            <AlertDialogDescription>This can&rsquo;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setOpen(false)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

describe('AlertDialog — focus restore (UX G.43 / K.70)', () => {
  // Asserts the OBSERVED `document.activeElement`, not that a prop was wired.
  // Round 2 shipped a dialog whose copy, semantics and Escape-cancels-the-
  // delete behaviour all passed while focus silently landed on `body` after
  // every close — a keyboard user dumped at the top of the document mid-task.
  it.each(['Escape', 'Cancel'])('returns focus to the opener after %s', async (how) => {
    render(<ControlledFixture />)
    const opener = screen.getByTestId('opener')
    // A real browser focuses a `<button>` on mousedown before the click
    // handler runs; jsdom's `fireEvent.click` does not, so focus it here or
    // the fixture would be testing a dialog opened from nowhere.
    opener.focus()
    fireEvent.click(opener)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    if (how === 'Escape') fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    else fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await waitFor(() => expect(document.activeElement).toBe(opener))
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe('AlertDialog', () => {
  it('is closed until the trigger is clicked', () => {
    render(<Fixture />)
    expect(screen.queryByText('Delete this record?')).not.toBeInTheDocument()
  })

  it('opens on trigger click and shows title/description', () => {
    render(<Fixture />)
    fireEvent.click(screen.getByText('Delete record'))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Delete this record?')).toBeInTheDocument()
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument()
  })

  it('closes on cancel without firing the action callback', () => {
    const onConfirm = vi.fn()
    render(<Fixture onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('Delete record'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('fires the action callback and closes on confirm', () => {
    const onConfirm = vi.fn()
    render(<Fixture onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('Delete record'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('renders no dismiss affordance other than Cancel/Action (no close button)', () => {
    render(<Fixture />)
    fireEvent.click(screen.getByText('Delete record'))
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })
})


/**
 * Focus restore — the four close paths that shipped broken.
 *
 * These fixtures mirror the two real entry points: a row `…` DropdownMenu whose
 * menu item opens the confirm (the menu unmounts behind the dialog, so the
 * captured opener is a DEAD node by close time), and a bulk action bar whose
 * `Delete` button legitimately disappears once the action succeeds.
 */
function MenuFixture({ onConfirm = () => {} }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false)
  // The menu starts open: jsdom cannot drive Radix's pointer-based open
  // sequence, and what is under test is the CLOSE-time restore, not the open.
  const [menuOpen, setMenuOpen] = useState(true)
  return (
    <div role="region" aria-label="Records" data-testid="records-region">
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger aria-label="Row actions">…</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onSelect={() => {
              setMenuOpen(false)
              setOpen(true)
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <button type="button">Close all records</button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete this record?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** The bulk bar unmounts on a successful delete — no opener survives. */
function BulkFixture() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(true)
  return (
    <div role="region" aria-label="Records" data-testid="records-region">
      {selected && (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Delete selected
          </button>
        </div>
      )}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete 3 records?</AlertDialogTitle>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setSelected(false)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

async function openFromRowMenu() {
  const item = await screen.findByRole('menuitem', { name: 'Delete' })
  // Radix moves focus onto the highlighted item; the dialog therefore captures
  // a MENU ITEM as `document.activeElement` — the exact shape that shipped
  // broken, because that item is unmounted by the time the dialog closes.
  item.focus()
  expect(document.activeElement).toBe(item)
  fireEvent.click(item)
  await screen.findByRole('alertdialog')
}

describe('AlertDialog — focus restore', () => {
  it.each([
    ['Escape', async () => fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })],
    ['Cancel', async () => fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))],
    ['the destructive action', async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))],
  ])(
    'restores focus to the MENU TRIGGER (not the dead menu item, not body) on %s',
    async (_label, close) => {
      render(<MenuFixture />)
      await openFromRowMenu()
      await close()
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByLabelText('Row actions')),
      )
      expect(document.activeElement).not.toBe(document.body)
    },
  )

  it('falls back to the surviving records region when the opener is gone', async () => {
    render(<BulkFixture />)
    const bulkDelete = screen.getByRole('button', { name: 'Delete selected' })
    bulkDelete.focus()
    fireEvent.click(bulkDelete)
    await screen.findByRole('alertdialog')
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    // The bulk bar unmounted with the selection: there is no opener left, so
    // focus must land on the region the user was working in — never `<body>`.
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('records-region')))
    expect(document.activeElement).not.toBe(document.body)
    expect(screen.getByTestId('records-region')).toHaveAttribute('tabindex', '-1')
  })

  it('resolves through the layer that actually contained the opener, never an unrelated expanded popup elsewhere on the page', async () => {
    // Two "expanded" popups at once. `Unrelated filter popover` is first in
    // DOM order and satisfies a bare `[aria-haspopup][aria-expanded="true"]`
    // query, but has no relationship at all to the menu the dialog actually
    // opened from — this is the exact shape ("a filter popover left open
    // behind a record sheet") the fix guards against. `Row actions`' own
    // `aria-controls` deliberately carries a SECOND, made-up id alongside the
    // menu's own (a legitimate ARIA id-list shape) so the exact-match
    // `aria-controls="right-menu"` query fails too, forcing the constrained
    // final scan under test.
    function TwoExpandedPopupsFixture({ onConfirm = () => {} }: { onConfirm?: () => void }) {
      const [open, setOpen] = useState(false)
      return (
        <div>
          <button type="button" aria-haspopup="listbox" aria-expanded="true" aria-controls="unrelated-listbox">
            Unrelated filter popover
          </button>
          <ul role="listbox" id="unrelated-listbox">
            <li role="option" aria-selected="false">Option A</li>
          </ul>

          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded="true"
            aria-controls="right-menu decoy-region"
            aria-label="Row actions"
          >
            …
          </button>
          <div role="menu" id="right-menu">
            <div
              role="menuitem"
              tabIndex={-1}
              onClick={() => setOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setOpen(true)
              }}
            >
              Delete
            </div>
          </div>

          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent>
              <AlertDialogTitle>Delete this record?</AlertDialogTitle>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )
    }

    render(<TwoExpandedPopupsFixture />)
    const item = screen.getByRole('menuitem', { name: 'Delete' })
    item.focus()
    fireEvent.click(item)
    await screen.findByRole('alertdialog')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    // The RIGHT trigger — not the unrelated, merely-first-in-DOM-order one.
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Row actions')))
    expect(document.activeElement).not.toBe(
      screen.getByRole('button', { name: 'Unrelated filter popover' }),
    )
    expect(document.activeElement).not.toBe(document.body)
  })

  it('honours an explicit focusRestoreFallback over the landmark default', async () => {
    function Fallback() {
      const [open, setOpen] = useState(true)
      return (
        <div role="region" aria-label="Records">
          <button type="button" data-testid="named">named target</button>
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent focusRestoreFallback="[data-testid='named']">
              <AlertDialogTitle>Confirm?</AlertDialogTitle>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )
    }
    render(<Fallback />)
    await screen.findByRole('alertdialog')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('named')))
  })
})

/**
 * The exit-animation window — the case every test above missed.
 *
 * Each of them waits for the dialog to LEAVE the document before asserting, so
 * they only ever measure the unmount-time `onCloseAutoFocus`. In a real browser
 * Radix holds the Content mounted for the whole `animate-out` (~300ms), and
 * during that window `FocusScope` is still trapped: measured live, focus sat on
 * the dialog's own `Cancel` (or, with a stacked sheet behind, that sheet's
 * first tabbable) until the animation ended. A user is already looking at the
 * closed dialog by then.
 *
 * jsdom runs no animations, so the window is manufactured the same way the
 * browser makes it: `getComputedStyle` reports a DIFFERENT `animationName` for
 * the Content once it is closed, which is precisely the condition Radix's
 * `Presence` uses to defer unmount until `animationend`.
 */
function stubExitAnimation() {
  const real = window.getComputedStyle.bind(window)
  return vi
    .spyOn(window, 'getComputedStyle')
    .mockImplementation(((element: Element, pseudo?: string | null) => {
      const style = real(element, pseudo)
      if (element instanceof HTMLElement && element.getAttribute('role') === 'alertdialog') {
        const name = element.getAttribute('data-state') === 'closed' ? 'fams-out' : 'fams-in'
        return new Proxy(style, {
          get: (t, prop) => (prop === 'animationName' ? name : Reflect.get(t, prop, t)),
        }) as CSSStyleDeclaration
      }
      return style
    }) as typeof window.getComputedStyle)
}

describe('AlertDialog — focus restore while the dialog is still animating out', () => {
  it.each([
    ['a POINTER click on Cancel', () => fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))],
    ['Escape', () => fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })],
  ])(
    'hands focus back to the menu trigger the moment it closes, after %s',
    async (_label, close) => {
      const styles = stubExitAnimation()
      try {
        render(<MenuFixture />)
        await openFromRowMenu()
        const content = screen.getByRole('alertdialog')
        await act(async () => {
          close()
        })

        // Still mounted — this IS the window, and it is the whole point.
        await waitFor(() => expect(content).toHaveAttribute('data-state', 'closed'))
        expect(content).toBeInTheDocument()
        // Focus is already home, not stranded on `Cancel` inside the corpse.
        expect(document.activeElement).toBe(screen.getByLabelText('Row actions'))
        // A shut dialog is not interactive, not focusable, not in the a11y tree.
        expect(content).toHaveAttribute('inert')

        // …and it STAYS there. The claw-back that produced every wrong
        // reading was `FocusScope`'s focusout handler, which fires on the very
        // next tick after focus leaves the still-trapped container.
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0))
        })
        expect(document.activeElement).toBe(screen.getByLabelText('Row actions'))
      } finally {
        styles.mockRestore()
      }
    },
  )
})
