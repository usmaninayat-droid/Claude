import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { Bell, type LucideIcon } from '../icons'
import { cn } from '../lib/cn'
import { IconBadge, type IconBadgeTone } from '../primitives/IconBadge'

/**
 * InfoBanner — icon + title banner with a trailing, divider-separated
 * metadata block. [L3 composite]
 *
 * Sibling to `Alert` (same "inline strip surfaced at the top of a section"
 * role) but a different slot shape: `Alert` is severity-toned with a
 * description/actions stack, while `InfoBanner` is a flat, single-tone card
 * whose right side carries short label metadata (an id, a date/time, …)
 * separated by thin vertical dividers — e.g. a module's "Upcoming Plan"
 * strip: bell icon + "Upcoming Plan" on the start side, `# 231454` and
 * `22 Jul, 2025 12:00pm` on the end side. Generic and module-agnostic: `meta`
 * is just an ordered list of pre-formatted labels, never a domain shape —
 * the caller (or a metadata-driven widget) decides what belongs in it.
 *
 * @usage-index info-banner
 */
export interface InfoBannerMetaItem {
  /** Stable key; falls back to the item's index. */
  id?: string
  /** Pre-formatted display value (e.g. `"# 231454"`, `"22 Jul, 2025 12:00pm"`) — rendered as-is, never parsed/formatted here (Rule 8). */
  label: ReactNode
  /** Optional leading glyph for this one item (figma-spec-profile.md's calendar-glyph before a datetime meta value). Omit for a plain label, same as before this prop existed. */
  icon?: LucideIcon
}

/**
 * `'default'` — the original bordered strip with a trailing meta block.
 * `'insight'` — widget-board #7's "Log List" shape: a tinted pill row with a
 * leading accent glyph (no icon disc, no border), the whole row clickable by
 * the caller. `'accent'` — the same board's "Entity Sidebar" shape: a neutral
 * row with a leading accent bar and trailing content (an `IdChip` + a
 * timestamp). Additive — `'default'` is unchanged.
 */
export type InfoBannerVariant = 'default' | 'insight' | 'accent'

/** Accent hue of the `'insight'` tint / the `'accent'` bar. */
export type InfoBannerTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

const TONE_TINT_CLASSES: Record<InfoBannerTone, string> = {
  info: 'bg-primary/10 text-foreground',
  success: 'bg-success/10 text-foreground',
  warning: 'bg-warning/10 text-foreground',
  danger: 'bg-destructive/10 text-foreground',
  neutral: 'bg-muted text-foreground',
}

const TONE_ACCENT_CLASSES: Record<InfoBannerTone, string> = {
  info: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  neutral: 'bg-muted-foreground',
}

const TONE_GLYPH_CLASSES: Record<InfoBannerTone, string> = {
  info: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  neutral: 'text-muted-foreground',
}

export interface InfoBannerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Leading icon, rendered inside an `IconBadge`. Defaults to a bell glyph. */
  icon?: LucideIcon
  /** Tint passed straight through to the `IconBadge`. Default `'success'`. */
  iconTone?: IconBadgeTone
  title: ReactNode
  /** Trailing metadata items, rendered end-aligned with a vertical divider between each pair. Omit for no metadata block. */
  meta?: InfoBannerMetaItem[]
  /** See `InfoBannerVariant`. Default `'default'` — existing call sites are unaffected. */
  variant?: InfoBannerVariant
  /** Accent hue of the `'insight'` tint / the `'accent'` bar. Default `'info'`. Ignored by `'default'`. */
  tone?: InfoBannerTone
  /** Trailing slot rendered after `meta` — e.g. an `IdChip` plus a timestamp. */
  trailing?: ReactNode
}

export const InfoBanner = forwardRef<HTMLDivElement, InfoBannerProps>(
  (
    {
      icon: Icon = Bell,
      iconTone = 'success',
      title,
      meta,
      variant = 'default',
      tone = 'info',
      trailing,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isInsight = variant === 'insight'
    const isAccent = variant === 'accent'
    return (
      <div
        ref={ref}
        data-slot="info-banner"
        data-variant={variant}
        className={cn(
          'flex flex-wrap items-center justify-between gap-inline px-5 py-2',
          variant === 'default' && 'rounded-sm border border-border bg-muted/40',
          isInsight && cn('rounded-full', TONE_TINT_CLASSES[tone]),
          isAccent && 'gap-3 rounded-sm bg-muted/40 ps-0',
          className,
        )}
        {...props}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {isAccent ? (
            <span
              aria-hidden="true"
              data-slot="info-banner-accent"
              className={cn('h-8 w-1 shrink-0 rounded-e-full', TONE_ACCENT_CLASSES[tone])}
            />
          ) : null}
          {isInsight ? (
            <Icon
              aria-hidden="true"
              data-slot="info-banner-glyph"
              className={cn('size-4 shrink-0', TONE_GLYPH_CLASSES[tone])}
            />
          ) : null}
          {variant === 'default' ? <IconBadge icon={Icon} tone={iconTone} size="sm" /> : null}
          <p
            data-slot="info-banner-title"
            className={cn(
              'truncate text-foreground',
              isInsight ? 'text-body-sm font-medium' : 'text-body-md font-semibold',
              isAccent && 'ps-2',
            )}
          >
            {title}
          </p>
        </div>
        {meta?.length ? (
          <div data-slot="info-banner-meta" className="flex shrink-0 items-center gap-3">
            {meta.map((item, index) => (
              <span key={item.id ?? index} className="flex items-center gap-3">
                {index > 0 ? <span aria-hidden="true" className="h-3.5 w-px bg-border" /> : null}
                <span className="inline-flex items-center gap-1 text-caption font-semibold text-muted-foreground">
                  {item.icon ? <item.icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
                  {item.label}
                </span>
              </span>
            ))}
          </div>
        ) : null}
        {trailing ? (
          <div data-slot="info-banner-trailing" className="flex shrink-0 items-center gap-2">
            {trailing}
          </div>
        ) : null}
        {children}
      </div>
    )
  },
)

InfoBanner.displayName = 'InfoBanner'
