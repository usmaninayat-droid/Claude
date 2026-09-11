import { forwardRef, type ButtonHTMLAttributes, type ReactElement } from 'react'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from '../icons'
import { cn } from '../lib/cn'

/**
 * Button — ported verbatim from the GH reference DS (`button.tsx`). [L1 primitive]
 *
 * Variants: primary (default) / secondary / tertiary / ghost / destructive / link.
 * Sizes:    sm (h-8) / md (h-9, default) / lg (h-10) / icon (size-9) /
 *           iconRound (size-9, circular — the v5 `q-btn round` shape, for
 *           icon-only buttons).
 * `loading` shows a Loader2 spinner and disables interaction.
 *
 * `asChild` merges Button's props/className onto its single child instead of
 * rendering a `<button>` — e.g. a link-styled button used as the markup for a
 * table-row link: `<Button asChild variant="link"><Link to="/x">Row</Link></Button>`.
 * Implemented on Base UI's `useRender` (decision #7: no new Radix dependency;
 * mirrors `Text`/`Heading`) rather than `@radix-ui/react-slot` — this file was
 * grandfathered onto Radix Slot, but a slot can only ever clone ONE child, and
 * the old implementation always passed it two (see `loading` note below), so
 * `asChild` never actually worked at any call site. Migrated off Radix while
 * fixing that (migrate-on-touch, `eslint.radix-allowlist.mjs`).
 *
 * `loading`/`isLoading` cannot be combined with `asChild`: the spinner would
 * be a second child, and a slotted child must be exactly one element. In dev
 * this combination logs a warning and the spinner is silently dropped — the
 * busy semantics (`aria-busy`, `aria-disabled`) still apply to the child. If
 * you need a spinner on a slotted button, render it inside the child yourself.
 */
// `transition-colors`, NOT `transition-all` (fix3): `transition-all` animated
// box-shadow, so the :focus-visible ring faded in over 150ms — keyboard focus
// read as invisible (WCAG 2.4.7 probes sample the frame focus lands). Rings
// must paint instantly; color/background hovers keep their transition.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        tertiary: 'border border-border bg-card text-foreground hover:bg-muted',
        ghost: 'hover:bg-muted hover:text-foreground text-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4 py-2',
        lg: 'h-10 px-6 text-base',
        icon: 'size-9',
        iconRound: 'size-9 rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Merge Button's classes/props onto its single child instead of rendering
   * a `<button>`. The child must be a single element. See the file doc
   * comment above for the `loading` interaction.
   */
  asChild?: boolean
  /** Show the leading spinner and disable interaction. Not supported with `asChild` — see file doc comment. */
  loading?: boolean
  /** @deprecated Alias of `loading`, kept for back-compat. */
  isLoading?: boolean
  /** @deprecated Alias of the native `disabled`, kept for back-compat. */
  isDisabled?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading,
      isLoading,
      isDisabled,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const busy = loading ?? isLoading ?? false
    const isDisabledFinal = disabled || isDisabled || busy

    const nodeProcess = (globalThis as Record<string, unknown>).process as
      | { env?: { NODE_ENV?: string } }
      | undefined
    if (nodeProcess?.env?.NODE_ENV !== 'production' && asChild && busy) {
      console.warn(
        '[Button] `asChild` cannot render the loading spinner: a slotted child must be exactly one ' +
          'element, leaving no room for a sibling spinner. The spinner is suppressed for this render — ' +
          '`aria-busy`/`aria-disabled` are still applied to the child. Render the spinner inside the ' +
          'child yourself, or drop `asChild` for this button.',
      )
    }

    return useRender({
      render: asChild ? (children as ReactElement) : undefined,
      defaultTagName: 'button',
      ref,
      props: {
        'data-slot': 'button',
        ...props,
        className: cn(buttonVariants({ variant, size }), className),
        ...(asChild
          ? {
              // A native `disabled` attribute is meaningless (and invalid)
              // on most elements a consumer would slot in (e.g. `<a>`) — use
              // the ARIA equivalent instead, mirroring how a slotted button
              // still needs to communicate busy/disabled state.
              'aria-disabled': isDisabledFinal || undefined,
              'aria-busy': busy || undefined,
            }
          : {
              disabled: isDisabledFinal,
              'aria-busy': busy || undefined,
              children: busy ? (
                <>
                  <Loader2 className="animate-spin" data-motion="essential" />
                  {children}
                </>
              ) : (
                children
              ),
            }),
      },
    })
  },
)

Button.displayName = 'Button'

export { buttonVariants }
