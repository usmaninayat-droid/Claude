import { BarChart3, OctagonAlert, Earth, CircleUserRound } from 'lucide-react';
import type { ActiveModule } from '../data/store';

export interface BottomNavProps {
  activeModule: ActiveModule;
  onSelect: (module: ActiveModule) => void;
}

const ITEMS: { key: ActiveModule; label: string; icon: typeof BarChart3 }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'requests', label: 'Requests & Complaints', icon: OctagonAlert },
  { key: 'plans', label: 'Plan Monitoring', icon: Earth },
  { key: 'profile', label: 'Profile', icon: CircleUserRound },
];

/** BottomNav — fixed 4-item mobile tab bar, safe-area aware. The active
 *  item renders as a raised maroon chip (icon + label in white); inactive
 *  items are plain muted icon-over-label buttons. */
export function BottomNav({ activeModule, onSelect }: BottomNavProps) {
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        height: `calc(72px + env(safe-area-inset-bottom, 0px))`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        borderTop: '1px solid var(--border)',
        background: 'var(--card)',
        zIndex: 20,
      }}
    >
      {ITEMS.map(({ key, label, icon: Icon }) => {
        const active = activeModule === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 44,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                width: '100%',
                padding: active ? '10px 18px' : '6px 4px',
                borderRadius: 12,
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? '#FFFFFF' : 'var(--muted-foreground)',
              }}
            >
              <Icon size={20} color={active ? '#FFFFFF' : 'var(--muted-foreground)'} />
              <span
                style={{
                  fontSize: active ? 12 : 11,
                  fontWeight: active ? 600 : 400,
                  lineHeight: 1.15,
                  textAlign: 'center',
                  color: active ? '#FFFFFF' : 'var(--muted-foreground)',
                }}
              >
                {label}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
