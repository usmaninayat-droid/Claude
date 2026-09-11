import * as React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number | string;
}

export function Sparkline({ data, color = 'var(--chart-2)', height = 28, width = 80 }: SparklineProps) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ width, height, display: 'inline-block' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
