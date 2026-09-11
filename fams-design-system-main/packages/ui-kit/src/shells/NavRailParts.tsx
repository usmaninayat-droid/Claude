import {
  createContext,
  forwardRef,
  useContext,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { ChevronsUpDown } from '../icons'
import { cn } from '../lib/cn'
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/Tooltip'

/**
 * NavRailParts — the row building blocks of `NavRail` (see NavRail.tsx).
 * [L4 shell parts]
 *
 * All rows read the rail's expansion state from `NavRailContext` so consumer
 * compositions (footer rows, user row) can never drift from the rail's own
 * rows. Collapsed rows are 30×30 icon squares with a right-side tooltip;
 * expanded rows are full-width icon + label. Ported from the
 * designer-approved "home + side nav" prototype (`TadweerNavbar.tsx`).
 *
 * Also home to `NavRailSwitcherRow`, the application row — split out of
 * `NavRail.tsx` on touch to keep that file inside the line budget.
 */

export interface NavRailContextValue {
  /** True while the rail shows labels (pinned-expanded or hover-expanded). */
  expanded: boolean
}

const NavRailContext = createContext<NavRailContextValue>({ expanded: true })

export const NavRailContextProvider = NavRailContext.Provider

/** Read the rail's current expansion state (for custom row content). */
export function useNavRail(): NavRailContextValue {
  return useContext(NavRailContext)
}

/** Right-side tooltip wrapper applied to every row while collapsed. */
function CollapsedTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

export interface NavRailRowProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name; the visible label when expanded, the tooltip when collapsed. */
  label: string
  /** 18px glyph. */
  icon?: ReactNode
  /** Current-page state: white chip + brand-colored icon/label. */
  active?: boolean
  /** Small corner/edge dot (e.g. inbox unread) — `bg-destructive`. */
  notificationDot?: boolean
  /**
   * Unread COUNT for this row. When > 0 it renders INSTEAD of
   * `notificationDot`, and its shape follows the rail's width: the count
   * PILL while expanded ("Inbox 13"), a bare DOT while collapsed — digits
   * don't read inside a 30px square, so the collapsed rail carries the
   * number in the row's accessible name and tooltip instead (reference
   * build's documented radius exception). Counts above 99 render as "99+".
   */
  badgeCount?: number
  /** Trailing adornment when expanded (e.g. a chevron). */
  trailing?: ReactNode
  /** Smaller footer-band typography (Settings/Help rows). */
  tone?: 'item' | 'footer'
}

/**
 * NavRailRow — one 30px-high rail row (module, inbox, settings, help).
 * Active = white fill + `text-primary`; inactive = white text, white/10 hover.
 * Footer tone uses the softer white/20 active fill and 12px label.
 */
export const NavRailRow = forwardRef<HTMLButtonElement, NavRailRowProps>(
  (
    {
      label,
      icon,
      active = false,
      notificationDot = false,
      badgeCount,
      trailing,
      tone = 'item',
      className,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const { expanded } = useNavRail()
    const footer = tone === 'footer'
    const hasBadge = typeof badgeCount === 'number' && badgeCount > 0
    const badgeText = hasBadge ? (badgeCount > 99 ? '99+' : String(badgeCount)) : ''
    // The count must reach assistive tech (and the collapsed tooltip) even
    // when the visible badge is only a dot.
    const accessibleName = hasBadge ? `${label}, ${badgeText} unread` : label
    const button = (
      <button
        ref={ref}
        type={type}
        aria-label={accessibleName}
        aria-current={active ? 'page' : undefined}
        data-active={active || undefined}
        className={cn(
          'relative flex h-7.5 shrink-0 items-center rounded-sm outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-white/40',
          expanded ? 'w-full gap-2 px-1.5' : 'w-7.5 justify-center',
          active
            ? footer
              ? 'bg-white/20'
              : 'bg-white'
            : 'hover:bg-white/10',
          className,
        )}
        {...props}
      >
        <span
          aria-hidden
          className={cn(
            'flex shrink-0 items-center justify-center',
            footer ? '[&_svg]:size-4' : '[&_svg]:size-4.5',
            // AA-safe brand step on the white active chip: a tenant whose
            // primary is a light brand colour (Tadweer green, 2.18:1 on
            // white) supplies `--color-primary-text`; others fall back.
            active && !footer ? 'text-[color:var(--color-primary-text,var(--color-primary))]' : 'text-white',
          )}
        >
          {icon}
        </span>
        {expanded ? (
          <>
            <span
              className={cn(
                'flex-1 truncate text-start leading-4.5',
                'text-sm',
                footer ? 'font-medium text-white' : '',
                !footer && (active ? 'font-semibold text-[color:var(--color-primary-text,var(--color-primary))]' : 'font-medium text-white'),
              )}
            >
              {label}
            </span>
            {trailing}
          </>
        ) : null}
        {hasBadge && expanded ? (
          <span
            aria-hidden
            data-slot="navrail-row-badge"
            className="min-w-6 shrink-0 rounded-full bg-destructive px-1.5 py-0.5 text-center text-[0.6875rem] font-bold leading-3.5 text-white tabular-nums"
          >
            {badgeText}
          </span>
        ) : hasBadge ? (
          <span
            aria-hidden
            data-slot="navrail-row-dot"
            className="absolute end-0.5 top-0.5 inline-block size-2 shrink-0 rounded-full bg-destructive"
          />
        ) : notificationDot ? (
          <span
            aria-hidden
            data-slot="navrail-row-dot"
            className={cn(
              'inline-block size-2 shrink-0 rounded-full bg-destructive',
              expanded ? 'me-1' : 'absolute end-0.5 top-0.5',
            )}
          />
        ) : null}
      </button>
    )
    if (expanded) return button
    return (
      <CollapsedTooltip label={hasBadge ? `${label} (${badgeText})` : label}>
        {button}
      </CollapsedTooltip>
    )
  },
)
NavRailRow.displayName = 'NavRailRow'

export interface NavRailUserRowProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  name: string
  email?: string
  /**
   * Avatar image URL; falls back to the name's initial on a solid white disc
   * (fix7, P1-3 gate blocker: was a translucent `bg-white/20` wash over the
   * rail's own solid `bg-primary` — composites to #338ede, 3.45:1 for the
   * white initial text. Solid white + `text-primary` reads 4.80:1 in both
   * themes and needs no ancestor-color math to stay correct, since it no
   * longer blends with whatever the rail happens to sit on).
   */
  avatarSrc?: string
  /** Trailing adornment when expanded (defaults to none — pass a chevron). */
  trailing?: ReactNode
}

/**
 * NavRailUserRow — the footer band's user entry: avatar-only when collapsed
 * (with tooltip), avatar + name/email + optional trailing chevron expanded.
 * A plain button so a consumer can wrap it in a popover trigger (identity /
 * logout — e.g. `UserPopover`).
 */
export const NavRailUserRow = forwardRef<HTMLButtonElement, NavRailUserRowProps>(
  ({ name, email, avatarSrc, trailing, className, type = 'button', ...props }, ref) => {
    const { expanded } = useNavRail()
    const button = (
      <button
        ref={ref}
        type={type}
        aria-label={name}
        className={cn(
          'flex items-center rounded-sm outline-none transition-colors duration-fast hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40',
          expanded ? 'h-7.5 w-full gap-2 px-0.5' : 'mx-auto size-7 justify-center',
          className,
        )}
        {...props}
      >
        <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-xs font-semibold text-primary">
          {avatarSrc ? <img src={avatarSrc} alt="" className="size-full object-cover" /> : name.charAt(0).toUpperCase()}
        </span>
        {expanded ? (
          <>
            <span className="flex min-w-0 flex-1 flex-col text-start text-white">
              <span className="truncate text-xs font-medium leading-4.5">{name}</span>
              {email ? <span className="truncate text-[0.625rem] leading-3 text-white/80">{email}</span> : null}
            </span>
            {trailing}
          </>
        ) : null}
      </button>
    )
    if (expanded) return button
    return <CollapsedTooltip label={name}>{button}</CollapsedTooltip>
  },
)
NavRailUserRow.displayName = 'NavRailUserRow'

/** Hairline divider between rail sections (white/20, full width). */
export function NavRailDivider() {
  return <div aria-hidden className="h-px w-full shrink-0 bg-white/20" />
}

/* Current-app switcher row. Selection hierarchy, strongest fill last:
     active module   → SOLID white (the current PAGE)
     active app row  → white @ 25% (the current SCOPE)
     everything else → transparent, white/10 on hover
   A solid-white application row competed with the active module and read as
   ambiguous, so the scope fill stays translucent. `active={false}` drops it
   entirely — used while the current page is cross-application (inbox), where
   the rail is inside no single app.
   forwardRef so `PopoverAnchor asChild` can anchor to the button itself. */
export const NavRailSwitcherRow = forwardRef<
  HTMLButtonElement,
  {
    label: string
    icon?: ReactNode
    expanded: boolean
    active?: boolean
    onToggle: () => void
  } & HTMLAttributes<HTMLButtonElement>
>(function NavRailSwitcherRow({ label, icon, expanded, active = true, onToggle, ...props }, ref) {
  const button = (
    <button
      ref={ref}
      type="button"
      onClick={onToggle}
      aria-label={`Switch application (${label})`}
      aria-haspopup="dialog"
      data-active={active || undefined}
      className={cn(
        'flex h-7.5 items-center rounded-sm outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-white/40',
        active ? 'bg-white/25 hover:bg-white/30' : 'hover:bg-white/10',
        expanded ? 'w-full gap-2 px-1.5' : 'w-7.5 justify-center',
      )}
      {...props}
    >
      <span aria-hidden className="flex shrink-0 items-center justify-center text-white [&_svg]:size-4.5">
        {icon}
      </span>
      {expanded ? (
        <>
          <span className="flex-1 truncate text-start text-sm font-semibold leading-4.5 text-white">{label}</span>
          <ChevronsUpDown aria-hidden className="size-3.5 text-white/80" />
        </>
      ) : null}
    </button>
  )
  if (expanded) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">Switch Application</TooltipContent>
    </Tooltip>
  )
})
NavRailSwitcherRow.displayName = 'NavRailSwitcherRow'
