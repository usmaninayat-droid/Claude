import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { cn } from '../lib/cn'

/**
 * CustomScrollbar — overlay scroll container with hover-revealed thumbs. [L3 composite]
 *
 * Ported from the designer-approved "home + side nav" prototype
 * (`src/components/CustomScrollbar.tsx`, DS V2 "Scroll bar" — Figma
 * `7981:15040`): a 10px gutter with a fully-rounded thumb that is hidden by
 * default and fades in on hover over the section (desktop), or shows while
 * scrolling and auto-hides 1s after it stops (touch — no hover there, and the
 * hit area widens to 16px).
 *
 * Why this isn't just CSS: a native `::-webkit-scrollbar` reserves gutter
 * space on Chrome/Windows (toggling it on hover shifts content), can't
 * cross-fade, can't auto-hide on an idle timer, and can't offer a 16px touch
 * target from a 10px bar. So the native bar is hidden outright (zero space)
 * and the thumbs are absolutely-positioned overlays driven from scroll
 * metrics. Wheel, trackpad and keyboard scrolling keep working — the overlay
 * layer is pointer-events:none; only the thumbs opt back in.
 *
 * Usage — put sizing/border/radius on the component, and give it a bounded
 * height (or it grows instead of scrolling):
 *
 *   <CustomScrollbar className="min-h-0 flex-1 rounded-md border border-border">
 *     <table>…</table>
 *   </CustomScrollbar>
 *
 * The forwarded ref exposes the scrolling viewport, for programmatic scrolling.
 */

/** Auto-hide delay after the last scroll event on touch devices (no hover). */
const IDLE_HIDE_MS = 1000
/** Floor on thumb length — a very long list otherwise leaves nothing to grab. */
const MIN_THUMB_PX = 28
/** Gutter: 10px per the DS spec; 16px on touch to meet the touch-target note. */
const GUTTER_DESKTOP = 10
const GUTTER_TOUCH = 16

type Axis = 'v' | 'h'

interface Metrics {
  /** Thumb length in px (0 when the axis doesn't scroll). */
  size: number
  /** Thumb offset from the track start, in px. */
  offset: number
  scrollable: boolean
}

const NOT_SCROLLABLE: Metrics = { size: 0, offset: 0, scrollable: false }

/** The scrolling viewport element, forwarded so callers can scroll it. */
export type CustomScrollbarHandle = HTMLDivElement

export interface CustomScrollbarProps {
  children: React.ReactNode
  /** Outer wrapper — put sizing, border and radius here. */
  className?: string
  /** The scrolling viewport itself (e.g. inner padding). */
  viewportClassName?: string
  /**
   * Optional custom styling for the thumb indicator (e.g. `bg-white/30`, or
   * `bg-transparent hover:bg-transparent` to hide the thumb while keeping
   * wheel/trackpad scrolling).
   */
  thumbClassName?: string
  /**
   * Which axes get a thumb. Defaults to `both`; each thumb still only appears
   * when that axis actually overflows. Content can still scroll on a hidden
   * axis — this controls the affordance, not the overflow.
   */
  axis?: 'both' | 'vertical' | 'horizontal'
  /**
   * H.70 — draw a bottom fade over the viewport while the content is NOT
   * scrolled to the vertical end, so "there is more below" is never conveyed
   * by a hover-only thumb. Off by default: only surfaces whose overflow must
   * be self-evident opt in.
   *
   * The gradient fades from the `--custom-scrollbar-fade-from` custom property,
   * which defaults to the popover surface. A surface on a different background
   * sets that property on the wrapper (via `className`) so the fade matches it.
   */
  bottomFade?: boolean
  /**
   * H.69 — show the indicator whenever the axis actually scrolls, without
   * waiting for hover. For surfaces where hover and focus are BOTH unavailable
   * as signals — an `aria-activedescendant` listbox keeps DOM focus on a search
   * input OUTSIDE the scroller, so `focus-within` never fires inside it — a
   * hover-gated thumb is simply never seen by a keyboard user.
   */
  keepVisible?: boolean
}

export const CustomScrollbar = forwardRef<CustomScrollbarHandle, CustomScrollbarProps>(
  function CustomScrollbar(
    {
      children,
      className,
      viewportClassName,
      thumbClassName,
      axis = 'both',
      bottomFade = false,
      keepVisible = false,
    },
    ref,
  ) {
    const viewportRef = useRef<HTMLDivElement>(null)
    useImperativeHandle(ref, () => viewportRef.current as HTMLDivElement)

    const showV = axis !== 'horizontal'
    const showH = axis !== 'vertical'

    const [vert, setVert] = useState<Metrics>(NOT_SCROLLABLE)
    const [horiz, setHoriz] = useState<Metrics>(NOT_SCROLLABLE)
    const [hovered, setHovered] = useState(false)
    const [scrolling, setScrolling] = useState(false)
    const [drag, setDrag] = useState<Axis | null>(null)
    /**
     * `(hover: hover) and (pointer: fine)` is the reliable "real pointer"
     * test. Touch devices report otherwise, which is what switches the reveal
     * model from hover to scroll-activity.
     */
    const [canHover, setCanHover] = useState(true)
    /**
     * H.69 — the hover reveal needs a keyboard fallback: while focus is inside
     * the scroller the indicator is shown, exactly as it is on hover. (On a
     * touch device there is no hover AND no reliable focus, so the indicator
     * is simply always shown there — see `shown` below.)
     */
    const [focusWithin, setFocusWithin] = useState(false)
    /** H.70 — true while the viewport is not scrolled to its vertical end. */
    const [fadeVisible, setFadeVisible] = useState(false)

    useEffect(() => {
      const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
      const sync = () => setCanHover(mq.matches)
      sync()
      mq.addEventListener('change', sync)
      return () => mq.removeEventListener('change', sync)
    }, [])

    const gutter = canHover ? GUTTER_DESKTOP : GUTTER_TOUCH

    const measure = useCallback(() => {
      const el = viewportRef.current
      if (!el) return
      const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = el
      // Sub-pixel layout rounding leaves a fraction of overflow on
      // non-scrolling axes; 1px of slack keeps a phantom thumb from appearing.
      const vScrollable = showV && scrollHeight - clientHeight > 1
      const hScrollable = showH && scrollWidth - clientWidth > 1
      // When both axes scroll, each track stops short of the other's gutter so
      // the two thumbs never collide in the corner.
      const vTrack = clientHeight - (hScrollable ? gutter : 0)
      const hTrack = clientWidth - (vScrollable ? gutter : 0)

      if (vScrollable) {
        const size = Math.max(MIN_THUMB_PX, Math.min(vTrack, (clientHeight / scrollHeight) * vTrack))
        const progress = scrollTop / (scrollHeight - clientHeight)
        setVert({ scrollable: true, size, offset: progress * (vTrack - size) })
        setFadeVisible(scrollTop + clientHeight < scrollHeight - 1)
      } else {
        setVert(NOT_SCROLLABLE)
        setFadeVisible(false)
      }

      if (hScrollable) {
        const size = Math.max(MIN_THUMB_PX, Math.min(hTrack, (clientWidth / scrollWidth) * hTrack))
        const progress = scrollLeft / (scrollWidth - clientWidth)
        setHoriz({ scrollable: true, size, offset: progress * (hTrack - size) })
      } else {
        setHoriz(NOT_SCROLLABLE)
      }
    }, [gutter, showV, showH])

    /* Re-measure on scroll; on touch, also drive the show-then-idle-hide cycle. */
    const idleTimer = useRef<number | undefined>(undefined)
    useEffect(() => {
      const el = viewportRef.current
      if (!el) return
      const onScroll = () => {
        measure()
        if (canHover) return
        setScrolling(true)
        window.clearTimeout(idleTimer.current)
        idleTimer.current = window.setTimeout(() => setScrolling(false), IDLE_HIDE_MS)
      }
      el.addEventListener('scroll', onScroll, { passive: true })
      return () => {
        el.removeEventListener('scroll', onScroll)
        window.clearTimeout(idleTimer.current)
      }
    }, [measure, canHover])

    /* Track both the viewport box and the content box — expanding a row changes
       content height without touching the viewport. */
    useLayoutEffect(() => {
      const el = viewportRef.current
      if (!el) return
      measure()
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      // React keeps the same DOM node across re-renders, so observing it once
      // here stays valid as its height changes.
      if (el.firstElementChild) ro.observe(el.firstElementChild)
      return () => ro.disconnect()
    }, [measure])

    const startDrag = (thumbAxis: Axis) => (e: React.PointerEvent<HTMLDivElement>) => {
      const el = viewportRef.current
      if (!el) return
      e.preventDefault()
      e.stopPropagation()
      setDrag(thumbAxis)

      const vertical = thumbAxis === 'v'
      const start = vertical ? e.clientY : e.clientX
      const startScroll = vertical ? el.scrollTop : el.scrollLeft
      const maxScroll = vertical ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth
      const track = vertical
        ? el.clientHeight - (horiz.scrollable ? gutter : 0)
        : el.clientWidth - (vert.scrollable ? gutter : 0)
      const thumb = vertical ? vert.size : horiz.size
      // Map 1px of thumb travel onto its share of the scrollable distance.
      const ratio = maxScroll / Math.max(1, track - thumb)

      const onMove = (ev: PointerEvent) => {
        const delta = (vertical ? ev.clientY : ev.clientX) - start
        const next = startScroll + delta * ratio
        if (vertical) el.scrollTop = next
        else el.scrollLeft = next
      }
      const onUp = () => {
        setDrag(null)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    }

    // H.69 — the reveal model is OPT-IN. `keepVisible` surfaces show the
    // indicator unconditionally (that is the whole point of the prop, and it
    // is what covers coarse-pointer devices, where no hover exists). Every
    // other consumer keeps the pre-H.69 model exactly — hover on a fine
    // pointer, scroll-activity on a coarse one — because consumers such as
    // `NavRail` deliberately suppress the affordance and must not be opted in
    // behind their back. `focusWithin` is additive on top for keyboard users.
    const shown = keepVisible || drag !== null || focusWithin || (canHover ? hovered : scrolling)

    /** Idle / hover thumb tones from the DS spec (Neutral xLight → Light). */
    const thumbTone = (thumbAxis: Axis) =>
      cn(
        'rounded-full transition-colors duration-fast',
        thumbClassName
          ? thumbClassName
          : drag === thumbAxis
            ? 'bg-muted-foreground/60'
            : 'bg-border group-hover/thumb:bg-muted-foreground/60',
      )

    const thumbBox = cn(
      'group/thumb absolute flex items-center justify-center transition-opacity duration-fast',
      shown ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
    )

    return (
      <div
        data-slot="custom-scrollbar"
        className={cn('relative overflow-hidden', className)}
        onMouseEnter={canHover ? () => setHovered(true) : undefined}
        onMouseLeave={canHover ? () => setHovered(false) : undefined}
        onFocusCapture={() => setFocusWithin(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false)
        }}
        data-scroll-indicator={shown || undefined}
      >
        <div
          ref={viewportRef}
          data-slot="custom-scrollbar-viewport"
          // Native bar hidden on every engine — the overlay thumbs replace it.
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
          className={cn(
            'h-full w-full overflow-auto [&::-webkit-scrollbar]:hidden',
            viewportClassName,
          )}
        >
          {children}
        </div>

        {/* Overlay layer is pointer-events:none so wheel, trackpad, clicks and
            text selection pass straight through to the content; only the
            thumbs opt back in. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
          {vert.scrollable ? (
            <>
              {/* A named TRACK node, so "this region scrolls" is inspectable
                  and visible, not implied by an unnamed overlay (H.69).
                  Rendered ONLY for `keepVisible` surfaces: it is a painted
                  `bg-muted` stripe and consumers that hid the affordance via
                  `thumbClassName="bg-transparent"` (e.g. `NavRail`) have no
                  way to neutralise a second node. Opt-in, like the reveal. */}
              {keepVisible ? (
                <div
                  data-slot="custom-scrollbar-track"
                  data-axis="v"
                  className={cn(
                    'absolute inset-y-0 end-0 flex justify-center rounded-full bg-muted transition-opacity duration-fast',
                    shown ? 'opacity-100' : 'opacity-0',
                  )}
                  style={{ width: gutter }}
                />
              ) : null}
              <div
                data-slot="custom-scrollbar-thumb"
                data-axis="v"
                onPointerDown={startDrag('v')}
                className={cn(thumbBox, 'top-0 end-0', drag === 'v' && 'cursor-grabbing')}
                style={{ width: gutter, height: vert.size, transform: `translateY(${vert.offset}px)` }}
              >
                <span className={cn(thumbTone('v'), 'h-full w-1.5')} />
              </div>
            </>
          ) : null}

          {horiz.scrollable ? (
            <div
              data-slot="custom-scrollbar-thumb"
              data-axis="h"
              onPointerDown={startDrag('h')}
              className={cn(thumbBox, 'bottom-0 left-0', drag === 'h' && 'cursor-grabbing')}
              style={{ height: gutter, width: horiz.size, transform: `translateX(${horiz.offset}px)` }}
            >
              <span className={cn(thumbTone('h'), 'h-1.5 w-full')} />
            </div>
          ) : null}
        </div>

        {/* H.70 — the bottom fade, opt-in per surface. */}
        {bottomFade ? (
          <div
            aria-hidden
            data-slot="custom-scrollbar-fade"
            data-visible={fadeVisible || undefined}
            style={{ opacity: fadeVisible ? 1 : 0 }}
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-[var(--custom-scrollbar-fade-from,var(--color-popover))] to-transparent transition-opacity duration-fast"
          />
        ) : null}
      </div>
    )
  },
)
