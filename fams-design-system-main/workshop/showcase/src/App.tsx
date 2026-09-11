import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NAV, DEFAULT_ROUTE, routeFromHash, findItem } from './nav'
import { COMPONENT_GROUPS } from './registry'
import { FamilyPage } from './FamilyPage'
import { ChevronRight, Moon, Sun } from '@fams/ui-kit/icons'
import { Badge } from './docs'

// Existing foundation / component galleries (reused)
import { Foundations } from './showcase/Foundations'
import { Typography } from './showcase/Typography'
import { Icons } from './showcase/Icons'
import { AssetLibrary } from './showcase/Assets'
import { Logo } from '@fams/ui-kit'

// Doc/content pages (component pages are registry-driven — see registry.tsx)
import {
  Introduction,
  Installation,
  QuickStart,
  Principles,
  Layers,
  Theming,
  ContentVoice,
  AccessibilityGuide,
  TextTruncation,
  Contributing,
  Consuming,
  ApiContract,
  StatePerformance,
  Testing,
} from './pages/content'

const TENANTS = [
  { id: 'fams', label: 'FAMS' },
  { id: 'iwmp', label: 'IWMP' },
  { id: 'ead', label: 'EAD' },
  { id: 'uccp', label: 'UCCP' },
  { id: 'dmt', label: 'DMT' },
] as const
type TenantId = (typeof TENANTS)[number]['id']

// Minimal light/dark toggle (decision #2, ruling ⑤) — writes explicit `data-theme="light"` or
// `data-theme="dark"` on <html>, which the tokens package's dark-mode selectors key off of
// (`:root[data-theme="dark"]` and `:root[data-theme="light"]` in @fams/tokens' theme.css/tokens.css).
// Persisted so a reload keeps the last explicit choice. On first load with no saved pref,
// defaults to light (founder: showcase should not follow OS dark mode) rather than resolving
// from prefers-color-scheme.
const THEME_STORAGE_KEY = 'fams-ds-theme'
type ThemeMode = 'light' | 'dark'
function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return 'light'
}

function renderRoute(route: string, goto: (r: string) => void): ReactNode {
  // Component families are registry-driven: `group/family` or `group/family/member`.
  const [groupId, familyId, memberId] = route.split('/')
  const group = COMPONENT_GROUPS.find((g) => g.id === groupId)
  const family = group?.families.find((f) => f.id === familyId)
  if (group && family) {
    const activeMemberId = memberId ?? family.members[0].id
    return (
      <FamilyPage
        family={family}
        activeMemberId={activeMemberId}
        onSelectMember={(m) => goto(`${groupId}/${familyId}/${m}`)}
      />
    )
  }
  switch (route) {
    case 'overview/introduction': return <Introduction />
    case 'overview/installation': return <Installation />
    case 'overview/quick-start': return <QuickStart />
    case 'foundations/principles': return <Principles />
    case 'foundations/layers': return <Layers />
    case 'foundations/tokens': return <Foundations />
    case 'foundations/typography': return <Typography />
    case 'foundations/iconography': return <Icons />
    case 'foundations/assets': return <AssetLibrary />
    case 'foundations/theming': return <Theming />
    case 'guidelines/content': return <ContentVoice />
    case 'guidelines/accessibility': return <AccessibilityGuide />
    case 'guidelines/text-truncation': return <TextTruncation />
    case 'guidelines/contributing': return <Contributing />
    case 'developers/consuming': return <Consuming />
    case 'developers/api-contract': return <ApiContract />
    case 'developers/state-performance': return <StatePerformance />
    case 'developers/testing': return <Testing />
    default: return <Introduction />
  }
}

const selectCls =
  'rounded-sm border border-border bg-background px-2.5 py-1.5 text-body-sm text-foreground transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function App() {
  const [tenant, setTenant] = useState<TenantId>('fams')
  const [lang, setLang] = useState<'en' | 'ar'>('en')
  const [theme, setTheme] = useState<ThemeMode>(readStoredTheme)
  const [route, setRoute] = useState<string>(routeFromHash)
  const [filter, setFilter] = useState('')
  const [toc, setToc] = useState<{ id: string; label: string }[]>([])
  const [activeId, setActiveId] = useState('')
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    document.documentElement.dataset.tenant = tenant
  }, [tenant])
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])
  useEffect(() => {
    // Always write explicit data-theme (never remove it) so CSS selectors work correctly
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])
  useEffect(() => {
    const onHash = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Build the "On this page" rail from the rendered sections — works for every page.
  useEffect(() => {
    const secs = Array.from(document.querySelectorAll<HTMLElement>('#doc-main section[id]'))
    setToc(secs.map((s) => ({ id: s.id, label: s.querySelector('h2, h3')?.textContent?.trim() || s.id })))
    setActiveId(secs[0]?.id ?? '')
    window.scrollTo({ top: 0 })
  }, [route])

  // Scroll-spy: highlight the section currently in view.
  useEffect(() => {
    if (toc.length < 2) return
    const obs = new IntersectionObserver(
      (entries) => {
        const seen = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (seen[0]) setActiveId(seen[0].target.id)
      },
      { rootMargin: '-12% 0px -72% 0px' },
    )
    toc.forEach((t) => {
      const el = document.getElementById(t.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [route, toc])

  const goto = (r: string) => {
    window.location.hash = `#/${r}`
    setRoute(r)
  }

  const current = findItem(route)
  const q = filter.trim().toLowerCase()
  const groups = useMemo(
    () =>
      NAV.map((g) => ({
        ...g,
        items: q
          ? g.items.filter(
              (i) =>
                i.label.toLowerCase().includes(q) ||
                i.memberLabels?.some((ml) => ml.toLowerCase().includes(q)),
            )
          : g.items,
      })).filter((g) => g.items.length > 0),
    [q],
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center gap-4 px-5">
          <button
            type="button"
            onClick={() => goto(DEFAULT_ROUTE)}
            className="flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo tenant="fams" variant="horizontal" className="h-6" />
            <span className="h-4 w-px bg-border" aria-hidden />
            <span className="text-body-sm text-muted-foreground">Design System</span>
          </button>

          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              aria-label="Toggle dark mode"
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className={selectCls + ' flex items-center justify-center px-2'}
            >
              {theme === 'dark' ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
            </button>
            <select
              aria-label="Language"
              value={lang}
              onChange={(e) => setLang(e.target.value as 'en' | 'ar')}
              className={selectCls}
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
            <select
              aria-label="Tenant theme"
              value={tenant}
              onChange={(e) => setTenant(e.target.value as TenantId)}
              className={selectCls}
            >
              {TENANTS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ── Left nav (persistent, everything visible) ── */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-e border-border px-3 py-6 lg:block">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter…"
            className="mb-6 w-full rounded-sm border border-border bg-background px-3 py-1.5 text-body-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {groups.map((g) => {
            // Small doc groups stay open; large component groups collapse — and the
            // group containing the current route auto-opens. Filtering opens everything.
            const activeGroup = route.split('/')[0]
            const alwaysOpen =
              g.id === 'overview' || g.id === 'foundations' || g.id === 'guidelines' || g.id === 'developers'
            const open = q ? true : (openGroups[g.id] ?? (alwaysOpen || g.id === activeGroup))
            return (
            <div key={g.id} className="mb-4">
              <button
                type="button"
                onClick={() => setOpenGroups((s) => ({ ...s, [g.id]: !open }))}
                aria-expanded={open}
                className="mb-1 flex w-full items-center gap-1.5 rounded-md px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronRight
                  className={'size-3 shrink-0 transition-transform ' + (open ? 'rotate-90' : '')}
                  aria-hidden
                />
                <span>{g.label}</span>
                <span className="ms-auto font-normal tabular-nums text-muted-foreground/60">{g.items.length}</span>
              </button>
              {open && (
              <nav className="flex flex-col gap-px">
                {g.items.map((i) => {
                  const r = `${g.id}/${i.id}`
                  const active = route === r || route.startsWith(r + '/')
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => goto(r)}
                      aria-current={active ? 'page' : undefined}
                      className={
                        'flex items-center gap-2 border-s-2 py-1.5 pe-2 ps-3 text-start text-body-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
                        (active
                          ? 'border-s-primary bg-muted font-medium text-foreground'
                          : 'border-s-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground')
                      }
                    >
                      <span className="truncate">{i.label}</span>
                      {i.badge && (
                        <span className="ms-auto">
                          <Badge kind={i.badge} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </nav>
              )}
            </div>
            )
          })}
        </aside>

        {/* ── Main content ── */}
        <main id="doc-main" className="min-w-0 flex-1 px-6 py-12 lg:px-14">
          <div className="mx-auto max-w-[46rem]">
            {current && (
              <div className="mb-6 text-[0.6875rem] font-semibold uppercase tracking-widest text-primary">
                {current.group.label}
              </div>
            )}
            {renderRoute(route, goto)}
          </div>
        </main>

        {/* ── On this page (scroll-spy) ── */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-52 shrink-0 overflow-y-auto py-12 pe-6 xl:block">
          {toc.length > 1 && (
            <nav>
              <div className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                On this page
              </div>
              <ul className="flex flex-col border-s border-border">
                {toc.map((t) => {
                  const active = t.id === activeId
                  return (
                    <li key={t.id}>
                      <a
                        href={`#${t.id}`}
                        className={
                          '-ms-px block border-s-2 py-1 ps-3 text-body-sm transition-colors ' +
                          (active
                            ? 'border-s-primary font-medium text-foreground'
                            : 'border-s-transparent text-muted-foreground hover:text-foreground')
                        }
                      >
                        {t.label}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </nav>
          )}
        </aside>
      </div>
    </div>
  )
}
