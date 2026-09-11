import { forwardRef, type HTMLAttributes, type ReactElement } from 'react'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

/**
 * Text — general body-copy primitive. [L1 primitive]
 *
 * The typography primitive the DS was missing: body copy outside a `Card` had
 * no home, so consumers either hand-rolled
 * `<span className="text-body-sm text-muted-foreground">` (the ad-hoc styling
 * the DS forbids) or reached for `CardDescription` outside a card just to stay
 * "pure DS" — the wrong component for the job (it is a `Card` slot, not a
 * standalone primitive). `Text` is that home. See `Guidelines` in the demo
 * page (and `CardDescription`'s own doc comment) for the specific migration.
 *
 * `size`: the body/caption scale only (`body-xl` … `body-xs`, `caption`) —
 * heading sizes live on `Heading`. Sizing is exclusively these token classes;
 * never a raw font-size.
 * `weight`: standard Tailwind weight utilities (400/500/600/700).
 * `tone`: semantic color only — never a raw hex or arbitrary value.
 * `as`: the rendered element — `span` (default, inline) or `p`/`div`/`label`
 * for block copy. `asChild` merges Text's props/className onto its single
 * child instead — implemented on Base UI's `useRender` (decision #7: new
 * primitives never take a new Radix dependency, `@radix-ui/react-slot`
 * included) — and takes precedence over `as` when both are given.
 */
export const textVariants = cva('', {
  variants: {
    size: {
      'body-xl': 'text-body-xl',
      'body-lg': 'text-body-lg',
      'body-md': 'text-body-md',
      'body-sm': 'text-body-sm',
      'body-xs': 'text-body-xs',
      caption: 'text-caption',
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
    size: 'body-md',
    weight: 'normal',
    tone: 'default',
  },
})

/** `text-start` / `text-center` / `text-end` — logical, not `left`/`right`. */
const ALIGN_CLASSES = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
} as const

export type TextElement = 'span' | 'p' | 'div' | 'label'
export type TextAlign = keyof typeof ALIGN_CLASSES

export interface TextProps
  extends Omit<HTMLAttributes<HTMLElement>, 'color'>,
    VariantProps<typeof textVariants> {
  /** Element to render — `span` (default) for inline copy, `p` for paragraphs. */
  as?: TextElement
  /** Merge props/className onto the single child instead of rendering `as`. */
  asChild?: boolean
  /** `text-start` / `text-center` / `text-end` — logical alignment, no `left`/`right`. */
  align?: TextAlign
  /** Single-line ellipsis truncation. The element needs a bounded width to take effect. */
  truncate?: boolean
}

export const Text = forwardRef<HTMLElement, TextProps>(
  ({ className, size, weight, tone, align, truncate, as, asChild = false, children, ...props }, ref) => {
    return useRender({
      render: asChild ? (children as ReactElement) : undefined,
      defaultTagName: as ?? 'span',
      ref,
      props: {
        'data-slot': 'text',
        ...props,
        className: cn(
          textVariants({ size, weight, tone }),
          align && ALIGN_CLASSES[align],
          truncate && 'truncate',
          className,
        ),
        // In asChild mode `children` IS the single child element passed as
        // `render` above — it must not also be re-attached as content here.
        ...(asChild ? {} : { children }),
      },
    })
  },
)

Text.displayName = 'Text'
