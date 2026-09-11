import { useEffect, useId, useRef, useState } from 'react'
import { Flag, LayoutGrid, Loader2, MapPin, Search, Truck, X } from '@fams/ui-kit/icons'
import { ZonesIcon } from '@fams/ui-kit'
import { cn } from '../../lib/cn'
import type { MapSearchProvider, MapSearchResult, MapSearchResultKind } from '../search/search-types'

/**
 * MapSearchPanel — the Live Monitoring "search anything" control
 * (map-features-video-analysis.md §1, "Search on Map").
 *
 * Collapsed magnifier button (rendered by the caller — `LiveMapTools` owns
 * the tool-stack tile and expand/collapse chrome) expands into this
 * full-width input + flat, heterogeneous result dropdown: places
 * (title + address subtitle), saved zones (title + "Parked Zone"-style chip
 * + "+N more" overflow), assets/vehicles (plate/name), and app shortcuts
 * (title + capability chips + overflow) — one list, one row-template switch
 * on `result.kind`.
 *
 * PLUGGABLE PROVIDERS (spec: "make the result providers pluggable"):
 * `providers` is `Array<{ id, search(query) => Promise<MapSearchResult[]> }>`.
 * Every keystroke (debounced) awaits `Promise.all` across every provider and
 * flattens the results in provider order — `createDefaultSearchProviders`
 * (`../search/search-providers.ts`) builds the default set from data the live
 * view already has (records-with-coordinates, blueprint places/zones); any
 * caller may pass its own array instead (a real geocoder, a fleet search
 * API), because this component only ever awaits the `search` contract.
 *
 * Debounce + loading spinner (spec: "Loading…" appears between keystroke and
 * results, ~1-3s network-bound gaps observed). Keyboard: ↓/↑ move the active
 * row, Enter selects it, Escape clears the query (a second Escape, or the
 * `×` button, closes — `onOpenChange(false)`).
 */

const OVERFLOW_CHIP_LIMIT = 2

/** Per-`kind` fallback glyph when a result carries no `icon` override. */
const KIND_ICON: Record<MapSearchResultKind, React.ComponentType<{ 'aria-hidden'?: boolean; className?: string }>> = {
  place: MapPin,
  zone: ZonesIcon,
  asset: Truck,
  poi: Flag,
  shortcut: LayoutGrid,
}

function ResultChips({ chips, swatchColor }: { chips: string[]; swatchColor?: string }) {
  const visible = chips.slice(0, OVERFLOW_CHIP_LIMIT)
  const overflow = chips.length - visible.length
  return (
    <span className="flex flex-wrap items-center gap-1">
      {/* Zone-colour dot — the clip's unlabeled swatch that opens a zone row's
          chip run. Decorative: the colour repeats information the row's title
          and type pill already carry, so it is hidden from assistive tech
          rather than announced as an unnamed chip. */}
      {swatchColor ? (
        <span
          aria-hidden="true"
          data-slot="map-search-chip-swatch"
          className="size-2.5 shrink-0 rounded-full border border-border"
          style={{ backgroundColor: swatchColor }}
        />
      ) : null}
      {visible.map((chip) => (
        <span
          key={chip}
          className="rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground"
        >
          {chip}
        </span>
      ))}
      {overflow > 0 ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground">
          +{overflow} more
        </span>
      ) : null}
    </span>
  )
}

export interface MapSearchPanelProps {
  /** Pluggable result sources — see the file doc comment. */
  providers?: MapSearchProvider[]
  /** Debounce window (ms) between the last keystroke and firing every provider's `search`. @default 250 */
  debounceMs?: number
  /** A result was picked (Enter or click) — the caller flies the camera there and drops the highlight. Does NOT close the panel itself; the caller decides via `onOpenChange`. */
  onResultSelect?: (result: MapSearchResult) => void
  /**
   * The panel was explicitly cleared/closed by the user — Escape with an
   * empty query, or the `×` button (spec: "Escape/clear/close collapses and
   * removes the highlight"). NOT fired when a result selection closes the
   * panel — that path calls `onResultSelect` instead, which is what should
   * (re)plant the highlight.
   */
  onClear?: () => void
  placeholder?: string
  /** Accessible name for the field. Defaults to `placeholder`, so the label and the visible prompt never drift apart. */
  label?: string
  /**
   * Empty-state copy, all overridable because this component is shared and
   * must not hardcode deployment wording:
   * - `emptyTitle` / `hint` — nothing typed yet (what IS searchable here).
   * - `emptyHint` — a query returned nothing (what to try instead).
   */
  emptyTitle?: string
  hint?: string
  emptyHint?: string
  /** Controlled: the panel renders its input+dropdown only while `open`. */
  open: boolean
  onOpenChange: (open: boolean) => void
  className?: string
}

/** One flat, ordered result list — providers run in parallel, results flatten in provider order (stable, not re-sorted by relevance: the clip shows geographic + shortcut rows interleaved with no visible re-ranking). */
async function runProviders(providers: MapSearchProvider[], query: string): Promise<MapSearchResult[]> {
  const settled = await Promise.all(
    providers.map((provider) =>
      provider.search(query).catch(() => [] as MapSearchResult[]),
    ),
  )
  return settled.flat()
}

export function MapSearchPanel({
  providers = [],
  debounceMs = 250,
  onResultSelect,
  onClear,
  placeholder = 'Search anything location, pin, zone etc.',
  label,
  emptyTitle = 'Search the map',
  hint = 'Find a place, a saved zone or a point of interest.',
  emptyHint = 'Check the spelling, or try a district, zone or landmark name.',
  open,
  onOpenChange,
  className,
}: MapSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MapSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)
  const idBase = useId()
  const listId = `${idBase}-results`
  const optionId = (id: string) => `${idBase}-option-${id}`

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!providers.length) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const requestId = ++requestIdRef.current
    debounceRef.current = setTimeout(() => {
      runProviders(providers, query)
        .then((next) => {
          if (requestIdRef.current !== requestId) return // stale response — a later keystroke already superseded it
          setResults(next)
          setActiveIndex(0)
          setLoading(false)
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return
          setResults([])
          setLoading(false)
        })
    }, debounceMs)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `providers` identity churn is expected per render; re-running on every keystroke is the intended debounce trigger
  }, [query, open, debounceMs])

  const close = () => {
    onOpenChange(false)
    onClear?.()
  }

  const clearOrClose = () => {
    if (query) {
      setQuery('')
      setResults([])
    } else {
      close()
    }
  }

  const select = (result: MapSearchResult) => {
    if (result.onActivate) result.onActivate()
    onResultSelect?.(result)
  }

  const activeResult = results[activeIndex]

  if (!open) return null

  return (
    <div
      data-slot="map-search-panel"
      className={cn(
        // ~320px — the spec's 300-330px expanded pill, matching the list
        // panel's column so the two read as one rail over the map.
        'w-80 max-w-[70vw] overflow-hidden rounded-lg bg-card shadow-[6px_10px_12px_0_rgba(0,0,0,0.05)]',
        className,
      )}
    >
      <div className="relative flex items-center">
        {/* Magnifier stays inline-left for the field's whole life (spec: the
            trigger glyph slides into the pill). The in-flight spinner lives in
            the RESULTS area, not here, so the field never changes shape mid-
            keystroke. */}
        <span aria-hidden="true" className="pointer-events-none absolute start-3 grid size-4 place-items-center text-muted-foreground">
          <Search className="size-4" />
        </span>
        <input
          ref={inputRef}
          role="combobox"
          type="text"
          value={query}
          aria-label={label ?? placeholder}
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeResult ? optionId(activeResult.id) : undefined}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0))
            } else if (event.key === 'Enter') {
              event.preventDefault()
              if (activeResult) select(activeResult)
            } else if (event.key === 'Escape') {
              event.preventDefault()
              clearOrClose()
            }
          }}
          placeholder={placeholder}
          className="h-11 w-full bg-transparent ps-9 pe-10 text-body-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        />
        <button
          type="button"
          aria-label={query ? 'Clear search' : 'Close search'}
          onClick={clearOrClose}
          className={cn(
            'absolute end-2 grid size-7 place-items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
            // Red only once there IS something to clear (the clip's red ×);
            // the empty-field state is a quiet close affordance, not an alarm.
            query ? 'text-destructive hover:text-destructive/80' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </div>
      {/*
       * A plain `<div>` list, not `<ul>`/`<li>`: this row set switches
       * between an ARIA listbox (populated) and a single informational
       * status row (loading/empty), and native list markup's "must contain
       * only <li>" rule and the listbox role's "children must be
       * role=option" rule can't both be satisfied by the SAME element in
       * both states — axe's `list`/`aria-required-children`/
       * `aria-required-parent` rules all fired on one combination or
       * another of `<ul>`/`<li>` here. A generic `<div>` carries no native
       * list semantics to conflict with the ARIA ones, so `role="listbox"`
       * only applies while there ARE options, exactly as it should.
       */}
      <div
        id={listId}
        role={results.length > 0 ? 'listbox' : undefined}
        aria-label="Search results"
        /*
         * QA A8 — the list is capped and scrolls INSIDE the panel, and the
         * scrollbar is painted rather than left to the platform's overlay
         * one. Row heights vary (a chip row is taller than a plain place), so
         * the cap can never land on a row boundary: the last visible row is
         * always partly clipped, and with an overlay scrollbar — invisible at
         * rest on macOS — that clipped row read as a rendering fault instead
         * of "there is more below". A resting scrollbar is the affordance
         * that makes the clip legible. `overscroll-contain` stops a flick at
         * the end of the list from scrolling the page behind it.
         */
        className={cn(
          'max-h-72 divide-y divide-border overflow-y-auto overscroll-contain border-t border-border',
          '[scrollbar-width:thin]',
          '[&::-webkit-scrollbar]:w-1.5',
          '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300',
          '[&::-webkit-scrollbar-track]:bg-transparent',
        )}
        data-slot="map-search-results"
      >
        {loading && results.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-3 py-6 text-caption text-muted-foreground" role="status" aria-live="polite">
            <Loader2 aria-hidden="true" className="size-4 animate-spin text-primary" />
            Loading…
          </div>
        ) : results.length === 0 ? (
          /*
           * Never a bare "0 results" dead end (UX guideline "Search / No
           * Results"): the untouched field explains what IS searchable, and a
           * miss names the query back and suggests the next move. Announced
           * politely so a screen-reader user learns the list emptied without
           * the focus leaving the input.
           */
          <div className="px-4 py-6 text-center" role="status" aria-live="polite">
            <p className="text-body-sm font-medium text-foreground">
              {query.trim() ? `No matches for “${query.trim()}”` : emptyTitle}
            </p>
            <p className="mt-1 text-caption text-muted-foreground">
              {query.trim() ? emptyHint : hint}
            </p>
          </div>
        ) : (
          results.map((result, index) => {
            const Icon = KIND_ICON[result.kind]
            return (
              <button
                key={result.id}
                type="button"
                id={optionId(result.id)}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(result)}
                className={cn(
                  // Flat, full-bleed grey band — no radius, no elevation
                  // change (the clip's hover treatment), shared by pointer
                  // hover and the keyboard-active row so both read alike.
                  'flex w-full items-start gap-3 px-4 py-3 text-start outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  index === activeIndex ? 'bg-muted' : 'hover:bg-muted',
                )}
              >
                <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center text-muted-foreground">
                  {result.icon ?? <Icon className="size-5" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-body-sm font-medium text-foreground">{result.title}</span>
                  {result.subtitle ? (
                    <span className="truncate text-caption text-muted-foreground">{result.subtitle}</span>
                  ) : null}
                  {result.chips?.length ? <ResultChips chips={result.chips} swatchColor={result.swatchColor} /> : null}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

MapSearchPanel.displayName = 'MapSearchPanel'
