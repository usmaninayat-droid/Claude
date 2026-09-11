import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { PanelLeftClose } from '../icons'
import { cn } from '../lib/cn'
import { TooltipProvider } from '../primitives/Tooltip'
import { Popover, PopoverAnchor, PopoverContent } from '../primitives/Popover'
import { CustomScrollbar } from '../composites/CustomScrollbar'
import { NavRailContextProvider, NavRailRow, NavRailDivider, NavRailSwitcherRow } from './NavRailParts'

/**
 * NavRail — the unified expandable primary rail. [L4 shell]
 *
 * Ported from the designer-approved "home + side nav" prototype
 * (`TadweerNavbar.tsx`) and generalized: three modes — COLLAPSED (46px,
 * icon-only rows with right-side tooltips), EXPANDED (276px, icon + label
 * rows), and HOVER (opt-in: collapsed footprint that floats open over the
 * page content after a 500ms dwell, so hovering never reflows the page).
 *
 * Structure top→bottom: logo row (collapsed: the brand mark IS the expand
 * button, per the designer's standalone navbar builds; expanded: the
 * wordmark → `onLogoClick` plus a collapse button on the trailing edge),
 * caller-supplied `topItems` rows (e.g. Inbox with its unread badge), the
 * current-app `switcher` row (white @ 25% while `active` — the current
 * SCOPE, one step below the active module's solid white — opening a
 * caller-supplied panel, e.g. `AppSwitcherPanel`), the
 * scrollable module `items` list, and a solid `footer` band (settings /
 * help / user rows — compose from `NavRailRow`/`NavRailUserRow`).
 *
 * Expansion is driven by ONE control — the logo-row toggle (`Open Sidebar` /
 * `Close Sidebar`) — matching the reference builds, which carry neither an
 * edge grip nor a sidebar-mode menu. `hover` mode is still supported for
 * consumers that opt into it.
 *
 * Tenant-agnostic: the background is `--shell-rail-bg` (tenant gradient)
 * falling back to the tenant's `--color-primary`; every name/icon comes in
 * through props. RTL-safe: the rail uses logical utilities; the floating
 * geometry is inset-inline based.
 */

export type NavRailMode = 'collapsed' | 'expanded' | 'hover'

 /* Selection hierarchy (strongest fill last): active module = solid white ·
    active application row = white @ 25% · everything else transparent with a
    white/10 hover. Inbox is CROSS-APPLICATION, so a host viewing the inbox
    passes `switcher.active = false` and no application row is highlighted. */

/** Milliseconds the pointer must dwell before hover-mode auto-expands. */
const HOVER_EXPAND_DELAY_MS = 500

export interface NavRailItem {
  id: string
  label: string
  icon?: ReactNode
  active?: boolean
  /** Small `bg-destructive` dot (e.g. unread) — host-driven, purely visual. */
  notificationDot?: boolean
  /** Unread COUNT — renders the red count pill instead of the bare dot. */
  badgeCount?: number
}

export interface NavRailSwitcher {
  /** Current app's name (row label + accessible name). */
  label: string
  /** Current app's glyph (brand-colored on the white row). */
  icon?: ReactNode
  /** Popover content anchored beside the row — e.g. `AppSwitcherPanel`. */
  panel: ReactNode
  /**
   * Whether the row paints its "this is the current application" fill.
   * Defaults to `true`. Set `false` while the current page is
   * CROSS-APPLICATION (the inbox, global settings): the rail is not inside
   * any one application then, so highlighting an application row would
   * claim a scope the user isn't in.
   */
  active?: boolean
  /**
   * `'popup'` (default, back-compat): the row toggles the anchored popover.
   * `'page'` (reference default): the row calls `onGoHome` directly instead
   * of opening the popover — the Launch Pad Home IS the switcher until the
   * caller "minimizes" it, at which point it typically flips this to
   * `'popup'` (see `HomeLaunchPad`'s `onMinimize`). Persisting the choice is
   * the caller's concern (localStorage, per the reference).
   */
  mode?: 'page' | 'popup'
  /** Required when `mode="page"` — conventionally routes Home. */
  onGoHome?: () => void
  /** Controlled popover open state — lets a caller reopen it programmatically (e.g. after a Home "minimize"). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export interface NavRailProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Scrollable module rows. */
  items: NavRailItem[]
  /** Fired when a module row is clicked. */
  onItemSelect?: (id: string) => void
  /** Pinned rows between the logo and the switcher (e.g. Inbox). */
  topItems?: NavRailItem[]
  onTopItemSelect?: (id: string) => void
  /** Compact brand mark (collapsed) — also the expanded fallback. */
  logo?: ReactNode
  /** Full wordmark shown while expanded. */
  logoExpanded?: ReactNode
  /** Logo click — conventionally routes Home. */
  onLogoClick?: () => void
  /** Accessible name for the logo button. */
  logoLabel?: string
  /** Current-app switcher row + its popover panel. Omit to hide the row. */
  switcher?: NavRailSwitcher
  /** Footer band content — compose from `NavRailRow`/`NavRailUserRow`. */
  footer?: ReactNode
  /**
   * Optional attribution strip pinned below the footer (the reference's
   * "Powered By <wordmark>" band). Tenant metadata — a white-label tenant
   * sets it, the first-party tenant does not. Non-interactive.
   */
  poweredBy?: ReactNode
  /**
   * Uncontrolled initial mode. Defaults to `collapsed` — the reference
   * navbar builds expand only via the logo-row toggle, never on hover.
   * Consumers that want the floating hover reveal opt in with `'hover'`.
   */
  defaultMode?: NavRailMode
  /** Controlled mode + change handler (the mode menu / edge grip call it). */
  mode?: NavRailMode
  onModeChange?: (mode: NavRailMode) => void
}

export function NavRail({
  items,
  onItemSelect,
  topItems,
  onTopItemSelect,
  logo,
  logoExpanded,
  onLogoClick,
  logoLabel = 'Home',
  switcher,
  footer,
  poweredBy,
  defaultMode = 'collapsed',
  mode: modeProp,
  onModeChange,
  className,
  ...props
}: NavRailProps) {
  const [modeState, setModeState] = useState<NavRailMode>(defaultMode)
  const mode = modeProp ?? modeState
  const setMode = (next: NavRailMode) => {
    setModeState(next)
    onModeChange?.(next)
  }

  const [hovering, setHovering] = useState(false)
  const [switcherOpenState, setSwitcherOpenState] = useState(false)
  const switcherOpen = switcher?.open ?? switcherOpenState
  const setSwitcherOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === 'function' ? next(switcherOpen) : next
    setSwitcherOpenState(resolved)
    switcher?.onOpenChange?.(resolved)
  }
  const navRef = useRef<HTMLElement>(null)
  const hoverTimerRef = useRef<number | null>(null)
  const modsRef = useRef<HTMLDivElement>(null)
  const footRef = useRef<HTMLDivElement>(null)
  const [footShadow, setFootShadow] = useState(false)

  const clearHoverTimer = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }

  // Any mode change clears hover-driven expansion so we never hang on a stale
  // hovering=true after the user picked a different mode.
  useEffect(() => {
    if (mode !== 'hover') setHovering(false)
    clearHoverTimer()
  }, [mode])

  // While an anchored popover is open, keep the rail open — the pointer has to
  // leave the nav to reach it, and losing hover shouldn't slam the rail shut.
  const dropdownOpen = switcherOpen
  const expanded = mode === 'expanded' || (mode === 'hover' && (hovering || dropdownOpen))

  /** The single expansion control (reference: no edge grip, no mode menu). */
  const toggleExpanded = () => {
    setMode(expanded ? 'collapsed' : 'expanded')
  }

  const onPointerEnter = () => {
    if (mode !== 'hover') return
    clearHoverTimer()
    hoverTimerRef.current = window.setTimeout(() => {
      setHovering(true)
      hoverTimerRef.current = null
    }, HOVER_EXPAND_DELAY_MS)
  }
  const onPointerLeave = (e: React.PointerEvent) => {
    const rel = e.relatedTarget as Node | null
    if (rel && navRef.current?.contains(rel)) return
    if (mode !== 'hover') return
    clearHoverTimer()
    setHovering(false)
  }

  // Escape closes whichever rail popover is open. Belt-and-braces on top of
  // the popover primitive's own dismissal: these popovers are opened from an
  // anchor (not a focus-moving trigger), so keyboard focus commonly stays on
  // the rail row — Escape must still dismiss from there.
  useEffect(() => {
    if (!dropdownOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setSwitcherOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dropdownOpen])

  // Interacting anywhere else on the page collapses a hover-expansion
  // immediately (a floating rail must never linger over content in use).
  useEffect(() => {
    if (mode !== 'hover' || !expanded) return
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (navRef.current?.contains(target)) return
      if (
        target instanceof Element &&
        (target.closest('[role="dialog"]') || target.closest('[role="menu"]') || target.closest('[data-slot="popover-content"]'))
      )
        return
      clearHoverTimer()
      setHovering(false)
      setSwitcherOpen(false)
    }
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [mode, expanded])

  // Footer scroll-shadow: lift the footer band's shadow exactly while the
  // module list above overflows AND isn't scrolled to the bottom — matching
  // the reference's `bindFootShadow`. Re-checked on scroll, on content-size
  // changes (ResizeObserver — item list can change length) and on window
  // resize (rail height can change).
  useEffect(() => {
    const el = modsRef.current
    if (!el || !footer) return
    const check = () => {
      const scrollable = el.scrollHeight - el.clientHeight > 1
      const notAtBottom = el.scrollTop < el.scrollHeight - el.clientHeight - 1
      setFootShadow(scrollable && notAtBottom)
    }
    check()
    el.addEventListener('scroll', check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    window.addEventListener('resize', check)
    return () => {
      el.removeEventListener('scroll', check)
      ro.disconnect()
      window.removeEventListener('resize', check)
    }
  }, [footer, expanded, items])

  return (
    <TooltipProvider delayDuration={120}>
      <NavRailContextProvider value={{ expanded }}>
        <div
          data-slot="navrail"
          className={cn(
            'relative h-full shrink-0 transition-[width] duration-normal ease-out',
            // Hover mode keeps a 46px footprint even while floating open, so
            // page content never reflows for a transient reveal.
            mode === 'expanded' ? 'w-69' : 'w-11.5',
            expanded && mode !== 'expanded' ? 'z-40' : '',
            className,
          )}
          {...props}
        >
          <nav
            ref={navRef}
            aria-label="Primary"
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            className={cn(
              'absolute inset-y-0 start-0 flex flex-col overflow-hidden transition-[width] duration-normal ease-out',
              expanded ? 'w-69' : 'w-11.5',
              expanded && mode !== 'expanded' ? 'shadow-lg' : '',
            )}
            style={{
              // Shorthand, not backgroundColor: a tenant's --shell-rail-bg may
              // be a GRADIENT (iwmp), which backgroundColor silently rejects.
              background: 'var(--shell-rail-bg, var(--color-primary))',
            }}
          >
            {/* Top group: logo → pinned rows → app switcher → module list */}
            <div className="flex min-h-0 flex-1 flex-col gap-3.5 pt-4">
              <div className="flex flex-col gap-3.5 px-2">
                {/* Logo row — collapsed: the brand mark IS the expand button
                    (reference behavior); expanded: brand → Home plus a
                    trailing collapse button. */}
                <div className={cn('flex h-7.5 shrink-0 items-center', expanded ? 'justify-between gap-2' : 'justify-center')}>
                  <button
                    type="button"
                    onClick={expanded ? onLogoClick : toggleExpanded}
                    aria-label={expanded ? logoLabel : 'Open Sidebar'}
                    aria-expanded={expanded ? undefined : false}
                    title={expanded ? logoLabel : 'Open Sidebar'}
                    className={cn(
                      'flex shrink-0 items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                      !expanded &&
                        'size-7 justify-center overflow-hidden [&_img]:size-full [&_img]:object-contain [&_svg]:max-h-full [&_svg]:max-w-full',
                      // Cap, don't force: a tenant's expanded wordmark asset
                      // ships its own intrinsic height (the reference's FAMS
                      // wordmark is 12px tall, not 28px).
                      expanded && '[&_img]:max-h-7 [&_img]:w-auto',
                    )}
                  >
                    {expanded ? (logoExpanded ?? logo) : logo}
                  </button>
                  {expanded ? (
                    <button
                      type="button"
                      onClick={toggleExpanded}
                      aria-label="Close Sidebar"
                      aria-expanded
                      title="Close Sidebar"
                      className="flex size-7 shrink-0 items-center justify-center rounded-sm text-white/80 outline-none transition-colors duration-fast hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
                    >
                      <PanelLeftClose className="size-4.5" aria-hidden />
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2.5">
                  {(topItems ?? []).map((item) => (
                    <NavRailRow
                      key={item.id}
                      label={item.label}
                      icon={item.icon}
                      active={item.active}
                      notificationDot={item.notificationDot}
                      badgeCount={item.badgeCount}
                      onClick={() => onTopItemSelect?.(item.id)}
                    />
                  ))}
                  {topItems && topItems.length > 0 ? <NavRailDivider /> : null}
                  {switcher ? (
                    <>
                      <Popover open={switcherOpen} onOpenChange={setSwitcherOpen}>
                        <PopoverAnchor asChild>
                          <NavRailSwitcherRow
                            label={switcher.label}
                            icon={switcher.icon}
                            expanded={expanded}
                            active={switcher.active ?? true}
                            onToggle={() => {
                              // "page" mode (reference default): the row IS
                              // the Home shortcut — the anchored popover
                              // never opens from here. "popup" mode (or no
                              // `onGoHome` supplied): the row toggles the
                              // popover, unchanged from before this prop
                              // existed.
                              if (switcher.mode === 'page' && switcher.onGoHome) {
                                switcher.onGoHome()
                                return
                              }
                              setSwitcherOpen((o) => !o)
                            }}
                          />
                        </PopoverAnchor>
                        <PopoverContent side="right" align="start" sideOffset={8} className="w-85 p-2">
                          {switcher.panel}
                        </PopoverContent>
                      </Popover>
                    </>
                  ) : null}
                </div>
              </div>

              <CustomScrollbar
                ref={modsRef}
                className="min-h-0 flex-1"
                viewportClassName={cn('flex flex-col gap-1.5', expanded ? 'ps-2 pe-3' : 'px-2')}
                // The rail navigates by click, not by scroll — hide the thumb,
                // wheel/trackpad scrolling still works.
                thumbClassName="bg-transparent"
              >
                {items.map((item) => (
                  <NavRailRow
                    key={item.id}
                    label={item.label}
                    icon={item.icon}
                    active={item.active}
                    notificationDot={item.notificationDot}
                    badgeCount={item.badgeCount}
                    onClick={() => onItemSelect?.(item.id)}
                  />
                ))}
              </CustomScrollbar>
            </div>

            {footer ? (
              <div
                ref={footRef}
                data-slot="navrail-footer"
                className={cn(
                  'flex flex-col gap-1.5 px-2 pt-1.5 pb-3 transition-shadow duration-fast',
                  // Mirrors the reference's `.foot.scrolled`: a lifted shadow
                  // appears only while the module list above still has more
                  // to scroll — an affordance, not decoration.
                  footShadow && 'shadow-elevation',
                )}
              >
                {footer}
              </div>
            ) : null}

            {poweredBy ? (
              <div
                data-slot="navrail-poweredby"
                className={cn(
                  'flex h-6 shrink-0 items-center border-t border-white/15',
                  expanded ? 'gap-2 px-3.5' : 'justify-center px-1',
                )}
              >
                {expanded ? (
                  <span className="shrink-0 text-[0.625rem] leading-3 font-medium text-white/80">Powered By</span>
                ) : null}
                {poweredBy}
              </div>
            ) : null}
          </nav>

        </div>
      </NavRailContextProvider>
    </TooltipProvider>
  )
}
