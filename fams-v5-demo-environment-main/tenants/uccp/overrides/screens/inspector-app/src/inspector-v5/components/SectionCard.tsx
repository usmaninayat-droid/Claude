import type { ReactNode } from 'react';

export interface SectionCardProps {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * SectionCard — ported from the FAMS V5 web app's `DetailSection`
 * (app-shell/record-detail.tsx): a titled card section for the detail
 * sheet's main column (`rounded-lg border border-border bg-card`, header
 * `border-b border-border px-4 py-3`, body `p-4`).
 */
export function SectionCard({ title, actions, children }: SectionCardProps) {
  return (
    <section className="mb-4 rounded-[var(--ins-radius-md)] border border-border bg-card">
      {title || actions ? (
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          {title ? <h3 className="text-body-sm font-semibold text-foreground">{title}</h3> : <span />}
          {actions}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}
