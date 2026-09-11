import * as React from 'react';
import { cn } from '../components/utils/cn';

/** A top-level documented section with an anchor id for the side nav. */
export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-b border-border py-12">
      <div className="mb-8">
        <h2 className="text-h3 font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-2 max-w-3xl text-body-md text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-10">{children}</div>
    </section>
  );
}

/** A labelled block within a Section (one component or one facet). */
export function Demo({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-3">
        <h3 className="text-body-md font-semibold text-foreground">{title}</h3>
        {hint && <span className="text-body-sm text-muted-foreground">{hint}</span>}
      </div>
      <div
        className={cn(
          'flex flex-wrap items-start gap-4 rounded-lg border border-border bg-card p-6 shadow-sm',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Caption under a swatch / example. */
export function Caption({ children }: { children: React.ReactNode }) {
  return <span className="text-caption text-muted-foreground">{children}</span>;
}
