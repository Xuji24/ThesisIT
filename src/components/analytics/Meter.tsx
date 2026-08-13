'use client';

import { ACCENT, ACCENT_SOFT } from '@/lib/chartPalette';

interface MeterProps {
  label: string;
  value: number;
  total: number;
  /** Optional formatted value shown beside the label (defaults to "value / total"). */
  valueLabel?: string;
  className?: string;
}

/**
 * A single ratio against a whole — the honest replacement for a 2-slice donut
 * (see dataviz choosing-a-form.md: a 2-slice pie loses to a meter every time).
 * Fill uses the accent; the unfilled track is a lighter step of the same
 * family so the whole bar reads as one state, not two competing colors.
 */
export default function Meter({ label, value, total, valueLabel, className }: MeterProps) {
  const pct = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-semibold text-ink-primary">{label}</span>
        <span className="text-xs text-ink-muted tabular-nums">
          {valueLabel ?? `${value} / ${total}`}
        </span>
      </div>
      <div
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={total}
        className="h-2.5 rounded-full overflow-hidden"
        style={{ backgroundColor: ACCENT_SOFT }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct * 100}%`, backgroundColor: ACCENT }}
        />
      </div>
    </div>
  );
}
