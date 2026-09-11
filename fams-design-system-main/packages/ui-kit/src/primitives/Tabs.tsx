import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { cn } from '../lib/cn'

/**
 * Tabs — the canonical tab strip. Every tabbed surface in the platform
 * (entity profiles, HybridView's mobile split, settings pages) uses this —
 * never a raw `<div role="tablist">` or framework-native tab markup.
 * Composition (which tabs, in which order, hidden by privilege) is app data,
 * not this component's concern — see `ProfileLayout` + `ProfileTab`.
 */
export const Tabs = TabsPrimitive.Root
export type TabsProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Root>

export type TabsListProps = ComponentPropsWithoutRef<typeof TabsPrimitive.List>
export const TabsList = forwardRef<ElementRef<typeof TabsPrimitive.List>, TabsListProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      data-slot="tabs-list"
      className={cn('flex shrink-0 gap-1 border-b border-border', className)}
      {...props}
    />
  ),
)
TabsList.displayName = 'TabsList'

export type TabsTriggerProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
export const TabsTrigger = forwardRef<ElementRef<typeof TabsPrimitive.Trigger>, TabsTriggerProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(
        'border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors',
        'hover:text-foreground',
        'data-[state=active]:border-primary data-[state=active]:text-primary',
        'disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    />
  ),
)
TabsTrigger.displayName = 'TabsTrigger'

export type TabsContentProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
export const TabsContent = forwardRef<ElementRef<typeof TabsPrimitive.Content>, TabsContentProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Content
      ref={ref}
      data-slot="tabs-content"
      className={cn('min-h-0 flex-1 outline-none', className)}
      {...props}
    />
  ),
)
TabsContent.displayName = 'TabsContent'
