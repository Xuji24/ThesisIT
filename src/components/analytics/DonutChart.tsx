'use client';

import { Cell, Pie, PieChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { CATEGORICAL_ALL_PAIRS_SAFE, CHROME } from '@/lib/chartPalette';

interface DonutChartProps {
  /** Capped at 4 slices — the validated palette's all-pairs-safe limit. A 5th
   *  item, if present, is folded into "Other" by the caller before this renders. */
  data: { label: string; value: number }[];
  title: string;
  description?: string;
  className?: string;
}

export default function DonutChart({ data, title, description, className }: DonutChartProps) {
  if (!data.length) return null;
  const slices = data.slice(0, 4);
  const total = slices.reduce((s, d) => s + d.value, 0);

  const chartData = slices.map((d, i) => ({
    ...d,
    fill: CATEGORICAL_ALL_PAIRS_SAFE[i],
  }));

  const config: ChartConfig = Object.fromEntries(
    chartData.map((d) => [d.label, { label: d.label, color: d.fill }]),
  );

  return (
    <div className={className}>
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-ink-primary">{title}</h4>
        {description && <p className="text-xs text-ink-muted mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-6 flex-wrap">
        <ChartContainer config={config} className="aspect-square min-h-[160px] w-[160px] shrink-0">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(v, n) => [`${v} (${total > 0 ? Math.round((Number(v) / total) * 100) : 0}%)`, n as string]}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="100%"
              strokeWidth={2}
              stroke={CHROME.surface}
              isAnimationActive={false}
            >
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* Relief: legend + values always shown, never color-only identity. */}
        <ul className="space-y-1.5 min-w-[140px]">
          {chartData.map((d) => (
            <li key={d.label} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                style={{ backgroundColor: d.fill }}
                aria-hidden
              />
              <span className="text-ink-secondary truncate">{d.label}</span>
              <span className="ml-auto font-medium text-ink-primary tabular-nums">
                {total > 0 ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
