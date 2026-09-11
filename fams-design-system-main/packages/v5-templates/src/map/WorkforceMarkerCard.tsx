import { Badge, type BadgeVariant } from '@fams/ui-kit'
import { CreditCard, MapPin, X } from '@fams/ui-kit/icons'
import type { LiveWorkforceDatum, LiveWorkforceStatus } from './live-types'
import { LIVE_WORKFORCE_STATUS_LABEL } from './live-types'
import { WORKFORCE_AVATAR_ART, WORKFORCE_AVATAR_ART_H, WORKFORCE_AVATAR_ART_W } from './workforce-icon-art'

/**
 * Status → `Badge` variant. Unlike the shared `VehicleStatusTone` vocabulary
 * (success/warning/error/muted, no blue), `Badge`'s own `variant` union
 * already carries a real `'info'` (`--color-info` = `#0072d6`, the SAME hex
 * the vendored `in-transit` art bakes in) — so this card gets the exact
 * reference blue without any tone-vocabulary workaround.
 */
const STATUS_BADGE_VARIANT: Record<LiveWorkforceStatus, BadgeVariant> = {
  'on-duty': 'success',
  'on-break': 'warning',
  'in-transit': 'info',
  'clocked-in': 'info',
  'not-clocked-in': 'muted',
}

/**
 * WorkforceMarkerCard — the workforce marker's click detail (task §7: "a
 * simple existing-pattern detail... reuse PersonView/entity sheet if wired,
 * else marker tooltip — don't invent a new sheet"). No `PersonView` entity
 * sheet is wired anywhere in this codebase (confirmed absent), so this is
 * the marker-tooltip fallback the task explicitly names — a compact card
 * built from an existing DS primitive (`Badge`) plus the vendored avatar
 * art, NOT the full
 * `VehiclePopupCard` tab/fields-grid machinery `LiveVehiclePopup` uses. Kept
 * deliberately small (task's pragmatic-wiring scope call, requirement §5).
 *
 * Mounted the same way `LiveVehiclePopup` is — `LiveMapView`'s
 * `renderMarkerPopup`, `MapPanel`'s chrome-less popup slot (`popupChrome=
 * false`), so this card supplies its own shadow/border/radius.
 */
export interface WorkforceMarkerCardProps {
  member: LiveWorkforceDatum
  onClose?: () => void
}

const LOCATION_ICON_LABEL: Record<NonNullable<LiveWorkforceDatum['locationKind']>, string> = {
  plain: 'Address',
  zone: 'Zone',
  poi: 'Point of interest',
}

export function WorkforceMarkerCard({ member, onClose }: WorkforceMarkerCardProps) {
  const locationKind = member.locationKind ?? 'plain'
  return (
    <div
      role="dialog"
      aria-label={member.name}
      data-slot="workforce-marker-card"
      className="w-72 rounded-xl border border-border bg-card p-4 shadow-lg"
    >
      <div className="flex items-start gap-3">
        {/* The illustrated avatar art already carries its own circular
            framing + baked-in status dot (`workforce-icon-art.ts`) — rendered
            at its native aspect ratio, the same "don't crop the 3D art"
            approach `VehicleIcon3D` takes, not the generic `Avatar`
            primitive's square-photo `object-cover` crop. */}
        <img
          src={WORKFORCE_AVATAR_ART[member.status]}
          width={WORKFORCE_AVATAR_ART_W}
          height={WORKFORCE_AVATAR_ART_H}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="block shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-md font-semibold text-foreground">{member.name}</p>
          {member.designation ? (
            <p className="truncate text-caption text-muted-foreground">{member.designation}</p>
          ) : null}
        </div>
        {onClose ? (
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-me-1 -mt-1 flex size-6 shrink-0 items-center justify-center rounded-xs text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="mt-3">
        <Badge variant={STATUS_BADGE_VARIANT[member.status]}>{LIVE_WORKFORCE_STATUS_LABEL[member.status]}</Badge>
      </div>

      <dl className="mt-3 flex flex-col gap-2 text-caption">
        {member.employeeId ? (
          <div className="flex items-center gap-2 text-foreground">
            <CreditCard className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <dt className="sr-only">Employee ID</dt>
            <dd>{member.employeeId}</dd>
          </div>
        ) : null}
        {member.locationLabel ? (
          <div className="flex items-center gap-2 text-foreground">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <dt className="sr-only">{LOCATION_ICON_LABEL[locationKind]}</dt>
            <dd className="truncate" title={member.locationLabel}>
              {member.locationLabel}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

WorkforceMarkerCard.displayName = 'WorkforceMarkerCard'
