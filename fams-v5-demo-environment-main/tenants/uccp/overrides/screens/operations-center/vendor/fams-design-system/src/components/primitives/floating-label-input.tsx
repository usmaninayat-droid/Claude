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
    { label, leadingIcon, showChevron, errorText, helperText, className, onFocus, onBlur, value, defaultValue, placeholder, ...inputProps },
    ref,
  ) {
    const [isFocused, setIsFocused] = React.useState(false);
    const localRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => localRef.current!);

    const hasValue = (value !== undefined && value !== '') || (defaultValue !== undefined && defaultValue !== '');
    const isFloating = isFocused || hasValue;
    const hasError = !!errorText;

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    return (
      <div className="flex w-full flex-col gap-1">
        <div
          onClick={() => localRef.current?.focus()}
          className={cn(
            'relative flex h-14 w-full items-center rounded-md border bg-input-background px-3 transition-all cursor-text',
            'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15',
            hasError ? 'border-destructive' : 'border-border',
            className,
          )}
        >
          {leadingIcon ? (
            <span
              className="mr-2.5 inline-flex shrink-0 items-center justify-center text-muted-foreground pointer-events-none"
              aria-hidden
            >
              {leadingIcon}
            </span>
          ) : null}
          <div className="relative flex min-w-0 flex-1 h-full flex-col justify-center">
            <span
              className={cn(
                'pointer-events-none absolute transition-all duration-150 ease-out select-none text-muted-foreground',
                isFloating
                  ? 'top-1.5 translate-y-0 text-[10px] font-medium uppercase tracking-wide'
                  : 'top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground/90'
              )}
              style={isFloating ? { letterSpacing: '0.04em' } : undefined}
            >
              {label}
            </span>
            <input
              ref={localRef}
              value={value}
              defaultValue={defaultValue}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={isFocused ? placeholder : undefined}
              {...inputProps}
              className={cn(
                'w-full border-none bg-transparent p-0 text-sm font-medium text-foreground outline-none transition-all h-full',
                isFloating ? 'pt-4 opacity-100' : 'pt-0 opacity-0'
              )}
            />
          </div>
          {showChevron ? (
            <ChevronDown
              size={16}
              className="ml-2 shrink-0 text-muted-foreground pointer-events-none"
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
