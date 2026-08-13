'use client';

import { createPortal } from 'react-dom';
import { ClipboardList, X } from 'lucide-react';
import { CRITERIA_RUBRIC, GRADE_SCALE } from './constants';

interface MockDefenseCriteriaRailProps {
  mounted: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export default function MockDefenseCriteriaRail({
  mounted,
  open,
  onToggle,
  onClose,
}: MockDefenseCriteriaRailProps) {
  if (!mounted) return null;

  return createPortal(
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-[68] bg-ink-primary/10 lg:bg-transparent cursor-default"
          onClick={onClose}
          aria-label="Close grading criteria"
        />
      )}

      {open && (
        <aside
          className="fixed z-[70] top-20 bottom-20 right-14 sm:right-16 w-[min(20rem,calc(100vw-4.5rem))] flex flex-col rounded-lg border border-line-hairline bg-surface-card shadow-overlay overflow-hidden"
          aria-label="Grading criteria"
        >
          <div className="shrink-0 px-4 py-3 border-b border-line-hairline flex items-center justify-between gap-2 bg-surface-sunken">
            <p className="text-xs font-semibold text-ink-primary uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-accent" />
              Grading Criteria
            </p>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-card transition-colors"
              aria-label="Close criteria panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-brand px-4 py-4 space-y-4 min-h-0">
            {CRITERIA_RUBRIC.map(({ label, weight, desc }) => (
              <div key={label} className="pb-3 border-b border-line-hairline last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-ink-primary leading-snug">{label}</span>
                  <span className="text-[10px] font-bold text-accent shrink-0">{weight}</span>
                </div>
                <p className="text-[11px] text-ink-muted leading-relaxed">{desc}</p>
              </div>
            ))}

            <div className="pt-2">
              <p className="text-[10px] font-semibold text-ink-primary uppercase tracking-wider mb-2">
                Grade scale
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                {GRADE_SCALE.map(([grade, range, color]) => (
                  <span key={grade} className="flex items-center gap-1.5">
                    <span className={`font-bold w-4 ${color}`}>{grade}</span>
                    <span className="text-ink-muted">{range}</span>
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-ink-muted leading-relaxed">
                Overall = C1×30% + C2×25% + C3×20% + C4×15% + C5×10%, scaled to 100.
              </p>
            </div>
          </div>
        </aside>
      )}

      <button
        type="button"
        title={open ? 'Hide grading criteria' : 'View grading criteria'}
        onClick={onToggle}
        className={`fixed z-[71] right-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-1.5 py-5 px-2.5 min-w-[2.75rem] rounded-l-lg border border-r-0 shadow-overlay transition-colors duration-200 ${
          open
            ? 'bg-accent text-white border-accent'
            : 'bg-surface-card text-ink-secondary border-line-hairline hover:text-accent hover:border-accent/40'
        }`}
      >
        <ClipboardList className="w-4 h-4 shrink-0" strokeWidth={2} />
        <span className="text-[9px] font-bold uppercase tracking-widest leading-none">Criteria</span>
      </button>
    </>,
    document.body,
  );
}
