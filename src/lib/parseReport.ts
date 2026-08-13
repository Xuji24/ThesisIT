/**
 * Extract and parse a trailing ```json fenced block from an AI report.
 * Returns null if the block is absent, incomplete (still streaming), or
 * fails to parse -- callers always have a regex-based fallback for that case.
 */
export function extractJsonBlock<T>(text: string): T | null {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as T;
  } catch {
    return null;
  }
}

/** Remove a trailing ```json fenced block so it never renders in the prose view. */
export function stripJsonBlock(text: string): string {
  return text.replace(/```json\s*[\s\S]*?\s*```/i, '').trimEnd();
}

/** Split a plain-text AI report into named sections (ALL-CAPS headings). */
export function splitReportSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let currentKey = '_preamble';
  const lines = text.split('\n');

  for (const raw of lines) {
    const line = raw.trim();
    if (/^[A-Z][A-Z\s\-&\/\(\):]{2,}$/.test(line)) {
      currentKey = line;
      sections[currentKey] = '';
    } else if (sections[currentKey] !== undefined) {
      sections[currentKey] += (sections[currentKey] ? '\n' : '') + raw;
    } else {
      sections[currentKey] = raw;
    }
  }

  return sections;
}

/** Extract bullet-like lines from a section body (numbered or prose paragraphs). */
export function extractListItems(sectionBody: string): string[] {
  if (!sectionBody.trim()) return [];

  return sectionBody
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      if (/^(Q\d+:|Score:|Strength:|Gap:|Model\s+Answer:)/i.test(l)) return false;
      if (/^[A-Z][A-Z\s\-&\/\(\):]{2,}$/.test(l)) return false;
      if (/^(Chapter\s+\d|Overall|Methodology|Literature|Results|Conclusions)\s*:/i.test(l))
        return true;
      return l.length > 12;
    })
    .map((l) => l.replace(/^\d+[\).\]]\s*/, ''));
}

const CRITERIA_META = [
  { id: 'C1', label: 'Content Accuracy', weight: 30 },
  { id: 'C2', label: 'Depth of Understanding', weight: 25 },
  { id: 'C3', label: 'Clarity & Articulation', weight: 20 },
  { id: 'C4', label: 'Technical Competence', weight: 15 },
  { id: 'C5', label: 'Responsiveness', weight: 10 },
] as const;

export interface ParsedEvalReport {
  overallScore: number | null;
  grade: string | null;
  summary: string;
  criteria: { id: string; label: string; score: number; weight: number }[];
  questions: {
    id: string;
    title: string;
    score: number;
    strength: string;
    gap: string;
  }[];
  topStrengths: string[];
  criticalGaps: string[];
  recommendations: string[];
}

interface EvalReportJson {
  overall?: { score?: number; grade?: string };
  criteria?: { id?: string; score?: number }[];
  questions?: { id?: string; score?: number; strength?: string; gap?: string }[];
}

export function parseEvalReport(rawText: string): ParsedEvalReport {
  const json = extractJsonBlock<EvalReportJson>(rawText);
  // Strip the JSON block before section-splitting -- otherwise it tails onto
  // whatever ALL-CAPS section came last and leaks into that section's list
  // items (a raw JSON line easily clears extractListItems' ">12 chars" bar).
  const text = stripJsonBlock(rawText);
  const sections = splitReportSections(text);
  const overallBody = sections['OVERALL PERFORMANCE'] ?? '';

  const criteriaScores = new Map<string, number>();
  if (json?.criteria) {
    for (const c of json.criteria) {
      if (c.id && typeof c.score === 'number') criteriaScores.set(c.id.toUpperCase(), c.score);
    }
  }
  if (criteriaScores.size === 0) {
    for (const m of text.matchAll(/C(\d)\s+(\d+(?:\.\d+)?)\s*\/\s*10/gi)) {
      criteriaScores.set(`C${m[1]}`, parseFloat(m[2]));
    }
  }

  const criteria = CRITERIA_META.map((c) => ({
    id: c.id,
    label: c.label,
    weight: c.weight,
    score: criteriaScores.get(c.id) ?? 0,
  })).filter((c) => c.score > 0);

  let grade = json?.overall?.grade?.toUpperCase() ?? null;
  if (!grade) {
    const gradeMatch =
      overallBody.match(/\bGrade\s*:?\s*([A-F][+-]?)\b/i) ??
      overallBody.match(/\b([A-F])\s*(?:\(|,|\s|-)\s*\d+/i) ??
      text.match(/\b([A-F])\s*(?:grade|—|-)\s*\d+/i);
    grade = gradeMatch?.[1]?.toUpperCase() ?? null;
  }

  let overallScore = typeof json?.overall?.score === 'number' ? json.overall.score : null;
  if (overallScore == null) {
    const scoreMatch =
      overallBody.match(/(\d+(?:\.\d+)?)\s*(?:\/\s*100|out of 100|percent)/i) ??
      overallBody.match(/score\s*:?\s*(\d+(?:\.\d+)?)/i);
    overallScore = scoreMatch ? parseFloat(scoreMatch[1]) : null;
  }

  const summary = overallBody
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/C\d\s+\d/i.test(l) && !/grade/i.test(l) && !/score/i.test(l))
    .join(' ')
    .slice(0, 400);

  const jsonScores = new Map<string, number>();
  if (json?.questions) {
    for (const q of json.questions) {
      if (q.id && typeof q.score === 'number') jsonScores.set(q.id.toUpperCase(), q.score);
    }
  }

  const questions: ParsedEvalReport['questions'] = [];
  const pqBody = sections['PER-QUESTION BREAKDOWN'] ?? '';
  const blocks = pqBody.split(/(?=Q\d+:)/i).filter(Boolean);

  for (const block of blocks) {
    const idMatch = block.match(/^(Q\d+):/i);
    if (!idMatch) continue;
    const id = idMatch[1].toUpperCase();
    const titleLine = block.split('\n')[0]?.replace(/^Q\d+:\s*/i, '').trim() ?? id;
    const scoreMatchQ = block.match(/Score:\s*(\d+(?:\.\d+)?)/i);
    const strengthMatch = block.match(/Strength:\s*([\s\S]+?)(?=\nGap:|$)/i);
    const gapMatch = block.match(/Gap:\s*([\s\S]+?)(?=\nModel\s+Answer:|$)/i);

    questions.push({
      id,
      title: titleLine.slice(0, 80),
      score: jsonScores.get(id) ?? (scoreMatchQ ? parseFloat(scoreMatchQ[1]) : 0),
      strength: strengthMatch?.[1]?.trim() ?? '',
      gap: gapMatch?.[1]?.trim() ?? '',
    });
  }

  // JSON carried questions the prose block-split missed entirely (rare, but
  // cheaper to guard against than to debug later) -- add them with whatever
  // the JSON itself provided.
  if (json?.questions) {
    const seen = new Set(questions.map((q) => q.id));
    for (const q of json.questions) {
      const id = q.id?.toUpperCase();
      if (!id || seen.has(id) || typeof q.score !== 'number') continue;
      questions.push({ id, title: id, score: q.score, strength: q.strength ?? '', gap: q.gap ?? '' });
    }
  }

  return {
    overallScore,
    grade,
    summary,
    criteria,
    questions,
    topStrengths: extractListItems(sections['TOP STRENGTHS'] ?? ''),
    criticalGaps: extractListItems(sections['CRITICAL GAPS'] ?? ''),
    recommendations: extractListItems(sections['RECOMMENDATIONS'] ?? ''),
  };
}

export interface ParsedManuscriptReport {
  metrics: { label: string; score: number }[];
  strengths: string[];
  weaknesses: string[];
  chapterNotes: string[];
  predictedQuestions: string[];
  recommendations: string[];
  findingsCounts: { label: string; count: number }[];
}

const METRIC_LABELS = [
  'Overall Quality',
  'Methodology',
  'Literature Review',
  'Results & Discussion',
  'Conclusions',
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface ManuscriptReportJson {
  metrics?: { label?: string; score?: number }[];
}

export function parseManuscriptReport(rawText: string): ParsedManuscriptReport {
  const json = extractJsonBlock<ManuscriptReportJson>(rawText);
  // Strip before section-splitting -- see parseEvalReport for why.
  const text = stripJsonBlock(rawText);
  const sections = splitReportSections(text);
  const metricsBody = sections['MANUSCRIPT METRICS'] ?? '';

  const jsonMetrics = new Map<string, number>();
  if (json?.metrics) {
    for (const m of json.metrics) {
      if (m.label && typeof m.score === 'number') jsonMetrics.set(m.label.toLowerCase(), m.score);
    }
  }

  const metrics: ParsedManuscriptReport['metrics'] = [];
  for (const label of METRIC_LABELS) {
    const fromJson = jsonMetrics.get(label.toLowerCase());
    if (fromJson != null) {
      metrics.push({ label, score: fromJson });
      continue;
    }
    const re = new RegExp(`${escapeRegExp(label)}:\\s*(\\d+(?:\\.\\d+)?)\\s*/\\s*10`, 'i');
    const m = metricsBody.match(re);
    if (m) metrics.push({ label, score: parseFloat(m[1]) });
  }

  const strengths = extractListItems(sections['STRENGTHS'] ?? '');
  const weaknesses = extractListItems(sections['WEAKNESSES AND LOOPHOLES'] ?? '');
  const chapterNotes = extractListItems(sections['CHAPTER-BY-CHAPTER NOTES'] ?? '');
  const predictedQuestions = extractListItems(sections['PREDICTED PANEL QUESTIONS'] ?? '');
  const recommendations = extractListItems(sections['RECOMMENDATIONS BEFORE THE DEFENSE'] ?? '');

  const findingsCounts = [
    { label: 'Strengths', count: strengths.length },
    { label: 'Weaknesses', count: weaknesses.length },
    { label: 'Panel Questions', count: predictedQuestions.length },
    { label: 'Recommendations', count: recommendations.length },
  ].filter((f) => f.count > 0);

  return {
    metrics,
    strengths,
    weaknesses,
    chapterNotes,
    predictedQuestions,
    recommendations,
    findingsCounts,
  };
}

// Color helpers moved to src/lib/chartPalette.ts (gradeColorClass, sequentialForScore)
// so every chart and grade badge draws from one validated palette.
