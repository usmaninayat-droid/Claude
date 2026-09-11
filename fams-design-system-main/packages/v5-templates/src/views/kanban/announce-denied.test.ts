import { describe, expect, it, vi, beforeEach } from 'vitest'
import { announce } from '@atlaskit/pragmatic-drag-and-drop-live-region'
import { announceDenied } from './announce-denied'

vi.mock('@atlaskit/pragmatic-drag-and-drop-live-region', () => ({ announce: vi.fn() }))

beforeEach(() => {
  vi.mocked(announce).mockClear()
})

/**
 * `announceDenied` is the single denial-announce channel for this package —
 * `KanbanView`'s default `onMoveDenied` path and both guarded-write catch
 * sites in `renderers/v5-module-renderers.tsx` route through it.
 *
 * It used to defer one macrotask to out-order `@fams/ui-kit`'s unconditional
 * optimistic "Moved X to Y." announce (the live-region library cancels the
 * pending announcement on every `announce()` call, so last call won). That
 * workaround is gone: ui-kit's `KanbanBoardProps.formatMoveAnnouncement` now
 * suppresses that success announce for a move the board didn't commit, so
 * there is nothing left to out-order. These tests pin the announce down as
 * SYNCHRONOUS so the defer can't quietly come back — and the real,
 * unmocked-live-region proof that a denial never coexists with a success
 * lives in `denied-move-live-region.test.tsx`.
 */
describe('announce-denied — announceDenied', () => {
  it('announces synchronously, with the given message', () => {
    announceDenied('Move not allowed: this card can\'t move to Won.')
    expect(announce).toHaveBeenCalledTimes(1)
    expect(announce).toHaveBeenCalledWith("Move not allowed: this card can't move to Won.")
  })

  it('schedules no deferred second announce — one call, and it stays one call across a macrotask', async () => {
    announceDenied('Move not allowed: this card can\'t move to Won.')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(announce).toHaveBeenCalledTimes(1)
  })
})
