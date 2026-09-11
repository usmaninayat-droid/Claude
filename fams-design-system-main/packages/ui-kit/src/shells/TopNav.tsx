import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface TopNavProps extends HTMLAttributes<HTMLElement> {
  /**
   * Module title / breadcrumb content, pinned to the `start` edge. Typically the
   * bold module name (e.g. "Live Monitoring").
   */
  brand?: ReactNode
  /**
   * View-switch tabs slot, rendered after the title (e.g. Hybrid / List / Map).
   *
   * Rendered at EVERY viewport width. It used to be `hidden` below `md`, which
   * removed a module's only view switcher on narrow viewports with nothing in
   * its place — users were stranded in whichever view was active when the
   * window last exceeded 768px. The tab strip scrolls horizontally instead
   * (`ModuleViewTabs`' `navbar` variant), which is the dominant native pattern
   * for a too-wide tab row and needs no breakpoint at all.
   */
  tabs?: ReactNode
  /**
   * Ref callback for the tabs region's DOM node. Supplying it puts the bar in
   * SLOT-HOST mode for that region: the container renders even when `tabs` is
   * empty, so the active page can portal its own tabs in (see `top-nav-slot`).
   * `AppShell` wires this automatically — callers rarely pass it directly.
   */
  tabsSlotRef?: (node: HTMLElement | null) => void
  /** Ref callback for the actions region's DOM node. See `tabsSlotRef`. */
  actionsSlotRef?: (node: HTMLElement | null) => void
  /**
   * Ref callback for a LEADING node inside the title group (before `brand`) —
   * lets the active page portal a title adornment (e.g. a 20px module icon)
   * next to the host-owned title text. See `tabsSlotRef`.
   */
  titleSlotRef?: (node: HTMLElement | null) => void
  /**
   * When provided, a ghost `+` button renders after the tabs — the FAMS "add new
   * view / item" affordance.
   */
  onAdd?: () => void
  /** Action content (tenant switcher, user menu), pinned to the `end`. */
  actions?: ReactNode
  /**
   * Escape hatch for the title group's own typography/gutters. Merged AFTER
   * the defaults, so a single class replaces them:
   * `titleClassName="ps-6 pe-6 font-semibold"` restores the pre-2026-08 shell.
   *
   * The default (`ps-8 pe-9 … font-bold`, live-monitoring SPEC v2 §2.1,
   * round-1 visual #39/#48) is deliberately SHELL-WIDE — the title sits
   * between the two rails whose gutters changed in the same wave, so a
   * per-module gate would leave one product with two different headers. It is
   * therefore on the founder sign-off list alongside SideNav 44→51 and
   * ModuleRail 60→67, and this prop exists so a consumer (FAMS Desk) can opt
   * out in one line rather than fork the shell.
   */
  titleClassName?: string
  /**
   * Mobile hamburger handler. When provided, a menu button renders at the
   * `start` (before `brand`) and is hidden from `md` upward — on desktop the
   * SideNav is always visible so the trigger is unnecessary.
   */
  onMenuClick?: () => void
}

function MenuGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function PlusGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

/**
 * TopNav — the FAMS application top bar. [L4 shell]
 *
 * Layout (start → end): optional mobile hamburger, the module **title**
 * (`brand` — a "Page Title" block: `16px/24 semibold` text, a leading icon
 * is the caller's concern, composed into the `brand` node itself), the
 * view-switch **tabs** slot (edge-to-edge, no gap — see `ModuleViewTabs`'
 * `navbar` variant, figma-spec-nav §3), an optional ghost `+` button, then
 * **actions** pushed to the trailing edge. `48px` tall (figma-spec-nav §3),
 * `Surface/Minimal` bg with a bottom border; sticky at the top of the
 * content column.
 *
 * RTL-safe — the `ms-auto` push and logical paddings keep actions on the trailing
 * edge in both directions.
 */
export const TopNav = forwardRef<HTMLElement, TopNavProps>(
  (
    {
      brand,
      tabs,
      tabsSlotRef,
      actionsSlotRef,
      titleSlotRef,
      onAdd,
      actions,
      onMenuClick,
      className,
      titleClassName,
      ...props
    },
    ref,
  ) => {
    return (
      <header
        ref={ref}
        data-slot="top-nav"
        className={cn(
          'sticky top-0 z-20 flex h-12 shrink-0 items-stretch border-b border-border bg-background',
          className,
        )}
        {...props}
      >
        {onMenuClick ? (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            className="my-auto ms-2 flex size-9 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            <MenuGlyph />
          </button>
        ) : null}

        {brand || titleSlotRef ? (
          // `min-w-0` (no `shrink-0`) lets a long module name TRUNCATE rather
          // than push the tabs off the bar — the title yields first, then the
          // tab strip starts scrolling. The truncating element is the caller's
          // `brand` node (e.g. `<h1 className="truncate">`), which is also what
          // carries the page's heading semantics.
          <div
            data-slot="top-nav-title"
            // Live-monitoring SPEC v2 §2.1 (round-1 visual #39/#48): the title
            // sits 32px in from the rails (⚠ was 24px / `ps-6`) with a wider
            // gap before the tab strip, and reads BOLD — the hosted `<h1>`
            // INHERITS this weight, so a page that passes a plain `<h1>`
            // renders bold rather than at 500/600. A page that passes its own
            // weight class still wins (a class on the child beats inheritance),
            // and a consumer can replace the whole default via `titleClassName`
            // — see that prop for why this is shell-wide by design.
            className={cn(
              'flex min-w-0 items-center gap-2.5 ps-8 pe-9 text-body-md font-bold text-foreground',
              titleClassName,
            )}
          >
            {/* Page-fillable leading adornment (module icon) — `empty:hidden`
                so an unclaimed/unfilled slot contributes no gap. */}
            {titleSlotRef ? (
              <span
                ref={titleSlotRef}
                data-slot="top-nav-title-lead"
                className="flex shrink-0 items-center empty:hidden"
              />
            ) : null}
            {brand}
          </div>
        ) : null}

        {/* Rendered when there is content OR when a host has claimed the region
            (`tabsSlotRef`), so a page can portal its tabs into an initially
            empty bar. `min-w-0` (deliberately NOT `flex-1`, which would push
            `onAdd` to the trailing edge) lets the region shrink below its
            content width so the strip inside it — not the bar — becomes the
            scroll container on overflow. */}
        {tabs || tabsSlotRef ? (
          <div ref={tabsSlotRef} data-slot="top-nav-tabs" className="flex h-full min-w-0 items-stretch">
            {tabs}
          </div>
        ) : null}

        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add"
            className="flex w-11 shrink-0 items-center justify-center text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PlusGlyph />
          </button>
        ) : null}

        {actions || actionsSlotRef ? (
          <div
            ref={actionsSlotRef}
            data-slot="top-nav-actions"
            className="ms-auto flex shrink-0 items-center gap-3 pe-6 ps-3"
          >
            {actions}
          </div>
        ) : null}
      </header>
    )
  },
)

TopNav.displayName = 'TopNav'
