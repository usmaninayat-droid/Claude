import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * DowntimeBadge — 3-scenario live-tick badge.
 *
 * Source of truth: `_unpacked/truemax/src/app/components/kanban-card.tsx` ~line 162.
 * Spec: `downtime-badge.spec.md` (co-located).
 *
 * Renders one of three visual states based on the relationship of
 * `start`, `end`, and `now`:
 *
 *   1. END IN PAST          → resolved (gray bg + clock outline, static duration)
 *   2. END TODAY/FUTURE     → active w/ ETA (red 6% bg + pulsing red dot, live tick / expected)
 *   3. NO END SET           → open-ended (red 6% bg + pulsing red dot, live elapsed)
 *
 * Live tick: 1s setInterval re-renders the active+open variants.
 */

export interface DowntimeBadgeProps {
  /** ISO timestamp or `parseDateString`-compatible date. */
  start: string;
  /** ISO timestamp; omit for open-ended. */
  end?: string;
  className?: string;
}

function parseLooseDate(s: string): Date | null {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function fmtCompact(ms: number): string {
  if (ms <= 0) return '0h 0m';
  const totalMins = Math.floor(ms / 60000);
  const totalHrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (totalHrs >= 24) {
    const days = Math.floor(totalHrs / 24);
    const hrs = totalHrs % 24;
    return `${days}d ${hrs}h ${mins}m`;
  }
  return `${totalHrs}h ${mins}m`;
}

function fmtLive(ms: number): string {
  if (ms <= 0) return '0h 0m 0s';
  const totalSecs = Math.floor(ms / 1000);
  const totalMins = Math.floor(totalSecs / 60);
  const totalHrs = Math.floor(totalMins / 60);
  const secs = totalSecs % 60;
  const mins = totalMins % 60;
  if (totalHrs >= 24) {
    const days = Math.floor(totalHrs / 24);
    const hrs = totalHrs % 24;
    return `${days}d ${hrs}h ${mins}m ${secs}s`;
  }
  return `${totalHrs}h ${mins}m ${secs}s`;
}

export function DowntimeBadge({ start, end, className }: DowntimeBadgeProps) {
  const [now, setNow] = React.useState(() => new Date());
  const startDate = parseLooseDate(start);
  const endDate = end ? parseLooseDate(end) : null;
  const isEndInPast = endDate ? endDate.getTime() < new Date().getTime() : false;
  const isEndFutureOrToday = endDate ? endDate.getTime() >= new Date().getTime() : false;
  const isOpenEnded = !endDate;
  const needsLiveTick = isEndFutureOrToday || isOpenEnded;

  React.useEffect(() => {
    if (!needsLiveTick || !startDate) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [needsLiveTick, start, end]);

  if (!startDate) return null;

  // Scenario 1 — resolved
  if (isEndInPast && endDate) {
    const duration = fmtCompact(endDate.getTime() - startDate.getTime());
    return (
      <div
        className={cn(
          'inline-flex w-full items-center gap-1.5 rounded px-2 py-1 bg-muted',
          className,
        )}
        role="status"
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
          <circle cx="8" cy="8" r="6" stroke="var(--muted-foreground)" strokeWidth="1.33" />
          <path d="M8 5v3l2 1.5" stroke="var(--muted-foreground)" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[10px] font-semibold tracking-wide text-muted-foreground">
          DOWNTIME · {duration}
        </span>
      </div>
    );
  }

  // Scenario 2 — active w/ ETA
  if (isEndFutureOrToday && endDate) {
    const elapsedMs = Math.max(0, now.getTime() - startDate.getTime());
    const expectedMs = Math.max(0, endDate.getTime() - startDate.getTime());
    return (
      <div
        className={cn(
          'inline-flex w-full items-center gap-1.5 rounded px-2 py-1',
          className,
        )}
        style={{ background: 'rgba(240,68,56,0.06)' }}
        role="status"
        aria-live="polite"
      >
        <span
          className="block size-1.5 shrink-0 rounded-full animate-pulse"
          style={{ background: 'var(--destructive)' }}
          aria-hidden
        />
        <span className="text-[10px] font-semibold tabular-nums text-destructive">
          DOWNTIME ACTIVE · {fmtLive(elapsedMs)}
          <span className="text-muted-foreground"> / </span>
          <span className="text-muted-foreground">{fmtCompact(expectedMs)}</span>
        </span>
      </div>
    );
  }

  // Scenario 3 — open-ended
  if (isOpenEnded) {
    const elapsedMs = Math.max(0, now.getTime() - startDate.getTime());
    return (
      <div
        className={cn(
          'inline-flex w-full items-center gap-1.5 rounded px-2 py-1',
          className,
        )}
        style={{ background: 'rgba(240,68,56,0.06)' }}
        role="status"
        aria-live="polite"
      >
        <span
          className="block size-1.5 shrink-0 rounded-full animate-pulse"
          style={{ background: 'var(--destructive)' }}
          aria-hidden
        />
        <span className="text-[10px] font-semibold tabular-nums text-destructive">
          DOWNTIME ACTIVE · {fmtLive(elapsedMs)}
        </span>
      </div>
    );
  }

  return null;
}
