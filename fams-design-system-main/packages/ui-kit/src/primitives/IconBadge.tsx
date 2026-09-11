import { forwardRef, type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import type { LucideIcon } from '../icons'
import { cn } from '../lib/cn'

/**
 * IconBadge — an icon rendered inside a tinted disc/square. [L1 primitive]
 *
 * Pass a lucide-react component via `icon`, or a custom icon element via `children`.
 * Tint is derived from `tone` using the semantic status tokens at low opacity
 * (`bg-{tone}/10` + `text-{tone}`) — never a raw hex or an ad-hoc CSS var.
 *
 * @usage-v5
 *   Consolidates the "icon in a colored circle" pattern hand-rolled with inline
 *   hex styles across ~5 tenant-forked card components:
 *   - iwmp/components/charts/StatisticCard.vue — `q-avatar :style="{ backgroundColor: iconBgColor }"`
 *   - iwmp/components/charts/DetailsCard.vue (byte-similar copies also in fams/, ead/) —
 *     `q-avatar :style="avatarBgStyle || { backgroundColor: <hardcoded fallback hex> }"` + `q-icon :style="iconStyle"`
 *   - shared/components/widgets/WidgetsCardWrapper.vue — `q-avatar color="secondary-3"` header icon
 *   Forms needed: tone (closed enum, replaces free-form hex props), shape circle|square, size sm|md|lg.
 * @usage-index icon-badge
 */
export type IconBadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
export type IconBadgeShape = 'circle' | 'square'

const iconBadgeVariants = cva(
  "inline-flex shrink-0 items-center justify-center [&_svg]:shrink-0 [&_svg]:pointer-events-none",
  {
    variants: {
      tone: {
        primary: 'bg-primary/10 text-primary',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        danger: 'bg-destructive/10 text-destructive',
        info: 'bg-info/10 text-info',
        neutral: 'bg-muted text-muted-foreground',
      },
      shape: {
        circle: 'rounded-full',
        square: 'rounded-md',
      },
      size: {
        sm: "size-8 [&_svg:not([class*='size-'])]:size-4",
        md: "size-10 [&_svg:not([class*='size-'])]:size-4",
        lg: "size-12 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: { tone: 'primary', shape: 'circle', size: 'md' },
  },
)

export interface IconBadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof iconBadgeVariants> {
  /** Lucide icon component to render centered in the badge. Omit and pass `children` for a custom icon element instead. */
  icon?: LucideIcon
}

export const IconBadge = forwardRef<HTMLSpanElement, IconBadgeProps>(
  ({ className, tone, shape, size, icon: Icon, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        data-slot="icon-badge"
        aria-hidden={props['aria-label'] ? undefined : true}
        {...props}
        className={cn(iconBadgeVariants({ tone, shape, size }), className)}
      >
        {Icon ? <Icon /> : children}
      </span>
    )
  },
)

IconBadge.displayName = 'IconBadge'

export { iconBadgeVariants }
