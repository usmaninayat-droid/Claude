/**
 * installScrollRegionBehavior — the runtime half of the `fams-scroll-region`
 * utility class (`@fams/tokens/scrollbars.css`).
 *
 * The CSS alone covers `:hover` and `:focus-within`, which is enough for a
 * mouse or keyboard user. It CANNOT cover "the region is being scrolled right
 * now" (e.g. a trackpad/wheel scroll while the pointer sits elsewhere, or a
 * scroll driven by `scrollIntoView`) — no CSS selector observes scroll
 * activity. This installs exactly ONE document-level `scroll` listener
 * (capture phase — the `scroll` event doesn't bubble, but capture does) that
 * toggles a `data-scrolling` attribute on whichever `.fams-scroll-region`
 * fired it, for a short debounce window, which the CSS matches to reveal the
 * thumb. Centralized so a container only ever needs the class — no
 * component wires its own scroll listener.
 *
 * Call once, near app boot (idempotent — a second call is a no-op). No-ops
 * outside a DOM environment (SSR/tests).
 */

const ACTIVE_MS = 650

let installed = false

export function installScrollRegionBehavior(): void {
  if (installed || typeof document === 'undefined') return
  installed = true

  const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>()

  document.addEventListener(
    'scroll',
    (event) => {
      const el = event.target
      if (!(el instanceof Element) || !el.classList.contains('fams-scroll-region')) return

      el.setAttribute('data-scrolling', '')
      const pending = timers.get(el)
      if (pending != null) clearTimeout(pending)
      timers.set(
        el,
        setTimeout(() => el.removeAttribute('data-scrolling'), ACTIVE_MS),
      )
    },
    { capture: true, passive: true },
  )
}
