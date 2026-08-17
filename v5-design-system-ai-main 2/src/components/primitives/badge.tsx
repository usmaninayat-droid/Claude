import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

/**
 * Badge — covers Tag, Status, Label, Chip, Count from V2.
 *
 * Variants:
 * - default / secondary / outline / success / warning / info / destructive / muted
 *
 * Sizes: xs (count pill) / sm (default) / md.
 *
 * Pass a `color` CSS-var ref to override (e.g., tenant tag colors).
 */
// Radius/padding match the Figma "Basics → Badges" spec: sharp rounded-[2px]
// (--radius-sm) chips with 8px/4px padding. (Count pills opt into rounded-full.)
const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-sm border font-medium whitespace-nowrap shrink-0 gap-1 [&>svg]:size-3.5 [&>svg]:pointer-events-none transition-colors',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-primary text-primary-foreground',
        secondary:   'border-transparent bg-secondary text-secondary-foreground',
        outline:     'border-border text-foreground bg-card',
        muted:       'border-transparent bg-muted text-muted-foreground',
        success:     'border-transparent bg-[color:var(--status-success)]/15 text-[color:var(--status-success)]',
        warning:     'border-transparent bg-[color:var(--status-warning)]/15 text-[color:var(--status-warning)]',
        info:        'border-transparent bg-[color:var(--status-info)]/15 text-[color:var(--status-info)]',
        destructive: 'border-transparent bg-[color:var(--status-error)]/15 text-[color:var(--status-error)]',
      },
      size: {
        xs: 'px-1.5 py-0 text-caption h-4 rounded-full',
        sm: 'min-h-[22px] px-2 py-1 text-caption',
        md: 'px-2.5 py-1 text-body-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'sm' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  color?: string; // CSS color or var ref — overrides variant
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, color, style, children, ...props }, ref) => {
    const colorStyle: React.CSSProperties | undefined = color
      ? {
          backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
          color,
          borderColor: 'transparent',
        }
      : undefined;
    return (
      <span
        ref={ref}
        data-slot="badge"
        className={cn(badgeVariants({ variant, size }), className)}
        style={{ ...colorStyle, ...style }}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

export { badgeVariants };
