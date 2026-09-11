import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from 'react'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import { ChevronDown } from '../icons'
import { cn } from '../lib/cn'

/**
 * Accordion — vertically stacked, collapsible content sections. [L1 primitive]
 *
 * The one canonical disclosure pattern for the platform — never a raw
 * `<details>`, hand-rolled toggle state, or framework-native expansion panel.
 * Composition (how many sections, which is open by default, whether one or
 * several may be open at once) is controlled via Radix's own
 * `type`/`value`/`defaultValue` props on the root; section content is a
 * render slot, not this component's concern.
 *
 * No `accordion-up`/`accordion-down` keyframes exist in the theme yet, so
 * `AccordionContent` height-animates via a CSS transition driven by Radix's
 * `--radix-accordion-content-height` variable instead of a keyframe
 * animation — no new tokens required (see `deviationsFlagged`).
 *
 * @usage-v5
 *   Replaces `q-expansion-item`, used 17× across shared/iwmp/fams/ead component
 *   packages:
 *   - shared/components/expansionItem/ExpansionItem.vue — thin wrapper around q-expansion-item
 *   - iwmp/components/pipeline/PipelineProfile.vue, iwmp/components/inspector/common/Tasks.vue — grouped panels
 *   - shared/components/cards/ExpansionCard.vue, shared/components/timeline/ExpansionTimeline.vue — card sections
 *   Observed props: `default-opened` (initial open), `expand-icon-toggle` (icon-only
 *   trigger), `expand-separator` (divider), ad-hoc `header-style` color overrides.
 *   Forms needed: type single|multiple, defaultValue/value, per-item disabled.
 * @usage-index accordion
 */
export const Accordion = AccordionPrimitive.Root
export type AccordionProps = ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>

export type AccordionItemProps = ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
export const AccordionItem = forwardRef<ElementRef<typeof AccordionPrimitive.Item>, AccordionItemProps>(
  ({ className, ...props }, ref) => (
    <AccordionPrimitive.Item
      ref={ref}
      data-slot="accordion-item"
      className={cn('border-b border-border last:border-b-0', className)}
      {...props}
    />
  ),
)
AccordionItem.displayName = 'AccordionItem'

export interface AccordionTriggerProps extends ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
  /**
   * Chevron before (`'start'`) or after (`'end'`, default) the trigger
   * content. Most disclosure headers put it last; the KPI/Before Photos/
   * Assigned Driver accordion headers (figma-spec-detail.md §§6–8) put a
   * leading `chevron-down` before the title instead — a per-instance layout
   * choice, not a new component.
   */
  chevronPosition?: 'start' | 'end'
  /**
   * Extra header content — e.g. a "…" overflow menu (figma-spec-detail.md
   * §§6–7's `dots-horizontal` menu) — rendered as a SIBLING of the trigger
   * button inside the shared header row, not nested inside it (nesting an
   * interactive menu trigger inside the toggle button would be invalid HTML
   * and would also toggle the section on every menu click).
   */
  actions?: ReactNode
}

export const AccordionTrigger = forwardRef<ElementRef<typeof AccordionPrimitive.Trigger>, AccordionTriggerProps>(
  ({ className, children, chevronPosition = 'end', actions, ...props }, ref) => {
    const chevron = (
      <ChevronDown
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-transform duration-200"
      />
    )
    return (
      <AccordionPrimitive.Header className="flex items-center gap-2">
        <AccordionPrimitive.Trigger
          ref={ref}
          data-slot="accordion-trigger"
          className={cn(
            'flex flex-1 items-center justify-between gap-2 py-3 text-start text-sm font-medium text-foreground outline-none transition-colors',
            'hover:text-primary',
            'focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:pointer-events-none disabled:opacity-50',
            '[&[data-state=open]>svg]:rotate-180',
            chevronPosition === 'start' && 'justify-start',
            className,
          )}
          {...props}
        >
          {chevronPosition === 'start' ? chevron : null}
          {children}
          {chevronPosition === 'end' ? chevron : null}
        </AccordionPrimitive.Trigger>
        {actions}
      </AccordionPrimitive.Header>
    )
  },
)
AccordionTrigger.displayName = 'AccordionTrigger'

export type AccordionContentProps = ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
export const AccordionContent = forwardRef<ElementRef<typeof AccordionPrimitive.Content>, AccordionContentProps>(
  ({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Content
      ref={ref}
      data-slot="accordion-content"
      className={cn(
        'overflow-hidden text-sm text-muted-foreground transition-all duration-200 ease-out',
        'data-[state=closed]:h-0 data-[state=closed]:opacity-0',
        'data-[state=open]:h-[var(--radix-accordion-content-height)] data-[state=open]:opacity-100',
      )}
      {...props}
    >
      <div className={cn('pb-4 pt-0', className)}>{children}</div>
    </AccordionPrimitive.Content>
  ),
)
AccordionContent.displayName = 'AccordionContent'
