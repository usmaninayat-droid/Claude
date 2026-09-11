/**
 * maplibre-popup-reset.ts — restyle MapLibre's own popup chrome, at runtime.
 *
 * MapLibre's stylesheet sets `.maplibregl-popup-content { padding: 15px 10px }`.
 * The anchored vehicle card owns its entire box (558x448 per Figma 495:4143,
 * shadow included), so that padding is pure damage on two counts: it offsets
 * the card from the tip that is supposed to touch it, and — because the popup
 * is MEASURED to decide whether the card fits above its marker — it inflates
 * the measurement by 30px, which is enough to flip cards to the "below the
 * marker" anchor that round 1 filed as the P0.
 *
 * Why not a Tailwind arbitrary variant (`[&_.maplibregl-popup-content]:p-0`)?
 * That is what was there, and it silently did nothing — but NOT for the reason
 * originally recorded here. The earlier note blamed the consuming app's
 * Tailwind content globs; that is WRONG. The demo app's `app/src/styles.css`
 * explicitly `@source`s all three DS package sources, so the class IS emitted.
 * It loses on the CASCADE: Tailwind v4 emits utilities inside
 * `@layer utilities`, and UNLAYERED CSS — which `maplibre-gl.css` is — beats
 * any layered rule no matter how specific the layered selector. So no
 * package-authored utility can ever override a vendor stylesheet that ships
 * unlayered. (The other pitfalls this run recorded — negative logical insets,
 * arbitrary size classes for load-bearing geometry, side-effect-only imports
 * under `sideEffects: false` — are separate and remain as recorded.)
 *
 * The wrong root cause cost this run a second bug: the tip geometry below was
 * left as ~20 lines of the same dead arbitrary variants on `MapPanel`'s popup
 * `className` (Phase 7 code review finding 1), so the Figma pointer shipped at
 * MapLibre's default ~20x10 nub.
 *
 * Why not a plain `.css` file next to `maplibre-gl.css`? tsup extracts package
 * CSS into a sibling `dist/map/index.css` and DROPS the import from the
 * emitted JS, so the rule would ship but never load unless every consumer
 * imported it by hand.
 *
 * A style element injected from an explicitly CALLED function always ships,
 * always loads, and is unlayered itself — so it meets MapLibre's sheet on
 * equal terms and wins on specificity. Note the call has to be explicit: the
 * package declares `sideEffects: false`, so a side-effect-only
 * `import './maplibre-popup-reset'` is legitimately tree-shaken out.
 */
const STYLE_ID = 'fams-maplibre-popup-reset'

/**
 * Marker class for a CHROME-LESS popup — one whose rendered body brings its
 * own surface (`MapPanel popupChrome={false}`, e.g. `VehiclePopupCard`).
 * Put on MapLibre's `.maplibregl-popup` root via `Popup#className`, it is what
 * scopes the rules below so chromed popups (every other map in the DS) keep
 * MapLibre's default surface and default 10px tip.
 */
export const MAPLIBRE_POPUP_CHROMELESS_CLASS = 'fams-popup-chromeless'

/**
 * Marker class for a CHROMED popup — `MapPanel popupChrome` (the default), the
 * dashboard map widget, `LocationMap*`, and every downstream consumer whose
 * popup body is bare content rather than a self-contained card.
 *
 * It exists for the same reason the chrome-less class does. The chromed branch
 * used to carry its surface as six Tailwind arbitrary variants on the popup's
 * `className` (`[&_.maplibregl-popup-content]:rounded-lg …:bg-card …:shadow-md`
 * …), and — per the cascade note at the top of this file — four of those six
 * could never take effect: `maplibre-gl.css` sets `border-radius`, `background`
 * and `box-shadow` on `.maplibregl-popup-content` UNLAYERED, and unlayered CSS
 * beats `@layer utilities` at any specificity. So the DS card chrome never
 * rendered; MapLibre's own 3px white chrome did. (Only `border`/`border-border`
 * worked, because MapLibre declares no `border` there at all, and `p-0` only
 * appeared to work because the injected padding reset used to be unscoped.)
 *
 * That was Phase 7 code-review finding F1 — the third instance of the same
 * pitfall in this run. The treatment now ships as INJECTED RULE TEXT, like the
 * chrome-less one, and the test asserts the emitted rules rather than the class
 * names that hid the bug for three rounds.
 */
export const MAPLIBRE_POPUP_CHROMED_CLASS = 'fams-popup-chromed'

/** Figma 495:2998 pointer: a 20x20 triangle — 10px of inline border either
 *  side of a 20px pointing edge. MapLibre's default is 10px on every side,
 *  which reads as a nub (round-2 visual measured 20x10). */
const TIP_INLINE = '0.625rem'
const TIP_POINT = '1.25rem'

/**
 * How far the triangle's BASE is tucked BEHIND the card (round-4 visual N4).
 *
 * The 20x20 polygon is not 20px of visible pointer: SPEC P0-2 puts it inside a
 * **558 x 462** wrapper over a 448-tall card, i.e. only ~14px protrude. The
 * reference PNG (`specs/live-monitoring/frames/card-infowindow-495-4143.png`,
 * measured at 1:1) agrees exactly — the card's white body ends at y454 and the
 * pure-white pointer runs y454 (14px wide) to y463 (4px wide); that taper of
 * 1.11px of width per row puts the 20px base at y448.6 and the apex at y467.
 * Base 5.4px behind the card edge, 13px of protrusion, wrapper 461. Round 4
 * measured the app's wrapper at 468 (448 + a fully exposed 20px tip).
 *
 * A NEGATIVE MARGIN on the tip's card-facing physical side is what closes
 * that: it pulls the base under the card AND shortens the wrapper by the same
 * amount, so the apex — which is what MapLibre pins to the marker — does not
 * move. `VehiclePopupCard`'s own `POINTER_STYLE` has documented the same -6px
 * since the card was built; this is the MapLibre-drawn tip finally agreeing
 * with it.
 *
 * The card's bottom 16px are its own white padding below the #F2F4F7 footer
 * strip (the reference's last card row is pure white across its full width),
 * so a white triangle base tucked under it is invisible either way round.
 */
const TIP_TUCK = '-0.375rem'

/* MapLibre colours exactly ONE border side per anchor (its own rules set the
   opposite side to `none`), so each anchor needs its own single-side rule.
   PHYSICAL sides, not logical: MapLibre's anchor classes are physical, and
   `border-inline-end` would flip to the wrong side under `dir="rtl"` — which
   is the bug the superseded `border-e-card` / `border-s-card` classes carried.
   Top/bottom anchors additionally take the Figma geometry (the 20px point AND
   the N4 tuck); left/right anchors are tinted only, exactly as the classes
   they replace did — they keep MapLibre's own 10px nub, which a 6px tuck
   would eat more than half of, and `computePopupAnchor` never returns them
   for the card in the first place (it emits `top*`/`bottom*` only). */
const TIP_ANCHORS: Array<{ anchor: string; side: 'top' | 'bottom' | 'left' | 'right'; point: boolean }> = [
  { anchor: 'top', side: 'bottom', point: true },
  { anchor: 'top-left', side: 'bottom', point: true },
  { anchor: 'top-right', side: 'bottom', point: true },
  { anchor: 'bottom', side: 'top', point: true },
  { anchor: 'bottom-left', side: 'top', point: true },
  { anchor: 'bottom-right', side: 'top', point: true },
  { anchor: 'left', side: 'right', point: false },
  { anchor: 'right', side: 'left', point: false },
]

/** The full sheet, as text. Exported for the test that asserts the rules are
 *  actually emitted — a class name present in the markup proves nothing, which
 *  is exactly how finding 1 survived to Phase 7. */
export function maplibrePopupResetCss(): string {
  const root = `.maplibregl-popup.${MAPLIBRE_POPUP_CHROMELESS_CLASS}`
  const chromed = `.maplibregl-popup.${MAPLIBRE_POPUP_CHROMED_CLASS}`
  const rules = [
    // The measurement fix described above, on BOTH of `MapPanel`'s popup
    // classes rather than on `.maplibregl-popup-content` unscoped (F2). Every
    // popup this package renders carries one of the two, so what MapPanel
    // consumers see is unchanged — but a MapLibre popup this package did not
    // render (FAMS Desk's own, say) keeps MapLibre's 15px/10px padding instead
    // of silently losing it the moment anything imports `MapPanel`.
    `${root} .maplibregl-popup-content,${chromed} .maplibregl-popup-content{padding:0}`,
    // Chromed: the DS card surface the dead arbitrary variants meant to apply.
    // Token values, so it follows theme and tenant; `border` is the one
    // declaration of the six that DID work before, restated here so the whole
    // surface lives in one rule.
    `${chromed} .maplibregl-popup-content{border-radius:var(--radius-lg);border:1px solid var(--color-border);background:var(--color-card);box-shadow:var(--shadow-md)}`,
    // Chrome-less: the body brings its own surface, so MapLibre's goes away.
    `${root} .maplibregl-popup-content{background:transparent;border:0;border-radius:0;box-shadow:none}`,
    // …but MapLibre's OWN tip stays, tinted to the card, because it is the
    // only anchor pointer that FOLLOWS the computed anchor.
    `${root} .maplibregl-popup-tip{border-left-width:${TIP_INLINE};border-right-width:${TIP_INLINE}}`,
  ]
  for (const { anchor, side, point } of TIP_ANCHORS) {
    const decls = [`border-${side}-color:var(--color-card)`]
    // `side` is the border MapLibre colours, which is always the one FACING
    // the content — so `margin-<side>` is, for every anchor, the physical
    // margin that pulls the base behind the card. No per-anchor table, and no
    // logical property (MapLibre's anchor classes are physical; an inline
    // margin would tuck the wrong side under `dir="rtl"`).
    if (point) decls.push(`border-${side}-width:${TIP_POINT}`, `margin-${side}:${TIP_TUCK}`)
    rules.push(`${root}.maplibregl-popup-anchor-${anchor} .maplibregl-popup-tip{${decls.join(';')}}`)
  }
  return rules.join('')
}

export function installMaplibrePopupReset(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = maplibrePopupResetCss()
  document.head.append(style)
}
