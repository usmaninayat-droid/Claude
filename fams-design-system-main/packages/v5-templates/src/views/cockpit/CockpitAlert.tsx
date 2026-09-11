import { AlertTriangle, Info } from '@fams/ui-kit/icons'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { CockpitBannerTone, CockpitConfig } from './cockpit-model'

/**
 * CockpitAlert — the cockpit's single tinted status banner, derived from the
 * module's own `uiConfig.cockpit.alert` block. Extracted from `CockpitView`
 * (rule 12) as a pure presentational strip: it owns no state and reads nothing
 * but its config block.
 */

const ALERT_TONES: Record<CockpitBannerTone, string> = {
  danger: 'border-destructive/20 bg-destructive/6 text-error-700',
  warning: 'border-warning/20 bg-warning/6 text-warning-scale-700',
  info: 'border-info/20 bg-info/6 text-info-scale-700',
}

/** The countdown is the banner's own DEADLINE, not decoration. On the tinted
 *  banner `text-muted-foreground` measured 4.17:1 — the last sub-4.5:1 text on
 *  the screen (UX L.58 finding 8). It now inherits the banner's own tone
 *  foreground, the same token the message uses (measured 5.8–8.2:1). */
const ALERT_COUNTDOWN_TONES: Record<CockpitBannerTone, string> = {
  danger: 'text-error-700',
  warning: 'text-warning-scale-700',
  info: 'text-info-scale-700',
}

const ALERT_CHIP_TONES: Record<CockpitBannerTone, string> = {
  danger: 'bg-destructive/12 text-destructive',
  warning: 'bg-warning/12 text-warning-scale-700',
  info: 'bg-info/12 text-info-scale-700',
}

/** Bold the leading count in an alert message ("**3** routes at risk…"). */
export function boldCount(text: string): ReactNode {
  const match = /\d+/.exec(text)
  if (!match) return text
  const start = match.index
  const end = start + match[0].length
  return (
    <>
      {text.slice(0, start)}
      <strong className="font-bold">{match[0]}</strong>
      {text.slice(end)}
    </>
  )
}

export interface CockpitAlertProps {
  alert: NonNullable<CockpitConfig['alert']>
}

export function CockpitAlert({ alert }: CockpitAlertProps) {
  const tone: CockpitBannerTone = alert.tone ?? 'danger'
  const Icon = tone === 'info' ? Info : AlertTriangle
  return (
    <div
      data-slot="cockpit-alert"
      role="status"
      className={cn(
        'flex min-h-11 flex-none items-center gap-2 rounded-md border px-3.5 py-2.5 text-body-sm',
        ALERT_TONES[tone],
      )}
    >
      <span
        aria-hidden="true"
        className={cn('flex size-6 flex-none items-center justify-center rounded-sm', ALERT_CHIP_TONES[tone])}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{boldCount(alert.text)}</span>
      {alert.countdown ? (
        <span className={cn('flex-none text-caption font-medium', ALERT_COUNTDOWN_TONES[tone])}>
          {alert.countdown}
        </span>
      ) : null}
    </div>
  )
}

CockpitAlert.displayName = 'CockpitAlert'
