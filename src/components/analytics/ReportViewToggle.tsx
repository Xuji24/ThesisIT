'use client';

import { BarChart3, FileText } from 'lucide-react';

export type ReportView = 'analytics' | 'report';

interface ReportViewToggleProps {
  view: ReportView;
  onChange: (view: ReportView) => void;
}

export default function ReportViewToggle({ view, onChange }: ReportViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-surface-sunken rounded-full p-0.5 w-fit mb-6">
      {(
        [
          { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
          { id: 'report' as const, label: 'Full Report', icon: FileText },
        ] as const
      ).map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 ${
            view === id
              ? 'bg-surface-card text-accent-hover shadow-sm'
              : 'text-ink-muted hover:text-ink-secondary'
          }`}
        >
          <Icon className="w-3.5 h-3.5" strokeWidth={2} />
          {label}
        </button>
      ))}
    </div>
  );
}
