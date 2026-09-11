import {
  cloneElement,
  forwardRef,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Dialog } from 'radix-ui'
import { cn } from '../lib/cn'
import { ToasterHost } from '../primitives/Toast'
import type { ToasterProps } from 'sonner'
import { TopNavSlotProvider, useTopNavSlotHost } from './top-nav-slot'

export interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The outer app/module icon rail (`SideNav`). Rendered inline on `md+` and
   * inside the mobile drawer below `md`.
   */
  sidebar: ReactElement<{ isCollapsed?: boolean }>
  /**
   * The inner per-module menu (`ModuleRail`) — the second bar of the two-bar
   * navigation. Optional: modules without a sub-nav omit it. Rendered inline
   * after the icon rail on `md+`, and inside the mobile drawer after the rail.
   */
  moduleRail?: ReactNode
  /**
   * The top bar — a `TopNav`. Cloned with an `onMenuClick` handler so its
   * hamburger opens the mobile drawer, and with the slot refs that let the
   * ACTIVE PAGE portal its own tabs/actions into this one bar instead of
   * rendering a second one below it (see `top-nav-slot.tsx` for why ownership
   * is split this way rather than duplicated). Callers wire neither.
   */
  topNav: ReactElement<{
    onMenuClick?: () => void
    tabsSlotRef?: (node: HTMLElement | null) => void
    actionsSlotRef?: (node: HTMLElement | null) => void
    titleSlotRef?: (node: HTMLElement | null) => void
  }>
  /**
   * Accepted for backward compatibility. The rail is now a permanent icon rail,
   * so this is inert — kept so existing callers don't break.
   */
  defaultCollapsed?: boolean
  /**
   * Mount the default toast sink (`ToasterHost`) inside the shell, so
   * `toast()` from anywhere in the app has somewhere to land. Defaults to
   * `true`; it stands aside automatically when the consumer already renders
   * its own `<Toaster />`. Pass `false` for an app that mounts its toaster
   * later than the shell.
   *
   * Pass an OBJECT to keep the sink but configure it — the props are forwarded
   * to `ToasterHost` and override its defaults, e.g.
   * `toaster={{ position: 'bottom-left', duration: 8000 }}`. The host defaults
   * to the top-right corner because a full-bleed page (a map) parks its
   * floating controls bottom-end and a toast there covers them. (Sonner's
   * positions are physical, so an RTL app that wants the mirrored corner
   * passes `toaster={{ position: 'top-left' }}`.)
   */
  toaster?: boolean | ToasterProps
  /** Main content. */
  children: ReactNode
}

/**
 * AppShell — the FAMS responsive application frame (two-bar navigation).
 *
 * Desktop (`md+`): `[ app icon rail | module rail | (top bar / main) ]`. The
 * outer `SideNav` (tenant-colored) and the inner `ModuleRail` (white) both sit
 * on the logical `start` edge — first flex children, so they flip to the right
 * in RTL.
 *
 * Mobile (`< md`): both rails are hidden inline; the top-bar hamburger opens
 * them together as an overlay drawer (Radix Dialog) anchored to the `start`
 * edge. The drawer auto-closes on navigation (clicking any rail link bubbles to
 * `onClick`).
 *
 * Content is wrapped in the `surface-minimal` canvas token so pages render on
 * the FAMS canvas color regardless of their own background.
 */
export const AppShell = forwardRef<HTMLDivElement, AppShellProps>(
  ({ sidebar, moduleRail, topNav, children, className, toaster = true, ...props }, ref) => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const { slotRefs, slots } = useTopNavSlotHost()

    // `defaultCollapsed` is accepted for compat but no longer drives layout.
    delete (props as { defaultCollapsed?: boolean }).defaultCollapsed

    const header = cloneElement(topNav, {
      onMenuClick: () => setIsDrawerOpen(true),
      ...slotRefs,
    })

    return (
      <div
        ref={ref}
        className={cn(
          'flex h-screen w-full overflow-hidden bg-background text-foreground',
          className,
        )}
        {...props}
      >
        {/* Desktop: outer icon rail + inner module rail, inline on the start edge. */}
        <div className="hidden md:flex">{sidebar}</div>
        {moduleRail ? (
          <div className="hidden md:flex">{moduleRail}</div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          {header}
          {/* The provider wraps only the page content, never the bar itself —
              the bar is the portal TARGET, so a page inside this provider fills
              the bar above it rather than rendering one of its own. */}
          <TopNavSlotProvider value={slots}>
            <main className="min-h-0 flex-1 overflow-auto bg-surface-minimal">{children}</main>
          </TopNavSlotProvider>
        </div>

        {/* Mobile drawer — both rails as an overlay on the start edge. */}
        <Dialog.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40 md:hidden" />
            <Dialog.Content
              aria-label="Navigation"
              className="fixed inset-y-0 start-0 z-50 flex md:hidden focus:outline-none"
              onCloseAutoFocus={() => setIsDrawerOpen(false)}
            >
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              {/* Auto-close the drawer when a rail item is activated. Click
                  delegation only — the real interactive elements are the nav
                  items inside (sidebar/rail), which are already keyboard
                  operable; this wrapper isn't itself a control. */}
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <div className="flex" onClick={() => setIsDrawerOpen(false)}>
                {sidebar}
                {moduleRail}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Default toast sink — see `ToasterHost` for the double-mount guard. */}
        {toaster ? <ToasterHost {...(typeof toaster === 'object' ? toaster : null)} /> : null}
      </div>
    )
  },
)

AppShell.displayName = 'AppShell'
