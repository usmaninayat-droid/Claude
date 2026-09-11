import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';

type TabKey = 'overview' | 'related' | 'timeline';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'related', label: 'Related Task' },
  { key: 'timeline', label: 'Timeline' },
];

export interface MobileDetailTabsProps {
  /** Record title shown large & bold under the back affordance. */
  title: string;
  /** Collapses the sheet back to the 'overview' snap. */
  onBack: () => void;
  renderOverview: () => React.ReactNode;
  renderTimeline: () => React.ReactNode;
  renderRelatedTasks: () => React.ReactNode;
}

/**
 * MobileDetailTabs — the full-screen mobile detail stage.
 *
 * Chrome restyled onto the old flood-demo shell's polish:
 *  · the back affordance is the old full-screen page header's 44px circular
 *    icon button (InspectorMobileShell's alerts/settings pages) followed by
 *    the record title, instead of a bare text link;
 *  · the segmented bar is the old `SegmentedControl` recipe verbatim —
 *    `var(--muted)` container, 8px outer / 6px inner radius, 4px padding,
 *    equal-width 44px segments, active = white + 1px border + a shallow
 *    `0 1px 3px` shadow + maroon bold label;
 *  · 20px side padding, matching every other mobile surface.
 *
 * Tab content scrolls independently of the sheet drag; the drag handle lives
 * above this component in MobileHybridModule and is untouched.
 */
export function MobileDetailTabs({ title, onBack, renderOverview, renderTimeline, renderRelatedTasks }: MobileDetailTabsProps) {
  const [active, setActive] = useState<TabKey>('overview');

  const body =
    active === 'overview' ? renderOverview() : active === 'related' ? renderRelatedTasks() : renderTimeline();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ flexShrink: 0, padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginInlineStart: -10 }}>
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            style={{
              display: 'flex',
              minHeight: 44,
              minWidth: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: 'var(--foreground)',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
            Record
          </span>
        </div>

        <h2
          style={{
            margin: '2px 0 14px',
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.25,
            color: 'var(--foreground)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {title}
        </h2>

        <div
          role="tablist"
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            gap: 4,
            background: 'var(--muted)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--ins-radius-md)',
            padding: 4,
            marginBottom: 14,
            boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
          }}
        >
          {TABS.map((tab) => {
            const isActive = tab.key === active;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(tab.key)}
                style={{
                  display: 'flex',
                  flex: 1,
                  minHeight: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--ins-radius-sm)',
                  border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                  background: isActive ? 'var(--card)' : 'transparent',
                  boxShadow: isActive ? '0 1px 3px rgba(16,24,40,0.10)' : 'none',
                  color: isActive ? 'var(--primary)' : 'var(--muted-foreground)',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="fams-hide-scrollbar" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 20px 24px' }}>
        {body}
      </div>
    </div>
  );
}
