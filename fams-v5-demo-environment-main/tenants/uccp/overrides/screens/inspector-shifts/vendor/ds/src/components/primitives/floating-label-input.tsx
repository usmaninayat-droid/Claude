import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * FloatingLabelInput — Settings + Creation-Drawer style input.
 *
 * Source of truth: Web Portal Figma screenshots (Settings/Preferences form +
 * New Job Order drawer). Spec: `floating-label-input.spec.md` (co-located).
 *
 * The label hugs the top edge of the input (caption 10-11px muted), the
 * value sits below (body 14px foreground). Optional leading icon at far left.
 * Optional chevron-down for select-like inputs.
 *
 *  ┌──────────────────────────────────────┐
 *  │ Default Map Region                 ⌄ │  ← floating label
 *  │ Dubai                                │  ← value or placeholder
 *  └──────────────────────────────────────┘
 *
 * Use this whenever rendering a Settings form field, a creation-drawer
 * input, or a detail-view edit field. For inline labels (label above the
 * input) use the standard `<Input>` primitive.
 */

export interface FloatingLabelInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text, rendered as a caption inside the top edge. */
  label: string;
  /** Optional leading icon (e.g. lucide). 16px stroke. */
  leadingIcon?: React.ReactNode;
  /** Render a chevron-down at far right (used for select-like inputs). */
  showChevron?: boolean;
  /** Error message — when present, border turns destructive. */
  errorText?: string;
  /** Optional helper text below. */
  helperText?: string;
}

export const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  function FloatingLabelInput(
    { label, leadingIcon, showChevron, errorText, helperText, className, ...inputProps },
    ref,
  ) {
    const hasError = !!errorText;
    return (
      <div className="flex w-full flex-col gap-1">
        <div
          className={cn(
            'relative flex h-14 w-full items-center rounded-md border bg-input-background px-3 transition-colors',
            'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15',
            hasError ? 'border-destructive' : 'border-border',
            className,
          )}
        >
          {leadingIcon ? (
            <span
              className="mr-2 inline-flex shrink-0 items-center justify-center text-muted-foreground"
              aria-hidden
            >
              {leadingIcon}
            </span>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <span
              className="pointer-events-none text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              style={{ letterSpacing: '0.04em' }}
            >
              {label}
            </span>
            <input
              ref={ref}
              {...inputProps}
              className={cn(
                'mt-0.5 w-full border-none bg-transparent p-0 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60',
              )}
            />
          </div>
          {showChevron ? (
            <ChevronDown
              size={16}
              className="ml-2 shrink-0 text-muted-foreground"
              aria-hidden
            />
          ) : null}
        </div>
        {(errorText || helperText) ? (
          <p
            className={cn(
              'text-xs',
              hasError ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {errorText ?? helperText}
          </p>
        ) : null}
      </div>
    );
  },
);
