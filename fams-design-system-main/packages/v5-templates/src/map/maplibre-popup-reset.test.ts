import { describe, expect, it } from 'vitest'
import {
  MAPLIBRE_POPUP_CHROMED_CLASS,
  MAPLIBRE_POPUP_CHROMELESS_CLASS,
  installMaplibrePopupReset,
  maplibrePopupResetCss,
} from './maplibre-popup-reset'

/**
 * These assert the EMITTED RULE TEXT, never a class name on a React element.
 * The Phase 7 code review's finding 1 was exactly a set of Tailwind arbitrary
 * variants that were present in the markup and had no effect at all, because
 * package utilities land in `@layer utilities` and MapLibre's stylesheet is
 * unlayered. A test that asserts "the element has the class" would have passed
 * throughout. Only "the rule ships" catches it.
 */
describe('maplibre popup reset', () => {
  it('injects the sheet once, however often it is called', () => {
    installMaplibrePopupReset()
    installMaplibrePopupReset()
    const styles = document.querySelectorAll('#fams-maplibre-popup-reset')
    expect(styles).toHaveLength(1)
    expect(styles[0].textContent).toBe(maplibrePopupResetCss())
  })

  it('zeroes MapLibre’s popup padding for BOTH of MapPanel’s popups, and only those', () => {
    const css = maplibrePopupResetCss()
    expect(css).toContain(
      `.maplibregl-popup.${MAPLIBRE_POPUP_CHROMELESS_CLASS} .maplibregl-popup-content,` +
        `.maplibregl-popup.${MAPLIBRE_POPUP_CHROMED_CLASS} .maplibregl-popup-content{padding:0}`,
    )
    // F2: nothing this sheet emits reaches a `.maplibregl-popup-content` that
    // this package did not render. The padding reset used to be emitted
    // unscoped, which silently removed MapLibre's 15px/10px from every popup
    // in the document the moment anything imported `MapPanel`.
    for (const selector of css.split('}').filter(Boolean).map((r) => r.split('{')[0])) {
      for (const part of selector.split(',')) {
        expect(part.trim().startsWith('.maplibregl-popup.fams-popup-')).toBe(true)
      }
    }
  })

  /**
   * F1: the chromed branch's DS surface. It used to be six Tailwind arbitrary
   * variants on the popup `className`; four of the six could never win against
   * MapLibre's UNLAYERED sheet, so chromed popups rendered MapLibre's own 3px
   * white chrome. Assert the RULE TEXT — the classes were present in the markup
   * the whole time.
   */
  it('gives a CHROMED popup the DS card surface, in token values', () => {
    const css = maplibrePopupResetCss()
    expect(css).toContain(
      `.maplibregl-popup.${MAPLIBRE_POPUP_CHROMED_CLASS} .maplibregl-popup-content{` +
        'border-radius:var(--radius-lg);border:1px solid var(--color-border);' +
        'background:var(--color-card);box-shadow:var(--shadow-md)}',
    )
    // ...and it never reaches the chrome-less card, whose body owns its surface.
    expect(css).not.toContain(
      `.maplibregl-popup.${MAPLIBRE_POPUP_CHROMELESS_CLASS} .maplibregl-popup-content{border-radius`,
    )
  })

  it('drops MapLibre’s own surface only for a CHROME-LESS popup', () => {
    const css = maplibrePopupResetCss()
    expect(css).toContain(
      `.maplibregl-popup.${MAPLIBRE_POPUP_CHROMELESS_CLASS} .maplibregl-popup-content{background:transparent;border:0;border-radius:0;box-shadow:none}`,
    )
    // A chromed popup keeps a surface — it just gets the DS one, from its own
    // scoped rule (asserted above), never this one.
    const unscoped = css.match(/(^|})\.maplibregl-popup-content\{/g) ?? []
    expect(unscoped).toHaveLength(0)
  })

  it('sizes the tip to Figma’s 20x20 triangle, per anchor', () => {
    const css = maplibrePopupResetCss()
    const root = `.maplibregl-popup.${MAPLIBRE_POPUP_CHROMELESS_CLASS}`
    // 10px of inline border either side...
    expect(css).toContain(
      `${root} .maplibregl-popup-tip{border-left-width:0.625rem;border-right-width:0.625rem}`,
    )
    // ...of a 20px pointing edge. MapLibre's default is 10px on every side,
    // which round-2 measured as a ~20x10 nub.
    expect(css).toContain(
      `${root}.maplibregl-popup-anchor-bottom .maplibregl-popup-tip{border-top-color:var(--color-card);border-top-width:1.25rem;margin-top:-0.375rem}`,
    )
    expect(css).toContain(
      `${root}.maplibregl-popup-anchor-top .maplibregl-popup-tip{border-bottom-color:var(--color-card);border-bottom-width:1.25rem;margin-bottom:-0.375rem}`,
    )
    for (const anchor of ['top', 'top-left', 'top-right', 'bottom', 'bottom-left', 'bottom-right']) {
      expect(css).toContain(`${root}.maplibregl-popup-anchor-${anchor} .maplibregl-popup-tip{`)
    }
  })

  /**
   * Round-4 visual N4: the 20x20 polygon only shows ~14px — SPEC P0-2's
   * wrapper is 558x462 over a 448 card, and the reference PNG's pointer runs
   * y454→463 from a base extrapolating to y448.6, i.e. 5.4px behind the card.
   * The tuck has to follow the ANCHOR's physical side, or a flipped card
   * pushes its pointer 6px further out instead of 6px further in.
   */
  it('tucks the tip’s base ~6px behind the card, on the anchor’s own side', () => {
    const css = maplibrePopupResetCss()
    const root = `.maplibregl-popup.${MAPLIBRE_POPUP_CHROMELESS_CLASS}`
    const tuck: Record<string, string> = {
      top: 'margin-bottom:-0.375rem',
      'top-left': 'margin-bottom:-0.375rem',
      'top-right': 'margin-bottom:-0.375rem',
      bottom: 'margin-top:-0.375rem',
      'bottom-left': 'margin-top:-0.375rem',
      'bottom-right': 'margin-top:-0.375rem',
    }
    for (const [anchor, decl] of Object.entries(tuck)) {
      const rule = new RegExp(
        `\\.maplibregl-popup-anchor-${anchor} \\.maplibregl-popup-tip\\{[^}]*${decl.replace('.', '\\.')}`,
      )
      expect(css).toMatch(rule)
    }
    // The tinted-only side anchors keep MapLibre's 10px nub untucked.
    expect(css).toContain(
      `${root}.maplibregl-popup-anchor-left .maplibregl-popup-tip{border-right-color:var(--color-card)}`,
    )
    // Physical margins only — a logical one would tuck the wrong side in RTL.
    expect(css).not.toContain('margin-inline')
    expect(css).not.toContain('margin-block')
  })

  it('tints the tip with the card TOKEN, so it follows theme and tenant', () => {
    const css = maplibrePopupResetCss()
    // The superseded classes read `border-t-card` etc., which resolved to a
    // literal only because `--color-card` happens to be #fff in light mode.
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    // 8 tip tints (one per anchor) + the chromed surface's own `background`.
    expect(css.match(/var\(--color-card\)/g)).toHaveLength(9)
    expect(
      css.match(/\.maplibregl-popup-tip\{[^}]*var\(--color-card\)/g),
    ).toHaveLength(8)
  })

  it('colours ONE physical side per anchor — MapLibre’s own mapping', () => {
    const css = maplibrePopupResetCss()
    const root = `.maplibregl-popup.${MAPLIBRE_POPUP_CHROMELESS_CLASS}`
    // anchor-left = popup to the RIGHT of the point, tip points left, so
    // MapLibre colours `border-right`. PHYSICAL, not logical: `border-inline-end`
    // would flip to the wrong side under dir="rtl" (the bug the superseded
    // `border-e-card` / `border-s-card` classes carried).
    expect(css).toContain(
      `${root}.maplibregl-popup-anchor-left .maplibregl-popup-tip{border-right-color:var(--color-card)}`,
    )
    expect(css).toContain(
      `${root}.maplibregl-popup-anchor-right .maplibregl-popup-tip{border-left-color:var(--color-card)}`,
    )
    expect(css).not.toContain('border-inline')
  })
})
