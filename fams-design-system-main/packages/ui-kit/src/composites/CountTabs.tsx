import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../primitives/Tabs'
import { cn } from '../lib/cn'

/**
 * CountTabs — an underline tab strip whose tabs pair a label with a count
 * badge (figma inbox spec §"Filter tabs row": active tab = 14px semibold
 * primary label + 2px primary underline + primary-tinted count pill;
 * inactive = muted label + neutral pill). [L3 composite]
 *
 * A thin, controlled composition of the `Tabs` primitive — it adds only the
 * count-pill treatment and the horizontally-scrolling strip; keyboard
 * behavior, roving focus and ARIA all come from the primitive. Composition
 * (which tabs, counts, order) is caller data — this component attaches no
 * meaning to a tab id (root rule 10: no business vocabulary).
 *
 * - Counts are rendered verbatim (`"05"` stays `"05"`) — the caller owns
 *   formatting. Omit `count` for a plain underline tab.
 * - The strip owns its horizontal overflow (`overflow-x: auto`), so six tabs
 *   at a narrow width scroll inside the strip instead of wrapping or
 *   crushing (UX-NOTES §4) — the hairline spans the full strip.
 *
 * @usage-index count-tabs
 */
export interface CountTabItem {
  /** Stable tab id (the controlled `value`). */
  id: string
  /** Visible tab label. */
  label: string
  /** Count badge text, rendered verbatim. Omit for no badge. */
  count?: string | number
  disabled?: boolean
}

export interface CountTabsProps
  extends Omit<ComponentPropsWithoutRef<typeof Tabs>, 'value' | 'onValueChange' | 'children'> {
  /** The tabs, in order. */
  items: CountTabItem[]
  /** Controlled active tab id. */
  value: string
  onValueChange?: (id: string) => void
  /** Accessible name for the tablist. */
  'aria-label'?: string
}

export const CountTabs = forwardRef<ElementRef<typeof TabsList>, CountTabsProps>(
  ({ items, value, onValueChange, className, 'aria-label': ariaLabel, ...props }, ref) => (
    <Tabs value={value} onValueChange={onValueChange} {...props}>
      <TabsList
        ref={ref}
        aria-label={ariaLabel}
        data-slot="count-tabs"
        // The strip owns its horizontal overflow; `gap-1` comes from TabsList.
        className={cn('w-full overflow-x-auto', className)}
      >
        {items.map((item) => (
          <TabsTrigger
            key={item.id}
            value={item.id}
            disabled={item.disabled}
            className="group flex shrink-0 items-center gap-1.5 whitespace-nowrap data-[state=active]:font-semibold"
          >
            {item.label}
            {item.count !== undefined ? (
              <span
                data-slot="count-tabs-badge"
                className={cn(
                  'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1.5 text-caption font-semibold',
                  'bg-border text-muted-foreground',
                  'group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary',
                )}
              >
                {item.count}
              </span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {/* Stub panels — this strip is pure filter-switching chrome; the caller
          renders the filtered content OUTSIDE the Tabs tree. Radix's Trigger
          still generates a real `aria-controls` id per tab, and with no
          matching element that id dangles (axe: aria-valid-attr-value). Same
          pattern as `ModuleViewTabs`: force-mounted, contentless panels give
          every trigger a real target; only the active one is exposed. */}
      {items.map((item) => (
        <TabsContent
          key={item.id}
          value={item.id}
          forceMount
          hidden={item.id !== value}
          tabIndex={-1}
          data-slot="count-tabs-panel"
          className="hidden"
        />
      ))}
    </Tabs>
  ),
)

CountTabs.displayName = 'CountTabs'
