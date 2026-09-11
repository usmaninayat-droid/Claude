import { useId, useMemo, type CSSProperties } from 'react'
import { X } from '../icons'
import { cn } from '../lib/cn'
import { Tooltip, TooltipTrigger, TooltipContent } from '../primitives/Tooltip'

/**
 * A tag as the caller resolved it — id + label + (optional) the tag's own
 * color and category. `color` is caller DATA (a user picked it at runtime
 * via their own color picker), not a design decision — that's why it flows
 * through as an inline value here rather than a token, the same way a chart
 * legitimately renders data-driven series colors.
 */
export interface TagOption {
  value: string
  label: string
  color?: string
  /** Category key. Tags sharing a group can be mutually exclusive — see TagPicker's `exclusiveGroups`. */
  group?: string
}

export interface TagChipListProps {
  /** Always caller-resolved — ids the caller already turned into label/color via its own tag store. */
  tags: TagOption[]
  /** `soft` = muted pill + color dot. `solid` = filled with the tag's own color. Default `soft`. */
  variant?: 'soft' | 'solid'
  size?: 'sm' | 'md'
  /** Cap visible chips; the rest collapse into a "+N" chip with a tooltip. Omit to show all. */
  max?: number
  /** Presence renders a remove button per chip (the given-array tag-editor case). */
  onRemove?: (value: string) => void
  className?: string
}

const SIZE_CLASS: Record<NonNullable<TagChipListProps['size']>, string> = {
  sm: 'h-5 px-2 text-[11px]',
  md: 'h-6 px-2.5 text-xs',
}

function Chip({
  tag,
  variant,
  size,
  onRemove,
}: {
  tag: TagOption
  variant: 'soft' | 'solid'
  size: NonNullable<TagChipListProps['size']>
  onRemove?: (value: string) => void
}) {
  const style: CSSProperties | undefined =
    variant === 'solid' && tag.color
      ? { backgroundColor: tag.color, color: 'var(--color-primary-foreground)' }
      : undefined
  return (
    <span
      data-slot="tag-chip"
      style={style}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        SIZE_CLASS[size],
        variant === 'soft' && 'bg-muted text-foreground',
        variant === 'solid' && !tag.color && 'bg-primary text-primary-foreground',
      )}
    >
      {variant === 'soft' && tag.color ? (
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
      ) : null}
      <span className="truncate">{tag.label}</span>
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${tag.label}`}
          onClick={(e) => {
            e.stopPropagation()
            onRemove(tag.value)
          }}
          className="grid place-items-center rounded-full opacity-70 outline-none hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  )
}

/**
 * TagChipList — read-only tag display, given already-resolved tags. Retires
 * the v5 codebase's `TagChips` (68 call sites, the single highest-count
 * component in the whole tag family) — this presenter never reads a tag
 * store itself; resolving ids → {label,color} is the caller's hook.
 */
export function TagChipList({ tags, variant = 'soft', size = 'sm', max, onRemove, className }: TagChipListProps) {
  const tooltipId = useId()
  const visible = useMemo(() => (typeof max === 'number' ? tags.slice(0, max) : tags), [tags, max])
  const overflow = typeof max === 'number' ? tags.slice(max) : []

  return (
    <div data-slot="tag-chip-list" className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {visible.map((tag) => (
        <Chip key={tag.value} tag={tag} variant={variant} size={size} onRemove={onRemove} />
      ))}
      {overflow.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              data-slot="tag-chip-overflow"
              aria-describedby={tooltipId}
              className={cn('inline-flex cursor-default items-center rounded-full bg-muted font-medium text-muted-foreground', SIZE_CLASS[size])}
            >
              +{overflow.length}
            </span>
          </TooltipTrigger>
          <TooltipContent id={tooltipId}>{overflow.map((t) => t.label).join(', ')}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
}
