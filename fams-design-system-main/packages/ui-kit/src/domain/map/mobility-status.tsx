import type { ReactNode } from 'react'
import { Lock, MapPin, Pause, Play, Square, X } from '../../icons'

/**
 * mobility-status — the canonical live-monitoring mobility-status taxonomy
 * (designer asset drop `assets/icons/status/{idle,immobilized,moving,
 * non-moving,non-reporting,stopped}.svg`, commit `ee2f205`): SIX statuses,
 * each with one fixed color + glyph. This is the SINGLE source of truth for
 * that status → color/glyph mapping — `MapStatusMarker`'s badge coin reads it
 * directly, and any future standalone status chip/badge (live-monitoring
 * listing/table, map detail popup) should read it too rather than hand-roll a
 * second copy. Glyphs are the lucide equivalents of the designer's badge
 * icons (pause bars / lock / play / pin / x / square) — `@fams/icons` doesn't
 * exist yet to consume the raw asset SVGs directly from a compiled package.
 */

export type MobilityStatus = 'idle' | 'immobilized' | 'moving' | 'non-moving' | 'non-reporting' | 'stopped'

export interface MobilityStatusStyle {
  /** Border/text color class (e.g. for a ring or icon-only treatment). */
  border: string
  /** Solid-fill background color class (badge coin, chip, dot). */
  bg: string
  /** Tint (light) background color class — status-tinted surfaces. */
  tint: string
  /** Badge/chip glyph. */
  icon: ReactNode
  /** Display label. */
  label: string
}

export const MOBILITY_STATUSES: MobilityStatus[] = [
  'moving',
  'idle',
  'stopped',
  'non-moving',
  'non-reporting',
  'immobilized',
]

/**
 * Canonical color hexes (for reference — always consumed via the token
 * classes below, never as raw hex in a component):
 *   moving        #12b76a  success-500
 *   idle          #f79009  warning-500
 *   stopped       #f04438  error-500
 *   non-moving    #0072d6  info-500 / brand
 *   non-reporting #667085  gray-500
 *   immobilized   #b42318  error-700
 */
export const MOBILITY_STATUS_STYLES: Record<MobilityStatus, MobilityStatusStyle> = {
  moving: {
    border: 'border-success-scale-500',
    bg: 'bg-success-scale-500',
    tint: 'bg-success-scale-50',
    icon: <Play className="size-full fill-current" strokeWidth={0} />,
    label: 'Moving',
  },
  idle: {
    border: 'border-warning-scale-500',
    bg: 'bg-warning-scale-500',
    tint: 'bg-warning-scale-50',
    icon: <Pause className="size-full fill-current" strokeWidth={0} />,
    label: 'Idle',
  },
  stopped: {
    border: 'border-error-500',
    bg: 'bg-error-500',
    tint: 'bg-error-50',
    icon: <Square className="size-full fill-current" strokeWidth={0} />,
    label: 'Stopped',
  },
  'non-moving': {
    border: 'border-info-scale-500',
    bg: 'bg-info-scale-500',
    tint: 'bg-info-scale-50',
    icon: <MapPin className="size-full fill-current" strokeWidth={0} />,
    label: 'Non-moving',
  },
  'non-reporting': {
    border: 'border-gray-500',
    bg: 'bg-gray-500',
    tint: 'bg-gray-200',
    icon: <X className="size-full" strokeWidth={2.5} />,
    label: 'Non-reporting',
  },
  immobilized: {
    border: 'border-error-700',
    bg: 'bg-error-700',
    tint: 'bg-error-100',
    icon: <Lock className="size-full fill-current" strokeWidth={0} />,
    label: 'Immobilized',
  },
}

/** Convenience label map, e.g. for aria-labels/captions. */
export const MOBILITY_STATUS_LABELS: Record<MobilityStatus, string> = Object.fromEntries(
  MOBILITY_STATUSES.map((s) => [s, MOBILITY_STATUS_STYLES[s].label]),
) as Record<MobilityStatus, string>
