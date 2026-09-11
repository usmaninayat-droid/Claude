import { useEffect, useRef } from 'react'
import { Button } from '@fams/ui-kit'
import { CloudOff } from '@fams/ui-kit/icons'
import { cn } from '../../lib/cn'
import { handOffFocus } from '../../lib/focus-handoff'

/**
 * MapErrorState — the in-canvas basemap-failure surface (UX-NOTES C16 /
 * UX-6 [MUST]: "Map tile failure/offline shows an explicit in-canvas error
 * state (muted grid like 495:25945 + 'Map couldn't load' + Retry) while
 * markers, list, and card keep working from data; tiles must never fail to a
 * blank white pane").
 *
 * Two deliberately separate pieces, because C16 asks for two things that
 * fight each other if the error state is one opaque cover:
 *
 * - `MapErrorBackdrop` replaces the BLANK PANE. It is painted as the FIRST
 *   child of the map region, i.e. UNDER MapLibre's canvas — which is
 *   transparent when no style ever loaded (that transparency is exactly why
 *   the failure read as "blank white": what showed through was the card
 *   surface). Markers, clusters and the open vehicle card are DOM/overlay
 *   layers above the canvas, so they keep rendering from data on top of the
 *   grid, which is the second half of C16.
 * - `MapErrorNotice` is the message + Retry, a small floating card. It never
 *   covers the pane, so nothing it says can hide the data that still works.
 *
 * Copy: generic English defaults only. Anything environment-specific
 * (a tenant's support line, an offline-mode explanation) is the consuming
 * app's job and arrives through `MapPanel`'s `errorTitle`/`errorDescription`/
 * `errorRetryLabel` props — the design system carries no environment or
 * tenant copy.
 *
 * Token-driven and RTL-safe: the grid is real bordered cells (no arbitrary
 * `[Npx]` geometry, no raw hex), and the notice uses logical spacing only.
 */

/** The muted grid that stands in for the missing basemap (495:25945). */
export function MapErrorBackdrop({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-slot="map-error-backdrop"
      className={cn('pointer-events-none absolute inset-0 bg-muted', className)}
    >
      <span className="grid size-full grid-cols-8 grid-rows-6">
        {Array.from({ length: 48 }).map((_, cell) => (
          <span key={cell} className="border-b border-e border-border" />
        ))}
      </span>
    </span>
  )
}

export interface MapErrorNoticeProps {
  title: string
  description?: string
  retryLabel: string
  onRetry: () => void
  /**
   * A re-attempt is in flight (round-6 UX gate U2). Puts the button in the DS
   * `loading` state — spinner + disabled — so the control and the outcome
   * agree instead of the whole surface blinking out and back in under 300ms.
   * Optional and defaults to `false`, so existing callers are unchanged.
   */
  retrying?: boolean
  className?: string
}

/** The message + Retry card. Floats at the pane's top, never full-bleed. */
export function MapErrorNotice({
  title,
  description,
  retryLabel,
  onRetry,
  retrying = false,
  className,
}: MapErrorNoticeProps) {
  const retryRef = useRef<HTMLButtonElement>(null)
  /*
   * U1's third limb. `loading` sets the NATIVE `disabled` attribute (the DS
   * convention), and a focused element that becomes disabled drops focus to
   * `<body>` — so busying the button would have re-created the very defect
   * U2's fix removes. The activation records whether it came from the
   * keyboard (focus on the button); when the attempt settles and the control
   * comes back, focus goes back with it. On success the button unmounts
   * instead, and `MapPanel` hands focus to the map region.
   */
  const hadFocus = useRef(false)
  useEffect(() => {
    if (retrying || !hadFocus.current) return
    hadFocus.current = false
    handOffFocus(retryRef.current)
  }, [retrying])
  return (
    <div
      role="status"
      aria-live="polite"
      data-slot="map-error-notice"
      className={cn(
        'absolute start-0 end-0 top-4 z-10 mx-auto flex w-max max-w-[80%] flex-col items-center gap-2',
        'rounded-lg border border-border bg-card px-4 py-3 text-center shadow-sm',
        className,
      )}
    >
      <span className="flex items-center gap-2 text-body-sm font-semibold text-foreground">
        <CloudOff aria-hidden="true" className="size-4 text-muted-foreground" />
        {title}
      </span>
      {description ? <p className="text-caption text-muted-foreground">{description}</p> : null}
      <Button
        ref={retryRef}
        variant="tertiary"
        size="sm"
        data-slot="map-error-retry"
        loading={retrying}
        onClick={() => {
          hadFocus.current = document.activeElement === retryRef.current
          onRetry()
        }}
      >
        {retryLabel}
      </Button>
    </div>
  )
}

MapErrorBackdrop.displayName = 'MapErrorBackdrop'
MapErrorNotice.displayName = 'MapErrorNotice'
