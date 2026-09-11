import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { ReadDate, ReadFlagToneDate, ReadPersonView } from './renderers'
import type { FieldDescriptor } from './types'

/**
 * fix10 (2026-09-06), round-11 UX gate finding **P1-11a**.
 *
 * The icon/avatar-prefixed value renderers wrapped their text as a bare child
 * of an `inline-flex` span. `text-overflow: ellipsis` has no effect on a box
 * whose overflow escapes a nested flex ITEM, and a flex item's default
 * `min-width: auto` refuses to shrink below its content — so an ancestor's
 * `overflow: hidden` cropped these values MID-GLYPH with no ellipsis at all.
 * Measured live at 1280 on the job-order sheet's Asset Details cards:
 * `6 Jun, 2026` rendered as `6 Jun, 202` and `Layla Darwish` as `Layla Darwis`.
 * That is worse than an honest truncation, because nothing on screen says
 * anything is missing — a reader takes `202` for the year.
 *
 * jsdom does no layout, so these cases CANNOT assert the visual result. They
 * pin the three structural preconditions that make the ellipsis possible, each
 * of which was individually absent and each of which is required:
 *   1. the container can shrink (`min-w-0`),
 *   2. the TEXT has its own truncating box (`truncate` on the text's span, not
 *      on the wrapper — that placement is the whole point),
 *   3. the full value stays reachable once abbreviated (`title`).
 * The visual proof lives in the round-12 gate's 4x-DPI crops; this is the
 * cheap guard that stops the structure silently regressing.
 */
const desc = (over: Partial<FieldDescriptor> = {}): FieldDescriptor =>
  ({ id: 'fld_x', col: 'systemcol1', label: 'X', type: 'Date', required: false, multiple: false, ...over }) as FieldDescriptor

function truncatingSpan(container: HTMLElement, text: string) {
  const el = [...container.querySelectorAll('span')].find(
    (s) => s.textContent === text && s.className.includes('truncate'),
  )
  return el ?? null
}

describe('icon-prefixed read values are structurally truncatable (fix10, P1-11a)', () => {
  it('ReadDate: the container can shrink and the DATE TEXT carries truncate + title', () => {
    const { container } = render(<ReadDate descriptor={desc()} value="2026-06-06" />)
    const outer = container.querySelector('span')!
    expect(outer.className).toContain('min-w-0')
    const text = truncatingSpan(container, '6 Jun, 2026')
    expect(text).not.toBeNull()
    expect(text!.getAttribute('title')).toBe('6 Jun, 2026')
  })

  it('ReadDate: an UNPARSEABLE value is truncatable too — the branch that prints the raw string', () => {
    const { container } = render(<ReadDate descriptor={desc()} value="not-a-date" />)
    expect(container.querySelector('span')!.className).toContain('min-w-0')
    const text = truncatingSpan(container, 'not-a-date')
    expect(text).not.toBeNull()
    expect(text!.getAttribute('title')).toBe('not-a-date')
  })

  it('ReadFlagToneDate: truncatable in BOTH states — flagged (its own branch) and unflagged (delegates to ReadDate)', () => {
    const flagged = desc({ component: { name: 'FlagToneDateView', props: { flagCol: 'systemcol9', flagValue: 'Overdue', tone: 'danger' } } })
    const on = render(<ReadFlagToneDate descriptor={flagged} value="2026-06-06" record={{ id: 'r', systemcol9: 'Overdue' }} />)
    expect(on.container.querySelector('span')!.className).toContain('min-w-0')
    expect(truncatingSpan(on.container, '6 Jun, 2026')).not.toBeNull()

    const off = render(<ReadFlagToneDate descriptor={flagged} value="2026-06-06" record={{ id: 'r', systemcol9: '' }} />)
    expect(off.container.querySelector('span')!.className).toContain('min-w-0')
    expect(truncatingSpan(off.container, '6 Jun, 2026')).not.toBeNull()
  })

  it('ReadPersonView: the NAME truncates while the avatar does not shrink away', () => {
    const { container } = render(<ReadPersonView descriptor={desc({ type: 'SmallText' })} value="Layla Darwish" />)
    const outer = container.querySelector('span')!
    expect(outer.className).toContain('min-w-0')
    const text = truncatingSpan(container, 'Layla Darwish')
    expect(text).not.toBeNull()
    expect(text!.getAttribute('title')).toBe('Layla Darwish')
    // The avatar must keep its box — a truncating sibling must not squeeze it.
    const avatar = container.querySelector('[data-slot="avatar"]') ?? container.querySelector('.shrink-0')
    expect(avatar?.className).toContain('shrink-0')
  })

  it('an EMPTY value still renders the em dash, not an empty truncating box', () => {
    const { container } = render(<ReadDate descriptor={desc()} value={null} />)
    expect(container.textContent).toBe('—')
    expect(container.querySelector('.truncate')).toBeNull()
  })
})
