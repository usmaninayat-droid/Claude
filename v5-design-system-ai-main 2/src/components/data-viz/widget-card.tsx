import * as React from 'react';
import { Maximize2 } from 'lucide-react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { exportNodeToPdf } from '../utils/pdf';
import { IconBadge, type IconBadgeTone } from './icon-badge';
import { WidgetMenu, type WidgetMenuItem } from './widget-menu';

/**
 * WidgetCard — the ONE standardized dashboard widget frame (FAMS Design-System-V2
 * 5246-10805 / 5235-86xx). A defined header — a **primary-palette** `IconBadge` +
 * bold title (+ subtitle/actions) — separated from the body by a **divider line**,
 * with a built-in raw-data affordance. Three body layouts share the one header:
 *   • `default` — content in a padded body (custom widgets, lists, KPIs)
 *   • `map`     — a full-bleed map child (map-only widget)
 *   • `hybrid`  — a left side `panel` beside the map/`children` (map + panel widget,
 *                 the dashboard-widget form of the live-monitoring hybrid view)
 * Charts use `ChartCard` (same header idiom). Token-only; reuses `IconBadge`.
 * See widget-card.spec.md.
 */

export type WidgetVariant = 'default' | 'map' | 'hybrid';

export interface WidgetCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Leading icon — rendered in the standard IconBadge. Defaults to primary tone. */
  icon?: React.ReactNode;
  iconTone?: IconBadgeTone;
  iconColor?: string;
  /** Right-aligned custom actions (buttons/legend). */
  actions?: React.ReactNode;
  /** Adds "View raw data" to the header ⋮ menu (opens a RawDataSheet). */
  onViewRawData?: () => void;
  /** Adds "Export" to the header ⋮ menu. Built-in print-to-PDF of the widget;
   *  pass a handler to override, or `false` to hide. Default enabled. */
  onExportWidget?: (() => void) | false;
  /** Filename used by the built-in Export (PDF). Defaults to the title. */
  exportFileName?: string;
  /** Renders an expand button in the header when set. */
  onExpand?: () => void;
  /** Divider line under the header. Default true. */
  divider?: boolean;
  variant?: WidgetVariant;
  /** `hybrid` only — the left side panel beside the map/children. */
  panel?: React.ReactNode;
  /** `hybrid` only — width of the side panel. Default 16rem. */
  panelWidth?: string;
  bodyPadding?: 'none' | 'sm' | 'md' | 'lg';
  bodyHeight?: number | string;
  children: React.ReactNode;
  className?: string;
}

const PADDING = { none: 'p-0', sm: 'p-2', md: 'p-4', lg: 'p-6' };

export function WidgetCard({
  title, subtitle, icon, iconTone = 'primary', iconColor, actions,
  onViewRawData, onExportWidget, exportFileName, onExpand, divider = true, variant = 'default', panel, panelWidth = '16rem',
  bodyPadding, bodyHeight, children, className,
}: WidgetCardProps) {
  const pad = bodyPadding ?? (variant === 'default' ? 'md' : 'none');
  const bodyStyle = bodyHeight ? { height: typeof bodyHeight === 'number' ? `${bodyHeight}px` : bodyHeight } : undefined;

  const sectionRef = React.useRef<HTMLElement>(null);
  const menuItems: WidgetMenuItem[] = [];
  if (onViewRawData) menuItems.push({ id: 'raw', label: 'View raw data', icon: <Icons.Table />, onClick: onViewRawData });
  if (onExportWidget !== false) {
    menuItems.push({
      id: 'export',
      label: 'Export',
      icon: <Icons.Download01 />,
      onClick: () => (typeof onExportWidget === 'function'
        ? onExportWidget()
        : exportNodeToPdf(sectionRef.current, { title: exportFileName ?? (typeof title === 'string' ? title : 'widget') })),
    });
  }

  return (
    <section ref={sectionRef} className={cn('flex w-full flex-col overflow-hidden rounded-lg border border-border bg-card', className)}>
      <header className={cn('flex items-center gap-3 px-4 py-3', divider && 'border-b border-border')}>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {icon ? <IconBadge icon={icon} tone={iconTone} color={iconColor} size={32} /> : null}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-body-sm font-semibold text-foreground">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-caption text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
        {menuItems.length ? <WidgetMenu items={menuItems} ariaLabel="Widget options" /> : null}
        {onExpand ? (
          <button
            type="button"
            onClick={onExpand}
            aria-label="Expand widget"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Maximize2 size={14} />
          </button>
        ) : null}
      </header>

      {variant === 'hybrid' ? (
        <div className="flex min-h-0 flex-1" style={bodyStyle}>
          <aside className="min-h-0 shrink-0 overflow-auto border-r border-border" style={{ width: panelWidth }}>
            {panel}
          </aside>
          <div className={cn('relative min-h-0 flex-1', PADDING[pad])}>{children}</div>
        </div>
      ) : (
        <div className={cn('flex min-h-0 w-full flex-1 flex-col', PADDING[pad], variant === 'map' && 'relative')} style={bodyStyle}>
          {children}
        </div>
      )}
    </section>
  );
}
