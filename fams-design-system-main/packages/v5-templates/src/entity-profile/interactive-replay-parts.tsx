import type { ReactNode } from 'react'
import { ArrowUp, Copy } from '@fams/ui-kit/icons'
import { IconBadge } from '@fams/ui-kit'
import { cn } from '../lib/cn'
import { resolveNamedIcon } from './overview-widget-parts'
import type { InteractiveReplayBand, InteractiveReplayPoint, InteractiveReplaySeries, InteractiveReplayStat } from './InteractiveReplay.types'

/**
 * `InteractiveReplay`'s smaller pieces — stat chips, the checkbox legend, the
 * band strip and the hover/scrub tooltip — split out purely for the ~300-line
 * file budget (root `CLAUDE.md` rule 12). No state lives here; every piece is
 * a pure presenter driven by props the parent already derived.
 */

/* ── stat chips ─────────────────────────────────────────────────────────── */
export function ReplayStatChip({ stat }: { stat: InteractiveReplayStat }) {
  const Icon = resolveNamedIcon(stat.icon)
  return (
    <div data-slot="replay-stat" className="flex min-w-0 items-center gap-inline rounded-md border border-border bg-card p-inline">
      <IconBadge icon={Icon} tone="primary" size="md" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-body-sm text-muted-foreground">{stat.label}</span>
        <span className="truncate text-body-md font-semibold text-foreground">{stat.value}</span>
      </div>
    </div>
  )
}

/* ── legend (real checkboxes — toggling which series plot) ────────────────
 * A native `input[type=checkbox]` per series, not `ChartLegend`'s toggle
 * BUTTON: the frame's affordance reads as a checkbox list and a native input
 * keeps it keyboard-operable with zero bespoke ARIA wiring (root CLAUDE.md
 * rule 9 — Base UI/native primitives, not hand-rolled semantics). */
export function ReplayLegend({
  series,
  hiddenKeys,
  onToggle,
  bandTypes,
  hiddenBandTypes,
  onToggleBandType,
}: {
  series: InteractiveReplaySeries[]
  hiddenKeys: string[]
  onToggle: (key: string) => void
  /** Unique band `type`s, folded into the SAME row of checkboxes (frame's
   *  "Overspeeding"/"Idling" — a round swatch, vs a series' square one). */
  bandTypes?: InteractiveReplayBand[]
  hiddenBandTypes?: string[]
  onToggleBandType?: (type: string) => void
}) {
  return (
    <div data-slot="replay-legend" className="flex flex-wrap items-center gap-3">
      {series.map((s) => {
        const id = `replay-legend-${s.key}`
        const checked = !hiddenKeys.includes(s.key)
        return (
          <label key={s.key} htmlFor={id} className="flex min-h-11 items-center gap-1.5 text-body-sm text-foreground">
            <input
              id={id}
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(s.key)}
              className="size-4 shrink-0 rounded-xs border border-border accent-[var(--color-primary)]"
            />
            {s.label}
          </label>
        )
      })}
      {bandTypes?.map((band) => {
        const id = `replay-legend-band-${band.type}`
        const checked = !hiddenBandTypes?.includes(band.type)
        return (
          <label key={band.type} htmlFor={id} className="flex min-h-11 items-center gap-1.5 text-body-sm text-foreground">
            <input
              id={id}
              type="checkbox"
              checked={checked}
              onChange={() => onToggleBandType?.(band.type)}
              className="size-4 shrink-0 rounded-full border border-border accent-[var(--color-primary)]"
            />
            <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', BAND_TONE_CLASS[band.tone ?? 'neutral'])} />
            {band.label}
          </label>
        )
      })}
    </div>
  )
}

/* ── event-band strip — a labelled strip, never colour alone (UX gate D4) ── */
const BAND_TONE_CLASS: Record<NonNullable<InteractiveReplayBand['tone']>, string> = {
  danger: 'bg-destructive/70',
  warning: 'bg-warning/70',
  info: 'bg-info/70',
  neutral: 'bg-muted-foreground/50',
}

export function ReplayBandStrip({ bands, pointCount }: { bands: InteractiveReplayBand[]; pointCount: number }) {
  if (!bands.length || pointCount <= 1) return null
  return (
    <div data-slot="replay-band-strip" className="relative h-2 w-full overflow-hidden rounded-full bg-muted" role="presentation">
      {bands.map((band, index) => {
        const start = (Math.max(0, band.startIndex) / (pointCount - 1)) * 100
        const width = ((Math.min(pointCount - 1, band.endIndex) - Math.max(0, band.startIndex)) / (pointCount - 1)) * 100
        return (
          <span
            key={band.id ?? index}
            title={band.label}
            className={cn('absolute top-0 h-2', BAND_TONE_CLASS[band.tone ?? 'neutral'])}
            style={{ marginInlineStart: `${start}%`, width: `${Math.max(width, 0.5)}%` }}
          />
        )
      })}
    </div>
  )
}

/* ── status bar — ALWAYS visible readout for the cursor's current point
 * (v2 parity: v2's info strip stays mounted below the map at every playhead
 * position, not just on hover — a resting replay still shows "where/what"
 * for point 0). One divider-separated row: time, every visible series value
 * (generic — the frame's own "Speed"/"Temperature" are just series), then
 * OPTIONAL heading/ignition/address badges when the point carries them
 * (entity-agnostic: a stationary weather station's points have neither). */
export function ReplayStatusBar({
  point,
  series,
}: {
  point: InteractiveReplayPoint
  series: InteractiveReplaySeries[]
}) {
  const coords = point.lat != null && point.lng != null ? `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}` : undefined
  return (
    <div
      data-slot="replay-status-bar"
      role="status"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border bg-card px-inline py-2 text-body-sm"
    >
      <span className="font-semibold tabular-nums text-foreground">{point.time}</span>

      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-3">
          <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-body-xs text-muted-foreground">{s.label}</span>
            <span className="truncate font-semibold tabular-nums text-foreground">{String(point[s.key] ?? '—')}</span>
          </span>
        </span>
      ))}

      {point.heading != null ? (
        <span className="flex items-center gap-3">
          <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-body-xs text-muted-foreground">Heading</span>
            <span className="flex items-center gap-1.5 font-semibold tabular-nums text-foreground">
              <ArrowUp
                className="size-3 shrink-0 text-muted-foreground"
                aria-hidden="true"
                style={{ transform: `rotate(${point.heading}deg)` }}
              />
              {Math.round(point.heading)}°
            </span>
          </span>
        </span>
      ) : null}

      {point.ignitionOn != null ? (
        <span className="flex items-center gap-3">
          <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-body-xs text-muted-foreground">Ignition</span>
            <span
              className={cn(
                'flex items-center gap-1.5 font-semibold',
                point.ignitionOn ? 'text-success' : 'text-muted-foreground',
              )}
            >
              <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', point.ignitionOn ? 'bg-success' : 'bg-muted-foreground')} />
              {point.ignitionOn ? 'ON' : 'OFF'}
            </span>
          </span>
        </span>
      ) : null}

      {point.address ? (
        <span className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-body-xs text-muted-foreground">Address</span>
            <span className="truncate font-semibold text-foreground" title={point.address}>
              {point.address}
            </span>
          </span>
        </span>
      ) : null}

      {coords ? (
        <span className="ms-auto flex shrink-0 items-center gap-1.5 text-muted-foreground">
          <span>{coords}</span>
          <button
            type="button"
            aria-label="Copy coordinates"
            className="grid size-6 place-items-center rounded-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => navigator.clipboard?.writeText(coords)}
          >
            <Copy className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      ) : null}
    </div>
  )
}

/* ── control-row icon buttons (play/stop/zoom) ─────────────────────────── */
export function ReplayIconButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string
  onClick: () => void
  active?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'grid h-11 min-w-11 shrink-0 place-items-center rounded-sm border border-border px-2 text-muted-foreground transition-colors',
        'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active && 'border-primary bg-primary/10 text-primary',
      )}
    >
      {children}
    </button>
  )
}
