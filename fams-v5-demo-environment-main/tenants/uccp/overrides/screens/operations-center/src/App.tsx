import { useState, useEffect } from 'react'
import { AppLayout, type AppPage } from './layout/AppLayout'
import { HomeDashboard } from './features/home/HomeDashboard'
import { CommandPalette } from './features/home/CommandPalette'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { InboxPage } from './features/inbox/InboxPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { ZonesPage, type ZonesView } from './features/zones/ZonesPage'
import { LiveMonitoringPage } from './features/live-monitoring/LiveMonitoringPage'
import { ModuleComingSoonPage } from './features/module/ModuleComingSoonPage'
import { setSwitcherModePreference } from './layout/appSwitcherPreference'

// Embed mode: the UCCP host app mounts this bundle in an iframe as ONE
// module (the Dispatcher Cockpit only) inside its own shell/nav — not as a
// second full app. `?embed=1` on the iframe's URL boots straight into the
// cockpit dashboard and hides this app's own chrome (top navbar / rail /
// app-switcher / inbox / settings / zones), while leaving the standalone
// :6360 dev view (no query param) fully intact for development. See
// `operations-center-module.tsx` on the host side for the iframe src.
function isEmbedMode(): boolean {
  return new URLSearchParams(window.location.search).get('embed') === '1'
}

function App() {
  const embed = isEmbedMode()

  const getInitialPage = (): AppPage => {
    if (embed) return 'dashboard' // embedded: cockpit only, no other routes reachable
    const hash = window.location.hash
    if (hash.startsWith('#/settings')) return 'settings'
    if (hash.startsWith('#/module/')) return 'module'
    if (hash === '#/inbox') return 'inbox'
    if (hash === '#/dashboard') return 'dashboard'
    if (hash === '#/zones') return 'zones'
    if (hash === '#/live-monitoring') return 'live-monitoring'
    if (hash === '#/home') return 'home'
    return 'inbox' // default landing page
  }

  /** `#/module/<id>` — which module the shared placeholder surface is standing in for. */
  const getModuleIdFromHash = (): string => {
    const prefix = '#/module/'
    const hash = window.location.hash
    return hash.startsWith(prefix) ? decodeURIComponent(hash.slice(prefix.length)) : ''
  }

  const [page, setPage] = useState<AppPage>(getInitialPage)
  const [moduleId, setModuleId] = useState<string>(getModuleIdFromHash)
  const [paletteOpen, setPaletteOpen] = useState(false)
  // Zones' view tabs render in the app chrome (AppLayout's TopNavModule) but
  // drive the page's layout, so the state lives here, between the two.
  const [zonesView, setZonesView] = useState<ZonesView>('hybrid')
  // Where "minimize" on the Launch Pad sends the user back to, and the one-shot
  // flag that makes the rail's app switcher appear once they land.
  const [lastAppPage, setLastAppPage] = useState<AppPage>(() => {
    const p = getInitialPage()
    return p === 'home' ? 'dashboard' : p
  })
  const [autoOpenSwitcher, setAutoOpenSwitcher] = useState(false)

  useEffect(() => {
    if (page !== 'home') setLastAppPage(page)
  }, [page])

  useEffect(() => {
    const handleHashChange = () => {
      setPage(getInitialPage())
      setModuleId(getModuleIdFromHash())
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Global ⌘K / Ctrl+K — opens the command palette from any page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const navigateTo = (newPage: AppPage, targetModuleId?: string) => {
    let hash = '#/home'
    if (newPage === 'dashboard') hash = '#/dashboard'
    else if (newPage === 'inbox') hash = '#/inbox'
    else if (newPage === 'settings') hash = '#/settings/notifications-configuration'
    else if (newPage === 'zones') hash = '#/zones'
    else if (newPage === 'live-monitoring') hash = '#/live-monitoring'
    else if (newPage === 'module') hash = `#/module/${encodeURIComponent(targetModuleId ?? moduleId)}`

    if (newPage === 'module') setModuleId(targetModuleId ?? moduleId)
    window.location.hash = hash
    setPage(newPage)
  }

  useEffect(() => {
    if (embed) return // embedded: stay on the cockpit, never redirect to Inbox
    // Inbox is the default landing page — an empty/root hash lands there.
    const hash = window.location.hash
    if (!hash || hash === '#/') {
      window.location.hash = '#/inbox'
    }
  }, [embed])

  // Launch Pad → anchored popup: remember the choice (the application row will
  // open the popup from now on), route back to whichever app page the user came
  // from, and show the popup there so it is obvious where the launcher went.
  const minimizeLaunchPad = () => {
    setSwitcherModePreference('popup')
    setAutoOpenSwitcher(true)
    navigateTo(lastAppPage)
  }

  return (
    <>
      <AppLayout
        page={page}
        onNavigate={navigateTo}
        zonesView={zonesView}
        onZonesViewChange={setZonesView}
        embed={embed}
        moduleId={moduleId}
        autoOpenSwitcher={autoOpenSwitcher}
        onSwitcherAutoOpened={() => setAutoOpenSwitcher(false)}
      >
        {page === 'home' ? (
          <HomeDashboard onNavigate={navigateTo} onMinimize={minimizeLaunchPad} />
        ) : page === 'inbox' ? (
          <InboxPage />
        ) : page === 'settings' ? (
          <SettingsPage />
        ) : page === 'zones' ? (
          <ZonesPage view={zonesView} onViewChange={setZonesView} />
        ) : page === 'live-monitoring' ? (
          <LiveMonitoringPage />
        ) : page === 'module' ? (
          <ModuleComingSoonPage moduleId={moduleId} />
        ) : (
          <DashboardPage />
        )}
      </AppLayout>
      {/* Command palette jumps across this app's other pages/apps — not part
          of the cockpit itself, so it's suppressed in embed mode. */}
      {!embed ? (
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={navigateTo} />
      ) : null}
    </>
  )
}

export default App
