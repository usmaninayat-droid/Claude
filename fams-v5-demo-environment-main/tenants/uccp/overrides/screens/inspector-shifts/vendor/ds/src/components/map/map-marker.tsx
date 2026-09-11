import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * AssetMarker — the live-monitoring map pin (Figma DS V2 "Assets on Map").
 *
 * A teardrop pin: a state-colored circular head + a connector stem + an anchor
 * dot, with a **dynamic inner icon** — the asset glyph is swappable (a vehicle,
 * a workforce person, or ANY icon), passed as `children`. The pin colour is
 * driven by the asset's live `state`; `active` is the selected/emphasised form
 * (tinted fill + bolder border + longer stem, per the Figma "Active=On").
 *
 * Token-only: each state maps to a DS colour token (Moving→success, Stopped→
 * error, Immobilized→error-700, Idle→warning, Excess Idling→warning-600,
 * Non-Moving→primary, Non-Reporting→muted).
 */

export type AssetMarkerState =
  | 'moving'
  | 'stopped'
  | 'idle'
  | 'excess-idling'
  | 'immobilized'
  | 'non-moving'
  | 'non-reporting';

const STATE_COLOR: Record<AssetMarkerState, string> = {
  moving: 'var(--success-500)',
  stopped: 'var(--error-500)',
  idle: 'var(--warning-500)',
  'excess-idling': 'var(--warning-600)',
  immobilized: 'var(--error-700)',
  'non-moving': 'var(--primary)',
  'non-reporting': 'var(--muted-foreground)',
};

export interface AssetMarkerProps {
  /** Live asset state — drives the pin colour. Defaults to `non-reporting`. */
  state?: AssetMarkerState;
  /** Selected/emphasised pin (tinted fill, bolder border, longer stem). */
  active?: boolean;
  /** The dynamic inner glyph — vehicle / workforce / any icon. */
  children?: React.ReactNode;
  /** Optional small corner status badge (e.g. a lock or pause), state-tinted. */
  badge?: React.ReactNode;
  /** Head diameter in px (default 38). */
  size?: number;
  className?: string;
  title?: string;
}

export function AssetMarker({
  state = 'non-reporting',
  active = false,
  children,
  badge,
  size = 38,
  className,
  title,
}: AssetMarkerProps) {
  const color = STATE_COLOR[state];
  const stem = active ? 20 : 16;
  const border = active ? 2 : 1.5;
  // Active = light state tint behind the icon; default = white head.
  const headBg = active ? `color-mix(in srgb, ${color} 12%, white)` : '#ffffff';

  return (
    <div
      className={cn('relative inline-flex flex-col items-center', className)}
      style={{ width: size }}
      title={title}
    >
      {/* Head — state ring + dynamic inner icon */}
      <div
        className="relative flex shrink-0 items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          background: headBg,
          border: `${border}px solid ${color}`,
          boxShadow: active ? `0 0 0 4px color-mix(in srgb, ${color} 18%, transparent)` : undefined,
        }}
      >
        <span
          className="flex items-center justify-center text-foreground"
          style={{ width: size * 0.62, height: size * 0.62 }}
        >
          {children}
        </span>
        {badge ? (
          <span
            className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full text-[8px] text-white"
            style={{ background: color, boxShadow: '0 0 0 1.5px white' }}
          >
            {badge}
          </span>
        ) : null}
      </div>

      {/* Connector stem + anchor dot */}
      <svg width="6" height={stem + 6} viewBox={`0 0 6 ${stem + 6}`} className="-mt-px" aria-hidden>
        <rect x="2.5" y="0" width={active ? 2 : 1} height={stem} rx="0.5" fill={color} />
        <circle cx="3" cy={stem + 3} r="3" fill={color} />
      </svg>
    </div>
  );
}
