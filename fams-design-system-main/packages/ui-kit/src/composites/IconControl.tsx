import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { DropdownMenuTrigger } from '../primitives/DropdownMenu'
import { PopoverTrigger } from '../primitives/Popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/Tooltip'

export interface IconControlProps {
  /**
   * Tooltip copy. Also becomes the child's `aria-label` when the child carries
   * none and this is a plain string — one prop, both obligations, so the two
   * can never drift apart.
   */
  tip: ReactNode
  /**
   * Accessible name, when it must differ from `tip` (e.g. the name states its
   * subject — "More actions for IMS-12324" — while the tooltip is shorter, or
   * the tip is a `ReactNode`).
   */
  name?: string
  /**
   * Set when the control is ALSO a `DropdownMenu` trigger. See the nesting note
   * in the docblock — this is what gets the order right.
   */
  menuTrigger?: boolean
  /**
   * Set when the control is ALSO a `Popover` trigger — the same nesting
   * argument as `menuTrigger` (see the docblock), for a control whose overlay
   * is a Popover rather than a DropdownMenu. Mutually exclusive with
   * `menuTrigger`; must be rendered inside a `Popover`, and the caller still
   * owns the `PopoverContent` sibling.
   */
  popoverTrigger?: boolean
  /** Exactly one element: the icon-only control itself. */
  children: ReactElement
}

/**
 * IconControl — the ONE way an icon-only control gets a tooltip in this design
 * system. [L3 composite]
 *
 * UX note K.67 asks two things of every icon-only control: a specific
 * accessible name AND a tooltip that opens on hover **and on keyboard focus**.
 * A native `title=` attribute satisfies neither properly (it never opens on
 * focus, and screen readers treat it inconsistently), and hand-rolling the
 * Radix trio at each call site is how a family ends up with some controls
 * tooltipped and some not — which is exactly what round 1 measured. So this
 * wrapper is the single application point: `tip` supplies both the tooltip and
 * (unless `name` overrides it) the accessible name.
 *
 * ## The nesting order is load-bearing (`menuTrigger`)
 *
 * When the control is also a menu trigger, BOTH `TooltipTrigger` and
 * `DropdownMenuTrigger` are `asChild`, so they collapse onto the one button and
 * **the OUTER trigger's props win**. With the tooltip outermost, the button's
 * `data-state` reports the TOOLTIP's open state (so a
 * `data-[state=open]:` reveal never fires while the MENU is open) and the
 * tooltip's dismissable layer swallows the Escape that should have closed the
 * menu and restored focus to the trigger — the H.49/H.51 defect fix wave 1
 * paid for once in `RecordActionsMenu`. `menuTrigger` puts
 * `DropdownMenuTrigger` outermost so `data-state` and the Escape/focus-restore
 * path belong to the menu, and callers cannot get it wrong per call site.
 *
 * Must be rendered inside a `DropdownMenu` when `menuTrigger` is set; the
 * caller still owns the `DropdownMenuContent` sibling.
 */
export function IconControl({
  tip,
  name,
  menuTrigger = false,
  popoverTrigger = false,
  children,
}: IconControlProps) {
  const label = name ?? (typeof tip === 'string' ? tip : undefined)
  const child =
    isValidElement(children) &&
    label != null &&
    (children.props as { 'aria-label'?: string })['aria-label'] == null
      ? cloneElement(children as ReactElement<{ 'aria-label'?: string }>, { 'aria-label': label })
      : children
  const trigger = <TooltipTrigger asChild>{child}</TooltipTrigger>
  return (
    <Tooltip>
      {menuTrigger ? (
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      ) : popoverTrigger ? (
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      ) : (
        trigger
      )}
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  )
}

IconControl.displayName = 'IconControl'
