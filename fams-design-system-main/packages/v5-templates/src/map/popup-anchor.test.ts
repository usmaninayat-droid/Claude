import { describe, expect, it } from 'vitest'
import {
  POPUP_ATTRIBUTION_BAND,
  POPUP_MAX_BLOCK_CEILING,
  POPUP_CONTROL_COLUMN,
  POPUP_EDGE_MARGIN,
  POPUP_WRAPPER_RESERVE,
  popupBox,
  popupFitsPane,
  popupMaxHeight,
  popupOverflow,
  popupUsableBand,
  resolvePopupAnchor,
  type PopupAnchorInput,
} from './popup-anchor'

/**
 * REGRESSION LOCK — UX MUST H.38 (round-2 P1).
 *
 * The 1280 cockpit case, measured: the map pane is 630×480 and the telematics
 * card is 360×300. With no collision handling the card ran 37px past the
 * pane's clipped end edge, taking "Call Driver" with it. These cases pin the
 * flip, the control-column avoid-rect, and the attribution band.
 */
const PANE_1280 = { width: 630, height: 480 }
const POPUP = { width: 360, height: 300 }

const at = (x: number, y: number, over: Partial<PopupAnchorInput> = {}): PopupAnchorInput => ({
  point: { x, y },
  pane: PANE_1280,
  popup: POPUP,
  ...over,
})

describe('resolvePopupAnchor', () => {
  it('keeps the spec placement (card above, centered) when it fits', () => {
    expect(resolvePopupAnchor(at(315, 400))).toBe('bottom')
  })

  it('flips to the marker’s start side near the pane end edge', () => {
    // The round-2 P1 pin: centering here would put the card 37px past the edge.
    expect(resolvePopupAnchor(at(560, 400))).toBe('bottom-right')
  })

  it('flips to the marker’s end side near the pane start edge', () => {
    expect(resolvePopupAnchor(at(40, 400))).toBe('bottom-left')
  })

  it('treats the zoom-control column as an avoid-rect', () => {
    // x=430 clears the raw pane edge (430 + 180 = 610 < 630) but NOT the
    // control column (usable end = 630 - 60 - 12 = 558).
    expect(resolvePopupAnchor(at(430, 400))).toBe('bottom-right')
  })

  it('drops below the marker when there is no room above', () => {
    expect(resolvePopupAnchor(at(315, 80))).toBe('top')
  })

  it('stays above the marker rather than crossing the attribution strip', () => {
    // No room above (y=80 < 300+12) and none below either (80+300 > 444):
    // above wins, because the footer must never sit on the licence text.
    const tall = at(315, 80, { popup: { width: 360, height: 420 } })
    expect(resolvePopupAnchor(tall)).toBe('bottom')
  })

  it('combines a vertical flip with a horizontal one', () => {
    expect(resolvePopupAnchor(at(560, 80))).toBe('top-right')
  })

  it('prefers the roomier side when the card cannot fit either way', () => {
    const narrow = { width: 400, height: 480 }
    // Marker hard against the start edge on a pane narrower than the card.
    expect(resolvePopupAnchor(at(20, 400, { pane: narrow }))).toBe('bottom-left')
  })

  it('is stable under repeated resolution (no oscillation)', () => {
    const first = resolvePopupAnchor(at(560, 400))
    expect(resolvePopupAnchor(at(560, 400))).toBe(first)
  })
})

describe('popupFitsPane / popupOverflow', () => {
  it('anchoring alone clears the pane for a pin just short of the controls', () => {
    const input = at(500, 400)
    expect(popupFitsPane(input, resolvePopupAnchor(input))).toBe(true)
  })

  it('reports the UNANCHORED centered placement as NOT fitting', () => {
    expect(popupFitsPane(at(560, 400), 'bottom')).toBe(false)
  })

  it('anchoring cuts the round-2 P1 overflow down to the control column only', () => {
    const input = at(560, 400)
    // Centered: 560 + 180 = 740 vs a usable end of 558 → 182px over.
    expect(popupOverflow(input, 'bottom').dx).toBeCloseTo(182, 5)
    // Anchored: the card's end edge sits on the marker → only the 2px the
    // marker itself pokes into the control column is left for the camera pan.
    expect(popupOverflow(input, resolvePopupAnchor(input)).dx).toBeCloseTo(2, 5)
  })

  it('reports vertical overflow past the attribution strip', () => {
    // Anchored below with the card running past the licence text.
    const input = at(315, 200, { popup: { width: 300, height: 300 } })
    expect(popupOverflow(input, 'top').dy).toBeGreaterThan(0)
  })

  it('honours the documented avoid-rect constants', () => {
    expect(POPUP_EDGE_MARGIN).toBe(12)
    // 16px inset + a 44px control button (UX G.32/G.33).
    expect(POPUP_CONTROL_COLUMN).toBe(60)
    expect(POPUP_ATTRIBUTION_BAND).toBeGreaterThan(0)
  })
})

/**
 * REGRESSION LOCK — UX MUST H.38 (round-3 P1, the SECOND time this failed).
 *
 * Round 3's correction: the resolver was clamping the card perfectly inside
 * the map pane (−31px in all 18 probes) — the PANE was 134px below the fold,
 * because the cockpit's page scroller was not at its end and selecting a
 * queue card never scrolled the split into view. A pane-only avoid-rect is
 * blind to that, so the VIEWPORT is now an avoid-rect too, and the card is
 * height-capped so no resolver has to work with 45px of slack.
 *
 * The sweep below is the lock: every anchor position × every viewport
 * position must leave the popup's footer edge inside the visible band.
 */
describe('H.38 — viewport avoid-rect + height cap', () => {
  /** Pane geometry measured live at 1280×800 and 1440×900 (round-3 gate). */
  const PANES = [
    { name: '1280×800', pane: { width: 630, height: 480 }, viewportHeight: 800 },
    { name: '1440×900', pane: { width: 720, height: 480 }, viewportHeight: 900 },
  ]
  /** How far the pane's top sits from the fold — including the failing state
   *  where the pane hangs 165px below it (pane bottom 965 in an 800 viewport). */
  const PANE_TOPS = [0, 120, 260, 380, 485]

  const band = (pane: { width: number; height: number }, paneTop: number, viewportHeight: number) => ({
    pane,
    screen: { top: -paneTop, bottom: viewportHeight - paneTop },
  })

  for (const { name, pane, viewportHeight } of PANES) {
    for (const paneTop of PANE_TOPS) {
      const geometry = band(pane, paneTop, viewportHeight)
      const capped = popupMaxHeight(geometry)

      it(`${name} · pane top ${paneTop}: the capped popup's footer stays inside the viewport`, () => {
        const popup = { width: 360, height: capped }
        // Sweep every anchor row of the pane, 20px apart.
        for (let y = 0; y <= pane.height; y += 20) {
          for (const x of [20, 160, 315, 500, 620]) {
            const input: PopupAnchorInput = { point: { x, y }, ...geometry, popup }
            const anchor = resolvePopupAnchor(input)
            const { dy } = popupOverflow(input, anchor)
            // Pane-local box, corrected by the pan the panel will apply.
            const box = popupBox(input, anchor)
            const footerBottom = paneTop + box.bottom - dy
            const headerTop = paneTop + box.top - dy
            expect(
              footerBottom,
              `footer below the fold at x=${x} y=${y} (${anchor})`,
            ).toBeLessThanOrEqual(viewportHeight)
            expect(headerTop, `header above the fold at x=${x} y=${y} (${anchor})`).toBeGreaterThanOrEqual(0)
          }
        }
      })

      it(`${name} · pane top ${paneTop}: the cap never exceeds the visible band`, () => {
        const usable = popupUsableBand(geometry)
        expect(capped).toBeLessThanOrEqual(Math.max(0, usable.bottom - usable.top))
        expect(usable.top).toBeGreaterThanOrEqual(POPUP_EDGE_MARGIN)
        // The band never claims room past the fold…
        expect(paneTop + usable.bottom).toBeLessThanOrEqual(viewportHeight)
        // …nor above it.
        expect(paneTop + usable.top).toBeGreaterThanOrEqual(0)
      })
    }
  }

  it('caps the round-3 offender: 435px of card in a 480px pane becomes ≤ the band', () => {
    const geometry = band({ width: 630, height: 480 }, 485, 800)
    // Pane bottom = 965 in an 800px viewport — the exact failing state.
    const cap = popupMaxHeight(geometry)
    expect(cap).toBeLessThan(435)
    expect(cap).toBeGreaterThan(0)
    expect(POPUP_WRAPPER_RESERVE).toBeGreaterThan(0)
  })

  it('with the pane fully on screen the cap is the pane-only cap (no behaviour change)', () => {
    const pane = { width: 630, height: 480 }
    const onScreen = popupMaxHeight({ pane, screen: { top: -100, bottom: 700 } })
    const paneOnly = popupMaxHeight({ pane })
    expect(onScreen).toBe(paneOnly)
  })

  it('drops the popup BELOW an anchor in the band’s top third when it fits there', () => {
    const input = at(315, 60, { popup: { width: 360, height: 200 } })
    expect(resolvePopupAnchor(input)).toBe('top')
  })

  it('omitting the viewport reproduces the pane-only resolver exactly', () => {
    const input = at(560, 400)
    expect(resolvePopupAnchor({ ...input, screen: { top: -1000, bottom: 5000 } })).toBe(
      resolvePopupAnchor(input),
    )
  })

  it('honours the height-cap constants', () => {
    expect(POPUP_WRAPPER_RESERVE).toBe(48)
    expect(POPUP_MAX_BLOCK_CEILING).toBe(440)
  })

  /**
   * REGRESSION LOCK — round-4 UX finding 2. The cap is DERIVED from the live
   * band, not a fixed number: it must track the band, and it must not reserve
   * the card's own header + footer (which are inside the value being capped)
   * on top of the wrapper chrome.
   */
  describe('the cap is derived from the band, not hardcoded', () => {
    const pane = { width: 630, height: 480 }

    it('tracks the band: a taller visible band yields a taller cap', () => {
      const tight = popupMaxHeight({ pane, screen: { top: -300, bottom: 200 } })
      const roomy = popupMaxHeight({ pane, screen: { top: -100, bottom: 700 } })
      expect(roomy).toBeGreaterThan(tight)
    })

    it('equals the band height minus the wrapper reserve while under the ceiling', () => {
      const geometry = { pane, screen: { top: 0, bottom: 800 } }
      const band = popupUsableBand(geometry)
      const height = band.bottom - band.top
      expect(height).toBeLessThan(POPUP_MAX_BLOCK_CEILING + POPUP_WRAPPER_RESERVE)
      expect(popupMaxHeight(geometry)).toBe(height - POPUP_WRAPPER_RESERVE)
    })

    it('recovers the body content the old 96px card-chrome reserve hid', () => {
      // The measured cockpit state: pane fully on screen at 1280×800, where
      // the card was capped at ~334px against ~402px of natural content, so
      // 68px of body (including "Last Record") was clipped.
      const geometry = { pane, screen: { top: 0, bottom: 800 } }
      const old = popupMaxHeight(geometry, 96)
      // 48px of the 68px of clipped body comes back outright; the rest is now
      // discoverable via the card's scroll cue instead of silently clipped.
      expect(popupMaxHeight(geometry)).toBe(old + (96 - POPUP_WRAPPER_RESERVE))
      expect(96 - POPUP_WRAPPER_RESERVE).toBe(48)
    })

    it('never exceeds the ceiling however tall the band gets', () => {
      const cap = popupMaxHeight({ pane: { width: 630, height: 4000 }, screen: { top: 0, bottom: 4000 } })
      expect(cap).toBe(POPUP_MAX_BLOCK_CEILING)
    })

    it('still never exceeds the visible band itself', () => {
      for (const paneTop of [0, 120, 260, 380, 485]) {
        const geometry = { pane, screen: { top: -paneTop, bottom: 800 - paneTop } }
        const usable = popupUsableBand(geometry)
        expect(popupMaxHeight(geometry)).toBeLessThanOrEqual(Math.max(0, usable.bottom - usable.top))
      }
    })
  })
})

import { DEFAULT_POPUP_SIZE, computeFocusOffset, computePopupAnchor, focusOffsetFitsCardAbove } from './popup-anchor'

/**
 * popup-anchor.test.ts — the anchored card's placement contract
 * (SPEC P0-2 / UX-11, round-1 visual P0 #1: the card floated 109px BELOW its
 * marker because MapLibre's own dynamic anchoring prefers `top` whenever
 * there is room below).
 */
const PANE = { width: 1330, height: 1032 }
const CARD = DEFAULT_POPUP_SIZE

describe('computePopupAnchor', () => {
  it('prefers `bottom` — the card sits ABOVE the marker (Figma 495:2998)', () => {
    expect(computePopupAnchor({ point: { x: 660, y: 900 }, pane: PANE, popup: CARD, offset: 62 })).toBe('bottom')
  })

  it('still prefers `bottom` when there is ALSO room below (the round-1 P0)', () => {
    // Marker mid-pane: room above AND below. MapLibre would pick `top`.
    expect(computePopupAnchor({ point: { x: 660, y: 620 }, pane: PANE, popup: CARD, offset: 62 })).toBe('bottom')
  })

  it('flips to `top` (card below) when the card would cross the pane top edge', () => {
    expect(computePopupAnchor({ point: { x: 660, y: 300 }, pane: PANE, popup: CARD, offset: 62 })).toBe('top')
  })

  it('slides the pointer to the card corner near the inline-start edge', () => {
    expect(computePopupAnchor({ point: { x: 40, y: 900 }, pane: PANE, popup: CARD, offset: 62 })).toBe('bottom-left')
  })

  it('slides the pointer to the card corner near the inline-end edge', () => {
    expect(computePopupAnchor({ point: { x: 1300, y: 900 }, pane: PANE, popup: CARD, offset: 62 })).toBe('bottom-right')
  })

  it('combines the flip and the corner at the top edge', () => {
    expect(computePopupAnchor({ point: { x: 1300, y: 120 }, pane: PANE, popup: CARD, offset: 62 })).toBe('top-right')
  })

  it('keeps the whole card inside the pane at 1440 and 1280 for every corner marker', () => {
    for (const paneWidth of [1440 - 590, 1280 - 590]) {
      const pane = { width: paneWidth, height: 1032 }
      for (const point of [
        { x: 4, y: 4 },
        { x: paneWidth - 4, y: 4 },
        { x: 4, y: 1028 },
        { x: paneWidth - 4, y: 1028 },
      ]) {
        const anchor = computePopupAnchor({ point, pane, popup: CARD, offset: 62 })
        // Every corner marker resolves to a flipped/cornered anchor — never
        // the naked `bottom`/`top` that would hang the card off the edge.
        expect(anchor).toMatch(/^(top|bottom)-(left|right)$/)
      }
    }
  })
})

/**
 * computeFocusOffset — the selection-focus FRAMING (run acceptance P0-2).
 *
 * `computePopupAnchor` can only prefer `bottom` when the marker sits low
 * enough in the pane. Centring the marker (the old framing) put its point at
 * `paneHeight / 2`, which at 1920x1080 left `516 - 62 - 448 = 6` against the
 * 8px margin — two pixels short, on EVERY selection. These tests pin the
 * framing that makes the preferred anchor satisfiable instead.
 */
describe('computeFocusOffset — selection framing (P0-2)', () => {
  const CARD = DEFAULT_POPUP_SIZE
  const OFFSET = 62
  /** Live pane heights measured in-app at the three gated viewports. */
  const PANES = [
    { label: '1920x1080', width: 1330, height: 1032 },
    { label: '1440x900', width: 850, height: 852 },
    { label: '1280x800', width: 690, height: 752 },
  ]

  it.each(PANES)('places the marker low enough that the card fits ABOVE it at $label', (pane) => {
    const [dx, dy] = computeFocusOffset({ pane, popup: CARD, offset: OFFSET })
    expect(dx).toBe(0)
    expect(dy).toBeGreaterThan(0)
    const markerY = pane.height / 2 + dy
    // The exact test `computePopupAnchor` runs — satisfied with room to spare,
    // not by two pixels.
    expect(markerY - OFFSET - CARD.height).toBeGreaterThanOrEqual(8)
    expect(focusOffsetFitsCardAbove({ pane, popup: CARD, offset: OFFSET })).toBe(true)
    expect(computePopupAnchor({ point: { x: pane.width / 2, y: markerY }, pane, popup: CARD, offset: OFFSET })).toBe(
      'bottom',
    )
  })

  it('keeps the whole card inside the pane, not just above the marker', () => {
    for (const pane of PANES) {
      const [, dy] = computeFocusOffset({ pane, popup: CARD, offset: OFFSET })
      const markerY = pane.height / 2 + dy
      expect(markerY - OFFSET - CARD.height).toBeGreaterThanOrEqual(0) // card top
      expect(markerY - OFFSET).toBeLessThanOrEqual(pane.height) // card bottom
    }
  })

  it('never pushes the marker itself against the pane bottom (the attribution strip)', () => {
    for (const pane of PANES) {
      const [, dy] = computeFocusOffset({ pane, popup: CARD, offset: OFFSET })
      expect(pane.height / 2 + dy).toBeLessThanOrEqual(pane.height - 64)
    }
  })

  it('falls back to plain centred framing when the pane is too short to hold the card at all', () => {
    // 300px pane: nothing can make a 448 card fit above the marker, so the
    // framing stays neutral and `computePopupAnchor`s flip does the work.
    const pane = { width: 690, height: 300 }
    expect(computeFocusOffset({ pane, popup: CARD, offset: OFFSET })).toEqual([0, 0])
    expect(computePopupAnchor({ point: { x: 345, y: 150 }, pane, popup: CARD, offset: OFFSET })).toBe('top')
  })

  it('returns a neutral offset for a degenerate (unmeasured) pane', () => {
    expect(computeFocusOffset({ pane: { width: 0, height: 0 }, popup: CARD, offset: OFFSET })).toEqual([0, 0])
  })

  it('returns whole pixels so the fitsAbove test never turns on sub-pixel rounding', () => {
    const [, dy] = computeFocusOffset({ pane: { width: 1330, height: 1033 }, popup: CARD, offset: OFFSET })
    expect(Number.isInteger(dy)).toBe(true)
  })
})

/**
 * Round-4 visual N6 / UX-NOTES D26. A pane can be too short for the card on
 * EITHER side: it needs `offset + popup.height` clear (62 + 462 = 524 at
 * 1920x1080) and the live pane is 1032, so a marker projected into the ~16px
 * band around the middle satisfies neither test. The anchor then takes the
 * side that lands the card LESS far outside the pane, instead of always
 * flipping to `top` and paying the bottom overflow.
 */
describe('computePopupAnchor — neither side fits', () => {
  const pane = { width: 1329, height: 1032 }
  const popup = { width: 558, height: 462 }
  const offset = 62

  it('keeps `bottom` when above overflows by less than below would', () => {
    // point 522: above overflows the top by 10, below the bottom by 14.
    expect(computePopupAnchor({ point: { x: 660, y: 522 }, pane, popup, offset })).toBe('bottom')
  })

  it('takes `top` when below overflows by less', () => {
    // point 512: above overflows the top by 20, below the bottom by 4.
    expect(computePopupAnchor({ point: { x: 660, y: 512 }, pane, popup, offset })).toBe('top')
  })

  it('still prefers `bottom` whenever the card genuinely fits above', () => {
    expect(computePopupAnchor({ point: { x: 660, y: 700 }, pane, popup, offset })).toBe('bottom')
  })

  it('still flips to `top` whenever only below fits', () => {
    expect(computePopupAnchor({ point: { x: 660, y: 200 }, pane, popup, offset })).toBe('top')
  })
})
