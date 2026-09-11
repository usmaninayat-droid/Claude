import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  buildSourceColorMaps,
  buildCompiledColorMaps,
  runChecks,
  contrastRatio,
  parseColor,
} from '../scripts/contrast-lib.mjs'

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8')

/**
 * Vitest coverage for the token contrast/sanity guard (see
 * scripts/contrast-lib.mjs header for the full bug-report background).
 *
 * `scripts/check-contrast.mjs` is the CLI entry wired into `pnpm lint`; this
 * file gives the SAME checks a home in `pnpm test` too (and in editors/CI
 * views that surface Vitest failures more prominently than a lint script),
 * and adds direct unit coverage of the contrast maths + a regression pin for
 * the exact bug class described in the task: `theme-parity.test.js` only
 * ever asserted a dark counterpart EXISTS, never that it's legible or
 * distinct — this file is the assertion that closes that gap.
 */

describe('token contrast/sanity guard — maths', () => {
  it('computes known WCAG contrast ratios correctly', () => {
    // Pure black on pure white = 21:1 (textbook max ratio).
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
    // A color against itself = 1:1.
    expect(contrastRatio('#667085', '#667085')).toBeCloseTo(1, 5)
    // Order shouldn't matter.
    expect(contrastRatio('#101828', '#f9fafb')).toBeCloseTo(contrastRatio('#f9fafb', '#101828'), 5)
  })

  it('parses hex short/long/alpha and rgb()/hsl(), and fails loudly on unsupported formats', () => {
    expect(parseColor('#fff')).toMatchObject({ r: 255, g: 255, b: 255 })
    expect(parseColor('#101828')).toMatchObject({ r: 16, g: 24, b: 40 })
    expect(parseColor('rgb(16, 24, 40)')).toMatchObject({ r: 16, g: 24, b: 40 })
    expect(parseColor('hsl(0, 0%, 0%)')).toMatchObject({ r: 0, g: 0, b: 0 })
    expect(() => parseColor('oklch(0.5 0.1 250)')).toThrow(/UNSUPPORTED COLOR FORMAT/)
    expect(() => parseColor('papayawhip')).toThrow(/UNSUPPORTED COLOR FORMAT/)
  })
})

describe('token contrast/sanity guard — against the real repo state', () => {
  it('source tokens/core.tokens.json passes every declared check', () => {
    const json = JSON.parse(read('../tokens/core.tokens.json'))
    const failures = runChecks(buildSourceColorMaps(json), 'tokens/core.tokens.json')
    expect(failures.map((f) => f.message)).toEqual([])
  })

  it('dist/theme.css passes every declared check', () => {
    const css = read('../dist/theme.css')
    const maps = buildCompiledColorMaps(css, {
      lightMarker: '@theme static {',
      darkMarker: ':root[data-theme="dark"] {',
    })
    const failures = runChecks(maps, 'dist/theme.css')
    expect(failures.map((f) => f.message)).toEqual([])
  })

  it('dist/tokens.css passes every declared check', () => {
    const css = read('../dist/tokens.css')
    const maps = buildCompiledColorMaps(css, {
      lightMarker: ':root {',
      darkMarker: ':root[data-theme="dark"] {',
    })
    const failures = runChecks(maps, 'dist/tokens.css')
    expect(failures.map((f) => f.message)).toEqual([])
  })

  it('regression pin: dark.input is no longer the collided #667085 value', () => {
    const json = JSON.parse(read('../tokens/core.tokens.json'))
    const { light, dark } = buildSourceColorMaps(json)
    expect(dark.get('input')).not.toBe('#667085')
    expect(dark.get('input')).not.toBe(dark.get('border'))
    expect(dark.get('input')).not.toBe(dark.get('muted-foreground'))
    expect(dark.get('input')).not.toBe(dark.get('sidebar-border'))
    expect(dark.get('input')).not.toBe(light.get('input'))
  })
})
