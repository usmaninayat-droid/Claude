import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { Avatar as AvatarPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

/**
 * Avatar — person/entity image with initials fallback. [L1 primitive]
 *
 * Sizes xs–xl each pair a `size-*` token with a matched type-scale token so
 * initials never look mismatched to the circle. Falls back from `src` to a
 * SINGLE uppercase initial (first letter of `name`, or `alt` when `name` is
 * absent) — never a broken image, and never a two-letter monogram (platform
 * fix 2026-08-31: every text/initials avatar across the app — list cells,
 * kanban cards, detail fields, comment feeds, popups — renders exactly one
 * letter; consolidate any other initials-generation utility to this one
 * rather than re-deriving it per consumer).
 * The fallback is filled SOLID per-person via a deterministic hash over
 * `name`/`alt` onto the `accent-family` token set's `-dark` stops (7
 * non-status hue families — `docs/knowledge-base` token collection, Figma
 * "Accent" collection) paired with white text — see `AVATAR_PALETTE_CLASSES`
 * below — restoring the old Vue `CustomAvatar`'s hash-based palette (see
 * `@usage-v5` note) that this port had dropped in favor of a single flat
 * neutral fill, then correcting the palette (2026-08-31) from a pastel
 * `-light` wash + tinted text to a solid `-dark` fill + white text (every
 * `-dark` stop is >=4.5:1 against white, WCAG AA for normal text). No
 * `name`/`alt` (an edge case no current caller hits) falls back to that
 * original flat `bg-muted` treatment.
 * Optional `status` renders a corner dot whose ring reads `ring-card`, so it
 * always matches the surface the avatar sits on rather than a hardcoded white.
 *
 * @usage-v5
 *   Replaces ad-hoc `q-avatar` usage (173 occurrences across
 *   shared/iwmp/fams/ead) and the bespoke `shared/components/avatar/CustomAvatar.vue`
 *   (hash-based palette + first/last-initial logic, single fixed 24px size, no
 *   status dot). Heavy use in list rows (AssigneeList.vue), profile cards
 *   (ProfileCard.vue, EntityProfileCard.vue ×4), and menus (UserMenu.vue).
 *   Forms needed: size xs–xl, image-with-initials-fallback, optional status dot.
 * @usage-index avatar
 */

const avatarVariants = cva('relative flex shrink-0 overflow-hidden rounded-full', {
  variants: {
    size: {
      xs: 'size-6 text-caption',
      sm: 'size-8 text-body-xs',
      md: 'size-10 text-body-sm',
      lg: 'size-12 text-body-md',
      xl: 'size-16 text-body-lg',
    },
  },
  defaultVariants: { size: 'md' },
})

const statusDotVariants = cva(
  'absolute bottom-0 end-0 rounded-full ring-2 ring-card',
  {
    variants: {
      size: {
        xs: 'size-1.5',
        sm: 'size-2',
        md: 'size-2.5',
        lg: 'size-3',
        xl: 'size-3.5',
      },
      status: {
        online: 'bg-success',
        offline: 'bg-muted-foreground',
        busy: 'bg-destructive',
      },
    },
    defaultVariants: { size: 'md', status: 'online' },
  },
)

// Splits on whitespace AND `_`/`-`/`.` so a raw system id ("u_admin",
// "dispatcher-01") reads its first real token ("u", "dispatcher") rather than
// grabbing its first literal character run when it has no real spaces, then
// takes ONLY that token's first character — single-initial avatars, platform
// -wide (2026-08-31 fix): never a two-letter "AK"/"DT" monogram.
//
// Exported (not module-private) so every OTHER text/initials fallback on the
// platform — e.g. `v5-module-renderers.tsx`'s identity-panel hero tile,
// which used to re-derive its own two-letter monogram via a parallel
// `initialsFromTitle` — consolidates onto this single derivation instead of
// drifting out of sync with it again.
export function initialsFrom(source: string): string {
  const parts = source.trim().split(/[\s_\-.]+/).filter(Boolean)
  if (parts.length === 0) return ''
  return parts[0][0].toUpperCase()
}

/**
 * Fallback SOLID-fill palette — one `bg`/`text` pair per `accent-family` hue
 * (`--color-accent-family-*`, the token collection's own "non-status accent
 * hue families" description), each pinned to that hue's `-dark` stop with
 * white text. A static array (not a template literal) so Tailwind's compiler
 * can see every class name at build time, same pattern as `Badge`'s
 * `COLOR_INDEX_CLASSES`.
 *
 * Chosen for hue SPREAD, not just distinct token names: the original set
 * paired `flame` with `yellow` — two families whose stops are both
 * pale/burnt orange-tan, so two different people hashing into neighboring
 * buckets (e.g. "Kashish Bindrani" → `flame`, "Emmad Ahmad" → `yellow`, the
 * exact live-demo pair a vision diff flagged as "same flat tan/orange for
 * everyone") rendered as visually indistinguishable even though the hash
 * math *did* pick different classes. `rose` (red-pink, ~330° hue) replaces
 * `yellow` (~40° hue, next to `flame`'s ~20°) to keep every bucket at least
 * ~30° apart on the wheel. A finite bucket count can still collide for two
 * SPECIFIC names (expected, same tradeoff the old Vue `CustomAvatar` hash
 * palette made) — this fix targets the "two adjacent buckets read as the
 * same color" defect, not collision-freedom.
 *
 * SOLID not tinted (2026-08-31 platform fix): every text/initials avatar
 * must read as a solid chip, not a pastel wash — so this uses each hue's
 * `-dark` stop (not `-light`) as the background with plain white text,
 * instead of the previous `-light` bg / `-dark` text pairing. Every `-dark`
 * stop clears >=4.5:1 contrast against white (WCAG AA, normal text):
 * azure 6.70, lavender 6.62, plum 6.32, lime 4.99, aqua-green 5.41,
 * flame 5.50, rose 6.16 — verified against `core.tokens.json`'s hex values.
 */
const AVATAR_PALETTE_CLASSES: readonly string[] = [
  'bg-accent-family-azure-dark text-white',
  'bg-accent-family-lavender-dark text-white',
  'bg-accent-family-plum-dark text-white',
  'bg-accent-family-lime-dark text-white',
  'bg-accent-family-aqua-green-dark text-white',
  'bg-accent-family-flame-dark text-white',
  'bg-accent-family-rose-dark text-white',
]

/** Deterministic djb2-ish string hash → a stable index into `classes`, so the
 *  same person always resolves to the same palette family (no per-user color
 *  assignment to store).
 *
 * The plain polynomial accumulation (`hash = hash*31 + charCode`) under-mixes
 * its low-order bits, so two short/structurally-similar strings can land on
 * the exact same bucket even though their raw hashes differ — verified live:
 * the demo's own `"u_admin"`/`"u_dispatcher"` persona ids (ubiquitous across
 * every tenant's ticketing/assignee seeds) both landed on `flame`, reading as
 * the same "all avatars are one color" defect this palette swap was meant to
 * fix (see the palette's own docblock above). A Murmur3-style finalizer —
 * xor-shift / multiply passes over the full 32 bits — spreads that entropy
 * before the modulo, separating this pair (and other short-id-like inputs)
 * without touching the accumulation loop or the palette itself, so the
 * existing "same person → same color" and "two live-demo names stay distinct"
 * guarantees (`Avatar.test.tsx`) still hold. */
function hashToPaletteClass(source: string): string {
  let hash = 0
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0
  }
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x85ebca6b)
  hash ^= hash >>> 13
  hash = Math.imul(hash, 0xc2b2ae35)
  hash ^= hash >>> 16
  return AVATAR_PALETTE_CLASSES[Math.abs(hash) % AVATAR_PALETTE_CLASSES.length]
}

/**
 * Closed semantic tone set for the initials fallback — an explicit
 * role/status color (figma-spec-detail.md §3's Supervisor/Reported By/Area
 * Manager avatars, each solid-filled per role rather than the deterministic
 * per-person hash) OVERRIDES `hashToPaletteClass` when given. Resolves
 * through the same status tokens as `IconBadge`/`Badge` — never a raw hex.
 */
export type AvatarTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TONE_FALLBACK_CLASSES: Record<AvatarTone, string> = {
  primary: 'bg-primary text-primary-foreground',
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  danger: 'bg-destructive text-destructive-foreground',
  info: 'bg-info text-white',
  // The Figma "quiet identity" avatar (logout-popup spec): neutral-300 ground,
  // neutral-600 initials — for surfaces where a per-person hash color would
  // read as decoration (e.g. the user popover), not identification.
  neutral: 'bg-gray-300 text-gray-600',
}

export interface AvatarProps
  extends Omit<ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>, 'children'>,
    VariantProps<typeof avatarVariants> {
  /** Image source. Falls back to initials on load error or when omitted. */
  src?: string
  /** Accessible label + fallback source for initials when `name` is absent. */
  alt?: string
  /** Person/entity display name — the fallback initial is the first letter of this. */
  name?: string
  /** Presence indicator rendered as a corner dot. Omit for no dot. */
  status?: 'online' | 'offline' | 'busy'
  /**
   * Explicit semantic fallback color, replacing the deterministic per-name
   * hash palette — for a role/severity-coded avatar (e.g. "Supervisor" always
   * red, "Reported By" always green) rather than a stable-but-arbitrary hue
   * per person. Omit for the default hash-based palette.
   */
  tone?: AvatarTone
}

/**
 * Avatar — see module doc above.
 */
export const Avatar = forwardRef<ElementRef<typeof AvatarPrimitive.Root>, AvatarProps>(
  ({ className, size, src, alt, name, status, tone, ...props }, ref) => {
    const label = name ?? alt
    const initials = label ? initialsFrom(label) : ''
    const paletteClass = label ? hashToPaletteClass(label) : undefined
    return (
      <AvatarPrimitive.Root
        ref={ref}
        data-slot="avatar"
        className={cn(avatarVariants({ size }), className)}
        {...props}
      >
        {src ? (
          <AvatarPrimitive.Image
            src={src}
            alt={alt ?? name ?? ''}
            className="aspect-square size-full object-cover"
          />
        ) : null}
        <AvatarPrimitive.Fallback
          className={cn(
            'flex size-full items-center justify-center rounded-full font-medium',
            tone ? TONE_FALLBACK_CLASSES[tone] : paletteClass ?? 'bg-muted text-muted-foreground',
          )}
        >
          {initials || null}
        </AvatarPrimitive.Fallback>
        {status ? (
          <span
            data-slot="avatar-status"
            aria-hidden="true"
            className={cn(statusDotVariants({ size, status }))}
          />
        ) : null}
      </AvatarPrimitive.Root>
    )
  },
)

Avatar.displayName = 'Avatar'

export { avatarVariants }
