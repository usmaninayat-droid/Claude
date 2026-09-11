import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * FullScreenDetail — Pattern #27 chassis shell.
 *
 * A reusable two-column full-page detail layout used by Pipeline Detail
 * (Pattern #27 full-screen flavor) and any other module whose detail view
 * takes over the module canvas rather than overlaying it as a side sheet.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  Title strip (sticky)                                    │
 *   ├──────────────────────────────────────┬──────────────────┤
 *   │  Main scrollable column              │  Right rail      │
 *   │  (identity grid, accordions, body)   │  (tabs, 320–360) │
 *   └──────────────────────────────────────┴──────────────────┘
 *
 * Contrast with Pattern #17 (`<Sheet side="right">` + identity card on
 * left rail) which is the right-overlay variant for Entity modules.
 *
 * Closing this detail returns to the parent module's list/kanban view —
 * the parent owns the routing; this shell only exposes a back button
 * affordance via the `title` slot.
 */
export interface FullScreenDetailProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Sticky title strip content — typically a back button + record id + stage pill + action buttons. */
  title: React.ReactNode;
  /** Right-rail content — typically a Tabs cluster (activity, timeline, related). Pass null/undefined to omit. */
  rightRail?: React.ReactNode;
  /** Width of the right rail in pixels. Default 320; spec range 320–360. */
  rightRailWidth?: number;
  /** Main column content — identity grid + accordion sections + body. */
  children: React.ReactNode;
}

export function FullScreenDetail({
  title,
  rightRail,
  rightRailWidth = 320,
  className,
  children,
  ...rest
}: FullScreenDetailProps) {
  return (
    <div className={cn('flex h-full w-full flex-col bg-background', className)} {...rest}>
      {/* Title strip — sticky top */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm">
        {title}
      </div>

      {/* Body: main column + optional right rail */}
      <div className="flex min-h-0 flex-1 flex-row">
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
        {rightRail ? (
          <aside
            className="shrink-0 border-l border-border bg-card"
            style={{ width: `${rightRailWidth}px` }}
          >
            <div className="flex h-full flex-col">{rightRail}</div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
