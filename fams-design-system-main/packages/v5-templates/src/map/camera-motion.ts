/**
 * camera-motion — `prefers-reduced-motion` for the map's PROGRAMMATIC camera
 * moves (round-6 UX gate U4 / UX-NOTES F44 [SHOULD], WCAG 2.3.3).
 *
 * Every animated camera move in the map module is a full-viewport translate
 * and scale of a pane that can be 1300×1000 — the largest motion the design
 * system produces, and the one with genuine vestibular weight. Until this
 * landed, nothing in the map, the templates or the primitives consulted the
 * user's preference: the only reduced-motion branch in either package was
 * `ChartContainer`'s ECharts switch, and the two `@media
 * (prefers-reduced-motion)` rules reachable from a running page were both
 * third-party (sonner's and MapLibre's own).
 *
 * The preference is read at CALL TIME rather than captured into state, so a
 * mid-session OS-level flip is honoured with no listener to unsubscribe.
 *
 * Colour/opacity micro-transitions are deliberately NOT covered: 2.3.3 is
 * about motion animation, and killing hover tints would be a different (and
 * worse) change.
 */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

/**
 * Spreadable duration for a MapLibre `easeTo`/`flyTo`/`fitBounds`/`panBy`
 * options object: `{ duration: 0 }` (an instant jump to the same destination —
 * the camera still goes where it was going) when the user asks for reduced
 * motion, otherwise the caller's own duration, or NOTHING at all when the
 * caller had none.
 *
 * The empty-object branch is load-bearing: MapLibre merges the caller's
 * options over its defaults, so an explicit `duration: undefined` would
 * OVERWRITE the 500ms default with `undefined` rather than fall back to it.
 *
 * Behaviour with no preference set is byte-identical to before this existed,
 * which is what keeps it safe on shared surface (every `MapPanel` consumer —
 * the dashboard widgets, asset/ticketing location maps, FAMS Desk).
 */
export function cameraMotion(duration?: number): { duration?: number } {
  if (prefersReducedMotion()) return { duration: 0 }
  return duration === undefined ? {} : { duration }
}
