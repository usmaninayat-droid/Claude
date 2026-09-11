import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '../lib/cn'
import { Label } from './Label'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  containerClassName?: string
  /**
   * Floating-label mode (Figma Design System V2 fields spec, node 4808:2847):
   * the label sits inside the box at 14px semibold and floats up to a 12px
   * caption on focus/fill; min-height 160px, vertically resizable, hint text
   * under the field. Without it, `label` renders above the field (legacy).
   */
  floatLabel?: boolean
}

/**
 * Textarea — multi-line input. Two label modes:
 * - default: label-above (ported from the GH reference DS `textarea.tsx`)
 * - `floatLabel`: Figma fields-spec float-label anatomy matching `Input`'s
 *   floating mode (label inside, 2px primary focus outline, muted disabled
 *   fill at 50% opacity, read-only "prefilled" fill, hint/error subtext).
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, label, hint, error, floatLabel = false, id, ...props }, ref) => {
    const reactId = useId()
    const taId = id ?? reactId
    const hintId = `${taId}-hint`
    const subtext = error ? (
      <span id={hintId} role="alert" className={cn('text-xs font-medium text-destructive-emphasis', floatLabel && 'ps-4')}>
        {error}
      </span>
    ) : hint ? (
      <span id={hintId} className={cn('text-xs font-medium text-muted-foreground', floatLabel && 'ps-4')}>
        {hint}
      </span>
    ) : null

    if (floatLabel && label) {
      return (
        <div className={cn('flex w-full flex-col gap-1', containerClassName)}>
          <div className="relative">
            <textarea
              ref={ref}
              id={taId}
              data-slot="textarea"
              aria-invalid={!!error || undefined}
              aria-describedby={subtext ? hintId : undefined}
              placeholder=" "
              className={cn(
                'peer min-h-[160px] w-full resize-y rounded-sm border bg-input-background px-3 pb-2 pt-7 text-sm font-semibold text-foreground outline-none transition-colors',
                'focus:ring-1 focus:ring-inset focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50',
                'read-only:bg-muted',
                error
                  ? 'border-destructive focus:border-destructive focus:ring-destructive'
                  : 'border-input focus:border-primary focus:ring-primary',
                className,
              )}
              {...props}
            />
            <label
              htmlFor={taId}
              className={cn(
                'pointer-events-none absolute start-3 top-[21px] flex items-center gap-1 bg-transparent text-sm font-semibold transition-all duration-fast',
                error ? 'text-destructive-emphasis' : 'text-muted-foreground',
                'peer-focus:top-[9px] peer-focus:text-xs',
                'peer-[:not(:placeholder-shown)]:top-[9px] peer-[:not(:placeholder-shown)]:text-xs',
              )}
            >
              {label}
              {props.required ? (
                <span aria-hidden className="text-xs font-medium text-destructive-emphasis">
                  *
                </span>
              ) : null}
            </label>
          </div>
          {subtext}
        </div>
      )
    }

    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label ? <Label htmlFor={taId}>{label}</Label> : null}
        <textarea
          ref={ref}
          id={taId}
          data-slot="textarea"
          aria-invalid={!!error || undefined}
          aria-describedby={subtext ? hintId : undefined}
          className={cn(
            'min-h-[80px] w-full rounded-sm border border-border bg-input-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-shadow outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-destructive focus-visible:ring-destructive/30' : '',
            className,
          )}
          {...props}
        />
        {subtext}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'
