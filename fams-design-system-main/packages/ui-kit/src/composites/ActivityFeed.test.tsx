import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivityFeed, type ActivityFeedEntry, type ActivityFeedTone } from './ActivityFeed'

const ENTRIES: ActivityFeedEntry[] = [
  {
    id: '1',
    kind: 'system',
    author: 'Kashish Bindrani',
    text: 'created this contract',
    timestamp: '09:12',
    tone: 'success',
    dateGroup: 'Today',
  },
  {
    id: '2',
    kind: 'comment',
    author: 'Emmad Ahmad',
    avatar: undefined,
    text: 'Looks good, approving.',
    timestamp: '09:20',
    dateGroup: 'Today',
    attachments: [{ name: 'inspection.pdf', size: '212 KB' }],
  },
  {
    id: '3',
    kind: 'system',
    author: 'Saed Salah',
    text: 'moved status to Approved',
    tone: 'info',
    dateGroup: 'Yesterday',
  },
]

describe('ActivityFeed', () => {
  it('renders one listitem per entry', () => {
    render(<ActivityFeed entries={ENTRIES} />)
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('renders a system entry with author, text, and timestamp', () => {
    render(<ActivityFeed entries={ENTRIES} />)
    expect(screen.getByText('Kashish Bindrani')).toBeInTheDocument()
    expect(screen.getByText('created this contract')).toBeInTheDocument()
    expect(screen.getByText('09:12')).toBeInTheDocument()
  })

  it('renders a comment entry with an avatar derived from the author name', () => {
    render(<ActivityFeed entries={ENTRIES} />)
    expect(screen.getByText('Looks good, approving.')).toBeInTheDocument()
    // Avatar falls back to a single initial from `author` when no `avatar` src is given.
    expect(screen.getByText('E')).toBeInTheDocument()
  })

  it('renders attachment chips only when present on a comment entry', () => {
    render(<ActivityFeed entries={ENTRIES} />)
    expect(screen.getByText('inspection.pdf')).toBeInTheDocument()
    expect(screen.getByText(/212 KB/)).toBeInTheDocument()
  })

  it('inserts a date separator only when dateGroup changes from the previous entry', () => {
    render(<ActivityFeed entries={ENTRIES} />)
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Yesterday')).toBeInTheDocument()
    // "Today" covers entries 1 and 2 — it must render exactly once, not per-entry.
    expect(screen.getAllByText('Today')).toHaveLength(1)
  })

  it('renders no separators when no entry sets dateGroup', () => {
    const entries: ActivityFeedEntry[] = [
      { id: '1', kind: 'system', text: 'a' },
      { id: '2', kind: 'system', text: 'b' },
    ]
    const { container } = render(<ActivityFeed entries={entries} />)
    expect(container.querySelectorAll('[data-slot="activity-feed-item"] > div.flex.justify-center')).toHaveLength(0)
  })

  it('shows the empty label and no list when entries is empty', () => {
    render(<ActivityFeed entries={[]} emptyLabel="Nothing here yet" />)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
  })

  it('resolves every tone to a status token class, never a raw color', () => {
    const tones: ActivityFeedTone[] = ['neutral', 'info', 'success', 'warning', 'danger']
    for (const tone of tones) {
      const { container, unmount } = render(
        <ActivityFeed entries={[{ id: '1', kind: 'system', text: 'event', tone }]} />,
      )
      const dot = container.querySelector('[data-slot="activity-feed-tone-dot"]')
      expect(dot).toBeInTheDocument()
      expect(dot?.className).not.toMatch(/#|rgb\(|hsl\(|color-mix/)
      unmount()
    }
  })

  it('renders read-only with no composer when onSubmit is omitted', () => {
    render(<ActivityFeed entries={ENTRIES} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument()
  })

  it('renders a composer when onSubmit is provided; the solid send button no-ops on an empty draft', () => {
    const onSubmit = vi.fn()
    render(<ActivityFeed entries={ENTRIES} onSubmit={onSubmit} />)
    const sendButton = screen.getByRole('button', { name: 'Send' })
    // Always the solid primary tile (never washed-out/disabled) — clicking
    // with nothing typed simply does not submit.
    expect(sendButton).toBeEnabled()
    fireEvent.click(sendButton)
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A new comment' } })
    fireEvent.click(sendButton)
    expect(onSubmit).toHaveBeenCalledWith('A new comment')
  })

  it('omits the attach button by default, and shows it (firing onAttach on click) when provided', () => {
    const onAttach = vi.fn()
    const { rerender } = render(<ActivityFeed entries={ENTRIES} onSubmit={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Attach a file' })).not.toBeInTheDocument()

    rerender(<ActivityFeed entries={ENTRIES} onSubmit={() => {}} onAttach={onAttach} />)
    fireEvent.click(screen.getByRole('button', { name: 'Attach a file' }))
    expect(onAttach).toHaveBeenCalledTimes(1)
  })

  it('submits the trimmed draft via the Send button and clears the field', () => {
    const onSubmit = vi.fn()
    render(<ActivityFeed entries={ENTRIES} onSubmit={onSubmit} />)
    const textbox = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(textbox, { target: { value: '  looks fine  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSubmit).toHaveBeenCalledWith('looks fine')
    expect(textbox.value).toBe('')
  })

  it('submits on Enter without Shift, but not with Shift', () => {
    const onSubmit = vi.fn()
    render(<ActivityFeed entries={ENTRIES} onSubmit={onSubmit} />)
    const textbox = screen.getByRole('textbox')
    fireEvent.change(textbox, { target: { value: 'quick reply' } })
    fireEvent.keyDown(textbox, { key: 'Enter', shiftKey: true })
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.keyDown(textbox, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledWith('quick reply')
  })

  it('does not submit an empty or whitespace-only draft', () => {
    const onSubmit = vi.fn()
    render(<ActivityFeed entries={ENTRIES} onSubmit={onSubmit} />)
    const textbox = screen.getByRole('textbox')
    fireEvent.change(textbox, { target: { value: '   ' } })
    fireEvent.keyDown(textbox, { key: 'Enter' })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('renders a solid, uppercase action chip on a system entry that carries a badge', () => {
    render(
      <ActivityFeed
        entries={[
          { id: '1', kind: 'system', author: 'Khalid Al-Mansoori', text: 'the event.', badge: { label: 'VALIDATED', tone: 'warning' } },
        ]}
      />,
    )
    const badge = screen.getByText('VALIDATED')
    expect(badge).toHaveClass('bg-warning')
  })

  it('renders the badge on a comment entry too, since the type documents it for either kind', () => {
    render(
      <ActivityFeed
        entries={[
          {
            id: '1',
            kind: 'comment',
            author: 'Emmad Ahmad',
            text: 'Looks good, approving.',
            badge: { label: 'RESOLVED', tone: 'success' },
          },
        ]}
      />,
    )
    const badge = screen.getByText('RESOLVED')
    // fix7 (A7 gate blocker): solid success now fills `bg-success-scale-700`,
    // not `bg-success` (#12b76a, 2.62:1 white-on-fill) — see Badge.tsx's
    // `SOLID_CLASSES` doc comment.
    expect(badge).toHaveClass('bg-success-scale-700')
  })

  it('uppercases author names for both entry kinds when uppercaseAuthors is set', () => {
    render(<ActivityFeed entries={ENTRIES} uppercaseAuthors />)
    expect(screen.getByText('Kashish Bindrani')).toHaveClass('uppercase')
    expect(screen.getByText('Emmad Ahmad')).toHaveClass('uppercase')
  })

  it('keeps author names title-case by default', () => {
    render(<ActivityFeed entries={ENTRIES} />)
    expect(screen.getByText('Kashish Bindrani')).not.toHaveClass('uppercase')
  })

  it('groups entries under centered date pills', () => {
    const { container } = render(<ActivityFeed entries={ENTRIES} />)
    const pills = [...container.querySelectorAll('[data-slot="activity-feed-date-pill"]')]
    expect(pills.map((p) => p.textContent)).toEqual(['Today', 'Yesterday'])
    expect(pills[0]).toHaveClass('rounded-full')
  })

  it('joins consecutive icon system rows with a connector rail, but not across a date group', () => {
    const { container } = render(
      <ActivityFeed
        entries={[
          { id: 'a', kind: 'system', author: 'A', text: 'created task', icon: <svg />, dateGroup: 'Today' },
          { id: 'b', kind: 'system', author: 'B', text: 'changed severity', icon: <svg />, dateGroup: 'Today' },
          { id: 'c', kind: 'system', author: 'C', text: 'added due date', icon: <svg />, dateGroup: 'Yesterday' },
        ]}
      />,
    )
    // a→b are joined; b→c straddles a separator, so b gets no rail.
    const rails = container.querySelectorAll('[data-slot="activity-feed-rail"]')
    expect(rails).toHaveLength(1)
    expect(container.querySelectorAll('[data-slot="activity-feed-icon"]')).toHaveLength(3)
  })

  it('stickyComposer gives the list its own scroll region and keeps the composer out of it', () => {
    const { container } = render(<ActivityFeed entries={ENTRIES} onSubmit={() => {}} stickyComposer />)
    const root = container.querySelector('[data-slot="activity-feed"]')!
    const scroll = container.querySelector('[data-slot="activity-feed-scroll"]')!
    const composer = container.querySelector('[data-slot="activity-feed-composer"]')!
    expect(root).toHaveClass('h-full', 'min-h-0')
    expect(scroll).toHaveClass('overflow-y-auto', 'flex-1', 'min-h-0')
    expect(scroll.contains(composer)).toBe(false)
    expect(composer).toHaveClass('shrink-0')
    // The composer is the last child of the root — pinned below the scroller.
    expect(root.lastElementChild).toBe(composer)
  })

  it('leaves the composer in flow (no scroll region) by default', () => {
    const { container } = render(<ActivityFeed entries={ENTRIES} onSubmit={() => {}} />)
    expect(container.querySelector('[data-slot="activity-feed-scroll"]')).not.toHaveClass('overflow-y-auto')
    expect(container.querySelector('[data-slot="activity-feed"]')).not.toHaveClass('h-full')
  })

  it('forwards the ref to the root element', () => {
    const ref = createRef<HTMLDivElement>()
    render(<ActivityFeed entries={ENTRIES} ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current).toHaveAttribute('data-slot', 'activity-feed')
  })

  it('merges a consumer className with the root classes', () => {
    const { container } = render(<ActivityFeed entries={ENTRIES} className="max-w-lg" />)
    expect(container.querySelector('[data-slot="activity-feed"]')).toHaveClass('max-w-lg', 'flex')
  })

  // fix7 (job-orders): a declared system actor — `{ kind: 'system', label }`
  // — must render as the system, never as a person.
  describe('system actor', () => {
    it('renders the actor label from a system actor on a system-kind entry, exactly like a human string', () => {
      render(
        <ActivityFeed
          entries={[{ id: '1', kind: 'system', author: { kind: 'system', label: 'Automation' }, text: 'created this job order' }]}
        />,
      )
      expect(screen.getByText('Automation')).toBeInTheDocument()
      expect(screen.getByText('created this job order')).toBeInTheDocument()
    })

    it('defaults a system-actor entry to the icon-in-circle treatment (never the bare tone dot) when it supplies no icon of its own', () => {
      const { container } = render(
        <ActivityFeed entries={[{ id: '1', kind: 'system', author: { kind: 'system', label: 'Automation' }, text: 'x' }]} />,
      )
      expect(container.querySelector('[data-slot="activity-feed-icon"]')).toBeInTheDocument()
      expect(container.querySelector('[data-slot="activity-feed-tone-dot"]')).not.toBeInTheDocument()
    })

    it('a system-actor entry that DOES supply its own icon keeps that icon, not the default glyph', () => {
      const { container } = render(
        <ActivityFeed
          entries={[
            {
              id: '1',
              kind: 'system',
              author: { kind: 'system', label: 'Automation' },
              text: 'x',
              icon: <span data-testid="custom-icon" />,
            },
          ]}
        />,
      )
      expect(container.querySelector('[data-slot="activity-feed-icon"] [data-testid="custom-icon"]')).toBeInTheDocument()
    })

    it('never renders an Avatar (initials or photo) for a system actor on a comment-kind entry', () => {
      const { container } = render(
        <ActivityFeed
          entries={[{ id: '1', kind: 'comment', author: { kind: 'system', label: 'Automation' }, text: 'posted this' }]}
        />,
      )
      expect(screen.getByText('Automation')).toBeInTheDocument()
      expect(container.querySelector('[data-slot="activity-feed-system-avatar"]')).toBeInTheDocument()
      // No initials fallback ("A") standing in as a person.
      expect(screen.queryByText('A')).not.toBeInTheDocument()
    })

    it('a human string author on a comment-kind entry is unaffected (backward compatible)', () => {
      render(<ActivityFeed entries={[{ id: '1', kind: 'comment', author: 'Emmad Ahmad', text: 'hi' }]} />)
      expect(screen.getByText('Emmad Ahmad')).toBeInTheDocument()
      expect(screen.getByText('E')).toBeInTheDocument()
    })

    it('uppercases a system actor label too when uppercaseAuthors is set', () => {
      render(
        <ActivityFeed
          entries={[{ id: '1', kind: 'system', author: { kind: 'system', label: 'Automation' }, text: 'x' }]}
          uppercaseAuthors
        />,
      )
      expect(screen.getByText('Automation')).toHaveClass('uppercase')
    })
  })
})
