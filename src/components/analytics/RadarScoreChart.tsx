'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadarChart,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { CATEGORICAL, CHROME } from '@/lib/chartPalette';

interface RadarSeries {
  key: string;
  label: string;
  /** Values keyed by axis label, matching `axes`. */
  values: Record<string, number>;
}

interface RadarScoreChartProps {
  /** Fixed small axis set — this is the one legitimate radar use case:
   *  comparing shape across a bounded number of named criteria. */
  axes: string[];
  /** Capped at 2 series — first vs latest is the only radar comparison that
   *  stays readable; more overlapping shapes become unreadable. */
  series: RadarSeries[];
  title: string;
  description?: string;
  maxScore?: number;
  className?: string;
}

export default function RadarScoreChart({
  axes,
  series,
  title,
  description,
  maxScore = 10,
  className,
}: RadarScoreChartProps) {
  if (!axes.length || !series.length) return null;
  const usedSeries = series.slice(0, 2);

  const data = axes.map((axis) => {
    const row: Record<string, string | number> = { axis };
    for (const s of usedSeries) row[s.key] = s.values[axis] ?? 0;
    return row;
  });

  const config: ChartConfig = Object.fromEntries(
    usedSeries.map((s, i) => [s.key, { label: s.label, color: CATEGORICAL[i] }]),
  );

  return (
    <div className={className}>
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-ink-primary">{title}</h4>
        {description && <p className="text-xs text-ink-muted mt-0.5">{description}</p>}
      </div>
      <ChartContainer config={config} className="aspect-square min-h-[260px] w-full">
        <RechartsRadarChart data={data}>
          <PolarGrid stroke={CHROME.gridline} />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: CHROME.secondaryInk }} />
          <PolarRadiusAxis domain={[0, maxScore]} tick={{ fontSize: 10, fill: CHROME.mutedInk }} axisLine={false} />
          {usedSeries.map((s, i) => (
            <Radar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stroke={CATEGORICAL[i]}
              fill={CATEGORICAL[i]}
              fillOpacity={0.12}
              strokeWidth={2}
              dot={{ r: 3, fill: CATEGORICAL[i] }}
              isAnimationActive={false}
            />
          ))}
          <ChartTooltip content={<ChartTooltipContent />} />
          {usedSeries.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        </RechartsRadarChart>
      </ChartContainer>
    </div>
  );
}
