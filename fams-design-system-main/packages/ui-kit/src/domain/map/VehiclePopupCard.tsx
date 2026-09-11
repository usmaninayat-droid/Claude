import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { cn } from '../../lib/cn'
import { VehiclePopupFields } from './VehiclePopupFields'
import { VehiclePopupHeader } from './VehiclePopupHeader'
import { VehiclePopupTabBar } from './VehiclePopupTabBar'
import type { VehicleIcon3DArt } from './VehicleIcon3D'
import { CARD_BOX, POINTER_STYLE } from './vehicle-popup-style'

/**
 * VehiclePopupCard — the live-monitoring vehicle infowindow card, field-by-
 * field faithful to Figma board 16:22894 (2026-08-30 popup parity run):
 *
 * - 558×448 white card, radius ~12, Shadow/lg, optional 20×20 bottom pointer
 *   triangle (`pointer`) for on-map anchoring (wrapper becomes 558×462).
 * - Header (110px): 68×68 status-100-tinted tile + 3D vehicle art + 16×16
 *   status badge overlapping the tile's bottom-end · 24px semibold title ·
 *   14px grey meta row (plate + address, the address ellipsized at 255px —
 *   the driver lives on the Workforce tab) · status line (14px tone-colored
 *   word + 14px grey since)
 *   · three 16px header actions on a 24px pitch (track / open-in-new / close).
 *   NOTE: Figma's status row (495:4223) is TWO TEXT NODES ONLY — the red
 *   glyph reading before the status word is the tile badge (495:4207 at
 *   71,78, immediately left of the text at x=93), not a second icon. Don't
 *   "restore" a status-line glyph; that renders two status marks.
 * - Body: 3-column field grid on Figma's unequal 203/195/128 column template
 *   — 10px grey labels over 13px near-black values, row pitch ≈62px; scrolls
 *   internally so the card height stays stable.
 * - Footer: grey-100 segmented tab track (radius 8, 4px padding), active tab
 *   = white pill + primary text. All tabs given always render; a tab with no
 *   `content` falls back to the fields grid, so callers must pass an explicit
 *   (possibly empty-state) body for every non-Overview tab (UX D28).
 *
 * A11y (UX D29/D30): the card is a labelled `role="dialog"`; `focusOnMount`
 * moves focus in on open; the three close paths are Escape, the ✕ action and
 * (opt-in) `closeOnOutsideClick`; the tab strip is a real arrow-key
 * `tablist`; the copy affordance sits on a 24px hit area and announces
 * through a polite live region; each stringable field pairs label+value in
 * one accessible name.
 *
 * Card type note: Figma's 10px/13px/20px card type sits off the token type
 * scale (smallest token = 12px caption) — expressed as component-scoped rem
 * constants (the `ClusterBadge` geometry carve-out). Colors are 100% tokens.
 */

export type VehicleStatusTone = 'success' | 'warning' | 'error' | 'muted'

/**
 * A content-bearing tab (live-monitoring Figma 495:5977/8937/16050 — the
 * Critical Events / Trips / Devices tabs swap the whole body). A tab given as
 * a plain string keeps the original fields-grid body (the Overview default).
 */
export interface VehiclePopupTabItem {
  /** Stable id — `activeTab` matches against it. Defaults to `label`. */
  id?: string
  label: string
  /** Body rendered while this tab is active; omit for the fields grid. */
  content?: ReactNode
}

export interface VehiclePopupField {
  /** 16px leading icon (e.g. a lucide icon element). */
  icon: ReactNode
  label: string
  value: ReactNode
  /** Render a trailing 12px copy affordance after the value. */
  onCopy?: () => void
  /**
   * Renders the cell as a PROGRESS field instead of a text value (board
   * 16:21739 Fill Level / 16:21888 Fuel Level): an 8px rounded track with a
   * tone-filled bar and the percentage to its trailing side. `0`–`100`; the
   * value is still used as the accessible reading, so pass the formatted
   * string (e.g. `"93%"`) alongside.
   */
  percent?: number
  /**
   * Tone of the progress fill. Defaults to `success`; a caller that maps
   * thresholds (low fuel → `error`) passes its own.
   */
  percentTone?: VehicleStatusTone
  /**
   * Renders the cell as a CHIP row instead of a text value (board 16:22771
   * Tags). Each chip carries its own tone; `tone` defaults to `muted`.
   */
  chips?: { label: string; tone?: VehicleStatusTone }[]
}

export interface VehiclePopupCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Vehicle model / display name — the card title. */
  model: string
  /** Plate / registration string. */
  plate: string
  /** @deprecated The 2026-08-30 board moved the driver onto the Workforce tab;
   *  the header no longer renders it. Accepted for API compatibility. */
  driver?: string
  location: string
  /** Status word, e.g. "Stopped" / "Moving" / "Idle". */
  status: string
  /** Tints the status word, glyph, tile, and badge. */
  statusTone?: VehicleStatusTone
  /** Trailing status detail, e.g. "since 2 minutes". */
  statusSince?: string
  /** Which `VehicleIcon3D` illustration fills the header tile. @default 'car' */
  art?: VehicleIcon3DArt
  /** Custom header tile replacing tile + 3D art + tone badge (see
   *  `VehiclePopupHeaderProps.artNode` — the workforce avatar path). */
  artNode?: ReactNode
  /** Custom header meta row replacing the plate/location pair (see
   *  `VehiclePopupHeaderProps.meta`). */
  meta?: ReactNode
  /** Color-class override for the status word (see
   *  `VehiclePopupHeaderProps.statusClassName`). */
  statusClassName?: string
  /**
   * @deprecated Vehicle photos/custom thumbs are no longer rendered
   * (2026-08-24 parity run, P0-1) — the 3D vehicle art (`VehicleIcon3D`) is
   * the rendered truth on the header tile. The prop stays accepted for API
   * compatibility (FAMS Desk vendors ui-kit) and is ignored.
   */
  thumbnail?: ReactNode
  /** Fields in row-major order (col1row1, col2row1, col3row1, col1row2, …). */
  fields: VehiclePopupField[]
  /** Segmented tabs at the foot of the card. Strings keep the fields-grid
   *  body; object items may carry their own `content` body. */
  tabs?: Array<string | VehiclePopupTabItem>
  activeTab?: string
  onTabChange?: (tab: string) => void
  /**
   * Ordered keys of the tabs pinned to the visible bar. Everything else lands
   * in the bar's ⋯ overflow menu. Omitted, the first `maxVisibleTabs` tabs
   * are pinned. Blueprint-authorable (`uiConfig.map.popup.visibleTabs`).
   */
  visibleTabs?: string[]
  /**
   * How many tab segments the bar shows before its adaptive slot. The card is
   * a fixed 558px box, so the bar never grows or wraps — extra tabs go to the
   * ⋯ menu. @default 3
   */
  maxVisibleTabs?: number
  onClose?: () => void
  onLocate?: () => void
  onExpand?: () => void
  /** Whether the map is actively following this vehicle — tints the "Center
   *  on vehicle" header glyph primary ONLY while true. Defaults off (A21). */
  locating?: boolean
  /** Renders the 20×20 down-pointing anchor triangle under the card (the map
   *  layer's marker pointer, Figma Polygon 1). */
  pointer?: boolean
  /** Move focus into the card on mount (`role="dialog"` open behavior). */
  focusOnMount?: boolean
  /**
   * Call `onClose` when a pointer-down lands outside the card — the map
   * layer's "click empty map to dismiss" path (UX D27). Opt-in so cards
   * rendered inline (docked panels, docs pages) don't self-close; the
   * on-map popup should set it alongside `pointer` + `focusOnMount`.
   */
  closeOnOutsideClick?: boolean
  /**
   * Footer action row under the body (e.g. a status-driven CTA pair). The
   * caller owns the buttons; equal widths come from giving each `flex-1`.
   * PINNED — a sibling of the scrolling body, so the CTAs can never scroll
   * out of reach (cockpit contract, UX MUST H.38).
   */
  footer?: ReactNode
  /**
   * Extra control rendered before the locate/expand/close trio — the slot for
   * an overflow menu of remote commands. Caller-owned trigger + menu.
   */
  overflow?: ReactNode
}

export const VehiclePopupCard = forwardRef<HTMLDivElement, VehiclePopupCardProps>(
  (
    {
      model,
      plate,
      driver,
      location,
      status,
      statusTone = 'muted',
      statusSince,
      art = 'car',
      artNode,
      meta,
      statusClassName,
      // Accepted-but-ignored (deprecated) — the 3D art is the rendered truth.
      thumbnail: _thumbnail,
      fields,
      tabs,
      activeTab,
      onTabChange,
      visibleTabs,
      maxVisibleTabs = 3,
      onClose,
      onLocate,
      onExpand,
      locating = false,
      pointer = false,
      focusOnMount = false,
      closeOnOutsideClick = false,
      footer,
      overflow,
      className,
      ...props
    },
    ref,
  ) => {
    const tabItems: VehiclePopupTabItem[] = (tabs ?? []).map((t) =>
      typeof t === 'string' ? { id: t, label: t } : t,
    )
    const activeItem = tabItems.find((t) => (t.id ?? t.label) === activeTab)
    const idBase = useId()
    const tabDomId = (key: string) => `${idBase}-tab-${key.replace(/\s+/g, '-')}`
    const activeKey = activeItem ? (activeItem.id ?? activeItem.label) : undefined
    const panelId = `${idBase}-panel`
    const titleId = `${idBase}-title`

    // Copy affordances announce through this polite live region (UX D30).
    const [announcement, setAnnouncement] = useState('')

    // `role="dialog"` focus-in on open (UX D30) — merged local + forwarded ref.
    const localRef = useRef<HTMLDivElement | null>(null)
    const setRefs = (node: HTMLDivElement | null) => {
      localRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    }
    useEffect(() => {
      if (focusOnMount) localRef.current?.focus()
      // Mount-only by design — refocusing on every re-render would fight the user.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Outside pointer-down closes the card (UX D27). `pointerdown` (not click)
    // so a map drag that starts outside dismisses on press, matching the
    // "click empty map" expectation; the map's own pan/zoom never re-targets
    // inside the card, so panning with the card open is unaffected.
    useEffect(() => {
      if (!closeOnOutsideClick || !onClose) return
      const onPointerDown = (event: PointerEvent) => {
        const node = localRef.current
        if (node && !node.contains(event.target as Node)) onClose()
      }
      document.addEventListener('pointerdown', onPointerDown, true)
      return () => document.removeEventListener('pointerdown', onPointerDown, true)
    }, [closeOnOutsideClick, onClose])

    // SCROLL CUE (round-4 UX finding 2). The body scrolls inside the card's
    // height cap, and a clipped edge with no scrollbar, fade or chevron is
    // undiscoverable — 68px of telematics detail (including the "Last Record"
    // freshness stamp) was simply invisible to every dispatcher who never
    // guessed to drag inside the card. When — and only when — there is more
    // content below the fold, a fade is painted over the body's bottom edge.
    const bodyRef = useRef<HTMLDivElement>(null)
    const [scrollCue, setScrollCue] = useState(false)
    // SEPARATE from `scrollCue` on purpose (round-6 a11y finding). `scrollCue`
    // means "there is more content BELOW the current scroll position" and drives
    // only the visual fade — at scroll-end it is false. `scrollable` means "this
    // body overflows AT ALL", which is what the Tab stop and the region's
    // role/name must key off: gating them on `scrollCue` made the role and
    // accessible name vanish from the element WHILE IT WAS STILL FOCUSED once
    // the user scrolled to the bottom, so tabbing away left no way to tab back
    // and scroll up again (WCAG 2.1.1).
    const [scrollable, setScrollable] = useState(false)
    useEffect(() => {
      const el = bodyRef.current
      if (!el) return undefined
      const measure = () => {
        setScrollable(el.scrollHeight - el.clientHeight > 1)
        setScrollCue(el.scrollHeight - el.clientHeight - el.scrollTop > 1)
      }
      measure()
      el.addEventListener('scroll', measure, { passive: true })
      // jsdom and older engines have no ResizeObserver — the initial measure
      // above still runs, the cue just does not re-evaluate on resize there.
      const observer =
        typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
      observer?.observe(el)
      return () => {
        el.removeEventListener('scroll', measure)
        observer?.disconnect()
      }
    }, [fields, activeTab, activeItem?.content])

    return (
      // Escape-to-close on the dialog container is the WAI-ARIA APG dialog
      // pattern — the handler ADDS keyboard support, it removes none.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
      <div
        ref={setRefs}
        data-slot="vehicle-popup-card"
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && onClose) onClose()
        }}
        className={cn(
          // 558px card (Figma 495:4142) — 34.875rem wide × AT MOST 448px tall
          // (`CARD_BOX`, inline so a consumer's Tailwind build cannot drop it),
          // clamped to the viewport. A tab with 448px of content fills the box
          // and scrolls internally past it; a short tab (Workforce) hugs its
          // own content rather than painting an empty band above the tab strip
          // (QA A14 — see `CARD_BOX` for why this is a ceiling, not a fix).
          'relative w-[34.875rem] max-w-[calc(100vw-2rem)] outline-none',
          // HEIGHT CAP (cockpit contract, UX MUST H.38b). The map layer
          // publishes the room it actually has — pane ∩ viewport — as
          // `--fams-popup-max-block-size`. A `max-height` beats `CARD_BOX`'s
          // fixed `height`, so when the var is set the card shrinks and the
          // body scrolls; unset (live-monitoring, showcase) it resolves to
          // `none` and the Figma 448px box stands unchanged.
          'max-h-[var(--fams-popup-max-block-size,none)]',
          className,
        )}
        {...props}
      >
        <div
          style={CARD_BOX}
          className={cn(
            // NO border: the Figma card is a shadow-only box (round-1 visual
            // finding #29 — the 1px #EAECF0 outline was ours, not Figma's).
            'flex max-h-[var(--fams-popup-max-block-size,none)] flex-col overflow-hidden rounded-xl bg-card text-foreground',
            // token-exempt: Figma-sourced one-off shadow (VehiclePopupCard card elevation — directional)
            'shadow-[6px_6px_12px_0_rgba(0,0,0,0.08)]',
          )}
        >
          <VehiclePopupHeader
            model={model}
            plate={plate}
            driver={driver}
            location={location}
            status={status}
            statusTone={statusTone}
            statusSince={statusSince}
            art={art}
            artNode={artNode}
            meta={meta}
            statusClassName={statusClassName}
            titleId={titleId}
            overflow={overflow}
            onClose={onClose}
            onLocate={onLocate}
            onExpand={onExpand}
            locating={locating}
          />

          {/* Body — the active tab's own content, or the Overview fields grid,
              scrolling INSIDE the fixed-height card (UX D31). */}
          <div className="relative flex min-h-0 flex-1 flex-col gap-4 p-4">
            <div
              ref={bodyRef}
              data-slot="vehicle-popup-card-body"
              // KEYBOARD ACCESS (WCAG 2.1.1). With nothing to scroll the region
              // is inert chrome and stays out of the Tab order; as soon as the
              // body OVERFLOWS it becomes a real Tab stop with an accessible
              // name, and STAYS one at scroll-end (where the cue disappears).
              tabIndex={scrollable ? 0 : -1}
              className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              // With tabs the region IS the `tabpanel` the tablist controls,
              // and that role outranks the scroll `region` (one element, one
              // role); without tabs an OVERFLOWING body is a named scroll
              // region. Either way the role is a landmark, which is what makes
              // the `tabIndex` above legitimate (WCAG 2.1.1: a scrollable
              // region must be reachable without a pointer).
              role={tabItems.length > 0 ? 'tabpanel' : scrollable ? 'region' : undefined}
              aria-label={tabItems.length === 0 && scrollable ? 'Scrollable vehicle details' : undefined}
              {...(tabItems.length > 0
                ? {
                    id: panelId,
                    'aria-labelledby': activeKey ? tabDomId(activeKey) : undefined,
                  }
                : {})}
            >
              {activeItem?.content ?? (
                <VehiclePopupFields fields={fields} onAnnounce={setAnnouncement} />
              )}
            </div>

            {/* Footer tab bar — the scalable N-pinned + adaptive-slot model
                (see `VehiclePopupTabBar`). */}
            {tabItems.length > 0 ? (
              <VehiclePopupTabBar
                tabs={tabItems}
                activeKey={activeKey}
                onTabChange={onTabChange}
                visibleTabs={visibleTabs}
                maxVisibleTabs={maxVisibleTabs}
                tabDomId={tabDomId}
                panelId={panelId}
              />
            ) : null}

            {scrollCue ? (
              <span
                data-slot="vehicle-popup-card-scroll-cue"
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 start-0 end-0 h-8 bg-gradient-to-t from-card to-transparent"
              />
            ) : null}
          </div>

          {/* Footer CTA row — caller-owned buttons, `flex-1` each for equal
              widths. PINNED (a sibling of the scrolling body, not a child of
              it): with the card capped, the CTAs are the one row that must
              never scroll out of reach — UX MUST H.38. */}
          {footer ? (
            <div
              data-slot="vehicle-popup-card-footer"
              className="flex flex-none items-center gap-2 border-t border-border bg-card px-4 py-3"
            >
              {footer}
            </div>
          ) : null}
        </div>

        {/* 20×20 bottom pointer triangle (Figma Polygon 1) — its top 6px sit
            behind the card, the remaining 14px point down at the marker.
            Opt-in: the map layer anchors the card with it. */}
        {pointer ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-full flex justify-center"
          >
            <span
              data-slot="vehicle-popup-pointer"
              className="block bg-card"
              style={POINTER_STYLE}
            />
          </span>
        ) : null}

        {/* Copy announcements (UX D30). */}
        <span aria-live="polite" className="sr-only">
          {announcement}
        </span>
      </div>
    )
  },
)

VehiclePopupCard.displayName = 'VehiclePopupCard'
