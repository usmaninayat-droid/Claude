import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { MOBILITY_STATUS_STYLES, type MobilityStatus, type MobilityStatusStyle } from './mobility-status'

/**
 * AssetStatusIcon — the live-monitoring LIST-row counterpart of
 * `MapStatusMarker`: a status badge coin floating over a swappable asset
 * icon (vehicle/bin/workforce/generic asset "list" variant), for use in any
 * row-based listing/table where a status needs to sit at-a-glance next to
 * the asset's icon (designer refinement of the static per-status example
 * composites in the Asset Library "Asset Mobility Status" table — the
 * designer asked for one dynamic component instead of 6 hand-drawn SVGs, so
 * every row's badge floats at the exact same anchor regardless of which
 * asset icon is inside).
 *
 * The status → color/glyph mapping is the same single source of truth as
 * `MapStatusMarker` — `mobility-status.ts`'s `MOBILITY_STATUS_STYLES` — so
 * the list badge never drifts from the map badge or any future status chip.
 *
 * Geometry note (DoD carve-out, same precedent as `MapStatusMarker`'s
 * `GEOMETRY`/`ClusterBadge`'s tier table): the badge's anchor was measured
 * from the designer's reference composites (`assets/illustrations/status/
 * *-example.svg`, commit a4c8b6b) — a 35×32 viewBox with the badge coin's
 * filter box at `x=0 y=9.33333 w=15 h=15` and its circle at
 * `x=2.5 y=11 w=10 h=10`. As a fraction of the composite that's a badge
 * centered at roughly (21%, 50%) with a diameter ~29% of the icon box —
 * left-of-center, vertically centered, overlapping the icon's left edge.
 * Expressed as percentages (not pixels) so the anchor holds exactly at any
 * `size`, this is a fixed ratio every row shares — the alignment guarantee
 * the designer asked for.
 */

export type AssetStatusIconSize = 'sm' | 'md' | 'lg'

/** Icon box (square) per size — the badge floats at a fixed % of this. */
const ICON_BOX: Record<AssetStatusIconSize, number> = { sm: 32, md: 40, lg: 48 }

/**
 * Badge anchor as a fraction of the icon box, measured from the reference
 * composites (see file-level doc comment). Center-based so it holds
 * regardless of the icon box's exact size.
 */
const BADGE_GEOMETRY = {
  centerLeftPct: 21.4,
  centerTopPct: 50,
  diameterPct: 28.6,
} as const

export interface AssetStatusIconProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Mobility status — drives the badge color + glyph (`mobility-status.ts`). */
  status: MobilityStatus
  /** The asset's list icon — an <img>/<svg> ReactNode, or a src string. */
  icon: ReactNode | string
  size?: AssetStatusIconSize
  /** Override any status's color/glyph (e.g. a tenant-specific badge set). Merged over `MOBILITY_STATUS_STYLES`. */
  statusStyles?: Partial<Record<MobilityStatus, Partial<MobilityStatusStyle>>>
  /** Accessible name for the icon; defaults to the status label. */
  label?: string
}

/**
 * AssetStatusIcon — pure presentational. Every instance renders the badge at
 * the identical anchor (see `BADGE_GEOMETRY`), so a column of these in a
 * list/table aligns pixel-for-pixel regardless of which asset icon is inside.
 */
export const AssetStatusIcon = forwardRef<HTMLDivElement, AssetStatusIconProps>(
  ({ status, icon, size = 'md', statusStyles, label, className, style, ...props }, ref) => {
    const base = MOBILITY_STATUS_STYLES[status]
    const override = statusStyles?.[status]
    const resolved: MobilityStatusStyle = {
      border: override?.border ?? base.border,
      bg: override?.bg ?? base.bg,
      tint: override?.tint ?? base.tint,
      icon: override?.icon ?? base.icon,
      label: override?.label ?? base.label,
    }
    const box = ICON_BOX[size]
    const badgeSize = (box * BADGE_GEOMETRY.diameterPct) / 100

    return (
      <div
        ref={ref}
        data-slot="asset-status-icon"
        data-status={status}
        role="img"
        aria-label={label ?? resolved.label}
        className={cn('relative inline-block shrink-0', className)}
        style={{ width: box, height: box, ...style }}
        {...props}
      >
        {/* Asset icon */}
        <span className="absolute inset-0 grid place-items-center [&_img]:size-full [&_img]:object-contain [&_svg]:size-full">
          {typeof icon === 'string' ? <img src={icon} alt="" /> : icon}
        </span>

        {/* Status badge coin — fixed anchor, identical across every instance regardless of icon/size. */}
        <span
          className={cn('absolute grid place-items-center rounded-full text-white ring-2 ring-white', resolved.bg)}
          style={{
            insetInlineStart: `${BADGE_GEOMETRY.centerLeftPct}%`,
            top: `${BADGE_GEOMETRY.centerTopPct}%`,
            width: badgeSize,
            height: badgeSize,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <span className="grid size-1.5 place-items-center">{resolved.icon}</span>
        </span>
      </div>
    )
  },
)

AssetStatusIcon.displayName = 'AssetStatusIcon'
