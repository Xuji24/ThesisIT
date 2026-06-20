/**
 * Server-side in-memory LLM response cache.
 *
 * Prevents duplicate upstream API calls for the same prompt during dev/testing.
 * Uses a simple djb2-variant hash — no crypto dependency needed.
 *
 * TTL: 30 minutes. Max entries: 200 (FIFO eviction).
 */

// TTL is configurable via LLM_CACHE_TTL_MS env var.
// Default: 30 min in production, override to 28800000 (8 h) in .env for dev
// so repeated test sessions within the same day cost zero API calls.
const CACHE_TTL_MS =
  parseInt(process.env.LLM_CACHE_TTL_MS ?? '', 10) || 30 * 60 * 1_000;
const MAX_ENTRIES = 200;

interface CacheEntry {
  response: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Fast, deterministic hash for cache key derivation. */
function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash |= 0; // keep as 32-bit int
  }
  return (hash >>> 0).toString(36);
}

function makeKey(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
): string {
  return djb2(systemPrompt + '\x00' + JSON.stringify(messages));
}

/** Returns the cached response string, or null on miss / expiry. */
export function getCached(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
): string | null {
  const key   = makeKey(systemPrompt, messages);
  const entry = cache.get(key);
  if (!entry)                  return null;
  if (Date.now() >= entry.expiresAt) { cache.delete(key); return null; }
  return entry.response;
}

/** Stores a response in the cache (FIFO eviction when full). */
export function setCached(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  response:  string,
): void {
  if (!response.trim()) return; // never cache empty responses
  // Evict oldest entry when at capacity
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(makeKey(systemPrompt, messages), {
    response,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}
