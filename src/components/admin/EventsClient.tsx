'use client';

import { useMemo, useState } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';

export interface AdminEventRow {
  id: string;
  type: string;
  user_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export default function EventsClient({ events }: { events: AdminEventRow[] }) {
  const [typeFilter, setTypeFilter] = useState('all');

  const types = useMemo(() => Array.from(new Set(events.map((e) => e.type))).sort(), [events]);
  const options = [{ value: 'all', label: 'All event types' }, ...types.map((t) => ({ value: t, label: t }))];

  const filtered = typeFilter === 'all' ? events : events.filter((e) => e.type === typeFilter);

  return (
    <div>
      <div className="mb-4 max-w-xs">
        <CustomSelect value={typeFilter} onValueChange={setTypeFilter} options={options} />
      </div>

      <div className="rounded-lg border border-line-hairline bg-surface-card divide-y divide-line-hairline">
        {filtered.map((e) => (
          <div key={e.id} className="px-4 py-3 flex items-start justify-between gap-4 text-sm">
            <div>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-sunken text-ink-secondary">
                {e.type}
              </span>
              <p className="text-xs text-ink-muted mt-1.5 font-mono truncate max-w-md">
                {JSON.stringify(e.meta)}
              </p>
            </div>
            <p className="text-xs text-ink-muted tabular-nums shrink-0">
              {new Date(e.created_at).toLocaleString()}
            </p>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">No events match this filter.</p>
        )}
      </div>
    </div>
  );
}
