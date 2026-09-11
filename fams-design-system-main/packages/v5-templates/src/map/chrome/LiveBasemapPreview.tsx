import { cn } from '../../lib/cn'
import { LIVE_BASEMAP_THUMBNAILS } from './basemap-thumbnails'

/**
 * LiveBasemapPreview — the layers switcher's mini basemap thumbnail.
 *
 * ui-kit's generic `MapBasemapPreview` paints one product-neutral swatch,
 * correct for a design system that must not know any product's basemap. This
 * is the caller-supplied preview for Live Monitoring, and — unlike the
 * pre-2026-08-30 version, which was ONE swatch under six CSS filters — it
 * paints a genuinely different miniature map per `variant`. The designer's
 * reference shows six *recognisable* previews; six saturation variants of the
 * same pale swatch read as five near-identical cards plus one that washes out
 * to blank white (`grayscale contrast-150` on a near-white palette), which is
 * the "empty right-most slot" bug the reference review flagged.
 *
 * Every variant draws the same landmark geometry — a water body, a green
 * park, a block grid, a trunk road and a cross street — so the six cards are
 * comparable at 44px; only the PALETTE changes, which is exactly what
 * distinguishes real basemaps from each other.
 *
 * Geometry is inline (percentages + rotations), never arbitrary Tailwind
 * values, for the reason `MapBasemapPreview` documents: a package-authored
 * `w-[150%]` is not guaranteed to be emitted by the consuming app's build.
 * The colours are literal because they ARE the basemap rasters being
 * previewed — imagery, not themable UI (the same carve-out `VehicleIcon3D`'s
 * embedded art documents). The default `roadmap` variant still reads the
 * `--fams-map-*` custom properties `mutedBasemapPalette()` sets, so a tenant
 * that re-tints its real basemap re-tints its thumbnail with it.
 */
export type LiveBasemapPreviewVariant = 'grayscale' | 'osm' | 'roadmap' | 'satellite' | 'terrain' | 'hybrid'

interface Palette {
  land: string
  water: string
  park: string
  block: string
  road: string
  street: string
}

/* token-exempt: basemap raster imagery being previewed, not themable UI —
   see the component docblock. */
const PALETTES: Record<LiveBasemapPreviewVariant, Palette> = {
  grayscale: {
    land: 'rgb(242,242,242)',
    water: 'rgb(213,213,213)',
    park: 'rgb(228,228,228)',
    block: 'rgb(220,220,220)',
    road: 'rgb(255,255,255)',
    street: 'rgb(190,190,190)',
  },
  osm: {
    land: 'rgb(242,239,233)',
    water: 'rgb(170,211,223)',
    park: 'rgb(200,230,160)',
    block: 'rgb(224,220,211)',
    road: 'rgb(255,255,255)',
    street: 'rgb(247,206,123)',
  },
  roadmap: {
    land: 'var(--fams-map-land, rgb(249,245,237))',
    water: 'var(--fams-map-water, rgb(174,224,244))',
    park: 'rgb(215,239,196)',
    block: 'rgb(236,231,220)',
    road: 'var(--fams-map-road, rgb(255,255,255))',
    street: 'rgb(227,217,198)',
  },
  satellite: {
    land: 'rgb(74,68,51)',
    water: 'rgb(18,49,76)',
    park: 'rgb(57,96,44)',
    block: 'rgb(93,86,69)',
    road: 'rgb(142,135,118)',
    street: 'rgb(110,103,84)',
  },
  terrain: {
    land: 'rgb(239,231,216)',
    water: 'rgb(168,203,222)',
    park: 'rgb(183,206,154)',
    block: 'rgb(222,210,186)',
    road: 'rgb(255,255,255)',
    street: 'rgb(199,179,148)',
  },
  hybrid: {
    land: 'rgb(60,58,49)',
    water: 'rgb(18,48,73)',
    park: 'rgb(51,86,42)',
    block: 'rgb(78,75,62)',
    road: 'rgb(242,233,200)',
    street: 'rgb(154,147,132)',
  },
}

export function LiveBasemapPreview({
  variant = 'roadmap',
  className,
}: {
  variant?: LiveBasemapPreviewVariant
  className?: string
}) {
  /*
   * QA A9 — a REAL capture of this style over Doha, when one exists
   * (`basemap-thumbnails.ts`). The hand-drawn vector miniature below stays as
   * the fallback for a variant with no capture, so the component still
   * renders something recognisable rather than an empty tile.
   *
   * `<img>` with an empty `alt` and `aria-hidden`: the tile's accessible name
   * comes from the switcher's own `<span class="sr-only">{style.label}</span>`
   * and its tooltip, so the thumbnail must contribute nothing to the name.
   */
  const thumbnail = LIVE_BASEMAP_THUMBNAILS[variant]
  if (thumbnail) {
    return (
      <img
        src={thumbnail}
        alt=""
        aria-hidden="true"
        draggable={false}
        decoding="async"
        data-slot="live-basemap-preview"
        data-variant={variant}
        className={cn('block size-full object-cover', className)}
      />
    )
  }
  const p = PALETTES[variant] ?? PALETTES.roadmap
  return (
    <span
      aria-hidden="true"
      data-slot="live-basemap-preview"
      data-variant={variant}
      className={cn('relative block size-full overflow-hidden', className)}
      style={{ backgroundColor: p.land }}
    >
      {/* Water — a bay across the top-start corner, the most recognisable
          feature of a basemap thumbnail at 44px. */}
      <span
        className="absolute"
        style={{
          backgroundColor: p.water,
          insetInlineStart: '-30%',
          top: '-34%',
          width: '160%',
          height: '48%',
          transform: 'rotate(20deg)',
        }}
      />
      {/* Park / green space. */}
      <span
        className="absolute"
        style={{
          backgroundColor: p.park,
          insetInlineStart: '58%',
          top: '52%',
          width: '34%',
          height: '30%',
          borderRadius: '30%',
        }}
      />
      {/* City blocks — two rectangles that read as built-up land. */}
      <span
        className="absolute"
        style={{ backgroundColor: p.block, insetInlineStart: '8%', top: '46%', width: '26%', height: '20%' }}
      />
      <span
        className="absolute"
        style={{ backgroundColor: p.block, insetInlineStart: '8%', top: '72%', width: '38%', height: '18%' }}
      />
      {/* Trunk road + cross street. */}
      <span
        className="absolute"
        style={{
          backgroundColor: p.road,
          insetInlineStart: '-10%',
          top: '40%',
          width: '130%',
          height: '9%',
          transform: 'rotate(-9deg)',
        }}
      />
      <span
        className="absolute"
        style={{
          backgroundColor: p.street,
          insetInlineStart: '46%',
          top: '18%',
          width: '7%',
          height: '90%',
          transform: 'rotate(11deg)',
        }}
      />
      <span
        className="absolute"
        style={{
          backgroundColor: p.street,
          insetInlineStart: '-5%',
          bottom: '10%',
          width: '80%',
          height: '5%',
          transform: 'rotate(15deg)',
        }}
      />
    </span>
  )
}

LiveBasemapPreview.displayName = 'LiveBasemapPreview'
