import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { StatBar } from './StatBar'
import type { TableCellVariant } from './TableCell.types'

/**
 * `TableCell`'s `kind="progress"` renderer — split out from
 * `TableCellRenderers.tsx` (same decomposition convention that file's own
 * doc comment describes; this kind grew a caption + empty state + tone,
 * which would have pushed that file past its soft budget).
 *
 * Composes `StatBar` (itself a `Progress` wrapper) for the bar + percentage
 * — never a bespoke bar reimplementation — and adds only the cell-specific
 * pieces `StatBar` doesn't own: the `value / target unit` caption line and
 * the explicit empty state. `Progress` (the grandfathered Radix primitive)
 * is never imported directly and never touched.
 */

type ProgressVariant = Extract<TableCellVariant, { kind: 'progress' }>

function toFiniteNumber(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined
}

/** `toLocaleString()` — same default formatter convention as `CompareBars`/`AreaChart`/`BarChart`/`LineChart`. */
function formatQuantity(n: number): string {
  return n.toLocaleString('en-US')
}

function renderEmptyProgress(size: 'sm' | 'md'): ReactNode {
  return (
    <div className="flex w-full items-center gap-2" data-slot="table-cell-progress-empty">
      <div
        aria-hidden="true"
        data-slot="table-cell-progress-empty-track"
        className={cn('min-w-12 flex-1 rounded-full bg-muted', size === 'md' ? 'h-2' : 'h-1.5')}
      />
      <span className="shrink-0 text-body-xs tabular-nums text-muted-foreground">–</span>
    </div>
  )
}

export function renderProgressCell(props: ProgressVariant): ReactNode {
  const { value, target, unit, tone = 'primary', size = 'sm', showValue = true } = props
  const current = toFiniteNumber(value)

  // Explicit empty state (rule 10 / spec §1.2): a rule that doesn't track
  // this measure gets a grey track and a dash, never a bar that clamps a
  // non-numeric reading to 0 and quietly claims "0% complete".
  if (current == null) {
    return renderEmptyProgress(size)
  }

  const hasTarget = typeof target === 'number' && Number.isFinite(target) && target > 0
  const percent = hasTarget ? (current / (target as number)) * 100 : current
  const clamped = Math.min(100, Math.max(0, percent))
  const roundedPercent = Math.round(clamped)
  const caption = hasTarget
    ? `${formatQuantity(current)} / ${formatQuantity(target as number)}${unit ? ` ${unit}` : ''}`
    : undefined

  return (
    <div className="flex w-full flex-col gap-1" data-slot="table-cell-progress">
      <StatBar
        compact
        percent={clamped}
        value={showValue ? `${roundedPercent}%` : undefined}
        tone={tone}
        size={size}
        aria-label={caption ?? `${roundedPercent}%`}
        className="w-full"
      />
      {caption ? (
        <span
          data-slot="table-cell-progress-caption"
          className="truncate text-body-xs tabular-nums text-muted-foreground"
        >
          {caption}
        </span>
      ) : null}
    </div>
  )
}
