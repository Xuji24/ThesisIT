'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SpinnerIcon } from '@/components/icons';
import ReportRenderer from '@/components/shared/ReportRenderer';

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
  return (
    <div className="flex-1 overflow-y-auto scrollbar-brand p-6 lg:px-8">
      {isEvaluating || !evalReport ? (
        <div className="flex items-center gap-3 py-8">
          <SpinnerIcon className="w-4 h-4 animate-spin text-neutral-400" />
          <p className="text-xs text-neutral-400">Evaluating your defense performance…</p>
        </div>
      ) : (
        <Card className="max-w-3xl w-full">
          <CardContent className="pt-6">
            <ReportRenderer text={evalReport} />
            <Button
              type="button"
              onClick={onReEvaluate}
              variant="outline"
              className="mt-6 cursor-pointer text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 hover:border-neutral-400 transition-colors"
            >
              Re-evaluate
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
