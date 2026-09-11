import { forwardRef, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Avatar } from '../primitives/Avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../primitives/DropdownMenu'

/**
 * UserMenu — the app-shell identity control: avatar trigger + identity
 * header + a caller-defined action list. [L3 composite]
 *
 * Composes `Avatar` (trigger + header) and `DropdownMenu` (Radix) — a11y,
 * keyboard nav, focus management, and RTL live in the primitive; this file
 * adds only the identity header and generic item rendering on top. Rows carry
 * no business vocabulary: `label`/`icon`/`onSelect`/`destructive` only, never
 * `isProfileRow`/`isLogout`. State-agnostic (Rule 8) — no auth, no session,
 * no navigation; every field and every callback is caller-supplied.
 *
 * @usage-v5
 *   Consolidates `shared/components/menus/UserMenu.vue` — a `q-menu` anchored
 *   to an avatar, showing name/email, a conditional "Workforce Profile" row,
 *   a "User Profile" row, and a destructive "Logout" row (`q-icon
 *   color="negative"`), each hand-wired to `useAuthStore`/`useViewStore`.
 *   Forms needed: avatar+name/email header, generic item list, one
 *   destructive row, conditional rows via caller-side `items` filtering.
 * @usage-index user-menu
 */

export interface UserMenuItem {
  /** Stable row key. */
  key: string
  label: ReactNode
  icon?: ReactNode
  onSelect?: () => void
  /** Danger tone for the row (e.g. sign-out, delete account). */
  destructive?: boolean
  disabled?: boolean
}

export interface UserMenuProps {
  /** Display name — shown in the trigger (when `showName`) and identity header. */
  name?: string
  /** Secondary identity line under `name` in the header (e.g. email). */
  email?: string
  /** Tertiary identity line under `email` in the header (e.g. job title). */
  jobTitle?: string
  avatarSrc?: string
  /** Menu rows. Order, content, and behavior are entirely caller-supplied. */
  items: UserMenuItem[]
  /** Show `name` beside the avatar in the trigger. Default false (avatar-only). */
  showName?: boolean
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Avatar size, mirrored by the trigger's overall footprint. */
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  /** Controlled open state of the menu. */
  open?: boolean
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean
  /** Fired when the menu opens or closes. */
  onOpenChange?: (open: boolean) => void
}

export const UserMenu = forwardRef<HTMLButtonElement, UserMenuProps>(
  (
    {
      name,
      email,
      jobTitle,
      avatarSrc,
      items,
      showName = false,
      align = 'end',
      side = 'bottom',
      size = 'md',
      disabled = false,
      className,
      open,
      defaultOpen,
      onOpenChange,
    },
    ref,
  ) => {
    const hasHeader = Boolean(name || email)

    return (
      <DropdownMenu open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            aria-label={showName ? undefined : (name ? `${name} — account menu` : 'Account menu')}
            data-slot="user-menu-trigger"
            className={cn(
              'flex items-center gap-2 rounded-full outline-none transition-colors',
              'hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              disabled && 'pointer-events-none opacity-50',
              className,
            )}
          >
            <Avatar size={size} src={avatarSrc} name={name} />
            {showName && name ? (
              <span className="max-w-40 truncate text-body-sm font-medium text-foreground">{name}</span>
            ) : null}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align={align} side={side} className="w-64">
          {hasHeader ? (
            <>
              <div data-slot="user-menu-header" className="flex items-center gap-3 p-2">
                <Avatar size="md" src={avatarSrc} name={name} />
                <div className="min-w-0">
                  {name ? (
                    <div className="truncate text-body-sm font-semibold text-foreground">{name}</div>
                  ) : null}
                  {email ? (
                    <div className="truncate text-caption text-muted-foreground">{email}</div>
                  ) : null}
                  {jobTitle ? (
                    <div className="truncate text-caption text-muted-foreground">{jobTitle}</div>
                  ) : null}
                </div>
              </div>
              <DropdownMenuSeparator />
            </>
          ) : null}

          {items.map((item) => (
            <DropdownMenuItem
              key={item.key}
              disabled={item.disabled}
              destructive={item.destructive}
              onSelect={item.onSelect}
            >
              {item.icon ? (
                <span className="flex size-4 shrink-0 items-center justify-center">{item.icon}</span>
              ) : null}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  },
)

UserMenu.displayName = 'UserMenu'
