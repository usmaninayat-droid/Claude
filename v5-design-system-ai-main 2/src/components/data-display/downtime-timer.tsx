import * as React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * DowntimeTimer — the Truemax three-mode downtime display:
 *  1. `end` in the past   → static "Total Downtime" badge.
 *  2. `expectedEnd` set   → live ticker + progress bar vs expected (turns
 *                           red and stays full once elapsed > expected).
 *  3. open-ended          → "Asset Down For" continuous counter.
 */

export interface DowntimeTimerProps {
  /** Downtime start (Date or ISO string). */
  start: Date | string;
  /** Planned end — enables tracking mode with progress bar. */
  expectedEnd?: Date | string;
  /** Actual end — renders the static total. */
  end?: Date | string;
  className?: string;
}

const toDate = (d: Date | string) => (d instanceof Date ? d : new Date(d));

function fmtDuration(ms: number, withSeconds = false): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  parts.push(`${m}m`);
  if (withSeconds) parts.push(`${sec}s`);
  return parts.join(' ');
}

export function DowntimeTimer({ start, expectedEnd, end, className }: DowntimeTimerProps) {
  const startD = toDate(start);
  const endD = end ? toDate(end) : undefined;
  const expectedD = expectedEnd ? toDate(expectedEnd) : undefined;
  const finished = !!endD;

  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [finished]);

  /* Mode 1 — completed: static total. */
  if (endD) {
    return (
      <div className={cn('flex items-center gap-3 rounded-lg bg-muted px-4 py-3', className)}>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-muted-foreground">
          <Clock size={16} />
        </span>
        <div>
          <div className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
            Total Downtime
          </div>
          <div className="text-body-md font-semibold text-foreground">
            {fmtDuration(endD.getTime() - startD.getTime())}
          </div>
        </div>
      </div>
    );
  }

  const elapsedMs = now.getTime() - startD.getTime();

  /* Mode 2 — tracking vs expected: live ticker + progress. */
  if (expectedD) {
    const expectedMs = expectedD.getTime() - startD.getTime();
    const over = elapsedMs > expectedMs;
    const pct = Math.min(100, Math.max(0, (elapsedMs / Math.max(1, expectedMs)) * 100));
    return (
      <div className={cn('rounded-lg bg-destructive/5 px-4 py-3', className)}>
        <div className="flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-destructive" aria-hidden />
          <span className="text-caption font-semibold uppercase tracking-wide text-destructive">
            Downtime Tracking
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <span className="text-body-md font-semibold text-foreground">{fmtDuration(elapsedMs, true)}</span>
          <span className="text-caption text-muted-foreground">expected {fmtDuration(expectedMs)}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-destructive/15">
          <div
            className={cn('h-full rounded-full transition-[width]', over ? 'bg-destructive' : 'bg-destructive/60')}
            style={{ width: `${pct}%` }}
          />
        </div>
        {over ? (
          <div className="mt-1.5 text-caption font-medium text-destructive">
            Over expected by {fmtDuration(elapsedMs - expectedMs)}
          </div>
        ) : null}
      </div>
    );
  }

  /* Mode 3 — open-ended counter. */
  return (
    <div className={cn('flex items-center gap-3 rounded-lg bg-destructive/5 px-4 py-3', className)}>
      <span className="size-2 shrink-0 animate-pulse rounded-full bg-destructive" aria-hidden />
      <div>
        <div className="text-caption font-semibold uppercase tracking-wide text-destructive">Asset Down For</div>
        <div className="text-body-md font-semibold text-foreground">{fmtDuration(elapsedMs, true)}</div>
      </div>
    </div>
  );
}
