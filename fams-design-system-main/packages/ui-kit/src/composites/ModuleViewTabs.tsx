import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentType,
  type ElementRef,
  type ReactNode,
} from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { Plus } from '../icons'
import { cn } from '../lib/cn'
import { IconControl } from './IconControl'

/**
 * ModuleViewTabs — compact switcher for a module's views (e.g. Hybrid / List /
 * Map / Kanban). [L3 composite]
 *
 * Plugs into `TopNav`'s `tabs` slot — it renders only the tab strip, never a
 * header bar of its own. Three visual variants: `pill` (compact, rounded,
 * default), `segment` (bordered, full-height, an earlier primary-top-bar
 * shape), and `navbar` — the figma-spec-nav §3 "Top Navbar" anatomy: full
 * bar height, each tab a `padding:12px` box with shared 1px left/right
 * borders (`border-s` per tab + `last:border-e`, so adjacent tabs render a
 * single hairline, never a doubled one), the active tab popping white
 * (`bg-card`) against the bar's `Surface/Minimal` background — no pill. Label
 * color AND icon tint are deliberately IDENTICAL active vs inactive per spec
 * (`text-card-foreground` + brand-blue `text-primary` on both), so Figma's
 * only state cue is the fill; because a `#ffffff`-on-`#f9fafb` fill is far
 * under WCAG 1.4.11's 3:1 floor, the `navbar` variant adds a 2px INSET
 * brand-blue underline on the active tab — the one deliberate departure from
 * the Figma anatomy, made under root CLAUDE.md rule 5 (see the cva comment
 * below for the rationale and the one-line revert). When a module declares
 * more views than fit, the tab STRIP scrolls horizontally — tabs are never
 * crushed, never wrapped to a second row, and the bar never grows past 48px.
 * Built directly on the Radix `Tabs` root (the same primitive
 * `Tabs.tsx` wraps) for roving-tabindex keyboard nav — arrow keys move focus
 * and activate, no app-side wiring needed. Which view is rendered stays the
 * app's concern; this component only switches `active`.
 *
 * @usage-v5
 *   `shared/components/tabs/ViewTabs.vue` (618 lines, via `ModuleViewLayout.vue`)
 *   is the real analogue: a `views` array driven by `type` (hybrid/list/map/
 *   kanban) picks an icon, `active` vid highlights the tab, click switches.
 *   Note: this repo's `ViewTabs.tsx` composite already retires that file's
 *   rename/close/saved-view facet — ModuleViewTabs covers only the plain
 *   kind-switch sub-behavior (TopNavModule variant A), no per-tab menu.
 *   2nd source: `iwmp/components/maps/components/ZonesFilterPanel.vue`
 *   (`q-btn-toggle` flat/tree view-mode toggle) — same compact pill pattern.
 * @usage-index module-view-tabs
 */
export interface ModuleViewTab {
  /** Stable id — becomes the Radix tab value. */
  id: string
  label: ReactNode
  /** Leading icon component (a lucide icon or the tenant `<Icon>`). */
  icon?: ComponentType<{ className?: string }>
  /**
   * Renders the tab inert (still visible, `aria-disabled`, unclickable,
   * `disabled:opacity-50` from `triggerVariants`) — e.g. a view kind the
   * module hasn't wired a real body for yet ("coming soon"), still shown so
   * the tab set matches the design's full view-kind set.
   */
  disabled?: boolean
}

const listVariants = cva('inline-flex items-center', {
  variants: {
    variant: {
      pill: 'gap-1 rounded-md bg-muted p-1',
      segment: 'gap-0 overflow-hidden rounded-sm border border-border',
      // `min-w-0` + `overflow-x-auto` make the TAB STRIP the scroll container
      // when a module declares more views than fit the bar (SPEC I6): tabs keep
      // their natural width (`shrink-0` on the trigger), the module title stays
      // pinned and unscrolled, the bar stays exactly 48px, and the page body
      // never gains a horizontal scrollbar. `overscroll-x-contain` stops a
      // trackpad fling in the strip from chaining into a browser back-swipe.
      // Native `overflow-x-auto` already reverses under `dir="rtl"`, so this is
      // RTL-safe with no extra code (UX-NOTES item 9).
      navbar: 'h-full min-w-0 items-stretch gap-0 overflow-x-auto overscroll-x-contain',
    },
  },
  defaultVariants: { variant: 'pill' },
})

const triggerVariants = cva(
  'inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-body-sm font-medium text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        pill: 'h-8 rounded-sm px-3 hover:text-foreground data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground',
        segment:
          'h-9 border-e border-border px-3 last:border-e-0 hover:bg-muted hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground',
        // figma-spec-nav §3 / run-2026-08-13 SPEC.md: every tab carries a 12px
        // pad, an 8px icon↔label gap, and a shared 1px border — `border-s` on
        // every tab plus `last:border-e` closes the strip's trailing edge
        // without doubling the hairline between adjacent tabs (same technique
        // as `TaskDetailHeader`'s segmented id/type chip). Label color is the
        // SAME token active/inactive (`text-card-foreground`, `Darker
        // #1d2939`), and so is the icon tint (`text-primary` on BOTH states —
        // pixel-sampled from the Figma node, see that run's SPEC.md § "View
        // tab"), so the FILL is Figma's only state cue.
        //
        // `shrink-0` keeps a tab at its natural width when the strip runs out
        // of room — the strip scrolls instead of crushing its tabs (SPEC I6;
        // UX-NOTES item 4, which makes "no crushed tabs" a hard constraint).
        //
        // The `data-[state=active]:shadow-[…inset]` underline is a DELIBERATE
        // addition to the Figma anatomy, not an oversight: Figma distinguishes
        // the active tab by fill alone (`#ffffff` on `#f9fafb`), which is far
        // under WCAG 1.4.11's 3:1 non-text-contrast floor and, with an
        // identical label AND icon color on both states, also trips 1.4.1 Use
        // of Color — a tab strip whose entire job is "which view am I in"
        // cannot rely on a ~1:1 surface shift (UX-NOTES item 2). Root CLAUDE.md
        // rule 5 (accessibility is built-in, not added) outranks pixel
        // fidelity here. It is drawn INSET so the bar stays exactly 48px, and
        // it repaints nothing — the white fill is untouched. To revert to
        // literal Figma, delete the one `data-[state=active]:shadow-…` class.
        //
        // Focus rings are `ring-inset` for this variant only: a tab fills the
        // bar's full 48px height with a hairline neighbour on each side, so an
        // offset ring has nowhere to live and clips against the bar's own
        // bounding box (UX-NOTES item 6).
        navbar:
          'h-full shrink-0 items-center gap-2 border-s border-border p-3 text-body-xs font-semibold text-card-foreground last:border-e hover:bg-card/60 focus-visible:ring-inset data-[state=active]:bg-card data-[state=active]:shadow-[inset_0_-2px_0_0_var(--color-primary)]',
      },
    },
    defaultVariants: { variant: 'pill' },
  },
)

const addButtonVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      variant: {
        pill: 'size-8',
        segment: 'size-9',
        // figma-spec-nav §3 / run-2026-08-13 SPEC.md: the "+" affordance is a
        // 48×48 box (`padding:14px` around a 20px glyph), radius 4px
        // (`rounded-sm`), sitting OUTSIDE the tab hairlines. `w-12` (48px, not
        // the previous 44px `w-11`) matches the Figma frame exactly and clears
        // the 44×44 touch-target floor on both axes. `shrink-0` keeps it
        // reachable when the tab strip overflows and scrolls.
        // `text-gray-600` (`#475467`) is the glyph color Figma binds here
        // (`Neutral/Dark`), a step darker than the `text-muted-foreground`
        // (`#667085`) the base class sets. It is the one value in this bar that
        // Figma binds to a palette step rather than a semantic role — worth a
        // semantic alias if the DS adds one, but token-backed either way.
        navbar: 'h-full w-12 shrink-0 rounded-sm text-gray-600 focus-visible:ring-inset',
      },
    },
    defaultVariants: { variant: 'pill' },
  },
)

export interface ModuleViewTabsProps
  extends Omit<
      ComponentPropsWithoutRef<typeof TabsPrimitive.Root>,
      'value' | 'defaultValue' | 'onValueChange' | 'children' | 'asChild' | 'onSelect'
    >,
    VariantProps<typeof listVariants> {
  /** The module's available views (order = render order). */
  views: ModuleViewTab[]
  /** Controlled active view id. */
  active: string
  /** Fires with the newly-activated view id (click or roving-tabindex arrow nav). Shadows the native `onSelect` text-selection DOM event — see the `Omit` above. */
  onSelect: (id: string) => void
  /**
   * Fires when the CURRENTLY-ACTIVE tab is clicked. Radix `onValueChange`
   * deliberately stays silent for an unchanged value, so without this seam a
   * caller showing a transient surface (e.g. the new-view picker takeover)
   * has no pointer path back when the user re-clicks the tab they are
   * already on. Optional — plain tab strips need nothing.
   */
  onActiveTabClick?: (id: string) => void
  /** Renders a trailing `+` affordance for adding a new view. */
  onAddView?: () => void
  /** Accessible label for the add-view button. */
  addViewLabel?: string
}

export const ModuleViewTabs = forwardRef<ElementRef<typeof TabsPrimitive.Root>, ModuleViewTabsProps>(
  (
    {
      views,
      active,
      onSelect,
      onActiveTabClick,
      onAddView,
      addViewLabel = 'Add view',
      variant = 'pill',
      className,
      'aria-label': ariaLabel = 'Module views',
      ...props
    },
    ref,
  ) => {
    return (
      <TabsPrimitive.Root
        ref={ref}
        value={active}
        onValueChange={onSelect}
        data-slot="module-view-tabs"
        className={cn(
          'inline-flex',
          // `navbar` stretches to the bar's full height with no outer gap
          // (tabs sit edge-to-edge, figma-spec-nav §3); `pill`/`segment` keep
          // their original vertically-centered, gapped layout. `min-w-0` lets
          // the root shrink below its content width inside `TopNav`'s flex row
          // so the inner strip — not the bar — becomes the scroll container
          // when views overflow (SPEC I6).
          variant === 'navbar' ? 'h-full min-w-0 items-stretch gap-0' : 'items-center gap-1',
          className,
        )}
        {...props}
      >
        <TabsPrimitive.List aria-label={ariaLabel} className={cn(listVariants({ variant }))}>
          {views.map((view) => {
            const Icon = view.icon
            return (
              <TabsPrimitive.Trigger
                key={view.id}
                value={view.id}
                disabled={view.disabled}
                data-slot="module-view-tab"
                className={cn(triggerVariants({ variant }))}
                // Same-value clicks never reach `onValueChange` (Radix) —
                // report them through the dedicated seam. Keyboard activation
                // (Enter/Space) fires a click too, so this stays key-operable.
                onClick={
                  onActiveTabClick && view.id === active ? () => onActiveTabClick(view.id) : undefined
                }
              >
                {Icon ? (
                  // `navbar` tints the glyph brand-blue in BOTH states (Figma
                  // node 6995:419 pixel-samples `#0072d6` on the active AND
                  // the inactive tab — see run-2026-08-13's SPEC.md § "View
                  // tab"). The other variants keep the conventional
                  // active-only tint, where the label color already carries
                  // the state and a permanently-blue glyph would read as a
                  // link.
                  <Icon
                    className={cn(
                      'size-4 shrink-0',
                      variant === 'navbar'
                        ? 'text-primary'
                        : view.id === active
                          ? 'text-primary'
                          : 'text-muted-foreground',
                    )}
                  />
                ) : null}
                <span className="min-w-0 truncate">{view.label}</span>
              </TabsPrimitive.Trigger>
            )
          })}
        </TabsPrimitive.List>

        {/*
         * Stub panels — this component is pure view-switching chrome; the
         * caller renders each view's actual content OUTSIDE the Tabs tree
         * (see the component doc comment above). Radix's Trigger still
         * generates a real `aria-controls` id per tab regardless, and with
         * no matching element that id dangled (axe: aria-valid-attr-value —
         * "aria-controls references an id that doesn't exist"). These
         * force-mounted, contentless panels give every trigger a real
         * target: `hidden` follows `active` so only the current tab's panel
         * is exposed to the accessibility tree, and each is pulled out of
         * the tab order (`tabIndex={-1}`) since it never holds real,
         * focusable content — that content lives in the app's own view body.
         */}
        {views.map((view) => (
          <TabsPrimitive.Content
            key={view.id}
            value={view.id}
            forceMount
            hidden={view.id !== active}
            tabIndex={-1}
            data-slot="module-view-tabs-panel"
          />
        ))}

        {onAddView ? (
          // A real tooltip, not `title=`: an icon-only control must be
          // discoverable on keyboard FOCUS as well as hover (UX K.67), which
          // `title` never is. `IconControl` supplies both it and the
          // accessible name from the one string.
          <IconControl tip={addViewLabel}>
            <button
              type="button"
              onClick={onAddView}
              data-slot="module-view-tabs-add"
              className={cn(addButtonVariants({ variant }))}
            >
              {/* 20px glyph in the `navbar` variant per Figma (`IconSize/Small`);
                  the compact variants keep the 16px glyph their smaller boxes fit. */}
              <Plus className={variant === 'navbar' ? 'size-5' : 'size-4'} />
            </button>
          </IconControl>
        ) : null}
      </TabsPrimitive.Root>
    )
  },
)

ModuleViewTabs.displayName = 'ModuleViewTabs'

export { listVariants as moduleViewTabsListVariants, triggerVariants as moduleViewTabsTriggerVariants }
