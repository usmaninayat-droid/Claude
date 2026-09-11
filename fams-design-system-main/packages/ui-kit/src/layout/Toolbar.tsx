import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'
import { GAP_CLASS, type LayoutGap } from './_gap'

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  /** Main-axis alignment. Default `end` (the common dialog/card-footer case). */
  justify?: 'start' | 'center' | 'end' | 'between'
  /** Semantic gap preset. Default `inline` (buttons sit close together). */
  gap?: LayoutGap
  children?: ReactNode
}

/**
 * Toolbar — a horizontal row of actions (dialog footers, card headers,
 * table row actions). Preset alignment + gap so a button row is never
 * hand-spaced with `space-x-2` or `mr-2` on individual buttons.
 */
export function Toolbar({ justify = 'end', gap = 'inline', className, ...props }: ToolbarProps) {
  return (
    <div
      data-slot="toolbar"
      className={cn(
        'flex items-center',
        justify === 'start' && 'justify-start',
        justify === 'center' && 'justify-center',
        justify === 'end' && 'justify-end',
        justify === 'between' && 'justify-between',
        GAP_CLASS[gap],
        className,
      )}
      {...props}
    />
  )
}
