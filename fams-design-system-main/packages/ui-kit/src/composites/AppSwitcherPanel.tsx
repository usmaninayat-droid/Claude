import { type ReactNode } from 'react'
import { Maximize2 } from '../icons'
import { cn } from '../lib/cn'
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/Tooltip'

/**
 * AppSwitcherPanel — the application-switcher grid. [L3 composite]
 *
 * Ported from the designer-approved "home + side nav" prototype
 * (`AppSwitcherDropdown.tsx`): a "Switch Application" header with an
 * EXPAND control, over a 3-column grid of app tiles.
 *
 * This panel is the switcher's MINIMIZED state; its expanded counterpart is
 * a whole page, not a bigger card — the launch pad (`HomeLaunchPad`). Two
 * states only, and each carries the one control that moves to the other:
 * this header's `Maximize2` expands, the launch pad's `Minimize` minimizes.
 * There is no third, smaller list form — an earlier build had one and the
 * ladder read as ambiguous.
 * The ACTIVE app's tile paints its icon on a primary chip; the rest are
 * muted. Purely presentational content — render it inside a `Popover`
 * (as `NavRail`'s `switcher.panel`) or any other anchored surface; the
 * host owns open/close.
 *
 * Generic by design (rule 10): apps are `{ id, label, icon, active }` —
 * tenant names and glyphs come in through props, never from this file.
 */

export interface AppSwitcherApp {
  id: string
  label: string
  icon?: ReactNode
  /** The currently-running app — presentational-primary tile. */
  active?: boolean
}

export interface AppSwitcherPanelProps {
  apps: AppSwitcherApp[]
  /** Fired when the user picks an app tile. */
  onSelect?: (id: string) => void
  /**
   * Fired from the header's expand control — conventionally routes to the
   * launch pad AND records `page` as the persisted switcher preference (see
   * `useAppSwitcherPreference` in `@fams/v5-templates`). Omit to hide it.
   */
  onGoHome?: () => void
  /** Header label. */
  title?: string
  className?: string
}

export function AppSwitcherPanel({
  apps,
  onSelect,
  onGoHome,
  title = 'Switch Application',
  className,
}: AppSwitcherPanelProps) {
  return (
    <div data-slot="app-switcher-panel" className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        {onGoHome ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onGoHome}
                aria-label="Expand to Launch Pad"
                className="flex size-4 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors duration-fast hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Maximize2 aria-hidden className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Expand to Launch Pad</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {apps.map((app) => (
          <button
            key={app.id}
            type="button"
            aria-label={app.label}
            aria-current={app.active ? 'true' : undefined}
            onClick={() => onSelect?.(app.id)}
            className="flex size-25 flex-col items-center justify-center gap-1 rounded-md p-2 outline-none transition-colors duration-fast hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={cn(
                'flex items-center justify-center rounded-sm p-2 [&_svg]:size-6',
                app.active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {app.icon}
            </span>
            <span
              className={cn(
                'text-center text-xs font-medium leading-4.5',
                app.active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {app.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
