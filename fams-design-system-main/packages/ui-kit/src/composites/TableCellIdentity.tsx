import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { EMPTY_VALUE, isEmptyValue } from './TableCellRenderers'
import type { TableCellActivityTone, TableCellVariant } from './TableCell.types'

/**
 * The three **product-list row anatomies** — split out of
 * `TableCellRenderers.tsx` (rule 12; same convention as
 * `TableCellProgress.tsx`) and re-exported from it, so `TableCell.tsx`'s
 * import list is one module wider and nothing else moves.
 *
 * WHY THESE EXIST (2026-09-07 list-table run): every FAMS list module's row
 * is built from the same three shapes — a media+name identity cell, an
 * icon-prefixed value, and a strip of icon+count metrics. All three had been
 * hand-rolled ABOVE the core tier (`@fams/v5-templates`' live-list cells and
 * `@fams/v5-composer`'s `Vehicle3DView`/`ActivityOverviewView` read
 * renderers), which meant a designer or app reaching for `ui-kit`'s
 * `DataTable`/`TableCell` alone could not reproduce the product's own list
 * look — the closest kind, `avatar`, hardcodes the circular `Avatar`
 * primitive and cannot carry any other media. The GENERIC half now lives
 * here; the v5 tier keeps only the blueprint/field-registry plumbing that
 * decides WHICH media and WHICH metrics a module shows.
 *
 * Business-neutral by construction (rule 10): `media` is an opaque
 * `ReactNode` slot (a `VehicleIcon3D`, an `Avatar`, a thumbnail `img`, a
 * tenant logo — this file never knows), `icon` likewise, and a metric's
 * colour comes from the same closed `TableCellActivityTone` enum
 * `kind="activity"` already uses — never a raw hex, never a status string.
 */

type Variant<K extends TableCellVariant['kind']> = Extract<TableCellVariant, { kind: K }>

/**
 * Metric-glyph tone → token text class. Deliberately a FILL colour for a
 * 12px glyph, not for running text — the count itself always renders in
 * `text-foreground`, so `text-destructive`/`text-warning`'s small-text
 * contrast never applies here.
 */
const METRIC_TONE_CLASSES: Record<TableCellActivityTone, string> = {
  neutral: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-info',
}

/**
 * Both text lines truncate, which needs `min-w-0` AND `max-w-full` on the
 * shrinking child: a block host does not shrink an inline child, so
 * `min-w-0` alone leaves the cell overflowing its column (the same lesson
 * `v5-composer`'s icon-value renderers recorded the hard way).
 */
const SHRINK = 'min-w-0 max-w-full'

export function renderEntityCell(props: Variant<'entity'>): ReactNode {
  const { media, label, secondary } = props
  if (!media && isEmptyValue(label) && isEmptyValue(secondary)) return EMPTY_VALUE
  return (
    // `min-h` pins the row rhythm to the media box (a 29-31px list thumb)
    // rather than to the text, so a media-less row in the same table keeps
    // the identical height instead of collapsing.
    <span className={cn('flex min-h-[1.9375rem] items-center gap-2.5', SHRINK)}>
      {media ? (
        <span data-slot="table-cell-media" className="flex shrink-0 items-center">
          {media}
        </span>
      ) : null}
      {isEmptyValue(label) && isEmptyValue(secondary) ? null : (
        <span className={cn('flex flex-col justify-center', SHRINK)}>
          {isEmptyValue(label) ? null : (
            <span className={cn('truncate text-caption font-medium text-foreground', SHRINK)}>{label}</span>
          )}
          {isEmptyValue(secondary) ? null : (
            <span className={cn('truncate text-caption text-muted-foreground', SHRINK)}>{secondary}</span>
          )}
        </span>
      )}
    </span>
  )
}

export function renderIconValueCell(props: Variant<'icon-value'>): ReactNode {
  const { icon, value, iconLabel } = props
  if (isEmptyValue(value)) return EMPTY_VALUE
  return (
    <span className={cn('flex items-center gap-1.5', SHRINK)}>
      {icon ? (
        <span
          aria-hidden="true"
          className="flex shrink-0 items-center text-muted-foreground [&_svg]:size-3.5"
        >
          {icon}
        </span>
      ) : null}
      {/* The glyph's MEANING for assistive tech — a bare pin/clock icon is
          silent to a screen reader, so the caller's `iconLabel` prefixes the
          value in the accessibility tree only. */}
      {iconLabel ? <span className="sr-only">{iconLabel}: </span> : null}
      <span className={cn('truncate text-caption text-foreground', SHRINK)}>{value}</span>
    </span>
  )
}

export function renderMetricsCell(props: Variant<'metrics'>): ReactNode {
  const { metrics } = props
  if (metrics.length === 0) return EMPTY_VALUE
  return (
    // 4px between groups, 2px inside one group — a 12px glyph then the count
    // at 12px medium in base black.
    <span data-slot="table-cell-metrics" className="flex flex-wrap items-center gap-1">
      {metrics.map((metric) => (
        <span key={metric.id} className="flex items-center gap-0.5" title={metric.label ?? undefined}>
          {metric.icon ? (
            <span
              aria-hidden="true"
              className={cn(
                'flex shrink-0 items-center [&_svg]:size-3',
                METRIC_TONE_CLASSES[metric.tone ?? 'neutral'],
              )}
            >
              {metric.icon}
            </span>
          ) : null}
          {/* A number with no name is meaningless read aloud. */}
          {metric.label ? <span className="sr-only">{metric.label}: </span> : null}
          <span className="text-caption font-medium tabular-nums text-foreground">
            {isEmptyValue(metric.value) ? '–' : metric.value}
          </span>
        </span>
      ))}
    </span>
  )
}
