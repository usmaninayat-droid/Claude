import { cn } from '../../lib/cn'
import type { VehiclePopupField, VehicleStatusTone } from './VehiclePopupCard'
import { BODY_COLUMNS, LABEL_TEXT, VALUE_TEXT } from './vehicle-popup-style'

/** Progress-bar fill per tone (board 16:21742 fills `success`). */
const BAR_FILL: Record<VehicleStatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning-scale-600',
  error: 'bg-destructive',
  muted: 'bg-gray-400',
}

/** Tag-chip tints (board 16:22772/16:22774 — status-100 fill, status text). */
const CHIP_CLASS: Record<VehicleStatusTone, string> = {
  success: 'bg-success-scale-100 text-success',
  warning: 'bg-warning-scale-50 text-warning',
  error: 'bg-error-100 text-destructive',
  muted: 'bg-gray-100 text-gray-500',
}

/**
 * `VehiclePopupCard`'s Overview body (Figma 495:4231) — internal to the card,
 * not exported from the package barrel.
 *
 * A 3-column grid of EQUAL `1fr` columns (board 16:20661), laid out row-major,
 * on a single fixed 16px gutter (`gap-x-4`, `BODY_COLUMNS`'s co-located
 * comment in `vehicle-popup-style.ts`).
 *
 * ROW PITCH (round-5 visual gate V3). The card's type scale is one step up
 * from Figma's nominal 10/13px (see `vehicle-popup-style.ts`), so a cell is
 * 15px label + 4px gap + 20px value = 39px. With the original `gap-y-7` (28px)
 * that made a 67px pitch against the reference's 62.3px, and the cumulative
 * drift put the fourth row 16px low while the footer track — pixel-verified
 * and fixed — absorbed the whole error as a shortened bottom gap (33px against
 * Figma's 49px). `gap-y-6` (24px) puts the pitch at 63px, i.e. within a pixel
 * of the reference, and leaves the fourth row 4px out instead of 16.
 *
 * Four rows therefore occupy 4x39 + 3x24 = 228px inside the body's 252px slot
 * — still no scrolling, and the card's fixed 448px height and footer position
 * (both already pixel-verified) do not move.
 *
 * A11y (UX D29): each stringable cell pairs its 10px label and its value into
 * ONE accessible name, which is the AA-safe path for the sub-12px label.
 */

export interface VehiclePopupFieldsProps {
  fields: VehiclePopupField[]
  /** Announce a copy through the card's polite live region. */
  onAnnounce: (message: string) => void
}

export function VehiclePopupFields({ fields, onAnnounce }: VehiclePopupFieldsProps) {
  return (
    <div className={cn('grid gap-x-4 gap-y-6', BODY_COLUMNS)} data-slot="vehicle-popup-fields">
      {fields.map((f, i) => (
        <div
          key={i}
          // Top-aligned (not `items-center`, A20): a CSS grid ROW stretches
          // every cell in it to its tallest sibling's height, and the
          // progress-bar cells are shorter than a text/chip value — centering
          // inside that stretched box is what put "Fill Level"'s label 4-8px
          // above "Odometer"'s in the SAME row. Starting every cell at the
          // row's block-start gives every label the same y regardless of a
          // taller neighbour.
          className="flex min-w-0 items-start gap-2"
          {...(typeof f.value === 'string' || typeof f.value === 'number'
            ? { role: 'group', 'aria-label': `${f.label}: ${f.value}` }
            : {})}
        >
          <span className="grid size-4 shrink-0 place-items-center text-gray-400 [&_svg]:size-4">
            {f.icon}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-semibold text-gray-400" style={LABEL_TEXT}>
              {f.label}
            </span>
            {f.percent != null ? (
              /* Progress field (board 16:21739): an 8px rounded track with a
                 tone-filled bar and the percentage trailing it. The bar is
                 decorative — the percentage text beside it is the reading, and
                 the cell's `aria-label` already pairs label + value.
                 `h-5` pins this row to the SAME 20px block height as the
                 plain-text value row below (`VALUE_TEXT`'s 1.25rem
                 line-height) — the value row's vertical rhythm is identical
                 regardless of cell type, the bar can never stretch it. The
                 percentage gets a fixed `w-9` (not just `shrink-0`) so a
                 3-digit reading can't nudge the bar's own width and, through
                 it, the column's effective content width. */
              <span className="flex h-5 items-center gap-1.5">
                <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <span
                    aria-hidden="true"
                    className={cn('absolute inset-y-0 start-0 rounded-full', BAR_FILL[f.percentTone ?? 'success'])}
                    style={{ width: `${Math.max(0, Math.min(100, f.percent))}%` }}
                  />
                </span>
                <span className="w-9 shrink-0 text-end font-semibold text-gray-600" style={LABEL_TEXT}>
                  {f.value}
                </span>
              </span>
            ) : f.chips ? (
              /* Chip row (board 16:22771) — radius 2, 14px semibold label. */
              <span className="flex flex-wrap items-center gap-2">
                {f.chips.map((chip, c) => (
                  <span
                    key={c}
                    className={cn(
                      'inline-flex items-center rounded-xs px-2 py-1 font-semibold',
                      CHIP_CLASS[chip.tone ?? 'muted'],
                    )}
                    style={LABEL_TEXT}
                  >
                    {chip.label}
                  </span>
                ))}
              </span>
            ) : (
            <span className="flex h-5 items-center gap-2 font-semibold text-foreground" style={VALUE_TEXT}>
              <span className="truncate">{f.value}</span>
              {f.onCopy ? (
                <button
                  type="button"
                  aria-label={`Copy ${f.label}`}
                  onClick={() => {
                    f.onCopy?.()
                    onAnnounce(`${f.label} copied`)
                  }}
                  // 12px glyph (Figma copy-02) on a 24×24 hit area pulled back
                  // out of the flow with -m-1.5 (UX-7).
                  className="-m-1.5 grid size-6 shrink-0 place-items-center rounded-sm text-primary outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CopyGlyph />
                </button>
              ) : null}
            </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Figma's 12×12 `copy-02` affordance beside the Coordinates value. */
function CopyGlyph() {
  return (
    <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}
