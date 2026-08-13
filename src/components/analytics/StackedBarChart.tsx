'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { CATEGORICAL, CHROME } from '@/lib/chartPalette';

interface StackedBarChartProps {
  /** One row per category on the y-axis (e.g. a date, or a session). */
  data: Record<string, string | number>[];
  /** The stacked series keys, in the same fixed categorical order every time.
   *  Capped at 4 -- fold a 5th into "Other" before this renders. */
  series: { key: string; label: string }[];
  categoryKey: string;
  title: string;
  description?: string;
  className?: string;
}

/** Horizontal stacked bar — part-to-whole across a bounded category set. */
export default function StackedBarChart({
  data,
  series,
  categoryKey,
  title,
  description,
  className,
}: StackedBarChartProps) {
  if (!data.length || !series.length) return null;
  const usedSeries = series.slice(0, 4);

  const config: ChartConfig = Object.fromEntries(
    usedSeries.map((s, i) => [s.key, { label: s.label, color: CATEGORICAL[i] }]),
  );

  return (
    <div className={className}>
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-ink-primary">{title}</h4>
        {description && <p className="text-xs text-ink-muted mt-0.5">{description}</p>}
      </div>
      <ChartContainer config={config} className="aspect-[16/9] min-h-[220px] w-full">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-line-hairline" />
          <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: CHROME.mutedInk }} />
          <YAxis
            type="category"
            dataKey={categoryKey}
            tickLine={false}
            axisLine={false}
            width={90}
            tick={{ fontSize: 11, fill: CHROME.secondaryInk }}
          />
          <ChartTooltip cursor={{ fill: 'rgba(11, 11, 11, 0.04)' }} content={<ChartTooltipContent />} />
          {usedSeries.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId="stack"
              fill={CATEGORICAL[i]}
              stroke={CHROME.surface}
              strokeWidth={2}
              isAnimationActive={false}
              radius={
                i === 0
                  ? [4, 0, 0, 4]
                  : i === usedSeries.length - 1
                    ? [0, 4, 4, 0]
                    : [0, 0, 0, 0]
              }
            />
          ))}
          <ChartLegend content={<ChartLegendContent />} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
