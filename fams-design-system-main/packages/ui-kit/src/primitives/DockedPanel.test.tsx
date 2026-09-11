import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DockedPanel, DockedPanelHeader } from './DockedPanel'

function Fixture({
  open = true,
  onClose = vi.fn(),
  expanded,
}: {
  open?: boolean
  onClose?: () => void
  expanded?: boolean
}) {
  return (
    <DockedPanel open={open} onClose={onClose} expanded={expanded} aria-label="Station detail">
      <DockedPanelHeader onClose={onClose}>
        <span>Qatar University</span>
      </DockedPanelHeader>
      <div>Panel body</div>
    </DockedPanel>
  )
}

describe('DockedPanel', () => {
  it('renders nothing when closed, so the caller need not branch', () => {
    const { container } = render(<Fixture open={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('is a docked region, not a modal — no dialog role, no scrim/overlay in the DOM', () => {
    render(<Fixture />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.querySelector('[data-slot="sheet-overlay"]')).not.toBeInTheDocument()
    expect(document.querySelector('[data-slot="drawer-overlay"]')).not.toBeInTheDocument()
    // A plain complementary region the page keeps interactive around.
    expect(screen.getByRole('complementary', { name: 'Station detail' })).toBeInTheDocument()
    expect(screen.getByText('Panel body')).toBeInTheDocument()
  })

  it('closes on Escape without needing focus trapped inside it', () => {
    const onClose = vi.fn()
    render(<Fixture onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on the header close button', () => {
    const onClose = vi.fn()
    render(<Fixture onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('defaults to full height (expanded), and reflects a caller-driven collapsed state', () => {
    const { rerender } = render(<Fixture />)
    expect(screen.getByRole('complementary')).toHaveAttribute('data-expanded', 'true')
    rerender(<Fixture expanded={false} />)
    expect(screen.getByRole('complementary')).toHaveAttribute('data-expanded', 'false')
  })

  it('renders the expand/restore toggle only when the header is given onExpandedChange, and reports the flip', () => {
    const onExpandedChange = vi.fn()
    const { rerender } = render(
      <DockedPanel open onClose={vi.fn()} aria-label="Station detail">
        <DockedPanelHeader onClose={vi.fn()} expanded onExpandedChange={onExpandedChange} />
      </DockedPanel>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    expect(onExpandedChange).toHaveBeenCalledWith(false)

    rerender(
      <DockedPanel open onClose={vi.fn()} aria-label="Station detail">
        <DockedPanelHeader onClose={vi.fn()} expanded={false} onExpandedChange={onExpandedChange} />
      </DockedPanel>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Expand to full height' }))
    expect(onExpandedChange).toHaveBeenCalledWith(true)
  })

  it('omits the expand toggle when the caller has no onExpandedChange', () => {
    render(<Fixture />)
    expect(screen.queryByRole('button', { name: 'Restore' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Expand to full height' })).not.toBeInTheDocument()
  })

  it('sizes to the given width, defaulting to the 550px design width', () => {
    render(<Fixture />)
    expect(screen.getByRole('complementary')).toHaveStyle({ inlineSize: '34.375rem' })
  })
})
