import { describe, expect, it } from 'vitest'
import { computeOverflow } from './overflow'

const LOTS = ['Lot 1', 'Lot 2', 'Lot 3', 'Lot 4', 'Lot 5']
/** The injectable measurer — the whole point of the DOM-free contract. */
const byLength = (s: string) => s.length

describe('computeOverflow', () => {
  it('shows everything and hides nothing when no budget is given', () => {
    expect(computeOverflow(LOTS)).toEqual({ visible: LOTS, hiddenCount: 0 })
  })

  it('caps by maxVisible', () => {
    expect(computeOverflow(LOTS, { maxVisible: 2 })).toEqual({
      visible: ['Lot 1', 'Lot 2'],
      hiddenCount: 3,
    })
  })

  it('an explicit maxVisible of 0 collapses everything behind +N', () => {
    expect(computeOverflow(LOTS, { maxVisible: 0 })).toEqual({ visible: [], hiddenCount: 5 })
  })

  it('greedily fills a width budget using the injected measurer', () => {
    // Each label measures 5; a budget of 12 fits two, not three.
    expect(computeOverflow(LOTS, { maxWidth: 12, measure: byLength })).toEqual({
      visible: ['Lot 1', 'Lot 2'],
      hiddenCount: 3,
    })
  })

  it('charges the gap BETWEEN items only', () => {
    // 5 + 2 + 5 = 12 fits; adding a third would need 19.
    expect(computeOverflow(LOTS, { maxWidth: 12, measure: byLength, gap: 2 }).visible).toHaveLength(2)
    expect(computeOverflow(LOTS, { maxWidth: 11, measure: byLength, gap: 2 }).visible).toHaveLength(1)
  })

  it('hides nothing when the whole list fits', () => {
    expect(computeOverflow(LOTS, { maxWidth: 100, measure: byLength })).toEqual({
      visible: LOTS,
      hiddenCount: 0,
    })
  })

  it('charges `reserve` for the +N badge only when there is real overflow', () => {
    // Fits exactly — no badge is drawn, so no room is taken from the labels.
    const exact = computeOverflow(LOTS, { maxWidth: 25, measure: byLength, reserve: 4 })
    expect(exact).toEqual({ visible: LOTS, hiddenCount: 0 })
    // One over: the badge appears and eats into the label budget.
    const over = computeOverflow(LOTS, { maxWidth: 24, measure: byLength, reserve: 10 })
    expect(over.visible).toEqual(['Lot 1', 'Lot 2'])
    expect(over.hiddenCount).toBe(3)
  })

  it('keeps at least minVisible items even when the first one blows the budget', () => {
    expect(computeOverflow(LOTS, { maxWidth: 1, measure: byLength })).toEqual({
      visible: ['Lot 1'],
      hiddenCount: 4,
    })
    expect(computeOverflow(LOTS, { maxWidth: 1, measure: byLength, minVisible: 0 })).toEqual({
      visible: [],
      hiddenCount: 5,
    })
  })

  it('applies both budgets, tightest wins', () => {
    expect(computeOverflow(LOTS, { maxVisible: 4, maxWidth: 12, measure: byLength }).visible).toHaveLength(2)
    expect(computeOverflow(LOTS, { maxVisible: 1, maxWidth: 100, measure: byLength }).visible).toHaveLength(1)
  })

  it('handles an empty list', () => {
    expect(computeOverflow([], { maxVisible: 3 })).toEqual({ visible: [], hiddenCount: 0 })
  })

  it('is generic over item shape — a measurer may read any field', () => {
    const chips = [{ label: 'aaa' }, { label: 'bb' }, { label: 'c' }]
    const result = computeOverflow(chips, { maxWidth: 5, measure: (c) => c.label.length })
    expect(result.visible).toEqual([{ label: 'aaa' }, { label: 'bb' }])
    expect(result.hiddenCount).toBe(1)
  })

  it('never mutates the input', () => {
    const input = [...LOTS]
    computeOverflow(input, { maxVisible: 1 })
    expect(input).toEqual(LOTS)
  })
})
