import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProfileStack, type ProfileStackItem } from './ProfileStack'

const items: ProfileStackItem[] = [
  { id: 'a', title: 'Truck AUH-4021' },
  { id: 'b', title: 'Sara Ahmed' },
]

describe('ProfileStack', () => {
  it('renders a tab per item and the active item body', () => {
    render(
      <ProfileStack
        open
        onOpenChange={() => {}}
        items={items}
        activeId="a"
        onActivate={() => {}}
        onClose={() => {}}
        renderProfile={(item) => <p>body: {item.id}</p>}
      />,
    )
    // Active title also appears in the sr-only SheetTitle, so it's present ≥ twice.
    expect(screen.getAllByText('Truck AUH-4021').length).toBeGreaterThan(0)
    expect(screen.getByText('Sara Ahmed')).toBeInTheDocument()
    expect(screen.getByText('body: a')).toBeInTheDocument()
  })

  it('dispatches activate / close / close-all / minimize intents', () => {
    const onActivate = vi.fn()
    const onClose = vi.fn()
    const onCloseAll = vi.fn()
    const onMinimize = vi.fn()
    render(
      <ProfileStack
        open
        onOpenChange={() => {}}
        items={items}
        activeId="a"
        onActivate={onActivate}
        onClose={onClose}
        onCloseAll={onCloseAll}
        onMinimize={onMinimize}
        renderProfile={(item) => <p>body: {item.id}</p>}
      />,
    )
    fireEvent.click(screen.getByText('Sara Ahmed'))
    expect(onActivate).toHaveBeenCalledWith('b')
    fireEvent.click(screen.getByRole('button', { name: 'Close Sara Ahmed' }))
    expect(onClose).toHaveBeenCalledWith('b')
    fireEvent.click(screen.getByRole('button', { name: 'Close all records' }))
    expect(onCloseAll).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Minimize' }))
    expect(onMinimize).toHaveBeenCalled()
  })

  it('maps Escape (sheet dismiss) to popping EXACTLY ONE record, and really closes it', () => {
    const onMinimize = vi.fn()
    const onClose = vi.fn()
    render(
      <ProfileStack
        open
        onOpenChange={() => {}}
        items={items}
        activeId="b"
        onActivate={() => {}}
        onClose={onClose}
        onMinimize={onMinimize}
        renderProfile={(item) => <p>body: {item.id}</p>}
      />,
    )
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    // ONE record — the active one — is closed for real. Esc must never
    // minimize: that hid the whole stack while keeping every record, so the
    // next unrelated record opened on top of a stack the user thought was gone.
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledWith('b')
    expect(onMinimize).not.toHaveBeenCalled()
  })

  it('after Escape at depth 2, focus lands on the revealed record\'s tab — never <body>', async () => {
    function Host() {
      const [open, setOpen] = React.useState(items)
      const [activeId, setActiveId] = React.useState<string | null>('b')
      return (
        <ProfileStack
          open={open.length > 0}
          onOpenChange={() => {}}
          items={open}
          activeId={activeId}
          onActivate={setActiveId}
          onClose={(id) => {
            const next = open.filter((i) => i.id !== id)
            setOpen(next)
            setActiveId(next[next.length - 1]?.id ?? null)
          }}
          renderProfile={(item) => <p>body: {item.id}</p>}
        />
      )
    }
    render(<Host />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    await waitFor(() => expect(document.querySelectorAll('[data-slot="profile-stack-tab"]')).toHaveLength(1))
    expect(document.activeElement).not.toBe(document.body)
    // The revealed parent's own tab button — the control that names where the
    // user just landed.
    expect(document.activeElement?.textContent).toContain('Truck AUH-4021')
  })

  it('renders a restore affordance for a minimized stack, so it cannot be invisible state', () => {
    const onRestore = vi.fn()
    render(
      <ProfileStack
        open={false}
        minimized
        onRestore={onRestore}
        onOpenChange={() => {}}
        items={items}
        activeId="a"
        onActivate={() => {}}
        onClose={() => {}}
        renderProfile={(item) => <p>body: {item.id}</p>}
      />,
    )
    const dock = screen.getByRole('button', { name: '2 minimized records' })
    fireEvent.click(dock)
    expect(onRestore).toHaveBeenCalled()
  })

  describe('docked mode', () => {
    it('renders without a scrim/dialog — a docked region beside a still-live page', () => {
      render(
        <ProfileStack
          docked
          open
          onOpenChange={() => {}}
          items={items}
          activeId="a"
          onActivate={() => {}}
          onClose={() => {}}
          renderProfile={(item) => <p>body: {item.id}</p>}
        />,
      )
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(document.querySelector('[data-slot="sheet-overlay"]')).not.toBeInTheDocument()
      expect(screen.getByRole('complementary')).toBeInTheDocument()
      expect(screen.getByText('body: a')).toBeInTheDocument()
    })

    it('preserves linked-record STACKING in docked mode — tabs still render, activate/close still work', () => {
      const onActivate = vi.fn()
      const onClose = vi.fn()
      render(
        <ProfileStack
          docked
          open
          onOpenChange={() => {}}
          items={items}
          activeId="a"
          onActivate={onActivate}
          onClose={onClose}
          renderProfile={(item) => <p>body: {item.id}</p>}
        />,
      )
      expect(document.querySelectorAll('[data-slot="profile-stack-tab"]')).toHaveLength(2)
      fireEvent.click(screen.getByText('Sara Ahmed'))
      expect(onActivate).toHaveBeenCalledWith('b')
      fireEvent.click(screen.getByRole('button', { name: 'Close Sara Ahmed' }))
      expect(onClose).toHaveBeenCalledWith('b')
    })

    it('closes on Escape — pops exactly one stacked record, same as modal mode', () => {
      const onClose = vi.fn()
      const onMinimize = vi.fn()
      render(
        <ProfileStack
          docked
          open
          onOpenChange={() => {}}
          items={items}
          activeId="b"
          onActivate={() => {}}
          onClose={onClose}
          onMinimize={onMinimize}
          renderProfile={(item) => <p>body: {item.id}</p>}
        />,
      )
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledWith('b')
      expect(onMinimize).not.toHaveBeenCalled()
    })

    it('sizes to dockedWidth (defaulting to the 550px design width), independent of the modal `width` prop', () => {
      render(
        <ProfileStack
          docked
          open
          onOpenChange={() => {}}
          items={items}
          activeId="a"
          onActivate={() => {}}
          onClose={() => {}}
          renderProfile={(item) => <p>body: {item.id}</p>}
        />,
      )
      expect(screen.getByRole('complementary')).toHaveStyle({ inlineSize: '34.375rem' })
    })

    it('exposes the expand-from-bottom-to-full-height affordance only when the caller opts in', () => {
      const onExpandedChange = vi.fn()
      const { rerender } = render(
        <ProfileStack
          docked
          expanded
          onExpandedChange={onExpandedChange}
          open
          onOpenChange={() => {}}
          items={items}
          activeId="a"
          onActivate={() => {}}
          onClose={() => {}}
          renderProfile={(item) => <p>body: {item.id}</p>}
        />,
      )
      expect(screen.getByRole('complementary')).toHaveAttribute('data-expanded', 'true')
      fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
      expect(onExpandedChange).toHaveBeenCalledWith(false)

      rerender(
        <ProfileStack
          docked
          expanded={false}
          onExpandedChange={onExpandedChange}
          open
          onOpenChange={() => {}}
          items={items}
          activeId="a"
          onActivate={() => {}}
          onClose={() => {}}
          renderProfile={(item) => <p>body: {item.id}</p>}
        />,
      )
      expect(screen.getByRole('complementary')).toHaveAttribute('data-expanded', 'false')
      fireEvent.click(screen.getByRole('button', { name: 'Expand to full height' }))
      expect(onExpandedChange).toHaveBeenCalledWith(true)
    })

    it('omits the expand toggle when the caller has no onExpandedChange, and never renders it in modal mode', () => {
      const { rerender } = render(
        <ProfileStack
          docked
          open
          onOpenChange={() => {}}
          items={items}
          activeId="a"
          onActivate={() => {}}
          onClose={() => {}}
          renderProfile={(item) => <p>body: {item.id}</p>}
        />,
      )
      expect(screen.queryByRole('button', { name: 'Restore' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Expand to full height' })).not.toBeInTheDocument()

      rerender(
        <ProfileStack
          open
          onOpenChange={() => {}}
          items={items}
          activeId="a"
          onActivate={() => {}}
          onClose={() => {}}
          renderProfile={(item) => <p>body: {item.id}</p>}
        />,
      )
      expect(screen.queryByRole('button', { name: 'Restore' })).not.toBeInTheDocument()
    })
  })
})
