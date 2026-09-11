import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './Sheet'

function Fixture({
  side,
  hideClose,
  overlayClassName,
}: {
  side?: 'top' | 'bottom' | 'left' | 'right'
  hideClose?: boolean
  overlayClassName?: string
}) {
  return (
    <Sheet>
      <SheetTrigger>Open</SheetTrigger>
      <SheetContent side={side} hideClose={hideClose} overlayClassName={overlayClassName}>
        <SheetHeader>
          <SheetTitle>Edit entity</SheetTitle>
          <SheetDescription>Update the linked record.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <button>Save</button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

describe('Sheet', () => {
  it('is closed until the trigger is clicked', () => {
    render(<Fixture />)
    expect(screen.queryByText('Edit entity')).not.toBeInTheDocument()
  })

  it('opens on trigger click and shows title/description/footer', () => {
    render(<Fixture />)
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Edit entity')).toBeInTheDocument()
    expect(screen.getByText('Update the linked record.')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('closes on the close button', () => {
    render(<Fixture />)
    fireEvent.click(screen.getByText('Open'))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('defaults to side="right"', () => {
    render(<Fixture />)
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByRole('dialog')).toHaveClass('end-0')
  })

  it('applies logical start position for side="left"', () => {
    render(<Fixture side="left" />)
    fireEvent.click(screen.getByText('Open'))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('start-0')
    expect(dialog).not.toHaveClass('end-0')
  })

  it('applies direction-neutral positioning for side="top" and "bottom"', () => {
    const { unmount } = render(<Fixture side="top" />)
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByRole('dialog')).toHaveClass('inset-x-0', 'top-0')
    unmount()

    render(<Fixture side="bottom" />)
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByRole('dialog')).toHaveClass('inset-x-0', 'bottom-0')
  })

  it('keeps the platform-default scrim, and merges overlayClassName onto it when given', () => {
    const { unmount } = render(<Fixture />)
    fireEvent.click(screen.getByText('Open'))
    // Default dim is unchanged for every existing sheet.
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toHaveClass('bg-black/60')
    unmount()

    // …and one surface (the entity-profile side sheet, whose frames measure a
    // 40% black scrim) can override just its own without re-tinting the rest.
    render(<Fixture overlayClassName="bg-black/40" />)
    fireEvent.click(screen.getByText('Open'))
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toHaveClass('bg-black/40')
  })

  it('hides the close button when hideClose is set', () => {
    render(<Fixture hideClose />)
    fireEvent.click(screen.getByText('Open'))
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })
})
