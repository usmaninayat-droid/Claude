import * as React from 'react';
import {
  Check,
  Minus,
  TrendingUp,
  TrendingDown,
  Pencil,
  Trash2,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Badge } from '../primitives/badge';
import { Checkbox } from '../primitives/checkbox';
import { Switch } from '../primitives/switch';
import { Avatar } from '../primitives/avatar';
import { Progress } from '../primitives/progress';
import { Button } from '../primitives/button';

/**
 * 16-type cell system (V2 Pattern #16 → list table chassis):
 * default | empty | checkbox | single-badge | multi-badges | toggle |
 * compliance | action-buttons | group-title | group-divider | progress |
 * trend-positive | trend-negative | activity | start-end-time | tab-actions
 *
 * Renderer maps `kind` → component. Each TableCell accepts a `value` whose shape
 * depends on `kind`.
 */
export type TableCellKind =
  | 'default'
  | 'empty'
  | 'checkbox'
  | 'single-badge'
  | 'multi-badges'
  | 'toggle'
  | 'compliance'
  | 'action-buttons'
  | 'group-title'
  | 'group-divider'
  | 'progress'
  | 'trend-positive'
  | 'trend-negative'
  | 'activity'
  | 'start-end-time'
  | 'tab-actions'
  | 'avatar'
  | 'avatar-stack';

export interface TableCellProps {
  kind?: TableCellKind;
  value?: unknown;
  className?: string;
  align?: 'left' | 'center' | 'right';
  onClick?: () => void;
}

export function TableCell({ kind = 'default', value, className, align = 'left', onClick }: TableCellProps) {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  const v: any = value;
  switch (kind) {
    case 'empty':
      return <td className={cn('px-3 py-2 text-muted-foreground', alignClass, className)}>—</td>;

    case 'checkbox':
      return (
        <td className={cn('px-3 py-2', alignClass, className)}>
          <Checkbox checked={!!v?.checked} onCheckedChange={v?.onChange} />
        </td>
      );

    case 'single-badge':
      return (
        <td className={cn('px-3 py-2', alignClass, className)}>
          <Badge variant={v?.variant ?? 'secondary'} color={v?.color}>{v?.label}</Badge>
        </td>
      );

    case 'multi-badges':
      return (
        <td className={cn('px-3 py-2', alignClass, className)}>
          <div className="flex flex-wrap gap-1">
            {(v ?? []).map((b: any, i: number) => (
              <Badge key={i} variant={b.variant ?? 'secondary'} color={b.color}>{b.label}</Badge>
            ))}
          </div>
        </td>
      );

    case 'toggle':
      return (
        <td className={cn('px-3 py-2', alignClass, className)}>
          <Switch checked={!!v?.checked} onCheckedChange={v?.onChange} />
        </td>
      );

    case 'compliance': {
      const pct = Math.max(0, Math.min(100, Number(v?.percent ?? 0)));
      const colorVar = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error';
      const colorCss = `var(--status-${colorVar})`;
      return (
        <td className={cn('px-3 py-2', alignClass, className)}>
          <div className="flex items-center gap-2">
            <Progress value={pct} indicatorClassName={`bg-[color:var(--status-${colorVar})]`} />
            <span className="text-caption tabular-nums" style={{ color: colorCss }}>{pct}%</span>
          </div>
        </td>
      );
    }

    case 'progress':
      return (
        <td className={cn('px-3 py-2', alignClass, className)}>
          <div className="flex items-center gap-2">
            <Progress value={Number(v?.percent ?? 0)} />
            <span className="text-caption tabular-nums text-muted-foreground">{Number(v?.percent ?? 0)}%</span>
          </div>
        </td>
      );

    case 'action-buttons':
      return (
        <td className={cn('px-3 py-2', alignClass, className)}>
          <div className="flex items-center justify-end gap-1">
            {(v ?? []).map((a: any, i: number) => (
              <Button key={i} variant="ghost" size="icon" onClick={a.onClick} title={a.label} aria-label={a.label}>
                {a.icon === 'view' ? <Eye className="size-4" /> :
                 a.icon === 'edit' ? <Pencil className="size-4" /> :
                 a.icon === 'delete' ? <Trash2 className="size-4 text-destructive" /> :
                 a.icon}
              </Button>
            ))}
          </div>
        </td>
      );

    case 'group-title':
      return (
        <td colSpan={v?.colSpan ?? 1} className={cn('bg-muted px-3 py-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground', className)}>
          {v?.label}
        </td>
      );

    case 'group-divider':
      return (
        <td colSpan={v?.colSpan ?? 1} className={cn('h-px bg-border p-0', className)} aria-hidden />
      );

    case 'trend-positive':
      return (
        <td className={cn('px-3 py-2', alignClass, className)}>
          <span className="inline-flex items-center gap-1 text-[color:var(--status-success)] tabular-nums">
            <TrendingUp className="size-3.5" /> {v?.label ?? v}
          </span>
        </td>
      );

    case 'trend-negative':
      return (
        <td className={cn('px-3 py-2', alignClass, className)}>
          <span className="inline-flex items-center gap-1 text-[color:var(--status-error)] tabular-nums">
            <TrendingDown className="size-3.5" /> {v?.label ?? v}
          </span>
        </td>
      );

    case 'activity':
      return (
        <td className={cn('px-3 py-2', alignClass, className)}>
          <span className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
            <span className={cn(
              'inline-block size-2 rounded-full',
              v?.state === 'active' ? 'bg-[color:var(--status-success)] animate-pulse' :
              v?.state === 'idle' ? 'bg-[color:var(--gray-400)]' :
              v?.state === 'error' ? 'bg-[color:var(--status-error)]' : 'bg-[color:var(--status-info)]'
            )} />
            {v?.label}
          </span>
        </td>
      );

    case 'start-end-time':
      return (
        <td className={cn('px-3 py-2', alignClass, className)}>
          <div className="flex flex-col gap-0.5 text-caption">
            <span className="text-foreground tabular-nums">{v?.start}</span>
            <span className="text-muted-foreground tabular-nums">{v?.end}</span>
          </div>
        </td>
      );

    case 'tab-actions':
      return (
        <td className={cn('px-3 py-2', alignClass, className)}>
          <div className="flex items-center gap-2">
            {(v ?? []).map((tab: any, i: number) => (
              <button
                key={i}
                onClick={tab.onClick}
                className={cn(
                  'text-caption underline-offset-2 hover:underline',
                  tab.active ? 'text-primary font-medium' : 'text-muted-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </td>
      );

    case 'avatar':
      return (
        <td className={cn('px-3 py-2', alignClass, className)}>
          <div className="flex items-center gap-2">
            <Avatar size="sm" src={v?.src} alt={v?.label} fallback={v?.fallback} />
            <span className="text-body-sm text-foreground">{v?.label}</span>
          </div>
        </td>
      );

    case 'avatar-stack':
      return (
        <td className={cn('px-3 py-2', alignClass, className)}>
          <div className="flex -space-x-2">
            {(v ?? []).slice(0, 3).map((a: any, i: number) => (
              <Avatar key={i} size="sm" src={a.src} alt={a.label} fallback={a.fallback} className="ring-2 ring-card" />
            ))}
            {Array.isArray(v) && v.length > 3 ? (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-muted px-1.5 text-caption text-muted-foreground">+{v.length - 3}</span>
            ) : null}
          </div>
        </td>
      );

    case 'default':
    default:
      return (
        <td className={cn('px-3 py-2 text-body-sm text-foreground', alignClass, className)} onClick={onClick}>
          {v == null || v === '' ? <span className="text-muted-foreground">—</span> : String(v)}
        </td>
      );
  }
}
