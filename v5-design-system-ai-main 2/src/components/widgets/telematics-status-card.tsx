import * as React from 'react';
import { Radio } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * TelematicsStatusCard — Reporting / Not Reporting status indicator.
 *
 * Spec: `telematics-status-card.spec.md`.
 *
 * Production usage:
 *   - Asset Profile Overview tab (Web Portal `30212:22617`) — top widget row
 *   - Fuel Monitoring Dashboard — reporting-status indicators per asset
 *   - Live Monitoring module — device connection status
 *
 * Visual:
 *   ┌────────────────────────────────────────────────┐
 *   │ 📡 Telematics                Last 5 min ago    │
 *   │    ● Reporting                                  │
 *   └────────────────────────────────────────────────┘
 *
 * The status dot pulses on `pending`; static on `reporting` / `not-reporting`.
 */

export type TelematicsStatus = 'reporting' | 'not-reporting' | 'pending';

const STATUS_CONFIG: Record<TelematicsStatus, {
  label: string;
  color: string;
  pulsing: boolean;
}> = {
  reporting:     { label: 'Reporting',     color: 'var(--chart-accent-green)',  pulsing: false },
  'not-reporting': { label: 'Not Reporting', color: 'var(--chart-accent-red)', pulsing: false },
  pending:       { label: 'Pending',       color: 'var(--chart-accent-orange)', pulsing: true  },
};

export interface TelematicsStatusCardProps {
  /** Header label (top-left). Default "Telematics". */
  label?: React.ReactNode;
  /** Optional leading icon. Default <Radio>. */
  icon?: React.ReactNode;
  /** Status state. */
  status: TelematicsStatus;
  /** Override the displayed status label (defaults from STATUS_CONFIG). */
  statusLabel?: React.ReactNode;
  /** Right-aligned timestamp / metadata (e.g. "Last 5 min ago"). */
  timestamp?: React.ReactNode;
  /** Optional sub-label below the status (e.g. coordinates / device ID). */
  subtitle?: React.ReactNode;
  /** Click handler — typically opens a detail tab with telematics history. */
  onClick?: () => void;
  className?: string;
}

export function TelematicsStatusCard({
  label = 'Telematics',
  icon,
  status,
  statusLabel,
  timestamp,
  subtitle,
  onClick,
  className,
}: TelematicsStatusCardProps) {
  const cfg = STATUS_CONFIG[status];
  const DefaultIcon = <Radio size={20} className="text-primary" />;
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-card p-3',
        onClick && 'cursor-pointer transition-colors hover:bg-muted/40',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary" aria-hidden>
        {icon ?? DefaultIcon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-caption font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span
            className={cn('inline-flex size-2 shrink-0 rounded-full', cfg.pulsing && 'animate-pulse')}
            style={{ background: cfg.color }}
            aria-hidden
          />
          <span className="text-body-md font-semibold" style={{ color: cfg.color }}>
            {statusLabel ?? cfg.label}
          </span>
        </div>
        {subtitle ? (
          <span className="mt-0.5 text-caption text-muted-foreground">{subtitle}</span>
        ) : null}
      </div>
      {timestamp ? (
        <span className="shrink-0 text-caption text-muted-foreground">{timestamp}</span>
      ) : null}
    </div>
  );
}
