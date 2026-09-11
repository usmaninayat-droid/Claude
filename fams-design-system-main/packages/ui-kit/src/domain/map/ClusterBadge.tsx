import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import type { VehicleStatusTone } from './VehiclePopupCard'

/**
 * ClusterBadge — the segmented map-cluster badge from the Live Monitoring
 * Figma (component set 551:8483/8492/8501/8510): a dark center circle with a
 * white count, wrapped in a donut ring whose arc segments are proportional to
 * the cluster's status mix (moving/idling/stopped/…).
 *
 * Four size tiers by count magnitude (the Figma component set):
 *
 *   | tier | outer | inner | count range        |
 *   |------|-------|-------|--------------------|
 *   | 0    | 32px  | 24px  | up to 99           |
 *   | 1    | 40px  | 30px  | up to 999          |
 *   | 2    | 48px  | 36px  | up to 9,999        |
 *   | 3    | 56px  | 42px  | 10,000 and beyond  |
 *
 * Counts are comma-formatted from tier 2 up (`formatClusterCount`). The badge
 * is NON-interactive by design — the map layer that places it owns the click
 * target (a wrapping `<button>` with the expand-cluster behavior), which keeps
 * this a pure visual and avoids nested-interactive a11y traps.
 *
 * Marker/cluster geometry note (DoD carve-out): the four outer/inner pixel
 * tiers are Figma component-set geometry that no spacing token expresses —
 * they live here as component-scoped constants, fed to SVG attributes and
 * inline sizes (never `[Npx]` utility classes). Colors are 100% tokens.
 */

export type ClusterBadgeSize = 32 | 40 | 48 | 56

export interface ClusterBadgeSegment {
  /** Status tone for the arc — the same tone vocabulary as `VehicleMarker`. */
  tone: VehicleStatusTone
  /** How many of the cluster's members carry this tone. */
  count: number
  /**
   * Word for this tone in the badge's accessible name (e.g. "moving",
   * "non-reporting"). Caller-supplied so the design system carries no status
   * vocabulary of its own; falls back to the tone name.
   */
  label?: string
}

export interface ClusterBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Total members in the cluster — drives the size tier + the label. */
  count: number
  /** Status mix, rendered as proportional ring arcs (clockwise from 12
   *  o'clock). Omit (or pass zero-count segments) for a plain muted ring. */
  segments?: ClusterBadgeSegment[]
  /** Explicit size override; defaults to the tier `count` falls in. */
  size?: ClusterBadgeSize
}

/** Figma tier geometry: outer diameter → inner (count circle) diameter. */
const INNER: Record<ClusterBadgeSize, number> = { 32: 24, 40: 30, 48: 36, 56: 42 }
/** Count typography per tier (Figma: 10/12/14/16px bold). */
const FONT_REM: Record<ClusterBadgeSize, string> = {
  32: '0.625rem',
  40: '0.75rem',
  48: '0.875rem',
  56: '1rem',
}

/** Ring segment tones. NOTE (SPEC §1, pixel-verified): the cluster ring's
 *  orange is warning-**500** (`--color-warning`), deliberately unlike the
 *  single marker's idle ring, which reads warning-**600** — don't "unify".
 *  `muted` (Non-Reporting) is grey-400 per finding #33 — it is never DRAWN as
 *  an arc (see `ARC_TONES`), but the entry keeps the record complete. */
const TONE_STROKE: Record<VehicleStatusTone, string> = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-destructive)',
  muted: 'var(--color-gray-400)',
}

/**
 * The ring draws EXACTLY three arcs — moving / idling / stopped (SPEC §1's
 * `#12B76A / #F79009 / #F04438`). Round 1 shipped a fourth, contiguous grey
 * non-reporting arc that the Figma component set (551:8501) does not have
 * (visual finding #34). Non-reporting members still count toward `count` and
 * still appear in the accessible name — they simply get no arc.
 */
const ARC_TONES: readonly VehicleStatusTone[] = ['success', 'warning', 'error']

/**
 * Gap between arcs, in `pathLength` units (the ring is normalised to 100 —
 * so 2 ≈ 7°). Figma separates the three segments rather than butting them
 * together; half a gap comes off each end of every arc so the gaps read
 * evenly, and the gaps are TRANSPARENT (no grey track behind them) — a grey
 * arc under the gaps is precisely the fourth segment finding #34 removed.
 */
const ARC_GAP = 2

/** Size tier for a member count — the 99 / 999 / 9,999 / 99,999 ladder. */
export function clusterBadgeTier(count: number): ClusterBadgeSize {
  if (count <= 99) return 32
  if (count <= 999) return 40
  if (count <= 9999) return 48
  return 56
}

/** Comma-grouped count label ("10,000") — grouping kicks in past 999,
 *  matching the Figma's "9,999 comma-formatted" tier note. */
export function formatClusterCount(count: number): string {
  return count.toLocaleString('en-US')
}

export const ClusterBadge = forwardRef<HTMLSpanElement, ClusterBadgeProps>(
  ({ count, segments = [], size, className, ...props }, ref) => {
    const outer = size ?? clusterBadgeTier(count)
    const inner = INNER[outer]
    const ringWidth = (outer - inner) / 2
    const radius = (outer - ringWidth) / 2

    /* Arcs are proportional to the ARC-BEARING members only, so removing the
       non-reporting arc does not leave a hole the base ring shows through. */
    const arcs = segments.filter((s) => s.count > 0 && ARC_TONES.includes(s.tone))
    const total = arcs.reduce((sum, s) => sum + s.count, 0)
    let consumed = 0

    /* The ring no longer draws a non-reporting arc (finding #34), so the FULL
       mix — non-reporting included — must stay reachable in text. Opt-in: the
       badge appends the mix only when segments carry an explicit `label`, so a
       map layer that already spells the mix out on its own click target (the
       usual case) is not made to announce it twice. */
    const labelled = segments.filter((s) => s.count > 0 && s.label)
    const mix = labelled.map((s) => `${s.count} ${s.label}`).join(', ')
    const ariaLabel = mix
      ? `Cluster of ${formatClusterCount(count)}: ${mix}`
      : `Cluster of ${formatClusterCount(count)}`

    return (
      <span
        ref={ref}
        data-slot="cluster-badge"
        role="img"
        aria-label={ariaLabel}
        className={cn('relative inline-grid place-items-center', className)}
        style={{ width: outer, height: outer }}
        {...props}
      >
        <svg
          viewBox={`0 0 ${outer} ${outer}`}
          width={outer}
          height={outer}
          aria-hidden="true"
          className="absolute inset-0 -rotate-90"
        >
          {/* Base ring — ONLY when there is no status mix to draw. With arcs
              present the gaps stay transparent (see `ARC_GAP`). */}
          {total === 0 ? (
            <circle
              cx={outer / 2}
              cy={outer / 2}
              r={radius}
              fill="none"
              stroke="var(--color-gray-400)"
              strokeWidth={ringWidth}
            />
          ) : null}
          {total > 0
            ? arcs.map((s, i) => {
                const share = (s.count / total) * 100
                const offset = -(consumed / total) * 100
                consumed += s.count
                // Take the gap off the arc, half at each end, so consecutive
                // arcs are SEPARATED rather than contiguous (finding #34).
                const drawn = Math.max(share - ARC_GAP, 0)
                return (
                  <circle
                    key={`${s.tone}-${i}`}
                    cx={outer / 2}
                    cy={outer / 2}
                    r={radius}
                    fill="none"
                    stroke={TONE_STROKE[s.tone]}
                    strokeWidth={ringWidth}
                    pathLength={100}
                    strokeDasharray={`${drawn} ${100 - drawn}`}
                    strokeDashoffset={offset - ARC_GAP / 2}
                    data-tone={s.tone}
                  />
                )
              })
            : null}
        </svg>
        {/* Count circle — dark coin, white-on-dark count in both themes. */}
        <span
          className="relative grid place-items-center rounded-full bg-foreground font-bold leading-none text-background"
          style={{ width: inner, height: inner, fontSize: FONT_REM[outer] }}
        >
          {formatClusterCount(count)}
        </span>
      </span>
    )
  },
)

ClusterBadge.displayName = 'ClusterBadge'
