import { forwardRef, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import type { LucideIcon } from '../icons'
import { cn } from '../lib/cn'
import { Card } from './Card'
import { IconBadge, type IconBadgeTone } from '../primitives/IconBadge'

/**
 * ConnectionStatusCard — compact device/connection status readout. [L3 composite]
 *
 * Generalizes the reference design system's telematics-specific "Reporting /
 * Not Reporting" card into a domain-neutral `online | offline | pending`
 * status (Rule 10 — no business vocabulary in shared props): the caller
 * supplies the visible `statusLabel` and the `label` caption identifying
 * *what* is being monitored ("GPS", "Camera", "Device", …) — this component
 * owns only the status dot, its pulse-on-pending affordance, and the layout.
 * Built on `Card` + `IconBadge`, not re-implemented.
 *
 * State-agnostic (Rule 8): `status` is a controlled prop, never polled here —
 * the caller's hook/subscription re-renders this component as connection
 * state changes. `onClick` is a callback only (e.g. opening a device detail
 * drawer); no fetch, store, or routing lives in this component.
 *
 * @usage-v5
 *   No dedicated connection-status widget exists in v5 today. `device_status`
 *   is a plain form field/table column, repeated (not shared) across:
 *   - iwmp/templates/profile/AssetVehicleProfile.vue (device_status column,
 *     ×2 tab tables) — byte-similar copies also in fams/, ead/
 *   - iwmp/templates/profile/WorkforceDriverProfile.vue (device_status column, ×2)
 *   - iwmp/templates/profile/DeviceSimProfile.vue (device_status column)
 *   - iwmp/components/tabs/panels/asset/vehicle/DeviceDetails.vue (plain edit field)
 *   GPS/telematics connectivity drives ~50% of IWMP support tickets (per
 *   project tracking) yet has no shared visual affordance — this ports ahead
 *   of demand, generalized from the reference's telematics-specific card.
 *   Forms needed: status dot + pulse-on-pending, optional icon/subtitle/timestamp,
 *   clickable.
 * @usage-index connection-status-card
 */
export type ConnectionStatus = 'online' | 'offline' | 'pending'

const STATUS_DOT_CLASSES: Record<ConnectionStatus, string> = {
  online: 'bg-success',
  offline: 'bg-destructive',
  pending: 'bg-warning',
}

// fix7 wave 6, P2 sweep: all three FILL tokens (`text-success`/`text-destructive`/
// `text-warning`) measure below WCAG AA 4.5:1 as text on the card's white/
// `dark.card` surface — the visible `statusLabel` reads directly in this
// color. Moved to the sanctioned accessible TEXT aliases (the dot above
// keeps the drawn fill hex; only this readable label moved).
const STATUS_TEXT_CLASSES: Record<ConnectionStatus, string> = {
  online: 'text-success-text',
  offline: 'text-destructive-emphasis',
  pending: 'text-warning-text',
}

/** Generic fallback text — not domain jargon, just the enum spelled out. Override via `statusLabel` for anything more specific. */
const STATUS_LABEL: Record<ConnectionStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  pending: 'Pending',
}

export interface ConnectionStatusCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  /** Connection state. Drives the dot color and, on `pending`, its pulse. */
  status: ConnectionStatus
  /** Visible status text. Defaults to a generic label derived from `status` — the caller supplies anything more specific ("Connected", "Last seen 3m ago"). */
  statusLabel?: ReactNode
  /** Caption identifying what is being monitored (e.g. "GPS", "Camera", "Device"). Omit to hide the caption row. */
  label?: ReactNode
  /** Leading icon, rendered inside an `IconBadge`. Omit for a card with no icon. */
  icon?: LucideIcon
  /** Tint passed to the `IconBadge`. Independent of `status` — this tints the subject's icon, not the status itself. Default `'neutral'`. */
  iconTone?: IconBadgeTone
  /** Secondary line below the status (e.g. device ID, coordinates). */
  subtitle?: ReactNode
  /** Right-aligned, pre-formatted timestamp/metadata (e.g. "Last 5 min ago"). */
  timestamp?: ReactNode
  /** Makes the whole card a keyboard-operable button (role="button", Enter/Space). */
  onClick?: () => void
}

export const ConnectionStatusCard = forwardRef<HTMLDivElement, ConnectionStatusCardProps>(
  (
    {
      className,
      status,
      statusLabel,
      label,
      icon: Icon,
      iconTone = 'neutral',
      subtitle,
      timestamp,
      onClick,
      ...props
    },
    ref,
  ) => {
    const clickable = Boolean(onClick)

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (!onClick) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onClick()
      }
    }

    return (
      <Card
        ref={ref}
        data-slot="connection-status-card"
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? onClick : undefined}
        onKeyDown={clickable ? handleKeyDown : undefined}
        className={cn(
          'flex items-center gap-3 p-3',
          clickable &&
            'cursor-pointer outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        {...props}
      >
        {Icon ? <IconBadge icon={Icon} tone={iconTone} size="md" /> : null}
        <div className="flex min-w-0 flex-1 flex-col">
          {label ? (
            <span
              data-slot="connection-status-card-label"
              className="text-caption font-medium text-muted-foreground"
            >
              {label}
            </span>
          ) : null}
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              data-slot="connection-status-dot"
              className={cn(
                'inline-flex size-2 shrink-0 rounded-full',
                STATUS_DOT_CLASSES[status],
                status === 'pending' && 'animate-pulse',
              )}
            />
            <span
              data-slot="connection-status-card-status-label"
              className={cn('text-body-sm font-semibold', STATUS_TEXT_CLASSES[status])}
            >
              {statusLabel ?? STATUS_LABEL[status]}
            </span>
          </div>
          {subtitle ? (
            <span
              data-slot="connection-status-card-subtitle"
              className="mt-0.5 truncate text-caption text-muted-foreground"
            >
              {subtitle}
            </span>
          ) : null}
        </div>
        {timestamp ? (
          <span
            data-slot="connection-status-card-timestamp"
            className="shrink-0 text-caption text-muted-foreground"
          >
            {timestamp}
          </span>
        ) : null}
      </Card>
    )
  },
)

ConnectionStatusCard.displayName = 'ConnectionStatusCard'
