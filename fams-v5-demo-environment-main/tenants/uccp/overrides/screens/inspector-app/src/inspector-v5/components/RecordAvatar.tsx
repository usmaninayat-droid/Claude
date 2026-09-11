import { cn } from '@ds/components/utils/cn';

/**
 * RecordAvatar — the FAMS V5 DS `Avatar`'s initials fallback, replicated.
 *
 * The vendored DS in this app predates the platform's 2026-08-31 avatar fix
 * (solid per-person fill hashed onto the `accent-family` `-dark` stops, first
 * initial only), so `@ds`'s own `Avatar` renders a flat `bg-secondary` chip
 * that does NOT match the web card's footer stack. `initialsFrom` and
 * `hashToPaletteClass` below are ported line-for-line from
 * `fams-design-system/packages/ui-kit/src/primitives/Avatar.tsx` — same
 * djb2 accumulation, same Murmur3 finalizer, same 7-hue palette in the same
 * order — so a given name resolves to the SAME color here as on the web.
 */

/** Ported verbatim from ui-kit `Avatar.initialsFrom`. */
export function initialsFrom(source: string): string {
  const parts = source.trim().split(/[\s_\-.]+/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts[0][0].toUpperCase();
}

const AVATAR_PALETTE_CLASSES: readonly string[] = [
  'bg-accent-family-azure-dark text-white',
  'bg-accent-family-lavender-dark text-white',
  'bg-accent-family-plum-dark text-white',
  'bg-accent-family-lime-dark text-white',
  'bg-accent-family-aqua-green-dark text-white',
  'bg-accent-family-flame-dark text-white',
  'bg-accent-family-rose-dark text-white',
];

/** Ported verbatim from ui-kit `Avatar.hashToPaletteClass`. */
function hashToPaletteClass(source: string): string {
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0;
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return AVATAR_PALETTE_CLASSES[Math.abs(hash) % AVATAR_PALETTE_CLASSES.length];
}

/** `size="xs"` in `KanbanCard`'s footer stack renders a 24px circle. */
export function RecordAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      data-slot="avatar"
      title={name}
      className={cn('relative flex shrink-0 overflow-hidden rounded-full size-6 text-caption', className)}
    >
      <span
        className={cn(
          'flex size-full items-center justify-center rounded-full font-medium',
          hashToPaletteClass(name),
        )}
      >
        {initialsFrom(name)}
      </span>
    </span>
  );
}
