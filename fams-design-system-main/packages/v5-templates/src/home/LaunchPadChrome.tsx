import type { ReactNode } from 'react'
import { Inbox, Minimize } from '@fams/ui-kit/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@fams/ui-kit'
import { cn } from '../lib/cn'

/**
 * LaunchPadChrome — the launch pad's own page chrome: the top bar and the
 * bottom wave. Split out of `HomeLaunchPad.tsx` to keep that file inside the
 * line budget. [v5 tier, launch-pad parts]
 */

export interface LaunchPadTopBarProps {
  /** Tenant mark, rendered at the bar's height on the leading edge. */
  logo?: ReactNode
  /** Tenant/brand name beside the logo. */
  title?: string
  /** Inbox button on the trailing edge. Omit to hide. */
  onInbox?: () => void
  /** Unread dot on the inbox button. */
  inboxDot?: boolean
  /**
   * Minimize the launch pad back to the rail's anchored app-switcher popup.
   * Sits immediately after the inbox button, desktop-only. Omit to hide.
   */
  onMinimize?: () => void
  className?: string
}

/**
 * The launch pad's top bar: 60px tall with 40px side margins, tenant lockup
 * on the leading edge, inbox (then minimize) on the trailing edge. It is page
 * chrome — it sits ABOVE the scrolling content column, so the tenant mark and
 * the inbox never scroll away.
 */
export function LaunchPadTopBar({
  logo,
  title,
  onInbox,
  inboxDot = false,
  onMinimize,
  className,
}: LaunchPadTopBarProps) {
  return (
    <div
      data-slot="launch-pad-top-bar"
      className={cn('relative z-20 flex h-15 shrink-0 items-center justify-between gap-4 px-10', className)}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-3">
        {logo ? (
          <span
            aria-hidden
            className="flex h-10 shrink-0 items-center [&_img]:h-10 [&_img]:w-auto [&_svg]:h-10 [&_svg]:w-auto"
          >
            {logo}
          </span>
        ) : null}
        {title ? (
          <span className="truncate text-lg font-extrabold tracking-tight text-foreground select-none">
            {title}
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {onInbox ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onInbox}
                aria-label="Inbox"
                className="relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-muted-foreground outline-none transition-colors duration-fast hover:bg-muted hover:text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Inbox aria-hidden className="size-5" />
                {inboxDot ? (
                  <span aria-hidden className="absolute end-2 top-2 size-2 rounded-full bg-destructive" />
                ) : null}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Inbox</TooltipContent>
          </Tooltip>
        ) : null}
        {onMinimize ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onMinimize}
                aria-label="Minimize to app switcher"
                className="hidden shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-muted-foreground outline-none transition-colors duration-fast hover:bg-muted hover:text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring sm:flex sm:size-10"
              >
                <Minimize aria-hidden className="size-4.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Minimize to app switcher</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}

LaunchPadTopBar.displayName = 'LaunchPadTopBar'

/**
 * The launch pad's bottom wave. The asset arrives as a `url` PROP and is used
 * as a CSS MASK, never as an image — so the tint comes from the tenant's
 * `--color-primary` (at 15%) instead of a colour baked into the file, and one
 * asset serves every tenant.
 */
export function LaunchPadWave({ url, className }: { url: string; className?: string }) {
  return (
    <div
      aria-hidden
      data-slot="launch-pad-wave"
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 z-0 w-full bg-primary opacity-15',
        'h-65 sm:h-auto sm:aspect-[1440/415]',
        className,
      )}
      style={{
        maskImage: `url(${url})`,
        WebkitMaskImage: `url(${url})`,
        maskSize: 'cover',
        WebkitMaskSize: 'cover',
        maskPosition: 'center bottom',
        WebkitMaskPosition: 'center bottom',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
      }}
    />
  )
}

LaunchPadWave.displayName = 'LaunchPadWave'
