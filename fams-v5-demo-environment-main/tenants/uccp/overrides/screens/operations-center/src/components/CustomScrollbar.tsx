import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@fams/design-system'

/**
 * CustomScrollbar — the shared scroll container for this app.
 *
 * Implements the DS V2 "Scroll bar" component
 * (Figma `4FS7S3tHKzZZpdFBA0aGkt` node `7981:15040`), which ships Vertical and
 * Horizontal variants in Hover=Off / Hover=On states:
 *   • 10px gutter, fully-rounded 6px thumb
 *   • Hover=Off  → Neutral/xLight `#d0d5dd` (= `--gray-300`)
 *   • Hover=On   → Neutral/Light  `#98a2b3` (= `--gray-400`)
 *
 * Behaviour per the design notes:
 *   • Desktop — hidden by default, fades in on hover over the section.
 *   • Mobile/tablet — no hover, so it shows while scrolling and auto-hides 1s
 *     after scrolling stops; the thumb's hit area widens to 16px.
 *   • Overlay layout — never pushes content.
 *   • Keyboard, wheel and trackpad scrolling keep working.
 *
 * Why this isn't just CSS: a native `::-webkit-scrollbar` reserves gutter space
 * on Chrome/Windows (so toggling it on hover shifts content), can't cross-fade,
 * can't auto-hide on an idle timer, and can't offer a 16px touch target from a
 * 10px bar. So the native bar is hidden outright (`.no-scrollbar`, zero space)
 * and the thumbs are absolutely-positioned overlays driven from scroll metrics.
 *
 * Usage — put sizing/border/radius on the component, and make sure it has a
 * bounded height or it will simply grow instead of scrolling:
 *
 *   <CustomScrollbar className="min-h-0 flex-1 rounded-[6px] border border-border">
 *     <table>…</table>
 *   </CustomScrollbar>
 *
 * The forwarded ref exposes the scrolling viewport, for programmatic scrolling:
 *
 *   const view = useRef<CustomScrollbarHandle>(null)
 *   view.current?.scrollTo({ top: 0, behavior: 'smooth' })
 *
 * Depends on the `no-scrollbar` utility in `app/src/index.css`.
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
  /** Optional custom styling for the thumb indicator (e.g. bg-white/30). */
  thumbClassName?: string
  /**
   * Which axes get a thumb. Defaults to `both`; each thumb still only appears
   * when that axis actually overflows. Content can still scroll on a hidden
   * axis — this controls the affordance, not the overflow.
   */
  axis?: 'both' | 'vertical' | 'horizontal'
}

export const CustomScrollbar = forwardRef<CustomScrollbarHandle, CustomScrollbarProps>(
  function CustomScrollbar({ children, className, viewportClassName, thumbClassName, axis = 'both' }, ref) {
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
     * `(hover: hover) and (pointer: fine)` is the reliable "real pointer" test.
     * Touch devices report otherwise, which is what switches the reveal model
     * from hover to scroll-activity.
     */
    const [canHover, setCanHover] = useState(true)

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
      // Sub-pixel layout rounding leaves a fraction of overflow on non-scrolling
      // axes; 1px of slack keeps a phantom thumb from appearing.
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
      } else {
        setVert(NOT_SCROLLABLE)
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
      const maxScroll = vertical
        ? el.scrollHeight - el.clientHeight
        : el.scrollWidth - el.clientWidth
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

    const shown = drag !== null || (canHover ? hovered : scrolling)

    /** Hover=Off / Hover=On colours from the DS spec. */
    const thumbTone = (thumbAxis: Axis) =>
      cn(
        'rounded-full transition-colors',
        thumbClassName
          ? thumbClassName
          : drag === thumbAxis
          ? 'bg-[color:var(--gray-400)]'
          : 'bg-[color:var(--gray-300)] group-hover/thumb:bg-[color:var(--gray-400)]'
      )

    const thumbBox = cn(
      'group/thumb absolute flex items-center justify-center transition-opacity duration-150',
      shown ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
    )

    return (
      <div
        className={cn('relative overflow-hidden', className)}
        onMouseEnter={canHover ? () => setHovered(true) : undefined}
        onMouseLeave={canHover ? () => setHovered(false) : undefined}
      >
        <div
          ref={viewportRef}
          className={cn('no-scrollbar h-full w-full overflow-auto', viewportClassName)}
        >
          {children}
        </div>

        {/* Overlay layer is pointer-events:none so wheel, trackpad, clicks and
            text selection pass straight through to the content; only the thumbs
            opt back in. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-20">
          {vert.scrollable ? (
            <div
              onPointerDown={startDrag('v')}
              className={cn(thumbBox, 'right-0 top-0', drag === 'v' && 'cursor-grabbing')}
              style={{ width: gutter, height: vert.size, transform: `translateY(${vert.offset}px)` }}
            >
              <span className={cn(thumbTone('v'), 'h-full w-1.5')} />
            </div>
          ) : null}

          {horiz.scrollable ? (
            <div
              onPointerDown={startDrag('h')}
              className={cn(thumbBox, 'bottom-0 left-0', drag === 'h' && 'cursor-grabbing')}
              style={{ height: gutter, width: horiz.size, transform: `translateX(${horiz.offset}px)` }}
            >
              <span className={cn(thumbTone('h'), 'h-1.5 w-full')} />
            </div>
          ) : null}
        </div>
      </div>
    )
  }
)
