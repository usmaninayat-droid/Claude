import * as React from 'react';
import { Maximize2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { IconBadge, type IconBadgeTone } from './icon-badge';

/**
 * ChartCard — universal chart container.
 *
 * Spec: `chart-card.spec.md` (co-located).
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────┐
 *   │ 📊 Title                              [legend] [⤢]   │  ← header
 *   │    Optional subtitle                                  │
 *   ├──────────────────────────────────────────────────────┤
 *   │                                                       │
 *   │   Chart body (any chart kind + axes)                 │
 *   │                                                       │
 *   └──────────────────────────────────────────────────────┘
 *
 * The card is desktop-responsive — it fills its parent's width and the chart
 * body uses Recharts <ResponsiveContainer> for elastic resize.
 */

export interface ChartCardProps {
  /** Chart title. */
  title: React.ReactNode;
  /** Optional subtitle below the title. */
  subtitle?: React.ReactNode;
  /** Leading icon (lucide) — rendered inside the standard circular IconBadge. */
  icon?: React.ReactNode;
  /** IconBadge tone (semantic color). Default 'primary'. */
  iconTone?: IconBadgeTone;
  /** IconBadge explicit color — overrides `iconTone`. */
  iconColor?: string;
  /** Right-aligned content (typically <ChartLegend />). */
  legend?: React.ReactNode;
  /** Right-aligned action buttons + ChartLegend slot. */
  actions?: React.ReactNode;
  /** Show the expand chevron in top-right; calls onExpand when clicked. */
  onExpand?: () => void;
  /** Chart body. */
  children: React.ReactNode;
  /** Padding around the chart body. Default 'md'. */
  bodyPadding?: 'none' | 'sm' | 'md' | 'lg';
  /** Height of the chart body. Default auto (intrinsic). */
  bodyHeight?: number | string;
  className?: string;
}

const PADDING = { none: 'p-0', sm: 'p-2', md: 'p-4', lg: 'p-6' };

export function ChartCard({
  title,
  subtitle,
  icon,
  iconTone,
  iconColor,
  legend,
  actions,
  onExpand,
  children,
  bodyPadding = 'md',
  bodyHeight,
  className,
}: ChartCardProps) {
  return (
    <section
      className={cn(
        'flex w-full flex-col rounded-lg border border-border bg-card',
        className,
      )}
    >
      <header className="flex items-start gap-3 px-4 pt-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {icon ? <IconBadge icon={icon} tone={iconTone} color={iconColor} size={32} /> : null}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {legend ? <div className="flex shrink-0 items-center">{legend}</div> : null}
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
        {onExpand ? (
          <button
            type="button"
            onClick={onExpand}
            aria-label="Expand chart"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Maximize2 size={14} />
          </button>
        ) : null}
      </header>
      <div
        className={cn('flex w-full flex-1 flex-col', PADDING[bodyPadding])}
        style={bodyHeight ? { height: typeof bodyHeight === 'number' ? `${bodyHeight}px` : bodyHeight } : undefined}
      >
        {children}
      </div>
    </section>
  );
}
