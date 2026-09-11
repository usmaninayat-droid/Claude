import { describe, expect, it } from 'vitest'
import { middleTruncate } from './dataTableCellText'

/**
 * `middleTruncate` is `DataTable`'s "variable-id" content-type fallback: when
 * a value is too long even for 2 wrapped lines, it collapses to ONE line
 * with the middle dropped — never the end — so the differentiating tail of
 * a name/id stays visible (`DataTableColumnContentType`'s doc comment in
 * `DataTable.types.ts` has the full rule). Rendering itself is covered via
 * `DataTable.test.tsx`'s `column.contentType` suite (jsdom has no real text
 * metrics, so these tests exercise the measurement-driven algorithm
 * directly against a stubbed monospace-ish width function via a real
 * canvas-less environment: the module's own jsdom/SSR fallback, a per-char
 * estimate, still keeps the algorithm's invariants — same length in,
 * shorter length out, both ends preserved).
 */
describe('middleTruncate', () => {
  const FONT = '400 14px Gilroy, sans-serif'

  it('returns the original text unchanged when it already fits', () => {
    expect(middleTruncate('short', 1000, FONT)).toBe('short')
  })

  it('drops characters from the MIDDLE, keeping both the start and the end', () => {
    const text = 'A'.repeat(200)
    const result = middleTruncate(text, 50, FONT)
    expect(result).toContain('…')
    expect(result.length).toBeLessThan(text.length)
    expect(result.startsWith('A')).toBe(true)
    expect(result.endsWith('A')).toBe(true)
    // Never end-truncated: the ellipsis is not at the very end of the string.
    expect(result.endsWith('…')).toBe(false)
  })

  it('never grows longer than the original text', () => {
    const text = 'Kareem Haddad bin Vehicle AUH-30188'
    const result = middleTruncate(text, 10, FONT)
    expect(result.length).toBeLessThanOrEqual(text.length)
  })

  it('collapses to a bare ellipsis when even one character does not fit', () => {
    expect(middleTruncate('Anything', 0.0001, FONT)).toBe('…')
  })

  it('is stable — truncating an already-truncated result at the same width is a no-op', () => {
    const text = 'B'.repeat(300)
    const once = middleTruncate(text, 40, FONT)
    const twice = middleTruncate(once, 40, FONT)
    expect(twice).toBe(once)
  })
})
