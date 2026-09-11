import * as React from 'react';
import { cn } from '../utils/cn';
import { Label } from './label';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  containerClassName?: string;
}

/**
 * Input — base shadcn input + label/hint/error slots + leading/trailing icons.
 * Use w/o label by omitting `label` prop.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, containerClassName, label, hint, error, leadingIcon, trailingIcon, id, ...props },
    ref
  ) => {
    const inputId = id ?? React.useId();
    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label ? <Label htmlFor={inputId}>{label}</Label> : null}
        <div className="relative flex items-center">
          {leadingIcon ? (
            <span className="pointer-events-none absolute left-3 flex items-center text-muted-foreground [&>svg]:size-4">
              {leadingIcon}
            </span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            data-slot="input"
            aria-invalid={!!error || undefined}
            className={cn(
              'flex h-9 w-full min-w-0 rounded-md border border-border bg-input-background px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground transition-shadow outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary',
              'disabled:cursor-not-allowed disabled:opacity-50',
              leadingIcon ? 'pl-9' : '',
              trailingIcon ? 'pr-9' : '',
              error ? 'border-destructive focus-visible:ring-destructive/30' : '',
              className
            )}
            {...props}
          />
          {trailingIcon ? (
            <span className="absolute right-3 flex items-center text-muted-foreground [&>svg]:size-4">
              {trailingIcon}
            </span>
          ) : null}
        </div>
        {error ? (
          <span className="text-xs text-destructive">{error}</span>
        ) : hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';
