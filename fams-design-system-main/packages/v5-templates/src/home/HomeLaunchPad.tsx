import { useState, type ReactNode } from 'react'
import { ArrowLeft, Search, Star, X } from '@fams/ui-kit/icons'
import { CustomScrollbar, Stack, TooltipProvider } from '@fams/ui-kit'
import { cn } from '../lib/cn'
import { LaunchPadTopBar, LaunchPadWave } from './LaunchPadChrome'
import { LaunchPadSection, TileGrid, LaunchPadEmptyState, ModuleTile } from './LaunchPadTiles'

/**
 * HomeLaunchPad — the launch-pad Home surface (v5 tier). Ported from the
 * designer-approved "home + side nav" prototype (`HomeDashboard.tsx`).
 *
 * A standalone landing page (rendered WITHOUT the rail — it IS the
 * launcher). Top to bottom: a 60px top BAR of page chrome (tenant lockup on
 * the leading edge, inbox + minimize on the trailing edge — 40px side
 * margins, and it never scrolls away), then the scrolling column: a local
 * module search, a pinned "Favorites" grid, and the tenant's modules grouped
 * by application as 3-up tiles with a hover/focus-revealed star pin toggle.
 * An optional bottom `wavePattern` sits behind everything, tinted from the
 * tenant's primary at 15% via a CSS mask (see `LaunchPadWave`).
 *
 * The launch pad is the app switcher's EXPANDED state, not a separate
 * destination — `onMinimize` returns to the rail's anchored popup and is the
 * one control that moves between the two states (its counterpart is
 * `AppSwitcherPanel`'s expand control).
 *
 * Metadata-driven and state-agnostic: `groups` come from the tenant's
 * licensed applications × resolved module nav entries (never a hardcoded
 * catalog); pinning is `pinnedIds` + `onTogglePin` — persistence lives with
 * the caller (see `usePinnedIds`). Accent colors cycle a token palette by
 * group index — no hardcoded hex here.
 */

export interface LaunchPadModule {
  id: string
  label: string
  /** Rendered in the tile's tinted 40px chip. */
  icon?: ReactNode
  /** Token-based accent (e.g. `var(--color-primary)`) — the tile chip tint. */
  accentColor?: string
}

export interface LaunchPadGroup {
  id: string
  /** Application name — the section heading and each tile's suite label. */
  label: string
  /** Small glyph beside the section heading. */
  icon?: ReactNode
  modules: LaunchPadModule[]
}

export interface HomeLaunchPadProps {
  /** Modules grouped by application, in tenant catalog order. */
  groups: LaunchPadGroup[]
  /** Pinned module ids, in pin order (newest first). */
  pinnedIds: string[]
  onTogglePin: (id: string) => void
  /** Open a module (navigate to its route). */
  onOpen: (id: string) => void
  /** Tenant mark shown at 48px in the header. */
  logo?: ReactNode
  /** Tenant/brand name beside the logo. */
  title?: string
  /** Back affordance (history back). Omit to hide. */
  onBack?: () => void
  /**
   * Reference's `minimize-2` header button — returns to the app switcher's
   * anchored popup instead of the full Launch Pad. Desktop-only (`sm:` and
   * up), hidden below the mobile breakpoint exactly like `.hbtn.minimize`.
   * Omit to hide (e.g. when there's no rail/switcher to minimize back to).
   */
  onMinimize?: () => void
  /** Inbox icon button in the header. Omit to hide. */
  onInbox?: () => void
  /** Unread dot on the inbox button. */
  inboxDot?: boolean
  /**
   * URL of the bottom wave asset. Used as a CSS mask and tinted from the
   * tenant's primary at 15%, so one asset serves every tenant. Omit for no
   * wave.
   */
  wavePattern?: string
  searchPlaceholder?: string
  /**
   * White-label attribution: a "Powered by" caption + this node, centred at
   * the very end of the scrolling content (reached by scrolling to the
   * bottom, never pinned). Pass the same node the rail's `poweredBy` gets
   * (`TenantRuntimeConfig.branding.poweredBy`). Omit to hide — the V5 core
   * tenant never supplies it.
   */
  poweredBy?: ReactNode
  className?: string
}

const norm = (s: string) => s.toLowerCase().trim()

function moduleMatches(mod: LaunchPadModule, groupLabel: string, q: string): boolean {
  const n = norm(q)
  if (!n) return true
  return norm(mod.label).includes(n) || norm(groupLabel).includes(n)
}

export function HomeLaunchPad({
  groups,
  pinnedIds,
  onTogglePin,
  onOpen,
  logo,
  title,
  onBack,
  onMinimize,
  onInbox,
  inboxDot = false,
  wavePattern,
  searchPlaceholder = 'Search modules…',
  poweredBy,
  className,
}: HomeLaunchPadProps) {
  const [query, setQuery] = useState('')
  const searching = query.trim().length > 0

  const moduleById = new Map<string, { mod: LaunchPadModule; groupLabel: string }>()
  for (const g of groups) for (const m of g.modules) if (!moduleById.has(m.id)) moduleById.set(m.id, { mod: m, groupLabel: g.label })

  const pinned = pinnedIds.map((id) => moduleById.get(id)).filter(Boolean) as {
    mod: LaunchPadModule
    groupLabel: string
  }[]

  const filteredGroups = groups
    .map((g) => ({ ...g, modules: g.modules.filter((m) => moduleMatches(m, g.label, query)) }))
    .filter((g) => g.modules.length > 0)

  return (
    <TooltipProvider delayDuration={120}>
      <div
        data-slot="home-launch-pad"
        className={cn('relative flex h-full w-full flex-col overflow-hidden bg-muted/40', className)}
      >
        {wavePattern ? <LaunchPadWave url={wavePattern} /> : null}

        <LaunchPadTopBar
          logo={logo}
          title={title}
          onInbox={onInbox}
          inboxDot={inboxDot}
          onMinimize={onMinimize}
        />

        <CustomScrollbar className="relative z-10 min-h-0 w-full flex-1">
          {onBack ? (
            <div className="pointer-events-none sticky top-4 z-30 -mb-9 w-full px-4 md:px-6">
              <button
                type="button"
                onClick={onBack}
                aria-label="Go back"
                className="pointer-events-auto inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-muted/90 px-2.5 py-1 text-sm font-medium text-muted-foreground backdrop-blur-sm outline-none transition-colors duration-fast hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft aria-hidden className="size-4" />
                <span>Back</span>
              </button>
            </div>
          ) : null}

          <div className="animate-in fade-in slide-in-from-bottom-2 mx-auto max-w-5xl px-6 pt-12 pb-10 duration-normal motion-reduce:animate-none md:px-10">
            {/* Search row — the tenant lockup, inbox and minimize live in the
                top bar above, which does not scroll. */}
            <header className="mb-8 flex items-center justify-end">
              <div className="relative w-full sm:w-75">
                <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="h-10 w-full rounded-md border border-border bg-card ps-9 pe-8 text-sm text-foreground outline-none transition-colors duration-fast placeholder:text-muted-foreground hover:border-muted-foreground/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="absolute end-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors duration-fast hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </header>

            {/* Favorites — hidden while searching */}
            {!searching ? (
              <LaunchPadSection title="Favorites" count={pinned.length} icon={Star}>
                {pinned.length > 0 ? (
                  <TileGrid>
                    {pinned.map(({ mod, groupLabel }, i) => (
                      <ModuleTile key={mod.id} mod={mod} groupLabel={groupLabel} index={i} pinned onTogglePin={onTogglePin} onOpen={onOpen} />
                    ))}
                  </TileGrid>
                ) : (
                  <LaunchPadEmptyState icon={Star} title="No favorites yet" hint="Hover a module below and tap its star to add it here." />
                )}
              </LaunchPadSection>
            ) : null}

            {/* Browse — grouped by application (live-filtered) */}
            <div className={cn('flex flex-col gap-8', !searching && 'mt-10')}>
              {filteredGroups.map((g) => (
                <LaunchPadSection key={g.id} title={g.label} count={g.modules.length} iconNode={g.icon}>
                  <TileGrid>
                    {g.modules.map((m, i) => (
                      <ModuleTile
                        key={m.id}
                        mod={m}
                        groupLabel={g.label}
                        index={i}
                        pinned={pinnedIds.includes(m.id)}
                        onTogglePin={onTogglePin}
                        onOpen={onOpen}
                      />
                    ))}
                  </TileGrid>
                </LaunchPadSection>
              ))}
              {searching && filteredGroups.length === 0 ? (
                <LaunchPadEmptyState icon={Search} title={`No modules match “${query.trim()}”`} hint="Try a different name or application." />
              ) : null}
            </div>

            {/* Powered by — white-label attribution, centred at the very end
                of the scroll content so it's reached by scrolling down
                rather than pinned. Hidden entirely when the tenant (e.g. the
                V5 core `fams` tenant) supplies no `poweredBy` node. */}
            {poweredBy ? (
              <Stack
                as="footer"
                direction="row"
                align="center"
                gap="inline"
                className="justify-center pt-10 pb-2"
                data-slot="launch-pad-powered-by"
              >
                <span className="text-xs text-muted-foreground">Powered by</span>
                {poweredBy}
              </Stack>
            ) : null}
          </div>
        </CustomScrollbar>
      </div>
    </TooltipProvider>
  )
}
