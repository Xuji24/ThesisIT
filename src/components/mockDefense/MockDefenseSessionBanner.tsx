'use client';

import { Button } from '@/components/ui/button';
import { SpinnerIcon } from '@/components/icons';

interface MockDefenseSessionBannerProps {
  panelQCount: number;
  isEvaluating: boolean;
  onEvaluate: () => void;
}

export default function MockDefenseSessionBanner({
  panelQCount,
  isEvaluating,
  onEvaluate,
}: MockDefenseSessionBannerProps) {
  return (
    <div className="shrink-0 border-t border-status-warning/30 bg-status-warning/10 px-5 py-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-[#8a5a00]">
          Session complete — {panelQCount} panel questions answered
        </p>
        <p className="text-xs text-[#8a5a00]/80 mt-0.5">
          Get your graded evaluation with per-answer scores and recommendations.
        </p>
      </div>
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={onEvaluate}
        disabled={isEvaluating}
        className="rounded-full text-xs shrink-0"
      >
        {isEvaluating ? (
          <span className="flex items-center gap-1.5">
            <SpinnerIcon className="w-3.5 h-3.5" />
            Evaluating…
          </span>
        ) : (
          'Get Evaluation'
        )}
      </Button>
    </div>
  );
}
