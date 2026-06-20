/**
 * Section-aware thesis text extraction.
 *
 * Detects common academic section headings and extracts a proportional
 * word-budgeted slice from each section. Covers:
 *   - Philippine CS/IT theses (Chapter 1-5 format with IPO, objectives, RRL)
 *   - General academic theses (any field, any format)
 *
 * Falls back to distributed sampling (start/middle/end) when no headings
 * are detected (e.g., poorly formatted or single-column PDF extracts).
 */

interface SectionSpec {
  label: string;
  /** Regex matched against trimmed heading lines (case-insensitive). */
  pattern: RegExp;
  /** Maximum words to include from this section's body. */
  budget: number;
}

/**
 * Sections ordered by typical document position.
 * Budgets are in words; total sums to ~5 500 words.
 */
const SECTIONS: SectionSpec[] = [
  {
    label: 'Abstract',
    pattern: /^abstract$/i,
    budget: 600,
  },
  {
    label: 'Introduction / Background',
    pattern: /introduction|background\s+of\s+(?:the\s+)?study/i,
    budget: 500,
  },
  {
    label: 'Statement of the Problem',
    pattern: /statement\s+of\s+(?:the\s+)?problem|problem\s+statement/i,
    budget: 400,
  },
  {
    label: 'Research Objectives',
    pattern: /(?:research\s+)?objectives?\s*(?:of\s+(?:the\s+)?study)?|aims?\s+(?:and\s+objectives?|of\s+(?:the\s+)?study)/i,
    budget: 400,
  },
  {
    label: 'Hypothesis',
    pattern: /hypothes[ie]s/i,
    budget: 250,
  },
  {
    label: 'Conceptual / Theoretical Framework',
    pattern: /(?:conceptual|theoretical|research)\s+framework|paradigm\s+of\s+(?:the\s+)?study/i,
    budget: 300,
  },
  {
    label: 'Significance of the Study',
    pattern: /significance\s+of\s+(?:the\s+)?study/i,
    budget: 250,
  },
  {
    label: 'Scope and Delimitations',
    pattern: /scope\s+(?:and\s+delimitations?|of\s+(?:the\s+)?study)|delimitations?\s+of\s+(?:the\s+)?study/i,
    budget: 200,
  },
  {
    label: 'Definition of Terms',
    pattern: /definition\s+of\s+(?:terms?|key\s+terms?)|operational\s+definition/i,
    budget: 200,
  },
  {
    label: 'Related Literature / RRL',
    pattern: /(?:review\s+of\s+)?related\s+(?:literature|studies|works?)|literature\s+review|related\s+research/i,
    budget: 500,
  },
  {
    label: 'Research Methodology',
    pattern: /(?:research\s+)?method(?:ology)?(?:ies)?|research\s+(?:design|procedure|approach)/i,
    budget: 800,
  },
  {
    label: 'System Architecture / IPO',
    pattern:
      /system\s+(?:architecture|design|framework|model|flow)|input[\s\-–—]*process[\s\-–—]*output|\bipo\b(?:\s+(?:model|chart|diagram|table))?|conceptual\s+model/i,
    budget: 450,
  },
  {
    label: 'Data Collection / Sampling / Instrument',
    pattern:
      /data\s+(?:collection|gathering|sources?|instruments?)|research\s+instrument|sampling\s+(?:technique|method|design|procedure)|population\s+(?:and\s+sample|sample)/i,
    budget: 350,
  },
  {
    label: 'Statistical Treatment',
    pattern: /statistical\s+(?:treatment|analysis|method|tool)|data\s+analysis\s+(?:procedure|method|technique)/i,
    budget: 300,
  },
  {
    label: 'Results and Discussion',
    pattern:
      /results?\s+(?:and\s+discussion|of\s+(?:the\s+)?study)|discussion\s+(?:of\s+(?:results?|findings?))?|findings?\s+and\s+(?:discussion|analysis)/i,
    budget: 700,
  },
  {
    label: 'Conclusions',
    pattern:
      /conclusions?\s*(?:and\s+(?:recommendations?|summary)|$)|summary\s+of\s+findings?|summary\s+and\s+conclusions?/i,
    budget: 450,
  },
  {
    label: 'Recommendations',
    pattern: /recommendations?/i,
    budget: 350,
  },
];

// ─── helpers ────────────────────────────────────────────────────────────────

function takeWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  return words.slice(0, maxWords).join(' ');
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

/**
 * Detect potential section-heading lines in `text`.
 *
 * A candidate heading line:
 *   – is ≤ 120 characters (trimmed),
 *   – matches one of the SECTIONS patterns, and
 *   – appears only once per section label (first occurrence wins).
 */
function findSectionBoundaries(
  text: string
): Array<{ label: string; start: number; budget: number }> {
  const lines = text.split('\n');
  const seen = new Set<string>();
  const boundaries: Array<{ label: string; start: number; budget: number }> = [];
  let charPos = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.length > 0 && trimmed.length <= 120) {
      for (const spec of SECTIONS) {
        if (seen.has(spec.label)) continue;
        if (spec.pattern.test(trimmed)) {
          // Find the first non-whitespace character within the original line
          const offset = line.indexOf(trimmed);
          boundaries.push({
            label: spec.label,
            start: charPos + offset,
            budget: spec.budget,
          });
          seen.add(spec.label);
          break; // only one section per line
        }
      }
    }

    charPos += line.length + 1; // +1 for the '\n'
  }

  return boundaries.sort((a, b) => a.start - b.start);
}

/**
 * Fallback: sample words from the start, middle, and end of the document.
 * Used when the PDF extract has too few detectable section headings.
 */
function distributedSample(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;

  const startCount = Math.floor(maxWords * 0.4);
  const middleCount = Math.floor(maxWords * 0.3);
  const endCount = maxWords - startCount - middleCount;

  const midStart = Math.floor(words.length / 2) - Math.floor(middleCount / 2);

  return [
    words.slice(0, startCount).join(' '),
    '...',
    words.slice(midStart, midStart + middleCount).join(' '),
    '...',
    words.slice(words.length - endCount).join(' '),
  ].join(' ');
}

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Extract the most analytically valuable content from a thesis by locating
 * academic section headings and applying per-section word budgets.
 *
 * @param text      Full extracted thesis text.
 * @param maxWords  Soft cap on total returned words (default 5 500).
 * @returns         Concatenated section excerpts with `[Section Name]` labels,
 *                  or a distributed sample if the document is not structured.
 */
export function extractSections(text: string, maxWords = 5500): string {
  if (!text || text.trim().length < 100) return text;

  const boundaries = findSectionBoundaries(text);

  // Fewer than 2 headings → no reliable structure → fall back
  if (boundaries.length < 2) {
    return distributedSample(text, maxWords);
  }

  const parts: string[] = [];
  let totalWords = 0;

  for (let i = 0; i < boundaries.length; i++) {
    const { label, start, budget } = boundaries[i];
    const end =
      i + 1 < boundaries.length ? boundaries[i + 1].start : text.length;

    // Strip the heading line itself; keep only body content
    const raw = text.slice(start, end);
    const newlineIdx = raw.indexOf('\n');
    const body = newlineIdx >= 0 ? raw.slice(newlineIdx + 1).trim() : raw.trim();

    if (!body) continue;

    const remaining = maxWords - totalWords;
    if (remaining <= 0) break;

    const actualBudget = Math.min(budget, remaining);
    const excerpt = takeWords(body, actualBudget);
    const wc = wordCount(excerpt);

    if (wc > 0) {
      parts.push(`[${label}]\n${excerpt}`);
      totalWords += wc;
    }
  }

  if (parts.length === 0) {
    return distributedSample(text, maxWords);
  }

  return parts.join('\n\n');
}
