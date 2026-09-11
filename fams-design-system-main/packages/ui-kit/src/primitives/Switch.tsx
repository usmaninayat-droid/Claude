import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { Switch as RadixSwitch } from 'radix-ui'
import { cn } from '../lib/cn'

export interface SwitchProps
  extends ComponentPropsWithoutRef<typeof RadixSwitch.Root> {
  /** @deprecated Alias of the native `disabled`, kept for back-compat. */
  isDisabled?: boolean
  /**
   * Track size. `sm` (32×18) is the long-standing default; `md` (36×20) is
   * the Figma live-monitoring meta-row size — a toggle that sits alone on a
   * dense header row and has to be findable at a glance.
   * @default 'sm'
   */
  size?: 'sm' | 'md'
}

/**
 * Switch — accessible toggle built on Radix `Switch` (Root + Thumb).
 *
 * ON uses the tenant `primary` brand fill, OFF a neutral grey track with a
 * hairline boundary. `size="sm"` is 32×18 (default), `size="md"` 36×20.
 * Focus ring, RTL-safe (the thumb travels toward the logical end via
 * `rtl:` transforms driven by `[dir]`). `role="switch"` and `aria-checked`
 * come from Radix itself.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, disabled, isDisabled, size = 'sm', ...props }, ref) => (
    <RadixSwitch.Root
      ref={ref}
      data-slot="switch"
      disabled={disabled ?? isDisabled}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full outline-none transition-colors',
        // token-exempt: Figma-sourced switch track geometry (no size token
        // covers a two-value control track).
        size === 'md' ? 'h-5 w-9' : 'h-[18px] w-8',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        /* OFF track is a real neutral GREY, not `muted` (designer round 5:
           on the white list panel the muted track read as white-on-white and
           the control was effectively invisible). `bg-gray-200` + the hairline
           outline below gives it a visible boundary AND a visible fill. */
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-200',
        /*
         * WCAG 1.4.11 (round-4 UX finding N3): the OFF track used to be `muted`,
         * whose darkest pixel measured 1.44:1 against a white surface — under the 3:1 floor for a control a user must be able to
         * FIND. Nothing else identifies it: thumb position separates the two
         * states only once you have located the control. A 1px inset outline
         * in `muted-foreground` (#667085 = 4.05:1 on white, 4.4:1 on the dark
         * card) draws the boundary. `outline`, not `border`/`ring`: a border
         * would shrink the padding box and shift the thumb, and a ring would
         * collide with the focus ring below.
         */
        // `outline-solid` explicitly: the base `outline-none` above sets
        // `--tw-outline-style: none`, which a bare `outline` utility inherits.
        'data-[state=unchecked]:outline-solid data-[state=unchecked]:outline-1',
        'data-[state=unchecked]:-outline-offset-1 data-[state=unchecked]:outline-muted-foreground',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadixSwitch.Thumb
        className={cn(
          'pointer-events-none absolute start-0.5 rounded-full bg-white shadow-sm transition-transform',
          // token-exempt: knob geometry paired with the track sizes above.
          size === 'md' ? 'size-4' : 'size-3.5',
          // Travel toward the logical end. LTR = +right, RTL = -left.
          size === 'md' ? 'data-[state=checked]:translate-x-4' : 'data-[state=checked]:translate-x-[14px]',
          size === 'md' ? 'rtl:data-[state=checked]:-translate-x-4' : 'rtl:data-[state=checked]:-translate-x-[14px]',
        )}
      />
    </RadixSwitch.Root>
  ),
)

Switch.displayName = 'Switch'
