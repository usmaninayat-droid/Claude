import { describe, it, expect } from 'vitest'
import { humanizeEnumValue, formatFigmaDate } from './renderers'

/**
 * Round 5's visual gate found machine enum keys reaching the user verbatim
 * (`jobOrderCreated` in the PM sheet, `reported-issues` in the job order
 * sheet) while the same record's header pill showed the blueprint label.
 * These pin the narrowness of the fix as much as the fix itself: an
 * already-human value must survive untouched.
 */
describe('humanizeEnumValue', () => {
  it('humanizes camelCase pipeline keys', () => {
    expect(humanizeEnumValue('jobOrderCreated')).toBe('Job Order Created')
  })

  it('humanizes kebab and snake keys', () => {
    expect(humanizeEnumValue('reported-issues')).toBe('Reported Issues')
    expect(humanizeEnumValue('under-inspection')).toBe('Under Inspection')
    expect(humanizeEnumValue('in_progress')).toBe('In Progress')
  })

  it('leaves already-human and acronym values alone', () => {
    for (const value of ['CNG', 'Brake Inspection', 'Non-Compliant', 'Tanker', 'hazmat', 'fired']) {
      expect(humanizeEnumValue(value)).toBe(value)
    }
  })

  it('is idempotent', () => {
    const once = humanizeEnumValue('jobOrderCreated')
    expect(humanizeEnumValue(once)).toBe(once)
  })
})

describe('formatFigmaDate', () => {
  it('renders the day/short-month/year shape the rest of the app uses', () => {
    expect(formatFigmaDate(new Date('2026-08-28T00:00:00'), false)).toBe('28 Aug, 2026')
  })

  it('appends 24h time only when asked', () => {
    expect(formatFigmaDate(new Date('2026-08-28T13:05:00'), true)).toBe('28 Aug, 2026 13:05')
  })
})
