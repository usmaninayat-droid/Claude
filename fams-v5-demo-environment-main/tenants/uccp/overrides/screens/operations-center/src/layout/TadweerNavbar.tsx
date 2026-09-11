import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  cn, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from '@fams/design-system'
import {
  Inbox, ChevronsUpDown, Settings, HelpCircle, ChevronRight,
  PanelLeftClose, PanelLeftOpen, type LucideIcon,
} from 'lucide-react'
import { type ModuleLeaf } from './moduleNavData'
import { AppSwitcherDropdown } from './AppSwitcherDropdown'
import { useSwitcherModePreference } from './appSwitcherPreference'
import { useActiveAppId, getLastModuleForApp, setLastModuleForApp } from './activeAppPreference'
import { HOME_SUITES } from '../features/home/homeData'
import { CustomScrollbar, type CustomScrollbarHandle } from '../components/CustomScrollbar'

/**
 * The unified primary rail — Figma "Qatar MME — Launch Pad" nodes `5951:22516`
 * (collapsed) and `6057:4763` (expanded). Exactly two states, no hover-expand:
 *   • COLLAPSED (46px, default): icon-only rows with tooltips on hover. The
 *     Qatar MME mark is the sole expand affordance — hovering it swaps the mark
 *     for a `PanelLeftOpen` glyph, and clicking opens the rail (it is *not* a
 *     Home link while collapsed).
 *   • EXPANDED (276px): icon + label rows, no tooltips. The mark + wordmark
 *     sit on the left of the header — inert branding, *not* a link — with a
 *     `PanelLeftClose` button on the right as the sole collapse affordance.
 *
 * The Launch Pad (`#/home`) is reached only through the application row — the
 * logo never navigates. That row opens whichever switcher state the user last
 * chose: the Launch Pad (expanded) or the anchored tile grid (minimized).
 *
 * Hierarchy inside the rail:
 *   active application → white @ 20% · active module → solid white with brand color icon ·
 *   everything else → transparent with a white/10 hover.
 * Inbox lives above the application row because it spans every app. It does not
 * clear the application row, though: the rail stays scoped to the last used
 * app, so that app remains selected while the Inbox is open.
 *
 * The rail reserves its own footprint, so expanding shifts the page's main
 * content rather than floating over it. The blue→green background comes from
 * `--sidebar-gradient`, and the solid `--primary` footer band holds
 * Help / Settings / User.
 */

export interface TadweerNavbarProps {
  /** Id of the module marked active. Pass `undefined` when the current page is
   *  Home / Inbox / Settings — nothing is highlighted then. */
  activeModuleId?: string
  /** Called when the user clicks a module row — host decides what routes. */
  onModuleSelect?: (id: string) => void
  /** Called when the user clicks the Inbox row at the top. */
  onInboxClick?: () => void
  /** Routes to the Launch Pad — the switcher's expanded state. Fired by the
   *  application row while `page` is the remembered choice, and by the popup's
   *  expand button (which also flips the choice back to `page`). */
  onGoHome?: () => void
  /** Called when the user clicks Settings in the footer band. */
  onSettingsClick?: () => void
  inboxActive?: boolean
  settingsActive?: boolean
  /** Unread notification count shown as the Inbox badge. `0` hides the badge. */
  inboxCount?: number
  /** Set by the host to pop the app switcher open on mount — used when the
   *  Launch Pad's minimize button hands the user back to the rail. */
  autoOpenSwitcher?: boolean
  /** Acknowledges `autoOpenSwitcher` so the host can clear its one-shot flag. */
  onSwitcherAutoOpened?: () => void
}

export function TadweerNavbar({
  activeModuleId,
  onModuleSelect,
  onInboxClick,
  onGoHome,
  onSettingsClick,
  inboxActive = false,
  settingsActive = false,
  inboxCount = 0,
  autoOpenSwitcher = false,
  onSwitcherAutoOpened,
}: TadweerNavbarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(autoOpenSwitcher)
  // The application row opens the switcher in its remembered state: `page`
  // (the Launch Pad, the default) or `popup` (the anchored grid). Expand /
  // minimize move between the two and rewrite the preference.
  const [switcherMode, setSwitcherMode] = useSwitcherModePreference()
  const [activeAppId, setActiveAppId] = useActiveAppId()
  const activeApp = useMemo(
    () => HOME_SUITES.find((s) => s.id === activeAppId) ?? HOME_SUITES[0],
    [activeAppId],
  )
  // The rail's module list is filtered to the current app — the app is the
  // parent container, so all its modules from the home suite appear underneath it.
  const visibleModules = useMemo<ModuleLeaf[]>(
    () => activeApp.cards.map((c) => ({ id: c.id, label: c.label, icon: c.icon })),
    [activeApp],
  )
  const switcherAnchorRef = useRef<HTMLButtonElement>(null)
  const modulesScrollRef = useRef<CustomScrollbarHandle>(null)
  const [hasModuleScroll, setHasModuleScroll] = useState(false)

  const checkModuleScroll = useCallback(() => {
    const el = modulesScrollRef.current
    if (!el) return
    const isScrollable = el.scrollHeight - el.clientHeight > 1
    const isNotAtBottom = el.scrollTop < el.scrollHeight - el.clientHeight - 1
    setHasModuleScroll(isScrollable && isNotAtBottom)
  }, [])

  useEffect(() => {
    const el = modulesScrollRef.current
    if (!el) return

    checkModuleScroll()

    const onScroll = () => checkModuleScroll()
    el.addEventListener('scroll', onScroll, { passive: true })

    const ro = new ResizeObserver(() => checkModuleScroll())
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)

    window.addEventListener('resize', checkModuleScroll)

    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
      window.removeEventListener('resize', checkModuleScroll)
    }
  }, [checkModuleScroll, visibleModules, isExpanded])

  const handleSelectApp = (appId: string) => {
    setActiveAppId(appId)
    const targetModuleId = getLastModuleForApp(appId)
    setLastModuleForApp(appId, targetModuleId)
    onModuleSelect?.(targetModuleId)
  }

  const handleSwitcherClick = () => {
    if (switcherMode === 'page') {
      setSwitcherOpen(false)
      onGoHome?.()
      return
    }
    setSwitcherOpen((o) => !o)
  }

  // One-shot: the Launch Pad's minimize button routes back into the app and
  // asks for the switcher to be showing, so the user sees where it went.
  useEffect(() => {
    if (!autoOpenSwitcher) return
    setSwitcherOpen(true)
    onSwitcherAutoOpened?.()
  }, [autoOpenSwitcher, onSwitcherAutoOpened])

  const compact = !isExpanded

  return (
    <TooltipProvider delayDuration={120}>
      <div
        className={cn(
          'relative h-full shrink-0 transition-[width] duration-200 ease-out',
          isExpanded ? 'w-[276px]' : 'w-[46px]'
        )}
      >
        <nav
          aria-label="Primary"
          className={cn(
            'absolute inset-y-0 left-0 flex flex-col overflow-hidden transition-[width] duration-200 ease-out',
            isExpanded ? 'w-[276px]' : 'w-[46px]'
          )}
          style={{
            backgroundColor: 'var(--sidebar)',
            backgroundImage: 'var(--sidebar-gradient, none)',
          }}
        >
          {/* Top group: logo → inbox → app switcher → modules list */}
          <div className="flex min-h-0 flex-1 flex-col gap-3.5 pt-4">
            <div className="flex flex-col gap-3.5 px-2">
              <LogoRow
                compact={compact}
                onExpand={() => setIsExpanded(true)}
                onCollapse={() => setIsExpanded(false)}
              />

              <div className="flex flex-col gap-2.5">
                <RailRow
                  icon={Inbox}
                  label="Inbox"
                  compact={compact}
                  active={inboxActive}
                  count={inboxCount}
                  onClick={onInboxClick}
                />
                {/* Separator above the application row — Inbox spans every app,
                    so it sits on its own; the application and the modules below
                    it read as one group. */}
                <Divider />
                <AppSwitcherRow
                  ref={switcherAnchorRef}
                  compact={compact}
                  label={activeApp.label}
                  icon={activeApp.icon}
                  color={activeApp.color}
                  onToggle={handleSwitcherClick}
                />
              </div>
            </div>

            <CustomScrollbar
              ref={modulesScrollRef}
              className="min-h-0 flex-1"
              viewportClassName={cn('flex flex-col gap-1.5', compact ? 'px-2' : 'pl-2 pr-3')}
              // Hide the overlay thumb — the rail navigates by click, not by scroll,
              // so a visible track adds noise. Wheel/trackpad scroll still works.
              thumbClassName="bg-transparent hover:bg-transparent"
            >
              {visibleModules.map((mod) => (
                <ModuleRow
                  key={mod.id}
                  mod={mod}
                  compact={compact}
                  active={activeModuleId === mod.id}
                  onClick={() => onModuleSelect?.(mod.id)}
                />
              ))}
              {visibleModules.length === 0 && !compact ? (
                <p className="mt-2 px-1.5 text-[12px] leading-[16px] text-white/70">
                  No modules for {activeApp.label} yet.
                </p>
              ) : null}
            </CustomScrollbar>
          </div>

          {/* Bottom band: solid brand blue with subtle upward shadow (only visible if modules list is scrollable). */}
          <div
            className={cn(
              'flex flex-col transition-shadow duration-150',
              hasModuleScroll && 'shadow-[0_-4px_16px_0_rgba(0,0,0,0.1)]'
            )}
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <div className="flex flex-col gap-1.5 px-2 pb-2 pt-1.5">
              <FooterRow icon={HelpCircle} label="Help" compact={compact} />
              <FooterRow
                icon={Settings}
                label="Settings"
                compact={compact}
                active={settingsActive}
                trailing={<ChevronRight size={14} className="text-white/80" />}
                onClick={onSettingsClick}
              />
              <UserRow compact={compact} />
            </div>
            <PoweredByRow compact={compact} />
          </div>

        </nav>

        <AppSwitcherDropdown
          open={switcherOpen}
          onClose={() => setSwitcherOpen(false)}
          onExpand={() => {
            // Expanding is also a preference: the application row opens the
            // Launch Pad from here on, until the user minimizes it again.
            setSwitcherMode('page')
            setSwitcherOpen(false)
            onGoHome?.()
          }}
          activeAppId={activeAppId}
          onSelectApp={handleSelectApp}
          anchorRef={switcherAnchorRef}
        />
      </div>
    </TooltipProvider>
  )
}

/* Top logo row.
 *   • COLLAPSED: the mark is the expand affordance — there is no room for a
 *     separate toggle, and the logo is the one target everybody aims for.
 *   • EXPANDED: mark + wordmark are inert branding (the Launch Pad is reached
 *     from the app switcher instead); a collapse button on the right returns
 *     the rail to 46px. */
function LogoRow({
  compact,
  onExpand,
  onCollapse,
}: {
  compact: boolean
  onExpand: () => void
  onCollapse: () => void
}) {
  if (compact) {
    return (
      <div className="flex h-[30px] shrink-0 items-center justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onExpand}
              aria-label="Expand Sidebar"
              aria-expanded={false}
              className="group flex size-7 shrink-0 items-center justify-center rounded-[4px] outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40"
            >
              {/* Hover (or keyboard focus) trades the mark for the expand glyph
                  — the rail's only expand affordance now that the edge pill is
                  gone, so it has to announce itself on approach. */}
              <img
                src="/assets/qatar-mme-rail-mark.svg"
                alt="Qatar MME"
                className="h-7 w-7 group-hover:hidden group-focus-visible:hidden"
              />
              <PanelLeftOpen
                size={18}
                aria-hidden
                className="hidden text-white group-hover:block group-focus-visible:block"
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand Sidebar</TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="flex h-[30px] shrink-0 items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <img src="/assets/fams-logo-full.svg" alt="FAMS" className="h-7 w-auto" />
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse Sidebar"
            aria-expanded
            className="flex size-6 shrink-0 items-center justify-center rounded-[4px] text-white/80 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <PanelLeftClose size={16} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Collapse Sidebar</TooltipContent>
      </Tooltip>
    </div>
  )
}

/* Hairline divider between rail sections. */
function Divider() {
  return <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
}

/* Generic rail row (Inbox). Collapsed: 30×30 icon square with a right-side
   tooltip carrying the label, and unread shown as a bare corner DOT — digits
   don't survive at 30px, and the tooltip already carries the number (this also
   matches the mobile top bar's inbox indicator).
   Expanded: full-width row with icon + label + a trailing fully-rounded count
   pill, where there is room for the digits to read. */
function RailRow({
  icon: Icon,
  label,
  compact,
  active = false,
  count = 0,
  onClick,
}: {
  icon: LucideIcon
  label: string
  compact: boolean
  active?: boolean
  count?: number
  onClick?: () => void
}) {
  // Past 99 the pill wraps to the usual overflow form.
  const badgeText = count > 99 ? '99+' : String(count)
  const badge =
    count > 0 ? (
      compact ? (
        <span
          aria-hidden
          className="absolute right-0.5 top-0.5 size-2 rounded-full"
          style={{ background: 'var(--status-error, #f04438)' }}
        />
      ) : (
        <span
          aria-hidden
          className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none text-white"
          style={{ background: 'var(--status-error, #f04438)' }}
        >
          {badgeText}
        </span>
      )
    ) : null

  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={count > 0 ? `${label}, ${count} unread` : label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-[30px] items-center rounded-[4px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40',
        compact ? 'w-[30px] justify-center' : 'w-full gap-2 px-1.5',
        active ? 'bg-white' : 'hover:bg-white/10'
      )}
    >
      <Icon size={20} className={active ? 'text-primary' : 'text-white'} />
      {!compact ? (
        <span
          className={cn(
            'flex-1 truncate text-left text-[14px] leading-[18px]',
            active ? 'font-semibold text-primary' : 'font-medium text-white'
          )}
        >
          {label}
        </span>
      ) : null}
      {badge}
    </button>
  )

  if (!compact) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">
        {count > 0 ? `${label} (${badgeText})` : label}
      </TooltipContent>
    </Tooltip>
  )
}

/* App-switcher row — this IS the current application, so it always carries the
   white @ 20% fill: it marks the rail's scope, not the current page, and that
   scope survives cross-application surfaces like the Inbox. Forwards a ref so
   the popover can anchor to the button. Tooltips in collapsed state. */
const AppSwitcherRow = forwardRef<
  HTMLButtonElement,
  {
    compact: boolean
    label: string
    icon: LucideIcon
    /** Active app's brand color */
    color?: string
    onToggle: () => void
  }
>(function AppSwitcherRow({ compact, label, icon: Icon, color: _color, onToggle }, ref) {
  const button = (
    <button
      ref={ref}
      type="button"
      onClick={onToggle}
      aria-label={`Switch application (${label})`}
      aria-haspopup="dialog"
      className={cn(
        'flex h-[30px] items-center rounded-[4px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40',
        compact ? 'w-[30px] justify-center' : 'w-full gap-2 px-1.5',
        // Always filled: the row names the app the rail is scoped to, and that
        // scope holds on cross-application surfaces too — stepping into the
        // Inbox doesn't leave the app, so the last used app stays selected.
        'bg-white/20 hover:bg-white/25'
      )}
    >
      <Icon size={20} className="text-white" />
      {!compact ? (
        <>
          <span
            className="flex-1 truncate text-left text-[14px] font-semibold leading-[18px] text-white"
          >
            {label}
          </span>
          <ChevronsUpDown
            size={14}
            className="text-white/80"
          />
        </>
      ) : null}
    </button>
  )

  if (!compact) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label} — Switch Application</TooltipContent>
    </Tooltip>
  )
})

/* One flat module list row. Tooltip carries the label in collapsed state. */
function ModuleRow({
  mod,
  compact,
  active,
  onClick,
}: {
  mod: ModuleLeaf
  compact: boolean
  active: boolean
  onClick: () => void
}) {
  const Icon = mod.icon
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={mod.label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-[30px] shrink-0 items-center rounded-[4px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40',
        compact ? 'w-[30px] justify-center' : 'w-full gap-2 px-1.5',
        active ? 'bg-white hover:bg-white' : 'hover:bg-white/10'
      )}
    >
      <Icon size={18} className={active ? 'text-primary' : 'text-white'} />
      {!compact ? (
        <span
          className={cn(
            'truncate text-left text-[14px] leading-[18px]',
            active ? 'font-semibold text-primary' : 'font-medium text-white'
          )}
        >
          {mod.label}
        </span>
      ) : null}
    </button>
  )

  if (!compact) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{mod.label}</TooltipContent>
    </Tooltip>
  )
}

/* Footer row (Help, Settings). Same 4px radius as the modules; no default
   background — only hover / active fills. Tooltips in the collapsed state. */
function FooterRow({
  icon: Icon,
  label,
  compact,
  active = false,
  trailing,
  onClick,
}: {
  icon: LucideIcon
  label: string
  compact: boolean
  active?: boolean
  trailing?: React.ReactNode
  onClick?: () => void
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-[30px] items-center rounded-[4px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40',
        compact ? 'w-[30px] justify-center' : 'w-full gap-2 px-1.5',
        active ? 'bg-white/20' : 'hover:bg-white/10'
      )}
    >
      <Icon size={16} className="text-white" />
      {!compact ? (
        <>
          <span className="flex-1 truncate text-left text-[12px] font-medium leading-[18px] text-white">
            {label}
          </span>
          {trailing}
        </>
      ) : null}
    </button>
  )

  if (!compact) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

/* User row — avatar-only when compact (with tooltip), avatar + name/email +
   chevron when expanded. */
function UserRow({ compact }: { compact: boolean }) {
  const avatarUrl = 'https://i.pravatar.cc/48?img=68'
  const name = 'FAMS Admin'
  const email = 'FAMS@fams.com'
  // Collapsed, the row is icon-only, so it needs a name of its own — and it
  // names the DESTINATION, like every other tooltip in this rail ("Inbox",
  // "Settings", "Help"), not the signed-in person: the avatar already says who
  // that is. Expanded, the visible "FAMS Admin" text names the button, so
  // no aria-label is set there (an override would break label-in-name).
  const button = (
    <button
      type="button"
      aria-label={compact ? 'Account' : undefined}
      className={cn(
        'flex items-center rounded-[4px] outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40',
        compact ? 'mx-auto size-7 justify-center' : 'h-[30px] w-full gap-2 px-0.5'
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/40">
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      </span>
      {!compact ? (
        <>
          <span className="flex-1 truncate text-left text-[12px] font-medium leading-[18px] text-white">
            {name}
          </span>
          <ChevronRight size={14} className="mr-[6px] text-white/80" />
        </>
      ) : null}
    </button>
  )

  if (!compact) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">Account</TooltipContent>
    </Tooltip>
  )
}

/* Powered By — a thin strip under the footer band, separated by a full-bleed
   hairline. Figma "Qatar MME — Launch Pad" nodes `6858:4098` (expanded) and
   `6858:4495` (collapsed), which set the metrics used here: a 12px-tall content
   row with 6px above and below it, inset 14px from each edge.
     • COLLAPSED: the FAMS wordmark alone, centred — no room for the caption,
       and the mark reads at 24px wide inside the 46px rail.
     • EXPANDED: "Powered By" on the left, the full FAMS lockup (mark +
       wordmark) on the right.
   Both use the flat-white assets exported from the Figma lockup — the DS's own
   `fams-icon` / `fams-white` pair is the blue-gradient mark, which disappears
   against the rail's green footer. */
function PoweredByRow({ compact }: { compact: boolean }) {
  return (
    <div
      className={cn(
        'flex h-[24px] items-center border-t border-white/20',
        // 14px inset matches the Figma frame when expanded; the 46px collapsed
        // rail can't spare it — that much padding squeezes the mark — so it
        // falls back to 8px and centres.
        compact ? 'justify-center px-2' : 'justify-start gap-2 px-3.5',
      )}
    >
      {compact ? (
        <img
          src="/assets/fams-wordmark-white.svg"
          alt="Powered by FAMS"
          className="h-[10px] w-auto shrink-0"
        />
      ) : (
        <>
          <span className="text-[10px] font-medium leading-[12px] text-white/85">
            Powered By
          </span>
          <img
            src="/assets/fams-logo-white.svg"
            alt="FAMS"
            className="h-[12px] w-auto shrink-0"
          />
        </>
      )}
    </div>
  )
}
