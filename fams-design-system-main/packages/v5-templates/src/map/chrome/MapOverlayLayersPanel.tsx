import { useId } from 'react'
import { Checkbox } from '@fams/ui-kit'
import { RefreshCw } from '@fams/ui-kit/icons'
import { cn } from '../../lib/cn'

/**
 * MapOverlayLayersPanel — the map's OVERLAY layer control (19:25255): a
 * horizontal row of independent checkboxes, each switching one data layer on
 * top of whatever basemap is showing.
 *
 * Deliberately NOT the same control as `MapLayersSwitcher`, which the tool
 * stack already carries. That one is single-select and picks the BASEMAP
 * STYLE (SPEC 3.19) — exactly one wins. This one is multi-select and picks
 * which DATA layers are painted over it — any combination wins, including
 * none. They share a word and nothing else, so merging them would force a
 * radio group and a checkbox group into one widget.
 *
 * Generic by construction (rule 10): the entries are `{ id, label }` supplied
 * by the caller, so nothing about weather — or any other domain — is named
 * here. `LiveMapView` feeds it the weather set.
 *
 * The whole label is inside the control, so the hit area is the label's full
 * width rather than the checkbox glyph alone (UX-NOTES #1).
 */
export interface MapOverlayLayerEntry {
  id: string
  label: string
  /** Renders the row inert with an explanatory title — for a layer this
   *  deployment has no data for. Never leave a checkbox that toggles nothing. */
  disabled?: boolean
  /** Tooltip/`title` copy, e.g. why a disabled entry is unavailable.
   *  Always application-supplied — the DS ships no environment copy. */
  hint?: string
}

export interface MapOverlayLayersPanelProps {
  entries: MapOverlayLayerEntry[]
  /** Ids currently checked. Controlled — the caller owns this state (rule 8). */
  checkedIds: string[]
  onToggle: (id: string) => void
  /** Accessible name for the group. @default 'Map overlays' */
  label?: string
  /**
   * Trailing status text, e.g. "40 stations · 15:20". Optional and off by
   * default: the Figma row ends at its last checkbox, and a deployment that
   * wants the raw prototype's meta strip opts into it.
   */
  meta?: string
  /** Renders a refresh control after `meta`; the promise drives nothing here. */
  onRefresh?: () => void
  className?: string
}

export function MapOverlayLayersPanel({
  entries,
  checkedIds,
  onToggle,
  label = 'Map overlays',
  meta,
  onRefresh,
  className,
}: MapOverlayLayersPanelProps) {
  const groupId = useId()
  if (entries.length === 0) return null
  return (
    <fieldset
      data-slot="map-overlay-layers"
      aria-labelledby={groupId}
      className={cn(
        'pointer-events-auto flex items-center gap-6 rounded-md border border-border bg-card/95 px-4 py-2 shadow-sm backdrop-blur',
        className,
      )}
    >
      <legend id={groupId} className="sr-only">
        {label}
      </legend>
      {entries.map((entry) => {
        const checked = checkedIds.includes(entry.id)
        return (
          <label
            key={entry.id}
            title={entry.hint}
            className={cn(
              'flex cursor-pointer items-center gap-2 text-body-sm text-foreground',
              entry.disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <Checkbox
              checked={checked}
              disabled={entry.disabled}
              onCheckedChange={() => onToggle(entry.id)}
              aria-describedby={entry.hint ? `${groupId}-${entry.id}-hint` : undefined}
            />
            <span className="whitespace-nowrap">{entry.label}</span>
            {entry.hint ? (
              <span id={`${groupId}-${entry.id}-hint`} className="sr-only">
                {entry.hint}
              </span>
            ) : null}
          </label>
        )
      })}
      {meta ? <span className="whitespace-nowrap text-caption text-muted-foreground">{meta}</span> : null}
      {onRefresh ? (
        <button
          type="button"
          aria-label="Refresh overlay data"
          onClick={onRefresh}
          className="rounded-xs p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </fieldset>
  )
}

MapOverlayLayersPanel.displayName = 'MapOverlayLayersPanel'
