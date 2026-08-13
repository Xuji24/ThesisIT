'use client';

/**
 * Renders plain-text AI reports with:
 *   - ALL-CAPS section headings → bold, full-width label
 *   - Body lines              → indented under the heading
 *
 * The AI is instructed to use ALL-CAPS labels (e.g. "STRENGTHS",
 * "WEAKNESSES AND LOOPHOLES") with no markdown symbols, so we detect
 * headings purely by the character pattern of the line.
 */

interface ReportRendererProps {
  /** Plain-text report from the AI (no markdown). */
  text: string;
  className?: string;
}

/**
 * A line is a section heading when it:
 *   1. Consists entirely of uppercase letters, spaces, dashes, ampersands,
 *      forward-slashes, colons, and parentheses (classic ALL-CAPS label)
 *   2. Is at least 3 characters long
 *   3. Starts with an uppercase letter
 *
 * We also detect the "Changes made" prefix used in Panelist Recommendations.
 */
function isHeading(line: string): boolean {
  const t = line.trim();
  if (t.length < 3) return false;
  if (/^[A-Z][A-Z\s\-&\/\(\):]{2,}$/.test(t)) return true;   // ALL-CAPS label
  if (/^changes\s+made/i.test(t)) return true;                  // Panel Recos header
  return false;
}

/**
 * A line is a sub-label (Q1:, Score:, Strength:, Gap:, Model Answer:) when
 * it matches "Word(s): …" and starts the eval per-question block.
 * These get slightly heavier weight without full heading treatment.
 */
function isSubLabel(line: string): boolean {
  return /^(Q\d+:|Score:|Strength:|Gap:|Model\s+Answer:)/i.test(line.trim());
}

export default function ReportRenderer({ text, className = '' }: ReportRendererProps) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className={`text-sm leading-relaxed ${className}`}>
      {lines.map((rawLine, i) => {
        const line = rawLine.trimEnd();
        const trimmed = line.trim();

        // Blank line → small spacer
        if (!trimmed) {
          return <div key={i} className="h-2" />;
        }

        // Section heading (ALL-CAPS / "Changes made")
        if (isHeading(trimmed)) {
          return (
            <p
              key={i}
              className="font-bold text-ink-primary mt-7 first:mt-0 mb-2 tracking-wide text-[0.8rem] uppercase"
            >
              {trimmed}
            </p>
          );
        }

        // Sub-label (Q1:, Score:, Strength:, Gap:, Model Answer:)
        if (isSubLabel(trimmed)) {
          const colonIdx = trimmed.indexOf(':');
          const label = trimmed.slice(0, colonIdx + 1);
          const rest = trimmed.slice(colonIdx + 1);
          return (
            <p key={i} className="pl-4 text-ink-secondary mt-2 mb-0.5">
              <span className="font-semibold text-ink-primary">{label}</span>
              {rest}
            </p>
          );
        }

        // Normal body line — indented
        return (
          <p key={i} className="pl-4 text-ink-secondary mb-0.5">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
