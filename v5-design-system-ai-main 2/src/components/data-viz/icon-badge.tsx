import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * IconBadge — the ONE standard icon container used in every chart-card header,
 * KPI tile, and dashboard widget header. An icon sits in a circular tinted disc
 * whose color is driven by a semantic `tone` (or an explicit `color`). This
 * keeps every header icon consistent instead of ad-hoc colors/shapes/bgs.
 */
export type IconBadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';

const TONE_COLOR: Record<IconBadgeTone, string> = {
  primary: 'var(--primary)',
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  danger: 'var(--status-error)',
  info: 'var(--status-info)',
  purple: 'var(--chart-4)',
  neutral: 'var(--muted-foreground)',
};

export interface IconBadgeProps {
  icon: React.ReactNode;
  /** Semantic color. Ignored if `color` is set. Default 'primary'. */
  tone?: IconBadgeTone;
  /** Explicit accent color (token or hex) — overrides `tone`. */
  color?: string;
  /** Pixel size of the disc. Default 36. */
  size?: number;
  /** Disc shape — circle (default) or rounded square. */
  shape?: 'circle' | 'square';
  className?: string;
}

export function IconBadge({ icon, tone = 'primary', color, size = 36, shape = 'circle', className }: IconBadgeProps) {
  const c = color ?? TONE_COLOR[tone];
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center', shape === 'circle' ? 'rounded-full' : 'rounded-lg', className)}
      style={{ width: size, height: size, background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c }}
    >
      {icon}
    </span>
  );
}
