import { forwardRef, type HTMLAttributes, type ReactElement } from 'react'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

/**
 * Heading — semantic heading primitive. [L1 primitive]
 *
 * `level` (1–6) controls the rendered element (`h1`…`h6`) for document
 * structure/accessibility. `size` is DECOUPLED from `level` and defaults to
 * the level's matching `text-h*` class — so a page can render an `h2` (correct
 * heading order for assistive tech / outline) that visually reads as an `h4`,
 * without skipping or abusing heading levels just to get a smaller look.
 * Always set `level` for document structure; only override `size` when the
 * visual weight needs to diverge from that structural level.
 *
 * `weight`/`tone`/`asChild`/`truncate` mirror `Text` — see its doc comment,
 * including why `Text` (not `CardDescription`) is the non-heading counterpart.
 */
export const headingVariants = cva('', {
  variants: {
    size: {
      h1: 'text-h1',
      h2: 'text-h2',
      h3: 'text-h3',
      h4: 'text-h4',
      h5: 'text-h5',
      h6: 'text-h6',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    tone: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      // `primary`/`info` (both #0072d6) fail AA on dark surfaces only — a
      // pre-existing, out-of-scope foundational finding (fix7 wave 5/6),
      // deferred pending a dedicated alias wave; left as-is.
      primary: 'text-primary',
      info: 'text-info',
      // fix7 wave 6, P2 sweep: these three were the bare FILL tokens
      // (destructive/success/warning), 2.35-3.91:1, failing AA as readable
      // text — dormant (no live caller picks a colored `tone` yet, same
      // "unused but still broken" shape wave 5 already fixed for
      // `ReadFlagToneDate`'s dormant `warning` entry). Moved to the
      // sanctioned accessible TEXT aliases so the FIRST caller to use them
      // gets it right.
      destructive: 'text-destructive-emphasis',
      success: 'text-success-text',
      warning: 'text-warning-text',
    },
  },
  defaultVariants: {
    weight: 'bold',
    tone: 'default',
  },
})

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
export type HeadingSize = NonNullable<VariantProps<typeof headingVariants>['size']>

const LEVEL_ELEMENTS: Record<HeadingLevel, `h${HeadingLevel}`> = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
  5: 'h5',
  6: 'h6',
}

const LEVEL_SIZE: Record<HeadingLevel, HeadingSize> = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
  5: 'h5',
  6: 'h6',
}

export interface HeadingProps
  extends Omit<HTMLAttributes<HTMLHeadingElement>, 'color'>,
    Omit<VariantProps<typeof headingVariants>, 'size'> {
  /** 1–6, controls the rendered element (h1…h6). Required — there is no default level. */
  level: HeadingLevel
  /**
   * Visual size, decoupled from `level`. Defaults to the level's matching
   * `text-h*` class. Set this to make a structurally-correct heading level
   * look like a different size (e.g. an `h2` styled as `text-h4`).
   */
  size?: HeadingSize
  /** Merge props/className onto the single child instead of rendering the level's element. */
  asChild?: boolean
  /** Single-line ellipsis truncation. The element needs a bounded width to take effect. */
  truncate?: boolean
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level, size, weight, tone, truncate, asChild = false, children, ...props }, ref) => {
    const resolvedSize = size ?? LEVEL_SIZE[level]
    return useRender({
      render: asChild ? (children as ReactElement) : undefined,
      defaultTagName: LEVEL_ELEMENTS[level],
      ref,
      props: {
        'data-slot': 'heading',
        ...props,
        className: cn(headingVariants({ size: resolvedSize, weight, tone }), truncate && 'truncate', className),
        // In asChild mode `children` IS the single child element passed as
        // `render` above — it must not also be re-attached as content here.
        ...(asChild ? {} : { children }),
      },
    })
  },
)

Heading.displayName = 'Heading'
