import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8')

/**
 * REGRESSION LOCK — UX MUST L.60 (`prefers-reduced-motion: reduce`).
 *
 * A previous fix wave added `motion-reduce:animate-none` to the Sheet
 * primitive and it had NO effect: the compiled utility is a single class
 * (`.motion-reduce\:animate-none`, specificity 0-1-0) and it has to beat
 * `.data-\[state\=open\]\:animate-in[data-state="open"]` (0-2-0), which it
 * cannot do at any source order. The platform-wide `!important` override in
 * `animations.css` is the fix, and this test keeps it there — it is the only
 * reduced-motion rule in the stylesheet set that we own (everything else is
 * vendor CSS from sonner / MapLibre).
 */
describe('animations.css — reduced motion', () => {
  const css = read('../animations.css')

  it('ships a global prefers-reduced-motion override', () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  })

  it('collapses animation and transition durations with !important', () => {
    const block = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/.exec(css)
    expect(block, 'reduced-motion media block missing').not.toBeNull()
    const body = block[1]
    expect(body).toMatch(/animation-duration:\s*0\.01ms\s*!important/)
    expect(body).toMatch(/animation-iteration-count:\s*1\s*!important/)
    expect(body).toMatch(/transition-duration:\s*0\.01ms\s*!important/)
  })

  it('never uses `animation: none` (breaks Radix animationend unmount)', () => {
    const block = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/.exec(css)
    expect(block[1]).not.toMatch(/animation:\s*none/)
  })

  /**
   * P0-1 — decorative motion collapses, ESSENTIAL status motion survives.
   * WCAG 2.3.3 governs interaction animation; a loading spinner is an
   * essential status indicator and must keep spinning, otherwise a
   * reduced-motion user gets a frozen glyph and no progress signal.
   */
  describe('essential-motion opt-out', () => {
    const block = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/.exec(css)
    const body = block[1]

    it('scopes the universal reset to exclude [data-motion="essential"]', () => {
      expect(body).toMatch(
        /\*:not\(\[data-motion="essential"\]\),\s*\n\s*\*:not\(\[data-motion="essential"\]\)::before,\s*\n\s*\*:not\(\[data-motion="essential"\]\)::after/,
      )
    })

    it('leaves no bare universal selector that would re-freeze essential motion', () => {
      // A bare `*` (not followed by `:not(`, `::`, or `/`) would out-scope the guard.
      const selectors = body.split('{')[0]
      expect(selectors).not.toMatch(/(^|[\s,])\*(?![:*])/)
    })

    it('still collapses decorative motion (the reset survives the scoping)', () => {
      expect(body).toMatch(/animation-duration:\s*0\.01ms\s*!important/)
      expect(body).toMatch(/animation-iteration-count:\s*1\s*!important/)
      expect(body).toMatch(/transition-duration:\s*0\.01ms\s*!important/)
    })

    it('every platform spinner is tagged data-motion="essential"', () => {
      const spinners = [
        '../../ui-kit/src/primitives/Button.tsx',
        '../../ui-kit/src/composites/Combobox.tsx',
        '../../ui-kit/src/composites/TagPicker.tsx',
        '../../ui-kit/src/composites/FileUploader.tsx',
        '../../ui-kit/src/composites/FileUploaderItems.tsx',
        '../../v5-templates/src/views/cockpit/CockpitFlows.tsx',
      ]
      for (const path of spinners) {
        const src = read(path)
        for (const line of src.split('\n')) {
          if (!line.includes('animate-spin')) continue
          expect(line, `${path}: untagged spinner → ${line.trim()}`).toContain(
            'data-motion="essential"',
          )
        }
      }
    })
  })
})
