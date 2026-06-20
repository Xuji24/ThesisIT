/**
 * BM25-based paragraph retrieval for thesis Q&A context.
 *
 * Splits the thesis into overlapping ~300-word chunks and scores each one
 * against a user query using BM25 (Okapi BM25). Returns the top-k most
 * relevant chunks, ordered by document position, for use as chat context.
 *
 * No external dependencies — works entirely in memory.
 * Designed to replace linear truncation in ChatWithDoc.
 */

// ─── BM25 constants ──────────────────────────────────────────────────────────
const BM25_K1 = 1.5; // term-frequency saturation
const BM25_B = 0.75; // document-length normalisation

// ─── chunking constants ──────────────────────────────────────────────────────
export const CHUNK_SIZE_WORDS = 300; // target words per chunk
const CHUNK_OVERLAP_WORDS = 60; // overlap to preserve context across boundaries

// ─── stopwords ───────────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
  'those', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who',
  'whom', 'how', 'when', 'where', 'why', 'all', 'each', 'every', 'both',
  'than', 'then', 'not', 'no', 'nor', 'as', 'if', 'so', 'yet', 'also',
  'i', 'we', 'you', 'he', 'she', 'us', 'our', 'your', 'his', 'her',
  'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'once',
  'here', 'there', 'while', 'since', 'such', 'more', 'other', 'only', 'own',
  'same', 'very', 'just', 'because', 'until', 'against', 'among',
]);

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Normalise text to lowercase tokens, removing stopwords and punctuation. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Split thesis text into overlapping word-level chunks, preferring paragraph
 * boundaries over arbitrary mid-paragraph splits.
 *
 * @param text  Full extracted thesis text.
 * @returns     Array of ~300-word text chunks.
 */
export function chunkText(text: string): string[] {
  if (!text || text.trim().length < 100) return [];

  // Split on blank lines first to respect paragraph structure
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.split(/\s+/).length > 10);

  if (paragraphs.length === 0) return [];

  // Flatten into words while tracking which paragraph each word belongs to
  const allWords: string[] = [];
  const paraIndex: number[] = []; // paraIndex[i] = paragraph that word i came from

  paragraphs.forEach((para, idx) => {
    const words = para.split(/\s+/);
    words.forEach(() => paraIndex.push(idx));
    allWords.push(...words);
  });

  const chunks: string[] = [];
  let start = 0;

  while (start < allWords.length) {
    let end = Math.min(start + CHUNK_SIZE_WORDS, allWords.length);

    // Snap the end to the nearest paragraph boundary (within ±30 words)
    if (end < allWords.length) {
      for (let e = end; e > end - 30 && e > start + 50; e--) {
        if (paraIndex[e] !== paraIndex[e - 1]) {
          end = e;
          break;
        }
      }
    }

    chunks.push(allWords.slice(start, end).join(' '));

    if (end >= allWords.length) break;

    start = end - CHUNK_OVERLAP_WORDS;
    if (start < 0) start = 0;
    if (start >= end) break; // safety guard
  }

  return chunks;
}

/**
 * Retrieve the top-k chunks most relevant to `query` using BM25 scoring.
 *
 * Returned chunks are in their original document order (not score order)
 * so the model receives coherent, sequential context.
 *
 * @param chunks  Pre-split chunks from {@link chunkText}.
 * @param query   User's question or search string.
 * @param topK    Number of chunks to return (default 5, ~1 500 words).
 * @returns       The top-k relevant chunks in document order.
 */
export function retrieveTopChunks(
  chunks: string[],
  query: string,
  topK = 5
): string[] {
  if (chunks.length === 0) return [];
  if (chunks.length <= topK) return chunks;

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return chunks.slice(0, topK);

  // Tokenise all chunks once
  const tokenizedChunks = chunks.map((c) => tokenize(c));
  const N = chunks.length;

  // Document frequency: how many chunks contain each term
  const df = new Map<string, number>();
  tokenizedChunks.forEach((tokens) => {
    const unique = new Set(tokens);
    unique.forEach((t) => df.set(t, (df.get(t) ?? 0) + 1));
  });

  // Average chunk length (in tokens)
  const avgdl =
    tokenizedChunks.reduce((sum, t) => sum + t.length, 0) / N;

  // BM25 score each chunk
  const scored = tokenizedChunks.map((tokens, idx) => {
    const dl = tokens.length;
    const tf = new Map<string, number>();
    tokens.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + 1));

    let score = 0;
    for (const term of queryTokens) {
      const termFreq = tf.get(term) ?? 0;
      if (termFreq === 0) continue;

      const docFreq = df.get(term) ?? 0;
      const idf = Math.log(1 + (N - docFreq + 0.5) / (docFreq + 0.5));
      const tfNorm =
        (termFreq * (BM25_K1 + 1)) /
        (termFreq + BM25_K1 * (1 - BM25_B + BM25_B * (dl / avgdl)));

      score += idf * tfNorm;
    }

    return { idx, score };
  });

  return (
    scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      // Restore document order for coherent reading
      .sort((a, b) => a.idx - b.idx)
      .map((s) => chunks[s.idx])
  );
}
