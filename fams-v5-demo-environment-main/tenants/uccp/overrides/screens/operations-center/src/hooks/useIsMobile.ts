import { useEffect, useState } from 'react'

/**
 * Reports whether the viewport is below `maxWidth` (default 640px, Tailwind's
 * `sm` breakpoint). The desktop rail and the mobile top-bar/bottom-tab-bar
 * layout swap based on this — anything at or above the breakpoint keeps the
 * primary rail.
 */
export function useIsMobile(maxWidth = 640): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(`(max-width: ${maxWidth - 1}px)`).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth - 1}px)`)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [maxWidth])

  return isMobile
}
