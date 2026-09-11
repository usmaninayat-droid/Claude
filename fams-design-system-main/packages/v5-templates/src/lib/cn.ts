import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * cn — className joiner for `@fams/v5-templates`, mirroring `@fams/ui-kit`'s
 * own `cn` (clsx + tailwind-merge) so tier-2 patterns get the same
 * Tailwind-conflict resolution the core relies on.
 *
 * Like the core's `cn`, tailwind-merge is taught our custom typography
 * tokens: `@fams/tokens` emits font-size utilities `text-h1…h6`,
 * `text-body-xs…xl`, and `text-caption` (from `--text-*`). Out of the box
 * tailwind-merge doesn't know these are font-sizes, so it lumps them into
 * the same `text-*` bucket as color utilities and DROPS the size whenever a
 * color follows — the exact bug behind round-1 inbox QA's "chip/title text
 * renders 16px": `cn('… text-caption …', 'text-muted-foreground')` silently
 * lost `text-caption`. Registering the token names in the `font-size` group
 * keeps size and color independent.
 *
 * (Open core-gap for the design review: `@fams/ui-kit` does not export its
 * `cn` publicly, so this package re-implements the same utility — including
 * this extension, which MUST stay in sync with the core's. Worth exporting
 * `cn` from the core's public surface so every tier reuses one canonical
 * version.)
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

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
