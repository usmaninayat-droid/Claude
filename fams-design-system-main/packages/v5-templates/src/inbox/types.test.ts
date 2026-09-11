import { describe, expect, it } from 'vitest'
import { dateGroupLabel, formatTabCount, groupByDate, inTab } from './types'
import { INBOX_FIXTURE_NOW, inboxNotificationFixtures } from './fixtures'

describe('inbox tab membership (inTab)', () => {
  const [approval, minor, , mention, readAlert] = inboxNotificationFixtures

  it('unread = not read; all = everything', () => {
    expect(inTab(approval, 'unread')).toBe(true)
    expect(inTab(readAlert, 'unread')).toBe(false)
    expect(inboxNotificationFixtures.every((n) => inTab(n, 'all'))).toBe(true)
  })

  it('facet tabs read their flags: reminders / assigned / mentions / critical', () => {
    expect(inTab(minor, 'reminders')).toBe(true)
    expect(inTab(approval, 'reminders')).toBe(false)
    expect(inTab(approval, 'assigned')).toBe(true)
    expect(inTab(mention, 'mentions')).toBe(true)
    expect(inTab(minor, 'mentions')).toBe(false)
    expect(inTab(approval, 'critical')).toBe(true)
    expect(inTab(minor, 'critical')).toBe(false)
  })
})

describe('formatTabCount', () => {
  it('zero-pads under 10 (Figma "05"), renders larger counts plain', () => {
    expect(formatTabCount(5)).toBe('05')
    expect(formatTabCount(0)).toBe('00')
    expect(formatTabCount(42)).toBe('42')
  })
})

describe('date grouping', () => {
  it('labels Today / Yesterday / "12 APR 2026"', () => {
    expect(dateGroupLabel('2026-08-15T08:45:00', INBOX_FIXTURE_NOW)).toBe('Today')
    expect(dateGroupLabel('2026-08-14T21:23:00', INBOX_FIXTURE_NOW)).toBe('Yesterday')
    expect(dateGroupLabel('2026-04-12T00:01:00', INBOX_FIXTURE_NOW)).toBe('12 APR 2026')
  })

  it('groups newest-first with items sorted inside each group', () => {
    const groups = groupByDate(inboxNotificationFixtures, INBOX_FIXTURE_NOW)
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', '12 APR 2026'])
    expect(groups[0].items.map((n) => n.id)).toEqual(['ntf-1', 'ntf-2', 'ntf-3'])
    expect(groups[1].items.map((n) => n.id)).toEqual(['ntf-5', 'ntf-4'])
  })
})
