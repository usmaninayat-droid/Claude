import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Search, Pin, X, Inbox, ArrowLeft, Minimize2,
} from 'lucide-react'
import { cn, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@fams/design-system'
import type { AppPage } from '../../layout/AppLayout'
import { HOME_SUITES, ALL_CARDS, cardMatches, type FlatCard } from './homeData'
import { setActiveAppId, setLastModuleForApp } from '../../layout/activeAppPreference'
import { CustomScrollbar } from '../../components/CustomScrollbar'

/**
 * The Launch Pad — Figma "Tadweer — Launch Pad" node `6847:16609`. A finder for
 * every application's modules:
 *   1) a header with the Tadweer wordmark, a search input, and inbox/minimize
 *      controls;
 *   2) a "Pinned Modules" section — the user's favourites, each carrying its
 *      parent-app name as a subtitle so cross-app pins stay legible;
 *   3) per-app sections in `HOME_SUITES` order, each led by an app-coloured
 *      shield chip. Every module tile paints its icon in the parent app's
 *      brand colour so the eye ties tiles back to their section.
 *
 * Opening a module also promotes its parent app to the active one — the rail's
 * app row + modules list follow along on return.
 */

/** Every module, grouped by its owning app (in catalog order). Modules without
 *  a surface of their own open the shared "coming soon" placeholder. */
const MODULES: FlatCard[] = ALL_CARDS.filter((c) => c.page !== null)
const MODULE_BY_ID = new Map(MODULES.map((c) => [c.id, c]))
const MODULE_GROUPS = HOME_SUITES
  .map((s) => ({
    id: s.id,
    label: s.label,
    color: s.color,
    icon: s.icon,
    cards: MODULES.filter((c) => c.suiteId === s.id),
  }))
  .filter((g) => g.cards.length > 0)

const PIN_KEY = 'uccp.home.pinned'
const DEFAULT_PINS = ['operational-dashboard', 'live-monitoring', 'smart-planning', 'fleet-management']

function loadPins(): string[] {
  try {
    const raw = localStorage.getItem(PIN_KEY)
    if (raw) return (JSON.parse(raw) as string[]).filter((id) => MODULE_BY_ID.has(id))
  } catch { /* ignore malformed storage */ }
  return DEFAULT_PINS.filter((id) => MODULE_BY_ID.has(id))
}

export function HomeDashboard({
  onNavigate,
  onMinimize,
}: {
  onNavigate?: (page: AppPage, moduleId?: string) => void
  /** Demotes the Launch Pad to the rail's app-switcher popover: leaves this
   *  page, opens the switcher there, and remembers the choice. Omit to hide
   *  the affordance. */
  onMinimize?: () => void
}) {
  const [pins, setPins] = useState<string[]>(loadPins)
  const [query, setQuery] = useState('')

  useEffect(() => {
    try { localStorage.setItem(PIN_KEY, JSON.stringify(pins)) } catch { /* ignore */ }
  }, [pins])

  const openModule = (card: FlatCard) => {
    if (!card.page) return
    // Opening a module from Home also switches the rail to its parent app, so
    // when the user lands back on the rail the app row + modules list match.
    setActiveAppId(card.suiteId)
    setLastModuleForApp(card.suiteId, card.id)
    onNavigate?.(card.page, card.id)
  }
  const togglePin = (id: string) =>
    setPins((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]))

  const pinnedCards = pins.map((id) => MODULE_BY_ID.get(id)).filter(Boolean) as FlatCard[]

  // Local search — live-filters the browse modules (Pinned is hidden while searching).
  const searching = query.trim().length > 0
  const filteredGroups = MODULE_GROUPS
    .map((g) => ({ ...g, cards: g.cards.filter((c) => cardMatches(c, c.suiteLabel, query)) }))
    .filter((g) => g.cards.length > 0)

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      onNavigate?.('inbox')
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[color:var(--gray-50)]">
      {/* Wave pattern — Figma `6858:3251`. Pinned to the bottom of the page
          behind the content. The SVG is used as a mask so the tint comes from
          the brand token rather than a hex baked into the asset: brand primary
          at 15% opacity, as specified. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[260px] w-full bg-primary opacity-[0.15] sm:h-auto sm:aspect-[1440/415]"
        style={{
          maskImage: 'url(/assets/home-wave-pattern.svg)',
          WebkitMaskImage: 'url(/assets/home-wave-pattern.svg)',
          maskSize: 'cover',
          WebkitMaskSize: 'cover',
          maskPosition: 'center bottom',
          WebkitMaskPosition: 'center bottom',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
        }}
      />
      <CustomScrollbar className="relative z-10 h-full w-full">
        {/* ── Sticky Back button at extreme left (desktop only; mobile uses the
            ✕ in the header row instead). No tooltip, stays on top while scrolling. ── */}
        <div className="sticky top-4 z-30 pointer-events-none hidden w-full px-4 sm:block md:px-6 mb-[-36px]">
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="pointer-events-auto inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[color:var(--gray-50)]/90 px-2.5 py-1 text-sm font-medium text-[color:var(--gray-600)] backdrop-blur-sm outline-none transition-colors hover:text-[color:var(--gray-900)] focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        </div>

        {/* ── Sticky ✕ at top-right (mobile only) — stands in for Back and
            stays pinned while the list scrolls. ── */}
        <div className="sticky top-3 z-30 pointer-events-none flex w-full justify-end px-3 sm:hidden mb-[-36px]">
          <button
            type="button"
            onClick={goBack}
            aria-label="Close"
            className="pointer-events-auto flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[4px] bg-[color:var(--gray-50)]/90 text-[color:var(--gray-600)] backdrop-blur-sm outline-none transition-colors hover:text-[color:var(--gray-900)] focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mx-auto max-w-[1200px] animate-in fade-in slide-in-from-bottom-2 px-4 pt-4 pb-10 duration-300 motion-reduce:animate-none sm:px-6 sm:pt-12 md:px-10">

          {/* First row: 48px FAMS Logo (left) + Local search & Inbox button (right) */}
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* FAMS logo — 48px on desktop, 32px on mobile where the
                row also carries the ✕ that stands in for the Back button. */}
            <div className="flex items-center gap-2 shrink-0 sm:gap-3">
              <img src="/assets/fams-icon.svg" alt="" className="h-8 w-auto shrink-0 sm:h-[48px]" aria-hidden="true" />
              <div className="flex flex-col justify-center leading-[0.92] text-[#0a1629] select-none">
                <span className="text-[15px] font-extrabold tracking-tight sm:text-[22px]">FAMS</span>
              </div>
            </div>

            {/* Inbox button + local search + Minimize */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <TooltipProvider delayDuration={120}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onNavigate?.('inbox')}
                      aria-label="Inbox"
                      className="relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-[color:var(--gray-300)] bg-card text-[color:var(--gray-700)] outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Inbox size={20} />
                      <span
                        aria-hidden
                        className="absolute right-2 top-2 size-2 rounded-full"
                        style={{ background: 'var(--status-error, #f04438)' }}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Inbox</TooltipContent>
                </Tooltip>

                <div className="relative w-full sm:w-[380px]">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search modules"
                    aria-label="Search modules"
                    className="h-10 w-full rounded-[4px] border border-[color:var(--gray-300)] bg-card pl-9 pr-8 text-sm text-foreground outline-none transition-colors placeholder:text-[color:var(--gray-400)] hover:border-[color:var(--gray-400)] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--primary)_22%,transparent)]"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X size={15} />
                    </button>
                  ) : null}
                </div>

                {/* Minimize — Launch Pad → anchored popup on the rail. */}
                {onMinimize ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={onMinimize}
                        aria-label="Minimize to app switcher"
                        className="hidden sm:flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-[color:var(--gray-300)] bg-card text-[color:var(--gray-700)] outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Minimize2 size={18} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Minimize to app switcher</TooltipContent>
                  </Tooltip>
                ) : null}
              </TooltipProvider>
            </div>
          </header>

          {/* Pinned Modules — hidden while searching. Chip is Border/Normal
              (#98A2B3) with a line-style pin, matching Figma's Pinned Modules
              header. */}
          {!searching ? (
            <Section
              title="Pinned Modules"
              count={pinnedCards.length}
              icon={Pin}
              chipBackground="#98A2B3"
              chipForeground="#ffffff"
            >
              {pinnedCards.length > 0 ? (
                <TileGrid>
                  {pinnedCards.map((c, i) => (
                    <ModuleTile
                      key={c.id}
                      card={c}
                      index={i}
                      pinned
                      showSuiteLabel
                      onTogglePin={togglePin}
                      onOpen={openModule}
                    />
                  ))}
                </TileGrid>
              ) : (
                <div className="flex flex-col items-center gap-1 rounded-[6px] border border-dashed border-[color:var(--gray-300)] bg-card/60 px-6 py-8 text-center">
                  <Pin size={18} className="text-[color:var(--gray-400)]" />
                  <p className="mt-1 text-sm font-medium text-foreground">No pinned modules yet</p>
                  <p className="text-xs text-muted-foreground">Hover a module below and tap its pin to add it here.</p>
                </div>
              )}
            </Section>
          ) : null}

          {/* Browse — grouped by app (filtered by the search query) */}
          <div className={cn('flex flex-col gap-8', !searching && 'mt-10')}>
            {filteredGroups.map((g) => (
              <Section
                key={g.id}
                title={g.label}
                count={g.cards.length}
                icon={g.icon}
                chipBackground={g.color}
                chipForeground="#ffffff"
              >
                <TileGrid>
                  {g.cards.map((c, i) => (
                    <ModuleTile
                      key={c.id}
                      card={c}
                      index={i}
                      pinned={pins.includes(c.id)}
                      onTogglePin={togglePin}
                      onOpen={openModule}
                    />
                  ))}
                </TileGrid>
              </Section>
            ))}
            {searching && filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center gap-1 rounded-[6px] border border-dashed border-[color:var(--gray-300)] bg-card/60 px-6 py-12 text-center">
                <Search size={18} className="text-[color:var(--gray-400)]" />
                <p className="mt-1 text-sm font-medium text-foreground">No modules match “{query.trim()}”</p>
                <p className="text-xs text-muted-foreground">Try a different name, app, or category.</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Powered By — the Launch Pad's footer, at the very end of the scroll
            content so it is reached by scrolling to the bottom rather than
            pinned over the page. Sits outside the max-width column so its own
            spacing is independent of the grid's padding: 32px lockup, 12px
            caption, 24px clear of the bottom. Uses the light-background
            lockup (blue mark + ink wordmark) — the rail's asset is flat white
            for the gradient rail and would vanish here. */}
        <footer className="flex items-center justify-center gap-2.5 pb-6">
          <span className="text-[12px] font-medium leading-none text-[color:var(--gray-600)]">
            Powered By
          </span>
          <img
            src="/assets/fams-logo-color.svg"
            alt="FAMS"
            className="h-8 w-auto shrink-0"
          />
        </footer>
      </CustomScrollbar>
    </div>
  )
}

/* ── Section header + grid primitives ──────────────────────────────────── */

function Section({
  title, count, icon: Icon, chipBackground, chipForeground, chipIconFill, children,
}: {
  title: string
  count: number
  icon?: LucideIcon
  chipBackground: string
  chipForeground: string
  /** Fill the glyph as well as stroke — used by the pin on the Pinned Modules
   *  chip so it reads as filled ink on a dark ground, not an outline. */
  chipIconFill?: boolean
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2.5">
        {Icon ? (
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-[4px]"
            style={{ backgroundColor: chipBackground, color: chipForeground }}
          >
            <Icon size={16} fill={chipIconFill ? 'currentColor' : 'none'} />
          </span>
        ) : null}
        <h2 className="text-[16px] font-semibold tracking-tight text-[color:var(--gray-900)]">{title}</h2>
        <span className="flex h-[20px] min-w-[24px] items-center justify-center rounded-full bg-[color:var(--gray-100)] px-1.5 text-[11px] font-semibold tabular-nums text-[color:var(--gray-600)]">
          {String(count).padStart(2, '0')}
        </span>
      </div>
      {children}
    </section>
  )
}

function TileGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">{children}</div>
}

/* ── Module tile ────────────────────────────────────────────────────────── */

function ModuleTile({
  card, index = 0, pinned, showSuiteLabel = false, onTogglePin, onOpen,
}: {
  card: FlatCard
  /** Position within its grid — drives the staggered entrance delay. */
  index?: number
  pinned: boolean
  /** Show the parent app's name under the module title — used by pinned tiles
   *  so cross-app pins stay recognisable, per the Figma. */
  showSuiteLabel?: boolean
  onTogglePin: (id: string) => void
  onOpen: (card: FlatCard) => void
}) {
  const Icon = card.icon
  // Icon chip picks up the parent app's brand colour (12% tint bg + full-strength
  // glyph), so tiles read as belonging to their section at a glance.
  const suite = HOME_SUITES.find((s) => s.id === card.suiteId)
  const accent = suite?.color ?? 'var(--primary)'

  return (
    <div
      className="group relative animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
      style={{ animationDelay: `${Math.min(index * 30, 240)}ms`, animationFillMode: 'backwards' }}
    >
      <button
        type="button"
        onClick={() => onOpen(card)}
        aria-label={`Open ${card.label}`}
        className="relative flex w-full cursor-pointer items-center rounded-[6px] border border-[color:var(--gray-200)] bg-card p-3.5 pr-11 text-left outline-none transition-[border-color,box-shadow] duration-150 hover:border-[color:color-mix(in_srgb,var(--primary)_45%,var(--gray-200))] hover:shadow-[0_1px_3px_rgba(16,24,40,0.07),0_1px_2px_rgba(16,24,40,0.04)] focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-[4px]"
            style={{
              background: `color-mix(in srgb, ${accent} 12%, transparent)`,
              color: accent,
            }}
          >
            <Icon size={18} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[14px] font-semibold leading-[20px] text-foreground">{card.label}</span>
            {showSuiteLabel ? (
              <span className="truncate text-[12px] font-medium leading-[16px] text-muted-foreground">
                {card.suiteLabel}
              </span>
            ) : null}
          </span>
        </span>
      </button>

      {/* Pin toggle — hidden until the tile is hovered / focused, whether the
          tile is pinned or not. A filled pin marks pinned state on reveal. */}
      <div className="absolute right-2 top-2 z-10">
        <button
          type="button"
          onClick={() => onTogglePin(card.id)}
          aria-label={pinned ? `Unpin ${card.label}` : `Pin ${card.label}`}
          aria-pressed={pinned}
          className="peer flex size-7 cursor-pointer items-center justify-center rounded-md text-primary opacity-0 outline-none transition-[background-color,transform,opacity] duration-150 group-hover:opacity-100 hover:scale-110 hover:bg-muted active:scale-90 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pin size={14} fill={pinned ? 'currentColor' : 'none'} />
        </button>
        <span
          role="tooltip"
          className="pointer-events-none absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded-md bg-[color:var(--gray-900)] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition-opacity duration-150 peer-hover:opacity-100 peer-focus-visible:opacity-100"
        >
          {pinned ? 'Unpin' : 'Pin'}
        </span>
      </div>
    </div>
  )
}
