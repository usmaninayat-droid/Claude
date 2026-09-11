import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { Tooltip } from 'radix-ui'
import { cn } from '../lib/cn'

/**
 * HIT-AREA RING — a 44×44 box around the rail's 28×28 painted chip (see the
 * identical constant in `SideNav`). The glyph size is a design constant; the
 * TARGET must clear 44×44 (verdict V11). Growing the box and dropping the
 * container's `gap` keeps the item pitch byte-identical.
 */
const HIT_AREA = 'flex size-11 shrink-0 items-center justify-center'

/**
 * Compact inner-rail width — 67px, so the shell's two rails together measure
 * the Figma's 118px next to `SideNav`'s 51px outer rail (live-monitoring SPEC
 * v2 §2.1; ⚠ was 60px, round-1 visual finding #39).
 *
 * Applied inline rather than as an arbitrary `w-[…]` class for the same reason
 * `SideNav` does: a consuming app's Tailwind build may not emit an arbitrary
 * class it only ever sees inside `@fams/ui-kit/dist`.
 */
/**
 * Default COMPACT-mode rail width in px (live-monitoring SPEC v2 §2.1 — ⚠ was
 * 60). Exported for the same reason as `SIDENAV_RAIL_WIDTH`: it is load-bearing
 * layout, and it is `ModuleRailProps.width`'s documented default.
 */
export const MODULE_RAIL_COMPACT_WIDTH = 67
const COMPACT_WIDTH = MODULE_RAIL_COMPACT_WIDTH

/**
 * A single entry in the inner module menu. `icon` is optional (compact mode
 * renders icon-only with the label as a tooltip; expanded mode shows the label
 * text). `to` is an opaque href/route segment — rendering is delegated via
 * `renderItem` so the layout package never hard-depends on a router.
 */
export interface ModuleRailItem {
  label: string
  icon?: ReactNode
  to: string
  active?: boolean
  /** Optional trailing count badge (expanded mode only). */
  badge?: number | string
}

/** A labeled group of items for `ModuleRail`'s expanded-mode `sections` prop. */
export interface ModuleRailSection {
  /** Section header (e.g. "Platform Settings"). Omit for an unlabelled group. */
  label?: ReactNode
  /** Items belonging to this section, top to bottom. */
  items: ModuleRailItem[]
}

export interface ModuleRailProps
  extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /**
   * Module title shown at the top of the inner rail (e.g. "Live Monitoring").
   * Rendered only when the rail is expanded (`compact = false`). Named `title`
   * so it reads naturally; we omit the DOM `title` attribute from the base type
   * to allow rich (ReactNode) content.
   */
  title?: ReactNode
  /** Sub-navigation entries for the active module, top to bottom. */
  items?: ModuleRailItem[]
  /**
   * Optional grouped sections for **expanded** mode (`compact={false}`,
   * `stacked={false}`) — lets `ModuleRail` also serve the Settings-nav case
   * (a "Platform Settings" / "My Settings" grouped list, each with its own
   * header). When provided and non-empty, takes precedence over the flat
   * `items` list in expanded mode. `compact` and `stacked` modes have no room
   * for a header and always render the flat `items` list.
   */
  sections?: ModuleRailSection[]
  /**
   * When true (default), the rail is a slim icon-only column (labels as
   * tooltips). When false, it widens and shows the module title + item labels.
   */
  compact?: boolean
  /**
   * When true, the rail shows each item as an **icon stacked above a small
   * label** (~72px column) — the authentic v5 secondary-rail `nav-item` look.
   * Takes precedence over `compact`. Active item is highlighted with the tenant
   * `primary` color + a subtle tinted background.
   */
  stacked?: boolean
  /** Footer slot pinned to the bottom of the rail. */
  footer?: ReactNode
  /**
   * Render bridge for each item — lets the consumer wrap the visual content in a
   * router `<Link>`. Receives the styled inner node + the item. Defaults to an
   * anchor pointing at `item.to`.
   */
  renderItem?: (item: ModuleRailItem, inner: ReactNode) => ReactNode
  /**
   * COMPACT-mode rail width. A number is px, a string any CSS length; both are
   * applied INLINE, because a consuming app's Tailwind build scans
   * `@fams/ui-kit/dist` and an arbitrary `w-[…]` that fails to be emitted
   * there collapses the rail to its content width.
   *
   * Defaults to `MODULE_RAIL_COMPACT_WIDTH` (67). Pass `null` for no inline
   * width, handing control back to a width class on `className` — the inline
   * default would otherwise silently beat it (Phase 7 code review, finding 6).
   * Ignored in expanded/stacked mode, which keeps its `w-56` token step.
   */
  width?: number | string | null
}

/**
 * ModuleRail — the FAMS inner (secondary) navigation rail.
 *
 * Sits immediately after the outer app/module icon rail (`SideNav`) inside the
 * `AppShell`, forming the two-bar navigation the real v5 shell uses: an outer
 * tenant-colored app rail + this inner per-module menu. White surface
 * (`bg-card`) with a logical `end`-edge hairline separating it from the content.
 *
 * - **Compact (default):** slim icon-only column. Active item = `bg-primary`
 *   with a white icon; inactive = transparent + `text-muted-foreground`, hover
 *   lifts to `bg-muted`. Item labels surface as Radix tooltips.
 * - **Expanded:** wider column showing the module `title` header and each item's
 *   label (with optional trailing badge). Pass `sections` instead of `items` to
 *   render grouped, labeled lists (the Settings-nav case) — each section is its
 *   own header + item list; `compact`/`stacked` ignore `sections`.
 *
 * RTL-safe: no physical-direction utilities — the border sits on the logical
 * `end` edge via `border-e`, so it flips correctly in RTL.
 */
export const ModuleRail = forwardRef<HTMLElement, ModuleRailProps>(
  (
    {
      title,
      items = [],
      sections,
      compact = true,
      stacked = false,
      footer,
      renderItem,
      className,
      width = COMPACT_WIDTH,
      ...props
    },
    ref,
  ) => {
    const wrap =
      renderItem ??
      ((item: ModuleRailItem, inner: ReactNode) => (
        <a href={item.to} aria-label={item.label} className="block">
          {inner}
        </a>
      ))

    // Stacked mode renders icon-over-label tiles and never shows tooltips.
    if (stacked) {
      return (
        <nav
          ref={ref}
          aria-label="Module"
          data-module-rail=""
          className={cn(
            'flex h-full w-[72px] shrink-0 flex-col items-center gap-1 overflow-y-auto border-e border-border bg-card py-3',
            className,
          )}
          {...props}
        >
          {items.map((item) => {
            const inner = (
              <span
                data-active={item.active || undefined}
                className={cn(
                  'flex w-14 flex-col items-center gap-1 rounded-md px-1 py-2 outline-none transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-ring',
                  item.active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-card-foreground',
                )}
              >
                {item.icon ? (
                  <span
                    aria-hidden
                    className="flex size-5 shrink-0 items-center justify-center"
                  >
                    {item.icon}
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className="flex size-5 items-center justify-center text-xs font-semibold"
                  >
                    {item.label.charAt(0)}
                  </span>
                )}
                <span
                  className={cn(
                    'w-full truncate text-center text-[11px] leading-tight',
                    item.active ? 'font-semibold' : 'font-medium',
                  )}
                >
                  {item.label}
                </span>
              </span>
            )

            return (
              // label, not `to` — `to` is caller-supplied and commonly a
              // placeholder ("#") or shared route across items.
              <div key={item.label} className="w-full px-1" aria-current={item.active ? 'page' : undefined}>
                {wrap(item, inner)}
              </div>
            )
          })}
          {footer ? (
            <div className="mt-auto flex w-full flex-col items-center gap-2 border-t border-border pt-2">
              {footer}
            </div>
          ) : null}
        </nav>
      )
    }

    return (
      <Tooltip.Provider delayDuration={150}>
        <nav
          ref={ref}
          aria-label="Module"
          data-module-rail=""
          // Inline width is a DEFAULT, not a diktat: `width={null}` drops it so
          // a consumer's own width class on `className` governs (Phase 7 code
          // review, finding 6). Expanded mode keeps its `w-56` token step.
          style={compact && width !== null ? { width } : undefined}
          className={cn(
            'flex h-full shrink-0 flex-col border-e border-border bg-card',
            // Compact width is INLINE (`COMPACT_WIDTH`); the expanded rail
            // keeps its token step.
            compact ? undefined : 'w-56',
            className,
          )}
          {...props}
        >
          {!compact && title ? (
            <div className="flex h-16 shrink-0 items-center border-b border-border px-4 text-sm font-semibold text-card-foreground">
              {title}
            </div>
          ) : null}

          {(() => {
            const renderModuleItem = (item: ModuleRailItem) => {
              const inner = compact ? (
                <span className={HIT_AREA}>
                <span
                  data-active={item.active || undefined}
                  className={cn(
                    // 28×28px icon button, 4px radius (nav-a SPEC.md §2 —
                    // spacing.7 / radius.md).
                    'flex size-7 items-center justify-center rounded-sm outline-none transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-ring',
                    item.active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-card-foreground',
                  )}
                >
                  {item.icon ? (
                    <span
                      aria-hidden
                      className="flex size-4 shrink-0 items-center justify-center"
                    >
                      {item.icon}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold" aria-hidden>
                      {item.label.charAt(0)}
                    </span>
                  )}
                  <span className="sr-only">{item.label}</span>
                </span>
                </span>
              ) : (
                <span
                  data-active={item.active || undefined}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm outline-none transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-ring',
                    item.active
                      ? 'bg-primary font-medium text-primary-foreground'
                      : 'text-card-foreground hover:bg-muted',
                  )}
                >
                  {item.icon ? (
                    <span
                      aria-hidden
                      className="flex size-4 shrink-0 items-center justify-center"
                    >
                      {item.icon}
                    </span>
                  ) : (
                    <span aria-hidden className="w-4 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge != null ? (
                    <span
                      className={cn(
                        'ms-auto rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                        item.active
                          ? // fix7 (P1-3, same root cause as NavRailUserRow's
                            // avatar disc): `bg-white/20` over this row's own
                            // `bg-primary` composited to #338ede, 3.45:1 for
                            // the white badge text. Solid `bg-white`/
                            // `text-primary` reads 4.80:1 and stays correct
                            // regardless of what the row sits on.
                            'bg-white text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </span>
              )

              const li = (
                <li aria-current={item.active ? 'page' : undefined}>
                  {wrap(item, inner)}
                </li>
              )

              // In compact mode, the label lives in a tooltip.
              // label, not `to` — `to` is caller-supplied and commonly a
              // placeholder ("#") or shared route across items.
              return compact ? (
                <Tooltip.Root key={item.label}>
                  <Tooltip.Trigger asChild>{li}</Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="right"
                      sideOffset={8}
                      className="z-50 rounded-sm bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
                    >
                      {item.label}
                      <Tooltip.Arrow className="fill-popover" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              ) : (
                <div key={item.label}>{li}</div>
              )
            }

            // Grouped sections only apply in expanded mode — compact has no
            // room for a header, so it always falls back to the flat list.
            if (!compact && sections && sections.length > 0) {
              return (
                <div
                  data-slot="module-rail-sections"
                  className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 py-4"
                >
                  {sections.map((section, sectionIndex) => (
                    <div
                      key={section.label ? String(section.label) : `section-${sectionIndex}`}
                      className="flex flex-col gap-2"
                    >
                      {section.label ? (
                        <div className="px-2.5 text-caption font-semibold text-muted-foreground">
                          {section.label}
                        </div>
                      ) : null}
                      <ul className="flex flex-col items-stretch gap-2">
                        {section.items.map((item) => renderModuleItem(item))}
                      </ul>
                    </div>
                  ))}
                </div>
              )
            }

            return (
              <ul
                className={cn(
                  'flex min-h-0 flex-1 flex-col overflow-y-auto py-4',
                  // 16px vertical gap between icon buttons in compact mode
                  // (nav-a SPEC.md §2 — 28px button + 16px gap = 44px row
                  // pitch); expanded mode keeps the tighter list-item gap.
                  // compact: no `gap` — each item owns a 44px hit-area box
                  // (HIT_AREA), so the pitch matches the old 28px + gap-4.
                  compact ? 'items-center' : 'items-stretch gap-2 px-2',
                )}
              >
                {items.map((item) => renderModuleItem(item))}
              </ul>
            )
          })()}

          {footer ? (
            <div className="mt-auto border-t border-border p-2">{footer}</div>
          ) : null}
        </nav>
      </Tooltip.Provider>
    )
  },
)

ModuleRail.displayName = 'ModuleRail'
