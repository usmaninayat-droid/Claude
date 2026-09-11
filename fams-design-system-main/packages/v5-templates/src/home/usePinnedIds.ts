import { useCallback, useEffect, useState } from 'react'

/**
 * usePinnedIds — locally-persisted pin list for `HomeLaunchPad`.
 *
 * Reads the pin list from `localStorage[storageKey]` once (lazily, SSR-safe),
 * writes it back on every change, and toggles with newest-first ordering —
 * the prototype's behavior. Invalid/absent storage falls back to `defaults`.
 *
 * The launch pad itself stays state-agnostic (`pinnedIds` + `onTogglePin`
 * props); this hook is the reference persistence wiring for hosts.
 */
export function usePinnedIds(
  storageKey: string,
  defaults: string[] = [],
): [string[], (id: string) => void] {
  const [pins, setPins] = useState<string[]>(() => {
    if (typeof window === 'undefined') return defaults
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) return parsed
      }
    } catch {
      /* malformed storage → defaults */
    }
    return defaults
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(pins))
    } catch {
      /* storage unavailable (private mode/quota) — pins stay in-memory */
    }
  }, [storageKey, pins])

  const toggle = useCallback((id: string) => {
    setPins((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]))
  }, [])

  return [pins, toggle]
}
