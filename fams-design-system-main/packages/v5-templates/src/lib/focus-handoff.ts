/**
 * focus-handoff — the one rule for controls that REMOVE THEMSELVES when they
 * succeed (round-6 UX gate U1).
 *
 * Three recovery controls on the live-monitoring surfaces are rendered
 * conditionally on the very state they repair — the in-field search ✕, the
 * no-results `Clear search` button and the map error surface's `Retry`. Doing
 * their job unmounts (or, for `Retry`, momentarily disables) them, and the
 * browser's answer to "the focused node no longer exists" is `<body>`. A
 * keyboard or screen-reader user therefore lands at the top of the document
 * every time a recovery succeeds — WCAG 2.4.3 Focus Order.
 *
 * The fix is one line at each site and one rule everywhere: a control that
 * deletes itself must hand focus to the element that logically survives it.
 * That target is always the thing the user's next act needs — the search input
 * after a clear, the map region after a successful retry.
 *
 * `preventScroll` matters here: every one of these targets is already on
 * screen, and letting the browser scroll to it would jump a virtualized list
 * or a map pane for no reason.
 */
export function handOffFocus(target: HTMLElement | null | undefined): void {
  if (!target || typeof target.focus !== 'function') return
  target.focus({ preventScroll: true })
}
