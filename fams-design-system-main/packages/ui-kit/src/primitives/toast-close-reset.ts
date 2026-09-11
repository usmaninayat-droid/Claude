/**
 * toast-close-reset.ts — put sonner's dismiss control INSIDE the toast, at the
 * inline END, at 24x24.
 *
 * WHAT WAS WRONG (round-5 visual V5 / UX N1). Sonner pins its close button to
 * the toast's top-LEFT corner and pulls it OUTSIDE the card with
 * `transform: translate(-35%, -35%)`, at 20x20 with a `--gray4` hairline.
 * Measured live on the live-monitoring traffic toast: toast `356x76 @1540,24`,
 * `Close toast` `20x20 @1534,18` — offset -6,-6 into the white app-header
 * band, on a 1.14:1 border, reading as a detached grey dot with no visible
 * relationship to the card it dismisses. Three rules land on it at once: it is
 * inline-START where LTR convention and Figma's own toast pattern put dismiss
 * at inline-END; it is OUTSIDE the surface it acts on, which breaks the
 * proximity cue an icon-only control depends on; and 20x20 misses UX-NOTES
 * C18's 24 floor with no enclosing row to rescue it.
 *
 * WHY A STYLE ELEMENT AND NOT `toastOptions.classNames.closeButton`. That is
 * what was there (`'pointer-events-auto size-6'`) and it silently did nothing:
 * Tailwind v4 emits package utilities inside `@layer utilities`, and UNLAYERED
 * vendor CSS — which sonner's `styles.css` is — beats any layered rule however
 * specific. This is the same cascade trap `maplibre-popup-reset.ts` documents
 * for `maplibre-gl.css`, and the same remedy: an injected, unlayered sheet
 * meets the vendor sheet on equal terms. `!important` on top, because sonner's
 * own selector is `[data-sonner-toast][data-styled='true'] [data-close-button]`
 * and injection ORDER between two unlayered sheets is not something a library
 * can rely on.
 *
 * RTL: logical insets only (`inset-inline-*`), so the dismiss sits at the
 * inline end in both directions. Sonner's own `--toast-close-button-start/end`
 * vars are physical `left`/`right`, which is why they are neutralised here
 * rather than re-pointed.
 *
 * Colours are token custom properties and sizes are `rem` — no raw hex, no px.
 */
const STYLE_ID = 'fams-toast-close-reset'

/** The full sheet, as text. Exported for the test that asserts the rules are
 *  really emitted — a class name in the markup proves nothing, which is how
 *  the dead `size-6` class survived a whole round. */
export function toastCloseResetCss(): string {
  const close = "[data-sonner-toast][data-styled='true'] [data-close-button]"
  return [
    `${close}{`,
    // Neutralise sonner's physical corner pin and its outward nudge.
    'left:auto!important;right:auto!important;transform:none!important;',
    // Inside the card, inline end, on the card's own surface.
    'inset-inline-start:auto!important;inset-inline-end:0.5rem!important;top:0.5rem!important;',
    // C18's floor, on the button itself — no enclosing row to lean on.
    'inline-size:1.5rem!important;block-size:1.5rem!important;',
    // The 1.14:1 hairline existed only to detach the dot from the card. On the
    // card surface the control needs no boundary of its own.
    'background:transparent!important;border-color:transparent!important;',
    `color:var(--color-muted-foreground)!important;border-radius:var(--radius-sm)!important;`,
    'opacity:1!important;pointer-events:auto!important;',
    '}',
    `${close}:hover,[data-sonner-toast][data-styled='true']:hover ${close}:hover{`,
    'background:var(--color-muted)!important;color:var(--color-foreground)!important;',
    'border-color:transparent!important;',
    '}',
    // Reserve the gutter so the title/description never runs under the glyph.
    // Scoped with `:has()` so a toast WITHOUT a close button keeps sonner's
    // symmetric padding exactly as before.
    `[data-sonner-toast][data-styled='true']:has([data-close-button]){padding-inline-end:2.5rem!important}`,
  ].join('')
}

export function installToastCloseReset(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = toastCloseResetCss()
  document.head.append(style)
}
