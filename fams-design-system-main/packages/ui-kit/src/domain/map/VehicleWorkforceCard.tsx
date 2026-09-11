import { type ReactNode } from 'react'
import { DefaultWorkforceArt } from '../../composites/DefaultWorkforceArt'
import { cn } from '../../lib/cn'
import { LABEL_TEXT, VALUE_TEXT } from './vehicle-popup-style'

/**
 * VehicleWorkforceCard — the vehicle popup's **Workforce** tab body (Figma
 * board 16:22894, frame 16:22182).
 *
 * A bordered `#FCFCFD` panel headed "Workforce Info": a 120×120 bordered photo
 * tile on the leading side, then a two-column field block (name · contact
 * above email · assigned-on) on the same 12px-label / 16px-value scale the
 * Overview grid uses, so the two tab bodies read as one card.
 *
 * GENERIC (`@fams/ui-kit` rule 8 / rule 10): the component knows nothing about
 * drivers, shifts or tenants — it takes a title, an optional photo node and an
 * ordered list of `{ icon, label, value }` entries, exactly like
 * `VehiclePopupField`. The live-monitoring template maps the blueprint's
 * `uiConfig.map.popup.workforce` bindings onto it; a different product can put
 * anything else in the same slot.
 *
 * Empty behaviour matches the card's other tabs (UX D28): with no entries the
 * panel renders its `emptyLabel` at the same box, never disappearing.
 */

export interface VehicleWorkforceEntry {
  /** 16px leading icon element. */
  icon?: ReactNode
  label: string
  value: ReactNode
}

export interface VehicleWorkforceCardProps {
  /** Panel heading. @default 'Workforce Info' */
  title?: string
  /**
   * The 120×120 photo tile's content — an `<img>` or an avatar. Omitted, the
   * tile draws the designer's `DefaultWorkforceArt` illustration (Figma
   * 16:21227), never an empty box.
   */
  photo?: ReactNode
  entries?: VehicleWorkforceEntry[]
  /** Shown instead of the field block when `entries` is empty. */
  emptyLabel?: string
  className?: string
}

export function VehicleWorkforceCard({
  title = 'Workforce Info',
  photo,
  entries,
  emptyLabel = 'No workforce assigned',
  className,
}: VehicleWorkforceCardProps) {
  const rows = entries ?? []
  return (
    <div
      data-slot="vehicle-workforce-card"
      className={cn('flex w-full flex-col gap-1 border border-border bg-muted/40 p-4', className)}
    >
      <p className="font-semibold text-foreground" style={VALUE_TEXT}>
        {title}
      </p>
      <div className="flex items-center justify-between gap-4">
        {/* 120×120 bordered photo tile (16:22482). */}
        <div className="grid size-30 shrink-0 place-items-center overflow-hidden rounded-sm border border-border bg-card">
          {photo ?? <DefaultWorkforceArt className="size-25" />}
        </div>
        {rows.length === 0 ? (
          <p className="flex-1 text-center font-semibold text-gray-400" style={LABEL_TEXT}>
            {emptyLabel}
          </p>
        ) : (
          /* Two columns of entries, 28px apart within a column (16:22485). */
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-7">
            {rows.map((entry, i) => (
              <div
                key={i}
                className="flex min-w-0 items-center gap-2"
                {...(typeof entry.value === 'string' || typeof entry.value === 'number'
                  ? { role: 'group', 'aria-label': `${entry.label}: ${entry.value}` }
                  : {})}
              >
                {entry.icon ? (
                  <span className="grid size-4 shrink-0 place-items-center text-gray-400 [&_svg]:size-4">
                    {entry.icon}
                  </span>
                ) : null}
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-semibold text-gray-400" style={LABEL_TEXT}>
                    {entry.label}
                  </span>
                  <span className="truncate font-semibold text-foreground" style={VALUE_TEXT}>
                    {entry.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

VehicleWorkforceCard.displayName = 'VehicleWorkforceCard'
