/**
 * Simple in-memory per-IP rate limiter (no external dependencies).
 * Limits each IP to MAX_REQUESTS per WINDOW_MS on AI endpoints.
 *
 * For production with multiple server instances, replace with
 * @upstash/ratelimit + Redis.
 *
 * The stream route uses getWaitMs() + resetIp() to pause silently instead
 * of returning a 429 — keeping conversations alive in the background.
 */

const MAX_REQUESTS = 60;   // raised from 30 — stream requests are long-lived
const WINDOW_MS    = 60_000; // 1 minute

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

/** Returns true if the request should be blocked. */
export function isRateLimited(ip: string): boolean {
  return getWaitMs(ip) > 0;
}

/**
 * Returns 0 if the IP is within quota, or the number of milliseconds
 * remaining in the current window if it is over quota.
 * Side effect: increments the counter for this IP.
 */
export function getWaitMs(ip: string): number {
  const now   = Date.now();
  const entry = store.get(ip);

  if (!entry || now >= entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return 0; // within quota — proceed
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return entry.resetAt - now; // over quota — tell caller how long to wait
  }

  return 0; // within quota — proceed
}

/** Clears an IP's rate-limit entry after a successful server-side wait. */
export function resetIp(ip: string): void {
  store.delete(ip);
}

/** Extract a best-effort IP from the Next.js request headers. */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    'unknown'
  );
}
