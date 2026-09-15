import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge, taught about our custom typography tokens.
 *
 * `@fams/tokens` emits font-size utilities `text-h1…h6`, `text-body-xs…xl`, and
 * `text-caption` (from `--text-*`). Out of the box tailwind-merge doesn't know these
 * are font-sizes, so it lumps them into the same `text-*` bucket as color utilities
 * (`text-success`, `text-foreground`) and drops one when both appear on an element.
 * Registering them in the `font-size` group keeps size and color independent, so
 * `cn('text-body-sm', 'text-success')` correctly preserves both.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'body-xs',
            'body-sm',
            'body-md',
            'body-lg',
            'body-xl',
            'caption',
            'metric',
          ],
        },
      ],
      /*
       * FIX WAVE C-2 / P0-1 — the semantic z-scale (`--z-index-*`, emitted by
       * `@fams/tokens`) produces `z-dropdown`, `z-overlay`, `z-drawer`,
       * `z-popover`, … utilities. tailwind-merge only classifies `z-<integer>`
       * and `z-[…]` as z-index out of the box, so `cn('z-popover',
       * 'z-overlay')` kept BOTH classes and the winner came down to stylesheet
       * order — which is exactly how a field dropdown ended up painting under
       * the filter panel. Registering the token names makes the LAST one win,
       * the same way `font-size` above is registered.
       */
      z: [
        {
          z: ['base', 'dropdown', 'sticky', 'overlay', 'drawer', 'modal', 'popover', 'toast', 'tooltip'],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
