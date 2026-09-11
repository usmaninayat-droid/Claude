import { Skeleton } from '@fams/ui-kit'
import type { EntityConfig } from '@fams/v5-composer'
import { cn } from '../lib/cn'
import { CockpitView } from './cockpit/CockpitView'
import { hasCockpit } from './cockpit/cockpit-model'

/**
 * AppBootSkeleton — the FIRST FRAME of a FAMS app, painted before any data
 * (or the router, or the mock API) has resolved.
 *
 * WHY THIS EXISTS: UX MUSTs D.17 / F.27(c) require skeletons at loaded
 * dimensions on first paint, and the cockpit's own `loading` branch can never
 * satisfy them on its own — a v5 app awaits its API worker and tenant
 * bootstrap BEFORE it mounts a single React node, so `document.body` sits as
 * an empty shell for ~1s and no component-level loading state is reachable
 * yet. The app entry renders this into the root synchronously, then re-renders
 * the real app onto the SAME root once boot resolves.
 *
 * It reproduces the app-shell frame (nav rail column + 48px top bar + the
 * `p-6` module-body inset) so the swap to the real UI shifts nothing, and —
 * when the first route's blueprint is already known synchronously — delegates
 * the body to that module's OWN view template in its loading state, which is
 * what keeps the skeleton dimensionally honest instead of a guess that drifts.
 *
 * A tenant with a branded boot animation (`brandLoaderSrc`) skips the frame
 * entirely in favor of a full-bleed iframe showing that self-contained,
 * looping HTML page — the animation IS the boot page (full-screen emblem +
 * footer), not a fragment to slot into the module-body inset.
 */
export interface AppBootSkeletonProps {
  /**
   * The blueprint of the module the app is booting into, when it is known
   * synchronously (v5 apps bundle their resolved blueprints). Omit for the
   * generic frame. Ignored when `brandLoaderSrc` is set.
   */
  config?: EntityConfig
  className?: string
  /**
   * Path to a tenant's self-contained, looping HTML boot animation (e.g. a
   * tenant manifest's `branding.loader`). When set, replaces the generic
   * skeleton bars with a full-bleed, non-interactive iframe showing that
   * page instead. Omit for the generic frame — behaviour is then unchanged.
   */
  brandLoaderSrc?: string
}

export function AppBootSkeleton({ config, className, brandLoaderSrc }: AppBootSkeletonProps) {
  const cockpit = config ? hasCockpit(config) : false
  return (
    <div
      data-slot="app-boot-skeleton"
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={cn('flex h-dvh w-full overflow-hidden bg-background text-foreground', className)}
    >
      {brandLoaderSrc ? (
        <iframe
          data-slot="app-boot-brand-loader"
          src={brandLoaderSrc}
          title="Loading"
          aria-busy="true"
          tabIndex={-1}
          className="h-full w-full border-0 bg-surface-minimal"
        />
      ) : (
        <>
          {/* Collapsed nav rail — `w-11.5` is `NavRail`'s own 46px hover-mode
              footprint, so the rail does not jump when the real shell mounts. */}
          <div aria-hidden="true" className="hidden w-11.5 shrink-0 bg-primary md:block" />
          <div className="flex min-w-0 flex-1 flex-col">
            {/* `TopNav` is `h-12` with a hairline bottom border. */}
            <div aria-hidden="true" className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
              <Skeleton variant="custom" className="h-4 w-40 rounded-sm" />
            </div>
            {/* MODULE HEADER + VIEW TABS — 64px (UX round-3 finding 3). Omitting
                this row put the whole skeleton 64px above the loaded layout, so
                the cockpit visibly lurched down on hydration; CLS scored 0.0003
                only because the skeleton subtree UNMOUNTS rather than reflows,
                which the metric cannot see. `h-16` is the loaded row's measured
                height and keeps the two in register. */}
            <div
              aria-hidden="true"
              className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-6"
            >
              <Skeleton variant="custom" className="h-5 w-48 rounded-sm" />
              <div className="flex items-center gap-2">
                <Skeleton variant="custom" className="h-7 w-20 rounded-md" />
                <Skeleton variant="custom" className="h-7 w-20 rounded-md" />
                <Skeleton variant="custom" className="h-7 w-20 rounded-md" />
              </div>
            </div>
            {/* `module-view-shell-body`'s `p-6` inset. */}
            <div className="min-h-0 flex-1 overflow-hidden bg-surface-minimal p-6">
              {cockpit && config ? (
                <CockpitView config={config} records={[]} loading className="h-full" />
              ) : (
                <div className="flex h-full min-h-0 flex-col gap-4">
                  <Skeleton variant="custom" className="h-9 w-full max-w-sm rounded-md" />
                  <Skeleton variant="custom" className="min-h-0 flex-1 rounded-md border border-border" />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

AppBootSkeleton.displayName = 'AppBootSkeleton'
