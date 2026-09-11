import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Flag, Frame, Image as ImageIcon, MapPin, Search, Tag } from '@fams/ui-kit/icons'
import { Checkbox, Input, PoiCategoryChip, poiCategoryArt } from '@fams/ui-kit'
import { cn } from '../../lib/cn'
// VALUE import from `map/constants` — the established narrow exception to the
// views/ "type-only imports from map/" convention: `constants.ts` (and its one
// dependency `map/color.ts`) is dependency-free (no maplibre/deck.gl), so the
// light barrel stays lazy-weight. Same exception `use-muted-basemap.ts` takes.
import { MAP_TOOL_DRAWER_WIDTH } from '../../map/constants'
// TYPE-ONLY map-entry imports — erased at build time (lazy-weight rule).
import type { LivePoiDatum, LiveZoneDatum } from '../../map/live-types'

/**
 * ZonesDrawer.tsx — the map's Zones and POI right drawers (SPEC §2.8,
 * frames 495:34206 / 495:36403).
 *
 * Geometry (round-1 visual #21 / UX findings 3 + 12): a **right-docked,
 * full-height 347px panel flush to the map pane's inline-end edge** — not
 * the floating rounded card round 1 shipped, which left a 13px strip of live
 * map showing beyond it and sat exactly on top of the right-hand tool stack,
 * hiding the very button that opened it (force-clicking the other tool timed
 * out — interaction 21b). Figma has **no title header**: the panel opens
 * straight into a `Search Zones` / `Search POI` input plus a square tag
 * button, and the tool stack stays visible inboard of the drawer
 * (`LiveMapTools`' `endInset` shifts it by exactly `MAP_TOOL_DRAWER_WIDTH`).
 *
 * Tag filters (SPEC 3.20/3.21): the square tag button reveals the union of
 * the rows' `tags` as filter buttons; selecting tags narrows the rows. It
 * composes with the search box and NEVER touches `checkedIds`, so filtering
 * or searching can't silently drop a checked zone/POI (UX-15 / E38).
 *
 * Still non-modal (no scrim — the map stays interactive so checked polygons
 * and pins appear live), with an inner-scroll checkbox table, Escape
 * dismissal, focus moved in on open and returned on close, and a
 * keyboard-reachable close control (Figma paints no ✕, so it is `sr-only`
 * until focused rather than absent).
 */

/** Re-exported so light-barrel consumers can type drawer data without the map entry. */
export type { LivePoiDatum, LiveZoneDatum }

/** Figma drawer width (px) — re-exported so a host can reserve the same strip. */
export { MAP_TOOL_DRAWER_WIDTH }

interface DrawerFilterState {
  query: string
  tags: string[]
}

interface MapToolDrawerProps {
  /** Accessible name only — Figma paints no title row. */
  title: string
  searchPlaceholder: string
  /** Every tag present in the drawer's data — the tag-filter button set. */
  tags: string[]
  open: boolean
  onClose: () => void
  children: (state: DrawerFilterState) => ReactNode
}

function MapToolDrawer({ title, searchPlaceholder, tags, open, onClose, children }: MapToolDrawerProps) {
  const [query, setQuery] = useState('')
  const [tagsOpen, setTagsOpen] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement as HTMLElement | null
    // Focus the SEARCH INPUT, never the close control: the close control is
    // focus-revealed, so focusing it on open painted it over the search row in
    // every default screenshot (round-3 visual #2).
    panelRef.current?.querySelector<HTMLElement>('input')?.focus()
    return () => restoreRef.current?.focus?.()
  }, [open])

  // Escape dismisses wherever focus is — document-level, the same contract
  // MapPanel's popup uses (jsx-a11y: no key handlers on the dialog div).
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // Nested anchored surfaces close first (Escape ladder).
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-radix-popper-content-wrapper], [role="listbox"]')) return
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      data-slot="map-tool-drawer"
      className="absolute inset-y-0 z-20 flex max-w-full flex-col overflow-hidden border-s border-border bg-card shadow-lg"
      // Inline logical inset: negative/logical inset UTILITIES are not
      // reliably emitted by a consuming app's Tailwind build and silently
      // fall back to the physical edge.
      style={{ insetInlineEnd: 0, width: MAP_TOOL_DRAWER_WIDTH }}
    >
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-8 ps-8"
          />
        </div>
        <button
          type="button"
          aria-label={`Filter ${title} by tag`}
          aria-pressed={tagsOpen}
          aria-expanded={tagsOpen}
          onClick={() => setTagsOpen((v) => !v)}
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-md border border-border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
            tagsOpen || selectedTags.length > 0
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:bg-muted',
          )}
        >
          <Tag aria-hidden="true" className="size-4" />
        </button>
      </div>

      {tagsOpen ? (
        <div data-slot="map-tool-drawer-tags" className="flex flex-wrap gap-2 border-b border-border px-3 pb-3">
          {tags.length === 0 ? (
            <span className="text-caption text-muted-foreground">No tags</span>
          ) : (
            tags.map((tag) => {
              const on = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    // Filtering never touches `checkedIds` (UX-15).
                    setSelectedTags((prev) => (on ? prev.filter((t) => t !== tag) : [...prev, tag]))
                  }
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-caption outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                    on
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted',
                  )}
                >
                  {tag}
                </button>
              )
            })
          )}
        </div>
      ) : null}

      <div className="fams-scroll-region min-h-0 flex-1 overflow-y-auto">{children({ query, tags: selectedTags })}</div>

      {/*
       * The drawer's own exit. Figma paints no ✕ on these drawers, and three
       * rounds of trying to honour that produced two defects in a row: round 2
       * made the control ABSOLUTE at the top-start corner, where it covered
       * the search input (round-3 visual #2); round 4's `sr-only`-until-focus
       * fixed that but left mouse users with NO visible way out (round-4 F5) —
       * Escape and re-clicking the tool both work, but nothing on screen says
       * so, and an exit nobody can see is not an exit.
       *
       * So it is permanently visible now, inside the PERMANENTLY RESERVED 40px
       * strip at the drawer's bottom. The strip is always there and always
       * blank, so showing the button reflows nothing (the round-2 regression
       * that must not come back) and its focus ring occludes no row. Last in
       * DOM order, so the tab order matches the visual order. Escape still
       * closes from anywhere. Geometry inline, never a Tailwind variant: a
       * consuming app's build may not emit the arbitrary utilities this file
       * would otherwise need.
       */}
      <div data-slot="map-tool-drawer-exit" className="relative flex-none" style={{ height: 40 }}>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border bg-card px-3 text-body-sm text-foreground shadow-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          style={{ position: 'absolute', insetInlineStart: 8, top: 4, height: 32, zIndex: 30 }}
        >
          {`Close ${title}`}
        </button>
      </div>
    </div>
  )
}

/** The union of every tag present, in first-seen order (stable button set). */
function collectTags(items: Array<{ tags?: string[] }>): string[] {
  const seen: string[] = []
  for (const item of items) {
    for (const tag of item.tags ?? []) if (!seen.includes(tag)) seen.push(tag)
  }
  return seen
}

/** OR semantics: no selection = everything; otherwise any shared tag matches. */
function matchesTags(item: { tags?: string[] }, selected: string[]): boolean {
  if (selected.length === 0) return true
  return (item.tags ?? []).some((tag) => selected.includes(tag))
}

/* ── Row colour dot ────────────────────────────────────────────────────────
 * SPEC §2.8 / round-1 visual #45: the drawer's colour dots are the STATUS
 * TRIAD only — green / orange / red. Round 1 rendered a blue dot for a zone
 * whose data colour happens to be the brand blue. The dot therefore snaps a
 * zone's arbitrary colour onto the triad by hue, and falls back to a stable
 * per-id pick when the colour is absent or off-triad — so the dot stays a
 * consistent, tokenized channel rather than passing raw brand colour through.
 */
const DOT_TOKENS = ['var(--color-success)', 'var(--color-warning)', 'var(--color-destructive)'] as const

function hueOf(color: string): number | null {
  const match = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(color.trim())
  if (!match) return null
  const raw = match[1]
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  if (delta === 0) return null
  let hue: number
  if (max === r) hue = ((g - b) / delta) % 6
  else if (max === g) hue = (b - r) / delta + 2
  else hue = (r - g) / delta + 4
  hue *= 60
  return hue < 0 ? hue + 360 : hue
}

function fallbackDot(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return DOT_TOKENS[hash % DOT_TOKENS.length]
}

export function statusDotColor(id: string, color?: string): string {
  const hue = color ? hueOf(color) : null
  if (hue === null) return fallbackDot(id)
  if (hue >= 75 && hue < 180) return DOT_TOKENS[0] // greens
  if (hue >= 20 && hue < 75) return DOT_TOKENS[1] // ambers
  if (hue < 20 || hue >= 330) return DOT_TOKENS[2] // reds
  return fallbackDot(id)
}

/* ── POI row tile (SPEC §2.8 "colored square glyph" / round-3 visual #13) ──
 * 495:36403 leads every POI row with a TINTED ROUNDED-SQUARE TILE carrying a
 * pin / flag / place glyph — not the plain 8px colour dot round 2 shipped.
 * The tint is the row's own triad token at low alpha (`color-mix`, so no raw
 * hex and no second token per tone), and the glyph comes from the POI's
 * optional `kind`; absent it, a stable per-id pick reproduces the frame's
 * mixed glyph set without inventing data.
 */
const POI_GLYPHS = [MapPin, Flag, ImageIcon] as const

export function poiGlyphIndex(poi: LivePoiDatum): number {
  if (poi.kind === 'pin') return 0
  if (poi.kind === 'flag') return 1
  if (poi.kind === 'place') return 2
  let hash = 0
  for (let i = 0; i < poi.id.length; i++) hash = (hash * 31 + poi.id.charCodeAt(i)) >>> 0
  return hash % POI_GLYPHS.length
}

function PoiTile({ poi }: { poi: LivePoiDatum }) {
  // DS category chip (2026-09-01): a POI whose `category` resolves against
  // `POI_CATEGORIES` leads with its category glyph (matching the map's
  // `PoiMarker`) instead of the legacy tinted pin/flag/place square — same
  // 24px row-leading slot either way, so this stays a drop-in swap.
  if (poiCategoryArt(poi.category)) {
    return <PoiCategoryChip category={poi.category} size={24} />
  }
  const tone = statusDotColor(poi.id, poi.color)
  const Glyph = POI_GLYPHS[poiGlyphIndex(poi)]
  return (
    <span
      aria-hidden="true"
      data-slot="poi-tile"
      // Load-bearing geometry inline (arbitrary size classes are not
      // guaranteed to be emitted by a consuming app's Tailwind build).
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        color: tone,
        backgroundColor: `color-mix(in srgb, ${tone} 14%, transparent)`,
      }}
      className="grid shrink-0 place-items-center"
    >
      <Glyph className="size-3.5" aria-hidden="true" />
    </span>
  )
}

/** Header select-all checkbox (SPEC §2.8's `☐` column head / §3.20 "header
 *  checkbox = select all"). Indeterminate while a subset of the CURRENTLY
 *  LISTED rows is checked; checking selects exactly those rows, so a drawer
 *  search or tag filter narrows what select-all applies to without touching
 *  checks made outside the current query (UX-15: never silently drop checks). */
function SelectAllCell({
  label,
  ids,
  checkedIds,
  onCheckedIdsChange,
}: {
  label: string
  ids: string[]
  checkedIds: string[]
  onCheckedIdsChange: (ids: string[]) => void
}) {
  const listed = ids.filter((id) => checkedIds.includes(id))
  const all = ids.length > 0 && listed.length === ids.length
  const some = listed.length > 0 && !all
  return (
    <th scope="col" className="w-10 px-3">
      <Checkbox
        aria-label={label}
        checked={all ? true : some ? 'indeterminate' : false}
        onCheckedChange={(next) =>
          onCheckedIdsChange(
            next === true
              ? [...new Set([...checkedIds, ...ids])]
              : checkedIds.filter((id) => !ids.includes(id)),
          )
        }
      />
    </th>
  )
}

function HeaderCell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        'px-3 py-2 text-start text-caption font-semibold uppercase tracking-wide text-muted-foreground',
        className,
      )}
    >
      {children}
    </th>
  )
}

function CheckRow({
  checked,
  onCheckedChange,
  label,
  cells,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  cells: ReactNode
}) {
  return (
    // Fixed 48px rows (round-3 visual #14): 495:34206 / 495:36403 both run a
    // 25.6px pitch at 1024 = 48px at 1920, and round 2's 40px rows read a
    // row-and-a-fifth tight against them. Every cell below still truncates to
    // a single line (round-1 visual #45: POI names used to wrap to three).
    <tr
      // Round-4 UX finding N2 / UX-NOTES C18: the 16×16 checkbox is legal at a
      // 48px pitch but tiny, so the whole 48px ROW is the pointer target too —
      // the same treatment the All Filters rows and (now) the Columns popover
      // carry. Clicks that land on a real control are left to it.
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('button,input,a,[role="checkbox"]')) return
        onCheckedChange(!checked)
      }}
      className="h-12 cursor-pointer border-b border-border/60 hover:bg-muted/50"
    >
      <td className="w-10 px-3">
        <Checkbox checked={checked} onCheckedChange={(c) => onCheckedChange(c === true)} aria-label={label} />
      </td>
      {cells}
    </tr>
  )
}

export interface ZonesDrawerProps {
  open: boolean
  onClose: () => void
  zones: LiveZoneDatum[]
  /** Checked zone ids — checked zones draw their polygons on the map. */
  checkedIds: string[]
  onCheckedIdsChange: (ids: string[]) => void
}

export function ZonesDrawer({ open, onClose, zones, checkedIds, onCheckedIdsChange }: ZonesDrawerProps) {
  const toggle = (id: string, checked: boolean) =>
    onCheckedIdsChange(checked ? [...new Set([...checkedIds, id])] : checkedIds.filter((z) => z !== id))
  const tags = useMemo(() => collectTags(zones), [zones])
  return (
    <MapToolDrawer title="Zones" searchPlaceholder="Search Zones" tags={tags} open={open} onClose={onClose}>
      {({ query, tags: selectedTags }) => {
        const q = query.trim().toLowerCase()
        const rows = zones.filter(
          (z) =>
            matchesTags(z, selectedTags) &&
            (!q || (z.label ?? z.id).toLowerCase().includes(q) || (z.parent ?? '').toLowerCase().includes(q)),
        )
        return (
          <table className="w-full table-fixed" data-slot="zones-table">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                <SelectAllCell
                  label="Show all zones on map"
                  ids={rows.map((z) => z.id)}
                  checkedIds={checkedIds}
                  onCheckedIdsChange={onCheckedIdsChange}
                />
                <HeaderCell className="w-14">Color</HeaderCell>
                <HeaderCell>Name</HeaderCell>
                <HeaderCell>Parent</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {rows.map((zone) => (
                <CheckRow
                  key={zone.id}
                  checked={checkedIds.includes(zone.id)}
                  onCheckedChange={(c) => toggle(zone.id, c)}
                  label={`Show ${zone.label ?? zone.id} on map`}
                  cells={
                    <>
                      <td className="px-3">
                        <span
                          aria-hidden="true"
                          data-slot="zone-color-dot"
                          className="inline-block size-2 rounded-full"
                          style={{ backgroundColor: statusDotColor(zone.id, zone.color) }}
                        />
                      </td>
                      <td className="overflow-hidden px-3 text-body-sm font-medium text-foreground">
                        <span className="block truncate" title={zone.label ?? zone.id}>
                          {zone.label ?? zone.id}
                        </span>
                      </td>
                      <td className="overflow-hidden px-3 text-body-sm text-muted-foreground">
                        {/* 495:34206 puts a muted square zone glyph before the
                            parent name on EVERY row (round-3 visual #14). */}
                        <span className="flex items-center gap-1.5">
                          <Frame
                            aria-hidden="true"
                            data-slot="zone-parent-icon"
                            className="size-4 shrink-0 text-muted-foreground"
                          />
                          <span className="block truncate" title={zone.parent ?? '—'}>
                            {zone.parent ?? '—'}
                          </span>
                        </span>
                      </td>
                    </>
                  }
                />
              ))}
            </tbody>
          </table>
        )
      }}
    </MapToolDrawer>
  )
}

ZonesDrawer.displayName = 'ZonesDrawer'

export interface PoiDrawerProps {
  open: boolean
  onClose: () => void
  pois: LivePoiDatum[]
  /** Checked POI ids — checked POIs plot pins on the map. */
  checkedIds: string[]
  onCheckedIdsChange: (ids: string[]) => void
}

export function PoiDrawer({ open, onClose, pois, checkedIds, onCheckedIdsChange }: PoiDrawerProps) {
  const toggle = (id: string, checked: boolean) =>
    onCheckedIdsChange(checked ? [...new Set([...checkedIds, id])] : checkedIds.filter((p) => p !== id))
  const tags = useMemo(() => collectTags(pois), [pois])
  return (
    <MapToolDrawer title="POI" searchPlaceholder="Search POI" tags={tags} open={open} onClose={onClose}>
      {({ query, tags: selectedTags }) => {
        const q = query.trim().toLowerCase()
        const rows = pois.filter((p) => matchesTags(p, selectedTags) && (!q || p.name.toLowerCase().includes(q)))
        return (
          <table className="w-full table-fixed" data-slot="poi-table">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                <SelectAllCell
                  label="Show all points of interest on map"
                  ids={rows.map((p) => p.id)}
                  checkedIds={checkedIds}
                  onCheckedIdsChange={onCheckedIdsChange}
                />
                <HeaderCell>Name</HeaderCell>
                <HeaderCell className="w-32">Coordinates</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {rows.map((poi) => (
                <CheckRow
                  key={poi.id}
                  checked={checkedIds.includes(poi.id)}
                  onCheckedChange={(c) => toggle(poi.id, c)}
                  label={`Show ${poi.name} on map`}
                  cells={
                    <>
                      <td className="overflow-hidden px-3">
                        <span className="flex items-center gap-2 text-body-sm font-medium text-foreground">
                          <PoiTile poi={poi} />
                          {/* Single line, always (round-1 visual #45). */}
                          <span className="block truncate" title={poi.name}>
                            {poi.name}
                          </span>
                        </span>
                      </td>
                      <td className="overflow-hidden px-3 text-caption text-muted-foreground">
                        <span className="block truncate">
                          {poi.position[1].toFixed(4)}, {poi.position[0].toFixed(4)}
                        </span>
                      </td>
                    </>
                  }
                />
              ))}
            </tbody>
          </table>
        )
      }}
    </MapToolDrawer>
  )
}

PoiDrawer.displayName = 'PoiDrawer'
