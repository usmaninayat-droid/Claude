import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes } from 'react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { Check, ChevronDown, ChevronRight, Circle } from '../icons'
import { cn } from '../lib/cn'

/**
 * DropdownMenu — Radix-backed menu for contextual actions and option lists. [L1 primitive]
 * Wraps Root/Trigger/Group/Portal/Sub/RadioGroup plus a styled Content/Item
 * (with a `destructive` variant) for row actions, kebab menus, and pickers.
 */
export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuGroup = DropdownMenuPrimitive.Group
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal
export const DropdownMenuSub = DropdownMenuPrimitive.Sub
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

export const DropdownMenuContent = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      data-slot="dropdown-menu-content"
      sideOffset={sideOffset}
      className={cn(
        'z-popover min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-elevation outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = 'DropdownMenuContent'

export const DropdownMenuItem = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Item>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { destructive?: boolean }
>(({ className, destructive, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    data-slot="dropdown-menu-item"
    className={cn(
      'relative flex cursor-default select-none items-center gap-2 rounded-xs px-2 py-1.5 text-sm text-foreground outline-none',
      'focus:bg-muted',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      destructive && 'text-destructive-emphasis focus:bg-destructive/10 focus:text-destructive-emphasis',
      className,
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = 'DropdownMenuItem'

export interface DropdownMenuCheckboxItemProps
  extends ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem> {
  /**
   * How the row shows its state. `'check'` (default, unchanged) reserves a
   * leading gutter and reveals a checkmark when on. `'switch'` instead paints
   * a non-interactive toggle PILL at the row's trailing edge and drops the
   * gutter, so a settings-style menu row reads its state at a glance whether
   * it is on OR off — a checkmark-only row is indistinguishable from a plain
   * item while unchecked (figma live-monitoring 495:45132's Autosave /
   * Private / Protect rows; round-2 UX finding 5).
   *
   * The pill is deliberately NOT the `Switch` primitive: a real switch is a
   * `<button role="switch">`, and nesting one inside a `menuitemcheckbox`
   * trips axe `nested-interactive`. The row itself stays the control — it
   * already carries `role="menuitemcheckbox"` + `aria-checked` from Radix —
   * and the pill is `aria-hidden` decoration over it.
   */
  indicator?: 'check' | 'switch'
}

export const DropdownMenuCheckboxItem = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  DropdownMenuCheckboxItemProps
>(({ className, children, checked, indicator = 'check', ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    data-slot="dropdown-menu-checkbox-item"
    checked={checked}
    className={cn(
      'relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 text-sm text-foreground outline-none',
      indicator === 'switch' ? 'px-2' : 'ps-8 pe-2',
      'focus:bg-muted',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    {indicator === 'check' ? (
      <span className="absolute start-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
    ) : null}
    {children}
    {indicator === 'switch' ? (
      <span
        aria-hidden="true"
        data-slot="dropdown-menu-checkbox-switch"
        data-state={checked === true ? 'checked' : 'unchecked'}
        /* Inline geometry on purpose: a package-authored arbitrary Tailwind
           size (`h-[18px]`, `translate-x-[14px]`) is not guaranteed to be
           emitted by the CONSUMING app's Tailwind build, and this pill IS the
           state cue — if it collapses, the row loses its only visible state. */
        style={{ width: '2rem', height: '1.125rem' }}
        className={cn(
          'relative ms-auto inline-flex shrink-0 rounded-full transition-colors',
          /*
           * The OFF track is the SAME control as the `Switch` primitive's, and
           * must carry the same state visuals — round-5 UX gate S2: the 1.4.11
           * outline landed on `Switch` and not here, leaving this pill on a
           * bare `bg-gray-200` at **1.18:1**, i.e. an OFF row that reads as "no
           * control here". Grey-500 (`muted-foreground`) is the LIGHTEST token
           * in the ramp that clears the 3:1 non-text floor (grey-300 = 1.47:1,
           * grey-400 = 2.58:1), so this is the minimum that conforms, not an
           * overshoot.
           *
           * These literals are duplicated from `Switch.tsx` on purpose and the
           * duplication is TESTED, not trusted: Tailwind scans source
           * statically, so a shared runtime-built class string would never be
           * emitted, and `Switch` needs its half behind `data-[state=…]`
           * variants that cannot be applied to a shared constant. The contract
           * test in `DropdownMenu.test.tsx` ("switch pill matches the Switch
           * primitive's OFF treatment") renders both and asserts the same
           * token set, which is what stops the next Switch change from
           * half-landing the way this one did.
           */
          checked === true
            ? 'bg-primary'
            : 'bg-gray-200 outline-solid outline-1 -outline-offset-1 outline-muted-foreground',
        )}
      >
        <span
          className="absolute top-1/2 rounded-full bg-white shadow-sm transition-[inset-inline-start]"
          /* `insetInlineStart` is a LOGICAL property, so the knob travels the
             correct way under `dir="rtl"` with no transform to compensate. */
          style={{
            width: '0.875rem',
            height: '0.875rem',
            marginTop: '-0.4375rem',
            insetInlineStart: checked === true ? '0.9375rem' : '0.125rem',
          }}
        />
      </span>
    ) : null}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem'

export const DropdownMenuRadioItem = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    data-slot="dropdown-menu-radio-item"
    className={cn(
      'relative flex cursor-default select-none items-center gap-2 rounded-xs py-1.5 ps-8 pe-2 text-sm text-foreground outline-none',
      'focus:bg-muted',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute start-2 flex size-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="size-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem'

export function DropdownMenuLabel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', className)}
      {...props}
    />
  )
}

/**
 * DropdownMenuShortcut — muted keyboard-shortcut hint, pushed to the trailing edge.
 * Place inside a `DropdownMenuItem` alongside its label. RTL-safe: uses logical `ms-auto`.
 */
export function DropdownMenuShortcut({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn('ms-auto text-xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  )
}

export const DropdownMenuSeparator = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
))
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

export interface DropdownMenuSubTriggerProps
  extends ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> {
  /**
   * Which mark closes the row.
   *
   * - `'chevron-end'` (default, unchanged) — the trailing `›` that says "this
   *   opens a nested menu to the side".
   * - `'caret-down'` — a light `⌄`, for a sub-menu used as a VALUE PICKER
   *   (`Pin View  None ⌄`): the row reads as a select, not as a drill-in, and
   *   this is what the live-monitoring frames draw (495:45132 / 495:26635).
   *
   * Additive and opt-in: every existing call site keeps the chevron.
   */
  indicator?: 'chevron-end' | 'caret-down'
}

export const DropdownMenuSubTrigger = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  DropdownMenuSubTriggerProps
>(({ className, children, indicator = 'chevron-end', ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    data-slot="dropdown-menu-sub-trigger"
    data-indicator={indicator}
    className={cn(
      'flex cursor-default select-none items-center gap-2 rounded-xs px-2 py-1.5 text-sm text-foreground outline-none',
      'focus:bg-muted data-[state=open]:bg-muted',
      className,
    )}
    {...props}
  >
    {children}
    {indicator === 'caret-down' ? (
      <ChevronDown data-slot="dropdown-menu-sub-caret" className="size-4 text-muted-foreground" />
    ) : (
      <ChevronRight className="ms-auto size-4 rtl:-scale-x-100" />
    )}
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger'

export const DropdownMenuSubContent = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    data-slot="dropdown-menu-sub-content"
    className={cn(
      'z-popover min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-elevation outline-none',
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
      className,
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent'
