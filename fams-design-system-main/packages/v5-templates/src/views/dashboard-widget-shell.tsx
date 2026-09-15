import type { ReactNode } from 'react'
import { getIcon } from '@fams/ui-kit/icons'
import {
  AlertTriangle,
  Activity,
  Car,
  CircleCheck,
  CircleStop,
  Clock,
  CreditCard,
  Droplet,
  Flag,
  Fuel,
  Gauge as GaugeIcon,
  LayoutGrid,
  Leaf,
  MapPin,
  Navigation,
  PauseCircle,
  Route,
  ShieldAlert,
  Snowflake,
  Timer,
  TrendingUp,
  TriangleAlert,
  Trophy,
  Truck,
  Users,
  WifiOff,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from '@fams/ui-kit/icons'
import { useState } from 'react'
import { Button, ChartCard, Combobox, StatusView, TrendIndicator } from '@fams/ui-kit'
import type {
  DashboardWidget,
  DashboardWidgetDataSource,
  DashboardCenterLabel,
  DashboardScopeFilter,
} from '@fams/v5-composer'
import { cn } from '../lib/cn'
import type { DashboardFilterValues } from './dashboard-filter'

export type { DashboardFilterValues } from './dashboard-filter'

/**
 * dashboard-widget-shell — everything every dashboard widget shares: the
 * four-state contract (data / loading / empty / error-with-retry, UX verdict
 * V10), the `ChartCard` wrapper, the named-icon vocabulary, and the small
 * `dataSource` readers. Split out of `dashboard-widgets.tsx` to keep each
 * file inside the ~300-line budget (hard rule 12).
 *
 * WHY ERROR-WITH-RETRY LIVES HERE, not in `@fams/ui-kit`: the chart composites
 * are pure presenters (rule 8) — they know nothing about who would retry. The
 * dashboard SHELL is the layer that owns a widget's async story, so this is
 * where `StatusView kind="error"` + a retry `Button` belong.
 */


/** What one widget renderer is handed. */
export interface DashboardWidgetRenderProps {
  widget: DashboardWidget
  /** Live filter-pill values. Widgets are re-keyed on change so charts re-render (verdict V10). */
  filters: DashboardFilterValues
  /**
   * The active filter selection stated in words, supplied ONLY to a widget that
   * actually responds to one of the selected dimensions. It is appended to the
   * widget's `aria-label` so the sentence a screen reader hears describes the
   * data on screen rather than the data the blueprint was authored with — the
   * exact defect round 2 measured ("22 to 28 October" under a "Today" pill).
   */
  filterSummary?: string
  /** ECharts renderer, forwarded to every chart composite. `'svg'` under jsdom. */
  renderer?: 'canvas' | 'svg'
  /** Holds the previous render at reduced opacity rather than flashing a skeleton. */
  loading?: boolean
  /** Non-empty puts the widget in its error state. */
  error?: string | null
  /** Presence renders a Retry affordance in the error state. */
  onRetry?: () => void
  /**
   * Row/marker/card activation seam. Presence is what makes a widget's rows
   * interactive at all — without it they render as plain, non-focusable,
   * non-pointer rows, because an affordance with nothing behind it is worse
   * than no affordance (verdict V11).
   */
  onItemSelect?: (widgetId: string, itemId: string) => void
}

export type DashboardWidgetRenderer = (props: DashboardWidgetRenderProps) => ReactNode

/**
 * Named-icon vocabulary — a blueprint names icons by STRING (JSON cannot carry
 * a `LucideIcon` reference), resolved through the same "opt in by name,
 * unrecognized → default" contract `OverviewWidgets` and `v5-module-renderers`
 * already establish.
 */
const WIDGET_ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  'alert-triangle': AlertTriangle,
  car: Car,
  'circle-check': CircleCheck,
  'circle-stop': CircleStop,
  clock: Clock,
  'credit-card': CreditCard,
  droplet: Droplet,
  flag: Flag,
  fuel: Fuel,
  gauge: GaugeIcon,
  'layout-grid': LayoutGrid,
  leaf: Leaf,
  'map-pin': MapPin,
  navigation: Navigation,
  'pause-circle': PauseCircle,
  route: Route,
  'shield-alert': ShieldAlert,
  snowflake: Snowflake,
  timer: Timer,
  'trending-up': TrendingUp,
  'triangle-alert': TriangleAlert,
  trophy: Trophy,
  truck: Truck,
  users: Users,
  'wifi-off': WifiOff,
  wind: Wind,
  wrench: Wrench,
  zap: Zap,
}

/** Names already reported, so a re-render does not re-log the same warning. */
const warnedIconNames = new Set<string>()

/**
 * Resolve a kebab-case lucide name.
 *
 * WHY A MAP AND NOT `lucide-react/dynamic`: `DynamicIcon` is a `name`-prop
 * component backed by a lazy `import()`, not a `LucideIcon`. Every icon seam
 * it would have to pass through (`ChartCard.icon`, `KpiTile.icon`,
 * `IconBadge.icon`) is typed `LucideIcon` and renders it synchronously, so
 * switching would mean a core-tier API change plus a Suspense boundary per
 * icon — for a vocabulary this small, a named map stays cheaper AND
 * tree-shakes, which `dynamicIconImports` explicitly does not.
 *
 * An unknown name still renders no icon (a missing chrome glyph must never
 * break a widget), but it is no longer SILENT: DEV builds warn once per name,
 * which is what made the original omission invisible.
 */
export function resolveWidgetIcon(name: string | undefined): LucideIcon | undefined {
  if (!name) return undefined
  const icon = WIDGET_ICONS[name]
  if (icon) return icon
  // Fall back to the full canonical DS icon registry so any DS glyph name a
  // blueprint chooses (e.g. `user`, `calendar`, `briefcase`) still renders —
  // a KPI/widget icon should never come up empty just because the name isn't
  // in the small curated `WIDGET_ICONS` set above. `getIcon` returns the DS
  // `IconGlyph`, which satisfies the same `LucideIcon` prop signature.
  const fromRegistry = getIcon(name) as LucideIcon | undefined
  if (fromRegistry) return fromRegistry
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production' && !warnedIconNames.has(name)) {
    warnedIconNames.add(name)
    console.warn(
      `[dashboard] unknown icon name "${name}" — not in WIDGET_ICONS or the DS icon registry, so no icon rendered. Use a valid DS icon name.`,
    )
  }
  return undefined
}

/** A widget's `dataSource`, never undefined — every reader below can assume an object. */
export function sourceOf(widget: DashboardWidget): DashboardWidgetDataSource {
  return widget.dataSource ?? {}
}

/**
 * A widget's `aria-label` — the authored sentence (verdict V10: "`<what>` —
 * `<form>`, `<n>` `<series noun>` over `<range>`"), falling back to the title
 * so a chart is never label-less (`ChartContainer` requires one).
 */
export function widgetAriaLabel(widget: DashboardWidget, filterSummary?: string): string {
  const source = sourceOf(widget)
  const base = source.ariaLabel ?? widget.title ?? widget.id
  return filterSummary ? `${base} — filtered to ${filterSummary}` : base
}

/** Fixed body height for a widget's chart. */
export function widgetHeight(widget: DashboardWidget, fallback: number): number {
  return sourceOf(widget).height ?? fallback
}

/** `lg:col-span-*` for a widget, clamped to the 12-column grid. */
export function widgetSpanClass(span: number | undefined): string {
  const columns = Math.min(12, Math.max(1, Math.round(span ?? 6)))
  return SPAN_CLASS[columns]
}

/**
 * Enumerated rather than interpolated: Tailwind scans source for whole class
 * names, so a template literal (`lg:col-span-${n}`) would emit nothing.
 */
const SPAN_CLASS: Record<number, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
  7: 'lg:col-span-7',
  8: 'lg:col-span-8',
  9: 'lg:col-span-9',
  10: 'lg:col-span-10',
  11: 'lg:col-span-11',
  12: 'lg:col-span-12',
}

export interface WidgetStateProps {
  /** Number of data points the widget found. `0` renders the empty state. */
  count: number
  source: DashboardWidgetDataSource
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  /** Rendered when there is data (or while loading, dimmed). */
  children: ReactNode
}

/**
 * The four-state switch every widget body goes through.
 *
 * ORDER MATTERS: error wins over empty wins over data. `loading` never
 * replaces an existing render with a skeleton — it dims it and marks the
 * region `aria-busy`, so a refilter has no layout shift (verdict V10,
 * `dataviz/interaction.md`'s "refetch keeps the frame").
 */
export function WidgetState({ count, source, loading, error, onRetry, children }: WidgetStateProps) {
  if (error) {
    return (
      <StatusView
        kind="error"
        title="This widget couldn’t load"
        description={source.errorText ?? error}
        action={
          onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : undefined
        }
      />
    )
  }
  if (count === 0 && !loading) {
    return <StatusView kind="empty" title="No data" description={source.emptyText ?? 'No data for the current filters.'} />
  }
  return (
    <div
      className={cn('h-full transition-opacity duration-normal ease-standard', loading && 'opacity-60')}
      aria-busy={loading || undefined}
    >
      {children}
    </div>
  )
}

export interface WidgetCardProps extends DashboardWidgetRenderProps {
  /** Number of data points — drives the empty state. */
  count: number
  /** Controls rendered on the inline-end side of the card header (e.g. a widget-scoped select). */
  actions?: ReactNode
  /** `'md'` for every chart/list/table body; `'none'` only for a full-bleed map (verdict V8). */
  bodyPadding?: 'none' | 'sm' | 'md' | 'lg'
  bodyHeight?: number | string
  /** Legend row between the header and the body. */
  legend?: ReactNode
  subtitle?: ReactNode
  /** Renders the body with no card chrome at all (the headerless gauge card). */
  bare?: boolean
  children: ReactNode
}

/**
 * `ChartCard` + `WidgetState` — the standard widget frame. Every widget renders
 * through this so the header anatomy, the body padding rule and the four states
 * cannot drift between widget types.
 */
export function WidgetCard({
  widget,
  count,
  bodyPadding = 'md',
  bodyHeight,
  legend,
  subtitle,
  actions,
  bare,
  loading,
  error,
  onRetry,
  children,
}: WidgetCardProps) {
  const source = sourceOf(widget)
  const body = (
    <WidgetState count={count} source={source} loading={loading} error={error} onRetry={onRetry}>
      {children}
    </WidgetState>
  )
  if (bare) {
    return (
      <div
        data-slot="dashboard-widget"
        data-widget-id={widget.id}
        data-widget-type={widget.type}
        className="h-full rounded-md border border-border bg-card p-4"
      >
        {body}
      </div>
    )
  }
  return (
    <ChartCard
      data-slot="dashboard-widget"
      // The widget's own id on the card, so a QA probe (and any host wanting to
      // address one card) can name a widget without guessing at its position.
      data-widget-id={widget.id}
      data-widget-type={widget.type}
      title={widget.title ?? ''}
      // The two-line header (leading tinted icon + title + supporting line) is
      // metadata-driven: a widget that authors `dataSource.subtitle`/`icon`
      // gets it, one that does not keeps the compact title-only header. A
      // renderer-specific `subtitle` still wins, for the widgets that compose
      // their own.
      subtitle={subtitle ?? source.subtitle}
      icon={resolveWidgetIcon(source.icon)}
      iconTone={source.tone === 'neutral' ? undefined : source.tone}
      actions={actions}
      legend={legend}
      bodyPadding={bodyPadding}
      bodyHeight={bodyHeight}
      // FLAT BY DESIGN: dashboard widgets carry no elevation in Figma — the
      // border alone separates a card from the canvas. `Card` ships
      // `shadow-elevation` for detail/list panels, so the dashboard surface
      // opts out here rather than the shared card losing it for everyone.
      className="h-full shadow-none"
    >
      {body}
    </ChartCard>
  )
}

/**
 * A select scoped to ONE widget, rendered in that widget's card header.
 *
 * WHY IT IS NOT A FILTER PILL: a pill in the toolbar scopes every widget on the
 * page, which is the whole reason the toolbar is one row above everything. A
 * board that ranks one slice of a collection needs a control that scopes ITSELF
 * and says so by where it sits. Searchable (it lists a collection), and its
 * value is widget-local UI state — a presenter cannot own it (rule 8).
 */
export const SCOPE_ALL_VALUE = '__all'

/**
 * The unscoped option, always first and always the default.
 *
 * Round 2 measured the failure this exists to prevent: the trigger read
 * "All Vehicles" while the menu marked a real option checked, and because no
 * "All" option existed the unscoped board could not be restored once a scope
 * was chosen. A scoping control without a way back is a one-way door.
 * `allLabel` lets the author name it in their own noun ("All Vehicles").
 */
function scopeOptions(filter: DashboardScopeFilter) {
  const allLabel = filter.allLabel ?? `All ${filter.label}`
  return [{ value: SCOPE_ALL_VALUE, label: allLabel }, ...filter.options.filter((o) => o.value !== SCOPE_ALL_VALUE)]
}

export function WidgetScopeSelect({
  filter,
  value,
  onChange,
}: {
  filter: DashboardScopeFilter
  value: string | undefined
  onChange: (next: string | undefined) => void
}) {
  return (
    <Combobox
      options={scopeOptions(filter)}
      value={value ?? SCOPE_ALL_VALUE}
      onChange={(next) => onChange(typeof next === 'string' ? next : SCOPE_ALL_VALUE)}
      placeholder={filter.label}
      ariaLabel={filter.label}
      size="lg"
      triggerProps={{
        'data-slot': 'widget-scope-select',
        'data-filter-id': filter.id,
        // `size="lg"` is the 44px control (verdict V11); the width floor keeps
        // the longest option from truncating the trigger's own label.
        className: 'h-11 w-56 min-w-40',
      }}
    />
  )
}

/**
 * Widget-scoped select state + node, or `undefined` when none is authored.
 * A `value` of `undefined` means UNSCOPED — the caller filters nothing.
 */
export function useWidgetScopeFilter(source: DashboardWidgetDataSource): {
  value: string | undefined
  node: ReactNode
} {
  const filter = source.scopeFilter
  const [value, setValue] = useState<string>(filter?.defaultValue ?? SCOPE_ALL_VALUE)
  if (!filter) return { value: undefined, node: undefined }
  return {
    value: value === SCOPE_ALL_VALUE ? undefined : value,
    node: <WidgetScopeSelect filter={filter} value={value} onChange={(next) => setValue(next ?? SCOPE_ALL_VALUE)} />,
  }
}

/**
 * Renders a donut/gauge centre stack — value, caption, and an optional trend.
 *
 * The trend is a real `TrendIndicator`, not a hand-drawn glyph string: it was
 * the one place in the dashboard set that re-implemented the arrow + value
 * pair in muted ink, which both forked the component (root rule: compose,
 * never fork) and dropped the direction's semantic colour. Wrapped in the
 * tinted pill the design draws around it, on the matching scale-50 surface.
 */
const TREND_PILL_SURFACE: Record<'up' | 'down' | 'flat', string> = {
  up: 'bg-success-scale-50',
  down: 'bg-error-50',
  flat: 'bg-muted',
}

export function CenterStack({ centerLabel }: { centerLabel: DashboardCenterLabel | undefined }) {
  if (!centerLabel) return null
  return (
    <span className="flex flex-col items-center gap-0.5 text-center">
      {/* `<bdi>`: a centre value is a numeral that may carry a unit; an RTL
          line would otherwise move the unit ahead of the number. */}
      <bdi className="text-2xl font-semibold text-foreground">{centerLabel.value}</bdi>
      {centerLabel.caption ? <span className="text-caption text-muted-foreground">{centerLabel.caption}</span> : null}
      {centerLabel.trend ? (
        <span
          data-slot="center-stack-trend"
          className={cn(
            'mt-1 inline-flex items-center rounded-full px-2 py-0.5',
            TREND_PILL_SURFACE[centerLabel.trend.direction],
          )}
        >
          <TrendIndicator size="sm" {...centerLabel.trend} />
        </span>
      ) : null}
    </span>
  )
}
