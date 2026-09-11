import { useEffect, useMemo, useState } from 'react'
import { cn } from '@fams/design-system'
import {
  Inbox, SlidersHorizontal, Map as MapIcon, LayoutGrid, ChevronDown, ChevronRight, Check,
  HelpCircle, Home, type LucideIcon,
} from 'lucide-react'
import type { AppPage } from './AppLayout'
import { FLAT_MODULES, type ModuleLeaf } from './moduleNavData'
import { HOME_SUITES, type HomeCard } from '../features/home/homeData'
import { useActiveAppId, getLastModuleForApp, setLastModuleForApp } from './activeAppPreference'

/**
 * Mobile chrome — swaps in below the `sm` breakpoint (< 640px).
 *
 * There is NO top bar: the whole chrome is bottom-anchored, which keeps every
 * control inside thumb reach and hands the full viewport height to content.
 *   • Bottom tab bar: Operations Center and Zones Management sit at the front,
 *     with a slot for the most-recently-picked-from-sheet module inserted at
 *     position 3, and All Modules pinned as the last tab. It renders on EVERY
 *     page, Inbox included — with the top bar gone it is the only way off a
 *     surface, so hiding it would strand the user.
 *   • Bottom sheet: an accordion header for switching apps, the module grid,
 *     and — where the old top bar's right-hand buttons went — an Account group
 *     carrying Home, Inbox, Help and the user. That group is deliberately built as a
 *     grouped row list on an inset panel so it never reads as another module:
 *     rows vs. tiles, tinted panel vs. flat, and its own section label.
 */

/* Fixed bottom tabs — Operations Center / Zones Management / All Modules. Any
 * additional module picked from the sheet slides in between Zones Management
 * and All Modules (see `pickedModule` state). */
interface FixedTab {
  id: 'operations' | 'zones' | 'modules'
  label: string
  icon: LucideIcon
}

const OPERATIONS_TAB: FixedTab = { id: 'operations', label: 'Operations Center', icon: SlidersHorizontal }
const ZONES_TAB: FixedTab = { id: 'zones', label: 'Zones Management', icon: MapIcon }
const MODULES_TAB: FixedTab = { id: 'modules', label: 'All Modules', icon: LayoutGrid }

/* Sheet grid tile — reuses the desktop's `ModuleLeaf` shape and adds the
 * navigation target so we route correctly on tap. */
interface ModuleTile {
  id: string
  label: string
  icon: LucideIcon
  page: AppPage | null
}

/* Modules that already sit in the bottom bar as fixed tabs — never render in
 * the sheet grid, otherwise the same module would appear twice. */
const FIXED_TAB_MODULE_IDS = new Set<string>(['operations-center', 'zones-management'])

/** Modules with a real surface of their own — mirrors the desktop rail's map. */
const BUILT_MODULE_PAGE: Record<string, AppPage> = {
  'zones-management': 'zones',
  'live-monitoring': 'live-monitoring',
  'operations-center': 'dashboard',
}

/** Map a web `HomeCard` / `ModuleLeaf` to a mobile `ModuleTile`. Only the built
 *  modules get their own surface; every other one opens the shared "coming
 *  soon" module placeholder (same behaviour as the desktop rail). */
function cardToTile(card: HomeCard | ModuleLeaf): ModuleTile {
  const id = card.id
  const leaf = FLAT_MODULES.find((m) => m.id === id)
  const page = 'page' in card && card.page ? card.page : BUILT_MODULE_PAGE[id] ?? 'module'
  return {
    id,
    label: leaf?.label ?? card.label,
    icon: leaf?.icon ?? card.icon,
    page,
  }
}

const AVATAR_URL = 'https://i.pravatar.cc/48?img=68'

interface DynamicTab {
  id: string
  label: string
  icon: LucideIcon
  tile?: ModuleTile
  isSheetTrigger?: boolean
}

export interface MobileNavbarProps {
  page: AppPage
  activeModuleId?: string
  onNavigate?: (page: AppPage, moduleId?: string) => void
  /** Unread notification count for the sheet's Inbox row. `0` hides the badge. */
  inboxCount?: number
}

export function MobileNavbar({ page, activeModuleId, onNavigate, inboxCount = 0 }: MobileNavbarProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeAppId] = useActiveAppId()
  const activeSuite = useMemo(
    () => HOME_SUITES.find((s) => s.id === activeAppId) ?? HOME_SUITES[0],
    [activeAppId],
  )
  const appTiles = useMemo(
    () => activeSuite.cards.map(cardToTile),
    [activeSuite],
  )

  /** The module surfaced in slot 3 of the bottom bar. Starts with the default or null. */
  const [pickedModule, setPickedModule] = useState<ModuleTile | null>(null)

  // Clear picked module when app switches if it doesn't belong to the new app
  useEffect(() => {
    if (pickedModule && !activeSuite.cards.some((c) => c.id === pickedModule.id)) {
      setPickedModule(null)
    }
  }, [activeAppId, activeSuite, pickedModule])

  // Automatically sync pickedModule / slot 3 if activeModuleId is for a module in activeSuite
  useEffect(() => {
    if (!activeModuleId) return
    const activeTile = appTiles.find((t) => t.id === activeModuleId)
    if (activeTile && activeTile.id !== appTiles[0]?.id && activeTile.id !== appTiles[1]?.id) {
      setPickedModule(activeTile)
    }
  }, [activeModuleId, appTiles])

  // Derive dynamic tabs for the currently active app — ALWAYS at least 3 module tabs + "All Modules"
  const tabs = useMemo<DynamicTab[]>(() => {
    const selected = (pickedModule && activeSuite.cards.some((c) => c.id === pickedModule.id))
      ? pickedModule
      : null

    const moduleTiles: ModuleTile[] = []

    // Always include appTiles[0] and appTiles[1] if available
    if (appTiles[0]) moduleTiles.push(appTiles[0])
    if (appTiles[1] && appTiles[1].id !== appTiles[0]?.id) moduleTiles.push(appTiles[1])

    // If selected picked module is distinct from slot 1 & 2, use it as slot 3; otherwise use appTiles[2]
    if (selected && !moduleTiles.some((t) => t.id === selected.id)) {
      moduleTiles.push(selected)
    } else if (appTiles[2] && !moduleTiles.some((t) => t.id === appTiles[2].id)) {
      moduleTiles.push(appTiles[2])
    }

    // Fill up to 3 tiles from appTiles or fallback if needed
    for (const tile of appTiles) {
      if (moduleTiles.length >= 3) break
      if (!moduleTiles.some((t) => t.id === tile.id)) {
        moduleTiles.push(tile)
      }
    }

    const result: DynamicTab[] = moduleTiles.map((t) => ({
      id: t.id,
      label: t.label,
      icon: t.icon,
      tile: t,
    }))

    result.push({
      id: 'modules',
      label: 'All Modules',
      icon: LayoutGrid,
      isSheetTrigger: true,
    })

    return result
  }, [appTiles, pickedModule, activeSuite])

  const activeTabId: string | null = useMemo(() => {
    if (sheetOpen) return 'modules'
    // Inbox is reached from the sheet, not the tab bar — while it is the current
    // page no module tab is the current one, so nothing is highlighted.
    if (page === 'inbox') return null
    if (activeModuleId && tabs.some((t) => t.tile?.id === activeModuleId)) {
      return activeModuleId
    }
    if (page === 'dashboard') return tabs.find((t) => t.tile?.id === 'operations-center')?.id ?? tabs[0]?.id ?? null
    if (page === 'zones') return tabs.find((t) => t.tile?.id === 'zones-management')?.id ?? tabs[1]?.id ?? null
    if (page === 'live-monitoring') return tabs.find((t) => t.tile?.id === 'live-monitoring')?.id ?? null
    return tabs[0]?.id ?? null
  }, [sheetOpen, activeModuleId, tabs, page])

  const onTabClick = (tab: DynamicTab) => {
    if (tab.isSheetTrigger) {
      setSheetOpen(true)
      return
    }
    setSheetOpen(false)
    if (tab.tile?.page) {
      onNavigate?.(tab.tile.page, tab.tile.id)
    }
  }

  const onSheetPick = (tile: ModuleTile) => {
    setSheetOpen(false)
    setPickedModule(tile)
    if (tile.page) onNavigate?.(tile.page, tile.id)
  }

  return (
    <>
      <nav
        aria-label="Primary mobile"
        className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch border-t border-border bg-card"
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={activeTabId === tab.id}
            onClick={() => onTabClick(tab)}
          />
        ))}
      </nav>

      <ModulesSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onModuleSelect={onSheetPick}
        onNavigate={onNavigate}
        inboxActive={page === 'inbox'}
        inboxCount={inboxCount}
        hiddenModuleIds={new Set(tabs.map((t) => t.tile?.id).filter(Boolean) as string[])}
      />
    </>
  )
}

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: DynamicTab
  active: boolean
  onClick: () => void
}) {
  const Icon = tab.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={tab.label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-1 px-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        active ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      <Icon size={22} className={active ? 'text-primary' : 'text-muted-foreground'} />
      <span
        className={cn(
          'w-full truncate text-center text-[10px] leading-tight',
          active ? 'font-semibold text-primary' : 'font-medium text-muted-foreground'
        )}
      >
        {tab.label}
      </span>
    </button>
  )
}

/* Bottom sheet with drag handle, accordion header, module grid, and the Account
   group that replaced the old top bar's buttons. Two heights driven by
   `accordionOpen`. */
function ModulesSheet({
  open,
  onClose,
  onModuleSelect,
  onNavigate,
  inboxActive,
  inboxCount,
  hiddenModuleIds,
}: {
  open: boolean
  onClose: () => void
  onModuleSelect: (tile: ModuleTile) => void
  onNavigate?: (page: AppPage, moduleId?: string) => void
  /** Inbox is the current page — its row in the Account group reads as current. */
  inboxActive: boolean
  inboxCount: number
  /** Module ids that already live in the bottom bar (fixed tabs + the current
   *  picked-slot tile), so the grid doesn't repeat them. */
  hiddenModuleIds: Set<string>
}) {
  const [accordionOpen, setAccordionOpen] = useState(false)
  const [activeAppId, setActiveAppId] = useActiveAppId()
  /** Vertical pixels the user has dragged the sheet down while touching the
   *  drag handle. `null` means no active drag. Used to follow the pointer in
   *  real time and to decide whether to dismiss on release. */
  const [dragOffset, setDragOffset] = useState<number | null>(null)

  // Reset the accordion + drag state whenever the sheet re-opens.
  useEffect(() => {
    if (open) {
      setAccordionOpen(false)
      setDragOffset(null)
    }
  }, [open])

  // Escape / outside-tap dismisses the sheet.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const activeSuite = useMemo(
    () => HOME_SUITES.find((s) => s.id === activeAppId) ?? HOME_SUITES[0],
    [activeAppId],
  )

  const sortedApps = useMemo(() => {
    const current = HOME_SUITES.find((a) => a.id === activeAppId) ?? HOME_SUITES[0]
    return [current, ...HOME_SUITES.filter((a) => a.id !== current.id)]
  }, [activeAppId])

  // Grid tiles from the active app's module cards in HOME_SUITES, minus anything that
  // already sits in the bottom bar.
  const gridTiles = useMemo(
    () =>
      activeSuite.cards
        .filter((c) => !hiddenModuleIds.has(c.id))
        .map(cardToTile),
    [activeSuite, hiddenModuleIds],
  )

  return (
    <>
      {/* Backdrop — sits below the tab bar (`bottom-16`) so the tabs stay
          fully bright and interactive while the sheet is open. */}
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          'fixed inset-x-0 top-0 bottom-16 z-30 bg-black/40 transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-label="All modules"
        aria-modal="true"
        className={cn(
          'no-scrollbar fixed inset-x-0 bottom-16 z-40 flex flex-col overflow-y-auto overscroll-contain rounded-t-2xl bg-card shadow-[0_-8px_24px_rgba(16,24,40,0.16)] ease-out',
          // Suppress the transition while the user is actively dragging so the
          // sheet follows the pointer in real time.
          dragOffset === null ? 'transition-transform duration-200 motion-reduce:transition-none' : ''
        )}
        style={{
          // Sizes to its content. With the top bar gone the only reservation is
          // the 64px tab bar the sheet already sits above, plus a 16px breather
          // so the sheet never looks glued to the status bar.
          maxHeight: 'calc(100vh - 4rem - 1rem)',
          transform: open
            ? `translateY(${dragOffset ?? 0}px)`
            : 'translateY(120%)',
        }}
      >
        {/* Drag handle — touch/mouse pointer starts here dismisses the sheet
            when dragged down past the threshold. */}
        <div
          role="button"
          aria-label="Drag to close"
          className="flex shrink-0 cursor-grab touch-none justify-center pt-2 pb-3 active:cursor-grabbing"
          onPointerDown={(e) => {
            const startY = e.clientY
            const el = e.currentTarget
            el.setPointerCapture(e.pointerId)
            const CLOSE_THRESHOLD_PX = 100

            const onMove = (ev: PointerEvent) => {
              const dy = ev.clientY - startY
              // Only track downward drag; ignore upward pulls.
              setDragOffset(Math.max(0, dy))
            }
            const onUp = (ev: PointerEvent) => {
              const dy = ev.clientY - startY
              el.removeEventListener('pointermove', onMove)
              el.removeEventListener('pointerup', onUp)
              el.removeEventListener('pointercancel', onUp)
              if (dy > CLOSE_THRESHOLD_PX) {
                // Reset first so the close transform springs from the
                // hover-tracked position back through 100% (no jump-back).
                setDragOffset(null)
                onClose()
              } else {
                setDragOffset(null)
              }
            }
            el.addEventListener('pointermove', onMove)
            el.addEventListener('pointerup', onUp)
            el.addEventListener('pointercancel', onUp)
          }}
        >
          <span aria-hidden className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Header — Figma `6890:5338`: Qatar MME lockup on the left, the
            "Powered By FAMS" credit on the right, 16px side padding. The rail's
            asset is flat white for the gradient; this surface is white, so
            both marks use their light-background colour lockups. */}
        <div className="flex items-center justify-between px-4 pb-5 pt-1">
          <img
            src="/assets/qatar-mme-rail-mark.svg"
            alt="Qatar MME"
            className="h-6 w-6 shrink-0"
          />
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-medium leading-[12px] text-[color:var(--gray-600)]">
              Powered By
            </span>
            <img
              src="/assets/fams-logo-color.svg"
              alt="FAMS"
              className="h-3 w-auto shrink-0"
            />
          </div>
        </div>

        {/* Accordion header — the SELECTED app field, painted in that app's
            identity colour (icon + name) on a neutral white field.
            Expanding it grows the sheet (up to its max height) so the whole
            app list shows without scrolling, and picking an app only swaps
            the grid — the sheet stays open so the user can choose a module
            next. */}
        <div className="px-4">
          {/* One bordered card wraps both the header row and (when open) the
              app list — Figma: a plain white field with a neutral border; the
              selected app's own colour paints its icon + name. Open = the same
              card grown to hold "Select App" + rows. */}
          <div className="rounded-[6px] border border-border bg-card">
            <button
              type="button"
              onClick={() => setAccordionOpen((o) => !o)}
              aria-expanded={accordionOpen}
              aria-controls="mobile-app-list"
              className="flex h-11 w-full items-center gap-2 rounded-[6px] px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {(() => {
                const Icon = activeSuite.icon
                return <Icon size={20} style={{ color: activeSuite.color }} />
              })()}
              <span
                className="flex-1 truncate text-left text-[14px] font-semibold"
                style={{ color: activeSuite.color }}
              >
                {activeSuite.label}
              </span>
              <ChevronDown
                size={16}
                className={cn(
                  'text-[color:var(--gray-600)] transition-transform duration-200',
                  accordionOpen && 'rotate-180'
                )}
              />
            </button>

            {accordionOpen ? (
              <div
                id="mobile-app-list"
                role="listbox"
                aria-label="Select App"
                className="px-3 pb-3"
              >
                <p className="mb-2 text-[12px] font-medium text-muted-foreground">Select App</p>
                <ul className="flex flex-col divide-y divide-border">
                  {sortedApps.map((app) => {
                    const Icon = app.icon
                    const isActive = app.id === activeAppId
                    return (
                      <li key={app.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onClick={() => {
                            setActiveAppId(app.id)
                            setLastModuleForApp(app.id, getLastModuleForApp(app.id))
                            setAccordionOpen(false)
                          }}
                          className={cn(
                            'flex h-11 w-full items-center gap-2.5 rounded-[6px] px-2.5 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                            isActive ? 'bg-[color:var(--gray-50)]' : ''
                          )}
                        >
                          <Icon size={20} style={{ color: app.color }} />
                          <span
                            className={cn(
                              'flex-1 truncate text-left text-[14px]',
                              isActive ? 'font-semibold' : 'font-medium'
                            )}
                            style={{ color: app.color }}
                          >
                            {app.label}
                          </span>
                          {isActive ? <Check size={16} className="text-foreground/70" /> : null}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        {/* Module grid — 4 columns; row count grows with the module catalogue.
            The sheet itself is scrollable when the grid exceeds its cap. */}
        {gridTiles.length > 0 ? (
          <div className="px-4 pt-6">
            <div className="grid grid-cols-4 gap-x-2 gap-y-4">
              {gridTiles.map((tile) => (
                <ModuleTileButton
                  key={tile.id}
                  tile={tile}
                  onClick={() => onModuleSelect(tile)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
            No additional modules for {activeSuite.label}.
          </div>
        )}

        {/* Account — where the old top bar's right-hand buttons went. Styled to
            Figma "Qatar MME — Launch Pad" node `6858:5057`: one gray-50 block
            inset 20px, 12px of padding, 20px glyphs 8px from their label, and
            hairlines spanning the row width. Only the user row carries a
            chevron — Inbox and Help act in place, so an affordance that
            promises a further screen would be a lie. */}
        <div className="px-5 pb-6 pt-7">
          <div className="rounded-[6px] bg-[color:var(--gray-50)] p-3">
            <AccountRow
              icon={Home}
              label="Home"
              onClick={() => {
                onClose()
                onNavigate?.('home')
              }}
            />
            <AccountDivider />
            <AccountRow
              icon={Inbox}
              label="Inbox"
              count={inboxCount}
              active={inboxActive}
              onClick={() => {
                onClose()
                onNavigate?.('inbox')
              }}
            />
            <AccountDivider />
            <AccountRow icon={HelpCircle} label="Help" />
            <AccountDivider />

            <button
              type="button"
              aria-label="FAMS Admin"
              className="flex min-h-[44px] w-full touch-manipulation items-center gap-2 rounded-[6px] px-1.5 text-left outline-none transition-colors hover:bg-[color:var(--gray-100)] focus-visible:ring-2 focus-visible:ring-ring active:bg-[color:var(--gray-100)]"
            >
              <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full">
                <img src={AVATAR_URL} alt="" className="size-full object-cover" />
              </span>
              <span className="flex-1 truncate text-[14px] font-medium leading-[20px] text-[color:var(--gray-600)]">
                FAMS Admin
              </span>
              <ChevronRight size={14} className="shrink-0 text-[color:var(--gray-500)]" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* Hairline between Account rows. Spans the panel's content box, matching the
   Figma's `Line 1` / `Line 2` which run the full row width. */
function AccountDivider() {
  return <div aria-hidden className="h-px bg-[color:var(--gray-200)]" />
}

/* One row inside the Account panel — Figma `6858:5057`. 20px glyph, 8px gap,
   14px label, and a count pill pinned right. No chevron: these rows act in
   place rather than pushing a new screen. */
function AccountRow({
  icon: Icon,
  label,
  count = 0,
  active = false,
  onClick,
}: {
  icon: LucideIcon
  label: string
  count?: number
  active?: boolean
  onClick?: () => void
}) {
  const badgeText = count > 999 ? '999+' : count.toLocaleString('en-US')
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={count > 0 ? `${label}, ${count} unread` : label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-[44px] w-full touch-manipulation items-center gap-2 rounded-[6px] px-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary/[0.07]'
          : 'hover:bg-[color:var(--gray-100)] active:bg-[color:var(--gray-100)]'
      )}
    >
      <Icon
        size={20}
        className={cn('shrink-0', active ? 'text-primary' : 'text-[color:var(--gray-500)]')}
      />
      <span
        className={cn(
          'flex-1 truncate text-[14px] leading-[20px]',
          active ? 'font-semibold text-primary' : 'font-medium text-[color:var(--gray-600)]'
        )}
      >
        {label}
      </span>
      {count > 0 ? (
        <span
          className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none text-white"
          style={{ background: 'var(--status-error, #f04438)' }}
        >
          {badgeText}
        </span>
      ) : null}
    </button>
  )
}

function ModuleTileButton({ tile, onClick }: { tile: ModuleTile; onClick: () => void }) {
  const Icon = tile.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={tile.label}
      className="flex min-h-[64px] touch-manipulation flex-col items-center gap-1.5 rounded-[6px] p-2 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:bg-muted"
    >
      <Icon size={24} className="text-muted-foreground" />
      <span
        className="line-clamp-2 text-center text-[11px] font-medium leading-tight text-foreground"
        title={tile.label}
      >
        {tile.label}
      </span>
    </button>
  )
}
