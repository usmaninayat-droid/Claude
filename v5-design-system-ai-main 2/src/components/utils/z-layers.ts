/**
 * Shared z-index scale for portal-rendered floating layers (T-052 backport —
 * closes a documented law deviation: SelectContent/PopoverContent/
 * DialogContent+Overlay/DropdownMenuContent all defaulted to the Tailwind
 * `z-50` utility and rendered BEHIND any `Sheet`'s `z-[1200]` panel).
 *
 * Radix portals every one of these to `document.body` as a SIBLING of
 * whatever ancestor rendered it — nesting depth in the React tree carries NO
 * stacking-order guarantee, only the literal z-index (or DOM insertion order,
 * for ties) decides paint order. A `Sheet` (side panel) needs to sit above
 * ordinary page content but BELOW anything composed FROM INSIDE it (a
 * Select/Popover/Dialog/dropdown menu opened while a Sheet is mounted) — this
 * scale keeps that true regardless of nesting depth, without per-instance
 * `style={{ zIndex }}` hacks at every call site.
 *
 * Applied via inline `style` (not a Tailwind `z-[…]` class) in each
 * primitive, same reasoning the pre-existing per-instance workarounds already
 * established: `cn()`'s `twMerge` conflict-resolution order between two
 * literal `z-*` utilities isn't guaranteed, while inline `style` always wins
 * regardless of class order.
 */
export const Z_SHEET = 1200;
/** Dialog/AlertDialog — must paint above Sheet (opened from inside one). */
export const Z_DIALOG = 1300;
/** Popover/Select/DropdownMenu — must paint above BOTH Sheet and Dialog
 *  (opened from inside either). */
export const Z_FLOATING = 1320;
