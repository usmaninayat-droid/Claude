import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { MOBILITY_STATUS_STYLES, type MobilityStatus, type MobilityStatusStyle } from './mobility-status'

/**
 * MapStatusMarker — the live-monitoring "asset on map" marker family (designer
 * reference: `Assets_on_Map Icons*.svg`, 14 files = 7 ring/color combinations
 * originally explored, since realigned to the product's canonical 6-status
 * mobility taxonomy — see `mobility-status.ts`): a circular ring with a
 * swappable center icon (vehicle / asset / workforce / bin — anything the
 * caller passes as `icon`), a small status badge coin at the top (glyph +
 * color communicate the status), and a stem + anchor dot below that the map
 * layer anchors to the coordinate (`anchor="bottom"`, matching
 * `DomMarkers`/`VehicleMarker`'s convention).
 *
 * This generalizes the marker seam `VehicleMarker` already established in this
 * folder: `VehicleMarker` is the 4-tone (success/warning/error/muted), photo-first
 * vehicle pin with hover pills — it stays as-is for that call site. This component
 * is the pixel-exact, 6-status, ring-only marker for the live-monitoring map
 * (any asset kind, not just vehicles) — the design intentionally leaves the ring
 * interior EMPTY in the reference SVGs so the center art can be swapped per
 * asset/vehicle/workforce/bin at render time.
 *
 * The status → color/glyph mapping is NOT owned here — it's `mobility-status.ts`'s
 * `MOBILITY_STATUS_STYLES`, the single source of truth shared with the
 * live-monitoring listing/table status chip and the map detail popup's status
 * line (designer asset drop `assets/icons/status/*.svg`, commit `ee2f205`), so
 * the badge coin never drifts from those standalone badges.
 *
 * Geometry note (DoD carve-out, same precedent as `ClusterBadge`'s tier table):
 * the ring/badge/stem/dot pixel positions are Figma component-set geometry no
 * spacing token expresses — they live here as component-scoped pixel constants
 * (`GEOMETRY`), used only for layout math; every color is a token utility class.
 * `size` scales the whole pixel-exact `md` geometry uniformly (transform-origin
 * bottom center, so the anchor dot stays put) rather than re-deriving per-size
 * geometry the design never specified.
 */

export type { MobilityStatus as MapMarkerStatus }
export type MapMarkerVariant = 'plain' | 'tinted'
export type MapMarkerSize = 'sm' | 'md' | 'lg'
export type MapMarkerStatusStyle = MobilityStatusStyle

/** Pixel-exact geometry lifted from the reference SVGs, at `size="md"` (1:1 scale). */
const GEOMETRY = {
  plain: {
    width: 40,
    height: 67,
    ring: { top: 7.5, left: 0.5, size: 39, borderWidth: 1 },
    badge: { top: 0, left: 13, size: 14 },
    stem: { top: 46, left: 19.5, width: 1, height: 16 },
    dot: { top: 61, left: 17, size: 6 },
  },
  tinted: {
    width: 40,
    height: 71,
    ring: { top: 8, left: 1, size: 38, borderWidth: 2 },
    badge: { top: 0, left: 13, size: 14 },
    stem: { top: 46, left: 19, width: 2, height: 20 },
    dot: { top: 65, left: 17, size: 6 },
  },
} as const

/** `size` scales the pixel-exact `md` geometry uniformly; anchor stays put. */
const SIZE_SCALE: Record<MapMarkerSize, number> = { sm: 0.8, md: 1, lg: 1.25 }

export interface MapStatusMarkerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Mobility status — drives ring/badge color + badge glyph (`mobility-status.ts`). */
  status: MobilityStatus
  /** `plain` = white ring, thin stroke (default); `tinted` = status-tint fill, thicker stroke. */
  variant?: MapMarkerVariant
  size?: MapMarkerSize
  /** Center art — swap in a vehicle/asset/workforce/bin icon or illustration. Defaults to nothing (empty ring, matching the reference art). */
  icon?: ReactNode
  /** Override any status's color/glyph (e.g. a tenant-specific badge set). Merged over `MOBILITY_STATUS_STYLES`. */
  statusStyles?: Partial<Record<MobilityStatus, Partial<MobilityStatusStyle>>>
  /** Emphasize (selected) — adds a focus-style halo ring around the marker. */
  selected?: boolean
  /** Accessible name; defaults to the status label. */
  label?: string
}

/**
 * MapStatusMarker — pure presentational. The map layer (`DomMarkers`'
 * `renderMarker`) mounts this inside a MapLibre `Marker` with `anchor="bottom"`
 * so the anchor dot lands on the coordinate.
 */
export const MapStatusMarker = forwardRef<HTMLButtonElement, MapStatusMarkerProps>(
  ({ status, variant = 'plain', size = 'md', icon, statusStyles, selected = false, label, className, style, ...props }, ref) => {
    const geo = GEOMETRY[variant]
    const base = MOBILITY_STATUS_STYLES[status]
    const override = statusStyles?.[status]
    const resolved: MobilityStatusStyle = {
      border: override?.border ?? base.border,
      bg: override?.bg ?? base.bg,
      tint: override?.tint ?? base.tint,
      icon: override?.icon ?? base.icon,
      label: override?.label ?? base.label,
    }
    const scale = SIZE_SCALE[size]
    const fillClass = variant === 'tinted' ? resolved.tint : 'bg-white'

    return (
      <button
        ref={ref}
        type="button"
        data-slot="map-status-marker"
        data-status={status}
        data-variant={variant}
        aria-label={label ?? resolved.label}
        className={cn('relative block cursor-pointer rounded-full outline-none', className)}
        style={{
          width: geo.width * scale,
          height: geo.height * scale,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'bottom center',
          ...style,
        }}
        {...props}
      >
        {/* Ring */}
        <span
          className={cn('absolute rounded-full', resolved.border, fillClass, selected && 'ring-2 ring-offset-2 ring-ring')}
          style={{
            top: geo.ring.top,
            insetInlineStart: geo.ring.left,
            width: geo.ring.size,
            height: geo.ring.size,
            borderWidth: geo.ring.borderWidth,
            borderStyle: 'solid',
          }}
        >
          {/* Center icon slot — vehicle/asset/workforce/bin art, or anything else. */}
          {icon ? (
            <span className="absolute start-1/2 top-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center [&_img]:size-full [&_img]:object-contain [&_svg]:size-full">
              {icon}
            </span>
          ) : null}
        </span>

        {/* Status badge coin */}
        <span
          className={cn('absolute grid place-items-center rounded-full text-white ring-2 ring-white', resolved.bg)}
          style={{ top: geo.badge.top, insetInlineStart: geo.badge.left, width: geo.badge.size, height: geo.badge.size }}
        >
          <span className="grid size-1.5 place-items-center">{resolved.icon}</span>
        </span>

        {/* Stem */}
        <span
          className={cn('absolute rounded-full', resolved.bg)}
          style={{ top: geo.stem.top, insetInlineStart: geo.stem.left, width: geo.stem.width, height: geo.stem.height }}
        />

        {/* Anchor dot */}
        <span
          className={cn('absolute rounded-full', resolved.bg)}
          style={{ top: geo.dot.top, insetInlineStart: geo.dot.left, width: geo.dot.size, height: geo.dot.size }}
        />
      </button>
    )
  },
)

MapStatusMarker.displayName = 'MapStatusMarker'
