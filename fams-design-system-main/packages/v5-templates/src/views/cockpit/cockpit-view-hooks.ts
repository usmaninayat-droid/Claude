import { useEffect, useMemo, type RefObject } from 'react'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { deriveCockpitPaths } from './cockpit-model'

/**
 * The cockpit view's non-visual machinery: map geometry derivation and the
 * three DOM-level behaviours it owns (shell scroll lock, bring-into-view on
 * selection, focus restore when the popup closes). Extracted from
 * `CockpitView` (rule 12) so that file is composition + state only.
 */

/** Locks the page's real scroller (`module-view-shell-body`) while a sheet is
 *  open — Radix only locks `<body>`, which is not this layout's scroller
 *  (UX MUST J.48). */
export function useShellScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return
    const el = document.querySelector<HTMLElement>('[data-slot="module-view-shell-body"]')
    if (!el) return
    const prev = el.style.overflow
    el.style.overflow = 'hidden'
    return () => {
      el.style.overflow = prev
    }
  }, [locked])
}

export interface CockpitMapGeometry {
  paths: ReturnType<typeof deriveCockpitPaths>
  /** Fallback single-pin nudge for a selection with no drawn route. */
  focusPosition: [number, number] | null
  /** Bounds of the selected record's drawn route, when it has one. */
  routeBounds: [[number, number], [number, number]] | null
}

/**
 * Map geometry for the current selection. `routeBounds` frames the SELECTED
 * ROUTE, not its pin (UX G.35 finding 5 + the root cause behind H.38's second
 * half): auto-zooming to a single marker threw away every other vehicle — the
 * spatial context the map exists for — and made the `dimmed` treatment for
 * unselected pins unobservable.
 */
export function useCockpitMapGeometry(
  config: EntityConfig,
  selectedRecord: EntityRecord | undefined,
): CockpitMapGeometry {
  const paths = useMemo(() => deriveCockpitPaths(config, selectedRecord), [config, selectedRecord])

  const focusPosition = useMemo<[number, number] | null>(() => {
    const map = config.uiConfig.map
    if (!selectedRecord || !map?.latCol || !map.lngCol) return null
    const lat = Number(selectedRecord[map.latCol])
    const lng = Number(selectedRecord[map.lngCol])
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : null
  }, [config, selectedRecord])

  const routeBounds = useMemo<[[number, number], [number, number]] | null>(() => {
    const points = paths.flatMap((path) => path.points)
    if (points.length < 2) return null
    let minLng = Infinity
    let minLat = Infinity
    let maxLng = -Infinity
    let maxLat = -Infinity
    for (const [lng, lat] of points) {
      minLng = Math.min(minLng, lng)
      minLat = Math.min(minLat, lat)
      maxLng = Math.max(maxLng, lng)
      maxLat = Math.max(maxLat, lat)
    }
    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ]
  }, [paths])

  return { paths, focusPosition, routeBounds }
}

/**
 * Bring the split panel into view on selection (UX H.38, root cause). The popup
 * opens inside the map pane, and at 1280 that pane can sit below the fold with
 * the page scroller mid-way — the dispatcher then gets a popup with no visible
 * footer and no cue that scrolling is required. The popup's own viewport clamp
 * + height cap already guarantee correctness; this makes the whole surface
 * visible without the user hunting for it.
 */
export function useBringSplitIntoView(
  activeId: string | null,
  rootRef: RefObject<HTMLDivElement | null>,
): void {
  useEffect(() => {
    if (!activeId) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const bring = () => {
      const el = rootRef.current?.querySelector<HTMLElement>('[data-slot="cockpit-split"]')
      el?.scrollIntoView?.({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
    }
    bring()
    // The FIRST selection also mounts/settles the map pane, and a smooth
    // scroll started mid-mount gets swallowed — measured as popup #0 still
    // 143px past the fold while #1–#8 were fine. One retry after the pane has
    // settled costs nothing and is a no-op when the first attempt landed.
    const retry = setTimeout(bring, 400)
    return () => clearTimeout(retry)
  }, [activeId, rootRef])
}

/**
 * Opener restore for the MAP POPUP (UX H.40b). The sheets already do this
 * correctly via Radix; the popup is not a Radix surface, so closing it with
 * Escape dropped focus to `<body>` and a keyboard user lost their place in a
 * nine-card queue. Only fires when focus was actually orphaned — a mouse
 * deselect leaves `activeElement` somewhere real and must not be yanked.
 */
export function useQueueFocusRestore(
  activeId: string | null,
  lastActiveId: RefObject<string | null>,
): void {
  useEffect(() => {
    const previous = lastActiveId.current
    lastActiveId.current = activeId
    if (!previous || activeId) return
    const orphaned = !document.activeElement || document.activeElement === document.body
    if (!orphaned) return
    document
      .querySelector<HTMLElement>(
        `[data-queue-id="${CSS.escape(previous)}"] [data-slot="route-job-card"]`,
      )
      ?.focus()
  }, [activeId, lastActiveId])
}
