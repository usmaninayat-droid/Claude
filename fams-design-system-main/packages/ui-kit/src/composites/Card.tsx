import { forwardRef, type HTMLAttributes, type ReactElement } from 'react'
import { useRender } from '@base-ui/react/use-render'
import { cn } from '../lib/cn'
import type { HeadingLevel } from '../primitives/Heading'

/**
 * Card — surface container for grouped content. [L3 composite]
 * Composes with `CardHeader` / `CardTitle` / `CardDescription` / `CardContent`
 * for the standard header+body layout used across list/detail panels.
 */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-md border border-border bg-card shadow-elevation', className)}
      {...props}
    />
  ),
)
Card.displayName = 'Card'

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4 flex flex-col', className)} {...props} />
))
CardHeader.displayName = 'CardHeader'

const CARD_TITLE_LEVEL_ELEMENTS: Record<HeadingLevel, `h${HeadingLevel}`> = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
  5: 'h5',
  6: 'h6',
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /**
   * Semantic heading level (1–6), controls the rendered element (h1…h6).
   * Defaults to 3 — CardTitle has historically always rendered an `h3`, and
   * every existing call site relies on that, so the default is preserved
   * exactly for backward compatibility.
   *
   * Set this explicitly when a card is the primary content of a page/screen
   * (e.g. a login screen built entirely out of Card components) so the page
   * still has a correct heading hierarchy — typically `level={1}` for the
   * one card whose title is the page's main heading. Do NOT reach for
   * `aria-level` instead: browsers/AT compute the accessible heading level
   * from the actual tag name, not from `aria-level` layered on a `<h3>` —
   * Chromium's accessibility tree still reports level 3 in that case. The
   * element itself must change, which is exactly what this prop does.
   *
   * Visual size intentionally stays fixed (`text-lg font-semibold`)
   * regardless of `level` — CardTitle's look does not change; only the
   * semantic tag does. If you need a differently-sized heading, use the
   * `Heading` primitive directly instead of CardTitle.
   */
  level?: HeadingLevel
  /** Merge props/className onto the single child instead of rendering the level's element. */
  asChild?: boolean
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, level = 3, asChild = false, children, ...props }, ref) =>
    useRender({
      render: asChild ? (children as ReactElement) : undefined,
      defaultTagName: CARD_TITLE_LEVEL_ELEMENTS[level],
      ref,
      props: {
        ...props,
        className: cn('text-lg font-semibold text-foreground', className),
        ...(asChild ? {} : { children }),
      },
    }),
)
CardTitle.displayName = 'CardTitle'

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-body-sm text-muted-foreground', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4 pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

export const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-4 pt-0 flex items-center', className)}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'
