import { extractSections } from '@/lib/extractSections';
import { chunkText, retrieveTopChunks } from '@/lib/chunkRetrieval';
import { CHAPTER_QUERIES } from './constants';
import type { ChatMessage } from './types';

/** BM25 multi-query retrieval for mock-defense context. */
export function buildThesisContext(thesisText: string): string {
  const chunks = chunkText(thesisText);
  if (chunks.length < 3) return extractSections(thesisText, 3500);

  const seen = new Set<string>();
  const parts: string[] = [];
  for (const q of CHAPTER_QUERIES) {
    for (const chunk of retrieveTopChunks(chunks, q, 2)) {
      if (!seen.has(chunk)) {
        seen.add(chunk);
        parts.push(chunk);
      }
    }
  }
  return parts.join('\n\n---\n\n');
}

/** Flatten messages into Q/A pairs for evaluation prompt. */
export function buildEvaluationTranscript(messages: ChatMessage[]): string {
  const qaPairs: string[] = [];
  let qNum = 0;

  for (const msg of messages) {
    if (msg.role === 'assistant') {
      qNum++;
      qaPairs.push(`Panel Question ${qNum}: ${msg.content}`);
    } else if (msg.role === 'user' && msg.content.trim() !== 'Begin the oral defense.') {
      qaPairs.push(`Student Answer ${qNum}: ${msg.content}`);
    }
  }

  return qaPairs.join('\n\n');
}

/** Download session transcript as a plain-text file. */
export function downloadSessionTranscript(messages: ChatMessage[], difficulty: string): void {
  if (!messages.length) return;

  const lines = messages.map((m) => {
    const speaker = m.role === 'assistant' ? 'The Panel' : 'You';
    return `[${speaker}]\n${m.content}`;
  });

  const content = [
    `Mock Defense Session — Difficulty: ${difficulty}`,
    `Date: ${new Date().toLocaleString()}`,
    '',
    ...lines.join('\n\n---\n\n').split('\n'),
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mock-defense-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
