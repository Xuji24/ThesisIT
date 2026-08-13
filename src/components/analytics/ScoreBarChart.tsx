'use client';

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { sequentialForScore, CHROME } from '@/lib/chartPalette';

interface ScoreBarChartProps {
  data: { label: string; score: number; fill?: string }[];
  title: string;
  description?: string;
  maxScore?: number;
  className?: string;
}

export default function ScoreBarChart({
  data,
  title,
  description,
  maxScore = 10,
  className,
}: ScoreBarChartProps) {
  if (!data.length) return null;

  const chartData = data.map((d) => ({
    label: d.label,
    score: d.score,
    fill: d.fill ?? sequentialForScore(d.score, maxScore),
  }));

  const config: ChartConfig = {
    score: { label: 'Score', color: CHROME.mutedInk },
  };

  return (
    <div className={className}>
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-ink-primary">{title}</h4>
        {description && <p className="text-xs text-ink-muted mt-0.5">{description}</p>}
      </div>
      <ChartContainer config={config} className="aspect-[16/9] min-h-[220px] w-full">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-line-hairline" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: CHROME.mutedInk }}
            interval={0}
            angle={data.length > 4 ? -25 : 0}
            textAnchor={data.length > 4 ? 'end' : 'middle'}
            height={data.length > 4 ? 56 : 32}
          />
          <YAxis
            domain={[0, maxScore]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: CHROME.mutedInk }}
            width={28}
          />
          <ChartTooltip
            cursor={{ fill: 'rgba(11, 11, 11, 0.04)' }}
            content={<ChartTooltipContent formatter={(v) => [`${v}/${maxScore}`, 'Score']} />}
          />
          <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48} isAnimationActive={false}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
