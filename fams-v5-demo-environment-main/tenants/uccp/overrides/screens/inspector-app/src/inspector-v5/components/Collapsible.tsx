import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface CollapsibleProps {
  title: ReactNode;
  children: ReactNode;
  /** Expanded on first render; uncontrolled afterwards (toggled internally). */
  defaultExpanded?: boolean;
}

/** Collapsible — chevron + title header that expands/collapses its body on
 *  tap. Used by the mobile Overview tab to render SectionCard groups as
 *  collapsible sections instead of always-open cards. Local to the mobile
 *  layer; does not touch SectionCard's tablet usage. */
export function Collapsible({ title, children, defaultExpanded = false }: CollapsibleProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--ins-radius-md)',
        background: 'var(--card)',
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          border: 'none',
          background: 'transparent',
          padding: 16,
          cursor: 'pointer',
          textAlign: 'left',
          font: 'inherit',
        }}
      >
        {expanded ? (
          <ChevronDown size={16} color="var(--muted-foreground)" />
        ) : (
          <ChevronRight size={16} color="var(--muted-foreground)" />
        )}
        <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{title}</span>
      </button>
      {expanded ? <div style={{ padding: '0 16px 16px' }}>{children}</div> : null}
    </div>
  );
}
