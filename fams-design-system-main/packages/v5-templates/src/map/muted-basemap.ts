import { useEffect, useState } from 'react'
import { MUTED_MAP_STYLE, applyMutedBasemapPaint } from './constants'

/**
 * useMutedBasemapStyle — resolves the live-monitoring MUTED basemap style
 * (SPEC v2 §1: land `#F9F5ED`, water `#AEE0F4`, white roads with a grey
 * casing, grey labels).
 *
 * Why the map entry needs its own copy of this hook: `LiveMapView`'s
 * `styleUrl` was OPTIONAL, and a caller that omitted it (the map-only view)
 * fell through to `MapPanel`'s `DEFAULT_MAP_STYLE` — raw Positron, i.e. the
 * fully de-saturated grey basemap round-1 QA flagged (visual #8 / UX finding
 * 2). De-saturation is SPEC's LOADING treatment (495:25945); it must never be
 * the resting state, so `LiveMapView` now resolves this style itself instead
 * of depending on every caller to pass one. `views/live/use-muted-basemap.ts`
 * used to be a second, identical copy of this hook on the light-barrel side;
 * it is now a plain RE-EXPORT of this one, so there is a single
 * implementation. Do not "re-sync" a duplicate — there isn't one.
 *
 * Fetches the free OpenFreeMap Positron style, patches its paint properties,
 * and serves the result as a Blob URL MapLibre loads through the ordinary
 * string `styleUrl` chain. Falls back to the plain Positron URL when
 * fetch/Blob are unavailable (jsdom, SSR, offline) — never blocks rendering.
 */
export function useMutedBasemapStyle(): string {
  const [url, setUrl] = useState(MUTED_MAP_STYLE)

  useEffect(() => {
    if (
      typeof fetch !== 'function' ||
      typeof URL === 'undefined' ||
      typeof URL.createObjectURL !== 'function' ||
      typeof Blob === 'undefined'
    ) {
      return
    }
    const controller = new AbortController()
    let objectUrl: string | null = null
    let cancelled = false
    fetch(MUTED_MAP_STYLE, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`basemap style ${res.status}`))))
      .then((style: unknown) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(
          new Blob([JSON.stringify(applyMutedBasemapPaint(style))], { type: 'application/json' }),
        )
        setUrl(objectUrl)
      })
      .catch(() => {
        /* offline / aborted → keep the plain muted Positron URL */
      })
    return () => {
      cancelled = true
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [])

  return url
}
