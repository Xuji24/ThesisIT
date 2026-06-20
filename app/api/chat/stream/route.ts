import type { NextRequest } from 'next/server';
import {
  FALLBACK_SEQUENCE,
  PROVIDER_LABELS,
  safeMaxTokens,
  safeMessages,
  safeSystemPrompt,
  getProviderConfig,
  sanitizeUpstreamError,
  type Provider,
} from '../../../../lib/server/llm-providers';
import { getWaitMs, resetIp, getClientIp } from '../../../../lib/server/rate-limit';
import { getCached, setCached } from '../../../../lib/server/llm-cache';
import { isProviderCooling, markProviderCooling } from '../../../../lib/server/provider-cooldown';

// Raised to 90 s to accommodate the silent server-side wait when rate-limited.
export const maxDuration = 90;

const MAX_WAIT_MS = 55_000; // never wait longer than this (keeps us inside maxDuration)

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  // ── Read the body FIRST — before any async delays ────────────────────────
  // The HTTP request body must be consumed immediately while the TCP connection
  // is still live. Waiting before calling request.json() can cause the body
  // stream to be dropped/truncated → "Unexpected end of JSON input".
  let body: { systemPrompt?: string; maxTokens?: unknown; messages?: unknown[]; bypassCache?: boolean; task?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid or empty request body.' }, { status: 400 });
  }

  const systemPrompt  = safeSystemPrompt(body?.systemPrompt);
  const maxTokens     = safeMaxTokens(body?.maxTokens);
  const messages      = safeMessages(body?.messages);
  const bypassCache   = body?.bypassCache === true;
  const task          = typeof body?.task === 'string' && body.task.trim() ? body.task.trim() : 'Unknown Task';

  if (!systemPrompt) {
    return Response.json({ error: 'systemPrompt is required' }, { status: 400 });
  }

  // ── Rate-limit: pause silently instead of returning 429 ──────────────────
  // Body is already parsed — safe to wait now. The client's loading spinner
  // keeps running; conversations stay alive with no error surfaced to the UI.
  const waitMs = getWaitMs(ip);
  if (waitMs > 0) {
    const clampedWait = Math.min(waitMs + 500, MAX_WAIT_MS);
    console.info(`[RateLimit] ${ip} over quota — pausing ${clampedWait}ms before processing.`);
    await new Promise<void>((resolve) => setTimeout(resolve, clampedWait));
    resetIp(ip); // clear the counter so the next check passes
  }

  // ── B: Cache check — return instantly without touching any provider ────────
  // bypassCache skips this for explicit user re-runs; normal first-run calls always cache.
  const cached = bypassCache ? null : getCached(systemPrompt, messages);
  if (cached) {
    console.info(`[Cache] "${task}" — serving cached response (no upstream call).`);
    // Re-emit as a normal SSE stream so the client code path is identical
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: cached })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  let lastErrorMsg  = 'All AI providers are currently unavailable.';
  let fullResponse  = ''; // accumulated text for caching after stream ends

  for (const provider of FALLBACK_SEQUENCE) {
    const validProvider = provider as Provider;

    // C: skip cooling providers — avoid repeating calls that will just fail again
    if (isProviderCooling(validProvider)) {
      console.warn(`[Fallback] Skipping ${provider} — currently cooling.`);
      continue;
    }

    const cfg = getProviderConfig(validProvider);
    if (!cfg.apiKey) {
      console.warn(`[Fallback] Skipping ${provider} — API key missing.`);
      continue;
    }

    // 8-second hard timeout per provider so a network hang (e.g. unreachable OpenAI)
    // fails fast instead of blocking for the OS TCP timeout (~60s).
    const providerAbort = new AbortController();
    const providerTimer = setTimeout(() => providerAbort.abort(), 8_000);

    try {
      const upstream = await fetch(cfg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
          ...cfg.extraHeaders,
        },
        body: JSON.stringify({
          model:       cfg.model,
          max_tokens:  maxTokens,
          temperature: 0.4,
          messages:    chatMessages,
          stream:      true,
        }),
        signal: providerAbort.signal,
      });
      clearTimeout(providerTimer);

      if (!upstream.ok) {
        lastErrorMsg = sanitizeUpstreamError(upstream.status, validProvider);
        console.warn(`[Fallback] ${provider} returned HTTP ${upstream.status}.`);
        // C: mark provider cooling so future requests in this process skip it
        markProviderCooling(validProvider, upstream.status, lastErrorMsg);
        continue;
      }

      if (!upstream.body) {
        lastErrorMsg = 'No response body from upstream';
        console.warn(`[Fallback] ${provider} returned no body.`);
        continue;
      }

      // ── Success log — emitted once per request when a provider responds ──
      console.info(`[AI] "${task}" → ${PROVIDER_LABELS[validProvider]} (${cfg.model})`);

      const reader  = upstream.body.getReader();
      const decoder = new TextDecoder();

      // B + C: Accumulate response text so we can cache it once the stream closes.
      const stream = new ReadableStream({
        async pull(controller) {
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // B: Cache the full accumulated response for future identical prompts
              if (fullResponse.trim()) {
                setCached(systemPrompt, messages, fullResponse);
              }
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                if (fullResponse.trim()) setCached(systemPrompt, messages, fullResponse);
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                controller.close();
                return;
              }
              try {
                const parsed  = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content; // accumulate for cache
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              } catch {
                // skip malformed SSE chunk
              }
            }
          }
        },
        cancel() { reader.cancel(); },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    } catch (err: unknown) {
      clearTimeout(providerTimer);
      const isTimeout = (err as Error).name === 'AbortError';
      if (isTimeout) {
        lastErrorMsg = `${PROVIDER_LABELS[validProvider]} did not respond within 8s — trying next provider.`;
        console.warn(`[Fallback] Timeout for ${provider} (8s) — skipping.`);
        // Short cooldown so we don't hammer a slow provider on the next request.
        markProviderCooling(validProvider, 503, lastErrorMsg);
      } else {
        lastErrorMsg = (err as Error).message;
        console.warn(`[Fallback] Fetch to ${provider} threw: ${lastErrorMsg}`);
      }
    }
  }

  // All providers failed — return a terminal SSE error event (no 4xx/5xx header
  // so the client stream-reader doesn't short-circuit before reading the message)
  return new Response(
    `data: ${JSON.stringify({ error: lastErrorMsg })}\n\ndata: [DONE]\n\n`,
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    }
  );
}
