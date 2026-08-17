import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * `cn` — merge tailwind classes with conflict resolution.
 * Canonical shadcn helper.
 *
 * T-102 (bug fix, behavior-additive — backported from the Smart Routing
 * product 2026-07-17): tailwind-merge must be TAUGHT the DS's custom
 * font-size utilities (`text-h1..h6`, `text-body-xl..xs`, `text-body`,
 * `text-label`, `text-caption` — Tailwind v4 `--text-*` theme tokens in
 * tokens/theme.css). The default config can't classify them, treats them as
 * text COLORS, and silently DROPS them whenever a real color follows in the
 * same cn() call — `cn('text-caption …', 'text-muted-foreground')` rendered
 * inherited 16px text while the source read correctly. Standard-scale sizes
 * (text-xs/sm/base/lg/xl/2xl/3xl) need no declaration — the default config
 * already knows them.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'body-xl', 'body-lg', 'body-md', 'body-sm', 'body-xs',
            'body', 'label', 'caption',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
