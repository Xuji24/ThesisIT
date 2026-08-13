'use client';

import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { ACCENT } from '@/lib/chartPalette';

interface SparklineProps {
  data: number[];
  className?: string;
}

/** 12-ish point trend line for a stat tile — no axes, no tooltip, just shape. */
export default function Sparkline({ data, className }: SparklineProps) {
  if (data.length < 2) return null;
  const points = data.map((value, i) => ({ i, value }));

  return (
    <div className={className} style={{ width: 64, height: 24 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={ACCENT}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
