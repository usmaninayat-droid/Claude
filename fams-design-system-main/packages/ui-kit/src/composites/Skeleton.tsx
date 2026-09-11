import { Map as MapIcon } from '../icons'
import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Preset shape. `custom` relies entirely on `className` for sizing.
   * `image` is the map/photo placeholder archetype — a full-bleed muted
   * surface with a centered icon, not just a plain rect. Default `text`.
   */
  variant?: 'text' | 'circle' | 'rect' | 'image' | 'custom'
}

const VARIANT_CLASS: Record<NonNullable<SkeletonProps['variant']>, string> = {
  text: 'h-4 w-full rounded-md',
  circle: 'size-10 rounded-full',
  rect: 'h-24 w-full rounded-sm',
  image: 'h-48 w-full rounded-sm grid place-items-center',
  custom: '',
}

/**
 * Skeleton — the loading placeholder every data surface uses instead of a
 * spinner. Compose several to build a table/card/list/profile skeleton;
 * do not build ad-hoc pulsing `<div>`s per feature.
 */
export function Skeleton({ variant = 'text', className, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('animate-pulse bg-muted', VARIANT_CLASS[variant], className)}
      {...props}
    >
      {variant === 'image' ? <MapIcon className="size-8 text-muted-foreground/40" /> : null}
    </div>
  )
}
