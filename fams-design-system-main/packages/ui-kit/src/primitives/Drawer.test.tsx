import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent, createEvent } from '@testing-library/react'
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from './Drawer'

function Fixture({
  direction,
  hideHandle,
  hideClose,
}: {
  direction?: 'top' | 'bottom'
  hideHandle?: boolean
  hideClose?: boolean
}) {
  return (
    <Drawer>
      <DrawerTrigger>Open</DrawerTrigger>
      <DrawerContent direction={direction} hideHandle={hideHandle} hideClose={hideClose}>
        <DrawerHeader>
          <DrawerTitle>Quick actions</DrawerTitle>
          <DrawerDescription>Choose what to do next.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <button>Confirm</button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

describe('Drawer', () => {
  it('is closed until the trigger is clicked', () => {
    render(<Fixture />)
    expect(screen.queryByText('Quick actions')).not.toBeInTheDocument()
  })

  it('opens on trigger click and shows title/description/footer', () => {
    render(<Fixture />)
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Quick actions')).toBeInTheDocument()
    expect(screen.getByText('Choose what to do next.')).toBeInTheDocument()
    expect(screen.getByText('Confirm')).toBeInTheDocument()
  })

  it('closes on the close button', () => {
    render(<Fixture />)
    fireEvent.click(screen.getByText('Open'))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    // vaul injects a real `@keyframes` stylesheet (`[data-vaul-drawer]` exit
    // animation, e.g. `slideToBottom`) and Radix's Presence waits for a
    // genuine `animationend` before unmounting the content. jsdom computes
    // the animation-name from that stylesheet correctly (confirmed via
    // `getComputedStyle`) but never actually runs/finishes CSS animations,
    // AND its `AnimationEvent` doesn't honor an `animationName` constructor
    // init (a jsdom gap, not a Radix/vaul one) — so the event has to be
    // dispatched by hand with the property force-assigned afterwards.
    const exitAnimationEnd = createEvent.animationEnd(dialog, { animationName: 'slideToBottom' })
    Object.defineProperty(exitAnimationEnd, 'animationName', { value: 'slideToBottom' })
    fireEvent(dialog, exitAnimationEnd)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('defaults to direction="bottom" (rounded top edge, bottom-anchored)', () => {
    render(<Fixture />)
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByRole('dialog')).toHaveClass('bottom-0', 'rounded-t-md')
  })

  it('supports direction="top"', () => {
    render(<Fixture direction="top" />)
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByRole('dialog')).toHaveClass('top-0', 'rounded-b-md')
  })

  it('shows a drag handle by default and hides it when hideHandle is set', () => {
    const { unmount } = render(<Fixture />)
    fireEvent.click(screen.getByText('Open'))
    // vaul's Handle renders as a plain div with no accessible role; assert via
    // the dialog's structure instead of relying on the handle's own semantics.
    expect(screen.getByRole('dialog').querySelector('[class*="rounded-full"]')).toBeInTheDocument()
    unmount()

    render(<Fixture hideHandle />)
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByRole('dialog').querySelector('[class*="rounded-full"]')).not.toBeInTheDocument()
  })

  it('hides the close button when hideClose is set', () => {
    render(<Fixture hideClose />)
    fireEvent.click(screen.getByText('Open'))
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })
})
