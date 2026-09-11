import * as React from 'react';
import { cn } from '../utils/cn';

/* ════════════════════════════════════════════════════════════════════
   Logo — FAMS / Tadweer, faithful to the Figma "Basics → Logo" component.
   Assets live in /public/logos and are imported as bundled, hashed URLs so
   the logo resolves regardless of host root. (Absolute `/logos/...` paths
   only resolve when the DS itself is the dev-server root; a PRODUCT consuming
   the DS via `@ds` has its own root, so those paths 404 — hence this glob,
   resolved relative to THIS module, the same pattern as the asset-vector
   registry. Products reuse the DS logo with zero copies.)
   ════════════════════════════════════════════════════════════════════ */
const LOGO_ASSETS = import.meta.glob('../../../public/logos/*.{svg,png}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Resolve a logo file to its bundled URL, falling back to the absolute path. */
function logoSrc(file: string): string {
  const hit = Object.entries(LOGO_ASSETS).find(([path]) => path.endsWith(`/${file}`));
  return hit?.[1] ?? `/logos/${file}`;
}

export type LogoBrand = 'fams' | 'tadweer';
export type LogoVariant = 'full' | 'icon';
export type LogoTone = 'default' | 'white';

export interface LogoProps extends React.HTMLAttributes<HTMLImageElement> {
  brand?: LogoBrand;
  variant?: LogoVariant;
  tone?: LogoTone;
  height?: number;
}

export function Logo({
  brand = 'fams',
  variant = 'full',
  tone = 'default',
  height = 40,
  className,
  ...rest
}: LogoProps) {
  const src =
    variant === 'icon'
      ? logoSrc(`${brand}-icon.svg`)
      : logoSrc(`${brand}-${tone}.png`);
  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img
      src={src}
      alt={`${brand} logo`}
      style={{ height }}
      className={cn('inline-block w-auto max-w-full select-none object-contain', className)}
      {...rest}
    />
  );
}

/* ════════════════════════════════════════════════════════════════════
   CalendarCell — Figma "Basics → _Calendar cell".
   Type: Default | Today | Selected | Active   ×   State: Default | Hover | Disabled
   ════════════════════════════════════════════════════════════════════ */
export type CalendarCellType = 'default' | 'today' | 'selected' | 'active';
export type CalendarCellState = 'default' | 'hover' | 'disabled';

export interface CalendarCellProps extends React.HTMLAttributes<HTMLButtonElement> {
  day: number | string;
  type?: CalendarCellType;
  state?: CalendarCellState;
}

export function CalendarCell({
  day,
  type = 'default',
  state = 'default',
  className,
  ...rest
}: CalendarCellProps) {
  const disabled = state === 'disabled';
  const active = type === 'active';

  let bg = 'transparent';
  let fg = 'var(--fig-text-darker)';
  if (active) {
    bg = state === 'hover' ? 'var(--fig-brand-darkest)' : 'var(--fig-brand-normal)';
    fg = '#fff';
  } else if (type === 'selected') {
    bg = 'var(--fig-surface-secondary)';
    fg = 'var(--fig-brand-normal)';
  } else if (state === 'hover') {
    bg = 'var(--fig-surface-minimal)';
  }
  if (disabled) fg = 'var(--fig-neutral-light)';

  // status dot under the number (today / active carry a dot in the Figma cell)
  const showDot = type === 'today' || type === 'active';
  const dotColor = active ? '#fff' : disabled ? 'var(--fig-neutral-light)' : 'var(--fig-brand-normal)';

  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={type === 'today' ? 'date' : undefined}
      className={cn(
        'relative flex size-10 flex-col items-center justify-center rounded-full text-body-sm font-medium transition-colors',
        disabled && 'cursor-not-allowed',
        className,
      )}
      style={{ backgroundColor: bg, color: fg }}
      {...rest}
    >
      <span className="leading-none">{day}</span>
      {showDot && (
        <span
          className="absolute bottom-1.5 size-1 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      )}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════
   DatePickerListItem — Figma "Basics → _Date picker list item".
   ════════════════════════════════════════════════════════════════════ */
export interface DatePickerListItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  label: string;
  selected?: boolean;
}

export function DatePickerListItem({
  label,
  selected = false,
  className,
  ...rest
}: DatePickerListItemProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-10 w-40 items-center rounded-md px-3 text-body-sm font-medium transition-colors',
        selected
          ? 'bg-[var(--fig-surface-secondary)] text-[var(--fig-brand-normal)]'
          : 'bg-[var(--fig-surface-minimal)] text-[var(--fig-text-darker)] hover:bg-[var(--fig-neutral-lighter)]',
        className,
      )}
      {...rest}
    >
      {label}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SkeletonLoader — Figma "Basics → Skeleton Loader".
   ════════════════════════════════════════════════════════════════════ */
export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={cn('h-2.5 rounded-full', className)}
      style={{
        background:
          'linear-gradient(90deg, var(--fig-neutral-lighter) 0%, var(--fig-surface-minimal) 50%, var(--fig-neutral-lighter) 100%)',
        backgroundSize: '200% 100%',
        animation: 'fams-shimmer 1.4s ease-in-out infinite',
      }}
    />
  );
}

export function SkeletonLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex w-[248px] flex-col gap-3 rounded-lg border border-border bg-card p-4', className)}>
      <SkeletonLine className="w-3/4" />
      <SkeletonLine className="w-full" />
      <SkeletonLine className="w-1/2" />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TaskCard — Figma "Basics → Task Card".
   ════════════════════════════════════════════════════════════════════ */
export interface TaskCardProps extends React.HTMLAttributes<HTMLDivElement> {
  primaryTag?: string;
  secondaryTag?: string;
  title?: string;
  options?: string[];
  ctaLabel?: string;
}

export function TaskCard({
  primaryTag = 'Text',
  secondaryTag = 'Text',
  title = 'Lorem ipsum dolor sit amet conset…',
  options = ['Text 1', 'Text 2'],
  ctaLabel = 'Button CTA',
  className,
  ...rest
}: TaskCardProps) {
  return (
    <div
      className={cn('flex w-[300px] flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm', className)}
      {...rest}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-[var(--fig-brand-normal)] px-2.5 py-1 text-caption font-semibold text-white">
          {primaryTag}
        </span>
        <span className="rounded-md bg-[var(--fig-surface-secondary)] px-2.5 py-1 text-caption font-semibold text-[var(--fig-brand-normal)]">
          {secondaryTag}
        </span>
      </div>
      <p className="text-body-md font-bold text-[var(--fig-text-darkest)]">{title}</p>
      <div className="flex items-center gap-5">
        {options.map((o) => (
          <span key={o} className="flex items-center gap-2 text-body-sm text-[var(--fig-text-dark)]">
            <span className="size-4 rounded-full border-2 border-[var(--fig-neutral-light)]" />
            {o}
          </span>
        ))}
      </div>
      <button
        type="button"
        className="mt-1 w-full rounded-md border border-border py-2 text-body-sm font-semibold text-[var(--fig-brand-normal)] transition-colors hover:bg-[var(--fig-surface-minimal)]"
      >
        {ctaLabel}
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   DevNote — Figma "Basics → Dev Note". Red callout with directional pointer.
   ════════════════════════════════════════════════════════════════════ */
export type DevNotePointer = 'top' | 'bottom' | 'left' | 'right';

export interface DevNoteProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  pointer?: DevNotePointer;
  children?: React.ReactNode;
}

const POINTER_POS: Record<DevNotePointer, string> = {
  top: 'left-1/2 -top-1.5 -translate-x-1/2',
  bottom: 'left-1/2 -bottom-1.5 -translate-x-1/2',
  left: 'top-1/2 -left-1.5 -translate-y-1/2',
  right: 'top-1/2 -right-1.5 -translate-y-1/2',
};

export function DevNote({
  title = 'Note',
  pointer = 'top',
  children = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque sodales magna ac orci rutrum dictum.',
  className,
  ...rest
}: DevNoteProps) {
  return (
    <div
      className={cn('relative w-[300px] rounded-lg border-2 bg-card p-4', className)}
      style={{ borderColor: 'var(--fig-accent-error-normal)' }}
      {...rest}
    >
      <span
        className={cn('absolute size-3 rounded-full', POINTER_POS[pointer])}
        style={{ backgroundColor: 'var(--fig-accent-error-normal)' }}
      />
      <p className="mb-1 text-body-md font-bold" style={{ color: 'var(--fig-accent-error-normal)' }}>
        {title}
      </p>
      <p className="text-body-sm text-[var(--fig-text-light)]">{children}</p>
    </div>
  );
}
