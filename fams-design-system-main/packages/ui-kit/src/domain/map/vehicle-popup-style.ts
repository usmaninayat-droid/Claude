import type { CSSProperties } from 'react'
import type { VehicleStatusTone } from './VehiclePopupCard'

/**
 * Component-scoped geometry + type constants for `VehiclePopupCard` and its
 * parts (Figma 495:4143, 2026-08-24 parity run).
 *
 * Card type note: Figma's 10px/13px/20px card type sits off the token type
 * scale (smallest token = 12px caption), and the card's pixel geometry has no
 * spacing-token equivalent — both live here as component-scoped constants fed
 * to inline styles (never `[Npx]` utility classes), the same carve-out
 * `ClusterBadge` documents for its tier geometry. Colors are 100% tokens.
 */

/*
 * Card type scale — Figma board 16:22894 (2026-08-30 popup parity run).
 *
 * The refreshed popup states re-typed the card: the title is 24px, the header
 * meta row and status line 14px, and the body cells 12px label over a 16px
 * value. That supersedes the 10/13/20px scale the 2026-08-24 node carried
 * (and the +1 step that run added to compensate for the fallback face's
 * narrower runs — the new sizes are large enough that the compensation is no
 * longer needed; the runs are pinned by the visual gate instead).
 */
export const LABEL_TEXT: CSSProperties = { fontSize: '0.75rem', lineHeight: '1rem' }
export const VALUE_TEXT: CSSProperties = { fontSize: '1rem', lineHeight: '1.25rem' }
export const TITLE_TEXT: CSSProperties = { fontSize: '1.5rem', lineHeight: '1.8125rem' }
/** Status word + "since …" — 14px on the new board. */
export const STATUS_TEXT: CSSProperties = { fontSize: '0.875rem', lineHeight: '1.0625rem' }
/** Header meta row (plate · address) — 14px semibold grey-400. */
export const META_TEXT: CSSProperties = { fontSize: '0.875rem', lineHeight: '1.0625rem' }

/** Address meta ellipsis cap (Figma 16:21402 is 255px wide). */
export const LOCATION_MAX: CSSProperties = { maxWidth: 255, ...META_TEXT }

/**
 * The TITLE's own width cap (round-4 visual #17).
 *
 * Title (y27–56) and the actions group (y24–40) share a band, so the title
 * must stop before the actions; the META row (y56–70) and the status line
 * (y79) sit below them and Figma lets both run the full content width. While
 * the actions were an in-flow flex sibling they took their 72px + gap off
 * EVERY line of that column, which capped the meta run at 355px where the
 * reference measures 402 and stopped `LOCATION_MAX` from ever reaching its
 * 222px. The actions are absolutely positioned now and this is the cap the
 * title keeps: content start x96 → the actions' start edge x478, less the
 * 12px gutter.
 */
export const TITLE_MAX = 370

/**
 * Card + header box geometry, as INLINE numbers rather than `h-[28rem]` /
 * `h-[6.875rem]` utility classes.
 *
 * Same reasoning as `BADGE_INSET` below: a consuming app's Tailwind build
 * scans `@fams/ui-kit/dist` for class names, and an arbitrary-value class that
 * fails to be emitted there silently falls back to "auto" — which is exactly
 * the failure mode round 1 measured on the card box (464 tall instead of 448,
 * header content 17px low). Inline geometry needs no class generation at all.
 */
export const CARD_HEIGHT = 448
export const HEADER_BLOCK_HEIGHT = 110
/** 68×70 status-tinted header tile at card-local (16,24) — SPEC P0-2. */
export const TILE_SIZE: CSSProperties = { width: 68, height: 70 }
/**
 * Card box: radius 12, NO border (Figma card is shadow-only), and a height
 * CEILING rather than a fixed height (QA A14).
 *
 * It used to be `height: CARD_HEIGHT`, so every tab painted a 448px box
 * whether or not it had 448px of content. The Workforce tab — the shortest of
 * the five variants on Figma 16:22894, and the only one Figma draws hugging
 * its tab strip — therefore ended ~90px above the tabs with a band of empty
 * card between them, which read as a rendering fault rather than a short tab.
 *
 * As a MAXIMUM, a tab that has 448px of content (Overview, Critical Events)
 * still fills the box exactly as before and scrolls internally past it, while
 * a short tab hugs its content the way the reference does. The cost is that a
 * tab swap can now change the card's height — which is the trade the design
 * review asked for, and it supersedes the earlier "fixed height so tab swaps
 * never resize the card" note (UX D28/D31).
 */
export const CARD_BOX: CSSProperties = { maxHeight: CARD_HEIGHT }
/** Header box: fixed 110px, 16px inline padding, 24px block-start padding. */
export const HEADER_BOX: CSSProperties = {
  height: HEADER_BLOCK_HEIGHT,
  paddingInline: 16,
  paddingBlockStart: 24,
}

/**
 * The three header actions (round-4 visual #16).
 *
 * SPEC P0-2 places the ICON BOXES at card-local (478,24) on a 24px pitch, so
 * the last one's end edge lands on the card's own 16px padding (478 + 3x24 -
 * 8 = 542 = 558 - 16). Each icon sits inside a 24px hit area (UX-7), which
 * adds 4px of padding on every side — so a group whose BUTTON boxes obey the
 * padding puts its ICONS 4px inside it on both axes. That is exactly the
 * 3px-start / 5px-low offset round 4 measured: app ink (475,29) against the
 * reference's (478,24).
 *
 * Positioning is absolute (and inset by padding − 4 on both axes) rather than
 * in-flow for a second reason: as a flex sibling the group also stole its
 * width from the title/meta/status column on EVERY line, which is round-4
 * visual #17. Logical insets, so RTL mirrors the group for free.
 */
export const HEADER_ACTIONS_BOX: CSSProperties = { insetBlockStart: 20, insetInlineEnd: 12 }

/**
 * Body grid columns. The 2026-08-30 board (16:20661) lays the Overview body
 * out as three EQUAL `flex-[1_0_0]` columns with a 16px gutter — the earlier
 * unequal 203/195/128 template is gone.
 */
export const BODY_COLUMNS = 'grid-cols-3'

/**
 * The 16×16 status badge overlaps the tile's bottom-END corner (Figma 495:4207
 * at 71,78 against a tile corner of 84,92 → 4px past both edges).
 *
 * Inline logical insets rather than `-bottom-1 -end-1`: NEGATIVE logical inset
 * utilities are not reliably emitted by every consumer's Tailwind build (a
 * consumer scanning `@fams/ui-kit/dist` can end up with `-bottom-1` but no
 * `-end-1`, which drops the badge to its static position — bottom-START — and
 * that shipped as a live parity bug on 2026-08-24). Inline logical properties
 * need no class generation and still mirror under RTL.
 */
export const BADGE_INSET: CSSProperties = { insetInlineEnd: -4, insetBlockEnd: -4 }

/**
 * @deprecated Superseded by the inline `HEADER_BOX` geometry above (round-1
 * visual finding #29 — arbitrary-value height classes are not reliably emitted
 * by a consuming app's Tailwind build). Kept as a no-op-safe constant so any
 * out-of-tree import keeps type-checking.
 */
export const HEADER_HEIGHT = ''

/**
 * Bottom pointer (Figma Polygon 1): a 20×20 down-pointing triangle whose top
 * 6px sit behind the card, leaving the 14px that make the anchor wrapper
 * 558×462. Drawn with a clip-path so the silhouette is the real triangle.
 */
export const POINTER_STYLE: CSSProperties = {
  width: 20,
  height: 20,
  marginTop: -6,
  clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
}

/* `muted` = Non-Reporting. SPEC §1 puts it on grey-**400** (`#98A2B3`), not
   grey-500 / `muted-foreground` (`#667085`) — round-1 visual finding #33. The
   same swap is applied to `VehicleMarker`'s ring/leader, `VehicleIcon3D`'s
   list-row status dot and `ClusterBadge`'s base ring, so every surface that
   renders a non-reporting vehicle follows one mapping. */
export const TONE_TEXT: Record<VehicleStatusTone, string> = {
  success: 'text-success',
  // Idling reads warning-600 (#DC6803) everywhere but the cluster ring (SPEC §1).
  warning: 'text-warning-scale-600',
  error: 'text-destructive',
  muted: 'text-gray-400',
}

export const TONE_BADGE_BG: Record<VehicleStatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning-scale-600',
  error: 'bg-destructive',
  muted: 'bg-gray-400',
}

/** 68×68 tile tint — the status-100 scale (pixel-verified #FEE4E2 = error-100). */
export const TONE_TILE_BG: Record<VehicleStatusTone, string> = {
  success: 'bg-success-scale-100',
  warning: 'bg-warning-scale-100',
  error: 'bg-error-100',
  muted: 'bg-gray-100',
}
