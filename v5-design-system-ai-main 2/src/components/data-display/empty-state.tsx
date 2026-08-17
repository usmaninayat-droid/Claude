import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * EmptyState — a reusable "no data / no results" placeholder (Tadweer IWMP-CCMS
 * empty-state frames). A centered token-driven illustration + title + optional
 * description + optional action. Drop it inside a chart card, table body, map
 * pane, or list when there's nothing to show.
 *
 * Variants ship built-in illustrations (`no-data`, `no-results`, `no-map`); pass
 * a custom `illustration` node to override. Colors are tokens only, so it adapts
 * to any theme.
 */

export type EmptyStateVariant = 'no-data' | 'no-results' | 'no-map';

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  illustration?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

/* muted, tasteful line illustrations (token colors only) */
function NoDataArt({ size }: { size: number }) {
  const s = size;
  return (
    <svg width={s} height={s * 0.82} viewBox="0 0 120 98" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* soft blob */}
      <ellipse cx="60" cy="86" rx="42" ry="6" fill="var(--muted)" />
      {/* monitor */}
      <rect x="24" y="20" width="72" height="50" rx="6" fill="var(--card)" stroke="var(--border)" strokeWidth="2.5" />
      {/* bars */}
      <rect x="40" y="48" width="8" height="12" rx="2" fill="color-mix(in srgb, var(--primary) 35%, var(--muted))" />
      <rect x="54" y="40" width="8" height="20" rx="2" fill="var(--primary)" />
      <rect x="68" y="44" width="8" height="16" rx="2" fill="color-mix(in srgb, var(--primary) 35%, var(--muted))" />
      {/* stand */}
      <rect x="52" y="70" width="16" height="8" rx="2" fill="var(--muted)" />
      <rect x="44" y="78" width="32" height="4" rx="2" fill="var(--muted)" />
      {/* gear badge */}
      <circle cx="34" cy="24" r="11" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
      <path d="M34 19.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zm0 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" fill="color-mix(in srgb, var(--primary) 60%, var(--muted))" />
    </svg>
  );
}
function NoResultsArt({ size }: { size: number }) {
  const s = size;
  return (
    <svg width={s} height={s * 0.82} viewBox="0 0 120 98" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <ellipse cx="60" cy="86" rx="40" ry="6" fill="var(--muted)" />
      <circle cx="52" cy="42" r="24" fill="var(--card)" stroke="var(--border)" strokeWidth="2.5" />
      <circle cx="52" cy="42" r="13" fill="color-mix(in srgb, var(--primary) 10%, var(--card))" />
      <rect x="68" y="58" width="20" height="7" rx="3.5" transform="rotate(45 68 58)" fill="var(--muted-foreground)" />
    </svg>
  );
}
function NoMapArt({ size }: { size: number }) {
  const s = size;
  return (
    <svg width={s} height={s * 0.82} viewBox="0 0 120 98" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <ellipse cx="60" cy="86" rx="40" ry="6" fill="var(--muted)" />
      <path d="M40 26l16-6 24 8 0 44-24-8-16 6z" fill="var(--card)" stroke="var(--border)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M56 20v46M64 28v44" stroke="var(--border)" strokeWidth="2" />
      <path d="M66 40c0-6 5-10 10-10s10 4 10 10c0 7-10 16-10 16s-10-9-10-16z" fill="color-mix(in srgb, var(--primary) 18%, var(--card))" stroke="var(--primary)" strokeWidth="2" />
      <circle cx="76" cy="40" r="3" fill="var(--primary)" />
    </svg>
  );
}

const DEFAULT_COPY: Record<EmptyStateVariant, { title: string; art: (p: { size: number }) => React.ReactNode }> = {
  'no-data': { title: 'No Data', art: NoDataArt },
  'no-results': { title: 'No results found', art: NoResultsArt },
  'no-map': { title: 'Nothing to show on the map', art: NoMapArt },
};

export function EmptyState({
  variant = 'no-data', illustration, title, description, action, size = 'md', className,
}: EmptyStateProps) {
  const def = DEFAULT_COPY[variant];
  const artSize = size === 'sm' ? 84 : 120;
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-10 text-center', className)}>
      <div className="opacity-90">{illustration ?? def.art({ size: artSize })}</div>
      <p className="mt-1 text-body-sm font-semibold text-muted-foreground">{title ?? def.title}</p>
      {description && <p className="max-w-xs text-body-xs text-muted-foreground/80">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
