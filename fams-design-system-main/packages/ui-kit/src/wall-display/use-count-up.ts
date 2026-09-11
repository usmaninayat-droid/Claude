import { useEffect, useRef, useState } from 'react'

/**
 * Count a metric up from zero on mount, settling on the EXACT target (never a
 * rounded-off approximation) after 800ms of cubic ease-out.
 *
 * Pass `animate = false` — typically `!usePrefersReducedMotion()` — to render
 * the target immediately with no animation at all.
 */
export function useCountUp(target: number, animate: boolean): number {
  const [value, setValue] = useState(animate ? 0 : target)
  const raf = useRef<number | null>(null)
  useEffect(() => {
    if (!animate) {
      setValue(target)
      return
    }
    const started = performance.now()
    const duration = 800
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current)
    }
  }, [target, animate])
  return value
}
