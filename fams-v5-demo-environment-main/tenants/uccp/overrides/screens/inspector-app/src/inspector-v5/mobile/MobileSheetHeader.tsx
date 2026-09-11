import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

export type SheetHandleProps = {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
};

/** The bare 36×4px grabber pill both sheet headers sit on (old shell). */
function Grabber() {
  return <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--border)' }} />;
}

export interface MobileSheetHeaderProps {
  title?: ReactNode;
  handleProps: SheetHandleProps;
  onTap?: () => void;
  count?: number;
}

/**
 * MobileSheetHeader — the LIST sheet's grab row, ported from the old
 * flood-demo shell's queue/task-list sheet header: an 8px-padded centered
 * grabber, tap-to-cycle, and (only away from the PEEK prompt) an 11px bold
 * uppercase label + item count row at 20px side padding.
 */
export function MobileSheetHeader({ title, handleProps, onTap, count }: MobileSheetHeaderProps) {
  return (
    <div style={{ flexShrink: 0 }}>
      <div
        {...handleProps}
        onClick={onTap}
        style={{
          touchAction: 'none',
          cursor: 'grab',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          padding: '8px 0',
          userSelect: 'none',
        }}
      >
        <Grabber />
      </div>
      {title ? (
        <div
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px 6px',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--muted-foreground)',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            {title}
          </span>
          {count != null ? <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{count}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export interface MobileDetailSheetHeaderProps {
  handleProps: SheetHandleProps;
  /** At PEEK the compact card owns the close affordance, so the leading slot
   *  is a bare 44px spacer — exactly as the old shell did it. */
  showClose: boolean;
  onClose: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  /** Safe-area top padding when the sheet is at its full-bleed snap. */
  fullBleed?: boolean;
}

/**
 * MobileDetailSheetHeader — the DETAIL sheet's grab row, ported from the old
 * shell: `[X | grabber | chevron]` on one 44px-target row at 20px side
 * padding, present at every snap so the sheet can always be pulled back down
 * (this replaced the old floating chevron so the title can never be clipped).
 */
export function MobileDetailSheetHeader({
  handleProps,
  showClose,
  onClose,
  expanded,
  onToggleExpand,
  fullBleed,
}: MobileDetailSheetHeaderProps) {
  const iconBtn: React.CSSProperties = {
    display: 'flex',
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--ins-radius-sm)',
    border: 'none',
    background: 'transparent',
    color: 'var(--muted-foreground)',
    cursor: 'pointer',
  };
  return (
    <div
      {...handleProps}
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 20px',
        paddingTop: fullBleed ? 'max(8px, env(safe-area-inset-top))' : 8,
        touchAction: 'none',
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      {showClose ? (
        <button type="button" onClick={onClose} aria-label="Close" style={iconBtn}>
          <X size={17} />
        </button>
      ) : (
        <span style={{ display: 'block', minHeight: 44, minWidth: 44 }} aria-hidden="true" />
      )}
      <Grabber />
      <button
        type="button"
        onClick={onToggleExpand}
        aria-label={expanded ? 'Collapse' : 'View full details'}
        style={iconBtn}
      >
        {expanded ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
      </button>
    </div>
  );
}
