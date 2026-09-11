import { useEffect, useState } from 'react'
import { resolveToken } from './chart-axis'

/**
 * chart-color — the ONE place an AUTHORED colour string is turned into a
 * literal a renderer can paint with.
 *
 * WHY THIS EXISTS. `resolveToken` (in `chart-axis.ts`) resolves a custom
 * property this repo names itself, so its argument is always a bare
 * `--token`. But blueprint/business data carries colour the other way round:
 * an author writes `"var(--color-error-500)"` (or `"var(--x, #f04438)"`, or a
 * plain hex, or `"tomato"`) into JSON, and that string lands on
 * `Gauge.sectors[].color`, `HeatmapChart.bins[].color`,
 * `AreaChart.series[].color`, `DonutChart` slice overrides, map legend
 * swatches. ECharts paints through an imperative canvas/SVG API and MapLibre/
 * deck.gl through WebGL — none of them run the CSS cascade, so a live
 * `var(...)` reaches them as an unparseable string and is painted as BLACK
 * (the observed all-black gauge arc / uniform-grey heatmap defect).
 *
 * `resolveCssColor` is therefore the single sanctioned bridge for
 * DATA-supplied colour, as `resolveToken` is for SOURCE-supplied tokens. It
 * accepts everything an author can legally write:
 *   - `var(--token)`                → the token's current computed value
 *   - `var(--token, <fallback>)`    → the fallback (itself resolved) when the
 *                                     token is undefined; nests up to
 *                                     `MAX_VAR_DEPTH` levels
 *   - `#rgb` / `#rrggbb` / `rgb()` / `hsl()` / `tomato` → passed through
 *   - `undefined` / empty           → the caller's `fallback`
 *
 * THEME/TENANT CHANGES. A resolved literal is a snapshot: flipping
 * `data-theme` or `data-tenant` on `<html>` changes what the token means but
 * cannot change a string already handed to a canvas. `useThemeVersion()`
 * returns a counter that increments on exactly those attribute changes —
 * include it in the `useMemo` deps that build a chart `option` and the colours
 * re-resolve on the next paint.
 */

/** A whole-string `var(--name[, fallback])` expression. */
const VAR_EXPRESSION = /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+?))?\s*\)$/

/** How many nested `var(--a, var(--b, …))` levels are followed before giving up. */
const MAX_VAR_DEPTH = 4

/** Attributes that change what a token resolves to. */
const THEME_ATTRIBUTES = ['data-theme', 'data-tenant', 'class', 'style'] as const

function resolveAt(value: string, fallback: string, depth: number): string {
  const trimmed = value.trim()
  if (!trimmed) return fallback
  // Not a bare `var(...)` — a literal (`#f04438`, `rgb(…)`, `tomato`) or a
  // compound expression (a gradient) this helper deliberately does not rewrite.
  if (!trimmed.startsWith('var(')) return trimmed
  const match = VAR_EXPRESSION.exec(trimmed)
  if (!match) return fallback
  const [, name, authoredFallback] = match
  const resolved = resolveToken(name, '')
  if (resolved) return resolved
  if (authoredFallback && depth < MAX_VAR_DEPTH) return resolveAt(authoredFallback, fallback, depth + 1)
  return fallback
}

/**
 * Resolves an author-supplied colour string to a literal a canvas/WebGL
 * renderer can paint. See the module doc for the accepted forms.
 *
 * @param value    the authored colour, or `undefined`
 * @param fallback literal used when `value` is absent or resolves to nothing —
 *                 always pass a `resolveToken(...)`-derived value, never a hex
 */
export function resolveCssColor(value: string | undefined, fallback: string): string {
  if (value === undefined || value === null) return fallback
  return resolveAt(String(value), fallback, 0)
}

/**
 * Increments whenever the document's theme/tenant changes, so memoised
 * resolved colours re-run. Returns `0` and never updates where there is no
 * DOM (SSR, or a test environment without `MutationObserver`).
 */
export function useThemeVersion(): number {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return
    const observer = new MutationObserver(() => setVersion((current) => current + 1))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: [...THEME_ATTRIBUTES] })
    return () => observer.disconnect()
  }, [])
  return version
}
