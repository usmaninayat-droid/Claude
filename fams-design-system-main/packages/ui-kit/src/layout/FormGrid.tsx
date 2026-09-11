import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'
import { GAP_CLASS, type LayoutGap } from './_gap'

const COLUMN_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

export interface FormGridProps extends HTMLAttributes<HTMLDivElement> {
  /** Column count at the widest breakpoint; collapses to 1 below `sm`. Default 2. */
  columns?: 1 | 2 | 3 | 4
  /** Semantic gap preset (row + column gap). Default `field`. */
  gap?: LayoutGap
  children?: ReactNode
}

/**
 * FormGrid — the answer to "how do we lay out five input fields": pick a
 * column count, the grid owns every gap. A field that needs the full row
 * (e.g. a long text area) spans with `className="sm:col-span-full"` on the
 * child — the grid still owns the surrounding gaps.
 */
export function FormGrid({ columns = 2, gap = 'field', className, ...props }: FormGridProps) {
  return (
    <div
      data-slot="form-grid"
      className={cn('grid', COLUMN_CLASS[columns], GAP_CLASS[gap], className)}
      {...props}
    />
  )
}
