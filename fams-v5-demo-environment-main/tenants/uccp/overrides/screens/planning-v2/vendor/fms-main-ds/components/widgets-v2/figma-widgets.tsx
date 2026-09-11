import * as React from 'react';
import {
  Bell,
  AlertTriangle,
  MapPin,
  Clock,
  Truck,
  ChevronDown,
  Check,
  Flag,
  ShieldCheck,
  Hash,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '../utils/cn';

/* ════════════════════════════════════════════════════════════════════
   MetricCard — icon chip + label + value + trend (Figma "Metric Card").
   ════════════════════════════════════════════════════════════════════ */
export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  trendValue?: string;
  trendDirection?: 'up' | 'down';
  trendNote?: string;
}
export function MetricCard({
  label,
  value,
  icon,
  trendValue,
  trendDirection = 'up',
  trendNote = 'vs last month',
  className,
  ...rest
}: MetricCardProps) {
  const tColor = trendDirection === 'up' ? 'var(--status-success)' : 'var(--status-error)';
  const TIcon = trendDirection === 'up' ? TrendingUp : TrendingDown;
  return (
    <div className={cn('flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm', className)} {...rest}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-border bg-muted text-muted-foreground">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="truncate text-body-sm text-muted-foreground">{label}</div>
          <div className="text-h6 font-bold text-foreground">{value}</div>
        </div>
      </div>
      {trendValue && (
        <span className="flex shrink-0 items-center gap-1 text-body-sm">
          <TIcon className="size-4" style={{ color: tColor }} />
          <span className="font-semibold" style={{ color: tColor }}>{trendValue}</span>
          <span className="hidden text-muted-foreground sm:inline">{trendNote}</span>
        </span>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Stepper — vertical, states Default / Current / Completed.
   ════════════════════════════════════════════════════════════════════ */
export type StepState = 'default' | 'current' | 'completed';
export interface Step {
  label: string;
  text: string;
  state: StepState;
}
export function Stepper({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <div className={cn('flex flex-col', className)}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const lineColor = s.state === 'default' ? 'var(--fig-border-light)' : 'var(--fig-brand-normal)';
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              {s.state === 'current' ? (
                <span className="flex size-7 items-center justify-center rounded-full bg-primary ring-4 ring-secondary">
                  <span className="size-2.5 rounded-full bg-white" />
                </span>
              ) : s.state === 'completed' ? (
                <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-primary">
                  <Check className="size-4" />
                </span>
              ) : (
                <span className="size-7 rounded-full border-2 border-border bg-card" />
              )}
              {!last && <span className="my-1 w-0.5 flex-1" style={{ background: lineColor, minHeight: 28 }} />}
            </div>
            <div className={cn('pb-6', last && 'pb-0')}>
              <div className={cn('text-caption font-bold uppercase tracking-wide', s.state === 'current' ? 'text-primary' : 'text-muted-foreground')}>
                {s.label}
              </div>
              <div className={cn('text-body-sm', s.state === 'default' ? 'text-muted-foreground' : 'text-foreground', s.state === 'current' && 'font-semibold')}>
                {s.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   NotificationCard — bell + title + meta chips + time + read/unread.
   ════════════════════════════════════════════════════════════════════ */
type ChipTone = 'neutral' | 'critical' | 'warning' | 'info';
export interface NotifChip {
  label: string;
  tone?: ChipTone;
  icon?: React.ReactNode;
}
const CHIP_STYLES: Record<ChipTone, string> = {
  neutral: 'border-border text-muted-foreground',
  critical: 'border-error-200 text-error-600',
  warning: 'border-warning-200 text-warning-700',
  info: 'border-fams-200 text-primary',
};
export interface NotificationCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  chips?: NotifChip[];
  time?: string;
  unread?: boolean;
  onClear?: () => void;
}
export function NotificationCard({
  title,
  description,
  chips = [],
  time,
  unread = false,
  onClear,
  className,
  ...rest
}: NotificationCardProps) {
  return (
    <div
      className={cn(
        'group flex gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted',
        unread ? 'bg-card' : 'bg-muted/40',
        className,
      )}
      {...rest}
    >
      <span className={cn('mt-0.5 shrink-0', unread ? 'text-primary' : 'text-muted-foreground')}>
        <Bell className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h4 className={cn('text-body-md', unread ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground')}>{title}</h4>
          <div className="flex shrink-0 items-center gap-2">
            {unread && <span className="size-2 rounded-full bg-primary" />}
            <span className="text-caption text-muted-foreground">{time}</span>
          </div>
        </div>
        {description && <p className="mt-0.5 text-body-sm text-muted-foreground">{description}</p>}
        {chips.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {chips.map((c, i) => (
              <span key={i} className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-caption font-medium', CHIP_STYLES[c.tone ?? 'neutral'])}>
                {c.icon}
                {c.label}
              </span>
            ))}
            {onClear && (
              <button onClick={onClear} className="ml-auto hidden items-center gap-1 text-caption font-semibold text-primary group-hover:inline-flex">
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Convenience: the standard FAMS notification meta chips. */
export const SAMPLE_NOTIF_CHIPS: NotifChip[] = [
  { label: 'FM-882', tone: 'neutral', icon: <Hash className="size-3" /> },
  { label: 'Critical', tone: 'critical', icon: <Flag className="size-3" /> },
  { label: 'Today', tone: 'warning', icon: <Clock className="size-3" /> },
  { label: 'CCMS', tone: 'neutral', icon: <ShieldCheck className="size-3" /> },
];

/* ════════════════════════════════════════════════════════════════════
   EventLogCard — alarm + title + status + vehicle/driver + footer.
   ════════════════════════════════════════════════════════════════════ */
export type EventLogState = 'default' | 'hover' | 'selected';
export interface EventLogCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  status?: string;
  vehicle?: string;
  driver?: string;
  location?: string;
  time?: string;
  state?: EventLogState;
}
export function EventLogCard({
  title,
  status = 'STATUS',
  vehicle,
  driver,
  location,
  time,
  state = 'default',
  className,
  ...rest
}: EventLogCardProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-card transition-colors',
        state === 'selected' ? 'border-l-4 border-l-primary border-border bg-secondary/40' : 'border-border',
        state === 'hover' && 'bg-muted',
        'hover:bg-muted',
        className,
      )}
      {...rest}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-error-50 text-destructive">
            <AlertTriangle className="size-4" />
          </span>
          <h4 className="text-body-md font-bold text-foreground">{title}</h4>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-destructive px-2.5 py-1 text-caption font-bold text-white">
          <AlertTriangle className="size-3" />
          {status}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 pb-3 text-body-sm text-foreground">
        {vehicle && (
          <span className="flex items-center gap-1.5"><Truck className="size-4 text-muted-foreground" />{vehicle}</span>
        )}
        {driver && (
          <span className="flex items-center gap-1.5">
            <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-caption font-semibold text-primary">
              {driver.slice(0, 1)}
            </span>
            {driver}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-body-sm text-muted-foreground">
        <span className="flex items-center gap-1.5"><MapPin className="size-4" />{location}</span>
        <span className="flex items-center gap-1.5"><Clock className="size-4" />{time}</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   UserRoleCard — checkbox + avatar + title + app pills.
   ════════════════════════════════════════════════════════════════════ */
export function UserRoleCard({
  title,
  apps,
  className,
}: {
  title: string;
  apps: string[];
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border border-border bg-card p-4', className)}>
      <span className="size-5 shrink-0 rounded border-2 border-border" />
      <span className="size-9 shrink-0 rounded-full border-2 border-border bg-muted" />
      <div className="min-w-0">
        <div className="text-body-md font-semibold text-foreground">{title}</div>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {apps.map((a) => (
            <span key={a} className="rounded-full border border-border px-2.5 py-0.5 text-caption text-muted-foreground">{a}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   KpiSelectionCard — number badge + title + subtitle + expandable details.
   ════════════════════════════════════════════════════════════════════ */
export interface KpiSelectionCardProps {
  number: string;
  title: string;
  subtitle?: string;
  tag?: string;
  details?: { label: string; text: string }[];
  defaultOpen?: boolean;
  className?: string;
}
export function KpiSelectionCard({
  number,
  title,
  subtitle,
  tag,
  details,
  defaultOpen = false,
  className,
}: KpiSelectionCardProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-caption font-bold text-primary">{number}</span>
        <div className="min-w-0 flex-1">
          <div className="text-body-md font-semibold text-foreground">{title}</div>
          {subtitle && <div className="text-body-sm text-muted-foreground">{subtitle}</div>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {tag && <span className="text-caption font-medium text-warning-600">{tag}</span>}
          {details && details.length > 0 && (
            <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-caption font-semibold text-primary">
              {open ? 'VIEW LESS' : 'VIEW MORE'}
              <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
            </button>
          )}
        </div>
      </div>
      {open && details && (
        <div className="mt-3 space-y-1.5 rounded-lg bg-muted p-3 text-body-sm">
          {details.map((d) => (
            <p key={d.label} className="text-muted-foreground">
              <span className="font-semibold italic text-foreground">{d.label}:</span> {d.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
