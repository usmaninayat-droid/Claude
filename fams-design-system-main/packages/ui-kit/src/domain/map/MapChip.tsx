import { type HTMLAttributes, type ReactNode, forwardRef } from 'react'
import { cn } from '../../lib/cn'

/**
 * MapChip — a small on-map badge / pill (Figma 517-11962; chip anatomy
 * re-verified against the 2026-08-24 run's SPEC §2.3 / map-only-495-22362).
 *
 * The `glass` variant is the dark marker chip from the Figma spec:
 *   fully rounded; background rgba(0,0,0,0.40) (the `overlay-black-40`
 *   token — solved exactly against two basemap backgrounds, ⚠ was
 *   `bg-gray-800/85` before); white 10px text; height 20px; padding 4px 8px;
 *   inline-flex; align-items: center; no visible border.
 * The default `light` variant is the same geometry on the card surface.
 *
 * The 10px chip type is Figma component geometry below the token type scale
 * (smallest token = 12px caption) — expressed as a component-scoped rem
 * font-size, the same carve-out `ClusterBadge` documents for its count type.
 *
 * AA note (UX-9): white-on-40%-black over the light basemap computes below
 * 4.5:1 — kept per "Figma wins on look"; every consumer must carry the same
 * data in an accessible channel (the marker aria-label / list / card). Logged
 * in the run's AA-risk register for the brand owner.
 *
 * Pure presentational, token-driven (re-themes per tenant), RTL-safe (logical
 * padding, so it flips naturally under dir="rtl").
 */

export type MapChipVariant = 'light' | 'glass'

export interface MapChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Visual variant — `glass` = dark translucent, `light` = card surface. */
  variant?: MapChipVariant
  /** Optional leading icon (16px slot). */
  icon?: ReactNode
  /**
   * Hide the chip because it collides with a higher-priority marker/cluster or
   * would be cut by the map pane's edge (round-1 UX finding 17). The chip is
   * still rendered (so a hover/selected reveal can un-hide it without a
   * remount) but is visually hidden and removed from the a11y tree — the same
   * data always lives in the owning marker's accessible name.
   *
   * The collision COMPUTATION belongs to the map layer
   * (`@fams/v5-templates`' `suppressedChipIds()`); this flag only renders it.
   */
  suppressed?: boolean
  children: ReactNode
}

const VARIANT: Record<MapChipVariant, string> = {
  light: 'border border-border bg-card text-foreground',
  // Black @ 40% scrim (overlay token), white text, borderless (SPEC §2.3).
  glass: 'bg-overlay-black-40 text-white',
}

/** Figma chip type: 10px — below the token scale, see the header note. */
const CHIP_FONT_SIZE = '0.625rem'

export const MapChip = forwardRef<HTMLSpanElement, MapChipProps>(
  ({ variant = 'light', icon, suppressed = false, children, className, style, ...props }, ref) => {
    return (
      <span
        ref={ref}
        data-slot="map-chip"
        data-suppressed={suppressed ? 'true' : undefined}
        aria-hidden={suppressed ? 'true' : undefined}
        className={cn(
          'inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full px-2 py-1',
          'font-semibold leading-none',
          VARIANT[variant],
          suppressed && 'pointer-events-none invisible',
          className,
        )}
        style={{ fontSize: CHIP_FONT_SIZE, ...style }}
        {...props}
      >
        {icon ? (
          <span className="grid size-3 shrink-0 place-items-center [&_svg]:size-3 [&_img]:size-3">
            {icon}
          </span>
        ) : null}
        {children}
      </span>
    )
  },
)

MapChip.displayName = 'MapChip'
