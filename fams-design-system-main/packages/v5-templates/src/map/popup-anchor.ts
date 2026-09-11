import type { MapMarkerDatum } from './MapPanel.types'

/**
 * Popup collision resolution against the MAP PANE rect (UX MUST H.38).
 *
 * MapLibre's own dynamic anchoring measures against the map CANVAS and knows
 * nothing about the chrome we overlay on it, so at 1280 the cockpit's 360px
 * telematics card ran 37px past the pane's `overflow-hidden` edge (taking the
 * "Call Driver" CTA with it), slid under the zoom-control stack, and sat on
 * top of the attribution strip. This module is the explicit replacement: a
 * pure function that picks the MapLibre anchor from the marker's position in
 * the pane, the popup's measured box, and the rects we must avoid.
 *
 * Anchor semantics (MapLibre): the anchor names the part of the POPUP that is
 * pinned to the point. `bottom` puts the card ABOVE the marker; `top` puts it
 * below; `…-right` makes it extend toward the pane start; `…-left` toward the
 * pane end. Everything below is expressed in logical start/end terms so the
 * same math holds under RTL.
 */
export type PopupAnchor =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'


/**
 * popup-anchor.ts — where the anchored card sits relative to its marker.
 *
 * MapLibre's OWN dynamic anchoring prefers `top` (card BELOW the marker)
 * whenever there is room below, which is how the round-1 card ended up
 * floating 109px under its marker with the tip aiming down at nothing
 * (round-1 visual P0 #1 / UX finding 4). Figma anchors the card **above**
 * the marker (495:2998, P0-2: 558×448 card with a 20×20 triangle pointer at
 * bottom-centre), so the anchor is computed here instead and passed to the
 * `<Popup>` explicitly:
 *
 * - vertical: PREFER `bottom` (MapLibre reads the anchor as "which part of
 *   the popup sits on the point", so `bottom` = card above the marker) and
 *   flip to `top` only when the card would cross the pane's top edge;
 * - horizontal: append `-left` / `-right` when a centred card would cross
 *   the pane's inline edges — MapLibre then puts its tip on that corner, so
 *   the pointer SLIDES along the card's edge and keeps aiming at the marker
 *   (UX-11) instead of being clipped.
 *
 * Pure and pane-relative (no DOM, no map instance) so it is unit-testable
 * and can be recomputed on every camera frame — the card must survive
 * pan/zoom without closing.
 */
export type MapPopupAnchor = PopupAnchor | 'center'

/** Breathing room between the popup and any pane edge or avoid-rect. */
export const POPUP_EDGE_MARGIN = 12
/**
 * The zoom / reset / fullscreen control column: `MapControls` is inset 16px
 * from the pane's end edge and its buttons are 44px wide (UX G.32/G.33), so
 * the last 60px of the pane is a no-go band for the popup.
 */
export const POPUP_CONTROL_COLUMN = 60
/** MapLibre's attribution strip along the pane's bottom edge. */
export const POPUP_ATTRIBUTION_BAND = 24
/**
 * Chrome that lives OUTSIDE the card but inside the band: MapLibre's popup
 * wrapper (its tip and content padding) plus a little slack for the resolver.
 * `popupMaxHeight` subtracts it from the band so the whole popup — not just
 * the card — fits the space it is allowed to occupy (the round-3 H.38 lesson:
 * a 435px card in a 480px pane left any resolver 45px of slack).
 *
 * It is deliberately NOT the card's own header + footer height. Reserving
 * those double-counted them — they are inside the `max-block-size` being
 * computed — which is what capped the card at a static-looking 334px and hid
 * 68px of body content (including the "Last Record" freshness stamp) behind
 * an invisible scroll, in a popup that was measured sitting 90px clear of the
 * pane bottom (round-4 UX finding 2).
 */
export const POPUP_WRAPPER_RESERVE = 48
/**
 * Ceiling on the derived cap. The band can be large on a tall viewport; past
 * this the card stops being a popup and starts being a panel, so it scrolls
 * internally (with a visible cue) instead of growing without bound.
 */
export const POPUP_MAX_BLOCK_CEILING = 440

export interface PopupAnchorInput {
  /** Marker position in PANE-LOCAL pixels (0,0 = pane top-start corner). */
  point: { x: number; y: number }
  /** The map pane's own box. */
  pane: { width: number; height: number }
  /** The popup's measured box. */
  popup: { width: number; height: number }
  /**
   * The BROWSER VIEWPORT expressed in the same pane-local pixels as `point`
   * (i.e. `{ top: -paneRect.top, bottom: innerHeight - paneRect.top }`).
   *
   * Round 3's H.38 proved why this is not optional: the resolver was already
   * clamping the card perfectly inside the pane (−31px in all 18 probes) — it
   * was the PANE that hung 134px below the fold, because the cockpit's page
   * scroller was not at its end. A pane-only avoid-rect cannot see that, so
   * the viewport is a first-class avoid-rect here. Omit it and the behaviour
   * is exactly the pane-only one (an infinite viewport).
   */
  screen?: { top: number; bottom: number }
  margin?: number
  controlColumn?: number
  attributionBand?: number
  /**
   * Vertical stand-off between the point and the card (marker height).
   * Used by `computePopupAnchor` (the live-monitoring anchor path, merged
   * in from the 2026-08-24 live-monitoring cycle); the cockpit's
   * `resolvePopupAnchor` path ignores it.
   */
  offset?: number
}

/**
 * The vertical band the popup may occupy, in pane-local pixels — the pane's
 * usable height intersected with the visible viewport.
 */
export function popupUsableBand({
  pane,
  screen,
  margin = POPUP_EDGE_MARGIN,
  attributionBand = POPUP_ATTRIBUTION_BAND,
}: Pick<PopupAnchorInput, 'pane' | 'screen' | 'margin' | 'attributionBand'>): { top: number; bottom: number } {
  const top = Math.max(margin, screen ? screen.top + margin : margin)
  const bottom = Math.min(pane.height - attributionBand - margin, screen ? screen.bottom - margin : Infinity)
  return { top, bottom }
}

/**
 * The height cap the popup must respect so its header AND its footer CTA row
 * are always on screen — MUST H.38(b). Consumers hand this to the card as a
 * `max-block-size` and scroll the detail rows internally.
 */
export function popupMaxHeight(
  input: Pick<PopupAnchorInput, 'pane' | 'screen' | 'margin' | 'attributionBand'>,
  reserve: number = POPUP_WRAPPER_RESERVE,
  ceiling: number = POPUP_MAX_BLOCK_CEILING,
): number {
  const band = popupUsableBand(input)
  return Math.min(ceiling, Math.max(0, band.bottom - band.top - reserve))
}

/**
 * Picks the anchor that keeps the whole popup inside the pane's usable area.
 * Deterministic and side-effect free — this is the unit under test, so the
 * collision behaviour cannot silently regress the way E.19 and L.60 did.
 */
export function resolvePopupAnchor(input: PopupAnchorInput): PopupAnchor {
  const {
    point,
    pane,
    popup,
    screen,
    margin = POPUP_EDGE_MARGIN,
    controlColumn = POPUP_CONTROL_COLUMN,
    attributionBand = POPUP_ATTRIBUTION_BAND,
  } = input
  const usableStart = margin
  const usableEnd = pane.width - controlColumn - margin
  // The band is the pane's usable height INTERSECTED WITH THE VIEWPORT — a
  // pane hanging below the fold offers no usable room down there (H.38).
  const { top: usableTop, bottom: usableBottom } = popupUsableBand({ pane, screen, margin, attributionBand })

  // Vertical. Default is the spec's above-the-marker placement; flip below
  // only when there is genuinely no room above AND there is room below.
  const roomAbove = point.y - popup.height >= usableTop
  const roomBelow = point.y + popup.height <= usableBottom
  // Anchor in the band's top third: prefer BELOW the anchor whenever the card
  // fits there, so the card grows into the open space instead of crowding the
  // band's top edge. (MapLibre's `top` anchor pins the card's top to the
  // point — i.e. the card hangs below it; `bottom` puts it above. The UX
  // gate's wording is in visual terms, this is in MapLibre's.)
  const inTopThird = point.y <= usableTop + (usableBottom - usableTop) / 3
  const vertical: 'bottom' | 'top' =
    inTopThird && roomBelow ? 'top' : roomAbove || !roomBelow ? 'bottom' : 'top'

  // Horizontal. Centered when it fits; otherwise pin the corner that pushes
  // the card back into the pane. If BOTH sides overflow the card is wider
  // than the usable band — keep it off the control column, which is the edge
  // that swallows the CTA.
  const half = popup.width / 2
  const overflowsEnd = point.x + half > usableEnd
  const overflowsStart = point.x - half < usableStart
  let horizontal: '' | 'left' | 'right' = ''
  if (overflowsEnd && !overflowsStart) horizontal = 'right'
  else if (overflowsStart && !overflowsEnd) horizontal = 'left'
  else if (overflowsEnd && overflowsStart) horizontal = 'right'

  // A corner pin can itself overflow the opposite edge on a very narrow pane;
  // prefer the side with more room in that case.
  if (horizontal === 'right' && point.x - popup.width < usableStart) {
    if (usableEnd - point.x > point.x - usableStart) horizontal = 'left'
  } else if (horizontal === 'left' && point.x + popup.width > usableEnd) {
    if (point.x - usableStart > usableEnd - point.x) horizontal = 'right'
  }

  return horizontal ? (`${vertical}-${horizontal}` as PopupAnchor) : vertical
}

/** The popup's pane-local box once `anchor` has pinned it to `point`. */
export function popupBox(input: PopupAnchorInput, anchor: PopupAnchor) {
  const { point, popup } = input
  const [vertical, horizontal] = anchor.split('-') as [string, string | undefined]
  const start =
    horizontal === 'right' ? point.x - popup.width : horizontal === 'left' ? point.x : point.x - popup.width / 2
  const top = vertical === 'bottom' ? point.y - popup.height : point.y
  return { start, top, end: start + popup.width, bottom: top + popup.height }
}

/**
 * Residual overflow, in pixels, of the ANCHORED popup past the pane's usable
 * area — what the camera still has to pan by.
 *
 * Anchoring alone cannot save every case: a marker sitting UNDER the zoom
 * stack pins the card's edge inside the control column no matter which side
 * it flips to, which is precisely the "controls render over the popup" half
 * of H.38. `MapPanel` pans the map by this vector so the marker itself moves
 * out from under the chrome. Start/top overflow is reported negative.
 */
export function popupOverflow(input: PopupAnchorInput, anchor: PopupAnchor): { dx: number; dy: number } {
  const {
    pane,
    screen,
    margin = POPUP_EDGE_MARGIN,
    controlColumn = POPUP_CONTROL_COLUMN,
    attributionBand = POPUP_ATTRIBUTION_BAND,
  } = input
  const box = popupBox(input, anchor)
  const band = popupUsableBand({ pane, screen, margin, attributionBand })
  let dx = 0
  if (box.end > pane.width - controlColumn - margin) dx = box.end - (pane.width - controlColumn - margin)
  if (box.start - dx < margin) dx = box.start - margin
  let dy = 0
  if (box.bottom > band.bottom) dy = box.bottom - band.bottom
  // Top wins over bottom: the header row (✕ / track / open-in-new) is the part
  // that must stay reachable if the card is taller than the pane.
  if (box.top - dy < band.top) dy = box.top - band.top
  return { dx, dy }
}

/** True when the anchored popup clears every edge and avoid-rect outright. */
export function popupFitsPane(input: PopupAnchorInput, anchor: PopupAnchor): boolean {
  const { dx, dy } = popupOverflow(input, anchor)
  return dx === 0 && dy === 0
}

/** Figma card geometry (SPEC P0-2) — the pre-measurement fallback. */
export const DEFAULT_POPUP_SIZE = { width: 558, height: 448 }

export function computePopupAnchor({
  point,
  pane,
  popup,
  offset = 0,
  margin = 8,
}: PopupAnchorInput): MapPopupAnchor {
  /*
   * `bottom` = card ABOVE the marker (Figma default). Flip only when the card
   * cannot fit above without crossing the pane's top edge.
   *
   * When NEITHER side fits, take the side that overflows LESS (round-4 visual
   * N6 / UX-NOTES D26). A pane can be too short for either: the card needs
   * `offset + popup.height` (62 + 462 = 524 at 1920x1080) of clear room on
   * whichever side it takes, and the live pane is 1032, so a marker projected
   * into the ~16px band around the pane's middle satisfies no side at all.
   * The old code fell through to `top` unconditionally there and pushed the
   * card up to 14px past the pane's BOTTOM edge; below, the same marker only
   * costs a couple of pixels at the top. D26 asks for the card inside the
   * pane, so the tie-break minimises how far outside it lands rather than
   * always paying the worse of the two. A TIE keeps the previous behaviour
   * (`top`) — a pane too short to hold the card on either side is symmetric,
   * and nothing is gained by moving it.
   */
  const aboveTop = point.y - offset - popup.height
  const belowBottom = point.y + offset + popup.height
  const fitsAbove = aboveTop >= margin
  const fitsBelow = belowBottom <= pane.height - margin
  const vertical: 'bottom' | 'top' = fitsAbove
    ? 'bottom'
    : fitsBelow
      ? 'top'
      : margin - aboveTop < belowBottom - (pane.height - margin)
        ? 'bottom'
        : 'top'

  const half = popup.width / 2
  if (point.x - half < margin) return `${vertical}-left`
  if (point.x + half > pane.width - margin) return `${vertical}-right`
  return vertical
}

export interface FocusOffsetInput {
  /** Map pane size in CSS pixels. */
  pane: { width: number; height: number }
  /** Measured card size; the Figma 558x448 by default. */
  popup: { width: number; height: number }
  /** Vertical stand-off between the marker point and the card. */
  offset?: number
  /** Keep-inside-the-pane breathing room above the card. */
  margin?: number
  /** Room kept BELOW the marker so the marker itself never hugs the pane's
   *  bottom edge (the attribution strip lives there). */
  markerMargin?: number
}

/**
 * Where a selection-driven camera focus should put the marker, expressed as
 * MapLibre's `easeTo`/`flyTo` `offset: [x, y]` — the pixel offset of the
 * eased-to centre from the pane's centre.
 *
 * WHY THIS EXISTS (run acceptance P0-2, the round-1 P0). Selecting a vehicle
 * used to centre the MARKER in the pane, which puts the marker's projected
 * point at `paneHeight / 2`. `computePopupAnchor` can only prefer `bottom`
 * (card ABOVE the marker, per Figma 495:2998) when
 * `point.y - offset - popup.height >= margin`. At 1920x1080 the live pane is
 * 1032 tall, so that test reads `516 - 62 - 448 = 6` against a margin of 8 —
 * it MISSED BY TWO PIXELS on every single selection, and the card flipped
 * below the marker every time. Shaving the margin or the marker offset would
 * leave the behaviour one pixel from breaking again, and would still fail at
 * the shorter gated viewports (1440x900, 1280x800).
 *
 * The real fix is framing: centre the marker AND its card as one block
 * instead of the marker alone, so the marker lands low enough that the
 * preferred `bottom` anchor is satisfiable in the normal case and the flip
 * logic is left to handle only the genuine edge cases (a marker near the
 * pane's top, or a pane too short to hold the card at all).
 *
 * Pure and pane-relative — no DOM, no map instance — so it is unit-testable
 * next to `computePopupAnchor`, which is the function it has to satisfy.
 */
export function computeFocusOffset({
  pane,
  popup,
  offset = 0,
  margin = 8,
  markerMargin = 64,
}: FocusOffsetInput): [number, number] {
  const centre = pane.height / 2
  if (!Number.isFinite(centre) || centre <= 0) return [0, 0]
  // The composite block is [markerY - offset - popup.height, markerY];
  // centring it puts the marker this far below the pane's centre.
  const ideal = centre + (offset + popup.height) / 2
  // Never push the marker itself out of (or hard against) the pane's bottom…
  const capped = Math.min(ideal, pane.height - markerMargin)
  // …and never pull it ABOVE the centre — a pane too short to hold the card
  // gets the old centred framing back, and `computePopupAnchor` flips.
  const y = Math.max(capped, centre)
  // A pane too short to hold the card above the marker even at that cap gets
  // the plain centred framing back: biasing the marker down would only make
  // the flipped-below card crop harder. `computePopupAnchor` flips instead.
  if (y - offset - popup.height < margin) return [0, 0]
  // A whole number keeps the projected point off half-pixels, so the
  // `fitsAbove` comparison never turns on sub-pixel rounding.
  return [0, Math.round(y - centre)]
}

/** Does the card fit above the marker once the focus offset has been applied?
 *  Mirrors `computePopupAnchor`'s `fitsAbove` test — exported so callers (and
 *  tests) can assert the framing actually satisfies the anchor it feeds. */
export function focusOffsetFitsCardAbove(input: FocusOffsetInput): boolean {
  const { pane, popup, offset = 0, margin = 8 } = input
  const [, dy] = computeFocusOffset(input)
  return pane.height / 2 + dy - offset - popup.height >= margin
}

/** The selected marker's pane-relative point, given a projector. */
export function projectMarkerPoint(
  marker: Pick<MapMarkerDatum, 'position'>,
  project: (position: [number, number]) => { x: number; y: number },
): { x: number; y: number } {
  return project(marker.position)
}
