import type { ReactNode } from 'react'
import { Eye, EyeOff, Layers, Maximize2, PencilRuler, Shapes } from '@fams/ui-kit/icons'
import { MapIconButton } from '@fams/ui-kit'
import { LegendFilter, type LegendFilterEntry } from '../legend/LegendFilter'

/** The map tools, each a real toggle with a visible active state (SPEC row 25). */
export type RecordMapTool = 'measure' | 'draw'

export interface RecordMapChromeProps {
  legendEntries: LegendFilterEntry[]
  legendTitle: string
  legendFilterable: boolean
  visibleKeys: string[]
  onLegendToggle: (key: string, checked: boolean) => void
  legendTotals: Map<string, number>
  /** Basemap index — the layers button cycles it; non-zero paints it active. */
  basemapIndex: number
  onCycleBasemap: () => void
  activeTool: RecordMapTool | null
  onToolChange: (tool: RecordMapTool | null) => void
  onFit: () => void
  /** Nothing to frame → the fit button is disabled with a tooltip (UX J.62). */
  canFit: boolean
  /** Plural record noun from the config — e.g. "tasks" (never hardcoded). */
  nounPlural: string
  /**
   * Optional status/zero-state notice for the map's top row (e.g. "12 tasks
   * have no location"). Rendered as the START cell of the SAME flex row that
   * holds the legend at the END, which is what stops the two overlapping —
   * both used to be independently `absolute … top-3` boxes, so a wide legend
   * and a centered notice occluded each other (finding A7b-3: the notice hid
   * the legend's first row). One row, two cells, no z-order guessing.
   */
  notice?: ReactNode
  /**
   * Marker-clustering toggle (`uiConfig.map.cluster`, mirrors Live
   * Monitoring's fleet-map "eye" button/`useClusterEnabled` — same
   * lit-while-unclustered convention). Omit `onClusterToggle` entirely to
   * render no cluster control at all (unchanged default for every module
   * that hasn't opted into clustering).
   */
  clusterEnabled?: boolean
  onClusterToggle?: () => void
  /**
   * Suppress this chrome's own end-side tool stack (layers/measure/draw/
   * cluster). Set by `MapHybridView` when the blueprint declares
   * `uiConfig.map.tools` — the shared Live-Monitoring `LiveMapTools` stack
   * renders instead (chrome-parity requirement, 2026-09-01), and two tool
   * stacks must never paint at once. The legend row, the notice cell and the
   * fit control all stay — `LiveMapTools` carries no equivalent of them.
   */
  hideTools?: boolean
}

/**
 * RecordMapChrome — the hybrid map's overlaid chrome. [tier-2 internal]
 *
 * SPEC §1.3's corners, and UX K.65/K.67's floors: the priority legend at the
 * top-end, the layers / measure / draw cluster under it, and the fit control
 * above `MapPanel`'s own shipped zoom stack at the bottom-end (UX K.79 —
 * chrome stays visually identical to the shipped live-monitoring map, which is
 * what settles SPEC §1.3's three-button drawing against the four buttons that
 * stack already ships). Every control is icon-only, so every control carries a
 * specific `aria-label` AND a tooltip on hover and focus.
 */
export function RecordMapChrome({
  legendEntries,
  legendTitle,
  legendFilterable,
  visibleKeys,
  onLegendToggle,
  legendTotals,
  basemapIndex,
  onCycleBasemap,
  activeTool,
  onToolChange,
  onFit,
  canFit,
  nounPlural,
  notice,
  clusterEnabled = true,
  onClusterToggle,
  hideTools = false,
}: RecordMapChromeProps) {
  const toggle = (tool: RecordMapTool) => onToolChange(activeTool === tool ? null : tool)
  return (
    <>
      {/* ONE top row owns everything anchored to the map's top edge: the
          notice at the start, the legend at the end. A flex row with a gap
          means neither can ever cover the other at any lens width (1440 and
          1280 both verified) — the previous two independent `absolute`
          boxes could and did overlap (finding A7b-3). The row itself is
          `pointer-events-none` so the map keeps every pixel between them;
          each cell re-enables its own pointer events. */}
      <div
        className={
          // In LM-chrome mode (`hideTools`) the shared `LiveMapTools` stack
          // owns the top-end corner (40px tile at end-4), so the legend row
          // steps inboard by one tile + gap instead of painting under it.
          hideTools
            ? 'pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-3 pe-14'
            : 'pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-3'
        }
      >
        <div className="pointer-events-auto min-w-0">{notice}</div>
        {/* The legend is DUAL-PURPOSE — colour key AND filter — so it renders
            even when filtering is config-disabled, as static swatches rather
            than dead checkboxes (`INTERACTIONS.md` rows 23/24, UX E.32). */}
        <div className="pointer-events-auto max-w-[55%] shrink-0 rounded-md border border-border bg-card/95 px-2 py-1 shadow-sm backdrop-blur">
          <LegendFilter
            entries={legendEntries}
            visible={visibleKeys}
            onToggle={legendFilterable ? onLegendToggle : undefined}
            readOnly={!legendFilterable}
            totals={legendTotals}
            title={legendTitle}
            slot="record-map-legend"
          />
        </div>
      </div>

      {/*
       * Design-Lead unification (2026-08-31): every record-map hybrid now
       * paints its floating tools with the SAME `MapIconButton` tile Live
       * Monitoring's `LiveMapTools` stack uses — same 40×40 white tile,
       * same Figma `Shadow/Map`, same active treatment — rather than a
       * second, bespoke tool-button style. Measure/draw stay (they are real
       * capabilities several modules rely on, not decoration — Live
       * Monitoring simply has no map-editing need of its own), just
       * re-skinned onto the shared tile.
       */}
      {hideTools ? null : (
      <div className="absolute end-3 top-16 z-10 mt-3 flex flex-col gap-2">
        <MapIconButton label="Map layers" active={basemapIndex !== 0} onClick={onCycleBasemap}>
          <Layers className="size-4" aria-hidden="true" />
        </MapIconButton>
        <MapIconButton label="Measure distance" active={activeTool === 'measure'} onClick={() => toggle('measure')}>
          <PencilRuler className="size-4" aria-hidden="true" />
        </MapIconButton>
        <MapIconButton label="Draw area" active={activeTool === 'draw'} onClick={() => toggle('draw')}>
          <Shapes className="size-4" aria-hidden="true" />
        </MapIconButton>
        {onClusterToggle ? (
          <MapIconButton
            label={clusterEnabled ? 'Disable clustering' : 'Enable clustering'}
            active={!clusterEnabled}
            onClick={onClusterToggle}
          >
            {clusterEnabled ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
          </MapIconButton>
        ) : null}
      </div>
      )}

      {/* Above MapPanel's own bottom-end zoom/fullscreen cluster, same corner.
          Chrome-parity (2026-09-01): this used to be a bespoke `Button
          variant="secondary"` — a dark slate 44px square that read as a second,
          off-system fullscreen button next to Live Monitoring's white tiles.
          It now paints the SAME 40×40 white `MapIconButton` tile every other
          floating map control uses (`Shadow/Map`, same radius, same glyph
          sizing), so the bottom-end corner is visually identical to Live
          Monitoring's, with fit as one more white tile above the cluster. */}
      <div className="absolute bottom-52 end-4 z-10">
        {/* The label explains the DISABLED case too, which a static name alone
            cannot (UX J.62) — `MapIconButton` mirrors it into the native
            `title`, which (unlike a Radix tooltip) still opens on a disabled
            control, so the "why" is never unreachable. */}
        <MapIconButton
          label={canFit ? `Fit all ${nounPlural} in view` : `No mapped ${nounPlural} to frame`}
          disabled={!canFit}
          onClick={onFit}
          className="disabled:opacity-50"
        >
          <Maximize2 aria-hidden="true" />
        </MapIconButton>
      </div>
    </>
  )
}

RecordMapChrome.displayName = 'RecordMapChrome'
