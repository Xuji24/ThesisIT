/**
 * Per-provider cooldown tracker.
 *
 * When an upstream provider returns a 429 (rate-limited) or 402 (quota exhausted),
 * it is marked as "cooling down" for a set window. The fallback loop skips
 * cooling providers instead of wasting an API call that will fail anyway.
 *
 * Cooldown durations (tunable):
 *   429 → 90 s  (rate-limited; short window before retry makes sense)
 *   402 → 10 m  (quota exhausted; longer cooldown)
 *   5xx → 30 s  (transient server error)
 *   default → 60 s
 */

import type { Provider } from './llm-providers';

interface CooldownEntry {
  coolUntil: number;
  reason: string;
}

// Cooldown durations in milliseconds keyed by HTTP status code
const COOLDOWN_MS: Partial<Record<number, number>> = {
  429: 90_000,   //  90 seconds — upstream rate-limited
  402: 600_000,  //  10 minutes — quota exhausted
  401: 300_000,  //   5 minutes — auth failure (key might be wrong, avoid hammering)
  404: 300_000,  //   5 minutes — model not found
};
const SERVER_ERROR_COOLDOWN_MS = 30_000;  // 30 s for 5xx
const DEFAULT_COOLDOWN_MS      = 60_000;  // 60 s fallback

const cooldowns = new Map<Provider, CooldownEntry>();

/** Returns true if the provider is currently cooling down and should be skipped. */
export function isProviderCooling(provider: Provider): boolean {
  const entry = cooldowns.get(provider);
  if (!entry) return false;
  if (Date.now() >= entry.coolUntil) {
    cooldowns.delete(provider);
    return false;
  }
  return true;
}

/** Marks a provider as cooling after an upstream error response. */
export function markProviderCooling(
  provider: Provider,
  httpStatus: number,
  reason?: string,
): void {
  let ms: number;
  if (httpStatus in COOLDOWN_MS) {
    ms = COOLDOWN_MS[httpStatus]!;
  } else if (httpStatus >= 500) {
    ms = SERVER_ERROR_COOLDOWN_MS;
  } else {
    ms = DEFAULT_COOLDOWN_MS;
  }

  const label = reason ?? `HTTP ${httpStatus}`;
  cooldowns.set(provider, { coolUntil: Date.now() + ms, reason: label });
  console.warn(
    `[Cooldown] ${provider} marked cooling for ${ms / 1_000}s — ${label}`,
  );
}

/** Human-readable remaining cooldown time for a provider, or null if not cooling. */
export function getCooldownRemaining(provider: Provider): string | null {
  const entry = cooldowns.get(provider);
  if (!entry) return null;
  const remaining = entry.coolUntil - Date.now();
  if (remaining <= 0) { cooldowns.delete(provider); return null; }
  return `${Math.ceil(remaining / 1_000)}s`;
}
