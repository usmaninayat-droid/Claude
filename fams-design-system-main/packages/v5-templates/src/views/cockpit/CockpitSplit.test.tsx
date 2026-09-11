import { describe, expect, it } from 'vitest'
import { clampListPct } from './CockpitSplit'

/**
 * REGRESSION LOCK — UX MUST E.19, the SYMMETRIC pane floors.
 *
 * Round 2 shipped the queue floor (320px) but not the map floor: the ceiling
 * was computed as `100 - (360 / container) * 100`, which forgets that the
 * 16px splitter column belongs to NEITHER pane. At 1280 (a 1186px content
 * area) that left the map at 342px — 18px under its 360px floor. These
 * assertions are written in PIXELS, the unit the MUST is stated in, so a
 * percentage refactor cannot quietly re-break them.
 */
const SEPARATOR = 16
const LIST_FLOOR = 320
const MAP_FLOOR = 360

/** Resolve a clamped share back into the two real pane widths. */
function panes(pct: number, container: number) {
  const clamped = clampListPct(pct, container)
  const list = (clamped / 100) * container
  return { pct: clamped, list, map: container - SEPARATOR - list }
}

describe('clampListPct', () => {
  it('holds the 320px queue floor at 1280 (1186px content area)', () => {
    const { list } = panes(0, 1186)
    expect(list).toBeGreaterThanOrEqual(LIST_FLOOR - 0.5)
    expect(list).toBeLessThan(LIST_FLOOR + 1)
  })

  it('holds the 360px MAP floor at 1280 — the round-2 regression', () => {
    const { map, list } = panes(100, 1186)
    expect(map).toBeGreaterThanOrEqual(MAP_FLOOR - 0.5)
    // The queue caps at ~810px, not the 826px the separator-blind clamp gave.
    expect(list).toBeLessThan(815)
  })

  it('holds both floors at 1440 (1346px content area)', () => {
    expect(panes(0, 1346).list).toBeGreaterThanOrEqual(LIST_FLOOR - 0.5)
    expect(panes(100, 1346).map).toBeGreaterThanOrEqual(MAP_FLOOR - 0.5)
  })

  it('never lets either pane cross its floor across a width sweep', () => {
    for (let container = 800; container <= 2400; container += 37) {
      for (const requested of [-50, 0, 26, 40, 70, 100, 150]) {
        const { list, map } = panes(requested, container)
        if (container - SEPARATOR < LIST_FLOOR + MAP_FLOOR) continue // no feasible split
        expect(list, `list @${container}`).toBeGreaterThanOrEqual(LIST_FLOOR - 0.5)
        expect(map, `map @${container}`).toBeGreaterThanOrEqual(MAP_FLOOR - 0.5)
      }
    }
  })

  it('keeps the 26–70% percentage clamp when both floors are slack', () => {
    expect(clampListPct(10, 4000)).toBeCloseTo(26, 5)
    expect(clampListPct(90, 4000)).toBeLessThanOrEqual(70)
    expect(clampListPct(40, 4000)).toBeCloseTo(40, 5)
  })

  it('falls back to the percentage clamp when the container is unmeasured', () => {
    expect(clampListPct(40, 0)).toBe(40)
    expect(clampListPct(5, 0)).toBe(26)
    expect(clampListPct(99, 0)).toBe(70)
  })
})
