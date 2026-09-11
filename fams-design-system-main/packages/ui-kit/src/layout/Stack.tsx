import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'
import { GAP_CLASS, type LayoutGap } from './_gap'

export type { LayoutGap }

export interface StackProps extends HTMLAttributes<HTMLElement> {
  /** Row or column. Default `column` (the common "stack of fields" case). */
  direction?: 'row' | 'column'
  /** Semantic gap preset — never a raw number. */
  gap?: LayoutGap
  /** Cross-axis alignment (`items-*`). */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** Wrap onto multiple lines (row direction). */
  wrap?: boolean
  /** Render as a different element (e.g. `"section"`, `"form"`, `"ul"`). */
  as?: ElementType
  children?: ReactNode
}

/**
 * Stack — the base layout primitive. [L2 layout] A flex container whose gap
 * can only be one of the semantic presets. Composes into
 * `FormGrid`/`FormSection`/`Toolbar` so most call sites never touch `Stack` directly.
 *
 * Pattern:      <Stack gap="field">{...inputs}</Stack>
 * Anti-pattern: <div style={{ marginBottom: 16 }}>{...}</div>
 */
export function Stack({
  direction = 'column',
  gap = 'field',
  align,
  wrap = false,
  as: Component = 'div',
  className,
  ...props
}: StackProps) {
  return (
    <Component
      data-slot="stack"
      className={cn(
        'flex',
        direction === 'row' ? 'flex-row' : 'flex-col',
        GAP_CLASS[gap],
        align === 'start' && 'items-start',
        align === 'center' && 'items-center',
        align === 'end' && 'items-end',
        align === 'stretch' && 'items-stretch',
        wrap && 'flex-wrap',
        className,
      )}
      {...props}
    />
  )
}
