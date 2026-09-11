/**
 * color.ts — token → literal color resolution for `MapPanel`'s GPU layers.
 *
 * MapLibre GL paint properties, deck.gl accessor colors, and TerraDraw's
 * feature styling are all read by WebGL/canvas renderers the browser's CSS
 * cascade never touches — a live `var(--color-primary)` string means nothing
 * to them (deck.gl expects a literal `[r,g,b,a]` tuple; TerraDraw expects a
 * literal `#rrggbb` hex). Any color that reaches those APIs MUST be resolved
 * to a concrete value first. Colors that stay in the DOM (legend chips,
 * control buttons, the fallback card) can keep `className`/`var(...)` as-is —
 * the browser resolves those natively, same as everywhere else in the DS.
 *
 * `resolveToken(name, fallback)` mirrors the established pattern in
 * `@fams/ui-kit`'s `Gauge.tsx`/`ComplianceGauge.tsx` (ECharts needs the same
 * thing for its canvas/SVG renderer) — same signature, same SSR/no-stylesheet
 * fallback behavior, so `scripts/lint-tokens.mjs`'s `resolveToken(...)`
 * exemption (a byte-for-byte call-shape match, see that file's header)
 * applies here too. Every default-color literal in this whole module lives
 * ONLY inside a `resolveToken(...)` call for exactly that reason — every
 * OTHER file in `map/` calls the named `default*Color()` resolvers below (or
 * the `*Rgba`/`*Hex` wrappers), never a bare hex literal, so the "no raw hex
 * in component source" rule holds file-by-file, not just here.
 */

import { resolveCssColor } from '@fams/ui-kit'

/** Resolves a CSS custom property to its current literal value. Falls back to
 *  the given literal when no style engine is available (SSR, or a test
 *  environment with no stylesheet loaded) — the fallback must match the
 *  token's real default value (see each call site). */
export function resolveToken(name: string, fallback: string): string {
  if (typeof document === 'undefined' || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return fallback
  }
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

/* ── Named default-color resolvers — the only place a fallback hex literal
 * may appear, each pinned to its `core.tokens.json` value at time of writing
 * (re-check if the token's default ever changes). ───────────────────────── */
export const defaultMarkerColor = (): string => resolveToken('--color-primary', '#0072d6')
export const defaultZoneColor = (): string => resolveToken('--color-success', '#12b76a')
export const defaultDrawColor = (): string => resolveToken('--color-primary', '#0072d6')
export const defaultMutedColor = (): string => resolveToken('--color-muted-foreground', '#667085')
export const defaultSurfaceColor = (): string => resolveToken('--color-card', '#ffffff')

/** Parses `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa` into a `[r,g,b,a]` tuple
 *  (0-255, alpha 0-1). Falls back to `defaultMutedColor()` for anything that
 *  isn't a hex string (e.g. an unresolved `rgb(...)`/named color slipped
 *  through — callers should always feed this a token-resolved hex). */
export function hexToRgba(hex: string, alpha = 1): [number, number, number, number] {
  const m = /^#?([0-9a-fA-F]{3,8})$/.exec(hex.trim())
  const h0 = m ? m[1] : /^#?([0-9a-fA-F]{6})$/.exec(defaultMutedColor())![1]
  const h = h0.length === 3 || h0.length === 4 ? h0.split('').map((c) => c + c).join('') : h0
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : alpha
  return [r, g, b, Math.round(a * 255)]
}

/** Resolves a raw `var(--token[, fallback])` string to its literal value —
 *  for when business data itself carries a token reference rather than an
 *  already-resolved color. Non-`var(...)` input passes through unchanged.
 *
 *  Delegates to `@fams/ui-kit`'s `resolveCssColor`, the ONE implementation of
 *  authored-colour resolution in the system (it handles nested
 *  `var(--a, var(--b, …))` fallbacks too) — this module keeps only what is
 *  genuinely map-specific: turning that literal into the `[r,g,b,a]` tuple
 *  deck.gl needs. */
function resolveLiveVar(value: string): string {
  return resolveCssColor(value, defaultMutedColor())
}

/** Resolves a data-supplied color (business data — a hex literal, a named
 *  CSS color, or a `var(--token)` string) to a hex literal, falling back to
 *  `fallback()` (a `default*Color` resolver) when `color` is omitted. */
export function resolveDataColor(color: string | undefined, fallback: () => string): string {
  return color ? resolveLiveVar(color) : fallback()
}

/** Resolves a data-supplied color straight to a deck.gl-ready RGBA tuple. */
export function colorToRgba(color: string | undefined, fallback: () => string, alpha = 1): [number, number, number, number] {
  return hexToRgba(resolveDataColor(color, fallback), alpha)
}
