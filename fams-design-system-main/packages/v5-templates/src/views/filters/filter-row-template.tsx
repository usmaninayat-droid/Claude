import type { FilterExpandRowTemplate, FilterFacet, FilterRowBadgeTone, FilterRowTemplate } from '@fams/v5-composer'
import { Avatar, Badge } from '@fams/ui-kit'
import { cn } from '../../lib/cn'

/**
 * filter-row-template — R-38/DN-30's RICH entity row. [v5-templates]
 *
 * DN-30: *"Display both the driver's name and driver ID in the dropdown to
 * distinguish between drivers with the same name."* The Figma frames
 * (`expand-filter-use-case/compact-dropdown-multi.png`,
 * `expanded-multi-select-47.png`) draw that as
 * `☐ · 32px avatar · name over a # ID pill · right-aligned status badge`, and
 * draw it IDENTICALLY in the compact dropdown and in the side sheet's first
 * table cell. This module is that one renderer, used by both, so the two can
 * never drift.
 *
 * GENERIC BY CONSTRUCTION (J.87): which columns feed which element is
 * METADATA (`expandView.rowTemplate`), and every element is OPTIONAL —
 * a template column the host cannot resolve is omitted rather than rendered
 * empty, so one template may be authored across entities that expose
 * different columns (the pipelines Assignee facet resolves a name and an id
 * but no status; the workforce Person facet resolves all three).
 */

/**
 * The conventional person template `'avatar-id-status'` is shorthand for.
 * These three keys are exactly what the entity-facet adapter already
 * guarantees for a reference facet (`title` = the resolved display name,
 * `id` = the stored value) plus the one column every module in this platform
 * carries (`status`); an entity that has no `status` simply drops the badge.
 */
const CONVENTIONAL: FilterRowTemplate = {
  avatar: 'title',
  title: 'title',
  idPill: 'id',
  statusBadge: { col: 'status' },
}

/** Semantic tone → the `Badge` variant that paints it. */
const TONE_VARIANT: Record<FilterRowBadgeTone, 'success' | 'warning' | 'info' | 'destructive' | 'muted'> = {
  success: 'success',
  warning: 'warning',
  info: 'info',
  destructive: 'destructive',
  muted: 'muted',
}

/** `undefined` ⇒ draw plain cells, exactly as before this module existed. */
export function resolveRowTemplate(facet: FilterFacet): FilterRowTemplate | undefined {
  const authored: FilterExpandRowTemplate | undefined = facet.expandView?.rowTemplate
  if (!authored || authored === 'plain') return undefined
  if (authored === 'avatar-id-status') return CONVENTIONAL
  return authored
}

/** Scalar text of one key, or `''` — the same "no shape assumed" rule as `cellText`. */
export type CellReader = (col: string) => string

export interface FilterEntityRowProps {
  template: FilterRowTemplate
  /** Reads one column of the row (sheet) or of `FilterOption.meta` (dropdown). */
  read: CellReader
  /** Fallback title when `template.title`'s column resolves to nothing (the option's own label). */
  fallbackTitle?: string
  /** Compact dropdown rows draw a smaller avatar than the sheet's 32px. */
  size?: 'sm' | 'md'
  /**
   * The sheet's table draws the status badge in its OWN `statusBadge.col`
   * COLUMN (Figma frame 47: `DRIVER` cell = avatar+name+id, `STATUS` cell =
   * the badge), so the identity block there suppresses it. The compact
   * dropdown has no columns, so it keeps the badge inline.
   */
  omitStatus?: boolean
  className?: string
}

/**
 * The row's identity block. Renders ONLY the elements whose columns resolve:
 * an unresolvable avatar/id/status is absent, never a blank circle or an
 * empty pill (the graceful-omission rule above).
 */
export function FilterEntityRow({
  template,
  read,
  fallbackTitle,
  size = 'md',
  omitStatus = false,
  className,
}: FilterEntityRowProps) {
  const title = read(template.title) || fallbackTitle || ''
  const avatarName = (template.avatar ? read(template.avatar) : '') || title
  const subtitle = template.subtitle ? read(template.subtitle) : ''
  const idText = template.idPill ? read(template.idPill) : ''
  const badgeCol = omitStatus ? undefined : template.statusBadge?.col
  const badgeText = badgeCol ? read(badgeCol) : ''

  return (
    <span data-slot="filter-entity-row" className={cn('flex min-w-0 flex-1 items-center gap-2.5', className)}>
      {avatarName ? (
        <Avatar
          data-slot="filter-entity-avatar"
          name={avatarName}
          size={size === 'sm' ? 'xs' : 'sm'}
          aria-hidden="true"
        />
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span data-slot="filter-entity-title" className="truncate text-sm text-foreground" title={title}>
          {title}
        </span>
        {subtitle ? (
          <span data-slot="filter-entity-subtitle" className="truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
        {idText ? (
          // The Figma pill is a mono `#`-prefixed chip (R-38); `#` is drawn as
          // furniture, so an id that already carries one is not doubled.
          <span
            data-slot="filter-entity-id"
            className="w-fit max-w-full truncate rounded-xs bg-muted px-1.5 font-mono text-caption text-muted-foreground"
          >
            {idText.startsWith('#') ? idText : `# ${idText}`}
          </span>
        ) : null}
      </span>
      {badgeText ? <FilterRowBadge template={template} value={badgeText} /> : null}
    </span>
  )
}

export interface FilterRowBadgeProps {
  template: FilterRowTemplate
  /** The raw status value. Empty ⇒ nothing is rendered (graceful omission). */
  value: string
}

/**
 * The row's status chip, standalone so the sheet's table can draw it in the
 * `statusBadge.col` COLUMN while the identity block stays in the first cell.
 */
export function FilterRowBadge({ template, value }: FilterRowBadgeProps) {
  if (!value) return null
  const tone = template.statusBadge?.colors?.[value]
  return (
    <Badge
      data-slot="filter-entity-status"
      // No authored tone ⇒ a NEUTRAL chip. Figma draws a green "Available"
      // pill, but green is a claim about what the value MEANS: only the
      // blueprint's own `statusBadge.colors` map can make it (J.87).
      variant={tone ? TONE_VARIANT[tone] : 'muted'}
      solid={tone ? tone !== 'muted' : false}
      size="sm"
      className="shrink-0 capitalize"
    >
      {value}
    </Badge>
  )
}
