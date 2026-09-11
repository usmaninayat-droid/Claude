/**
 * heatmap-bins — the discrete-scale half of `HeatmapChart`, split out to keep
 * that file inside the ~300-line budget. Internal helper module: NOT exported
 * from `src/index.ts` (the `HeatmapChartBin` type is, via `HeatmapChart`).
 *
 * A binned heat scale is more than a colour list: unmeasured coordinates have
 * to become *something* the renderer can paint, the piece boundaries have to
 * chain (each bin starts where the last ended), and "no data" has to stay
 * distinguishable without relying on its fill. All three live here.
 */

export interface HeatmapChartBin {
  /** Inclusive upper bound of this bin. Bins are supplied in ascending order; each starts where the previous ended. Ignored when `noData` is set. */
  to: number
  /** Bin fill — any ECharts-valid color string. Caller-owned (this is data, not a design decision made by this file). */
  color: string
  /** Legend text. State the numeric range here (`'61–75'`), never colour alone. */
  label: string
  /** Marks this entry as the "no data" bin. Coordinates absent from `cells` are painted with it AND glyphed, so "unmeasured" is never distinguishable by colour only. At most one. */
  noData?: boolean
}

export interface VisualMapPiece {
  min: number
  max: number
  label: string
  color: string
}

/** Glyph painted on unmeasured cells — the non-colour channel for "no data". */
export const NO_DATA_GLYPH = '·'

/**
 * The sentinel value reserved for "this coordinate was never measured": one
 * step below the scale floor, so no real measurement can collide with it.
 */
export function noDataValueFor(min: number): number {
  return min - 1
}

/**
 * `piecewise` pieces for the given bins. The no-data class (if any) leads, then
 * each scored bin spans from where the previous one ended — so the boundaries
 * chain instead of being restated per bin and drifting apart.
 */
export function buildBinPieces(bins: HeatmapChartBin[], min: number): VisualMapPiece[] {
  const noDataBin = bins.find((bin) => bin.noData)
  let floor = min
  const pieces = bins
    .filter((bin) => !bin.noData)
    .map((bin) => {
      const piece = { min: floor, max: bin.to, label: bin.label, color: bin.color }
      floor = bin.to
      return piece
    })
  if (noDataBin) {
    const sentinel = noDataValueFor(min)
    pieces.unshift({ min: sentinel, max: sentinel, label: noDataBin.label, color: noDataBin.color })
  }
  return pieces
}

/**
 * Materialises every `(x, y)` the measured data does not cover at the no-data
 * sentinel, so those coordinates become real cells the renderer can paint and
 * glyph — ECharts cannot style a coordinate that carries no datum at all.
 */
export function fillMissingCells(
  measured: Array<[number, number, number]>,
  columnCount: number,
  rowCount: number,
  sentinel: number,
): Array<[number, number, number]> {
  const seen = new Set(measured.map(([xi, yi]) => `${xi}:${yi}`))
  const filled = [...measured]
  for (let yi = 0; yi < rowCount; yi += 1) {
    for (let xi = 0; xi < columnCount; xi += 1) {
      if (!seen.has(`${xi}:${yi}`)) filled.push([xi, yi, sentinel])
    }
  }
  return filled
}
