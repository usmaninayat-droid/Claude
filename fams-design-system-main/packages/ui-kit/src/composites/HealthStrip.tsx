import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import type { LucideIcon } from '../icons'
import { cn } from '../lib/cn'
import { IconBadge, type IconBadgeTone } from '../primitives/IconBadge'

/**
 * HealthStrip — compact row of at-a-glance vitals/status readouts. [L3 composite]
 *
 * A fixed grid (2-up on mobile, 4-up on desktop) of label+value cells, not a
 * scroller, so every vital is visible without interaction. `status` drives a
 * token-based tint — a leading dot by default, or the tone of the item's
 * `IconBadge` when an `icon` is given — never a raw hex or `var(--status-*)`.
 * Hairline dividers between cells come from a `bg-border` grid gutter (Rule 4:
 * this avoids directional per-cell borders entirely, so it is RTL-safe by
 * construction).
 *
 * State-agnostic (Rule 8): every item's `label`, `value`, and `status` is
 * fully resolved by the caller (e.g. "GPS uplink is stale" → `status:
 * 'warning'` is a caller decision, not logic baked into this component).
 *
 * @usage-v5
 *   Consolidates a "vitals row" pattern hand-rolled per profile/dashboard with
 *   no shared status semantics:
 *   - iwmp/components/tabs/panels/map/MapAssetOverview.vue (+7 byte-similar
 *     tenant/context copies: fams/ead MapAssetOverview, {iwmp,fams,ead}
 *     MapSensorOverview, MapAssetCanOverView, MapAssetCanAcRms) — ~10
 *     `description-item` cells per file (icon+label+value), zero status/tone
 *     concept (`shared/components/items/DescriptionItem.vue`)
 *   - iwmp/components/tabs/panels/asset/vehicle/WorkforceActivity.vue —
 *     `row q-col-gutter` stat cells with a manually-toggled
 *     `bg-orange-1 text-orange-9` class per cell for a warning state
 *   - iwmp/components/tabs/panels/asset/vehicle/AssetOverview.vue — icon+
 *     label+value row (speed, odometer) with no status coloring at all
 *   Forms needed: label+value+status{neutral|success|warning|danger|info}+
 *   optional icon, fixed 2/4-col responsive grid — none of the ~10 v5 usages
 *   share tint logic; most have no status concept whatsoever.
 * @usage-index health-strip
 */
export type HealthStripStatus = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const STATUS_DOT_CLASSES: Record<HealthStripStatus, string> = {
  neutral: 'bg-muted-foreground/50',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
}

const STATUS_ICON_TONE: Record<HealthStripStatus, IconBadgeTone> = {
  neutral: 'neutral',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
}

export interface HealthStripItem {
  /** Short label above the value, e.g. `"GPS"`, `"Fuel"`, `"Ignition"`. */
  label: ReactNode
  /** Pre-formatted value, e.g. `"98%"`, `"Offline"`, `"24 L"`. */
  value: ReactNode
  /** Drives the status dot (or, with `icon`, the `IconBadge` tone). Defaults to `'neutral'`. */
  status?: HealthStripStatus
  /** Optional leading icon, rendered in a small `IconBadge` toned to `status`. Omit for a plain status dot. */
  icon?: LucideIcon
}

export interface HealthStripProps extends HTMLAttributes<HTMLDivElement> {
  /** The vitals to render, left to right, wrapping into the 2/4-col grid. */
  items: HealthStripItem[]
}

/**
 * HealthStrip — see module doc above.
 */
export const HealthStrip = forwardRef<HTMLDivElement, HealthStripProps>(
  ({ className, items, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="health-strip"
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4',
        className,
      )}
      {...props}
    >
      {items.map((item, index) => {
        const status = item.status ?? 'neutral'
        return (
          <div
            key={index}
            data-slot="health-strip-item"
            className="flex items-center gap-2 bg-card p-3"
          >
            {item.icon ? (
              <IconBadge icon={item.icon} tone={STATUS_ICON_TONE[status]} size="sm" />
            ) : (
              <span
                aria-hidden="true"
                data-slot="health-strip-dot"
                className={cn('size-1.5 shrink-0 rounded-full', STATUS_DOT_CLASSES[status])}
              />
            )}
            <div className="flex min-w-0 flex-col gap-0.5">
              <span
                data-slot="health-strip-label"
                className="truncate text-caption font-medium uppercase tracking-wide text-muted-foreground"
              >
                {item.label}
              </span>
              <span
                data-slot="health-strip-value"
                className="truncate text-body-sm font-semibold tabular-nums text-foreground"
              >
                {item.value}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  ),
)

HealthStrip.displayName = 'HealthStrip'
