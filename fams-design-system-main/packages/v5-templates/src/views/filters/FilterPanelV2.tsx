import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react'
import { X } from '@fams/ui-kit/icons'
import type { FilterFacet, FiltersPanelConfig } from '@fams/v5-composer'
import { CustomScrollbar } from '@fams/ui-kit'
import { cn } from '../../lib/cn'
import { FilterField, selectedIdsOf } from './FilterField'
import type { FilterSession } from './use-filter-session'

/**
 * FilterPanelV2 — the 448px "All Filters" panel (FAMILY C, WAVE C4).
 * [v5-templates]
 *
 * The panel is the SECOND of the four focus layers (A.1: trigger → panel →
 * field-dropdown → sheet). It is deliberately generic: it takes
 * `FilterFacet[]` and an opaque `value` record and knows nothing about any
 * module, entity or status vocabulary (J.87).
 *
 * What this file owns:
 * - E.34 — a bounded body. `min(660px, 100vh − 64px)`, with the header
 *   OUTSIDE the scroller so it never scrolls away. The 660 is the Figma
 *   number, the viewport clamp is the heuristic override, and the clamp wins
 *   at short viewports; both come from `panelConfig` when authored (J.94).
 * - H.69/H.70 — `CustomScrollbar`, whose hover-revealed thumb gets a
 *   non-hover fallback (visible whenever focus is inside the scroller, and
 *   permanently under `(hover: none)`), plus a persistent bottom fade while
 *   there is more content below.
 * - I.75/I.76 — one polite live region per panel: `N filters applied` /
 *   `Filters cleared`, debounced so a rapid multi-toggle announces once.
 * - D-3/D-4 — `role="dialog" aria-modal="false"`, Escape and outside-click
 *   close ONLY this layer (never a two-layer collapse: while a field dropdown
 *   is open, that dropdown consumes both), and focus returns to the trigger
 *   that opened the panel. Focus restore fires on the OPEN→CLOSED flip, not on
 *   unmount — the lesson the shipped `AlertDialog` restore encodes; restoring
 *   in a cleanup runs after the trigger may already be gone and lands focus on
 *   `<body>`.
 * - G.63 — LIVE-APPLY ONLY. There is no `onApply`, no Confirm, no
 *   unsaved-changes state anywhere in this component, by design (G.64): every
 *   close route leaves the applied filter set untouched. `Clear all` is the
 *   only destructive action.
 */

export interface FilterPanelV2Props {
  facets: FilterFacet[]
  /** Applied values, keyed by `facet.col`. Opaque to the panel. */
  value: Record<string, unknown>
  /** LIVE-APPLY — fired on every toggle, per field. */
  onChange: (col: string, next: unknown) => void
  onClearAll: () => void
  /** `kind: 'entity' && expandable` → WAVE C5's side sheet. */
  onExpand?: (facet: FilterFacet) => void
  /** The view-session state (D-2), owned by `ModuleView` — NOT by this panel. */
  session: FilterSession
  /** Panel chrome from `uiConfig.filtersPanel` (D-1); every number is clamped here. */
  panelConfig?: FiltersPanelConfig
  /** Controls rendering; `false` renders nothing and triggers the focus restore. */
  open?: boolean
  /** Escape, outside-click and the `✕` all call this. */
  onClose?: () => void
  /** The control that opened the panel — focus returns here on close (A.4). */
  triggerRef?: RefObject<HTMLElement | null>
  /**
   * FIX WAVE C-2 / P0-2 — `facet.col` of the field whose Expandable Selector
   * sheet is currently open, if any. While set, the panel is NOT the innermost
   * layer: every dismiss gesture belongs to the sheet, and the panel ignores
   * Escape and outside-click entirely (D-3 — one layer per gesture).
   */
  expandedCol?: string | null
  /**
   * R-37 — routed to each field's create-from-search CTA (and, by the host, to
   * the sheet's), so both empty states share one path.
   */
  onCreateFromSearch?: (facet: FilterFacet, query: string) => void
  /** I.75 announcement debounce. Tests pass 0. */
  announceDelayMs?: number
  className?: string
}

/** Figma defaults (J.94) — authored values win, then the viewport clamp wins over both. */
const DEFAULT_WIDTH = 448
const DEFAULT_HEIGHT = 660
/** Viewport gutter for the bounded-body clamp (E.34). */
const VIEWPORT_GUTTER = 64

/** A facet counts as "applied" when it holds any non-empty value. */
export function appliedCount(facets: FilterFacet[], value: Record<string, unknown>): number {
  let n = 0
  for (const facet of facets) {
    const raw = value[facet.col]
    if (raw == null) continue
    if (Array.isArray(raw)) {
      if (raw.length > 0) n += 1
      continue
    }
    if (typeof raw === 'string') {
      if (raw.length > 0) n += 1
      continue
    }
    if (typeof raw === 'object') {
      if (Object.values(raw as Record<string, unknown>).some((v) => v != null)) n += 1
      continue
    }
    n += 1
  }
  return n
}

export function FilterPanelV2({
  facets,
  value,
  onChange,
  onClearAll,
  onExpand,
  session,
  panelConfig,
  open = true,
  onClose,
  triggerRef,
  expandedCol = null,
  onCreateFromSearch,
  announceDelayMs = 500,
  className,
}: FilterPanelV2Props) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [openFieldCol, setOpenFieldCol] = useState<string | null>(null)
  /*
   * Whether a layer DEEPER than this panel is currently open. Kept in a ref so
   * that every listener — including ones that run in another event phase than
   * React's own dispatch — reads the live value rather than a stale render's
   * closure (see the Escape handler below for why that mattered).
   */
  const isNested = useRef(false)
  isNested.current = expandedCol != null || openFieldCol != null
  const [barsVisible, setBarsVisible] = useState(false)
  const [fadeVisible, setFadeVisible] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  const title = panelConfig?.title ?? 'All Filters'
  const clearAllEnabled = panelConfig?.clearAll !== false
  const width = panelConfig?.width ?? DEFAULT_WIDTH
  const height = panelConfig?.height ?? DEFAULT_HEIGHT
  const applied = useMemo(() => appliedCount(facets, value), [facets, value])
  const hasAnyValue = applied > 0

  /* ── I.75/I.76 — one polite live region, debounced ─────────────────── */
  const lastApplied = useRef<number | null>(null)
  useEffect(() => {
    if (!open) return
    const previous = lastApplied.current
    lastApplied.current = applied
    if (previous === null) return
    if (previous === applied && applied !== 0) return
    const text = applied === 0 ? 'Filters cleared' : `${applied} filter${applied === 1 ? '' : 's'} applied`
    if (announceDelayMs <= 0) {
      setAnnouncement(text)
      return
    }
    const timer = setTimeout(() => setAnnouncement(text), announceDelayMs)
    return () => clearTimeout(timer)
  }, [applied, announceDelayMs, open])

  /* ── A.4/J.92 — restore focus on the OPEN→CLOSED flip, never in a cleanup ──
   *
   * The restore runs on the state FLIP rather than on unmount. What protects
   * it is stronger than the `inert` attribute an `AlertDialog` needs: this
   * component returns `null` while closed, so on the flip React has already
   * UNMOUNTED the panel subtree before this effect runs — there is nothing
   * left inside it that could claw focus back.
   *
   * The deferred second attempt is one retry on the NEXT TASK, for a layer
   * that unmounts after this effect (a nested sheet, a field popover) and
   * drops focus on `<body>`. It is strictly additive — the `activeElement ===
   * body` guard means it never steals focus from a legitimate new owner — but
   * it covers only that one macrotask, not a claw-back at an arbitrary later
   * moment. If one ever appears, the fix is a `focusin` listener, not a
   * longer timeout.
   */
  const wasOpen = useRef(open)
  useEffect(() => {
    if (wasOpen.current && !open) {
      const trigger = triggerRef?.current
      trigger?.focus()
      const settle = setTimeout(() => {
        if (document.activeElement === document.body) trigger?.focus()
      }, 0)
      wasOpen.current = open
      return () => clearTimeout(settle)
    }
    wasOpen.current = open
  }, [open, triggerRef])

  /* ── A.2 — opening moves focus INTO the panel ──────────────────────── */
  useEffect(() => {
    if (!open) return
    const first = rootRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    first?.focus()
  }, [open])

  /* ── A.5 — outside click closes THIS layer only ────────────────────── */
  useEffect(() => {
    if (!open || !onClose) return
    const onPointerDown = (e: PointerEvent) => {
      // FIX WAVE C-2 / P0-2 — while a deeper layer is up, the panel is not the
      // one being dismissed. The sheet is a MODAL portal: its Cancel/Confirm
      // clicks and its scrim all land outside the panel's DOM, and this
      // handler used to read every one of them as "click outside the panel"
      // and collapse both layers on a single click.
      if (isNested.current) return
      const target = e.target as HTMLElement | null
      if (!target) return
      if (rootRef.current?.contains(target)) return
      // Any PORTALLED layer nested inside this panel (E.38) — a click inside
      // one is not an outside click on the panel.
      if (target.closest?.('[data-filter-layer]')) return
      if (triggerRef?.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, onClose, triggerRef, isNested])

  /* ── H.69 — non-hover scrollbar fallback ───────────────────────────── */
  useEffect(() => {
    if (!open || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(hover: none)')
    const sync = () => setBarsVisible((current) => current || mq.matches)
    sync()
    mq.addEventListener?.('change', sync)
    return () => mq.removeEventListener?.('change', sync)
  }, [open])

  /* ── H.70 — persistent bottom fade while there is more below ───────── */
  const syncFade = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    setFadeVisible(el.scrollTop + el.clientHeight < el.scrollHeight - 1)
  }, [])
  useEffect(() => {
    if (!open) return
    const el = viewportRef.current
    syncFade()
    el?.addEventListener('scroll', syncFade)
    return () => el?.removeEventListener('scroll', syncFade)
  }, [open, syncFade, facets.length])

  if (!open) return null

  // D-3 — Escape closes the innermost layer only: while a field dropdown or
  // the sheet is open, THAT layer owns the key and the panel must not collapse
  // two layers at once.
  //
  // FIX WAVE C-2 / P0-2: the old guard read `openFieldCol` STATE, and Radix's
  // own Escape listener runs in the document's capture phase — it had already
  // closed the dropdown and flushed `openFieldCol` to `null` before React
  // dispatched this handler, so the panel saw "no field open" and closed too.
  // (The all-keyboard path only survived because the dropdown's search input
  // calls `stopPropagation`; a mouse click onto a tag chip moved focus off it
  // and the mask disappeared — exactly the B9b repro.) The guard is now on
  // WHERE THE EVENT CAME FROM, which no ordering can invalidate: an Escape
  // raised inside any nested `[data-filter-layer]` is never the panel's.
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return
    if (isNested.current) return
    const target = e.target as HTMLElement | null
    if (target?.closest?.('[data-filter-layer]')) return
    e.stopPropagation()
    onClose?.()
  }

  return (
    // A dialog owning `Escape` is exactly the interaction this rule exists to
    // protect (D-3): the layer, not any one control inside it, is what the key
    // dismisses, and every control within stays independently operable.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="false"
      aria-label={title}
      data-slot="filter-panel"
      data-applied={applied}
      onKeyDown={onKeyDown}
      style={{ width, maxWidth: 'calc(100vw - 32px)' }}
      className={cn(
        // FIX WAVE C-5 / P2 (V5/V6) — SPEC §1.3: radius 12 (`rounded-xl`) and
        // `Shadows/Standard/2xl`. `shadow-elevation` is the smaller
        // `shadow-lg` alias and read visually flat against the page.
        'flex flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl',
        className,
      )}
    >
      {/* E.34 — the header lives OUTSIDE the scroller and never moves. */}
      <div data-slot="filter-panel-header" className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
        <div className="flex shrink-0 items-center gap-1">
          {clearAllEnabled ? (
            <button
              type="button"
              data-slot="filter-clear-all"
              // G.66 — never reads as available on a clean panel, but keeps
              // its drawn look and stays focusable.
              aria-disabled={hasAnyValue ? undefined : true}
              onClick={hasAnyValue ? onClearAll : undefined}
              className="min-h-10 rounded-xs px-2 text-sm font-semibold text-error-text outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear all
            </button>
          ) : null}
          <button
            type="button"
            data-slot="filter-panel-close"
            aria-label="Close filters"
            onClick={() => onClose?.()}
            className="grid size-10 shrink-0 place-items-center rounded-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div
        className="relative min-h-0"
        data-slot="filter-panel-scroll-region"
        data-scrollbar-visible={barsVisible || undefined}
        onFocusCapture={() => setBarsVisible(true)}
        onBlurCapture={(e: ReactFocusEvent<HTMLDivElement>) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setBarsVisible(false)
        }}
        style={{ '--filter-panel-max-h': `min(${height}px, calc(100vh - ${VIEWPORT_GUTTER}px))` } as CSSProperties}
      >
        <CustomScrollbar
          ref={viewportRef}
          axis="vertical"
          className={cn(
            'w-full max-h-[var(--filter-panel-max-h)]',
            // H.69 — the thumb's hover-only reveal gets a focus/touch fallback.
            barsVisible && '[&>div[aria-hidden]>*]:pointer-events-auto [&>div[aria-hidden]>*]:opacity-100',
          )}
          viewportClassName="max-h-[var(--filter-panel-max-h)] px-4 py-3"
        >
          <div data-slot="filter-panel-body" className="flex flex-col gap-3">
            {facets.map((facet) => (
              <FilterField
                key={facet.col}
                facet={facet}
                value={value[facet.col]}
                onChange={(next) => onChange(facet.col, next)}
                session={session}
                onExpand={onExpand}
                onOpenChange={(fieldOpen) => setOpenFieldCol(fieldOpen ? facet.col : null)}
                suspendDismiss={expandedCol === facet.col}
                onCreateFromSearch={onCreateFromSearch}
              />
            ))}
          </div>
        </CustomScrollbar>

        {/* H.70 — "there is more" is never conveyed by hover alone. */}
        <div
          aria-hidden
          data-slot="filter-panel-fade"
          style={{ opacity: fadeVisible ? 1 : 0 }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-popover to-transparent transition-opacity duration-fast"
        />
      </div>

      {/* I.75/I.76 — the only announcement channel a live-apply panel has. */}
      <div
        data-slot="filter-panel-live-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </div>
  )
}

/** Re-exported so hosts can normalise a facet value the same way the field does. */
export { selectedIdsOf }
