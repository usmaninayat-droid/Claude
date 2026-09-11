import { Car, LocateFixed, Maximize2, X } from '../../icons'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { VehiclePopupField, VehicleStatusTone } from './VehiclePopupCard'

/**
 * VehiclePopupParts — the presentational pieces of `VehiclePopupCard`: its
 * status tone maps, the inline meta glyphs, the header band, and the default
 * 3-column fields grid. Split out of the card (rule 12) so the card file owns
 * the card's geometry, overflow behaviour and tab machinery only.
 *
 * All internal to the card family — not exported from the package barrel.
 */

// fix7 wave 6, P2 sweep: success/warning/error were bare FILL tokens,
// failing AA as the readable status word — moved to the accessible TEXT
// aliases. The badge/tile maps below stay on the drawn fill hex (fills are
// out of this sweep's scope).
const TONE_TEXT: Record<VehicleStatusTone, string> = {
  success: 'text-success-text',
  warning: 'text-warning-text',
  error: 'text-destructive-emphasis',
  muted: 'text-muted-foreground',
}
const TONE_BADGE_BG: Record<VehicleStatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
  muted: 'bg-muted-foreground',
}
const TONE_TILE_BG: Record<VehicleStatusTone, string> = {
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  error: 'bg-destructive/10',
  muted: 'bg-muted',
}

/* Inline 14px sub-row glyphs (kept local so the card has zero icon-prop ceremony
   for its built-in meta row). Stroke uses currentColor → inherits muted tone. */
function TagGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7.5 7.5h.01M3 6v5.17a2 2 0 0 0 .59 1.42l8.83 8.83a2 2 0 0 0 2.83 0l4.34-4.34a2 2 0 0 0 0-2.83l-8.83-8.83A2 2 0 0 0 11.17 3H6a3 3 0 0 0-3 3Z" />
    </svg>
  )
}
function UserGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function PinGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
function CopyGlyph() {
  return (
    <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}

function SubItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1 text-sm font-semibold text-muted-foreground">
      <span className="grid size-3.5 shrink-0 place-items-center [&_svg]:size-3.5">{icon}</span>
      <span className="truncate">{text}</span>
    </span>
  )
}

export interface VehiclePopupHeaderProps {
  model: string
  plate: string
  driver: string
  location: string
  status: string
  statusTone: VehicleStatusTone
  statusSince?: string
  thumbnail?: ReactNode
  overflow?: ReactNode
  onLocate?: () => void
  onExpand?: () => void
  onClose?: () => void
}

/** Thumbnail · title · plate/driver/location · status · action trio. */
export function VehiclePopupHeader({
  model,
  plate,
  driver,
  location,
  status,
  statusTone,
  statusSince,
  thumbnail,
  overflow,
  onLocate,
  onExpand,
  onClose,
}: VehiclePopupHeaderProps) {
  return (
    <div className="flex flex-none items-start justify-between gap-3 border-b border-border px-4 pb-4 pt-6">
      <div className="flex min-w-0 items-start gap-3">
        {/* Thumbnail + status badge */}
        <div className="relative shrink-0">
          <div className={cn('grid size-[4.25rem] place-items-center rounded-md', TONE_TILE_BG[statusTone])}>
            {thumbnail ?? <Car className="size-9 text-foreground/70" strokeWidth={1.5} />}
          </div>
          <span
            className={cn(
              'absolute -bottom-1 -end-1 grid size-5 place-items-center rounded-full ring-2 ring-card',
              TONE_BADGE_BG[statusTone],
            )}
          >
            <span className="size-1.5 rounded-[0.0625rem] bg-white" />
          </span>
        </div>

        {/* Title · meta · status */}
        <div className="flex min-w-0 flex-col gap-1.5 pt-0.5">
          <p className="truncate text-2xl font-semibold text-foreground">{model}</p>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <SubItem icon={<TagGlyph />} text={plate} />
            <SubItem icon={<UserGlyph />} text={driver} />
            <SubItem icon={<PinGlyph />} text={location} />
          </div>
          <p className="text-sm">
            <span className={cn('font-medium', TONE_TEXT[statusTone])}>{status}</span>
            {statusSince ? (
              <span className="ms-1 font-semibold text-muted-foreground">{statusSince}</span>
            ) : null}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
        {overflow ? (
          <span data-slot="vehicle-popup-card-overflow" className="grid place-items-center">
            {overflow}
          </span>
        ) : null}
        <button
          type="button"
          aria-label="Center on vehicle"
          onClick={onLocate}
          className="grid size-4 place-items-center text-primary outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"
        >
          <LocateFixed />
        </button>
        <button
          type="button"
          aria-label="Expand details"
          onClick={onExpand}
          className="grid size-4 place-items-center outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"
        >
          <Maximize2 />
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="grid size-4 place-items-center outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"
        >
          <X />
        </button>
      </div>
    </div>
  )
}

/** The Overview default body: fields in row-major order, 3 per row. */
export function VehiclePopupFieldGrid({ fields }: { fields: VehiclePopupField[] }) {
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-7 pe-2">
      {fields.map((f, i) => (
        <div key={i} className="flex min-w-0 items-center gap-2">
          <span className="grid size-4 shrink-0 place-items-center text-muted-foreground [&_svg]:size-4">
            {f.icon}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">{f.label}</span>
            <span className="flex items-center gap-2 text-base font-semibold text-foreground">
              <span className="truncate">{f.value}</span>
              {f.onCopy ? (
                <button
                  type="button"
                  aria-label={`Copy ${f.label}`}
                  onClick={f.onCopy}
                  className="shrink-0 text-primary outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CopyGlyph />
                </button>
              ) : null}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
