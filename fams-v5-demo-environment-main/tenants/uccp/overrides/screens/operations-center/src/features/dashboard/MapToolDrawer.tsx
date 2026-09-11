import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Search, Tag } from 'lucide-react'
import { Checkbox, cn } from '@fams/design-system'

/* ── Map tool right drawer, extracted VERBATIM from the design system ───────
 * Source: fams-design-system/packages/v5-templates/src/views/live/
 * ZonesDrawer.tsx (`MapToolDrawer` / `SelectAllCell` / `HeaderCell` /
 * `CheckRow` / `statusDotColor` / `collectTags` / `matchesTags`) and
 * IncidentsDrawer.tsx (which reuses the SAME shell for a card list), plus
 * `map/constants.ts`'s `MAP_TOOL_DRAWER_WIDTH`.
 *
 * PROVENANCE (2026-09-01, cockpit LM-parity fix): the Live GIS Map's map
 * tools previously opened FLOATING rounded cards pinned under the tool
 * stack (`right-4 top-[276px] w-64` for POI, `right-4 top-[356px] w-72` for
 * Zones) — the exact anatomy Live Monitoring's own round-1 shipped and its
 * round-1 visual #21 / UX findings 3+12 rejected: the card left a strip of
 * live map showing beyond it and sat on top of the very tool that opened it.
 * The cockpit now carries LM's shipped geometry instead: a right-docked,
 * FULL-HEIGHT 347px panel flush to the map pane's inline-end edge, no title
 * header (it opens straight into the search input + square tag button), a
 * non-modal inner-scroll table, Escape dismissal, focus moved in on open and
 * returned on close, and the permanently-reserved 40px bottom exit strip.
 * The map tool stack steps inboard by exactly `MAP_TOOL_DRAWER_WIDTH` while
 * one is open (LM's `LiveMapTools` `endInset`), so the tool that opened the
 * drawer stays visible AND clickable and Zones↔POI↔Incidents can be switched
 * directly.
 *
 * The cockpit is an isolated React-18 app with no `@fams/ui-kit` dependency,
 * so the shell is copied in rather than imported; only the icon source
 * (lucide-react instead of `@fams/ui-kit/icons`) and the `Input` primitive
 * (a bare `input` painted with the same classes) differ.
 */

/** ZonesDrawer.tsx `MAP_TOOL_DRAWER_WIDTH` — the Figma drawer width (px). */
export const MAP_TOOL_DRAWER_WIDTH = 347

export interface DrawerFilterState {
  query: string
  tags: string[]
}

export interface MapToolDrawerProps {
  /** Accessible name only — Figma paints no title row. */
  title: string
  searchPlaceholder: string
  /** Every tag present in the drawer's data — the tag-filter button set. */
  tags: string[]
  open: boolean
  onClose: () => void
  children: (state: DrawerFilterState) => ReactNode
}

export function MapToolDrawer({ title, searchPlaceholder, tags, open, onClose, children }: MapToolDrawerProps) {
  const [query, setQuery] = useState('')
  const [tagsOpen, setTagsOpen] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement as HTMLElement | null
    // Focus the SEARCH INPUT, never the close control (round-3 visual #2).
    panelRef.current?.querySelector<HTMLElement>('input')?.focus()
    return () => restoreRef.current?.focus?.()
  }, [open])

  // Escape dismisses wherever focus is — document-level, same contract as LM.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
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
      onClick={(e) => e.stopPropagation()}
      // z-[900] rather than LM's `z-20`: Leaflet's own panes/controls run at
      // z-index 400-1000 inside this container, so the cockpit's map overlays
      // all sit at 900 (see the tool stack / zoom cluster in LiveGisMap.tsx).
      className="absolute inset-y-0 z-[900] flex max-w-full flex-col overflow-hidden border-s border-border bg-card shadow-lg"
      // Inline logical inset (LM comment): logical inset UTILITIES are not
      // reliably emitted by a consuming app's Tailwind build.
      style={{ insetInlineEnd: 0, width: MAP_TOOL_DRAWER_WIDTH }}
    >
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-8 w-full rounded-md border border-border bg-background ps-8 pe-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
            <span className="text-[11px] text-muted-foreground">No tags</span>
          ) : (
            tags.map((tag) => {
              const on = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    // Filtering never touches the checked set (UX-15).
                    setSelectedTags((prev) => (on ? prev.filter((t) => t !== tag) : [...prev, tag]))
                  }
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
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

      <div className="min-h-0 flex-1 overflow-y-auto">{children({ query, tags: selectedTags })}</div>

      {/* The drawer's own exit, inside the PERMANENTLY RESERVED 40px strip —
          always there and always blank, so showing the button reflows nothing
          and its focus ring occludes no row (LM round-4 F5). */}
      <div data-slot="map-tool-drawer-exit" className="relative flex-none" style={{ height: 40 }}>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border bg-card px-3 text-sm text-foreground shadow-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          style={{ position: 'absolute', insetInlineStart: 8, top: 4, height: 32, zIndex: 30 }}
        >
          {`Close ${title}`}
        </button>
      </div>
    </div>
  )
}

/** The union of every tag present, in first-seen order (stable button set). */
export function collectTags(items: Array<{ tags?: string[] }>): string[] {
  const seen: string[] = []
  for (const item of items) {
    for (const tag of item.tags ?? []) if (!seen.includes(tag)) seen.push(tag)
  }
  return seen
}

/** OR semantics: no selection = everything; otherwise any shared tag matches. */
export function matchesTags(item: { tags?: string[] }, selected: string[]): boolean {
  if (selected.length === 0) return true
  return (item.tags ?? []).some((tag) => selected.includes(tag))
}

/* ── Row colour dot (ZonesDrawer.tsx `statusDotColor`, verbatim) ───────────
 * The drawer's colour dots are the STATUS TRIAD only — green / orange / red:
 * a zone's arbitrary colour is snapped onto the triad by hue, with a stable
 * per-id fallback when the colour is absent or off-triad.
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

/** Header select-all checkbox — indeterminate while a subset of the CURRENTLY
 *  LISTED rows is checked, so a drawer search or tag filter narrows what
 *  select-all applies to without touching checks made outside the query. */
export function SelectAllCell({
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

export function HeaderCell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        'px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
        className,
      )}
    >
      {children}
    </th>
  )
}

/** Fixed 48px rows (round-3 visual #14) — every cell truncates to one line.
 *  The whole row is the pointer target too (round-4 UX finding N2); clicks
 *  that land on a real control are left to it. */
export function CheckRow({
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
    <tr
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
