import { gradeColorClass } from '@/lib/chartPalette';

export const DIFFICULTIES = ['Standard', 'Technical', 'Terror Panel'] as const;

export const DIFFICULTY_DESCRIPTIONS: Record<(typeof DIFFICULTIES)[number], string> = {
  Standard: 'Rigorous but supportive',
  Technical: 'Deep dive into methodology & stats',
  'Terror Panel': 'Relentless follow-ups, no mercy',
};

export const LIMIT_OPTIONS = [
  { value: 5, label: '5 Q' },
  { value: 10, label: '10 Q' },
  { value: 15, label: '15 Q' },
  { value: 20, label: '20 Q' },
  { value: 0, label: '∞' },
] as const;

export const CRITERIA_RUBRIC = [
  { label: 'C1 — Content Accuracy', weight: '30%', desc: 'Answers correctly reflect what is in the manuscript. Contradictions and omissions are penalised.' },
  { label: 'C2 — Depth of Understanding', weight: '25%', desc: 'Student explains the "why" behind their choices — not just surface-level recall.' },
  { label: 'C3 — Clarity & Articulation', weight: '20%', desc: 'Response is coherent, logically structured, and free of contradictions.' },
  { label: 'C4 — Technical Competence', weight: '15%', desc: 'For software theses: demonstrates knowledge of system architecture, features, and testing.' },
  { label: 'C5 — Responsiveness', weight: '10%', desc: 'Answer directly addresses what was asked, without deflecting or going off-topic.' },
] as const;

export const GRADE_SCALE = [
  ['A', '90–100', gradeColorClass('A')],
  ['B', '80–89', gradeColorClass('B')],
  ['C', '70–79', gradeColorClass('C')],
  ['D', '60–69', gradeColorClass('D')],
  ['F', '< 60', gradeColorClass('F')],
] as const;

export const CHAPTER_QUERIES = [
  'abstract introduction background problem objectives hypothesis significance',
  'review related literature theoretical framework conceptual model',
  'methodology research design sampling data collection statistical treatment',
  'results findings discussion analysis interpretation',
  'conclusions summary recommendations implications',
] as const;

export const VOICE_ORB_SIZE_MAX = 380;
export const VOICE_ORB_SIZE_MIN = 200;

/** Answers at or above this word count skip the vague-answer gate and go to the LLM. */
export const MIN_DEFENSE_ANSWER_WORDS = 10;
