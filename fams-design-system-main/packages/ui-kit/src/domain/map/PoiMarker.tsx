import { forwardRef, type HTMLAttributes, useState } from 'react'
import { cn } from '../../lib/cn'
import { POI_CATEGORY_ART, POI_MARKER_HEIGHT, POI_MARKER_WIDTH, type PoiCategoryArt } from './poi-marker-art'

/**
 * POI_CATEGORIES — the DS's category marker registry (Figma 555:69603 /
 * 555:69751): one teardrop marker per POI category, colored squircle head +
 * white glyph + dot foot, sourced from `assets/icons/poi/*.svg` and embedded
 * as data URIs in `poi-marker-art.ts` (same convention as VehicleIcon3D's
 * `weather-station-art.ts` — no bundler SVG loader is configured in
 * `tsup.config.ts`, so raster/vector marker art ships pre-encoded).
 *
 * Keyed by id for O(1) lookup from a POI record's `category` field. A
 * category not present here falls back to the generic `MapPin` glyph via
 * `poiCategoryArt()` returning `undefined` — callers decide the fallback
 * rather than this module throwing.
 */
export const POI_CATEGORIES: PoiCategoryArt[] = POI_CATEGORY_ART

const POI_CATEGORY_MAP: Record<string, PoiCategoryArt> = Object.fromEntries(
  POI_CATEGORY_ART.map((c) => [c.id, c]),
)

/** Looks up a category's marker art by id, or `undefined` if unknown. */
export function poiCategoryArt(category: string | undefined): PoiCategoryArt | undefined {
  return category ? POI_CATEGORY_MAP[category] : undefined
}

export interface PoiMarkerDatum {
  id: string
  name: string
  /** POI category id — see `POI_CATEGORIES` / `assets/icons/poi/*.svg`. */
  category?: string
  radiusMeters?: number
}

export interface PoiMarkerProps {
  poi: PoiMarkerDatum
  /** Marker art pixel width; height follows the 48:69 native aspect. @default 32 */
  size?: number
  onHoverChange?: (hovered: boolean) => void
  onClick?: () => void
}

/**
 * PoiMarker — category-glyphed POI map marker (DS category set, Figma
 * 555:69603/555:69751). Renders the category's colored teardrop SVG
 * (squircle head + white glyph + dot foot) at the map position, following
 * `PoiPin`'s hover/focus tooltip convention (name + radius, dark scrim,
 * `role="tooltip"`) so it drops into `v5-templates`' map pin layer as a
 * drop-in replacement for the generic `MapPin`-based `PoiPin`.
 *
 * Falls back to the plain `MapPin` glyph (via the `icons` package, imported
 * by the caller) is NOT done here — an unknown category renders nothing from
 * `poiCategoryArt`, so a caller should keep its own fallback for that case
 * (kept out of the DS to avoid a hard dependency loop between this file and
 * the generic icon set for a case that, once every POI seed carries a valid
 * category, should not occur).
 */
export function PoiMarker({ poi, size = 32, onHoverChange, onClick }: PoiMarkerProps) {
  const [hovered, setHovered] = useState(false)
  const art = poiCategoryArt(poi.category)
  const setHover = (next: boolean) => {
    setHovered(next)
    onHoverChange?.(next)
  }
  const height = Math.round(size * (POI_MARKER_HEIGHT / POI_MARKER_WIDTH))

  if (!art) return null

  return (
    <button
      type="button"
      data-slot="poi-marker"
      data-category={poi.category}
      aria-label={`Point of interest ${poi.name}${art ? `, ${art.label}` : ''}`}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="relative flex flex-col items-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {hovered ? (
        <span
          role="tooltip"
          className="absolute bottom-full mb-1 w-max max-w-56 rounded-xs bg-foreground/90 px-2 py-1 text-start text-caption text-background"
        >
          <span className="block truncate font-medium">{poi.name}</span>
          {poi.radiusMeters != null ? <span className="block opacity-80">Radius {poi.radiusMeters} meters</span> : null}
        </span>
      ) : null}
      <img
        src={art.src}
        alt=""
        aria-hidden="true"
        width={size}
        height={height}
        draggable={false}
        className="block drop-shadow-sm"
      />
    </button>
  )
}

PoiMarker.displayName = 'PoiMarker'

export interface PoiCategoryChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** POI category id — see `POI_CATEGORIES`. */
  category?: string
  /** Chip diameter in px. @default 28 */
  size?: number
}

/**
 * PoiCategoryChip — a small rounded chip showing a category marker's
 * circular glyph head (the squircle + white glyph, cropped from the full
 * teardrop art) — for list rows (e.g. the Live Monitoring POI drawer),
 * where the full pin-with-stem shape would be visual noise.
 *
 * Crops via a square, `overflow-hidden` circle: the source art's native
 * aspect (48x69) puts the squircle head entirely within its own top 48x48
 * square, so a `background-size: 100% auto` / `background-position: top`
 * square container reveals exactly that head with no stem/dot showing.
 * Falls back to a plain tinted circle (no art) for an unknown category.
 */
export const PoiCategoryChip = forwardRef<HTMLSpanElement, PoiCategoryChipProps>(
  ({ category, size = 28, className, style, ...props }, ref) => {
    const art = poiCategoryArt(category)
    return (
      <span
        ref={ref}
        data-slot="poi-category-chip"
        data-category={category}
        role="img"
        aria-label={art ? art.label : 'Point of interest'}
        className={cn('inline-block shrink-0 overflow-hidden rounded-full bg-muted', className)}
        style={{
          width: size,
          height: size,
          backgroundImage: art ? `url(${art.src})` : undefined,
          backgroundSize: '100% auto',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: art ? art.color : undefined,
          ...style,
        }}
        {...props}
      />
    )
  },
)

PoiCategoryChip.displayName = 'PoiCategoryChip'
