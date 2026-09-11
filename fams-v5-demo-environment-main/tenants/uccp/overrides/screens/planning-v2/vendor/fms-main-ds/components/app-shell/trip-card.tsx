import * as React from 'react';
import { cn } from '../utils/cn';
import { StatePill } from '../data-display';
import type { MonitoringEntity } from './types';

/**
 * TripCard — the list-item card for the live-monitoring **trip-card list
 * variant** (`MonitoringModuleData.listVariant === 'trip'`). Genuinely new
 * (not a fork of `FleetRow`) — reuses `MonitoringEntity`'s existing
 * `title`/`image`/`avatarFallback` fields plus the new optional trip fields
 * (`statusTone`/`dateTime`/`plate`/`driver`/`metricChips`/`segments`).
 *
 * Anatomy (Trip Management spec, shared across all 3 skins):
 *   Row1  id/title · date-time · status pill
 *   Row2  vehicle thumb + plate · driver avatar + name · right-aligned metric chips
 *   Row3  multi-leg progress (green done / muted pending; one flat muted bar when N/A)
 *
 * Domain-agnostic: no "Vehicle"/"Trip"/"Driver" strings are baked in here —
 * every label is DATA the block supplies (`title`, `plate`, `driver.name`,
 * `metricChips[].value`, …); this component only lays out whatever is given.
 */
export interface TripCardProps {
  entity: MonitoringEntity;
  /** Resolved status colour for the pill background (caller's status→color map, e.g. the
   *  `STATUS_HEX` bridge in `live-monitoring-view.tsx`) — used when `entity.statusTone` is unset. */
  statusColor: string;
  selected: boolean;
  onClick: () => void;
}

export function TripCard({ entity, statusColor, selected, onClick }: TripCardProps) {
  const segments = entity.segments?.length ? entity.segments : [{ done: false }];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'mx-2 my-1.5 flex w-[calc(100%-1rem)] flex-col gap-2 rounded-lg border p-3 text-left outline-none transition-colors',
        selected ? 'border-primary bg-secondary/40 shadow-[inset_3px_0_0_var(--primary)]' : 'border-border bg-card hover:bg-muted/40'
      )}
    >
      {/* Row1 — id + date/time + status pill */}
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-body-sm font-semibold text-foreground">{entity.title}</span>
        <span className="flex shrink-0 items-center gap-2">
          {entity.dateTime ? <span className="whitespace-nowrap text-caption text-muted-foreground">{entity.dateTime}</span> : null}
          {entity.statusLabel ? <StatePill label={entity.statusLabel} bg={entity.statusTone ?? statusColor} size="sm" /> : null}
        </span>
      </div>

      {/* Row2 — vehicle thumb/plate · driver avatar/name · metric chips */}
      <div className="flex items-center gap-2">
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          {entity.image ? (
            <img src={entity.image} alt="" loading="lazy" className="size-6 shrink-0 rounded object-cover" />
          ) : entity.avatarFallback ? (
            <span className="grid size-6 shrink-0 place-items-center rounded bg-secondary text-caption font-semibold text-primary">
              {entity.avatarFallback}
            </span>
          ) : null}
          {entity.plate ? <span className="shrink-0 text-caption font-medium text-muted-foreground">{entity.plate}</span> : null}
          {entity.driver ? (
            <span className="ml-1 flex min-w-0 items-center gap-1.5">
              {entity.driver.avatar ? (
                <img src={entity.driver.avatar} alt="" loading="lazy" className="size-6 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-caption font-semibold text-primary">
                  {String(entity.driver.name).slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="truncate text-caption font-medium text-foreground">{entity.driver.name}</span>
            </span>
          ) : null}
        </span>
        {entity.metricChips?.length ? (
          <span className="flex shrink-0 items-center gap-2.5">
            {entity.metricChips.map((c, i) => {
              const Icon = c.icon;
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 whitespace-nowrap text-caption font-medium"
                  style={{ color: c.tone ?? 'var(--muted-foreground)' }}
                >
                  <Icon size={12} />
                  {c.value}
                </span>
              );
            })}
          </span>
        ) : null}
      </div>

      {/* Row3 — multi-leg progress (green done / muted pending; one flat muted bar = N/A) */}
      <div className="flex items-center gap-1">
        {segments.map((seg, i) => (
          <span
            key={i}
            aria-hidden
            className="h-1.5 flex-1 rounded-full bg-muted"
            style={seg.done ? { background: 'var(--status-success)' } : undefined}
          />
        ))}
      </div>
    </button>
  );
}
