import { useEffect, type ReactNode } from 'react'
import { TopNavModule } from '@fams/design-system'
import {
  // `Map` shadows the JS Map constructor when imported bare — always alias it.
  Map as MapIcon,
  Globe,
} from 'lucide-react'
import { TadweerNavbar } from './TadweerNavbar'
import { MobileNavbar } from './MobileNavbar'
import { NOTIFICATIONS } from '../features/inbox/inboxData'
import { useIsMobile } from '../hooks/useIsMobile'
import type { ZonesView } from '../features/zones/ZonesPage'
import { MODULE_APP } from '../features/home/homeData'
import { setLastModuleForApp } from './activeAppPreference'

/** The rail's Inbox badge mirrors the Inbox page's own "Unread" tab count. */
const UNREAD_COUNT = NOTIFICATIONS.filter((n) => !n.read).length

export type AppPage = 'home' | 'dashboard' | 'inbox' | 'settings' | 'zones' | 'live-monitoring' | 'module'

/** App chrome: the primary rail (desktop) or top-bar + bottom-tab-bar (mobile),
 * plus a scrollable content column. Home page never gets the primary nav —
 * it's the Launch Pad and carries its own top-bar. */
export function AppLayout({
  children,
  page = 'dashboard',
  onNavigate,
  zonesView = 'hybrid',
  onZonesViewChange,
  embed = false,
  moduleId,
  autoOpenSwitcher = false,
  onSwitcherAutoOpened,
}: {
  children: ReactNode
  page?: AppPage
  onNavigate?: (page: AppPage, moduleId?: string) => void
  /** Zones' active view tab — the tabs live in this bar, the surface is the page. */
  zonesView?: ZonesView
  onZonesViewChange?: (view: ZonesView) => void
  /** Embedded inside the UCCP host shell as a single module (iframe, ?embed=1):
   *  this app's own chrome (top navbar / rail / app-switcher / mobile navbar)
   *  is never rendered — the host shell provides navigation instead. The
   *  in-screen `TopNavModule` header is ALSO suppressed here (round
   *  2026-08-31 P0 fix): the UCCP shell already renders its own "Operations
   *  Center" page header one level up, so keeping this one too produced two
   *  stacked headers. Only the bare cockpit board renders in embed mode. */
  embed?: boolean
  /** Module behind the shared placeholder surface — keeps its rail row lit. */
  moduleId?: string
  /** One-shot: pop the rail's app switcher open on mount (the Launch Pad's
   *  minimize button hands the user back here with it showing). */
  autoOpenSwitcher?: boolean
  onSwitcherAutoOpened?: () => void
}) {
  const isMobile = useIsMobile()

  // The unified rail's flat modules list holds every module, but only three are
  // wired to real surfaces. Every other row — in every app — opens the shared
  // "coming soon" module placeholder rather than doing nothing or borrowing the
  // Dispatcher Cockpit.
  const BUILT_MODULE_PAGE: Record<string, AppPage> = {
    'zones-management': 'zones',
    'live-monitoring': 'live-monitoring',
    'operations-center': 'dashboard',
  }

  const activeModuleId =
    page === 'zones'
      ? 'zones-management'
      : page === 'live-monitoring'
      ? 'live-monitoring'
      : page === 'dashboard'
      ? 'operations-center'
      : page === 'module'
      ? moduleId
      : undefined

  useEffect(() => {
    if (!activeModuleId) return
    const appId = MODULE_APP[activeModuleId]
    if (appId) {
      setLastModuleForApp(appId, activeModuleId)
    }
  }, [activeModuleId])

  const handleModuleSelect = (id: string) => {
    const built = BUILT_MODULE_PAGE[id]
    if (built) onNavigate?.(built)
    else onNavigate?.('module', id)
  }

  // Mobile chrome floats over the content (fixed position). Reserve the
  // 56px top-bar + 64px bottom-tab-bar heights so nothing sits behind them.
  const showMobileNav = !embed && isMobile && page !== 'home'

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {!embed && !isMobile && page !== 'home' ? (
        <TadweerNavbar
          activeModuleId={activeModuleId}
          onModuleSelect={handleModuleSelect}
          onInboxClick={() => onNavigate?.('inbox')}
          onGoHome={() => onNavigate?.('home')}
          onSettingsClick={() => onNavigate?.('settings')}
          inboxActive={page === 'inbox'}
          settingsActive={page === 'settings'}
          inboxCount={UNREAD_COUNT}
          autoOpenSwitcher={autoOpenSwitcher}
          onSwitcherAutoOpened={onSwitcherAutoOpened}
        />
      ) : null}
      {showMobileNav ? (
        <MobileNavbar
          page={page}
          activeModuleId={activeModuleId}
          onNavigate={onNavigate}
          inboxCount={UNREAD_COUNT}
        />
      ) : null}
      {/* Mobile chrome is bottom-only now — the top bar is gone, so the content
          column reserves the 64px tab bar and nothing else. */}
      <main
        className={`flex min-w-0 flex-1 flex-col overflow-hidden ${
          showMobileNav ? 'pb-16' : ''
        }`}
      >
        {page === 'dashboard' && !embed ? (
          <TopNavModule
            moduleName="Operations Center"
            variant="segment"
            views={[{ id: 'cockpit', kind: 'hybrid', label: 'Dispatcher Cockpit', active: true }]}
            onAddView={() => {}}
          />
        ) : null}
        {page === 'live-monitoring' ? (
          <TopNavModule
            moduleName={
              <span className="flex items-center gap-2.5">
                <Globe size={20} className="text-primary" />
                Live Monitoring
              </span>
            }
            variant="segment"
            views={[{ id: 'hybrid', kind: 'hybrid', label: 'Fleet & Map', active: true }]}
            onAddView={() => {}}
          />
        ) : null}
        {page === 'zones' ? (
          <TopNavModule
            // The Figma bar leads with the module's own glyph, not the DS's Home
            // affordance — `moduleName` is a ReactNode, so it carries the icon.
            moduleName={
              <span className="flex items-center gap-2.5">
                <MapIcon size={20} className="text-primary" />
                Zones
              </span>
            }
            variant="segment"
            // List View / Map View are presentational only for now — Hybrid
            // is the only tab wired to actually switch the page's layout.
            views={[
              { id: 'hybrid', kind: 'hybrid', active: zonesView === 'hybrid', onClick: () => onZonesViewChange?.('hybrid') },
              { id: 'list', kind: 'list', active: zonesView === 'list' },
              { id: 'map', kind: 'map', active: zonesView === 'map' },
            ]}
            onAddView={() => {}}
          />
        ) : null}
        {children}
      </main>
    </div>
  )
}
