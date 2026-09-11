import { cn } from '../../lib/cn'
import { MAP_ATTRIBUTION_STRIP } from '../constants'
import { TRAFFIC_LEVELS, TRAFFIC_LEVEL_LABELS, trafficPalette } from '../traffic'

/**
 * TrafficLegend — the small key that appears at the map's bottom-END corner
 * while the traffic overlay is on, and disappears with it.
 *
 * DESIGN NOTES (ui-ux-pro-max, Accessibility §"Color Only" + §"Color
 * Contrast"):
 *  - every level carries its WORD, not just its colour, so the chip is
 *    readable without colour vision — colour is the redundant channel here,
 *    never the only one;
 *  - the swatches are short line STROKES, not dots, because the thing they
 *    key is a stroke on the map; matching the mark makes the mapping
 *    instant;
 *  - the four entries stay in ordinal order (free → stopped), so the chip
 *    reads as a ramp rather than as four unrelated categories;
 *  - text is `text-foreground` on a `bg-card/95` blur, not muted-on-muted,
 *    to clear 4.5:1 over whatever basemap is underneath.
 *
 * Placement is logical (`insetInlineEnd`), never `right` (hard rule 4), and
 * it is inset past the bottom-end control column (zoom/fullscreen) and above
 * the reserved attribution strip so it collides with neither.
 *
 * Swatch colours come from `trafficPalette()` — the same resolved status
 * tokens the GPU layer paints with, so the key can never drift from the map.
 */

/**
 * How far the legend's END edge is held off the pane's END edge.
 *
 * The bottom-end control column is a 44px-wide `MapControls` group (its
 * painted 40px tile plus the WCAG 2.5.8 hit-area growth `MapIconButton`
 * documents) inside a 2px wrapper, inset 16px from the pane edge — 62px of
 * pane measured from the end. QA A12: this constant described the column as
 * 40 + 16 and left the legend only 6px clear of it, so the two cards butted
 * together in the corner with no gutter at all. 62 + 12 gives the legend the
 * same 12px gutter every other pair of floating controls has.
 */
const CONTROL_COLUMN_WIDTH = 46
const CONTROL_COLUMN_INSET = 16
const CONTROL_COLUMN_CLEARANCE = CONTROL_COLUMN_WIDTH + CONTROL_COLUMN_INSET + 12

export interface TrafficLegendProps {
  className?: string
}

export function TrafficLegend({ className }: TrafficLegendProps) {
  const palette = trafficPalette()
  return (
    <div
      data-slot="map-traffic-legend"
      className={cn(
        'pointer-events-none absolute z-10 flex flex-col gap-1 rounded-md border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur',
        'text-caption text-foreground',
        className,
      )}
      style={{ insetInlineEnd: CONTROL_COLUMN_CLEARANCE, insetBlockEnd: MAP_ATTRIBUTION_STRIP + 12 }}
    >
      <span className="font-medium text-muted-foreground">Traffic</span>
      <ul className="flex flex-col gap-1">
        {TRAFFIC_LEVELS.map((level) => (
          <li key={level} className="flex items-center gap-2">
            {/* A stroke, not a dot — it keys a line on the map. The colour is
                resolved data flowing into a DOM background, the same
                "data colour, not a design decision" carve-out `MapLegend`
                documents for its swatches. */}
            <span aria-hidden className="h-1 w-5 shrink-0 rounded-full" style={{ backgroundColor: palette[level] }} />
            {TRAFFIC_LEVEL_LABELS[level]}
          </li>
        ))}
      </ul>
    </div>
  )
}

TrafficLegend.displayName = 'TrafficLegend'
