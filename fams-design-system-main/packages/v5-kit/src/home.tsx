import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Logo,
} from '@fams/ui-kit'
import {
  HomeLaunchPad,
  setAppSwitcherPreference,
  usePinnedIds,
  type LaunchPadGroup,
} from '@fams/v5-templates'
import { deriveNavEntries, type DerivedNavItem, type FamsModule } from '@fams/skeleton-kit'
import { useApps, type AppDefinition } from './apps'

/**
 * V5Home — the launch-pad index route, plus the ⌘K command palette, both
 * derived from the SAME tenant metadata: `applications[]` (AppsProvider,
 * from tenant.json) × the licensed modules' resolved nav entries
 * (`deriveNavEntries`). No hardcoded catalog anywhere — a module shows up
 * here exactly when the tenant licenses and implements it.
 */

/**
 * Persisted app-switcher preference (`'page'` opens the Launch Pad directly
 * from the rail's app row — the reference's default; `'popup'` opens the
 * anchored `AppSwitcherPanel` instead, the choice `V5Home`'s `onMinimize`
 * switches to) and the one-shot session flag that tells `V5AppShell` to
 * reopen the popup at the app row right after a minimize. Tenant-scoped,
 * same convention as the home pins key above.
 */
export const SWITCHER_MODE_KEY = (tenant: string) => `fams.${tenant}.app-switcher-mode`
export const OPEN_SWITCHER_FLAG_KEY = (tenant: string) => `fams.${tenant}.open-switcher-at-app-row`

/** Token accent cycle for launch-pad tiles, per application index. */
const GROUP_ACCENTS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
]

export interface LaunchCatalogEntry {
  id: string
  label: string
  icon?: ReactNode
  path: string
  appId: string
  appLabel: string
  accentColor: string
}

/**
 * Build the launch catalog: the tenant's applications × resolved module nav
 * entries. Tenants with no `applications` grouping get one implicit group
 * spanning every module (same fallback `V5AppShell` uses). Unresolved module
 * ids (unlicensed/unimplemented) are skipped, never dead tiles.
 */
export function buildLaunchCatalog(
  modules: FamsModule[],
  applications: AppDefinition[],
  fallbackLabel = 'Modules',
): { groups: LaunchPadGroup[]; entries: LaunchCatalogEntry[] } {
  const navEntries = deriveNavEntries(modules)
  const entryById = new Map<string, DerivedNavItem>(navEntries.map((e) => [e.id, e]))
  const apps: AppDefinition[] =
    applications.length > 0
      ? applications
      : [{ id: '__all__', name: fallbackLabel, modules: navEntries.map((e) => e.id) }]

  const entries: LaunchCatalogEntry[] = []
  const groups: LaunchPadGroup[] = []
  apps.forEach((app, i) => {
    const accentColor = GROUP_ACCENTS[i % GROUP_ACCENTS.length]
    const mods = app.modules.flatMap((id) => {
      const nav = entryById.get(id)
      if (!nav) return []
      const entry: LaunchCatalogEntry = {
        id: nav.id,
        label: nav.label,
        icon: nav.icon,
        path: nav.path,
        appId: app.id,
        appLabel: app.name,
        accentColor,
      }
      entries.push(entry)
      return [entry]
    })
    if (mods.length > 0) {
      groups.push({
        id: app.id,
        label: app.name,
        icon: app.icon,
        modules: mods.map((m) => ({ id: m.id, label: m.label, icon: m.icon, accentColor: m.accentColor })),
      })
    }
  })
  return { groups, entries }
}

export interface V5HomeProps {
  modules: FamsModule[]
  brandLabel?: string
}

/**
 * The index-route ("/") launch pad. Rendered WITHOUT the rail — `V5AppShell`
 * suppresses its chrome at the index route; this page IS the launcher.
 */
export function V5Home({ modules, brandLabel }: V5HomeProps) {
  const router = useRouter()
  const { applications, logo, poweredBy, railStart, railIndicators } = useApps()
  const { groups, entries } = useMemo(
    () => buildLaunchCatalog(modules, applications, brandLabel),
    [modules, applications, brandLabel],
  )
  const tenant =
    typeof document !== 'undefined' ? document.documentElement.getAttribute('data-tenant') ?? 'default' : 'default'
  const [pins, togglePin] = usePinnedIds(`fams.home.pins.${tenant}`)

  // "Minimize" mirrors the reference's `minimizeHome()`: record that the app
  // row should open the anchored popup from now on (persisted, read by
  // `V5AppShell`'s `switcherMode`), then return to the app with the popup
  // already open at the app row (a one-shot session flag `V5AppShell` reads
  // on mount and clears).
  const onMinimize = () => {
    // Expand / minimize ARE the preference: record `popup` (through the
    // shared hook, so a mounted rail hears it immediately) plus the one-shot
    // flag that pops the grid open at the app row on arrival.
    setAppSwitcherPreference(SWITCHER_MODE_KEY(tenant), 'popup')
    try {
      sessionStorage.setItem(OPEN_SWITCHER_FLAG_KEY(tenant), 'true')
    } catch {
      /* ignore (private mode / storage disabled) */
    }
    if (router.history.canGoBack()) router.history.back()
    else void router.navigate({ to: '/' })
  }

  const entryById = new Map(entries.map((e) => [e.id, e]))
  const open = (id: string) => {
    const entry = entryById.get(id)
    if (entry) void router.navigate({ to: entry.path })
  }

  // Header inbox button: the first pinned rail module (tenant.json railStart),
  // reusing the same unread-dot indicator seam the rail uses.
  const navEntries = deriveNavEntries(modules)
  const inboxPin = (railStart ?? [])
    .map((pin) => ({ pin, nav: navEntries.find((e) => e.id === pin.module) }))
    .find((x) => x.nav)
  const inboxDot = inboxPin && railIndicators ? railIndicators.hasIndicator(inboxPin.pin.id) : false

  return (
    <HomeLaunchPad
      groups={groups}
      pinnedIds={pins}
      onTogglePin={togglePin}
      onOpen={open}
      logo={logo ?? <Logo />}
      title={brandLabel}
      onBack={router.history.canGoBack() ? () => router.history.back() : undefined}
      onMinimize={onMinimize}
      onInbox={inboxPin ? () => void router.navigate({ to: inboxPin.nav!.path }) : undefined}
      inboxDot={inboxDot}
      poweredBy={poweredBy}
    />
  )
}

V5Home.displayName = 'V5Home'

/**
 * V5CommandPalette — the global ⌘K / Ctrl+K palette over the same launch
 * catalog. Mounted once by `V5AppShell`; composes ui-kit's `CommandDialog`
 * (cmdk) so filtering, keyboard navigation and focus management come from
 * the primitive.
 */
export function V5CommandPalette({ modules, brandLabel }: V5HomeProps) {
  const router = useRouter()
  const { applications } = useApps()
  const [open, setOpen] = useState(false)
  const { groups, entries } = useMemo(
    () => buildLaunchCatalog(modules, applications, brandLabel),
    [modules, applications, brandLabel],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const select = (id: string) => {
    const entry = entries.find((e) => e.id === id)
    setOpen(false)
    if (entry) void router.navigate({ to: entry.path })
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search apps and modules">
      <CommandInput placeholder="Search any app or module…" />
      <CommandList className="max-h-90">
        <CommandEmpty>No apps or modules match.</CommandEmpty>
        {groups.map((g) => (
          <CommandGroup key={g.id} heading={g.label}>
            {g.modules.map((m) => (
              <CommandItem key={`${g.id}-${m.id}`} value={`${m.label} ${g.label}`} onSelect={() => select(m.id)}>
                <span aria-hidden className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
                  {m.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">{m.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{g.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[0.6875rem] text-muted-foreground">
        <span>↑↓ to navigate</span>
        <span>↵ to open</span>
        <span className="ms-auto">esc to close</span>
      </div>
    </CommandDialog>
  )
}

V5CommandPalette.displayName = 'V5CommandPalette'
