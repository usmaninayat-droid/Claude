import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Stack } from './Stack'

export interface FormSectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Section heading. */
  title: ReactNode
  /** Optional supporting line below the title. */
  description?: ReactNode
  children?: ReactNode
}

/**
 * FormSection — a titled group of fields. Internally stacks its children
 * with `gap="field"`; sections themselves are meant to be composed inside a
 * `<Stack gap="section">` so the section-to-section gap is also a preset,
 * never a margin the developer writes by hand.
 */
export function FormSection({ title, description, children, className, ...props }: FormSectionProps) {
  return (
    <section data-slot="form-section" className={cn(className)} {...props}>
      <div className="mb-inline">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Stack gap="field">{children}</Stack>
    </section>
  )
}
