import { describe, expect, it } from 'vitest'
import {
  BRIGHT_MAP_STYLE,
  DEFAULT_MAP_STYLE,
  MUTED_MAP_STYLE,
  applyMutedBasemapPaint,
  mutedBasemapPalette,
} from './constants'

/**
 * SPEC v2 §1 muted basemap: the default style is the muted Positron (never
 * the saturated Liberty), and `applyMutedBasemapPaint` tints a fetched style
 * JSON to the Figma palette — pure, unknown layers untouched.
 */
describe('map style constants', () => {
  it('defaults to the MUTED style; Liberty stays available as the bright alternate', () => {
    expect(DEFAULT_MAP_STYLE).toBe(MUTED_MAP_STYLE)
    expect(MUTED_MAP_STYLE).toContain('positron')
    expect(BRIGHT_MAP_STYLE).toContain('liberty')
  })
})

describe('applyMutedBasemapPaint', () => {
  const style = {
    version: 8,
    sources: {},
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': 'rgb(242,243,240)' } },
      { id: 'ne2', type: 'raster', paint: {} },
      { id: 'water', type: 'fill', 'source-layer': 'water', paint: { 'fill-color': 'rgb(194,200,202)' } },
      { id: 'park', type: 'fill', 'source-layer': 'park', paint: { 'fill-color': 'rgb(230,233,229)' } },
      { id: 'highway_major_casing', type: 'line', 'source-layer': 'transportation', paint: { 'line-color': 'rgb(213,213,213)' } },
      { id: 'highway_major_inner', type: 'line', 'source-layer': 'transportation', paint: { 'line-color': 'red' } },
      { id: 'waterway', type: 'line', 'source-layer': 'waterway', paint: { 'line-color': 'grey' } },
      { id: 'label_city', type: 'symbol', 'source-layer': 'place', paint: { 'text-color': 'black' } },
      { id: 'building', type: 'fill', 'source-layer': 'building', paint: { 'fill-color': 'rgb(234,234,229)' } },
      { id: 'something-custom', type: 'custom' },
    ],
  }

  const palette = mutedBasemapPalette()
  const patched = applyMutedBasemapPaint(style) as typeof style
  const paintOf = (id: string) => patched.layers.find((l) => l.id === id)?.paint as Record<string, unknown>

  it('tints land, water, roads, casings, and labels to the Figma palette', () => {
    expect(paintOf('background')['background-color']).toBe(palette.land)
    expect(paintOf('water')['fill-color']).toBe(palette.water)
    expect(paintOf('waterway')['line-color']).toBe(palette.water)
    expect(paintOf('park')['fill-color']).toBe(palette.land)
    expect(paintOf('highway_major_casing')['line-color']).toBe(palette.casing)
    expect(paintOf('highway_major_inner')['line-color']).toBe(palette.road)
    expect(paintOf('label_city')['text-color']).toBe(palette.label)
    expect(paintOf('label_city')['text-halo-color']).toBe(palette.halo)
    expect(paintOf('ne2')['raster-opacity']).toBe(0)
  })

  it('leaves unrecognized layers and other keys untouched, never mutating the input', () => {
    expect(patched.layers.find((l) => l.id === 'something-custom')).toEqual({ id: 'something-custom', type: 'custom' })
    expect(patched.layers.find((l) => l.id === 'building')?.paint).toEqual({ 'fill-color': 'rgb(234,234,229)' })
    expect(patched.version).toBe(8)
    // Purity: the source object kept its original values.
    expect(style.layers.find((l) => l.id === 'background')?.paint?.['background-color']).toBe('rgb(242,243,240)')
    expect(style.layers.find((l) => l.id === 'ne2')?.paint).toEqual({})
  })

  it('passes non-style values through unchanged', () => {
    expect(applyMutedBasemapPaint(null)).toBeNull()
    expect(applyMutedBasemapPaint('nope')).toBe('nope')
    expect(applyMutedBasemapPaint({ layers: 'x' })).toEqual({ layers: 'x' })
  })
})
