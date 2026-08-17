import * as React from 'react';

export interface ComplianceGaugeProps {
  value: number; // 0..100
  size?: number;
  label?: React.ReactNode;
}

/**
 * ComplianceGauge — semi-circle gauge (Pattern #48).
 * Color band: red <50, amber <80, green >=80.
 */
export function ComplianceGauge({ value, size = 120, label }: ComplianceGaugeProps) {
  const pct = Math.max(0, Math.min(100, value));
  const angle = (pct / 100) * 180;
  const color = pct >= 80 ? 'var(--status-success)' : pct >= 50 ? 'var(--status-warning)' : 'var(--status-error)';
  const cx = size / 2;
  const cy = size * 0.55;
  const r = size * 0.38;
  const stroke = 10;

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

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`}>
        <path d={arc(0, 180)} stroke="var(--gray-200)" strokeWidth={stroke} fill="none" strokeLinecap="round" />
        <path d={arc(0, angle)} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        <text x={cx} y={cy} textAnchor="middle" className="fill-foreground" style={{ fontSize: size * 0.22, fontWeight: 600 }}>
          {pct.toFixed(0)}%
        </text>
      </svg>
      {label ? <div className="text-caption text-muted-foreground">{label}</div> : null}
    </div>
  );
}
