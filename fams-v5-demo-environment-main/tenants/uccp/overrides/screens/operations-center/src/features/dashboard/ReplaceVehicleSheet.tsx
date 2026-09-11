import { useEffect } from 'react'
import {
  Sheet, SheetContent, SheetClose, SheetTitle, SheetDescription, Button,
} from '@fams/design-system'
import { X, ArrowDown, SquareArrowOutUpRight, Sparkles } from 'lucide-react'
import { Block } from './issueBlocks'
import { IssueMapPanel } from './CurrentShiftIssuesSheet'
import type { ShiftIssue } from './currentShiftIssues'
import { CustomScrollbar } from '../../components/CustomScrollbar'

export type ReplaceVehicleSheetProps = {
  /** The route to replace; the sheet is open when non-null. */
  issue: ShiftIssue | null
  onOpenChange: (open: boolean) => void
  /** "Suggest Nearby Routes" → swap in the nearby-routes sheet. */
  onSuggestNearby?: (issue: ShiftIssue) => void
}

/**
 * ReplaceVehicleSheet — NEW local component. Full-page right sheet (Figma node
 * 2227:101360, "Replace Vehicle & Driver") opened from the Nearby Routes footer
 * "Suggest Replacement" button and the Live GIS Map telematics card's "Suggest
 * Replacement" button. Single-route version of `CurrentShiftIssuesSheet`: the
 * failed assignment struck-through → the closest standby vehicle/driver, with a
 * sheet-level footer (View Plan · Suggest Nearby Routes · Dispatch Replacement).
 * Reuses the shared `Block` renderer + `IssueMapPanel`.
 */
export function ReplaceVehicleSheet({ issue, onOpenChange, onSuggestNearby }: ReplaceVehicleSheetProps) {
  // Nudge Leaflet to recompute size once the sheet's open transition settles.
  useEffect(() => {
    if (!issue) return
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 320)
    return () => clearTimeout(t)
  }, [issue])

  return (
    <Sheet open={issue != null} onOpenChange={onOpenChange}>
      <SheetContent side="right" hideClose width="100vw" className="p-0">
        {issue ? (
          <div className="flex h-full">
            {/* Left panel */}
            <div className="relative flex w-[680px] shrink-0 flex-col bg-card">
              {/* Close — red circular X in the top-left corner */}
              <SheetClose className="absolute left-3 top-3 z-10 flex size-6 items-center justify-center rounded-full bg-[color:var(--status-error)] text-white outline-none transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring">
                <X className="size-3.5" />
                <span className="sr-only">Close</span>
              </SheetClose>

              {/* Header */}
              <div className="px-6 pb-4 pt-9">
                <div className="flex flex-wrap items-center gap-3">
                  <SheetTitle className="text-2xl font-semibold text-foreground">
                    Replace Vehicle &amp; Driver
                  </SheetTitle>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--primary)]/50 px-2.5 py-1 text-xs font-semibold text-primary">
                    <Sparkles className="size-3.5" />
                    Smart Suggestions
                  </span>
                </div>
                <SheetDescription className="mt-1.5 text-sm text-muted-foreground">
                  We've matched the closest standby vehicle and driver to take over this route — ready to dispatch.
                </SheetDescription>
              </div>

              {/* Body — the single route's replacement card */}
              <CustomScrollbar className="min-h-0 flex-1 border-t border-border">
                <div className="px-6 pt-5">
                  <div className="flex flex-col gap-4 rounded-md border border-border p-4">
                    {/* Route header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm">
                        <span className="font-semibold text-foreground">{issue.route}</span>
                        <span className="text-muted-foreground"> • {issue.plan}</span>
                      </div>
                      <span className="shrink-0 rounded-[4px] border border-[color:var(--status-error)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--status-error)]">
                        {issue.reason}
                      </span>
                    </div>

                    {/* Current → suggested (divider with the arrow centered on it) */}
                    <div className="flex flex-col gap-2.5">
                      <Block a={issue.current} />
                      <div className="relative flex justify-center">
                        <div className="absolute inset-x-0 top-1/2 border-t border-border" />
                        <span className="relative flex size-6 items-center justify-center rounded-full border border-border bg-card">
                          <ArrowDown className="size-3.5 text-muted-foreground" />
                        </span>
                      </div>
                      <Block a={issue.suggested} />
                    </div>
                  </div>
                </div>
              </CustomScrollbar>

              {/* Footer — DS Button variants (View Plan / Suggest Nearby Routes / Dispatch) */}
              <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
                <Button variant="tertiary">
                  View Plan
                  <SquareArrowOutUpRight className="size-3.5 text-muted-foreground" />
                </Button>
                <div className="flex items-center gap-3">
                  <Button
                    variant="tertiary"
                    onClick={() => onSuggestNearby?.(issue)}
                    className="border-[color:var(--primary)]/50 text-primary hover:bg-[color:var(--primary)]/6"
                  >
                    <Sparkles className="size-4" />
                    Suggest Nearby Routes
                  </Button>
                  <Button variant="primary">Dispatch Replacement</Button>
                </div>
              </div>
            </div>

            {/* Map */}
            <IssueMapPanel mapData={issue.map} />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
