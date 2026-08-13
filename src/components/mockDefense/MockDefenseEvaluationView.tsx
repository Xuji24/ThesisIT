'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SpinnerIcon } from '@/components/icons';
import { stripJsonBlock } from '@/lib/parseReport';
import ReportRenderer from '@/components/shared/ReportRenderer';
import DefenseAnalyticsDashboard from '@/components/analytics/DefenseAnalyticsDashboard';
import ReportViewToggle, { type ReportView } from '@/components/analytics/ReportViewToggle';

interface MockDefenseEvaluationViewProps {
  isEvaluating: boolean;
  evalReport: string;
  onReEvaluate: () => void;
}

export default function MockDefenseEvaluationView({
  isEvaluating,
  evalReport,
  onReEvaluate,
}: MockDefenseEvaluationViewProps) {
  const [view, setView] = useState<ReportView>('analytics');

  return (
    <div className="flex-1 overflow-y-auto scrollbar-brand p-6 lg:px-8">
      {isEvaluating || !evalReport ? (
        <div className="flex items-center gap-3 py-8">
          <SpinnerIcon className="w-4 h-4 animate-spin text-ink-muted" />
          <p className="text-xs text-ink-muted">Evaluating your defense performance…</p>
        </div>
      ) : (
        <div className="max-w-4xl w-full">
          <ReportViewToggle view={view} onChange={setView} />

          {view === 'analytics' ? (
            <DefenseAnalyticsDashboard evalReport={evalReport} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <ReportRenderer text={stripJsonBlock(evalReport)} />
              </CardContent>
            </Card>
          )}

          <Button
            type="button"
            onClick={onReEvaluate}
            variant="outline"
            className="mt-6"
          >
            Re-evaluate
          </Button>
        </div>
      )}
    </div>
  );
}
