import { useRef, type ReactNode } from 'react'
import { LogOut } from '../icons'
import { cn } from '../lib/cn'
import { Avatar } from '../primitives/Avatar'
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/Popover'

/**
 * UserPopover — compact identity popover: one row of avatar + name + email
 * with a trailing destructive logout icon-button. [L3 composite]
 *
 * The anchored "who am I / sign out" surface for an app shell's user icon
 * (Figma node 23099:17295 "popup"): a POPOVER, not a modal — no scrim, no
 * focus trap; Escape, outside click, and trigger re-click all dismiss it and
 * focus returns to the trigger (all owned by the `Popover` primitive, which
 * is grandfathered Radix per decision #7 — reused here, no new Radix import).
 * Unlike `UserMenu` (identity header + a caller-defined menu-item list on
 * DropdownMenu semantics), this renders NO menu: the only interactive child
 * is the logout button, so the content is a non-modal dialog, not a menu.
 *
 * State-agnostic (rule 8): identity fields and the logout callback are
 * caller-supplied; no auth, no session, no navigation in here. The trigger is
 * a caller-supplied slot (rendered `asChild`) so shells can anchor it to
 * whatever chrome they own (e.g. `SideNavFooterItem`).
 *
 * @usage-v5
 *   The v5 sidebar's bottom user icon opened `UserMenu.vue` — this is the
 *   Figma-current compact replacement for the identity + logout affordance
 *   (v5-kit's `V5AppShell` wires it onto the rail-footer user item).
 * @usage-index user-popover
 */
export interface UserPopoverProps {
  /** Display name — first row, also seeds the avatar initials. */
  name: string
  /** Secondary identity line; truncates to one line, full value via `title`. */
  email?: string
  avatarSrc?: string
  /** Fired when the logout icon-button is pressed. */
  onLogout?: () => void
  /** Accessible name for the logout icon-button. */
  logoutLabel?: string
  /**
   * The anchor element (rendered `asChild` — must be a focusable, ref-taking
   * button-like element). The primitive wires `aria-haspopup`/`aria-expanded`
   * onto it and returns focus to it on dismiss.
   */
  trigger: ReactNode
  /** Popover placement relative to the trigger. Defaults open UP from a bottom-rail icon. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  /**
   * Shift along the align axis (px) — e.g. a shell whose trigger sits INSIDE
   * a nav rail passes the rail's width so the popover clears the rail instead
   * of overlapping it (logout-popup Figma: left edge flush with the rail's
   * right edge).
   */
  alignOffset?: number
  /** Controlled open state. */
  open?: boolean
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

export function UserPopover({
  name,
  email,
  avatarSrc,
  onLogout,
  logoutLabel = 'Log out',
  trigger,
  side = 'top',
  align = 'start',
  alignOffset,
  open,
  defaultOpen,
  onOpenChange,
  className,
}: UserPopoverProps) {
  const logoutRef = useRef<HTMLButtonElement>(null)

  return (
    <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        alignOffset={alignOffset}
        sideOffset={8}
        collisionPadding={16}
        aria-label={`${name} — account`}
        // Popover pattern (spec): on open, focus the first (only) interactive
        // child — the logout button — instead of the content wrapper.
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          logoutRef.current?.focus()
        }}
        data-slot="user-popover"
        className={cn(
          // Hug content, clamp ≤ max-w-72 so a long name/email truncates
          // instead of pushing the logout button out (UX-NOTES §3). Tight
          // Figma-spec shadow (shadow.popover-sm), not the generic elevation.
          'flex w-auto max-w-72 items-center gap-1.5 rounded-sm p-3 shadow-popover-sm',
          className,
        )}
      >
        {/* 28px avatar (Figma) — size token override on the sm variant's type
            pairing. `tone="neutral"` per the logout-popup spec: neutral-300
            ground + neutral-600 initial, NOT the per-person hash palette. */}
        <Avatar size="sm" className="size-7 text-caption" src={avatarSrc} name={name} tone="neutral" />
        {/* Tight line heights so the popover height lands near the Figma
            anatomy's 55px hug (12 + ~31 content row + 12) instead of the type
            ramp's default leading inflating it. */}
        <div className="min-w-0 flex-1">
          <div title={name} className="truncate text-body-sm font-semibold leading-tight text-foreground">
            {name}
          </div>
          {email ? (
            // Intentionally very light per Figma (gray-300 ramp token; the
            // `title` above/below is the behavioral compensation — UX-NOTES §3).
            // Medium weight per spec (Gilroy Medium 12).
            <div title={email} className="truncate text-caption font-medium leading-tight text-gray-300">
              {email}
            </div>
          ) : null}
        </div>
        <button
          ref={logoutRef}
          type="button"
          aria-label={logoutLabel}
          title={logoutLabel}
          onClick={onLogout}
          data-slot="user-popover-logout"
          // 18px glyph on a 40x40 hit target (UX-NOTES §3/§7 icon-button
          // floor) WITHOUT inflating the popover past Figma's 55px hug: the
          // negative logical margins (-my-3 = -12px each side) collapse the
          // button's layout box to 40 − 24 = 16px, so the row height stays
          // text-driven — same footprint as the earlier 32px/-my-2 box, but
          // with the mandated hit area. Never shrink the button instead.
          className={cn(
            '-my-3 -me-2.5 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-sm outline-none',
            'text-destructive transition-colors hover:bg-destructive/10',
            'focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <LogOut aria-hidden className="size-4.5" />
        </button>
      </PopoverContent>
    </Popover>
  )
}

UserPopover.displayName = 'UserPopover'
