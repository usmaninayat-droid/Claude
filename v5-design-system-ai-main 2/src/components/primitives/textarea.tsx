import * as React from 'react';
import { cn } from '../utils/cn';
import { Label } from './label';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, label, hint, error, id, ...props }, ref) => {
    const taId = id ?? React.useId();
    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label ? <Label htmlFor={taId}>{label}</Label> : null}
        <textarea
          ref={ref}
          id={taId}
          data-slot="textarea"
          aria-invalid={!!error || undefined}
          className={cn(
            'min-h-[80px] w-full rounded-md border border-border bg-input-background px-3 py-2 text-body-sm text-foreground placeholder:text-muted-foreground transition-shadow outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-destructive focus-visible:ring-destructive/30' : '',
            className
          )}
          {...props}
        />
        {error ? (
          <span className="text-caption text-destructive">{error}</span>
        ) : hint ? (
          <span className="text-caption text-muted-foreground">{hint}</span>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
