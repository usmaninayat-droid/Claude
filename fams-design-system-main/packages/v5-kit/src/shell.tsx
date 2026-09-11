import { useEffect, useState, useSyncExternalStore } from 'react'
import { ChevronRight, HelpCircle, LayoutGrid, Settings } from '@fams/ui-kit/icons'
import { Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import {
  AppShell,
  AppSwitcherPanel,
  Logo,
  NavRail,
  NavRailRow,
  NavRailUserRow,
  Toaster,
  TopNav,
  UserPopover,
  type AppSwitcherApp,
  type NavRailItem,
} from '@fams/ui-kit'
import { deriveNavEntries, type DerivedNavItem, type FamsModule } from '@fams/skeleton-kit'
import { useAppSwitcherPreference } from '@fams/v5-templates'
import { useApps, type AppDefinition } from './apps'
import type { RailIndicatorSource } from './rail-indicators'
import { OPEN_SWITCHER_FLAG_KEY, SWITCHER_MODE_KEY, V5CommandPalette } from './home'

type SwitcherMode = 'page' | 'popup'

/**
 * Persisted app-switcher mode + the one-shot "reopen the popup" flag `V5Home`
 * sets on minimize (see `home.tsx`'s key helpers). Reference default is
 * `'page'` — the app row opens the Launch Pad directly until the user has
 * minimized it once, at which point it remembers `'popup'`.
 */
function useSwitcherMode(
  tenant: string,
  /**
   * The route that gates whether the rail (and this hook's consumer) renders
   * at all — the index route renders no rail. `V5AppShell` never unmounts
   * across an index ↔ module navigation (same component instance, branching
   * return value), so the flag-check effect keys off THIS, not just mount,
   * or a minimize-triggered navigation back to a module route would never
   * re-run it.
   */
  pathname: string,
): [SwitcherMode, (mode: SwitcherMode) => void, boolean, (open: boolean) => void] {
  // The mode + its persistence live in the shared v5-templates hook, so the
  // launch pad's writer and this reader agree on key, default and
  // notification (they are never mounted at the same time).
  const [mode, setMode] = useAppSwitcherPreference(SWITCHER_MODE_KEY(tenant))
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (pathname === '/') return
    try {
      // "Minimize" doesn't just vanish — the launcher must be seen to BECOME
      // the popup, so it routes back here and pops the grid open at the app
      // row via this one-shot session flag.
      if (sessionStorage.getItem(OPEN_SWITCHER_FLAG_KEY(tenant)) === 'true') {
        sessionStorage.removeItem(OPEN_SWITCHER_FLAG_KEY(tenant))
        setOpen(true)
      }
    } catch {
      /* ignore (private mode / storage disabled) */
    }
  }, [tenant, pathname])

  return [mode, setMode, open, setOpen]
}

/** The prop shape skeleton-kit's `shellComponent` override expects. */
export interface V5AppShellProps {
  /** The app's resolved modules — same list `bootstrapTenant` hands `createFamsApp`. */
  modules: FamsModule[]
  /** Fallback top-bar title when no module matches the current route (e.g. the index route). */
  brandLabel?: string
}

/** True when `pathname` is exactly the module's route, or nested under it. */
function isActivePath(pathname: string, modulePath: string): boolean {
  if (modulePath === '/') return pathname === '/'
  return pathname === modulePath || pathname.startsWith(`${modulePath}/`)
}

const NO_INDICATORS: RailIndicatorSource = {
  subscribe: () => () => {},
  hasIndicator: () => false,
}

/**
 * V5AppShell — the real v5 application chrome, on the unified expandable
 * rail (the designer-approved "home + side nav" prototype, generalized as
 * `@fams/ui-kit`'s `NavRail`).
 *
 * ONE rail replaces the previous SideNav (apps) + ModuleRail (modules)
 * two-bar frame: the rail lists the ACTIVE application's modules as labeled
 * rows (collapsed 46px / expanded 276px / hover-expand), the current app
 * sits in the white switcher row whose popover (`AppSwitcherPanel`) switches
 * applications, and the launch-pad Home lives at the index route `/`.
 *
 * Preserved integrations:
 *  - `railStart` pinned entries (the Inbox slot) render as `topItems`, with
 *    the same subscribable `railIndicators` unread-dot seam (WP4 of the
 *    nav-a run).
 *  - The rail-footer user entry is a real `UserPopover` trigger whenever the
 *    boot layer supplied an identity (`AppsContext.user`), wired to
 *    `V5App.logout` — exactly the previous shell's contract.
 *  - Settings re-links to the licensed Settings module when present.
 *  - The single 48px `TopNav` stays: `AppShell` hands its tabs/actions
 *    regions to the routed page (`ModuleViewShell` portals its view tabs
 *    into it), and it carries the mobile drawer trigger.
 *
 * The INDEX route is the launch pad (`V5Home`): the shell renders no chrome
 * there — Home IS the launcher (prototype behavior). The global ⌘K palette
 * (`V5CommandPalette`) is mounted on every route, Home included.
 *
 * Apps ≠ modules, still: application data comes from `useApps()` so
 * skeleton-kit's product-agnostic `ShellComponentProps` (decision #13)
 * never learns v5's "application" vocabulary; a tenant with no
 * `applications` gets a single implicit app spanning every module.
 */
export function V5AppShell({ modules, brandLabel }: V5AppShellProps) {
  const router = useRouter()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navEntries = deriveNavEntries(modules)
  const tenant =
    typeof document !== 'undefined' ? document.documentElement.getAttribute('data-tenant') ?? 'default' : 'default'
  const [switcherMode, setSwitcherMode, switcherOpen, setSwitcherOpen] = useSwitcherMode(tenant, pathname)
  const {
    applications,
    logo,
    logoExpanded: brandLogoExpanded,
    poweredBy,
    hideBrandLabel,
    user,
    onUserLogout,
    railStart,
    railIndicators,
  } = useApps()

  // Cross-module indicator dots (e.g. inbox unread) — an external,
  // subscribable seam so a write inside one module re-renders exactly this
  // rail (see `rail-indicators.ts`).
  const indicators = railIndicators ?? NO_INDICATORS
  const indicatorsSnapshot = useSyncExternalStore(
    indicators.subscribe,
    () =>
      (railStart ?? [])
        .map((entry) =>
          indicators.hasIndicator(entry.id) ? `${entry.id}:${indicators.indicatorCount?.(entry.id) ?? 0}` : '',
        )
        .join('|'),
  )
  // `id:count` pairs — count 0 means "dot, no number" (a source that only
  // knows on/off), any positive count renders the reference's count pill.
  const dotted = new Map<string, number>(
    indicatorsSnapshot
      .split('|')
      .filter(Boolean)
      .map((part) => {
        const [id, count] = part.split(':')
        return [id, Number(count) || 0] as const
      }),
  )

  const entryById = new Map<string, DerivedNavItem>(navEntries.map((entry) => [entry.id, entry]))

  // Fallback: no `applications` configured → one implicit app spanning every
  // module (see AppsContextValue's doc comment for why this is safe).
  const apps: AppDefinition[] =
    applications.length > 0
      ? applications
      : [{ id: '__all__', name: brandLabel ?? 'Apps', modules: navEntries.map((entry) => entry.id) }]

  const activeModuleEntry = navEntries.find((entry) => isActivePath(pathname, entry.path))
  // The app genuinely matching the current route — undefined at the index
  // route. Kept separate from `displayApp`: an app must never read as active
  // just because it is the fallback shown when nothing matches.
  const matchedApp = activeModuleEntry && apps.find((app) => app.modules.includes(activeModuleEntry.id))
  const displayApp = matchedApp ?? apps[0]

  const navigate = (path: string) => void router.navigate({ to: path })

  // Pinned rows above the switcher (`railStart` — the Inbox slot). Label /
  // icon / path come from the module's own resolved nav entry; unresolved
  // modules are skipped, not dead rows.
  const topItems: NavRailItem[] = (railStart ?? []).flatMap((pin) => {
    const entry = entryById.get(pin.module)
    if (!entry) return []
    return [
      {
        id: pin.id,
        label: pin.label ?? entry.label,
        icon: pin.icon ?? entry.icon,
        active: isActivePath(pathname, entry.path),
        notificationDot: dotted.has(pin.id),
        badgeCount: dotted.get(pin.id) || undefined,
      },
    ]
  })
  /** True while a cross-application pinned row (the Inbox slot) is current. */
  const onCrossAppPin = topItems.some((item) => item.active)
  const onTopItemSelect = (id: string) => {
    const pin = (railStart ?? []).find((p) => p.id === id)
    const entry = pin && entryById.get(pin.module)
    if (entry) navigate(entry.path)
  }

  // Rail rows: the DISPLAYED application's modules, minus any module already
  // pinned in the top strip (the prototype rail lists each module once).
  const pinnedModuleIds = new Set((railStart ?? []).map((p) => p.module))
  const displayModuleIds = new Set(displayApp?.modules ?? [])
  const moduleItems: NavRailItem[] = navEntries
    .filter((entry) => displayModuleIds.has(entry.id) && !pinnedModuleIds.has(entry.id))
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      icon: entry.icon,
      active: isActivePath(pathname, entry.path),
    }))
  const onItemSelect = (id: string) => {
    const entry = entryById.get(id)
    if (entry) navigate(entry.path)
  }

  // App switcher: one tile per application; picking one navigates to the
  // first of its modules that resolved a nav entry (never a dead link).
  const switcherApps: AppSwitcherApp[] = apps.map((app) => ({
    id: app.id,
    label: app.name,
    icon: app.icon ?? <LayoutGrid aria-hidden />,
    active: displayApp ? app.id === displayApp.id : false,
  }))
  const onAppSelect = (id: string) => {
    const app = apps.find((a) => a.id === id)
    const firstPath = app?.modules.map((m) => entryById.get(m)?.path).find((p): p is string => Boolean(p))
    if (firstPath) navigate(firstPath)
  }

  // Footer band: Settings (re-links to the licensed Settings module when one
  // exists), decorative Help, and the user row (a real UserPopover trigger
  // when the boot layer supplied an identity).
  const settingsEntry = navEntries.find((entry) => entry.path === '/settings')
  const railFooter = (
    <>
      <NavRailRow label="Help Center" tone="footer" icon={<HelpCircle aria-hidden />} disabled />
      <NavRailRow
        label="Account Settings"
        tone="footer"
        icon={<Settings aria-hidden />}
        active={settingsEntry ? isActivePath(pathname, settingsEntry.path) : false}
        trailing={<ChevronRight aria-hidden className="size-3.5 text-white/80" />}
        disabled={!settingsEntry}
        onClick={settingsEntry ? () => navigate(settingsEntry.path) : undefined}
      />
      {user?.name ? (
        <UserPopover
          name={user.name}
          email={user.email}
          avatarSrc={user.avatarSrc}
          onLogout={onUserLogout}
          side="top"
          align="start"
          alignOffset={32}
          trigger={
            <NavRailUserRow
              name={user.name}
              email={user.email}
              avatarSrc={user.avatarSrc}
              trailing={<ChevronRight aria-hidden className="size-3.5 text-white/80" />}
            />
          }
        />
      ) : (
        <NavRailUserRow name="User" disabled />
      )}
    </>
  )

  const palette = <V5CommandPalette modules={modules} brandLabel={brandLabel} />

  // P0-2 — THE app-root toast outlet. Exactly one `<Toaster/>` for the whole
  // v5 app, mounted here rather than in any view template: every module's
  // create/update confirmation (`toast.success` in `V5ModuleSurface`) needs an
  // outlet, and a view template owning a singleton global would both duplicate
  // toasts when two of that view are on screen and silently drop them on every
  // other module. Rendered in BOTH branches below (the launch pad has no rail
  // but still needs toasts).
  const toaster = <Toaster position="top-right" closeButton />

  // The INDEX route is the launch pad — no rail, no top bar (prototype:
  // Home never renders the rail; it IS the launcher). The palette stays.
  // A module whose nav entry declares `fullScreen` (skeleton-kit NavEntry
  // v1.2, e.g. a wall-display command center) takes the same bare branch:
  // its surface owns ALL of its chrome, including the way back into the app.
  if (pathname === '/' || activeModuleEntry?.fullScreen) {
    return (
      <div className="h-dvh min-h-0">
        <Outlet />
        {palette}
        {toaster}
      </div>
    )
  }

  return (
    <>
      <AppShell
        /* `V5AppShell` mounts THE app-root toaster itself (see `toaster`
           above) because the launch-pad branch renders no `AppShell` at all
           and still needs an outlet. Opt out of the shell's own sink so a
           module route does not end up with two (merge of the 2026-08-24
           live-monitoring cycle, which gave `AppShell` a default sink). */
        toaster={false}
        sidebar={
          <NavRail
            items={moduleItems}
            onItemSelect={onItemSelect}
            topItems={topItems.length > 0 ? topItems : undefined}
            onTopItemSelect={onTopItemSelect}
            logo={logo ?? <Logo />}
            logoExpanded={
              // A tenant that ships a full wordmark asset uses it; otherwise
              // the tenant NAME stands in, unless the compact mark already
              // carries the wordmark (`branding.hideName`).
              brandLogoExpanded ??
              (brandLabel && !hideBrandLabel ? (
                <span className="truncate text-sm font-bold text-white">{brandLabel}</span>
              ) : undefined)
            }
            poweredBy={poweredBy}
            onLogoClick={() => navigate('/')}
            // `displayApp.hideSwitcher` (e.g. a single-purpose inspector app
            // nested in a multi-app tenant) omits the whole prop — `NavRail`
            // already treats an absent `switcher` as "hide the row" (its own
            // doc comment), so no new suppression mechanism is needed here.
            switcher={
              displayApp?.hideSwitcher
                ? undefined
                : {
                    label: displayApp?.name ?? brandLabel ?? 'Apps',
                    icon: displayApp?.icon ?? <LayoutGrid aria-hidden />,
                    panel: (
                      <AppSwitcherPanel
                        apps={switcherApps}
                        onSelect={onAppSelect}
                        // The panel's expand control IS the preference: it
                        // records `page` so the app row opens the launch pad
                        // from now on (its counterpart is the launch pad's
                        // minimize).
                        onGoHome={() => {
                          setSwitcherMode('page')
                          navigate('/')
                        }}
                      />
                    ),
                    // Reference default: the app row opens the Launch Pad
                    // directly ('page'); once the user minimizes Home once it
                    // remembers 'popup' and the row goes back to opening this
                    // anchored panel (see `useSwitcherMode` above and
                    // `V5Home.onMinimize`).
                    mode: switcherMode,
                    // Inbox (and any other railStart pin) is
                    // CROSS-APPLICATION: while one is the current page the
                    // rail is inside no single app, so the application row
                    // drops its scope fill rather than claiming a scope the
                    // user isn't in.
                    active: !onCrossAppPin,
                    onGoHome: () => navigate('/'),
                    open: switcherOpen,
                    onOpenChange: setSwitcherOpen,
                  }
            }
            footer={railFooter}
          />
        }
        // ONE top bar for the whole app: `AppShell` hands this bar's
        // tabs/actions regions to the routed page (`ModuleViewShell` portals
        // its view tabs into them), and it carries the mobile drawer trigger.
        topNav={<TopNav brand={<h1 className="truncate">{activeModuleEntry?.label ?? brandLabel}</h1>} />}
      >
        <Outlet />
      </AppShell>
      {palette}
      {toaster}
    </>
  )
}

V5AppShell.displayName = 'V5AppShell'
