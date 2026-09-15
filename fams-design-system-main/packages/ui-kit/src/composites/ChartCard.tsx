import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { Maximize2, type LucideIcon } from '../icons'
import { cn } from '../lib/cn'
import { Card, CardHeader, CardContent } from './Card'
import { type IconBadgeTone } from '../primitives/IconBadge'

/**
 * Header avatar tone → icon colour. The disc itself is always the neutral
 * `gray-100` surface from Figma "Tadweer — Launch Pad" (node 6545:15224); only
 * the glyph carries the tone. (Distinct from `IconBadge`, whose disc is a
 * tinted wash of the tone — the widget header wants a grey chip with a
 * coloured mark, not a coloured wash.)
 */
const HEADER_ICON_TONE: Record<IconBadgeTone, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-info',
  neutral: 'text-muted-foreground',
}

/**
 * ChartCard — chart-agnostic chrome for any chart/graphic widget. [L3 composite]
 *
 * Owns the header (icon + title/subtitle + actions + expand), an optional
 * legend row, and a padded body slot — nothing about the chart itself. No
 * chart engine (recharts/ECharts) is imported here; `children` is whatever
 * the caller renders (a chart, a table, an EmptyState while loading). Built
 * on `Card`/`CardHeader`/`CardContent` + `IconBadge`, not re-implemented.
 * Consolidates the reference design system's two near-identical containers
 * (`data-viz/chart-card` and `charts/figma-charts#WidgetCard`) into one.
 *
 * State-agnostic (Rule 8): `onExpand` is a callback only — this component
 * does not track expanded/collapsed state itself, that belongs to the
 * caller (e.g. toggling a modal or a grid span).
 *
 * @usage-v5
 *   Consolidates ad-hoc chart/widget wrapper markup duplicated per dashboard
 *   screen in v5, each hand-rolling its own header row and body padding:
 *   - iwmp/components/charts/*.vue (GPS trend, fuel theft, fleet utilization
 *     widgets) — `q-card` + manual `q-avatar` icon chip + `text-h6` title,
 *     re-implemented per chart, no shared expand/legend affordance
 *   - shared/components/widgets/WidgetsCardWrapper.vue — icon avatar + title
 *     + slot body only; no subtitle, actions, legend, or expand support
 *   Forms needed: optional icon+tone, subtitle, actions row, expand button,
 *   legend row, bodyPadding, fixed vs auto bodyHeight.
 * @usage-index chart-card
 */
export interface ChartCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Chart/widget title. */
  title: ReactNode
  /** Optional supporting line rendered below the title. */
  subtitle?: ReactNode
  /** Leading icon, rendered inside an `IconBadge`. Omit for a card with no icon. */
  icon?: LucideIcon
  /** Tint passed straight through to the `IconBadge`. Ignored if `icon` is omitted. */
  iconTone?: IconBadgeTone
  /** Buttons/menu rendered top-right of the header, before the expand button. */
  actions?: ReactNode
  /** Shows a top-right expand affordance; invoked on click. Omit to hide it. */
  onExpand?: () => void
  /** Accessible label for the expand button. */
  expandLabel?: string
  /** Legend row rendered between the header and the body (e.g. a `ChartLegend`). */
  legend?: ReactNode
  /** Padding around the body content. Default `'md'`. */
  bodyPadding?: 'none' | 'sm' | 'md' | 'lg'
  /** Fixed body height — number is px, string is any CSS length. Omit for auto/intrinsic height. */
  bodyHeight?: number | string
  /** The chart/graphic body. Chart-agnostic — any node. */
  children: ReactNode
}

const BODY_PADDING: Record<NonNullable<ChartCardProps['bodyPadding']>, string> = {
  none: 'p-0',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
}

export const ChartCard = forwardRef<HTMLDivElement, ChartCardProps>(
  (
    {
      className,
      title,
      subtitle,
      icon: Icon,
      iconTone = 'primary',
      actions,
      onExpand,
      expandLabel = 'Expand chart',
      legend,
      bodyPadding = 'md',
      bodyHeight,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <Card
        ref={ref}
        data-slot="chart-card"
        className={cn('overflow-hidden shadow-none', className)}
        {...props}
      >
        <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {Icon ? (
              <span
                data-slot="chart-card-icon"
                aria-hidden="true"
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full bg-gray-100 ring-1 ring-inset ring-black/[0.08] [&_svg]:size-4',
                  HEADER_ICON_TONE[iconTone],
                )}
              >
                <Icon />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <h3
                data-slot="chart-card-title"
                className="truncate text-body-md font-semibold text-foreground"
              >
                {title}
              </h3>
              {subtitle ? (
                <p
                  data-slot="chart-card-subtitle"
                  className="mt-0.5 truncate text-xs text-muted-foreground"
                >
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
          {actions || onExpand ? (
            <div className="flex shrink-0 items-center gap-1">
              {actions}
              {onExpand ? (
                <button
                  type="button"
                  onClick={onExpand}
                  aria-label={expandLabel}
                  data-slot="chart-card-expand"
                  className="flex shrink-0 items-center justify-center rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Maximize2 className="size-4" />
                </button>
              ) : null}
            </div>
          ) : null}
        </CardHeader>
        {legend ? (
          <div data-slot="chart-card-legend" className="border-b border-border px-4 py-2">
            {legend}
          </div>
        ) : null}
        <CardContent
          data-slot="chart-card-body"
          className={cn('flex flex-col', BODY_PADDING[bodyPadding])}
          style={
            bodyHeight
              ? { height: typeof bodyHeight === 'number' ? `${bodyHeight}px` : bodyHeight }
              : undefined
          }
        >
          {children}
        </CardContent>
      </Card>
    )
  },
)

ChartCard.displayName = 'ChartCard'
