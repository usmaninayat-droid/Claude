import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { ActivityCommentFeed, mentionsUser, renderLogText, renderMentions } from './ActivityCommentFeed'
import { getTabComponentRenderer } from '../../entity-profile/tab-components'
// Evaluating TaskDetailPanel registers the tab component (top-level call).
import '../TaskDetailPanel'

const RECORD = {
  id: 'INC-01',
  activity: [
    {
      id: 'a1',
      kind: 'log',
      actor: 'Khalid Al-Mansoori',
      text: 'New Incident was added',
      at: '2024-12-28T08:15:00Z',
      icon: 'added',
    },
    {
      id: 'a2',
      kind: 'comment',
      actor: 'Zayd Al-Farsi',
      text: '@KhalidAl-Mansoori please verify the pump readings before closing.',
      at: '2024-12-28T10:40:00Z',
    },
    {
      id: 'a3',
      kind: 'log',
      actor: 'Khalid Al-Mansoori',
      text: 'updated info.',
      at: new Date().toISOString(),
      icon: 'updated',
    },
  ],
}

describe('ActivityCommentFeed', () => {
  it('renders seeded entries newest-first with Today above older date groups', () => {
    render(<ActivityCommentFeed record={RECORD} field="activity" currentUser="Khalid Al-Mansoori" />)
    const items = screen.getAllByText(/New Incident was added|updated info\./)
    expect(items.length).toBe(2)
    const groups = screen.getByText('Today')
    expect(groups).toBeInTheDocument()
    expect(screen.getByText('28 Dec, 2024')).toBeInTheDocument()
    // Today's separator renders before the older group's separator in DOM order.
    const list = document.querySelector('[data-slot="activity-feed-list"]')!
    const labels = [...list.querySelectorAll('li span')].map((n) => n.textContent)
    expect(labels.indexOf('Today')).toBeLessThan(labels.indexOf('28 Dec, 2024'))
  })

  it('highlights @mentions and accents only the comment mentioning the current user', () => {
    render(<ActivityCommentFeed record={RECORD} field="activity" currentUser="Khalid Al-Mansoori" />)
    const mention = screen.getByText('@KhalidAl-Mansoori')
    expect(mention).toHaveClass('text-primary')
    const bubble = mention.closest('div')!
    expect(bubble.className).toContain('border-s-primary')
  })

  it('does not accent a comment that mentions someone else', () => {
    render(<ActivityCommentFeed record={RECORD} field="activity" currentUser="Somebody Else" />)
    const mention = screen.getByText('@KhalidAl-Mansoori')
    expect(mention.closest('div')!.className).not.toContain('border-s-primary')
  })

  it('posts an optimistic comment at the top of Today via the composer', () => {
    render(<ActivityCommentFeed record={RECORD} field="activity" currentUser="Khalid Al-Mansoori" />)
    fireEvent.change(screen.getByLabelText('Write a comment here…'), { target: { value: 'On my way.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    const list = document.querySelector('[data-slot="activity-feed-list"]')!
    const firstItem = list.querySelector('[data-slot="activity-feed-item"]')!
    expect(within(firstItem as HTMLElement).getByText('On my way.')).toBeInTheDocument()
  })

  it('order="oldest-first" reverses the default AC-5.4 ordering: oldest date group first, oldest row first within it, and a new post appends at the bottom', () => {
    render(
      <ActivityCommentFeed
        record={RECORD}
        field="activity"
        currentUser="Khalid Al-Mansoori"
        order="oldest-first"
      />,
    )
    const list = document.querySelector('[data-slot="activity-feed-list"]')!
    const labels = [...list.querySelectorAll('li span')].map((n) => n.textContent)
    // The older date group ("28 Dec, 2024") now reads BEFORE "Today".
    expect(labels.indexOf('28 Dec, 2024')).toBeLessThan(labels.indexOf('Today'))

    fireEvent.change(screen.getByLabelText('Write a comment here…'), { target: { value: 'On my way.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    const items = list.querySelectorAll('[data-slot="activity-feed-item"]')
    const lastItem = items[items.length - 1]!
    expect(within(lastItem as HTMLElement).getByText('On my way.')).toBeInTheDocument()

    // A SECOND post lands below the first (successive posts read downwards),
    // instead of stacking backwards above it.
    fireEvent.change(screen.getByLabelText('Write a comment here…'), { target: { value: 'Arrived on site.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    const texts = [...list.querySelectorAll('[data-slot="activity-feed-item"]')].map((n) => n.textContent ?? '')
    expect(texts.findIndex((t) => t.includes('On my way.'))).toBeLessThan(
      texts.findIndex((t) => t.includes('Arrived on site.')),
    )
  })

  it('defaults to newest-first when `order` is omitted (other consumers depend on this default)', () => {
    render(<ActivityCommentFeed record={RECORD} field="activity" currentUser="Khalid Al-Mansoori" />)
    const list = document.querySelector('[data-slot="activity-feed-list"]')!
    const labels = [...list.querySelectorAll('li span')].map((n) => n.textContent)
    expect(labels.indexOf('Today')).toBeLessThan(labels.indexOf('28 Dec, 2024'))
  })

  it('renders the empty state for a record with no activity', () => {
    render(<ActivityCommentFeed record={{ id: 'INC-99' }} field="activity" />)
    expect(screen.getByText(/No activity yet/)).toBeInTheDocument()
  })

  it('is registered as a tab component that degrades without a field', () => {
    const renderer = getTabComponentRenderer('ActivityCommentFeed')
    expect(renderer).toBeDefined()
    expect(renderer!({ record: RECORD, props: {} })).toBeNull()
    expect(renderer!({ record: RECORD, props: { field: 'activity' } })).not.toBeNull()
  })
})

describe('mention helpers', () => {
  it('mentionsUser matches collapsed full names and first names', () => {
    expect(mentionsUser('@ZaydAl-Farsi check this', 'Zayd Al-Farsi')).toBe(true)
    expect(mentionsUser('@Zayd check this', 'Zayd Al-Farsi')).toBe(true)
    expect(mentionsUser('@Someone check this', 'Zayd Al-Farsi')).toBe(false)
    expect(mentionsUser('no mention at all', 'Zayd Al-Farsi')).toBe(false)
  })

  it('renderMentions leaves plain text untouched', () => {
    expect(renderMentions('plain text')).toBe('plain text')
  })

  it('renderLogText bolds **values** and appends a tonal severity flag', () => {
    render(
      <p>
        {renderLogText('changed severity to', { label: 'Critical', tone: 'danger' })}
        {renderLogText('added due date **24 May, 2025**')}
      </p>,
    )
    const severity = screen.getByText('Critical')
    expect(severity.closest('[data-slot="activity-log-severity"]')!.className).toContain('text-destructive')
    expect(screen.getByText('24 May, 2025')).toHaveClass('font-semibold')
  })

  it('fix7: `danger`/`warning` severity flags use the AA-safe TEXT aliases, not the fill-calibrated `text-destructive`/`text-warning` (3.76:1 / 2.35:1 on white)', () => {
    render(
      <p>
        {renderLogText('changed severity to', { label: 'Critical', tone: 'danger' })}
        {renderLogText('flagged as', { label: 'Medium', tone: 'warning' })}
      </p>,
    )
    expect(screen.getByText('Critical').closest('[data-slot="activity-log-severity"]')!.className).toContain(
      'text-destructive-emphasis',
    )
    expect(screen.getByText('Medium').closest('[data-slot="activity-log-severity"]')!.className).toContain(
      'text-warning-text',
    )
  })
})
