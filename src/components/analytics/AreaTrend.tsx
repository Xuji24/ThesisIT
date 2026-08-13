'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { ACCENT, CHROME } from '@/lib/chartPalette';

interface AreaTrendProps {
  data: { x: string; y: number }[];
  title: string;
  description?: string;
  yLabel?: string;
  className?: string;
}

/** Single-series trend over time — one hue, ~10% fill wash, 2px line. */
export default function AreaTrend({ data, title, description, yLabel = 'Value', className }: AreaTrendProps) {
  if (!data.length) return null;

  const config: ChartConfig = { y: { label: yLabel, color: ACCENT } };

  return (
    <div className={className}>
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-ink-primary">{title}</h4>
        {description && <p className="text-xs text-ink-muted mt-0.5">{description}</p>}
      </div>
      <ChartContainer config={config} className="aspect-[16/9] min-h-[200px] w-full">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="areaTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.1} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-line-hairline" />
          <XAxis dataKey="x" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: CHROME.mutedInk }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: CHROME.mutedInk }} width={32} />
          <ChartTooltip cursor={{ stroke: CHROME.axis, strokeWidth: 1 }} content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="y"
            name={yLabel}
            stroke={ACCENT}
            strokeWidth={2}
            fill="url(#areaTrendFill)"
            dot={{ r: 4, fill: ACCENT, stroke: CHROME.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
