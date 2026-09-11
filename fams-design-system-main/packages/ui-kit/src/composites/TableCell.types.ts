import type { ReactNode } from 'react'
import type { BadgeColorIndex, BadgeProps, BadgeVariant } from '../primitives/Badge'
import type { AvatarProps } from '../primitives/Avatar'
import type { TrendIndicatorProps } from '../primitives/TrendIndicator'
import type { RadialProgressTone } from '../primitives/RadialProgress'
import type { StatBarTone } from './StatBar'
import type { TagChipListProps, TagOption } from './TagChipList'

/**
 * `TableCell` types — split out from `TableCell.tsx` (same decomposition
 * convention as `DataTable.types.ts` / `DataTable.tsx`). See `TableCell.tsx`
 * for the component's own doc comment (kind vocabulary, rationale).
 */

export type TableCellKind =
  | 'text'
  | 'empty'
  | 'checkbox'
  | 'badge'
  | 'badges'
  | 'tags'
  | 'toggle'
  | 'gauge'
  | 'actions'
  | 'avatar'
  | 'avatar-stack'
  | 'progress'
  | 'trend'
  | 'group-title'
  | 'group-divider'
  | 'activity'
  | 'start-end-time'
  | 'tab-actions'
  | 'entity'
  | 'icon-value'
  | 'metrics'

export type TableCellAlign = 'start' | 'center' | 'end'

/**
 * Closed status-dot tone for `kind="activity"` — token-only, no raw hex or
 * business string enum. Mirrors the `neutral | success | warning | danger |
 * info` vocabulary used elsewhere in the system (e.g. `HealthStripStatus`),
 * kept local here so `TableCell` stays composed of primitives only (no
 * composite-to-composite import).
 */
export type TableCellActivityTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export interface TableCellBadgeItem {
  id: string
  label: ReactNode
  variant?: BadgeVariant
  dot?: boolean
  colorIndex?: BadgeColorIndex
}

export interface TableCellAvatarItem {
  id: string
  src?: string
  name?: string
}

export interface TableCellAction {
  id: string
  /** Icon element, e.g. a `lucide-react` icon — never a built-in "edit/delete" enum (Rule 10). */
  icon: ReactNode
  /** Accessible label — also used as the native `title` tooltip. */
  label: string
  onClick?: () => void
  disabled?: boolean
  /** @deprecated Use `disabled` instead. */
  isDisabled?: boolean
  /**
   * Closed status tone for the icon/border color under `appearance="outline"`
   * (figma 4868:2062's paired accept/reject row controls — a filled-circle
   * destructive action beside a filled-circle primary one). Ignored under the
   * default `appearance="ghost"`, which stays neutral except for `destructive`/
   * `isDestructive` below (back-compat). Default `'neutral'`.
   */
  tone?: 'neutral' | 'primary' | 'destructive'
  /** Renders the icon in the destructive status color. @deprecated Use `tone="destructive"` instead. */
  destructive?: boolean
  /** @deprecated Use `tone="destructive"` instead. */
  isDestructive?: boolean
}

/**
 * One icon+count metric in a `kind="metrics"` strip (a list row's "activity
 * overview" — events, trips, a current reading). `value` is already
 * formatted by the caller; `tone` only ever colours the GLYPH.
 */
export interface TableCellMetric {
  id: string
  /** Icon element, e.g. a `lucide-react` icon. Omit for a bare count. */
  icon?: ReactNode
  /** Pre-formatted count/reading. Empty renders an en-dash. */
  value?: ReactNode
  /**
   * The metric's NAME ("Critical events", "Trips today"). Becomes the native
   * hover tooltip AND the screen-reader prefix — without it the strip is a
   * row of unlabelled numbers to assistive tech.
   */
  label?: string
  /** Closed glyph tone. @default 'neutral' */
  tone?: TableCellActivityTone
}

export interface TableCellTabAction {
  id: string
  label: ReactNode
  /** Renders in the active/primary tone. Plain boolean — never a "current tab id" string enum (Rule 10). */
  active?: boolean
  /** @deprecated Use `active` instead. */
  isActive?: boolean
  onClick?: () => void
  isDisabled?: boolean
}

export type TableCellVariant =
  | { kind: 'text'; value?: ReactNode }
  | { kind: 'empty' }
  | {
      kind: 'checkbox'
      checked: boolean | 'indeterminate'
      onCheckedChange?: (checked: boolean) => void
      isDisabled?: boolean
      ariaLabel?: string
    }
  | {
      kind: 'badge'
      label: ReactNode
      variant?: BadgeVariant
      size?: BadgeProps['size']
      dot?: boolean
      uppercase?: boolean
      colorIndex?: BadgeColorIndex
    }
  | { kind: 'badges'; badges: TableCellBadgeItem[]; size?: BadgeProps['size'] }
  | {
      kind: 'tags'
      /** Already-resolved tags — id/label/color/group, same shape TagPicker hands back. */
      tags: TagOption[]
      variant?: TagChipListProps['variant']
      size?: TagChipListProps['size']
      /** Cap visible chips; the rest collapse into a "+N" chip with a tooltip (figma 4868:2062's Tags column). */
      max?: number
    }
  | {
      kind: 'toggle'
      checked: boolean
      onCheckedChange?: (checked: boolean) => void
      isDisabled?: boolean
      ariaLabel?: string
    }
  | { kind: 'gauge'; value: number; tone?: RadialProgressTone; size?: number; hideLabel?: boolean }
  | {
      kind: 'actions'
      actions: TableCellAction[]
      /**
       * `'ghost'` (default, unchanged) = borderless icon buttons. `'outline'` =
       * circular bordered icon buttons colored per action `tone` (figma
       * 4868:2062's paired accept/reject row controls).
       */
      appearance?: 'ghost' | 'outline'
    }
  | {
      kind: 'avatar'
      label?: ReactNode
      /**
       * Second line under `label` — email, role, code, etc. (figma 4864:9366's
       * `TableCell` "User Info": name + secondary text). Additive — omit for
       * the original single-line cell.
       */
      secondary?: ReactNode
      /**
       * Small leading glyph before the avatar (figma 4864:9366's `showIcon`).
       * Additive — omit for the original avatar+label-only cell.
       */
      icon?: ReactNode
      src?: string
      name?: string
      size?: AvatarProps['size']
      status?: AvatarProps['status']
    }
  | { kind: 'avatar-stack'; avatars: TableCellAvatarItem[]; max?: number; size?: AvatarProps['size'] }
  | {
      kind: 'progress'
      /**
       * Current reading. Omit (or pass a non-numeric value) for the
       * explicit **empty state** — a measure the record simply doesn't
       * track renders a flat grey track and a dash, never a bar that reads
       * "0% complete" (that would assert something false about the record).
       */
      value?: number
      /**
       * Target the reading is measured against. Given together with `unit`,
       * this renders the `value / target unit` caption (Figma's
       * `"3,800 / 5,000 km"`) below the bar, and the fill percentage is
       * computed as `value / target`. Omitted, `value` is read directly as
       * a 0-100 percentage (original behavior) and no caption renders.
       */
      target?: number
      /** Unit suffix for the caption, e.g. `"km"` / `"days"` / `"hrs"`. Ignored without `target`. */
      unit?: string
      /**
       * Fill tone. The caller's call (rule 8/10) — "which value counts as
       * good" is business logic this cell never owns; three adjacent
       * `progress` cells can carry three different tones (or a
       * caller-computed threshold tone) without this component knowing why.
       * Default `'primary'`.
       */
      tone?: StatBarTone
      size?: 'sm' | 'md'
      showValue?: boolean
    }
  | {
      kind: 'trend'
      direction: TrendIndicatorProps['direction']
      value: TrendIndicatorProps['value']
      note?: string
      size?: TrendIndicatorProps['size']
    }
  | { kind: 'group-title'; label: ReactNode }
  | { kind: 'group-divider' }
  | { kind: 'activity'; label: ReactNode; tone?: TableCellActivityTone; pulse?: boolean }
  | { kind: 'start-end-time'; start?: ReactNode; end?: ReactNode }
  | { kind: 'tab-actions'; tabs: TableCellTabAction[] }
  | {
      /**
       * The identity cell every FAMS list row leads with: a media box, the
       * record's name, and an optional second line. `media` is an OPAQUE
       * slot — a `VehicleIcon3D`, an `Avatar`, a thumbnail `img`, a logo —
       * so this kind never learns what kind of record it is showing (rule
       * 10). Prefer it over `avatar` whenever the media is not the circular
       * `Avatar` primitive; `avatar` stays the shorthand for the person case.
       */
      kind: 'entity'
      media?: ReactNode
      label?: ReactNode
      secondary?: ReactNode
    }
  | {
      /**
       * A value with a small leading glyph — the "location with a map pin",
       * "date with a calendar", "person with an avatar glyph" cell. The
       * glyph is decorative; `iconLabel` is what carries its meaning to a
       * screen reader.
       */
      kind: 'icon-value'
      icon?: ReactNode
      value?: ReactNode
      iconLabel?: string
    }
  | { kind: 'metrics'; metrics: TableCellMetric[] }

export type TableCellProps = TableCellVariant & {
  align?: TableCellAlign
  className?: string
}
