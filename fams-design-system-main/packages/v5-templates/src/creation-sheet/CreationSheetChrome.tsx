import { Button, SheetClose } from '@fams/ui-kit'
import { X } from '@fams/ui-kit/icons'

/**
 * CreationSheetChrome — the two hand-rolled close affordances `CreationSheet.tsx`
 * needs because its wizard/flat branches bypass `FormSheet`'s own Cancel/Save
 * chrome (`hideClose`, see that file's header for why). Split out on touch
 * (W3d) to keep `CreationSheet.tsx` under the repo's ~300-line soft budget
 * (rule 12) — pure extraction, no behavior change.
 */

/**
 * Header close affordance — required on every hand-rolled (`hideClose`)
 * branch of this surface (round-2 UX gate P1): the sheet's invisible exits
 * (Escape, scrim click) silently discard a dirty form now that reopen resets
 * rhf state, so a visible, labeled X must advertise the way out. `size-10`
 * keeps the hit area at the 40px touch minimum (UX-NOTES mandate — the
 * default `size="icon"` button is 36px); `SheetClose` routes it through the
 * same `onOpenChange(false)` path Escape and the scrim already use. The
 * single-group `FormSheet` branch keeps its own visible Cancel instead.
 */
export const SheetHeaderClose = () => (
  <SheetClose asChild>
    <Button type="button" variant="tertiary" size="icon" aria-label="Close" className="size-10 shrink-0">
      <X className="size-4" aria-hidden />
    </Button>
  </SheetClose>
)

/**
 * Floating close affordance for the `layout="flat"` branch only —
 * figma-spec-create-sheet.md node 55:110's own close control: a circular
 * button fully DETACHED in the overlay gap left of the sheet, vertically
 * centered on the panel (not docked inside the header like
 * `SheetHeaderClose`). The node's own layout is a `gap-[40px]` flex row —
 * a 58px close-icon block, then the 762px panel — i.e. the button sits
 * OUTSIDE the panel with a full 40px gap from the panel's leading edge, not
 * straddling it. `end-full` pins the button's trailing edge to the panel's
 * leading edge (zero gap), then `me-10` (40px, same scale as this surface's
 * own `p-10`) pushes it the rest of the way into the gap — the fix for the
 * prior `start-0 -translate-x-1/2` version, which instead CENTERED the
 * button ON the edge (half overlapping the panel, half over the scrim),
 * reading as wedged into the field list rather than floating beside it
 * (round-3 UX finding, figma-spec-create-sheet.md screenshot diff). `top-1/2
 * -translate-y-1/2` still centers it on the full sheet height — `SheetContent`
 * has no `overflow-hidden` of its own, so this is not clipped. Same
 * `SheetClose` → `onOpenChange(false)` path as every other close control on
 * this surface.
 */
export const SheetFloatingClose = () => (
  <SheetClose asChild>
    <Button
      type="button"
      variant="tertiary"
      size="icon"
      aria-label="Close"
      className="absolute end-full top-1/2 z-10 me-10 size-10 -translate-y-1/2 rounded-full border border-border bg-card shadow-elevation"
    >
      <X className="size-4" aria-hidden />
    </Button>
  </SheetClose>
)
