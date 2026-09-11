import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import { MoveUpRight } from '../../icons'
import { cn } from '../../lib/cn'
import { MapDeviceIcon } from './map-glyphs'

/**
 * VehicleDevicesTable — the vehicle popup's "Devices" tab body
 * (live-monitoring Figma 495:16050): a compact DEVICE NAME / IMEI / DATA REC /
 * VALUE table where alarm values read in the error tone ("54°C ↗") and healthy
 * values in the success tone ("All Secure").
 *
 * Round-1 visual parity (findings #19 / #43):
 * - the DEVICE NAME cell carries a **leading device icon** before the text;
 * - the column headers sit **ABOVE** the bordered card, not inside a grey band
 *   inside it, and the VALUE column starts ~29px further start-ward
 *   (card-local x 407 at 1920 → content-local 392 of the 526 content box).
 *
 * Built as an ARIA grid (`role="table"` over a CSS grid) rather than a
 * `<table>`: the Figma puts the header row OUTSIDE the bordered box, and a
 * `<thead>` cannot leave its table's border box. Header and rows share ONE
 * `grid-template-columns`, so the columns line up exactly and the VALUE column
 * lands on its Figma x with no per-cell offsets. Wide device sets scroll
 * inside the row container — never the page.
 */

export type VehicleDeviceValueTone = 'success' | 'error' | 'muted'

export interface VehicleDeviceRow {
  id: string
  name: string
  imei: string
  /** Pre-formatted data-received stamp, e.g. "12:32". */
  dataRec: string
  value: string
  valueTone?: VehicleDeviceValueTone
  /** Adds the rising-trend arrow after the value (alarm rows in the Figma). */
  trend?: boolean
  /** Overrides the leading device glyph for this row. */
  icon?: ReactNode
}

export interface VehicleDevicesTableProps extends HTMLAttributes<HTMLDivElement> {
  devices: VehicleDeviceRow[]
  emptyLabel?: string
}

/**
 * Figma column template inside the 526px card content box, measured from
 * 495:16050 (card-local 21 / 158 / 291 / 407 at 1920 → content-local
 * 5 / 142 / 275 / 392). With the shared 8px inline padding the four `fr`
 * shares below put VALUE at content-local 8 + 384 = 392 exactly.
 */
const DEVICE_COLUMNS = 'grid-cols-[139fr_130fr_115fr_126fr]'
/** Bordered rows card — Figma radius 6. */
const CARD_BOX: CSSProperties = { borderRadius: 6 }

// fix7 wave 6, P2 sweep: success/error were bare FILL tokens, failing AA as
// the readable device VALUE text — moved to the accessible TEXT aliases.
const VALUE_TONE: Record<VehicleDeviceValueTone, string> = {
  success: 'text-success-text',
  error: 'text-destructive-emphasis',
  muted: 'text-foreground',
}

export const VehicleDevicesTable = forwardRef<HTMLDivElement, VehicleDevicesTableProps>(
  ({ devices, emptyLabel = 'No devices attached', className, ...props }, ref) => {
    if (devices.length === 0) {
      return (
        <div ref={ref} className={cn('py-6 text-center text-sm text-gray-400', className)} {...props}>
          {emptyLabel}
        </div>
      )
    }
    return (
      <div
        ref={ref}
        data-slot="vehicle-devices-table"
        role="table"
        aria-label="Devices"
        className={cn('flex max-h-56 flex-col gap-2 overflow-y-auto', className)}
        {...props}
      >
        {/* Header row — OUTSIDE the bordered card, no fill (finding #43). */}
        <div role="rowgroup">
          <div role="row" className={cn('grid px-2 text-caption uppercase text-gray-400', DEVICE_COLUMNS)}>
            <span role="columnheader" className="font-semibold">Device Name</span>
            <span role="columnheader" className="font-semibold">IMEI</span>
            <span role="columnheader" className="font-semibold">Data Rec</span>
            <span role="columnheader" className="font-semibold">Value</span>
          </div>
        </div>

        {/* Bordered rows card. */}
        <div role="rowgroup" style={CARD_BOX} className="divide-y divide-border border border-border">
          {devices.map((device) => (
            <div
              key={device.id}
              role="row"
              className={cn('grid items-center px-2 py-2 text-caption', DEVICE_COLUMNS)}
            >
              <span role="cell" className="flex min-w-0 items-center gap-1.5 text-gray-400">
                <span className="grid size-4 shrink-0 place-items-center [&_svg]:size-4">
                  {device.icon ?? <MapDeviceIcon />}
                </span>
                <span className="truncate">{device.name}</span>
              </span>
              <span role="cell" className="truncate font-semibold text-foreground">{device.imei}</span>
              <span role="cell" className="truncate text-foreground">{device.dataRec}</span>
              <span
                role="cell"
                className={cn('font-semibold', VALUE_TONE[device.valueTone ?? 'muted'])}
              >
                <span className="inline-flex items-center gap-1">
                  {device.value}
                  {device.trend ? <MoveUpRight className="size-3" aria-hidden="true" /> : null}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  },
)

VehicleDevicesTable.displayName = 'VehicleDevicesTable'
