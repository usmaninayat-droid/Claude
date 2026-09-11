import { MapPinned } from '@fams/ui-kit/icons'
import { cn } from '../../lib/cn'

/**
 * MapFallbackCard — rendered instead of a second live map when the
 * one-map-per-page guard (`mount-guard.ts`, perf rule 3) blocks a
 * concurrently-mounted `MapPanel`. Token-styled, no GL context, no
 * `MapPanel` chrome — just an explanatory placeholder so the page still
 * lays out sanely instead of silently rendering nothing.
 */
export interface MapFallbackCardProps {
  className?: string
}

export function MapFallbackCard({ className }: MapFallbackCardProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted p-6 text-center',
        className,
      )}
    >
      <MapPinned aria-hidden size={22} className="text-muted-foreground" />
      <p className="text-body-sm font-medium text-foreground">One map per page</p>
      <p className="max-w-[26rem] text-body-xs text-muted-foreground">
        Another map is already active on this page. Only one <code>MapPanel</code> may be mounted at a time — see the
        browser console for details.
      </p>
    </div>
  )
}
