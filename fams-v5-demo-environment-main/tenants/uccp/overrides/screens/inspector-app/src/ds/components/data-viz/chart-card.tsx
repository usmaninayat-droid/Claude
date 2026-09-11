import * as React from 'react';
import { Maximize2 } from 'lucide-react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { exportNodeToPdf } from '../utils/pdf';
import { IconBadge, type IconBadgeTone } from './icon-badge';
import { WidgetMenu, type WidgetMenuItem } from './widget-menu';

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
  /** Adds "View raw data" to the header ⋮ menu (opens a RawDataSheet). */
  onViewRawData?: () => void;
  /** Adds "Export chart" to the header ⋮ menu. Enabled by default (built-in
   *  print-to-PDF of the card); pass a handler to override, or `false` to hide. */
  onExportChart?: (() => void) | false;
  /** Filename used by the built-in Export-chart (PDF). Defaults to the title. */
  exportFileName?: string;
  /** Divider line under the header. Default true (the unified widget-header standard). */
  divider?: boolean;
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
  onViewRawData,
  onExportChart,
  exportFileName,
  divider = true,
  children,
  bodyPadding = 'md',
  bodyHeight,
  className,
}: ChartCardProps) {
  const sectionRef = React.useRef<HTMLElement>(null);
  const menuItems: WidgetMenuItem[] = [];
  if (onViewRawData) menuItems.push({ id: 'raw', label: 'View raw data', icon: <Icons.Table />, onClick: onViewRawData });
  if (onExportChart !== false) {
    menuItems.push({
      id: 'export',
      label: 'Export chart',
      icon: <Icons.Download01 />,
      onClick: () => (typeof onExportChart === 'function'
        ? onExportChart()
        : exportNodeToPdf(sectionRef.current, { title: exportFileName ?? (typeof title === 'string' ? title : 'chart') })),
    });
  }
  return (
    <section
      ref={sectionRef}
      className={cn(
        'flex w-full min-w-0 flex-col rounded-lg border border-border bg-card',
        className,
      )}
    >
      <header className={cn('flex items-start gap-3 px-4 py-3', divider && 'border-b border-border')}>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {icon ? <IconBadge icon={icon} tone={iconTone} color={iconColor} size={32} /> : null}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-body-sm font-semibold text-foreground">
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-0.5 text-caption text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {legend ? <div className="flex shrink-0 items-center">{legend}</div> : null}
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
        {menuItems.length ? <WidgetMenu items={menuItems} ariaLabel="Chart options" /> : null}
        {onExpand ? (
          <button
            type="button"
            onClick={onExpand}
            aria-label="Expand chart"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Maximize2 size={14} />
          </button>
        ) : null}
      </header>
      <div
        className={cn('flex w-full min-w-0 flex-1 flex-col', PADDING[bodyPadding])}
        style={bodyHeight ? { height: typeof bodyHeight === 'number' ? `${bodyHeight}px` : bodyHeight } : undefined}
      >
        {children}
      </div>
    </section>
  );
}
