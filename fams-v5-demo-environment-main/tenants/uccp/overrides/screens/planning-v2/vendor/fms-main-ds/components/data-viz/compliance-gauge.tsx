import * as React from 'react';

export interface ComplianceGaugeProps {
  value: number; // 0..100
  size?: number;
  label?: React.ReactNode;
  /**
   * `'solid'` (default) — the original single-color arc (red <50, amber <80,
   * green >=80). `'gradient'` — the Figma plan-detail gauge (3092:1537): a
   * red→orange→amber→green spectrum arc filled up to the value, with a small
   * trend arrow at the arc's end pointing along the sweep.
   */
  variant?: 'solid' | 'gradient';
}

/**
 * ComplianceGauge — semi-circle gauge (Pattern #48).
 */
export function ComplianceGauge({ value, size = 120, label, variant = 'solid' }: ComplianceGaugeProps) {
  const pct = Math.max(0, Math.min(100, value));
  const angle = (pct / 100) * 180;
  const color = pct >= 80 ? 'var(--status-success)' : pct >= 50 ? 'var(--status-warning)' : 'var(--status-error)';
  const cx = size / 2;
  const cy = size * 0.55;
  const r = size * 0.38;
  const stroke = 10;
  const gradId = React.useId();

  // arc path helpers
  const arc = (start: number, end: number) => {
    const sa = (Math.PI * (180 - start)) / 180;
    const ea = (Math.PI * (180 - end)) / 180;
    const sx = cx + r * Math.cos(sa);
    const sy = cy - r * Math.sin(sa);
    const ex = cx + r * Math.cos(ea);
    const ey = cy - r * Math.sin(ea);
    const large = end - start > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
  };
  /** Point on the arc at sweep angle `a` (0..180). */
  const at = (a: number) => {
    const rad = (Math.PI * (180 - a)) / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  };

  const tip = at(angle);
  // Tangent direction of the sweep at the value angle — the trend arrow's heading.
  const tipDeg = 90 - angle;

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`}>
        {variant === 'gradient' && (
          <defs>
            {/* The spectrum runs along the semicircle left→right: red at 0%,
                orange/amber through the middle, green at 100% — Figma 3092:1537. */}
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--status-error)" />
              <stop offset="38%" stopColor="var(--status-warning)" />
              <stop offset="68%" stopColor="var(--chart-accent-yellow, #EAAA08)" />
              <stop offset="100%" stopColor="var(--status-success)" />
            </linearGradient>
          </defs>
        )}
        <path d={arc(0, 180)} stroke="var(--gray-200)" strokeWidth={stroke} fill="none" strokeLinecap="round" />
        <path
          d={arc(0, angle)}
          stroke={variant === 'gradient' ? `url(#${gradId})` : color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
        />
        {variant === 'gradient' && (
          // Trend arrow at the arc tip, pointing along the sweep (Figma's ▲ nib).
          <g transform={`translate(${tip.x} ${tip.y}) rotate(${tipDeg})`}>
            <path d="M 0 -11 L 6 1 L -6 1 Z" fill={color} stroke="var(--card, #fff)" strokeWidth="1.5" strokeLinejoin="round" />
          </g>
        )}
        <text x={cx} y={cy} textAnchor="middle" className="fill-foreground" style={{ fontSize: size * 0.22, fontWeight: 600 }}>
          {pct.toFixed(0)}%
        </text>
      </svg>
      {label ? <div className="text-caption text-muted-foreground">{label}</div> : null}
    </div>
  );
}
