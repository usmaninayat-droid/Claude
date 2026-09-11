import { useState } from 'react'

/**
 * Read the user's reduced-motion preference once, at mount.
 *
 * Deliberately NOT reactive: wall-display surfaces run unattended for hours
 * and every consumer uses this to decide whether an entrance animation should
 * play at all. Re-reading mid-session would restart animations on a screen
 * nobody is looking at. Returns `false` outside a DOM environment (SSR/tests).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  return reduced
}
