/**
 * Clipboard write that never lies and never throws.
 *
 * `navigator.clipboard.writeText` rejects far more often than it looks: an
 * insecure origin, a browser that denies `clipboard-write`, an iframe without
 * `clipboard-write` in its `allow` list, a headless run. The cockpit used to
 * fire it with `void` and then show a green "Copied" toast on the next line —
 * so a dispatcher was told the driver's number was on the clipboard when it
 * was not, and the unhandled rejection also surfaced as a console `pageerror`
 * (round-4 UX finding 1).
 *
 * This helper awaits the write and resolves to whether it actually succeeded,
 * including when the API is absent entirely. Callers show success feedback
 * ONLY on `true`, and on `false` must surface the value itself so the user can
 * still read and use it.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard
    if (typeof clipboard?.writeText !== 'function') return false
    await clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
