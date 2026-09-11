import type { ReactNode } from 'react';

export interface FieldRowProps {
  label: ReactNode;
  value: ReactNode;
}

/**
 * FieldRow — one label/value field, ported from the FAMS V5 web app's
 * `FieldGrid` field cell (app-shell/record-detail.tsx): uppercase caption
 * label above a truncated body-sm value. Meant to sit inside a
 * `grid grid-cols-2 gap-x-4 gap-y-3` wrapper (see DetailsTab section
 * bodies) — the web's FieldGrid is exactly that grid of these cells.
 */
export function FieldRow({ label, value }: FieldRowProps) {
  return (
    <div className="min-w-0">
      <div className="text-caption uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-body-sm font-medium text-foreground">{value ?? '—'}</div>
    </div>
  );
}
