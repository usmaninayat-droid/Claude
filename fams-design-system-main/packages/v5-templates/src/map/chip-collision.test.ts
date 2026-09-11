import { describe, expect, it } from 'vitest'
import { suppressedChipIds } from './chip-collision'

/**
 * chip-collision.test.ts — marker chip suppression (round-1 UX finding 17:
 * "45 mins" running under the "152" cluster, overlapping "E 20365"/"H 32730"
 * pairs, and chips cut mid-word at the pane edge).
 */
const OPTS = { paneWidth: 1330 }

describe('suppressedChipIds', () => {
  it('keeps a chip when nothing collides', () => {
    expect(suppressedChipIds([{ id: 'a', x: 600, y: 500, chips: true }], OPTS).size).toBe(0)
  })

  it('suppresses the lower-priority marker of an overlapping pair', () => {
    const out = suppressedChipIds(
      [
        { id: 'a', x: 600, y: 500, chips: true, priority: 1 },
        { id: 'b', x: 640, y: 505, chips: true, priority: 1 },
      ],
      OPTS,
    )
    expect(out.has('b')).toBe(true)
    expect(out.has('a')).toBe(false)
  })

  it('never suppresses the priority (selected) marker — it wins the collision', () => {
    const out = suppressedChipIds(
      [
        { id: 'a', x: 600, y: 500, chips: true, priority: 1 },
        { id: 'selected', x: 640, y: 505, chips: true, priority: 2 },
      ],
      OPTS,
    )
    expect(out.has('selected')).toBe(false)
    expect(out.has('a')).toBe(true)
  })

  it('lets cluster badges block chips beneath them, and never suppresses a cluster', () => {
    const out = suppressedChipIds(
      [
        { id: 'cluster-1', x: 600, y: 460, chips: false },
        { id: 'a', x: 600, y: 500, chips: true, priority: 1 },
      ],
      OPTS,
    )
    expect(out.has('a')).toBe(true)
    expect(out.has('cluster-1')).toBe(false)
  })

  it('suppresses chips that the pane edge would cut mid-word', () => {
    const out = suppressedChipIds(
      [
        { id: 'start', x: 4, y: 500, chips: true },
        { id: 'end', x: 1326, y: 500, chips: true },
        { id: 'middle', x: 660, y: 500, chips: true },
      ],
      OPTS,
    )
    expect(out.has('start')).toBe(true)
    expect(out.has('end')).toBe(true)
    expect(out.has('middle')).toBe(false)
  })

  it('skips the pass entirely above the perf floor (no O(n^2) on 1,000 markers)', () => {
    const many = Array.from({ length: 500 }, (_, i) => ({ id: `m${i}`, x: 600, y: 500, chips: true }))
    expect(suppressedChipIds(many, OPTS).size).toBe(0)
  })
})
