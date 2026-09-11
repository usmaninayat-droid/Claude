import * as React from 'react';
import { cn } from '../utils/cn';

export interface StagePillProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: React.ReactNode;
  color?: string;
  active?: boolean;
}

/**
 * StagePill — pipeline stage indicator. Use inline next to record IDs / titles.
 */
export const StagePill = React.forwardRef<HTMLSpanElement, StagePillProps>(
  ({ className, label, color, active, style, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-caption font-medium',
        className
      )}
      style={{
        background: color ? `color-mix(in srgb, ${color} 15%, transparent)` : 'var(--muted)',
        color: color ?? 'var(--muted-foreground)',
        borderColor: color ? `color-mix(in srgb, ${color} 30%, transparent)` : 'var(--border)',
        ...style,
      }}
      {...props}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: color ?? 'var(--gray-400)' }} />
      {label}
    </span>
  )
);
StagePill.displayName = 'StagePill';
