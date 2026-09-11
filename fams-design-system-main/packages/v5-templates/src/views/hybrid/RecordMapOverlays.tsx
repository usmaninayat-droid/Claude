import { Button } from '@fams/ui-kit'
import type { RecordNoun } from '../RecordViewStates'

export interface RecordMapNoticeProps {
  /** Records currently drawn on the map. */
  shown: number
  /** Records that HAVE geometry (the map's own denominator). */
  mappable: number
  /** Records with no geometry at all — reported, never silently dropped. */
  ungeocoded: number
  /** True while the legend is narrowing the map. */
  narrowed: boolean
  noun: RecordNoun
  /** Re-checks every legend entry and clears the caller's search/filters. */
  onShowAll: () => void
}

/**
 * RecordMapNotice — the map's non-blocking zero/partial-state chip.
 * [tier-2 internal]
 *
 * UX J.61 / E.28: the map ALWAYS keeps its tiles and its chrome. A zero state is
 * a chip on top of it (never a replacement surface), and a filtered-to-zero
 * state offers the way back. `RecordMapChrome` lays this out as the start cell
 * of its top row, beside the legend, so the two can never overlap (finding
 * A7b-3). Extracted from `MapHybridView` verbatim under root rule 12.
 */
export function RecordMapNotice({
  shown,
  mappable,
  ungeocoded,
  narrowed,
  noun,
  onShowAll,
}: RecordMapNoticeProps) {
  if (shown === 0) {
    return (
      <div
        data-slot="record-map-notice"
        className="flex items-center gap-3 rounded-md border border-border bg-card/95 px-3 py-2 text-body-sm shadow-sm backdrop-blur"
      >
        <span className="text-foreground">
          {mappable === 0
            ? `No mapped ${noun.many}${ungeocoded ? ` — ${ungeocoded} have no location` : ''}`
            : `No ${noun.many} shown`}
        </span>
        {narrowed ? (
          <Button variant="tertiary" size="sm" onClick={onShowAll}>
            Show all
          </Button>
        ) : null}
      </div>
    )
  }
  if (ungeocoded > 0) {
    return (
      <div
        data-slot="record-map-notice"
        className="rounded-md border border-border bg-card/95 px-3 py-2 text-body-sm text-muted-foreground shadow-sm backdrop-blur"
      >
        {`${ungeocoded} ${noun.many} have no location`}
      </div>
    )
  }
  return null
}

RecordMapNotice.displayName = 'RecordMapNotice'

export interface RecordMapMeasureReadoutProps {
  /** How many points the user has picked so far. */
  points: number
  /** Total path length in km, already computed by the caller. */
  km: number
  onClear: () => void
  noun: RecordNoun
}

/** The measure tool's live `role="status"` readout (SPEC row 25). [tier-2 internal] */
export function RecordMapMeasureReadout({ points, km, onClear, noun }: RecordMapMeasureReadoutProps) {
  return (
    <div
      data-slot="record-map-measure"
      role="status"
      className="absolute bottom-4 start-4 z-10 flex items-center gap-3 rounded-md border border-border bg-card/95 px-3 py-2 text-body-sm shadow-sm backdrop-blur"
    >
      <span className="text-foreground">
        {points < 2 ? `Pick two ${noun.many} to measure` : `${km.toFixed(2)} km over ${points} points`}
      </span>
      {points ? (
        <Button variant="tertiary" size="sm" onClick={onClear}>
          Clear
        </Button>
      ) : null}
    </div>
  )
}

RecordMapMeasureReadout.displayName = 'RecordMapMeasureReadout'
