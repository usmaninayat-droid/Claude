import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../primitives/Tabs'

export interface HybridViewProps extends HTMLAttributes<HTMLDivElement> {
  /** Left region — the list/table panel. */
  list: ReactNode
  /** Right region — the map panel. */
  map: ReactNode
  /** Width of the list panel on `md+` (Tailwind width class). */
  listWidthClassName?: string
  /** Tab label for the list panel on mobile. */
  listLabel?: string
  /** Tab label for the map panel on mobile. */
  mapLabel?: string
}

/**
 * HybridView — the live-monitoring list+map split.
 *
 * - `md+`: the list and map sit **side-by-side** (list on the `start` edge,
 *   map filling the rest). RTL-safe — they're flex siblings, so the list flips
 *   to the trailing edge in RTL automatically.
 * - `< md`: the split collapses into a **tabbed** single-pane view (List / Map)
 *   using Radix Tabs, since there isn't room for both at once.
 *
 * Both panels are always mounted (`forceMount`) so map/list state survives tab
 * switches; CSS toggles visibility per breakpoint + active tab.
 */
export const HybridView = forwardRef<HTMLDivElement, HybridViewProps>(
  (
    {
      list,
      map,
      listWidthClassName = 'md:w-[360px]',
      listLabel = 'List',
      mapLabel = 'Map',
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        data-testid="hybrid-view"
        className={cn('flex h-full min-h-0 flex-col', className)}
        {...props}
      >
        <Tabs
          defaultValue="list"
          className="flex h-full min-h-0 flex-col"
        >
          {/* Mobile-only tab strip — hidden from md up. */}
          <TabsList
            aria-label="Hybrid view panels"
            className="border-b-0 bg-background md:hidden"
          >
            <TabsTrigger value="list" className="flex-1 justify-center">
              {listLabel}
            </TabsTrigger>
            <TabsTrigger value="map" className="flex-1 justify-center">
              {mapLabel}
            </TabsTrigger>
          </TabsList>

          {/* Split body — row on md+, tab-swapped single pane below md. */}
          <div className="flex min-h-0 flex-1 md:flex-row">
            <TabsContent
              value="list"
              forceMount
              data-testid="hybrid-list"
              className={cn(
                // Mobile: only visible when the List tab is active.
                'overflow-auto data-[state=inactive]:hidden',
                // md+: always shown, fixed-width start panel with an end border.
                'md:flex md:flex-none md:border-e md:border-border md:data-[state=inactive]:flex',
                listWidthClassName,
              )}
            >
              <div className="h-full w-full">{list}</div>
            </TabsContent>

            <TabsContent
              value="map"
              forceMount
              data-testid="hybrid-map"
              className={cn(
                'overflow-hidden data-[state=inactive]:hidden',
                'md:flex md:data-[state=inactive]:flex',
              )}
            >
              <div className="h-full w-full">{map}</div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    )
  },
)

HybridView.displayName = 'HybridView'

/**
 * MapPlaceholder — a token-only empty map surface for the prototype phase
 * (MapLibre is wired later). Use as the `map` slot until the real map lands.
 */
export function MapPlaceholder({ label = 'Map' }: { label?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6" />
          <line x1="9" y1="3" x2="9" y2="18" />
          <line x1="15" y1="6" x2="15" y2="21" />
        </svg>
        <span className="text-sm font-medium">{label} placeholder</span>
      </div>
    </div>
  )
}
