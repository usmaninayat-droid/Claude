import type { CSSProperties } from 'react'
import { useId } from 'react'
import { Checkbox } from '@fams/ui-kit'
import { cn } from '../../lib/cn'

/**
 * MapLegend — the map's legend chrome, in two shapes driven by ONE prop:
 *
 *  - **read-only** (no `onToggle`) — the original token-styled chip list.
 *  - **toggleable** (`onToggle` supplied) — a titled `<fieldset>` of real
 *    checkboxes, one per entry, each row a ≥44×44 hit area with a visible
 *    focus ring (UX verdict V11). Unchecking every entry is a legitimate
 *    state the CALLER renders an empty-state for; this component only reports
 *    the toggle (rule 8 — state-agnostic).
 *
 * Placement is `bottom-4 start-4` — Tailwind logical utilities compiling to
 * `inset-inline-start`, never `left` (verdict V12 / hard rule 4).
 *
 * Entry colors are business data (a status→color mapping the consumer owns —
 * MapPanel never invents one), so the swatch is the one spot in this file
 * that reads an inline `style` color: that value is caller-owned data flowing
 * straight into a DOM `background-color`, the same "data color, not a design
 * decision" carve-out `Gauge`'s `sectors[].color` documents — not a hardcoded
 * design value, so it isn't a `lint:tokens` violation (the rule targets
 * literals baked INTO this file, not props passed through it).
 */
export interface MapLegendEntry {
  /** Stable id for `hiddenIds`/`onToggle` matching. Falls back to `label`. */
  id?: string
  label: string
  color: string
}

export interface MapLegendProps {
  entries: MapLegendEntry[]
  /** Heading rendered above the entries — becomes the `<fieldset>`'s `<legend>` when toggleable. */
  title?: string
  /** Ids currently hidden. Controlled — the caller owns this state. */
  hiddenIds?: string[]
  /** Presence turns the legend into a checkbox group. Omit for a static key. */
  onToggle?: (id: string) => void
  /**
   * Entry flow direction for the read-only (non-toggleable) shape only —
   * the toggleable `<fieldset>` shape is always one row per entry.
   * `'row'` (default) wraps entries horizontally, preserving existing
   * callers. `'column'` stacks one entry per row, matching the toggleable
   * shape's layout for callers that want that consistency without checkboxes.
   */
  layout?: 'row' | 'column'
  className?: string
  /**
   * Inline style on the panel — the escape hatch for a caller that must
   * re-anchor the legend (e.g. the weather layer, whose centred overlay row
   * occupies the top band this panel defaults into). Logical inset
   * properties only, so RTL still mirrors.
   */
  style?: CSSProperties
}

/** The id a legend entry is addressed by — explicit `id`, else its label. */
export function legendEntryId(entry: MapLegendEntry): string {
  return entry.id ?? entry.label
}

/**
 * `top-4 start-4` — the panel sits at the leading TOP corner, clear of the
 * basemap attribution strip it used to collide with at `bottom-4`.
 */
const PANEL =
  'absolute top-4 start-4 z-10 max-w-[80%] rounded-md border border-border bg-card/95 text-caption text-foreground shadow-sm backdrop-blur'

export function MapLegend({ entries, title, hiddenIds, onToggle, layout = 'row', className, style }: MapLegendProps) {
  const groupId = useId()
  if (entries.length === 0) return null

  if (!onToggle) {
    return (
      <div
        style={style}
        className={cn(
          PANEL,
          'flex px-3 py-2',
          layout === 'column' ? 'flex-col gap-1.5' : 'flex-wrap gap-x-3 gap-y-1.5',
          className,
        )}
      >
        {title ? <span className="w-full font-medium text-muted-foreground">{title}</span> : null}
        {entries.map((entry) => (
          <span key={legendEntryId(entry)} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.label}
          </span>
        ))}
      </div>
    )
  }

  const hidden = new Set(hiddenIds ?? [])
  return (
    <fieldset style={style} className={cn(PANEL, 'flex flex-col px-3 py-2', className)}>
      {/* A rendered `<legend>` is laid out by the UA in the fieldset's border
          gap with a PHYSICAL offset — measured under RTL it stayed at the
          left edge of the map while the panel itself mirrored, visibly
          separating the heading from its own panel; in LTR it floated outside
          the panel surface. Keeping the `<legend>` for the grouping semantics
          but rendering it `sr-only`, with the visible heading as an ordinary
          in-flow child, fixes both without weakening the markup. */}
      <legend className="sr-only">{title ?? 'Legend'}</legend>
      <span aria-hidden="true" className="px-1 pb-1 font-medium text-muted-foreground">
        {title ?? 'Legend'}
      </span>
      {entries.map((entry) => {
        const id = legendEntryId(entry)
        const inputId = `${groupId}-${id}`
        return (
          <div key={id} className="flex min-h-11 items-center gap-2">
            <Checkbox
              id={inputId}
              checked={!hidden.has(id)}
              onCheckedChange={() => onToggle(id)}
              className="focus-visible:ring-offset-2"
            />
            <label htmlFor={inputId} className="flex min-h-11 flex-1 cursor-pointer items-center gap-1.5 pe-1">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.label}
            </label>
          </div>
        )
      })}
    </fieldset>
  )
}
