'use client';

import StackedBarChart from './StackedBarChart';
import DonutChart from './DonutChart';
import Meter from './Meter';

export interface DailyModeRow {
  [key: string]: string | number;
  date: string;
  chat: number;
  voice: number;
}

export interface AdminOverviewClientProps {
  dailyModeRows: DailyModeRow[];
  providerCounts: { label: string; value: number }[];
  cacheHits: number;
  totalRequests: number;
  errors: number;
}

export default function AdminOverviewClient({
  dailyModeRows,
  providerCounts,
  cacheHits,
  totalRequests,
  errors,
}: AdminOverviewClientProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {dailyModeRows.some((r) => r.chat + r.voice > 0) && (
        <div className="rounded-lg border border-line-hairline bg-surface-card p-5 lg:col-span-2">
          <StackedBarChart
            title="Sessions per day"
            description="Last 7 days, split by mode"
            categoryKey="date"
            data={dailyModeRows}
            series={[
              { key: 'chat', label: 'Chat' },
              { key: 'voice', label: 'Voice' },
            ]}
          />
        </div>
      )}

      {providerCounts.length > 0 && (
        <div className="rounded-lg border border-line-hairline bg-surface-card p-5">
          <DonutChart title="Requests by provider" description="Last 30 days" data={providerCounts} />
        </div>
      )}

      <div className="rounded-lg border border-line-hairline bg-surface-card p-5 space-y-5">
        <Meter
          label="Cache hit rate"
          value={cacheHits}
          total={totalRequests}
          valueLabel={totalRequests > 0 ? `${Math.round((cacheHits / totalRequests) * 100)}%` : '—'}
        />
        <Meter
          label="Error rate"
          value={errors}
          total={totalRequests + errors}
          valueLabel={totalRequests + errors > 0 ? `${Math.round((errors / (totalRequests + errors)) * 100)}%` : '—'}
        />
      </div>
    </div>
  );
}
