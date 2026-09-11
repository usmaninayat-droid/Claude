import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * StatePill — uppercase tracked state chip.
 *
 * Source of truth: `_unpacked/truemax/src/app/components/ticket-detail.tsx` STAGE_CONFIG.
 * Spec: `state-pill.spec.md` (co-located).
 *
 * Used in:
 *   - Pipeline Detail body, top-right of the title band (the active state)
 *   - List view "Status" column cells
 *   - Timeline events showing state transitions
 *
 * Color comes from the stage config — `bg` is the pill background, `text`
 * is the foreground (typically a darker shade of the same hue, but for
 * solid-colored stages it's white).
 */

export interface StatePillProps {
  /** Stage label — rendered UPPERCASE with letter-spacing. */
  label: string;
  /** Stage background color (from pipeline.stages[i].color). */
  bg: string;
  /** Optional text color override. Defaults to white. */
  text?: string;
  /** Optional size override. */
  size?: 'sm' | 'md';
  className?: string;
}

export function StatePill({ label, bg, text = '#FFFFFF', size = 'md', className }: StatePillProps) {
  const isSm = size === 'sm';
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md font-bold uppercase tracking-wider whitespace-nowrap',
        isSm ? 'h-6 px-2.5 text-[10px]' : 'h-7 px-3.5 text-[11px]',
        className,
      )}
      style={{
        background: bg,
        color: text,
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </span>
  );
}
