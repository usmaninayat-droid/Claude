import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@ds/components/primitives/tooltip';
import { cn } from '@ds/components/utils/cn';

export interface TruncatedTextProps {
  /** Full, untruncated value — rendered inline (clipped by `truncate`) and
   *  again in full inside the tooltip. */
  children: string;
  className?: string;
}

/**
 * TruncatedText — one-gesture full-value access for end-truncated descriptive
 * text, per the DS text-truncation guideline
 * (fams-design-system/docs/guidelines/text-truncation.md §3/§6):
 *
 *  - Desktop / pointer: hover reveals the full value in a tooltip.
 *  - Keyboard: Tab focus reveals the same tooltip (a11y requirement, not
 *    optional polish) — the wrapped span is made focusable for this.
 *  - Touch: these cards (IncidentCard/PlanCard) already carry a one-gesture
 *    path to the full, untruncated value — the eye button opens the record's
 *    full detail sheet with every field shown in full — so this component
 *    does not also intercept tap. Adding a second, competing tap-to-reveal
 *    gesture here would fight the card's own tap-to-select /
 *    tap-to-watch-on-map body-click behavior (locked design decision).
 *
 * Visual truncation (single-line ellipsis) is driven by the `truncate` class
 * already applied via `className` — this component only adds the disclosure
 * affordance on top of it.
 */
export function TruncatedText({ children, className }: TruncatedTextProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className={cn('truncate outline-none', className)}>
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
