import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { MUTED_MAP_STYLE, mutedBasemapPalette } from '../../map/constants'
import { useMutedBasemapStyle } from './use-muted-basemap'

/**
 * useMutedBasemapStyle — SPEC v2 §1: the live-monitoring basemap defaults to
 * the MUTED style, gets the Figma palette painted onto it, and NEVER blocks
 * rendering when the network / Blob URLs are unavailable.
 */
const STYLE_JSON = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': 'rgb(1,2,3)' } }],
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useMutedBasemapStyle', () => {
  it('starts on the plain muted Positron URL (never blank, never the bright style)', () => {
    vi.stubGlobal('fetch', undefined)
    const { result } = renderHook(() => useMutedBasemapStyle())
    expect(result.current).toBe(MUTED_MAP_STYLE)
    expect(result.current).toContain('positron')
  })

  it('fetches the style, paints the Figma palette on it, and serves it as a Blob URL', async () => {
    const payloads: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => STYLE_JSON })),
    )
    // jsdom's Blob has no `.text()` and no object-URL statics — the smallest
    // stand-ins that let us read back exactly what the hook handed MapLibre.
    class RecordingBlob {
      constructor(parts: string[]) {
        payloads.push(parts.join(''))
      }
    }
    vi.stubGlobal('Blob', RecordingBlob)
    const realCreate = URL.createObjectURL
    const realRevoke = URL.revokeObjectURL
    const revoke = vi.fn()
    URL.createObjectURL = vi.fn(() => `blob:muted-${payloads.length - 1}`)
    URL.revokeObjectURL = revoke
    try {
      const { result, unmount } = renderHook(() => useMutedBasemapStyle())
      await waitFor(() => expect(result.current).toBe('blob:muted-0'))

      const patched = JSON.parse(payloads[0]!) as typeof STYLE_JSON
      expect(patched.layers[0]!.paint['background-color']).toBe(mutedBasemapPalette().land)
      // Cleanup releases the object URL rather than leaking it.
      unmount()
      expect(revoke).toHaveBeenCalledWith('blob:muted-0')
    } finally {
      URL.createObjectURL = realCreate
      URL.revokeObjectURL = realRevoke
    }
  })

  it('keeps the plain muted URL when the style fetch fails (offline / blocked)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })),
    )
    const { result } = renderHook(() => useMutedBasemapStyle())
    await waitFor(() => expect(result.current).toBe(MUTED_MAP_STYLE))
  })
})
