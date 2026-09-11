import { useCallback, useId, useRef, useState } from 'react'
import { Badge, Icon } from '@fams/ui-kit'
import { cn } from '../lib/cn'
import type { LngLat } from '../map/MapPanel.types'

/**
 * MapSearchOverlay — the floating location search that sits in the map's
 * top-end corner inside `OnwaniLocationPicker` (Figma V2 node 940:2907).
 * [tier-2, internal to the creation-sheet widgets — not barrel-exported]
 *
 * Collapsed: a compact translucent search bar. Focused: a white panel opens
 * beneath it listing "Previous Searches" (pin-glyph rows) and "Map
 * Suggestions" (status chips). Picking a row, or pressing Enter on a typed
 * query, resolves to a `[lng, lat]` and reports it via `onPick` — the DEMO
 * resolution is a deterministic offset around `center` (no geocoder in the
 * demo, same convention as `deriveOnwaniPoint`); an entry may instead carry
 * its own real `point`.
 *
 * State-agnostic (rule 8): entries and suggestions come in via props (the
 * defaults mirror the Figma content), nothing is fetched or persisted here.
 */

export interface MapSearchEntry {
  label: string
  sublabel?: string
  /** Icon registry glyph for the row. Default `marker-pin-02`. */
  icon?: string
  /** Real `[lng, lat]` to pin when picked; omitted → demo-derived from `label`. */
  point?: LngLat
}

export interface MapSearchSuggestion {
  label: string
  tone: 'destructive' | 'warning' | 'info'
}

export interface MapSearchOverlayProps {
  /** Current map centre — the anchor for demo-derived points. */
  center: LngLat
  onPick: (point: LngLat, label: string) => void
  disabled?: boolean
  entries?: MapSearchEntry[]
  suggestions?: MapSearchSuggestion[]
  /** Heading above the entry rows. Default `'Previous Searches'` (the Figma default). */
  entriesLabel?: string
  /** Render in normal flow (the caller positions it — e.g. inside a map
   *  toolbar row) instead of the default absolute top-start corner. */
  inline?: boolean
  className?: string
}

const DEFAULT_ENTRIES: MapSearchEntry[] = [
  { label: 'Cluster X - Jumeriah Lake towers', sublabel: 'Dubai - UAE', icon: 'marker-pin-02' },
  { label: 'FAMS Headquarter', sublabel: 'POI', icon: 'marker-pin-05' },
]

const DEFAULT_SUGGESTIONS: MapSearchSuggestion[] = [
  { label: 'No-go zone', tone: 'destructive' },
  { label: 'Clustered Area', tone: 'warning' },
  { label: 'VIP', tone: 'info' },
]

/** Deterministic demo point for a free-text query — stable per string, near `center`. */
function derivePoint(center: LngLat, text: string): LngLat {
  let hash = 0
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0
  const [lng, lat] = center
  return [lng + ((Math.abs(hash) % 41) - 20) * 0.001, lat + ((Math.abs(hash >> 8) % 41) - 20) * 0.001]
}

export function MapSearchOverlay({
  center,
  onPick,
  disabled,
  entries = DEFAULT_ENTRIES,
  suggestions = DEFAULT_SUGGESTIONS,
  entriesLabel = 'Previous Searches',
  inline = false,
  className,
}: MapSearchOverlayProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const pick = useCallback(
    (label: string, point?: LngLat) => {
      onPick(point ?? derivePoint(center, label), label)
      setQuery('')
      setOpen(false)
    },
    [center, onPick],
  )

  // Close when focus leaves the overlay entirely (input AND panel rows).
  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false)
  }, [])

  const visibleEntries = query
    ? entries.filter((s) => s.label.toLowerCase().includes(query.toLowerCase()))
    : entries

  return (
    <div
      ref={rootRef}
      data-slot="map-search-overlay"
      className={cn(inline ? 'relative' : 'absolute start-3 top-3 z-10 w-72 max-w-[calc(100%-1.5rem)]', className)}
      onBlur={handleBlur}
    >
      {/* IWMP/IIMS Figma 4077-25060: 46px white bar, 6px radius, soft map shadow,
          20px search glyph, 13px tracked placeholder, clear (trash) at the end. */}
      <div
        className={cn(
          'flex h-[2.875rem] items-center gap-2.5 bg-card px-2.5 shadow-map',
          open ? 'rounded-t-[0.375rem] border-b border-border' : 'rounded-[0.375rem]',
        )}
      >
        <Icon name="search-refraction" size={20} className="shrink-0 text-muted-foreground" />
        <input
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label="Search location"
          placeholder="Search Location"
          disabled={disabled}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              e.preventDefault()
              pick(query.trim())
            }
            if (e.key === 'Escape') setOpen(false)
          }}
          className="w-full min-w-0 border-0 bg-transparent text-body-sm text-foreground outline-none placeholder:text-[0.8125rem] placeholder:tracking-[0.08em] placeholder:text-muted-foreground/60"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            disabled={disabled}
            onClick={() => {
              setQuery('')
              setOpen(false)
            }}
            className="grid size-6 shrink-0 place-items-center rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon name="trash-01" size={16} />
          </button>
        ) : (
          <Icon name="trash-01" size={16} className="shrink-0 text-muted-foreground/50" aria-hidden />
        )}
      </div>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Location search results"
          className="absolute inset-x-0 top-full z-20 flex max-h-72 flex-col gap-3 overflow-y-auto rounded-b-[0.375rem] bg-card p-3 shadow-elevation"
        >
          <span className="text-caption font-semibold text-gray-400">{entriesLabel}</span>
          {visibleEntries.length ? (
            visibleEntries.map((entry) => (
              <button
                key={entry.label + (entry.sublabel ?? '')}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => pick(entry.label, entry.point)}
                className="flex items-center gap-2 rounded-sm p-1 text-start outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon name={entry.icon ?? 'marker-pin-02'} size={16} className="shrink-0 text-muted-foreground" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-body-sm font-semibold text-foreground">{entry.label}</span>
                  {entry.sublabel ? (
                    <span className="truncate text-caption font-semibold text-muted-foreground/60">
                      {entry.sublabel}
                    </span>
                  ) : null}
                </span>
              </button>
            ))
          ) : (
            <span className="text-body-sm text-muted-foreground">
              No matches — press Enter to pin “{query.trim()}”
            </span>
          )}

          <span className="mt-1 text-caption font-semibold text-gray-400">Map Suggestions</span>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => pick(s.label)}
                className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Badge variant={s.tone} size="md">
                  {s.label}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

MapSearchOverlay.displayName = 'MapSearchOverlay'
