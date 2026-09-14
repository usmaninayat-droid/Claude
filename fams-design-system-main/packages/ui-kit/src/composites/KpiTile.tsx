import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import type { LucideIcon } from '../icons'
import { cn } from '../lib/cn'
import { IconBadge, type IconBadgeShape, type IconBadgeTone } from '../primitives/IconBadge'
import { TrendIndicator, type TrendIndicatorProps } from '../primitives/TrendIndicator'

/**
 * KpiTile — label + big value stat tile, the canonical "number that matters"
 * building block for dashboards and profile headers. [L3 composite]
 *
 * Consolidates three competing shapes the reference design system shipped
 * separately (icon-tile, kpi-card with a `delta` object, and a Figma
 * "MetricCard") into one component. Composes `IconBadge` and `TrendIndicator`
 * rather than re-implementing the icon disc or the up/down/flat logic.
 *
 * State-agnostic (Rule 8): `value`, `trend`, `description` are all pre-formatted
 * by the caller — no numeric formatting, sign-prefixing, or "good vs bad"
 * business logic lives here (e.g. a KPI where "down" is good is still the
 * caller's choice of `trend.direction`).
 *
 * @usage-v5
 *   Consolidates ~3 forked "icon + label + big value" cards in v5, none of
 *   which share the trend/delta rendering (each hand-rolls color via inline
 *   hex or Quasar color name):
 *   - iwmp/components/charts/StatisticCard.vue — icon circle (`iconBgColor`/
 *     `iconColor` hex props) + title + value, no trend
 *   - iwmp/components/charts/DetailsCard.vue (byte-differing forks also in
 *     fams/, ead/; used across 6 files incl. FuelMonitoring.vue,
 *     DriverSafetyOverview.vue) — icon + title + value + extraInfo, no trend
 *   - shared/components/cards/TileCard.vue — icon + title + value, trend
 *     row present but commented out (`text-positive1`/`text-negative1` hex)
 *   Forms needed: optional leading icon+tone, unit suffix, trend
 *   {direction,value,note}, description line, clickable.
 * @usage-index kpi-tile
 */
export type KpiTileTrend = Pick<TrendIndicatorProps, 'direction' | 'value' | 'note'>

/**
 * `'default'` — the original label-above-value anatomy (dashboards/profile
 * headers). `'stat'` — the compact figma-spec-list.md §2 stat-card anatomy:
 * a 48×48 icon chip, a small gray label ON TOP, then the big VALUE
 * (`Sb_heading2` 16px/24 semibold) underneath it — the row of 5 cards above
 * a list-view table (round-1 design QA B1: the value/label order was
 * reversed on all 5 tiles — verified against figma-spec-list.md's own
 * zoomed crop of the Active Tickets / Closed cards, label-then-value).
 * Additive: `'default'` is unchanged, existing consumers are unaffected.
 */
export type KpiTileLayout = 'default' | 'stat'

export interface KpiTileProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  /** Label above the value (`'default'` layout) or below it (`'stat'` layout). */
  label: ReactNode
  /** The big value. Pre-formatted by the caller (e.g. `"1,204"`, `"7:45 hrs"`). */
  value: ReactNode
  /** Optional unit suffix beside the value (e.g. `"QAR"`, `"km"`). */
  unit?: ReactNode
  /**
   * Muted text after the value/unit, e.g. `"until critical at current
   * consumption"`, `"peak Fri (6)"`. Pre-formatted by the caller (rule 8).
   * Additive — omit for the unchanged value row.
   */
  valueSuffix?: ReactNode
  /**
   * Target the value is measured against — the `stat-with-target` KPI shape.
   * Rendered muted after the value as `"<targetLabel> <target>"`, e.g.
   * `"of 5,000 L"`. Omit for a plain stat.
   */
  target?: ReactNode
  /** Word joining the value and `target`. Default `'of'`. Ignored without `target`. */
  targetLabel?: ReactNode
  /**
   * Trailing chip at the end of the VALUE row — e.g. a "Real Time" pill or a
   * status `Badge`. A generic slot, never a per-use-case boolean (rule 10).
   * Deliberately not on the label row: there it starved the label of width in
   * a narrow KPI column.
   */
  badge?: ReactNode
  /** Leading icon, rendered in an `IconBadge`. Omit for a tile with no icon. */
  icon?: LucideIcon
  /**
   * Semantic tint of the tile. Drives the `IconBadge` ONLY — the value number
   * always renders in the default dark `text-foreground`, so a KPI reads the
   * same everywhere and the tone shows through the icon chip.
   *
   * OMIT IT and the icon badge falls back to `'primary'`: an untinted tile must
   * not acquire a hue just by having an icon. Set `'neutral'` to state
   * neutrality explicitly.
   */
  tone?: IconBadgeTone
  /**
   * Shape of the icon chip. `'stat'` layout defaults to `'square'`
   * (figma-spec-list.md §2's rounded-square icon chip); `'default'` keeps
   * `IconBadge`'s own `'circle'` default.
   */
  iconShape?: IconBadgeShape
  /**
   * Raw icon-chip color escape hatch for a hue `IconBadgeTone`'s closed enum
   * doesn't name (e.g. figma-spec-list.md §2's dedicated terracotta "Accent
   * 8" branding pair, which has no token yet) — same blueprint-driven
   * runtime-value precedent as `StatusPill.color`/`CountChip.accentColor`:
   * a value threaded in at render time from the caller's own data, never a
   * literal hex in this component's source. Omit to use `tone`'s token
   * classes unchanged.
   */
  iconColor?: string
  /** Pairs with `iconColor` — the chip's background. Omit to use `tone`'s token classes unchanged. */
  iconBg?: string
  /** Directional delta, rendered via `TrendIndicator`. Omit for no trend row. */
  trend?: KpiTileTrend
  /** Optional helper line below the value/trend row. */
  description?: ReactNode
  /** Makes the tile a keyboard-operable button (role="button", Enter/Space activates `onClick`). */
  clickable?: boolean
  onClick?: () => void
  /** See `KpiTileLayout`. Defaults to `'default'` — existing call sites are unaffected. */
  layout?: KpiTileLayout
}

/**
 * KpiTile — see module doc above.
 */
export const KpiTile = forwardRef<HTMLDivElement, KpiTileProps>(
  (
    {
      className,
      label,
      value,
      unit,
      valueSuffix,
      target,
      targetLabel = 'of',
      badge,
      icon: Icon,
      tone,
      iconShape,
      iconColor,
      iconBg,
      trend,
      description,
      clickable = false,
      onClick,
      layout = 'default',
      ...props
    },
    ref,
  ) => {
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (!clickable || !onClick) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onClick()
      }
    }

    const isStat = layout === 'stat'
    // The value ALWAYS reads in the default dark foreground — `tone` tints the
    // icon badge only, never the number. (Previously the value used the tone's
    // dark ramp step via `VALUE_INK_CLASSES`; standardized to dark ink so a
    // KPI number reads the same everywhere regardless of tone.)
    const valueInk = 'text-foreground'
    // An inline `style` color/background always wins over the tone class's
    // `bg-*`/`text-*` utilities regardless of specificity (same "color always
    // wins" precedent as `StatusPill`) — so overriding only needs the style,
    // never a conditional class swap.
    const iconStyle: CSSProperties | undefined =
      iconColor || iconBg ? { color: iconColor, backgroundColor: iconBg } : undefined

    // `<bdi>` throughout: a KPI value is a numeral plus a unit/qualifier, and
    // an RTL line otherwise reorders the pair ("342.5 hrs" → "hrs 342.5") —
    // bidi isolation keeps each group at its own embedding level (V12b).
    const valueGroup = (
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5">
        <bdi
          data-slot="kpi-tile-value"
          data-tone={tone}
          className={cn(
            isStat ? 'text-body-md font-semibold leading-6' : 'text-h4 font-bold leading-tight',
            valueInk,
          )}
        >
          {value}
        </bdi>
        {unit ? (
          <bdi className="text-body-sm font-medium text-muted-foreground">{unit}</bdi>
        ) : null}
        {target !== undefined && target !== null ? (
          <bdi data-slot="kpi-tile-target" className="text-body-sm text-muted-foreground">
            {targetLabel} {target}
          </bdi>
        ) : null}
        {valueSuffix ? (
          <bdi data-slot="kpi-tile-value-suffix" className="text-body-sm text-muted-foreground">
            {valueSuffix}
          </bdi>
        ) : null}
      </div>
    )
    /**
     * The badge sits at the END of the VALUE row: inline on the label row it
     * competed with the label and, on a KPI region sized by
     * `minmax(13.75rem, 1fr)`, truncated real labels to two characters
     * ("Moving A…"). The value row has slack the label row does not.
     */
    const valueRow = badge ? (
      <div className="flex items-center justify-between gap-2">
        {valueGroup}
        <span data-slot="kpi-tile-badge" className="shrink-0">
          {badge}
        </span>
      </div>
    ) : (
      valueGroup
    )
    const labelText = (
      <span
        data-slot="kpi-tile-label"
        className={
          isStat
            ? 'truncate text-caption font-medium text-muted-foreground'
            : 'truncate text-caption font-semibold uppercase tracking-wide text-muted-foreground'
        }
      >
        {label}
      </span>
    )
    /**
     * The TREND chip sits right-aligned at the end of the LABEL row — where
     * Figma draws it (round-2 visual QA #8: it was rendering below the value).
     * The label keeps `truncate`/`min-w-0` so the chip never starves it to two
     * characters, the failure mode that pushed `badge` onto the VALUE row (see
     * `valueRow`) — `badge` STAYS there; both may be present at once.
     */
    const labelRow = trend ? (
      <div className="flex min-w-0 items-center justify-between gap-2">
        {labelText}
        <span data-slot="kpi-tile-trend" className="shrink-0" title={trend.note}>
          {/* The `note` ("vs last month") is DROPPED from the inline chip and
              carried as the chip's title + an sr-only span instead. On the
              label row it is the one part that can starve the tile's own name:
              a 260px tile with "↘ 0.1% vs last month" beside it truncated
              "Fuel Dispensed" to "Fuel Dis…". The label is the tile's identity
              and outranks a comparison caption. */}
          <TrendIndicator size="sm" {...trend} note={undefined} />
          {trend.note ? <span className="sr-only">{` ${trend.note}`}</span> : null}
        </span>
      </div>
    ) : (
      labelText
    )

    return (
      <div
        ref={ref}
        data-slot="kpi-tile"
        data-layout={layout}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? onClick : undefined}
        onKeyDown={clickable ? handleKeyDown : undefined}
        className={cn(
          'flex items-start gap-3 rounded-md border border-border bg-card p-4',
          clickable &&
            'cursor-pointer outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        {...props}
      >
        {Icon ? (
          <IconBadge
            icon={Icon}
            tone={tone ?? 'primary'}
            shape={iconShape ?? 'circle'}
            size={isStat ? 'lg' : 'md'}
            style={iconStyle}
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* Label above value in BOTH layouts (round-1 QA B1) — kept as two
              explicit slots so a future layout needing the opposite order has
              a branch to add back. */}
          {labelRow}
          {valueRow}
          {description ? (
            <span className="text-body-xs text-muted-foreground">{description}</span>
          ) : null}
        </div>
      </div>
    )
  },
)

KpiTile.displayName = 'KpiTile'
