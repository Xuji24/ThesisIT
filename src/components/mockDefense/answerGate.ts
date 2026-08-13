import { MIN_DEFENSE_ANSWER_WORDS } from './constants';

/** Normalize for phrase matching — lowercase, collapse whitespace, strip punctuation. */
function normalizeAnswer(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const VAGUE_PHRASES = new Set([
  'yes',
  'yeah',
  'yep',
  'yup',
  'no',
  'nope',
  'nah',
  'ok',
  'okay',
  'k',
  'sure',
  'maybe',
  'perhaps',
  'possibly',
  'correct',
  'right',
  'true',
  'false',
  'absolutely',
  'definitely',
  'i guess',
  'i think so',
  'not sure',
  'idk',
  'i dont know',
  "i don't know",
  'yes it is',
  'no it is not',
  'that is correct',
  'thats correct',
  'that is right',
  'thats right',
  'i agree',
  'agreed',
  'mhm',
  'mm hmm',
  'uh huh',
  'sort of',
  'kind of',
  'more or less',
]);

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'was',
  'are',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'shall',
  'can',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'i',
  'we',
  'you',
  'they',
  'he',
  'she',
  'my',
  'our',
  'your',
  'their',
  'so',
  'very',
  'just',
  'also',
  'then',
  'than',
  'not',
  'no',
  'yes',
]);

/** Leading tokens that signal a non-answer (yes/no/ok…) even when padded with extra words. */
const ACKNOWLEDGMENT_PREFIX =
  /^(yes|yeah|yep|yup|no|nope|nah|ok|okay|sure|maybe|correct|right|absolutely|definitely|i guess|i think so|not sure)\b/;

/**
 * Client-side gate before any LLM call. Returns false for one-word confirmations,
 * filler-only replies, and answers that are too short to demonstrate thesis knowledge.
 */
export function isSubstantiveDefenseAnswer(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const normalized = normalizeAnswer(trimmed);
  const words = normalized.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount >= MIN_DEFENSE_ANSWER_WORDS) return true;

  if (VAGUE_PHRASES.has(normalized)) return false;

  if (wordCount <= 4) return false;

  if (ACKNOWLEDGMENT_PREFIX.test(normalized)) return false;

  // 5–9 words: accept only if at least one non-stopword token looks substantive (≥5 chars).
  const contentWords = words.filter((w) => w.length >= 5 && !STOPWORDS.has(w));
  return contentWords.length > 0;
}

/** Pull the last sentence ending in "?" from a panel turn (evaluation + question). */
export function extractPanelQuestion(panelContent: string): string {
  const trimmed = panelContent.trim();
  if (!trimmed) return 'Please address the question I asked.';

  const sentences = trimmed.match(/[^.!?]+[.!?]+/g) ?? [trimmed];
  const questions = sentences.filter((s) => s.trim().endsWith('?'));
  if (questions.length > 0) return questions[questions.length - 1].trim();

  return sentences[sentences.length - 1]?.trim() ?? trimmed;
}

/** Hardcoded panel pushback — no LLM tokens spent. Repeats the same question. */
export function buildVagueAnswerPushback(lastPanelContent: string): string {
  const question = extractPanelQuestion(lastPanelContent);
  return (
    'Your answer was too brief and does not adequately address my concern. ' +
    'In a formal thesis defense, the panel expects a clear explanation grounded in your manuscript — ' +
    'not a one-word confirmation or vague reply. Please elaborate with specific details, reasoning, ' +
    'and evidence from your study. I will ask again: ' +
    question
  );
}
