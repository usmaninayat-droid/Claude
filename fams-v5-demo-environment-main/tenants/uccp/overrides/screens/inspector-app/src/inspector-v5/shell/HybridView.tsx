import type { ReactNode } from 'react';

export interface HybridViewProps {
  /** Left region — the list/table panel. */
  list: ReactNode;
  /** Right region — the map panel. */
  map: ReactNode;
  /** Width of the list panel in px. */
  listWidth?: number;
  className?: string;
}

/**
 * HybridView — tablet split: a fixed-width list panel (bordered on the
 * inline-end) beside a flex-1 map region. No tab strip — this is the
 * tablet/desktop-only split (mobile has its own shell).
 */
export function HybridView({ list, map, listWidth = 360, className }: HybridViewProps) {
  return (
    <div className={className} style={{ display: 'flex', height: '100%', width: '100%', minHeight: 0 }}>
      <div
        className="fams-hide-scrollbar"
        style={{
          width: listWidth,
          flexShrink: 0,
          borderInlineEnd: '1px solid var(--border)',
          overflow: 'auto',
          height: '100%',
        }}
      >
        {list}
      </div>
      <div style={{ flex: 1, minWidth: 0, height: '100%' }}>{map}</div>
    </div>
  );
}
