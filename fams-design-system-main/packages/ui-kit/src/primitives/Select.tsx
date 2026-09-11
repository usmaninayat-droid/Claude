import { forwardRef, useId, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { Select as SelectPrimitive } from 'radix-ui'
import { Check, ChevronDown, ChevronUp } from '../icons'
import { cn } from '../lib/cn'

/**
 * Select — ported from the GH reference DS (`select.tsx`). [L1 primitive]
 * Trigger visually matches the plain Input (h-9, bg-input-background, 4px radius)
 * so inline filters line up. Content = elevated card surface.
 */
export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group

/**
 * SelectValue — the selected-value slot inside `SelectTrigger`.
 *
 * Tagged `data-slot="select-value"` so the trigger's single-line truncation
 * (`line-clamp-1`) targets THIS slot only. Before, the trigger truncated any
 * direct child `<span>` (`[&>span]:line-clamp-1`), which silently hijacked a
 * call site's own wrapper: `line-clamp` sets `display: -webkit-box` and
 * `-webkit-box-orient: vertical`, beating the wrapper's `flex` and stacking
 * an icon + label vertically instead of side by side.
 */
export const SelectValue = forwardRef<
  ElementRef<typeof SelectPrimitive.Value>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Value>
>(({ ...props }, ref) => <SelectPrimitive.Value ref={ref} data-slot="select-value" {...props} />)
SelectValue.displayName = 'SelectValue'

export interface SelectTriggerProps extends ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> {
  /** Floating label (Figma fields spec, node 4834:5550): sits centered at
   *  14px semibold while empty & closed, floats to a 12px caption inside the
   *  top edge when open or a value is selected. Omit for the plain trigger. */
  label?: string
  /** Renders the required asterisk next to the floating label. */
  required?: boolean
  /** Hint text under the field — 12px, inset; destructive when `hasError`. */
  hint?: string
  hasError?: boolean
}

export const SelectTrigger = forwardRef<
  ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, children, label, required, hint, hasError = false, ...props }, ref) => {
  const hintId = useId()
  const trigger = (
    <SelectPrimitive.Trigger
      ref={ref}
      data-slot="select-trigger"
      aria-required={required || undefined}
      aria-describedby={hint ? hintId : undefined}
      className={cn(
        'group flex w-full items-center justify-between gap-2 rounded-sm border bg-input-background px-3 py-2 text-sm text-foreground outline-none',
        // Keyboard ring is `:focus-visible` (fix3 — the systemwide focus grammar);
        // mouse focus keeps only the primary border it already had.
        'focus:border-primary focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Truncate the VALUE SLOT only — never an arbitrary direct-child
        // span, which would hijack a consumer's own icon+label wrapper.
        '[&>[data-slot=select-value]]:line-clamp-1 data-[placeholder]:text-muted-foreground',
        hasError ? 'border-destructive' : 'border-border',
        label
          ? // Float-label anatomy: taller field, value row under the caption,
            // open state = primary 2px-equivalent outline (Figma 4834:5550).
            cn(
              'relative h-14 pb-1.5 pt-6 font-semibold',
              'data-[state=open]:ring-1 data-[state=open]:ring-inset',
              hasError
                ? 'data-[state=open]:border-destructive data-[state=open]:ring-destructive'
                : 'data-[state=open]:border-primary data-[state=open]:ring-primary',
              // Empty & closed: hide the placeholder row (the label is the row).
              '[&[data-placeholder][data-state=closed]>[data-slot=select-value]]:opacity-0',
            )
          : 'h-9',
        className,
      )}
      {...props}
    >
      {label ? (
        <span
          data-label
          className={cn(
            'pointer-events-none absolute start-3 flex items-center gap-1 font-semibold transition-all duration-fast',
            hasError ? 'text-destructive-emphasis' : 'text-muted-foreground',
            // Floated caption whenever open or filled; centered otherwise.
            'top-[9px] text-xs',
            'group-data-[placeholder]:group-data-[state=closed]:top-1/2 group-data-[placeholder]:group-data-[state=closed]:-translate-y-1/2 group-data-[placeholder]:group-data-[state=closed]:text-sm',
          )}
        >
          {label}
          {required ? <span aria-hidden className="text-xs font-medium text-destructive-emphasis">*</span> : null}
        </span>
      ) : null}
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 opacity-60 transition-transform duration-fast group-data-[state=open]:rotate-180" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
  if (!hint && !label) return trigger
  return (
    <div className="flex w-full flex-col gap-1">
      {trigger}
      {hint ? (
        <p
          id={hintId}
          role={hasError ? 'alert' : undefined}
          className={cn('ps-4 text-xs font-medium', hasError ? 'text-destructive-emphasis' : 'text-muted-foreground')}
        >
          {hint}
        </p>
      ) : null}
    </div>
  )
})
SelectTrigger.displayName = 'SelectTrigger'

export const SelectContent = forwardRef<
  ElementRef<typeof SelectPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        // Figma 4834:5550 menu: border/lightest card, 2xl drop shadow.
        'relative z-popover max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-2xl',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        position === 'popper' && 'data-[side=bottom]:translate-y-1',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1">
        <ChevronUp className="size-4" />
      </SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' && 'w-full min-w-[var(--radix-select-trigger-width)]',
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1">
        <ChevronDown className="size-4" />
      </SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = 'SelectContent'

export const SelectLabel = forwardRef<
  ElementRef<typeof SelectPrimitive.Label>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', className)}
    {...props}
  />
))
SelectLabel.displayName = 'SelectLabel'

export const SelectItem = forwardRef<
  ElementRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      // Figma 4834:5550 option rows: 12px padding, 14px medium text.
      'relative flex cursor-default select-none items-center gap-2 rounded-xs p-3 pe-8 text-sm font-medium outline-none',
      'focus:bg-muted focus:text-foreground',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <span className="absolute end-2 flex size-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
  </SelectPrimitive.Item>
))
SelectItem.displayName = 'SelectItem'

export const SelectSeparator = forwardRef<
  ElementRef<typeof SelectPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
))
SelectSeparator.displayName = 'SelectSeparator'
