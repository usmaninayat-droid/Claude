import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { Tooltip } from 'radix-ui'
import { LayoutGrid } from '../icons'
import { cn } from '../lib/cn'

/**
 * Rendered when an item is passed with no `icon` (finding B2: nav entries
 * with an unset icon used to render an empty box). A single neutral glyph is
 * a better default than an empty square for any consumer that hasn't wired a
 * real per-module icon set yet — it never claims to represent a specific
 * module, just "unassigned icon".
 */
/**
 * HIT-AREA RING — a 44×44 box around a 28×28 painted chip.
 *
 * The rail's glyph is 28px by design (nav-a SPEC §1/§2) and must stay 28px,
 * but 28×28 is under the 44×44 minimum target (verdict V11), and these are the
 * most-used controls in the product. Growing the BOX rather than the CHIP
 * fixes the target with zero visual delta — and the containers drop their
 * inter-item `gap` to compensate, so the item PITCH is unchanged
 * (28 + 16 gap === 44 + 0 gap).
 */
const HIT_AREA = 'flex size-11 shrink-0 items-center justify-center'

/**
 * Outer app-icon rail width — live-monitoring SPEC v2 §2.1 (⚠ was 44px before
 * the 2026-08-24 run's round-1 visual finding #39). Applied inline; see the
 * note at the render site.
 */
/**
 * Default outer-rail width in px (live-monitoring SPEC v2 §2.1 — ⚠ was 44).
 * Exported because it is load-bearing layout a consumer may need to reserve
 * space for, and because `SideNavProps.width` documents it as its default.
 */
export const SIDENAV_RAIL_WIDTH = 51
const RAIL_WIDTH = SIDENAV_RAIL_WIDTH

const FALLBACK_ICON = <LayoutGrid aria-hidden />

/**
 * A single navigation entry. `icon` is the glyph rendered in the rail (the design
 * system ships no icon set — callers pass their own Lucide / inline SVG). `to` is
 * an opaque href/route segment; rendering is delegated via `renderItem` so the
 * layout package never hard-depends on a router.
 */
export interface SideNavItem {
  label: string
  icon?: ReactNode
  to: string
  active?: boolean
  /**
   * Renders a small corner dot (e.g. unseen inbox items). Purely visual — no
   * count, no polling; the caller decides when it's true. Omit for none.
   */
  notificationDot?: boolean
}

export interface SideNavProps extends HTMLAttributes<HTMLElement> {
  /** Navigation entries, top to bottom. */
  items: SideNavItem[]
  /**
   * Pinned entries rendered ABOVE `items`, framed by hairline dividers on both
   * sides — for a globally-pinned surface that outranks the regular entries
   * (purely positional; this shell attaches no meaning to them). Same item
   * shape as `items`, including `notificationDot`. Omit for none.
   */
  preItems?: SideNavItem[]
  /** Brand logomark rendered at the top of the rail (white, ~30px). */
  logo?: ReactNode
  /** Footer slot (settings + user avatar) pinned to the bottom of the rail. */
  footer?: ReactNode
  /**
   * Accepted for `AppShell` clone-compatibility. The rail is permanently an
   * icon-only rail now, so this no longer toggles width — labels are always
   * surfaced as tooltips. Kept so existing callers / `AppShell.cloneElement`
   * don't type-error.
   */
  isCollapsed?: boolean
  /**
   * Render bridge for each item — lets the consumer wrap the visual content in a
   * router `<Link>` (or an `<a>`). Receives the fully-styled inner node + the
   * item. Defaults to an anchor pointing at `item.to`.
   */
  renderItem?: (item: SideNavItem, inner: ReactNode) => ReactNode
  /**
   * Rail width. A number is treated as px, a string as any CSS length; both
   * are applied INLINE, because a consuming app's Tailwind build scans
   * `@fams/ui-kit/dist` and an arbitrary `w-[…]` that fails to be emitted
   * there collapses the rail to its content width.
   *
   * Defaults to `SIDENAV_RAIL_WIDTH` (51). Pass `null` to set NO inline width
   * at all, which hands control back to whatever width class arrives on
   * `className` — the inline default would otherwise silently beat it
   * (Phase 7 code review, finding 6).
   */
  width?: number | string | null
}

/**
 * SideNav — the FAMS icon rail.
 *
 * A fixed 51px (`RAIL_WIDTH`, live-monitoring SPEC v2 §2.1 — ⚠ was 44px,
 * round-1 visual finding #39), full-height rail painted with the
 * tenant rail color (`--shell-rail-bg`, set per `data-tenant` for a consumer
 * that wants a bespoke rail color, e.g. iwmp/Tadweer's teal→green gradient —
 * see `packages/tokens/tokens/tenants/iwmp.tokens.json`). Falls back to
 * `--color-primary` — the same brand-blue-per-tenant token every tenant's
 * `[data-tenant]` token block already defines
 * (`packages/tokens/tokens/tenants/*.tokens.json`) — rather than the
 * foreground text color, since the rail is supposed to read as the tenant's
 * brand color (nav-a SPEC.md §1: `bg: Brand/Primary/Normal`), not a neutral
 * dark navy.
 * Layout top→bottom: logomark, the item icon-buttons, then a `mt-auto` footer
 * (settings + help + user), separated from the items above by a hairline
 * divider.
 *
 * - Active item = **white rounded square** (`bg-white`) with a **brand-colored
 *   icon** (`text-primary`); inactive items are `text-white/70` and lift to
 *   `text-white` on hover. Both states carry a subtle `border-s-2` accent
 *   (`border-primary/60` active, `border-primary/40` inactive) — a logical
 *   inline-start border, so it sits on the correct edge in RTL automatically.
 * - `item.notificationDot` renders a small `bg-destructive` corner dot (e.g.
 *   an inbox item with unseen messages). Purely visual, opt-in per item.
 * - Every label is a Radix tooltip on hover/focus (the rail shows no text).
 * - RTL-safe: the rail is a flex column with no physical-direction utilities, so
 *   `AppShell` places it on the `start` edge in both LTR and RTL.
 * - For the footer slot, `SideNavFooterItem` (exported below) is an optional
 *   ready-made circular icon button (settings/help/user) matching the rail's
 *   tooltip + active/inactive treatment — `footer` still accepts any `ReactNode`
 *   if a consumer needs something custom instead.
 */
/** How a caller-supplied render bridge wraps one item's styled inner node. */
type ItemWrap = (item: SideNavItem, inner: ReactNode) => ReactNode

/**
 * One rail entry — the 44×44 hit-area box around the 28×28 painted chip,
 * wrapped in its hover/focus tooltip. Shared by the pinned `preItems` list
 * and the main `items` list so the two can never drift visually.
 */
function RailItem({ item, wrap }: { item: SideNavItem; wrap: ItemWrap }) {
  const inner = (
    <span className={HIT_AREA}>
      <span
        data-active={item.active || undefined}
        className={cn(
          // 28×28px icon button, 4px radius (nav-a SPEC.md §1 —
          // spacing.7 / radius.md).
          'relative flex size-7 items-center justify-center rounded-sm border-s-2 outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-white/60',
          item.active
            ? 'border-primary/60 bg-white text-primary shadow-sm'
            : 'border-primary/40 text-white/70 hover:bg-white/20 hover:text-white',
        )}
      >
        <span
          aria-hidden
          className="flex size-4 shrink-0 items-center justify-center"
        >
          {item.icon ?? FALLBACK_ICON}
        </span>
        {/* Visible label lives in the tooltip; this gives the
            interactive wrapper an accessible name without altering
            the visual icon-only rail. */}
        <span className="sr-only">{item.label}</span>
        {item.notificationDot ? (
          <span
            aria-hidden
            data-slot="sidenav-item-dot"
            // Inline logical inset, not `-top-0.5 -end-0.5`: Tailwind's
            // negative `-end-*` compiles to a negative `inset-inline-end`
            // only in LTR builds of the utility and put the dot on the WRONG
            // corner under `dir="rtl"` — the recurring pitfall this cycle
            // eliminated in `InboxToolbar` and `ViewTypePicker`.
            style={{ top: '-0.125rem', insetInlineEnd: '-0.125rem' }}
            className="absolute size-2 rounded-full bg-destructive"
          />
        ) : null}
      </span>
    </span>
  )

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <li aria-current={item.active ? 'page' : undefined}>{wrap(item, inner)}</li>
      </Tooltip.Trigger>
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
  )
}

export const SideNav = forwardRef<HTMLElement, SideNavProps>(
  ({ items, preItems, logo, footer, renderItem, className, width = RAIL_WIDTH, ...props }, ref) => {
    // `isCollapsed` is intentionally consumed off `...props` so it never lands on
    // the DOM <nav> as an unknown attribute.
    delete (props as { isCollapsed?: boolean }).isCollapsed

    const wrap =
      renderItem ??
      ((item: SideNavItem, inner: ReactNode) => (
        <a href={item.to} aria-label={item.label} className="block">
          {inner}
        </a>
      ))

    return (
      <Tooltip.Provider delayDuration={150}>
        <nav
          ref={ref}
          aria-label="Primary"
          style={{
            // Tenant rail color. Falls back to the tenant's brand-blue
            // `--color-primary` (not the foreground color) so the rail is
            // never a plain dark navy box for a tenant that hasn't defined a
            // bespoke --shell-rail-bg.
            background: 'var(--shell-rail-bg, var(--color-primary))',
            // 51px, INLINE rather than an arbitrary `w-[…]` class: a consuming
            // app's Tailwind build scans `@fams/ui-kit/dist` for class names,
            // and an arbitrary value that fails to be emitted there collapses
            // the rail to its content width. Inline needs no class generation.
            // It is a DEFAULT, not a diktat — `width={null}` drops it so a
            // consumer's own width class governs (see `SideNavProps.width`).
            ...(width === null ? null : { width }),
          }}
          className={cn(
            // Live-monitoring SPEC v2 §2.1: 51px outer rail (⚠ was 44px —
            // round-1 visual finding #39), 8px horizontal / 16px vertical
            // padding — spacing.2/spacing.4 (@fams/tokens).
            'flex h-full shrink-0 flex-col items-center gap-1 px-2 py-4',
            className,
          )}
          {...props}
        >
          {logo ? (
            // 28×28px logo slot (nav-a SPEC.md §1 — spacing.7). `overflow-hidden`
            // + the `[&_*]` sizing rules below are a hard clip/fit boundary:
            // round-1 design QA (kanban #1) found a tenant wordmark logo
            // rendered far larger than this slot, clipped on both edges AND
            // overflowing into the module rail column next to it. A logo is
            // caller-supplied content (any SVG/img/text node) this shell can't
            // predict the intrinsic size of, so rather than trusting every
            // caller to pre-size their own mark, the slot itself constrains
            // ANY child to fit — a compact icon lockup stays exactly as
            // provided, an oversized wordmark gets scaled down to fit instead
            // of bleeding past the rail.
            <div className="mb-4 flex size-7 shrink-0 items-center justify-center overflow-hidden text-white [&_*]:max-h-full [&_*]:max-w-full [&_img]:size-full [&_img]:object-contain [&_svg]:size-full">
              {logo}
            </div>
          ) : null}

          {preItems && preItems.length > 0 ? (
            // Pinned pre-items: a non-scrolling strip framed by hairline
            // dividers on both sides (same 1px white/20 40px-wide hairline as
            // the footer's), so it reads as its own group above the regular
            // entries rather than merging with them.
            <>
              <div aria-hidden className="mb-1 h-px w-10 shrink-0 bg-white/20" />
              <ul
                data-slot="sidenav-pre-items"
                className="flex w-full shrink-0 flex-col items-center"
              >
                {preItems.map((item) => (
                  // label, not `to` — `to` is caller-supplied and commonly a
                  // placeholder ("#") or shared route across items; label is
                  // the field that actually identifies the item.
                  <RailItem key={item.label} item={item} wrap={wrap} />
                ))}
              </ul>
              <div aria-hidden className="mt-1 mb-1 h-px w-10 shrink-0 bg-white/20" />
            </>
          ) : null}

          {/* No `gap`: each item owns a 44px hit-area box (see HIT_AREA), so
              the pitch is identical to the old 28px item + 16px gap. */}
          <ul className="flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto">
            {items.map((item) => (
              <RailItem key={item.label} item={item} wrap={wrap} />
            ))}
          </ul>

          {footer ? (
            <div className="mt-auto flex w-full flex-col items-center gap-2 pt-2">
              {/* Hairline divider separating the module content above from the
                  bottom settings/help/user cluster (nav-a SPEC.md §1 — 1px,
                  white/20, 40px wide — spacing.10). */}
              <div aria-hidden className="h-px w-10 bg-white/20" />
              {footer}
            </div>
          ) : null}
        </nav>
      </Tooltip.Provider>
    )
  },
)

SideNav.displayName = 'SideNav'

export interface SideNavFooterItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name — also shown in the hover/focus tooltip. */
  label: string
  /** Glyph rendered inside the circle. */
  icon?: ReactNode
  /** Highlights the item as the current view (e.g. an open settings panel). */
  active?: boolean
}

/**
 * SideNavFooterItem — optional circular icon button for `SideNav`'s `footer`
 * slot (settings / help / user). Same tooltip + active/inactive treatment as
 * the main rail items, sized down into a circle to read as system chrome
 * rather than a navigation destination. Carries its own `Tooltip.Provider` so
 * it works standalone; nesting it inside `SideNav`'s own provider is harmless.
 *
 * `footer` still accepts a plain `ReactNode`, so existing callers using their
 * own markup are unaffected — this is purely an optional building block.
 */
export const SideNavFooterItem = forwardRef<HTMLButtonElement, SideNavFooterItemProps>(
  ({ label, icon, active, className, type = 'button', ...props }, ref) => (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            ref={ref}
            type={type}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            // The BUTTON is the 44×44 target (verdict V11); the 28×28 circle
            // it paints lives in the inner ring, so the target grows and the
            // chrome does not.
            className={cn(HIT_AREA, 'group rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/60', className)}
            {...props}
          >
            <span
              className={cn(
                // 28×28px circle (nav-a SPEC.md §1 "Bottom cluster" — spacing.7).
                'flex size-7 items-center justify-center rounded-full transition-colors',
                'group-focus-visible:ring-2',
                active ? 'bg-white text-primary shadow-sm' : 'bg-white/20 text-white hover:bg-white/30',
              )}
            >
              {icon ? (
                <span aria-hidden className="flex size-4 shrink-0 items-center justify-center">
                  {icon}
                </span>
              ) : null}
            </span>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="right"
            sideOffset={8}
            className="z-50 rounded-sm bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
          >
            {label}
            <Tooltip.Arrow className="fill-popover" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  ),
)

SideNavFooterItem.displayName = 'SideNavFooterItem'
