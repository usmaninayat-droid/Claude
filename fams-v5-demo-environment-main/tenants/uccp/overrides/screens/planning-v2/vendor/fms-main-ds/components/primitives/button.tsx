import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * Button — Pattern #03 + shadcn baseline.
 *
 * Variants:
 * - primary (default) — bg-primary, white text
 * - secondary        — bg-secondary
 * - tertiary         — outline + foreground
 * - ghost            — transparent w/ hover overlay
 * - destructive      — bg-destructive
 * - link             — underline-on-hover
 *
 * Sizes: sm / md (default) / lg / icon.
 * `loading` swaps the leading content for a spinner and disables interaction.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-body-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:     'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary:   'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        tertiary:    'border border-border bg-card text-foreground hover:bg-muted',
        ghost:       'hover:bg-muted hover:text-foreground text-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link:        'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm:   'h-8 px-3 text-caption',
        md:   'h-9 px-4 py-2',
        lg:   'h-10 px-6 text-body-md',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" /> : null}
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
