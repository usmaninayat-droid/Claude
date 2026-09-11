import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Badge } from '../primitives/Badge'
import { Checkbox } from '../primitives/Checkbox'
import { Switch } from '../primitives/Switch'
import { Avatar } from '../primitives/Avatar'
import { TrendIndicator } from '../primitives/TrendIndicator'
import { RadialProgress } from '../primitives/RadialProgress'
import { Button } from '../primitives/Button'
import { Separator } from '../primitives/Separator'
import { TagChipList } from './TagChipList'
import type { TableCellActivityTone, TableCellVariant } from './TableCell.types'

/**
 * `kind="progress"` grew a caption + empty state + tone, which would have
 * pushed this file past its soft line budget — split into its own file
 * (`TableCellProgress.tsx`) and re-exported here so `TableCell.tsx`'s import
 * list is unchanged.
 */
export { renderProgressCell } from './TableCellProgress'

/**
 * The three product-list row anatomies (`entity` / `icon-value` /
 * `metrics`) live in their own file for the same reason — see
 * `TableCellIdentity.tsx` for why they belong in the core tier at all.
 */
export { renderEntityCell, renderIconValueCell, renderMetricsCell } from './TableCellIdentity'

/**
 * `TableCell`'s per-`kind` renderer implementations — split out from
 * `TableCell.tsx` (same decomposition convention as `DataTable.tsx`'s
 * sibling subcomponents). `TableCell.tsx` keeps the public component +
 * dispatch `switch`; this file holds each kind's actual JSX, one function
 * per kind, taking that kind's already-narrowed variant slice.
 *
 * Pure extraction — zero behavior change. Every function here composes an
 * existing primitive, same as before (see `TableCell.tsx`'s doc comment for
 * the full kind vocabulary + rationale).
 */

type Variant<K extends TableCellVariant['kind']> = Extract<TableCellVariant, { kind: K }>

export const EMPTY_VALUE = <span className="text-muted-foreground">—</span>

/** `activity` dot tone → token background class. No raw hex (Rule 10). */
const ACTIVITY_DOT_CLASSES: Record<TableCellActivityTone, string> = {
  neutral: 'bg-muted-foreground/50',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
}

export function isEmptyValue(value: ReactNode): boolean {
  return value === undefined || value === null || value === ''
}

export function renderTextCell(props: Variant<'text'>): ReactNode {
  return isEmptyValue(props.value) ? EMPTY_VALUE : <span className="text-sm text-foreground">{props.value}</span>
}

export function renderCheckboxCell(props: Variant<'checkbox'>): ReactNode {
  const { checked, onCheckedChange, isDisabled, ariaLabel } = props
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(next) => onCheckedChange?.(next === true)}
      disabled={isDisabled}
      aria-label={ariaLabel ?? 'Select row'}
    />
  )
}

export function renderBadgeCell(props: Variant<'badge'>): ReactNode {
  const { label, variant, size, dot, uppercase, colorIndex } = props
  return (
    <Badge variant={variant} size={size} dot={dot} uppercase={uppercase} colorIndex={colorIndex}>
      {label}
    </Badge>
  )
}

export function renderBadgesCell(props: Variant<'badges'>): ReactNode {
  const { badges, size } = props
  return (
    <div className="flex flex-wrap items-center gap-1">
      {badges.map((badge) => (
        <Badge key={badge.id} variant={badge.variant} size={size} dot={badge.dot} colorIndex={badge.colorIndex}>
          {badge.label}
        </Badge>
      ))}
    </div>
  )
}

export function renderTagsCell(props: Variant<'tags'>): ReactNode {
  const { tags, variant, size, max } = props
  if (tags.length === 0) return EMPTY_VALUE
  return <TagChipList tags={tags} variant={variant} size={size} max={max} />
}

export function renderToggleCell(props: Variant<'toggle'>): ReactNode {
  const { checked, onCheckedChange, isDisabled, ariaLabel } = props
  return (
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={isDisabled}
      aria-label={ariaLabel ?? 'Toggle'}
    />
  )
}

export function renderGaugeCell(props: Variant<'gauge'>): ReactNode {
  const { value, tone, size = 28, hideLabel } = props
  return <RadialProgress value={value} tone={tone} size={size} hideLabel={hideLabel} />
}

export function renderTrendCell(props: Variant<'trend'>): ReactNode {
  const { direction, value, note, size } = props
  return <TrendIndicator direction={direction} value={value} note={note} size={size} />
}

export function renderAvatarCell(props: Variant<'avatar'>): ReactNode {
  const { label, secondary, icon, src, name, size = 'sm', status } = props
  return (
    <div className="flex items-center gap-2">
      {icon ? <span className="flex shrink-0 items-center text-muted-foreground">{icon}</span> : null}
      <Avatar src={src} name={name} size={size} status={status} />
      {secondary ? (
        // figma 4864:9366's `TableCell` "User Info": name + secondary text
        // stacked under it (email, role, code…). `secondary` is additive — a
        // caller that omits it keeps the original single-line cell below,
        // byte-identical.
        <span className="flex min-w-0 flex-col justify-center">
          {label ? <span className="truncate text-sm font-medium text-foreground">{label}</span> : null}
          <span className="truncate text-caption text-muted-foreground">{secondary}</span>
        </span>
      ) : label ? (
        <span className="truncate text-sm text-foreground">{label}</span>
      ) : null}
    </div>
  )
}

export function renderAvatarStackCell(props: Variant<'avatar-stack'>): ReactNode {
  const { avatars, max = 3, size = 'sm' } = props
  const visible = avatars.slice(0, max)
  const overflow = avatars.length - visible.length
  return (
    <div className="flex items-center -space-x-2 rtl:space-x-reverse">
      {visible.map((avatar) => (
        <Avatar key={avatar.id} src={avatar.src} name={avatar.name} size={size} className="ring-2 ring-card" />
      ))}
      {overflow > 0 ? (
        <Badge variant="muted" size="xs" className="ms-1">
          +{overflow}
        </Badge>
      ) : null}
    </div>
  )
}

/**
 * `appearance="outline"` tone → border/text token classes for the circular
 * bordered icon button (figma 4868:2062's paired accept/reject row
 * controls). `neutral` leans on `tertiary`'s own default border/text, so no
 * override is needed there.
 */
const OUTLINE_TONE_CLASSES: Record<'neutral' | 'primary' | 'destructive', string> = {
  neutral: '',
  primary: 'border-primary text-primary hover:bg-primary/10 hover:text-primary',
  destructive: 'border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive',
}

export function renderActionsCell(props: Variant<'actions'>): ReactNode {
  const { actions, appearance = 'ghost' } = props
  return (
    <div className="flex items-center gap-1">
      {actions.map((action) => {
        // Canonical prop wins when given; the `is`-prefixed alias
        // (deprecated) still works for existing callers.
        const isDisabled = action.disabled ?? action.isDisabled
        const isDestructive = action.destructive ?? action.isDestructive
        const tone = action.tone ?? (isDestructive ? 'destructive' : 'neutral')
        return (
          <Button
            key={action.id}
            type="button"
            variant={appearance === 'outline' ? 'tertiary' : 'ghost'}
            size={appearance === 'outline' ? 'iconRound' : 'icon'}
            title={action.label}
            aria-label={action.label}
            disabled={isDisabled}
            onClick={action.onClick}
            className={cn(
              appearance === 'outline'
                ? OUTLINE_TONE_CLASSES[tone]
                : tone === 'destructive' && 'text-destructive hover:text-destructive',
            )}
          >
            {action.icon}
          </Button>
        )
      })}
    </div>
  )
}

export function renderGroupTitleCell(props: Variant<'group-title'>): ReactNode {
  const { label } = props
  return (
    <div className="w-full rounded-xs bg-muted px-2 py-1.5 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
  )
}

export function renderGroupDividerCell(): ReactNode {
  return <Separator className="w-full" />
}

export function renderActivityCell(props: Variant<'activity'>): ReactNode {
  const { label, tone = 'neutral', pulse = true } = props
  return (
    <span className="inline-flex items-center gap-1.5 text-body-xs text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn('inline-block size-2 shrink-0 rounded-full', ACTIVITY_DOT_CLASSES[tone], pulse && 'animate-pulse')}
      />
      {label}
    </span>
  )
}

export function renderStartEndTimeCell(props: Variant<'start-end-time'>): ReactNode {
  const { start, end } = props
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-body-xs tabular-nums text-foreground">{isEmptyValue(start) ? EMPTY_VALUE : start}</span>
      <span className="text-body-xs tabular-nums text-muted-foreground">{isEmptyValue(end) ? EMPTY_VALUE : end}</span>
    </div>
  )
}

export function renderTabActionsCell(props: Variant<'tab-actions'>): ReactNode {
  const { tabs } = props
  return (
    <div className="flex items-center gap-3">
      {tabs.map((tab) => {
        // Canonical prop wins when given; `isActive` (deprecated) still
        // works for existing callers.
        const isActive = tab.active ?? tab.isActive
        return (
          <button
            key={tab.id}
            type="button"
            onClick={tab.onClick}
            disabled={tab.isDisabled}
            className={cn(
              'text-body-xs font-medium underline-offset-2 transition-colors hover:underline disabled:pointer-events-none disabled:opacity-50',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
