import { useState } from 'react'
import { MapPin, Truck, X } from '@fams/ui-kit/icons'
import { Slider } from '@fams/ui-kit'
import { cn } from '../lib/cn'
import type { MapSearchHighlight } from './search/search-types'

/**
 * SearchHighlightPin — the selected search-result marker
 * (map-features-video-analysis.md §1: "pink/magenta circular highlight …
 * plus a matching pin", the hover tooltip, and the hover-revealed "Assets
 * Nearby" panel with its 1-50 km radius slider).
 *
 * Distinct from a live vehicle marker (`VehicleMarker`) and from a checked
 * POI (`PoiPin`) on purpose — this is a transient "you searched for this"
 * treatment, tokenized to the accent/primary color rather than a hardcoded
 * pink, so it re-themes per tenant like everything else in this package.
 * Mirrors `PoiPin`'s hover-intent pattern (a `<button>`-rooted marker that
 * reports hover so the caller can react — here, reveal the nearby-assets
 * action instead of drawing a second radius circle).
 */
export interface SearchHighlightPinProps {
  highlight: MapSearchHighlight
  /** Assets currently inside `highlight.radiusKm` — the panel's live count. */
  assetsNearbyCount: number
  onRadiusChange: (radiusKm: number) => void
  onClear: () => void
  /**
   * Whether the "Assets Nearby" panel is showing. CONTROLLED by the map view
   * rather than held here: the live camera re-renders (and can remount) every
   * DOM pin as positions tick, and local hover state would blink the panel
   * shut mid-gesture. The parent's state outlives any single pin instance.
   */
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchHighlightPin({ highlight, assetsNearbyCount, onRadiusChange, onClear, open, onOpenChange }: SearchHighlightPinProps) {
  const [dragging, setDragging] = useState(false)
  /*
   * HOVER OPENS THE PANEL DIRECTLY (spec §1: "hovering the pin reveals an
   * 'Assets Nearby' panel with a 1-50 km slider"). The reference clip routed
   * it through a second click on a small car button inside the tooltip; that
   * extra hop is dropped because it hides the feature behind a ~20px target
   * that only exists while the tooltip is up. Keyboard reaches the same panel
   * by focusing the pin — `focus`/`blur` drive the same state as hover, so
   * the slider is never pointer-only.
   */
  return (
    <div
      data-slot="search-highlight-pin"
      className="relative flex flex-col items-center"
      onMouseEnter={() => onOpenChange(true)}
      /*
       * DELIBERATELY NO pointer-leave close. Two reasons, both load-bearing:
       * the panel holds a slider the pointer must travel to (closing on exit
       * would make it unreachable), and maplibre re-creates this pin's DOM
       * node on every camera/fleet tick — the discarded node fires a leave
       * the pointer never caused, which blinked the panel shut mid-drag.
       * It closes on the × (which also clears the highlight), on a keyboard
       * blur out of the pin, and whenever the search plants a new result.
       */
      onFocus={() => onOpenChange(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onOpenChange(false)
      }}
    >
      {open ? (
        <div
          data-slot="assets-nearby-panel"
          className="absolute bottom-full mb-2 w-56 rounded-lg bg-card p-3 text-start shadow-[6px_10px_12px_0_rgba(0,0,0,0.05)]"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <span className="flex min-w-0 flex-col">
              <span className="text-body-sm font-semibold text-foreground">Assets Nearby</span>
              <span className="truncate text-caption text-muted-foreground">{highlight.title}</span>
            </span>
            <button
              type="button"
              aria-label="Clear search result"
              onClick={onClear}
              className="grid size-5 shrink-0 place-items-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
          <label className="mb-1 flex items-center gap-1.5 text-caption text-muted-foreground">
            <Truck aria-hidden="true" className="size-3.5" />
            Within {highlight.radiusKm} km
          </label>
          <Slider
            aria-label="Assets nearby radius, kilometers"
            min={1}
            max={50}
            step={1}
            value={highlight.radiusKm}
            onValueChange={(value) => onRadiusChange(value as number)}
            onPointerDown={() => setDragging(true)}
            onPointerUp={() => setDragging(false)}
          />
          {/* Live count — polite, so a screen-reader user hears the number
              settle instead of every intermediate value of a drag. */}
          <p
            role="status"
            aria-live="polite"
            className={cn('mt-2 text-caption', dragging ? 'text-success' : 'text-muted-foreground')}
          >
            {assetsNearbyCount} asset{assetsNearbyCount === 1 ? '' : 's'} within {highlight.radiusKm} km
          </p>
        </div>
      ) : null}

      <button
        type="button"
        aria-label={`Search result: ${highlight.title}. Show assets nearby`}
        aria-expanded={open}
        className="relative outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* The glyph paints itself with `currentColor`, so the accent comes
            from `text-primary` — a tenant re-theme moves this pin with it. */}
        <MapPin aria-hidden="true" className="size-8 text-primary drop-shadow-sm" />
      </button>
    </div>
  )
}

SearchHighlightPin.displayName = 'SearchHighlightPin'
