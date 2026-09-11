import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  ChartColumn,
  ChartNoAxesGantt,
  ChartPie,
  ChevronRight,
  Copy,
  FileLock,
  Funnel,
  House,
  Info,
  Link2,
  List,
  ListChecks,
  Lock,
  MapPin,
  Pentagon,
  Pin,
  RefreshCw,
  Save,
  Share2,
  Trash2,
  X,
} from '@fams/ui-kit/icons'
import {
  ColumnCustomizer,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  type ColumnCatalogItem,
} from '@fams/ui-kit'
import { LIVE_LIST_WIDTH_STATES, type LiveListWidthState } from './live-list-model'
import { readPersistedSyncWithMap } from './sync-with-map-storage'

/**
 * CustomizeViewDrawer — the 347px "Customize View" right drawer (figma
 * live-monitoring spec §1.9): name input, a Fields row drilling into an
 * inline Columns sub-panel (back arrow returns), a Filter row, the List View
 * State dropdown (the divider's three width values), Autosave/Private/
 * Protect toggles, Pin View dropdown with info tooltip, Set as Default, the
 * hybrid-only map/widget toggles (omitted entirely for `variant="list"`,
 * spec §1.10), and footer Copy Link ("Copied!" swap) / Sharing / Delete.
 * Non-modal inline panel — the view stays live behind it; Escape/✕ close.
 */

/** Drawer width (px) — 347, the same strip the map tool drawers reserve, so a
 *  host can step the map's end tool stack inboard by exactly this (UX-10). */
export const CUSTOMIZE_DRAWER_WIDTH = 347

export type PinViewValue = 'off' | 'for-me' | 'for-all'

export interface CustomizeViewState {
  name: string
  listState: LiveListWidthState
  autosave: boolean
  privateView: boolean
  protectView: boolean
  pinView: PinViewValue
  defaultView: boolean
  pinZoneFilter: boolean
  pinPoiFilter: boolean
  syncListWithMap: boolean
  fleetStatusWidget: boolean
  driversBehaviorWidget: boolean
  realTimeTimeline: boolean
}

export function defaultCustomizeViewState(name: string): CustomizeViewState {
  return {
    name,
    listState: 'collapsed',
    autosave: false,
    privateView: false,
    protectView: false,
    pinView: 'off',
    defaultView: false,
    pinZoneFilter: true,
    pinPoiFilter: true,
    // Seeded from the user's last-picked default (localStorage) when the
    // user has one; otherwise "Sync With Map" defaults OFF — the reference
    // recording opens with the toggle grey and the list showing the whole
    // fleet, decoupled from the map viewport, until the user opts in. A
    // user's explicit override (either direction) still wins on every
    // subsequent view via the persisted value.
    syncListWithMap: readPersistedSyncWithMap() ?? false,
    fleetStatusWidget: true,
    driversBehaviorWidget: true,
    realTimeTimeline: true,
  }
}

export interface CustomizeViewDrawerProps {
  open: boolean
  onClose: () => void
  /** `list` omits the map/widget toggles AND the List View State row. */
  variant: 'hybrid' | 'list'
  state: CustomizeViewState
  onStateChange: (state: CustomizeViewState) => void
  /** Columns sub-panel wiring (the Fields row's inline drill-in). */
  columns: string[]
  onColumnsChange: (orderedVisibleKeys: string[]) => void
  catalog: ColumnCatalogItem[]
  /** Active filter-condition count shown on the Filter row. */
  filterCount?: number
  /** Filter row click — e.g. close the drawer and open the All Filters popover. */
  onEditFilters?: () => void
  /** Copy Link override; defaults to copying `location.href`. */
  onCopyLink?: () => void
  onShare?: () => void
  onDelete?: () => void
}

/**
 * One drawer row. Every row carries a 16px grey LEAD glyph before its label —
 * SPEC §2.7's row anatomy, and 495:26635 renders one on all sixteen rows
 * (round-2 visual #3). The gutter is reserved even when a row supplies no
 * icon so the labels stay on one edge.
 *
 * ROW PITCH is 36px — a 32px row floor (`min-h-8`) on the list's own 4px gap
 * (round-4 visual #3). Rounds 1–4 shipped a 40px floor, i.e. a 44px pitch,
 * which pushed the drawer's content to 86% of the viewport height where
 * 495:26635 ends at 69%; the frame's 1024-pitch is 18.2 → ~34px and SPEC §2.7
 * says ≈36. 32px is still comfortably clear of WCAG 2.5.8's 24x24 target
 * floor (these rows are full-width click targets), so this buys the 8px back
 * without spending any of the hit-area work fix5a landed — the frame's own
 * ~34px would be the number that starts eating into it.
 */
function DrawerRow({
  label,
  icon,
  children,
  onClick,
}: {
  label: ReactNode
  icon?: ReactNode
  children?: ReactNode
  onClick?: () => void
}) {
  const inner = (
    <>
      <span
        aria-hidden="true"
        data-slot="customize-view-row-icon"
        className="grid size-4 shrink-0 place-items-center text-muted-foreground [&_svg]:size-4"
      >
        {icon}
      </span>
      <span className="flex-1 truncate text-body-sm text-foreground">{label}</span>
      {children}
    </>
  )
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-8 w-full items-center gap-2 rounded-sm px-1 text-start outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {inner}
      </button>
    )
  }
  return <div className="flex min-h-8 items-center gap-2 px-1">{inner}</div>
}

/**
 * The three value-carrying dropdown rows (`List View State`, `Pin View`,
 * `Set as Default View`) render as BARE right-aligned text + a caret —
 * 495:26635 draws no box around them at all, and the app's 140x29 bordered
 * `SelectTrigger` broke the row rhythm the other rows keep (round-3 visual
 * #1). The trigger keeps every Radix behaviour; only its chrome goes.
 *
 * Trailing glyph: a DOWN caret, not a right chevron. SPEC 2.9 writes these
 * rows with a right chevron and SPEC 2.7 writes the same rows with a caret;
 * 495:26635 and 495:45132 both render a down caret on the three value rows
 * and a right chevron only on the two DRILL-IN rows (`Fields`, `Filter`).
 * The frames settle it: a caret means "opens a menu here", a chevron means
 * "goes somewhere else".
 */
function BareSelectTrigger({ label }: { label: string }) {
  return (
    <SelectTrigger
      aria-label={label}
      data-slot="customize-view-select"
      // `SelectTrigger` already appends the caret as its last child — this
      // only strips the box chrome (border, fill, height, fixed width) so the
      // row reads as bare right-aligned text + caret.
      className="h-auto w-auto justify-end gap-1 border-0 bg-transparent p-0 text-caption text-muted-foreground shadow-none focus:border-0 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <SelectValue />
    </SelectTrigger>
  )
}

function ToggleRow({
  label,
  icon,
  checked,
  onCheckedChange,
}: {
  label: string
  icon?: ReactNode
  checked: boolean
  onCheckedChange: (c: boolean) => void
}) {
  return (
    <DrawerRow label={label} icon={icon}>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </DrawerRow>
  )
}

export function CustomizeViewDrawer({
  open,
  onClose,
  variant,
  state,
  onStateChange,
  columns,
  onColumnsChange,
  catalog,
  filterCount = 0,
  onEditFilters,
  onCopyLink,
  onShare,
  onDelete,
}: CustomizeViewDrawerProps) {
  const [panel, setPanel] = useState<'main' | 'fields'>('main')
  const [copied, setCopied] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  // Mirror of `panel` for the document-level Escape listener (stable handler,
  // current value — no updater-side effects; see the Escape ladder below).
  const panelStateRef = useRef(panel)
  panelStateRef.current = panel

  useEffect(() => {
    if (!open) return
    setPanel('main')
    restoreRef.current = document.activeElement as HTMLElement | null
    panelRef.current?.querySelector<HTMLElement>('input, button')?.focus()
    return () => restoreRef.current?.focus?.()
  }, [open])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  // Escape ladder, document-level (jsx-a11y: no key handlers on the dialog
  // div): the Fields sub-panel backs out first, then the drawer closes.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // Escape ladder: if a nested anchored surface (Select/Popover content,
      // portaled Radix layer) is handling this Escape, it closes first — the
      // drawer only reacts when the event comes from its own plain content.
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-radix-popper-content-wrapper], [role="listbox"]')) return
      // NEVER call `onClose` from inside a state updater — updaters can run
      // during the render phase, and a parent setter fired there is the
      // "Cannot update ModuleView while rendering CustomizeViewDrawer"
      // setState-in-render error round-1 QA caught on the Escape close.
      if (panelStateRef.current === 'fields') setPanel('main')
      else onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const set = <K extends keyof CustomizeViewState>(key: K, value: CustomizeViewState[K]) =>
    onStateChange({ ...state, [key]: value })

  const copyLink = () => {
    if (onCopyLink) onCopyLink()
    else if (typeof navigator !== 'undefined') void navigator.clipboard?.writeText(window.location.href)
    setCopied(true)
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Customize View"
      data-slot="customize-view-drawer"
      className="absolute inset-y-0 end-0 z-30 flex max-w-full flex-col border-s border-border bg-card shadow-lg"
      // Load-bearing width inline (arbitrary rem classes are not guaranteed to
      // be emitted by a consuming app's Tailwind build).
      style={{ width: CUSTOMIZE_DRAWER_WIDTH }}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        {panel === 'fields' ? (
          <button
            type="button"
            aria-label="Back to Customize View"
            onClick={() => setPanel('main')}
            className="flex size-10 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          </button>
        ) : null}
        <h2 className="flex-1 text-body-sm font-semibold text-foreground">
          {panel === 'fields' ? 'Fields' : 'Customize View'}
        </h2>
        <button
          type="button"
          aria-label="Close Customize View"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {panel === 'fields' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ColumnCustomizer catalog={catalog} value={columns} onChange={onColumnsChange} />
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
            {/* SPEC §2.7's 307×32 name input — the surface behind the view
                menu's `Rename` row (interaction 3h: the app had no
                `Enter view name` input at all). */}
            <Input
              value={state.name}
              onChange={(e) => set('name', e.target.value)}
              aria-label="View name"
              placeholder="Enter view name"
              data-slot="customize-view-name"
              className="mb-2 h-8 w-[19.1875rem] max-w-full"
            />

            <DrawerRow label="Fields" icon={<ListChecks aria-hidden="true" />} onClick={() => setPanel('fields')}>
              <span className="text-caption text-muted-foreground">{columns.length} Shown</span>
              <ChevronRight className="size-4 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
            </DrawerRow>

            <DrawerRow label="Filter" icon={<Funnel aria-hidden="true" />} onClick={onEditFilters}>
              <span className="text-caption text-muted-foreground">
                {filterCount ? `${filterCount} active` : 'None'}
              </span>
              <ChevronRight className="size-4 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
            </DrawerRow>

            {variant === 'hybrid' ? (
              <DrawerRow label="List View State" icon={<List aria-hidden="true" />}>
                <Select value={state.listState} onValueChange={(v) => set('listState', v as LiveListWidthState)}>
                  <BareSelectTrigger label="List View State" />
                  <SelectContent>
                    {LIVE_LIST_WIDTH_STATES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </DrawerRow>
            ) : null}

            <ToggleRow label="Autosave for Me" icon={<Save aria-hidden="true" />} checked={state.autosave} onCheckedChange={(c) => set('autosave', c)} />
            <ToggleRow label="Private View" icon={<Lock aria-hidden="true" />} checked={state.privateView} onCheckedChange={(c) => set('privateView', c)} />
            <ToggleRow label="Protect View" icon={<FileLock aria-hidden="true" />} checked={state.protectView} onCheckedChange={(c) => set('protectView', c)} />

            <DrawerRow
              icon={<Pin aria-hidden="true" />}
              label={
                <span className="inline-flex items-center gap-1">
                  Pin View
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="About Pin View"
                        className="flex size-6 items-center justify-center rounded-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Info className="size-3.5" aria-hidden="true" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Pin this view to always see it towards the front of view bar</TooltipContent>
                  </Tooltip>
                </span>
              }
            >
              <Select value={state.pinView} onValueChange={(v) => set('pinView', v as PinViewValue)}>
                <BareSelectTrigger label="Pin View" />
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="for-me">For Me</SelectItem>
                  <SelectItem value="for-all">For All</SelectItem>
                </SelectContent>
              </Select>
            </DrawerRow>

            <DrawerRow label="Set as Default View" icon={<House aria-hidden="true" />}>
              <Select value={state.defaultView ? 'yes' : 'no'} onValueChange={(v) => set('defaultView', v === 'yes')}>
                <BareSelectTrigger label="Set as Default View" />
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </DrawerRow>

            {variant === 'hybrid' ? (
              <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
                <ToggleRow label="Pin Zone Filter on Map" icon={<Pentagon aria-hidden="true" />} checked={state.pinZoneFilter} onCheckedChange={(c) => set('pinZoneFilter', c)} />
                <ToggleRow label="Pin POI Filter on Map" icon={<MapPin aria-hidden="true" />} checked={state.pinPoiFilter} onCheckedChange={(c) => set('pinPoiFilter', c)} />
                <ToggleRow label="Sync list with Map" icon={<RefreshCw aria-hidden="true" />} checked={state.syncListWithMap} onCheckedChange={(c) => set('syncListWithMap', c)} />
                <ToggleRow label="Fleet Status Widget" icon={<ChartColumn aria-hidden="true" />} checked={state.fleetStatusWidget} onCheckedChange={(c) => set('fleetStatusWidget', c)} />
                <ToggleRow
                  label="Overall Drivers Behavior Score Widget"
                  icon={<ChartPie aria-hidden="true" />}
                  checked={state.driversBehaviorWidget}
                  onCheckedChange={(c) => set('driversBehaviorWidget', c)}
                />
                <ToggleRow label="Real-Time Timeline" icon={<ChartNoAxesGantt aria-hidden="true" />} checked={state.realTimeTimeline} onCheckedChange={(c) => set('realTimeTimeline', c)} />
              </div>
            ) : null}

            {/*
             * The footer group FOLLOWS the widget group immediately, separated
             * by a rule — it is NOT pinned to the drawer's bottom edge
             * (round-3 visual #4: the app left a 169px blank band between
             * `Real-Time Timeline` and `Copy Link to View`, where 495:26635
             * puts a 27px separator gap and leaves the blank space BELOW the
             * last row). It therefore lives inside the same scrolling column
             * as every other row rather than in a bottom-docked block.
             */}
            <div
              data-slot="customize-view-footer"
              className="mt-2 flex flex-col gap-1 border-t border-border pt-2"
            >
            {/* Figma 495:26635 gives these three a LEAD glyph like every other
                row and nothing on the trailing edge — the icon used to render
                on BOTH sides once the lead gutter landed (visual #3). */}
            <DrawerRow
              label={copied ? 'Copied!' : 'Copy Link to View'}
              icon={copied ? <Copy className="text-success" aria-hidden="true" /> : <Link2 aria-hidden="true" />}
              onClick={copyLink}
            />
            <DrawerRow label="Sharing & Permissions" icon={<Share2 aria-hidden="true" />} onClick={onShare} />
            {/* SPEC §2.7: grey with a trash icon, deliberately not red. */}
            <DrawerRow label="Delete View" icon={<Trash2 aria-hidden="true" />} onClick={onDelete} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

CustomizeViewDrawer.displayName = 'CustomizeViewDrawer'
